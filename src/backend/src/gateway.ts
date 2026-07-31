// Taskfold plugin module implements gateway behavior.
import type { OpenClawPluginApi } from "../api.js";
import { resolveDefaultAgentId } from "openclaw/plugin-sdk/agent-runtime";
import { redactClaimToken } from "./card-redaction.js";
import {
  abortTaskfoldCardExecution,
  inspectTaskfoldCardExecution,
  prepareTaskfoldCardExecution,
  reconcileTaskfoldCardExecution,
  startTaskfoldCardExecution,
  steerTaskfoldCardExecution,
  type TaskfoldCardExecutionOptions,
} from "./card-execution.js";
import {
  assertNoCursorAdvance,
  createTaskfoldDispatchHandler,
  listTaskfoldCards,
  readId,
  respondError,
  resolveGatewayTaskfoldWorkspaceAccess,
  type GatewayMethodContext,
} from "./gateway-helpers.js";
import {
  registerTaskfoldWorkspaceBoardMethod,
  registerTaskfoldWorkspaceBulkMethod,
  registerTaskfoldWorkspaceCardMethods,
  registerTaskfoldWorkspaceWorkflowMethods,
} from "./gateway-workspace-methods.js";
import { registerTaskfoldProjectGatewayMethods } from "./gateway-project-methods.js";
import { TaskfoldStore } from "./store.js";
import { resolveAgentTaskfoldWorkspaceRuntime } from "./workspace-access.js";

const READ_SCOPE = "operator.read" as const;
const WRITE_SCOPE = "operator.write" as const;
const CHANGE_WAIT_MAX_MS = 30_000;
const CHANGE_WAIT_DEFAULT_MS = 25_000;

function readChangeCursor(value: unknown): { epoch: string; revision: number } | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const epoch = (value as { epoch?: unknown }).epoch;
  const revision = (value as { revision?: unknown }).revision;
  if (
    typeof epoch !== "string" ||
    !epoch ||
    epoch.length > 128 ||
    typeof revision !== "number" ||
    !Number.isSafeInteger(revision) ||
    revision <= 0
  ) {
    throw new Error("after must be a valid taskfold change cursor.");
  }
  return { epoch, revision };
}

function readChangeWaitTimeout(value: unknown): number {
  if (value === undefined) {
    return CHANGE_WAIT_DEFAULT_MS;
  }
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 1 ||
    value > CHANGE_WAIT_MAX_MS
  ) {
    throw new Error(`timeoutMs must be an integer from 1 to ${CHANGE_WAIT_MAX_MS}.`);
  }
  return value;
}

function redactDiagnosticsRows(result: Awaited<ReturnType<TaskfoldStore["diagnostics"]>>) {
  return {
    ...result,
    diagnostics: result.diagnostics.map((row) => ({
      ...row,
      card: redactClaimToken(row.card),
    })),
  };
}

