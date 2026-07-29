import { describe, expect, it } from "vitest";
import type { FlowboardCard } from "../src/contract/index.js";
import {
  executionStatusForLifecycle,
  findFlowboardSession,
  getFlowboardLifecycle,
  shouldSyncCardStatus,
  shouldSyncExecutionStatus,
  staleSessionState,
  type FlowboardHostSession,
  type FlowboardHostTask,
} from "../src/backend/src/lifecycle.js";

const NOW = 1_800_000_000_000;

function card(overrides: Partial<FlowboardCard> = {}): FlowboardCard {
  return {
    id: "card-1",
    title: "Card",
    status: "running",
    priority: "normal",
    labels: [],
    position: 1000,
    createdAt: NOW - 60_000,
    updatedAt: NOW - 60_000,
    revision: 1,
    sessionKey: "session-1",
    ...overrides,
  };
}

function session(overrides: Partial<FlowboardHostSession> = {}): FlowboardHostSession {
  return { key: "session-1", status: "running", updatedAt: NOW - 1000, ...overrides };
}

function lifecycleOf(params: {
  card?: FlowboardCard;
  sessions?: FlowboardHostSession[];
  task?: FlowboardHostTask;
}) {
  return getFlowboardLifecycle({
    card: params.card ?? card(),
    sessions: params.sessions ?? [],
    ...(params.task ? { task: params.task } : {}),
    now: NOW,
  });
}

describe("Flowboard lifecycle", () => {
  it("matches a session by the card's own key or its execution key", () => {
    const rows = [session({ key: "session-2" }), session({ key: "session-1" })];
    expect(findFlowboardSession(card(), rows)?.key).toBe("session-1");

    const viaExecution = card({
      sessionKey: undefined,
      execution: {
        id: "exec-1",
        kind: "agent-session",
        mode: "autonomous",
        status: "running",
        sessionKey: "session-2",
        startedAt: NOW,
        updatedAt: NOW,
      },
    });
    expect(findFlowboardSession(viaExecution, rows)?.key).toBe("session-2");
    expect(findFlowboardSession(card({ sessionKey: undefined }), rows)).toBeNull();
  });

  it("reports unlinked and missing separately", () => {
    expect(lifecycleOf({ card: card({ sessionKey: undefined }) }).state).toBe("unlinked");
    expect(lifecycleOf({ sessions: [] }).state).toBe("missing");
  });

  it.each([
    ["running", "running", "running"],
    ["queued", "running", "running"],
    ["completed", "succeeded", "review"],
    ["failed", "failed", "blocked"],
    ["cancelled", "failed", "blocked"],
    ["timed_out", "failed", "blocked"],
  ] as const)("maps task status %s to %s", (taskStatus, state, targetStatus) => {
    const lifecycle = lifecycleOf({
      sessions: [session()],
      task: { status: taskStatus, updatedAt: NOW - 500 },
    });
    expect(lifecycle).toMatchObject({ state, targetStatus, sourceUpdatedAt: NOW - 500 });
  });

  it("prefers a terminal session over a task still claiming to run", () => {
    // The task record lags behind; the session already reported the outcome.
    const lifecycle = lifecycleOf({
      sessions: [session({ status: "failed", hasActiveRun: false })],
      task: { status: "running", updatedAt: NOW - 500 },
    });
    expect(lifecycle).toMatchObject({ state: "failed", targetStatus: "blocked" });
  });

  it("accepts an ISO task timestamp as the lifecycle source", () => {
    const lifecycle = lifecycleOf({
      sessions: [session()],
      task: { status: "completed", updatedAt: new Date(NOW - 250).toISOString() },
    });
    expect(lifecycle.sourceUpdatedAt).toBe(NOW - 250);
  });

  it("treats a long-idle running session as stale rather than healthy", () => {
    const idle = session({ hasActiveRun: false, updatedAt: NOW - 31 * 60 * 1000 });
    expect(staleSessionState(idle, NOW)).toMatchObject({
      lastSessionUpdatedAt: NOW - 31 * 60 * 1000,
      detectedAt: NOW,
    });
    expect(lifecycleOf({ sessions: [idle] })).toMatchObject({
      state: "stale",
      targetStatus: "running",
    });

    // Just under the window, and with an active run, are both healthy.
    expect(staleSessionState(session({ hasActiveRun: false, updatedAt: NOW - 1000 }), NOW)).toBeUndefined();
    expect(staleSessionState(session({ hasActiveRun: true, updatedAt: NOW - 60 * 60 * 1000 }), NOW)).toBeUndefined();
  });

  it.each([
    [{ status: "running" }, "running"],
    [{ status: "idle", hasActiveRun: true }, "running"],
    [{ status: "done", hasActiveRun: false }, "succeeded"],
    [{ status: "killed", hasActiveRun: false }, "failed"],
    [{ status: "timeout", hasActiveRun: false }, "failed"],
    [{ status: "idle", hasActiveRun: false, abortedLastRun: true }, "failed"],
    [{ status: "idle", hasActiveRun: false }, "idle"],
  ] as const)("derives %o from session state alone", (overrides, state) => {
    expect(lifecycleOf({ sessions: [session(overrides)] }).state).toBe(state);
  });

  it.each([
    ["running", "running"],
    ["stale", "running"],
    ["succeeded", "review"],
    ["failed", "blocked"],
    ["idle", "idle"],
    ["missing", undefined],
    ["unlinked", undefined],
  ] as const)("maps lifecycle state %s to execution status %s", (state, expected) => {
    expect(executionStatusForLifecycle({ session: null, state })).toBe(expected);
  });

  describe("status write guards", () => {
    it("only advances a card out of a pre-work or in-flight status", () => {
      for (const status of ["backlog", "todo", "ready"] as const) {
        expect(shouldSyncCardStatus(card({ status }), "running")).toBe(true);
      }
      for (const status of ["running", "todo", "ready"] as const) {
        expect(shouldSyncCardStatus(card({ status }), "blocked")).toBe(true);
        expect(shouldSyncCardStatus(card({ status }), "review")).toBe(true);
      }
    });

    it("never disturbs a status a human parked or walks a finished card back", () => {
      // done/archived/triage are deliberate placements lifecycle must not touch.
      for (const status of ["done", "review", "blocked", "triage", "scheduled"] as const) {
        expect(shouldSyncCardStatus(card({ status }), "running")).toBe(false);
      }
      expect(shouldSyncCardStatus(card({ status: "done" }), "review")).toBe(false);
      expect(shouldSyncCardStatus(card({ status: "running" }), "running")).toBe(false);
      expect(shouldSyncCardStatus(card(), undefined)).toBe(false);
    });

    it("only syncs execution status when the card already has an execution", () => {
      const withExecution = card({
        execution: {
          id: "exec-1",
          kind: "agent-session",
          mode: "autonomous",
          status: "running",
          startedAt: NOW,
          updatedAt: NOW,
        },
      });
      expect(shouldSyncExecutionStatus(withExecution, "blocked")).toBe(true);
      expect(shouldSyncExecutionStatus(withExecution, "running")).toBe(false);
      expect(shouldSyncExecutionStatus(card(), "blocked")).toBe(false);
    });
  });
});
