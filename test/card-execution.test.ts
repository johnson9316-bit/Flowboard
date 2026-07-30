import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
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
  abortTaskfoldCardExecution,
  inspectTaskfoldCardExecution,
  prepareTaskfoldCardExecution,
  startTaskfoldCardExecution,
  steerTaskfoldCardExecution,
  type TaskfoldCardExecutionOptions,
} from "../src/backend/src/card-execution.js";
import { TaskfoldStore } from "../src/backend/src/store.js";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

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

function createGitCheckout(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "taskfold-card-execution-"));
  roots.push(root);
  fs.writeFileSync(path.join(root, "README.md"), "# Test checkout\n");
  execFileSync("git", ["init"], { cwd: root, stdio: "ignore" });
  execFileSync("git", ["config", "user.email", "taskfold@example.test"], {
    cwd: root,
    stdio: "ignore",
  });
  execFileSync("git", ["config", "user.name", "Taskfold Test"], {
    cwd: root,
    stdio: "ignore",
  });
  execFileSync("git", ["add", "README.md"], { cwd: root, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "Initial commit"], { cwd: root, stdio: "ignore" });
  return root;
}

function executionOptions(params: {
  worktreeRoot: string;
  run?: ReturnType<typeof vi.fn>;
  sessionMessages?: () => unknown[];
  taskRunId: () => string;
}): TaskfoldCardExecutionOptions {
  const createWorktree = vi.fn(async ({ name }: { name: string }) => {
    const worktreePath = path.join(params.worktreeRoot, name);
    fs.mkdirSync(worktreePath, { recursive: true });
    return { path: worktreePath, branch: `taskfold/${name}` };
  });
  return {
    runtime: {
      agent: { defaults: { provider: "openai", model: "gpt-5.5" } },
      subagent: {
        run: params.run ?? vi.fn(async () => ({ runId: params.taskRunId() })),
        getSessionMessages: vi.fn(async () => ({
          messages: params.sessionMessages?.() ?? [],
        })),
      },
      worktrees: {
        create: createWorktree,
        removeIfLossless: vi.fn(async () => true),
      },
    } as never,
    workspaceAccess: { unrestricted: true },
    defaultAgentId: "main",
  };
}

async function createProjectCard(store: TaskfoldStore, checkout: string) {
  await store.createProject({
    id: "alpha",
    name: "Alpha",
    initialMilestoneTitle: "Build",
    defaultWorkspace: { kind: "dir", path: checkout },
  });
  return await store.create({
    boardId: "alpha",
    title: "Run finished card again",
    status: "done",
  });
}

