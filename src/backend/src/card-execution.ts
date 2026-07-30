import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { FlowboardCard, FlowboardWorkspace } from "../../contract/index.js";
import { formatErrorMessage } from "openclaw/plugin-sdk/error-runtime";
import type { PluginRuntime } from "openclaw/plugin-sdk/plugin-runtime";
import { canonicalPathFromExistingAncestor } from "openclaw/plugin-sdk/security-runtime";
import {
  assertRestrictedFlowboardTarget,
  managedWorktreeName,
  type ResolveAgentWorkspaceRuntime,
} from "./dispatcher-workspace.js";
import {
  buildExecution,
  buildSessionKey,
  createManagedFlowboardWorktree,
} from "./dispatcher.js";
import { buildWorkerPrompt } from "./worker-prompt.js";
import { cardBoardId } from "./store-card-helpers.js";
import { FlowboardStore } from "./store.js";
import {
  assertFlowboardWorkspaceSourceAccess,
  canonicalizeFlowboardWorkspaceAccess,
  intersectFlowboardWorkspaceAccess,
  type FlowboardWorkspaceAccess,
} from "./workspace-access.js";

const execFileAsync = promisify(execFile);
const PREVIEW_LIMIT = 6;
const PREVIEW_MAX_CHARS = 600;
const CLAIM_TOKEN_PLACEHOLDER = "[generated after confirmation]";

type FlowboardExecutionRuntime = Pick<PluginRuntime, "agent" | "subagent" | "worktrees">;

export type FlowboardCardExecutionOptions = {
  runtime: FlowboardExecutionRuntime;
  workspaceAccess: FlowboardWorkspaceAccess;
  defaultAgentId: string;
  resolveAgentWorkspaceRuntime?: ResolveAgentWorkspaceRuntime;
};

type ExecutionSource = {
  sourceCheckout: string;
  baseBranch?: string;
  sourceWorkspace: FlowboardWorkspace;
  workspaceAccess: FlowboardWorkspaceAccess;
};

type GitCheckout = {
  root: string;
  branch?: string;
};

function readOptionalString(value: unknown, maxLength = 4_000): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? normalized : undefined;
}

function activeExecution(card: FlowboardCard): boolean {
  return (
    card.execution?.status === "running" ||
    Boolean(card.metadata?.attempts?.some((attempt) => attempt.status === "running"))
  );
}

async function gitCheckout(path: string): Promise<GitCheckout> {
  try {
    const { stdout } = await execFileAsync("git", ["-C", path, "rev-parse", "--show-toplevel"], {
      encoding: "utf8",
      maxBuffer: 16 * 1024,
    });
    const root = stdout.trim();
    if (!root) {
      throw new Error("git did not return a repository root");
    }
    const canonicalRoot = await canonicalPathFromExistingAncestor(root);
    const branchResult = await execFileAsync(
      "git",
      ["-C", canonicalRoot, "symbolic-ref", "--quiet", "--short", "HEAD"],
      { encoding: "utf8", maxBuffer: 16 * 1024 },
    ).catch(() => ({ stdout: "" }));
    const branch = branchResult.stdout.trim();
    return { root: canonicalRoot, ...(branch ? { branch } : {}) };
  } catch (error) {
    throw new Error(
      `execution requires a local Git checkout: ${formatErrorMessage(error)}`,
      { cause: error },
    );
  }
}

async function resolveWorkspaceAccess(
  card: FlowboardCard,
  currentAccess: FlowboardWorkspaceAccess,
): Promise<FlowboardWorkspaceAccess> {
  const callerAccess = await canonicalizeFlowboardWorkspaceAccess(currentAccess);
  const persisted = card.metadata?.automation?.workspaceAccess;
  const workspaceAccess = persisted
    ? intersectFlowboardWorkspaceAccess(
        await canonicalizeFlowboardWorkspaceAccess(persisted),
        callerAccess,
      )
    : callerAccess;
  if (!workspaceAccess.unrestricted && !workspaceAccess.writable) {
    throw new Error("card workspace access is read-only; execution requires write access.");
  }
  return workspaceAccess;
}

