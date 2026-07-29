import {
  FLOWBOARD_STATUSES,
  type FlowboardCard,
  type FlowboardStatus,
} from "../../contract/index.js";
// Flowboard plugin module implements command behavior.
import type { OpenClawPluginApi } from "../api.js";
import { resolveFlowboardCardByIdOrPrefix } from "./card-lookup.js";
import {
  dispatchAndStartFlowboardCards,
  type FlowboardSubagentRuntime,
  type FlowboardWorktreeRuntime,
} from "./dispatcher.js";
import type { FlowboardStore } from "./store.js";
import {
  canonicalizeFlowboardWorkspaceAccess,
  resolveAgentFlowboardWorkspaceRuntime,
  resolveCommandFlowboardWorkspaceAccess,
  resolveFlowboardAgentWorkspace,
  type FlowboardTargetWorkspaceRuntime,
  type FlowboardWorkspaceAccess,
} from "./workspace-access.js";

const ADMIN_SCOPE = "operator.admin";
const WRITE_SCOPE = "operator.write";

type FlowboardCommandApi = {
  runtime: {
    subagent: FlowboardSubagentRuntime;
    worktrees: FlowboardWorktreeRuntime;
  };
};

type RuntimeSandboxSurface = {
  prepareWorkspaceAuthority?: Parameters<typeof resolveAgentFlowboardWorkspaceRuntime>[0]["prepareSandboxWorkspaceAuthority"];
  resolveWorkspaceAuthority?: Parameters<typeof resolveCommandFlowboardWorkspaceAccess>[0]["resolveSandboxWorkspaceAuthority"];
};

function splitArgs(input: string | undefined): string[] {
  return (input ?? "").trim().split(/\s+/).filter(Boolean);
}

function formatCardLine(card: FlowboardCard): string {
  const boardId = card.metadata?.automation?.boardId ?? "default";
  const milestone = card.milestoneId ? `/${card.milestoneId.slice(0, 8)}` : "/unassigned";
  const agent = card.agentId ? ` @${card.agentId}` : "";
  return `${card.id.slice(0, 8)} ${card.status.padEnd(8)} ${card.priority.padEnd(6)} [${boardId}${milestone}]${agent} ${card.title}`;
}

function formatCardDetails(card: FlowboardCard): string {
  const lines = [
    card.title,
    `id: ${card.id}`,
    `status: ${card.status}`,
    `priority: ${card.priority}`,
    `board: ${card.metadata?.automation?.boardId ?? "default"}`,
    `milestone: ${card.milestoneId ?? "unassigned"}`,
  ];
  if (card.agentId) {
    lines.push(`agent: ${card.agentId}`);
  }
  if (card.sessionKey) {
    lines.push(`session: ${card.sessionKey}`);
  }
  if (card.runId) {
    lines.push(`run: ${card.runId}`);
  }
  if (card.notes) {
    lines.push("", card.notes);
  }
  return lines.join("\n");
}

function normalizeTitle(tokens: string[]): string {
  return tokens.join(" ").trim();
}

function optionValue(tokens: string[], flag: string): string | undefined {
  const index = tokens.indexOf(flag);
  return index >= 0 ? tokens[index + 1] : undefined;
}

function withoutOption(tokens: string[], flag: string): string[] {
  const index = tokens.indexOf(flag);
  return index >= 0 ? [...tokens.slice(0, index), ...tokens.slice(index + 2)] : tokens;
}

function isFlowboardStatus(value: string): value is FlowboardStatus {
  return (FLOWBOARD_STATUSES as readonly string[]).includes(value);
}

function canMutateFlowboard(params: {
  senderIsOwner?: boolean;
  gatewayClientScopes?: readonly string[];
}): boolean {
  const scopes = params.gatewayClientScopes;
  if (scopes) {
    return scopes.includes(ADMIN_SCOPE) || scopes.includes(WRITE_SCOPE);
  }
  return params.senderIsOwner === true;
}

function requireWriteAccess(params: {
  senderIsOwner?: boolean;
  gatewayClientScopes?: readonly string[];
}): { text: string; isError: true } | undefined {
  if (canMutateFlowboard(params)) {
    return undefined;
  }
  return {
    text: `This command requires gateway scope: ${WRITE_SCOPE}.`,
    isError: true,
  };
}

