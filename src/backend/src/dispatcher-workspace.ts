import type { FlowboardCard } from "../../contract/index.js";
// Flowboard dispatch workspace helpers keep authority resolution outside the orchestration loop.
import type { PluginRuntime } from "openclaw/plugin-sdk/plugin-runtime";
import { canonicalPathFromExistingAncestor } from "openclaw/plugin-sdk/security-runtime";
import type { FlowboardStore } from "./store.js";
import {
  assertCanonicalFlowboardRootAccess,
  canonicalizeFlowboardWorkspaceAccess,
  intersectFlowboardWorkspaceAccess,
  type FlowboardTargetWorkspaceRuntime,
  type FlowboardWorkspaceAccess,
} from "./workspace-access.js";

export type ResolveAgentWorkspaceRuntime = (
  agentId: string | undefined,
  sessionKey: string,
  workspaceDir: string,
  modelProvider?: string,
  modelId?: string,
) => FlowboardTargetWorkspaceRuntime | Promise<FlowboardTargetWorkspaceRuntime>;

export function managedWorktreeName(cardId: string): string {
  const suffix = cardId
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-");
  return `wb-${suffix}`.slice(0, 64).replace(/-$/, "");
}

export async function cleanupFlowboardRunWorktree(params: {
  store: FlowboardStore;
  worktrees: Pick<PluginRuntime["worktrees"], "removeIfLossless">;
  runId: string;
}): Promise<void> {
  const card = (await params.store.list()).find((entry) => entry.runId === params.runId);
  const workspace = card?.metadata?.automation?.workspace;
  if (!card || workspace?.kind !== "worktree" || !workspace.path) {
    return;
  }
  await params.worktrees.removeIfLossless({
    path: workspace.path,
  });
}

export async function resolveDispatchWorkspaceAccess(params: {
  card: FlowboardCard;
  currentAccess?: FlowboardWorkspaceAccess;
  resolveAgentWorkspace?: (agentId?: string) => string;
}): Promise<{
  workspaceAccess: FlowboardWorkspaceAccess;
  targetWorkspace?: string;
  persistWorkspaceAccess: boolean;
}> {
  const currentAccess = await canonicalizeFlowboardWorkspaceAccess(
    params.currentAccess ?? { unrestricted: true },
  );
  const persistedAccess = params.card.metadata?.automation?.workspaceAccess;
  const workspace = params.card.metadata?.automation?.workspace;
  let targetWorkspace: string | undefined;
  if (!persistedAccess?.unrestricted || !currentAccess.unrestricted) {
    const resolved = params.resolveAgentWorkspace?.(params.card.agentId);
    targetWorkspace = resolved ? await canonicalPathFromExistingAncestor(resolved) : undefined;
  }
  const cardAccess = persistedAccess
    ? await canonicalizeFlowboardWorkspaceAccess(persistedAccess)
    : currentAccess.unrestricted
      ? !workspace || workspace.kind === "scratch"
        ? currentAccess
        : (() => {
            throw new Error(
              "card workspace authority is unknown; re-save its workspace with current permissions before dispatch.",
            );
          })()
      : currentAccess;
  const workspaceAccess = intersectFlowboardWorkspaceAccess(cardAccess, currentAccess);
  if (!workspaceAccess.unrestricted && !workspaceAccess.writable) {
    throw new Error(
      "card workspace authority is read-only; manual movement is allowed but worker dispatch requires write access.",
    );
  }
  return {
    workspaceAccess,
    ...(targetWorkspace ? { targetWorkspace } : {}),
    persistWorkspaceAccess: !persistedAccess,
  };
}

export async function assertRestrictedFlowboardTarget(params: {
  root: string;
  agentId?: string;
  sessionKey: string;
  modelProvider?: string;
  modelId?: string;
  resolveAgentWorkspaceRuntime?: ResolveAgentWorkspaceRuntime;
}): Promise<void> {
  const resolved: FlowboardTargetWorkspaceRuntime = params.resolveAgentWorkspaceRuntime
    ? await params.resolveAgentWorkspaceRuntime(
        params.agentId,
        params.sessionKey,
        params.root,
        params.modelProvider,
        params.modelId,
      )
    : {
        sandboxed: false,
        workspaceAccess: { unrestricted: true } as const,
      };
  const targetRuntime = {
    ...resolved,
    workspaceAccess: await canonicalizeFlowboardWorkspaceAccess(resolved.workspaceAccess),
  };
  if (!targetRuntime.sandboxed) {
    throw new Error("target agent is not sandboxed for this restricted Flowboard card.");
  }
  if (targetRuntime.confinementError) {
    throw new Error(targetRuntime.confinementError);
  }
  if (targetRuntime.workspaceAccess.unrestricted || !targetRuntime.workspaceAccess.writable) {
    throw new Error("target agent does not have writable workspace-only access.");
  }
  await assertCanonicalFlowboardRootAccess(params.root, targetRuntime.workspaceAccess);
}
