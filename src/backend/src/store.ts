// Taskfold plugin module implements store behavior.
import { randomUUID } from "node:crypto";
import type { TaskfoldAttachment, TaskfoldCard } from "../../contract/index.js";
import type {
  PersistedTaskfoldAttachment,
  PersistedTaskfoldBoard,
  PersistedTaskfoldMilestone,
  PersistedTaskfoldNotificationSubscription,
  PersistedTaskfoldProjectDocument,
  TaskfoldKeyedStore,
} from "./persistence-types.js";
import { createTaskfoldSqliteStores } from "./sqlite-store.js";
import {
  cardBoardId,
  closeRunningAttempts,
  computeCardDiagnostics,
  isDependencyPromotableStatus,
  latestRunningAttempt,
  mergeDiagnostics,
  removeUndefinedCardFields,
  retryBudgetExhausted,
} from "./store-card-helpers.js";
import { buildWorkerContext } from "./worker-prompt.js";
import {
  isTaskfoldClaimReclaimable,
  MAX_ATTACHMENT_ENTRIES,
  MAX_CARDS,
  MAX_CARD_NOTIFICATIONS,
  secondsToDurationMs,
} from "./store-constants.js";
import type {
  TaskfoldBulkInput,
  TaskfoldCardPatch,
  TaskfoldDiagnosticsResult,
  TaskfoldDispatchOptions,
  TaskfoldDispatchResult,
} from "./store-inputs.js";
import {
  metadataIsEmpty,
  normalizeBoardId,
  normalizeTimestamp,
  trimMetadataToBudget,
} from "./store-normalizers.js";
import { TaskfoldProjectStore } from "./store-projects.js";

export type { TaskfoldDispatchResult } from "./store-inputs.js";

// Capability layers split review boundaries only; the core still owns persistence and mutation order.
export class TaskfoldStore extends TaskfoldProjectStore {
  private async shouldAutoOrchestrate(card: TaskfoldCard): Promise<boolean> {
    if (
      card.status !== "triage" ||
      card.metadata?.archivedAt ||
      card.metadata?.workerProtocol?.state === "idle"
    ) {
      return false;
    }
    const board = await this.boardStore.lookup(cardBoardId(card));
    return board?.version === 1 && board.board.orchestration?.autoDecompose === true;
  }