async function handleFlowboardCommand(params: {
  api: FlowboardCommandApi;
  store: FlowboardStore;
  args?: string;
  senderIsOwner?: boolean;
  gatewayClientScopes?: readonly string[];
  resolveAgentWorkspace?: (agentId?: string) => string;
  resolveAgentWorkspaceRuntime?: (
    agentId: string | undefined,
    sessionKey: string,
    workspaceDir: string,
    modelProvider?: string,
    modelId?: string,
  ) => FlowboardTargetWorkspaceRuntime | Promise<FlowboardTargetWorkspaceRuntime>;
  workspaceAccess?: FlowboardWorkspaceAccess;
}): Promise<{ text: string; isError?: boolean }> {
  const [action = "list", ...rest] = splitArgs(params.args);
  if (action === "help") {
    return {
      text: [
        "/flowboard list",
        "/flowboard show <card-id>",
        "/flowboard create <title>",
        "/flowboard move <card-id> --status <status>",
        "/flowboard project list",
        "/flowboard project create <id> <name> --milestone <title>",
        "/flowboard project milestone move-card <card-id> --milestone <id|unassigned>",
        "/flowboard dispatch",
      ].join("\n"),
    };
  }
  if (action === "list") {
    const cards = (await params.store.list()).filter((card) => !card.metadata?.archivedAt);
    const rows = cards.slice(0, 12).map(formatCardLine);
    return { text: rows.length ? rows.join("\n") : "No Flowboard cards." };
  }
  if (action === "show" || action === "read") {
    const id = rest[0];
    if (!id) {
      return { text: "Usage: /flowboard show <card-id>", isError: true };
    }
    const cards = await params.store.list();
    const { card, error } = resolveFlowboardCardByIdOrPrefix(cards, id);
    return card ? { text: formatCardDetails(card) } : { text: error, isError: true };
  }
  if (action === "create") {
    const accessError = requireWriteAccess(params);
    if (accessError) {
      return accessError;
    }
    const boardId = optionValue(rest, "--board");
    const milestoneId = optionValue(rest, "--milestone");
    const title = normalizeTitle(withoutOption(withoutOption(rest, "--board"), "--milestone"));
    if (!title) {
      return { text: "Usage: /flowboard create <title>", isError: true };
    }
    const workspaceAccess = await canonicalizeFlowboardWorkspaceAccess(
      params.workspaceAccess ?? { unrestricted: true },
    );
    const card = await params.store.create({ title, boardId, milestoneId, workspaceAccess });
    return { text: `Created ${card.id.slice(0, 8)} ${card.title}` };
  }
  if (action === "project") {
    const accessError = requireWriteAccess(params);
    if (accessError) {
      return accessError;
    }
    const [projectAction = "list", ...projectArgs] = rest;
    if (projectAction === "list") {
      const projects = await params.store.listProjects();
      return {
        text: projects.projects.length
          ? projects.projects
              .map((project) => `${project.id} ${project.name ?? project.id}`)
              .join("\n")
          : "No Flowboard projects.",
      };
    }
    if (projectAction === "create") {
      const id = projectArgs[0];
      const milestoneTitle = optionValue(projectArgs, "--milestone");
      const name = normalizeTitle(withoutOption(projectArgs.slice(1), "--milestone"));
      if (!id || !name || !milestoneTitle) {
        return {
          text: "Usage: /flowboard project create <id> <name> --milestone <title>",
          isError: true,
        };
      }
      const project = await params.store.createProject({
        id,
        name,
        initialMilestoneTitle: milestoneTitle,
      });
      return { text: `Created project ${project.board.id}.` };
    }
    if (projectAction === "milestone") {
      const [milestoneAction, ...milestoneArgs] = projectArgs;
      if (milestoneAction === "move-card") {
        const cardId = milestoneArgs[0];
        const milestoneId = optionValue(milestoneArgs, "--milestone");
        if (!cardId || !milestoneId) {
          return {
            text: "Usage: /flowboard project milestone move-card <card-id> --milestone <id|unassigned>",
            isError: true,
          };
        }
        const { card, error } = resolveFlowboardCardByIdOrPrefix(
          await params.store.list(),
          cardId,
        );
        if (!card) {
          return { text: error, isError: true };
        }
        return {
          text: formatCardLine(
            await params.store.moveMilestone(card.id, {
              milestoneId: milestoneId === "unassigned" ? undefined : milestoneId,
            }),
          ),
        };
      }
      return {
        text: "Usage: /flowboard project milestone move-card <card-id> --milestone <id|unassigned>",
        isError: true,
      };
    }
    return { text: `Unknown Flowboard project action: ${projectAction}`, isError: true };
  }
  if (action === "move") {
    const accessError = requireWriteAccess(params);
    if (accessError) {
      return accessError;
    }
    const id = rest[0];
    const statusIndex = rest.indexOf("--status");
    const status = statusIndex >= 0 ? rest[statusIndex + 1] : undefined;
    if (!id || !status) {
      return {
        text: "Usage: /flowboard move <card-id> --status <status>",
        isError: true,
      };
    }
    if (!isFlowboardStatus(status)) {
      return {
        text: `status must be one of: ${FLOWBOARD_STATUSES.join(", ")}.`,
        isError: true,
      };
    }
    const cards = await params.store.list();
    const { card, error } = resolveFlowboardCardByIdOrPrefix(cards, id);
    if (!card) {
      return { text: error, isError: true };
    }
    return { text: formatCardLine(await params.store.move(card.id, status, undefined)) };
  }
  if (action === "dispatch") {
    const accessError = requireWriteAccess(params);
    if (accessError) {
      return accessError;
    }
    const workspaceAccess = params.workspaceAccess ?? { unrestricted: true };
    const result = await dispatchAndStartFlowboardCards({
      store: params.store,
      subagent: params.api.runtime.subagent,
      worktrees: params.api.runtime.worktrees,
      options: {
        materializeWorktree: true,
        resolveAgentWorkspace: params.resolveAgentWorkspace,
        resolveAgentWorkspaceRuntime: params.resolveAgentWorkspaceRuntime,
        workspaceAccess,
      },
    });
    return {
      text: [
        `dispatch: started=${result.started.length} failures=${result.startFailures.length} promoted=${result.promoted.length} blocked=${result.blocked.length}`,
        ...result.started.map((run) => `started ${run.cardId.slice(0, 8)} run=${run.runId}`),
        ...result.startFailures.map(
          (failure) => `failed ${failure.cardId.slice(0, 8)} ${failure.error}`,
        ),
      ].join("\n"),
    };
  }
  return { text: `Unknown Flowboard action: ${action}`, isError: true };
}

