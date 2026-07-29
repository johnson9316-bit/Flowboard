// Flowboard plugin module decides whether a card's recorded run is still alive.
//
// These are pure decisions: given a card and the current time, say whether the run
// it claims to be executing is live, stuck, or gone, and what the card's status and
// execution status should become. The browser previously owned this logic, which
// meant card state only converged while somebody had the board open.
// `reconciler.ts` collects the inputs and applies the results.
//
// The evidence is local on purpose. A linked plugin cannot read host run state
// after the fact — every avenue was tried against a live Gateway and none work:
//   - `runtime.gateway.request("sessions.list")` is refused for any plugin that is
//     not bundled or trusted-official.
//   - `runtime.tasks.runs.bindSession({sessionKey})` scopes every lookup to
//     `task.ownerKey`, which for a Flowboard run is the *requester* session that
//     spawned the subagent, not the card's own session, and the dispatch path never
//     learns it.
//   - `runtime.subagent.waitForRun({runId})` answers "timeout" for any run not live
//     in the current process, so it cannot distinguish finished from forgotten.
// What remains is decisive enough: a working worker heartbeats, and a worker that
// died with the Gateway does not.
//
// One trap to leave alone: `sessions.list` reports agent-scoped keys
// (`agent:main:subagent:…`) while a card without an explicit `agentId` stores the
// unscoped tail. The host resolves either form, so every host call still works — but
// a literal comparison between the two never matches, and the previous version of
// this module made exactly that comparison to decide a run was orphaned.
import type {
  FlowboardCard,
  FlowboardExecutionStatus,
  FlowboardStaleState,
  FlowboardStatus,
} from "../../contract/index.js";
import { cardSessionKey, flowboardLastActivityAt } from "./store-card-helpers.js";
import { RUNNING_HEARTBEAT_STALE_MS } from "./store-constants.js";

/**
 * How long past the heartbeat-stale threshold a run is given before it is treated
 * as gone. The extra window separates "this worker is slow or wedged" from "this
 * worker no longer exists", so a live-but-quiet run is flagged rather than killed.
 */
const ABANDONED_RUN_GRACE_MS = 10 * 60 * 1000;

export type FlowboardRunEvidence =
  /** The card records no run to judge. */
  | "unlinked"
  /** The run already recorded an outcome; only the card status may be lagging. */
  | "finished"
  /** Heartbeat or execution activity is recent. */
  | "live"
  /** No recent activity, but not yet long enough to call the run gone. */
  | "stale"
  /** Silent long past the grace window. Nothing is left to report an outcome. */
  | "abandoned";

export type FlowboardLifecycleState = FlowboardRunEvidence;

export type FlowboardLifecycle = {
  state: FlowboardLifecycleState;
  targetStatus?: FlowboardStatus;
  /**
   * When the evidence behind this verdict was last refreshed. Used to reject a
   * verdict that is older than the card's current status provenance.
   */
  sourceUpdatedAt?: number;
};

/** Whether the card claims work is in flight at all. */
function claimsRunning(card: FlowboardCard): boolean {
  return (
    card.status === "running" ||
    card.execution?.status === "running" ||
    Boolean(card.metadata?.attempts?.some((attempt) => attempt.status === "running")) ||
    Boolean(card.metadata?.claim)
  );
}

/** Execution statuses that record an outcome, so no liveness question remains. */
const TERMINAL_EXECUTION_STATUSES = new Set<FlowboardExecutionStatus>(["done", "review", "blocked"]);

