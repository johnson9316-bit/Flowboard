import { randomUUID } from "node:crypto";
import {
  TASKFOLD_STATUSES,
  type TaskfoldAttemptStatus,
  type TaskfoldCard,
  type TaskfoldDiagnostic,
  type TaskfoldDiagnosticAction,
  type TaskfoldDiagnosticKind,
  type TaskfoldDiagnosticSeverity,
  type TaskfoldEvent,
  type TaskfoldExecution,
  type TaskfoldMetadata,
  type TaskfoldNotification,
  type TaskfoldRunAttempt,
  type TaskfoldStatus,
} from "../../contract/index.js";
import { safeEqualSecret } from "openclaw/plugin-sdk/security-runtime";
import { truncateUtf16Safe } from "openclaw/plugin-sdk/text-utility-runtime";
import {
  BLOCKED_TOO_LONG_MS,
  TASKFOLD_PROMPT_VERSION,
  MAX_CARD_ATTEMPTS,
  MAX_CARD_EVENTS,
  READY_STRANDED_MS,
  RUNNING_HEARTBEAT_STALE_MS,
} from "./store-constants.js";
import type { TaskfoldMutationScope } from "./store-inputs.js";
import {
  metadataIsEmpty,
  normalizeEvents,
  normalizeOptionalString,
  normalizeTimestamp,
  removeUndefinedMetadataFields,
} from "./store-normalizers.js";

export function compareCards(left: TaskfoldCard, right: TaskfoldCard): number {
  if (left.status !== right.status) {
    return TASKFOLD_STATUSES.indexOf(left.status) - TASKFOLD_STATUSES.indexOf(right.status);
  }
  if (left.position !== right.position) {
    return left.position - right.position;
  }
  return left.createdAt - right.createdAt;
}

export function cardSessionKey(card: TaskfoldCard): string | undefined {
  return card.sessionKey ?? card.execution?.sessionKey;
}

export function cardRunId(card: TaskfoldCard): string | undefined {
  return card.runId ?? card.execution?.runId;
}

function executionAttemptStatus(execution: TaskfoldExecution): TaskfoldAttemptStatus {
  if (execution.status === "running") {
    return "running";
  }
  if (execution.status === "blocked") {
    return "blocked";
  }
  if (execution.status === "done" || execution.status === "review") {
    return "succeeded";
  }
  return "stopped";
}

export function syncExecutionAttemptMetadata(
  metadata: TaskfoldMetadata,
  execution: TaskfoldExecution | undefined,
  now: number,
): TaskfoldMetadata {
  if (!execution) {
    return metadata;
  }
  const attempts = [...(metadata.attempts ?? [])];
  const key = execution.runId ?? execution.sessionKey ?? execution.id;
  const existingIndex = attempts.findIndex(
    (attempt) =>
      (execution.runId && attempt.runId === execution.runId) ||
      (!execution.runId && attempt.id === key),
  );
  const existingAttempt = existingIndex >= 0 ? attempts[existingIndex] : undefined;
  // An operator stop leaves the execution record blocked while preserving the
  // attempt's more precise stopped outcome.
  const attemptStatus =
    execution.status === "blocked" && existingAttempt?.status === "stopped"
      ? "stopped"
      : executionAttemptStatus(execution);
  const nextAttempt: TaskfoldRunAttempt = {
    id: existingAttempt?.id ?? key,
    status: attemptStatus,
    startedAt: existingAttempt?.startedAt ?? execution.startedAt,
    mode: execution.mode,
    ...(execution.engine ? { engine: execution.engine } : {}),
    ...(execution.model ? { model: execution.model } : {}),
    ...(execution.sessionKey ? { sessionKey: execution.sessionKey } : {}),
    ...(execution.runId ? { runId: execution.runId } : {}),
    ...(attemptStatus !== "running" && { endedAt: execution.updatedAt || now }),
    ...(attemptStatus !== "succeeded" && existingAttempt?.error
      ? { error: existingAttempt.error }
      : {}),
    // Stamped once when the attempt appears, then carried forward, so a prompt
    // change mid-run cannot relabel an attempt already under way.
    promptVersion: existingAttempt?.promptVersion ?? TASKFOLD_PROMPT_VERSION,
  };
  if (existingIndex >= 0) {
    attempts[existingIndex] = nextAttempt;
  } else {
    attempts.push(nextAttempt);
  }
  const previousFailed =
    existingAttempt?.status === "blocked" || existingAttempt?.status === "failed";
  const attemptFailed = attemptStatus === "blocked" || attemptStatus === "failed";
  const failureCount = attemptFailed
    ? previousFailed
      ? metadata.failureCount
      : (metadata.failureCount ?? 0) + 1
    : attemptStatus === "succeeded"
      ? 0
      : metadata.failureCount;
  return removeUndefinedMetadataFields({
    ...metadata,
    attempts: attempts.slice(-MAX_CARD_ATTEMPTS),
    failureCount,
  });
}