async function resolveExecutionSource(
  store: FlowboardStore,
  card: FlowboardCard,
  currentAccess: FlowboardWorkspaceAccess,
): Promise<ExecutionSource> {
  const workspaceAccess = await resolveWorkspaceAccess(card, currentAccess);
  const cardWorkspace = card.metadata?.automation?.workspace;
  if (cardWorkspace?.kind === "scratch") {
    throw new Error("card workspace is scratch; select a local Git checkout before execution.");
  }
  const { boards } = await store.listBoards();
  const sourceWorkspace =
    cardWorkspace ?? boards.find((board) => board.id === cardBoardId(card))?.defaultWorkspace;
  if (!sourceWorkspace || sourceWorkspace.kind === "scratch") {
    throw new Error("card has no local Git checkout; set a card or project workspace first.");
  }
  const sourcePath = await assertFlowboardWorkspaceSourceAccess(sourceWorkspace, workspaceAccess);
  if (!sourcePath) {
    throw new Error("card workspace path is required.");
  }
  const checkout = await gitCheckout(sourcePath);
  const checkedRoot = await assertFlowboardWorkspaceSourceAccess(
    { kind: "dir", path: checkout.root },
    workspaceAccess,
  );
  if (!checkedRoot) {
    throw new Error("Git checkout root is unavailable.");
  }
  return {
    sourceCheckout: checkedRoot,
    ...(sourceWorkspace.sourceBranch || checkout.branch
      ? { baseBranch: sourceWorkspace.sourceBranch ?? checkout.branch }
      : {}),
    sourceWorkspace,
    workspaceAccess,
  };
}

async function ensureTargetCanRun(params: {
  card: FlowboardCard;
  source: ExecutionSource;
  options: FlowboardCardExecutionOptions;
  sessionKey: string;
}): Promise<void> {
  if (params.source.workspaceAccess.unrestricted) {
    return;
  }
  await assertRestrictedFlowboardTarget({
    root: params.source.sourceCheckout,
    agentId: params.card.agentId ?? params.options.defaultAgentId,
    sessionKey: params.sessionKey,
    modelProvider: params.options.runtime.agent.defaults.provider,
    modelId: params.options.runtime.agent.defaults.model,
    resolveAgentWorkspaceRuntime: params.options.resolveAgentWorkspaceRuntime,
  });
}

function promptPreview(params: {
  card: FlowboardCard;
  context: string;
  ownerId: string;
}): string {
  return buildWorkerPrompt({
    card: params.card,
    context: params.context,
    ownerId: params.ownerId,
    token: CLAIM_TOKEN_PLACEHOLDER,
  });
}

function redactExecutionText(value: string, token?: string): string {
  let next = value;
  if (token) {
    next = next.replaceAll(token, "[redacted]");
  }
  return next.replace(/Claim token:\s*\S+/giu, "Claim token: [redacted]");
}

function redactExecutionPayload(value: unknown, token?: string): unknown {
  if (typeof value === "string") {
    return redactExecutionText(value, token);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => redactExecutionPayload(entry, token));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        redactExecutionPayload(entry, token),
      ]),
    );
  }
  return value;
}

function boundExecutionPreview(value: unknown, depth = 0): unknown {
  if (typeof value === "string") {
    return value.length <= PREVIEW_MAX_CHARS
      ? value
      : `${value.slice(0, PREVIEW_MAX_CHARS)}...`;
  }
  if (Array.isArray(value)) {
    return value.slice(-PREVIEW_LIMIT).map((entry) => boundExecutionPreview(entry, depth + 1));
  }
  if (value && typeof value === "object") {
    if (depth >= 4) {
      return "[truncated]";
    }
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 24)
        .map(([key, entry]) => [key, boundExecutionPreview(entry, depth + 1)]),
    );
  }
  return value;
}

async function resolveCard(store: FlowboardStore, id: unknown): Promise<FlowboardCard> {
  const cardId = readOptionalString(id, 200);
  if (!cardId) {
    throw new Error("id is required.");
  }
  const card = await store.get(cardId);
  if (!card) {
    throw new Error(`card not found: ${cardId}`);
  }
  return card;
}

export async function prepareFlowboardCardExecution(params: {
  store: FlowboardStore;
  id: unknown;
  options: FlowboardCardExecutionOptions;
}) {
  const card = await resolveCard(params.store, params.id);
  if (card.metadata?.archivedAt) {
    throw new Error("card is archived.");
  }
  if (await params.store.isProjectArchived(cardBoardId(card))) {
    throw new Error("project is archived and cannot start new work.");
  }
  const sessionKey = buildSessionKey(card);
  const source = await resolveExecutionSource(params.store, card, params.options.workspaceAccess);
  await ensureTargetCanRun({ card, source, options: params.options, sessionKey });
  const ownerId = card.agentId ?? params.options.defaultAgentId;
  const context = await params.store.buildWorkerContext(card.id);
  return {
    cardId: card.id,
    expectedRevision: card.revision,
    active: activeExecution(card),
    agentId: ownerId,
    defaultProvider: params.options.runtime.agent.defaults.provider,
    defaultModel: params.options.runtime.agent.defaults.model,
    sourceCheckout: source.sourceCheckout,
    ...(source.baseBranch ? { baseBranch: source.baseBranch } : {}),
    worktreeName: managedWorktreeName(card.id),
    promptPreview: promptPreview({ card, context, ownerId }),
    execution: card.execution ?? null,
  };
}

