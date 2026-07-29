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
  fs.mkdirSync(path.join(root, ".planning", "codebase", "nested"), { recursive: true });
  fs.mkdirSync(path.join(root, ".planning", "intel"), { recursive: true });
  fs.mkdirSync(path.join(root, ".planning", "notes"), { recursive: true });
  fs.mkdirSync(path.join(root, ".planning", "research"), { recursive: true });
  fs.mkdirSync(path.join(root, ".planning", "seeds"), { recursive: true });
  fs.mkdirSync(path.join(root, ".planning", "phases"), { recursive: true });
  fs.mkdirSync(path.join(root, ".planning", "milestones"), { recursive: true });
  fs.mkdirSync(path.join(root, ".planning", "archive"), { recursive: true });
  fs.mkdirSync(path.join(root, ".github"), { recursive: true });
  fs.mkdirSync(path.join(root, ".trae"), { recursive: true });
  fs.mkdirSync(path.join(root, "_bmad-output"), { recursive: true });
  fs.mkdirSync(path.join(root, "node_modules", "ignored"), { recursive: true });
  fs.mkdirSync(path.join(root, "tpm", "ignored"), { recursive: true });
  fs.mkdirSync(path.join(root, ".claude", "agents"), { recursive: true });
  fs.mkdirSync(path.join(root, ".claude", "skills", "deploy-test"), { recursive: true });
  fs.mkdirSync(path.join(root, ".claude", "skills", "deploy-prod"), { recursive: true });
  fs.writeFileSync(path.join(root, "AGENTS.md"), "# Root agents\n");
  fs.writeFileSync(path.join(root, "CLAUDE.md"), "# Root Claude\n");
  fs.writeFileSync(path.join(root, "README.md"), "# Project readme\n");
  fs.writeFileSync(path.join(root, "web", "AGENTS.md"), "# Web agents\n");
  fs.writeFileSync(path.join(root, "docs", "CLAUDE.md"), "# Docs Claude\n");
  fs.writeFileSync(path.join(root, "docs", "overview.md"), "# Overview\n");
  fs.writeFileSync(path.join(root, ".planning", "overview.md"), "# Planning overview\n");
  fs.writeFileSync(path.join(root, ".planning", "codebase", "ARCHITECTURE.md"), "# Architecture\n");
  fs.writeFileSync(path.join(root, ".planning", "codebase", "nested", "ignored.md"), "# Ignore\n");
  fs.writeFileSync(path.join(root, ".planning", "intel", "environment.md"), "# Environment\n");
  fs.writeFileSync(path.join(root, ".planning", "notes", "decision.md"), "# Decision\n");
  fs.writeFileSync(path.join(root, ".planning", "research", "comparison.md"), "# Comparison\n");
  fs.writeFileSync(path.join(root, ".planning", "seeds", "ideas.md"), "# Ideas\n");
  fs.writeFileSync(path.join(root, ".planning", "phases", "phase-1.md"), "# Ignore\n");
  fs.writeFileSync(path.join(root, ".planning", "milestones", "m1.md"), "# Ignore\n");
  fs.writeFileSync(path.join(root, ".planning", "archive", "old.md"), "# Ignore\n");
  fs.writeFileSync(path.join(root, ".trae", "ignored.md"), "# Ignore\n");
  fs.writeFileSync(path.join(root, "_bmad-output", "ignored.md"), "# Ignore\n");
  fs.writeFileSync(path.join(root, "node_modules", "ignored", "AGENTS.md"), "# Ignore\n");
  fs.writeFileSync(path.join(root, "node_modules", "AGENTS.md"), "# Ignore\n");
  fs.writeFileSync(path.join(root, "tpm", "CLAUDE.md"), "# Ignore\n");
  fs.writeFileSync(path.join(root, "tpm", "ignored", "README.md"), "# Ignore\n");
  fs.writeFileSync(path.join(root, ".claude", "agents", "ignored.md"), "# Ignore\n");
  fs.writeFileSync(path.join(root, ".github", "copilot-instructions.md"), "# Copilot\n");
  fs.writeFileSync(path.join(root, ".claude", "skills", "deploy-test", "SKILL.md"), "# Test\n");
  fs.writeFileSync(path.join(root, ".claude", "skills", "deploy-prod", "SKILL.md"), "# Prod\n");
  fs.writeFileSync(path.join(root, ".claude", "settings.local.json"), "{\"ignored\":true}\n");
  return root;
}