describe("Taskfold native card execution", () => {
  it("prepares without writing and rejects a stale confirmation before a Worktree is created", async () => {
    const store = createStore();
    const checkout = createGitCheckout();
    const card = await createProjectCard(store, checkout);
    let runId = "run-1";
    const options = executionOptions({
      worktreeRoot: path.join(checkout, ".taskfold-worktrees"),
      taskRunId: () => runId,
    });

    const prepared = await prepareTaskfoldCardExecution({ store, id: card.id, options });
    const untouched = await store.get(card.id);

    expect(prepared).toMatchObject({
      cardId: card.id,
      expectedRevision: card.revision,
      active: false,
      agentId: "main",
      sourceCheckout: checkout,
      worktreeName: `wb-${card.id}`,
    });
    expect(prepared.promptPreview).toContain("Claim token: [generated after confirmation]");
    expect(untouched).toEqual(card);

    const changed = await store.update(card.id, { notes: "Changed after preparing." });
    await expect(
      startTaskfoldCardExecution({
        store,
        id: card.id,
        expectedRevision: prepared.expectedRevision,
        options,
      }),
    ).rejects.toThrow(`card ${card.id} changed since revision ${prepared.expectedRevision}`);
    expect(changed.status).toBe("done");
    expect((options.runtime.worktrees.create as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(0);
    runId = "run-2";
  });

  it("starts, inspects, steers, and stops a Done card without changing its business status", async () => {
    const store = createStore();
    const checkout = createGitCheckout();
    const card = await createProjectCard(store, checkout);
    let currentRunId = "run-1";
    let claimToken = "";
    const run = vi.fn(async () => ({ runId: currentRunId }));
    const options = executionOptions({
      worktreeRoot: path.join(checkout, ".taskfold-worktrees"),
      run,
      sessionMessages: () => [{ role: "assistant", text: `Claim token: ${claimToken}` }],
      taskRunId: () => currentRunId,
    });
    const prepared = await prepareTaskfoldCardExecution({ store, id: card.id, options });
    const started = await startTaskfoldCardExecution({
      store,
      id: card.id,
      expectedRevision: prepared.expectedRevision,
      options,
    });
    claimToken = started.card.metadata?.claim?.token ?? "";

    expect(started.card).toMatchObject({
      id: card.id,
      status: "done",
      execution: { status: "running", sessionKey: started.sessionKey, runId: "run-1" },
      metadata: {
        automation: {
          workspace: {
            kind: "worktree",
            path: started.worktreePath,
            sourcePath: checkout,
          },
        },
      },
    });
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        cwd: started.worktreePath,
        message: expect.stringContaining(`Claim token: ${claimToken}`),
      }),
    );
    const activePreparation = await prepareTaskfoldCardExecution({
      store,
      id: card.id,
      options,
    });
    expect(activePreparation).toMatchObject({
      active: true,
      sourceCheckout: checkout,
    });
    await expect(
      startTaskfoldCardExecution({
        store,
        id: card.id,
        expectedRevision: activePreparation.expectedRevision,
        options,
      }),
    ).rejects.toThrow("already has an active execution");

    const inspected = await inspectTaskfoldCardExecution({
      store,
      id: card.id,
      runtime: options.runtime,
    });
    expect(inspected).toMatchObject({
      active: true,
      sessionKey: started.sessionKey,
      runId: "run-1",
      preview: { messages: [{ role: "assistant", text: "Claim token: [redacted]" }] },
    });
    expect(options.runtime.subagent.getSessionMessages).toHaveBeenCalledWith({
      sessionKey: started.sessionKey,
      limit: 6,
    });

    currentRunId = "run-2";
    const steered = await steerTaskfoldCardExecution({
      store,
      id: card.id,
      nextRunId: currentRunId,
    });
    expect(steered.card.execution).toMatchObject({ status: "running", runId: "run-2" });

    const stopped = await abortTaskfoldCardExecution({
      store,
      id: card.id,
      expectedRunId: currentRunId,
    });
    expect(stopped.card).toMatchObject({
      status: "done",
      execution: { status: "blocked", runId: "run-2" },
    });
    expect(stopped.card.metadata?.claim).toBeUndefined();
    expect(stopped.card.metadata?.attempts?.at(-1)).toMatchObject({
      status: "stopped",
      runId: "run-2",
    });
  });

  it("finishes a native run without inferring a Card status change", async () => {
    const store = createStore();
    const checkout = createGitCheckout();
    await store.createProject({
      id: "alpha",
      name: "Alpha",
      initialMilestoneTitle: "Build",
      defaultWorkspace: { kind: "dir", path: checkout },
    });
    const card = await store.create({
      boardId: "alpha",
      title: "Keep business status independent",
      status: "todo",
    });
    const options = executionOptions({
      worktreeRoot: path.join(checkout, ".taskfold-worktrees"),
      taskRunId: () => "run-1",
    });
    const prepared = await prepareTaskfoldCardExecution({ store, id: card.id, options });
    await startTaskfoldCardExecution({
      store,
      id: card.id,
      expectedRevision: prepared.expectedRevision,
      options,
    });

    const completed = await store.finishExecutionForRun("run-1", {
      outcome: "ok",
      endedAt: 1_700_000_000_000,
    });
    expect(completed).toMatchObject({
      id: card.id,
      status: "todo",
      execution: { status: "done", runId: "run-1" },
    });
    expect(completed?.metadata?.claim).toBeUndefined();
    expect(completed?.metadata?.attempts?.at(-1)).toMatchObject({
      status: "succeeded",
      runId: "run-1",
      endedAt: 1_700_000_000_000,
    });
    expect(completed?.events?.at(-1)).toMatchObject({
      kind: "attempt_updated",
      runId: "run-1",
    });

    const failed = await store.finishExecutionForRun("run-1", {
      outcome: "error",
      reason: "late duplicate event",
    });
    expect(failed).toEqual(completed);
  });
});
