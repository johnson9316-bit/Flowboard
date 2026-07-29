// Flowboard plugin module derives card lifecycle from host session and task state.
//
// These are pure decisions: given a card plus what the host reports about its
// session and task, say what the card's status and execution status should be.
// The browser previously owned this logic, which meant card state only converged
// while somebody had the board open. Nothing here touches persistence or the
// Gateway; `reconciler.ts` collects the inputs and applies the results.
import type {
  FlowboardCard,
  FlowboardExecutionStatus,
  FlowboardStaleState,
  FlowboardStatus,
} from "../../contract/index.js";
import { cardSessionKey } from "./store-card-helpers.js";

/** Session fields this module reads, as reported by the host `sessions.list` RPC. */
export type FlowboardHostSession = {
  key: string;
  status?: string;
  updatedAt?: number;
  hasActiveRun?: boolean;
  abortedLastRun?: boolean;
};

export type FlowboardHostTaskStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "timed_out";

/** Task fields this module reads, as reported by the host task runtime. */
export type FlowboardHostTask = {
  status: FlowboardHostTaskStatus;
  updatedAt?: number | string;
};

export type FlowboardLifecycleState =
  | "unlinked"
  | "missing"
  | "idle"
  | "running"
  | "stale"
  | "succeeded"
  | "failed";

export type FlowboardLifecycle = {
  session: FlowboardHostSession | null;
  state: FlowboardLifecycleState;
  targetStatus?: FlowboardStatus;
  /**
   * When the host state behind this verdict last changed. Used to reject a
   * verdict that is older than the card's current status provenance.
   */
  sourceUpdatedAt?: number;
};

const STALE_SESSION_MS = 30 * 60 * 1000;

export function isFailedSessionStatus(status: string | undefined): boolean {
  return status === "failed" || status === "killed" || status === "timeout";
}

export function findFlowboardSession(
  card: FlowboardCard,
  sessions: readonly FlowboardHostSession[],
): FlowboardHostSession | null {
  const sessionKey = cardSessionKey(card);
  if (!sessionKey) {
    return null;
  }
  return sessions.find((session) => session.key === sessionKey) ?? null;
}

function sessionUpdatedAt(session: FlowboardHostSession): number | undefined {
  return typeof session.updatedAt === "number" && Number.isFinite(session.updatedAt)
    ? session.updatedAt
    : undefined;
}

function taskUpdatedAt(task: FlowboardHostTask): number | undefined {
  if (typeof task.updatedAt === "number") {
    return task.updatedAt > 0 ? task.updatedAt : undefined;
  }
  if (typeof task.updatedAt === "string") {
    const parsed = Date.parse(task.updatedAt);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }
  return undefined;
}

/**
 * A session that still claims to be running but has had no active run and no
 * activity for a long while. The worker is presumed gone without having reported
 * an outcome.
 */
export function staleSessionState(
  session: FlowboardHostSession,
  now: number,
): FlowboardStaleState | undefined {
  if (session.status !== "running" || session.hasActiveRun !== false) {
    return undefined;
  }
  const updatedAt = sessionUpdatedAt(session);
  if (updatedAt === undefined || now - updatedAt < STALE_SESSION_MS) {
    return undefined;
  }
  return {
    detectedAt: now,
    lastSessionUpdatedAt: updatedAt,
    reason: "Linked thread has not reported recent activity.",
  };
}

/**
 * Task state wins over session state when both exist, because a task carries an
 * explicit outcome while a session only reports liveness. The exception is a task
 * still claiming queued/running while its session already ended — then the
 * session's terminal state is the newer truth and we fall through to it.
 */
export function getFlowboardLifecycle(params: {
  card: FlowboardCard;
  sessions: readonly FlowboardHostSession[];
  task?: FlowboardHostTask;
  now: number;
}): FlowboardLifecycle {
  const { card, sessions, task, now } = params;
  const session = findFlowboardSession(card, sessions);
  if (task) {
    const sourceUpdatedAt = taskUpdatedAt(task);
    switch (task.status) {
      case "queued":
      case "running":
        if (
          !session ||
          !(session.abortedLastRun || session.status === "done" || isFailedSessionStatus(session.status))
        ) {
          return { session, state: "running", targetStatus: "running", ...(sourceUpdatedAt !== undefined ? { sourceUpdatedAt } : {}) };
        }
        break;
      case "completed":
        return { session, state: "succeeded", targetStatus: "review", ...(sourceUpdatedAt !== undefined ? { sourceUpdatedAt } : {}) };
      case "failed":
      case "cancelled":
      case "timed_out":
        return { session, state: "failed", targetStatus: "blocked", ...(sourceUpdatedAt !== undefined ? { sourceUpdatedAt } : {}) };
    }
  }
  if (!cardSessionKey(card)) {
    return { session: null, state: "unlinked" };
  }
  if (!session) {
    return { session: null, state: "missing" };
  }
  const sourceUpdatedAt = sessionUpdatedAt(session);
  const withSource = <T extends Omit<FlowboardLifecycle, "session">>(verdict: T) => ({
    session,
    ...verdict,
    ...(sourceUpdatedAt !== undefined ? { sourceUpdatedAt } : {}),
  });
  if (staleSessionState(session, now)) {
    return withSource({ state: "stale", targetStatus: "running" });
  }
  if (session.hasActiveRun === true || session.status === "running") {
    return withSource({ state: "running", targetStatus: "running" });
  }
  if (session.abortedLastRun || isFailedSessionStatus(session.status)) {
    return withSource({ state: "failed", targetStatus: "blocked" });
  }
  if (session.status === "done") {
    return withSource({ state: "succeeded", targetStatus: "review" });
  }
  return { session, state: "idle" };
}

export function executionStatusForLifecycle(
  lifecycle: FlowboardLifecycle,
): FlowboardExecutionStatus | undefined {
  switch (lifecycle.state) {
    case "running":
    case "stale":
      return "running";
    case "succeeded":
      return "review";
    case "failed":
      return "blocked";
    case "idle":
      return "idle";
    case "missing":
    case "unlinked":
      return undefined;
  }
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
