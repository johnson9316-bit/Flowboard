// Flowboard plugin module reconciles card state against live host state.
//
// This is the control loop. It runs in the Gateway process, on a timer plus once
// at startup, so a card converges on the truth whether or not anybody has the
// board open. Previously the equivalent logic lived in the browser, which meant
// an unattended Gateway left finished runs marked "running" forever, and a Gateway
// restart orphaned every in-flight run with nothing to clean it up.
import type { FlowboardCard } from "../../contract/index.js";
import { formatErrorMessage } from "openclaw/plugin-sdk/error-runtime";
import type { PluginRuntime } from "openclaw/plugin-sdk/plugin-runtime";
import type { OpenClawPluginService } from "../api.js";
import { cleanupFlowboardRunWorktree } from "./dispatcher-workspace.js";
import {
  executionStatusForLifecycle,
  getFlowboardLifecycle,
  shouldSyncCardStatus,
  shouldSyncExecutionStatus,
  staleSessionState,
  type FlowboardHostSession,
  type FlowboardHostTask,
  type FlowboardHostTaskStatus,
} from "./lifecycle.js";
import { cardRunId, cardSessionKey } from "./store-card-helpers.js";
import { isFlowboardClaimReclaimable } from "./store-constants.js";
import { FlowboardRevisionConflictError } from "./store-core.js";
import type { FlowboardStore } from "./store.js";

const RECONCILE_INTERVAL_MS = 15_000;
const SESSIONS_REQUEST_TIMEOUT_MS = 10_000;

const HOST_TASK_STATUSES = new Set<string>([
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
  "timed_out",
]);

export type FlowboardReconcilerRuntime = Pick<PluginRuntime, "gateway" | "tasks" | "worktrees">;

type SessionsListResponse = {
  sessions?: unknown;
};

function readHostSession(value: unknown): FlowboardHostSession | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const row = value as Record<string, unknown>;
  const key = typeof row.key === "string" ? row.key.trim() : "";
  if (!key) {
    return undefined;
  }
  return {
    key,
    ...(typeof row.status === "string" ? { status: row.status } : {}),
    ...(typeof row.updatedAt === "number" && Number.isFinite(row.updatedAt)
      ? { updatedAt: row.updatedAt }
      : {}),
    ...(typeof row.hasActiveRun === "boolean" ? { hasActiveRun: row.hasActiveRun } : {}),
    ...(typeof row.abortedLastRun === "boolean" ? { abortedLastRun: row.abortedLastRun } : {}),
  };
}

function readHostTask(value: unknown): FlowboardHostTask | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const row = value as Record<string, unknown>;
  const status = typeof row.status === "string" ? row.status : "";
  if (!HOST_TASK_STATUSES.has(status)) {
    return undefined;
  }
  return {
    status: status as FlowboardHostTaskStatus,
    ...(typeof row.updatedAt === "number" || typeof row.updatedAt === "string"
      ? { updatedAt: row.updatedAt }
      : {}),
  };
}

/**
 * Live sessions as the host sees them. Returns undefined — rather than an empty
 * list — when the host cannot be asked, because "no sessions" and "unknown" must
 * lead to different decisions: an empty list would make every linked card look
 * abandoned.
 */
async function readHostSessions(
  runtime: FlowboardReconcilerRuntime,
): Promise<FlowboardHostSession[] | undefined> {
  if (!(await runtime.gateway.isAvailable())) {
    return undefined;
  }
  const response = await runtime.gateway.request<SessionsListResponse>("sessions.list", undefined, {
    timeoutMs: SESSIONS_REQUEST_TIMEOUT_MS,
  });
  if (!Array.isArray(response?.sessions)) {
    return undefined;
  }
  return response.sessions.flatMap((row) => {
    const session = readHostSession(row);
    return session ? [session] : [];
  });
}

