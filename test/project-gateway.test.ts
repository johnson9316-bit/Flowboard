import { describe, expect, it } from "vitest";
import type { OpenClawPluginApi } from "../src/backend/api.js";
import type {
  PersistedTaskfoldAttachment,
  PersistedTaskfoldBoard,
  PersistedTaskfoldCard,
  PersistedTaskfoldMilestone,
  PersistedTaskfoldNotificationSubscription,
  PersistedTaskfoldProjectDocument,
  TaskfoldKeyedStore,
} from "../src/backend/src/persistence-types.js";
import { registerTaskfoldGatewayMethods } from "../src/backend/src/gateway.js";
import { TaskfoldStore } from "../src/backend/src/store.js";

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

describe("Taskfold M2 Gateway methods", () => {
  it("registers project, milestone, document, and structural move methods with write scopes", async () => {
    const registrations = new Map<
      string,
      { handler: (request: any) => Promise<void>; options: { scope: string } }
    >();
    const api = {
      runtime: {},
      registerGatewayMethod(name: string, handler: (request: any) => Promise<void>, options: any) {
        registrations.set(name, { handler, options });
      },
    } as unknown as OpenClawPluginApi;
    registerTaskfoldGatewayMethods({ api, store: createStore() });

    const writes = [
      "taskfold.projects.create",
      "taskfold.projects.update",
      "taskfold.projects.reorder",
      "taskfold.projects.archive",
      "taskfold.projects.restore",
      "taskfold.projects.milestones.create",
      "taskfold.projects.milestones.reorder",
      "taskfold.projects.milestones.complete",
      "taskfold.projects.documents.create",
      "taskfold.projects.documents.write",
      "taskfold.projects.documents.reorder",
      "taskfold.projects.documents.delete",
      "taskfold.cards.sources.create",
      "taskfold.cards.sources.update",
      "taskfold.cards.sources.delete",
      "taskfold.cards.sources.reorder",
      "taskfold.cards.moveMilestone",
      "taskfold.cards.moveProject",
      "taskfold.cards.execution.start",
      "taskfold.cards.execution.steer",
      "taskfold.cards.execution.abort",
    ];
    for (const name of writes) {
      expect(registrations.get(name)?.options.scope).toBe("operator.write");
    }
    expect(registrations.get("taskfold.projects.get")?.options.scope).toBe("operator.read");
    expect(registrations.get("taskfold.projects.documents.list")?.options.scope).toBe("operator.read");
    expect(registrations.get("taskfold.projects.documents.read")?.options.scope).toBe(
      "operator.read",
    );
    expect(registrations.get("taskfold.projects.documents.syncAiInstructions")).toBeUndefined();
    expect(registrations.get("taskfold.cards.execution.prepare")?.options.scope).toBe(
      "operator.read",
    );
    expect(registrations.get("taskfold.cards.execution.inspect")?.options.scope).toBe(
      "operator.read",
    );

    const responses: Array<{ ok: boolean; payload?: unknown }> = [];
    const create = registrations.get("taskfold.projects.create");
    if (!create) {
      throw new Error("project create method was not registered");
    }
    await create.handler({
      params: { id: "gateway-project", name: "Gateway project", initialMilestoneTitle: "Start" },
      context: { getRuntimeConfig: () => ({}) },
      respond: (ok: boolean, payload?: unknown) => responses.push({ ok, payload }),
    });

    expect(responses).toHaveLength(1);
    expect(responses[0]).toMatchObject({
      ok: true,
      payload: { project: { board: { id: "gateway-project" } } },
    });
  });
});