export function appendEvent(
  card: TaskfoldCard,
  event: Omit<TaskfoldEvent, "id" | "at">,
  at = Date.now(),
): TaskfoldEvent[] {
  return [
    ...normalizeEvents(card.events),
    {
      id: randomUUID(),
      at,
      ...event,
    },
  ].slice(-MAX_CARD_EVENTS);
}

function latestMetadataIdChanged(
  existing: readonly { id: string }[] | undefined,
  next: readonly { id: string }[] | undefined,
): boolean {
  const latestId = next?.at(-1)?.id;
  return Boolean(latestId && latestId !== existing?.at(-1)?.id);
}

export function lifecycleStatusSourceUpdatedAtFromPatch(metadata: unknown): number | undefined {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return undefined;
  }
  if (!Object.hasOwn(metadata, "lifecycleStatusSourceUpdatedAt")) {
    return undefined;
  }
  const sourceUpdatedAt = normalizeTimestamp(
    (metadata as Record<string, unknown>).lifecycleStatusSourceUpdatedAt,
    0,
  );
  return sourceUpdatedAt;
}

function latestStatusTransitionAt(card: TaskfoldCard): number | undefined {
  for (let index = (card.events?.length ?? 0) - 1; index >= 0; index -= 1) {
    const event = card.events?.[index];
    if (
      (event?.kind === "moved" || event?.kind === "created") &&
      ((event.kind === "created" && card.status !== "todo") ||
        (event.kind === "moved" && event.fromStatus !== event.toStatus)) &&
      event.toStatus === card.status &&
      typeof event.at === "number" &&
      Number.isFinite(event.at)
    ) {
      return event.at;
    }
  }
  return undefined;
}

export function shouldSkipPersistedLifecycleStatusUpdate(
  existing: TaskfoldCard,
  sourceUpdatedAt: number,
): boolean {
  const lifecycleStatusSourceUpdatedAt = existing.metadata?.lifecycleStatusSourceUpdatedAt;
  if (lifecycleStatusSourceUpdatedAt !== undefined) {
    return sourceUpdatedAt < lifecycleStatusSourceUpdatedAt;
  }
  const statusTransitionAt = latestStatusTransitionAt(existing);
  return statusTransitionAt !== undefined && sourceUpdatedAt < statusTransitionAt;
}

