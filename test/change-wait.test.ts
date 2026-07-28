import { describe, expect, it } from "vitest";
import { FlowboardCoreStore } from "../src/backend/src/store-core.js";
import type {
  FlowboardKeyedStore,
  PersistedFlowboardCard,
} from "../src/backend/src/persistence-types.js";

function createStore(): FlowboardKeyedStore<PersistedFlowboardCard> {
  const values = new Map<string, PersistedFlowboardCard>();
  return {
    async register(key: string, value: PersistedFlowboardCard) {
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

describe("flowboard change wait", () => {
  it("returns immediately for a cursor from a different change epoch", async () => {
    const store = new FlowboardCoreStore(createStore());
    store.announceChangeEpoch();

    await expect(
      store.waitForChange({ epoch: "old-epoch", revision: 1 }, 50),
    ).resolves.toMatchObject({ timedOut: false, change: { revision: 1 } });
  });

  it("waits until a new revision is announced", async () => {
    const store = new FlowboardCoreStore(createStore());
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
