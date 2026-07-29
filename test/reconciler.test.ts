import { describe, expect, it, vi } from "vitest";
import type { FlowboardCard } from "../src/contract/index.js";
import type {
  FlowboardKeyedStore,
  PersistedFlowboardAttachment,
  PersistedFlowboardBoard,
  PersistedFlowboardCard,
  PersistedFlowboardMilestone,
  PersistedFlowboardNotificationSubscription,
  PersistedFlowboardProjectDocument,
} from "../src/backend/src/persistence-types.js";
import type { FlowboardHostSession } from "../src/backend/src/lifecycle.js";
import {
  reconcileFlowboardCards,
  type FlowboardReconcilerRuntime,
} from "../src/backend/src/reconciler.js";
import { FlowboardStore } from "../src/backend/src/store.js";

function keyedStore<T>(): FlowboardKeyedStore<T> {
  const values = new Map<string, T>();
  return {
    async register(key, value) {
      values.set(key, value);
    },
    async lookup(key) {
      return values.get(key);
    },
    async delete(key) {
      return values.delete(key);
    },
    async entries() {
      return [...values.entries()].map(([key, value]) => ({ key, value }));
    },
  };
}

function createStore(): FlowboardStore {
  return new FlowboardStore(keyedStore<PersistedFlowboardCard>(), {
    boards: keyedStore<PersistedFlowboardBoard>(),
    milestones: keyedStore<PersistedFlowboardMilestone>(),
    documents: keyedStore<PersistedFlowboardProjectDocument>(),
    subscriptions: keyedStore<PersistedFlowboardNotificationSubscription>(),
    attachments: keyedStore<PersistedFlowboardAttachment>(),
  });
}

function createRuntime(options: {
  sessions?: FlowboardHostSession[] | null;
  task?: Record<string, unknown>;
  gatewayAvailable?: boolean;
}): FlowboardReconcilerRuntime {
  const request = vi.fn(async () =>
    options.sessions === null ? {} : { sessions: options.sessions ?? [] },
  );
  return {
    gateway: {
      isAvailable: async () => options.gatewayAvailable !== false,
      request: request as never,
    },
    tasks: {
      runs: {
        bindSession: () => ({
          get: () => options.task,
          findLatest: () => options.task,
        }),
      },
    } as never,
    worktrees: {
      create: vi.fn(),
      release: vi.fn(async () => undefined),
      removeIfLossless: vi.fn(async () => true),
    } as never,
  };
}

/** A card mid-run: claimed, running, with a live execution and session. */
async function createRunningCard(
  store: FlowboardStore,
  sessionKey = "session-1",
): Promise<FlowboardCard> {
  const created = await store.create({ title: "Running card", status: "ready" });
  const claimed = await store.claimExecution(created.id, {
    ownerId: "owner-a",
    expectedRevision: created.revision,
  });
  return await store.update(claimed.card.id, {
    status: "running",
    sessionKey,
    runId: "run-1",
    execution: {
      id: "exec-1",
      kind: "agent-session",
      mode: "autonomous",
      status: "running",
      sessionKey,
      runId: "run-1",
      startedAt: Date.now(),
      updatedAt: Date.now(),
    },
  });
}

