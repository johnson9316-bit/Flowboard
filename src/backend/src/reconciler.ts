// Taskfold plugin module reconciles card state against the evidence a run leaves
// behind.
//
// This is the control loop. It runs in the Gateway process, on a timer plus once at
// startup, so a card converges whether or not anybody has the board open.
// Previously the equivalent logic lived in the browser, which meant an unattended
// Gateway left finished runs marked "running" forever, and a Gateway restart
// orphaned every in-flight run with nothing to clean it up.
//
// Outcomes for runs that finish normally arrive through the `subagent_ended` hook in
// `index.ts`. This loop exists for the case that hook cannot cover: the process died
// before the event was delivered. See `lifecycle.ts` for why that judgement is made
// from local evidence instead of asking the host.
import type { TaskfoldCard } from "../../contract/index.js";
import { formatErrorMessage } from "openclaw/plugin-sdk/error-runtime";
import type { PluginRuntime } from "openclaw/plugin-sdk/plugin-runtime";
import type { OpenClawPluginService } from "../api.js";
import { cleanupTaskfoldRunWorktree } from "./dispatcher-workspace.js";
import {
  executionStatusForLifecycle,
  getTaskfoldLifecycle,
  shouldCloseOrphanedRun,
  shouldSyncCardStatus,
  shouldSyncExecutionStatus,
  staleRunState,
} from "./lifecycle.js";
import { cardRunId } from "./store-card-helpers.js";
import { isTaskfoldClaimReclaimable } from "./store-constants.js";
import { TaskfoldRevisionConflictError } from "./store-core.js";
import type { TaskfoldStore } from "./store.js";

const RECONCILE_INTERVAL_MS = 15_000;

export type TaskfoldReconcilerRuntime = Pick<PluginRuntime, "worktrees">;

function hasRunningAttempt(card: TaskfoldCard): boolean {
  return Boolean(card.metadata?.attempts?.some((attempt) => attempt.status === "running"));
}

/** Cards whose recorded state claims work is in flight, so it can be checked. */
function activeCards(cards: readonly TaskfoldCard[]): TaskfoldCard[] {
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
 * Applies one lifecycle verdict. Status, execution status and staleness are written
 * together so a card cannot be left half-converged, and the write is a
 * compare-and-swap so a worker reporting in mid-pass wins over this pass.
 */
async function applyLifecycle(params: {
  store: TaskfoldStore;
  card: TaskfoldCard;
  now: number;
}): Promise<boolean> {
  const { store, card, now } = params;
  const lifecycle = getTaskfoldLifecycle({ card, now });
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

  const stale = staleRunState(card, now);
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
 * Closes out a card whose run is provably over. Without this, a Gateway restart
 * during a run leaves the card "running" with nothing left alive to report its
 * outcome. `finishExecutionForRun` also clears the claim and closes the running
 * attempt, so this is the whole of the cleanup.
 */
async function finishOrphanedRun(params: {
  store: TaskfoldStore;
  card: TaskfoldCard;
  runtime: TaskfoldReconcilerRuntime;
  now: number;
}): Promise<boolean> {
  const { store, card, runtime, now } = params;
  const runId = cardRunId(card);
  if (!runId || !shouldCloseOrphanedRun({ card, now })) {
    return false;
  }
  await store.finishExecutionForRun(runId, {
    outcome: "failed",
    endedAt: now,
    reason: "Run stopped reporting and did not survive to report an outcome.",
  });
  await cleanupTaskfoldRunWorktree({ store, worktrees: runtime.worktrees, runId }).catch(
    () => undefined,
  );
  return true;
}

export async function reconcileTaskfoldCards(params: {
  store: TaskfoldStore;
  runtime: TaskfoldReconcilerRuntime;
  now?: number;
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
  for (const card of activeCards(await params.store.list())) {
    outcome.checked += 1;
    try {
      if (await finishOrphanedRun({ ...params, card, now })) {
        outcome.finished += 1;
        // The card moved; its status catches up on the next pass against fresh state
        // rather than against the revision this one read.
        continue;
      }
      if (await applyLifecycle({ ...params, card, now })) {
        outcome.updated += 1;
      }
      // A claim whose lease lapsed past the grace window belongs to a worker that is
      // not coming back; releasing it frees the card and the owner's slot.
      if (isTaskfoldClaimReclaimable(card.metadata?.claim, now)) {
        const latest = await params.store.get(card.id);
        if (latest && isTaskfoldClaimReclaimable(latest.metadata?.claim, now)) {
          await params.store.update(latest.id, {
            metadata: { ...latest.metadata, claim: undefined },
          });
          outcome.reclaimed += 1;
        }
      }
    } catch (error) {
      // One card must never abort the sweep: a card the store refuses to move
      // (unfinished dependencies, a status hold) would otherwise leave every card
      // after it unreconciled. Losing a compare-and-swap is the expected case — a
      // worker reported in mid-pass and its write is the newer one.
      outcome.skipped += 1;
      if (!(error instanceof TaskfoldRevisionConflictError)) {
        params.onCardError?.(card.id, error);
      }
    }
  }
  return outcome;
}

export function createTaskfoldReconcilerService(params: {
  store: TaskfoldStore;
  runtime: TaskfoldReconcilerRuntime;
}): OpenClawPluginService {
  let timer: ReturnType<typeof setInterval> | undefined;
  let running = false;
  let lastFailure = "";

  return {
    id: "taskfold-reconciler",
    start(ctx) {
      if (timer) {
        return;
      }
      const pass = async () => {
        if (running) {
          return;
        }
        running = true;
        try {
          const outcome = await reconcileTaskfoldCards({
            ...params,
            onCardError: (cardId, error) =>
              ctx.logger.warn(
                `taskfold could not reconcile card ${cardId}: ${formatErrorMessage(error)}`,
              ),
          });
          lastFailure = "";
          if (outcome.updated || outcome.finished || outcome.reclaimed) {
            ctx.logger.info(
              `taskfold reconciled ${outcome.checked} active cards: ${outcome.updated} updated, ${outcome.finished} orphaned runs closed, ${outcome.reclaimed} claims reclaimed, ${outcome.skipped} skipped.`,
            );
          }
        } catch (error) {
          // A pass that fails for a whole-sweep reason keeps failing the same way
          // every interval. Log the change, not the repetition.
          const message = formatErrorMessage(error);
          if (message !== lastFailure) {
            lastFailure = message;
            ctx.logger.warn(`taskfold reconcile failed: ${message}`);
          }
        } finally {
          running = false;
        }
      };
      // Run once at startup: that pass is what recovers runs the previous process
      // left in flight.
      void pass();
      timer = setInterval(() => void pass(), RECONCILE_INTERVAL_MS);
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
