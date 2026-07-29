import type { FlowboardWorkspace, FlowboardWorkspaceAccess } from "../../contract/index.js";
// Flowboard workspace access follows the caller's canonical filesystem boundary.
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

export type { FlowboardWorkspaceAccess } from "../../contract/index.js";

type FlowboardConfig = NonNullable<OpenClawPluginToolContext["config"]>;
type FlowboardSandboxWorkspaceRuntime = {
  sandboxed: boolean;
  workspaceAccess: "ro" | "rw";
  confinementError?: string;
};
type FlowboardSandboxWorkspaceRequest = {
  config: FlowboardConfig;
  agentId?: string;
  sessionKey: string;
  workspaceDir?: string;
  confinedToolNames?: readonly string[];
  requiredToolNames?: readonly string[];
  modelProvider?: string;
  modelId?: string;
};
type ResolveSandboxWorkspaceAuthority = (
  params: Omit<FlowboardSandboxWorkspaceRequest, "workspaceDir" | "confinedToolNames" | "requiredToolNames" | "modelProvider" | "modelId">,
) => FlowboardSandboxWorkspaceRuntime | undefined;
type PrepareSandboxWorkspaceAuthority = (
  params: FlowboardSandboxWorkspaceRequest,
) => FlowboardSandboxWorkspaceRuntime | Promise<FlowboardSandboxWorkspaceRuntime>;

export const FLOWBOARD_TOOL_NAMES = [
  "flowboard_list",
  "flowboard_create",
  "flowboard_link",
  "flowboard_read",
  "flowboard_claim",
  "flowboard_heartbeat",
  "flowboard_complete",
  "flowboard_attachment_add",
  "flowboard_attachment_read",
  "flowboard_attachment_delete",
  "flowboard_block",
  "flowboard_boards",
  "flowboard_board_create",
  "flowboard_board_archive",
  "flowboard_board_delete",
  "flowboard_stats",
  "flowboard_runs",
  "flowboard_specify",
  "flowboard_decompose",
  "flowboard_notify_subscribe",
  "flowboard_notify_list",
  "flowboard_notify_events",
  "flowboard_notify_advance",
  "flowboard_notify_unsubscribe",
  "flowboard_promote",
  "flowboard_reassign",
  "flowboard_reclaim",
  "flowboard_dispatch",
  "flowboard_release",
  "flowboard_comment",
  "flowboard_proof",
  "flowboard_worker_log",
  "flowboard_protocol_violation",
  "flowboard_unblock",
  "flowboard_move",
  "flowboard_projects",
  "flowboard_project_create",
  "flowboard_project_read",
  "flowboard_milestone_create",
  "flowboard_move_milestone",
  "flowboard_move_project",
  "flowboard_project_documents",
  "flowboard_project_document_create",
] as const;

export const FLOWBOARD_REQUIRED_WORKER_TOOLS = [
  "flowboard_heartbeat",
  "flowboard_complete",
  "flowboard_block",
] as const;

export function resolveFlowboardAgentWorkspace(config: FlowboardConfig, agentId?: string): string {
  return resolveAgentWorkspaceDir(config, agentId ?? resolveDefaultAgentId(config));
}

