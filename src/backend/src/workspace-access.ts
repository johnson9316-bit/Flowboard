import type { TaskfoldWorkspace, TaskfoldWorkspaceAccess } from "../../contract/index.js";
// Taskfold workspace access follows the caller's canonical filesystem boundary.
import {
  listAgentIds,
  resolveAgentConfig,
  resolveAgentWorkspaceDir,
  resolveDefaultAgentId,
} from "openclaw/plugin-sdk/agent-runtime";
import type {
  AnyAgentTool,
  OpenClawPluginApi,
  OpenClawPluginToolContext,
} from "openclaw/plugin-sdk/plugin-entry";
import {
  canonicalPathFromExistingAncestor,
  isPathInside,
} from "openclaw/plugin-sdk/security-runtime";

export type { TaskfoldWorkspaceAccess } from "../../contract/index.js";

type TaskfoldConfig = NonNullable<OpenClawPluginToolContext["config"]>;
type TaskfoldSandboxWorkspaceRuntime = {
  sandboxed: boolean;
  workspaceAccess: "ro" | "rw";
  confinementError?: string;
};
type TaskfoldSandboxWorkspaceRequest = {
  config: TaskfoldConfig;
  agentId?: string;
  sessionKey: string;
  workspaceDir?: string;
  confinedToolNames?: readonly string[];
  requiredToolNames?: readonly string[];
  modelProvider?: string;
  modelId?: string;
};
type ResolveSandboxWorkspaceAuthority = (
  params: Omit<TaskfoldSandboxWorkspaceRequest, "workspaceDir" | "confinedToolNames" | "requiredToolNames" | "modelProvider" | "modelId">,
) => TaskfoldSandboxWorkspaceRuntime | undefined;
type PrepareSandboxWorkspaceAuthority = (
  params: TaskfoldSandboxWorkspaceRequest,
) => TaskfoldSandboxWorkspaceRuntime | Promise<TaskfoldSandboxWorkspaceRuntime>;

export const TASKFOLD_TOOL_NAMES = [
  "taskfold_list",
  "taskfold_create",
  "taskfold_link",
  "taskfold_read",
  "taskfold_claim",
  "taskfold_heartbeat",
  "taskfold_complete",
  "taskfold_attachment_add",
  "taskfold_attachment_read",
  "taskfold_attachment_delete",
  "taskfold_block",
  "taskfold_boards",
  "taskfold_board_create",
  "taskfold_board_archive",
  "taskfold_board_delete",
  "taskfold_stats",
  "taskfold_runs",
  "taskfold_specify",
  "taskfold_decompose",
  "taskfold_notify_subscribe",
  "taskfold_notify_list",
  "taskfold_notify_events",
  "taskfold_notify_advance",
  "taskfold_notify_unsubscribe",
  "taskfold_promote",
  "taskfold_reassign",
  "taskfold_reclaim",
  "taskfold_dispatch",
  "taskfold_release",
  "taskfold_comment",
  "taskfold_proof",
  "taskfold_worker_log",
  "taskfold_protocol_violation",
  "taskfold_unblock",
  "taskfold_move",
  "taskfold_projects",
  "taskfold_project_create",
  "taskfold_project_read",
  "taskfold_milestone_create",
  "taskfold_move_milestone",
  "taskfold_move_project",
  "taskfold_project_documents",
  "taskfold_project_document_create",
] as const;

export const TASKFOLD_REQUIRED_WORKER_TOOLS = [
  "taskfold_heartbeat",
  "taskfold_complete",
  "taskfold_block",
] as const;

export function resolveTaskfoldAgentWorkspace(config: TaskfoldConfig, agentId?: string): string {
  return resolveAgentWorkspaceDir(config, agentId ?? resolveDefaultAgentId(config));
}

export function resolveConfiguredTaskfoldWorkspaceAccess(params: {
  config: TaskfoldConfig;
  unrestricted: boolean;
}): TaskfoldWorkspaceAccess {
  if (params.unrestricted) {
    return { unrestricted: true };
  }
  return {
    unrestricted: false,
    writable: true,
    roots: listAgentIds(params.config).map((agentId) =>
      resolveAgentWorkspaceDir(params.config, agentId),
    ),
  };
}

