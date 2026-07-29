// Flowboard plugin module implements dispatcher behavior.
import path from "node:path";
import type {
  FlowboardCard,
  FlowboardExecution,
  FlowboardWorkspace,
} from "../../contract/index.js";
import { formatErrorMessage } from "openclaw/plugin-sdk/error-runtime";
import { isFutureDateTimestampMs } from "openclaw/plugin-sdk/number-runtime";
import type { PluginRuntime } from "openclaw/plugin-sdk/plugin-runtime";
import { canonicalPathFromExistingAncestor } from "openclaw/plugin-sdk/security-runtime";
import {
  assertRestrictedFlowboardTarget,
  managedWorktreeName,
  resolveDispatchWorkspaceAccess,
  type ResolveAgentWorkspaceRuntime,
} from "./dispatcher-workspace.js";
import { cardBoardId } from "./store-card-helpers.js";
import { isFlowboardClaimReclaimable } from "./store-constants.js";
import { FlowboardStore, type FlowboardDispatchResult } from "./store.js";
import {
  assertCanonicalFlowboardRootAccess,
  assertFlowboardWorkspaceSourceAccess,
  FLOWBOARD_REQUIRED_WORKER_TOOLS,
  type FlowboardWorkspaceAccess,
} from "./workspace-access.js";

const DEFAULT_DISPATCH_MAX_STARTS = 3;
const DEFAULT_DISPATCH_OWNER = "flowboard-dispatcher";

export type FlowboardSubagentRuntime = Pick<PluginRuntime["subagent"], "run">;
export type FlowboardWorktreeRuntime = PluginRuntime["worktrees"];

type FlowboardDispatchStartOptions = {
  maxStarts?: number;
  model?: string;
  provider?: string;
  ownerId?: string;
  boardId?: string;
  now?: number;
  materializeWorktree?: boolean;
  resolveAgentWorkspace?: (agentId?: string) => string;
  resolveAgentWorkspaceRuntime?: ResolveAgentWorkspaceRuntime;
  workspaceAccess?: FlowboardWorkspaceAccess;
};

type FlowboardStartedRun = {
  cardId: string;
  title: string;
  sessionKey: string;
  runId: string;
};

type FlowboardStartFailure = {
  cardId: string;
  title: string;
  error: string;
};

type FlowboardDispatchAndStartResult = FlowboardDispatchResult & {
  started: FlowboardStartedRun[];
  startFailures: FlowboardStartFailure[];
};

type FlowboardDispatchStartParams = {
  store: FlowboardStore;
  subagent: FlowboardSubagentRuntime;
  worktrees?: FlowboardWorktreeRuntime;
  options?: FlowboardDispatchStartOptions;
};

const pendingFlowboardDispatches = new WeakMap<FlowboardStore, Promise<void>>();

function normalizePositiveInteger(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.trunc(value))
    : fallback;
}

function sanitizeSessionSegment(value: string | undefined, fallback: string): string {
  const sanitized = (value ?? fallback)
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return (sanitized || fallback).slice(0, 96);
}

function cardIsArchived(card: FlowboardCard): boolean {
  return Boolean(card.metadata?.archivedAt);
}

function cardHasActiveClaim(card: FlowboardCard, now: number): boolean {
  const claim = card.metadata?.claim;
  return Boolean(claim && isFutureDateTimestampMs(claim.expiresAt, { nowMs: now }));
}

function buildSessionKey(card: FlowboardCard): string {
  const boardId = sanitizeSessionSegment(cardBoardId(card), "default");
  const cardId = sanitizeSessionSegment(card.id, "card");
  const suffix = `subagent:flowboard-${boardId}-${cardId}`;
  return card.agentId ? `agent:${sanitizeSessionSegment(card.agentId, "agent")}:${suffix}` : suffix;
}