export function resolveConfiguredFlowboardWorkspaceAccess(params: {
  config: FlowboardConfig;
  unrestricted: boolean;
}): FlowboardWorkspaceAccess {
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

export type FlowboardTargetWorkspaceRuntime = {
  sandboxed: boolean;
  workspaceAccess: FlowboardWorkspaceAccess;
  confinementError?: string;
};

export async function resolveAgentFlowboardWorkspaceRuntime(params: {
  config: FlowboardConfig;
  agentId?: string;
  sessionKey: string;
  workspaceDir: string;
  modelProvider?: string;
  modelId?: string;
  prepareSandboxWorkspaceAuthority?: PrepareSandboxWorkspaceAuthority;
}): Promise<FlowboardTargetWorkspaceRuntime> {
  const agentId = params.agentId ?? resolveDefaultAgentId(params.config);
  const sandboxRuntime = params.prepareSandboxWorkspaceAuthority
    ? await params.prepareSandboxWorkspaceAuthority({
        config: params.config,
        agentId,
        confinedToolNames: FLOWBOARD_TOOL_NAMES,
        requiredToolNames: FLOWBOARD_REQUIRED_WORKER_TOOLS,
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

export function resolveCommandFlowboardWorkspaceAccess(params: {
  config: FlowboardConfig;
  agentId?: string;
  sessionKey?: string;
  gatewayClientScopes?: readonly string[];
  resolveSandboxWorkspaceAuthority?: ResolveSandboxWorkspaceAuthority;
}): FlowboardWorkspaceAccess {
  if (params.gatewayClientScopes) {
    return resolveConfiguredFlowboardWorkspaceAccess({
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

function resolveToolFlowboardWorkspaceAccess(
  context: OpenClawPluginToolContext | undefined,
  resolveSandboxWorkspaceAuthority?: ResolveSandboxWorkspaceAuthority,
): FlowboardWorkspaceAccess {
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

export async function canonicalizeFlowboardWorkspaceAccess(
  access: FlowboardWorkspaceAccess,
): Promise<FlowboardWorkspaceAccess> {
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

export function intersectFlowboardWorkspaceAccess(
  left: FlowboardWorkspaceAccess,
  right: FlowboardWorkspaceAccess,
): FlowboardWorkspaceAccess {
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

async function assertCanonicalFlowboardPathAccess(
  candidate: string,
  access: FlowboardWorkspaceAccess,
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

export async function assertCanonicalFlowboardRootAccess(
  candidate: string,
  access: FlowboardWorkspaceAccess,
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
  access: FlowboardWorkspaceAccess,
): Promise<string | undefined> {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }
  const candidate = await canonicalPathFromExistingAncestor(value.trim());
  return await assertCanonicalFlowboardPathAccess(candidate, access);
}

async function assertWorkspaceAllowed(
  value: unknown,
  access: FlowboardWorkspaceAccess,
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

export function containsFlowboardWorkspaceMutation(value: unknown): boolean {
  const record = readRecord(value);
  if (!record) {
    return false;
  }
  if (Object.hasOwn(record, "workspace") || Object.hasOwn(record, "defaultWorkspace")) {
    return true;
  }
  return (
    containsFlowboardWorkspaceMutation(record.patch) ||
    containsFlowboardWorkspaceMutation(readRecord(record.metadata)?.automation) ||
    (Array.isArray(record.children) &&
      record.children.some((child) => containsFlowboardWorkspaceMutation(child)))
  );
}

export function withFlowboardWorkspaceAccess(
  value: unknown,
  access: FlowboardWorkspaceAccess,
): Record<string, unknown> {
  return { ...withoutFlowboardWorkspaceAccess(value), workspaceAccess: access };
}

export function withoutFlowboardWorkspaceAccess(value: unknown): Record<string, unknown> {
  const record = readRecord(value) ?? {};
  const { workspaceAccess: _untrustedWorkspaceAccess, ...rest } = record;
  return rest;
}

export function withFlowboardDecomposeWorkspaceAccess(
  value: unknown,
  access: FlowboardWorkspaceAccess,
): Record<string, unknown> {
  const record = withoutFlowboardWorkspaceAccess(value);
  return {
    ...record,
    ...(Array.isArray(record.children)
      ? {
          children: record.children.map((child) => withFlowboardWorkspaceAccess(child, access)),
        }
      : {}),
  };
}

export async function assertFlowboardWorkspaceMutationAccess(
  value: unknown,
  access: FlowboardWorkspaceAccess,
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
    await assertFlowboardWorkspaceMutationAccess(patch, access);
  }
  const metadata = readRecord(record.metadata);
  const automation = readRecord(metadata?.automation);
  if (automation) {
    await assertFlowboardWorkspaceMutationAccess(automation, access);
  }
  if (Array.isArray(record.children)) {
    for (const child of record.children) {
      await assertFlowboardWorkspaceMutationAccess(child, access);
    }
  }
}

export async function assertFlowboardWorkspaceSourceAccess(
  workspace: FlowboardWorkspace | undefined,
  access: FlowboardWorkspaceAccess,
): Promise<string | undefined> {
  return await assertWorkspaceAllowed(workspace, access, { sourceOnly: true });
}

export function guardFlowboardToolsForWorkspaceAccess(
  tools: AnyAgentTool[],
  context: OpenClawPluginToolContext | undefined,
  resolveSandboxWorkspaceAuthority?: ResolveSandboxWorkspaceAuthority,
): AnyAgentTool[] {
  const workspaceAccess = resolveToolFlowboardWorkspaceAccess(
    context,
    resolveSandboxWorkspaceAuthority,
  );
  return tools.map((tool) => ({
    ...tool,
    execute: async (toolCallId, rawParams, signal, onUpdate) => {
      const canonicalAccess = await canonicalizeFlowboardWorkspaceAccess(workspaceAccess);
      await assertFlowboardWorkspaceMutationAccess(rawParams, canonicalAccess);
      const sanitizedParams = withoutFlowboardWorkspaceAccess(rawParams);
      const constrainedParams =
        tool.name === "flowboard_create"
          ? withFlowboardWorkspaceAccess(sanitizedParams, canonicalAccess)
          : tool.name === "flowboard_decompose"
            ? withFlowboardDecomposeWorkspaceAccess(sanitizedParams, canonicalAccess)
            : tool.name === "flowboard_specify" &&
                containsFlowboardWorkspaceMutation(sanitizedParams)
              ? withFlowboardWorkspaceAccess(sanitizedParams, canonicalAccess)
              : sanitizedParams;
      return await tool.execute(toolCallId, constrainedParams, signal, onUpdate);
    },
  }));
}