export type TaskfoldTargetWorkspaceRuntime = {
  sandboxed: boolean;
  workspaceAccess: TaskfoldWorkspaceAccess;
  confinementError?: string;
};

export async function resolveAgentTaskfoldWorkspaceRuntime(params: {
  config: TaskfoldConfig;
  agentId?: string;
  sessionKey: string;
  workspaceDir: string;
  modelProvider?: string;
  modelId?: string;
  prepareSandboxWorkspaceAuthority?: PrepareSandboxWorkspaceAuthority;
}): Promise<TaskfoldTargetWorkspaceRuntime> {
  const agentId = params.agentId ?? resolveDefaultAgentId(params.config);
  const sandboxRuntime = params.prepareSandboxWorkspaceAuthority
    ? await params.prepareSandboxWorkspaceAuthority({
        config: params.config,
        agentId,
        confinedToolNames: TASKFOLD_TOOL_NAMES,
        requiredToolNames: TASKFOLD_REQUIRED_WORKER_TOOLS,
        modelProvider: params.modelProvider,
        modelId: params.modelId,
        sessionKey: params.sessionKey,
        workspaceDir: params.workspaceDir,
      })
    : undefined;
  if (!sandboxRuntime) {
    return {
      sandboxed: false,
      workspaceAccess: { unrestricted: true },
    };
  }
  return {
    sandboxed: sandboxRuntime.sandboxed,
    workspaceAccess: sandboxRuntime.sandboxed
      ? {
          unrestricted: false,
          roots: [resolveAgentWorkspaceDir(params.config, agentId)],
          writable: sandboxRuntime.workspaceAccess === "rw",
        }
      : { unrestricted: true },
    ...(sandboxRuntime.confinementError
      ? { confinementError: sandboxRuntime.confinementError }
      : {}),
  };
}

export function resolveCommandTaskfoldWorkspaceAccess(params: {
  config: TaskfoldConfig;
  agentId?: string;
  sessionKey?: string;
  gatewayClientScopes?: readonly string[];
  resolveSandboxWorkspaceAuthority?: ResolveSandboxWorkspaceAuthority;
}): TaskfoldWorkspaceAccess {
  if (params.gatewayClientScopes) {
    return resolveConfiguredTaskfoldWorkspaceAccess({
      config: params.config,
      unrestricted: params.gatewayClientScopes.includes("operator.admin"),
    });
  }
  const agentId = params.agentId ?? resolveDefaultAgentId(params.config);
  const sandboxRuntime =
    params.sessionKey && params.resolveSandboxWorkspaceAuthority
      ? params.resolveSandboxWorkspaceAuthority({
          config: params.config,
          agentId,
          sessionKey: params.sessionKey,
        })
      : undefined;
  if (sandboxRuntime?.sandboxed) {
    return {
      unrestricted: false,
      roots: [resolveAgentWorkspaceDir(params.config, agentId)],
      writable: sandboxRuntime.workspaceAccess === "rw",
    };
  }
  const workspaceOnly =
    resolveAgentConfig(params.config, agentId)?.tools?.fs?.workspaceOnly ??
    params.config.tools?.fs?.workspaceOnly;
  return workspaceOnly === true
    ? {
        unrestricted: false,
        roots: [resolveAgentWorkspaceDir(params.config, agentId)],
        writable: true,
      }
    : { unrestricted: true };
}