function buildExecution(params: {
  card: FlowboardCard;
  sessionKey: string;
  runId: string;
  now: number;
}): FlowboardExecution {
  return {
    id: params.card.execution?.id ?? `${params.card.id}:agent-session`,
    kind: "agent-session",
    mode: "autonomous",
    status: "running",
    sessionKey: params.sessionKey,
    runId: params.runId,
    startedAt: params.now,
    updatedAt: params.now,
  };
}

async function materializeWorkspace(params: {
  card: FlowboardCard;
  worktrees?: FlowboardWorktreeRuntime;
  materializeWorktree: boolean;
  workspaceAccess: FlowboardWorkspaceAccess;
}): Promise<{ workspace?: FlowboardWorkspace; cwd?: string }> {
  const workspace = params.card.metadata?.automation?.workspace;
  if (!workspace || workspace.kind === "scratch") {
    return {};
  }
  const sourcePath = workspace.sourcePath ?? workspace.path;
  const sourceBranch = workspace.sourcePath ? workspace.sourceBranch : workspace.branch;
  if (!sourcePath || !path.isAbsolute(sourcePath)) {
    throw new Error("worktree workspace path must be an absolute git checkout path");
  }
  // Persisted cards can outlive the caller that created them. Keep the exact
  // canonical path that passes this dispatcher's current boundary check.
  const canonicalSourcePath = await assertFlowboardWorkspaceSourceAccess(
    workspace,
    params.workspaceAccess,
  );
  if (!canonicalSourcePath) {
    throw new Error("worktree workspace path is required");
  }
  if (workspace.kind === "dir" || !params.workspaceAccess.unrestricted) {
    await assertCanonicalFlowboardRootAccess(canonicalSourcePath, params.workspaceAccess);
    return workspace.kind === "worktree"
      ? { cwd: canonicalSourcePath, workspace: { kind: "dir", path: canonicalSourcePath } }
      : { cwd: canonicalSourcePath };
  }
  if (!params.materializeWorktree) {
    throw new Error("managed worktree materialization was not explicitly authorized");
  }
  if (!params.worktrees) {
    throw new Error("managed worktree runtime is unavailable");
  }
  const worktree = await params.worktrees.create({
    repoRoot: canonicalSourcePath,
    name: managedWorktreeName(params.card.id),
    ...(sourceBranch ? { baseRef: sourceBranch } : {}),
    // This host release has a fixed managed-worktree owner enum. Card IDs
    // remain globally unique and flowboard data stays in its own SQLite namespace.
    ownerKind: "workboard",
    ownerId: params.card.id,
  });
  let cwd: string;
  try {
    cwd = await canonicalPathFromExistingAncestor(worktree.path);
  } catch (error) {
    const removed = await params.worktrees
      .removeIfLossless({
        path: worktree.path,
      })
      .catch(() => false);
    if (!removed) {
      throw new Error(`${formatErrorMessage(error)}; managed worktree cleanup failed`, {
        cause: error,
      });
    }
    throw error;
  }
  return {
    cwd,
    workspace: {
      kind: "worktree",
      path: worktree.path,
      branch: worktree.branch,
      sourcePath,
      ...(sourceBranch ? { sourceBranch } : {}),
    },
  };
}

function buildWorkerPrompt(params: {
  card: FlowboardCard;
  context: string;
  ownerId: string;
  token: string;
}): string {
  return [
    `Work on this OpenClaw Flowboard card: ${params.card.title}`,
    "",
    "## Worker protocol",
    `Card id: ${params.card.id}`,
    `Claim ownerId: ${params.ownerId}`,
    `Claim token: ${params.token}`,
    "",
    "Heartbeat with flowboard_heartbeat using the card id and token while working.",
    "When done, call flowboard_complete with the card id, token, summary, and proof.",
    "If you called flowboard_proof separately, pass its returned proofId to flowboard_complete.",
    "If blocked, call flowboard_block with the card id, token, and reason.",
    "",
    params.context,
  ].join("\n");
}

function sortReadyCards(a: FlowboardCard, b: FlowboardCard): number {
  const priorityRank: Record<FlowboardCard["priority"], number> = {
    urgent: 0,
    high: 1,
    normal: 2,
    low: 3,
  };
  return (
    priorityRank[a.priority] - priorityRank[b.priority] ||
    a.position - b.position ||
    a.createdAt - b.createdAt
  );
}

