import { TASKFOLD_STATUSES, type TaskfoldCard } from "../../contract/index.js";
// Taskfold plugin module implements shared gateway request helpers.
import { formatErrorMessage } from "openclaw/plugin-sdk/error-runtime";
import { parseStrictPositiveInteger } from "openclaw/plugin-sdk/number-runtime";
import type { OpenClawPluginApi } from "../api.js";
import { dispatchAndStartTaskfoldCards } from "./dispatcher.js";
import type { TaskfoldStore } from "./store.js";
import {
  resolveAgentTaskfoldWorkspaceRuntime,
  resolveConfiguredTaskfoldWorkspaceAccess,
  resolveTaskfoldAgentWorkspace,
  type TaskfoldWorkspaceAccess,
} from "./workspace-access.js";

export type GatewayMethodContext = Parameters<
  Parameters<OpenClawPluginApi["registerGatewayMethod"]>[1]
>[0];
type GatewayRespond = GatewayMethodContext["respond"];

export function respondError(respond: GatewayRespond, error: unknown) {
  respond(false, undefined, {
    code: "taskfold_error",
    message: formatErrorMessage(error),
  });
}

export function readId(params: Record<string, unknown>): string {
  const value = params.id;
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  throw new Error("id is required.");
}

function readOptionalPositiveInteger(value: unknown, fieldName: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const parsed = parseStrictPositiveInteger(value);
  if (typeof value !== "number" || parsed === undefined) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }
  return parsed;
}

export function readPatch(params: Record<string, unknown>): Record<string, unknown> {
  const patch = params.patch;
  if (patch && typeof patch === "object" && !Array.isArray(patch)) {
    return patch as Record<string, unknown>;
  }
  return params;
}

export function assertNoCursorAdvance(params: Record<string, unknown>) {
  if (params.advance === true) {
    throw new Error("notification cursor advancement requires taskfold.notifications.advance.");
  }
}

export async function listTaskfoldCards(
  store: TaskfoldStore,
  boardId: unknown,
  redactCard: (card: TaskfoldCard) => TaskfoldCard,
) {
  const [cards, { boards }] = await Promise.all([store.list({ boardId }), store.listBoards()]);
  return { cards: cards.map(redactCard), boards, statuses: TASKFOLD_STATUSES };
}

export function resolveGatewayTaskfoldWorkspaceAccess(params: {
  context: GatewayMethodContext["context"];
  client: GatewayMethodContext["client"];
}): TaskfoldWorkspaceAccess {
  // In-process plugin dispatch has no remote client and already runs with host
  // authority. Connected write-scope clients stay within configured workspaces.
  if (!params.client) {
    return { unrestricted: true };
  }
  const scopes = Array.isArray(params.client?.connect?.scopes) ? params.client.connect.scopes : [];
  if (scopes.includes("operator.admin")) {
    return { unrestricted: true };
  }
  return resolveConfiguredTaskfoldWorkspaceAccess({
    config: params.context.getRuntimeConfig(),
    unrestricted: false,
  });
}

export function createTaskfoldDispatchHandler(params: {
  api: OpenClawPluginApi;
  store: TaskfoldStore;
  redactCard: (card: TaskfoldCard) => TaskfoldCard;
}) {
  const sandbox = (params.api.runtime as unknown as {
    sandbox?: {
      prepareWorkspaceAuthority?: Parameters<
        typeof resolveAgentTaskfoldWorkspaceRuntime
      >[0]["prepareSandboxWorkspaceAuthority"];
    };
  }).sandbox;
  return async (
    { params: requestParams, respond, client, context }: GatewayMethodContext,
    options: { supportsMaxStarts: boolean },
  ) => {
    try {
      const boardId =
        requestParams && typeof requestParams === "object" && "boardId" in requestParams
          ? requestParams.boardId
          : undefined;
      const rawMaxStarts =
        requestParams && typeof requestParams === "object" && "maxStarts" in requestParams
          ? requestParams.maxStarts
          : undefined;
      if (!options.supportsMaxStarts && rawMaxStarts !== undefined) {
        throw new Error("maxStarts requires taskfold.cards.dispatchWithOptions.");
      }
      const maxStarts = options.supportsMaxStarts
        ? readOptionalPositiveInteger(rawMaxStarts, "maxStarts")
        : undefined;
      const workspaceAccess = resolveGatewayTaskfoldWorkspaceAccess({ context, client });
      const result = await dispatchAndStartTaskfoldCards({
        store: params.store,
        subagent: params.api.runtime.subagent,
        worktrees: params.api.runtime.worktrees,
        options: {
          boardId: typeof boardId === "string" ? boardId : undefined,
          ...(maxStarts !== undefined ? { maxStarts } : {}),
          materializeWorktree: true,
          resolveAgentWorkspace: (agentId) =>
            resolveTaskfoldAgentWorkspace(context.getRuntimeConfig(), agentId),
          resolveAgentWorkspaceRuntime: (
            agentId,
            sessionKey,
            workspaceDir,
            modelProvider,
            modelId,
          ) => {
            const config = context.getRuntimeConfig();
            return resolveAgentTaskfoldWorkspaceRuntime({
              config,
              agentId,
              sessionKey,
              workspaceDir,
              modelProvider,
              modelId,
              prepareSandboxWorkspaceAuthority: sandbox?.prepareWorkspaceAuthority,
            });
          },
          workspaceAccess,
        },
      });
      respond(true, {
        ...result,
        promoted: result.promoted.map(params.redactCard),
        reclaimed: result.reclaimed.map(params.redactCard),
        blocked: result.blocked.map(params.redactCard),
        orchestrated: result.orchestrated.map(params.redactCard),
      });
    } catch (error) {
      respondError(respond, error);
    }
  };
}
