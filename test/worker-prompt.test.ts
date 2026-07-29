import { describe, expect, it } from "vitest";
import type { FlowboardCard, FlowboardRunAttempt } from "../src/contract/index.js";
import {
  buildWorkerContext,
  buildWorkerPrompt,
  FLOWBOARD_PROMPT_VERSION,
} from "../src/backend/src/worker-prompt.js";

const NOW = 1_800_000_000_000;

function card(overrides: Partial<FlowboardCard> = {}): FlowboardCard {
  return {
    id: "card-1",
    title: "Ship the thing",
    status: "ready",
    priority: "high",
    labels: [],
    position: 1000,
    createdAt: NOW - 60_000,
    updatedAt: NOW - 60_000,
    revision: 1,
    ...overrides,
  };
}

function attempt(overrides: Partial<FlowboardRunAttempt> = {}): FlowboardRunAttempt {
  return { id: "attempt-1", status: "failed", startedAt: NOW - 30_000, ...overrides };
}

function contextOf(overrides: Partial<FlowboardCard> = {}): string {
  return buildWorkerContext(card(overrides), [], NOW);
}

describe("Flowboard worker prompt", () => {
  it("is deterministic for a fixed card and clock", () => {
    const target = card({ notes: "Do the work." });
    expect(buildWorkerContext(target, [], NOW)).toBe(buildWorkerContext(target, [], NOW));
  });

  it("states the worker protocol with the card identity and claim", () => {
    const prompt = buildWorkerPrompt({
      card: card(),
      context: "CONTEXT-BODY",
      ownerId: "owner-a",
      token: "token-xyz",
    });

    expect(prompt).toContain("Work on this OpenClaw Flowboard card: Ship the thing");
    expect(prompt).toContain("Card id: card-1");
    expect(prompt).toContain("Claim ownerId: owner-a");
    expect(prompt).toContain("Claim token: token-xyz");
    for (const tool of ["flowboard_heartbeat", "flowboard_complete", "flowboard_block"]) {
      expect(prompt).toContain(tool);
    }
    expect(prompt.endsWith("CONTEXT-BODY")).toBe(true);
  });

  it("says nothing about retrying on a first attempt", () => {
    expect(contextOf()).not.toContain("## This is a retry");
    expect(contextOf({ metadata: { attempts: [attempt({ status: "succeeded" })] } })).not.toContain(
      "## This is a retry",
    );
  });

  it("asks a retry to change approach and names the prior failures", () => {
    const context = contextOf({
      metadata: {
        attempts: [
          attempt({ id: "a1", status: "failed", error: "type error in parser" }),
          attempt({ id: "a2", status: "blocked", error: "missing credentials" }),
        ],
      },
    });

    expect(context).toContain("## This is a retry");
    expect(context).toContain("2 previous attempts");
    expect(context).toContain("Do not simply repeat the previous approach");
    expect(context).toContain("type error in parser");
    expect(context).toContain("missing credentials");
    expect(context).toContain("what you are doing differently");
  });

  it("uses singular wording for exactly one prior failure", () => {
    const context = contextOf({ metadata: { attempts: [attempt({ error: "boom" })] } });
    expect(context).toContain("1 previous attempt on this card did not succeed");
  });

  it("warns on the final attempt within the retry budget", () => {
    const budgeted = (failureCount: number) =>
      contextOf({
        metadata: {
          attempts: [attempt({ error: "boom" })],
          failureCount,
          automation: { maxRetries: 2 },
        },
      });

    expect(budgeted(1)).not.toContain("final attempt");
    // At the budget the next failure exhausts it, so ask for a diagnosis now.
    expect(budgeted(2)).toContain("This is the final attempt within the card's retry budget");
    expect(budgeted(2)).toContain("flowboard_block");
  });

  it("carries the card's own state into the context", () => {
    const context = buildWorkerContext(
      card({
        agentId: "agent-main",
        notes: "Read the spec first.",
        metadata: {
          comments: [{ id: "c1", body: "Reviewer asked for tests.", createdAt: NOW - 5_000 }],
          automation: { boardId: "alpha", skills: ["typescript"] },
        },
      }),
      [],
      NOW,
    );

    expect(context).toContain("# Flowboard card card-1");
    expect(context).toContain("Title: Ship the thing");
    expect(context).toContain("Agent: agent-main");
    expect(context).toContain("Read the spec first.");
    expect(context).toContain("Reviewer asked for tests.");
    expect(context).toContain("Skills: typescript");
  });

  it("summarizes finished parent work so a worker inherits its result", () => {
    const parent = card({
      id: "parent-1",
      title: "Design the API",
      status: "done",
      metadata: { automation: { summary: "Chose a REST surface." } },
    });
    const child = card({
      metadata: { links: [{ id: "l1", type: "parent", targetCardId: "parent-1", createdAt: NOW }] },
    });

    const context = buildWorkerContext(child, [parent, child], NOW);
    expect(context).toContain("## Parent results");
    expect(context).toContain("Chose a REST surface.");
  });

  it("exposes a positive prompt version for attempt attribution", () => {
    expect(Number.isSafeInteger(FLOWBOARD_PROMPT_VERSION)).toBe(true);
    expect(FLOWBOARD_PROMPT_VERSION).toBeGreaterThan(0);
  });
});
