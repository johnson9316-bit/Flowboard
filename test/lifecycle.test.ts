import { describe, expect, it } from "vitest";
import type { FlowboardCard, FlowboardClaim } from "../src/contract/index.js";
import {
  executionStatusForLifecycle,
  flowboardRunEvidence,
  getFlowboardLifecycle,
  shouldCloseOrphanedRun,
  shouldSyncCardStatus,
  shouldSyncExecutionStatus,
  staleRunState,
} from "../src/backend/src/lifecycle.js";

const NOW = 1_800_000_000_000;
const MINUTE = 60_000;

function claim(lastHeartbeatAt: number): FlowboardClaim {
  return {
    ownerId: "owner-a",
    token: "token-a",
    claimedAt: lastHeartbeatAt,
    lastHeartbeatAt,
  };
}

function card(overrides: Partial<FlowboardCard> = {}): FlowboardCard {
  return {
    id: "card-1",
    title: "Card",
    status: "running",
    priority: "normal",
    labels: [],
    position: 1000,
    createdAt: NOW - MINUTE,
    updatedAt: NOW - MINUTE,
    revision: 1,
    sessionKey: "subagent:flowboard-default-card-1",
    metadata: { claim: claim(NOW - MINUTE) },
    ...overrides,
  };
}

/** A running card whose last sign of life was `minutesAgo` minutes back. */
function quietFor(minutesAgo: number, overrides: Partial<FlowboardCard> = {}): FlowboardCard {
  return card({
    updatedAt: NOW - minutesAgo * MINUTE,
    metadata: { claim: claim(NOW - minutesAgo * MINUTE) },
    ...overrides,
  });
}

describe("Flowboard lifecycle", () => {
  describe("run evidence", () => {
    it("reads a recent heartbeat as live", () => {
      expect(flowboardRunEvidence({ card: quietFor(1), now: NOW })).toBe("live");
      // Right at the heartbeat-stale threshold is still live, not yet suspicious.
      expect(flowboardRunEvidence({ card: quietFor(20), now: NOW })).toBe("live");
    });

    it("reads a lapsed heartbeat as stale, then abandoned past the grace window", () => {
      expect(flowboardRunEvidence({ card: quietFor(21), now: NOW })).toBe("stale");
      expect(flowboardRunEvidence({ card: quietFor(30), now: NOW })).toBe("stale");
      expect(flowboardRunEvidence({ card: quietFor(31), now: NOW })).toBe("abandoned");
    });

    it("has nothing to judge on a card with no run", () => {
      expect(
        flowboardRunEvidence({ card: card({ status: "todo", metadata: {} }), now: NOW }),
      ).toBe("unlinked");
      // A card with no session key names no run, however old it is.
      expect(
        flowboardRunEvidence({ card: quietFor(90, { sessionKey: undefined }), now: NOW }),
      ).toBe("unlinked");
    });

    it("reads an execution that already recorded an outcome as finished", () => {
      // Closing a run bumps `execution.updatedAt`, so heartbeat age would read as a
      // fresh sign of life and leave the card stuck on "running" forever.
      for (const status of ["done", "review", "blocked"] as const) {
        const finished = quietFor(0, {
          metadata: {},
          execution: {
            id: "exec-1",
            kind: "agent-session",
            mode: "autonomous",
            status,
            sessionKey: "subagent:flowboard-default-card-1",
            startedAt: NOW - 30 * MINUTE,
            updatedAt: NOW,
          },
        });
        expect(flowboardRunEvidence({ card: finished, now: NOW })).toBe("finished");
        expect(shouldCloseOrphanedRun({ card: finished, now: NOW })).toBe(false);
      }
    });

    it("lets a card catch up to the outcome its execution recorded", () => {
      const withStatus = (status: "done" | "review" | "blocked") =>
        getFlowboardLifecycle({
          card: card({
            metadata: {},
            execution: {
              id: "exec-1",
              kind: "agent-session",
              mode: "autonomous",
              status,
              startedAt: NOW - 30 * MINUTE,
              updatedAt: NOW,
            },
          }),
          now: NOW,
        });
      expect(withStatus("done")).toMatchObject({ state: "finished", targetStatus: "review" });
      expect(withStatus("review")).toMatchObject({ state: "finished", targetStatus: "review" });
      expect(withStatus("blocked")).toMatchObject({ state: "finished", targetStatus: "blocked" });
      // The execution status itself is the outcome and must not be rewritten.
      expect(executionStatusForLifecycle(withStatus("done"))).toBeUndefined();
    });

    it("falls back to execution and card timestamps when there is no claim", () => {
      const viaExecution = card({
        metadata: {},
        updatedAt: NOW - 90 * MINUTE,
        execution: {
          id: "exec-1",
          kind: "agent-session",
          mode: "autonomous",
          status: "running",
          sessionKey: "subagent:flowboard-default-card-1",
          startedAt: NOW - 90 * MINUTE,
          updatedAt: NOW - 90 * MINUTE,
        },
      });
      expect(flowboardRunEvidence({ card: viaExecution, now: NOW })).toBe("abandoned");
      // A claim, when present, wins over an older execution timestamp.
      expect(
        flowboardRunEvidence({
          card: { ...viaExecution, metadata: { claim: claim(NOW - MINUTE) } },
          now: NOW,
        }),
      ).toBe("live");
    });
  });

  describe("verdicts", () => {
    it("keeps a live run running and reports its evidence timestamp", () => {
      expect(getFlowboardLifecycle({ card: quietFor(1), now: NOW })).toMatchObject({
        state: "live",
        targetStatus: "running",
        sourceUpdatedAt: NOW - MINUTE,
      });
    });

    it("keeps a stale run reading as running so a stuck card looks stuck", () => {
      expect(getFlowboardLifecycle({ card: quietFor(25), now: NOW })).toMatchObject({
        state: "stale",
        targetStatus: "running",
      });
      expect(staleRunState(quietFor(25), NOW)).toMatchObject({
        lastSessionUpdatedAt: NOW - 25 * MINUTE,
        detectedAt: NOW,
      });
    });

    it("blocks an abandoned run and marks it for closing", () => {
      expect(getFlowboardLifecycle({ card: quietFor(31), now: NOW })).toMatchObject({
        state: "abandoned",
        targetStatus: "blocked",
      });
      expect(shouldCloseOrphanedRun({ card: quietFor(31), now: NOW })).toBe(true);
    });

    it("never closes a run that is live, stale, or absent", () => {
      for (const minutes of [1, 20, 25, 30]) {
        expect(shouldCloseOrphanedRun({ card: quietFor(minutes), now: NOW })).toBe(false);
      }
      expect(shouldCloseOrphanedRun({ card: card({ status: "todo", metadata: {} }), now: NOW })).toBe(
        false,
      );
    });

    it("does not flag staleness outside the stale window", () => {
      expect(staleRunState(quietFor(1), NOW)).toBeUndefined();
      expect(staleRunState(quietFor(31), NOW)).toBeUndefined();
    });

    it.each([
      ["live", "running"],
      ["stale", "running"],
      ["abandoned", "blocked"],
      ["unlinked", undefined],
    ] as const)("maps lifecycle state %s to execution status %s", (state, expected) => {
      expect(executionStatusForLifecycle({ state })).toBe(expected);
    });
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