export async function startFlowboardCardExecution(params: {
  store: FlowboardStore;
  id: unknown;
  expectedRevision: unknown;
  options: FlowboardCardExecutionOptions;
}) {
  const card = await resolveCard(params.store, params.id);
  {
    const latest = await resolveCard(params.store, card.id);
    const sessionKey = buildSessionKey(latest);
    const source = await resolveExecutionSource(
      params.store,
      latest,
      params.options.workspaceAccess,
    );
    await ensureTargetCanRun({ card: latest, source, options: params.options, sessionKey });
    const ownerId = latest.agentId ?? params.options.defaultAgentId;
    // The claim below is a database-level compare-and-swap, so it is itself the
    // mutual exclusion for concurrent starts — including starts issued by another
    // Gateway process, which an in-process lock could never have covered.
    const expectedRevision =
      typeof params.expectedRevision === "number" ? params.expectedRevision : latest.revision;
    let claimToken: string | undefined;
    let materializedWorkspace: FlowboardWorkspace | undefined;
    let runStarted = false;
    const previousWorkspace = latest.metadata?.automation?.workspace;
    try {
      const claimed = await params.store.claimExecution(latest.id, {
        ownerId,
        expectedRevision,
        ttlSeconds: latest.metadata?.automation?.maxRuntimeSeconds,
      });
      claimToken = claimed.token;
      const worktree = await createManagedFlowboardWorktree({
        worktrees: params.options.runtime.worktrees,
        repoRoot: source.sourceCheckout,
        name: managedWorktreeName(latest.id),
        ...(source.baseBranch ? { baseRef: source.baseBranch } : {}),
        ownerId: latest.id,
      });
      let worktreePath: string;
      try {
        worktreePath = await canonicalPathFromExistingAncestor(worktree.path);
      } catch (error) {
        const removed = await params.options.runtime.worktrees
          .removeIfLossless({ path: worktree.path })
          .catch(() => false);
        if (!removed) {
          throw new Error(`${formatErrorMessage(error)}; managed worktree cleanup failed`, {
            cause: error,
          });
        }
        throw error;
      }
      materializedWorkspace = {
        kind: "worktree",
        path: worktreePath,
        branch: worktree.branch,
        sourcePath: source.sourceCheckout,
        ...(source.baseBranch ? { sourceBranch: source.baseBranch } : {}),
      };
      await params.store.update(latest.id, {
        workspace: materializedWorkspace,
        workspaceAccess: source.workspaceAccess,
      });
      await ensureTargetCanRun({
        card: await resolveCard(params.store, latest.id),
        source: { ...source, sourceCheckout: worktreePath },
        options: params.options,
        sessionKey,
      });
      const current = await resolveCard(params.store, latest.id);
      const context = await params.store.buildWorkerContext(current.id);
      const run = await params.options.runtime.subagent.run({
        sessionKey,
        message: buildWorkerPrompt({
          card: current,
          context,
          ownerId,
          token: claimToken,
        }),
        lane: `flowboard:${cardBoardId(current)}:${current.id}`,
        // The claim token is minted fresh per winning claim, so it identifies
        // exactly this start attempt. A timestamp could collide inside one
        // millisecond and changed on writes unrelated to starting a run.
        idempotencyKey: `flowboard:execution:${current.id}:${claimed.token}`,
        lightContext: true,
        deliver: false,
        cwd: worktreePath,
      });
      runStarted = true;
      const now = Date.now();
      const updated = await params.store.update(current.id, {
        sessionKey,
        runId: run.runId,
        execution: buildExecution({
          card: current,
          sessionKey,
          runId: run.runId,
          now,
        }),
        workspace: materializedWorkspace,
        workspaceAccess: source.workspaceAccess,
      });
      await params.store
        .addWorkerLog(
          updated.id,
          {
            level: "info",
            message: `Card execution started subagent run ${run.runId}.`,
            sessionKey,
            runId: run.runId,
          },
          { ownerId, token: claimToken },
        )
        .catch(() => undefined);
      return {
        card: updated,
        sessionKey,
        runId: run.runId,
        worktreePath,
        branch: worktree.branch,
      };
    } catch (error) {
      if (!runStarted && materializedWorkspace?.path) {
        await params.options.runtime.worktrees
          .removeIfLossless({ path: materializedWorkspace.path })
          .catch(() => false);
        await params.store
          .update(latest.id, { workspace: previousWorkspace ?? source.sourceWorkspace })
          .catch(() => undefined);
      }
      if (claimToken && !runStarted) {
        await params.store
          .releaseClaim(latest.id, { ownerId, token: claimToken })
          .catch(() => undefined);
      }
      throw error;
    }
  }
}

