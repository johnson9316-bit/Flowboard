import { describe, expect, it } from "vitest";
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
  const cards = keyedStore<PersistedFlowboardCard>();
  return {
    cards,
    store: new FlowboardStore(cards, {
      boards: keyedStore<PersistedFlowboardBoard>(),
      milestones: keyedStore<PersistedFlowboardMilestone>(),
      documents: keyedStore<PersistedFlowboardProjectDocument>(),
      subscriptions: keyedStore<PersistedFlowboardNotificationSubscription>(),
      attachments: keyedStore<PersistedFlowboardAttachment>(),
    }),
  };
}

describe("Flowboard M2 project store", () => {
  it("creates a project atomically with its first milestone and standard documents", async () => {
    const { store } = createStore();

    const project = await store.createProject({
      id: "alpha",
      name: "Alpha",
      initialMilestoneTitle: "Foundation",
    });
    const documents = await store.listProjectDocuments("alpha");

    expect(project.board).toMatchObject({ id: "alpha", name: "Alpha" });
    expect(project.milestones).toHaveLength(1);
    expect(project.milestones[0]).toMatchObject({ boardId: "alpha", state: "active" });
    expect(documents.documents.map((document) => document.key)).toEqual(
      expect.arrayContaining(["project", "requirements", "architecture", "dev_environment", "notes"]),
    );

    await expect(
      store.createProject({
        id: "missing-name",
        initialMilestoneTitle: "First",
      }),
    ).rejects.toThrow("title is required");
  });

  it("will not claim a legacy card namespace as a newly-created project", async () => {
    const { cards, store } = createStore();
    await cards.register("legacy-card", {
      version: 1,
      card: {
        id: "legacy-card",
        title: "Legacy",
        status: "todo",
        priority: "normal",
        labels: [],
        position: 1024,
        createdAt: 1,
        updatedAt: 1,
        metadata: { automation: { boardId: "legacy" } },
      },
    });

    await expect(
      store.createProject({
        id: "legacy",
        name: "Legacy",
        initialMilestoneTitle: "Migration",
      }),
    ).rejects.toThrow("existing cards");
  });

  it("keeps execution state intact while moving cards across milestones and projects", async () => {
    const { store } = createStore();
    const alpha = await store.createProject({
      id: "alpha",
      name: "Alpha",
      initialMilestoneTitle: "Build",
    });
    await store.createProject({
      id: "beta",
      name: "Beta",
      initialMilestoneTitle: "Launch",
    });
    const card = await store.create({
      title: "Run deployment",
      boardId: "alpha",
      milestoneId: alpha.milestones[0]?.id,
      status: "running",
      execution: {
        id: "run-1",
        kind: "agent-session",
        mode: "autonomous",
        status: "running",
        startedAt: 10,
        updatedAt: 20,
      },
    });

    const unassigned = await store.moveMilestone(card.id, {});
    const moved = await store.moveProject(card.id, { boardId: "beta" });

    expect(unassigned).toMatchObject({
      id: card.id,
      status: "running",
      execution: card.execution,
    });
    expect(unassigned.milestoneId).toBeUndefined();
    expect(unassigned.events?.at(-1)).toMatchObject({
      kind: "milestone_moved",
      fromMilestoneId: alpha.milestones[0]?.id,
    });
    expect(moved).toMatchObject({
      id: card.id,
      status: "running",
      execution: card.execution,
      metadata: { automation: { boardId: "beta" } },
    });
    expect(moved.milestoneId).toBeUndefined();
  });

  it("uses Unassigned by default, inherits a parent milestone, and enforces milestone completion", async () => {
    const { store } = createStore();
    const project = await store.createProject({
      id: "alpha",
      name: "Alpha",
      initialMilestoneTitle: "Build",
    });
    const milestone = project.milestones[0];
    if (!milestone) {
      throw new Error("missing initial milestone");
    }
    const unassigned = await store.create({ title: "Inbox item", boardId: "alpha" });
    const parent = await store.create({
      title: "Parent",
      boardId: "alpha",
      milestoneId: milestone.id,
    });
    const decomposed = await store.decompose(parent.id, {
      completeParent: false,
      children: [{ title: "Child task" }],
    });

    expect(unassigned.milestoneId).toBeUndefined();
    expect(decomposed.children[0]).toMatchObject({
      milestoneId: milestone.id,
      metadata: { automation: { boardId: "alpha" } },
    });
    await expect(store.completeMilestone(milestone.id)).rejects.toThrow("unfinished cards");

    for (const card of [parent, ...decomposed.children]) {
      await store.move(card.id, "done", undefined);
    }
    const completed = await store.completeMilestone(milestone.id);

    expect(completed.state).toBe("completed");
    await expect(
      store.create({
        title: "Late card",
        boardId: "alpha",
        milestoneId: milestone.id,
      }),
    ).rejects.toThrow("active milestone");
  });

  it("protects placement fields, standard documents, and archived project entry points", async () => {
    const { store } = createStore();
    const project = await store.createProject({
      id: "alpha",
      name: "Alpha",
      initialMilestoneTitle: "Build",
    });
    const card = await store.create({ title: "Card", boardId: "alpha" });
    const documents = await store.listProjectDocuments("alpha");
    const standard = documents.documents.find((document) => document.key === "project");
    if (!standard) {
      throw new Error("missing standard document");
    }

    await expect(
      store.update(card.id, { milestoneId: project.milestones[0]?.id } as never),
    ).rejects.toThrow("dedicated project or milestone move");
    await expect(store.deleteProjectDocument(standard.id)).rejects.toThrow("standard project documents");
    await store.hideProjectDocument(standard.id);

    await store.archiveProject("alpha");
    await expect(store.create({ title: "Blocked", boardId: "alpha" })).rejects.toThrow("project is archived");
    await expect(
      store.claim(card.id, { ownerId: "operator" }),
    ).rejects.toThrow("project is archived");
  });
});