function resolveToolTaskfoldWorkspaceAccess(
  context: OpenClawPluginToolContext | undefined,
  resolveSandboxWorkspaceAuthority?: ResolveSandboxWorkspaceAuthority,
): TaskfoldWorkspaceAccess {
  if (!context?.sandboxed && context?.fsPolicy?.workspaceOnly !== true) {
    return { unrestricted: true };
  }
  const config = context.runtimeConfig ?? context.getRuntimeConfig?.() ?? context.config;
  const sandboxRuntime =
    context.sandboxed && config && context.sessionKey && resolveSandboxWorkspaceAuthority
      ? resolveSandboxWorkspaceAuthority({
          config,
          agentId: context.agentId,
          sessionKey: context.sessionKey,
        })
      : undefined;
  return {
    unrestricted: false,
    roots: context.workspaceDir ? [context.workspaceDir] : [],
    writable: sandboxRuntime ? sandboxRuntime.workspaceAccess === "rw" : !context.sandboxed,
  };
}

export async function canonicalizeTaskfoldWorkspaceAccess(
  access: TaskfoldWorkspaceAccess,
): Promise<TaskfoldWorkspaceAccess> {
  if (access.unrestricted) {
    return access;
  }
  const roots = Array.from(
    new Set(
      await Promise.all(
        access.roots.map(async (root) => await canonicalPathFromExistingAncestor(root)),
      ),
    ),
  );
  if (roots.length === 0) {
    throw new Error("restricted workspace access has no allowed roots.");
  }
  return { unrestricted: false, roots, writable: access.writable };
}

export function intersectTaskfoldWorkspaceAccess(
  left: TaskfoldWorkspaceAccess,
  right: TaskfoldWorkspaceAccess,
): TaskfoldWorkspaceAccess {
  if (left.unrestricted) {
    return right;
  }
  if (right.unrestricted) {
    return left;
  }
  const roots = new Set<string>();
  for (const leftRoot of left.roots) {
    for (const rightRoot of right.roots) {
      if (leftRoot === rightRoot || isPathInside(leftRoot, rightRoot)) {
        roots.add(rightRoot);
      } else if (isPathInside(rightRoot, leftRoot)) {
        roots.add(leftRoot);
      }
    }
  }
  if (roots.size === 0) {
    throw new Error("workspace access does not overlap the card's persisted authority.");
  }
  return {
    unrestricted: false,
    roots: Array.from(roots),
    writable: left.writable && right.writable,
  };
}

async function assertCanonicalTaskfoldPathAccess(
  candidate: string,
  access: TaskfoldWorkspaceAccess,
): Promise<string> {
  if (access.unrestricted) {
    return candidate;
  }
  for (const root of access.roots) {
    const canonicalRoot = await canonicalPathFromExistingAncestor(root);
    if (isPathInside(canonicalRoot, candidate)) {
      return candidate;
    }
  }
  throw new Error("workspace path is outside the caller's allowed workspaces.");
}

export async function assertCanonicalTaskfoldRootAccess(
  candidate: string,
  access: TaskfoldWorkspaceAccess,
): Promise<string> {
  if (access.unrestricted) {
    return candidate;
  }
  for (const root of access.roots) {
    const canonicalRoot = await canonicalPathFromExistingAncestor(root);
    if (canonicalRoot === candidate) {
      return candidate;
    }
  }
  throw new Error("workspace path must equal one of the caller's allowed workspace roots.");
}

async function assertPathAllowed(
  value: unknown,
  access: TaskfoldWorkspaceAccess,
): Promise<string | undefined> {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }
  const candidate = await canonicalPathFromExistingAncestor(value.trim());
  return await assertCanonicalTaskfoldPathAccess(candidate, access);
}

async function assertWorkspaceAllowed(
  value: unknown,
  access: TaskfoldWorkspaceAccess,
  options?: { sourceOnly?: boolean },
): Promise<string | undefined> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const workspace = value as Record<string, unknown>;
  if (options?.sourceOnly) {
    return await assertPathAllowed(workspace.sourcePath ?? workspace.path, access);
  }
  await assertPathAllowed(workspace.path, access);
  await assertPathAllowed(workspace.sourcePath, access);
  return undefined;
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export function containsTaskfoldWorkspaceMutation(value: unknown): boolean {
  const record = readRecord(value);
  if (!record) {
    return false;
  }
  if (Object.hasOwn(record, "workspace") || Object.hasOwn(record, "defaultWorkspace")) {
    return true;
  }
  return (
    containsTaskfoldWorkspaceMutation(record.patch) ||
    containsTaskfoldWorkspaceMutation(readRecord(record.metadata)?.automation) ||
    (Array.isArray(record.children) &&
      record.children.some((child) => containsTaskfoldWorkspaceMutation(child)))
  );
}