/** Task record for a card, read from the in-process task runtime. */
function readCardTask(
  runtime: FlowboardReconcilerRuntime,
  card: FlowboardCard,
): FlowboardHostTask | undefined {
  const sessionKey = cardSessionKey(card);
  if (!sessionKey) {
    return undefined;
  }
  try {
    const runs = runtime.tasks.runs.bindSession({ sessionKey });
    const record = card.taskId ? runs.get(card.taskId) : runs.findLatest();
    return readHostTask(record);
  } catch {
    return undefined;
  }
}

function hasRunningAttempt(card: FlowboardCard): boolean {
  return Boolean(card.metadata?.attempts?.some((attempt) => attempt.status === "running"));
}

/** Cards whose recorded state claims work is in flight, so it can be checked. */
function activeCards(cards: readonly FlowboardCard[]): FlowboardCard[] {
  return cards.filter(
    (card) =>
      !card.metadata?.archivedAt &&
      (card.status === "running" ||
        card.execution?.status === "running" ||
        hasRunningAttempt(card) ||
        Boolean(card.metadata?.claim)),
  );
}

type ReconcileOutcome = {
  checked: number;
  updated: number;
  finished: number;
  reclaimed: number;
  /** Cards this pass could not converge. They are retried on the next pass. */
  skipped: number;
};

/**
 * Applies one lifecycle verdict. Status, execution status and staleness are
 * written together so a card cannot be left half-converged, and the write is a
 * compare-and-swap so a worker reporting in mid-pass wins over this pass.
 */
async function applyLifecycle(params: {
  store: FlowboardStore;
  card: FlowboardCard;
  sessions: readonly FlowboardHostSession[];
  runtime: FlowboardReconcilerRuntime;
  now: number;
}): Promise<boolean> {
  const { store, card, sessions, runtime, now } = params;
  const task = readCardTask(runtime, card);
  const lifecycle = getFlowboardLifecycle({
    card,
    sessions,
    ...(task ? { task } : {}),
    now,
  });
  const executionStatus = executionStatusForLifecycle(lifecycle);
  const patch: Record<string, unknown> = {};
  const metadataPatch: Record<string, unknown> = {};

  if (lifecycle.sourceUpdatedAt !== undefined && shouldSyncCardStatus(card, lifecycle.targetStatus)) {
    patch.status = lifecycle.targetStatus;
    // Provenance for the status write. The store rejects it if the card already
    // carries a newer source, which is what keeps a slow pass from winning.
    metadataPatch.lifecycleStatusSourceUpdatedAt = lifecycle.sourceUpdatedAt;
  }
  if (shouldSyncExecutionStatus(card, executionStatus)) {
    patch.execution = { ...card.execution, status: executionStatus, updatedAt: now };
  }

  const stale = lifecycle.session ? staleSessionState(lifecycle.session, now) : undefined;
  const existingStale = card.metadata?.stale;
  if (stale) {
    const changed =
      !existingStale ||
      existingStale.lastSessionUpdatedAt !== stale.lastSessionUpdatedAt ||
      existingStale.reason !== stale.reason;
    if (changed) {
      // Keep the original detection time so "how long has this been stuck" stays
      // answerable across passes.
      metadataPatch.stale = { ...stale, detectedAt: existingStale?.detectedAt ?? stale.detectedAt };
    }
  } else if (existingStale) {
    metadataPatch.stale = undefined;
  }

  if (Object.keys(metadataPatch).length > 0) {
    patch.metadata = { ...card.metadata, ...metadataPatch };
  }
  if (Object.keys(patch).length === 0) {
    return false;
  }
  await store.update(card.id, patch, { expectedRevision: card.revision });
  return true;
}

/**
 * Closes out a card whose run is provably over: the host has no live session for
 * it. Without this, a Gateway restart during a run leaves the card "running" with
 * nothing left alive to report its outcome.
 */
async function finishOrphanedRun(params: {
  store: FlowboardStore;
  card: FlowboardCard;
  sessions: readonly FlowboardHostSession[];
  runtime: FlowboardReconcilerRuntime;
  now: number;
}): Promise<boolean> {
  const { store, card, sessions, runtime, now } = params;
  const runId = cardRunId(card);
  const sessionKey = cardSessionKey(card);
  if (!runId || !sessionKey) {
    return false;
  }
  if (sessions.some((session) => session.key === sessionKey)) {
    return false;
  }
  await store.finishExecutionForRun(runId, {
    outcome: "failed",
    endedAt: now,
    reason: "Run did not survive a Gateway restart.",
  });
  await cleanupFlowboardRunWorktree({ store, worktrees: runtime.worktrees, runId }).catch(
    () => undefined,
  );
  return true;
}

