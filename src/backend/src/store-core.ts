import { randomUUID } from "node:crypto";
import type {
  TaskfoldBoardMetadata,
  TaskfoldChange,
  TaskfoldCard,
  TaskfoldSourceReference,
  TaskfoldLink,
  TaskfoldMetadata,
  TaskfoldStatus,
} from "../../contract/index.js";
import type {
  PersistedTaskfoldAttachment,
  PersistedTaskfoldBoard,
  PersistedTaskfoldCard,
  PersistedTaskfoldMilestone,
  PersistedTaskfoldNotificationSubscription,
  PersistedTaskfoldProjectDocument,
  TaskfoldKeyedStore,
} from "./persistence-types.js";
import { normalizeAutomationPatch, normalizeCardAutomation } from "./store-automation.js";
import {
  assertCanMutateClaimedCard,
  cardBoardId,
  cardParentIds,
  compareCards,
  isActiveDependencyTarget,
  isDependencyPromotableStatus,
  lifecycleStatusSourceUpdatedAtFromPatch,
  removeUndefinedCardFields,
  shouldSkipPersistedLifecycleStatusUpdate,
  syncExecutionAttemptMetadata,
  updateEvent,
  appendEvent,
} from "./store-card-helpers.js";
import { TaskfoldChangeTracker } from "./store-change-tracker.js";
import {
  MAX_CARD_COMMENTS,
  MAX_CARD_WORKER_LOGS,
  nextTaskfoldCardRevision,
  POSITION_STEP,
} from "./store-constants.js";
import type {
  TaskfoldBoardInput,
  TaskfoldBoardSummary,
  TaskfoldCardPatch,
  TaskfoldCommentInput,
  TaskfoldLinkInput,
  TaskfoldLinkedCreateInput,
  TaskfoldListOptions,
  TaskfoldMutationScope,
  TaskfoldSourceReferenceCreateInput,
  TaskfoldSourceReferenceDeleteInput,
  TaskfoldSourceReferenceReorderInput,
  TaskfoldSourceReferenceUpdateInput,
  TaskfoldStatsResult,
} from "./store-inputs.js";
import {
  appendLinkPreservingDependencies,
  metadataIsEmpty,
  normalizeAutomation,
  normalizeBoardId,
  normalizeBoardIdRequired,
  normalizeBoardMetadata,
  normalizeBoundedString,
  normalizeExecution,
  normalizeDelivery,
  normalizeLabels,
  normalizeLinkType,
  normalizeMetadata,
  normalizeNotes,
  normalizeOptionalString,
  normalizePosition,
  normalizePriority,
  normalizeStatus,
  normalizeStringList,
  normalizeTemplateId,
  normalizeTimestamp,
  normalizeTitle,
  syncExecutionSessionKey,
  trimMetadataToBudget,
} from "./store-normalizers.js";

/** Raised when a compare-and-swap loses to a concurrent write. */
export class TaskfoldRevisionConflictError extends Error {
  constructor(
    readonly cardId: string,
    readonly expectedRevision: number,
  ) {
    super(`card ${cardId} changed since revision ${expectedRevision}.`);
    this.name = "TaskfoldRevisionConflictError";
  }
}

const CARD_CAS_MAX_ATTEMPTS = 3;

/**
 * Advances `revision` on every card write. Wrapping the store means no call site
 * can persist a card without advancing it, which is what lets `revision` serve
 * as the optimistic-concurrency token. The stamp is applied in place so the card
 * object the caller returns matches what was persisted.
 */
function stampCardRevisions(store: TaskfoldKeyedStore): TaskfoldKeyedStore {
  const stamp = (value: PersistedTaskfoldCard): PersistedTaskfoldCard => {
    if (value?.version === 1 && value.card) {
      value.card.revision = nextTaskfoldCardRevision(value.card.revision);
    }
    return value;
  };
  return {
    register: async (key, value) => await store.register(key, stamp(value)),
    lookup: async (key) => await store.lookup(key),
    delete: async (key) => await store.delete(key),
    entries: async () => await store.entries(),
    ...(store.compareAndSwap
      ? {
          compareAndSwap: async (key: string, expectedRevision: number, value) =>
            await store.compareAndSwap!(key, expectedRevision, stamp(value)),
        }
      : {}),
  };
}

export class TaskfoldCoreStore {
  private mutationQueue: Promise<unknown> = Promise.resolve();
  private lastNotificationSequence = 0;
  private readonly changes: TaskfoldChangeTracker;
  protected readonly store: TaskfoldKeyedStore;
  protected readonly boardStore: TaskfoldKeyedStore<PersistedTaskfoldBoard>;
  protected readonly milestoneStore: TaskfoldKeyedStore<PersistedTaskfoldMilestone>;
  protected readonly documentStore: TaskfoldKeyedStore<PersistedTaskfoldProjectDocument>;
  protected readonly subscriptionStore: TaskfoldKeyedStore<PersistedTaskfoldNotificationSubscription>;
  protected readonly attachmentStore: TaskfoldKeyedStore<PersistedTaskfoldAttachment>;

