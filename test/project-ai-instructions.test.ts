import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type {
  PersistedFlowboardAttachment,
  PersistedFlowboardBoard,
  PersistedFlowboardCard,
  PersistedFlowboardMilestone,
  PersistedFlowboardNotificationSubscription,
  PersistedFlowboardProjectDocument,
  FlowboardKeyedStore,
} from "../src/backend/src/persistence-types.js";
import { FlowboardStore } from "../src/backend/src/store.js";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

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

function createWorkspace(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "flowboard-ai-instructions-"));
  roots.push(root);
  fs.mkdirSync(path.join(root, "web"));
  fs.mkdirSync(path.join(root, "node_modules", "ignored"), { recursive: true });
  fs.mkdirSync(path.join(root, ".claude", "skills", "deploy-test"), { recursive: true });
  fs.mkdirSync(path.join(root, ".claude", "skills", "deploy-prod"), { recursive: true });
  fs.writeFileSync(path.join(root, "AGENTS.md"), "# Root agents\n");
  fs.writeFileSync(path.join(root, "CLAUDE.md"), "# Root Claude\n");
  fs.writeFileSync(path.join(root, "web", "AGENTS.md"), "# Web agents\n");
  fs.writeFileSync(path.join(root, "node_modules", "ignored", "AGENTS.md"), "# Ignore\n");
  fs.writeFileSync(path.join(root, ".claude", "skills", "deploy-test", "SKILL.md"), "# Test\n");
  fs.writeFileSync(path.join(root, ".claude", "skills", "deploy-prod", "SKILL.md"), "# Prod\n");
  fs.writeFileSync(path.join(root, ".claude", "settings.local.json"), "{\"ignored\":true}\n");
  return root;
}

describe("Flowboard AI instruction synchronization", () => {
  it("discovers only approved instruction files and preserves existing user changes", async () => {
    const workspace = createWorkspace();
    const store = createStore();
    await store.createProject({
      id: "alpha",
      name: "Alpha",
      initialMilestoneTitle: "Build",
      defaultWorkspace: { kind: "dir", path: workspace },
    });

    const first = await store.syncProjectAiInstructions("alpha");
    expect(first.documents).toHaveLength(5);
    expect(first.documents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "ai.agents", source: "ai_system" }),
        expect.objectContaining({ key: "ai.claude", source: "ai_system" }),
        expect.objectContaining({ key: "ai.web.agents", source: "ai_system" }),
        expect.objectContaining({ key: "ai.claude.skills.deploy-test.skill", source: "ai_system" }),
        expect.objectContaining({ key: "ai.claude.skills.deploy-prod.skill", source: "ai_system" }),
      ]),
    );
    expect(
      first.documents.some((document) => document.target?.includes("node_modules") === true),
    ).toBe(false);

    const agents = first.documents.find((document) => document.key === "ai.agents");
    if (!agents) {
      throw new Error("missing synced AGENTS.md");
    }
    await store.updateProjectDocument(agents.id, {
      title: "Team agent rules",
      summary: "User maintained summary.",
    });
    await store.hideProjectDocument(agents.id);
    fs.rmSync(path.join(workspace, "AGENTS.md"));

    await expect(store.syncProjectAiInstructions("alpha")).resolves.toEqual({ documents: [] });
    const listed = await store.listProjectDocuments("alpha", { includeHidden: true });
    expect(listed.documents.find((document) => document.id === agents.id)).toMatchObject({
      title: "Team agent rules",
      summary: "User maintained summary.",
      hiddenAt: expect.any(Number),
      source: "ai_system",
    });
  });

  it("requires a directory-like default workspace before synchronizing", async () => {
    const store = createStore();
    await store.createProject({
      id: "alpha",
      name: "Alpha",
      initialMilestoneTitle: "Build",
    });

    await expect(store.syncProjectAiInstructions("alpha")).rejects.toThrow("default workspace");
  });
});