export function withTaskfoldWorkspaceAccess(
  value: unknown,
  access: TaskfoldWorkspaceAccess,
): Record<string, unknown> {
  return { ...withoutTaskfoldWorkspaceAccess(value), workspaceAccess: access };
}

export function withoutTaskfoldWorkspaceAccess(value: unknown): Record<string, unknown> {
  const record = readRecord(value) ?? {};
  const { workspaceAccess: _untrustedWorkspaceAccess, ...rest } = record;
  return rest;
}

export function withTaskfoldDecomposeWorkspaceAccess(
  value: unknown,
  access: TaskfoldWorkspaceAccess,
): Record<string, unknown> {
  const record = withoutTaskfoldWorkspaceAccess(value);
  return {
    ...record,
    ...(Array.isArray(record.children)
      ? {
          children: record.children.map((child) => withTaskfoldWorkspaceAccess(child, access)),
        }
      : {}),
  };
}

export async function assertTaskfoldWorkspaceMutationAccess(
  value: unknown,
  access: TaskfoldWorkspaceAccess,
): Promise<void> {
  if (access.unrestricted) {
    return;
  }
  const record = readRecord(value);
  if (!record) {
    return;
  }
  // Card creation and decomposition persist only explicit workspace fields;
  // board defaults and parent workspaces are metadata, not inherited inputs.
  await assertWorkspaceAllowed(record.workspace, access);
  await assertWorkspaceAllowed(record.defaultWorkspace, access);

  const patch = readRecord(record.patch);
  if (patch) {
    await assertTaskfoldWorkspaceMutationAccess(patch, access);
  }
  const metadata = readRecord(record.metadata);
  const automation = readRecord(metadata?.automation);
  if (automation) {
    await assertTaskfoldWorkspaceMutationAccess(automation, access);
  }
  if (Array.isArray(record.children)) {
    for (const child of record.children) {
      await assertTaskfoldWorkspaceMutationAccess(child, access);
    }
  }
}

export async function assertTaskfoldWorkspaceSourceAccess(
  workspace: TaskfoldWorkspace | undefined,
  access: TaskfoldWorkspaceAccess,
): Promise<string | undefined> {
  return await assertWorkspaceAllowed(workspace, access, { sourceOnly: true });
}

export function guardTaskfoldToolsForWorkspaceAccess(
  tools: AnyAgentTool[],
  context: OpenClawPluginToolContext | undefined,
  resolveSandboxWorkspaceAuthority?: ResolveSandboxWorkspaceAuthority,
): AnyAgentTool[] {
  const workspaceAccess = resolveToolTaskfoldWorkspaceAccess(
    context,
    resolveSandboxWorkspaceAuthority,
  );
  return tools.map((tool) => ({
    ...tool,
    execute: async (toolCallId, rawParams, signal, onUpdate) => {
      const canonicalAccess = await canonicalizeTaskfoldWorkspaceAccess(workspaceAccess);
      await assertTaskfoldWorkspaceMutationAccess(rawParams, canonicalAccess);
      const sanitizedParams = withoutTaskfoldWorkspaceAccess(rawParams);
      const constrainedParams =
        tool.name === "taskfold_create"
          ? withTaskfoldWorkspaceAccess(sanitizedParams, canonicalAccess)
          : tool.name === "taskfold_decompose"
            ? withTaskfoldDecomposeWorkspaceAccess(sanitizedParams, canonicalAccess)
            : tool.name === "taskfold_specify" &&
                containsTaskfoldWorkspaceMutation(sanitizedParams)
              ? withTaskfoldWorkspaceAccess(sanitizedParams, canonicalAccess)
              : sanitizedParams;
      return await tool.execute(toolCallId, constrainedParams, signal, onUpdate);
    },
  }));
}
