import type { FlowboardCard } from "../../contract/index.js";
// Flowboard Gateway methods that can persist workspace-bearing card metadata.
import type { OpenClawPluginApi } from "../api.js";
import {
  readId,
  readPatch,
  resolveGatewayFlowboardWorkspaceAccess,
  respondError,
  type GatewayMethodContext,
} from "./gateway-helpers.js";
import type { FlowboardStore } from "./store.js";
import {
  assertFlowboardWorkspaceMutationAccess,
  canonicalizeFlowboardWorkspaceAccess,
  containsFlowboardWorkspaceMutation,
  withFlowboardDecomposeWorkspaceAccess,
  withFlowboardWorkspaceAccess,
  withoutFlowboardWorkspaceAccess,
  type FlowboardWorkspaceAccess,
} from "./workspace-access.js";

const WRITE_SCOPE = "operator.write" as const;

async function resolveGatewayWorkspaceMutationAccess(
  request: GatewayMethodContext,
  value: unknown,
): Promise<FlowboardWorkspaceAccess> {
  const access = await canonicalizeFlowboardWorkspaceAccess(
    resolveGatewayFlowboardWorkspaceAccess({
      context: request.context,
      client: request.client,
    }),
  );
  await assertFlowboardWorkspaceMutationAccess(value, access);
  return access;
}

type WorkspaceGatewayMethodParams = {
  api: OpenClawPluginApi;
  store: FlowboardStore;
  redactCard: (card: FlowboardCard) => FlowboardCard;
};

export function registerFlowboardWorkspaceCardMethods(params: WorkspaceGatewayMethodParams): void {
  const { api, store, redactCard } = params;
  api.registerGatewayMethod(
    "flowboard.cards.create",
    async (request) => {
      const { params: requestParams, respond } = request;
      try {
        const input = withoutFlowboardWorkspaceAccess(requestParams);
        const access = await resolveGatewayWorkspaceMutationAccess(request, input);
        respond(true, {
          card: redactCard(await store.create(withFlowboardWorkspaceAccess(input, access))),
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );

  api.registerGatewayMethod(
    "flowboard.cards.update",
    async (request) => {
      const { params: requestParams, respond } = request;
      try {
        const patch = withoutFlowboardWorkspaceAccess(readPatch(requestParams));
        const access = await resolveGatewayWorkspaceMutationAccess(request, patch);
        respond(true, {
          card: redactCard(
            await store.update(
              readId(requestParams),
              containsFlowboardWorkspaceMutation(patch)
                ? withFlowboardWorkspaceAccess(patch, access)
                : patch,
            ),
          ),
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );
}

export function registerFlowboardWorkspaceBulkMethod(params: WorkspaceGatewayMethodParams): void {
  const { api, store, redactCard } = params;
  api.registerGatewayMethod(
    "flowboard.cards.bulk",
    async (request) => {
      const { params: requestParams, respond } = request;
      try {
        const sanitizedParams = withoutFlowboardWorkspaceAccess(requestParams);
        const patch = withoutFlowboardWorkspaceAccess(readPatch(requestParams));
        const access = await resolveGatewayWorkspaceMutationAccess(request, patch);
        const result = await store.bulkUpdate({
          ...sanitizedParams,
          patch: containsFlowboardWorkspaceMutation(patch)
            ? withFlowboardWorkspaceAccess(patch, access)
            : patch,
        });
        respond(true, { cards: result.cards.map(redactCard) });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );
}

export function registerFlowboardWorkspaceBoardMethod(params: WorkspaceGatewayMethodParams): void {
  const { api, store } = params;
  api.registerGatewayMethod(
    "flowboard.boards.upsert",
    async (request) => {
      const { params: requestParams, respond } = request;
      try {
        await resolveGatewayWorkspaceMutationAccess(request, requestParams);
        respond(true, { board: await store.upsertBoard(requestParams) });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );
}

export function registerFlowboardWorkspaceWorkflowMethods(
  params: WorkspaceGatewayMethodParams,
): void {
  const { api, store, redactCard } = params;
  api.registerGatewayMethod(
    "flowboard.cards.specify",
    async (request) => {
      const { params: requestParams, respond } = request;
      try {
        const sanitizedParams = withoutFlowboardWorkspaceAccess(requestParams);
        const access = await resolveGatewayWorkspaceMutationAccess(request, sanitizedParams);
        const input = containsFlowboardWorkspaceMutation(sanitizedParams)
          ? withFlowboardWorkspaceAccess(sanitizedParams, access)
          : sanitizedParams;
        respond(true, {
          card: redactCard(await store.specify(readId(requestParams), input, null)),
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );

  api.registerGatewayMethod(
    "flowboard.cards.decompose",
    async (request) => {
      const { params: requestParams, respond } = request;
      try {
        const sanitizedParams = withoutFlowboardWorkspaceAccess(requestParams);
        const access = await resolveGatewayWorkspaceMutationAccess(request, sanitizedParams);
        const result = await store.decompose(
          readId(requestParams),
          withFlowboardDecomposeWorkspaceAccess(sanitizedParams, access),
          null,
        );
        respond(true, {
          parent: redactCard(result.parent),
          children: result.children.map(redactCard),
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );
}