function resolveDispatchOwner(card: FlowboardCard, now: number, ownerOverride?: string): string {
  return (
    ownerOverride ||
    (cardHasActiveClaim(card, now) ? card.metadata?.claim?.ownerId : undefined) ||
    card.agentId ||
    DEFAULT_DISPATCH_OWNER
  );
}

function selectStartableCards(
  cards: FlowboardCard[],
  limit: number,
  candidates: FlowboardCard[],
  ownerOverride: string | undefined,
  now: number,
): FlowboardCard[] {
  if (limit <= 0) {
    return [];
  }
  const runningByOwner = new Map<string, number>();
  for (const card of cards) {
    const claim = card.metadata?.claim;
    // Owner capacity is global but cleanup is board-scoped; retain the same
    // heartbeat grace as cleanup before a stale running card releases its slot.
    const consumesOwnerSlot =
      !isFlowboardClaimReclaimable(claim, now) &&
      (card.status === "running" ||
        (card.status !== "done" && cardHasActiveClaim(card, now)) ||
        card.execution?.status === "running");
    if (!consumesOwnerSlot || cardIsArchived(card)) {
      continue;
    }
    // A grace-protected running claim still occupies its actual worker, even
    // after the lease expires and the card's assigned agent differs.
    const owner = claim?.ownerId ?? resolveDispatchOwner(card, now);
    runningByOwner.set(owner, (runningByOwner.get(owner) ?? 0) + 1);
  }
  const selected: FlowboardCard[] = [];
  const fallback: FlowboardCard[] = [];
  const selectedOwners = new Set<string>();
  for (const card of candidates
    .filter(
      (entry) =>
        entry.status === "ready" && !cardHasActiveClaim(entry, now) && !cardIsArchived(entry),
    )
    .toSorted(sortReadyCards)) {
    const owner = resolveDispatchOwner(card, now, ownerOverride);
    if ((runningByOwner.get(owner) ?? 0) > 0) {
      continue;
    }
    if (selectedOwners.has(owner)) {
      fallback.push(card);
      continue;
    }
    selectedOwners.add(owner);
    selected.push(card);
  }
  // Try each owner before a failed owner's extra cards consume the outage budget.
  return [...selected, ...fallback];
}

export async function dispatchAndStartFlowboardCards(
  params: FlowboardDispatchStartParams,
): Promise<FlowboardDispatchAndStartResult> {
  const previous = pendingFlowboardDispatches.get(params.store);
  // Board filters must share their store's owner-capacity snapshot; otherwise
  // simultaneous passes can claim different cards for the same active worker.
  const dispatch = previous
    ? previous.then(() => runFlowboardDispatch(params))
    : runFlowboardDispatch(params);
  const settled = dispatch.then(
    () => undefined,
    () => undefined,
  );
  pendingFlowboardDispatches.set(params.store, settled);
  try {
    return await dispatch;
  } finally {
    if (pendingFlowboardDispatches.get(params.store) === settled) {
      pendingFlowboardDispatches.delete(params.store);
    }
  }
}