export function updateEvent(
  existing: TaskfoldCard,
  next: TaskfoldCard,
): Omit<TaskfoldEvent, "id" | "at"> {
  if (
    existing.metadata?.workerProtocol?.state !== next.metadata?.workerProtocol?.state &&
    next.metadata?.workerProtocol?.state === "violated"
  ) {
    return { kind: "protocol_violation" };
  }
  if (existing.status !== next.status || existing.position !== next.position) {
    return {
      kind: "moved",
      fromStatus: existing.status,
      toStatus: next.status,
    };
  }
  if (cardSessionKey(existing) !== cardSessionKey(next)) {
    return {
      kind: "linked",
      ...(cardSessionKey(next) ? { sessionKey: cardSessionKey(next) } : {}),
    };
  }
  if (
    existing.execution?.status !== next.execution?.status ||
    existing.execution?.engine !== next.execution?.engine ||
    cardRunId(existing) !== cardRunId(next)
  ) {
    const existingAttempts = existing.metadata?.attempts ?? [];
    const nextAttempts = next.metadata?.attempts ?? [];
    const latestAttempt = nextAttempts.at(-1);
    if (nextAttempts.length > existingAttempts.length) {
      return {
        kind: "attempt_started",
        ...(latestAttempt?.sessionKey ? { sessionKey: latestAttempt.sessionKey } : {}),
        ...(latestAttempt?.runId ? { runId: latestAttempt.runId } : {}),
      };
    }
    const previousAttempt = latestAttempt
      ? existingAttempts.find((attempt) => attempt.id === latestAttempt.id)
      : undefined;
    if (latestAttempt && previousAttempt?.status !== latestAttempt.status) {
      return {
        kind: "attempt_updated",
        ...(latestAttempt.sessionKey ? { sessionKey: latestAttempt.sessionKey } : {}),
        ...(latestAttempt.runId ? { runId: latestAttempt.runId } : {}),
      };
    }
    return {
      kind: "execution_updated",
      ...(cardSessionKey(next) ? { sessionKey: cardSessionKey(next) } : {}),
      ...(cardRunId(next) ? { runId: cardRunId(next) } : {}),
    };
  }
  if (existing.metadata?.claim?.token !== next.metadata?.claim?.token) {
    return { kind: "claimed" };
  }
  if (existing.metadata?.claim?.lastHeartbeatAt !== next.metadata?.claim?.lastHeartbeatAt) {
    return { kind: "heartbeat" };
  }
  if (
    (existing.metadata?.comments?.length ?? 0) !== (next.metadata?.comments?.length ?? 0) ||
    latestMetadataIdChanged(existing.metadata?.comments, next.metadata?.comments)
  ) {
    return { kind: "comment_added" };
  }
  if (
    (existing.metadata?.links?.length ?? 0) !== (next.metadata?.links?.length ?? 0) ||
    latestMetadataIdChanged(existing.metadata?.links, next.metadata?.links)
  ) {
    return { kind: "link_added" };
  }
  if (
    (existing.metadata?.proof?.length ?? 0) !== (next.metadata?.proof?.length ?? 0) ||
    latestMetadataIdChanged(existing.metadata?.proof, next.metadata?.proof)
  ) {
    return { kind: "proof_added" };
  }
  if (
    (existing.metadata?.artifacts?.length ?? 0) !== (next.metadata?.artifacts?.length ?? 0) ||
    latestMetadataIdChanged(existing.metadata?.artifacts, next.metadata?.artifacts)
  ) {
    return { kind: "artifact_added" };
  }
  if (
    (existing.metadata?.attachments?.length ?? 0) !== (next.metadata?.attachments?.length ?? 0) ||
    latestMetadataIdChanged(existing.metadata?.attachments, next.metadata?.attachments)
  ) {
    return (next.metadata?.attachments?.length ?? 0) > (existing.metadata?.attachments?.length ?? 0)
      ? { kind: "attachment_added" }
      : { kind: "edited" };
  }
  if (existing.metadata?.workerProtocol?.state !== next.metadata?.workerProtocol?.state) {
    return { kind: "orchestration" };
  }
  if (
    (existing.metadata?.workerLogs?.length ?? 0) !== (next.metadata?.workerLogs?.length ?? 0) ||
    latestMetadataIdChanged(existing.metadata?.workerLogs, next.metadata?.workerLogs)
  ) {
    return { kind: "orchestration" };
  }
  if ((existing.metadata?.diagnostics?.length ?? 0) !== (next.metadata?.diagnostics?.length ?? 0)) {
    return { kind: "diagnostic" };
  }
  if (
    (existing.metadata?.notifications?.length ?? 0) !==
      (next.metadata?.notifications?.length ?? 0) ||
    latestMetadataIdChanged(existing.metadata?.notifications, next.metadata?.notifications)
  ) {
    return { kind: "notification" };
  }
  if (
    existing.metadata?.automation?.dispatchCount !== next.metadata?.automation?.dispatchCount ||
    existing.metadata?.automation?.lastDispatchAt !== next.metadata?.automation?.lastDispatchAt
  ) {
    return { kind: "dispatch" };
  }
  if (!existing.metadata?.archivedAt && next.metadata?.archivedAt) {
    return { kind: "archived" };
  }
  if (existing.metadata?.archivedAt && !next.metadata?.archivedAt) {
    return { kind: "unarchived" };
  }
  if (!existing.metadata?.stale && next.metadata?.stale) {
    return { kind: "stale" };
  }
  return { kind: "edited" };
}

export function removeUndefinedCardFields(card: TaskfoldCard): TaskfoldCard {
  const next = { ...card };
  for (const key of [
    "notes",
    "agentId",
    "sessionKey",
    "runId",
    "taskId",
    "sourceUrl",
    "execution",
    "delivery",
    "sourceReferences",
    "startedAt",
    "completedAt",
    "metadata",
  ] as const) {
    if (next[key] === undefined) {
      delete next[key];
    }
  }
  if (metadataIsEmpty(next.metadata)) {
    delete next.metadata;
  }
  return next;
}

