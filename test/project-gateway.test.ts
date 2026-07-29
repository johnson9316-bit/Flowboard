import { describe, expect, it } from "vitest";
import type { OpenClawPluginApi } from "../src/backend/api.js";
import type {
  PersistedFlowboardAttachment,
  PersistedFlowboardBoard,
  PersistedFlowboardCard,
  PersistedFlowboardMilestone,
  PersistedFlowboardNotificationSubscription,
  PersistedFlowboardProjectDocument,
  FlowboardKeyedStore,
} from "../src/backend/src/persistence-types.js";
import { registerFlowboardGatewayMethods } from "../src/backend/src/gateway.js";
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

function createStore(): FlowboardStore {
  return new FlowboardStore(keyedStore<PersistedFlowboardCard>(), {
    boards: keyedStore<PersistedFlowboardBoard>(),
    milestones: keyedStore<PersistedFlowboardMilestone>(),
    documents: keyedStore<PersistedFlowboardProjectDocument>(),
    subscriptions: keyedStore<PersistedFlowboardNotificationSubscription>(),
    attachments: keyedStore<PersistedFlowboardAttachment>(),
  });
}

describe("Flowboard M2 Gateway methods", () => {
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
    registerFlowboardGatewayMethods({ api, store: createStore() });

    const writes = [
      "flowboard.projects.create",
      "flowboard.projects.update",
      "flowboard.projects.reorder",
      "flowboard.projects.archive",
      "flowboard.projects.restore",
      "flowboard.projects.milestones.create",
      "flowboard.projects.milestones.reorder",
      "flowboard.projects.milestones.complete",
      "flowboard.projects.documents.create",
      "flowboard.projects.documents.reorder",
      "flowboard.projects.documents.delete",
      "flowboard.cards.sources.create",
      "flowboard.cards.sources.update",
      "flowboard.cards.sources.delete",
      "flowboard.cards.sources.reorder",
      "flowboard.cards.moveMilestone",
      "flowboard.cards.moveProject",
    ];
    for (const name of writes) {
      expect(registrations.get(name)?.options.scope).toBe("operator.write");
    }
    expect(registrations.get("flowboard.projects.get")?.options.scope).toBe("operator.read");
    expect(registrations.get("flowboard.projects.documents.list")?.options.scope).toBe("operator.read");
    expect(registrations.get("flowboard.projects.documents.read")?.options.scope).toBe(
      "operator.read",
    );

    const responses: Array<{ ok: boolean; payload?: unknown }> = [];
    const create = registrations.get("flowboard.projects.create");
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