async function runFlowboardDispatch(
  params: FlowboardDispatchStartParams,
): Promise<FlowboardDispatchAndStartResult> {
  const now = params.options?.now ?? Date.now();
  const boardId = params.options?.boardId;
  const dispatch = await params.store.dispatch({ now, boardId });
  const maxStarts = normalizePositiveInteger(
    params.options?.maxStarts,
    DEFAULT_DISPATCH_MAX_STARTS,
  );
  const started: FlowboardStartedRun[] = [];
  const startFailures: FlowboardStartFailure[] = [];
  const cards = await params.store.list();
  const candidates: FlowboardCard[] = [];
  for (const candidate of await params.store.list({ boardId })) {
    if (!(await params.store.isProjectArchived(cardBoardId(candidate)))) {
      candidates.push(candidate);
    }
  }
  const ownerOverride = params.options?.ownerId?.trim() || undefined;
  const startedOwners = new Set<string>();
  // Allow one fallback per worker slot without draining the queue during an outage.
  const maxAttempts = maxStarts * 2;
  let acceptedStarts = 0;
  let attemptedStarts = 0;

  for (const card of selectStartableCards(cards, maxStarts, candidates, ownerOverride, now)) {
    const ownerId = resolveDispatchOwner(card, now, ownerOverride);
    if (acceptedStarts >= maxStarts || attemptedStarts >= maxAttempts) {
      break;
    }
    if (startedOwners.has(ownerId)) {
      continue;
    }
    const sessionKey = buildSessionKey(card);
    let claimValue = "";
    let materializedWorkspace: FlowboardWorkspace | undefined;
    let implicitWorkspaceCwd: string | undefined;
    let runStarted = false;
    const requestedWorkspace = card.metadata?.automation?.workspace;
    let workspaceAccess: FlowboardWorkspaceAccess;
    let targetWorkspace: string | undefined;
    let persistWorkspaceAccess: boolean;
    try {
      ({ workspaceAccess, targetWorkspace, persistWorkspaceAccess } =
        await resolveDispatchWorkspaceAccess({
          card,
          currentAccess: params.options?.workspaceAccess,
          resolveAgentWorkspace: params.options?.resolveAgentWorkspace,
        }));
    } catch (error) {
      startFailures.push({
        cardId: card.id,
        title: card.title,
        error: formatErrorMessage(error),
      });
      continue;
    }
    if (!requestedWorkspace || requestedWorkspace.kind === "scratch") {
      if (!workspaceAccess.unrestricted) {
        if (!targetWorkspace) {
          startFailures.push({
            cardId: card.id,
            title: card.title,
            error: "target agent workspace is unavailable for restricted dispatch",
          });
          continue;
        }
        try {
          implicitWorkspaceCwd = targetWorkspace;
          await assertCanonicalFlowboardRootAccess(implicitWorkspaceCwd, workspaceAccess);
          await assertRestrictedFlowboardTarget({
            root: implicitWorkspaceCwd,
            agentId: card.agentId,
            sessionKey,
            modelProvider: params.options?.provider,
            modelId: params.options?.model,
            resolveAgentWorkspaceRuntime: params.options?.resolveAgentWorkspaceRuntime,
          });
        } catch (error) {
          startFailures.push({
            cardId: card.id,
            title: card.title,
            error: formatErrorMessage(error),
          });
          continue;
        }
      }
    } else {
      try {
        const canonicalSourcePath = await assertFlowboardWorkspaceSourceAccess(
          requestedWorkspace,
          workspaceAccess,
        );
        if (
          canonicalSourcePath &&
          requestedWorkspace.kind === "dir" &&
          workspaceAccess.unrestricted
        ) {
          await assertCanonicalFlowboardRootAccess(canonicalSourcePath, workspaceAccess);
        }
        if (canonicalSourcePath && !workspaceAccess.unrestricted) {
          await assertCanonicalFlowboardRootAccess(canonicalSourcePath, workspaceAccess);
          await assertRestrictedFlowboardTarget({
            root: canonicalSourcePath,
            agentId: card.agentId,
            sessionKey,
            modelProvider: params.options?.provider,
            modelId: params.options?.model,
            resolveAgentWorkspaceRuntime: params.options?.resolveAgentWorkspaceRuntime,
          });
        }
      } catch (error) {
        startFailures.push({
          cardId: card.id,
          title: card.title,
          error: formatErrorMessage(error),
        });
        continue;
      }
    }
    try {
      const claimed = await params.store.claim(
        card.id,
        { ownerId, ttlSeconds: card.metadata?.automation?.maxRuntimeSeconds },
        {
          expectedAuthority: {
            boardId: cardBoardId(card),
            status: card.status,
            agentId: card.agentId,
            workspace: card.metadata?.automation?.workspace,
            workspaceAccess: card.metadata?.automation?.workspaceAccess,
          },
          adoptWorkspaceAccess: persistWorkspaceAccess ? workspaceAccess : undefined,
        },
      );
      claimValue = claimed.token;
      // Racing card changes never reached a worker and must not consume the
      // provider-outage budget or starve a later healthy candidate.
      attemptedStarts += 1;
      const context = await params.store.buildWorkerContext(card.id);
      const materialized = await materializeWorkspace({
        card: claimed.card,
        worktrees: params.worktrees,
        materializeWorktree: params.options?.materializeWorktree === true,
        workspaceAccess,
      });
      const runCwd = materialized.cwd ?? implicitWorkspaceCwd;
      if (runCwd && !workspaceAccess.unrestricted) {
        await assertRestrictedFlowboardTarget({
          root: runCwd,
          // Claim may populate agentId; keep the sessionKey target identity.
          agentId: card.agentId,
          sessionKey,
          modelProvider: params.options?.provider,
          modelId: params.options?.model,
          resolveAgentWorkspaceRuntime: params.options?.resolveAgentWorkspaceRuntime,
        });
      }
      materializedWorkspace = materialized.workspace;
      if (materializedWorkspace) {
        await params.store.update(card.id, { workspace: materializedWorkspace, workspaceAccess });
      }
      const run = await params.subagent.run({
        sessionKey,
        message: buildWorkerPrompt({
          card: claimed.card,
          context,
          ownerId,
          token: claimValue,
        }),
        ...(params.options?.provider ? { provider: params.options.provider } : {}),
        ...(params.options?.model ? { model: params.options.model } : {}),
        lane: `flowboard:${cardBoardId(card)}:${card.id}`,
        idempotencyKey: `flowboard:${card.id}:${claimed.card.updatedAt}`,
        lightContext: true,
        deliver: false,
        ...(runCwd ? { cwd: runCwd } : {}),
      });
      runStarted = true;
      acceptedStarts += 1;
      startedOwners.add(ownerId);
      const updated = await params.store.update(card.id, {
        sessionKey,
        runId: run.runId,
        execution: buildExecution({
          card: claimed.card,
          sessionKey,
          runId: run.runId,
          now,
        }),
        ...(materializedWorkspace ? { workspace: materializedWorkspace } : {}),
      });
      started.push({
        cardId: updated.id,
        title: updated.title,
        sessionKey,
        runId: run.runId,
      });
      // A worker already accepted this run. Logging must never revoke its
      // claim, block live execution, or reopen the owner's capacity slot.
      await params.store
        .addWorkerLog(
          updated.id,
          {
            level: "info",
            message: `Dispatcher started subagent run ${run.runId}.`,
            sessionKey,
            runId: run.runId,
          },
          { ownerId, token: claimValue },
        )
        .catch(() => undefined);
    } catch (error) {
      if (
        !runStarted &&
        materializedWorkspace?.kind === "worktree" &&
        materializedWorkspace.path &&
        params.worktrees
      ) {
        await params.worktrees
          .removeIfLossless({
            path: materializedWorkspace.path,
          })
          .catch(() => undefined);
        const sourceWorkspace = card.metadata?.automation?.workspace;
        if (sourceWorkspace) {
          await params.store.update(card.id, { workspace: sourceWorkspace }).catch(() => undefined);
        }
      }
      const message = formatErrorMessage(error);
      startFailures.push({ cardId: card.id, title: card.title, error: message });
      if (!claimValue || runStarted) {
        continue;
      }
      try {
        await params.store.block(
          card.id,
          {
            ownerId,
            token: claimValue,
            reason: `Dispatcher could not start worker: ${message}`,
          },
          { ownerId, token: claimValue },
        );
      } catch {
        // Leave the original start failure visible; dispatch will diagnose stale claims later.
      }
    }
  }

  return {
    ...dispatch,
    started,
    startFailures,
    count: dispatch.count + started.length + startFailures.length,
  };
}
