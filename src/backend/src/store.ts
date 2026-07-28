// Flowboard plugin module implements store behavior.
import { randomUUID } from "node:crypto";
import type { FlowboardAttachment, FlowboardCard } from "../../contract/index.js";
import type {
  PersistedFlowboardAttachment,
  PersistedFlowboardBoard,
  PersistedFlowboardNotificationSubscription,
  FlowboardKeyedStore,
} from "./persistence-types.js";
import { createFlowboardSqliteStores } from "./sqlite-store.js";
import {
  buildWorkerContext,
  cardBoardId,
  closeRunningAttempts,
  computeCardDiagnostics,
  isDependencyPromotableStatus,
  latestRunningAttempt,
  mergeDiagnostics,
  removeUndefinedCardFields,
  retryBudgetExhausted,
} from "./store-card-helpers.js";
import {
  isFlowboardClaimReclaimable,
  MAX_ATTACHMENT_ENTRIES,
  MAX_CARDS,
  MAX_CARD_NOTIFICATIONS,
  secondsToDurationMs,
} from "./store-constants.js";
import type {
  FlowboardBulkInput,
  FlowboardCardPatch,
  FlowboardDiagnosticsResult,
  FlowboardDispatchOptions,
  FlowboardDispatchResult,
} from "./store-inputs.js";
import {
  metadataIsEmpty,
  normalizeBoardId,
  normalizeTimestamp,
  trimMetadataToBudget,
} from "./store-normalizers.js";
import { FlowboardNotificationStore } from "./store-notifications.js";

export type { FlowboardDispatchResult } from "./store-inputs.js";

// Capability layers split review boundaries only; the core still owns persistence and mutation order.
export class FlowboardStore extends FlowboardNotificationStore {
  private async shouldAutoOrchestrate(card: FlowboardCard): Promise<boolean> {
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
    input: number | FlowboardDispatchOptions = Date.now(),
  ): Promise<FlowboardDispatchResult> {
    const now = typeof input === "number" ? input : normalizeTimestamp(input.now, Date.now());
    const boardId = typeof input === "number" ? undefined : normalizeBoardId(input.boardId);
    return await this.enqueueMutation(async () => {
      const promoted: FlowboardCard[] = [];
      const reclaimed: FlowboardCard[] = [];
      const blocked: FlowboardCard[] = [];
      const orchestrated: FlowboardCard[] = [];
      const orchestratedByBoard = new Map<string, number>();
      for (const card of await this.list({ boardId })) {
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
        const claimExpired = isFlowboardClaimReclaimable(claim, now);
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

  async bulkUpdate(input: FlowboardBulkInput): Promise<{ cards: FlowboardCard[] }> {
    const ids = Array.isArray(input.ids)
      ? input.ids.filter((id): id is string => typeof id === "string" && id.trim() !== "")
      : [];
    if (ids.length === 0) {
      throw new Error("ids are required.");
    }
    const patch =
      input.patch && typeof input.patch === "object" && !Array.isArray(input.patch)
        ? (input.patch as FlowboardCardPatch)
        : {};
    const cards: FlowboardCard[] = [];
    for (const id of ids) {
      const updated =
        input.archived === undefined
          ? await this.update(id, patch)
          : await this.archive(id, input.archived);
      cards.push(updated);
    }
    return { cards };
  }

  async archive(id: string, archived: unknown): Promise<FlowboardCard> {
    const shouldArchive = archived !== false;
    return await this.updateMetadata(id, (existing) => ({
      ...existing.metadata,
      archivedAt: shouldArchive ? Date.now() : 0,
    }));
  }

  async exportCards(): Promise<{
    cards: FlowboardCard[];
    attachments: FlowboardAttachment[];
    exportedAt: number;
  }> {
    const cards = await this.list();
    const attachments = cards.flatMap((card) => card.metadata?.attachments ?? []);
    return { cards, attachments, exportedAt: Date.now() };
  }

  async diagnostics(now = Date.now()): Promise<FlowboardDiagnosticsResult> {
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

  async refreshDiagnostics(now = Date.now()): Promise<FlowboardDiagnosticsResult> {
    return await this.enqueueMutation(async () => {
      const cards = await this.list();
      const rows: FlowboardDiagnosticsResult["diagnostics"] = [];
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
    }) => FlowboardKeyedStore<unknown>,
  ) {
    return new FlowboardStore(
      openKeyedStore({
        namespace: "flowboard.cards",
        maxEntries: MAX_CARDS,
      }) as FlowboardKeyedStore,
      {
        boards: openKeyedStore({
          namespace: "flowboard.boards",
          maxEntries: 200,
        }) as FlowboardKeyedStore<PersistedFlowboardBoard>,
        subscriptions: openKeyedStore({
          namespace: "flowboard.notify",
          maxEntries: 2000,
        }) as FlowboardKeyedStore<PersistedFlowboardNotificationSubscription>,
        attachments: openKeyedStore({
          namespace: "flowboard.attachments",
          maxEntries: MAX_ATTACHMENT_ENTRIES,
        }) as FlowboardKeyedStore<PersistedFlowboardAttachment>,
      },
    );
  }

  static openSqlite() {
    const stores = createFlowboardSqliteStores();
    return new FlowboardStore(stores.cards, {
      boards: stores.boards,
      subscriptions: stores.subscriptions,
      attachments: stores.attachments,
      dataVersion: stores.dataVersion,
    });
  }
}
