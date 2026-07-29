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

function createStore() {
  const documents = keyedStore<PersistedFlowboardProjectDocument>();
  return {
    documents,
    store: new FlowboardStore(keyedStore<PersistedFlowboardCard>(), {
      boards: keyedStore<PersistedFlowboardBoard>(),
      milestones: keyedStore<PersistedFlowboardMilestone>(),
      documents,
      subscriptions: keyedStore<PersistedFlowboardNotificationSubscription>(),
      attachments: keyedStore<PersistedFlowboardAttachment>(),
    }),
  };
}

function createWorkspace(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "flowboard-ai-instructions-"));
  roots.push(root);
  fs.mkdirSync(path.join(root, "web"));
  fs.mkdirSync(path.join(root, "docs"));
  fs.mkdirSync(path.join(root, ".planning", "codebase"), { recursive: true });
  fs.mkdirSync(path.join(root, ".planning", "notes"), { recursive: true });
  fs.mkdirSync(path.join(root, "node_modules", "ignored"), { recursive: true });
  fs.mkdirSync(path.join(root, "tpm", "ignored"), { recursive: true });
  fs.mkdirSync(path.join(root, ".claude", "agents"), { recursive: true });
  fs.mkdirSync(path.join(root, ".claude", "skills", "deploy-test"), { recursive: true });
  fs.mkdirSync(path.join(root, ".claude", "skills", "deploy-prod"), { recursive: true });
  fs.writeFileSync(path.join(root, "AGENTS.md"), "# Root agents\n");
  fs.writeFileSync(path.join(root, "CLAUDE.md"), "# Root Claude\n");
  fs.writeFileSync(path.join(root, "README.md"), "# Project readme\n");
  fs.writeFileSync(path.join(root, "web", "AGENTS.md"), "# Web agents\n");
  fs.writeFileSync(path.join(root, "docs", "overview.md"), "# Overview\n");
  fs.writeFileSync(path.join(root, ".planning", "codebase", "ARCHITECTURE.md"), "# Architecture\n");
  fs.writeFileSync(path.join(root, ".planning", "notes", "decision.md"), "# Decision\n");
  fs.writeFileSync(path.join(root, "node_modules", "ignored", "AGENTS.md"), "# Ignore\n");
  fs.writeFileSync(path.join(root, "tpm", "ignored", "README.md"), "# Ignore\n");
  fs.writeFileSync(path.join(root, ".claude", "agents", "ignored.md"), "# Ignore\n");
  fs.writeFileSync(path.join(root, ".claude", "skills", "deploy-test", "SKILL.md"), "# Test\n");
  fs.writeFileSync(path.join(root, ".claude", "skills", "deploy-prod", "SKILL.md"), "# Prod\n");
  fs.writeFileSync(path.join(root, ".claude", "settings.local.json"), "{\"ignored\":true}\n");
  return root;
}

describe("Flowboard project document discovery", () => {
  it("discovers project and AI Markdown files while listing documents and preserves user changes", async () => {
    const workspace = createWorkspace();
    const { store } = createStore();
    await store.createProject({
      id: "alpha",
      name: "Alpha",
      initialMilestoneTitle: "Build",
      defaultWorkspace: { kind: "dir", path: workspace },
    });

    const first = await store.listProjectDocuments("alpha", { includeHidden: true });
    const aiDocuments = first.documents.filter((document) => document.source === "ai_system");
    expect(aiDocuments).toHaveLength(5);
    const projectDocuments = first.documents.filter((document) => document.source === "project");
    expect(projectDocuments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ target: path.join(workspace, "README.md") }),
        expect.objectContaining({ target: path.join(workspace, "docs", "overview.md") }),
        expect.objectContaining({
          target: path.join(workspace, ".planning", "codebase", "ARCHITECTURE.md"),
          section: "codebase",
        }),
        expect.objectContaining({
          target: path.join(workspace, ".planning", "notes", "decision.md"),
          section: "knowledge",
        }),
      ]),
    );
    expect(aiDocuments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "ai.agents", source: "ai_system" }),
        expect.objectContaining({ key: "ai.claude", source: "ai_system" }),
        expect.objectContaining({ key: "ai.web.agents", source: "ai_system" }),
        expect.objectContaining({ key: "ai.claude.skills.deploy-test.skill", source: "ai_system" }),
        expect.objectContaining({ key: "ai.claude.skills.deploy-prod.skill", source: "ai_system" }),
      ]),
    );
    expect(first.documents.some((document) => document.target?.includes("node_modules") === true)).toBe(
      false,
    );
    expect(first.documents.some((document) => document.target?.includes("tpm") === true)).toBe(false);
    expect(first.documents.some((document) => document.target?.includes(".claude/agents") === true)).toBe(
      false,
    );

    const agents = aiDocuments.find((document) => document.key === "ai.agents");
    if (!agents) {
      throw new Error("missing synced AGENTS.md");
    }
    await store.updateProjectDocument(agents.id, {
      title: "Team agent rules",
      summary: "User maintained summary.",
    });
    await store.hideProjectDocument(agents.id);
    fs.rmSync(path.join(workspace, "AGENTS.md"));

    const listed = await store.listProjectDocuments("alpha", { includeHidden: true });
    expect(listed.documents.find((document) => document.id === agents.id)).toMatchObject({
      title: "Team agent rules",
      summary: "User maintained summary.",
      hiddenAt: expect.any(Number),
      source: "ai_system",
    });
  });

  it("keeps the project document library empty without a default workspace", async () => {
    const { store } = createStore();
    await store.createProject({
      id: "alpha",
      name: "Alpha",
      initialMilestoneTitle: "Build",
    });

    await expect(store.listProjectDocuments("alpha")).resolves.toEqual({ documents: [] });
  });

  it("replaces generated path records with workspace-scanned documents", async () => {
    const workspace = createWorkspace();
    const { store, documents } = createStore();
    await store.createProject({
      id: "alpha",
      name: "Alpha",
      initialMilestoneTitle: "Build",
      defaultWorkspace: { kind: "dir", path: workspace },
    });
    await documents.register("legacy-readme", {
      version: 1,
      document: {
        id: "legacy-readme",
        boardId: "alpha",
        key: "dev_environment",
        section: "environment",
        source: "project",
        type: "path",
        title: "Development Environment",
        target: "README.md",
        position: 1024,
        system: true,
        createdAt: 1,
        updatedAt: 1,
      },
    });

    const listed = await store.listProjectDocuments("alpha", { includeHidden: true });
    expect(listed.documents.find((document) => document.id === "legacy-readme")).toBeUndefined();
    expect(listed.documents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          target: path.join(workspace, "README.md"),
          title: "README",
        }),
      ]),
    );
  });
});
