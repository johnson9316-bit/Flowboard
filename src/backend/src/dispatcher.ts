// Taskfold plugin module implements dispatcher behavior.
import path from "node:path";
import type {
  TaskfoldCard,
  TaskfoldExecution,
  TaskfoldWorkspace,
} from "../../contract/index.js";
import { formatErrorMessage } from "openclaw/plugin-sdk/error-runtime";
import { isFutureDateTimestampMs } from "openclaw/plugin-sdk/number-runtime";
import type { PluginRuntime } from "openclaw/plugin-sdk/plugin-runtime";
import { canonicalPathFromExistingAncestor } from "openclaw/plugin-sdk/security-runtime";
import {
  assertRestrictedTaskfoldTarget,
  managedWorktreeName,
  resolveDispatchWorkspaceAccess,
  type ResolveAgentWorkspaceRuntime,
} from "./dispatcher-workspace.js";
import { cardBoardId } from "./store-card-helpers.js";
import { buildWorkerPrompt } from "./worker-prompt.js";
import { isTaskfoldClaimReclaimable } from "./store-constants.js";
import { TaskfoldStore, type TaskfoldDispatchResult } from "./store.js";
import {
  assertCanonicalTaskfoldRootAccess,
  assertTaskfoldWorkspaceSourceAccess,
  TASKFOLD_REQUIRED_WORKER_TOOLS,
  type TaskfoldWorkspaceAccess,
} from "./workspace-access.js";

const DEFAULT_DISPATCH_MAX_STARTS = 3;
const DEFAULT_DISPATCH_OWNER = "taskfold-dispatcher";

export type TaskfoldSubagentRuntime = Pick<PluginRuntime["subagent"], "run">;
export type TaskfoldWorktreeRuntime = PluginRuntime["worktrees"];

export async function createManagedTaskfoldWorktree(params: {
  worktrees: TaskfoldWorktreeRuntime;
  repoRoot: string;
  name: string;
  baseRef?: string;
  ownerId: string;
}) {
  return await params.worktrees.create({
    repoRoot: params.repoRoot,
    name: params.name,
    ...(params.baseRef ? { baseRef: params.baseRef } : {}),
    // This host release has a fixed managed-worktree owner enum. Card IDs
    // remain globally unique and Taskfold data stays in its own SQLite namespace.
    ownerKind: "workboard",
    ownerId: params.ownerId,
  });
}

type TaskfoldDispatchStartOptions = {
  maxStarts?: number;
  model?: string;
  provider?: string;
  ownerId?: string;
  boardId?: string;
  now?: number;
  materializeWorktree?: boolean;
  resolveAgentWorkspace?: (agentId?: string) => string;
  resolveAgentWorkspaceRuntime?: ResolveAgentWorkspaceRuntime;
  workspaceAccess?: TaskfoldWorkspaceAccess;
};

type TaskfoldStartedRun = {
  cardId: string;
  title: string;
  sessionKey: string;
  runId: string;
};

type TaskfoldStartFailure = {
  cardId: string;
  title: string;
  error: string;
};

type TaskfoldDispatchAndStartResult = TaskfoldDispatchResult & {
  started: TaskfoldStartedRun[];
  startFailures: TaskfoldStartFailure[];
};

type TaskfoldDispatchStartParams = {
  store: TaskfoldStore;
  subagent: TaskfoldSubagentRuntime;
  worktrees?: TaskfoldWorktreeRuntime;
  options?: TaskfoldDispatchStartOptions;
};

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

function cardIsArchived(card: TaskfoldCard): boolean {
  return Boolean(card.metadata?.archivedAt);
}

function cardHasActiveClaim(card: TaskfoldCard, now: number): boolean {
  const claim = card.metadata?.claim;
  return Boolean(claim && isFutureDateTimestampMs(claim.expiresAt, { nowMs: now }));
}

export function buildSessionKey(card: TaskfoldCard): string {
  const boardId = sanitizeSessionSegment(cardBoardId(card), "default");
  const cardId = sanitizeSessionSegment(card.id, "card");
  const suffix = `subagent:taskfold-${boardId}-${cardId}`;
  return card.agentId ? `agent:${sanitizeSessionSegment(card.agentId, "agent")}:${suffix}` : suffix;
}

