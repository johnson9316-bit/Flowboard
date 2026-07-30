import { describe, expect, it } from "vitest";
import { TaskfoldCoreStore } from "../src/backend/src/store-core.js";
import type {
  TaskfoldKeyedStore,
  PersistedTaskfoldCard,
} from "../src/backend/src/persistence-types.js";

function createStore(): TaskfoldKeyedStore<PersistedTaskfoldCard> {
  const values = new Map<string, PersistedTaskfoldCard>();
  return {
    async register(key: string, value: PersistedTaskfoldCard) {
      values.set(key, value);
    },
    async lookup(key: string) {
      return values.get(key);
    },
    async delete(key: string) {
      return values.delete(key);
    },
    async entries() {
      return [...values.entries()].map(([key, value]) => ({ key, value }));
    },
  };
}

describe("taskfold change wait", () => {
  it("returns immediately for a cursor from a different change epoch", async () => {
    const store = new TaskfoldCoreStore(createStore());
    store.announceChangeEpoch();
    const current = store.currentChange();

    await expect(
      store.waitForChange({ epoch: "old-epoch", revision: 1 }, 50),
    ).resolves.toMatchObject({ timedOut: false, change: current });
  });

  it("keeps a caller's cursor usable across a restart of the same database", async () => {
    const backing = createStore();
    const epoch = "database-scoped-epoch";
    // Stands in for the durable counter the SQLite store keeps in taskfold_meta.
    let reserved = 0;
    const reserveChangeRevisions = (count: number) => {
      const base = reserved;
      reserved += count;
      return base;
    };
    const openStore = () =>
      new TaskfoldCoreStore(backing, { changeEpoch: epoch, reserveChangeRevisions });

    const before = openStore();
    before.announceChangeEpoch();
    const cursor = before.currentChange();
    if (!cursor) {
      throw new Error("change epoch was not initialized");
    }
    expect(cursor.epoch).toBe(epoch);

    // A restarted process reuses the persisted epoch, so the client's cursor stays
    // comparable, and resumes above every revision the previous process emitted.
    const after = openStore();
    after.announceChangeEpoch();
    const resumed = after.currentChange();

    expect(resumed?.epoch).toBe(cursor.epoch);
    expect(resumed?.revision).toBeGreaterThan(cursor.revision);
    await expect(after.waitForChange(cursor, 50)).resolves.toMatchObject({ timedOut: false });
  });

  it("waits until a new revision is announced", async () => {
    const store = new TaskfoldCoreStore(createStore());
    store.announceChangeEpoch();
    const cursor = store.currentChange();
    if (!cursor) {
      throw new Error("change epoch was not initialized");
    }

    const waiting = store.waitForChange(cursor, 100);
    store.announceChangeEpoch();

    await expect(waiting).resolves.toMatchObject({
      timedOut: false,
      change: { epoch: cursor.epoch, revision: cursor.revision + 1 },
    });
  });
});