  async dispatch(
    input: number | TaskfoldDispatchOptions = Date.now(),
  ): Promise<TaskfoldDispatchResult> {
    const now = typeof input === "number" ? input : normalizeTimestamp(input.now, Date.now());
    const boardId = typeof input === "number" ? undefined : normalizeBoardId(input.boardId);
    return await this.enqueueMutation(async () => {
      const promoted: TaskfoldCard[] = [];
      const reclaimed: TaskfoldCard[] = [];
      const blocked: TaskfoldCard[] = [];
      const orchestrated: TaskfoldCard[] = [];
      const orchestratedByBoard = new Map<string, number>();
      for (const card of await this.list({ boardId })) {
        if (await this.isProjectArchived(cardBoardId(card))) {
          continue;
        }
        // Archived cards remain readable and restorable, but must never re-enter automation.
        if (card.metadata?.archivedAt) {
          continue;
        }
        let latest = await this.promoteDependencyReady(card.id, now);
        const wasPromoted = latest.status !== card.status;
        const claim = latest.metadata?.claim;
        const latestAttempt = latestRunningAttempt(latest);
        const maxRuntimeSeconds = latest.metadata?.automation?.maxRuntimeSeconds;
        const runtimeStartedAt = latestAttempt?.startedAt ?? claim?.claimedAt ?? latest.startedAt;
        const timedOut =
          Boolean(maxRuntimeSeconds && runtimeStartedAt) &&
          now - runtimeStartedAt! > secondsToDurationMs(maxRuntimeSeconds!);
        const claimExpired = isTaskfoldClaimReclaimable(claim, now);
        const retriesExhausted = retryBudgetExhausted(latest);
        if (latest.status === "running" && (timedOut || claimExpired)) {
          const reason = timedOut
            ? "Run exceeded the card max runtime."
            : "Claim expired without a recent heartbeat.";
          const execution =
            latest.execution?.status === "running"
              ? { ...latest.execution, status: "blocked" as const, updatedAt: now }
              : latest.execution;
          latest = await this.updateCard(latest.id, {
            status: "blocked",
            ...(execution ? { execution } : {}),
            metadata: {
              ...latest.metadata,
              claim: undefined,
              attempts: closeRunningAttempts(latest.metadata?.attempts, now, "blocked", reason),
              failureCount: (latest.metadata?.failureCount ?? 0) + 1,
              notifications: [
                ...(latest.metadata?.notifications ?? []),
                {
                  id: randomUUID(),
                  kind: "failed" as const,
                  createdAt: now,
                  sequence: this.nextNotificationSequence(now),
                  message: reason,
                },
              ].slice(-MAX_CARD_NOTIFICATIONS),
            },
          });
          blocked.push(latest);
        } else if (claimExpired) {
          latest = await this.updateCard(latest.id, {
            metadata: { ...latest.metadata, claim: undefined },
          });
          reclaimed.push(latest);
        }
        if (
          !latest.metadata?.claim &&
          retriesExhausted &&
          isDependencyPromotableStatus(latest.status)
        ) {
          latest = await this.updateCard(latest.id, {
            status: "blocked",
            metadata: {
              ...latest.metadata,
              notifications: [
                ...(latest.metadata?.notifications ?? []),
                {
                  id: randomUUID(),
                  kind: "failed" as const,
                  createdAt: now,
                  sequence: this.nextNotificationSequence(now),
                  message: "Card exhausted its retry budget.",
                },
              ].slice(-MAX_CARD_NOTIFICATIONS),
            },
          });
          blocked.push(latest);
        }
        if (latest.status === "ready" && !latest.metadata?.archivedAt) {
          latest = await this.recordDispatch(latest, now);
        }
        if (await this.shouldAutoOrchestrate(latest)) {
          const latestBoardId = cardBoardId(latest);
          const board = await this.boardStore.lookup(latestBoardId);
          const cap = board?.board.orchestration?.autoDecomposePerDispatch ?? 3;
          const boardCount = orchestratedByBoard.get(latestBoardId) ?? 0;
          if (boardCount < cap) {
            latest = await this.recordOrchestrationCandidate(latest, now);
            orchestrated.push(latest);
            orchestratedByBoard.set(latestBoardId, boardCount + 1);
          }
        }
        if (wasPromoted && latest.status !== "blocked") {
          promoted.push(latest);
        }
      }
      return {
        promoted,
        reclaimed,
        blocked,
        orchestrated,
        count: promoted.length + reclaimed.length + blocked.length + orchestrated.length,
      };
    });
  }

  async bulkUpdate(input: TaskfoldBulkInput): Promise<{ cards: TaskfoldCard[] }> {
    const ids = Array.isArray(input.ids)
      ? input.ids.filter((id): id is string => typeof id === "string" && id.trim() !== "")
      : [];
    if (ids.length === 0) {
      throw new Error("ids are required.");
    }
    const patch =
      input.patch && typeof input.patch === "object" && !Array.isArray(input.patch)
        ? (input.patch as TaskfoldCardPatch)
        : {};
    const cards: TaskfoldCard[] = [];
    for (const id of ids) {
      const updated =
        input.archived === undefined
          ? await this.update(id, patch)
          : await this.archive(id, input.archived);
      cards.push(updated);
    }
    return { cards };
  }

  async archive(id: string, archived: unknown): Promise<TaskfoldCard> {
    const shouldArchive = archived !== false;
    return await this.updateMetadata(id, (existing) => ({
      ...existing.metadata,
      archivedAt: shouldArchive ? Date.now() : 0,
    }));
  }

  async exportCards(): Promise<{
    cards: TaskfoldCard[];
    attachments: TaskfoldAttachment[];
    exportedAt: number;
  }> {
    const cards = await this.list();
    const attachments = cards.flatMap((card) => card.metadata?.attachments ?? []);
    return { cards, attachments, exportedAt: Date.now() };
  }