export function buildExecution(params: {
  card: TaskfoldCard;
  sessionKey: string;
  runId: string;
  now: number;
}): TaskfoldExecution {
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
  card: TaskfoldCard;
  worktrees?: TaskfoldWorktreeRuntime;
  materializeWorktree: boolean;
  workspaceAccess: TaskfoldWorkspaceAccess;
}): Promise<{ workspace?: TaskfoldWorkspace; cwd?: string }> {
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
  const canonicalSourcePath = await assertTaskfoldWorkspaceSourceAccess(
    workspace,
    params.workspaceAccess,
  );
  if (!canonicalSourcePath) {
    throw new Error("worktree workspace path is required");
  }
  if (workspace.kind === "dir" || !params.workspaceAccess.unrestricted) {
    await assertCanonicalTaskfoldRootAccess(canonicalSourcePath, params.workspaceAccess);
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
  const worktree = await createManagedTaskfoldWorktree({
    worktrees: params.worktrees,
    repoRoot: canonicalSourcePath,
    name: managedWorktreeName(params.card.id),
    ...(sourceBranch ? { baseRef: sourceBranch } : {}),
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

function sortReadyCards(a: TaskfoldCard, b: TaskfoldCard): number {
  const priorityRank: Record<TaskfoldCard["priority"], number> = {
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

function resolveDispatchOwner(card: TaskfoldCard, now: number, ownerOverride?: string): string {
  return (
    ownerOverride ||
    (cardHasActiveClaim(card, now) ? card.metadata?.claim?.ownerId : undefined) ||
    card.agentId ||
    DEFAULT_DISPATCH_OWNER
  );
}

function selectStartableCards(
  cards: TaskfoldCard[],
  limit: number,
  candidates: TaskfoldCard[],
  ownerOverride: string | undefined,
  now: number,
): TaskfoldCard[] {
  if (limit <= 0) {
    return [];
  }
  const runningByOwner = new Map<string, number>();
  for (const card of cards) {
    const claim = card.metadata?.claim;
    // Owner capacity is global but cleanup is board-scoped; retain the same
    // heartbeat grace as cleanup before a stale running card releases its slot.
    const consumesOwnerSlot =
      !isTaskfoldClaimReclaimable(claim, now) &&
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
  const selected: TaskfoldCard[] = [];
  const fallback: TaskfoldCard[] = [];
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

export async function dispatchAndStartTaskfoldCards(
  params: TaskfoldDispatchStartParams,
): Promise<TaskfoldDispatchAndStartResult> {
  // Simultaneous passes no longer need to be serialized here: each start commits
  // its claim through a database compare-and-swap, so a card can only be claimed
  // once even when the passes come from different Gateway processes. Overlapping
  // passes may now select the same card, and the loser records a start failure.
  return await runTaskfoldDispatch(params);
}

async function runTaskfoldDispatch(
  params: TaskfoldDispatchStartParams,
): Promise<TaskfoldDispatchAndStartResult> {
  const now = params.options?.now ?? Date.now();
  const boardId = params.options?.boardId;
  const dispatch = await params.store.dispatch({ now, boardId });
  const maxStarts = normalizePositiveInteger(
    params.options?.maxStarts,
    DEFAULT_DISPATCH_MAX_STARTS,
  );
  const started: TaskfoldStartedRun[] = [];
  const startFailures: TaskfoldStartFailure[] = [];
  const cards = await params.store.list();
  const candidates: TaskfoldCard[] = [];
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
    let materializedWorkspace: TaskfoldWorkspace | undefined;
    let implicitWorkspaceCwd: string | undefined;
    let runStarted = false;
    const requestedWorkspace = card.metadata?.automation?.workspace;
    let workspaceAccess: TaskfoldWorkspaceAccess;
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
          await assertCanonicalTaskfoldRootAccess(implicitWorkspaceCwd, workspaceAccess);
          await assertRestrictedTaskfoldTarget({
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
        const canonicalSourcePath = await assertTaskfoldWorkspaceSourceAccess(
          requestedWorkspace,
          workspaceAccess,
        );
        if (
          canonicalSourcePath &&
          requestedWorkspace.kind === "dir" &&
          workspaceAccess.unrestricted
        ) {
          await assertCanonicalTaskfoldRootAccess(canonicalSourcePath, workspaceAccess);
        }
        if (canonicalSourcePath && !workspaceAccess.unrestricted) {
          await assertCanonicalTaskfoldRootAccess(canonicalSourcePath, workspaceAccess);
          await assertRestrictedTaskfoldTarget({
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
        await assertRestrictedTaskfoldTarget({
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
        lane: `taskfold:${cardBoardId(card)}:${card.id}`,
        // Keyed on the winning claim token, which is minted once per claim and so
        // identifies exactly this dispatch attempt. A millisecond timestamp could
        // collide between two attempts and changed on unrelated card writes.
        idempotencyKey: `taskfold:${card.id}:${claimValue}`,
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
