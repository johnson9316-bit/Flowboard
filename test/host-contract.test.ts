import type { TaskRunView } from "openclaw/plugin-sdk";
import { describe, expect, it } from "vitest";
import type { TaskfoldCard } from "../src/contract/index.js";
import { buildSessionKey } from "../src/backend/src/dispatcher.js";

// Fixtures below are verbatim excerpts of what a live OpenClaw 2026.7.1-2 Gateway
// returned on 2026-07-29, captured with:
//
//   openclaw gateway call sessions.list --json
//   openclaw tasks show <runId> --json
//
// They exist because the previous version of the reconciler was written against
// invented host payloads — a task status of "completed" and a task `updatedAt` field,
// neither of which the host has — and its tests asserted those inventions rather than
// reality. Everything here is checked against the SDK's own types so an upstream
// change breaks the build instead of silently reintroducing that class of bug.

const CARD_ID = "252615eb-1a96-461c-8e04-58f9ce0ed7ad";
const RUN_ID = `taskfold:execution:${CARD_ID}:1785313282219`;

/** One row of the live `sessions.list` payload, fields trimmed to what we read. */
const HOST_SESSION_ROW = {
  key: `agent:main:subagent:taskfold-taskfold-${CARD_ID}`,
  status: "done",
  hasActiveRun: false,
  updatedAt: 1785313650854,
} as const;

/** The live task record behind that same run, as the host reports it. */
const HOST_TASK_ROW = {
  id: "1d5bd7ec-595f-41f7-8af6-e6539da677df",
  runtime: "subagent",
  sourceId: RUN_ID,
  runId: RUN_ID,
  // The host's own `TaskRunView.sessionKey` is the *requester* session that spawned
  // the subagent — not the card's session. The card's session appears separately as
  // `childSessionKey`.
  sessionKey: "agent:main:main",
  ownerKey: "agent:main:main",
  scope: "session",
  childSessionKey: `agent:main:subagent:taskfold-taskfold-${CARD_ID}`,
  agentId: "main",
  label: "plugin:taskfold",
  title: "Work on this OpenClaw Taskfold card: 提交git",
  status: "succeeded",
  deliveryStatus: "delivered",
  notifyPolicy: "done_only",
  createdAt: 1785313282219,
  startedAt: 1785313282300,
  endedAt: 1785313650839,
  lastEventAt: 1785313650854,
} satisfies TaskRunView;

/**
 * The host task vocabulary, restated as an exhaustive map so that adding, removing,
 * or renaming a status upstream fails to compile here. The previous reconciler
 * branched on `"completed"`, which is not a host status at all, so its success branch
 * was unreachable.
 */
const TASK_STATUS_HANDLING = {
  queued: "in flight",
  running: "in flight",
  succeeded: "terminal",
  failed: "terminal",
  timed_out: "terminal",
  cancelled: "terminal",
  lost: "terminal",
} satisfies Record<TaskRunView["status"], "in flight" | "terminal">;

function card(overrides: Partial<TaskfoldCard> = {}): TaskfoldCard {
  return {
    id: CARD_ID,
    title: "提交git",
    status: "running",
    priority: "normal",
    labels: [],
    position: 1000,
    createdAt: 1785313282219,
    updatedAt: 1785313282219,
    revision: 1,
    // The observed run belonged to the board literally named "taskfold", which is
    // why its session key reads `taskfold-taskfold-<cardId>`.
    metadata: { automation: { boardId: "taskfold" } },
    ...overrides,
  };
}

describe("host payload contract", () => {
  it("keeps the host task status vocabulary exhaustive", () => {
    // "completed" was the browser summary's word, never the host's.
    expect(Object.keys(TASK_STATUS_HANDLING)).not.toContain("completed");
    expect(Object.keys(TASK_STATUS_HANDLING)).toEqual(
      expect.arrayContaining(["succeeded", "lost"]),
    );
    expect(TASK_STATUS_HANDLING.succeeded).toBe("terminal");
    // A task the host gave up tracking is terminal, not "still running".
    expect(TASK_STATUS_HANDLING.lost).toBe("terminal");
  });

  it("carries no task `updatedAt`, so freshness must come from the fields that exist", () => {
    expect(HOST_TASK_ROW).not.toHaveProperty("updatedAt");
    // These are the timestamps a caller can actually use, newest first.
    expect(HOST_TASK_ROW.lastEventAt).toBeGreaterThan(HOST_TASK_ROW.createdAt);
    for (const field of ["createdAt", "startedAt", "endedAt", "lastEventAt"] as const) {
      expect(typeof HOST_TASK_ROW[field]).toBe("number");
    }
  });

  it("owns a task by the requester session, not by the card's session", () => {
    // `runtime.tasks.runs.bindSession({sessionKey})` scopes every lookup to
    // `task.ownerKey`. Binding with the card's session key can therefore never see
    // the card's own task, which is why the reconciler does not try.
    expect(HOST_TASK_ROW.ownerKey).toBe("agent:main:main");
    expect(HOST_TASK_ROW.childSessionKey).not.toBe(HOST_TASK_ROW.ownerKey);
    expect(HOST_TASK_ROW.childSessionKey).toContain(CARD_ID);
  });

  it("stores a session key the host reports back under a different, agent-scoped name", () => {
    const stored = buildSessionKey(card());
    expect(stored).toBe(`subagent:taskfold-taskfold-${CARD_ID}`);
    // Not equal, and that is fine: the host resolves either form, verified against a
    // live Gateway with `sessions.get` for both spellings of this very key. What is
    // not fine is comparing them literally — the previous reconciler did, so "the
    // host has no session for this card" came out true for every card, and its
    // startup sweep would have force-failed every live run.
    expect(stored).not.toBe(HOST_SESSION_ROW.key);
    expect(HOST_SESSION_ROW.key).toBe(`agent:main:${stored}`);

    // A card that names an agent already stores exactly the host's spelling.
    expect(buildSessionKey(card({ agentId: "main" }))).toBe(HOST_SESSION_ROW.key);
  });
});