export async function inspectFlowboardCardExecution(params: {
  store: FlowboardStore;
  id: unknown;
  runtime: Pick<PluginRuntime, "subagent">;
}) {
  const card = await resolveCard(params.store, params.id);
  const sessionKey = card.execution?.sessionKey ?? card.sessionKey;
  const runId = card.execution?.runId ?? card.runId;
  const active = activeExecution(card);
  if (!active || !sessionKey || !runId) {
    return { card, active: false, execution: card.execution ?? null };
  }
  const token = card.metadata?.claim?.token;
  const preview = await params.runtime.subagent
    .getSessionMessages({ sessionKey, limit: PREVIEW_LIMIT })
    .then(({ messages }) => ({ messages }))
    .catch((error) => ({ error: formatErrorMessage(error) }));
  return {
    card,
    active: true,
    execution: card.execution,
    sessionKey,
    runId,
    preview: boundExecutionPreview(redactExecutionPayload(preview, token)),
  };
}

export async function steerFlowboardCardExecution(params: {
  store: FlowboardStore;
  id: unknown;
  nextRunId?: unknown;
}) {
  const card = await resolveCard(params.store, params.id);
  if (!activeExecution(card) || card.execution?.status !== "running") {
    throw new Error("card has no active Flowboard execution.");
  }
  const sessionKey = card.execution.sessionKey ?? card.sessionKey;
  if (!sessionKey) {
    throw new Error("active execution has no session.");
  }
  const nextRunId = readOptionalString(params.nextRunId, 200);
  let updated = card;
  if (nextRunId) {
    updated = await params.store.update(card.id, {
      runId: nextRunId,
      execution: { ...card.execution, runId: nextRunId, updatedAt: Date.now() },
    });
  }
  return { card: updated };
}

export async function abortFlowboardCardExecution(params: {
  store: FlowboardStore;
  id: unknown;
  reason?: unknown;
  expectedRunId?: unknown;
}) {
  const card = await resolveCard(params.store, params.id);
  if (!activeExecution(card) || card.execution?.status !== "running") {
    throw new Error("card has no active Flowboard execution.");
  }
  const expectedRunId = readOptionalString(params.expectedRunId, 200);
  const runId = card.execution.runId ?? card.runId;
  if (expectedRunId && runId && expectedRunId !== runId) {
    throw new Error("card execution changed before it could be stopped.");
  }
  const reason = readOptionalString(params.reason, 1_000) ?? "Flowboard execution stopped by operator.";
  const stopped = await params.store.stopExecution(card.id, {
    ...(runId ? { expectedRunId: runId } : {}),
    reason,
  });
  return {
    card: stopped,
  };
}

function terminalExecutionOutcome(value: unknown): "ok" | "error" | "timeout" | "killed" | "reset" | "deleted" {
  const outcome = readOptionalString(value, 40)?.toLowerCase();
  if (
    outcome === "ok" ||
    outcome === "error" ||
    outcome === "timeout" ||
    outcome === "killed" ||
    outcome === "reset" ||
    outcome === "deleted"
  ) {
    return outcome;
  }
  throw new Error("outcome must be a terminal OpenClaw subagent outcome.");
}

export async function reconcileFlowboardCardExecution(params: {
  store: FlowboardStore;
  id: unknown;
  expectedRunId?: unknown;
  outcome?: unknown;
  endedAt?: unknown;
  reason?: unknown;
}) {
  const card = await resolveCard(params.store, params.id);
  const expectedRunId = readOptionalString(params.expectedRunId, 200);
  const runId = card.execution?.runId ?? card.runId;
  if (!runId) {
    throw new Error("card execution has no run.");
  }
  if (!expectedRunId || expectedRunId !== runId) {
    throw new Error("card execution changed before it could be reconciled.");
  }
  const outcome = terminalExecutionOutcome(params.outcome);
  const reconciled = await params.store.finishExecutionForRun(runId, {
    outcome,
    endedAt: params.endedAt,
    reason: params.reason,
  });
  if (!reconciled) {
    throw new Error("card execution could not be reconciled.");
  }
  return { card: reconciled };
}