describe("Flowboard project document discovery", () => {
  it("discovers only project-entry Markdown and AI instruction files while preserving user changes", async () => {
    const workspace = createWorkspace();
    const { store, documents } = createStore();
    await store.createProject({
      id: "alpha",
      name: "Alpha",
      initialMilestoneTitle: "Build",
      defaultWorkspace: { kind: "dir", path: workspace },
    });

    const first = await store.listProjectDocuments("alpha", { includeHidden: true });
    const aiDocuments = first.documents.filter((document) => document.source === "ai_system");
    expect(aiDocuments).toHaveLength(7);
    const projectDocuments = first.documents.filter((document) => document.source === "project");
    expect(projectDocuments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ target: path.join(workspace, "README.md") }),
        expect.objectContaining({ target: path.join(workspace, ".planning", "overview.md") }),
        expect.objectContaining({
          target: path.join(workspace, ".planning", "codebase", "ARCHITECTURE.md"),
          section: "codebase",
        }),
        expect.objectContaining({
          target: path.join(workspace, ".planning", "notes", "decision.md"),
          section: "knowledge",
        }),
        expect.objectContaining({
          target: path.join(workspace, ".planning", "intel", "environment.md"),
          section: "environment",
        }),
      ]),
    );
    expect(aiDocuments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "ai.agents", source: "ai_system" }),
        expect.objectContaining({ key: "ai.claude", source: "ai_system" }),
        expect.objectContaining({ key: "ai.web.agents", source: "ai_system" }),
        expect.objectContaining({ key: "ai.docs.claude", source: "ai_system" }),
        expect.objectContaining({ key: "ai.github.copilot-instructions", source: "ai_system" }),
        expect.objectContaining({ key: "ai.claude.skills.deploy-test.skill", source: "ai_system" }),
        expect.objectContaining({ key: "ai.claude.skills.deploy-prod.skill", source: "ai_system" }),
      ]),
    );
    expect(first.documents.every((document) => document.system === undefined)).toBe(true);
    expect(
      (await documents.entries()).every(({ value }) => value.document.system === true),
    ).toBe(true);
    for (const excluded of [
      "docs/overview.md",
      ".planning/codebase/nested/ignored.md",
      ".planning/phases/phase-1.md",
      ".planning/milestones/m1.md",
      ".planning/archive/old.md",
      ".trae/ignored.md",
      "_bmad-output/ignored.md",
      "node_modules/AGENTS.md",
      "node_modules/ignored/AGENTS.md",
      "tpm/CLAUDE.md",
      "tpm/ignored/README.md",
      ".claude/agents/ignored.md",
    ]) {
      expect(first.documents.some((document) => document.target?.endsWith(excluded))).toBe(false);
    }

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

  it("converges automatic records to the supported paths without removing manual documents", async () => {
    const workspace = createWorkspace();
    const { store, documents } = createStore();
    await store.createProject({
      id: "alpha",
      name: "Alpha",
      initialMilestoneTitle: "Build",
      defaultWorkspace: { kind: "dir", path: workspace },
    });
    await documents.register("automatic-docs", {
      version: 1,
      document: {
        id: "automatic-docs",
        boardId: "alpha",
        key: "file.legacy-docs",
        section: "project",
        source: "project",
        type: "path",
        title: "Old docs scan",
        target: path.join(workspace, "docs", "overview.md"),
        position: 1024,
        createdAt: 1,
        updatedAt: 1,
      },
    });
    await documents.register("automatic-requirements", {
      version: 1,
      document: {
        id: "automatic-requirements",
        boardId: "alpha",
        key: "file.legacy-requirements",
        section: "project",
        source: "project",
        type: "path",
        title: "Requirements",
        target: path.join(workspace, "需求", "roadmap.md"),
        position: 2048,
        createdAt: 1,
        updatedAt: 1,
      },
    });
    await documents.register("automatic-planning", {
      version: 1,
      document: {
        id: "automatic-planning",
        boardId: "alpha",
        key: "file.legacy-planning",
        section: "knowledge",
        source: "project",
        type: "path",
        title: "User planning title",
        summary: "User planning summary.",
        target: path.join(workspace, ".planning", "notes", "decision.md"),
        position: 3072,
        hiddenAt: 99,
        createdAt: 1,
        updatedAt: 2,
      },
    });
    await documents.register("manual-docs", {
      version: 1,
      document: {
        id: "manual-docs",
        boardId: "alpha",
        key: "manual-docs",
        section: "project",
        source: "project",
        type: "path",
        title: "Manual docs link",
        target: path.join(workspace, "docs", "overview.md"),
        position: 4096,
        createdAt: 1,
        updatedAt: 1,
      },
    });

    const listed = await store.listProjectDocuments("alpha", { includeHidden: true });

    expect(listed.documents.find((document) => document.id === "automatic-docs")).toBeUndefined();
    expect(listed.documents.find((document) => document.id === "automatic-requirements")).toBeUndefined();
    expect(listed.documents.find((document) => document.id === "automatic-planning")).toMatchObject({
      title: "User planning title",
      summary: "User planning summary.",
      position: 3072,
      hiddenAt: 99,
    });
    expect(listed.documents.find((document) => document.id === "manual-docs")).toMatchObject({
      title: "Manual docs link",
      target: path.join(workspace, "docs", "overview.md"),
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
