import { describe, expect, it, vi } from "vitest";
import type { TaskfoldCard } from "../src/contract/index.js";
import type {
  TaskfoldKeyedStore,
  PersistedTaskfoldAttachment,
  PersistedTaskfoldBoard,
  PersistedTaskfoldCard,
  PersistedTaskfoldMilestone,
  PersistedTaskfoldNotificationSubscription,
  PersistedTaskfoldProjectDocument,
} from "../src/backend/src/persistence-types.js";
import {
  reconcileTaskfoldCards,
  type TaskfoldReconcilerRuntime,
} from "../src/backend/src/reconciler.js";
import { TaskfoldStore } from "../src/backend/src/store.js";

/** Silent long enough to be presumed gone: heartbeat-stale (20m) plus grace (10m). */
const ABANDONED_MS = 31 * 60 * 1000;
/** Silent enough to be flagged, not yet long enough to be closed. */
const STALE_MS = 25 * 60 * 1000;

function keyedStore<T>(): TaskfoldKeyedStore<T> {
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

function createStore(): TaskfoldStore {
  return new TaskfoldStore(keyedStore<PersistedTaskfoldCard>(), {
    boards: keyedStore<PersistedTaskfoldBoard>(),
    milestones: keyedStore<PersistedTaskfoldMilestone>(),
    documents: keyedStore<PersistedTaskfoldProjectDocument>(),
    subscriptions: keyedStore<PersistedTaskfoldNotificationSubscription>(),
    attachments: keyedStore<PersistedTaskfoldAttachment>(),
  });
}

function createRuntime(): TaskfoldReconcilerRuntime {
  return {
    worktrees: {
      create: vi.fn(),
      release: vi.fn(async () => undefined),
      removeIfLossless: vi.fn(async () => true),
    } as never,
  };
}

/** A card mid-run: claimed, running, with a live execution and a heartbeat now. */
async function createRunningCard(
  store: TaskfoldStore,
  sessionKey = "subagent:taskfold-default-card",
): Promise<TaskfoldCard> {
  const created = await store.create({ title: "Running card", status: "ready" });
  const claimed = await store.claimExecution(created.id, {
    ownerId: "owner-a",
    expectedRevision: created.revision,
  });
  return await store.update(claimed.card.id, {
    status: "running",
    sessionKey,
    runId: `run-${created.id}`,
    execution: {
      id: "exec-1",
      kind: "agent-session",
      mode: "autonomous",
      status: "running",
      sessionKey,
      runId: `run-${created.id}`,
      startedAt: Date.now(),
      updatedAt: Date.now(),
    },
  });
}

describe("Taskfold reconciler", () => {
  it("leaves a card alone while its worker is still heartbeating", async () => {
    const store = createStore();
    const card = await createRunningCard(store);

    const outcome = await reconcileTaskfoldCards({ store, runtime: createRuntime() });

    expect(outcome).toMatchObject({ checked: 1, updated: 0, finished: 0 });
    const reconciled = await store.get(card.id);
    expect(reconciled?.status).toBe("running");
    expect(reconciled?.execution?.status).toBe("running");
    expect(reconciled?.metadata?.stale).toBeUndefined();
  });

  it("closes a run whose worker went silent past the grace window", async () => {
    const store = createStore();
    const card = await createRunningCard(store);

    const outcome = await reconcileTaskfoldCards({
      store,
      runtime: createRuntime(),
      now: Date.now() + ABANDONED_MS,
    });

    expect(outcome).toMatchObject({ checked: 1, finished: 1 });
    const reconciled = await store.get(card.id);
    // The run is closed out, not left claiming to be in flight, and the claim and
    // running attempt go with it so the card and the owner's slot are both free.
    expect(reconciled?.execution?.status).toBe("blocked");
    expect(reconciled?.metadata?.claim).toBeUndefined();
    expect(reconciled?.metadata?.attempts?.some((a) => a.status === "running")).toBe(false);
  });

  it("moves a card off running once its run is closed", async () => {
    const store = createStore();
    const card = await createRunningCard(store);
    const now = Date.now() + ABANDONED_MS;

    // First pass closes the run; the status catches up on the next pass against
    // fresh state rather than the revision the closing pass had read.
    await reconcileTaskfoldCards({ store, runtime: createRuntime(), now });
    await reconcileTaskfoldCards({ store, runtime: createRuntime(), now });

    expect((await store.get(card.id))?.status).toBe("blocked");
  });

  it("flags a quiet run stale without closing it, and clears the flag when it reports in", async () => {
    const store = createStore();
    const card = await createRunningCard(store);
    const quietSince = (await store.get(card.id))!.metadata!.claim!.lastHeartbeatAt;

    const outcome = await reconcileTaskfoldCards({
      store,
      runtime: createRuntime(),
      now: quietSince + STALE_MS,
    });

    expect(outcome).toMatchObject({ finished: 0, updated: 1 });
    const stale = await store.get(card.id);
    expect(stale?.metadata?.stale).toMatchObject({ lastSessionUpdatedAt: quietSince });
    // Still running: a stuck run must read as stuck, not as moved on.
    expect(stale?.status).toBe("running");
    expect(stale?.execution?.status).toBe("running");

    const claim = stale!.metadata!.claim!;
    await store.heartbeat(card.id, { ownerId: claim.ownerId, token: claim.token });
    await reconcileTaskfoldCards({ store, runtime: createRuntime() });
    expect((await store.get(card.id))?.metadata?.stale).toBeUndefined();
  });

  it("skips cards that are archived or have no work in flight", async () => {
    const store = createStore();
    await store.create({ title: "Idle backlog card", status: "backlog" });
    const archived = await createRunningCard(store, "subagent:taskfold-archived");
    await store.archive(archived.id, true);

    const outcome = await reconcileTaskfoldCards({
      store,
      runtime: createRuntime(),
      now: Date.now() + ABANDONED_MS,
    });

    expect(outcome.checked).toBe(0);
  });

  it("keeps sweeping after one card fails to converge", async () => {
    const store = createStore();
    const rejected = await createRunningCard(store, "subagent:taskfold-rejected");
    const healthy = await createRunningCard(store, "subagent:taskfold-healthy");

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

    const outcome = await reconcileTaskfoldCards({
      store,
      runtime: createRuntime(),
      now: Date.now() + STALE_MS,
      onCardError,
    });

    expect(outcome).toMatchObject({ checked: 2, updated: 1, skipped: 1 });
    expect(onCardError).toHaveBeenCalledWith(rejected.id, expect.any(Error));
    expect((await store.get(healthy.id))?.metadata?.stale).toBeDefined();
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

    const outcome = await reconcileTaskfoldCards({
      store,
      runtime: createRuntime(),
      // Well past the claim TTL plus the reclaim grace period.
      now: Date.now() + 20 * 60 * 1000,
    });

    expect(outcome.reclaimed).toBe(1);
    expect((await store.get(created.id))?.metadata?.claim).toBeUndefined();
  });

  it("does not close a run that never started one", async () => {
    const store = createStore();
    const created = await store.create({ title: "Claimed but not started", status: "ready" });
    const claimed = await store.claimExecution(created.id, {
      ownerId: "owner-a",
      expectedRevision: created.revision,
    });

    const outcome = await reconcileTaskfoldCards({
      store,
      runtime: createRuntime(),
      now: Date.now() + ABANDONED_MS,
    });

    // Nothing was dispatched, so there is no run to close — only the stale claim to
    // reclaim. Reporting a closed run here would invent a failure that never ran.
    expect(outcome.finished).toBe(0);
    expect((await store.get(claimed.card.id))?.status).toBe("ready");
  });
});