describe("Flowboard reconciler", () => {
  it("moves a running card to review once its session reports done", async () => {
    const store = createStore();
    const card = await createRunningCard(store);
    const runtime = createRuntime({
      sessions: [{ key: "session-1", status: "done", hasActiveRun: false, updatedAt: Date.now() }],
    });

    const outcome = await reconcileFlowboardCards({ store, runtime });

    expect(outcome).toMatchObject({ checked: 1, updated: 1 });
    const reconciled = await store.get(card.id);
    expect(reconciled?.status).toBe("review");
    expect(reconciled?.execution?.status).toBe("review");
  });

  it("blocks a running card whose session failed", async () => {
    const store = createStore();
    const card = await createRunningCard(store);
    const runtime = createRuntime({
      sessions: [{ key: "session-1", status: "failed", hasActiveRun: false, updatedAt: Date.now() }],
    });

    await reconcileFlowboardCards({ store, runtime });

    const reconciled = await store.get(card.id);
    expect(reconciled?.status).toBe("blocked");
    expect(reconciled?.execution?.status).toBe("blocked");
  });

  it("closes a run orphaned by a Gateway restart on the startup pass", async () => {
    const store = createStore();
    const card = await createRunningCard(store);
    // The previous process died; the host has no session for this card any more.
    const runtime = createRuntime({ sessions: [] });

    const outcome = await reconcileFlowboardCards({
      store,
      runtime,
      finishOrphanedRuns: true,
    });

    expect(outcome).toMatchObject({ checked: 1, finished: 1 });
    const reconciled = await store.get(card.id);
    expect(reconciled?.execution?.status).not.toBe("running");
    expect(reconciled?.metadata?.attempts?.some((a) => a.status === "running")).toBeFalsy();
  });

  it("leaves an orphaned run untouched on a periodic pass", async () => {
    const store = createStore();
    const card = await createRunningCard(store);
    const runtime = createRuntime({ sessions: [] });

    const outcome = await reconcileFlowboardCards({ store, runtime });

    expect(outcome.finished).toBe(0);
    expect((await store.get(card.id))?.execution?.status).toBe("running");
  });

  it("marks a long-idle session stale and clears the marker when it recovers", async () => {
    const store = createStore();
    const card = await createRunningCard(store);
    const idleSince = Date.now() - 31 * 60 * 1000;

    await reconcileFlowboardCards({
      store,
      runtime: createRuntime({
        sessions: [
          { key: "session-1", status: "running", hasActiveRun: false, updatedAt: idleSince },
        ],
      }),
    });
    const stale = await store.get(card.id);
    expect(stale?.metadata?.stale).toMatchObject({ lastSessionUpdatedAt: idleSince });

    await reconcileFlowboardCards({
      store,
      runtime: createRuntime({
        sessions: [
          { key: "session-1", status: "running", hasActiveRun: true, updatedAt: Date.now() },
        ],
      }),
    });
    expect((await store.get(card.id))?.metadata?.stale).toBeUndefined();
  });

  it("prefers a terminal task record over a still-listed session", async () => {
    const store = createStore();
    const card = await createRunningCard(store);
    const runtime = createRuntime({
      sessions: [{ key: "session-1", status: "running", hasActiveRun: true, updatedAt: Date.now() }],
      task: { status: "completed", updatedAt: Date.now() },
    });

    await reconcileFlowboardCards({ store, runtime });

    expect((await store.get(card.id))?.status).toBe("review");
  });

  it("changes nothing when the host cannot be asked", async () => {
    const store = createStore();
    const card = await createRunningCard(store);

    for (const runtime of [
      createRuntime({ gatewayAvailable: false }),
      createRuntime({ sessions: null }),
    ]) {
      const outcome = await reconcileFlowboardCards({ store, runtime, finishOrphanedRuns: true });
      // "Unknown" must never be read as "no sessions exist", which would look
      // like every linked card had been abandoned.
      expect(outcome).toMatchObject({ checked: 0, updated: 0, finished: 0 });
    }
    expect((await store.get(card.id))?.status).toBe("running");
  });

  it("skips cards that are archived or have no work in flight", async () => {
    const store = createStore();
    await store.create({ title: "Idle backlog card", status: "backlog" });
    const archived = await createRunningCard(store, "session-archived");
    await store.archive(archived.id, true);

    const outcome = await reconcileFlowboardCards({
      store,
      runtime: createRuntime({ sessions: [] }),
      finishOrphanedRuns: true,
    });

    expect(outcome.checked).toBe(0);
  });

  it("keeps sweeping after one card fails to converge", async () => {
    const store = createStore();
    const rejected = await createRunningCard(store, "session-rejected");
    const healthy = await createRunningCard(store, "session-healthy");

    // Stands in for any store rule that refuses this one card — a status hold, an
    // unfinished dependency. The rest of the sweep must still happen.
    const update = store.update.bind(store);
    const onCardError = vi.fn();
    vi.spyOn(store, "update").mockImplementation(async (id, patch, options) => {
      if (id === rejected.id) {
        throw new Error("card dependencies are not done.");
      }
      return await update(id, patch, options);
    });

    const outcome = await reconcileFlowboardCards({
      store,
      runtime: createRuntime({
        sessions: [
          { key: "session-rejected", status: "done", hasActiveRun: false, updatedAt: Date.now() },
          { key: "session-healthy", status: "done", hasActiveRun: false, updatedAt: Date.now() },
        ],
      }),
      onCardError,
    });

    expect(outcome).toMatchObject({ checked: 2, updated: 1, skipped: 1 });
    expect(onCardError).toHaveBeenCalledWith(rejected.id, expect.any(Error));
    expect((await store.get(healthy.id))?.status).toBe("review");
  });

  it("releases a claim whose lease lapsed past the grace window", async () => {
    const store = createStore();
    const created = await store.create({ title: "Lapsed claim", status: "ready" });
    const claimed = await store.claimExecution(created.id, {
      ownerId: "owner-a",
      expectedRevision: created.revision,
      ttlSeconds: 1,
    });
    expect(claimed.card.metadata?.claim).toBeDefined();

    const outcome = await reconcileFlowboardCards({
      store,
      runtime: createRuntime({ sessions: [] }),
      // Well past the claim TTL plus the reclaim grace period.
      now: Date.now() + 20 * 60 * 1000,
    });

    expect(outcome.reclaimed).toBe(1);
    expect((await store.get(created.id))?.metadata?.claim).toBeUndefined();
  });
});
