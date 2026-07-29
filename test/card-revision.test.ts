import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createFlowboardSqliteStores } from "../src/backend/src/sqlite-store.js";
import { FlowboardRevisionConflictError } from "../src/backend/src/store-core.js";
import { FlowboardStore } from "../src/backend/src/store.js";
import { FLOWBOARD_PROMPT_VERSION } from "../src/backend/src/worker-prompt.js";

const roots: string[] = [];
const closers: Array<() => void> = [];

afterEach(() => {
  for (const close of closers.splice(0)) {
    close();
  }
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

/**
 * Two stores over one database file stand in for two Gateway processes: they
 * share no in-process mutation queue, so only a database-level guard can keep
 * them from both winning.
 */
function openSharedDatabase(): { dbPath: string; open: () => FlowboardStore } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "flowboard-revision-"));
  roots.push(root);
  const dbPath = path.join(root, "flowboard.sqlite");
  return {
    dbPath,
    open: () => {
      const stores = createFlowboardSqliteStores({ dbPath });
      closers.push(stores.close);
      return FlowboardStore.fromSqliteStores(stores);
    },
  };
}

describe("Flowboard card revision", () => {
  it("advances monotonically on every persisted write and survives reopen", async () => {
    const { open } = openSharedDatabase();
    const store = open();

    const created = await store.create({ title: "Revision card" });
    expect(created.revision).toBe(1);

    const renamed = await store.update(created.id, { title: "Renamed" });
    expect(renamed.revision).toBe(2);

    const reprioritized = await store.update(created.id, { priority: "high" });
    expect(reprioritized.revision).toBe(3);

    const reread = await store.get(created.id);
    expect(reread?.revision).toBe(3);

    // A second store over the same file must observe the persisted revision,
    // not a per-process counter.
    const reopened = open();
    expect((await reopened.get(created.id))?.revision).toBe(3);
  });

  it("lets exactly one of two concurrent claims win at the same revision", async () => {
    const { open } = openSharedDatabase();
    const first = open();
    const second = open();

    const card = await first.create({ title: "Contended card" });
    const expectedRevision = card.revision;

    const results = await Promise.allSettled([
      first.claimExecution(card.id, { ownerId: "owner-a", expectedRevision }),
      second.claimExecution(card.id, { ownerId: "owner-b", expectedRevision }),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const persisted = await open().get(card.id);
    expect(persisted?.revision).toBe(expectedRevision + 1);
    // The surviving claim is the one the winner wrote; the loser left no trace.
    const winner = (fulfilled[0] as PromiseFulfilledResult<{ token: string }>).value;
    expect(persisted?.metadata?.claim?.token).toBe(winner.token);
  });

  it("rejects a stale expectedRevision after an unrelated write", async () => {
    const { open } = openSharedDatabase();
    const store = open();

    const card = await store.create({ title: "Stale guard" });
    const staleRevision = card.revision;
    await store.update(card.id, { notes: "moved on" });

    await expect(
      store.claimExecution(card.id, { ownerId: "owner-a", expectedRevision: staleRevision }),
    ).rejects.toThrow(FlowboardRevisionConflictError);
  });

  it("keeps the change cursor comparable and advancing across a reopen", async () => {
    const { open } = openSharedDatabase();
    const first = open();
    await first.create({ title: "Cursor card" });
    const before = first.currentChange();
    if (!before) {
      throw new Error("change cursor was not initialized");
    }

    const second = open();
    await second.create({ title: "After reopen" });
    const after = second.currentChange();

    // Same database means the same epoch, so a UI holding `before` can still
    // compare; the revision must be ahead of anything the first process emitted.
    expect(after?.epoch).toBe(before.epoch);
    expect(after?.revision).toBeGreaterThan(before.revision);
    await expect(second.waitForChange(before, 50)).resolves.toMatchObject({ timedOut: false });
  });

  it("records the prompt version on a run attempt and keeps it across updates", async () => {
    const { open } = openSharedDatabase();
    const store = open();
    const card = await store.create({ title: "Attempt attribution" });

    const started = await store.update(card.id, {
      execution: {
        id: "exec-1",
        kind: "agent-session",
        mode: "autonomous",
        status: "running",
        sessionKey: "session-1",
        runId: "run-1",
        startedAt: Date.now(),
        updatedAt: Date.now(),
      },
    });
    const attempt = started.metadata?.attempts?.at(-1);
    expect(attempt?.promptVersion).toBe(FLOWBOARD_PROMPT_VERSION);

    // Survives a reopen, so the attribution is persisted rather than in-memory.
    expect((await open().get(card.id))?.metadata?.attempts?.at(-1)?.promptVersion).toBe(
      FLOWBOARD_PROMPT_VERSION,
    );
  });

  it("mirrors the claim owner into its indexed column and clears it on release", async () => {
    const { dbPath, open } = openSharedDatabase();
    const store = open();

    const card = await store.create({ title: "Owner column" });
    const claimed = await store.claimExecution(card.id, {
      ownerId: "owner-a",
      expectedRevision: card.revision,
    });
    expect(claimed.card.metadata?.claim?.ownerId).toBe("owner-a");

    const { DatabaseSync } = await import("node:sqlite");
    const db = new DatabaseSync(dbPath);
    try {
      const readOwner = () =>
        (
          db.prepare("SELECT claim_owner_id FROM flowboard_cards WHERE id = ?").get(card.id) as
            | { claim_owner_id: string | null }
            | undefined
        )?.claim_owner_id ?? null;
      expect(readOwner()).toBe("owner-a");

      await store.update(card.id, { metadata: { claim: undefined } });
      expect(readOwner()).toBeNull();
    } finally {
      db.close();
    }
  });
});