export function assertCanMutateClaimedCard(
  card: TaskfoldCard,
  scope: TaskfoldMutationScope | undefined,
) {
  if (!scope) {
    return;
  }
  const claim = card.metadata?.claim;
  if (!claim) {
    return;
  }
  const ownerId = normalizeOptionalString(scope.ownerId);
  const token = normalizeOptionalString(scope.token);
  if (claim.ownerId !== ownerId && !safeEqualSecret(token, claim.token)) {
    throw new Error(`card is claimed by ${claim.ownerId}.`);
  }
}

export function retryBudgetExhausted(card: TaskfoldCard): boolean {
  const maxRetries = card.metadata?.automation?.maxRetries;
  return Boolean(maxRetries && (card.metadata?.failureCount ?? 0) > maxRetries);
}

function diagnostic(
  params: {
    kind: TaskfoldDiagnosticKind;
    severity: TaskfoldDiagnosticSeverity;
    title: string;
    detail: string;
    actions: TaskfoldDiagnosticAction[];
  },
  now: number,
): TaskfoldDiagnostic {
  return {
    ...params,
    firstSeenAt: now,
    lastSeenAt: now,
    count: 1,
  };
}

export function mergeDiagnostics(
  previous: readonly TaskfoldDiagnostic[] | undefined,
  next: TaskfoldDiagnostic[],
): TaskfoldDiagnostic[] {
  const byKind = new Map(previous?.map((entry) => [entry.kind, entry]));
  return next.map((entry) => {
    const prior = byKind.get(entry.kind);
    return prior
      ? {
          ...entry,
          firstSeenAt: prior.firstSeenAt,
          count: prior.count + 1,
        }
      : entry;
  });
}

/**
 * The freshest evidence that whoever owns this card is still working. Only
 * `store.heartbeat()` refreshes `claim.lastHeartbeatAt`, so a claimed run that is
 * genuinely still active but whose worker never calls `taskfold_heartbeat` (the
 * prompt asks for it, but nothing enforces it) must not be judged solely on that
 * one timestamp — any card write (a log, a proof, a comment) is also evidence of
 * activity. Taking the max of all three keeps the liveness check from mistaking
 * silence on one channel for silence everywhere. Exported so the reconciler judges
 * liveness by exactly the rule the `running_without_heartbeat` diagnostic uses,
 * rather than a second definition that could drift from it.
 */
export function taskfoldLastActivityAt(card: TaskfoldCard): number {
  return Math.max(
    card.metadata?.claim?.lastHeartbeatAt ?? 0,
    card.execution?.updatedAt ?? 0,
    card.updatedAt,
  );
}

export function computeCardDiagnostics(card: TaskfoldCard, now: number): TaskfoldDiagnostic[] {
  if (card.metadata?.archivedAt) {
    return [];
  }
  const diagnostics: TaskfoldDiagnostic[] = [];
  const claim = card.metadata?.claim;
  const lastHeartbeatAt = taskfoldLastActivityAt(card);
  if (
    (card.status === "todo" || card.status === "backlog" || card.status === "ready") &&
    card.agentId &&
    now - card.updatedAt > READY_STRANDED_MS
  ) {
    diagnostics.push(
      diagnostic(
        {
          kind: "stranded_ready",
          severity: "warning",
          title: "Assigned card is waiting",
          detail: "The card has an assigned agent but has not been claimed recently.",
          actions: [{ kind: "claim", label: "Claim card" }],
        },
        now,
      ),
    );
  }
  if (card.status === "running" && now - lastHeartbeatAt > RUNNING_HEARTBEAT_STALE_MS) {
    diagnostics.push(
      diagnostic(
        {
          kind: "running_without_heartbeat",
          severity: "error",
          title: "Running card has no recent heartbeat",
          detail: "The linked run or claim has not reported recent activity.",
          actions: [
            { kind: "open_session", label: "Open session" },
            { kind: "reassign", label: "Reassign card" },
          ],
        },
        now,
      ),
    );
  }
  if (card.status === "blocked" && now - card.updatedAt > BLOCKED_TOO_LONG_MS) {
    diagnostics.push(
      diagnostic(
        {
          kind: "blocked_too_long",
          severity: "warning",
          title: "Blocked card needs attention",
          detail: "The card has been blocked for more than a day.",
          actions: [{ kind: "unblock", label: "Move to todo" }],
        },
        now,
      ),
    );
  }
  if ((card.metadata?.failureCount ?? 0) >= 2) {
    diagnostics.push(
      diagnostic(
        {
          kind: "repeated_failures",
          severity: "error",
          title: "Repeated run failures",
          detail: "Multiple attempts failed or blocked on this card.",
          actions: [{ kind: "reassign", label: "Reassign card" }],
        },
        now,
      ),
    );
  }
  if (
    card.status === "done" &&
    !(
      card.metadata?.proof?.length ||
      card.metadata?.artifacts?.length ||
      card.metadata?.attachments?.length
    )
  ) {
    diagnostics.push(
      diagnostic(
        {
          kind: "missing_proof",
          severity: "warning",
          title: "Done card has no proof",
          detail: "The card is marked done without proof or an attached artifact.",
          actions: [{ kind: "add_proof", label: "Add proof" }],
        },
        now,
      ),
    );
  }
  if (card.sessionKey && !card.execution && card.status === "running") {
    diagnostics.push(
      diagnostic(
        {
          kind: "orphaned_session",
          severity: "warning",
          title: "Running card has only a loose session link",
          detail: "The card is running but has no execution record for lifecycle handoff.",
          actions: [{ kind: "open_session", label: "Open session" }],
        },
        now,
      ),
    );
  }
  return diagnostics;
}