  constructor(
    store: TaskfoldKeyedStore,
    stores: {
      boards?: TaskfoldKeyedStore<PersistedTaskfoldBoard>;
      milestones?: TaskfoldKeyedStore<PersistedTaskfoldMilestone>;
      documents?: TaskfoldKeyedStore<PersistedTaskfoldProjectDocument>;
      subscriptions?: TaskfoldKeyedStore<PersistedTaskfoldNotificationSubscription>;
      attachments?: TaskfoldKeyedStore<PersistedTaskfoldAttachment>;
      dataVersion?: () => number;
      changeEpoch?: string;
      reserveChangeRevisions?: (count: number) => number;
    } = {},
  ) {
    this.changes = new TaskfoldChangeTracker(
      stores.dataVersion,
      stores.changeEpoch,
      stores.reserveChangeRevisions,
    );
    this.store = this.changes.track(stampCardRevisions(store));
    this.boardStore = this.changes.track(
      stores.boards ?? (store as unknown as TaskfoldKeyedStore<PersistedTaskfoldBoard>),
    );
    this.milestoneStore = this.changes.track(
      stores.milestones ?? (store as unknown as TaskfoldKeyedStore<PersistedTaskfoldMilestone>),
    );
    this.documentStore = this.changes.track(
      stores.documents ??
        (store as unknown as TaskfoldKeyedStore<PersistedTaskfoldProjectDocument>),
    );
    this.subscriptionStore =
      stores.subscriptions ??
      (store as unknown as TaskfoldKeyedStore<PersistedTaskfoldNotificationSubscription>);
    this.attachmentStore =
      stores.attachments ?? (store as unknown as TaskfoldKeyedStore<PersistedTaskfoldAttachment>);
  }

  announceChangeEpoch(): void {
    this.changes.announceEpoch();
  }

  reconcileExternalChanges(): boolean {
    return this.changes.reconcileExternalChanges();
  }

  currentChange(): TaskfoldChange | undefined {
    return this.changes.current();
  }

