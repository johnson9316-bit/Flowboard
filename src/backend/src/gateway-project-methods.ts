import type { OpenClawPluginApi } from "../api.js";
import type { TaskfoldCard } from "../../contract/index.js";
import {
  readId,
  resolveGatewayTaskfoldWorkspaceAccess,
  respondError,
  type GatewayMethodContext,
} from "./gateway-helpers.js";
import type { TaskfoldStore } from "./store.js";
import {
  assertTaskfoldWorkspaceMutationAccess,
  assertTaskfoldWorkspaceSourceAccess,
  canonicalizeTaskfoldWorkspaceAccess,
} from "./workspace-access.js";
import {
  readTaskfoldProjectDocument,
  writeTaskfoldProjectDocumentPath,
} from "./project-document-reader.js";

const READ_SCOPE = "operator.read" as const;
const WRITE_SCOPE = "operator.write" as const;

async function assertProjectWorkspaceAccess(
  request: GatewayMethodContext,
  value: unknown,
): Promise<void> {
  const access = await canonicalizeTaskfoldWorkspaceAccess(
    resolveGatewayTaskfoldWorkspaceAccess({
      context: request.context,
      client: request.client,
    }),
  );
  await assertTaskfoldWorkspaceMutationAccess(value, access);
}

async function resolveProjectWorkspaceReadAccess(
  request: GatewayMethodContext,
) {
  return await canonicalizeTaskfoldWorkspaceAccess(
    resolveGatewayTaskfoldWorkspaceAccess({
      context: request.context,
      client: request.client,
    }),
  );
}

async function resolveProjectWorkspaceWriteAccess(request: GatewayMethodContext) {
  const access = await resolveProjectWorkspaceReadAccess(request);
  if (!access.unrestricted && !access.writable) {
    throw new Error("project document workspace access is read-only.");
  }
  return access;
}

export function registerTaskfoldProjectGatewayMethods(params: {
  api: OpenClawPluginApi;
  store: TaskfoldStore;
  redactCard: (card: TaskfoldCard) => TaskfoldCard;
}): void {
  const { api, store, redactCard } = params;
  api.registerGatewayMethod(
    "taskfold.projects.list",
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
    "taskfold.projects.get",
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
    "taskfold.projects.create",
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
    "taskfold.projects.update",
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
    "taskfold.projects.boardView.update",
    async ({ params: requestParams, respond }) => {
      try {
        const id = readId(requestParams);
        respond(true, {
          board: await store.updateProject({ id, boardView: requestParams.boardView }),
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );
  api.registerGatewayMethod(
    "taskfold.projects.reorder",
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
    "taskfold.projects.archive",
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
    "taskfold.projects.restore",
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
    "taskfold.projects.milestones.list",
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
    "taskfold.projects.milestones.create",
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
    "taskfold.projects.milestones.update",
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
    "taskfold.projects.milestones.reorder",
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
    "taskfold.projects.milestones.complete",
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
    "taskfold.projects.milestones.archive",
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
    "taskfold.projects.milestones.restore",
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
    "taskfold.projects.documents.list",
    async (request) => {
      const { params: requestParams, respond } = request;
      try {
        const access = await resolveProjectWorkspaceReadAccess(request);
        const project = await store.getProject(requestParams.boardId);
        if (project.board.defaultWorkspace?.path) {
          await assertTaskfoldWorkspaceSourceAccess(project.board.defaultWorkspace, access);
        }
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
    "taskfold.projects.documents.read",
    async (request) => {
      const { params: requestParams, respond } = request;
      try {
        const access = await resolveProjectWorkspaceReadAccess(request);
        const document = await store.getProjectDocument(readId(requestParams));
        respond(true, {
          preview: await readTaskfoldProjectDocument({ document, access }),
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: READ_SCOPE },
  );
  api.registerGatewayMethod(
    "taskfold.projects.documents.write",
    async (request) => {
      const { params: requestParams, respond } = request;
      try {
        const access = await resolveProjectWorkspaceWriteAccess(request);
        const document = await store.getProjectDocument(readId(requestParams));
        if (document.type === "markdown") {
          const preview = await readTaskfoldProjectDocument({ document, access });
          if (
            typeof requestParams.expectedRevision !== "string" ||
            requestParams.expectedRevision !== preview.revision
          ) {
            throw new Error("project document changed; reload it before saving.");
          }
          const updated = await store.updateProjectDocument(document.id, {
            content: requestParams.content,
          });
          respond(true, {
            preview: await readTaskfoldProjectDocument({ document: updated, access }),
          });
          return;
        }
        respond(true, {
          preview: await writeTaskfoldProjectDocumentPath({
            document,
            content: requestParams.content,
            expectedRevision: requestParams.expectedRevision,
            access,
          }),
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );
  api.registerGatewayMethod(
    "taskfold.projects.documents.create",
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
    "taskfold.projects.documents.update",
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
    "taskfold.projects.documents.reorder",
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
    "taskfold.projects.documents.hide",
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
    "taskfold.projects.documents.restore",
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
    "taskfold.projects.documents.delete",
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
    "taskfold.cards.sources.create",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, {
          card: redactCard(await store.addSourceReference(readId(requestParams), requestParams)),
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );
  api.registerGatewayMethod(
    "taskfold.cards.sources.update",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, {
          card: redactCard(await store.updateSourceReference(readId(requestParams), requestParams)),
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );
  api.registerGatewayMethod(
    "taskfold.cards.sources.delete",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, {
          card: redactCard(await store.deleteSourceReference(readId(requestParams), requestParams)),
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );
  api.registerGatewayMethod(
    "taskfold.cards.sources.reorder",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, {
          card: redactCard(await store.reorderSourceReferences(readId(requestParams), requestParams)),
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );

  api.registerGatewayMethod(
    "taskfold.cards.moveMilestone",
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
    "taskfold.cards.moveProject",
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