export function capText(value: string | undefined, max: number): string | undefined {
  if (!value) {
    return undefined;
  }
  return value.length <= max ? value : `${truncateUtf16Safe(value, Math.max(0, max - 1))}…`;
}

export function cardBoardId(card: TaskfoldCard): string {
  return card.metadata?.automation?.boardId ?? "default";
}

export function cardParentIds(card: TaskfoldCard): string[] {
  return (card.metadata?.links ?? [])
    .filter((link) => link.type === "parent" && link.targetCardId)
    .map((link) => link.targetCardId!)
    .filter((id, index, ids) => ids.indexOf(id) === index);
}

export function cardChildIds(card: TaskfoldCard): string[] {
  return (card.metadata?.links ?? [])
    .filter((link) => link.type === "child" && link.targetCardId)
    .map((link) => link.targetCardId!)
    .filter((id, index, ids) => ids.indexOf(id) === index);
}

export function latestRunningAttempt(card: TaskfoldCard): TaskfoldRunAttempt | undefined {
  return card.metadata?.attempts?.findLast((attempt) => attempt.status === "running");
}

export function isDependencyPromotableStatus(status: TaskfoldStatus): boolean {
  return (
    status === "backlog" ||
    status === "triage" ||
    status === "todo" ||
    status === "scheduled" ||
    status === "ready"
  );
}

export function isActiveDependencyTarget(
  card: TaskfoldCard,
  options: { allowStatusOnly?: boolean } = {},
): boolean {
  return (
    Boolean(card.metadata?.claim) ||
    card.execution?.status === "running" ||
    Boolean(latestRunningAttempt(card)) ||
    (!options.allowStatusOnly && (card.status === "running" || card.status === "review"))
  );
}

export function closeRunningAttempts(
  attempts: TaskfoldRunAttempt[] | undefined,
  now: number,
  status: TaskfoldAttemptStatus,
  reason?: string,
): TaskfoldRunAttempt[] | undefined {
  if (!attempts?.some((attempt) => attempt.status === "running")) {
    return attempts;
  }
  return attempts.map((attempt) =>
    attempt.status === "running"
      ? { ...attempt, status, endedAt: now, ...(reason ? { error: reason } : {}) }
      : attempt,
  );
}

export function notificationSequence(event: TaskfoldNotification): number | undefined {
  return typeof event.sequence === "number" && Number.isFinite(event.sequence)
    ? Math.trunc(event.sequence)
    : undefined;
}

export function compareNotifications(a: TaskfoldNotification, b: TaskfoldNotification): number {
  if (a.createdAt !== b.createdAt) {
    return a.createdAt - b.createdAt;
  }
  const aSequence = notificationSequence(a);
  const bSequence = notificationSequence(b);
  if (aSequence !== undefined && bSequence !== undefined) {
    return aSequence - bSequence || a.id.localeCompare(b.id);
  }
  if (aSequence !== undefined) {
    return -1;
  }
  if (bSequence !== undefined) {
    return 1;
  }
  return a.id.localeCompare(b.id);
}
/* oxlint-disable max-lines -- TODO: split this grandfathered oversized file. */