export function registerFlowboardCommand(params: {
  api: OpenClawPluginApi;
  store: FlowboardStore;
}): void {
  const sandbox = (params.api.runtime as unknown as { sandbox?: RuntimeSandboxSurface }).sandbox;
  params.api.registerCommand({
    name: "flowboard",
    description: "List, create, inspect, and dispatch Flowboard cards.",
    acceptsArgs: true,
    exposeSenderIsOwner: true,
    handler: async (ctx) =>
      await handleFlowboardCommand({
        api: params.api,
        store: params.store,
        args: ctx.args,
        senderIsOwner: ctx.senderIsOwner,
        gatewayClientScopes: ctx.gatewayClientScopes,
        resolveAgentWorkspace: (agentId) => resolveFlowboardAgentWorkspace(ctx.config, agentId),
        resolveAgentWorkspaceRuntime: (agentId, sessionKey, workspaceDir, modelProvider, modelId) =>
          resolveAgentFlowboardWorkspaceRuntime({
            config: ctx.config,
            agentId,
            sessionKey,
            workspaceDir,
            modelProvider,
            modelId,
            prepareSandboxWorkspaceAuthority: sandbox?.prepareWorkspaceAuthority,
          }),
        workspaceAccess: resolveCommandFlowboardWorkspaceAccess({
          config: ctx.config,
          agentId: ctx.agentId,
          sessionKey: ctx.sessionKey,
          gatewayClientScopes: ctx.gatewayClientScopes,
          resolveSandboxWorkspaceAuthority: sandbox?.resolveWorkspaceAuthority,
        }),
      }),
  });
}
