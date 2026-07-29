import type { OpenClawPluginApi } from "../api.js";
import type { FlowboardCard } from "../../contract/index.js";
import {
  readId,
  resolveGatewayFlowboardWorkspaceAccess,
  respondError,
  type GatewayMethodContext,
} from "./gateway-helpers.js";
import type { FlowboardStore } from "./store.js";
import {
  assertFlowboardWorkspaceMutationAccess,
  canonicalizeFlowboardWorkspaceAccess,
} from "./workspace-access.js";

const READ_SCOPE = "operator.read" as const;
const WRITE_SCOPE = "operator.write" as const;

async function assertProjectWorkspaceAccess(
  request: GatewayMethodContext,
  value: unknown,
): Promise<void> {
  const access = await canonicalizeFlowboardWorkspaceAccess(
    resolveGatewayFlowboardWorkspaceAccess({
      context: request.context,
      client: request.client,
    }),
  );
  await assertFlowboardWorkspaceMutationAccess(value, access);
}

export function registerFlowboardProjectGatewayMethods(params: {
  api: OpenClawPluginApi;
  store: FlowboardStore;
  redactCard: (card: FlowboardCard) => FlowboardCard;
}): void {
  const { api, store, redactCard } = params;
  api.registerGatewayMethod(
    "flowboard.projects.list",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, await store.listProjects(requestParams));
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: READ_SCOPE },
  );
  api.registerGatewayMethod(
    "flowboard.projects.get",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, { project: await store.getProject(requestParams.id) });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: READ_SCOPE },
  );
  api.registerGatewayMethod(
    "flowboard.projects.create",
    async (request) => {
      const { params: requestParams, respond } = request;
      try {
        await assertProjectWorkspaceAccess(request, requestParams);
        respond(true, { project: await store.createProject(requestParams) });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );
  api.registerGatewayMethod(
    "flowboard.projects.update",
    async (request) => {
      const { params: requestParams, respond } = request;
      try {
        await assertProjectWorkspaceAccess(request, requestParams);
        respond(true, { project: await store.updateProject(requestParams) });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );
  api.registerGatewayMethod(
    "flowboard.projects.reorder",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, await store.reorderProjects(requestParams.ids));
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );
  api.registerGatewayMethod(
    "flowboard.projects.archive",
    async ({ params: requestParams, respond }) => {
      try {
        respond(
          true,
          await store.archiveProject(requestParams.id, requestParams.archived === false ? false : true),
        );
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );
  api.registerGatewayMethod(
    "flowboard.projects.restore",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, await store.archiveProject(requestParams.id, false));
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );

  api.registerGatewayMethod(
    "flowboard.projects.milestones.list",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, await store.listMilestones(requestParams.boardId));
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: READ_SCOPE },
  );
  api.registerGatewayMethod(
    "flowboard.projects.milestones.create",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, { milestone: await store.createMilestone(requestParams) });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );
  api.registerGatewayMethod(
    "flowboard.projects.milestones.update",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, { milestone: await store.updateMilestone(readId(requestParams), requestParams) });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );
  api.registerGatewayMethod(
    "flowboard.projects.milestones.reorder",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, await store.reorderMilestones(requestParams));
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );
  api.registerGatewayMethod(
    "flowboard.projects.milestones.complete",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, { milestone: await store.completeMilestone(readId(requestParams)) });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );
  api.registerGatewayMethod(
    "flowboard.projects.milestones.archive",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, { milestone: await store.archiveMilestone(readId(requestParams)) });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );
  api.registerGatewayMethod(
    "flowboard.projects.milestones.restore",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, { milestone: await store.restoreMilestone(readId(requestParams)) });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );

  api.registerGatewayMethod(
    "flowboard.projects.documents.list",
    async ({ params: requestParams, respond }) => {
      try {
        respond(
          true,
          await store.listProjectDocuments(requestParams.boardId, {
            includeHidden: requestParams.includeHidden,
          }),
        );
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: READ_SCOPE },
  );
  api.registerGatewayMethod(
    "flowboard.projects.documents.create",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, { document: await store.createProjectDocument(requestParams) });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );
  api.registerGatewayMethod(
    "flowboard.projects.documents.update",
    async ({ params: requestParams, respond }) => {
      try {
        respond(
          true,
          { document: await store.updateProjectDocument(readId(requestParams), requestParams) },
        );
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );
  api.registerGatewayMethod(
    "flowboard.projects.documents.reorder",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, await store.reorderProjectDocuments(requestParams));
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );
  api.registerGatewayMethod(
    "flowboard.projects.documents.hide",
    async ({ params: requestParams, respond }) => {
      try {
        respond(
          true,
          { document: await store.hideProjectDocument(readId(requestParams), true) },
        );
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );
  api.registerGatewayMethod(
    "flowboard.projects.documents.restore",
    async ({ params: requestParams, respond }) => {
      try {
        respond(
          true,
          { document: await store.hideProjectDocument(readId(requestParams), false) },
        );
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );
  api.registerGatewayMethod(
    "flowboard.projects.documents.delete",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, await store.deleteProjectDocument(readId(requestParams)));
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );

  api.registerGatewayMethod(
    "flowboard.cards.moveMilestone",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, {
          card: redactCard(await store.moveMilestone(readId(requestParams), requestParams)),
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );
  api.registerGatewayMethod(
    "flowboard.cards.moveProject",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, {
          card: redactCard(await store.moveProject(readId(requestParams), requestParams)),
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );
}