  async diagnostics(now = Date.now()): Promise<TaskfoldDiagnosticsResult> {
    const cards = await this.list();
    const rows = cards.flatMap((card) => {
      const diagnostics = computeCardDiagnostics(card, now);
      return diagnostics.length ? [{ card, diagnostics }] : [];
    });
    return {
      diagnostics: rows,
      count: rows.reduce((total, row) => total + row.diagnostics.length, 0),
    };
  }

  async refreshDiagnostics(now = Date.now()): Promise<TaskfoldDiagnosticsResult> {
    return await this.enqueueMutation(async () => {
      const cards = await this.list();
      const rows: TaskfoldDiagnosticsResult["diagnostics"] = [];
      for (const card of cards) {
        const latest = await this.get(card.id);
        if (!latest || latest.metadata?.archivedAt) {
          continue;
        }
        const diagnostics = mergeDiagnostics(
          latest.metadata?.diagnostics,
          computeCardDiagnostics(latest, now),
        );
        if (diagnostics.length === 0 && !latest.metadata?.diagnostics?.length) {
          continue;
        }
        const metadata = trimMetadataToBudget({ ...latest.metadata, diagnostics });
        const next = removeUndefinedCardFields({
          ...latest,
          metadata: metadataIsEmpty(metadata) ? undefined : metadata,
        });
        await this.store.register(next.id, { version: 1, card: next });
        if (diagnostics.length > 0) {
          rows.push({ card: next, diagnostics });
        }
      }
      return {
        diagnostics: rows,
        count: rows.reduce((total, row) => total + row.diagnostics.length, 0),
      };
    });
  }

  async buildWorkerContext(id: string): Promise<string> {
    const card = await this.get(id);
    if (!card) {
      throw new Error(`card not found: ${id}`);
    }
    return buildWorkerContext(card, await this.list());
  }

  static open(
    openKeyedStore: (options: {
      namespace: string;
      maxEntries: number;
    }) => TaskfoldKeyedStore<unknown>,
  ) {
    return new TaskfoldStore(
      openKeyedStore({
        namespace: "taskfold.cards",
        maxEntries: MAX_CARDS,
      }) as TaskfoldKeyedStore,
      {
        boards: openKeyedStore({
          namespace: "taskfold.boards",
          maxEntries: 200,
        }) as TaskfoldKeyedStore<PersistedTaskfoldBoard>,
        milestones: openKeyedStore({
          namespace: "taskfold.milestones",
          maxEntries: 2000,
        }) as TaskfoldKeyedStore<PersistedTaskfoldMilestone>,
        documents: openKeyedStore({
          namespace: "taskfold.project-documents",
          maxEntries: 4000,
        }) as TaskfoldKeyedStore<PersistedTaskfoldProjectDocument>,
        subscriptions: openKeyedStore({
          namespace: "taskfold.notify",
          maxEntries: 2000,
        }) as TaskfoldKeyedStore<PersistedTaskfoldNotificationSubscription>,
        attachments: openKeyedStore({
          namespace: "taskfold.attachments",
          maxEntries: MAX_ATTACHMENT_ENTRIES,
        }) as TaskfoldKeyedStore<PersistedTaskfoldAttachment>,
      },
    );
  }

  static openSqlite() {
    return TaskfoldStore.fromSqliteStores(createTaskfoldSqliteStores());
  }

  /**
   * Single wiring point from SQLite stores to a card store. Tests use this too,
   * so a newly added capability cannot be silently missing under test only.
   */
  static fromSqliteStores(stores: ReturnType<typeof createTaskfoldSqliteStores>) {
    return new TaskfoldStore(stores.cards, {
      boards: stores.boards,
      milestones: stores.milestones,
      documents: stores.documents,
      subscriptions: stores.subscriptions,
      attachments: stores.attachments,
      dataVersion: stores.dataVersion,
      changeEpoch: stores.changeEpoch,
      reserveChangeRevisions: stores.reserveChangeRevisions,
    });
  }
}