export async function reconcileFlowboardCards(params: {
  store: FlowboardStore;
  runtime: FlowboardReconcilerRuntime;
  now?: number;
  /** Startup pass also closes runs orphaned by the previous process. */
  finishOrphanedRuns?: boolean;
  onCardError?: (cardId: string, error: unknown) => void;
}): Promise<ReconcileOutcome> {
  const now = params.now ?? Date.now();
  const outcome: ReconcileOutcome = {
    checked: 0,
    updated: 0,
    finished: 0,
    reclaimed: 0,
    skipped: 0,
  };
  const sessions = await readHostSessions(params.runtime);
  if (!sessions) {
    // Without host truth every verdict would be a guess. Leave state alone.
    return outcome;
  }
  for (const card of activeCards(await params.store.list())) {
    outcome.checked += 1;
    try {
      if (params.finishOrphanedRuns && (await finishOrphanedRun({ ...params, card, sessions, now }))) {
        outcome.finished += 1;
        continue;
      }
      if (await applyLifecycle({ ...params, card, sessions, now })) {
        outcome.updated += 1;
      }
      // A claim whose lease lapsed past the grace window belongs to a worker that
      // is not coming back; releasing it frees the card and the owner's slot.
      if (isFlowboardClaimReclaimable(card.metadata?.claim, now)) {
        const latest = await params.store.get(card.id);
        if (latest && isFlowboardClaimReclaimable(latest.metadata?.claim, now)) {
          await params.store.update(latest.id, {
            metadata: { ...latest.metadata, claim: undefined },
          });
          outcome.reclaimed += 1;
        }
      }
    } catch (error) {
      // One card must never abort the sweep: a card the store refuses to move
      // (unfinished dependencies, a status hold) would otherwise leave every card
      // after it unreconciled. Losing a compare-and-swap is the expected case —
      // a worker reported in mid-pass and its write is the newer one.
      outcome.skipped += 1;
      if (!(error instanceof FlowboardRevisionConflictError)) {
        params.onCardError?.(card.id, error);
      }
    }
  }
  return outcome;
}

export function createFlowboardReconcilerService(params: {
  store: FlowboardStore;
  runtime: FlowboardReconcilerRuntime;
}): OpenClawPluginService {
  let timer: ReturnType<typeof setInterval> | undefined;
  let running = false;

  return {
    id: "flowboard-reconciler",
    start(ctx) {
      if (timer) {
        return;
      }
      const pass = async (finishOrphanedRuns: boolean) => {
        if (running) {
          return;
        }
        running = true;
        try {
          const outcome = await reconcileFlowboardCards({
            ...params,
            finishOrphanedRuns,
            onCardError: (cardId, error) =>
              ctx.logger.warn(
                `flowboard could not reconcile card ${cardId}: ${formatErrorMessage(error)}`,
              ),
          });
          if (outcome.updated || outcome.finished || outcome.reclaimed) {
            ctx.logger.info(
              `flowboard reconciled ${outcome.checked} active cards: ${outcome.updated} updated, ${outcome.finished} orphaned runs closed, ${outcome.reclaimed} claims reclaimed, ${outcome.skipped} skipped.`,
            );
          }
        } catch (error) {
          ctx.logger.warn(`flowboard reconcile failed: ${formatErrorMessage(error)}`);
        } finally {
          running = false;
        }
      };
      // Startup pass first: it is the only thing that recovers runs the previous
      // process left in flight.
      void pass(true);
      timer = setInterval(() => void pass(false), RECONCILE_INTERVAL_MS);
      timer.unref?.();
    },
    stop() {
      if (timer) {
        clearInterval(timer);
        timer = undefined;
      }
    },
  };
}