export function flowboardRunEvidence(params: {
  card: FlowboardCard;
  now: number;
}): FlowboardRunEvidence {
  const { card, now } = params;
  if (!claimsRunning(card) || !cardSessionKey(card)) {
    return "unlinked";
  }
  const executionStatus = card.execution?.status;
  if (executionStatus && TERMINAL_EXECUTION_STATUSES.has(executionStatus)) {
    // The run reported an outcome — by `subagent_ended`, by the worker itself, or by
    // an earlier pass closing it out. Heartbeat age says nothing here: closing a run
    // touches `updatedAt`, which would otherwise read as a fresh sign of life.
    return "finished";
  }
  const silentFor = now - flowboardLastActivityAt(card);
  if (silentFor <= RUNNING_HEARTBEAT_STALE_MS) {
    return "live";
  }
  return silentFor <= RUNNING_HEARTBEAT_STALE_MS + ABANDONED_RUN_GRACE_MS ? "stale" : "abandoned";
}

/**
 * A run that has gone quiet but is not yet presumed gone. Flagging it — rather than
 * closing it — is deliberate: the worker may still report in, and force-failing a
 * live run destroys real work while leaving a dead one open only delays cleanup.
 */
export function staleRunState(
  card: FlowboardCard,
  now: number,
): FlowboardStaleState | undefined {
  if (flowboardRunEvidence({ card, now }) !== "stale") {
    return undefined;
  }
  return {
    detectedAt: now,
    lastSessionUpdatedAt: flowboardLastActivityAt(card),
    reason: "Linked run has not reported recent activity.",
  };
}

export function getFlowboardLifecycle(params: {
  card: FlowboardCard;
  now: number;
}): FlowboardLifecycle {
  const { card, now } = params;
  const state = flowboardRunEvidence({ card, now });
  if (state === "unlinked") {
    return { state };
  }
  const sourceUpdatedAt = flowboardLastActivityAt(card);
  switch (state) {
    case "finished":
      // Let the card catch up to the outcome its own execution already recorded.
      return {
        state,
        ...(card.execution?.status === "done" || card.execution?.status === "review"
          ? { targetStatus: "review" as const }
          : { targetStatus: "blocked" as const }),
        sourceUpdatedAt,
      };
    case "live":
      return { state, targetStatus: "running", sourceUpdatedAt };
    case "stale":
      // Still nominally running: the card should read "running" while it is flagged
      // stale, so a human sees a stuck run rather than a moved one.
      return { state, targetStatus: "running", sourceUpdatedAt };
    case "abandoned":
      return { state, targetStatus: "blocked", sourceUpdatedAt };
  }
}

export function executionStatusForLifecycle(
  lifecycle: FlowboardLifecycle,
): FlowboardExecutionStatus | undefined {
  switch (lifecycle.state) {
    case "live":
    case "stale":
      return "running";
    case "abandoned":
      return "blocked";
    // A finished run's execution status is already the outcome; rewriting it would
    // overwrite a real result (`done`) with a coarser one.
    case "finished":
    case "unlinked":
      return undefined;
  }
}

/**
 * Whether a run should be closed out because nothing is left alive to report its
 * outcome. Only an abandoned run qualifies; everything else is left alone.
 */
export function shouldCloseOrphanedRun(params: { card: FlowboardCard; now: number }): boolean {
  return flowboardRunEvidence(params) === "abandoned";
}

/**
 * Lifecycle may only drive a card forward out of a pre-work or in-flight status.
 * It must never move a card a human parked somewhere deliberate (done, archived,
 * triage) or walk a finished card backwards.
 */
export function shouldSyncCardStatus(
  card: FlowboardCard,
  targetStatus: FlowboardStatus | undefined,
): boolean {
  if (!targetStatus || card.status === targetStatus) {
    return false;
  }
  if (targetStatus === "running") {
    return card.status === "backlog" || card.status === "todo" || card.status === "ready";
  }
  if (targetStatus === "blocked" || targetStatus === "review") {
    return card.status === "running" || card.status === "todo" || card.status === "ready";
  }
  return false;
}

export function shouldSyncExecutionStatus(
  card: FlowboardCard,
  targetStatus: FlowboardExecutionStatus | undefined,
): boolean {
  return Boolean(card.execution && targetStatus && card.execution.status !== targetStatus);
}