  async waitForChange(
    after: TaskfoldChange | undefined,
    timeoutMs: number,
  ): Promise<{ change?: TaskfoldChange; timedOut: boolean }> {
    const isNewer = (change: TaskfoldChange) =>
      !after || change.epoch !== after.epoch || change.revision > after.revision;
    const current = this.changes.current();
    if (current && isNewer(current)) {
      return { change: current, timedOut: false };
    }

    return await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        unsubscribe();
        resolve({ change: this.changes.current(), timedOut: true });
      }, timeoutMs);
      const unsubscribe = this.changes.subscribe((change) => {
        if (!isNewer(change)) {
          return;
        }
        clearTimeout(timeout);
        unsubscribe();
        resolve({ change, timedOut: false });
      });
    });
  }

  protected async enqueueMutation<T>(run: () => Promise<T>): Promise<T> {
    const runAndNotify = async () => await this.changes.runMutation(run);
    const result = this.mutationQueue.then(runAndNotify, runAndNotify);
    this.mutationQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return await result;
  }

  protected async updateMetadata(
    id: string,
    mutate: (existing: TaskfoldCard) => TaskfoldMetadata,
    options: { preserveProofId?: string } = {},
  ): Promise<TaskfoldCard> {
    return await this.enqueueMutation(async () => {
      const existing = await this.get(id);
      if (!existing) {
        throw new Error(`card not found: ${id}`);
      }
      return await this.updateCard(id, { metadata: mutate(existing) }, options);
    });
  }

  protected async deleteDetachedAttachments(
    existing: TaskfoldCard,
    next: TaskfoldCard,
  ): Promise<void> {
    const nextIds = new Set(next.metadata?.attachments?.map((attachment) => attachment.id) ?? []);
    for (const attachment of existing.metadata?.attachments ?? []) {
      if (!nextIds.has(attachment.id)) {
        await this.attachmentStore.delete(attachment.id);
      }
    }
  }

  protected nextNotificationSequence(now: number): number {
    const base = Math.max(0, Math.trunc(now)) * 1000;
    this.lastNotificationSequence = Math.max(this.lastNotificationSequence + 1, base);
    return this.lastNotificationSequence;
  }

  async list(options: TaskfoldListOptions = {}): Promise<TaskfoldCard[]> {
    const boardId = normalizeBoardId(options.boardId);
    const entries = await this.store.entries();
    return entries
      .map((entry) => entry.value)
      .filter(
        (entry): entry is PersistedTaskfoldCard => entry?.version === 1 && Boolean(entry.card?.id),
      )
      .map((entry) => entry.card)
      .filter((card) => !boardId || cardBoardId(card) === boardId)
      .toSorted(compareCards);
  }

  async listBoards(): Promise<{ boards: TaskfoldBoardSummary[] }> {
    const boards = new Map<string, TaskfoldBoardSummary>();
    for (const entry of await this.boardStore.entries()) {
      if (entry.value?.version !== 1 || !entry.value.board?.id) {
        continue;
      }
      const board = entry.value.board;
      boards.set(board.id, {
        id: board.id,
        ...(board.name ? { name: board.name } : {}),
        ...(board.description ? { description: board.description } : {}),
        ...(board.icon ? { icon: board.icon } : {}),
        ...(board.color ? { color: board.color } : {}),
        ...(board.position !== undefined ? { position: board.position } : {}),
        ...(board.version ? { version: board.version } : {}),
        ...(board.currentObjective ? { currentObjective: board.currentObjective } : {}),
        ...(board.coreValue ? { coreValue: board.coreValue } : {}),
        ...(board.sourceOfTruth ? { sourceOfTruth: board.sourceOfTruth } : {}),
        ...(board.repositoryUrl ? { repositoryUrl: board.repositoryUrl } : {}),
        ...(board.planningPath ? { planningPath: board.planningPath } : {}),
        ...(board.homepageUrl ? { homepageUrl: board.homepageUrl } : {}),
        ...(board.defaultWorkspace ? { defaultWorkspace: board.defaultWorkspace } : {}),
        ...(board.orchestration ? { orchestration: board.orchestration } : {}),
        total: 0,
        active: 0,
        archived: 0,
        byStatus: {},
        updatedAt: board.updatedAt,
        ...(board.archivedAt ? { archivedAt: board.archivedAt } : {}),
      });
    }
    if (!boards.has("default")) {
      boards.set("default", {
        id: "default",
        total: 0,
        active: 0,
        archived: 0,
        byStatus: {},
      });
    }
    for (const card of await this.list()) {
      const boardId = cardBoardId(card);
      const summary =
        boards.get(boardId) ??
        ({
          id: boardId,
          total: 0,
          active: 0,
          archived: 0,
          byStatus: {},
        } satisfies TaskfoldBoardSummary);
      summary.total += 1;
      if (card.metadata?.archivedAt) {
        summary.archived += 1;
      } else {
        summary.active += 1;
      }
      summary.byStatus[card.status] = (summary.byStatus[card.status] ?? 0) + 1;
      summary.updatedAt = Math.max(summary.updatedAt ?? 0, card.updatedAt);
      boards.set(boardId, summary);
    }
    return {
      boards: [...boards.values()].toSorted((a, b) =>
        a.id === "default" ? -1 : b.id === "default" ? 1 : a.id.localeCompare(b.id),
      ),
    };
  }

  async isProjectArchived(boardId: string): Promise<boolean> {
    const board = await this.boardStore.lookup(boardId);
    return Boolean(board?.version === 1 && board.board.archivedAt);
  }

  async upsertBoard(input: TaskfoldBoardInput): Promise<TaskfoldBoardMetadata> {
    return await this.enqueueMutation(async () => {
      const id = normalizeBoardIdRequired(input.id);
      const existing = await this.boardStore.lookup(id);
      const board = normalizeBoardMetadata({ ...input, id }, existing?.board);
      await this.boardStore.register(id, { version: 1, board });
      return board;
    });
  }

  async archiveBoard(id: unknown, archived: unknown = true): Promise<TaskfoldBoardMetadata> {
    return await this.upsertBoard({ id, archived });
  }

  async deleteBoard(id: unknown): Promise<{ deleted: boolean }> {
    return await this.enqueueMutation(async () => {
      const boardId = normalizeBoardIdRequired(id);
      if (boardId === "default") {
        throw new Error("default board cannot be deleted.");
      }
      if ((await this.list({ boardId })).length > 0) {
        throw new Error("board still has cards; archive it or move/delete the cards first.");
      }
      for (const entry of await this.subscriptionStore.entries()) {
        if (entry.value?.version === 1 && entry.value.subscription?.boardId === boardId) {
          await this.subscriptionStore.delete(entry.key);
        }
      }
      return { deleted: await this.boardStore.delete(boardId) };
    });
  }

  async stats(input: TaskfoldListOptions = {}, now = Date.now()): Promise<TaskfoldStatsResult> {
    const cards = await this.list(input);
    const boardId = normalizeBoardId(input.boardId) ?? "all";
    const byStatus: Partial<Record<TaskfoldStatus, number>> = {};
    const byAgent = Object.create(null) as Record<string, number>;
    let oldestReadyAt: number | undefined;
    let updatedAt: number | undefined;
    let archived = 0;
    for (const card of cards) {
      byStatus[card.status] = (byStatus[card.status] ?? 0) + 1;
      byAgent[card.agentId ?? "(default)"] = (byAgent[card.agentId ?? "(default)"] ?? 0) + 1;
      if (card.metadata?.archivedAt) {
        archived += 1;
      }
      if (card.status === "ready" && !card.metadata?.archivedAt) {
        oldestReadyAt = Math.min(oldestReadyAt ?? card.updatedAt, card.updatedAt);
      }
      updatedAt = Math.max(updatedAt ?? 0, card.updatedAt);
    }
    return {
      id: boardId,
      total: cards.length,
      active: cards.length - archived,
      archived,
      byStatus,
      byAgent,
      ...(oldestReadyAt ? { oldestReadyAgeMs: Math.max(0, now - oldestReadyAt) } : {}),
      ...(updatedAt ? { updatedAt } : {}),
    };
  }

  async get(id: string): Promise<TaskfoldCard | undefined> {
    const entry = await this.store.lookup(id.trim());
    return entry?.version === 1 ? entry.card : undefined;
  }

  private async removeReferencesToCard(cardId: string): Promise<void> {
    for (const card of await this.list()) {
      const links = card.metadata?.links;
      if (!links?.some((link) => link.targetCardId === cardId)) {
        continue;
      }
      await this.updateCard(card.id, {
        metadata: {
          ...card.metadata,
          links: links.filter((link) => link.targetCardId !== cardId),
        },
      });
    }
  }

  async create(
    input: TaskfoldLinkedCreateInput,
    scope?: TaskfoldMutationScope,
  ): Promise<TaskfoldCard> {
    return await this.enqueueMutation(async () => await this.createDirect(input, scope));
  }

  protected async createDirect(
    input: TaskfoldLinkedCreateInput,
    scope?: TaskfoldMutationScope,
  ): Promise<TaskfoldCard> {
    const now = Date.now();
    const requestedStatus = normalizeStatus(input.status, "todo");
    const cards = await this.list();
    const parents = normalizeStringList(input.parents, "parents", 120);
    const automation = normalizeCardAutomation(input);
    const heldBySchedule =
      Boolean(automation?.scheduledAt && automation.scheduledAt > now) &&
      requestedStatus !== "blocked";
    let status: TaskfoldStatus = heldBySchedule ? "scheduled" : requestedStatus;
    let heldByDependencies = false;
    if (parents.length > 0 && (status === "running" || status === "review")) {
      status = "todo";
      heldByDependencies = true;
    }
    if (automation?.idempotencyKey) {
      const existing = cards.find(
        (card) =>
          card.metadata?.automation?.idempotencyKey === automation.idempotencyKey &&
          card.metadata?.automation?.tenant === automation.tenant &&
          cardBoardId(card) === (automation.boardId ?? "default"),
      );
      if (existing) {
        return existing;
      }
    }
    const cardsById = new Map(cards.map((card) => [card.id, card]));
    const parentCards = parents.map((parentId) => {
      const parent = cardsById.get(parentId);
      if (!parent) {
        throw new Error(`card not found: ${parentId}`);
      }
      return parent;
    });
    const childAutomation = normalizeAutomation(
      {
        ...automation,
        createdByCardId:
          automation?.createdByCardId ?? (parents.length === 1 ? parents[0] : undefined),
      },
      automation,
    );
    const normalizedPosition = normalizePosition(input.position, Number.NaN);
    const notes = normalizeNotes(input.notes);
    const agentId = normalizeOptionalString(input.agentId);
    const sessionKey = normalizeOptionalString(input.sessionKey);
    const runId = normalizeOptionalString(input.runId);
    const taskId = normalizeOptionalString(input.taskId);
    const sourceUrl = normalizeOptionalString(input.sourceUrl);
    const normalizedExecution = normalizeExecution(input.execution);
    const delivery = normalizeDelivery(input.delivery, undefined, now);
    const execution =
      normalizedExecution?.status === "running" && (heldBySchedule || heldByDependencies)
        ? undefined
        : normalizedExecution;
    const startedAt =
      input.startedAt === undefined
        ? status === "running"
          ? now
          : undefined
        : normalizeTimestamp(input.startedAt, 0) || undefined;
    const completedAt =
      input.completedAt === undefined
        ? status === "done"
          ? now
          : undefined
        : normalizeTimestamp(input.completedAt, 0) || undefined;
    const metadata = normalizeMetadata(
      input.metadata,
      {
        templateId: normalizeTemplateId(input.templateId),
        ...(childAutomation ? { automation: childAutomation } : {}),
      },
      { allowDependencyLinks: false },
    );
    const syncedMetadata = trimMetadataToBudget(
      syncExecutionAttemptMetadata(metadata, execution, now),
    );
    const boardId = syncedMetadata.automation?.boardId ?? "default";
    const milestoneId = normalizeOptionalString(input.milestoneId);
    const position = Number.isFinite(normalizedPosition)
      ? normalizedPosition
      : Math.max(
          0,
          ...cards
            .filter(
              (card) => cardBoardId(card) === boardId && card.milestoneId === milestoneId,
            )
            .map((card) => card.position),
        ) + POSITION_STEP;
    let card: TaskfoldCard = {
      id: randomUUID(),
      title: normalizeTitle(input.title),
      status,
      priority: normalizePriority(input.priority, "normal"),
      labels: normalizeLabels(input.labels),
      ...(milestoneId ? { milestoneId } : {}),
      position,
      createdAt: now,
      updatedAt: now,
      // Stamped to the first real revision by the persistence boundary below.
      revision: 0,
      events: [
        {
          id: randomUUID(),
          kind: "created",
          at: now,
          toStatus: status,
          ...(sessionKey ? { sessionKey } : {}),
          ...(runId ? { runId } : {}),
        },
      ],
      ...(notes ? { notes } : {}),
      ...(agentId ? { agentId } : {}),
      ...(sessionKey ? { sessionKey } : {}),
      ...(runId ? { runId } : {}),
      ...(taskId ? { taskId } : {}),
      ...(sourceUrl ? { sourceUrl } : {}),
      ...(execution ? { execution } : {}),
      ...(delivery ? { delivery } : {}),
      ...(startedAt ? { startedAt } : {}),
      ...(completedAt ? { completedAt } : {}),
      ...(!metadataIsEmpty(syncedMetadata) ? { metadata: syncedMetadata } : {}),
    };
    await this.store.register(card.id, { version: 1, card });
    try {
      for (const parent of parentCards) {
        card = await this.linkCardsDirect(parent.id, card.id, now, {
          allowStatusOnlyActiveChild: true,
          scope,
        });
      }
    } catch (error) {
      await this.store.delete(card.id);
      await this.removeReferencesToCard(card.id);
      throw error;
    }
    return card;
  }

  async update(
    id: string,
    patch: TaskfoldCardPatch,
    options: {
      /** See {@link updateCard}: write only if the card is still at this revision. */
      expectedRevision?: number;
    } = {},
  ): Promise<TaskfoldCard> {
    return await this.enqueueMutation(
      async () =>
        await this.updateCard(id, patch, {
          allowMetadataDependencyLinks: false,
          enforceStatusHolds: true,
          ...(options.expectedRevision !== undefined
            ? { expectedRevision: options.expectedRevision }
            : {}),
        }),
    );
  }

  protected async updateCard(
    id: string,
    patch: TaskfoldCardPatch,
    options: {
      allowMetadataDependencyLinks?: boolean;
      enforceStatusHolds?: boolean;
      preserveProofId?: string;
      /**
       * Compare-and-swap guard. When set, the write lands only if the card is
       * still at this revision, and a losing write throws
       * {@link TaskfoldRevisionConflictError} instead of clobbering the winner.
       * Required for admission decisions (claiming, dispatching) that must stay
       * correct across processes rather than only within this one.
       */
      expectedRevision?: number;
    } = {},
  ): Promise<TaskfoldCard> {
    const existing = await this.get(id);
    if (!existing) {
      throw new Error(`card not found: ${id}`);
    }
    if (options.expectedRevision !== undefined && existing.revision !== options.expectedRevision) {
      throw new TaskfoldRevisionConflictError(id, options.expectedRevision);
    }
    const lifecycleStatusSourceUpdatedAt = lifecycleStatusSourceUpdatedAtFromPatch(patch.metadata);
    const existingLifecycleStatusSourceUpdatedAt =
      existing.metadata?.lifecycleStatusSourceUpdatedAt;
    const hasFreshLifecycleStatusSource =
      lifecycleStatusSourceUpdatedAt !== undefined &&
      lifecycleStatusSourceUpdatedAt !== existingLifecycleStatusSourceUpdatedAt;
    let effectivePatch = patch;
    if (
      patch.status !== undefined &&
      lifecycleStatusSourceUpdatedAt !== undefined &&
      shouldSkipPersistedLifecycleStatusUpdate(existing, lifecycleStatusSourceUpdatedAt)
    ) {
      // Ignore stale lifecycle status writes, but still accept any non-status updates in the patch.
      effectivePatch = { ...patch, status: undefined };
      if (patch.metadata && typeof patch.metadata === "object" && !Array.isArray(patch.metadata)) {
        const metadataPatch = patch.metadata as Record<string, unknown>;
        const { lifecycleStatusSourceUpdatedAt: _ignored, ...rest } = metadataPatch;
        effectivePatch.metadata = Object.keys(rest).length > 0 ? rest : undefined;
      }
      const hasSemanticPatch = Object.entries(effectivePatch).some(
        ([key, value]) => key !== "status" && key !== "metadata" && value !== undefined,
      );
      if (!hasSemanticPatch && effectivePatch.metadata === undefined) {
        return existing;
      }
    }
    const status = normalizeStatus(effectivePatch.status, existing.status);
    const now = Date.now();
    const startedAt =
      effectivePatch.startedAt === undefined
        ? status === "running"
          ? (existing.startedAt ?? now)
          : existing.startedAt
        : normalizeTimestamp(effectivePatch.startedAt, 0) || undefined;
    const completedAt =
      effectivePatch.completedAt === undefined
        ? status === "done"
          ? (existing.completedAt ?? now)
          : undefined
        : normalizeTimestamp(effectivePatch.completedAt, 0) || undefined;
    const sessionKey =
      effectivePatch.sessionKey === undefined
        ? existing.sessionKey
        : normalizeOptionalString(effectivePatch.sessionKey);
    const execution =
      effectivePatch.execution === undefined
        ? effectivePatch.sessionKey === undefined
          ? existing.execution
          : syncExecutionSessionKey(existing.execution, sessionKey)
        : normalizeExecution(effectivePatch.execution);
    let metadata = normalizeMetadata(effectivePatch.metadata, existing.metadata, {
      allowDependencyLinks: options.allowMetadataDependencyLinks !== false,
      preserveProofId: options.preserveProofId,
    });
    if (status !== existing.status && !hasFreshLifecycleStatusSource) {
      // Status patches often spread existing metadata. Only a newly supplied
      // lifecycle source is provenance; copied markers must not survive a manual transition.
      metadata = { ...metadata, lifecycleStatusSourceUpdatedAt: undefined };
    }
    const effectivePatchRecord = effectivePatch as Record<string, unknown>;
    const automationPatch: Record<string, unknown> = {};
    for (const key of [
      "tenant",
      "boardId",
      "createdByCardId",
      "idempotencyKey",
      "skills",
      "workspace",
      "workspaceAccess",
      "maxRuntimeSeconds",
      "maxRetries",
      "scheduledAt",
    ] as const) {
      if (Object.hasOwn(effectivePatchRecord, key) && effectivePatchRecord[key] !== undefined) {
        automationPatch[key] = effectivePatchRecord[key];
      }
    }
    if (Object.keys(automationPatch).length > 0) {
      metadata = trimMetadataToBudget(
        {
          ...metadata,
          automation: normalizeAutomationPatch(automationPatch, metadata.automation),
        },
        options,
      );
    }
    const next = removeUndefinedCardFields({
      ...existing,
      title:
        effectivePatch.title === undefined ? existing.title : normalizeTitle(effectivePatch.title),
      notes:
        effectivePatch.notes === undefined ? existing.notes : normalizeNotes(effectivePatch.notes),
      status,
      priority:
        effectivePatch.priority === undefined
          ? existing.priority
          : normalizePriority(effectivePatch.priority, existing.priority),
      labels:
        effectivePatch.labels === undefined
          ? existing.labels
          : normalizeLabels(effectivePatch.labels),
      agentId:
        effectivePatch.agentId === undefined
          ? existing.agentId
          : normalizeOptionalString(effectivePatch.agentId),
      sessionKey,
      runId:
        effectivePatch.runId === undefined
          ? existing.runId
          : normalizeOptionalString(effectivePatch.runId),
      taskId:
        effectivePatch.taskId === undefined
          ? existing.taskId
          : normalizeOptionalString(effectivePatch.taskId),
      sourceUrl:
        effectivePatch.sourceUrl === undefined
          ? existing.sourceUrl
          : normalizeOptionalString(effectivePatch.sourceUrl),
      execution,
      delivery:
        effectivePatch.delivery === undefined
          ? existing.delivery
          : normalizeDelivery(effectivePatch.delivery, existing.delivery, now),
      metadata:
        effectivePatch.templateId === undefined
          ? metadata
          : { ...metadata, templateId: normalizeTemplateId(effectivePatch.templateId) },
      position:
        effectivePatchRecord.position === undefined
          ? existing.position
          : normalizePosition(effectivePatchRecord.position, existing.position),
      updatedAt: now,
      ...(startedAt ? { startedAt } : {}),
      ...(completedAt ? { completedAt } : {}),
    });
    next.metadata = trimMetadataToBudget(
      syncExecutionAttemptMetadata(next.metadata ?? {}, execution, now),
      options,
    );
    next.events = appendEvent(next, updateEvent(existing, next), now);
    if (options.enforceStatusHolds && effectivePatch.status !== undefined) {
      await this.assertActiveStatusAllowed(existing, next, now);
    }
    if (status !== "done") {
      delete next.completedAt;
    }
    if (effectivePatch.startedAt !== undefined && !startedAt) {
      delete next.startedAt;
    }
    if (effectivePatch.completedAt !== undefined && !completedAt) {
      delete next.completedAt;
    }
    if (metadataIsEmpty(next.metadata)) {
      delete next.metadata;
    }
    await this.persistCard(next, options.expectedRevision);
    await this.deleteDetachedAttachments(existing, next);
    return next;
  }

  /**
   * Single card write boundary. With `expectedRevision` the backend performs the
   * check and the write atomically when it can; backends without that capability
   * fall back to the plain write already guarded by the read-revision check in
   * {@link updateCard} and the in-process mutation queue.
   */
  private async persistCard(card: TaskfoldCard, expectedRevision?: number): Promise<void> {
    if (expectedRevision === undefined || !this.store.compareAndSwap) {
      await this.store.register(card.id, { version: 1, card });
      return;
    }
    const swapped = await this.store.compareAndSwap(card.id, expectedRevision, {
      version: 1,
      card,
    });
    if (!swapped) {
      throw new TaskfoldRevisionConflictError(card.id, expectedRevision);
    }
  }

  /**
   * Retries `run` when it loses a compare-and-swap race. Callers must re-read the
   * card inside `run` so each attempt swaps against the revision it actually saw.
   */
  protected async retryOnRevisionConflict<T>(run: () => Promise<T>): Promise<T> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await run();
      } catch (error) {
        if (!(error instanceof TaskfoldRevisionConflictError) || attempt >= CARD_CAS_MAX_ATTEMPTS) {
          throw error;
        }
      }
    }
  }

  private async assertActiveStatusAllowed(
    existing: TaskfoldCard,
    next: TaskfoldCard,
    now: number,
  ): Promise<void> {
    if (
      next.status !== "ready" &&
      next.status !== "running" &&
      next.status !== "review" &&
      next.status !== "done"
    ) {
      return;
    }
    const parents = cardParentIds(next);
    const cards =
      parents.length > 0 ? new Map((await this.list()).map((card) => [card.id, card])) : undefined;
    if (
      parents.length > 0 &&
      !parents.every((parentId) => cards?.get(parentId)?.status === "done")
    ) {
      throw new Error("card dependencies are not done.");
    }
    if (next.status === "done") {
      return;
    }
    const scheduledAt = next.metadata?.automation?.scheduledAt;
    if ((scheduledAt && scheduledAt > now) || (existing.status === "scheduled" && !scheduledAt)) {
      throw new Error("card is scheduled for later.");
    }
  }

  async delete(id: string): Promise<{ deleted: boolean }> {
    return await this.enqueueMutation(async () => await this.deleteDirect(id));
  }

  protected async deleteDirect(id: string): Promise<{ deleted: boolean }> {
    const cardId = id.trim();
    const deleted = await this.store.delete(cardId);
    if (!deleted) {
      return { deleted: false };
    }
    for (const entry of await this.subscriptionStore.entries()) {
      if (entry.value?.version === 1 && entry.value.subscription?.cardId === cardId) {
        await this.subscriptionStore.delete(entry.key);
      }
    }
    for (const entry of await this.attachmentStore.entries()) {
      if (entry.value?.version === 1 && entry.value.attachment?.cardId === cardId) {
        await this.attachmentStore.delete(entry.key);
      }
    }
    await this.removeReferencesToCard(cardId);
    return { deleted: true };
  }

  async addComment(
    id: string,
    input: TaskfoldCommentInput,
    scope?: TaskfoldMutationScope,
  ): Promise<TaskfoldCard> {
    const now = Date.now();
    const body = normalizeBoundedString(input.body, undefined, 2000, "comment body");
    if (!body) {
      throw new Error("comment body is required.");
    }
    const comment = { id: randomUUID(), body, createdAt: now };
    return await this.updateMetadata(id, (existing) => {
      assertCanMutateClaimedCard(existing, scope);
      return {
        ...existing.metadata,
        comments: [...(existing.metadata?.comments ?? []), comment].slice(-MAX_CARD_COMMENTS),
      };
    });
  }

  async addSourceReference(
    id: string,
    input: TaskfoldSourceReferenceCreateInput,
  ): Promise<TaskfoldCard> {
    const now = Date.now();
    const label = normalizeTitle(input.label);
    const target = normalizeBoundedString(input.target, undefined, 2000, "source reference target");
    const note = normalizeBoundedString(input.note, undefined, 2000, "source reference note");
    if (!target || target.includes("\0") || target.includes("\n")) {
      throw new Error("source reference target is required and must be a single line.");
    }
    return await this.mutateSourceReferences(id, (references) => [
      ...references,
      {
        id: randomUUID(),
        label,
        target,
        position: Math.max(0, ...references.map((reference) => reference.position)) + POSITION_STEP,
        createdAt: now,
        updatedAt: now,
        ...(note ? { note } : {}),
      },
    ]);
  }

  async updateSourceReference(
    id: string,
    input: TaskfoldSourceReferenceUpdateInput,
  ): Promise<TaskfoldCard> {
    const sourceReferenceId = normalizeBoundedString(
      input.sourceReferenceId,
      undefined,
      120,
      "source reference id",
    );
    if (!sourceReferenceId) {
      throw new Error("sourceReferenceId is required.");
    }
    return await this.mutateSourceReferences(id, (references) => {
      const existing = references.find((reference) => reference.id === sourceReferenceId);
      if (!existing) {
        throw new Error(`source reference not found: ${sourceReferenceId}`);
      }
      const label =
        input.label === undefined ? existing.label : normalizeTitle(input.label);
      const target =
        input.target === undefined
          ? existing.target
          : normalizeBoundedString(input.target, undefined, 2000, "source reference target");
      const note =
        input.note === undefined
          ? existing.note
          : normalizeBoundedString(input.note, undefined, 2000, "source reference note");
      if (!target || target.includes("\0") || target.includes("\n")) {
        throw new Error("source reference target is required and must be a single line.");
      }
      return references.map((reference) => {
        if (reference.id !== sourceReferenceId) {
          return reference;
        }
        const next: TaskfoldSourceReference = {
          ...reference,
          label,
          target,
          updatedAt: Date.now(),
          ...(note ? { note } : {}),
        };
        if (!note) {
          delete next.note;
        }
        return next;
      });
    });
  }

  async deleteSourceReference(
    id: string,
    input: TaskfoldSourceReferenceDeleteInput,
  ): Promise<TaskfoldCard> {
    const sourceReferenceId = normalizeBoundedString(
      input.sourceReferenceId,
      undefined,
      120,
      "source reference id",
    );
    if (!sourceReferenceId) {
      throw new Error("sourceReferenceId is required.");
    }
    return await this.mutateSourceReferences(id, (references) => {
      if (!references.some((reference) => reference.id === sourceReferenceId)) {
        throw new Error(`source reference not found: ${sourceReferenceId}`);
      }
      return references.filter((reference) => reference.id !== sourceReferenceId);
    });
  }

  async reorderSourceReferences(
    id: string,
    input: TaskfoldSourceReferenceReorderInput,
  ): Promise<TaskfoldCard> {
    if (
      !Array.isArray(input.sourceReferenceIds) ||
      input.sourceReferenceIds.some((value) => typeof value !== "string")
    ) {
      throw new Error("sourceReferenceIds are required.");
    }
    const sourceReferenceIds = input.sourceReferenceIds as string[];
    return await this.mutateSourceReferences(id, (references) => {
      if (
        sourceReferenceIds.length !== references.length ||
        new Set(sourceReferenceIds).size !== sourceReferenceIds.length
      ) {
        throw new Error("sourceReferenceIds must contain every source reference exactly once.");
      }
      const byId = new Map(references.map((reference) => [reference.id, reference]));
      const now = Date.now();
      return sourceReferenceIds.map((sourceReferenceId, index) => {
        const reference = byId.get(sourceReferenceId);
        if (!reference) {
          throw new Error(`source reference not found: ${sourceReferenceId}`);
        }
        return {
          ...reference,
          position: (index + 1) * POSITION_STEP,
          updatedAt: now,
        };
      });
    });
  }

  private async mutateSourceReferences(
    id: string,
    mutate: (references: TaskfoldSourceReference[]) => TaskfoldSourceReference[],
  ): Promise<TaskfoldCard> {
    return await this.enqueueMutation(async () => {
      const existing = await this.get(id);
      if (!existing) {
        throw new Error(`card not found: ${id}`);
      }
      const sourceReferences = mutate(
        [...(existing.sourceReferences ?? [])].toSorted(
          (left, right) => left.position - right.position || left.createdAt - right.createdAt,
        ),
      );
      const now = Date.now();
      const next = removeUndefinedCardFields({
        ...existing,
        ...(sourceReferences.length ? { sourceReferences } : {}),
        updatedAt: now,
      });
      if (!sourceReferences.length) {
        delete next.sourceReferences;
      }
      next.events = appendEvent(next, { kind: "edited" }, now);
      await this.store.register(next.id, { version: 1, card: next });
      return next;
    });
  }

  async addLink(id: string, input: TaskfoldLinkInput): Promise<TaskfoldCard> {
    const now = Date.now();
    const targetCardId = normalizeBoundedString(input.targetCardId, undefined, 120, "link target");
    const url = normalizeBoundedString(input.url, undefined, 2000, "link URL");
    const title = normalizeBoundedString(input.title, undefined, 180, "link title");
    if (!targetCardId && !url) {
      throw new Error("link targetCardId or url is required.");
    }
    const type = normalizeLinkType(input.type, "relates_to");
    if (type === "parent" || type === "child") {
      throw new Error("parent and child dependency links must use linkDependency.");
    }
    const link: TaskfoldLink = {
      id: randomUUID(),
      type,
      createdAt: now,
      ...(targetCardId ? { targetCardId } : {}),
      ...(title ? { title } : {}),
      ...(url ? { url } : {}),
    };
    return await this.updateMetadata(id, (existing) => ({
      ...existing.metadata,
      links: appendLinkPreservingDependencies(existing.metadata?.links ?? [], link),
    }));
  }

  async linkCards(
    parentId: string,
    childId: string,
    scope?: TaskfoldMutationScope,
  ): Promise<TaskfoldCard> {
    return await this.enqueueMutation(
      async () => await this.linkCardsDirect(parentId, childId, Date.now(), { scope }),
    );
  }

  protected async linkCardsDirect(
    parentId: string,
    childId: string,
    now = Date.now(),
    options: { allowStatusOnlyActiveChild?: boolean; scope?: TaskfoldMutationScope } = {},
  ): Promise<TaskfoldCard> {
    if (parentId.trim() === childId.trim()) {
      throw new Error("parent and child cards must differ.");
    }
    const parent = await this.get(parentId);
    const child = await this.get(childId);
    if (!parent) {
      throw new Error(`card not found: ${parentId}`);
    }
    if (!child) {
      throw new Error(`card not found: ${childId}`);
    }
    assertCanMutateClaimedCard(parent, options.scope);
    assertCanMutateClaimedCard(child, options.scope);
    if (child.status === "done" || child.status === "blocked") {
      const cardsById = new Map((await this.list()).map((card) => [card.id, card]));
      const parentIds = [...cardParentIds(child), parent.id].filter(
        (id, index, ids) => ids.indexOf(id) === index,
      );
      if (parentIds.some((id) => cardsById.get(id)?.status !== "done")) {
        throw new Error("terminal child cards cannot gain incomplete parent dependencies.");
      }
    }
    if (isActiveDependencyTarget(child, { allowStatusOnly: options.allowStatusOnlyActiveChild })) {
      throw new Error("active child cards cannot gain parent dependencies.");
    }
    if (await this.dependsOn(parent.id, child.id)) {
      throw new Error("dependency link would create a cycle.");
    }
    const parentLinks = parent.metadata?.links ?? [];
    const childLinks = child.metadata?.links ?? [];
    const nextParentLinks = parentLinks.some(
      (link) => link.type === "child" && link.targetCardId === child.id,
    )
      ? parentLinks
      : appendLinkPreservingDependencies(parentLinks, {
          id: randomUUID(),
          type: "child" as const,
          targetCardId: child.id,
          createdAt: now,
        });
    const nextChildLinks = childLinks.some(
      (link) => link.type === "parent" && link.targetCardId === parent.id,
    )
      ? childLinks
      : appendLinkPreservingDependencies(childLinks, {
          id: randomUUID(),
          type: "parent" as const,
          targetCardId: parent.id,
          createdAt: now,
        });
    await this.updateCard(parent.id, {
      metadata: { ...parent.metadata, links: nextParentLinks },
    });
    const nextChild = await this.updateCard(child.id, {
      metadata: { ...child.metadata, links: nextChildLinks },
    });
    return await this.promoteDependencyReady(nextChild.id);
  }

  private async dependencyTargetStatus(card: TaskfoldCard, now: number): Promise<TaskfoldStatus> {
    const scheduledAt = card.metadata?.automation?.scheduledAt;
    const parents = cardParentIds(card);
    if (card.status === "scheduled" && !scheduledAt) {
      return "scheduled";
    }
    if (parents.length === 0) {
      if (scheduledAt && scheduledAt > now && isDependencyPromotableStatus(card.status)) {
        return "scheduled";
      }
      return card.status === "scheduled" ? "ready" : card.status;
    }
    const parentCards = await Promise.all(parents.map((parentId) => this.get(parentId)));
    const parentsDone = parentCards.every((parent) => parent?.status === "done");
    if (
      !parentsDone &&
      scheduledAt &&
      scheduledAt > now &&
      isDependencyPromotableStatus(card.status)
    ) {
      return "scheduled";
    }
    if (!parentsDone && isDependencyPromotableStatus(card.status)) {
      return "todo";
    }
    if (
      parentsDone &&
      scheduledAt &&
      scheduledAt > now &&
      isDependencyPromotableStatus(card.status)
    ) {
      return "scheduled";
    }
    return parentsDone && isDependencyPromotableStatus(card.status) ? "ready" : card.status;
  }

  private async dependsOn(cardId: string, targetParentId: string): Promise<boolean> {
    const cards = new Map((await this.list()).map((entry) => [entry.id, entry]));
    const seen = new Set<string>();
    const visit = (id: string): boolean => {
      if (id === targetParentId) {
        return true;
      }
      if (seen.has(id)) {
        return false;
      }
      seen.add(id);
      const card = cards.get(id);
      return Boolean(card && cardParentIds(card).some(visit));
    };
    return visit(cardId);
  }

  protected async recordDispatch(card: TaskfoldCard, now: number): Promise<TaskfoldCard> {
    const metadata = trimMetadataToBudget(
      normalizeMetadata(
        {
          ...card.metadata,
          automation: normalizeAutomation(
            {
              ...card.metadata?.automation,
              dispatchCount: (card.metadata?.automation?.dispatchCount ?? 0) + 1,
              lastDispatchAt: now,
            },
            card.metadata?.automation,
          ),
        },
        card.metadata,
      ),
    );
    const next = removeUndefinedCardFields({
      ...card,
      ...(!metadataIsEmpty(metadata) ? { metadata } : { metadata: undefined }),
      events: appendEvent(card, { kind: "dispatch" }, now),
    });
    await this.store.register(card.id, { version: 1, card: next });
    return next;
  }

  protected async recordOrchestrationCandidate(
    card: TaskfoldCard,
    now: number,
  ): Promise<TaskfoldCard> {
    const metadata = trimMetadataToBudget({
      ...card.metadata,
      workerLogs: [
        ...(card.metadata?.workerLogs ?? []),
        {
          id: randomUUID(),
          level: "info" as const,
          message: "Auto orchestration marked this triage card for specification or decomposition.",
          createdAt: now,
        },
      ].slice(-MAX_CARD_WORKER_LOGS),
      workerProtocol: {
        state: "idle" as const,
        updatedAt: now,
        detail: "Awaiting taskfold_specify or taskfold_decompose.",
      },
    });
    const next = removeUndefinedCardFields({
      ...card,
      ...(!metadataIsEmpty(metadata) ? { metadata } : { metadata: undefined }),
      events: appendEvent(card, { kind: "orchestration" }, now),
    });
    await this.store.register(card.id, { version: 1, card: next });
    return next;
  }

  protected async promoteDependencyReady(id: string, now = Date.now()): Promise<TaskfoldCard> {
    const card = await this.get(id);
    if (!card) {
      throw new Error(`card not found: ${id}`);
    }
    if (card.metadata?.archivedAt) {
      return card;
    }
    const target = await this.dependencyTargetStatus(card, now);
    if (target === card.status) {
      return card;
    }
    return await this.updateCard(card.id, { status: target });
  }
}
/* oxlint-disable max-lines -- TODO: split this grandfathered oversized file. */