export function registerTaskfoldGatewayMethods(params: {
  api: OpenClawPluginApi;
  store?: TaskfoldStore;
}) {
  const { api } = params;
  const store = params.store ?? TaskfoldStore.openSqlite();
  const dispatchCards = createTaskfoldDispatchHandler({
    api,
    store,
    redactCard: redactClaimToken,
  });
  const sandbox = (api.runtime as unknown as {
    sandbox?: {
      prepareWorkspaceAuthority?: Parameters<
        typeof resolveAgentTaskfoldWorkspaceRuntime
      >[0]["prepareSandboxWorkspaceAuthority"];
    };
  }).sandbox;
  const executionOptions = (request: GatewayMethodContext): TaskfoldCardExecutionOptions => {
    const config = request.context.getRuntimeConfig();
    return {
      runtime: api.runtime,
      workspaceAccess: resolveGatewayTaskfoldWorkspaceAccess({
        context: request.context,
        client: request.client,
      }),
      defaultAgentId: resolveDefaultAgentId(config),
      resolveAgentWorkspaceRuntime: (
        agentId,
        sessionKey,
        workspaceDir,
        modelProvider,
        modelId,
      ) =>
        resolveAgentTaskfoldWorkspaceRuntime({
          config,
          agentId,
          sessionKey,
          workspaceDir,
          modelProvider,
          modelId,
          prepareSandboxWorkspaceAuthority: sandbox?.prepareWorkspaceAuthority,
        }),
    };
  };

  api.registerGatewayMethod(
    "taskfold.cards.list",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, await listTaskfoldCards(store, requestParams.boardId, redactClaimToken));
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: READ_SCOPE },
  );

  api.registerGatewayMethod(
    "taskfold.cards.execution.prepare",
    async (request) => {
      try {
        request.respond(
          true,
          await prepareTaskfoldCardExecution({
            store,
            id: request.params.id,
            options: executionOptions(request),
          }),
        );
      } catch (error) {
        respondError(request.respond, error);
      }
    },
    { scope: READ_SCOPE },
  );

  api.registerGatewayMethod(
    "taskfold.cards.execution.inspect",
    async (request) => {
      try {
        const result = await inspectTaskfoldCardExecution({
          store,
          id: request.params.id,
          runtime: api.runtime,
        });
        request.respond(true, { ...result, card: redactClaimToken(result.card) });
      } catch (error) {
        respondError(request.respond, error);
      }
    },
    { scope: READ_SCOPE },
  );

  api.registerGatewayMethod(
    "taskfold.cards.execution.start",
    async (request) => {
      try {
        const result = await startTaskfoldCardExecution({
          store,
          id: request.params.id,
          expectedRevision: request.params.expectedRevision,
          options: executionOptions(request),
        });
        request.respond(true, { ...result, card: redactClaimToken(result.card) });
      } catch (error) {
        respondError(request.respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );

  api.registerGatewayMethod(
    "taskfold.cards.execution.steer",
    async (request) => {
      try {
        const result = await steerTaskfoldCardExecution({
          store,
          id: request.params.id,
          nextRunId: request.params.nextRunId,
        });
        request.respond(true, { ...result, card: redactClaimToken(result.card) });
      } catch (error) {
        respondError(request.respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );

  api.registerGatewayMethod(
    "taskfold.cards.execution.abort",
    async (request) => {
      try {
        const result = await abortTaskfoldCardExecution({
          store,
          id: request.params.id,
          reason: request.params.reason,
          expectedRunId: request.params.expectedRunId,
        });
        request.respond(true, { ...result, card: redactClaimToken(result.card) });
      } catch (error) {
        respondError(request.respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );

  api.registerGatewayMethod(
    "taskfold.cards.execution.reconcile",
    async (request) => {
      try {
        const result = await reconcileTaskfoldCardExecution({
          store,
          id: request.params.id,
          expectedRunId: request.params.expectedRunId,
          outcome: request.params.outcome,
          endedAt: request.params.endedAt,
          reason: request.params.reason,
        });
        request.respond(true, { ...result, card: redactClaimToken(result.card) });
      } catch (error) {
        respondError(request.respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );

  api.registerGatewayMethod(
    "taskfold.changes.wait",
    async ({ params: requestParams, respond }) => {
      try {
        respond(
          true,
          await store.waitForChange(
            readChangeCursor(requestParams.after),
            readChangeWaitTimeout(requestParams.timeoutMs),
          ),
        );
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: READ_SCOPE },
  );

  registerTaskfoldWorkspaceCardMethods({ api, store, redactCard: redactClaimToken });
  registerTaskfoldProjectGatewayMethods({ api, store, redactCard: redactClaimToken });

  api.registerGatewayMethod(
    "taskfold.cards.move",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, {
          card: redactClaimToken(
            await store.move(readId(requestParams), requestParams.status, requestParams.position),
          ),
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );

  api.registerGatewayMethod(
    "taskfold.cards.delete",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, await store.delete(readId(requestParams)));
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );

  api.registerGatewayMethod(
    "taskfold.cards.comment",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, {
          card: redactClaimToken(await store.addComment(readId(requestParams), requestParams)),
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );

  api.registerGatewayMethod(
    "taskfold.cards.link",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, {
          card: redactClaimToken(await store.addLink(readId(requestParams), requestParams)),
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );

  api.registerGatewayMethod(
    "taskfold.cards.linkDependency",
    async ({ params: requestParams, respond }) => {
      try {
        const parentId = requestParams.parentId;
        const childId = requestParams.childId;
        if (typeof parentId !== "string" || typeof childId !== "string") {
          throw new Error("parentId and childId are required.");
        }
        respond(true, {
          card: redactClaimToken(await store.linkCards(parentId, childId)),
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );

  api.registerGatewayMethod(
    "taskfold.cards.requirement.set",
    async ({ params: requestParams, respond }) => {
      try {
        const rawRequirementId = requestParams.requirementId;
        if (
          rawRequirementId !== undefined &&
          rawRequirementId !== null &&
          typeof rawRequirementId !== "string"
        ) {
          throw new Error("requirementId must be a card id or empty.");
        }
        const requirementId =
          typeof rawRequirementId === "string" && rawRequirementId.trim()
            ? rawRequirementId.trim()
            : undefined;
        respond(true, {
          card: redactClaimToken(await store.setCardRequirement(readId(requestParams), requirementId)),
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );

  api.registerGatewayMethod(
    "taskfold.cards.proof",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, {
          card: redactClaimToken(await store.addProof(readId(requestParams), requestParams)),
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );

  api.registerGatewayMethod(
    "taskfold.cards.artifact",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, {
          card: redactClaimToken(await store.addArtifact(readId(requestParams), requestParams)),
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );

  api.registerGatewayMethod(
    "taskfold.cards.proof.delete",
    async ({ params: requestParams, respond }) => {
      try {
        const proofId = requestParams.proofId;
        if (typeof proofId !== "string" || !proofId.trim()) {
          throw new Error("proofId is required.");
        }
        respond(true, {
          card: redactClaimToken(await store.deleteProof(readId(requestParams), proofId.trim())),
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );

  api.registerGatewayMethod(
    "taskfold.cards.artifact.delete",
    async ({ params: requestParams, respond }) => {
      try {
        const artifactId = requestParams.artifactId;
        if (typeof artifactId !== "string" || !artifactId.trim()) {
          throw new Error("artifactId is required.");
        }
        respond(true, {
          card: redactClaimToken(await store.deleteArtifact(readId(requestParams), artifactId.trim())),
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );

  api.registerGatewayMethod(
    "taskfold.cards.claim",
    async ({ params: requestParams, respond }) => {
      try {
        const claimed = await store.claim(readId(requestParams), requestParams);
        respond(true, { ...claimed, card: redactClaimToken(claimed.card) });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );

  api.registerGatewayMethod(
    "taskfold.cards.heartbeat",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, {
          card: redactClaimToken(await store.heartbeat(readId(requestParams), requestParams)),
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );

  api.registerGatewayMethod(
    "taskfold.cards.release",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, {
          card: redactClaimToken(await store.releaseClaim(readId(requestParams), requestParams)),
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );

  api.registerGatewayMethod(
    "taskfold.cards.promote",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, {
          card: redactClaimToken(await store.promote(readId(requestParams), requestParams, null)),
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );

  api.registerGatewayMethod(
    "taskfold.cards.reassign",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, {
          card: redactClaimToken(await store.reassign(readId(requestParams), requestParams, null)),
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );

  api.registerGatewayMethod(
    "taskfold.cards.reclaim",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, {
          card: redactClaimToken(await store.reclaim(readId(requestParams), requestParams, null)),
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );

  api.registerGatewayMethod(
    "taskfold.cards.complete",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, {
          card: redactClaimToken(await store.complete(readId(requestParams), requestParams, null)),
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );

  api.registerGatewayMethod(
    "taskfold.cards.block",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, {
          card: redactClaimToken(await store.block(readId(requestParams), requestParams, null)),
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );

  api.registerGatewayMethod(
    "taskfold.cards.unblock",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, {
          card: redactClaimToken(await store.unblock(readId(requestParams))),
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );

  registerTaskfoldWorkspaceBulkMethod({ api, store, redactCard: redactClaimToken });

  api.registerGatewayMethod(
    "taskfold.cards.diagnostics",
    async ({ respond }) => {
      try {
        respond(true, redactDiagnosticsRows(await store.diagnostics()));
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: READ_SCOPE },
  );

  api.registerGatewayMethod(
    "taskfold.cards.diagnostics.refresh",
    async ({ respond }) => {
      try {
        respond(true, redactDiagnosticsRows(await store.refreshDiagnostics()));
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );

  api.registerGatewayMethod(
    "taskfold.cards.dispatch",
    async (context) => await dispatchCards(context, { supportsMaxStarts: false }),
    { scope: WRITE_SCOPE },
  );

  api.registerGatewayMethod(
    "taskfold.cards.dispatchWithOptions",
    async (context) => await dispatchCards(context, { supportsMaxStarts: true }),
    { scope: WRITE_SCOPE },
  );

  api.registerGatewayMethod(
    "taskfold.boards.list",
    async ({ respond }) => {
      try {
        respond(true, await store.listBoards());
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: READ_SCOPE },
  );

  registerTaskfoldWorkspaceBoardMethod({ api, store, redactCard: redactClaimToken });

  api.registerGatewayMethod(
    "taskfold.boards.archive",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, {
          board: await store.archiveBoard(requestParams.id, requestParams.archived),
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );

  api.registerGatewayMethod(
    "taskfold.boards.delete",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, await store.deleteBoard(requestParams.id));
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );

  api.registerGatewayMethod(
    "taskfold.cards.stats",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, await store.stats({ boardId: requestParams.boardId }));
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: READ_SCOPE },
  );

  api.registerGatewayMethod(
    "taskfold.cards.runs",
    async ({ params: requestParams, respond }) => {
      try {
        const result = await store.runs(readId(requestParams));
        respond(true, { ...result, card: redactClaimToken(result.card) });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: READ_SCOPE },
  );

  registerTaskfoldWorkspaceWorkflowMethods({ api, store, redactCard: redactClaimToken });

  api.registerGatewayMethod(
    "taskfold.notifications.subscribe",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, { subscription: await store.subscribeNotifications(requestParams) });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );

  api.registerGatewayMethod(
    "taskfold.notifications.list",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, await store.listNotificationSubscriptions(requestParams));
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: READ_SCOPE },
  );

  api.registerGatewayMethod(
    "taskfold.notifications.delete",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, await store.deleteNotificationSubscription(readId(requestParams)));
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );

  api.registerGatewayMethod(
    "taskfold.notifications.events",
    async ({ params: requestParams, respond }) => {
      try {
        assertNoCursorAdvance(requestParams);
        respond(true, await store.notificationEvents(requestParams));
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: READ_SCOPE },
  );

  api.registerGatewayMethod(
    "taskfold.notifications.advance",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, await store.advanceNotificationEvents(requestParams));
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );

  api.registerGatewayMethod(
    "taskfold.cards.attachments.list",
    async ({ params: requestParams, respond }) => {
      try {
        const result = await store.listAttachments(readId(requestParams));
        respond(true, { ...result, card: redactClaimToken(result.card) });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: READ_SCOPE },
  );

  api.registerGatewayMethod(
    "taskfold.cards.attachments.get",
    async ({ params: requestParams, respond }) => {
      try {
        const attachment = await store.getAttachment(readId(requestParams));
        if (!attachment) {
          throw new Error(`attachment not found: ${readId(requestParams)}`);
        }
        respond(true, attachment);
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: READ_SCOPE },
  );

  api.registerGatewayMethod(
    "taskfold.cards.attachments.add",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, {
          card: redactClaimToken(await store.addAttachment(readId(requestParams), requestParams)),
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );

  api.registerGatewayMethod(
    "taskfold.cards.attachments.delete",
    async ({ params: requestParams, respond }) => {
      try {
        const attachmentId = requestParams.attachmentId;
        if (typeof attachmentId !== "string" || !attachmentId.trim()) {
          throw new Error("attachmentId is required.");
        }
        respond(true, {
          card: redactClaimToken(
            await store.deleteAttachment(readId(requestParams), attachmentId.trim()),
          ),
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );

  api.registerGatewayMethod(
    "taskfold.cards.workerLog",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, {
          card: redactClaimToken(await store.addWorkerLog(readId(requestParams), requestParams)),
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );

  api.registerGatewayMethod(
    "taskfold.cards.protocolViolation",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, {
          card: redactClaimToken(
            await store.recordProtocolViolation(readId(requestParams), requestParams),
          ),
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );

  api.registerGatewayMethod(
    "taskfold.cards.archive",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, {
          card: redactClaimToken(
            await store.archive(readId(requestParams), requestParams.archived),
          ),
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE },
  );

  api.registerGatewayMethod(
    "taskfold.cards.export",
    async ({ respond }) => {
      try {
        const exported = await store.exportCards();
        respond(true, { ...exported, cards: exported.cards.map(redactClaimToken) });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: READ_SCOPE },
  );
}
