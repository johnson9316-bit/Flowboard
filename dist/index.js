var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/backend/src/card-redaction.ts
function redactClaimToken(card) {
  const claim = card.metadata?.claim;
  if (!claim) {
    return card;
  }
  return {
    ...card,
    metadata: {
      ...card.metadata,
      claim: {
        ...claim,
        token: "[redacted]"
      }
    }
  };
}
var init_card_redaction = __esm({
  "src/backend/src/card-redaction.ts"() {
    "use strict";
  }
});

// src/contract/index.ts
function isValidFlowboardBoardId(value) {
  return typeof value === "string" && FLOWBOARD_BOARD_ID_PATTERN.test(value);
}
var FLOWBOARD_STATUSES, FLOWBOARD_PRIORITIES, FLOWBOARD_EXECUTION_MODES, FLOWBOARD_EXECUTION_STATUSES, FLOWBOARD_EVENT_KINDS, FLOWBOARD_ATTEMPT_STATUSES, FLOWBOARD_LINK_TYPES, FLOWBOARD_PROOF_STATUSES, FLOWBOARD_TEMPLATE_IDS, FLOWBOARD_DIAGNOSTIC_KINDS, FLOWBOARD_DIAGNOSTIC_SEVERITIES, FLOWBOARD_NOTIFICATION_KINDS, FLOWBOARD_MILESTONE_STATES, FLOWBOARD_PROJECT_DOCUMENT_SECTIONS, FLOWBOARD_PROJECT_DOCUMENT_TYPES, FLOWBOARD_DELIVERY_IMPLEMENTATION_STATES, FLOWBOARD_DELIVERY_VERIFICATION_STATES, FLOWBOARD_DELIVERY_RELEASE_STATES, FLOWBOARD_BOARD_ID_PATTERN;
var init_contract = __esm({
  "src/contract/index.ts"() {
    "use strict";
    FLOWBOARD_STATUSES = [
      "triage",
      "backlog",
      "todo",
      "scheduled",
      "ready",
      "running",
      "review",
      "blocked",
      "done"
    ];
    FLOWBOARD_PRIORITIES = ["low", "normal", "high", "urgent"];
    FLOWBOARD_EXECUTION_MODES = ["autonomous", "manual"];
    FLOWBOARD_EXECUTION_STATUSES = [
      "idle",
      "running",
      "review",
      "blocked",
      "done"
    ];
    FLOWBOARD_EVENT_KINDS = [
      "created",
      "edited",
      "moved",
      "milestone_moved",
      "linked",
      "specified",
      "decomposed",
      "claimed",
      "heartbeat",
      "execution_updated",
      "attempt_started",
      "attempt_updated",
      "comment_added",
      "link_added",
      "proof_added",
      "artifact_added",
      "attachment_added",
      "diagnostic",
      "notification",
      "dispatch",
      "orchestration",
      "protocol_violation",
      "archived",
      "unarchived",
      "stale"
    ];
    FLOWBOARD_ATTEMPT_STATUSES = [
      "running",
      "succeeded",
      "failed",
      "blocked",
      "stopped"
    ];
    FLOWBOARD_LINK_TYPES = [
      "parent",
      "child",
      "blocks",
      "blocked_by",
      "relates_to"
    ];
    FLOWBOARD_PROOF_STATUSES = ["passed", "failed", "skipped", "unknown"];
    FLOWBOARD_TEMPLATE_IDS = ["bugfix", "docs", "release", "pr_review", "plugin"];
    FLOWBOARD_DIAGNOSTIC_KINDS = [
      "stranded_ready",
      "running_without_heartbeat",
      "blocked_too_long",
      "repeated_failures",
      "missing_proof",
      "orphaned_session"
    ];
    FLOWBOARD_DIAGNOSTIC_SEVERITIES = ["warning", "error", "critical"];
    FLOWBOARD_NOTIFICATION_KINDS = ["completed", "failed", "stale"];
    FLOWBOARD_MILESTONE_STATES = ["active", "completed", "archived"];
    FLOWBOARD_PROJECT_DOCUMENT_SECTIONS = [
      "project",
      "codebase",
      "environment",
      "knowledge"
    ];
    FLOWBOARD_PROJECT_DOCUMENT_TYPES = [
      "markdown",
      "json",
      "link",
      "path",
      "secret_ref"
    ];
    FLOWBOARD_DELIVERY_IMPLEMENTATION_STATES = [
      "not_started",
      "in_progress",
      "code_complete",
      "not_applicable",
      "unknown"
    ];
    FLOWBOARD_DELIVERY_VERIFICATION_STATES = [
      "not_started",
      "partial",
      "passed",
      "failed",
      "human_required",
      "not_required",
      "unknown"
    ];
    FLOWBOARD_DELIVERY_RELEASE_STATES = [
      "not_started",
      "pending",
      "released",
      "not_required",
      "unknown"
    ];
    FLOWBOARD_BOARD_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,79}$/;
  }
});

// src/backend/src/card-lookup.ts
function resolveFlowboardCardByIdOrPrefix(cards, id) {
  const exact = cards.find((card2) => card2.id === id);
  if (exact) {
    return { card: exact };
  }
  const matches = cards.filter((card2) => card2.id.startsWith(id));
  if (matches.length === 0) {
    return { error: `Card not found: ${id}` };
  }
  if (matches.length > 1) {
    return { error: `Ambiguous card id prefix: ${id} (${matches.length} matches)` };
  }
  const card = matches[0];
  return card ? { card } : { error: `Card not found: ${id}` };
}
var init_card_lookup = __esm({
  "src/backend/src/card-lookup.ts"() {
    "use strict";
  }
});

// src/backend/src/cli.ts
var cli_exports = {};
__export(cli_exports, {
  registerFlowboardCli: () => registerFlowboardCli
});
import { formatErrorMessage as formatErrorMessage4 } from "openclaw/plugin-sdk/error-runtime";
import { addGatewayClientOptions, callGatewayFromCli } from "openclaw/plugin-sdk/gateway-runtime";
import { parseStrictPositiveInteger as parseStrictPositiveInteger2 } from "openclaw/plugin-sdk/number-runtime";
import { getRuntimeConfig } from "openclaw/plugin-sdk/runtime-config-snapshot";
import { isRecord } from "openclaw/plugin-sdk/string-coerce-runtime";
function invalidCliArgument(message) {
  const error = new Error(message);
  error.name = "InvalidArgumentError";
  error.code = "commander.invalidArgument";
  error.exitCode = 1;
  return error;
}
function parsePositiveIntegerOption(value, flag) {
  const parsed = parseStrictPositiveInteger2(value);
  if (parsed === void 0) {
    throw invalidCliArgument(`${flag} must be a positive integer.`);
  }
  return parsed;
}
function writeJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}
`);
}
function writeLine(value) {
  process.stdout.write(`${value}
`);
}
function splitLabels(value) {
  return value?.split(",").map((entry) => entry.trim()).filter(Boolean);
}
function isFlowboardStatus2(value) {
  return FLOWBOARD_STATUSES.includes(value);
}
function formatCardLine2(card) {
  const boardId = card.metadata?.automation?.boardId ?? "default";
  const milestone = card.milestoneId ? `/${card.milestoneId.slice(0, 8)}` : "/unassigned";
  const agent = card.agentId ? ` ${card.agentId}` : "";
  return `${card.id.slice(0, 8)}  ${card.status.padEnd(8)}  ${card.priority.padEnd(6)}  ${boardId}${milestone}${agent}  ${card.title}`;
}
function redactDispatchResult(result) {
  return {
    ...result,
    promoted: result.promoted.map(redactClaimToken),
    reclaimed: result.reclaimed.map(redactClaimToken),
    blocked: result.blocked.map(redactClaimToken),
    orchestrated: result.orchestrated.map(redactClaimToken)
  };
}
function writeCards(cards, options) {
  if (options.json) {
    writeJson({ cards: cards.map(redactClaimToken) });
    return;
  }
  for (const card of cards) {
    writeLine(formatCardLine2(card));
  }
}
async function callFlowboardGateway(method, options, params) {
  return await callGatewayFromCli(method, options, params, {
    mode: "cli",
    scopes: options.admin ? ["operator.admin", "operator.write", "operator.read"] : ["operator.write", "operator.read"]
  });
}
function isGatewayUnavailableError(error) {
  const message = formatErrorMessage4(error).toLowerCase();
  if ([
    "econnrefused",
    "econnreset",
    "ehostunreach",
    "enotfound",
    "gateway not connected",
    "gateway unavailable"
  ].some((marker) => message.includes(marker))) {
    return true;
  }
  const unknownMethod = message.match(/unknown method:\s*([a-z0-9._-]+)/)?.[1];
  return unknownMethod === "flowboard.cards.dispatch";
}
function hasExplicitGatewayTarget(options) {
  return Boolean(options.url?.trim() || options.token?.trim());
}
function hasConfiguredRemoteGatewayTarget() {
  if (process.env.OPENCLAW_GATEWAY_URL?.trim()) {
    return true;
  }
  try {
    return getRuntimeConfig().gateway?.mode === "remote";
  } catch {
    return false;
  }
}
function registerFlowboardCli(params) {
  const flowboard = params.program.command("flowboard").description("Manage Flowboard cards and worker dispatch");
  flowboard.command("list").description("List Flowboard cards").option("--board <id>", "Board id").option("--status <status>", "Filter by status").option("--include-archived", "Include archived cards (default false)").option("--json", "Print JSON", false).action(
    async (options) => {
      let cards = await params.store.list({ boardId: options.board });
      if (!options.json && options.includeArchived !== true) {
        cards = cards.filter((card) => !card.metadata?.archivedAt);
      }
      if (options.status) {
        cards = cards.filter((card) => card.status === options.status);
      }
      writeCards(cards, options);
    }
  );
  flowboard.command("create").argument("<title...>", "Card title").description("Create a Flowboard card").option("--notes <text>", "Card notes").option("--status <status>", "Initial status", "todo").option("--priority <priority>", "Priority", "normal").option("--agent <id>", "Assigned agent id").option("--board <id>", "Board id").option("--milestone <id>", "Milestone id; omit for Unassigned").option("--labels <items>", "Comma-separated labels").option("--json", "Print JSON", false).action(
    async (title, options) => {
      const card = await params.store.create({
        title: title.join(" "),
        notes: options.notes,
        status: options.status,
        priority: options.priority,
        agentId: options.agent,
        boardId: options.board,
        milestoneId: options.milestone,
        labels: splitLabels(options.labels),
        workspaceAccess: { unrestricted: true }
      });
      if (options.json) {
        writeJson({ card: redactClaimToken(card) });
      } else {
        writeLine(formatCardLine2(card));
      }
    }
  );
  flowboard.command("show").argument("<id>", "Card id or prefix").description("Show one Flowboard card").option("--json", "Print JSON", false).action(async (id, options) => {
    const cards = await params.store.list();
    const { card, error } = resolveFlowboardCardByIdOrPrefix(cards, id);
    if (!card) {
      throw new Error(error);
    }
    if (options.json) {
      writeJson({ card: redactClaimToken(card) });
    } else {
      writeLine(formatCardLine2(card));
      if (card.notes) {
        writeLine(card.notes);
      }
    }
  });
  const project = flowboard.command("project").description("Manage Flowboard projects");
  project.command("list").option("--archived", "Include archived projects").option("--json", "Print JSON", false).action(async (options) => {
    const result = await params.store.listProjects({ includeArchived: options.archived });
    if (options.json) {
      writeJson(result);
      return;
    }
    for (const entry of result.projects) {
      writeLine(`${entry.id}  ${entry.name ?? entry.id}${entry.archivedAt ? "  archived" : ""}`);
    }
  });
  project.command("create").argument("<id>", "Project id").argument("<name...>", "Project name").requiredOption("--milestone <title>", "Initial milestone title").option("--json", "Print JSON", false).action(async (id, name, options) => {
    const projectView = await params.store.createProject({
      id,
      name: name.join(" "),
      initialMilestoneTitle: options.milestone
    });
    if (options.json) {
      writeJson({ project: projectView });
    } else {
      writeLine(`Created project ${projectView.board.id} with ${projectView.milestones[0]?.title}`);
    }
  });
  project.command("show").argument("<id>", "Project id").option("--json", "Print JSON", false).action(async (id, options) => {
    const projectView = await params.store.getProject(id);
    if (options.json) {
      writeJson({ project: projectView });
    } else {
      writeLine(`${projectView.board.name ?? projectView.board.id} (${projectView.board.id})`);
      for (const milestone2 of projectView.milestones) {
        writeLine(`- ${milestone2.state.padEnd(9)} ${milestone2.title}`);
      }
    }
  });
  project.command("archive").argument("<id>", "Project id").action(async (id) => {
    const result = await params.store.archiveProject(id);
    writeLine(
      `Archived ${result.board.id}${result.runningCards.length ? `; ${result.runningCards.length} running cards remain` : ""}`
    );
  });
  project.command("restore").argument("<id>", "Project id").action(async (id) => {
    const result = await params.store.archiveProject(id, false);
    writeLine(`Restored ${result.board.id}`);
  });
  const milestone = project.command("milestone").description("Manage project milestones");
  milestone.command("list").argument("<project>", "Project id").option("--json", "Print JSON", false).action(async (boardId, options) => {
    const result = await params.store.listMilestones(boardId);
    if (options.json) {
      writeJson(result);
      return;
    }
    for (const entry of result.milestones) {
      writeLine(`${entry.id.slice(0, 8)}  ${entry.state.padEnd(9)}  ${entry.title}`);
    }
  });
  milestone.command("create").argument("<project>", "Project id").argument("<title...>", "Milestone title").action(async (boardId, title) => {
    const created = await params.store.createMilestone({ boardId, title: title.join(" ") });
    writeLine(`Created milestone ${created.id.slice(0, 8)} ${created.title}`);
  });
  milestone.command("move-card").argument("<id>", "Card id or prefix").requiredOption("--milestone <id>", "Target milestone id; use unassigned to clear").action(async (id, options) => {
    const cards = await params.store.list();
    const { card, error } = resolveFlowboardCardByIdOrPrefix(cards, id);
    if (!card) {
      throw new Error(error);
    }
    const updated = await params.store.moveMilestone(card.id, {
      milestoneId: options.milestone === "unassigned" ? void 0 : options.milestone
    });
    writeLine(formatCardLine2(updated));
  });
  const docs = project.command("docs").description("Manage project documents");
  docs.command("list").argument("<project>", "Project id").option("--hidden", "Include hidden documents").option("--json", "Print JSON", false).action(async (boardId, options) => {
    const result = await params.store.listProjectDocuments(boardId, {
      includeHidden: options.hidden
    });
    if (options.json) {
      writeJson(result);
      return;
    }
    for (const document of result.documents) {
      writeLine(`${document.section.padEnd(12)} ${document.key.padEnd(20)} ${document.title}`);
    }
  });
  flowboard.command("move").argument("<id>", "Card id or prefix").description("Move a Flowboard card to another status").requiredOption("--status <status>", "Target status").option("--json", "Print JSON", false).action(async (id, options) => {
    if (!isFlowboardStatus2(options.status)) {
      throw new Error(`--status must be one of: ${FLOWBOARD_STATUSES.join(", ")}.`);
    }
    const cards = await params.store.list();
    const { card, error } = resolveFlowboardCardByIdOrPrefix(cards, id);
    if (!card) {
      throw new Error(error);
    }
    const updated = await params.store.move(card.id, options.status, void 0);
    if (options.json) {
      writeJson({ card: redactClaimToken(updated) });
    } else {
      writeLine(formatCardLine2(updated));
    }
  });
  addGatewayClientOptions(
    flowboard.command("dispatch").description("Promote ready cards and start worker runs through the Gateway").option("--board <id>", "Dispatch a single board").option(
      "--max-starts <count>",
      "Maximum new worker runs to start in this pass (default 3)",
      (value) => parsePositiveIntegerOption(value, "--max-starts")
    ).option("--admin", "Request full-host workspace access", false).option("--json", "Print JSON", false)
  ).action(async (options) => {
    try {
      const method = options.maxStarts === void 0 ? "flowboard.cards.dispatch" : "flowboard.cards.dispatchWithOptions";
      const result = await callFlowboardGateway(method, options, {
        boardId: options.board,
        ...options.maxStarts !== void 0 ? { maxStarts: options.maxStarts } : {}
      });
      if (options.json) {
        writeJson(result);
      } else {
        const record = isRecord(result) ? result : {};
        const started = Array.isArray(record.started) ? record.started.length : 0;
        const failures = Array.isArray(record.startFailures) ? record.startFailures.length : 0;
        writeLine(`dispatch complete: started=${started} failures=${failures}`);
      }
    } catch (error) {
      if (!isGatewayUnavailableError(error) || hasExplicitGatewayTarget(options) || hasConfiguredRemoteGatewayTarget()) {
        throw error;
      }
      const result = redactDispatchResult(await params.store.dispatch({ boardId: options.board }));
      if (options.json) {
        writeJson({ ...result, gatewayUnavailable: true });
      } else {
        writeLine(
          `gateway unavailable; data dispatch only: promoted=${result.promoted.length} blocked=${result.blocked.length}`
        );
      }
    }
  });
}
var init_cli = __esm({
  "src/backend/src/cli.ts"() {
    "use strict";
    init_contract();
    init_card_lookup();
    init_card_redaction();
  }
});

// src/backend/api.ts
import {
  definePluginEntry
} from "openclaw/plugin-sdk/plugin-entry";

// src/backend/src/gateway.ts
init_card_redaction();
import { resolveDefaultAgentId as resolveDefaultAgentId2 } from "openclaw/plugin-sdk/agent-runtime";

// src/backend/src/card-execution.ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { formatErrorMessage as formatErrorMessage2 } from "openclaw/plugin-sdk/error-runtime";
import { canonicalPathFromExistingAncestor as canonicalPathFromExistingAncestor4 } from "openclaw/plugin-sdk/security-runtime";

// src/backend/src/dispatcher-workspace.ts
import { canonicalPathFromExistingAncestor as canonicalPathFromExistingAncestor2 } from "openclaw/plugin-sdk/security-runtime";

// src/backend/src/workspace-access.ts
import {
  listAgentIds,
  resolveAgentConfig,
  resolveAgentWorkspaceDir,
  resolveDefaultAgentId
} from "openclaw/plugin-sdk/agent-runtime";
import {
  canonicalPathFromExistingAncestor,
  isPathInside
} from "openclaw/plugin-sdk/security-runtime";
var FLOWBOARD_TOOL_NAMES = [
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
  "flowboard_project_document_create"
];
var FLOWBOARD_REQUIRED_WORKER_TOOLS = [
  "flowboard_heartbeat",
  "flowboard_complete",
  "flowboard_block"
];
function resolveFlowboardAgentWorkspace(config, agentId) {
  return resolveAgentWorkspaceDir(config, agentId ?? resolveDefaultAgentId(config));
}
function resolveConfiguredFlowboardWorkspaceAccess(params) {
  if (params.unrestricted) {
    return { unrestricted: true };
  }
  return {
    unrestricted: false,
    writable: true,
    roots: listAgentIds(params.config).map(
      (agentId) => resolveAgentWorkspaceDir(params.config, agentId)
    )
  };
}
async function resolveAgentFlowboardWorkspaceRuntime(params) {
  const agentId = params.agentId ?? resolveDefaultAgentId(params.config);
  const sandboxRuntime = params.prepareSandboxWorkspaceAuthority ? await params.prepareSandboxWorkspaceAuthority({
    config: params.config,
    agentId,
    confinedToolNames: FLOWBOARD_TOOL_NAMES,
    requiredToolNames: FLOWBOARD_REQUIRED_WORKER_TOOLS,
    modelProvider: params.modelProvider,
    modelId: params.modelId,
    sessionKey: params.sessionKey,
    workspaceDir: params.workspaceDir
  }) : void 0;
  if (!sandboxRuntime) {
    return {
      sandboxed: false,
      workspaceAccess: { unrestricted: true }
    };
  }
  return {
    sandboxed: sandboxRuntime.sandboxed,
    workspaceAccess: sandboxRuntime.sandboxed ? {
      unrestricted: false,
      roots: [resolveAgentWorkspaceDir(params.config, agentId)],
      writable: sandboxRuntime.workspaceAccess === "rw"
    } : { unrestricted: true },
    ...sandboxRuntime.confinementError ? { confinementError: sandboxRuntime.confinementError } : {}
  };
}
function resolveCommandFlowboardWorkspaceAccess(params) {
  if (params.gatewayClientScopes) {
    return resolveConfiguredFlowboardWorkspaceAccess({
      config: params.config,
      unrestricted: params.gatewayClientScopes.includes("operator.admin")
    });
  }
  const agentId = params.agentId ?? resolveDefaultAgentId(params.config);
  const sandboxRuntime = params.sessionKey && params.resolveSandboxWorkspaceAuthority ? params.resolveSandboxWorkspaceAuthority({
    config: params.config,
    agentId,
    sessionKey: params.sessionKey
  }) : void 0;
  if (sandboxRuntime?.sandboxed) {
    return {
      unrestricted: false,
      roots: [resolveAgentWorkspaceDir(params.config, agentId)],
      writable: sandboxRuntime.workspaceAccess === "rw"
    };
  }
  const workspaceOnly = resolveAgentConfig(params.config, agentId)?.tools?.fs?.workspaceOnly ?? params.config.tools?.fs?.workspaceOnly;
  return workspaceOnly === true ? {
    unrestricted: false,
    roots: [resolveAgentWorkspaceDir(params.config, agentId)],
    writable: true
  } : { unrestricted: true };
}
function resolveToolFlowboardWorkspaceAccess(context, resolveSandboxWorkspaceAuthority) {
  if (!context?.sandboxed && context?.fsPolicy?.workspaceOnly !== true) {
    return { unrestricted: true };
  }
  const config = context.runtimeConfig ?? context.getRuntimeConfig?.() ?? context.config;
  const sandboxRuntime = context.sandboxed && config && context.sessionKey && resolveSandboxWorkspaceAuthority ? resolveSandboxWorkspaceAuthority({
    config,
    agentId: context.agentId,
    sessionKey: context.sessionKey
  }) : void 0;
  return {
    unrestricted: false,
    roots: context.workspaceDir ? [context.workspaceDir] : [],
    writable: sandboxRuntime ? sandboxRuntime.workspaceAccess === "rw" : !context.sandboxed
  };
}
async function canonicalizeFlowboardWorkspaceAccess(access) {
  if (access.unrestricted) {
    return access;
  }
  const roots = Array.from(
    new Set(
      await Promise.all(
        access.roots.map(async (root) => await canonicalPathFromExistingAncestor(root))
      )
    )
  );
  if (roots.length === 0) {
    throw new Error("restricted workspace access has no allowed roots.");
  }
  return { unrestricted: false, roots, writable: access.writable };
}
function intersectFlowboardWorkspaceAccess(left, right) {
  if (left.unrestricted) {
    return right;
  }
  if (right.unrestricted) {
    return left;
  }
  const roots = /* @__PURE__ */ new Set();
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
    writable: left.writable && right.writable
  };
}
async function assertCanonicalFlowboardPathAccess(candidate, access) {
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
async function assertCanonicalFlowboardRootAccess(candidate, access) {
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
async function assertPathAllowed(value, access) {
  if (typeof value !== "string" || !value.trim()) {
    return void 0;
  }
  const candidate = await canonicalPathFromExistingAncestor(value.trim());
  return await assertCanonicalFlowboardPathAccess(candidate, access);
}
async function assertWorkspaceAllowed(value, access, options) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return void 0;
  }
  const workspace = value;
  if (options?.sourceOnly) {
    return await assertPathAllowed(workspace.sourcePath ?? workspace.path, access);
  }
  await assertPathAllowed(workspace.path, access);
  await assertPathAllowed(workspace.sourcePath, access);
  return void 0;
}
function readRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : void 0;
}
function containsFlowboardWorkspaceMutation(value) {
  const record = readRecord(value);
  if (!record) {
    return false;
  }
  if (Object.hasOwn(record, "workspace") || Object.hasOwn(record, "defaultWorkspace")) {
    return true;
  }
  return containsFlowboardWorkspaceMutation(record.patch) || containsFlowboardWorkspaceMutation(readRecord(record.metadata)?.automation) || Array.isArray(record.children) && record.children.some((child) => containsFlowboardWorkspaceMutation(child));
}
function withFlowboardWorkspaceAccess(value, access) {
  return { ...withoutFlowboardWorkspaceAccess(value), workspaceAccess: access };
}
function withoutFlowboardWorkspaceAccess(value) {
  const record = readRecord(value) ?? {};
  const { workspaceAccess: _untrustedWorkspaceAccess, ...rest } = record;
  return rest;
}
function withFlowboardDecomposeWorkspaceAccess(value, access) {
  const record = withoutFlowboardWorkspaceAccess(value);
  return {
    ...record,
    ...Array.isArray(record.children) ? {
      children: record.children.map((child) => withFlowboardWorkspaceAccess(child, access))
    } : {}
  };
}
async function assertFlowboardWorkspaceMutationAccess(value, access) {
  if (access.unrestricted) {
    return;
  }
  const record = readRecord(value);
  if (!record) {
    return;
  }
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
async function assertFlowboardWorkspaceSourceAccess(workspace, access) {
  return await assertWorkspaceAllowed(workspace, access, { sourceOnly: true });
}
function guardFlowboardToolsForWorkspaceAccess(tools, context, resolveSandboxWorkspaceAuthority) {
  const workspaceAccess = resolveToolFlowboardWorkspaceAccess(
    context,
    resolveSandboxWorkspaceAuthority
  );
  return tools.map((tool) => ({
    ...tool,
    execute: async (toolCallId, rawParams, signal, onUpdate) => {
      const canonicalAccess = await canonicalizeFlowboardWorkspaceAccess(workspaceAccess);
      await assertFlowboardWorkspaceMutationAccess(rawParams, canonicalAccess);
      const sanitizedParams = withoutFlowboardWorkspaceAccess(rawParams);
      const constrainedParams = tool.name === "flowboard_create" ? withFlowboardWorkspaceAccess(sanitizedParams, canonicalAccess) : tool.name === "flowboard_decompose" ? withFlowboardDecomposeWorkspaceAccess(sanitizedParams, canonicalAccess) : tool.name === "flowboard_specify" && containsFlowboardWorkspaceMutation(sanitizedParams) ? withFlowboardWorkspaceAccess(sanitizedParams, canonicalAccess) : sanitizedParams;
      return await tool.execute(toolCallId, constrainedParams, signal, onUpdate);
    }
  }));
}

// src/backend/src/dispatcher-workspace.ts
function managedWorktreeName(cardId) {
  const suffix = cardId.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
  return `wb-${suffix}`.slice(0, 64).replace(/-$/, "");
}
async function cleanupFlowboardRunWorktree(params) {
  const card = (await params.store.list()).find((entry) => entry.runId === params.runId);
  const workspace = card?.metadata?.automation?.workspace;
  if (!card || workspace?.kind !== "worktree" || !workspace.path) {
    return;
  }
  await params.worktrees.removeIfLossless({
    path: workspace.path
  });
}
async function resolveDispatchWorkspaceAccess(params) {
  const currentAccess = await canonicalizeFlowboardWorkspaceAccess(
    params.currentAccess ?? { unrestricted: true }
  );
  const persistedAccess = params.card.metadata?.automation?.workspaceAccess;
  const workspace = params.card.metadata?.automation?.workspace;
  let targetWorkspace;
  if (!persistedAccess?.unrestricted || !currentAccess.unrestricted) {
    const resolved = params.resolveAgentWorkspace?.(params.card.agentId);
    targetWorkspace = resolved ? await canonicalPathFromExistingAncestor2(resolved) : void 0;
  }
  const cardAccess = persistedAccess ? await canonicalizeFlowboardWorkspaceAccess(persistedAccess) : currentAccess.unrestricted ? !workspace || workspace.kind === "scratch" ? currentAccess : (() => {
    throw new Error(
      "card workspace authority is unknown; re-save its workspace with current permissions before dispatch."
    );
  })() : currentAccess;
  const workspaceAccess = intersectFlowboardWorkspaceAccess(cardAccess, currentAccess);
  if (!workspaceAccess.unrestricted && !workspaceAccess.writable) {
    throw new Error(
      "card workspace authority is read-only; manual movement is allowed but worker dispatch requires write access."
    );
  }
  return {
    workspaceAccess,
    ...targetWorkspace ? { targetWorkspace } : {},
    persistWorkspaceAccess: !persistedAccess
  };
}
async function assertRestrictedFlowboardTarget(params) {
  const resolved = params.resolveAgentWorkspaceRuntime ? await params.resolveAgentWorkspaceRuntime(
    params.agentId,
    params.sessionKey,
    params.root,
    params.modelProvider,
    params.modelId
  ) : {
    sandboxed: false,
    workspaceAccess: { unrestricted: true }
  };
  const targetRuntime = {
    ...resolved,
    workspaceAccess: await canonicalizeFlowboardWorkspaceAccess(resolved.workspaceAccess)
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

// src/backend/src/dispatcher.ts
import path from "node:path";
import { formatErrorMessage } from "openclaw/plugin-sdk/error-runtime";
import { isFutureDateTimestampMs } from "openclaw/plugin-sdk/number-runtime";
import { canonicalPathFromExistingAncestor as canonicalPathFromExistingAncestor3 } from "openclaw/plugin-sdk/security-runtime";

// src/backend/src/store-card-helpers.ts
init_contract();
import { randomUUID as randomUUID2 } from "node:crypto";
import { safeEqualSecret } from "openclaw/plugin-sdk/security-runtime";
import { truncateUtf16Safe } from "openclaw/plugin-sdk/text-utility-runtime";

// src/backend/src/store-constants.ts
import {
  MAX_DATE_TIMESTAMP_MS,
  resolveExpiresAtMsFromDurationMs
} from "openclaw/plugin-sdk/number-runtime";
var POSITION_STEP = 1e3;
var MAX_CARDS = 2e3;
var MAX_CARD_EVENTS = 50;
var MAX_CARD_ATTEMPTS = 30;
var MAX_CARD_COMMENTS = 50;
var MAX_CARD_LINKS = 50;
var MAX_CARD_PROOF = 40;
var MAX_CARD_ARTIFACTS = 40;
var MAX_CARD_ATTACHMENTS = 20;
var MAX_ATTACHMENT_ENTRIES = MAX_CARDS * (MAX_CARD_ATTACHMENTS + 1);
var MAX_CARD_WORKER_LOGS = 40;
var MAX_ATTACHMENT_BYTES = 256 * 1024;
var MAX_CARD_DIAGNOSTICS = 12;
var MAX_CARD_NOTIFICATIONS = 20;
var MAX_CARD_METADATA_BYTES = 24 * 1024;
var DEFAULT_CLAIM_TTL_MS = 30 * 60 * 1e3;
var READY_STRANDED_MS = 60 * 60 * 1e3;
var RUNNING_HEARTBEAT_STALE_MS = 20 * 60 * 1e3;
var BLOCKED_TOO_LONG_MS = 24 * 60 * 60 * 1e3;
var CLAIM_RECLAIM_MS = 5 * 60 * 1e3;
function isFlowboardClaimReclaimable(claim, now) {
  return Boolean(claim?.expiresAt && now - claim.expiresAt > CLAIM_RECLAIM_MS);
}
function secondsToDurationMs(seconds) {
  const ms = Math.trunc(seconds) * 1e3;
  return Number.isFinite(ms) ? Math.min(MAX_DATE_TIMESTAMP_MS, Math.max(1, ms)) : MAX_DATE_TIMESTAMP_MS;
}
function addFlowboardDurationMs(now, durationMs) {
  return resolveExpiresAtMsFromDurationMs(durationMs, { nowMs: now }) ?? MAX_DATE_TIMESTAMP_MS;
}

// src/backend/src/store-normalizers.ts
init_contract();
import { randomUUID } from "node:crypto";

// src/backend/src/workspace-path.ts
function isAbsoluteWorkspacePath(value) {
  return value.startsWith("/") || /^[A-Za-z]:[\\/]/.test(value) || /^\\\\[^\\]+\\[^\\]+/.test(value);
}

// src/backend/src/store-normalizers.ts
function normalizeOptionalString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : void 0;
}
function normalizeBoardId(value, fallback) {
  const raw = normalizeBoundedString(value, fallback, 80, "board id");
  if (!raw) {
    return void 0;
  }
  const boardId = raw.toLowerCase();
  if (!isValidFlowboardBoardId(boardId)) {
    throw new Error("board id must match [a-z0-9][a-z0-9._-]{0,79}.");
  }
  return boardId;
}
function normalizeBoardIdRequired(value) {
  return normalizeBoardId(value) ?? "default";
}
function normalizeBoardMetadata(input, fallback, now = Date.now()) {
  const id = normalizeBoardId(input.id, fallback?.id) ?? "default";
  const name = normalizeBoundedString(input.name, fallback?.name, 120, "board name");
  const description = normalizeBoundedString(
    input.description,
    fallback?.description,
    1e3,
    "board description"
  );
  const icon = normalizeBoundedString(input.icon, fallback?.icon, 40, "board icon");
  const color = normalizeBoundedString(input.color, fallback?.color, 40, "board color");
  const position = Object.hasOwn(input, "position") ? normalizePosition(input.position, fallback?.position ?? 0) : fallback?.position;
  const version = normalizeBoundedString(input.version, fallback?.version, 120, "project version");
  const currentObjective = normalizeBoundedString(
    input.currentObjective,
    fallback?.currentObjective,
    2e3,
    "current objective"
  );
  const coreValue = normalizeBoundedString(input.coreValue, fallback?.coreValue, 2e3, "core value");
  const sourceOfTruth = Object.hasOwn(input, "sourceOfTruth") ? normalizeExternalUrl(input.sourceOfTruth, fallback?.sourceOfTruth, "source of truth") : fallback?.sourceOfTruth;
  const repositoryUrl = Object.hasOwn(input, "repositoryUrl") ? normalizeExternalUrl(input.repositoryUrl, fallback?.repositoryUrl, "repository URL") : fallback?.repositoryUrl;
  const planningPath = normalizeBoundedString(
    input.planningPath,
    fallback?.planningPath,
    2e3,
    "planning path"
  );
  const homepageUrl = Object.hasOwn(input, "homepageUrl") ? normalizeExternalUrl(input.homepageUrl, fallback?.homepageUrl, "homepage URL") : fallback?.homepageUrl;
  const defaultWorkspace = Object.hasOwn(input, "defaultWorkspace") ? normalizeWorkspace(input.defaultWorkspace, fallback?.defaultWorkspace) : fallback?.defaultWorkspace;
  const orchestration = Object.hasOwn(input, "orchestration") ? normalizeOrchestration(input.orchestration, fallback?.orchestration) : fallback?.orchestration;
  const archivedAt = Object.hasOwn(input, "archived") ? input.archived === false ? void 0 : now : fallback?.archivedAt;
  return {
    id,
    ...name ? { name } : {},
    ...description ? { description } : {},
    ...icon ? { icon } : {},
    ...color ? { color } : {},
    ...position !== void 0 ? { position } : {},
    ...version ? { version } : {},
    ...currentObjective ? { currentObjective } : {},
    ...coreValue ? { coreValue } : {},
    ...sourceOfTruth ? { sourceOfTruth } : {},
    ...repositoryUrl ? { repositoryUrl } : {},
    ...planningPath ? { planningPath } : {},
    ...homepageUrl ? { homepageUrl } : {},
    ...defaultWorkspace ? { defaultWorkspace } : {},
    ...orchestration ? { orchestration } : {},
    createdAt: fallback?.createdAt ?? now,
    updatedAt: now,
    ...archivedAt ? { archivedAt } : {}
  };
}
function normalizeOrchestration(value, fallback) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }
  const record = value;
  const autoDecompose = typeof record.autoDecompose === "boolean" ? record.autoDecompose : fallback?.autoDecompose;
  const autoDecomposePerDispatch = typeof record.autoDecomposePerDispatch === "number" && Number.isFinite(record.autoDecomposePerDispatch) ? Math.max(1, Math.min(20, Math.trunc(record.autoDecomposePerDispatch))) : fallback?.autoDecomposePerDispatch;
  const defaultAssignee = normalizeBoundedString(
    record.defaultAssignee,
    fallback?.defaultAssignee,
    120,
    "default assignee"
  );
  const orchestratorProfile = normalizeBoundedString(
    record.orchestratorProfile,
    fallback?.orchestratorProfile,
    120,
    "orchestrator profile"
  );
  const next = {
    ...autoDecompose !== void 0 ? { autoDecompose } : {},
    ...autoDecomposePerDispatch ? { autoDecomposePerDispatch } : {},
    ...defaultAssignee ? { defaultAssignee } : {},
    ...orchestratorProfile ? { orchestratorProfile } : {}
  };
  return Object.keys(next).length ? next : void 0;
}
function normalizeNotificationKinds(value) {
  if (value == null) {
    return void 0;
  }
  const entries = typeof value === "string" ? value.split(",") : Array.isArray(value) ? value : [];
  const kinds = [];
  for (const entry of entries) {
    const kind = typeof entry === "string" ? entry.trim() : "";
    if (!FLOWBOARD_NOTIFICATION_KINDS.includes(kind)) {
      throw new Error(
        `notification kind must be one of: ${FLOWBOARD_NOTIFICATION_KINDS.join(", ")}.`
      );
    }
    const notificationKind = kind;
    if (!kinds.includes(notificationKind)) {
      kinds.push(notificationKind);
    }
  }
  return kinds.length ? kinds : void 0;
}
function normalizeNotificationSubscription(input, fallback, now = Date.now()) {
  const boardId = normalizeBoardId(input.boardId, fallback?.boardId) ?? "default";
  const cardId = normalizeBoundedString(input.cardId, fallback?.cardId, 120, "card id");
  const sessionKey = normalizeBoundedString(
    input.sessionKey,
    fallback?.sessionKey,
    240,
    "session key"
  );
  const runId = normalizeBoundedString(input.runId, fallback?.runId, 160, "run id");
  const target = normalizeBoundedString(input.target, fallback?.target, 240, "notification target");
  if (!cardId && !sessionKey && !runId && !target) {
    throw new Error("notification subscription needs cardId, sessionKey, runId, or target.");
  }
  const eventKinds = normalizeNotificationKinds(input.eventKinds);
  const preservedFields = {};
  if (fallback) {
    if (fallback.lastEventAt) {
      preservedFields.lastEventAt = fallback.lastEventAt;
    }
    if (fallback.lastEventId) {
      preservedFields.lastEventId = fallback.lastEventId;
    }
    if (fallback.lastEventSequence) {
      preservedFields.lastEventSequence = fallback.lastEventSequence;
    }
    if (fallback.deliveredEventIds?.length) {
      preservedFields.deliveredEventIds = fallback.deliveredEventIds;
    }
  }
  return {
    id: fallback?.id ?? randomUUID(),
    boardId,
    ...cardId ? { cardId } : {},
    ...sessionKey ? { sessionKey } : {},
    ...runId ? { runId } : {},
    ...target ? { target } : {},
    ...eventKinds ? { eventKinds } : {},
    ...preservedFields,
    createdAt: fallback?.createdAt ?? now,
    updatedAt: now
  };
}
function normalizeTitle(value) {
  const title = normalizeOptionalString(value);
  if (!title) {
    throw new Error("title is required.");
  }
  if (title.length > 180) {
    throw new Error("title must be 180 characters or fewer.");
  }
  return title;
}
function normalizeNotes(value) {
  const notes = normalizeOptionalString(value);
  if (!notes) {
    return void 0;
  }
  if (notes.length > 4e3) {
    throw new Error("notes must be 4000 characters or fewer.");
  }
  return notes;
}
function normalizeOptionalBoundedString(value, maxLength, fieldName) {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return void 0;
  }
  if (normalized.length > maxLength) {
    throw new Error(`${fieldName} must be ${maxLength} characters or fewer.`);
  }
  return normalized;
}
function normalizeDeliveryState(value, allowed, fieldName) {
  if (typeof value !== "string" || !value.trim()) {
    return void 0;
  }
  if (!allowed.includes(value)) {
    throw new Error(`${fieldName} must be one of: ${allowed.join(", ")}.`);
  }
  return value;
}
function normalizeDelivery(value, fallback, now = Date.now()) {
  if (value === null) {
    return void 0;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }
  const record = value;
  const readText = (key, maxLength, fieldName) => Object.hasOwn(record, key) ? normalizeOptionalBoundedString(record[key], maxLength, fieldName) : fallback?.[key];
  const implementationState = Object.hasOwn(record, "implementationState") ? normalizeDeliveryState(
    record.implementationState,
    FLOWBOARD_DELIVERY_IMPLEMENTATION_STATES,
    "implementation state"
  ) : fallback?.implementationState;
  const verificationState = Object.hasOwn(record, "verificationState") ? normalizeDeliveryState(
    record.verificationState,
    FLOWBOARD_DELIVERY_VERIFICATION_STATES,
    "verification state"
  ) : fallback?.verificationState;
  const releaseState = Object.hasOwn(record, "releaseState") ? normalizeDeliveryState(
    record.releaseState,
    FLOWBOARD_DELIVERY_RELEASE_STATES,
    "release state"
  ) : fallback?.releaseState;
  const delivery = {
    ...readText("objective", 2e3, "delivery objective") ? { objective: readText("objective", 2e3, "delivery objective") } : {},
    ...readText("deliverySummary", 4e3, "delivery summary") ? { deliverySummary: readText("deliverySummary", 4e3, "delivery summary") } : {},
    ...readText("openItems", 4e3, "delivery open items") ? { openItems: readText("openItems", 4e3, "delivery open items") } : {},
    ...implementationState ? { implementationState } : {},
    ...verificationState ? { verificationState } : {},
    ...releaseState ? { releaseState } : {}
  };
  return Object.keys(delivery).length ? { ...delivery, updatedAt: now } : void 0;
}
function normalizeBoundedString(value, fallback, maxLength, fieldName) {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return fallback;
  }
  if (normalized.length > maxLength) {
    throw new Error(`${fieldName} must be ${maxLength} characters or fewer.`);
  }
  return normalized;
}
function normalizeExternalUrl(value, fallback, fieldName) {
  const normalized = normalizeBoundedString(value, fallback, 2e3, fieldName);
  if (!normalized) {
    return void 0;
  }
  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error(`${fieldName} must be a valid http or https URL.`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`${fieldName} must be a valid http or https URL.`);
  }
  return parsed.toString();
}
function normalizeStatus(value, fallback) {
  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }
  if (FLOWBOARD_STATUSES.includes(value)) {
    return value;
  }
  throw new Error(`status must be one of: ${FLOWBOARD_STATUSES.join(", ")}.`);
}
function normalizePriority(value, fallback) {
  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }
  if (FLOWBOARD_PRIORITIES.includes(value)) {
    return value;
  }
  throw new Error(`priority must be one of: ${FLOWBOARD_PRIORITIES.join(", ")}.`);
}
function normalizeLabels(value, fallback = []) {
  if (value == null) {
    return fallback;
  }
  const entries = typeof value === "string" ? value.split(",") : Array.isArray(value) ? value : void 0;
  if (!entries) {
    throw new Error("labels must be an array or comma-separated string.");
  }
  const labels = [];
  for (const entry of entries) {
    const label = normalizeOptionalString(entry);
    if (!label || labels.includes(label)) {
      continue;
    }
    if (label.length > 40) {
      throw new Error("labels must be 40 characters or fewer.");
    }
    labels.push(label);
    if (labels.length >= 12) {
      break;
    }
  }
  return labels;
}
function normalizeStringList(value, fieldName, maxLength = 80) {
  if (value == null) {
    return [];
  }
  const entries = typeof value === "string" ? value.split(",") : Array.isArray(value) ? value : void 0;
  if (!entries) {
    throw new Error(`${fieldName} must be an array or comma-separated string.`);
  }
  const values = [];
  for (const entry of entries) {
    if (Array.isArray(value) && typeof entry !== "string") {
      throw new Error(`${fieldName} entries must be strings.`);
    }
    const normalized = normalizeBoundedString(entry, void 0, maxLength, fieldName);
    if (normalized && !values.includes(normalized)) {
      values.push(normalized);
    }
    if (values.length > 20) {
      throw new Error(`${fieldName} supports at most 20 entries.`);
    }
  }
  return values;
}
function normalizePosition(value, fallback) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, Math.trunc(value));
}
function normalizePositiveInteger(value, fieldName) {
  if (value == null || value === "") {
    return void 0;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${fieldName} must be a number.`);
  }
  return Math.max(1, Math.trunc(value));
}
function normalizeWorkspace(value, fallback) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }
  const record = value;
  const kind = record.kind === "scratch" || record.kind === "dir" || record.kind === "worktree" ? record.kind : fallback?.kind;
  if (!kind) {
    throw new Error("workspace kind must be scratch, dir, or worktree.");
  }
  const workspacePath = normalizeBoundedString(record.path, fallback?.path, 2e3, "workspace path");
  if (kind === "dir" && (!workspacePath || !isAbsoluteWorkspacePath(workspacePath))) {
    throw new Error("dir workspace path must be absolute.");
  }
  const branch = normalizeBoundedString(record.branch, fallback?.branch, 160, "workspace branch");
  const sourcePath = normalizeBoundedString(
    record.sourcePath,
    fallback?.sourcePath,
    2e3,
    "workspace source path"
  );
  if (sourcePath && !isAbsoluteWorkspacePath(sourcePath)) {
    throw new Error("workspace source path must be absolute.");
  }
  const sourceBranch = normalizeBoundedString(
    record.sourceBranch,
    fallback?.sourceBranch,
    160,
    "workspace source branch"
  );
  return {
    kind,
    ...workspacePath ? { path: workspacePath } : {},
    ...branch ? { branch } : {},
    ...kind === "worktree" && sourcePath ? { sourcePath } : {},
    ...kind === "worktree" && sourceBranch ? { sourceBranch } : {}
  };
}
function normalizeAutomation(value, fallback = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return Object.keys(fallback).length ? fallback : void 0;
  }
  const record = value;
  const tenant = normalizeBoundedString(record.tenant, fallback.tenant, 80, "tenant");
  const boardId = Object.hasOwn(record, "boardId") ? normalizeBoardId(record.boardId, fallback.boardId) : fallback.boardId;
  const createdByCardId = normalizeBoundedString(
    record.createdByCardId,
    fallback.createdByCardId,
    120,
    "created by card id"
  );
  const idempotencyKey = normalizeBoundedString(
    record.idempotencyKey,
    fallback.idempotencyKey,
    160,
    "idempotency key"
  );
  const summary = normalizeBoundedString(record.summary, fallback.summary, 2e3, "summary");
  const skills = Object.hasOwn(record, "skills") ? normalizeStringList(record.skills, "skills") : fallback.skills;
  const createdCardIds = Object.hasOwn(record, "createdCardIds") ? normalizeStringList(record.createdCardIds, "created card ids", 120) : fallback.createdCardIds;
  const scheduledAt = Object.hasOwn(record, "scheduledAt") ? normalizeTimestamp(record.scheduledAt, 0) || void 0 : fallback.scheduledAt;
  const maxRuntimeSeconds = Object.hasOwn(record, "maxRuntimeSeconds") ? normalizePositiveInteger(record.maxRuntimeSeconds, "max runtime seconds") : fallback.maxRuntimeSeconds;
  const maxRetries = Object.hasOwn(record, "maxRetries") ? normalizePositiveInteger(record.maxRetries, "max retries") : fallback.maxRetries;
  const dispatchCount = Object.hasOwn(record, "dispatchCount") ? normalizeTimestamp(record.dispatchCount, 0) || void 0 : fallback.dispatchCount;
  const lastDispatchAt = Object.hasOwn(record, "lastDispatchAt") ? normalizeTimestamp(record.lastDispatchAt, 0) || void 0 : fallback.lastDispatchAt;
  const workspace = Object.hasOwn(record, "workspace") ? normalizeWorkspace(record.workspace, fallback.workspace) : fallback.workspace;
  const workspaceAccess = fallback.workspaceAccess;
  const next = removeUndefinedAutomationFields({
    ...tenant ? { tenant } : {},
    ...boardId ? { boardId } : {},
    ...createdByCardId ? { createdByCardId } : {},
    ...idempotencyKey ? { idempotencyKey } : {},
    ...skills?.length ? { skills } : {},
    ...workspace ? { workspace } : {},
    ...workspaceAccess ? { workspaceAccess } : {},
    ...maxRuntimeSeconds ? { maxRuntimeSeconds } : {},
    ...maxRetries ? { maxRetries } : {},
    ...scheduledAt ? { scheduledAt } : {},
    ...summary ? { summary } : {},
    ...createdCardIds?.length ? { createdCardIds } : {},
    ...dispatchCount ? { dispatchCount } : {},
    ...lastDispatchAt ? { lastDispatchAt } : {}
  });
  return Object.keys(next).length ? next : void 0;
}
function deriveChildIdempotencyKey(parentKey, index) {
  if (!parentKey) {
    return void 0;
  }
  const key = `${parentKey}:child:${index}`;
  return key.length <= 160 ? key : void 0;
}
function normalizeExecutionMode(value, fallback) {
  if (typeof value === "string" && FLOWBOARD_EXECUTION_MODES.includes(value)) {
    return value;
  }
  return fallback;
}
function normalizeExecutionStatus(value, fallback) {
  if (typeof value === "string" && FLOWBOARD_EXECUTION_STATUSES.includes(value)) {
    return value;
  }
  return fallback;
}
function normalizeAttemptStatus(value, fallback) {
  if (typeof value === "string" && FLOWBOARD_ATTEMPT_STATUSES.includes(value)) {
    return value;
  }
  return fallback;
}
function normalizeLinkType(value, fallback) {
  if (typeof value === "string" && FLOWBOARD_LINK_TYPES.includes(value)) {
    return value;
  }
  return fallback;
}
function normalizeProofStatus(value, fallback) {
  if (typeof value === "string" && FLOWBOARD_PROOF_STATUSES.includes(value)) {
    return value;
  }
  return fallback;
}
function normalizeTemplateId(value) {
  return typeof value === "string" && FLOWBOARD_TEMPLATE_IDS.includes(value) ? value : void 0;
}
function normalizeTimestamp(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : fallback;
}
function normalizeEvent(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value;
  const id = normalizeOptionalString(record.id);
  const kind = FLOWBOARD_EVENT_KINDS.includes(record.kind) ? record.kind : null;
  const at = normalizeTimestamp(record.at, 0);
  if (!id || !kind || !at) {
    return null;
  }
  const fromStatus = typeof record.fromStatus === "string" && FLOWBOARD_STATUSES.includes(record.fromStatus) ? record.fromStatus : void 0;
  const toStatus = typeof record.toStatus === "string" && FLOWBOARD_STATUSES.includes(record.toStatus) ? record.toStatus : void 0;
  const fromMilestoneId = normalizeBoundedString(
    record.fromMilestoneId,
    void 0,
    120,
    "event source milestone"
  );
  const toMilestoneId = normalizeBoundedString(
    record.toMilestoneId,
    void 0,
    120,
    "event target milestone"
  );
  const sessionKey = normalizeOptionalString(record.sessionKey);
  const runId = normalizeOptionalString(record.runId);
  return {
    id,
    kind,
    at,
    ...fromStatus ? { fromStatus } : {},
    ...toStatus ? { toStatus } : {},
    ...fromMilestoneId ? { fromMilestoneId } : {},
    ...toMilestoneId ? { toMilestoneId } : {},
    ...sessionKey ? { sessionKey } : {},
    ...runId ? { runId } : {}
  };
}
function normalizeEvents(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map(normalizeEvent).filter((event) => event !== null).slice(-MAX_CARD_EVENTS);
}
function normalizeAttempt(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value;
  const id = normalizeOptionalString(record.id);
  const startedAt = normalizeTimestamp(record.startedAt, 0);
  if (!id || !startedAt) {
    return null;
  }
  const endedAt = normalizeTimestamp(record.endedAt, 0);
  const sessionKey = normalizeOptionalString(record.sessionKey);
  const runId = normalizeOptionalString(record.runId);
  const error = normalizeBoundedString(record.error, void 0, 800, "attempt error");
  const engine = normalizeBoundedString(record.engine, void 0, 160, "attempt engine");
  const model = normalizeBoundedString(record.model, void 0, 160, "attempt model");
  return {
    id,
    status: normalizeAttemptStatus(record.status, "running"),
    startedAt,
    ...endedAt ? { endedAt } : {},
    ...engine ? { engine } : {},
    ...typeof record.mode === "string" && FLOWBOARD_EXECUTION_MODES.includes(record.mode) ? { mode: record.mode } : {},
    ...model ? { model } : {},
    ...sessionKey ? { sessionKey } : {},
    ...runId ? { runId } : {},
    ...error ? { error } : {}
  };
}
function normalizeComment(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value;
  const id = normalizeOptionalString(record.id);
  const body = normalizeBoundedString(record.body, void 0, 2e3, "comment body");
  const createdAt = normalizeTimestamp(record.createdAt, 0);
  if (!id || !body || !createdAt) {
    return null;
  }
  const updatedAt = normalizeTimestamp(record.updatedAt, 0);
  return { id, body, createdAt, ...updatedAt ? { updatedAt } : {} };
}
function normalizeLink(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value;
  const id = normalizeOptionalString(record.id);
  const createdAt = normalizeTimestamp(record.createdAt, 0);
  if (!id || !createdAt) {
    return null;
  }
  const targetCardId = normalizeBoundedString(record.targetCardId, void 0, 120, "link target");
  const title = normalizeBoundedString(record.title, void 0, 180, "link title");
  const url = normalizeBoundedString(record.url, void 0, 2e3, "link URL");
  if (!targetCardId && !url) {
    return null;
  }
  return {
    id,
    type: normalizeLinkType(record.type, "relates_to"),
    createdAt,
    ...targetCardId ? { targetCardId } : {},
    ...title ? { title } : {},
    ...url ? { url } : {}
  };
}
function isDependencyLink(link) {
  return link.type === "parent" || link.type === "child";
}
function normalizeProof(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value;
  const id = normalizeOptionalString(record.id);
  const createdAt = normalizeTimestamp(record.createdAt, 0);
  if (!id || !createdAt) {
    return null;
  }
  const label = normalizeBoundedString(record.label, void 0, 160, "proof label");
  const command = normalizeBoundedString(record.command, void 0, 1e3, "proof command");
  const url = normalizeBoundedString(record.url, void 0, 2e3, "proof URL");
  const note = normalizeBoundedString(record.note, void 0, 2e3, "proof note");
  return {
    id,
    status: normalizeProofStatus(record.status, "unknown"),
    createdAt,
    ...label ? { label } : {},
    ...command ? { command } : {},
    ...url ? { url } : {},
    ...note ? { note } : {}
  };
}
function normalizeArtifact(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value;
  const id = normalizeOptionalString(record.id) ?? randomUUID();
  const createdAt = normalizeTimestamp(record.createdAt, Date.now());
  const label = normalizeBoundedString(record.label, void 0, 160, "artifact label");
  const url = normalizeBoundedString(record.url, void 0, 2e3, "artifact URL");
  const artifactPath = normalizeBoundedString(record.path, void 0, 2e3, "artifact path");
  const mimeType = normalizeBoundedString(record.mimeType, void 0, 160, "artifact MIME type");
  if (!url && !artifactPath) {
    return null;
  }
  return {
    id,
    createdAt,
    ...label ? { label } : {},
    ...url ? { url } : {},
    ...artifactPath ? { path: artifactPath } : {},
    ...mimeType ? { mimeType } : {}
  };
}
function normalizeAttachment(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value;
  const id = normalizeOptionalString(record.id);
  const cardId = normalizeBoundedString(record.cardId, void 0, 120, "card id");
  const fileName = normalizeBoundedString(record.fileName, void 0, 240, "attachment file name");
  const createdAt = normalizeTimestamp(record.createdAt, 0);
  const byteSize = typeof record.byteSize === "number" && Number.isFinite(record.byteSize) ? Math.max(0, Math.trunc(record.byteSize)) : 0;
  if (!id || !cardId || !fileName || !createdAt || byteSize <= 0) {
    return null;
  }
  const mimeType = normalizeBoundedString(record.mimeType, void 0, 160, "attachment MIME type");
  const note = normalizeBoundedString(record.note, void 0, 400, "attachment note");
  return {
    id,
    cardId,
    createdAt,
    fileName,
    byteSize,
    ...mimeType ? { mimeType } : {},
    ...note ? { note } : {}
  };
}
function normalizeWorkerLog(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value;
  const id = normalizeOptionalString(record.id);
  const message = normalizeBoundedString(record.message, void 0, 800, "worker log message");
  const createdAt = normalizeTimestamp(record.createdAt, 0);
  if (!id || !message || !createdAt) {
    return null;
  }
  const level = record.level === "warning" || record.level === "error" || record.level === "info" ? record.level : "info";
  const sessionKey = normalizeBoundedString(record.sessionKey, void 0, 240, "session key");
  const runId = normalizeBoundedString(record.runId, void 0, 160, "run id");
  return {
    id,
    level,
    message,
    createdAt,
    ...sessionKey ? { sessionKey } : {},
    ...runId ? { runId } : {}
  };
}
function normalizeWorkerProtocol(value, fallback) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }
  const record = value;
  const state = record.state === "idle" || record.state === "running" || record.state === "completed" || record.state === "blocked" || record.state === "violated" ? record.state : fallback?.state;
  if (!state) {
    return void 0;
  }
  const updatedAt = normalizeTimestamp(record.updatedAt, fallback?.updatedAt ?? Date.now());
  const detail = normalizeBoundedString(record.detail, fallback?.detail, 800, "protocol detail");
  return {
    state,
    updatedAt,
    ...detail ? { detail } : {}
  };
}
function normalizeAttachmentInput(cardId, input, now) {
  const fileName = normalizeBoundedString(input.fileName, void 0, 240, "attachment file name");
  if (!fileName) {
    throw new Error("attachment fileName is required.");
  }
  const contentBase64 = typeof input.contentBase64 === "string" && input.contentBase64 ? input.contentBase64 : void 0;
  if (!contentBase64) {
    throw new Error("attachment contentBase64 is required.");
  }
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(contentBase64) || contentBase64.length % 4 !== 0 || contentBase64.length > Math.ceil(MAX_ATTACHMENT_BYTES / 3) * 4) {
    throw new Error("attachment contentBase64 must be canonical base64.");
  }
  const decoded = Buffer.from(contentBase64, "base64");
  if (decoded.toString("base64") !== contentBase64) {
    throw new Error("attachment contentBase64 must be canonical base64.");
  }
  const byteSize = decoded.length;
  if (byteSize <= 0 || byteSize > MAX_ATTACHMENT_BYTES) {
    throw new Error(`attachment must be between 1 and ${MAX_ATTACHMENT_BYTES} bytes.`);
  }
  const mimeType = normalizeBoundedString(input.mimeType, void 0, 160, "attachment MIME type");
  const note = normalizeBoundedString(input.note, void 0, 400, "attachment note");
  const attachment = {
    id: randomUUID(),
    cardId,
    createdAt: now,
    fileName,
    byteSize,
    ...mimeType ? { mimeType } : {},
    ...note ? { note } : {}
  };
  return { attachment, contentBase64 };
}
function normalizeClaim(value, fallback) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }
  const record = value;
  const ownerId = normalizeBoundedString(record.ownerId, fallback?.ownerId, 120, "claim owner");
  const token = normalizeBoundedString(record.token, fallback?.token, 160, "claim token");
  const claimedAt = normalizeTimestamp(record.claimedAt, fallback?.claimedAt ?? Date.now());
  const lastHeartbeatAt = normalizeTimestamp(
    record.lastHeartbeatAt,
    fallback?.lastHeartbeatAt ?? claimedAt
  );
  const expiresAt = normalizeTimestamp(record.expiresAt, fallback?.expiresAt ?? 0);
  if (!ownerId || !token || !claimedAt || !lastHeartbeatAt) {
    return void 0;
  }
  return {
    ownerId,
    token,
    claimedAt,
    lastHeartbeatAt,
    ...expiresAt ? { expiresAt } : {}
  };
}
function normalizeDiagnosticAction(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value;
  const kind = record.kind === "claim" || record.kind === "unblock" || record.kind === "reassign" || record.kind === "add_proof" || record.kind === "open_session" ? record.kind : void 0;
  const label = normalizeBoundedString(record.label, void 0, 120, "diagnostic action label");
  return kind && label ? { kind, label } : null;
}
function normalizeDiagnostic(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value;
  const kind = FLOWBOARD_DIAGNOSTIC_KINDS.includes(record.kind) ? record.kind : void 0;
  const severity = FLOWBOARD_DIAGNOSTIC_SEVERITIES.includes(
    record.severity
  ) ? record.severity : "warning";
  const title = normalizeBoundedString(record.title, void 0, 160, "diagnostic title");
  const detail = normalizeBoundedString(record.detail, void 0, 800, "diagnostic detail");
  const firstSeenAt = normalizeTimestamp(record.firstSeenAt, Date.now());
  const lastSeenAt = normalizeTimestamp(record.lastSeenAt, firstSeenAt);
  if (!kind || !title || !detail) {
    return null;
  }
  return {
    kind,
    severity,
    title,
    detail,
    firstSeenAt,
    lastSeenAt,
    count: typeof record.count === "number" && Number.isFinite(record.count) ? Math.max(1, Math.trunc(record.count)) : 1,
    actions: Array.isArray(record.actions) ? record.actions.map(normalizeDiagnosticAction).filter((action) => action !== null).slice(0, 4) : []
  };
}
function normalizeNotification(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value;
  const id = normalizeOptionalString(record.id) ?? randomUUID();
  const kind = FLOWBOARD_NOTIFICATION_KINDS.includes(record.kind) ? record.kind : void 0;
  const createdAt = normalizeTimestamp(record.createdAt, Date.now());
  const sequence = normalizeTimestamp(record.sequence, 0) || void 0;
  const message = normalizeBoundedString(record.message, void 0, 240, "notification message");
  if (!kind || !message) {
    return null;
  }
  const sessionKey = normalizeBoundedString(record.sessionKey, void 0, 240, "session key");
  const runId = normalizeBoundedString(record.runId, void 0, 120, "run id");
  return {
    id,
    kind,
    createdAt,
    ...sequence ? { sequence } : {},
    message,
    ...sessionKey ? { sessionKey } : {},
    ...runId ? { runId } : {}
  };
}
function normalizeProofInput(input, now) {
  const label = normalizeBoundedString(input.label, void 0, 160, "proof label");
  const command = normalizeBoundedString(input.command, void 0, 1e3, "proof command");
  const url = normalizeBoundedString(input.url, void 0, 2e3, "proof URL");
  const note = normalizeBoundedString(input.note, void 0, 2e3, "proof note");
  return {
    id: randomUUID(),
    status: normalizeProofStatus(input.status, "unknown"),
    createdAt: now,
    ...label ? { label } : {},
    ...command ? { command } : {},
    ...url ? { url } : {},
    ...note ? { note } : {}
  };
}
function completionProofConflicts(existing, completion) {
  return ["label", "command", "url", "note"].some(
    (field) => completion[field] !== void 0 && completion[field] !== existing[field]
  );
}
function appendCompletionProof(existing, proof, proofId) {
  const entries = [...existing ?? []];
  if (!proofId) {
    return [...entries, proof].slice(-MAX_CARD_PROOF);
  }
  const index = entries.findIndex((entry) => entry.id === proofId);
  const pending = index >= 0 ? entries[index] : void 0;
  if (!pending) {
    throw new Error(`proof not found: ${proofId}`);
  }
  if (proof.status === "unknown") {
    throw new Error("completion proof status must be passed, failed, or skipped.");
  }
  if (completionProofConflicts(pending, proof)) {
    throw new Error(`completion proof does not match pending proof: ${proofId}`);
  }
  if (pending.status !== "unknown") {
    if (pending.status !== proof.status) {
      throw new Error(`completion proof status does not match existing proof: ${proofId}`);
    }
    return entries.slice(-MAX_CARD_PROOF);
  }
  entries[index] = { ...pending, status: proof.status };
  return entries.slice(-MAX_CARD_PROOF);
}
function normalizeMetadata(value, fallback = {}, options = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return trimMetadataToBudget(fallback, options);
  }
  const record = value;
  const stale = record.stale && typeof record.stale === "object" && !Array.isArray(record.stale) ? record.stale : null;
  const hasArchivedAt = Object.hasOwn(record, "archivedAt");
  const hasStale = Object.hasOwn(record, "stale");
  const hasLifecycleStatusSourceUpdatedAt = Object.hasOwn(record, "lifecycleStatusSourceUpdatedAt");
  const links = Array.isArray(record.links) ? record.links.map(normalizeLink).filter((link) => link !== null) : void 0;
  const normalizedLinks = links === void 0 ? fallback.links : options.allowDependencyLinks === false ? (() => {
    const dependencyLinks = (fallback.links ?? []).filter(isDependencyLink);
    const ordinaryCapacity = Math.max(0, MAX_CARD_LINKS - dependencyLinks.length);
    return [
      ...dependencyLinks.slice(-MAX_CARD_LINKS),
      ...ordinaryCapacity > 0 ? links.filter((link) => !isDependencyLink(link)).slice(-ordinaryCapacity) : []
    ];
  })() : links.slice(-MAX_CARD_LINKS);
  const normalized = {
    attempts: Array.isArray(record.attempts) ? record.attempts.map(normalizeAttempt).filter((attempt) => attempt !== null).slice(-MAX_CARD_ATTEMPTS) : fallback.attempts,
    comments: Array.isArray(record.comments) ? record.comments.map(normalizeComment).filter((comment) => comment !== null).slice(-MAX_CARD_COMMENTS) : fallback.comments,
    links: normalizedLinks,
    proof: Array.isArray(record.proof) ? record.proof.map(normalizeProof).filter((proof) => proof !== null).slice(-MAX_CARD_PROOF) : fallback.proof,
    artifacts: Array.isArray(record.artifacts) ? record.artifacts.map(normalizeArtifact).filter((artifact) => artifact !== null).slice(-MAX_CARD_ARTIFACTS) : fallback.artifacts,
    attachments: Array.isArray(record.attachments) ? record.attachments.map(normalizeAttachment).filter((attachment) => attachment !== null).slice(-MAX_CARD_ATTACHMENTS) : fallback.attachments,
    workerLogs: Array.isArray(record.workerLogs) ? record.workerLogs.map(normalizeWorkerLog).filter((log) => log !== null).slice(-MAX_CARD_WORKER_LOGS) : fallback.workerLogs,
    workerProtocol: Object.hasOwn(record, "workerProtocol") ? normalizeWorkerProtocol(record.workerProtocol, fallback.workerProtocol) : fallback.workerProtocol,
    automation: Object.hasOwn(record, "automation") ? normalizeAutomation(record.automation, fallback.automation) : fallback.automation,
    claim: Object.hasOwn(record, "claim") ? record.claim ? normalizeClaim(record.claim, fallback.claim) : void 0 : fallback.claim,
    diagnostics: Array.isArray(record.diagnostics) ? record.diagnostics.map(normalizeDiagnostic).filter(
      (diagnosticLocal) => diagnosticLocal !== null
    ).slice(-MAX_CARD_DIAGNOSTICS) : fallback.diagnostics,
    notifications: Array.isArray(record.notifications) ? record.notifications.map(normalizeNotification).filter((notification) => notification !== null).slice(-MAX_CARD_NOTIFICATIONS) : fallback.notifications,
    templateId: normalizeTemplateId(record.templateId) ?? fallback.templateId,
    archivedAt: hasArchivedAt ? normalizeTimestamp(record.archivedAt, 0) || void 0 : fallback.archivedAt,
    stale: hasStale ? stale ? {
      detectedAt: normalizeTimestamp(stale.detectedAt, Date.now()),
      lastSessionUpdatedAt: normalizeTimestamp(stale.lastSessionUpdatedAt, 0) || void 0,
      reason: normalizeBoundedString(stale.reason, fallback.stale?.reason, 240, "stale reason") ?? "Session has not reported recent activity."
    } : void 0 : fallback.stale,
    lifecycleStatusSourceUpdatedAt: hasLifecycleStatusSourceUpdatedAt ? normalizeTimestamp(record.lifecycleStatusSourceUpdatedAt, 0) : fallback.lifecycleStatusSourceUpdatedAt,
    failureCount: typeof record.failureCount === "number" && Number.isFinite(record.failureCount) ? Math.max(0, Math.trunc(record.failureCount)) : fallback.failureCount
  };
  return trimMetadataToBudget(normalized, options);
}
function normalizeExecution(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return void 0;
  }
  const record = value;
  const now = Date.now();
  const engine = normalizeBoundedString(record.engine, void 0, 160, "execution engine");
  const model = normalizeBoundedString(record.model, void 0, 160, "execution model");
  const normalizedId = normalizeOptionalString(record.id);
  const sessionKey = normalizeOptionalString(record.sessionKey);
  const runId = normalizeOptionalString(record.runId);
  if (!normalizedId && !engine && !model && !sessionKey && !runId) {
    return void 0;
  }
  const id = normalizedId ?? randomUUID();
  const startedAt = normalizeTimestamp(record.startedAt, now);
  const updatedAt = normalizeTimestamp(record.updatedAt, startedAt);
  return {
    id,
    kind: "agent-session",
    mode: normalizeExecutionMode(record.mode, "autonomous"),
    status: normalizeExecutionStatus(record.status, "idle"),
    startedAt,
    updatedAt,
    ...engine ? { engine } : {},
    ...model ? { model } : {},
    ...sessionKey ? { sessionKey } : {},
    ...runId ? { runId } : {}
  };
}
function syncExecutionSessionKey(execution, sessionKey) {
  if (!execution) {
    return void 0;
  }
  return removeUndefinedExecutionFields({
    ...execution,
    sessionKey,
    updatedAt: Date.now()
  });
}
function removeUndefinedExecutionFields(execution) {
  const next = { ...execution };
  if (next.engine === void 0) {
    delete next.engine;
  }
  if (next.model === void 0) {
    delete next.model;
  }
  if (next.sessionKey === void 0) {
    delete next.sessionKey;
  }
  if (next.runId === void 0) {
    delete next.runId;
  }
  return next;
}
function removeUndefinedAutomationFields(automation) {
  const next = { ...automation };
  for (const key of [
    "tenant",
    "boardId",
    "createdByCardId",
    "idempotencyKey",
    "skills",
    "workspace",
    "workspaceAccess",
    "maxRuntimeSeconds",
    "maxRetries",
    "scheduledAt",
    "summary",
    "createdCardIds",
    "dispatchCount",
    "lastDispatchAt"
  ]) {
    const value = next[key];
    if (value === void 0 || Array.isArray(value) && value.length === 0 || typeof value === "object" && value !== null && Object.keys(value).length === 0) {
      delete next[key];
    }
  }
  return next;
}
function removeUndefinedMetadataFields(metadata) {
  const next = { ...metadata };
  for (const key of [
    "attempts",
    "comments",
    "links",
    "proof",
    "artifacts",
    "attachments",
    "workerLogs",
    "workerProtocol",
    "automation",
    "claim",
    "diagnostics",
    "notifications",
    "templateId",
    "archivedAt",
    "stale",
    "lifecycleStatusSourceUpdatedAt",
    "failureCount"
  ]) {
    const value = next[key];
    if (value === void 0 || Array.isArray(value) && value.length === 0 || typeof value === "number" && value === 0 && key === "failureCount") {
      delete next[key];
    }
  }
  return next;
}
function clearDiagnostics(metadata, kinds) {
  if (!metadata?.diagnostics) {
    return metadata ?? {};
  }
  return {
    ...metadata,
    diagnostics: metadata.diagnostics.filter((entry) => !kinds.includes(entry.kind))
  };
}
function metadataIsEmpty(metadata) {
  return !metadata || Object.keys(metadata).length === 0;
}
function metadataByteSize(metadata) {
  return Buffer.byteLength(JSON.stringify(metadata), "utf8");
}
function dropFirst(items) {
  if (!items?.length) {
    return void 0;
  }
  const next = items.slice(1);
  return next.length ? next : void 0;
}
function dropFirstProofExcept(items, preserveProofId) {
  if (!items?.length) {
    return void 0;
  }
  const index = preserveProofId ? items.findIndex((proof) => proof.id !== preserveProofId) : 0;
  if (index < 0) {
    return items.slice();
  }
  const next = items.filter((_, itemIndex) => itemIndex !== index);
  return next.length ? next : void 0;
}
function dropFirstNonDependencyLink(items) {
  if (!items?.length) {
    return void 0;
  }
  const index = items.findIndex((link) => !isDependencyLink(link));
  if (index < 0) {
    return items.slice();
  }
  const next = items.filter((_, itemIndex) => itemIndex !== index);
  return next.length ? next : void 0;
}
function appendLinkPreservingDependencies(links, link) {
  const next = [...links, link];
  if (next.length <= MAX_CARD_LINKS) {
    return next;
  }
  const dropIndex = next.findIndex((entry) => !isDependencyLink(entry));
  if (dropIndex < 0 || dropIndex === next.length - 1) {
    throw new Error("card link limit reached.");
  }
  return next.filter((_, index) => index !== dropIndex);
}
function trimMetadataToBudget(metadata, options = {}) {
  let next = removeUndefinedMetadataFields(metadata);
  while (metadataByteSize(next) > MAX_CARD_METADATA_BYTES) {
    const currentSize = metadataByteSize(next);
    if (next.attempts?.length) {
      next = removeUndefinedMetadataFields({ ...next, attempts: dropFirst(next.attempts) });
    } else if (next.diagnostics?.length) {
      next = removeUndefinedMetadataFields({ ...next, diagnostics: dropFirst(next.diagnostics) });
    } else if (next.notifications?.length) {
      next = removeUndefinedMetadataFields({
        ...next,
        notifications: dropFirst(next.notifications)
      });
    } else if (next.proof?.some((proof) => !options.preserveProofId || proof.id !== options.preserveProofId)) {
      next = removeUndefinedMetadataFields({
        ...next,
        proof: dropFirstProofExcept(next.proof, options.preserveProofId)
      });
    } else if (next.artifacts?.length) {
      next = removeUndefinedMetadataFields({ ...next, artifacts: dropFirst(next.artifacts) });
    } else if (next.attachments?.length) {
      next = removeUndefinedMetadataFields({
        ...next,
        attachments: dropFirst(next.attachments)
      });
    } else if (next.workerLogs?.length) {
      next = removeUndefinedMetadataFields({ ...next, workerLogs: dropFirst(next.workerLogs) });
    } else if (next.links?.length) {
      const links = dropFirstNonDependencyLink(next.links);
      if (links?.length === next.links.length) {
        next = removeUndefinedMetadataFields({ ...next, comments: dropFirst(next.comments) });
      } else {
        next = removeUndefinedMetadataFields({ ...next, links });
      }
    } else if (next.comments?.length) {
      next = removeUndefinedMetadataFields({ ...next, comments: dropFirst(next.comments) });
    } else if (options.preserveProofId) {
      throw new Error(`card metadata cannot retain proof: ${options.preserveProofId}`);
    }
    if (metadataByteSize(next) >= currentSize) {
      if (options.preserveProofId) {
        throw new Error(`card metadata cannot retain proof: ${options.preserveProofId}`);
      }
      break;
    }
  }
  return next;
}

// src/backend/src/store-card-helpers.ts
function compareCards(left, right) {
  if (left.status !== right.status) {
    return FLOWBOARD_STATUSES.indexOf(left.status) - FLOWBOARD_STATUSES.indexOf(right.status);
  }
  if (left.position !== right.position) {
    return left.position - right.position;
  }
  return left.createdAt - right.createdAt;
}
function cardSessionKey(card) {
  return card.sessionKey ?? card.execution?.sessionKey;
}
function cardRunId(card) {
  return card.runId ?? card.execution?.runId;
}
function executionAttemptStatus(execution) {
  if (execution.status === "running") {
    return "running";
  }
  if (execution.status === "blocked") {
    return "blocked";
  }
  if (execution.status === "done" || execution.status === "review") {
    return "succeeded";
  }
  return "stopped";
}
function syncExecutionAttemptMetadata(metadata, execution, now) {
  if (!execution) {
    return metadata;
  }
  const attempts = [...metadata.attempts ?? []];
  const key = execution.runId ?? execution.sessionKey ?? execution.id;
  const existingIndex = attempts.findIndex(
    (attempt) => execution.runId && attempt.runId === execution.runId || !execution.runId && attempt.id === key
  );
  const existingAttempt = existingIndex >= 0 ? attempts[existingIndex] : void 0;
  const attemptStatus = execution.status === "blocked" && existingAttempt?.status === "stopped" ? "stopped" : executionAttemptStatus(execution);
  const nextAttempt = {
    id: existingAttempt?.id ?? key,
    status: attemptStatus,
    startedAt: existingAttempt?.startedAt ?? execution.startedAt,
    mode: execution.mode,
    ...execution.engine ? { engine: execution.engine } : {},
    ...execution.model ? { model: execution.model } : {},
    ...execution.sessionKey ? { sessionKey: execution.sessionKey } : {},
    ...execution.runId ? { runId: execution.runId } : {},
    ...attemptStatus !== "running" && { endedAt: execution.updatedAt || now },
    ...attemptStatus !== "succeeded" && existingAttempt?.error ? { error: existingAttempt.error } : {}
  };
  if (existingIndex >= 0) {
    attempts[existingIndex] = nextAttempt;
  } else {
    attempts.push(nextAttempt);
  }
  const previousFailed = existingAttempt?.status === "blocked" || existingAttempt?.status === "failed";
  const attemptFailed = attemptStatus === "blocked" || attemptStatus === "failed";
  const failureCount = attemptFailed ? previousFailed ? metadata.failureCount : (metadata.failureCount ?? 0) + 1 : attemptStatus === "succeeded" ? 0 : metadata.failureCount;
  return removeUndefinedMetadataFields({
    ...metadata,
    attempts: attempts.slice(-MAX_CARD_ATTEMPTS),
    failureCount
  });
}
function appendEvent(card, event, at = Date.now()) {
  return [
    ...normalizeEvents(card.events),
    {
      id: randomUUID2(),
      at,
      ...event
    }
  ].slice(-MAX_CARD_EVENTS);
}
function latestMetadataIdChanged(existing, next) {
  const latestId = next?.at(-1)?.id;
  return Boolean(latestId && latestId !== existing?.at(-1)?.id);
}
function lifecycleStatusSourceUpdatedAtFromPatch(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return void 0;
  }
  if (!Object.hasOwn(metadata, "lifecycleStatusSourceUpdatedAt")) {
    return void 0;
  }
  const sourceUpdatedAt = normalizeTimestamp(
    metadata.lifecycleStatusSourceUpdatedAt,
    0
  );
  return sourceUpdatedAt;
}
function latestStatusTransitionAt(card) {
  for (let index = (card.events?.length ?? 0) - 1; index >= 0; index -= 1) {
    const event = card.events?.[index];
    if ((event?.kind === "moved" || event?.kind === "created") && (event.kind === "created" && card.status !== "todo" || event.kind === "moved" && event.fromStatus !== event.toStatus) && event.toStatus === card.status && typeof event.at === "number" && Number.isFinite(event.at)) {
      return event.at;
    }
  }
  return void 0;
}
function shouldSkipPersistedLifecycleStatusUpdate(existing, sourceUpdatedAt) {
  const lifecycleStatusSourceUpdatedAt = existing.metadata?.lifecycleStatusSourceUpdatedAt;
  if (lifecycleStatusSourceUpdatedAt !== void 0) {
    return sourceUpdatedAt < lifecycleStatusSourceUpdatedAt;
  }
  const statusTransitionAt = latestStatusTransitionAt(existing);
  return statusTransitionAt !== void 0 && sourceUpdatedAt < statusTransitionAt;
}
function updateEvent(existing, next) {
  if (existing.metadata?.workerProtocol?.state !== next.metadata?.workerProtocol?.state && next.metadata?.workerProtocol?.state === "violated") {
    return { kind: "protocol_violation" };
  }
  if (existing.status !== next.status || existing.position !== next.position) {
    return {
      kind: "moved",
      fromStatus: existing.status,
      toStatus: next.status
    };
  }
  if (cardSessionKey(existing) !== cardSessionKey(next)) {
    return {
      kind: "linked",
      ...cardSessionKey(next) ? { sessionKey: cardSessionKey(next) } : {}
    };
  }
  if (existing.execution?.status !== next.execution?.status || existing.execution?.engine !== next.execution?.engine || cardRunId(existing) !== cardRunId(next)) {
    const existingAttempts = existing.metadata?.attempts ?? [];
    const nextAttempts = next.metadata?.attempts ?? [];
    const latestAttempt = nextAttempts.at(-1);
    if (nextAttempts.length > existingAttempts.length) {
      return {
        kind: "attempt_started",
        ...latestAttempt?.sessionKey ? { sessionKey: latestAttempt.sessionKey } : {},
        ...latestAttempt?.runId ? { runId: latestAttempt.runId } : {}
      };
    }
    const previousAttempt = latestAttempt ? existingAttempts.find((attempt) => attempt.id === latestAttempt.id) : void 0;
    if (latestAttempt && previousAttempt?.status !== latestAttempt.status) {
      return {
        kind: "attempt_updated",
        ...latestAttempt.sessionKey ? { sessionKey: latestAttempt.sessionKey } : {},
        ...latestAttempt.runId ? { runId: latestAttempt.runId } : {}
      };
    }
    return {
      kind: "execution_updated",
      ...cardSessionKey(next) ? { sessionKey: cardSessionKey(next) } : {},
      ...cardRunId(next) ? { runId: cardRunId(next) } : {}
    };
  }
  if (existing.metadata?.claim?.token !== next.metadata?.claim?.token) {
    return { kind: "claimed" };
  }
  if (existing.metadata?.claim?.lastHeartbeatAt !== next.metadata?.claim?.lastHeartbeatAt) {
    return { kind: "heartbeat" };
  }
  if ((existing.metadata?.comments?.length ?? 0) !== (next.metadata?.comments?.length ?? 0) || latestMetadataIdChanged(existing.metadata?.comments, next.metadata?.comments)) {
    return { kind: "comment_added" };
  }
  if ((existing.metadata?.links?.length ?? 0) !== (next.metadata?.links?.length ?? 0) || latestMetadataIdChanged(existing.metadata?.links, next.metadata?.links)) {
    return { kind: "link_added" };
  }
  if ((existing.metadata?.proof?.length ?? 0) !== (next.metadata?.proof?.length ?? 0) || latestMetadataIdChanged(existing.metadata?.proof, next.metadata?.proof)) {
    return { kind: "proof_added" };
  }
  if ((existing.metadata?.artifacts?.length ?? 0) !== (next.metadata?.artifacts?.length ?? 0) || latestMetadataIdChanged(existing.metadata?.artifacts, next.metadata?.artifacts)) {
    return { kind: "artifact_added" };
  }
  if ((existing.metadata?.attachments?.length ?? 0) !== (next.metadata?.attachments?.length ?? 0) || latestMetadataIdChanged(existing.metadata?.attachments, next.metadata?.attachments)) {
    return (next.metadata?.attachments?.length ?? 0) > (existing.metadata?.attachments?.length ?? 0) ? { kind: "attachment_added" } : { kind: "edited" };
  }
  if (existing.metadata?.workerProtocol?.state !== next.metadata?.workerProtocol?.state) {
    return { kind: "orchestration" };
  }
  if ((existing.metadata?.workerLogs?.length ?? 0) !== (next.metadata?.workerLogs?.length ?? 0) || latestMetadataIdChanged(existing.metadata?.workerLogs, next.metadata?.workerLogs)) {
    return { kind: "orchestration" };
  }
  if ((existing.metadata?.diagnostics?.length ?? 0) !== (next.metadata?.diagnostics?.length ?? 0)) {
    return { kind: "diagnostic" };
  }
  if ((existing.metadata?.notifications?.length ?? 0) !== (next.metadata?.notifications?.length ?? 0) || latestMetadataIdChanged(existing.metadata?.notifications, next.metadata?.notifications)) {
    return { kind: "notification" };
  }
  if (existing.metadata?.automation?.dispatchCount !== next.metadata?.automation?.dispatchCount || existing.metadata?.automation?.lastDispatchAt !== next.metadata?.automation?.lastDispatchAt) {
    return { kind: "dispatch" };
  }
  if (!existing.metadata?.archivedAt && next.metadata?.archivedAt) {
    return { kind: "archived" };
  }
  if (existing.metadata?.archivedAt && !next.metadata?.archivedAt) {
    return { kind: "unarchived" };
  }
  if (!existing.metadata?.stale && next.metadata?.stale) {
    return { kind: "stale" };
  }
  return { kind: "edited" };
}
function removeUndefinedCardFields(card) {
  const next = { ...card };
  for (const key of [
    "notes",
    "agentId",
    "sessionKey",
    "runId",
    "taskId",
    "sourceUrl",
    "execution",
    "delivery",
    "sourceReferences",
    "startedAt",
    "completedAt",
    "metadata"
  ]) {
    if (next[key] === void 0) {
      delete next[key];
    }
  }
  if (metadataIsEmpty(next.metadata)) {
    delete next.metadata;
  }
  return next;
}
function assertCanMutateClaimedCard(card, scope) {
  if (!scope) {
    return;
  }
  const claim = card.metadata?.claim;
  if (!claim) {
    return;
  }
  const ownerId = normalizeOptionalString(scope.ownerId);
  const token = normalizeOptionalString(scope.token);
  if (claim.ownerId !== ownerId && !safeEqualSecret(token, claim.token)) {
    throw new Error(`card is claimed by ${claim.ownerId}.`);
  }
}
function retryBudgetExhausted(card) {
  const maxRetries = card.metadata?.automation?.maxRetries;
  return Boolean(maxRetries && (card.metadata?.failureCount ?? 0) > maxRetries);
}
function diagnostic(params, now) {
  return {
    ...params,
    firstSeenAt: now,
    lastSeenAt: now,
    count: 1
  };
}
function mergeDiagnostics(previous, next) {
  const byKind = new Map(previous?.map((entry) => [entry.kind, entry]));
  return next.map((entry) => {
    const prior = byKind.get(entry.kind);
    return prior ? {
      ...entry,
      firstSeenAt: prior.firstSeenAt,
      count: prior.count + 1
    } : entry;
  });
}
function computeCardDiagnostics(card, now) {
  if (card.metadata?.archivedAt) {
    return [];
  }
  const diagnostics = [];
  const claim = card.metadata?.claim;
  const lastHeartbeatAt = claim?.lastHeartbeatAt ?? card.execution?.updatedAt ?? card.updatedAt;
  if ((card.status === "todo" || card.status === "backlog" || card.status === "ready") && card.agentId && now - card.updatedAt > READY_STRANDED_MS) {
    diagnostics.push(
      diagnostic(
        {
          kind: "stranded_ready",
          severity: "warning",
          title: "Assigned card is waiting",
          detail: "The card has an assigned agent but has not been claimed recently.",
          actions: [{ kind: "claim", label: "Claim card" }]
        },
        now
      )
    );
  }
  if (card.status === "running" && now - lastHeartbeatAt > RUNNING_HEARTBEAT_STALE_MS) {
    diagnostics.push(
      diagnostic(
        {
          kind: "running_without_heartbeat",
          severity: "error",
          title: "Running card has no recent heartbeat",
          detail: "The linked run or claim has not reported recent activity.",
          actions: [
            { kind: "open_session", label: "Open session" },
            { kind: "reassign", label: "Reassign card" }
          ]
        },
        now
      )
    );
  }
  if (card.status === "blocked" && now - card.updatedAt > BLOCKED_TOO_LONG_MS) {
    diagnostics.push(
      diagnostic(
        {
          kind: "blocked_too_long",
          severity: "warning",
          title: "Blocked card needs attention",
          detail: "The card has been blocked for more than a day.",
          actions: [{ kind: "unblock", label: "Move to todo" }]
        },
        now
      )
    );
  }
  if ((card.metadata?.failureCount ?? 0) >= 2) {
    diagnostics.push(
      diagnostic(
        {
          kind: "repeated_failures",
          severity: "error",
          title: "Repeated run failures",
          detail: "Multiple attempts failed or blocked on this card.",
          actions: [{ kind: "reassign", label: "Reassign card" }]
        },
        now
      )
    );
  }
  if (card.status === "done" && !(card.metadata?.proof?.length || card.metadata?.artifacts?.length || card.metadata?.attachments?.length)) {
    diagnostics.push(
      diagnostic(
        {
          kind: "missing_proof",
          severity: "warning",
          title: "Done card has no proof",
          detail: "The card is marked done without proof or an attached artifact.",
          actions: [{ kind: "add_proof", label: "Add proof" }]
        },
        now
      )
    );
  }
  if (card.sessionKey && !card.execution && card.status === "running") {
    diagnostics.push(
      diagnostic(
        {
          kind: "orphaned_session",
          severity: "warning",
          title: "Running card has only a loose session link",
          detail: "The card is running but has no execution record for lifecycle handoff.",
          actions: [{ kind: "open_session", label: "Open session" }]
        },
        now
      )
    );
  }
  return diagnostics;
}
function capText(value, max) {
  if (!value) {
    return void 0;
  }
  return value.length <= max ? value : `${truncateUtf16Safe(value, Math.max(0, max - 1))}\u2026`;
}
function cardBoardId(card) {
  return card.metadata?.automation?.boardId ?? "default";
}
function cardResultSummary(card) {
  return card.metadata?.automation?.summary ?? card.metadata?.comments?.findLast((comment) => comment.body.trim())?.body ?? card.metadata?.proof?.findLast((proof) => proof.note?.trim())?.note;
}
function buildWorkerContext(card, cards = []) {
  const lines = [
    `# Flowboard card ${card.id}`,
    `Title: ${card.title}`,
    `Status: ${card.status}`,
    `Priority: ${card.priority}`,
    `Board: ${cardBoardId(card)}`,
    `Agent: ${card.agentId ?? "(default)"}`
  ];
  if (card.notes) {
    lines.push("", "## Notes", capText(card.notes, 4e3) ?? "");
  }
  const attempts = card.metadata?.attempts?.slice(-8) ?? [];
  if (attempts.length) {
    lines.push("", "## Recent attempts");
    for (const attempt of attempts) {
      lines.push(
        `- ${attempt.status} ${attempt.model ?? ""} ${attempt.error ? `error=${capText(attempt.error, 240)}` : ""}`.trim()
      );
    }
  }
  const comments = card.metadata?.comments?.slice(-12) ?? [];
  if (comments.length) {
    lines.push("", "## Recent comments");
    for (const comment of comments) {
      lines.push(`- ${capText(comment.body, 400)}`);
    }
  }
  const proof = card.metadata?.proof?.slice(-8) ?? [];
  if (proof.length) {
    lines.push("", "## Proof");
    for (const entry of proof) {
      lines.push(
        `- ${entry.status}: ${capText(entry.label ?? entry.command ?? entry.url ?? entry.note, 400)}`
      );
    }
  }
  const artifacts = card.metadata?.artifacts?.slice(-8) ?? [];
  if (artifacts.length) {
    lines.push("", "## Artifacts");
    for (const artifact of artifacts) {
      lines.push(`- ${capText(artifact.label ?? artifact.url ?? artifact.path, 400)}`);
    }
  }
  const attachments = card.metadata?.attachments?.slice(-8) ?? [];
  if (attachments.length) {
    lines.push("", "## Attachments");
    for (const attachment of attachments) {
      const detail = [
        attachment.fileName,
        `${attachment.byteSize} bytes`,
        attachment.mimeType,
        attachment.note
      ].filter(Boolean).join(" \xB7 ");
      lines.push(`- ${capText(detail, 500)}`);
    }
  }
  if (card.metadata?.workerProtocol) {
    const protocol = card.metadata.workerProtocol;
    lines.push("", "## Worker protocol");
    lines.push(`${protocol.state}: ${capText(protocol.detail, 500) ?? "no detail"}`);
  }
  const workerLogs = card.metadata?.workerLogs?.slice(-8) ?? [];
  if (workerLogs.length) {
    lines.push("", "## Worker logs");
    for (const log of workerLogs) {
      lines.push(`- ${log.level}: ${capText(log.message, 500)}`);
    }
  }
  const links = card.metadata?.links?.slice(-8) ?? [];
  if (links.length) {
    lines.push("", "## Links");
    for (const link of links) {
      lines.push(`- ${link.type}: ${link.title ?? link.url ?? link.targetCardId ?? ""}`);
    }
  }
  const cardsById = new Map(cards.map((entry) => [entry.id, entry]));
  const parentResults = cardParentIds(card).map((parentId) => cardsById.get(parentId)).filter((parent) => parent !== void 0 && parent.status === "done").slice(-6);
  if (parentResults.length) {
    lines.push("", "## Parent results");
    for (const parent of parentResults) {
      lines.push(
        `- ${parent.id} ${parent.title}: ${capText(cardResultSummary(parent), 500) ?? "done"}`
      );
    }
  }
  const recentAgentWork = card.agentId && cards.length ? cards.filter(
    (entry) => entry.id !== card.id && cardBoardId(entry) === cardBoardId(card) && entry.agentId === card.agentId && entry.status === "done"
  ).toSorted((a, b) => b.updatedAt - a.updatedAt).slice(0, 5) : [];
  if (recentAgentWork.length) {
    lines.push("", `## Recent done work by ${card.agentId}`);
    for (const entry of recentAgentWork) {
      lines.push(
        `- ${entry.id} ${entry.title}: ${capText(cardResultSummary(entry), 300) ?? "done"}`
      );
    }
  }
  const automation = card.metadata?.automation;
  if (automation) {
    lines.push("", "## Automation");
    if (automation.tenant) {
      lines.push(`Tenant: ${automation.tenant}`);
    }
    if (automation.boardId) {
      lines.push(`Board: ${automation.boardId}`);
    }
    if (automation.skills?.length) {
      lines.push(`Skills: ${automation.skills.join(", ")}`);
    }
    if (automation.workspace) {
      lines.push(
        `Workspace: ${automation.workspace.kind}${automation.workspace.path ? ` ${automation.workspace.path}` : ""}`
      );
    }
    if (automation.summary) {
      lines.push(`Summary: ${capText(automation.summary, 400)}`);
    }
  }
  const diagnostics = computeCardDiagnostics(card, Date.now());
  if (diagnostics.length) {
    lines.push("", "## Active diagnostics");
    for (const entry of diagnostics) {
      lines.push(`- ${entry.severity}: ${entry.title}`);
    }
  }
  return lines.join("\n");
}
function cardParentIds(card) {
  return (card.metadata?.links ?? []).filter((link) => link.type === "parent" && link.targetCardId).map((link) => link.targetCardId).filter((id, index, ids) => ids.indexOf(id) === index);
}
function cardChildIds(card) {
  return (card.metadata?.links ?? []).filter((link) => link.type === "child" && link.targetCardId).map((link) => link.targetCardId).filter((id, index, ids) => ids.indexOf(id) === index);
}
function latestRunningAttempt(card) {
  return card.metadata?.attempts?.findLast((attempt) => attempt.status === "running");
}
function isDependencyPromotableStatus(status) {
  return status === "backlog" || status === "triage" || status === "todo" || status === "scheduled" || status === "ready";
}
function isActiveDependencyTarget(card, options = {}) {
  return Boolean(card.metadata?.claim) || card.execution?.status === "running" || Boolean(latestRunningAttempt(card)) || !options.allowStatusOnly && (card.status === "running" || card.status === "review");
}
function closeRunningAttempts(attempts, now, status, reason) {
  if (!attempts?.some((attempt) => attempt.status === "running")) {
    return attempts;
  }
  return attempts.map(
    (attempt) => attempt.status === "running" ? { ...attempt, status, endedAt: now, ...reason ? { error: reason } : {} } : attempt
  );
}
function notificationSequence(event) {
  return typeof event.sequence === "number" && Number.isFinite(event.sequence) ? Math.trunc(event.sequence) : void 0;
}
function compareNotifications(a, b) {
  if (a.createdAt !== b.createdAt) {
    return a.createdAt - b.createdAt;
  }
  const aSequence = notificationSequence(a);
  const bSequence = notificationSequence(b);
  if (aSequence !== void 0 && bSequence !== void 0) {
    return aSequence - bSequence || a.id.localeCompare(b.id);
  }
  if (aSequence !== void 0) {
    return -1;
  }
  if (bSequence !== void 0) {
    return 1;
  }
  return a.id.localeCompare(b.id);
}

// src/backend/src/dispatcher.ts
var DEFAULT_DISPATCH_MAX_STARTS = 3;
var DEFAULT_DISPATCH_OWNER = "flowboard-dispatcher";
async function createManagedFlowboardWorktree(params) {
  return await params.worktrees.create({
    repoRoot: params.repoRoot,
    name: params.name,
    ...params.baseRef ? { baseRef: params.baseRef } : {},
    // This host release has a fixed managed-worktree owner enum. Card IDs
    // remain globally unique and Flowboard data stays in its own SQLite namespace.
    ownerKind: "workboard",
    ownerId: params.ownerId
  });
}
var pendingFlowboardDispatches = /* @__PURE__ */ new WeakMap();
function normalizePositiveInteger2(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : fallback;
}
function sanitizeSessionSegment(value, fallback) {
  const sanitized = (value ?? fallback).trim().replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return (sanitized || fallback).slice(0, 96);
}
function cardIsArchived(card) {
  return Boolean(card.metadata?.archivedAt);
}
function cardHasActiveClaim(card, now) {
  const claim = card.metadata?.claim;
  return Boolean(claim && isFutureDateTimestampMs(claim.expiresAt, { nowMs: now }));
}
function buildSessionKey(card) {
  const boardId = sanitizeSessionSegment(cardBoardId(card), "default");
  const cardId = sanitizeSessionSegment(card.id, "card");
  const suffix = `subagent:flowboard-${boardId}-${cardId}`;
  return card.agentId ? `agent:${sanitizeSessionSegment(card.agentId, "agent")}:${suffix}` : suffix;
}
function buildExecution(params) {
  return {
    id: params.card.execution?.id ?? `${params.card.id}:agent-session`,
    kind: "agent-session",
    mode: "autonomous",
    status: "running",
    sessionKey: params.sessionKey,
    runId: params.runId,
    startedAt: params.now,
    updatedAt: params.now
  };
}
async function materializeWorkspace(params) {
  const workspace = params.card.metadata?.automation?.workspace;
  if (!workspace || workspace.kind === "scratch") {
    return {};
  }
  const sourcePath = workspace.sourcePath ?? workspace.path;
  const sourceBranch = workspace.sourcePath ? workspace.sourceBranch : workspace.branch;
  if (!sourcePath || !path.isAbsolute(sourcePath)) {
    throw new Error("worktree workspace path must be an absolute git checkout path");
  }
  const canonicalSourcePath = await assertFlowboardWorkspaceSourceAccess(
    workspace,
    params.workspaceAccess
  );
  if (!canonicalSourcePath) {
    throw new Error("worktree workspace path is required");
  }
  if (workspace.kind === "dir" || !params.workspaceAccess.unrestricted) {
    await assertCanonicalFlowboardRootAccess(canonicalSourcePath, params.workspaceAccess);
    return workspace.kind === "worktree" ? { cwd: canonicalSourcePath, workspace: { kind: "dir", path: canonicalSourcePath } } : { cwd: canonicalSourcePath };
  }
  if (!params.materializeWorktree) {
    throw new Error("managed worktree materialization was not explicitly authorized");
  }
  if (!params.worktrees) {
    throw new Error("managed worktree runtime is unavailable");
  }
  const worktree = await createManagedFlowboardWorktree({
    worktrees: params.worktrees,
    repoRoot: canonicalSourcePath,
    name: managedWorktreeName(params.card.id),
    ...sourceBranch ? { baseRef: sourceBranch } : {},
    ownerId: params.card.id
  });
  let cwd;
  try {
    cwd = await canonicalPathFromExistingAncestor3(worktree.path);
  } catch (error) {
    const removed = await params.worktrees.removeIfLossless({
      path: worktree.path
    }).catch(() => false);
    if (!removed) {
      throw new Error(`${formatErrorMessage(error)}; managed worktree cleanup failed`, {
        cause: error
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
      ...sourceBranch ? { sourceBranch } : {}
    }
  };
}
function buildWorkerPrompt(params) {
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
    params.context
  ].join("\n");
}
function sortReadyCards(a, b) {
  const priorityRank = {
    urgent: 0,
    high: 1,
    normal: 2,
    low: 3
  };
  return priorityRank[a.priority] - priorityRank[b.priority] || a.position - b.position || a.createdAt - b.createdAt;
}
function resolveDispatchOwner(card, now, ownerOverride) {
  return ownerOverride || (cardHasActiveClaim(card, now) ? card.metadata?.claim?.ownerId : void 0) || card.agentId || DEFAULT_DISPATCH_OWNER;
}
function selectStartableCards(cards, limit, candidates, ownerOverride, now) {
  if (limit <= 0) {
    return [];
  }
  const runningByOwner = /* @__PURE__ */ new Map();
  for (const card of cards) {
    const claim = card.metadata?.claim;
    const consumesOwnerSlot = !isFlowboardClaimReclaimable(claim, now) && (card.status === "running" || card.status !== "done" && cardHasActiveClaim(card, now) || card.execution?.status === "running");
    if (!consumesOwnerSlot || cardIsArchived(card)) {
      continue;
    }
    const owner = claim?.ownerId ?? resolveDispatchOwner(card, now);
    runningByOwner.set(owner, (runningByOwner.get(owner) ?? 0) + 1);
  }
  const selected = [];
  const fallback = [];
  const selectedOwners = /* @__PURE__ */ new Set();
  for (const card of candidates.filter(
    (entry) => entry.status === "ready" && !cardHasActiveClaim(entry, now) && !cardIsArchived(entry)
  ).toSorted(sortReadyCards)) {
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
  return [...selected, ...fallback];
}
async function dispatchAndStartFlowboardCards(params) {
  const previous = pendingFlowboardDispatches.get(params.store);
  const dispatch = previous ? previous.then(() => runFlowboardDispatch(params)) : runFlowboardDispatch(params);
  const settled = dispatch.then(
    () => void 0,
    () => void 0
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
async function runFlowboardDispatch(params) {
  const now = params.options?.now ?? Date.now();
  const boardId = params.options?.boardId;
  const dispatch = await params.store.dispatch({ now, boardId });
  const maxStarts = normalizePositiveInteger2(
    params.options?.maxStarts,
    DEFAULT_DISPATCH_MAX_STARTS
  );
  const started = [];
  const startFailures = [];
  const cards = await params.store.list();
  const candidates = [];
  for (const candidate of await params.store.list({ boardId })) {
    if (!await params.store.isProjectArchived(cardBoardId(candidate))) {
      candidates.push(candidate);
    }
  }
  const ownerOverride = params.options?.ownerId?.trim() || void 0;
  const startedOwners = /* @__PURE__ */ new Set();
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
    let materializedWorkspace;
    let implicitWorkspaceCwd;
    let runStarted = false;
    const requestedWorkspace = card.metadata?.automation?.workspace;
    let workspaceAccess;
    let targetWorkspace;
    let persistWorkspaceAccess;
    try {
      ({ workspaceAccess, targetWorkspace, persistWorkspaceAccess } = await resolveDispatchWorkspaceAccess({
        card,
        currentAccess: params.options?.workspaceAccess,
        resolveAgentWorkspace: params.options?.resolveAgentWorkspace
      }));
    } catch (error) {
      startFailures.push({
        cardId: card.id,
        title: card.title,
        error: formatErrorMessage(error)
      });
      continue;
    }
    if (!requestedWorkspace || requestedWorkspace.kind === "scratch") {
      if (!workspaceAccess.unrestricted) {
        if (!targetWorkspace) {
          startFailures.push({
            cardId: card.id,
            title: card.title,
            error: "target agent workspace is unavailable for restricted dispatch"
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
            resolveAgentWorkspaceRuntime: params.options?.resolveAgentWorkspaceRuntime
          });
        } catch (error) {
          startFailures.push({
            cardId: card.id,
            title: card.title,
            error: formatErrorMessage(error)
          });
          continue;
        }
      }
    } else {
      try {
        const canonicalSourcePath = await assertFlowboardWorkspaceSourceAccess(
          requestedWorkspace,
          workspaceAccess
        );
        if (canonicalSourcePath && requestedWorkspace.kind === "dir" && workspaceAccess.unrestricted) {
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
            resolveAgentWorkspaceRuntime: params.options?.resolveAgentWorkspaceRuntime
          });
        }
      } catch (error) {
        startFailures.push({
          cardId: card.id,
          title: card.title,
          error: formatErrorMessage(error)
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
            workspaceAccess: card.metadata?.automation?.workspaceAccess
          },
          adoptWorkspaceAccess: persistWorkspaceAccess ? workspaceAccess : void 0
        }
      );
      claimValue = claimed.token;
      attemptedStarts += 1;
      const context = await params.store.buildWorkerContext(card.id);
      const materialized = await materializeWorkspace({
        card: claimed.card,
        worktrees: params.worktrees,
        materializeWorktree: params.options?.materializeWorktree === true,
        workspaceAccess
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
          resolveAgentWorkspaceRuntime: params.options?.resolveAgentWorkspaceRuntime
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
          token: claimValue
        }),
        ...params.options?.provider ? { provider: params.options.provider } : {},
        ...params.options?.model ? { model: params.options.model } : {},
        lane: `flowboard:${cardBoardId(card)}:${card.id}`,
        idempotencyKey: `flowboard:${card.id}:${claimed.card.updatedAt}`,
        lightContext: true,
        deliver: false,
        ...runCwd ? { cwd: runCwd } : {}
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
          now
        }),
        ...materializedWorkspace ? { workspace: materializedWorkspace } : {}
      });
      started.push({
        cardId: updated.id,
        title: updated.title,
        sessionKey,
        runId: run.runId
      });
      await params.store.addWorkerLog(
        updated.id,
        {
          level: "info",
          message: `Dispatcher started subagent run ${run.runId}.`,
          sessionKey,
          runId: run.runId
        },
        { ownerId, token: claimValue }
      ).catch(() => void 0);
    } catch (error) {
      if (!runStarted && materializedWorkspace?.kind === "worktree" && materializedWorkspace.path && params.worktrees) {
        await params.worktrees.removeIfLossless({
          path: materializedWorkspace.path
        }).catch(() => void 0);
        const sourceWorkspace = card.metadata?.automation?.workspace;
        if (sourceWorkspace) {
          await params.store.update(card.id, { workspace: sourceWorkspace }).catch(() => void 0);
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
            reason: `Dispatcher could not start worker: ${message}`
          },
          { ownerId, token: claimValue }
        );
      } catch {
      }
    }
  }
  return {
    ...dispatch,
    started,
    startFailures,
    count: dispatch.count + started.length + startFailures.length
  };
}

// src/backend/src/card-execution.ts
var execFileAsync = promisify(execFile);
var PREVIEW_LIMIT = 6;
var PREVIEW_MAX_CHARS = 600;
var CLAIM_TOKEN_PLACEHOLDER = "[generated after confirmation]";
var executionLocks = /* @__PURE__ */ new WeakMap();
function readOptionalString(value, maxLength = 4e3) {
  if (typeof value !== "string") {
    return void 0;
  }
  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? normalized : void 0;
}
function activeExecution(card) {
  return card.execution?.status === "running" || Boolean(card.metadata?.attempts?.some((attempt) => attempt.status === "running"));
}
async function withCardExecutionLock(store, cardId, action) {
  const locks = executionLocks.get(store) ?? /* @__PURE__ */ new Map();
  executionLocks.set(store, locks);
  const previous = locks.get(cardId) ?? Promise.resolve();
  let release;
  const current = previous.then(
    async () => await new Promise((resolve) => {
      release = resolve;
    })
  );
  locks.set(cardId, current);
  await previous;
  try {
    return await action();
  } finally {
    release?.();
    if (locks.get(cardId) === current) {
      locks.delete(cardId);
    }
  }
}
async function gitCheckout(path6) {
  try {
    const { stdout } = await execFileAsync("git", ["-C", path6, "rev-parse", "--show-toplevel"], {
      encoding: "utf8",
      maxBuffer: 16 * 1024
    });
    const root = stdout.trim();
    if (!root) {
      throw new Error("git did not return a repository root");
    }
    const canonicalRoot = await canonicalPathFromExistingAncestor4(root);
    const branchResult = await execFileAsync(
      "git",
      ["-C", canonicalRoot, "symbolic-ref", "--quiet", "--short", "HEAD"],
      { encoding: "utf8", maxBuffer: 16 * 1024 }
    ).catch(() => ({ stdout: "" }));
    const branch = branchResult.stdout.trim();
    return { root: canonicalRoot, ...branch ? { branch } : {} };
  } catch (error) {
    throw new Error(
      `execution requires a local Git checkout: ${formatErrorMessage2(error)}`,
      { cause: error }
    );
  }
}
async function resolveWorkspaceAccess(card, currentAccess) {
  const callerAccess = await canonicalizeFlowboardWorkspaceAccess(currentAccess);
  const persisted = card.metadata?.automation?.workspaceAccess;
  const workspaceAccess = persisted ? intersectFlowboardWorkspaceAccess(
    await canonicalizeFlowboardWorkspaceAccess(persisted),
    callerAccess
  ) : callerAccess;
  if (!workspaceAccess.unrestricted && !workspaceAccess.writable) {
    throw new Error("card workspace access is read-only; execution requires write access.");
  }
  return workspaceAccess;
}
async function resolveExecutionSource(store, card, currentAccess) {
  const workspaceAccess = await resolveWorkspaceAccess(card, currentAccess);
  const cardWorkspace = card.metadata?.automation?.workspace;
  if (cardWorkspace?.kind === "scratch") {
    throw new Error("card workspace is scratch; select a local Git checkout before execution.");
  }
  const { boards } = await store.listBoards();
  const sourceWorkspace = cardWorkspace ?? boards.find((board) => board.id === cardBoardId(card))?.defaultWorkspace;
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
    workspaceAccess
  );
  if (!checkedRoot) {
    throw new Error("Git checkout root is unavailable.");
  }
  return {
    sourceCheckout: checkedRoot,
    ...sourceWorkspace.sourceBranch || checkout.branch ? { baseBranch: sourceWorkspace.sourceBranch ?? checkout.branch } : {},
    sourceWorkspace,
    workspaceAccess
  };
}
async function ensureTargetCanRun(params) {
  if (params.source.workspaceAccess.unrestricted) {
    return;
  }
  await assertRestrictedFlowboardTarget({
    root: params.source.sourceCheckout,
    agentId: params.card.agentId ?? params.options.defaultAgentId,
    sessionKey: params.sessionKey,
    modelProvider: params.options.runtime.agent.defaults.provider,
    modelId: params.options.runtime.agent.defaults.model,
    resolveAgentWorkspaceRuntime: params.options.resolveAgentWorkspaceRuntime
  });
}
function promptPreview(params) {
  return buildWorkerPrompt({
    card: params.card,
    context: params.context,
    ownerId: params.ownerId,
    token: CLAIM_TOKEN_PLACEHOLDER
  });
}
function redactExecutionText(value, token) {
  let next = value;
  if (token) {
    next = next.replaceAll(token, "[redacted]");
  }
  return next.replace(/Claim token:\s*\S+/giu, "Claim token: [redacted]");
}
function redactExecutionPayload(value, token) {
  if (typeof value === "string") {
    return redactExecutionText(value, token);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => redactExecutionPayload(entry, token));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        redactExecutionPayload(entry, token)
      ])
    );
  }
  return value;
}
function boundExecutionPreview(value, depth = 0) {
  if (typeof value === "string") {
    return value.length <= PREVIEW_MAX_CHARS ? value : `${value.slice(0, PREVIEW_MAX_CHARS)}...`;
  }
  if (Array.isArray(value)) {
    return value.slice(-PREVIEW_LIMIT).map((entry) => boundExecutionPreview(entry, depth + 1));
  }
  if (value && typeof value === "object") {
    if (depth >= 4) {
      return "[truncated]";
    }
    return Object.fromEntries(
      Object.entries(value).slice(0, 24).map(([key, entry]) => [key, boundExecutionPreview(entry, depth + 1)])
    );
  }
  return value;
}
function taskIdFromRuntime(runtime, sessionKey, runId) {
  try {
    const task = runtime.tasks.runs.bindSession({ sessionKey }).findLatest();
    return task?.runId === runId ? readOptionalString(task.taskId, 200) : void 0;
  } catch {
    return void 0;
  }
}
async function resolveCard(store, id) {
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
async function prepareFlowboardCardExecution(params) {
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
    expectedUpdatedAt: card.updatedAt,
    active: activeExecution(card),
    agentId: ownerId,
    defaultProvider: params.options.runtime.agent.defaults.provider,
    defaultModel: params.options.runtime.agent.defaults.model,
    sourceCheckout: source.sourceCheckout,
    ...source.baseBranch ? { baseBranch: source.baseBranch } : {},
    worktreeName: managedWorktreeName(card.id),
    promptPreview: promptPreview({ card, context, ownerId }),
    execution: card.execution ?? null
  };
}
async function startFlowboardCardExecution(params) {
  const card = await resolveCard(params.store, params.id);
  return await withCardExecutionLock(params.store, card.id, async () => {
    const latest = await resolveCard(params.store, card.id);
    const sessionKey = buildSessionKey(latest);
    const source = await resolveExecutionSource(
      params.store,
      latest,
      params.options.workspaceAccess
    );
    await ensureTargetCanRun({ card: latest, source, options: params.options, sessionKey });
    const ownerId = latest.agentId ?? params.options.defaultAgentId;
    const expectedUpdatedAt = typeof params.expectedUpdatedAt === "number" ? params.expectedUpdatedAt : void 0;
    let claimToken;
    let materializedWorkspace;
    let runStarted = false;
    const previousWorkspace = latest.metadata?.automation?.workspace;
    try {
      const claimed = await params.store.claimExecution(latest.id, {
        ownerId,
        expectedUpdatedAt,
        ttlSeconds: latest.metadata?.automation?.maxRuntimeSeconds
      });
      claimToken = claimed.token;
      const worktree = await createManagedFlowboardWorktree({
        worktrees: params.options.runtime.worktrees,
        repoRoot: source.sourceCheckout,
        name: managedWorktreeName(latest.id),
        ...source.baseBranch ? { baseRef: source.baseBranch } : {},
        ownerId: latest.id
      });
      let worktreePath;
      try {
        worktreePath = await canonicalPathFromExistingAncestor4(worktree.path);
      } catch (error) {
        const removed = await params.options.runtime.worktrees.removeIfLossless({ path: worktree.path }).catch(() => false);
        if (!removed) {
          throw new Error(`${formatErrorMessage2(error)}; managed worktree cleanup failed`, {
            cause: error
          });
        }
        throw error;
      }
      materializedWorkspace = {
        kind: "worktree",
        path: worktreePath,
        branch: worktree.branch,
        sourcePath: source.sourceCheckout,
        ...source.baseBranch ? { sourceBranch: source.baseBranch } : {}
      };
      await params.store.update(latest.id, {
        workspace: materializedWorkspace,
        workspaceAccess: source.workspaceAccess
      });
      await ensureTargetCanRun({
        card: await resolveCard(params.store, latest.id),
        source: { ...source, sourceCheckout: worktreePath },
        options: params.options,
        sessionKey
      });
      const current = await resolveCard(params.store, latest.id);
      const context = await params.store.buildWorkerContext(current.id);
      const run = await params.options.runtime.subagent.run({
        sessionKey,
        message: buildWorkerPrompt({
          card: current,
          context,
          ownerId,
          token: claimToken
        }),
        lane: `flowboard:${cardBoardId(current)}:${current.id}`,
        idempotencyKey: `flowboard:execution:${current.id}:${claimed.card.updatedAt}`,
        lightContext: true,
        deliver: false,
        cwd: worktreePath
      });
      runStarted = true;
      const now = Date.now();
      const taskId = taskIdFromRuntime(params.options.runtime, sessionKey, run.runId);
      const updated = await params.store.update(current.id, {
        sessionKey,
        runId: run.runId,
        ...taskId ? { taskId } : {},
        execution: buildExecution({
          card: current,
          sessionKey,
          runId: run.runId,
          now
        }),
        workspace: materializedWorkspace,
        workspaceAccess: source.workspaceAccess
      });
      await params.store.addWorkerLog(
        updated.id,
        {
          level: "info",
          message: `Card execution started subagent run ${run.runId}.`,
          sessionKey,
          runId: run.runId
        },
        { ownerId, token: claimToken }
      ).catch(() => void 0);
      return {
        card: updated,
        sessionKey,
        runId: run.runId,
        ...taskId ? { taskId } : {},
        worktreePath,
        branch: worktree.branch
      };
    } catch (error) {
      if (!runStarted && materializedWorkspace?.path) {
        await params.options.runtime.worktrees.removeIfLossless({ path: materializedWorkspace.path }).catch(() => false);
        await params.store.update(latest.id, { workspace: previousWorkspace ?? source.sourceWorkspace }).catch(() => void 0);
      }
      if (claimToken && !runStarted) {
        await params.store.releaseClaim(latest.id, { ownerId, token: claimToken }).catch(() => void 0);
      }
      throw error;
    }
  });
}
async function inspectFlowboardCardExecution(params) {
  const card = await resolveCard(params.store, params.id);
  const sessionKey = card.execution?.sessionKey ?? card.sessionKey;
  const runId = card.execution?.runId ?? card.runId;
  const active = activeExecution(card);
  if (!active || !sessionKey || !runId) {
    return { card, active: false, execution: card.execution ?? null };
  }
  const token = card.metadata?.claim?.token;
  const preview = await params.runtime.subagent.getSessionMessages({ sessionKey, limit: PREVIEW_LIMIT }).then(({ messages }) => ({ messages })).catch((error) => ({ error: formatErrorMessage2(error) }));
  const task = card.taskId ? params.runtime.tasks.runs.bindSession({ sessionKey }).get(card.taskId) : void 0;
  return {
    card,
    active: true,
    execution: card.execution,
    sessionKey,
    runId,
    ...card.taskId ? { taskId: card.taskId } : {},
    preview: boundExecutionPreview(redactExecutionPayload(preview, token)),
    ...task ? { task: boundExecutionPreview(redactExecutionPayload(task, token)) } : {}
  };
}
async function steerFlowboardCardExecution(params) {
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
    const taskId = taskIdFromRuntime(params.runtime, sessionKey, nextRunId);
    updated = await params.store.update(card.id, {
      runId: nextRunId,
      ...taskId ? { taskId } : {},
      execution: { ...card.execution, runId: nextRunId, updatedAt: Date.now() }
    });
  }
  return { card: updated };
}
async function abortFlowboardCardExecution(params) {
  const card = await resolveCard(params.store, params.id);
  if (!activeExecution(card) || card.execution?.status !== "running") {
    throw new Error("card has no active Flowboard execution.");
  }
  const expectedRunId = readOptionalString(params.expectedRunId, 200);
  const runId = card.execution.runId ?? card.runId;
  if (expectedRunId && runId && expectedRunId !== runId) {
    throw new Error("card execution changed before it could be stopped.");
  }
  const reason = readOptionalString(params.reason, 1e3) ?? "Flowboard execution stopped by operator.";
  const stopped = await params.store.stopExecution(card.id, {
    ...runId ? { expectedRunId: runId } : {},
    reason
  });
  return {
    card: stopped
  };
}
function terminalExecutionOutcome(value) {
  const outcome = readOptionalString(value, 40)?.toLowerCase();
  if (outcome === "ok" || outcome === "error" || outcome === "timeout" || outcome === "killed" || outcome === "reset" || outcome === "deleted") {
    return outcome;
  }
  throw new Error("outcome must be a terminal OpenClaw subagent outcome.");
}
async function reconcileFlowboardCardExecution(params) {
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
    reason: params.reason
  });
  if (!reconciled) {
    throw new Error("card execution could not be reconciled.");
  }
  return { card: reconciled };
}

// src/backend/src/gateway-helpers.ts
init_contract();
import { formatErrorMessage as formatErrorMessage3 } from "openclaw/plugin-sdk/error-runtime";
import { parseStrictPositiveInteger } from "openclaw/plugin-sdk/number-runtime";
function respondError(respond, error) {
  respond(false, void 0, {
    code: "flowboard_error",
    message: formatErrorMessage3(error)
  });
}
function readId(params) {
  const value = params.id;
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  throw new Error("id is required.");
}
function readOptionalPositiveInteger(value, fieldName) {
  if (value === void 0) {
    return void 0;
  }
  const parsed = parseStrictPositiveInteger(value);
  if (typeof value !== "number" || parsed === void 0) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }
  return parsed;
}
function readPatch(params) {
  const patch = params.patch;
  if (patch && typeof patch === "object" && !Array.isArray(patch)) {
    return patch;
  }
  return params;
}
function assertNoCursorAdvance(params) {
  if (params.advance === true) {
    throw new Error("notification cursor advancement requires flowboard.notifications.advance.");
  }
}
async function listFlowboardCards(store, boardId, redactCard) {
  const [cards, { boards }] = await Promise.all([store.list({ boardId }), store.listBoards()]);
  return { cards: cards.map(redactCard), boards, statuses: FLOWBOARD_STATUSES };
}
function resolveGatewayFlowboardWorkspaceAccess(params) {
  if (!params.client) {
    return { unrestricted: true };
  }
  const scopes = Array.isArray(params.client?.connect?.scopes) ? params.client.connect.scopes : [];
  if (scopes.includes("operator.admin")) {
    return { unrestricted: true };
  }
  return resolveConfiguredFlowboardWorkspaceAccess({
    config: params.context.getRuntimeConfig(),
    unrestricted: false
  });
}
function createFlowboardDispatchHandler(params) {
  const sandbox = params.api.runtime.sandbox;
  return async ({ params: requestParams, respond, client, context }, options) => {
    try {
      const boardId = requestParams && typeof requestParams === "object" && "boardId" in requestParams ? requestParams.boardId : void 0;
      const rawMaxStarts = requestParams && typeof requestParams === "object" && "maxStarts" in requestParams ? requestParams.maxStarts : void 0;
      if (!options.supportsMaxStarts && rawMaxStarts !== void 0) {
        throw new Error("maxStarts requires flowboard.cards.dispatchWithOptions.");
      }
      const maxStarts = options.supportsMaxStarts ? readOptionalPositiveInteger(rawMaxStarts, "maxStarts") : void 0;
      const workspaceAccess = resolveGatewayFlowboardWorkspaceAccess({ context, client });
      const result = await dispatchAndStartFlowboardCards({
        store: params.store,
        subagent: params.api.runtime.subagent,
        worktrees: params.api.runtime.worktrees,
        options: {
          boardId: typeof boardId === "string" ? boardId : void 0,
          ...maxStarts !== void 0 ? { maxStarts } : {},
          materializeWorktree: true,
          resolveAgentWorkspace: (agentId) => resolveFlowboardAgentWorkspace(context.getRuntimeConfig(), agentId),
          resolveAgentWorkspaceRuntime: (agentId, sessionKey, workspaceDir, modelProvider, modelId) => {
            const config = context.getRuntimeConfig();
            return resolveAgentFlowboardWorkspaceRuntime({
              config,
              agentId,
              sessionKey,
              workspaceDir,
              modelProvider,
              modelId,
              prepareSandboxWorkspaceAuthority: sandbox?.prepareWorkspaceAuthority
            });
          },
          workspaceAccess
        }
      });
      respond(true, {
        ...result,
        promoted: result.promoted.map(params.redactCard),
        reclaimed: result.reclaimed.map(params.redactCard),
        blocked: result.blocked.map(params.redactCard),
        orchestrated: result.orchestrated.map(params.redactCard)
      });
    } catch (error) {
      respondError(respond, error);
    }
  };
}

// src/backend/src/gateway-workspace-methods.ts
var WRITE_SCOPE = "operator.write";
async function resolveGatewayWorkspaceMutationAccess(request, value) {
  const access = await canonicalizeFlowboardWorkspaceAccess(
    resolveGatewayFlowboardWorkspaceAccess({
      context: request.context,
      client: request.client
    })
  );
  await assertFlowboardWorkspaceMutationAccess(value, access);
  return access;
}
function registerFlowboardWorkspaceCardMethods(params) {
  const { api, store, redactCard } = params;
  api.registerGatewayMethod(
    "flowboard.cards.create",
    async (request) => {
      const { params: requestParams, respond } = request;
      try {
        const input = withoutFlowboardWorkspaceAccess(requestParams);
        const project = await store.getProject(input.boardId);
        const inputWithProjectWorkspace = input.workspace === void 0 && project.board.defaultWorkspace ? { ...input, workspace: project.board.defaultWorkspace } : input;
        const access = await resolveGatewayWorkspaceMutationAccess(request, inputWithProjectWorkspace);
        respond(true, {
          card: redactCard(
            await store.create(withFlowboardWorkspaceAccess(inputWithProjectWorkspace, access))
          )
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE }
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
              containsFlowboardWorkspaceMutation(patch) ? withFlowboardWorkspaceAccess(patch, access) : patch
            )
          )
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE }
  );
}
function registerFlowboardWorkspaceBulkMethod(params) {
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
          patch: containsFlowboardWorkspaceMutation(patch) ? withFlowboardWorkspaceAccess(patch, access) : patch
        });
        respond(true, { cards: result.cards.map(redactCard) });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE }
  );
}
function registerFlowboardWorkspaceBoardMethod(params) {
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
    { scope: WRITE_SCOPE }
  );
}
function registerFlowboardWorkspaceWorkflowMethods(params) {
  const { api, store, redactCard } = params;
  api.registerGatewayMethod(
    "flowboard.cards.specify",
    async (request) => {
      const { params: requestParams, respond } = request;
      try {
        const sanitizedParams = withoutFlowboardWorkspaceAccess(requestParams);
        const access = await resolveGatewayWorkspaceMutationAccess(request, sanitizedParams);
        const input = containsFlowboardWorkspaceMutation(sanitizedParams) ? withFlowboardWorkspaceAccess(sanitizedParams, access) : sanitizedParams;
        respond(true, {
          card: redactCard(await store.specify(readId(requestParams), input, null))
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE }
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
          null
        );
        respond(true, {
          parent: redactCard(result.parent),
          children: result.children.map(redactCard)
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE }
  );
}

// src/backend/src/project-document-reader.ts
import { createHash, randomUUID as randomUUID3 } from "node:crypto";
import fs from "node:fs/promises";
import path2 from "node:path";
var MAX_PROJECT_DOCUMENT_BYTES = 1024 * 1024;
var MARKDOWN_EXTENSIONS = /* @__PURE__ */ new Set([".md", ".markdown"]);
function documentRevision(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
function decodeUtf8(bytes) {
  let content;
  try {
    content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("project document file is not valid UTF-8 text.");
  }
  if (content.includes("\0")) {
    throw new Error("project document file is not valid UTF-8 text.");
  }
  return content;
}
function encodeDocumentContent(content) {
  if (typeof content !== "string") {
    throw new Error("document content must be a string.");
  }
  const bytes = Buffer.from(content, "utf8");
  if (bytes.byteLength > MAX_PROJECT_DOCUMENT_BYTES) {
    throw new Error("project document content exceeds the 1 MiB limit.");
  }
  if (decodeUtf8(bytes) !== content) {
    throw new Error("document content is not valid UTF-8 text.");
  }
  return bytes;
}
function assertMarkdownPath(document) {
  if (document.type !== "path" || !document.target) {
    throw new Error("only Markdown documents and Markdown file paths can be previewed.");
  }
  const fileName = path2.basename(document.target).toLowerCase();
  if (fileName === ".env" || fileName.startsWith(".env.")) {
    throw new Error("environment files cannot be previewed as project documents.");
  }
  if (!MARKDOWN_EXTENSIONS.has(path2.extname(document.target).toLowerCase())) {
    throw new Error("project document paths must reference a Markdown file.");
  }
  return document.target;
}
async function resolveProjectDocumentFile(params) {
  const target = assertMarkdownPath(params.document);
  let resolvedPath;
  try {
    resolvedPath = await fs.realpath(target);
  } catch {
    throw new Error("project document file does not exist.");
  }
  await assertFlowboardWorkspaceSourceAccess({ kind: "dir", path: resolvedPath }, params.access);
  let stat;
  try {
    stat = await fs.stat(resolvedPath);
  } catch {
    throw new Error("project document file cannot be read.");
  }
  if (!stat.isFile()) {
    throw new Error("project document path must reference a regular file.");
  }
  if (stat.size > MAX_PROJECT_DOCUMENT_BYTES) {
    throw new Error("project document file exceeds the 1 MiB preview limit.");
  }
  let bytes;
  try {
    bytes = await fs.readFile(resolvedPath);
  } catch {
    throw new Error("project document file cannot be read.");
  }
  return { content: decodeUtf8(bytes), bytes, path: resolvedPath, stat };
}
async function readFlowboardProjectDocument(params) {
  const { document } = params;
  if (document.type === "markdown") {
    const content = document.content ?? "";
    return {
      document,
      content,
      source: "stored",
      revision: `stored:${document.updatedAt}:${documentRevision(Buffer.from(content, "utf8"))}`
    };
  }
  const file = await resolveProjectDocumentFile(params);
  return {
    document,
    content: file.content,
    source: "path",
    revision: documentRevision(file.bytes),
    path: file.path,
    modifiedAt: Math.trunc(Number(file.stat.mtimeMs))
  };
}
async function writeFlowboardProjectDocumentPath(params) {
  if (!params.access.unrestricted && !params.access.writable) {
    throw new Error("project document workspace access is read-only.");
  }
  if (typeof params.expectedRevision !== "string" || !params.expectedRevision) {
    throw new Error("expected document revision is required.");
  }
  const content = encodeDocumentContent(params.content);
  const current = await resolveProjectDocumentFile(params);
  if (documentRevision(current.bytes) !== params.expectedRevision) {
    throw new Error("project document changed on disk; reload it before saving.");
  }
  const directory = path2.dirname(current.path);
  const temporaryPath = path2.join(
    directory,
    `.${path2.basename(current.path)}.flowboard-${randomUUID3()}.tmp`
  );
  const originalMode = Number(current.stat.mode) & 4095;
  try {
    const handle = await fs.open(temporaryPath, "wx", originalMode);
    try {
      await handle.writeFile(content);
      await handle.sync();
    } finally {
      await handle.close();
    }
    await fs.chmod(temporaryPath, originalMode);
    await fs.rename(temporaryPath, current.path);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true }).catch(() => void 0);
    throw error;
  }
  return await readFlowboardProjectDocument({
    document: params.document,
    access: params.access
  });
}

// src/backend/src/gateway-project-methods.ts
var READ_SCOPE = "operator.read";
var WRITE_SCOPE2 = "operator.write";
async function assertProjectWorkspaceAccess(request, value) {
  const access = await canonicalizeFlowboardWorkspaceAccess(
    resolveGatewayFlowboardWorkspaceAccess({
      context: request.context,
      client: request.client
    })
  );
  await assertFlowboardWorkspaceMutationAccess(value, access);
}
async function resolveProjectWorkspaceReadAccess(request) {
  return await canonicalizeFlowboardWorkspaceAccess(
    resolveGatewayFlowboardWorkspaceAccess({
      context: request.context,
      client: request.client
    })
  );
}
async function resolveProjectWorkspaceWriteAccess(request) {
  const access = await resolveProjectWorkspaceReadAccess(request);
  if (!access.unrestricted && !access.writable) {
    throw new Error("project document workspace access is read-only.");
  }
  return access;
}
function registerFlowboardProjectGatewayMethods(params) {
  const { api, store, redactCard } = params;
  api.registerGatewayMethod(
    "flowboard.projects.list",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, await store.listProjects(requestParams));
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: READ_SCOPE }
  );
  api.registerGatewayMethod(
    "flowboard.projects.get",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, { project: await store.getProject(requestParams.id) });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: READ_SCOPE }
  );
  api.registerGatewayMethod(
    "flowboard.projects.create",
    async (request) => {
      const { params: requestParams, respond } = request;
      try {
        await assertProjectWorkspaceAccess(request, requestParams);
        respond(true, { project: await store.createProject(requestParams) });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE2 }
  );
  api.registerGatewayMethod(
    "flowboard.projects.update",
    async (request) => {
      const { params: requestParams, respond } = request;
      try {
        await assertProjectWorkspaceAccess(request, requestParams);
        respond(true, { project: await store.updateProject(requestParams) });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE2 }
  );
  api.registerGatewayMethod(
    "flowboard.projects.reorder",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, await store.reorderProjects(requestParams.ids));
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE2 }
  );
  api.registerGatewayMethod(
    "flowboard.projects.archive",
    async ({ params: requestParams, respond }) => {
      try {
        respond(
          true,
          await store.archiveProject(requestParams.id, requestParams.archived === false ? false : true)
        );
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE2 }
  );
  api.registerGatewayMethod(
    "flowboard.projects.restore",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, await store.archiveProject(requestParams.id, false));
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE2 }
  );
  api.registerGatewayMethod(
    "flowboard.projects.milestones.list",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, await store.listMilestones(requestParams.boardId));
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: READ_SCOPE }
  );
  api.registerGatewayMethod(
    "flowboard.projects.milestones.create",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, { milestone: await store.createMilestone(requestParams) });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE2 }
  );
  api.registerGatewayMethod(
    "flowboard.projects.milestones.update",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, { milestone: await store.updateMilestone(readId(requestParams), requestParams) });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE2 }
  );
  api.registerGatewayMethod(
    "flowboard.projects.milestones.reorder",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, await store.reorderMilestones(requestParams));
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE2 }
  );
  api.registerGatewayMethod(
    "flowboard.projects.milestones.complete",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, { milestone: await store.completeMilestone(readId(requestParams)) });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE2 }
  );
  api.registerGatewayMethod(
    "flowboard.projects.milestones.archive",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, { milestone: await store.archiveMilestone(readId(requestParams)) });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE2 }
  );
  api.registerGatewayMethod(
    "flowboard.projects.milestones.restore",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, { milestone: await store.restoreMilestone(readId(requestParams)) });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE2 }
  );
  api.registerGatewayMethod(
    "flowboard.projects.documents.list",
    async (request) => {
      const { params: requestParams, respond } = request;
      try {
        const access = await resolveProjectWorkspaceReadAccess(request);
        const project = await store.getProject(requestParams.boardId);
        if (project.board.defaultWorkspace?.path) {
          await assertFlowboardWorkspaceSourceAccess(project.board.defaultWorkspace, access);
        }
        respond(
          true,
          await store.listProjectDocuments(requestParams.boardId, {
            includeHidden: requestParams.includeHidden
          })
        );
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: READ_SCOPE }
  );
  api.registerGatewayMethod(
    "flowboard.projects.documents.read",
    async (request) => {
      const { params: requestParams, respond } = request;
      try {
        const access = await resolveProjectWorkspaceReadAccess(request);
        const document = await store.getProjectDocument(readId(requestParams));
        respond(true, {
          preview: await readFlowboardProjectDocument({ document, access })
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: READ_SCOPE }
  );
  api.registerGatewayMethod(
    "flowboard.projects.documents.write",
    async (request) => {
      const { params: requestParams, respond } = request;
      try {
        const access = await resolveProjectWorkspaceWriteAccess(request);
        const document = await store.getProjectDocument(readId(requestParams));
        if (document.type === "markdown") {
          const preview = await readFlowboardProjectDocument({ document, access });
          if (typeof requestParams.expectedRevision !== "string" || requestParams.expectedRevision !== preview.revision) {
            throw new Error("project document changed; reload it before saving.");
          }
          const updated = await store.updateProjectDocument(document.id, {
            content: requestParams.content
          });
          respond(true, {
            preview: await readFlowboardProjectDocument({ document: updated, access })
          });
          return;
        }
        respond(true, {
          preview: await writeFlowboardProjectDocumentPath({
            document,
            content: requestParams.content,
            expectedRevision: requestParams.expectedRevision,
            access
          })
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE2 }
  );
  api.registerGatewayMethod(
    "flowboard.projects.documents.create",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, { document: await store.createProjectDocument(requestParams) });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE2 }
  );
  api.registerGatewayMethod(
    "flowboard.projects.documents.update",
    async ({ params: requestParams, respond }) => {
      try {
        respond(
          true,
          { document: await store.updateProjectDocument(readId(requestParams), requestParams) }
        );
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE2 }
  );
  api.registerGatewayMethod(
    "flowboard.projects.documents.reorder",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, await store.reorderProjectDocuments(requestParams));
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE2 }
  );
  api.registerGatewayMethod(
    "flowboard.projects.documents.hide",
    async ({ params: requestParams, respond }) => {
      try {
        respond(
          true,
          { document: await store.hideProjectDocument(readId(requestParams), true) }
        );
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE2 }
  );
  api.registerGatewayMethod(
    "flowboard.projects.documents.restore",
    async ({ params: requestParams, respond }) => {
      try {
        respond(
          true,
          { document: await store.hideProjectDocument(readId(requestParams), false) }
        );
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE2 }
  );
  api.registerGatewayMethod(
    "flowboard.projects.documents.delete",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, await store.deleteProjectDocument(readId(requestParams)));
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE2 }
  );
  api.registerGatewayMethod(
    "flowboard.cards.sources.create",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, {
          card: redactCard(await store.addSourceReference(readId(requestParams), requestParams))
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE2 }
  );
  api.registerGatewayMethod(
    "flowboard.cards.sources.update",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, {
          card: redactCard(await store.updateSourceReference(readId(requestParams), requestParams))
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE2 }
  );
  api.registerGatewayMethod(
    "flowboard.cards.sources.delete",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, {
          card: redactCard(await store.deleteSourceReference(readId(requestParams), requestParams))
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE2 }
  );
  api.registerGatewayMethod(
    "flowboard.cards.sources.reorder",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, {
          card: redactCard(await store.reorderSourceReferences(readId(requestParams), requestParams))
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE2 }
  );
  api.registerGatewayMethod(
    "flowboard.cards.moveMilestone",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, {
          card: redactCard(await store.moveMilestone(readId(requestParams), requestParams))
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE2 }
  );
  api.registerGatewayMethod(
    "flowboard.cards.moveProject",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, {
          card: redactCard(await store.moveProject(readId(requestParams), requestParams))
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE2 }
  );
}

// src/backend/src/store.ts
import { randomUUID as randomUUID10 } from "node:crypto";

// src/backend/src/sqlite-store.ts
import fs2 from "node:fs";
import path3 from "node:path";
import { DatabaseSync } from "node:sqlite";
import { configureSqliteConnectionPragmas } from "openclaw/plugin-sdk/plugin-state-runtime";
import { resolveStateDir } from "openclaw/plugin-sdk/state-paths";
var FLOWBOARD_DB_RELATIVE_PATH = ["plugins", "flowboard", "flowboard.sqlite"];
var SCHEMA_VERSION = 6;
var FLOWBOARD_SQLITE_BUSY_TIMEOUT_MS = 5e3;
var FLOWBOARD_SQLITE_DIR_MODE = 448;
var FLOWBOARD_SQLITE_FILE_MODE = 384;
function resolveFlowboardSqlitePath(env = process.env) {
  return path3.join(resolveStateDir(env), ...FLOWBOARD_DB_RELATIVE_PATH);
}
function jsonValue(value) {
  return value === void 0 ? null : JSON.stringify(value);
}
function parseJson(value) {
  if (typeof value !== "string" || !value) {
    return void 0;
  }
  return JSON.parse(value);
}
function stringValue(row, key) {
  const value = row[key];
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
function numberValue(row, key) {
  const value = row[key];
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : void 0;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  return void 0;
}
function requiredString(row, key) {
  const value = stringValue(row, key);
  if (!value) {
    throw new Error(`flowboard sqlite row missing ${key}`);
  }
  return value;
}
function requiredNumber(row, key) {
  const value = numberValue(row, key);
  if (value === void 0) {
    throw new Error(`flowboard sqlite row missing ${key}`);
  }
  return value;
}
function optional(value) {
  return Object.keys(value).length > 0 ? value : void 0;
}
function asBlobContent(value) {
  return Buffer.from(value, "base64");
}
function blobToBase64(value) {
  if (value instanceof Uint8Array) {
    return Buffer.from(value).toString("base64");
  }
  if (typeof value === "string") {
    return Buffer.from(value).toString("base64");
  }
  return "";
}
function runTransaction(db, run) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = run();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
function tableColumns(db, tableName) {
  return new Set(
    db.prepare(`PRAGMA table_info(${tableName})`).all().flatMap(
      (row) => typeof row.name === "string" ? [row.name] : []
    )
  );
}
function ensureColumn(db, tableName, columnName, definition) {
  if (tableColumns(db, tableName).has(columnName)) {
    return;
  }
  db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${definition}`);
}
var FLOWBOARD_SCHEMA_SQL = `
    CREATE TABLE IF NOT EXISTS flowboard_schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at INTEGER NOT NULL
    ) STRICT;

    CREATE TABLE IF NOT EXISTS flowboard_boards (
      id TEXT PRIMARY KEY,
      name TEXT,
      description TEXT,
      icon TEXT,
      color TEXT,
      position REAL,
      version TEXT,
      current_objective TEXT,
      core_value TEXT,
      source_of_truth TEXT,
      repository_url TEXT,
      planning_path TEXT,
      homepage_url TEXT,
      default_workspace_json TEXT,
      orchestration_json TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      archived_at INTEGER
    ) STRICT;

    CREATE TABLE IF NOT EXISTS flowboard_cards (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL,
      title TEXT NOT NULL,
      notes TEXT,
      status TEXT NOT NULL,
      priority TEXT NOT NULL,
      agent_id TEXT,
      session_key TEXT,
      run_id TEXT,
      task_id TEXT,
      source_url TEXT,
      milestone_id TEXT,
      position REAL NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      started_at INTEGER,
      completed_at INTEGER,
      execution_id TEXT,
      execution_kind TEXT,
      execution_engine TEXT,
      execution_mode TEXT,
      execution_status TEXT,
      execution_model TEXT,
      execution_session_key TEXT,
      execution_run_id TEXT,
      execution_started_at INTEGER,
      execution_updated_at INTEGER,
      automation_json TEXT,
      claim_json TEXT,
      template_id TEXT,
      archived_at INTEGER,
      stale_json TEXT,
      lifecycle_status_source_updated_at INTEGER,
      failure_count INTEGER
    ) STRICT;
    CREATE INDEX IF NOT EXISTS flowboard_cards_board_status_idx
      ON flowboard_cards(board_id, status, position);
    CREATE INDEX IF NOT EXISTS flowboard_cards_session_idx
      ON flowboard_cards(session_key, run_id);

    CREATE TABLE IF NOT EXISTS flowboard_card_labels (
      card_id TEXT NOT NULL REFERENCES flowboard_cards(id) ON DELETE CASCADE,
      ordinal INTEGER NOT NULL,
      label TEXT NOT NULL,
      PRIMARY KEY(card_id, ordinal)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS flowboard_card_events (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL REFERENCES flowboard_cards(id) ON DELETE CASCADE,
      ordinal INTEGER NOT NULL,
      kind TEXT NOT NULL,
      at INTEGER NOT NULL,
      from_status TEXT,
      to_status TEXT,
      from_milestone_id TEXT,
      to_milestone_id TEXT,
      session_key TEXT,
      run_id TEXT
    ) STRICT;

    CREATE TABLE IF NOT EXISTS flowboard_card_attempts (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL REFERENCES flowboard_cards(id) ON DELETE CASCADE,
      ordinal INTEGER NOT NULL,
      status TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      ended_at INTEGER,
      engine TEXT,
      mode TEXT,
      model TEXT,
      session_key TEXT,
      run_id TEXT,
      error TEXT
    ) STRICT;

    CREATE TABLE IF NOT EXISTS flowboard_card_comments (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL REFERENCES flowboard_cards(id) ON DELETE CASCADE,
      ordinal INTEGER NOT NULL,
      body TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER
    ) STRICT;

    CREATE TABLE IF NOT EXISTS flowboard_card_links (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL REFERENCES flowboard_cards(id) ON DELETE CASCADE,
      ordinal INTEGER NOT NULL,
      type TEXT NOT NULL,
      target_card_id TEXT,
      title TEXT,
      url TEXT,
      created_at INTEGER NOT NULL
    ) STRICT;

    CREATE TABLE IF NOT EXISTS flowboard_card_proof (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL REFERENCES flowboard_cards(id) ON DELETE CASCADE,
      ordinal INTEGER NOT NULL,
      status TEXT NOT NULL,
      label TEXT,
      command TEXT,
      url TEXT,
      note TEXT,
      created_at INTEGER NOT NULL
    ) STRICT;

    CREATE TABLE IF NOT EXISTS flowboard_card_artifacts (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL REFERENCES flowboard_cards(id) ON DELETE CASCADE,
      ordinal INTEGER NOT NULL,
      label TEXT,
      url TEXT,
      path TEXT,
      mime_type TEXT,
      created_at INTEGER NOT NULL
    ) STRICT;

    CREATE TABLE IF NOT EXISTS flowboard_card_delivery (
      card_id TEXT PRIMARY KEY REFERENCES flowboard_cards(id) ON DELETE CASCADE,
      objective TEXT,
      delivery_summary TEXT,
      open_items TEXT,
      implementation_state TEXT,
      verification_state TEXT,
      release_state TEXT,
      updated_at INTEGER NOT NULL
    ) STRICT;

    CREATE TABLE IF NOT EXISTS flowboard_card_source_references (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL REFERENCES flowboard_cards(id) ON DELETE CASCADE,
      ordinal INTEGER NOT NULL,
      label TEXT NOT NULL,
      target TEXT NOT NULL,
      note TEXT,
      position REAL NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    ) STRICT;
    CREATE INDEX IF NOT EXISTS flowboard_card_source_references_card_position_idx
      ON flowboard_card_source_references(card_id, position);

    CREATE TABLE IF NOT EXISTS flowboard_card_diagnostics (
      card_id TEXT NOT NULL REFERENCES flowboard_cards(id) ON DELETE CASCADE,
      ordinal INTEGER NOT NULL,
      kind TEXT NOT NULL,
      severity TEXT NOT NULL,
      title TEXT NOT NULL,
      detail TEXT NOT NULL,
      first_seen_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL,
      count INTEGER NOT NULL,
      actions_json TEXT NOT NULL,
      PRIMARY KEY(card_id, ordinal)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS flowboard_card_notifications (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL REFERENCES flowboard_cards(id) ON DELETE CASCADE,
      ordinal INTEGER NOT NULL,
      kind TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      sequence INTEGER,
      session_key TEXT,
      run_id TEXT
    ) STRICT;

    CREATE TABLE IF NOT EXISTS flowboard_worker_logs (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL REFERENCES flowboard_cards(id) ON DELETE CASCADE,
      ordinal INTEGER NOT NULL,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      session_key TEXT,
      run_id TEXT
    ) STRICT;

    CREATE TABLE IF NOT EXISTS flowboard_worker_protocol (
      card_id TEXT PRIMARY KEY REFERENCES flowboard_cards(id) ON DELETE CASCADE,
      state TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      detail TEXT
    ) STRICT;

    CREATE TABLE IF NOT EXISTS flowboard_card_attachments (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL REFERENCES flowboard_cards(id) ON DELETE CASCADE,
      ordinal INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      byte_size INTEGER NOT NULL,
      mime_type TEXT,
      note TEXT,
      created_at INTEGER NOT NULL
    ) STRICT;
    CREATE INDEX IF NOT EXISTS flowboard_card_attachments_card_idx
      ON flowboard_card_attachments(card_id, ordinal);

    CREATE TABLE IF NOT EXISTS flowboard_attachment_blobs (
      attachment_id TEXT PRIMARY KEY,
      content BLOB NOT NULL
    ) STRICT;

    CREATE TABLE IF NOT EXISTS flowboard_notification_subscriptions (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL,
      card_id TEXT,
      session_key TEXT,
      run_id TEXT,
      target TEXT,
      event_kinds_json TEXT,
      last_event_at INTEGER,
      last_event_id TEXT,
      last_event_sequence INTEGER,
      delivered_event_ids_json TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    ) STRICT;

    CREATE TABLE IF NOT EXISTS flowboard_milestones (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      color TEXT,
      position REAL NOT NULL,
      state TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      completed_at INTEGER,
      archived_at INTEGER
    ) STRICT;
    CREATE INDEX IF NOT EXISTS flowboard_milestones_board_position_idx
      ON flowboard_milestones(board_id, position);

    CREATE TABLE IF NOT EXISTS flowboard_project_documents (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL,
      document_key TEXT NOT NULL,
      section TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'project',
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT,
      target TEXT,
      content TEXT,
      position REAL NOT NULL,
      hidden_at INTEGER,
      system INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE(board_id, document_key)
    ) STRICT;
    CREATE INDEX IF NOT EXISTS flowboard_project_documents_board_section_position_idx
      ON flowboard_project_documents(board_id, section, position);
  `;
function ensureFlowboardSchema(db) {
  db.exec(FLOWBOARD_SCHEMA_SQL);
  ensureColumn(
    db,
    "flowboard_cards",
    "lifecycle_status_source_updated_at",
    "lifecycle_status_source_updated_at INTEGER"
  );
  ensureColumn(db, "flowboard_cards", "milestone_id", "milestone_id TEXT");
  ensureColumn(db, "flowboard_card_events", "from_milestone_id", "from_milestone_id TEXT");
  ensureColumn(db, "flowboard_card_events", "to_milestone_id", "to_milestone_id TEXT");
  ensureColumn(db, "flowboard_boards", "position", "position REAL");
  ensureColumn(db, "flowboard_boards", "version", "version TEXT");
  ensureColumn(db, "flowboard_boards", "current_objective", "current_objective TEXT");
  ensureColumn(db, "flowboard_boards", "core_value", "core_value TEXT");
  ensureColumn(db, "flowboard_boards", "source_of_truth", "source_of_truth TEXT");
  ensureColumn(db, "flowboard_boards", "repository_url", "repository_url TEXT");
  ensureColumn(db, "flowboard_boards", "planning_path", "planning_path TEXT");
  ensureColumn(db, "flowboard_boards", "homepage_url", "homepage_url TEXT");
  ensureColumn(
    db,
    "flowboard_project_documents",
    "source",
    "source TEXT NOT NULL DEFAULT 'project'"
  );
  db.exec(`
    CREATE INDEX IF NOT EXISTS flowboard_cards_board_milestone_position_idx
      ON flowboard_cards(board_id, milestone_id, position);
  `);
  const migrationId = `schema-${SCHEMA_VERSION}`;
  const current = db.prepare("SELECT 1 AS found FROM flowboard_schema_migrations WHERE id = ?").get(migrationId);
  if (!current) {
    db.prepare(
      "INSERT OR IGNORE INTO flowboard_schema_migrations (id, applied_at) VALUES (?, ?)"
    ).run(migrationId, Date.now());
  }
}
function chmodIfExists(targetPath, mode) {
  try {
    fs2.chmodSync(targetPath, mode);
  } catch (err) {
    if (err.code !== "ENOENT") {
      throw err;
    }
  }
}
function hardenFlowboardDatabaseFiles(dbPath) {
  fs2.chmodSync(path3.dirname(dbPath), FLOWBOARD_SQLITE_DIR_MODE);
  chmodIfExists(dbPath, FLOWBOARD_SQLITE_FILE_MODE);
  chmodIfExists(`${dbPath}-wal`, FLOWBOARD_SQLITE_FILE_MODE);
  chmodIfExists(`${dbPath}-shm`, FLOWBOARD_SQLITE_FILE_MODE);
  chmodIfExists(`${dbPath}-journal`, FLOWBOARD_SQLITE_FILE_MODE);
}
function createDatabase(dbPath) {
  fs2.mkdirSync(path3.dirname(dbPath), { recursive: true, mode: FLOWBOARD_SQLITE_DIR_MODE });
  chmodIfExists(path3.dirname(dbPath), FLOWBOARD_SQLITE_DIR_MODE);
  if (!fs2.existsSync(dbPath)) {
    fs2.closeSync(fs2.openSync(dbPath, "a", FLOWBOARD_SQLITE_FILE_MODE));
  }
  const db = new DatabaseSync(dbPath);
  let maintenance;
  try {
    maintenance = configureSqliteConnectionPragmas(db, {
      busyTimeoutMs: FLOWBOARD_SQLITE_BUSY_TIMEOUT_MS,
      checkpointIntervalMs: 0,
      databaseLabel: "flowboard database",
      databasePath: dbPath,
      foreignKeys: true,
      synchronous: "NORMAL"
    });
    ensureFlowboardSchema(db);
    hardenFlowboardDatabaseFiles(dbPath);
    return { db, maintenance };
  } catch (error) {
    try {
      maintenance?.close();
    } finally {
      db.close();
    }
    throw error;
  }
}
function childRows(db, table, cardId) {
  return db.prepare(`SELECT * FROM ${table} WHERE card_id = ? ORDER BY ordinal ASC`).all(cardId);
}
function readLabels(db, cardId) {
  return childRows(db, "flowboard_card_labels", cardId).flatMap((row) => {
    const label = stringValue(row, "label");
    return label ? [label] : [];
  });
}
function readEvents(db, cardId) {
  const events = childRows(db, "flowboard_card_events", cardId).map((row) => {
    const event = {
      id: requiredString(row, "id"),
      kind: requiredString(row, "kind"),
      at: requiredNumber(row, "at")
    };
    const fromStatus = stringValue(row, "from_status");
    const toStatus = stringValue(row, "to_status");
    const fromMilestoneId = stringValue(row, "from_milestone_id");
    const toMilestoneId = stringValue(row, "to_milestone_id");
    const sessionKey = stringValue(row, "session_key");
    const runId = stringValue(row, "run_id");
    if (fromStatus) {
      event.fromStatus = fromStatus;
    }
    if (toStatus) {
      event.toStatus = toStatus;
    }
    if (fromMilestoneId) {
      event.fromMilestoneId = fromMilestoneId;
    }
    if (toMilestoneId) {
      event.toMilestoneId = toMilestoneId;
    }
    if (sessionKey) {
      event.sessionKey = sessionKey;
    }
    if (runId) {
      event.runId = runId;
    }
    return event;
  });
  return events.length > 0 ? events : void 0;
}
function readExecution(row) {
  const id = stringValue(row, "execution_id");
  if (!id) {
    return void 0;
  }
  return {
    id,
    kind: "agent-session",
    mode: requiredString(row, "execution_mode"),
    status: requiredString(row, "execution_status"),
    ...stringValue(row, "execution_engine") ? { engine: stringValue(row, "execution_engine") } : {},
    ...stringValue(row, "execution_model") ? { model: stringValue(row, "execution_model") } : {},
    ...stringValue(row, "execution_session_key") ? { sessionKey: stringValue(row, "execution_session_key") } : {},
    ...stringValue(row, "execution_run_id") ? { runId: stringValue(row, "execution_run_id") } : {},
    startedAt: requiredNumber(row, "execution_started_at"),
    updatedAt: requiredNumber(row, "execution_updated_at")
  };
}
function readMetadata(db, row) {
  const cardId = requiredString(row, "id");
  const attempts = childRows(db, "flowboard_card_attempts", cardId).map((child) => {
    const entry = {
      id: requiredString(child, "id"),
      status: requiredString(child, "status"),
      startedAt: requiredNumber(child, "started_at")
    };
    const endedAt = numberValue(child, "ended_at");
    const engine = stringValue(child, "engine");
    const mode = stringValue(child, "mode");
    const model = stringValue(child, "model");
    const sessionKey = stringValue(child, "session_key");
    const runId = stringValue(child, "run_id");
    const error = stringValue(child, "error");
    if (endedAt !== void 0) {
      entry.endedAt = endedAt;
    }
    if (engine) {
      entry.engine = engine;
    }
    if (mode) {
      entry.mode = mode;
    }
    if (model) {
      entry.model = model;
    }
    if (sessionKey) {
      entry.sessionKey = sessionKey;
    }
    if (runId) {
      entry.runId = runId;
    }
    if (error) {
      entry.error = error;
    }
    return entry;
  });
  const comments = childRows(db, "flowboard_card_comments", cardId).map((child) => {
    const entry = {
      id: requiredString(child, "id"),
      body: requiredString(child, "body"),
      createdAt: requiredNumber(child, "created_at")
    };
    const updatedAt = numberValue(child, "updated_at");
    if (updatedAt !== void 0) {
      entry.updatedAt = updatedAt;
    }
    return entry;
  });
  const links = childRows(db, "flowboard_card_links", cardId).map((child) => {
    const entry = {
      id: requiredString(child, "id"),
      type: requiredString(child, "type"),
      createdAt: requiredNumber(child, "created_at")
    };
    const targetCardId = stringValue(child, "target_card_id");
    const title = stringValue(child, "title");
    const url = stringValue(child, "url");
    if (targetCardId) {
      entry.targetCardId = targetCardId;
    }
    if (title) {
      entry.title = title;
    }
    if (url) {
      entry.url = url;
    }
    return entry;
  });
  const proof = childRows(db, "flowboard_card_proof", cardId).map((child) => {
    const entry = {
      id: requiredString(child, "id"),
      status: requiredString(child, "status"),
      createdAt: requiredNumber(child, "created_at")
    };
    const label = stringValue(child, "label");
    const command = stringValue(child, "command");
    const url = stringValue(child, "url");
    const note = stringValue(child, "note");
    if (label) {
      entry.label = label;
    }
    if (command) {
      entry.command = command;
    }
    if (url) {
      entry.url = url;
    }
    if (note) {
      entry.note = note;
    }
    return entry;
  });
  const artifacts = childRows(db, "flowboard_card_artifacts", cardId).map((child) => {
    const entry = {
      id: requiredString(child, "id"),
      createdAt: requiredNumber(child, "created_at")
    };
    const label = stringValue(child, "label");
    const url = stringValue(child, "url");
    const artifactPath = stringValue(child, "path");
    const mimeType = stringValue(child, "mime_type");
    if (label) {
      entry.label = label;
    }
    if (url) {
      entry.url = url;
    }
    if (artifactPath) {
      entry.path = artifactPath;
    }
    if (mimeType) {
      entry.mimeType = mimeType;
    }
    return entry;
  });
  const attachments = childRows(db, "flowboard_card_attachments", cardId).map((child) => {
    const entry = {
      id: requiredString(child, "id"),
      cardId: requiredString(child, "card_id"),
      createdAt: requiredNumber(child, "created_at"),
      fileName: requiredString(child, "file_name"),
      byteSize: requiredNumber(child, "byte_size")
    };
    const mimeType = stringValue(child, "mime_type");
    const note = stringValue(child, "note");
    if (mimeType) {
      entry.mimeType = mimeType;
    }
    if (note) {
      entry.note = note;
    }
    return entry;
  });
  const workerLogs = childRows(db, "flowboard_worker_logs", cardId).map((child) => {
    const entry = {
      id: requiredString(child, "id"),
      createdAt: requiredNumber(child, "created_at"),
      level: requiredString(child, "level"),
      message: requiredString(child, "message")
    };
    const sessionKey = stringValue(child, "session_key");
    const runId = stringValue(child, "run_id");
    if (sessionKey) {
      entry.sessionKey = sessionKey;
    }
    if (runId) {
      entry.runId = runId;
    }
    return entry;
  });
  const diagnostics = childRows(db, "flowboard_card_diagnostics", cardId).map((child) => ({
    kind: requiredString(child, "kind"),
    severity: requiredString(child, "severity"),
    title: requiredString(child, "title"),
    detail: requiredString(child, "detail"),
    firstSeenAt: requiredNumber(child, "first_seen_at"),
    lastSeenAt: requiredNumber(child, "last_seen_at"),
    count: requiredNumber(child, "count"),
    actions: parseJson(child.actions_json) ?? []
  }));
  const notifications = childRows(db, "flowboard_card_notifications", cardId).map((child) => {
    const entry = {
      id: requiredString(child, "id"),
      kind: requiredString(child, "kind"),
      createdAt: requiredNumber(child, "created_at"),
      message: requiredString(child, "message")
    };
    const sequence = numberValue(child, "sequence");
    const sessionKey = stringValue(child, "session_key");
    const runId = stringValue(child, "run_id");
    if (sequence !== void 0) {
      entry.sequence = sequence;
    }
    if (sessionKey) {
      entry.sessionKey = sessionKey;
    }
    if (runId) {
      entry.runId = runId;
    }
    return entry;
  });
  const protocol = db.prepare("SELECT * FROM flowboard_worker_protocol WHERE card_id = ?").get(cardId);
  const automation = parseJson(row.automation_json);
  const claim = parseJson(row.claim_json);
  const stale = parseJson(row.stale_json);
  const lifecycleStatusSourceUpdatedAt = numberValue(row, "lifecycle_status_source_updated_at");
  return optional({
    ...attempts.length > 0 ? { attempts } : {},
    ...comments.length > 0 ? { comments } : {},
    ...links.length > 0 ? { links } : {},
    ...proof.length > 0 ? { proof } : {},
    ...artifacts.length > 0 ? { artifacts } : {},
    ...attachments.length > 0 ? { attachments } : {},
    ...workerLogs.length > 0 ? { workerLogs } : {},
    ...protocol ? {
      workerProtocol: {
        state: requiredString(protocol, "state"),
        updatedAt: requiredNumber(protocol, "updated_at"),
        ...stringValue(protocol, "detail") ? { detail: stringValue(protocol, "detail") } : {}
      }
    } : {},
    ...automation ? { automation } : {},
    ...claim ? { claim } : {},
    ...diagnostics.length > 0 ? { diagnostics } : {},
    ...notifications.length > 0 ? { notifications } : {},
    ...stringValue(row, "template_id") ? { templateId: stringValue(row, "template_id") } : {},
    ...numberValue(row, "archived_at") !== void 0 ? { archivedAt: numberValue(row, "archived_at") } : {},
    ...stale ? { stale } : {},
    ...lifecycleStatusSourceUpdatedAt !== void 0 ? { lifecycleStatusSourceUpdatedAt } : {},
    ...numberValue(row, "failure_count") !== void 0 ? { failureCount: numberValue(row, "failure_count") } : {}
  });
}
function readDelivery(db, cardId) {
  const row = db.prepare("SELECT * FROM flowboard_card_delivery WHERE card_id = ?").get(cardId);
  if (!row) {
    return void 0;
  }
  const delivery = {
    updatedAt: requiredNumber(row, "updated_at")
  };
  const objective = stringValue(row, "objective");
  const deliverySummary = stringValue(row, "delivery_summary");
  const openItems = stringValue(row, "open_items");
  const implementationState = stringValue(row, "implementation_state");
  const verificationState = stringValue(row, "verification_state");
  const releaseState = stringValue(row, "release_state");
  if (objective) {
    delivery.objective = objective;
  }
  if (deliverySummary) {
    delivery.deliverySummary = deliverySummary;
  }
  if (openItems) {
    delivery.openItems = openItems;
  }
  if (implementationState) {
    delivery.implementationState = implementationState;
  }
  if (verificationState) {
    delivery.verificationState = verificationState;
  }
  if (releaseState) {
    delivery.releaseState = releaseState;
  }
  return delivery;
}
function readSourceReferences(db, cardId) {
  return childRows(db, "flowboard_card_source_references", cardId).map((child) => {
    const reference = {
      id: requiredString(child, "id"),
      label: requiredString(child, "label"),
      target: requiredString(child, "target"),
      position: requiredNumber(child, "position"),
      createdAt: requiredNumber(child, "created_at"),
      updatedAt: requiredNumber(child, "updated_at")
    };
    const note = stringValue(child, "note");
    if (note) {
      reference.note = note;
    }
    return reference;
  });
}
function readCard(db, row) {
  const card = {
    id: requiredString(row, "id"),
    title: requiredString(row, "title"),
    status: requiredString(row, "status"),
    priority: requiredString(row, "priority"),
    labels: readLabels(db, requiredString(row, "id")),
    position: requiredNumber(row, "position"),
    createdAt: requiredNumber(row, "created_at"),
    updatedAt: requiredNumber(row, "updated_at")
  };
  const metadata = readMetadata(db, row);
  const delivery = readDelivery(db, card.id);
  const sourceReferences = readSourceReferences(db, card.id);
  return {
    ...card,
    ...stringValue(row, "notes") ? { notes: stringValue(row, "notes") } : {},
    ...stringValue(row, "agent_id") ? { agentId: stringValue(row, "agent_id") } : {},
    ...stringValue(row, "session_key") ? { sessionKey: stringValue(row, "session_key") } : {},
    ...stringValue(row, "run_id") ? { runId: stringValue(row, "run_id") } : {},
    ...stringValue(row, "task_id") ? { taskId: stringValue(row, "task_id") } : {},
    ...stringValue(row, "source_url") ? { sourceUrl: stringValue(row, "source_url") } : {},
    ...stringValue(row, "milestone_id") ? { milestoneId: stringValue(row, "milestone_id") } : {},
    ...readExecution(row) ? { execution: readExecution(row) } : {},
    ...delivery ? { delivery } : {},
    ...sourceReferences.length ? { sourceReferences } : {},
    ...numberValue(row, "started_at") !== void 0 ? { startedAt: numberValue(row, "started_at") } : {},
    ...numberValue(row, "completed_at") !== void 0 ? { completedAt: numberValue(row, "completed_at") } : {},
    ...readEvents(db, card.id) ? { events: readEvents(db, card.id) } : {},
    ...metadata ? { metadata } : {}
  };
}
function cardBoardId2(card) {
  return card.metadata?.automation?.boardId ?? "default";
}
function bindNull(value) {
  if (value === void 0 || value === null || typeof value === "string" || typeof value === "number" || typeof value === "bigint" || value instanceof Uint8Array) {
    return value ?? null;
  }
  return JSON.stringify(value);
}
function insertChildren(db, table, cardId, entries, insert) {
  db.prepare(`DELETE FROM ${table} WHERE card_id = ?`).run(cardId);
  entries?.forEach(insert);
}
function insertCard(db, card) {
  const execution = card.execution;
  const metadata = card.metadata;
  db.prepare(
    `
      INSERT INTO flowboard_cards (
        id, board_id, title, notes, status, priority, agent_id, session_key, run_id, task_id,
        source_url, milestone_id, position, created_at, updated_at, started_at, completed_at,
        execution_id, execution_kind, execution_engine, execution_mode, execution_status,
        execution_model, execution_session_key, execution_run_id, execution_started_at,
        execution_updated_at, automation_json, claim_json, template_id, archived_at, stale_json,
        lifecycle_status_source_updated_at, failure_count
      ) VALUES (
        @id, @board_id, @title, @notes, @status, @priority, @agent_id, @session_key, @run_id,
        @task_id, @source_url, @milestone_id, @position, @created_at, @updated_at, @started_at, @completed_at,
        @execution_id, @execution_kind, @execution_engine, @execution_mode, @execution_status,
        @execution_model, @execution_session_key, @execution_run_id, @execution_started_at,
        @execution_updated_at, @automation_json, @claim_json, @template_id, @archived_at,
        @stale_json, @lifecycle_status_source_updated_at, @failure_count
      )
      ON CONFLICT(id) DO UPDATE SET
        board_id = excluded.board_id,
        title = excluded.title,
        notes = excluded.notes,
        status = excluded.status,
        priority = excluded.priority,
        agent_id = excluded.agent_id,
        session_key = excluded.session_key,
        run_id = excluded.run_id,
        task_id = excluded.task_id,
        source_url = excluded.source_url,
        milestone_id = excluded.milestone_id,
        position = excluded.position,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at,
        started_at = excluded.started_at,
        completed_at = excluded.completed_at,
        execution_id = excluded.execution_id,
        execution_kind = excluded.execution_kind,
        execution_engine = excluded.execution_engine,
        execution_mode = excluded.execution_mode,
        execution_status = excluded.execution_status,
        execution_model = excluded.execution_model,
        execution_session_key = excluded.execution_session_key,
        execution_run_id = excluded.execution_run_id,
        execution_started_at = excluded.execution_started_at,
        execution_updated_at = excluded.execution_updated_at,
        automation_json = excluded.automation_json,
        claim_json = excluded.claim_json,
        template_id = excluded.template_id,
        archived_at = excluded.archived_at,
        stale_json = excluded.stale_json,
        lifecycle_status_source_updated_at = excluded.lifecycle_status_source_updated_at,
        failure_count = excluded.failure_count
    `
  ).run({
    id: card.id,
    board_id: cardBoardId2(card),
    title: card.title,
    notes: bindNull(card.notes),
    status: card.status,
    priority: card.priority,
    agent_id: bindNull(card.agentId),
    session_key: bindNull(card.sessionKey),
    run_id: bindNull(card.runId),
    task_id: bindNull(card.taskId),
    source_url: bindNull(card.sourceUrl),
    milestone_id: bindNull(card.milestoneId),
    position: card.position,
    created_at: card.createdAt,
    updated_at: card.updatedAt,
    started_at: bindNull(card.startedAt),
    completed_at: bindNull(card.completedAt),
    execution_id: bindNull(execution?.id),
    execution_kind: bindNull(execution?.kind),
    execution_engine: bindNull(execution?.engine),
    execution_mode: bindNull(execution?.mode),
    execution_status: bindNull(execution?.status),
    execution_model: bindNull(execution?.model),
    execution_session_key: bindNull(execution?.sessionKey),
    execution_run_id: bindNull(execution?.runId),
    execution_started_at: bindNull(execution?.startedAt),
    execution_updated_at: bindNull(execution?.updatedAt),
    automation_json: jsonValue(metadata?.automation),
    claim_json: jsonValue(metadata?.claim),
    template_id: bindNull(metadata?.templateId),
    archived_at: bindNull(metadata?.archivedAt),
    stale_json: jsonValue(metadata?.stale),
    lifecycle_status_source_updated_at: bindNull(metadata?.lifecycleStatusSourceUpdatedAt),
    failure_count: bindNull(metadata?.failureCount)
  });
  insertChildren(db, "flowboard_card_labels", card.id, card.labels, (label, ordinal) => {
    db.prepare("INSERT INTO flowboard_card_labels (card_id, ordinal, label) VALUES (?, ?, ?)").run(
      card.id,
      ordinal,
      label
    );
  });
  insertChildren(db, "flowboard_card_events", card.id, card.events, (event, ordinal) => {
    db.prepare(
      `
        INSERT INTO flowboard_card_events
          (id, card_id, ordinal, kind, at, from_status, to_status, from_milestone_id, to_milestone_id, session_key, run_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      event.id,
      card.id,
      ordinal,
      event.kind,
      event.at,
      bindNull(event.fromStatus),
      bindNull(event.toStatus),
      bindNull(event.fromMilestoneId),
      bindNull(event.toMilestoneId),
      bindNull(event.sessionKey),
      bindNull(event.runId)
    );
  });
  insertChildren(db, "flowboard_card_attempts", card.id, metadata?.attempts, (entry, ordinal) => {
    db.prepare(
      `
        INSERT INTO flowboard_card_attempts
          (id, card_id, ordinal, status, started_at, ended_at, engine, mode, model, session_key, run_id, error)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      entry.id,
      card.id,
      ordinal,
      entry.status,
      entry.startedAt,
      bindNull(entry.endedAt),
      bindNull(entry.engine),
      bindNull(entry.mode),
      bindNull(entry.model),
      bindNull(entry.sessionKey),
      bindNull(entry.runId),
      bindNull(entry.error)
    );
  });
  insertChildren(db, "flowboard_card_comments", card.id, metadata?.comments, (entry, ordinal) => {
    db.prepare(
      `
        INSERT INTO flowboard_card_comments (id, card_id, ordinal, body, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `
    ).run(entry.id, card.id, ordinal, entry.body, entry.createdAt, bindNull(entry.updatedAt));
  });
  insertChildren(db, "flowboard_card_links", card.id, metadata?.links, (entry, ordinal) => {
    db.prepare(
      `
        INSERT INTO flowboard_card_links
          (id, card_id, ordinal, type, target_card_id, title, url, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      entry.id,
      card.id,
      ordinal,
      entry.type,
      bindNull(entry.targetCardId),
      bindNull(entry.title),
      bindNull(entry.url),
      entry.createdAt
    );
  });
  insertChildren(db, "flowboard_card_proof", card.id, metadata?.proof, (entry, ordinal) => {
    db.prepare(
      `
        INSERT INTO flowboard_card_proof
          (id, card_id, ordinal, status, label, command, url, note, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      entry.id,
      card.id,
      ordinal,
      entry.status,
      bindNull(entry.label),
      bindNull(entry.command),
      bindNull(entry.url),
      bindNull(entry.note),
      entry.createdAt
    );
  });
  insertChildren(db, "flowboard_card_artifacts", card.id, metadata?.artifacts, (entry, ordinal) => {
    db.prepare(
      `
        INSERT INTO flowboard_card_artifacts
          (id, card_id, ordinal, label, url, path, mime_type, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      entry.id,
      card.id,
      ordinal,
      bindNull(entry.label),
      bindNull(entry.url),
      bindNull(entry.path),
      bindNull(entry.mimeType),
      entry.createdAt
    );
  });
  db.prepare("DELETE FROM flowboard_card_delivery WHERE card_id = ?").run(card.id);
  if (card.delivery) {
    db.prepare(
      `
        INSERT INTO flowboard_card_delivery
          (card_id, objective, delivery_summary, open_items, implementation_state,
           verification_state, release_state, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      card.id,
      bindNull(card.delivery.objective),
      bindNull(card.delivery.deliverySummary),
      bindNull(card.delivery.openItems),
      bindNull(card.delivery.implementationState),
      bindNull(card.delivery.verificationState),
      bindNull(card.delivery.releaseState),
      card.delivery.updatedAt
    );
  }
  insertChildren(
    db,
    "flowboard_card_source_references",
    card.id,
    card.sourceReferences,
    (entry, ordinal) => {
      db.prepare(
        `
          INSERT INTO flowboard_card_source_references
            (id, card_id, ordinal, label, target, note, position, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      ).run(
        entry.id,
        card.id,
        ordinal,
        entry.label,
        entry.target,
        bindNull(entry.note),
        entry.position,
        entry.createdAt,
        entry.updatedAt
      );
    }
  );
  insertChildren(
    db,
    "flowboard_card_attachments",
    card.id,
    metadata?.attachments,
    (entry, ordinal) => {
      db.prepare(
        `
          INSERT INTO flowboard_card_attachments
            (id, card_id, ordinal, file_name, byte_size, mime_type, note, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `
      ).run(
        entry.id,
        entry.cardId,
        ordinal,
        entry.fileName,
        entry.byteSize,
        bindNull(entry.mimeType),
        bindNull(entry.note),
        entry.createdAt
      );
    }
  );
  insertChildren(
    db,
    "flowboard_card_diagnostics",
    card.id,
    metadata?.diagnostics,
    (entry, ordinal) => {
      db.prepare(
        `
          INSERT INTO flowboard_card_diagnostics
            (card_id, ordinal, kind, severity, title, detail, first_seen_at, last_seen_at, count, actions_json)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      ).run(
        card.id,
        ordinal,
        entry.kind,
        entry.severity,
        entry.title,
        entry.detail,
        entry.firstSeenAt,
        entry.lastSeenAt,
        entry.count,
        JSON.stringify(entry.actions)
      );
    }
  );
  insertChildren(
    db,
    "flowboard_card_notifications",
    card.id,
    metadata?.notifications,
    (entry, ordinal) => {
      db.prepare(
        `
          INSERT INTO flowboard_card_notifications
            (id, card_id, ordinal, kind, message, created_at, sequence, session_key, run_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      ).run(
        entry.id,
        card.id,
        ordinal,
        entry.kind,
        entry.message,
        entry.createdAt,
        bindNull(entry.sequence),
        bindNull(entry.sessionKey),
        bindNull(entry.runId)
      );
    }
  );
  insertChildren(db, "flowboard_worker_logs", card.id, metadata?.workerLogs, (entry, ordinal) => {
    db.prepare(
      `
        INSERT INTO flowboard_worker_logs
          (id, card_id, ordinal, level, message, created_at, session_key, run_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      entry.id,
      card.id,
      ordinal,
      entry.level,
      entry.message,
      entry.createdAt,
      bindNull(entry.sessionKey),
      bindNull(entry.runId)
    );
  });
  db.prepare("DELETE FROM flowboard_worker_protocol WHERE card_id = ?").run(card.id);
  if (metadata?.workerProtocol) {
    db.prepare(
      `
        INSERT INTO flowboard_worker_protocol (card_id, state, updated_at, detail)
        VALUES (?, ?, ?, ?)
      `
    ).run(
      card.id,
      metadata.workerProtocol.state,
      metadata.workerProtocol.updatedAt,
      bindNull(metadata.workerProtocol.detail)
    );
  }
}
var FlowboardSqliteCardStore = class {
  constructor(db) {
    this.db = db;
  }
  async register(key, value) {
    if (value.version !== 1 || value.card.id !== key) {
      throw new Error("invalid flowboard card payload");
    }
    runTransaction(this.db, () => insertCard(this.db, value.card));
  }
  async lookup(key) {
    const row = this.db.prepare("SELECT * FROM flowboard_cards WHERE id = ?").get(key);
    return row ? { version: 1, card: readCard(this.db, row) } : void 0;
  }
  async delete(key) {
    const result = runTransaction(this.db, () => {
      this.db.prepare(
        `
            DELETE FROM flowboard_attachment_blobs
            WHERE attachment_id IN (
              SELECT id FROM flowboard_card_attachments WHERE card_id = ?
            )
          `
      ).run(key);
      return this.db.prepare("DELETE FROM flowboard_cards WHERE id = ?").run(key);
    });
    return result.changes > 0;
  }
  async entries() {
    return this.db.prepare("SELECT * FROM flowboard_cards ORDER BY created_at ASC, id ASC").all().map((row) => ({
      key: requiredString(row, "id"),
      value: { version: 1, card: readCard(this.db, row) }
    }));
  }
};
var FlowboardSqliteBoardStore = class {
  constructor(db) {
    this.db = db;
  }
  async register(key, value) {
    if (value.version !== 1 || value.board.id !== key) {
      throw new Error("invalid flowboard board payload");
    }
    const board = value.board;
    this.db.prepare(
      `
          INSERT INTO flowboard_boards (
            id, name, description, icon, color, position, version, current_objective, core_value,
            source_of_truth, repository_url, planning_path, homepage_url,
            default_workspace_json, orchestration_json,
            created_at, updated_at, archived_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            description = excluded.description,
            icon = excluded.icon,
            color = excluded.color,
            position = excluded.position,
            version = excluded.version,
            current_objective = excluded.current_objective,
            core_value = excluded.core_value,
            source_of_truth = excluded.source_of_truth,
            repository_url = excluded.repository_url,
            planning_path = excluded.planning_path,
            homepage_url = excluded.homepage_url,
            default_workspace_json = excluded.default_workspace_json,
            orchestration_json = excluded.orchestration_json,
            created_at = excluded.created_at,
            updated_at = excluded.updated_at,
            archived_at = excluded.archived_at
        `
    ).run(
      board.id,
      bindNull(board.name),
      bindNull(board.description),
      bindNull(board.icon),
      bindNull(board.color),
      bindNull(board.position),
      bindNull(board.version),
      bindNull(board.currentObjective),
      bindNull(board.coreValue),
      bindNull(board.sourceOfTruth),
      bindNull(board.repositoryUrl),
      bindNull(board.planningPath),
      bindNull(board.homepageUrl),
      jsonValue(board.defaultWorkspace),
      jsonValue(board.orchestration),
      board.createdAt,
      board.updatedAt,
      bindNull(board.archivedAt)
    );
  }
  async lookup(key) {
    const row = this.db.prepare("SELECT * FROM flowboard_boards WHERE id = ?").get(key);
    if (!row) {
      return void 0;
    }
    const defaultWorkspace = parseJson(row.default_workspace_json);
    const orchestration = parseJson(row.orchestration_json);
    return {
      version: 1,
      board: {
        id: requiredString(row, "id"),
        ...stringValue(row, "name") ? { name: stringValue(row, "name") } : {},
        ...stringValue(row, "description") ? { description: stringValue(row, "description") } : {},
        ...stringValue(row, "icon") ? { icon: stringValue(row, "icon") } : {},
        ...stringValue(row, "color") ? { color: stringValue(row, "color") } : {},
        ...numberValue(row, "position") !== void 0 ? { position: numberValue(row, "position") } : {},
        ...stringValue(row, "version") ? { version: stringValue(row, "version") } : {},
        ...stringValue(row, "current_objective") ? { currentObjective: stringValue(row, "current_objective") } : {},
        ...stringValue(row, "core_value") ? { coreValue: stringValue(row, "core_value") } : {},
        ...stringValue(row, "source_of_truth") ? { sourceOfTruth: stringValue(row, "source_of_truth") } : {},
        ...stringValue(row, "repository_url") ? { repositoryUrl: stringValue(row, "repository_url") } : {},
        ...stringValue(row, "planning_path") ? { planningPath: stringValue(row, "planning_path") } : {},
        ...stringValue(row, "homepage_url") ? { homepageUrl: stringValue(row, "homepage_url") } : {},
        ...defaultWorkspace ? { defaultWorkspace } : {},
        ...orchestration ? { orchestration } : {},
        createdAt: requiredNumber(row, "created_at"),
        updatedAt: requiredNumber(row, "updated_at"),
        ...numberValue(row, "archived_at") !== void 0 ? { archivedAt: numberValue(row, "archived_at") } : {}
      }
    };
  }
  async delete(key) {
    const result = this.db.prepare("DELETE FROM flowboard_boards WHERE id = ?").run(key);
    return result.changes > 0;
  }
  async entries() {
    const rows = this.db.prepare("SELECT id FROM flowboard_boards ORDER BY id ASC").all();
    const entries = [];
    for (const row of rows) {
      const key = requiredString(row, "id");
      const value = await this.lookup(key);
      if (value) {
        entries.push({ key, value });
      }
    }
    return entries;
  }
};
function readMilestone(row) {
  return {
    id: requiredString(row, "id"),
    boardId: requiredString(row, "board_id"),
    title: requiredString(row, "title"),
    position: requiredNumber(row, "position"),
    state: requiredString(row, "state"),
    createdAt: requiredNumber(row, "created_at"),
    updatedAt: requiredNumber(row, "updated_at"),
    ...stringValue(row, "description") ? { description: stringValue(row, "description") } : {},
    ...stringValue(row, "color") ? { color: stringValue(row, "color") } : {},
    ...numberValue(row, "completed_at") !== void 0 ? { completedAt: numberValue(row, "completed_at") } : {},
    ...numberValue(row, "archived_at") !== void 0 ? { archivedAt: numberValue(row, "archived_at") } : {}
  };
}
var FlowboardSqliteMilestoneStore = class {
  constructor(db) {
    this.db = db;
  }
  async register(key, value) {
    if (value.version !== 1 || value.milestone.id !== key) {
      throw new Error("invalid flowboard milestone payload");
    }
    const milestone = value.milestone;
    this.db.prepare(
      `
          INSERT INTO flowboard_milestones (
            id, board_id, title, description, color, position, state, created_at, updated_at,
            completed_at, archived_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            board_id = excluded.board_id,
            title = excluded.title,
            description = excluded.description,
            color = excluded.color,
            position = excluded.position,
            state = excluded.state,
            created_at = excluded.created_at,
            updated_at = excluded.updated_at,
            completed_at = excluded.completed_at,
            archived_at = excluded.archived_at
        `
    ).run(
      milestone.id,
      milestone.boardId,
      milestone.title,
      bindNull(milestone.description),
      bindNull(milestone.color),
      milestone.position,
      milestone.state,
      milestone.createdAt,
      milestone.updatedAt,
      bindNull(milestone.completedAt),
      bindNull(milestone.archivedAt)
    );
  }
  async lookup(key) {
    const row = this.db.prepare("SELECT * FROM flowboard_milestones WHERE id = ?").get(key);
    return row ? { version: 1, milestone: readMilestone(row) } : void 0;
  }
  async delete(key) {
    const result = this.db.prepare("DELETE FROM flowboard_milestones WHERE id = ?").run(key);
    return result.changes > 0;
  }
  async entries() {
    return this.db.prepare("SELECT * FROM flowboard_milestones ORDER BY board_id ASC, position ASC, id ASC").all().map((row) => ({
      key: requiredString(row, "id"),
      value: { version: 1, milestone: readMilestone(row) }
    }));
  }
};
function readProjectDocument(row) {
  return {
    id: requiredString(row, "id"),
    boardId: requiredString(row, "board_id"),
    key: requiredString(row, "document_key"),
    section: requiredString(row, "section"),
    source: stringValue(row, "source") ?? "project",
    type: requiredString(row, "type"),
    title: requiredString(row, "title"),
    position: requiredNumber(row, "position"),
    createdAt: requiredNumber(row, "created_at"),
    updatedAt: requiredNumber(row, "updated_at"),
    ...stringValue(row, "summary") ? { summary: stringValue(row, "summary") } : {},
    ...stringValue(row, "target") ? { target: stringValue(row, "target") } : {},
    ...stringValue(row, "content") ? { content: stringValue(row, "content") } : {},
    ...numberValue(row, "hidden_at") !== void 0 ? { hiddenAt: numberValue(row, "hidden_at") } : {},
    ...numberValue(row, "system") === 1 ? { system: true } : {}
  };
}
var FlowboardSqliteProjectDocumentStore = class {
  constructor(db) {
    this.db = db;
  }
  async register(key, value) {
    if (value.version !== 1 || value.document.id !== key) {
      throw new Error("invalid flowboard project document payload");
    }
    const document = value.document;
    this.db.prepare(
      `
          INSERT INTO flowboard_project_documents (
            id, board_id, document_key, section, source, type, title, summary, target, content,
            position, hidden_at, system, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            board_id = excluded.board_id,
            document_key = excluded.document_key,
            section = excluded.section,
            source = excluded.source,
            type = excluded.type,
            title = excluded.title,
            summary = excluded.summary,
            target = excluded.target,
            content = excluded.content,
            position = excluded.position,
            hidden_at = excluded.hidden_at,
            system = excluded.system,
            created_at = excluded.created_at,
            updated_at = excluded.updated_at
        `
    ).run(
      document.id,
      document.boardId,
      document.key,
      document.section,
      document.source,
      document.type,
      document.title,
      bindNull(document.summary),
      bindNull(document.target),
      bindNull(document.content),
      document.position,
      bindNull(document.hiddenAt),
      document.system ? 1 : 0,
      document.createdAt,
      document.updatedAt
    );
  }
  async lookup(key) {
    const row = this.db.prepare("SELECT * FROM flowboard_project_documents WHERE id = ?").get(key);
    return row ? { version: 1, document: readProjectDocument(row) } : void 0;
  }
  async delete(key) {
    const result = this.db.prepare("DELETE FROM flowboard_project_documents WHERE id = ?").run(key);
    return result.changes > 0;
  }
  async entries() {
    return this.db.prepare(
      "SELECT * FROM flowboard_project_documents ORDER BY board_id ASC, section ASC, position ASC, id ASC"
    ).all().map((row) => ({
      key: requiredString(row, "id"),
      value: { version: 1, document: readProjectDocument(row) }
    }));
  }
};
var FlowboardSqliteSubscriptionStore = class {
  constructor(db) {
    this.db = db;
  }
  async register(key, value) {
    if (value.version !== 1 || value.subscription.id !== key) {
      throw new Error("invalid flowboard notification subscription payload");
    }
    const subscription = value.subscription;
    this.db.prepare(
      `
          INSERT INTO flowboard_notification_subscriptions (
            id, board_id, card_id, session_key, run_id, target, event_kinds_json,
            last_event_at, last_event_id, last_event_sequence, delivered_event_ids_json,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            board_id = excluded.board_id,
            card_id = excluded.card_id,
            session_key = excluded.session_key,
            run_id = excluded.run_id,
            target = excluded.target,
            event_kinds_json = excluded.event_kinds_json,
            last_event_at = excluded.last_event_at,
            last_event_id = excluded.last_event_id,
            last_event_sequence = excluded.last_event_sequence,
            delivered_event_ids_json = excluded.delivered_event_ids_json,
            created_at = excluded.created_at,
            updated_at = excluded.updated_at
        `
    ).run(
      subscription.id,
      subscription.boardId,
      bindNull(subscription.cardId),
      bindNull(subscription.sessionKey),
      bindNull(subscription.runId),
      bindNull(subscription.target),
      jsonValue(subscription.eventKinds),
      bindNull(subscription.lastEventAt),
      bindNull(subscription.lastEventId),
      bindNull(subscription.lastEventSequence),
      jsonValue(subscription.deliveredEventIds),
      subscription.createdAt,
      subscription.updatedAt
    );
  }
  async lookup(key) {
    const row = this.db.prepare("SELECT * FROM flowboard_notification_subscriptions WHERE id = ?").get(key);
    if (!row) {
      return void 0;
    }
    const eventKinds = parseJson(row.event_kinds_json);
    const deliveredEventIds = parseJson(row.delivered_event_ids_json);
    return {
      version: 1,
      subscription: {
        id: requiredString(row, "id"),
        boardId: requiredString(row, "board_id"),
        ...stringValue(row, "card_id") ? { cardId: stringValue(row, "card_id") } : {},
        ...stringValue(row, "session_key") ? { sessionKey: stringValue(row, "session_key") } : {},
        ...stringValue(row, "run_id") ? { runId: stringValue(row, "run_id") } : {},
        ...stringValue(row, "target") ? { target: stringValue(row, "target") } : {},
        ...eventKinds ? { eventKinds } : {},
        ...numberValue(row, "last_event_at") !== void 0 ? { lastEventAt: numberValue(row, "last_event_at") } : {},
        ...stringValue(row, "last_event_id") ? { lastEventId: stringValue(row, "last_event_id") } : {},
        ...numberValue(row, "last_event_sequence") !== void 0 ? { lastEventSequence: numberValue(row, "last_event_sequence") } : {},
        ...deliveredEventIds ? { deliveredEventIds } : {},
        createdAt: requiredNumber(row, "created_at"),
        updatedAt: requiredNumber(row, "updated_at")
      }
    };
  }
  async delete(key) {
    const result = this.db.prepare("DELETE FROM flowboard_notification_subscriptions WHERE id = ?").run(key);
    return result.changes > 0;
  }
  async entries() {
    const rows = this.db.prepare(
      "SELECT id FROM flowboard_notification_subscriptions ORDER BY created_at ASC, id ASC"
    ).all();
    const entries = [];
    for (const row of rows) {
      const key = requiredString(row, "id");
      const value = await this.lookup(key);
      if (value) {
        entries.push({ key, value });
      }
    }
    return entries;
  }
};
var FlowboardSqliteAttachmentStore = class {
  constructor(db) {
    this.db = db;
  }
  async register(key, value) {
    if (value.version !== 1 || value.attachment.id !== key) {
      throw new Error("invalid flowboard attachment payload");
    }
    const attachment = value.attachment;
    this.db.prepare(
      `
          INSERT INTO flowboard_attachment_blobs (attachment_id, content)
          VALUES (?, ?)
          ON CONFLICT(attachment_id) DO UPDATE SET content = excluded.content
        `
    ).run(attachment.id, asBlobContent(value.contentBase64));
  }
  async lookup(key) {
    const row = this.db.prepare(
      `
          SELECT a.*, b.content
          FROM flowboard_card_attachments a
          JOIN flowboard_attachment_blobs b ON b.attachment_id = a.id
          WHERE a.id = ?
        `
    ).get(key);
    if (!row) {
      return void 0;
    }
    return {
      version: 1,
      attachment: {
        id: requiredString(row, "id"),
        cardId: requiredString(row, "card_id"),
        createdAt: requiredNumber(row, "created_at"),
        fileName: requiredString(row, "file_name"),
        byteSize: requiredNumber(row, "byte_size"),
        ...stringValue(row, "mime_type") ? { mimeType: stringValue(row, "mime_type") } : {},
        ...stringValue(row, "note") ? { note: stringValue(row, "note") } : {}
      },
      contentBase64: blobToBase64(row.content)
    };
  }
  async delete(key) {
    const deleted = runTransaction(this.db, () => {
      this.db.prepare("DELETE FROM flowboard_attachment_blobs WHERE attachment_id = ?").run(key);
      return this.db.prepare("DELETE FROM flowboard_card_attachments WHERE id = ?").run(key);
    });
    return deleted.changes > 0;
  }
  async entries() {
    const rows = this.db.prepare(
      `
          SELECT a.id
          FROM flowboard_card_attachments a
          JOIN flowboard_attachment_blobs b ON b.attachment_id = a.id
          ORDER BY a.created_at ASC, a.id ASC
        `
    ).all();
    const entries = [];
    for (const row of rows) {
      const key = requiredString(row, "id");
      const value = await this.lookup(key);
      if (value) {
        entries.push({ key, value });
      }
    }
    return entries;
  }
};
function createFlowboardSqliteStores(options = {}) {
  const { db, maintenance } = createDatabase(
    options.dbPath ?? resolveFlowboardSqlitePath(options.env)
  );
  return {
    cards: new FlowboardSqliteCardStore(db),
    boards: new FlowboardSqliteBoardStore(db),
    milestones: new FlowboardSqliteMilestoneStore(db),
    documents: new FlowboardSqliteProjectDocumentStore(db),
    subscriptions: new FlowboardSqliteSubscriptionStore(db),
    attachments: new FlowboardSqliteAttachmentStore(db),
    // This connection-local primitive changes only after another connection commits.
    dataVersion: () => requiredNumber(db.prepare("PRAGMA data_version").get(), "data_version"),
    close: () => {
      maintenance.close();
      db.close();
    }
  };
}

// src/backend/src/store-projects.ts
init_contract();
import { randomUUID as randomUUID9 } from "node:crypto";

// src/backend/src/store-workflow.ts
import { randomUUID as randomUUID8 } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { isFutureDateTimestampMs as isFutureDateTimestampMs2 } from "openclaw/plugin-sdk/number-runtime";
import { safeEqualSecret as safeEqualSecret2 } from "openclaw/plugin-sdk/security-runtime";

// src/backend/src/store-promote.ts
import { randomUUID as randomUUID7 } from "node:crypto";

// src/backend/src/store-enrichment.ts
import { randomUUID as randomUUID6 } from "node:crypto";

// src/backend/src/store-core.ts
import { randomUUID as randomUUID5 } from "node:crypto";

// src/backend/src/store-automation.ts
function normalizeTrustedWorkspaceAccess(value, fallback) {
  if (value === void 0) {
    return fallback;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("workspace access must be an object.");
  }
  const record = value;
  if (record.unrestricted === true) {
    return { unrestricted: true };
  }
  if (record.unrestricted !== false || !Array.isArray(record.roots)) {
    throw new Error("restricted workspace access requires roots.");
  }
  if (typeof record.writable !== "boolean") {
    throw new Error("restricted workspace access requires a writable flag.");
  }
  const roots = Array.from(
    new Set(
      record.roots.map((entry) => {
        const root = normalizeBoundedString(entry, void 0, 2e3, "workspace access root");
        if (!root || !isAbsoluteWorkspacePath(root)) {
          throw new Error("workspace access roots must be absolute.");
        }
        return root;
      })
    )
  );
  if (roots.length === 0) {
    throw new Error("restricted workspace access requires at least one root.");
  }
  return { unrestricted: false, roots, writable: record.writable };
}
function normalizeCardAutomation(input) {
  const workspaceAccess = normalizeTrustedWorkspaceAccess(input.workspaceAccess);
  return normalizeAutomation(
    {
      tenant: input.tenant,
      boardId: input.boardId,
      createdByCardId: input.createdByCardId,
      idempotencyKey: input.idempotencyKey,
      skills: input.skills,
      workspace: input.workspace,
      maxRuntimeSeconds: input.maxRuntimeSeconds,
      maxRetries: input.maxRetries,
      scheduledAt: input.scheduledAt
    },
    workspaceAccess ? { workspaceAccess } : void 0
  );
}
function normalizeAutomationPatch(patch, current) {
  const workspaceAccess = Object.hasOwn(patch, "workspaceAccess") ? normalizeTrustedWorkspaceAccess(patch.workspaceAccess, current?.workspaceAccess) : current?.workspaceAccess;
  return normalizeAutomation(patch, {
    ...current,
    ...workspaceAccess ? { workspaceAccess } : {}
  });
}

// src/backend/src/store-change-tracker.ts
import { randomUUID as randomUUID4 } from "node:crypto";
var FlowboardChangeTracker = class {
  constructor(readDataVersion) {
    this.readDataVersion = readDataVersion;
    this.externalDataVersion = readDataVersion?.();
  }
  epoch = randomUUID4();
  revision = 0;
  latestChange;
  mutationRevision = 0;
  externalDataVersion;
  listeners = /* @__PURE__ */ new Set();
  track(store) {
    return {
      register: async (key, value) => {
        await store.register(key, value);
        this.mutationRevision += 1;
      },
      lookup: async (key) => await store.lookup(key),
      delete: async (key) => {
        const deleted = await store.delete(key);
        if (deleted) {
          this.mutationRevision += 1;
        }
        return deleted;
      },
      entries: async () => await store.entries()
    };
  }
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  announceEpoch() {
    this.emit();
  }
  current() {
    return this.latestChange;
  }
  reconcileExternalChanges() {
    if (!this.readDataVersion) {
      return false;
    }
    const current = this.readDataVersion();
    if (current === this.externalDataVersion) {
      return false;
    }
    this.externalDataVersion = current;
    this.emit();
    return true;
  }
  async runMutation(run) {
    const initialRevision = this.mutationRevision;
    try {
      return await run();
    } finally {
      if (this.mutationRevision !== initialRevision) {
        this.emit();
      }
    }
  }
  emit() {
    const change = { epoch: this.epoch, revision: ++this.revision };
    this.latestChange = change;
    for (const listener of this.listeners) {
      try {
        listener(change);
      } catch {
      }
    }
  }
};

// src/backend/src/store-core.ts
var FlowboardCoreStore = class {
  mutationQueue = Promise.resolve();
  lastNotificationSequence = 0;
  changes;
  store;
  boardStore;
  milestoneStore;
  documentStore;
  subscriptionStore;
  attachmentStore;
  constructor(store, stores = {}) {
    this.changes = new FlowboardChangeTracker(stores.dataVersion);
    this.store = this.changes.track(store);
    this.boardStore = this.changes.track(
      stores.boards ?? store
    );
    this.milestoneStore = this.changes.track(
      stores.milestones ?? store
    );
    this.documentStore = this.changes.track(
      stores.documents ?? store
    );
    this.subscriptionStore = stores.subscriptions ?? store;
    this.attachmentStore = stores.attachments ?? store;
  }
  subscribeChanges(listener) {
    return this.changes.subscribe(listener);
  }
  announceChangeEpoch() {
    this.changes.announceEpoch();
  }
  reconcileExternalChanges() {
    return this.changes.reconcileExternalChanges();
  }
  currentChange() {
    return this.changes.current();
  }
  async waitForChange(after, timeoutMs) {
    const isNewer = (change) => !after || change.epoch !== after.epoch || change.revision > after.revision;
    const current = this.changes.current();
    if (current && isNewer(current)) {
      return { change: current, timedOut: false };
    }
    return await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        unsubscribe();
        resolve({ change: this.changes.current(), timedOut: true });
      }, timeoutMs);
      const unsubscribe = this.changes.subscribe((change) => {
        if (!isNewer(change)) {
          return;
        }
        clearTimeout(timeout);
        unsubscribe();
        resolve({ change, timedOut: false });
      });
    });
  }
  async enqueueMutation(run) {
    const runAndNotify = async () => await this.changes.runMutation(run);
    const result = this.mutationQueue.then(runAndNotify, runAndNotify);
    this.mutationQueue = result.then(
      () => void 0,
      () => void 0
    );
    return await result;
  }
  async updateMetadata(id, mutate, options = {}) {
    return await this.enqueueMutation(async () => {
      const existing = await this.get(id);
      if (!existing) {
        throw new Error(`card not found: ${id}`);
      }
      return await this.updateCard(id, { metadata: mutate(existing) }, options);
    });
  }
  async deleteDetachedAttachments(existing, next) {
    const nextIds = new Set(next.metadata?.attachments?.map((attachment) => attachment.id) ?? []);
    for (const attachment of existing.metadata?.attachments ?? []) {
      if (!nextIds.has(attachment.id)) {
        await this.attachmentStore.delete(attachment.id);
      }
    }
  }
  nextNotificationSequence(now) {
    const base = Math.max(0, Math.trunc(now)) * 1e3;
    this.lastNotificationSequence = Math.max(this.lastNotificationSequence + 1, base);
    return this.lastNotificationSequence;
  }
  async list(options = {}) {
    const boardId = normalizeBoardId(options.boardId);
    const entries = await this.store.entries();
    return entries.map((entry) => entry.value).filter(
      (entry) => entry?.version === 1 && Boolean(entry.card?.id)
    ).map((entry) => entry.card).filter((card) => !boardId || cardBoardId(card) === boardId).toSorted(compareCards);
  }
  async listBoards() {
    const boards = /* @__PURE__ */ new Map();
    for (const entry of await this.boardStore.entries()) {
      if (entry.value?.version !== 1 || !entry.value.board?.id) {
        continue;
      }
      const board = entry.value.board;
      boards.set(board.id, {
        id: board.id,
        ...board.name ? { name: board.name } : {},
        ...board.description ? { description: board.description } : {},
        ...board.icon ? { icon: board.icon } : {},
        ...board.color ? { color: board.color } : {},
        ...board.position !== void 0 ? { position: board.position } : {},
        ...board.version ? { version: board.version } : {},
        ...board.currentObjective ? { currentObjective: board.currentObjective } : {},
        ...board.coreValue ? { coreValue: board.coreValue } : {},
        ...board.sourceOfTruth ? { sourceOfTruth: board.sourceOfTruth } : {},
        ...board.repositoryUrl ? { repositoryUrl: board.repositoryUrl } : {},
        ...board.planningPath ? { planningPath: board.planningPath } : {},
        ...board.homepageUrl ? { homepageUrl: board.homepageUrl } : {},
        ...board.defaultWorkspace ? { defaultWorkspace: board.defaultWorkspace } : {},
        ...board.orchestration ? { orchestration: board.orchestration } : {},
        total: 0,
        active: 0,
        archived: 0,
        byStatus: {},
        updatedAt: board.updatedAt,
        ...board.archivedAt ? { archivedAt: board.archivedAt } : {}
      });
    }
    if (!boards.has("default")) {
      boards.set("default", {
        id: "default",
        total: 0,
        active: 0,
        archived: 0,
        byStatus: {}
      });
    }
    for (const card of await this.list()) {
      const boardId = cardBoardId(card);
      const summary = boards.get(boardId) ?? {
        id: boardId,
        total: 0,
        active: 0,
        archived: 0,
        byStatus: {}
      };
      summary.total += 1;
      if (card.metadata?.archivedAt) {
        summary.archived += 1;
      } else {
        summary.active += 1;
      }
      summary.byStatus[card.status] = (summary.byStatus[card.status] ?? 0) + 1;
      summary.updatedAt = Math.max(summary.updatedAt ?? 0, card.updatedAt);
      boards.set(boardId, summary);
    }
    return {
      boards: [...boards.values()].toSorted(
        (a, b) => a.id === "default" ? -1 : b.id === "default" ? 1 : a.id.localeCompare(b.id)
      )
    };
  }
  async isProjectArchived(boardId) {
    const board = await this.boardStore.lookup(boardId);
    return Boolean(board?.version === 1 && board.board.archivedAt);
  }
  async upsertBoard(input) {
    return await this.enqueueMutation(async () => {
      const id = normalizeBoardIdRequired(input.id);
      const existing = await this.boardStore.lookup(id);
      const board = normalizeBoardMetadata({ ...input, id }, existing?.board);
      await this.boardStore.register(id, { version: 1, board });
      return board;
    });
  }
  async archiveBoard(id, archived = true) {
    return await this.upsertBoard({ id, archived });
  }
  async deleteBoard(id) {
    return await this.enqueueMutation(async () => {
      const boardId = normalizeBoardIdRequired(id);
      if (boardId === "default") {
        throw new Error("default board cannot be deleted.");
      }
      if ((await this.list({ boardId })).length > 0) {
        throw new Error("board still has cards; archive it or move/delete the cards first.");
      }
      for (const entry of await this.subscriptionStore.entries()) {
        if (entry.value?.version === 1 && entry.value.subscription?.boardId === boardId) {
          await this.subscriptionStore.delete(entry.key);
        }
      }
      return { deleted: await this.boardStore.delete(boardId) };
    });
  }
  async stats(input = {}, now = Date.now()) {
    const cards = await this.list(input);
    const boardId = normalizeBoardId(input.boardId) ?? "all";
    const byStatus = {};
    const byAgent = /* @__PURE__ */ Object.create(null);
    let oldestReadyAt;
    let updatedAt;
    let archived = 0;
    for (const card of cards) {
      byStatus[card.status] = (byStatus[card.status] ?? 0) + 1;
      byAgent[card.agentId ?? "(default)"] = (byAgent[card.agentId ?? "(default)"] ?? 0) + 1;
      if (card.metadata?.archivedAt) {
        archived += 1;
      }
      if (card.status === "ready" && !card.metadata?.archivedAt) {
        oldestReadyAt = Math.min(oldestReadyAt ?? card.updatedAt, card.updatedAt);
      }
      updatedAt = Math.max(updatedAt ?? 0, card.updatedAt);
    }
    return {
      id: boardId,
      total: cards.length,
      active: cards.length - archived,
      archived,
      byStatus,
      byAgent,
      ...oldestReadyAt ? { oldestReadyAgeMs: Math.max(0, now - oldestReadyAt) } : {},
      ...updatedAt ? { updatedAt } : {}
    };
  }
  async get(id) {
    const entry = await this.store.lookup(id.trim());
    return entry?.version === 1 ? entry.card : void 0;
  }
  async removeReferencesToCard(cardId) {
    for (const card of await this.list()) {
      const links = card.metadata?.links;
      if (!links?.some((link) => link.targetCardId === cardId)) {
        continue;
      }
      await this.updateCard(card.id, {
        metadata: {
          ...card.metadata,
          links: links.filter((link) => link.targetCardId !== cardId)
        }
      });
    }
  }
  async create(input, scope) {
    return await this.enqueueMutation(async () => await this.createDirect(input, scope));
  }
  async createDirect(input, scope) {
    const now = Date.now();
    const requestedStatus = normalizeStatus(input.status, "todo");
    const cards = await this.list();
    const parents = normalizeStringList(input.parents, "parents", 120);
    const automation = normalizeCardAutomation(input);
    const heldBySchedule = Boolean(automation?.scheduledAt && automation.scheduledAt > now) && requestedStatus !== "blocked";
    let status = heldBySchedule ? "scheduled" : requestedStatus;
    let heldByDependencies = false;
    if (parents.length > 0 && (status === "running" || status === "review")) {
      status = "todo";
      heldByDependencies = true;
    }
    if (automation?.idempotencyKey) {
      const existing = cards.find(
        (card2) => card2.metadata?.automation?.idempotencyKey === automation.idempotencyKey && card2.metadata?.automation?.tenant === automation.tenant && cardBoardId(card2) === (automation.boardId ?? "default")
      );
      if (existing) {
        return existing;
      }
    }
    const cardsById = new Map(cards.map((card2) => [card2.id, card2]));
    const parentCards = parents.map((parentId) => {
      const parent = cardsById.get(parentId);
      if (!parent) {
        throw new Error(`card not found: ${parentId}`);
      }
      return parent;
    });
    const childAutomation = normalizeAutomation(
      {
        ...automation,
        createdByCardId: automation?.createdByCardId ?? (parents.length === 1 ? parents[0] : void 0)
      },
      automation
    );
    const normalizedPosition = normalizePosition(input.position, Number.NaN);
    const notes = normalizeNotes(input.notes);
    const agentId = normalizeOptionalString(input.agentId);
    const sessionKey = normalizeOptionalString(input.sessionKey);
    const runId = normalizeOptionalString(input.runId);
    const taskId = normalizeOptionalString(input.taskId);
    const sourceUrl = normalizeOptionalString(input.sourceUrl);
    const normalizedExecution = normalizeExecution(input.execution);
    const delivery = normalizeDelivery(input.delivery, void 0, now);
    const execution = normalizedExecution?.status === "running" && (heldBySchedule || heldByDependencies) ? void 0 : normalizedExecution;
    const startedAt = input.startedAt === void 0 ? status === "running" ? now : void 0 : normalizeTimestamp(input.startedAt, 0) || void 0;
    const completedAt = input.completedAt === void 0 ? status === "done" ? now : void 0 : normalizeTimestamp(input.completedAt, 0) || void 0;
    const metadata = normalizeMetadata(
      input.metadata,
      {
        templateId: normalizeTemplateId(input.templateId),
        ...childAutomation ? { automation: childAutomation } : {}
      },
      { allowDependencyLinks: false }
    );
    const syncedMetadata = trimMetadataToBudget(
      syncExecutionAttemptMetadata(metadata, execution, now)
    );
    const boardId = syncedMetadata.automation?.boardId ?? "default";
    const milestoneId = normalizeOptionalString(input.milestoneId);
    const position = Number.isFinite(normalizedPosition) ? normalizedPosition : Math.max(
      0,
      ...cards.filter(
        (card2) => cardBoardId(card2) === boardId && card2.milestoneId === milestoneId
      ).map((card2) => card2.position)
    ) + POSITION_STEP;
    let card = {
      id: randomUUID5(),
      title: normalizeTitle(input.title),
      status,
      priority: normalizePriority(input.priority, "normal"),
      labels: normalizeLabels(input.labels),
      ...milestoneId ? { milestoneId } : {},
      position,
      createdAt: now,
      updatedAt: now,
      events: [
        {
          id: randomUUID5(),
          kind: "created",
          at: now,
          toStatus: status,
          ...sessionKey ? { sessionKey } : {},
          ...runId ? { runId } : {}
        }
      ],
      ...notes ? { notes } : {},
      ...agentId ? { agentId } : {},
      ...sessionKey ? { sessionKey } : {},
      ...runId ? { runId } : {},
      ...taskId ? { taskId } : {},
      ...sourceUrl ? { sourceUrl } : {},
      ...execution ? { execution } : {},
      ...delivery ? { delivery } : {},
      ...startedAt ? { startedAt } : {},
      ...completedAt ? { completedAt } : {},
      ...!metadataIsEmpty(syncedMetadata) ? { metadata: syncedMetadata } : {}
    };
    await this.store.register(card.id, { version: 1, card });
    try {
      for (const parent of parentCards) {
        card = await this.linkCardsDirect(parent.id, card.id, now, {
          allowStatusOnlyActiveChild: true,
          scope
        });
      }
    } catch (error) {
      await this.store.delete(card.id);
      await this.removeReferencesToCard(card.id);
      throw error;
    }
    return card;
  }
  async update(id, patch) {
    return await this.enqueueMutation(
      async () => await this.updateCard(id, patch, {
        allowMetadataDependencyLinks: false,
        enforceStatusHolds: true
      })
    );
  }
  async updateCard(id, patch, options = {}) {
    const existing = await this.get(id);
    if (!existing) {
      throw new Error(`card not found: ${id}`);
    }
    const lifecycleStatusSourceUpdatedAt = lifecycleStatusSourceUpdatedAtFromPatch(patch.metadata);
    const existingLifecycleStatusSourceUpdatedAt = existing.metadata?.lifecycleStatusSourceUpdatedAt;
    const hasFreshLifecycleStatusSource = lifecycleStatusSourceUpdatedAt !== void 0 && lifecycleStatusSourceUpdatedAt !== existingLifecycleStatusSourceUpdatedAt;
    let effectivePatch = patch;
    if (patch.status !== void 0 && lifecycleStatusSourceUpdatedAt !== void 0 && shouldSkipPersistedLifecycleStatusUpdate(existing, lifecycleStatusSourceUpdatedAt)) {
      effectivePatch = { ...patch, status: void 0 };
      if (patch.metadata && typeof patch.metadata === "object" && !Array.isArray(patch.metadata)) {
        const metadataPatch = patch.metadata;
        const { lifecycleStatusSourceUpdatedAt: _ignored, ...rest } = metadataPatch;
        effectivePatch.metadata = Object.keys(rest).length > 0 ? rest : void 0;
      }
      const hasSemanticPatch = Object.entries(effectivePatch).some(
        ([key, value]) => key !== "status" && key !== "metadata" && value !== void 0
      );
      if (!hasSemanticPatch && effectivePatch.metadata === void 0) {
        return existing;
      }
    }
    const status = normalizeStatus(effectivePatch.status, existing.status);
    const now = Date.now();
    const startedAt = effectivePatch.startedAt === void 0 ? status === "running" ? existing.startedAt ?? now : existing.startedAt : normalizeTimestamp(effectivePatch.startedAt, 0) || void 0;
    const completedAt = effectivePatch.completedAt === void 0 ? status === "done" ? existing.completedAt ?? now : void 0 : normalizeTimestamp(effectivePatch.completedAt, 0) || void 0;
    const sessionKey = effectivePatch.sessionKey === void 0 ? existing.sessionKey : normalizeOptionalString(effectivePatch.sessionKey);
    const execution = effectivePatch.execution === void 0 ? effectivePatch.sessionKey === void 0 ? existing.execution : syncExecutionSessionKey(existing.execution, sessionKey) : normalizeExecution(effectivePatch.execution);
    let metadata = normalizeMetadata(effectivePatch.metadata, existing.metadata, {
      allowDependencyLinks: options.allowMetadataDependencyLinks !== false,
      preserveProofId: options.preserveProofId
    });
    if (status !== existing.status && !hasFreshLifecycleStatusSource) {
      metadata = { ...metadata, lifecycleStatusSourceUpdatedAt: void 0 };
    }
    const effectivePatchRecord = effectivePatch;
    const automationPatch = {};
    for (const key of [
      "tenant",
      "boardId",
      "createdByCardId",
      "idempotencyKey",
      "skills",
      "workspace",
      "workspaceAccess",
      "maxRuntimeSeconds",
      "maxRetries",
      "scheduledAt"
    ]) {
      if (Object.hasOwn(effectivePatchRecord, key) && effectivePatchRecord[key] !== void 0) {
        automationPatch[key] = effectivePatchRecord[key];
      }
    }
    if (Object.keys(automationPatch).length > 0) {
      metadata = trimMetadataToBudget(
        {
          ...metadata,
          automation: normalizeAutomationPatch(automationPatch, metadata.automation)
        },
        options
      );
    }
    const next = removeUndefinedCardFields({
      ...existing,
      title: effectivePatch.title === void 0 ? existing.title : normalizeTitle(effectivePatch.title),
      notes: effectivePatch.notes === void 0 ? existing.notes : normalizeNotes(effectivePatch.notes),
      status,
      priority: effectivePatch.priority === void 0 ? existing.priority : normalizePriority(effectivePatch.priority, existing.priority),
      labels: effectivePatch.labels === void 0 ? existing.labels : normalizeLabels(effectivePatch.labels),
      agentId: effectivePatch.agentId === void 0 ? existing.agentId : normalizeOptionalString(effectivePatch.agentId),
      sessionKey,
      runId: effectivePatch.runId === void 0 ? existing.runId : normalizeOptionalString(effectivePatch.runId),
      taskId: effectivePatch.taskId === void 0 ? existing.taskId : normalizeOptionalString(effectivePatch.taskId),
      sourceUrl: effectivePatch.sourceUrl === void 0 ? existing.sourceUrl : normalizeOptionalString(effectivePatch.sourceUrl),
      execution,
      delivery: effectivePatch.delivery === void 0 ? existing.delivery : normalizeDelivery(effectivePatch.delivery, existing.delivery, now),
      metadata: effectivePatch.templateId === void 0 ? metadata : { ...metadata, templateId: normalizeTemplateId(effectivePatch.templateId) },
      position: effectivePatchRecord.position === void 0 ? existing.position : normalizePosition(effectivePatchRecord.position, existing.position),
      updatedAt: now,
      ...startedAt ? { startedAt } : {},
      ...completedAt ? { completedAt } : {}
    });
    next.metadata = trimMetadataToBudget(
      syncExecutionAttemptMetadata(next.metadata ?? {}, execution, now),
      options
    );
    next.events = appendEvent(next, updateEvent(existing, next), now);
    if (options.enforceStatusHolds && effectivePatch.status !== void 0) {
      await this.assertActiveStatusAllowed(existing, next, now);
    }
    if (status !== "done") {
      delete next.completedAt;
    }
    if (effectivePatch.startedAt !== void 0 && !startedAt) {
      delete next.startedAt;
    }
    if (effectivePatch.completedAt !== void 0 && !completedAt) {
      delete next.completedAt;
    }
    if (metadataIsEmpty(next.metadata)) {
      delete next.metadata;
    }
    await this.store.register(next.id, { version: 1, card: next });
    await this.deleteDetachedAttachments(existing, next);
    return next;
  }
  async assertActiveStatusAllowed(existing, next, now) {
    if (next.status !== "ready" && next.status !== "running" && next.status !== "review" && next.status !== "done") {
      return;
    }
    const parents = cardParentIds(next);
    const cards = parents.length > 0 ? new Map((await this.list()).map((card) => [card.id, card])) : void 0;
    if (parents.length > 0 && !parents.every((parentId) => cards?.get(parentId)?.status === "done")) {
      throw new Error("card dependencies are not done.");
    }
    if (next.status === "done") {
      return;
    }
    const scheduledAt = next.metadata?.automation?.scheduledAt;
    if (scheduledAt && scheduledAt > now || existing.status === "scheduled" && !scheduledAt) {
      throw new Error("card is scheduled for later.");
    }
  }
  async delete(id) {
    return await this.enqueueMutation(async () => await this.deleteDirect(id));
  }
  async deleteDirect(id) {
    const cardId = id.trim();
    const deleted = await this.store.delete(cardId);
    if (!deleted) {
      return { deleted: false };
    }
    for (const entry of await this.subscriptionStore.entries()) {
      if (entry.value?.version === 1 && entry.value.subscription?.cardId === cardId) {
        await this.subscriptionStore.delete(entry.key);
      }
    }
    for (const entry of await this.attachmentStore.entries()) {
      if (entry.value?.version === 1 && entry.value.attachment?.cardId === cardId) {
        await this.attachmentStore.delete(entry.key);
      }
    }
    await this.removeReferencesToCard(cardId);
    return { deleted: true };
  }
  async addComment(id, input, scope) {
    const now = Date.now();
    const body = normalizeBoundedString(input.body, void 0, 2e3, "comment body");
    if (!body) {
      throw new Error("comment body is required.");
    }
    const comment = { id: randomUUID5(), body, createdAt: now };
    return await this.updateMetadata(id, (existing) => {
      assertCanMutateClaimedCard(existing, scope);
      return {
        ...existing.metadata,
        comments: [...existing.metadata?.comments ?? [], comment].slice(-MAX_CARD_COMMENTS)
      };
    });
  }
  async addSourceReference(id, input) {
    const now = Date.now();
    const label = normalizeTitle(input.label);
    const target = normalizeBoundedString(input.target, void 0, 2e3, "source reference target");
    const note = normalizeBoundedString(input.note, void 0, 2e3, "source reference note");
    if (!target || target.includes("\0") || target.includes("\n")) {
      throw new Error("source reference target is required and must be a single line.");
    }
    return await this.mutateSourceReferences(id, (references) => [
      ...references,
      {
        id: randomUUID5(),
        label,
        target,
        position: Math.max(0, ...references.map((reference) => reference.position)) + POSITION_STEP,
        createdAt: now,
        updatedAt: now,
        ...note ? { note } : {}
      }
    ]);
  }
  async updateSourceReference(id, input) {
    const sourceReferenceId = normalizeBoundedString(
      input.sourceReferenceId,
      void 0,
      120,
      "source reference id"
    );
    if (!sourceReferenceId) {
      throw new Error("sourceReferenceId is required.");
    }
    return await this.mutateSourceReferences(id, (references) => {
      const existing = references.find((reference) => reference.id === sourceReferenceId);
      if (!existing) {
        throw new Error(`source reference not found: ${sourceReferenceId}`);
      }
      const label = input.label === void 0 ? existing.label : normalizeTitle(input.label);
      const target = input.target === void 0 ? existing.target : normalizeBoundedString(input.target, void 0, 2e3, "source reference target");
      const note = input.note === void 0 ? existing.note : normalizeBoundedString(input.note, void 0, 2e3, "source reference note");
      if (!target || target.includes("\0") || target.includes("\n")) {
        throw new Error("source reference target is required and must be a single line.");
      }
      return references.map((reference) => {
        if (reference.id !== sourceReferenceId) {
          return reference;
        }
        const next = {
          ...reference,
          label,
          target,
          updatedAt: Date.now(),
          ...note ? { note } : {}
        };
        if (!note) {
          delete next.note;
        }
        return next;
      });
    });
  }
  async deleteSourceReference(id, input) {
    const sourceReferenceId = normalizeBoundedString(
      input.sourceReferenceId,
      void 0,
      120,
      "source reference id"
    );
    if (!sourceReferenceId) {
      throw new Error("sourceReferenceId is required.");
    }
    return await this.mutateSourceReferences(id, (references) => {
      if (!references.some((reference) => reference.id === sourceReferenceId)) {
        throw new Error(`source reference not found: ${sourceReferenceId}`);
      }
      return references.filter((reference) => reference.id !== sourceReferenceId);
    });
  }
  async reorderSourceReferences(id, input) {
    if (!Array.isArray(input.sourceReferenceIds) || input.sourceReferenceIds.some((value) => typeof value !== "string")) {
      throw new Error("sourceReferenceIds are required.");
    }
    const sourceReferenceIds = input.sourceReferenceIds;
    return await this.mutateSourceReferences(id, (references) => {
      if (sourceReferenceIds.length !== references.length || new Set(sourceReferenceIds).size !== sourceReferenceIds.length) {
        throw new Error("sourceReferenceIds must contain every source reference exactly once.");
      }
      const byId = new Map(references.map((reference) => [reference.id, reference]));
      const now = Date.now();
      return sourceReferenceIds.map((sourceReferenceId, index) => {
        const reference = byId.get(sourceReferenceId);
        if (!reference) {
          throw new Error(`source reference not found: ${sourceReferenceId}`);
        }
        return {
          ...reference,
          position: (index + 1) * POSITION_STEP,
          updatedAt: now
        };
      });
    });
  }
  async mutateSourceReferences(id, mutate) {
    return await this.enqueueMutation(async () => {
      const existing = await this.get(id);
      if (!existing) {
        throw new Error(`card not found: ${id}`);
      }
      const sourceReferences = mutate(
        [...existing.sourceReferences ?? []].toSorted(
          (left, right) => left.position - right.position || left.createdAt - right.createdAt
        )
      );
      const now = Date.now();
      const next = removeUndefinedCardFields({
        ...existing,
        ...sourceReferences.length ? { sourceReferences } : {},
        updatedAt: now
      });
      if (!sourceReferences.length) {
        delete next.sourceReferences;
      }
      next.events = appendEvent(next, { kind: "edited" }, now);
      await this.store.register(next.id, { version: 1, card: next });
      return next;
    });
  }
  async addLink(id, input) {
    const now = Date.now();
    const targetCardId = normalizeBoundedString(input.targetCardId, void 0, 120, "link target");
    const url = normalizeBoundedString(input.url, void 0, 2e3, "link URL");
    const title = normalizeBoundedString(input.title, void 0, 180, "link title");
    if (!targetCardId && !url) {
      throw new Error("link targetCardId or url is required.");
    }
    const type = normalizeLinkType(input.type, "relates_to");
    if (type === "parent" || type === "child") {
      throw new Error("parent and child dependency links must use linkDependency.");
    }
    const link = {
      id: randomUUID5(),
      type,
      createdAt: now,
      ...targetCardId ? { targetCardId } : {},
      ...title ? { title } : {},
      ...url ? { url } : {}
    };
    return await this.updateMetadata(id, (existing) => ({
      ...existing.metadata,
      links: appendLinkPreservingDependencies(existing.metadata?.links ?? [], link)
    }));
  }
  async linkCards(parentId, childId, scope) {
    return await this.enqueueMutation(
      async () => await this.linkCardsDirect(parentId, childId, Date.now(), { scope })
    );
  }
  async linkCardsDirect(parentId, childId, now = Date.now(), options = {}) {
    if (parentId.trim() === childId.trim()) {
      throw new Error("parent and child cards must differ.");
    }
    const parent = await this.get(parentId);
    const child = await this.get(childId);
    if (!parent) {
      throw new Error(`card not found: ${parentId}`);
    }
    if (!child) {
      throw new Error(`card not found: ${childId}`);
    }
    assertCanMutateClaimedCard(parent, options.scope);
    assertCanMutateClaimedCard(child, options.scope);
    if (child.status === "done" || child.status === "blocked") {
      const cardsById = new Map((await this.list()).map((card) => [card.id, card]));
      const parentIds = [...cardParentIds(child), parent.id].filter(
        (id, index, ids) => ids.indexOf(id) === index
      );
      if (parentIds.some((id) => cardsById.get(id)?.status !== "done")) {
        throw new Error("terminal child cards cannot gain incomplete parent dependencies.");
      }
    }
    if (isActiveDependencyTarget(child, { allowStatusOnly: options.allowStatusOnlyActiveChild })) {
      throw new Error("active child cards cannot gain parent dependencies.");
    }
    if (await this.dependsOn(parent.id, child.id)) {
      throw new Error("dependency link would create a cycle.");
    }
    const parentLinks = parent.metadata?.links ?? [];
    const childLinks = child.metadata?.links ?? [];
    const nextParentLinks = parentLinks.some(
      (link) => link.type === "child" && link.targetCardId === child.id
    ) ? parentLinks : appendLinkPreservingDependencies(parentLinks, {
      id: randomUUID5(),
      type: "child",
      targetCardId: child.id,
      createdAt: now
    });
    const nextChildLinks = childLinks.some(
      (link) => link.type === "parent" && link.targetCardId === parent.id
    ) ? childLinks : appendLinkPreservingDependencies(childLinks, {
      id: randomUUID5(),
      type: "parent",
      targetCardId: parent.id,
      createdAt: now
    });
    await this.updateCard(parent.id, {
      metadata: { ...parent.metadata, links: nextParentLinks }
    });
    const nextChild = await this.updateCard(child.id, {
      metadata: { ...child.metadata, links: nextChildLinks }
    });
    return await this.promoteDependencyReady(nextChild.id);
  }
  async dependencyTargetStatus(card, now) {
    const scheduledAt = card.metadata?.automation?.scheduledAt;
    const parents = cardParentIds(card);
    if (card.status === "scheduled" && !scheduledAt) {
      return "scheduled";
    }
    if (parents.length === 0) {
      if (scheduledAt && scheduledAt > now && isDependencyPromotableStatus(card.status)) {
        return "scheduled";
      }
      return card.status === "scheduled" ? "ready" : card.status;
    }
    const parentCards = await Promise.all(parents.map((parentId) => this.get(parentId)));
    const parentsDone = parentCards.every((parent) => parent?.status === "done");
    if (!parentsDone && scheduledAt && scheduledAt > now && isDependencyPromotableStatus(card.status)) {
      return "scheduled";
    }
    if (!parentsDone && isDependencyPromotableStatus(card.status)) {
      return "todo";
    }
    if (parentsDone && scheduledAt && scheduledAt > now && isDependencyPromotableStatus(card.status)) {
      return "scheduled";
    }
    return parentsDone && isDependencyPromotableStatus(card.status) ? "ready" : card.status;
  }
  async dependsOn(cardId, targetParentId) {
    const cards = new Map((await this.list()).map((entry) => [entry.id, entry]));
    const seen = /* @__PURE__ */ new Set();
    const visit = (id) => {
      if (id === targetParentId) {
        return true;
      }
      if (seen.has(id)) {
        return false;
      }
      seen.add(id);
      const card = cards.get(id);
      return Boolean(card && cardParentIds(card).some(visit));
    };
    return visit(cardId);
  }
  async recordDispatch(card, now) {
    const metadata = trimMetadataToBudget(
      normalizeMetadata(
        {
          ...card.metadata,
          automation: normalizeAutomation(
            {
              ...card.metadata?.automation,
              dispatchCount: (card.metadata?.automation?.dispatchCount ?? 0) + 1,
              lastDispatchAt: now
            },
            card.metadata?.automation
          )
        },
        card.metadata
      )
    );
    const next = removeUndefinedCardFields({
      ...card,
      ...!metadataIsEmpty(metadata) ? { metadata } : { metadata: void 0 },
      events: appendEvent(card, { kind: "dispatch" }, now)
    });
    await this.store.register(card.id, { version: 1, card: next });
    return next;
  }
  async recordOrchestrationCandidate(card, now) {
    const metadata = trimMetadataToBudget({
      ...card.metadata,
      workerLogs: [
        ...card.metadata?.workerLogs ?? [],
        {
          id: randomUUID5(),
          level: "info",
          message: "Auto orchestration marked this triage card for specification or decomposition.",
          createdAt: now
        }
      ].slice(-MAX_CARD_WORKER_LOGS),
      workerProtocol: {
        state: "idle",
        updatedAt: now,
        detail: "Awaiting flowboard_specify or flowboard_decompose."
      }
    });
    const next = removeUndefinedCardFields({
      ...card,
      ...!metadataIsEmpty(metadata) ? { metadata } : { metadata: void 0 },
      events: appendEvent(card, { kind: "orchestration" }, now)
    });
    await this.store.register(card.id, { version: 1, card: next });
    return next;
  }
  async promoteDependencyReady(id, now = Date.now()) {
    const card = await this.get(id);
    if (!card) {
      throw new Error(`card not found: ${id}`);
    }
    if (card.metadata?.archivedAt) {
      return card;
    }
    const target = await this.dependencyTargetStatus(card, now);
    if (target === card.status) {
      return card;
    }
    return await this.updateCard(card.id, { status: target });
  }
};

// src/backend/src/store-enrichment.ts
var FlowboardEnrichmentStore = class extends FlowboardCoreStore {
  async addProof(id, input, scope) {
    const now = Date.now();
    const proof = normalizeProofInput(input, now);
    return await this.updateMetadata(
      id,
      (existing) => {
        assertCanMutateClaimedCard(existing, scope);
        const metadata = clearDiagnostics(existing.metadata, ["missing_proof"]);
        return {
          ...metadata,
          proof: [...metadata.proof ?? [], proof].slice(-MAX_CARD_PROOF)
        };
      },
      { preserveProofId: proof.id }
    );
  }
  async addProofWithArtifact(id, proofInput, artifactInput, scope) {
    const now = Date.now();
    const proof = normalizeProofInput(proofInput, now);
    const artifact = normalizeArtifact({ ...artifactInput, createdAt: now });
    if (!artifact) {
      throw new Error("artifact url or path is required.");
    }
    return await this.updateMetadata(
      id,
      (existing) => {
        assertCanMutateClaimedCard(existing, scope);
        const metadata = clearDiagnostics(existing.metadata, ["missing_proof"]);
        return {
          ...metadata,
          proof: [...metadata.proof ?? [], proof].slice(-MAX_CARD_PROOF),
          artifacts: [...metadata.artifacts ?? [], artifact].slice(-MAX_CARD_ARTIFACTS)
        };
      },
      { preserveProofId: proof.id }
    );
  }
  async addArtifact(id, input, scope) {
    const artifact = normalizeArtifact({ ...input, createdAt: Date.now() });
    if (!artifact) {
      throw new Error("artifact url or path is required.");
    }
    return await this.updateMetadata(id, (existing) => {
      assertCanMutateClaimedCard(existing, scope);
      const metadata = clearDiagnostics(existing.metadata, ["missing_proof"]);
      return {
        ...metadata,
        artifacts: [...metadata.artifacts ?? [], artifact].slice(-MAX_CARD_ARTIFACTS)
      };
    });
  }
  async deleteProof(id, proofId, scope) {
    return await this.updateMetadata(id, (existing) => {
      assertCanMutateClaimedCard(existing, scope);
      const proof = existing.metadata?.proof ?? [];
      if (!proof.some((entry) => entry.id === proofId)) {
        throw new Error(`proof not found: ${proofId}`);
      }
      return {
        ...existing.metadata,
        proof: proof.filter((entry) => entry.id !== proofId)
      };
    });
  }
  async deleteArtifact(id, artifactId, scope) {
    return await this.updateMetadata(id, (existing) => {
      assertCanMutateClaimedCard(existing, scope);
      const artifacts = existing.metadata?.artifacts ?? [];
      if (!artifacts.some((entry) => entry.id === artifactId)) {
        throw new Error(`artifact not found: ${artifactId}`);
      }
      return {
        ...existing.metadata,
        artifacts: artifacts.filter((entry) => entry.id !== artifactId)
      };
    });
  }
  async addAttachment(id, input, scope) {
    return await this.enqueueMutation(async () => {
      const existing = await this.get(id);
      if (!existing) {
        throw new Error(`card not found: ${id}`);
      }
      assertCanMutateClaimedCard(existing, scope);
      const now = Date.now();
      const { attachment, contentBase64 } = normalizeAttachmentInput(id, input, now);
      await this.attachmentStore.register(attachment.id, {
        version: 1,
        attachment,
        contentBase64
      });
      try {
        const updated = await this.updateCard(id, {
          metadata: {
            ...clearDiagnostics(existing.metadata, ["missing_proof"]),
            attachments: [...existing.metadata?.attachments ?? [], attachment].slice(
              -MAX_CARD_ATTACHMENTS
            )
          }
        });
        if (!updated.metadata?.attachments?.some((entry) => entry.id === attachment.id)) {
          await this.attachmentStore.delete(attachment.id);
          throw new Error("attachment metadata was trimmed before it could be indexed.");
        }
        return updated;
      } catch (error) {
        await this.attachmentStore.delete(attachment.id);
        throw error;
      }
    });
  }
  async listAttachments(id) {
    const card = await this.get(id);
    if (!card) {
      throw new Error(`card not found: ${id}`);
    }
    return { card, attachments: card.metadata?.attachments ?? [] };
  }
  async getAttachment(id) {
    const attachmentId = id.trim();
    const entry = await this.attachmentStore.lookup(attachmentId);
    return entry?.version === 1 ? entry : void 0;
  }
  async deleteAttachment(cardId, attachmentId, scope) {
    return await this.enqueueMutation(async () => {
      const existing = await this.get(cardId);
      if (!existing) {
        throw new Error(`card not found: ${cardId}`);
      }
      assertCanMutateClaimedCard(existing, scope);
      const attachments = existing.metadata?.attachments ?? [];
      if (!attachments.some((attachment) => attachment.id === attachmentId)) {
        throw new Error(`attachment not found: ${attachmentId}`);
      }
      await this.attachmentStore.delete(attachmentId);
      return await this.updateCard(cardId, {
        metadata: {
          ...existing.metadata,
          attachments: attachments.filter((attachment) => attachment.id !== attachmentId)
        }
      });
    });
  }
  async addWorkerLog(id, input, scope) {
    const now = Date.now();
    const message = normalizeBoundedString(input.message, void 0, 800, "worker log message");
    if (!message) {
      throw new Error("worker log message is required.");
    }
    const level = input.level === "warning" || input.level === "error" || input.level === "info" ? input.level : "info";
    const sessionKey = normalizeBoundedString(input.sessionKey, void 0, 240, "session key");
    const runId = normalizeBoundedString(input.runId, void 0, 160, "run id");
    const log = {
      id: randomUUID6(),
      level,
      message,
      createdAt: now,
      ...sessionKey ? { sessionKey } : {},
      ...runId ? { runId } : {}
    };
    return await this.updateMetadata(id, (existing) => {
      assertCanMutateClaimedCard(existing, scope);
      return {
        ...existing.metadata,
        workerLogs: [...existing.metadata?.workerLogs ?? [], log].slice(-MAX_CARD_WORKER_LOGS)
      };
    });
  }
  async recordProtocolViolation(id, input = {}, scope) {
    return await this.enqueueMutation(async () => {
      const card = await this.get(id);
      if (!card) {
        throw new Error(`card not found: ${id}`);
      }
      assertCanMutateClaimedCard(card, scope);
      const now = Date.now();
      const detail = normalizeBoundedString(input.detail, void 0, 800, "protocol violation detail") ?? "Worker stopped without completing or blocking the card.";
      const sessionKey = normalizeBoundedString(input.sessionKey, void 0, 240, "session key");
      const runId = normalizeBoundedString(input.runId, void 0, 160, "run id");
      const log = {
        id: randomUUID6(),
        level: "error",
        message: detail,
        createdAt: now,
        ...sessionKey ? { sessionKey } : {},
        ...runId ? { runId } : {}
      };
      const execution = card.execution?.status === "running" ? { ...card.execution, status: "blocked", updatedAt: now } : card.execution;
      const attempts = closeRunningAttempts(card.metadata?.attempts, now, "blocked", detail);
      const notification = {
        id: randomUUID6(),
        kind: "failed",
        createdAt: now,
        sequence: this.nextNotificationSequence(now),
        message: capText(detail, 240) ?? "Worker protocol violation.",
        ...sessionKey || cardSessionKey(card) ? { sessionKey: sessionKey ?? cardSessionKey(card) } : {},
        ...runId || cardRunId(card) ? { runId: runId ?? cardRunId(card) } : {}
      };
      return await this.updateCard(card.id, {
        status: card.status === "done" ? card.status : "blocked",
        ...execution ? { execution } : {},
        metadata: {
          ...card.metadata,
          workerLogs: [...card.metadata?.workerLogs ?? [], log].slice(-MAX_CARD_WORKER_LOGS),
          workerProtocol: {
            state: "violated",
            updatedAt: now,
            detail
          },
          claim: void 0,
          ...attempts ? { attempts } : {},
          failureCount: (card.metadata?.failureCount ?? 0) + 1,
          notifications: [...card.metadata?.notifications ?? [], notification].slice(
            -MAX_CARD_NOTIFICATIONS
          )
        }
      });
    });
  }
};

// src/backend/src/store-promote.ts
var FlowboardPromoteStore = class extends FlowboardEnrichmentStore {
  async promoteReady(now = Date.now()) {
    return await this.enqueueMutation(async () => {
      const promoted = [];
      for (const card of await this.list()) {
        const next = await this.promoteDependencyReady(card.id, now);
        if (next.status !== card.status) {
          promoted.push(next);
        }
      }
      return { cards: promoted, count: promoted.length };
    });
  }
  async move(id, status, position, scope) {
    return await this.enqueueMutation(async () => {
      const existing = await this.get(id);
      if (!existing) {
        throw new Error(`card not found: ${id}`);
      }
      assertCanMutateClaimedCard(existing, scope);
      return await this.updateCard(
        id,
        { status },
        {
          allowMetadataDependencyLinks: false,
          enforceStatusHolds: true
        }
      );
    });
  }
  async promote(id, input = {}, scope) {
    return await this.enqueueMutation(async () => {
      const existing = await this.get(id);
      if (!existing) {
        throw new Error(`card not found: ${id}`);
      }
      assertCanMutateClaimedCard(existing, scope === null ? void 0 : scope);
      const reason = normalizeBoundedString(input.reason, void 0, 1e3, "promote reason");
      const comments = reason ? [
        ...existing.metadata?.comments ?? [],
        { id: randomUUID7(), body: reason, createdAt: Date.now() }
      ].slice(-MAX_CARD_COMMENTS) : existing.metadata?.comments;
      return await this.updateCard(
        id,
        {
          status: "ready",
          metadata: {
            ...clearDiagnostics(existing.metadata, ["stranded_ready", "blocked_too_long"]),
            comments,
            stale: null
          }
        },
        { enforceStatusHolds: input.force !== true }
      );
    });
  }
};

// src/backend/src/store-workflow.ts
function assertClaimIdentity(claim, input) {
  const token = normalizeOptionalString(input.token);
  const ownerId = normalizeOptionalString(input.ownerId);
  if (token && !safeEqualSecret2(token, claim.token)) {
    throw new Error("claim token does not match.");
  }
  if (!token && ownerId && ownerId !== claim.ownerId) {
    throw new Error("claim owner does not match.");
  }
}
var FlowboardWorkflowStore = class extends FlowboardPromoteStore {
  async claimExecution(id, input) {
    const ownerId = normalizeBoundedString(input.ownerId, void 0, 120, "claim owner");
    if (!ownerId) {
      throw new Error("claim ownerId is required.");
    }
    if (typeof input.expectedUpdatedAt !== "number" || !Number.isSafeInteger(input.expectedUpdatedAt) || input.expectedUpdatedAt < 0) {
      throw new Error("expectedUpdatedAt is required.");
    }
    const ttlSeconds = typeof input.ttlSeconds === "number" && Number.isFinite(input.ttlSeconds) ? Math.max(1, Math.trunc(input.ttlSeconds)) : void 0;
    return await this.enqueueMutation(async () => {
      const existing = await this.get(id);
      if (!existing) {
        throw new Error(`card not found: ${id}`);
      }
      if (existing.updatedAt !== input.expectedUpdatedAt) {
        throw new Error("card changed since execution was prepared.");
      }
      if (existing.metadata?.archivedAt) {
        throw new Error("card is archived.");
      }
      if (await this.isProjectArchived(cardBoardId(existing))) {
        throw new Error("project is archived and cannot start new work.");
      }
      if (existing.execution?.status === "running" || existing.metadata?.attempts?.some((attempt) => attempt.status === "running")) {
        throw new Error("card already has an active execution.");
      }
      const now = Date.now();
      const existingClaim = existing.metadata?.claim;
      if (existingClaim && (isFutureDateTimestampMs2(existingClaim.expiresAt, { nowMs: now }) || !isFlowboardClaimReclaimable(existingClaim, now))) {
        throw new Error(`card already claimed by ${existingClaim.ownerId}.`);
      }
      const token = randomUUID8();
      const expiresAt = addFlowboardDurationMs(
        now,
        ttlSeconds ? secondsToDurationMs(ttlSeconds) : DEFAULT_CLAIM_TTL_MS
      );
      const card = await this.updateCard(id, {
        metadata: {
          ...clearDiagnostics(existing.metadata, ["stranded_ready"]),
          claim: { ownerId, token, claimedAt: now, lastHeartbeatAt: now, expiresAt }
        }
      });
      return { card, token };
    });
  }
  async stopExecution(id, input = {}) {
    return await this.enqueueMutation(async () => {
      const existing = await this.get(id);
      if (!existing) {
        throw new Error(`card not found: ${id}`);
      }
      const expectedRunId = normalizeOptionalString(input.expectedRunId);
      const runId = cardRunId(existing);
      if (expectedRunId && expectedRunId !== runId) {
        throw new Error("card execution changed before it could be stopped.");
      }
      if (existing.execution?.status !== "running") {
        throw new Error("card has no active execution.");
      }
      const now = Date.now();
      const reason = normalizeBoundedString(input.reason, void 0, 1e3, "stop reason") ?? "Flowboard execution stopped by operator.";
      return await this.updateCard(id, {
        execution: { ...existing.execution, status: "blocked", updatedAt: now },
        metadata: {
          ...existing.metadata,
          claim: void 0,
          attempts: closeRunningAttempts(existing.metadata?.attempts, now, "stopped", reason),
          comments: [
            ...existing.metadata?.comments ?? [],
            { id: randomUUID8(), body: reason, createdAt: now }
          ].slice(-MAX_CARD_COMMENTS)
        }
      });
    });
  }
  async finishExecutionForRun(runId, input = {}) {
    const normalizedRunId = normalizeOptionalString(runId);
    if (!normalizedRunId) {
      throw new Error("runId is required.");
    }
    return await this.enqueueMutation(async () => {
      const existing = (await this.list()).find(
        (candidate) => cardRunId(candidate) === normalizedRunId
      );
      if (!existing) {
        return void 0;
      }
      if (existing.execution?.status !== "running") {
        return existing;
      }
      const now = Date.now();
      const endedAt = typeof input.endedAt === "number" && Number.isSafeInteger(input.endedAt) && input.endedAt >= 0 ? Math.min(input.endedAt, now) : now;
      const outcome = normalizeOptionalString(input.outcome)?.toLowerCase();
      const succeeded = outcome === "ok";
      const reason = normalizeBoundedString(input.reason, void 0, 1e3, "execution end reason") ?? (succeeded ? void 0 : `Flowboard execution ended with ${outcome || "an unknown"} outcome.`);
      return await this.updateCard(existing.id, {
        execution: {
          ...existing.execution,
          status: succeeded ? "done" : "blocked",
          updatedAt: endedAt
        },
        metadata: {
          ...existing.metadata,
          claim: void 0,
          attempts: closeRunningAttempts(
            existing.metadata?.attempts,
            endedAt,
            succeeded ? "succeeded" : "blocked",
            reason
          )
        }
      });
    });
  }
  async claim(id, input, options = {}) {
    const ownerId = normalizeBoundedString(input.ownerId, void 0, 120, "claim owner");
    if (!ownerId) {
      throw new Error("claim ownerId is required.");
    }
    const ttlSeconds = typeof input.ttlSeconds === "number" && Number.isFinite(input.ttlSeconds) ? Math.max(1, Math.trunc(input.ttlSeconds)) : void 0;
    const token = normalizeBoundedString(input.token, void 0, 160, "claim token") ?? randomUUID8();
    return await this.enqueueMutation(async () => {
      const now = Date.now();
      const expiresAt = addFlowboardDurationMs(
        now,
        ttlSeconds ? secondsToDurationMs(ttlSeconds) : DEFAULT_CLAIM_TTL_MS
      );
      const guarded = await this.promoteDependencyReady(id, now);
      if (guarded.metadata?.archivedAt) {
        throw new Error("card is archived.");
      }
      if (await this.isProjectArchived(cardBoardId(guarded))) {
        throw new Error("project is archived and cannot start new work.");
      }
      const expectedAuthority = options.expectedAuthority;
      if (expectedAuthority && (guarded.status !== expectedAuthority.status || cardBoardId(guarded) !== expectedAuthority.boardId || guarded.agentId !== expectedAuthority.agentId || !isDeepStrictEqual(
        guarded.metadata?.automation?.workspace,
        expectedAuthority.workspace
      ) || !isDeepStrictEqual(
        guarded.metadata?.automation?.workspaceAccess,
        expectedAuthority.workspaceAccess
      ))) {
        throw new Error("card workspace authority changed before claim.");
      }
      const existingClaim = guarded.metadata?.claim;
      const activeClaim = existingClaim && (isFutureDateTimestampMs2(existingClaim.expiresAt, { nowMs: now }) || // Direct claims must honor the same running-worker heartbeat grace
      // as dispatcher recovery; otherwise they silently steal live tokens.
      guarded.status === "running" && !isFlowboardClaimReclaimable(existingClaim, now)) ? existingClaim : void 0;
      if (cardParentIds(guarded).length > 0 && guarded.status !== "ready" && !activeClaim) {
        throw new Error("card dependencies are not done.");
      }
      if (guarded.status === "scheduled") {
        throw new Error("card is scheduled for later.");
      }
      if (retryBudgetExhausted(guarded)) {
        throw new Error("card exhausted its retry budget.");
      }
      if (activeClaim) {
        throw new Error(`card already claimed by ${activeClaim.ownerId}.`);
      }
      const claimable = options.adoptWorkspaceAccess && !guarded.metadata?.automation?.workspaceAccess ? await this.updateCard(id, { workspaceAccess: options.adoptWorkspaceAccess }) : guarded;
      const metadata = clearDiagnostics(claimable.metadata, ["stranded_ready"]);
      const card = await this.updateCard(id, {
        metadata: {
          ...metadata,
          claim: { ownerId, token, claimedAt: now, lastHeartbeatAt: now, expiresAt }
        }
      });
      const next = await this.updateCard(card.id, {
        status: card.status === "backlog" || card.status === "todo" || card.status === "ready" ? "running" : card.status,
        agentId: card.agentId ?? ownerId
      });
      return { card: next, token };
    });
  }
  async heartbeat(id, input) {
    const note = normalizeBoundedString(input.note, void 0, 400, "heartbeat note");
    const card = await this.updateMetadata(id, (existing) => {
      const claim = existing.metadata?.claim;
      if (!claim) {
        throw new Error("card is not claimed.");
      }
      const now = Math.max(Date.now(), claim.lastHeartbeatAt + 1);
      assertClaimIdentity(claim, input);
      const nextClaim = {
        ...claim,
        lastHeartbeatAt: now,
        expiresAt: claim.expiresAt ? addFlowboardDurationMs(
          now,
          Math.max(
            1,
            claim.expiresAt > claim.claimedAt ? claim.expiresAt - claim.lastHeartbeatAt : DEFAULT_CLAIM_TTL_MS
          )
        ) : void 0
      };
      const metadata = clearDiagnostics(existing.metadata, ["running_without_heartbeat"]);
      return {
        ...metadata,
        claim: removeUndefinedMetadataFields({ claim: nextClaim }).claim,
        comments: note ? [...metadata.comments ?? [], { id: randomUUID8(), body: note, createdAt: now }].slice(
          -MAX_CARD_COMMENTS
        ) : metadata.comments
      };
    });
    return card;
  }
  async releaseClaim(id, input = {}) {
    return await this.enqueueMutation(async () => {
      const existing = await this.get(id);
      if (!existing) {
        throw new Error(`card not found: ${id}`);
      }
      const status = input.status === void 0 ? existing.status : normalizeStatus(input.status, existing.status);
      const claim = existing.metadata?.claim;
      if (claim) {
        assertClaimIdentity(claim, input);
      }
      return await this.updateCard(
        id,
        {
          status,
          metadata: { ...existing.metadata, claim: void 0 }
        },
        { enforceStatusHolds: input.status !== void 0 }
      );
    });
  }
  async complete(id, input = {}, scope = input) {
    return await this.enqueueMutation(async () => await this.completeDirect(id, input, scope));
  }
  async completeDirect(id, input = {}, scope = input) {
    const existing = await this.get(id);
    if (!existing) {
      throw new Error(`card not found: ${id}`);
    }
    assertCanMutateClaimedCard(existing, scope === null ? void 0 : scope);
    const now = Date.now();
    const createdCardIds = normalizeStringList(input.createdCardIds, "created card ids", 120);
    const childIds = cardChildIds(existing);
    for (const createdCardId of createdCardIds) {
      const createdCard = await this.get(createdCardId);
      if (!createdCard) {
        throw new Error(`created card not found: ${createdCardId}`);
      }
      const linkedFromParent = childIds.includes(createdCardId) && cardParentIds(createdCard).includes(existing.id);
      if (!linkedFromParent) {
        throw new Error(`created card is not linked to this card: ${createdCardId}`);
      }
    }
    const summary = normalizeBoundedString(input.summary, void 0, 2e3, "summary");
    const proofInput = input.proof && typeof input.proof === "object" && !Array.isArray(input.proof) ? input.proof : void 0;
    const proofId = normalizeBoundedString(input.proofId, void 0, 120, "proof id");
    if (input.proofId !== void 0 && !proofId) {
      throw new Error("proofId must be a non-empty string.");
    }
    if (proofId && !proofInput) {
      throw new Error("proof is required when proofId is provided.");
    }
    const proof = proofInput ? normalizeProofInput(proofInput, now) : void 0;
    const artifacts = Array.isArray(input.artifacts) ? input.artifacts.map((artifact) => normalizeArtifact({ ...artifact, createdAt: now })).filter((artifact) => artifact !== null).slice(-MAX_CARD_ARTIFACTS) : [];
    const metadata = clearDiagnostics(existing.metadata, ["missing_proof"]);
    const notification = {
      id: randomUUID8(),
      kind: "completed",
      createdAt: now,
      sequence: this.nextNotificationSequence(now),
      message: capText(summary, 240) ?? "Flowboard card completed.",
      ...cardSessionKey(existing) ? { sessionKey: cardSessionKey(existing) } : {},
      ...cardRunId(existing) ? { runId: cardRunId(existing) } : {}
    };
    const execution = existing.execution?.status === "running" ? { ...existing.execution, status: "done", updatedAt: now } : existing.execution;
    return await this.updateCard(
      id,
      {
        status: "done",
        ...execution ? { execution } : {},
        metadata: {
          ...metadata,
          claim: void 0,
          attempts: closeRunningAttempts(metadata.attempts, now, "succeeded"),
          failureCount: 0,
          automation: normalizeAutomation(
            {
              ...metadata.automation,
              summary,
              createdCardIds
            },
            metadata.automation
          ),
          comments: summary ? [
            ...metadata.comments ?? [],
            { id: randomUUID8(), body: summary, createdAt: now }
          ].slice(-MAX_CARD_COMMENTS) : metadata.comments,
          proof: proof ? appendCompletionProof(metadata.proof, proof, proofId) : metadata.proof,
          artifacts: artifacts.length ? [...metadata.artifacts ?? [], ...artifacts].slice(-MAX_CARD_ARTIFACTS) : metadata.artifacts,
          notifications: [...metadata.notifications ?? [], notification].slice(
            -MAX_CARD_NOTIFICATIONS
          )
        }
      },
      {
        enforceStatusHolds: true,
        ...proof ? { preserveProofId: proofId ?? proof.id } : {}
      }
    );
  }
  async block(id, input = {}, scope = input) {
    return await this.enqueueMutation(async () => {
      const existing = await this.get(id);
      if (!existing) {
        throw new Error(`card not found: ${id}`);
      }
      assertCanMutateClaimedCard(existing, scope === null ? void 0 : scope);
      const now = Date.now();
      const reason = normalizeBoundedString(input.reason, void 0, 2e3, "block reason") ?? "Flowboard card blocked.";
      const metadata = existing.metadata ?? {};
      const notification = {
        id: randomUUID8(),
        kind: "failed",
        createdAt: now,
        sequence: this.nextNotificationSequence(now),
        message: capText(reason, 240) ?? "Flowboard card blocked.",
        ...cardSessionKey(existing) ? { sessionKey: cardSessionKey(existing) } : {},
        ...cardRunId(existing) ? { runId: cardRunId(existing) } : {}
      };
      const execution = existing.execution?.status === "running" ? { ...existing.execution, status: "blocked", updatedAt: now } : existing.execution;
      return await this.updateCard(id, {
        status: "blocked",
        ...execution ? { execution } : {},
        metadata: {
          ...metadata,
          claim: void 0,
          attempts: closeRunningAttempts(metadata.attempts, now, "blocked", reason),
          failureCount: (metadata.failureCount ?? 0) + 1,
          comments: [
            ...metadata.comments ?? [],
            { id: randomUUID8(), body: reason, createdAt: now }
          ].slice(-MAX_CARD_COMMENTS),
          notifications: [...metadata.notifications ?? [], notification].slice(
            -MAX_CARD_NOTIFICATIONS
          )
        }
      });
    });
  }
  async unblock(id, scope) {
    return await this.enqueueMutation(async () => {
      const existing = await this.get(id);
      if (!existing) {
        throw new Error(`card not found: ${id}`);
      }
      assertCanMutateClaimedCard(existing, scope);
      const metadata = clearDiagnostics(existing.metadata, ["blocked_too_long"]);
      return await this.updateCard(id, { status: "todo", metadata: { ...metadata, stale: null } });
    });
  }
  async reassign(id, input = {}, scope) {
    return await this.enqueueMutation(async () => {
      const existing = await this.get(id);
      if (!existing) {
        throw new Error(`card not found: ${id}`);
      }
      assertCanMutateClaimedCard(existing, scope === null ? void 0 : scope);
      const agentId = input.agentId === void 0 ? existing.agentId : normalizeOptionalString(input.agentId);
      const status = input.status === void 0 ? existing.status : normalizeStatus(input.status, existing.status);
      const reason = normalizeBoundedString(input.reason, void 0, 1e3, "reassign reason");
      const shouldResetFailures = input.resetFailures !== false;
      const baseMetadata = shouldResetFailures ? clearDiagnostics(existing.metadata, ["blocked_too_long", "repeated_failures"]) : existing.metadata;
      const metadata = {
        ...baseMetadata,
        ...shouldResetFailures ? { failureCount: 0 } : {},
        comments: reason ? [
          ...baseMetadata?.comments ?? [],
          { id: randomUUID8(), body: reason, createdAt: Date.now() }
        ].slice(-MAX_CARD_COMMENTS) : baseMetadata?.comments
      };
      return await this.updateCard(id, { agentId, status, metadata }, { enforceStatusHolds: true });
    });
  }
  async reclaim(id, input = {}, scope) {
    return await this.enqueueMutation(async () => {
      const existing = await this.get(id);
      if (!existing) {
        throw new Error(`card not found: ${id}`);
      }
      assertCanMutateClaimedCard(existing, scope === null ? void 0 : scope);
      const now = Date.now();
      const reason = normalizeBoundedString(input.reason, void 0, 1e3, "reclaim reason") ?? "Flowboard claim reclaimed.";
      const targetStatus = input.status === void 0 ? existing.status === "running" ? "ready" : existing.status : normalizeStatus(input.status, existing.status);
      const reclaimed = await this.updateCard(
        id,
        {
          status: targetStatus,
          execution: existing.execution?.status === "running" ? null : existing.execution,
          metadata: {
            ...existing.metadata,
            claim: void 0,
            attempts: closeRunningAttempts(existing.metadata?.attempts, now, "stopped", reason),
            comments: [
              ...existing.metadata?.comments ?? [],
              { id: randomUUID8(), body: reason, createdAt: now }
            ].slice(-MAX_CARD_COMMENTS),
            stale: null
          }
        },
        { enforceStatusHolds: true }
      );
      return await this.promoteDependencyReady(reclaimed.id, now);
    });
  }
  async runs(id) {
    const card = await this.get(id);
    if (!card) {
      throw new Error(`card not found: ${id}`);
    }
    return { card, attempts: card.metadata?.attempts ?? [] };
  }
  async specify(id, input = {}, scope) {
    return await this.enqueueMutation(async () => {
      const existing = await this.get(id);
      if (!existing) {
        throw new Error(`card not found: ${id}`);
      }
      assertCanMutateClaimedCard(existing, scope === null ? void 0 : scope);
      if (existing.status !== "triage" && existing.status !== "backlog" && existing.status !== "todo") {
        throw new Error("only triage, backlog, or todo cards can be specified.");
      }
      const requestedStatus = normalizeStatus(input.status, "todo");
      if (requestedStatus !== "todo") {
        throw new Error("specified cards must move to todo.");
      }
      const now = Date.now();
      const summary = normalizeBoundedString(input.summary, void 0, 2e3, "spec summary");
      const metadata = {
        ...existing.metadata,
        comments: summary ? [
          ...existing.metadata?.comments ?? [],
          { id: randomUUID8(), body: summary, createdAt: now }
        ].slice(-MAX_CARD_COMMENTS) : existing.metadata?.comments,
        automation: normalizeAutomation(
          {
            ...existing.metadata?.automation,
            summary: summary ?? existing.metadata?.automation?.summary
          },
          existing.metadata?.automation
        )
      };
      const { summary: _summary, status: _status, ...cardPatch } = input;
      const updated = await this.updateCard(
        id,
        {
          ...cardPatch,
          status: "todo",
          metadata
        },
        { enforceStatusHolds: true }
      );
      const specified = {
        ...updated,
        events: appendEvent(updated, { kind: "specified" }, now)
      };
      await this.store.register(specified.id, { version: 1, card: specified });
      return specified;
    });
  }
  async decompose(id, input = {}, scope) {
    return await this.enqueueMutation(async () => {
      const parent = await this.get(id);
      if (!parent) {
        throw new Error(`card not found: ${id}`);
      }
      assertCanMutateClaimedCard(parent, scope === null ? void 0 : scope);
      const childrenInput = Array.isArray(input.children) ? input.children : [];
      if (childrenInput.length === 0) {
        throw new Error("children are required.");
      }
      if (childrenInput.length > 20) {
        throw new Error("at most 20 children can be created at once.");
      }
      const parentAutomation = parent.metadata?.automation;
      const existingCardIds = new Set((await this.list()).map((card) => card.id));
      const children = [];
      const reusedChildSnapshots = /* @__PURE__ */ new Map();
      try {
        for (const rawChild of childrenInput) {
          if (!rawChild || typeof rawChild !== "object" || Array.isArray(rawChild)) {
            throw new Error("children must be objects.");
          }
          const child = rawChild;
          const created = await this.createDirect(
            {
              ...child,
              parents: [parent.id],
              boardId: child.boardId ?? parentAutomation?.boardId,
              tenant: child.tenant ?? parentAutomation?.tenant,
              createdByCardId: parent.id,
              idempotencyKey: child.idempotencyKey ?? deriveChildIdempotencyKey(parentAutomation?.idempotencyKey, children.length + 1)
            },
            scope === null ? void 0 : scope
          );
          const reusedUnlinkedChild = existingCardIds.has(created.id) && !cardParentIds(created).includes(parent.id);
          if (reusedUnlinkedChild) {
            reusedChildSnapshots.set(created.id, created);
          }
          children.push(
            cardParentIds(created).includes(parent.id) ? created : await this.linkCardsDirect(parent.id, created.id, Date.now(), {
              allowStatusOnlyActiveChild: true,
              scope: scope === null ? void 0 : scope
            })
          );
        }
        const summary = normalizeBoundedString(input.summary, void 0, 2e3, "decompose summary");
        const completeParent = input.completeParent !== false;
        const updatedParent = completeParent ? await this.completeDirect(
          parent.id,
          { summary, createdCardIds: children.map((child) => child.id) },
          scope
        ) : await (async () => {
          const latestParent = await this.get(parent.id) ?? parent;
          return await this.updateCard(
            parent.id,
            {
              status: latestParent.status === "triage" || latestParent.status === "backlog" ? "todo" : latestParent.status,
              metadata: {
                ...latestParent.metadata,
                automation: normalizeAutomation(
                  {
                    ...latestParent.metadata?.automation,
                    summary,
                    createdCardIds: children.map((child) => child.id)
                  },
                  latestParent.metadata?.automation
                )
              }
            },
            { enforceStatusHolds: true }
          );
        })();
        const decomposedParent = {
          ...updatedParent,
          events: appendEvent(updatedParent, { kind: "decomposed" })
        };
        await this.store.register(decomposedParent.id, { version: 1, card: decomposedParent });
        return { parent: decomposedParent, children };
      } catch (error) {
        for (const child of children.toReversed()) {
          if (!existingCardIds.has(child.id)) {
            await this.deleteDirect(child.id);
          }
        }
        for (const child of reusedChildSnapshots.values()) {
          await this.store.register(child.id, { version: 1, card: child });
        }
        await this.store.register(parent.id, { version: 1, card: parent });
        throw error;
      }
    });
  }
};

// src/backend/src/store-notifications.ts
var FlowboardNotificationStore = class extends FlowboardWorkflowStore {
  async subscribeNotifications(input) {
    return await this.enqueueMutation(async () => {
      const subscription = normalizeNotificationSubscription(input);
      await this.subscriptionStore.register(subscription.id, { version: 1, subscription });
      return subscription;
    });
  }
  async listNotificationSubscriptions(input = {}) {
    const boardId = normalizeBoardId(input.boardId);
    const cardId = normalizeBoundedString(input.cardId, void 0, 120, "card id");
    const subscriptions = (await this.subscriptionStore.entries()).map((entry) => entry.value).filter(
      (entry) => entry?.version === 1 && Boolean(entry.subscription?.id)
    ).map((entry) => entry.subscription).filter((subscription) => !boardId || subscription.boardId === boardId).filter((subscription) => !cardId || subscription.cardId === cardId).toSorted((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
    return { subscriptions };
  }
  async deleteNotificationSubscription(id) {
    return await this.enqueueMutation(async () => ({
      deleted: await this.subscriptionStore.delete(id.trim())
    }));
  }
  async collectNotificationEvents(input = {}) {
    const subscriptionId = normalizeBoundedString(
      input.subscriptionId,
      void 0,
      120,
      "subscription id"
    );
    const boardId = normalizeBoardId(input.boardId);
    const cardId = normalizeBoundedString(input.cardId, void 0, 120, "card id");
    const limit = typeof input.limit === "number" && Number.isFinite(input.limit) ? Math.max(1, Math.min(200, Math.trunc(input.limit))) : 50;
    const subscriptionEntry = subscriptionId ? await this.subscriptionStore.lookup(subscriptionId) : void 0;
    if (subscriptionId && !subscriptionEntry?.subscription) {
      throw new Error(`notification subscription not found: ${subscriptionId}`);
    }
    const subscription = subscriptionEntry?.subscription;
    const effectiveCardId = subscription?.cardId ?? cardId;
    const effectiveBoardId = effectiveCardId ? void 0 : subscription?.boardId ?? boardId;
    const effectiveSessionKey = subscription?.sessionKey;
    const effectiveRunId = subscription?.runId;
    const events = [];
    for (const card of await this.list({ boardId: effectiveBoardId })) {
      if (card.metadata?.archivedAt || effectiveCardId && card.id !== effectiveCardId) {
        continue;
      }
      const stale = card.metadata?.stale;
      const notifications = [
        ...card.metadata?.notifications ?? [],
        ...stale ? [
          {
            id: `stale:${card.id}:${stale.detectedAt}`,
            kind: "stale",
            createdAt: stale.detectedAt,
            sequence: stale.detectedAt * 1e3,
            message: stale.reason,
            ...cardSessionKey(card) ? { sessionKey: cardSessionKey(card) } : {},
            ...cardRunId(card) ? { runId: cardRunId(card) } : {}
          }
        ] : []
      ];
      for (const event of notifications) {
        const eventSessionKey = event.sessionKey ?? cardSessionKey(card);
        const eventRunId = event.runId ?? cardRunId(card);
        if (effectiveSessionKey && eventSessionKey !== effectiveSessionKey) {
          continue;
        }
        if (effectiveRunId && eventRunId !== effectiveRunId) {
          continue;
        }
        if (subscription?.eventKinds?.length && !subscription.eventKinds.includes(event.kind)) {
          continue;
        }
        if (subscription?.lastEventAt !== void 0 && compareNotifications(event, {
          id: subscription.lastEventId ?? "",
          kind: event.kind,
          createdAt: subscription.lastEventAt,
          ...subscription.lastEventSequence !== void 0 ? { sequence: subscription.lastEventSequence } : {},
          message: ""
        }) <= 0) {
          continue;
        }
        events.push(event);
      }
    }
    const sorted = events.toSorted(compareNotifications).slice(0, limit);
    return { ...subscription ? { subscription } : {}, events: sorted };
  }
  async notificationEvents(input = {}) {
    return await this.collectNotificationEvents(input);
  }
  async advanceNotificationEvents(input = {}) {
    const subscriptionId = normalizeBoundedString(
      input.subscriptionId,
      void 0,
      120,
      "subscription id"
    );
    if (!subscriptionId) {
      throw new Error("subscriptionId is required to advance notification events.");
    }
    return await this.enqueueMutation(async () => {
      const result = await this.collectNotificationEvents({ ...input, subscriptionId });
      if (!result.subscription || !result.events.length) {
        return result;
      }
      const last = result.events.at(-1);
      const lastSequence = notificationSequence(last);
      const subscription = {
        ...result.subscription,
        lastEventAt: last.createdAt,
        lastEventId: last.id,
        ...lastSequence !== void 0 ? { lastEventSequence: lastSequence } : {},
        updatedAt: Date.now()
      };
      delete subscription.deliveredEventIds;
      if (lastSequence === void 0) {
        delete subscription.lastEventSequence;
      }
      await this.subscriptionStore.register(subscription.id, {
        version: 1,
        subscription
      });
      return { subscription, events: result.events };
    });
  }
};

// src/backend/src/project-document-discovery.ts
import { createHash as createHash2 } from "node:crypto";
import fs3 from "node:fs/promises";
import path4 from "node:path";
var MAX_DISCOVERED_DOCUMENTS = 500;
var MARKDOWN_EXTENSIONS2 = /* @__PURE__ */ new Set([".md", ".markdown"]);
var TOP_LEVEL_AI_INSTRUCTION_NAMES = /* @__PURE__ */ new Set(["agents.md", "claude.md"]);
var EXCLUDED_TOP_LEVEL_AI_INSTRUCTION_DIRECTORIES = /* @__PURE__ */ new Set([
  ".git",
  ".next",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "tpm",
  "vendor"
]);
var PLANNING_DOCUMENT_DIRECTORIES = /* @__PURE__ */ new Set(["codebase", "intel", "notes", "research", "seeds"]);
var EXTRA_DOCUMENT_PATHS = [
  ".github/copilot-instructions.md",
  ".claude/skills/deploy-test/SKILL.md",
  ".claude/skills/deploy-prod/SKILL.md"
];
function isPathInside2(root, candidate) {
  const relative = path4.relative(root, candidate);
  return relative === "" || !relative.startsWith(`..${path4.sep}`) && relative !== "..";
}
function normalizedRelativePath(root, target) {
  return path4.relative(root, target).split(path4.sep).join("/");
}
function isMarkdownPath(relativePath) {
  return MARKDOWN_EXTENSIONS2.has(path4.extname(relativePath).toLocaleLowerCase());
}
function sourceForDocument(relativePath) {
  const normalized = relativePath.toLocaleLowerCase();
  if (normalized === ".github/copilot-instructions.md" || normalized === ".claude/skills/deploy-test/skill.md" || normalized === ".claude/skills/deploy-prod/skill.md" || /^(?:[^/]+\/)?(?:agents|claude)\.md$/.test(normalized)) {
    return "ai_system";
  }
  return "project";
}
function sectionForDocument(relativePath) {
  const normalized = relativePath.toLocaleLowerCase();
  if (normalized.startsWith(".planning/codebase/")) {
    return "codebase";
  }
  if (normalized.startsWith(".planning/intel/") || /(?:^|\/)(?:deploy|deployment|environment|operations|ops|runbook)(?:\/|$)/.test(normalized)) {
    return "environment";
  }
  if (normalized.startsWith(".planning/notes/") || normalized.startsWith(".planning/research/")) {
    return "knowledge";
  }
  return "project";
}
function candidateKey(relativePath, source) {
  if (source === "ai_system") {
    const normalized = relativePath.toLocaleLowerCase().replace(/\.(?:md|markdown)$/i, "").replace(/[\\/]+/g, ".").replace(/[^a-z0-9._-]/g, "-").replace(/^\.+/, "");
    return `ai.${normalized}`;
  }
  return `file.${createHash2("sha256").update(relativePath).digest("hex").slice(0, 24)}`;
}
function candidateTitle(relativePath) {
  return path4.basename(relativePath).replace(/\.(?:md|markdown)$/i, "");
}
async function directoryEntries(directory) {
  try {
    return await fs3.readdir(directory, { encoding: "utf8", withFileTypes: true });
  } catch {
    return [];
  }
}
async function addCandidate(params) {
  if (params.results.length >= MAX_DISCOVERED_DOCUMENTS || !isMarkdownPath(params.relativePath)) {
    return;
  }
  const candidatePath = path4.join(params.root, params.relativePath);
  let target;
  try {
    target = await fs3.realpath(candidatePath);
  } catch {
    return;
  }
  if (!isPathInside2(params.root, target) || params.targets.has(target)) {
    return;
  }
  let stat;
  try {
    stat = await fs3.stat(target);
  } catch {
    return;
  }
  if (!stat.isFile()) {
    return;
  }
  const relativePath = normalizedRelativePath(params.root, target);
  const source = sourceForDocument(relativePath);
  params.results.push({
    key: candidateKey(relativePath, source),
    relativePath,
    target,
    title: candidateTitle(relativePath),
    summary: source === "ai_system" ? "AI instruction file." : relativePath,
    section: sectionForDocument(relativePath),
    source
  });
  params.targets.add(target);
}
async function addDirectoryMarkdownFiles(params) {
  const directory = path4.join(params.root, params.relativeDirectory);
  const entries = await directoryEntries(directory);
  for (const entry of entries.filter((entry2) => entry2.isFile() && isMarkdownPath(entry2.name)).toSorted((left, right) => left.name.localeCompare(right.name))) {
    await addCandidate({
      ...params,
      relativePath: path4.join(params.relativeDirectory, entry.name)
    });
  }
}
async function addTopLevelModuleAiInstructions(params) {
  const entries = await directoryEntries(params.root);
  for (const entry of entries.filter(
    (entry2) => entry2.isDirectory() && !entry2.isSymbolicLink() && !entry2.name.startsWith(".") && !EXCLUDED_TOP_LEVEL_AI_INSTRUCTION_DIRECTORIES.has(entry2.name)
  ).toSorted((left, right) => left.name.localeCompare(right.name))) {
    const moduleEntries = await directoryEntries(path4.join(params.root, entry.name));
    for (const instruction of moduleEntries.filter(
      (moduleEntry) => moduleEntry.isFile() && TOP_LEVEL_AI_INSTRUCTION_NAMES.has(moduleEntry.name.toLocaleLowerCase())
    ).toSorted((left, right) => left.name.localeCompare(right.name))) {
      await addCandidate({
        ...params,
        relativePath: path4.join(entry.name, instruction.name)
      });
    }
  }
}
async function resolveFlowboardProjectDocumentWorkspacePath(workspacePath) {
  let root;
  try {
    root = await fs3.realpath(workspacePath);
  } catch {
    throw new Error("project default workspace does not exist.");
  }
  let rootStat;
  try {
    rootStat = await fs3.stat(root);
  } catch {
    throw new Error("project default workspace cannot be read.");
  }
  if (!rootStat.isDirectory()) {
    throw new Error("project default workspace must be a directory.");
  }
  return root;
}
function isFlowboardProjectDocumentDiscoveryPath(workspaceRoot, target) {
  if (!target || !path4.isAbsolute(target)) {
    return false;
  }
  const root = path4.resolve(workspaceRoot);
  const resolvedTarget = path4.resolve(target);
  if (!isPathInside2(root, resolvedTarget)) {
    return false;
  }
  const relativePath = normalizedRelativePath(root, resolvedTarget);
  if (!isMarkdownPath(relativePath)) {
    return false;
  }
  const segments = relativePath.split("/");
  if (segments.length === 1) {
    return true;
  }
  if (segments.length === 2 && TOP_LEVEL_AI_INSTRUCTION_NAMES.has(segments[1].toLocaleLowerCase()) && !segments[0].startsWith(".") && !EXCLUDED_TOP_LEVEL_AI_INSTRUCTION_DIRECTORIES.has(segments[0])) {
    return true;
  }
  if (segments.length === 2 && segments[0] === ".planning") {
    return true;
  }
  if (segments.length === 3 && segments[0] === ".planning" && PLANNING_DOCUMENT_DIRECTORIES.has(segments[1])) {
    return true;
  }
  return EXTRA_DOCUMENT_PATHS.includes(relativePath);
}
async function discoverFlowboardProjectDocuments(workspacePath) {
  const root = await resolveFlowboardProjectDocumentWorkspacePath(workspacePath);
  const results = [];
  const targets = /* @__PURE__ */ new Set();
  const params = { root, results, targets };
  await addDirectoryMarkdownFiles({ ...params, relativeDirectory: "" });
  await addTopLevelModuleAiInstructions(params);
  await addDirectoryMarkdownFiles({ ...params, relativeDirectory: ".planning" });
  for (const directory of PLANNING_DOCUMENT_DIRECTORIES) {
    await addDirectoryMarkdownFiles({
      ...params,
      relativeDirectory: path4.join(".planning", directory)
    });
  }
  for (const relativePath of EXTRA_DOCUMENT_PATHS) {
    await addCandidate({ ...params, relativePath });
  }
  return results;
}

// src/backend/src/store-projects.ts
var RESERVED_AUTOMATIC_DOCUMENT_KEY_PREFIXES = ["file.", "ai."];
function presentProjectDocument(document) {
  const next = {
    ...document,
    source: document.source ?? "project"
  };
  delete next.system;
  return next;
}
function isDocumentSection(value) {
  return typeof value === "string" && FLOWBOARD_PROJECT_DOCUMENT_SECTIONS.includes(value);
}
function isDocumentType(value) {
  return typeof value === "string" && FLOWBOARD_PROJECT_DOCUMENT_TYPES.includes(value);
}
function normalizeDocumentKey(value, fallback) {
  const key = normalizeBoundedString(value, fallback, 80, "document key");
  if (!key || !/^[a-z0-9][a-z0-9._-]{0,79}$/.test(key)) {
    throw new Error("document key must match [a-z0-9][a-z0-9._-]{0,79}.");
  }
  return key;
}
function hasReservedAutomaticDocumentKeyPrefix(key) {
  return RESERVED_AUTOMATIC_DOCUMENT_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
}
function isAutomaticProjectDocument(document) {
  return document.system === true || hasReservedAutomaticDocumentKeyPrefix(document.key);
}
function normalizeDocumentSection(value, fallback) {
  if (value === void 0) {
    if (fallback) {
      return fallback;
    }
    throw new Error(`document section must be one of: ${FLOWBOARD_PROJECT_DOCUMENT_SECTIONS.join(", ")}.`);
  }
  if (!isDocumentSection(value)) {
    throw new Error(`document section must be one of: ${FLOWBOARD_PROJECT_DOCUMENT_SECTIONS.join(", ")}.`);
  }
  return value;
}
function normalizeDocumentType(value, fallback) {
  if (value === void 0) {
    if (fallback) {
      return fallback;
    }
    throw new Error(`document type must be one of: ${FLOWBOARD_PROJECT_DOCUMENT_TYPES.join(", ")}.`);
  }
  if (!isDocumentType(value)) {
    throw new Error(`document type must be one of: ${FLOWBOARD_PROJECT_DOCUMENT_TYPES.join(", ")}.`);
  }
  return value;
}
function normalizeDocumentBody(input, type, fallback) {
  const target = type === "link" ? normalizeExternalUrl(input.target, fallback?.target, "document URL") : type === "path" || type === "secret_ref" ? normalizeBoundedString(input.target, fallback?.target, 2e3, "document target") : void 0;
  const content = type === "markdown" || type === "json" ? normalizeBoundedString(input.content, fallback?.content, 2e4, "document content") : void 0;
  if ((type === "link" || type === "path" || type === "secret_ref") && !target) {
    throw new Error(`${type} documents require a target.`);
  }
  if (type === "path" && (target?.includes("\0") || target?.includes("\n"))) {
    throw new Error("document path contains unsupported characters.");
  }
  if (type === "json" && content) {
    try {
      JSON.parse(content);
    } catch {
      throw new Error("document JSON must be valid.");
    }
  }
  return {
    ...target ? { target } : {},
    ...content ? { content } : {}
  };
}
function boardRunningCards(cards) {
  return cards.filter(
    (card) => card.status === "running" || card.execution?.status === "running" || card.metadata?.attempts?.some((attempt) => attempt.status === "running")
  );
}
var FlowboardProjectStore = class extends FlowboardNotificationStore {
  async ensureBoardDirect(boardId, now = Date.now()) {
    const existing = await this.boardStore.lookup(boardId);
    if (existing?.version === 1) {
      return existing.board;
    }
    const board = normalizeBoardMetadata({ id: boardId }, void 0, now);
    await this.boardStore.register(board.id, { version: 1, board });
    return board;
  }
  async removeLegacyGeneratedProjectDocumentsDirect(board) {
    if (!board.defaultWorkspace?.path || board.defaultWorkspace.kind !== "dir" && board.defaultWorkspace.kind !== "worktree") {
      return;
    }
    for (const entry of await this.documentStore.entries()) {
      const document = entry.value?.version === 1 ? entry.value.document : void 0;
      if (document?.boardId === board.id && document.system === true && document.type === "path" && !hasReservedAutomaticDocumentKeyPrefix(document.key)) {
        await this.documentStore.delete(entry.key);
      }
    }
  }
  async discoverProjectDocumentsDirect(board, now = Date.now()) {
    const workspacePath = board.defaultWorkspace?.path;
    if (!workspacePath || board.defaultWorkspace?.kind !== "dir" && board.defaultWorkspace?.kind !== "worktree") {
      return;
    }
    let workspaceRoot;
    let candidates;
    try {
      workspaceRoot = await resolveFlowboardProjectDocumentWorkspacePath(workspacePath);
      candidates = await discoverFlowboardProjectDocuments(workspaceRoot);
    } catch {
      return;
    }
    for (const entry of await this.documentStore.entries()) {
      const document = entry.value?.version === 1 ? entry.value.document : void 0;
      if (document?.boardId === board.id && isAutomaticProjectDocument(document) && !isFlowboardProjectDocumentDiscoveryPath(workspaceRoot, document.target)) {
        await this.documentStore.delete(entry.key);
      }
    }
    const existing = (await this.documentStore.entries()).map((entry) => entry.value).filter(
      (entry) => entry?.version === 1 && entry.document?.boardId === board.id
    ).map((entry) => presentProjectDocument(entry.document));
    const existingKeys = new Set(existing.map((document) => document.key));
    const existingTargets = new Set(
      existing.map((document) => document.target).filter((target) => Boolean(target))
    );
    const nextPositionBySection = /* @__PURE__ */ new Map();
    for (const candidate of candidates) {
      if (existingKeys.has(candidate.key) || existingTargets.has(candidate.target)) {
        continue;
      }
      const position = (nextPositionBySection.get(candidate.section) ?? Math.max(
        0,
        ...existing.filter((document2) => document2.section === candidate.section).map((document2) => document2.position)
      )) + POSITION_STEP;
      nextPositionBySection.set(candidate.section, position);
      const document = {
        id: randomUUID9(),
        boardId: board.id,
        key: candidate.key,
        section: candidate.section,
        source: candidate.source,
        type: "path",
        title: candidate.title,
        summary: candidate.summary,
        target: candidate.target,
        position,
        system: true,
        createdAt: now,
        updatedAt: now
      };
      await this.documentStore.register(document.id, { version: 1, document });
      existingKeys.add(candidate.key);
      existingTargets.add(candidate.target);
    }
  }
  async ensureProjectDirect(boardId, now = Date.now()) {
    return await this.ensureBoardDirect(boardId, now);
  }
  async assertProjectCanReceiveCards(boardId) {
    const board = await this.boardStore.lookup(boardId);
    if (board?.version === 1 && board.board.archivedAt) {
      throw new Error("project is archived and cannot receive cards.");
    }
  }
  async isProjectArchived(boardId) {
    const board = await this.boardStore.lookup(boardId);
    return Boolean(board?.version === 1 && board.board.archivedAt);
  }
  async listProjects(params = {}) {
    const includeArchived = params.includeArchived === true;
    const { boards } = await this.listBoards();
    return {
      projects: boards.filter((board) => includeArchived || !board.archivedAt).toSorted(
        (left, right) => (left.position ?? Number.MAX_SAFE_INTEGER) - (right.position ?? Number.MAX_SAFE_INTEGER) || left.id.localeCompare(right.id)
      )
    };
  }
  async getProject(id) {
    const boardId = normalizeBoardIdRequired(id);
    return await this.enqueueMutation(async () => {
      const board = await this.ensureProjectDirect(boardId);
      const milestones = await this.listMilestonesDirect(boardId);
      const cards = await this.list({ boardId });
      return { board, milestones, cards };
    });
  }
  async createProject(input) {
    return await this.enqueueMutation(async () => {
      const boardId = normalizeBoardIdRequired(input.id);
      if (await this.boardStore.lookup(boardId)) {
        throw new Error(`project already exists: ${boardId}`);
      }
      if ((await this.list({ boardId })).length > 0) {
        throw new Error(`project already exists through existing cards: ${boardId}`);
      }
      const name = normalizeTitle(input.name);
      const initialMilestoneTitle = normalizeTitle(input.initialMilestoneTitle);
      const existingBoards = await this.listBoards();
      const maxPosition = Math.max(
        0,
        ...existingBoards.boards.map((board2) => board2.position ?? 0)
      );
      const board = normalizeBoardMetadata(
        {
          ...input,
          id: boardId,
          name,
          position: input.position ?? maxPosition + POSITION_STEP
        },
        void 0
      );
      const milestone = this.createMilestoneRecord(
        boardId,
        {
          title: initialMilestoneTitle,
          description: void 0,
          color: void 0,
          position: POSITION_STEP
        },
        Date.now()
      );
      await this.boardStore.register(board.id, { version: 1, board });
      try {
        await this.milestoneStore.register(milestone.id, { version: 1, milestone });
      } catch (error) {
        for (const entry of await this.documentStore.entries()) {
          if (entry.value?.version === 1 && entry.value.document.boardId === boardId) {
            await this.documentStore.delete(entry.key);
          }
        }
        await this.milestoneStore.delete(milestone.id);
        await this.boardStore.delete(board.id);
        throw error;
      }
      return {
        board,
        milestones: [milestone],
        cards: []
      };
    });
  }
  async updateProject(input) {
    return await this.enqueueMutation(async () => {
      const boardId = normalizeBoardIdRequired(input.id);
      const existing = await this.boardStore.lookup(boardId);
      if (!existing && (await this.list({ boardId })).length === 0 && boardId !== "default") {
        throw new Error(`project not found: ${boardId}`);
      }
      if (!existing) {
        await this.ensureProjectDirect(boardId);
      }
      const board = normalizeBoardMetadata({ ...input, id: boardId }, existing?.board);
      await this.boardStore.register(boardId, { version: 1, board });
      return board;
    });
  }
  async reorderProjects(ids) {
    if (!Array.isArray(ids) || ids.length === 0 || ids.some((id) => typeof id !== "string")) {
      throw new Error("project ids are required.");
    }
    return await this.enqueueMutation(async () => {
      const seen = /* @__PURE__ */ new Set();
      const boards = [];
      for (const rawId of ids) {
        const boardId = normalizeBoardIdRequired(rawId);
        if (seen.has(boardId)) {
          throw new Error("project ids must not contain duplicates.");
        }
        seen.add(boardId);
        const entry = await this.boardStore.lookup(boardId);
        if (!entry?.board) {
          throw new Error(`project not found: ${boardId}`);
        }
        boards.push(entry.board);
      }
      const now = Date.now();
      const updated = boards.map(
        (board, index) => normalizeBoardMetadata(
          { ...board, id: board.id, position: (index + 1) * POSITION_STEP },
          board,
          now
        )
      );
      for (const board of updated) {
        await this.boardStore.register(board.id, { version: 1, board });
      }
      return { projects: updated };
    });
  }
  async archiveProject(id, archived = true) {
    const boardId = normalizeBoardIdRequired(id);
    return await this.enqueueMutation(async () => {
      const existing = await this.boardStore.lookup(boardId);
      const board = normalizeBoardMetadata(
        { id: boardId, archived },
        existing?.board
      );
      await this.boardStore.register(boardId, { version: 1, board });
      return {
        board,
        runningCards: archived === false ? [] : boardRunningCards(await this.list({ boardId }))
      };
    });
  }
  async listMilestones(boardId) {
    return { milestones: await this.listMilestonesDirect(normalizeBoardIdRequired(boardId)) };
  }
  async listMilestonesDirect(boardId) {
    return (await this.milestoneStore.entries()).map((entry) => entry.value).filter(
      (entry) => entry?.version === 1 && entry.milestone?.boardId === boardId
    ).map((entry) => entry.milestone).toSorted((left, right) => left.position - right.position || left.createdAt - right.createdAt);
  }
  createMilestoneRecord(boardId, input, now) {
    const title = normalizeTitle(input.title);
    const description = normalizeBoundedString(input.description, void 0, 2e3, "milestone description");
    const color = normalizeBoundedString(input.color, void 0, 40, "milestone color");
    return {
      id: randomUUID9(),
      boardId,
      title,
      position: normalizePosition(input.position, POSITION_STEP),
      state: "active",
      createdAt: now,
      updatedAt: now,
      ...description ? { description } : {},
      ...color ? { color } : {}
    };
  }
  async createMilestone(input) {
    return await this.enqueueMutation(async () => {
      const boardId = normalizeBoardIdRequired(input.boardId);
      await this.assertProjectCanReceiveCards(boardId);
      await this.ensureProjectDirect(boardId);
      const existing = await this.listMilestonesDirect(boardId);
      const position = input.position === void 0 ? Math.max(0, ...existing.map((milestone2) => milestone2.position)) + POSITION_STEP : input.position;
      const milestone = this.createMilestoneRecord(boardId, { ...input, position }, Date.now());
      await this.milestoneStore.register(milestone.id, { version: 1, milestone });
      return milestone;
    });
  }
  async updateMilestone(id, input) {
    return await this.enqueueMutation(async () => {
      const existing = await this.milestoneStore.lookup(id.trim());
      if (!existing?.milestone) {
        throw new Error(`milestone not found: ${id}`);
      }
      const milestone = existing.milestone;
      const title = input.title === void 0 ? milestone.title : normalizeTitle(input.title);
      const description = input.description === void 0 ? milestone.description : normalizeBoundedString(input.description, void 0, 2e3, "milestone description");
      const color = input.color === void 0 ? milestone.color : normalizeBoundedString(input.color, void 0, 40, "milestone color");
      const next = {
        ...milestone,
        title,
        updatedAt: Date.now(),
        ...description ? { description } : {},
        ...color ? { color } : {}
      };
      if (!description) {
        delete next.description;
      }
      if (!color) {
        delete next.color;
      }
      await this.milestoneStore.register(next.id, { version: 1, milestone: next });
      return next;
    });
  }
  async reorderMilestones(input) {
    const boardId = normalizeBoardIdRequired(input.boardId);
    if (!Array.isArray(input.milestoneIds) || input.milestoneIds.length === 0 || input.milestoneIds.some((id) => typeof id !== "string")) {
      throw new Error("milestone ids are required.");
    }
    return await this.enqueueMutation(async () => {
      const existing = await this.listMilestonesDirect(boardId);
      const ids = input.milestoneIds;
      if (new Set(ids).size !== ids.length || ids.length !== existing.length) {
        throw new Error("milestone ids must contain every project milestone exactly once.");
      }
      const byId = new Map(existing.map((milestone) => [milestone.id, milestone]));
      const now = Date.now();
      const milestones = ids.map((id, index) => {
        const milestone = byId.get(id);
        if (!milestone) {
          throw new Error(`milestone does not belong to project: ${id}`);
        }
        return { ...milestone, position: (index + 1) * POSITION_STEP, updatedAt: now };
      });
      for (const milestone of milestones) {
        await this.milestoneStore.register(milestone.id, { version: 1, milestone });
      }
      return { milestones };
    });
  }
  async completeMilestone(id) {
    return await this.enqueueMutation(async () => {
      const entry = await this.milestoneStore.lookup(id.trim());
      if (!entry?.milestone) {
        throw new Error(`milestone not found: ${id}`);
      }
      const milestone = entry.milestone;
      if (milestone.state !== "active") {
        throw new Error("only active milestones can be completed.");
      }
      const unfinished = (await this.list({ boardId: milestone.boardId })).filter(
        (card) => card.milestoneId === milestone.id && !card.metadata?.archivedAt && card.status !== "done"
      );
      if (unfinished.length > 0) {
        throw new Error(
          `milestone has unfinished cards: ${unfinished.map((card) => `${card.id}:${card.title}`).join(", ")}`
        );
      }
      const now = Date.now();
      const next = {
        ...milestone,
        state: "completed",
        completedAt: now,
        updatedAt: now
      };
      await this.milestoneStore.register(next.id, { version: 1, milestone: next });
      return next;
    });
  }
  async archiveMilestone(id) {
    return await this.setMilestoneState(id, "archived");
  }
  async restoreMilestone(id) {
    return await this.setMilestoneState(id, "active");
  }
  async setMilestoneState(id, state) {
    return await this.enqueueMutation(async () => {
      if (!FLOWBOARD_MILESTONE_STATES.includes(state)) {
        throw new Error("invalid milestone state.");
      }
      const entry = await this.milestoneStore.lookup(id.trim());
      if (!entry?.milestone) {
        throw new Error(`milestone not found: ${id}`);
      }
      const now = Date.now();
      const next = {
        ...entry.milestone,
        state,
        updatedAt: now,
        ...state === "archived" ? { archivedAt: now } : {}
      };
      if (state === "active") {
        delete next.archivedAt;
        delete next.completedAt;
      }
      await this.milestoneStore.register(next.id, { version: 1, milestone: next });
      return next;
    });
  }
  async moveMilestone(id, input) {
    return await this.enqueueMutation(async () => {
      const card = await this.get(id);
      if (!card) {
        throw new Error(`card not found: ${id}`);
      }
      const boardId = cardBoardId(card);
      await this.assertProjectCanReceiveCards(boardId);
      const milestoneId = normalizeOptionalString(input.milestoneId);
      if (milestoneId) {
        const milestone = await this.milestoneStore.lookup(milestoneId);
        if (!milestone?.milestone || milestone.milestone.boardId !== boardId || milestone.milestone.state !== "active") {
          throw new Error("target milestone must be an active milestone in the current project.");
        }
      }
      const position = input.position === void 0 ? Math.max(
        0,
        ...(await this.list({ boardId })).filter((candidate) => candidate.id !== card.id && candidate.milestoneId === milestoneId).map((candidate) => candidate.position)
      ) + POSITION_STEP : normalizePosition(input.position, card.position);
      const next = removeUndefinedCardFields({
        ...card,
        ...milestoneId ? { milestoneId } : {},
        position,
        updatedAt: Date.now()
      });
      if (!milestoneId) {
        delete next.milestoneId;
      }
      if (card.milestoneId !== milestoneId) {
        next.events = appendEvent(next, {
          kind: "milestone_moved",
          ...card.milestoneId ? { fromMilestoneId: card.milestoneId } : {},
          ...milestoneId ? { toMilestoneId: milestoneId } : {}
        });
      }
      await this.store.register(next.id, { version: 1, card: next });
      return next;
    });
  }
  async moveProject(id, input) {
    return await this.enqueueMutation(async () => {
      const card = await this.get(id);
      if (!card) {
        throw new Error(`card not found: ${id}`);
      }
      const currentBoardId = cardBoardId(card);
      const boardId = normalizeBoardIdRequired(input.boardId);
      const targetBoard = await this.boardStore.lookup(boardId);
      if (!targetBoard && (await this.list({ boardId })).length === 0 && boardId !== "default") {
        throw new Error(`target project not found: ${boardId}`);
      }
      await this.assertProjectCanReceiveCards(boardId);
      await this.ensureProjectDirect(boardId);
      const milestoneId = normalizeOptionalString(input.milestoneId);
      if (boardId !== currentBoardId && !milestoneId) {
        throw new Error("target milestone is required when moving a card to another project.");
      }
      if (milestoneId) {
        const milestone = await this.milestoneStore.lookup(milestoneId);
        if (!milestone?.milestone || milestone.milestone.boardId !== boardId || milestone.milestone.state !== "active") {
          throw new Error("target milestone must be an active milestone in the target project.");
        }
      }
      const position = input.position === void 0 ? Math.max(
        0,
        ...(await this.list({ boardId })).filter((candidate) => candidate.id !== card.id && candidate.milestoneId === milestoneId).map((candidate) => candidate.position)
      ) + POSITION_STEP : normalizePosition(input.position, card.position);
      const next = removeUndefinedCardFields({
        ...card,
        ...milestoneId ? { milestoneId } : {},
        position,
        updatedAt: Date.now(),
        metadata: {
          ...card.metadata,
          automation: {
            ...card.metadata?.automation,
            boardId
          }
        }
      });
      if (!milestoneId) {
        delete next.milestoneId;
      }
      next.events = appendEvent(next, {
        kind: "milestone_moved",
        ...card.milestoneId ? { fromMilestoneId: card.milestoneId } : {},
        ...milestoneId ? { toMilestoneId: milestoneId } : {}
      });
      await this.store.register(next.id, { version: 1, card: next });
      return next;
    });
  }
  async listProjectDocuments(boardId, options = {}) {
    const normalizedBoardId = normalizeBoardIdRequired(boardId);
    return await this.enqueueMutation(async () => {
      const board = await this.ensureProjectDirect(normalizedBoardId);
      await this.removeLegacyGeneratedProjectDocumentsDirect(board);
      await this.discoverProjectDocumentsDirect(board);
      const documents = (await this.documentStore.entries()).map((entry) => entry.value).filter(
        (entry) => entry?.version === 1 && entry.document?.boardId === normalizedBoardId
      ).map((entry) => presentProjectDocument(entry.document)).filter((document) => options.includeHidden === true || !document.hiddenAt).toSorted(
        (left, right) => left.section.localeCompare(right.section) || left.position - right.position || left.createdAt - right.createdAt
      );
      return { documents };
    });
  }
  async getProjectDocument(id) {
    const entry = await this.documentStore.lookup(id.trim());
    if (!entry?.document) {
      throw new Error(`project document not found: ${id}`);
    }
    return presentProjectDocument(entry.document);
  }
  async createProjectDocument(input) {
    return await this.enqueueMutation(async () => {
      const boardId = normalizeBoardIdRequired(input.boardId);
      await this.assertProjectCanReceiveCards(boardId);
      await this.ensureProjectDirect(boardId);
      const key = normalizeDocumentKey(input.key);
      if (hasReservedAutomaticDocumentKeyPrefix(key)) {
        throw new Error("document key prefixes file. and ai. are reserved for automatic documents.");
      }
      const section = normalizeDocumentSection(input.section);
      const type = normalizeDocumentType(input.type);
      const title = normalizeTitle(input.title);
      const summary = normalizeBoundedString(input.summary, void 0, 1e3, "document summary");
      const body = normalizeDocumentBody(input, type);
      const entries = await this.documentStore.entries();
      if (entries.some(
        (entry) => entry.value?.version === 1 && entry.value.document.boardId === boardId && entry.value.document.key === key
      )) {
        throw new Error(`project document key already exists: ${key}`);
      }
      const sameSection = entries.map((entry) => entry.value).filter(
        (entry) => entry?.version === 1 && entry.document.boardId === boardId && entry.document.section === section
      );
      const now = Date.now();
      const document = {
        id: randomUUID9(),
        boardId,
        key,
        section,
        source: "project",
        type,
        title,
        position: input.position === void 0 ? Math.max(0, ...sameSection.map((entry) => entry.document.position)) + POSITION_STEP : normalizePosition(input.position, POSITION_STEP),
        createdAt: now,
        updatedAt: now,
        ...summary ? { summary } : {},
        ...body
      };
      await this.documentStore.register(document.id, { version: 1, document });
      return document;
    });
  }
  async updateProjectDocument(id, input) {
    return await this.enqueueMutation(async () => {
      const entry = await this.documentStore.lookup(id.trim());
      if (!entry?.document) {
        throw new Error(`project document not found: ${id}`);
      }
      const existing = entry.document;
      await this.assertProjectCanReceiveCards(existing.boardId);
      const type = normalizeDocumentType(input.type, existing.type);
      const title = input.title === void 0 ? existing.title : normalizeTitle(input.title);
      const summary = input.summary === void 0 ? existing.summary : normalizeBoundedString(input.summary, void 0, 1e3, "document summary");
      const body = normalizeDocumentBody(input, type, existing);
      const next = {
        ...existing,
        type,
        title,
        updatedAt: Date.now(),
        ...summary ? { summary } : {},
        ...body
      };
      if (!summary) {
        delete next.summary;
      }
      if (!body.target) {
        delete next.target;
      }
      if (!body.content) {
        delete next.content;
      }
      await this.documentStore.register(next.id, { version: 1, document: next });
      return next;
    });
  }
  async hideProjectDocument(id, hidden = true) {
    return await this.enqueueMutation(async () => {
      const entry = await this.documentStore.lookup(id.trim());
      if (!entry?.document) {
        throw new Error(`project document not found: ${id}`);
      }
      const next = {
        ...entry.document,
        updatedAt: Date.now(),
        ...hidden === false ? {} : { hiddenAt: Date.now() }
      };
      if (hidden === false) {
        delete next.hiddenAt;
      }
      await this.documentStore.register(next.id, { version: 1, document: next });
      return next;
    });
  }
  async deleteProjectDocument(id) {
    return await this.enqueueMutation(async () => {
      const entry = await this.documentStore.lookup(id.trim());
      if (!entry?.document) {
        return { deleted: false };
      }
      return { deleted: await this.documentStore.delete(entry.document.id) };
    });
  }
  async reorderProjectDocuments(input) {
    const boardId = normalizeBoardIdRequired(input.boardId);
    if (!Array.isArray(input.documentIds) || input.documentIds.length === 0 || input.documentIds.some((id) => typeof id !== "string")) {
      throw new Error("document ids are required.");
    }
    return await this.enqueueMutation(async () => {
      const ids = input.documentIds;
      if (new Set(ids).size !== ids.length) {
        throw new Error("document ids must not contain duplicates.");
      }
      const entries = await Promise.all(ids.map((id) => this.documentStore.lookup(id)));
      const documents = entries.map((entry, index) => {
        if (!entry?.document || entry.document.boardId !== boardId) {
          throw new Error(`project document does not belong to project: ${ids[index]}`);
        }
        return entry.document;
      });
      const section = documents[0]?.section;
      if (!section || documents.some((document) => document.section !== section)) {
        throw new Error("project documents can only be reordered within one section.");
      }
      const now = Date.now();
      const reordered = documents.map((document, index) => ({
        ...document,
        position: (index + 1) * POSITION_STEP,
        updatedAt: now
      }));
      for (const document of reordered) {
        await this.documentStore.register(document.id, { version: 1, document });
      }
      return { documents: reordered };
    });
  }
  async update(id, patch) {
    const raw = patch;
    if (Object.hasOwn(raw, "boardId") || Object.hasOwn(raw, "milestoneId") || Object.hasOwn(raw, "position")) {
      throw new Error("use the dedicated project or milestone move operation for card placement.");
    }
    return await super.update(id, patch);
  }
  async deleteBoard(id) {
    const boardId = normalizeBoardIdRequired(id);
    if ((await this.listMilestonesDirect(boardId)).length > 0 || (await this.documentStore.entries()).some(
      (entry) => entry.value?.version === 1 && entry.value.document.boardId === boardId
    )) {
      throw new Error("initialized projects cannot be permanently deleted.");
    }
    return await super.deleteBoard(boardId);
  }
  async createDirect(input, scope) {
    const parentId = normalizeOptionalString(input.createdByCardId) ?? (Array.isArray(input.parents) ? input.parents.find(
      (value) => typeof value === "string" && value.trim() !== ""
    ) : void 0);
    const parent = parentId ? await this.get(parentId) : void 0;
    const inheritedBoardId = parent ? cardBoardId(parent) : void 0;
    const boardId = normalizeBoardId(input.boardId, inheritedBoardId) ?? "default";
    const milestoneId = normalizeOptionalString(input.milestoneId) ?? parent?.milestoneId;
    await this.assertProjectCanReceiveCards(boardId);
    const board = await this.ensureBoardDirect(boardId);
    if (milestoneId) {
      const milestone = await this.milestoneStore.lookup(milestoneId);
      if (!milestone?.milestone || milestone.milestone.boardId !== boardId || milestone.milestone.state !== "active") {
        throw new Error("milestone must be an active milestone in the target project.");
      }
    }
    return await super.createDirect(
      {
        ...input,
        boardId,
        ...milestoneId ? { milestoneId } : {},
        ...!input.workspace && board.defaultWorkspace ? { workspace: board.defaultWorkspace } : {}
      },
      scope
    );
  }
};

// src/backend/src/store.ts
var FlowboardStore = class _FlowboardStore extends FlowboardProjectStore {
  async shouldAutoOrchestrate(card) {
    if (card.status !== "triage" || card.metadata?.archivedAt || card.metadata?.workerProtocol?.state === "idle") {
      return false;
    }
    const board = await this.boardStore.lookup(cardBoardId(card));
    return board?.version === 1 && board.board.orchestration?.autoDecompose === true;
  }
  async dispatch(input = Date.now()) {
    const now = typeof input === "number" ? input : normalizeTimestamp(input.now, Date.now());
    const boardId = typeof input === "number" ? void 0 : normalizeBoardId(input.boardId);
    return await this.enqueueMutation(async () => {
      const promoted = [];
      const reclaimed = [];
      const blocked = [];
      const orchestrated = [];
      const orchestratedByBoard = /* @__PURE__ */ new Map();
      for (const card of await this.list({ boardId })) {
        if (await this.isProjectArchived(cardBoardId(card))) {
          continue;
        }
        if (card.metadata?.archivedAt) {
          continue;
        }
        let latest = await this.promoteDependencyReady(card.id, now);
        const wasPromoted = latest.status !== card.status;
        const claim = latest.metadata?.claim;
        const latestAttempt = latestRunningAttempt(latest);
        const maxRuntimeSeconds = latest.metadata?.automation?.maxRuntimeSeconds;
        const runtimeStartedAt = latestAttempt?.startedAt ?? claim?.claimedAt ?? latest.startedAt;
        const timedOut = Boolean(maxRuntimeSeconds && runtimeStartedAt) && now - runtimeStartedAt > secondsToDurationMs(maxRuntimeSeconds);
        const claimExpired = isFlowboardClaimReclaimable(claim, now);
        const retriesExhausted = retryBudgetExhausted(latest);
        if (latest.status === "running" && (timedOut || claimExpired)) {
          const reason = timedOut ? "Run exceeded the card max runtime." : "Claim expired without a recent heartbeat.";
          const execution = latest.execution?.status === "running" ? { ...latest.execution, status: "blocked", updatedAt: now } : latest.execution;
          latest = await this.updateCard(latest.id, {
            status: "blocked",
            ...execution ? { execution } : {},
            metadata: {
              ...latest.metadata,
              claim: void 0,
              attempts: closeRunningAttempts(latest.metadata?.attempts, now, "blocked", reason),
              failureCount: (latest.metadata?.failureCount ?? 0) + 1,
              notifications: [
                ...latest.metadata?.notifications ?? [],
                {
                  id: randomUUID10(),
                  kind: "failed",
                  createdAt: now,
                  sequence: this.nextNotificationSequence(now),
                  message: reason
                }
              ].slice(-MAX_CARD_NOTIFICATIONS)
            }
          });
          blocked.push(latest);
        } else if (claimExpired) {
          latest = await this.updateCard(latest.id, {
            metadata: { ...latest.metadata, claim: void 0 }
          });
          reclaimed.push(latest);
        }
        if (!latest.metadata?.claim && retriesExhausted && isDependencyPromotableStatus(latest.status)) {
          latest = await this.updateCard(latest.id, {
            status: "blocked",
            metadata: {
              ...latest.metadata,
              notifications: [
                ...latest.metadata?.notifications ?? [],
                {
                  id: randomUUID10(),
                  kind: "failed",
                  createdAt: now,
                  sequence: this.nextNotificationSequence(now),
                  message: "Card exhausted its retry budget."
                }
              ].slice(-MAX_CARD_NOTIFICATIONS)
            }
          });
          blocked.push(latest);
        }
        if (latest.status === "ready" && !latest.metadata?.archivedAt) {
          latest = await this.recordDispatch(latest, now);
        }
        if (await this.shouldAutoOrchestrate(latest)) {
          const latestBoardId = cardBoardId(latest);
          const board = await this.boardStore.lookup(latestBoardId);
          const cap = board?.board.orchestration?.autoDecomposePerDispatch ?? 3;
          const boardCount = orchestratedByBoard.get(latestBoardId) ?? 0;
          if (boardCount < cap) {
            latest = await this.recordOrchestrationCandidate(latest, now);
            orchestrated.push(latest);
            orchestratedByBoard.set(latestBoardId, boardCount + 1);
          }
        }
        if (wasPromoted && latest.status !== "blocked") {
          promoted.push(latest);
        }
      }
      return {
        promoted,
        reclaimed,
        blocked,
        orchestrated,
        count: promoted.length + reclaimed.length + blocked.length + orchestrated.length
      };
    });
  }
  async bulkUpdate(input) {
    const ids = Array.isArray(input.ids) ? input.ids.filter((id) => typeof id === "string" && id.trim() !== "") : [];
    if (ids.length === 0) {
      throw new Error("ids are required.");
    }
    const patch = input.patch && typeof input.patch === "object" && !Array.isArray(input.patch) ? input.patch : {};
    const cards = [];
    for (const id of ids) {
      const updated = input.archived === void 0 ? await this.update(id, patch) : await this.archive(id, input.archived);
      cards.push(updated);
    }
    return { cards };
  }
  async archive(id, archived) {
    const shouldArchive = archived !== false;
    return await this.updateMetadata(id, (existing) => ({
      ...existing.metadata,
      archivedAt: shouldArchive ? Date.now() : 0
    }));
  }
  async exportCards() {
    const cards = await this.list();
    const attachments = cards.flatMap((card) => card.metadata?.attachments ?? []);
    return { cards, attachments, exportedAt: Date.now() };
  }
  async diagnostics(now = Date.now()) {
    const cards = await this.list();
    const rows = cards.flatMap((card) => {
      const diagnostics = computeCardDiagnostics(card, now);
      return diagnostics.length ? [{ card, diagnostics }] : [];
    });
    return {
      diagnostics: rows,
      count: rows.reduce((total, row) => total + row.diagnostics.length, 0)
    };
  }
  async refreshDiagnostics(now = Date.now()) {
    return await this.enqueueMutation(async () => {
      const cards = await this.list();
      const rows = [];
      for (const card of cards) {
        const latest = await this.get(card.id);
        if (!latest || latest.metadata?.archivedAt) {
          continue;
        }
        const diagnostics = mergeDiagnostics(
          latest.metadata?.diagnostics,
          computeCardDiagnostics(latest, now)
        );
        if (diagnostics.length === 0 && !latest.metadata?.diagnostics?.length) {
          continue;
        }
        const metadata = trimMetadataToBudget({ ...latest.metadata, diagnostics });
        const next = removeUndefinedCardFields({
          ...latest,
          metadata: metadataIsEmpty(metadata) ? void 0 : metadata
        });
        await this.store.register(next.id, { version: 1, card: next });
        if (diagnostics.length > 0) {
          rows.push({ card: next, diagnostics });
        }
      }
      return {
        diagnostics: rows,
        count: rows.reduce((total, row) => total + row.diagnostics.length, 0)
      };
    });
  }
  async buildWorkerContext(id) {
    const card = await this.get(id);
    if (!card) {
      throw new Error(`card not found: ${id}`);
    }
    return buildWorkerContext(card, await this.list());
  }
  static open(openKeyedStore) {
    return new _FlowboardStore(
      openKeyedStore({
        namespace: "flowboard.cards",
        maxEntries: MAX_CARDS
      }),
      {
        boards: openKeyedStore({
          namespace: "flowboard.boards",
          maxEntries: 200
        }),
        milestones: openKeyedStore({
          namespace: "flowboard.milestones",
          maxEntries: 2e3
        }),
        documents: openKeyedStore({
          namespace: "flowboard.project-documents",
          maxEntries: 4e3
        }),
        subscriptions: openKeyedStore({
          namespace: "flowboard.notify",
          maxEntries: 2e3
        }),
        attachments: openKeyedStore({
          namespace: "flowboard.attachments",
          maxEntries: MAX_ATTACHMENT_ENTRIES
        })
      }
    );
  }
  static openSqlite() {
    const stores = createFlowboardSqliteStores();
    return new _FlowboardStore(stores.cards, {
      boards: stores.boards,
      milestones: stores.milestones,
      documents: stores.documents,
      subscriptions: stores.subscriptions,
      attachments: stores.attachments,
      dataVersion: stores.dataVersion
    });
  }
};

// src/backend/src/gateway.ts
var READ_SCOPE2 = "operator.read";
var WRITE_SCOPE3 = "operator.write";
var CHANGE_WAIT_MAX_MS = 3e4;
var CHANGE_WAIT_DEFAULT_MS = 25e3;
function readChangeCursor(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return void 0;
  }
  const epoch = value.epoch;
  const revision = value.revision;
  if (typeof epoch !== "string" || !epoch || epoch.length > 128 || typeof revision !== "number" || !Number.isSafeInteger(revision) || revision <= 0) {
    throw new Error("after must be a valid flowboard change cursor.");
  }
  return { epoch, revision };
}
function readChangeWaitTimeout(value) {
  if (value === void 0) {
    return CHANGE_WAIT_DEFAULT_MS;
  }
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1 || value > CHANGE_WAIT_MAX_MS) {
    throw new Error(`timeoutMs must be an integer from 1 to ${CHANGE_WAIT_MAX_MS}.`);
  }
  return value;
}
function redactDiagnosticsRows(result) {
  return {
    ...result,
    diagnostics: result.diagnostics.map((row) => ({
      ...row,
      card: redactClaimToken(row.card)
    }))
  };
}
function registerFlowboardGatewayMethods(params) {
  const { api } = params;
  const store = params.store ?? FlowboardStore.openSqlite();
  const dispatchCards = createFlowboardDispatchHandler({
    api,
    store,
    redactCard: redactClaimToken
  });
  const sandbox = api.runtime.sandbox;
  const executionOptions = (request) => {
    const config = request.context.getRuntimeConfig();
    return {
      runtime: api.runtime,
      workspaceAccess: resolveGatewayFlowboardWorkspaceAccess({
        context: request.context,
        client: request.client
      }),
      defaultAgentId: resolveDefaultAgentId2(config),
      resolveAgentWorkspaceRuntime: (agentId, sessionKey, workspaceDir, modelProvider, modelId) => resolveAgentFlowboardWorkspaceRuntime({
        config,
        agentId,
        sessionKey,
        workspaceDir,
        modelProvider,
        modelId,
        prepareSandboxWorkspaceAuthority: sandbox?.prepareWorkspaceAuthority
      })
    };
  };
  api.registerGatewayMethod(
    "flowboard.cards.list",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, await listFlowboardCards(store, requestParams.boardId, redactClaimToken));
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: READ_SCOPE2 }
  );
  api.registerGatewayMethod(
    "flowboard.cards.execution.prepare",
    async (request) => {
      try {
        request.respond(
          true,
          await prepareFlowboardCardExecution({
            store,
            id: request.params.id,
            options: executionOptions(request)
          })
        );
      } catch (error) {
        respondError(request.respond, error);
      }
    },
    { scope: READ_SCOPE2 }
  );
  api.registerGatewayMethod(
    "flowboard.cards.execution.inspect",
    async (request) => {
      try {
        const result = await inspectFlowboardCardExecution({
          store,
          id: request.params.id,
          runtime: api.runtime
        });
        request.respond(true, { ...result, card: redactClaimToken(result.card) });
      } catch (error) {
        respondError(request.respond, error);
      }
    },
    { scope: READ_SCOPE2 }
  );
  api.registerGatewayMethod(
    "flowboard.cards.execution.start",
    async (request) => {
      try {
        const result = await startFlowboardCardExecution({
          store,
          id: request.params.id,
          expectedUpdatedAt: request.params.expectedUpdatedAt,
          options: executionOptions(request)
        });
        request.respond(true, { ...result, card: redactClaimToken(result.card) });
      } catch (error) {
        respondError(request.respond, error);
      }
    },
    { scope: WRITE_SCOPE3 }
  );
  api.registerGatewayMethod(
    "flowboard.cards.execution.steer",
    async (request) => {
      try {
        const result = await steerFlowboardCardExecution({
          store,
          id: request.params.id,
          nextRunId: request.params.nextRunId,
          runtime: api.runtime
        });
        request.respond(true, { ...result, card: redactClaimToken(result.card) });
      } catch (error) {
        respondError(request.respond, error);
      }
    },
    { scope: WRITE_SCOPE3 }
  );
  api.registerGatewayMethod(
    "flowboard.cards.execution.abort",
    async (request) => {
      try {
        const result = await abortFlowboardCardExecution({
          store,
          id: request.params.id,
          reason: request.params.reason,
          expectedRunId: request.params.expectedRunId
        });
        request.respond(true, { ...result, card: redactClaimToken(result.card) });
      } catch (error) {
        respondError(request.respond, error);
      }
    },
    { scope: WRITE_SCOPE3 }
  );
  api.registerGatewayMethod(
    "flowboard.cards.execution.reconcile",
    async (request) => {
      try {
        const result = await reconcileFlowboardCardExecution({
          store,
          id: request.params.id,
          expectedRunId: request.params.expectedRunId,
          outcome: request.params.outcome,
          endedAt: request.params.endedAt,
          reason: request.params.reason
        });
        request.respond(true, { ...result, card: redactClaimToken(result.card) });
      } catch (error) {
        respondError(request.respond, error);
      }
    },
    { scope: WRITE_SCOPE3 }
  );
  api.registerGatewayMethod(
    "flowboard.changes.wait",
    async ({ params: requestParams, respond }) => {
      try {
        respond(
          true,
          await store.waitForChange(
            readChangeCursor(requestParams.after),
            readChangeWaitTimeout(requestParams.timeoutMs)
          )
        );
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: READ_SCOPE2 }
  );
  registerFlowboardWorkspaceCardMethods({ api, store, redactCard: redactClaimToken });
  registerFlowboardProjectGatewayMethods({ api, store, redactCard: redactClaimToken });
  api.registerGatewayMethod(
    "flowboard.cards.move",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, {
          card: redactClaimToken(
            await store.move(readId(requestParams), requestParams.status, requestParams.position)
          )
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE3 }
  );
  api.registerGatewayMethod(
    "flowboard.cards.delete",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, await store.delete(readId(requestParams)));
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE3 }
  );
  api.registerGatewayMethod(
    "flowboard.cards.comment",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, {
          card: redactClaimToken(await store.addComment(readId(requestParams), requestParams))
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE3 }
  );
  api.registerGatewayMethod(
    "flowboard.cards.link",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, {
          card: redactClaimToken(await store.addLink(readId(requestParams), requestParams))
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE3 }
  );
  api.registerGatewayMethod(
    "flowboard.cards.linkDependency",
    async ({ params: requestParams, respond }) => {
      try {
        const parentId = requestParams.parentId;
        const childId = requestParams.childId;
        if (typeof parentId !== "string" || typeof childId !== "string") {
          throw new Error("parentId and childId are required.");
        }
        respond(true, {
          card: redactClaimToken(await store.linkCards(parentId, childId))
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE3 }
  );
  api.registerGatewayMethod(
    "flowboard.cards.proof",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, {
          card: redactClaimToken(await store.addProof(readId(requestParams), requestParams))
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE3 }
  );
  api.registerGatewayMethod(
    "flowboard.cards.artifact",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, {
          card: redactClaimToken(await store.addArtifact(readId(requestParams), requestParams))
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE3 }
  );
  api.registerGatewayMethod(
    "flowboard.cards.proof.delete",
    async ({ params: requestParams, respond }) => {
      try {
        const proofId = requestParams.proofId;
        if (typeof proofId !== "string" || !proofId.trim()) {
          throw new Error("proofId is required.");
        }
        respond(true, {
          card: redactClaimToken(await store.deleteProof(readId(requestParams), proofId.trim()))
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE3 }
  );
  api.registerGatewayMethod(
    "flowboard.cards.artifact.delete",
    async ({ params: requestParams, respond }) => {
      try {
        const artifactId = requestParams.artifactId;
        if (typeof artifactId !== "string" || !artifactId.trim()) {
          throw new Error("artifactId is required.");
        }
        respond(true, {
          card: redactClaimToken(await store.deleteArtifact(readId(requestParams), artifactId.trim()))
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE3 }
  );
  api.registerGatewayMethod(
    "flowboard.cards.claim",
    async ({ params: requestParams, respond }) => {
      try {
        const claimed = await store.claim(readId(requestParams), requestParams);
        respond(true, { ...claimed, card: redactClaimToken(claimed.card) });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE3 }
  );
  api.registerGatewayMethod(
    "flowboard.cards.heartbeat",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, {
          card: redactClaimToken(await store.heartbeat(readId(requestParams), requestParams))
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE3 }
  );
  api.registerGatewayMethod(
    "flowboard.cards.release",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, {
          card: redactClaimToken(await store.releaseClaim(readId(requestParams), requestParams))
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE3 }
  );
  api.registerGatewayMethod(
    "flowboard.cards.promote",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, {
          card: redactClaimToken(await store.promote(readId(requestParams), requestParams, null))
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE3 }
  );
  api.registerGatewayMethod(
    "flowboard.cards.reassign",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, {
          card: redactClaimToken(await store.reassign(readId(requestParams), requestParams, null))
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE3 }
  );
  api.registerGatewayMethod(
    "flowboard.cards.reclaim",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, {
          card: redactClaimToken(await store.reclaim(readId(requestParams), requestParams, null))
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE3 }
  );
  api.registerGatewayMethod(
    "flowboard.cards.complete",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, {
          card: redactClaimToken(await store.complete(readId(requestParams), requestParams, null))
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE3 }
  );
  api.registerGatewayMethod(
    "flowboard.cards.block",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, {
          card: redactClaimToken(await store.block(readId(requestParams), requestParams, null))
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE3 }
  );
  api.registerGatewayMethod(
    "flowboard.cards.unblock",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, {
          card: redactClaimToken(await store.unblock(readId(requestParams)))
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE3 }
  );
  registerFlowboardWorkspaceBulkMethod({ api, store, redactCard: redactClaimToken });
  api.registerGatewayMethod(
    "flowboard.cards.diagnostics",
    async ({ respond }) => {
      try {
        respond(true, redactDiagnosticsRows(await store.diagnostics()));
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: READ_SCOPE2 }
  );
  api.registerGatewayMethod(
    "flowboard.cards.diagnostics.refresh",
    async ({ respond }) => {
      try {
        respond(true, redactDiagnosticsRows(await store.refreshDiagnostics()));
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE3 }
  );
  api.registerGatewayMethod(
    "flowboard.cards.dispatch",
    async (context) => await dispatchCards(context, { supportsMaxStarts: false }),
    { scope: WRITE_SCOPE3 }
  );
  api.registerGatewayMethod(
    "flowboard.cards.dispatchWithOptions",
    async (context) => await dispatchCards(context, { supportsMaxStarts: true }),
    { scope: WRITE_SCOPE3 }
  );
  api.registerGatewayMethod(
    "flowboard.boards.list",
    async ({ respond }) => {
      try {
        respond(true, await store.listBoards());
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: READ_SCOPE2 }
  );
  registerFlowboardWorkspaceBoardMethod({ api, store, redactCard: redactClaimToken });
  api.registerGatewayMethod(
    "flowboard.boards.archive",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, {
          board: await store.archiveBoard(requestParams.id, requestParams.archived)
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE3 }
  );
  api.registerGatewayMethod(
    "flowboard.boards.delete",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, await store.deleteBoard(requestParams.id));
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE3 }
  );
  api.registerGatewayMethod(
    "flowboard.cards.stats",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, await store.stats({ boardId: requestParams.boardId }));
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: READ_SCOPE2 }
  );
  api.registerGatewayMethod(
    "flowboard.cards.runs",
    async ({ params: requestParams, respond }) => {
      try {
        const result = await store.runs(readId(requestParams));
        respond(true, { ...result, card: redactClaimToken(result.card) });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: READ_SCOPE2 }
  );
  registerFlowboardWorkspaceWorkflowMethods({ api, store, redactCard: redactClaimToken });
  api.registerGatewayMethod(
    "flowboard.notifications.subscribe",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, { subscription: await store.subscribeNotifications(requestParams) });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE3 }
  );
  api.registerGatewayMethod(
    "flowboard.notifications.list",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, await store.listNotificationSubscriptions(requestParams));
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: READ_SCOPE2 }
  );
  api.registerGatewayMethod(
    "flowboard.notifications.delete",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, await store.deleteNotificationSubscription(readId(requestParams)));
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE3 }
  );
  api.registerGatewayMethod(
    "flowboard.notifications.events",
    async ({ params: requestParams, respond }) => {
      try {
        assertNoCursorAdvance(requestParams);
        respond(true, await store.notificationEvents(requestParams));
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: READ_SCOPE2 }
  );
  api.registerGatewayMethod(
    "flowboard.notifications.advance",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, await store.advanceNotificationEvents(requestParams));
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE3 }
  );
  api.registerGatewayMethod(
    "flowboard.cards.attachments.list",
    async ({ params: requestParams, respond }) => {
      try {
        const result = await store.listAttachments(readId(requestParams));
        respond(true, { ...result, card: redactClaimToken(result.card) });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: READ_SCOPE2 }
  );
  api.registerGatewayMethod(
    "flowboard.cards.attachments.get",
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
    { scope: READ_SCOPE2 }
  );
  api.registerGatewayMethod(
    "flowboard.cards.attachments.add",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, {
          card: redactClaimToken(await store.addAttachment(readId(requestParams), requestParams))
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE3 }
  );
  api.registerGatewayMethod(
    "flowboard.cards.attachments.delete",
    async ({ params: requestParams, respond }) => {
      try {
        const attachmentId = requestParams.attachmentId;
        if (typeof attachmentId !== "string" || !attachmentId.trim()) {
          throw new Error("attachmentId is required.");
        }
        respond(true, {
          card: redactClaimToken(
            await store.deleteAttachment(readId(requestParams), attachmentId.trim())
          )
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE3 }
  );
  api.registerGatewayMethod(
    "flowboard.cards.workerLog",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, {
          card: redactClaimToken(await store.addWorkerLog(readId(requestParams), requestParams))
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE3 }
  );
  api.registerGatewayMethod(
    "flowboard.cards.protocolViolation",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, {
          card: redactClaimToken(
            await store.recordProtocolViolation(readId(requestParams), requestParams)
          )
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE3 }
  );
  api.registerGatewayMethod(
    "flowboard.cards.archive",
    async ({ params: requestParams, respond }) => {
      try {
        respond(true, {
          card: redactClaimToken(
            await store.archive(readId(requestParams), requestParams.archived)
          )
        });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: WRITE_SCOPE3 }
  );
  api.registerGatewayMethod(
    "flowboard.cards.export",
    async ({ respond }) => {
      try {
        const exported = await store.exportCards();
        respond(true, { ...exported, cards: exported.cards.map(redactClaimToken) });
      } catch (error) {
        respondError(respond, error);
      }
    },
    { scope: READ_SCOPE2 }
  );
}

// src/backend/src/change-events.ts
var FLOWBOARD_EXTERNAL_CHANGE_CHECK_MS = 1e3;
function createFlowboardChangeEventService(store) {
  let unsubscribe;
  let timer;
  return {
    id: "flowboard-change-events",
    start(ctx) {
      if (unsubscribe) {
        return;
      }
      unsubscribe = store.subscribeChanges((_change) => void 0);
      store.announceChangeEpoch();
      timer = setInterval(() => {
        try {
          store.reconcileExternalChanges();
        } catch (error) {
          ctx.logger.warn(`flowboard external change check failed: ${String(error)}`);
        }
      }, FLOWBOARD_EXTERNAL_CHANGE_CHECK_MS);
      timer.unref?.();
    },
    stop() {
      unsubscribe?.();
      unsubscribe = void 0;
      if (timer) {
        clearInterval(timer);
        timer = void 0;
      }
    }
  };
}

// src/backend/src/command.ts
init_contract();
init_card_lookup();
var ADMIN_SCOPE = "operator.admin";
var WRITE_SCOPE4 = "operator.write";
function splitArgs(input) {
  return (input ?? "").trim().split(/\s+/).filter(Boolean);
}
function formatCardLine(card) {
  const boardId = card.metadata?.automation?.boardId ?? "default";
  const milestone = card.milestoneId ? `/${card.milestoneId.slice(0, 8)}` : "/unassigned";
  const agent = card.agentId ? ` @${card.agentId}` : "";
  return `${card.id.slice(0, 8)} ${card.status.padEnd(8)} ${card.priority.padEnd(6)} [${boardId}${milestone}]${agent} ${card.title}`;
}
function formatCardDetails(card) {
  const lines = [
    card.title,
    `id: ${card.id}`,
    `status: ${card.status}`,
    `priority: ${card.priority}`,
    `board: ${card.metadata?.automation?.boardId ?? "default"}`,
    `milestone: ${card.milestoneId ?? "unassigned"}`
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
function normalizeTitle2(tokens) {
  return tokens.join(" ").trim();
}
function optionValue(tokens, flag) {
  const index = tokens.indexOf(flag);
  return index >= 0 ? tokens[index + 1] : void 0;
}
function withoutOption(tokens, flag) {
  const index = tokens.indexOf(flag);
  return index >= 0 ? [...tokens.slice(0, index), ...tokens.slice(index + 2)] : tokens;
}
function isFlowboardStatus(value) {
  return FLOWBOARD_STATUSES.includes(value);
}
function canMutateFlowboard(params) {
  const scopes = params.gatewayClientScopes;
  if (scopes) {
    return scopes.includes(ADMIN_SCOPE) || scopes.includes(WRITE_SCOPE4);
  }
  return params.senderIsOwner === true;
}
function requireWriteAccess(params) {
  if (canMutateFlowboard(params)) {
    return void 0;
  }
  return {
    text: `This command requires gateway scope: ${WRITE_SCOPE4}.`,
    isError: true
  };
}
async function handleFlowboardCommand(params) {
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
        "/flowboard dispatch"
      ].join("\n")
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
    const title = normalizeTitle2(withoutOption(withoutOption(rest, "--board"), "--milestone"));
    if (!title) {
      return { text: "Usage: /flowboard create <title>", isError: true };
    }
    const workspaceAccess = await canonicalizeFlowboardWorkspaceAccess(
      params.workspaceAccess ?? { unrestricted: true }
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
        text: projects.projects.length ? projects.projects.map((project) => `${project.id} ${project.name ?? project.id}`).join("\n") : "No Flowboard projects."
      };
    }
    if (projectAction === "create") {
      const id = projectArgs[0];
      const milestoneTitle = optionValue(projectArgs, "--milestone");
      const name = normalizeTitle2(withoutOption(projectArgs.slice(1), "--milestone"));
      if (!id || !name || !milestoneTitle) {
        return {
          text: "Usage: /flowboard project create <id> <name> --milestone <title>",
          isError: true
        };
      }
      const project = await params.store.createProject({
        id,
        name,
        initialMilestoneTitle: milestoneTitle
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
            isError: true
          };
        }
        const { card, error } = resolveFlowboardCardByIdOrPrefix(
          await params.store.list(),
          cardId
        );
        if (!card) {
          return { text: error, isError: true };
        }
        return {
          text: formatCardLine(
            await params.store.moveMilestone(card.id, {
              milestoneId: milestoneId === "unassigned" ? void 0 : milestoneId
            })
          )
        };
      }
      return {
        text: "Usage: /flowboard project milestone move-card <card-id> --milestone <id|unassigned>",
        isError: true
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
    const status = statusIndex >= 0 ? rest[statusIndex + 1] : void 0;
    if (!id || !status) {
      return {
        text: "Usage: /flowboard move <card-id> --status <status>",
        isError: true
      };
    }
    if (!isFlowboardStatus(status)) {
      return {
        text: `status must be one of: ${FLOWBOARD_STATUSES.join(", ")}.`,
        isError: true
      };
    }
    const cards = await params.store.list();
    const { card, error } = resolveFlowboardCardByIdOrPrefix(cards, id);
    if (!card) {
      return { text: error, isError: true };
    }
    return { text: formatCardLine(await params.store.move(card.id, status, void 0)) };
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
        workspaceAccess
      }
    });
    return {
      text: [
        `dispatch: started=${result.started.length} failures=${result.startFailures.length} promoted=${result.promoted.length} blocked=${result.blocked.length}`,
        ...result.started.map((run) => `started ${run.cardId.slice(0, 8)} run=${run.runId}`),
        ...result.startFailures.map(
          (failure) => `failed ${failure.cardId.slice(0, 8)} ${failure.error}`
        )
      ].join("\n")
    };
  }
  return { text: `Unknown Flowboard action: ${action}`, isError: true };
}
function registerFlowboardCommand(params) {
  const sandbox = params.api.runtime.sandbox;
  params.api.registerCommand({
    name: "flowboard",
    description: "List, create, inspect, and dispatch Flowboard cards.",
    acceptsArgs: true,
    exposeSenderIsOwner: true,
    handler: async (ctx) => await handleFlowboardCommand({
      api: params.api,
      store: params.store,
      args: ctx.args,
      senderIsOwner: ctx.senderIsOwner,
      gatewayClientScopes: ctx.gatewayClientScopes,
      resolveAgentWorkspace: (agentId) => resolveFlowboardAgentWorkspace(ctx.config, agentId),
      resolveAgentWorkspaceRuntime: (agentId, sessionKey, workspaceDir, modelProvider, modelId) => resolveAgentFlowboardWorkspaceRuntime({
        config: ctx.config,
        agentId,
        sessionKey,
        workspaceDir,
        modelProvider,
        modelId,
        prepareSandboxWorkspaceAuthority: sandbox?.prepareWorkspaceAuthority
      }),
      workspaceAccess: resolveCommandFlowboardWorkspaceAccess({
        config: ctx.config,
        agentId: ctx.agentId,
        sessionKey: ctx.sessionKey,
        gatewayClientScopes: ctx.gatewayClientScopes,
        resolveSandboxWorkspaceAuthority: sandbox?.resolveWorkspaceAuthority
      })
    })
  });
}

// src/backend/src/tools.ts
import { jsonResult, readStringParam } from "openclaw/plugin-sdk/core";
import { safeEqualSecret as safeEqualSecret3 } from "openclaw/plugin-sdk/security-runtime";

// node_modules/typebox/build/system/memory/memory.mjs
var memory_exports = {};
__export(memory_exports, {
  Assign: () => Assign,
  Clone: () => Clone,
  Create: () => Create,
  Discard: () => Discard,
  Metrics: () => Metrics,
  Update: () => Update
});

// node_modules/typebox/build/system/memory/metrics.mjs
var Metrics = {
  assign: 0,
  create: 0,
  clone: 0,
  discard: 0,
  update: 0
};

// node_modules/typebox/build/system/memory/assign.mjs
function Assign(left, right) {
  Metrics.assign += 1;
  return { ...left, ...right };
}

// node_modules/typebox/build/guard/guard.mjs
var guard_exports = {};
__export(guard_exports, {
  Entries: () => Entries,
  EntriesRegExp: () => EntriesRegExp,
  Every: () => Every,
  EveryAll: () => EveryAll,
  GraphemeCount: () => GraphemeCount2,
  HasPropertyKey: () => HasPropertyKey,
  IsArray: () => IsArray,
  IsBigInt: () => IsBigInt,
  IsBoolean: () => IsBoolean,
  IsClassInstance: () => IsClassInstance,
  IsConstructor: () => IsConstructor,
  IsDeepEqual: () => IsDeepEqual,
  IsEqual: () => IsEqual,
  IsFunction: () => IsFunction,
  IsGreaterEqualThan: () => IsGreaterEqualThan,
  IsGreaterThan: () => IsGreaterThan,
  IsInteger: () => IsInteger,
  IsLessEqualThan: () => IsLessEqualThan,
  IsLessThan: () => IsLessThan,
  IsMaxLength: () => IsMaxLength2,
  IsMinLength: () => IsMinLength2,
  IsMultipleOf: () => IsMultipleOf,
  IsNull: () => IsNull,
  IsNumber: () => IsNumber,
  IsObject: () => IsObject,
  IsObjectNotArray: () => IsObjectNotArray,
  IsString: () => IsString,
  IsSymbol: () => IsSymbol,
  IsUndefined: () => IsUndefined,
  IsUnsafePropertyKey: () => IsUnsafePropertyKey,
  IsValueLike: () => IsValueLike,
  Keys: () => Keys,
  ShiftLeft: () => ShiftLeft,
  Symbols: () => Symbols,
  Values: () => Values
});

// node_modules/typebox/build/guard/string.mjs
function IsBetween(value, min, max) {
  return value >= min && value <= max;
}
function IsZeroWidthJoiner(value) {
  return value === 8205;
}
function IsHighSurrogate(value) {
  return IsBetween(value, 55296, 56319);
}
function IsRegionalIndicator(value) {
  return IsBetween(value, 127462, 127487);
}
function IsVariationSelector(value) {
  return IsBetween(value, 65024, 65039);
}
function IsCombiningMark(value) {
  return IsBetween(value, 768, 879) || IsBetween(value, 6832, 6911) || IsBetween(value, 7616, 7679) || IsBetween(value, 65056, 65071);
}
function CodePointLength(value) {
  return value > 65535 ? 2 : 1;
}
function ConsumeModifiers(value, index) {
  while (index < value.length) {
    const point = value.codePointAt(index);
    if (IsCombiningMark(point) || IsVariationSelector(point)) {
      index += CodePointLength(point);
    } else {
      break;
    }
  }
  return index;
}
function NextGraphemeClusterIndex(value, clusterStart) {
  const startCP = value.codePointAt(clusterStart);
  let clusterEnd = clusterStart + CodePointLength(startCP);
  clusterEnd = ConsumeModifiers(value, clusterEnd);
  while (clusterEnd < value.length - 1 && value[clusterEnd] === "\u200D") {
    const nextCP = value.codePointAt(clusterEnd + 1);
    clusterEnd += 1 + CodePointLength(nextCP);
    clusterEnd = ConsumeModifiers(value, clusterEnd);
  }
  if (IsRegionalIndicator(startCP) && clusterEnd < value.length && IsRegionalIndicator(value.codePointAt(clusterEnd))) {
    clusterEnd += CodePointLength(value.codePointAt(clusterEnd));
  }
  return clusterEnd;
}
function IsGraphemeCodePoint(value) {
  return IsHighSurrogate(value) || IsCombiningMark(value) || IsVariationSelector(value) || IsZeroWidthJoiner(value);
}
function GraphemeCount(value) {
  let count = 0;
  let index = 0;
  while (index < value.length) {
    index = NextGraphemeClusterIndex(value, index);
    count++;
  }
  return count;
}
function IsMinLength(value, minLength) {
  if (minLength === 0)
    return true;
  let count = 0;
  let index = 0;
  while (index < value.length) {
    index = NextGraphemeClusterIndex(value, index);
    count++;
    if (count >= minLength)
      return true;
  }
  return false;
}
function IsMaxLength(value, maxLength) {
  let count = 0;
  let index = 0;
  while (index < value.length) {
    index = NextGraphemeClusterIndex(value, index);
    count++;
    if (count > maxLength)
      return false;
  }
  return true;
}
function IsMinLengthFast(value, minLength) {
  if (minLength === 0)
    return true;
  let index = 0;
  while (index < value.length) {
    if (IsGraphemeCodePoint(value.charCodeAt(index))) {
      return IsMinLength(value, minLength);
    }
    index++;
    if (index >= minLength)
      return true;
  }
  return false;
}
function IsMaxLengthFast(value, maxLength) {
  let index = 0;
  while (index < value.length) {
    if (IsGraphemeCodePoint(value.charCodeAt(index))) {
      return IsMaxLength(value, maxLength);
    }
    index++;
    if (index > maxLength)
      return false;
  }
  return true;
}

// node_modules/typebox/build/guard/guard.mjs
function IsArray(value) {
  return Array.isArray(value);
}
function IsBigInt(value) {
  return IsEqual(typeof value, "bigint");
}
function IsBoolean(value) {
  return IsEqual(typeof value, "boolean");
}
function IsConstructor(value) {
  if (IsUndefined(value) || !IsFunction(value))
    return false;
  const result = Function.prototype.toString.call(value);
  if (/^class\s/.test(result))
    return true;
  if (/\[native code\]/.test(result))
    return true;
  return false;
}
function IsFunction(value) {
  return IsEqual(typeof value, "function");
}
function IsInteger(value) {
  return Number.isInteger(value);
}
function IsNull(value) {
  return IsEqual(value, null);
}
function IsNumber(value) {
  return Number.isFinite(value);
}
function IsObjectNotArray(value) {
  return IsObject(value) && !IsArray(value);
}
function IsObject(value) {
  return IsEqual(typeof value, "object") && !IsNull(value);
}
function IsString(value) {
  return IsEqual(typeof value, "string");
}
function IsSymbol(value) {
  return IsEqual(typeof value, "symbol");
}
function IsUndefined(value) {
  return IsEqual(value, void 0);
}
function IsEqual(left, right) {
  return left === right;
}
function IsGreaterThan(left, right) {
  return left > right;
}
function IsLessThan(left, right) {
  return left < right;
}
function IsLessEqualThan(left, right) {
  return left <= right;
}
function IsGreaterEqualThan(left, right) {
  return left >= right;
}
function IsMultipleOf(dividend, divisor) {
  if (IsBigInt(dividend) || IsBigInt(divisor)) {
    return BigInt(dividend) % BigInt(divisor) === 0n;
  }
  const tolerance = 1e-10;
  if (!IsNumber(dividend))
    return true;
  if (IsInteger(dividend) && 1 / divisor % 1 === 0)
    return true;
  const mod = dividend % divisor;
  return Math.min(Math.abs(mod), Math.abs(mod - divisor), Math.abs(mod + divisor)) < tolerance;
}
function IsClassInstance(value) {
  if (!IsObject(value))
    return false;
  const proto = globalThis.Object.getPrototypeOf(value);
  if (IsNull(proto))
    return false;
  return IsEqual(typeof proto.constructor, "function") && !(IsEqual(proto.constructor, globalThis.Object) || IsEqual(proto.constructor.name, "Object"));
}
function IsValueLike(value) {
  return IsBigInt(value) || IsBoolean(value) || IsNull(value) || IsNumber(value) || IsString(value) || IsUndefined(value);
}
function GraphemeCount2(value) {
  return GraphemeCount(value);
}
function IsMaxLength2(value, length) {
  return IsMaxLengthFast(value, length);
}
function IsMinLength2(value, length) {
  return IsMinLengthFast(value, length);
}
function Every(value, offset, callback) {
  for (let index = offset; index < value.length; index++) {
    if (!callback(value[index], index))
      return false;
  }
  return true;
}
function EveryAll(value, offset, callback) {
  let result = true;
  for (let index = offset; index < value.length; index++) {
    if (!callback(value[index], index))
      result = false;
  }
  return result;
}
function ShiftLeft(array, true_, false_) {
  return IsEqual(array.length, 0) ? false_() : true_(array[0], array.slice(1));
}
function IsUnsafePropertyKey(key) {
  return IsEqual(key, "__proto__") || IsEqual(key, "constructor") || IsEqual(key, "prototype");
}
function HasPropertyKey(value, key) {
  return IsUnsafePropertyKey(key) ? Object.prototype.hasOwnProperty.call(value, key) : key in value;
}
function EntriesRegExp(value) {
  return Keys(value).map((key) => [new RegExp(`^${key}$`), value[key]]);
}
function Entries(value) {
  return Object.entries(value);
}
function Keys(value) {
  return Object.getOwnPropertyNames(value);
}
function Symbols(value) {
  return Object.getOwnPropertySymbols(value);
}
function Values(value) {
  return Object.values(value);
}
function DeepEqualObject(left, right) {
  if (!IsObject(right))
    return false;
  const keys = Keys(left);
  return IsEqual(keys.length, Keys(right).length) && keys.every((key) => IsDeepEqual(left[key], right[key]));
}
function DeepEqualArray(left, right) {
  return IsArray(right) && IsEqual(left.length, right.length) && left.every((_, index) => IsDeepEqual(left[index], right[index]));
}
function IsDeepEqual(left, right) {
  return IsArray(left) ? DeepEqualArray(left, right) : IsObject(left) ? DeepEqualObject(left, right) : IsEqual(left, right);
}

// node_modules/typebox/build/guard/globals.mjs
var globals_exports = {};
__export(globals_exports, {
  IsBigInt64Array: () => IsBigInt64Array,
  IsBigUint64Array: () => IsBigUint64Array,
  IsBoolean: () => IsBoolean2,
  IsDate: () => IsDate,
  IsFloat32Array: () => IsFloat32Array,
  IsFloat64Array: () => IsFloat64Array,
  IsInt16Array: () => IsInt16Array,
  IsInt32Array: () => IsInt32Array,
  IsInt8Array: () => IsInt8Array,
  IsMap: () => IsMap,
  IsNumber: () => IsNumber2,
  IsRegExp: () => IsRegExp,
  IsSet: () => IsSet,
  IsString: () => IsString2,
  IsTypeArray: () => IsTypeArray,
  IsUint16Array: () => IsUint16Array,
  IsUint32Array: () => IsUint32Array,
  IsUint8Array: () => IsUint8Array,
  IsUint8ClampedArray: () => IsUint8ClampedArray
});
function IsBoolean2(value) {
  return value instanceof Boolean;
}
function IsNumber2(value) {
  return value instanceof Number;
}
function IsString2(value) {
  return value instanceof String;
}
function IsTypeArray(value) {
  return globalThis.ArrayBuffer.isView(value);
}
function IsInt8Array(value) {
  return value instanceof globalThis.Int8Array;
}
function IsUint8Array(value) {
  return value instanceof globalThis.Uint8Array;
}
function IsUint8ClampedArray(value) {
  return value instanceof globalThis.Uint8ClampedArray;
}
function IsInt16Array(value) {
  return value instanceof globalThis.Int16Array;
}
function IsUint16Array(value) {
  return value instanceof globalThis.Uint16Array;
}
function IsInt32Array(value) {
  return value instanceof globalThis.Int32Array;
}
function IsUint32Array(value) {
  return value instanceof globalThis.Uint32Array;
}
function IsFloat32Array(value) {
  return value instanceof globalThis.Float32Array;
}
function IsFloat64Array(value) {
  return value instanceof globalThis.Float64Array;
}
function IsBigInt64Array(value) {
  return value instanceof globalThis.BigInt64Array;
}
function IsBigUint64Array(value) {
  return value instanceof globalThis.BigUint64Array;
}
function IsRegExp(value) {
  return value instanceof globalThis.RegExp;
}
function IsDate(value) {
  return value instanceof globalThis.Date;
}
function IsSet(value) {
  return value instanceof globalThis.Set;
}
function IsMap(value) {
  return value instanceof globalThis.Map;
}

// node_modules/typebox/build/system/memory/clone.mjs
function FromClassInstance(value) {
  return value;
}
function IsTypeObject(value) {
  return guard_exports.HasPropertyKey(value, "~kind") || guard_exports.HasPropertyKey(value, "~unsafe");
}
function FromTypeObject(value) {
  const result = {};
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const key of Object.keys(descriptors)) {
    if (guard_exports.IsUnsafePropertyKey(key))
      continue;
    const descriptor = descriptors[key];
    if (guard_exports.HasPropertyKey(descriptor, "value")) {
      Object.defineProperty(result, key, { ...descriptor, value: FromValue(descriptor.value) });
    }
  }
  return result;
}
function FromPlainObject(value) {
  const result = {};
  for (const key of guard_exports.Keys(value)) {
    if (guard_exports.IsUnsafePropertyKey(key))
      continue;
    result[key] = FromValue(value[key]);
  }
  for (const key of guard_exports.Symbols(value)) {
    result[key] = FromValue(value[key]);
  }
  return result;
}
function FromObject(value) {
  return guard_exports.IsClassInstance(value) ? FromClassInstance(value) : IsTypeObject(value) ? FromTypeObject(value) : FromPlainObject(value);
}
function FromArray(value) {
  return value.map((element) => FromValue(element));
}
function FromTypedArray(value) {
  return value.slice();
}
function FromRegExp(value) {
  return new RegExp(value.source, value.flags);
}
function FromMap(value) {
  return new Map(FromValue([...value.entries()]));
}
function FromSet(value) {
  return new Set(FromValue([...value.values()]));
}
function FromValue(value) {
  return globals_exports.IsTypeArray(value) ? FromTypedArray(value) : globals_exports.IsRegExp(value) ? FromRegExp(value) : globals_exports.IsMap(value) ? FromMap(value) : globals_exports.IsSet(value) ? FromSet(value) : guard_exports.IsArray(value) ? FromArray(value) : guard_exports.IsObject(value) ? FromObject(value) : value;
}
function Clone(value) {
  Metrics.clone += 1;
  return FromValue(value);
}

// node_modules/typebox/build/system/settings/settings.mjs
var settings_exports = {};
__export(settings_exports, {
  Get: () => Get,
  Reset: () => Reset,
  Set: () => Set2
});
var settings = {
  immutableTypes: false,
  maxErrors: 8,
  useAcceleration: true,
  exactOptionalPropertyTypes: false,
  enumerableKind: false,
  correctiveParse: false,
  unionPrioritySort: true
};
function Reset() {
  settings.immutableTypes = false;
  settings.maxErrors = 8;
  settings.useAcceleration = true;
  settings.exactOptionalPropertyTypes = false;
  settings.enumerableKind = false;
  settings.correctiveParse = false;
  settings.unionPrioritySort = true;
}
function Set2(options) {
  for (const key of guard_exports.Keys(options)) {
    const value = options[key];
    if (value !== void 0) {
      Object.defineProperty(settings, key, { value });
    }
  }
}
function Get() {
  return settings;
}

// node_modules/typebox/build/system/memory/create.mjs
function MergeHidden(left, right) {
  for (const key of Object.keys(right)) {
    Object.defineProperty(left, key, {
      configurable: true,
      writable: true,
      enumerable: false,
      value: right[key]
    });
  }
  return left;
}
function Merge(left, right) {
  return { ...left, ...right };
}
function Create(hidden, enumerable, options = {}) {
  Metrics.create += 1;
  const settings2 = settings_exports.Get();
  const withOptions = Merge(enumerable, options);
  const withHidden = settings2.enumerableKind ? Merge(withOptions, hidden) : MergeHidden(withOptions, hidden);
  return settings2.immutableTypes ? Object.freeze(withHidden) : withHidden;
}

// node_modules/typebox/build/system/memory/discard.mjs
function Discard(value, propertyKeys) {
  Metrics.discard += 1;
  const result = {};
  const descriptors = Object.getOwnPropertyDescriptors(Clone(value));
  const keysToDiscard = new Set(propertyKeys);
  for (const key of Object.keys(descriptors)) {
    if (keysToDiscard.has(key))
      continue;
    Object.defineProperty(result, key, descriptors[key]);
  }
  return result;
}

// node_modules/typebox/build/system/memory/update.mjs
function Update(current, hidden, enumerable) {
  Metrics.update += 1;
  const settings2 = settings_exports.Get();
  const result = Clone(current);
  for (const key of Object.keys(hidden)) {
    Object.defineProperty(result, key, {
      configurable: true,
      writable: true,
      enumerable: settings2.enumerableKind,
      value: hidden[key]
    });
  }
  for (const key of Object.keys(enumerable)) {
    Object.defineProperty(result, key, {
      configurable: true,
      enumerable: true,
      writable: true,
      value: enumerable[key]
    });
  }
  return result;
}

// node_modules/typebox/build/type/types/schema.mjs
function IsKind(value, kind) {
  return guard_exports.IsObject(value) && guard_exports.HasPropertyKey(value, "~kind") && guard_exports.IsEqual(value["~kind"], kind);
}
function IsSchema(value) {
  return guard_exports.IsObject(value);
}

// node_modules/typebox/build/type/types/deferred.mjs
function Deferred(action, parameters, options) {
  return memory_exports.Create({ "~kind": "Deferred" }, { type: "deferred", action, parameters, options }, {});
}
function IsDeferred(value) {
  return IsKind(value, "Deferred");
}

// node_modules/typebox/build/type/engine/readonly/instantiate_add.mjs
function AddReadonlyOperation(type) {
  return memory_exports.Update(type, { "~readonly": true }, {});
}
function AddReadonlyAction(type, options) {
  const result = memory_exports.Update(AddReadonlyOperation(type), {}, options);
  return result;
}
function AddReadonlyInstantiate(context, state, type, options) {
  const instantiatedType = InstantiateType(context, state, type);
  return AddReadonlyAction(instantiatedType, options);
}

// node_modules/typebox/build/type/engine/optional/instantiate_add.mjs
function AddOptionalOperation(type) {
  return memory_exports.Update(type, { "~optional": true }, {});
}
function AddOptionalAction(type, options) {
  const result = memory_exports.Update(AddOptionalOperation(type), {}, options);
  return result;
}
function AddOptionalInstantiate(context, state, type, options) {
  const instantiatedType = InstantiateType(context, state, type);
  return AddOptionalAction(instantiatedType, options);
}

// node_modules/typebox/build/type/types/array.mjs
function _Array_(items, options) {
  return memory_exports.Create({ "~kind": "Array" }, { type: "array", items }, options);
}
function IsArray2(value) {
  return IsKind(value, "Array");
}
function ArrayOptions(type) {
  return memory_exports.Discard(type, ["~kind", "type", "items"]);
}

// node_modules/typebox/build/type/types/constructor.mjs
function Constructor(parameters, instanceType, options = {}) {
  return memory_exports.Create({ "~kind": "Constructor" }, { type: "constructor", parameters, instanceType }, options);
}
function IsConstructor2(value) {
  return IsKind(value, "Constructor");
}
function ConstructorOptions(type) {
  return memory_exports.Discard(type, ["~kind", "type", "parameters", "instanceType"]);
}

// node_modules/typebox/build/type/types/function.mjs
function _Function_(parameters, returnType, options = {}) {
  return memory_exports.Create({ ["~kind"]: "Function" }, { type: "function", parameters, returnType }, options);
}
function IsFunction2(value) {
  return IsKind(value, "Function");
}
function FunctionOptions(type) {
  return memory_exports.Discard(type, ["~kind", "type", "parameters", "returnType"]);
}

// node_modules/typebox/build/type/types/ref.mjs
function Ref(ref, options) {
  return memory_exports.Create({ ["~kind"]: "Ref" }, { $ref: ref }, options);
}
function IsRef(value) {
  return IsKind(value, "Ref");
}

// node_modules/typebox/build/type/types/generic.mjs
function Generic(parameters, expression) {
  return memory_exports.Create({ "~kind": "Generic" }, { type: "generic", parameters, expression });
}
function IsGeneric(value) {
  return IsKind(value, "Generic");
}

// node_modules/typebox/build/type/types/any.mjs
function Any(options) {
  return memory_exports.Create({ ["~kind"]: "Any" }, {}, options);
}
function IsAny(value) {
  return IsKind(value, "Any");
}

// node_modules/typebox/build/type/types/never.mjs
var NeverPattern = "(?!)";
function Never(options) {
  return memory_exports.Create({ "~kind": "Never" }, { not: {} }, options);
}
function IsNever(value) {
  return IsKind(value, "Never");
}

// node_modules/typebox/build/type/action/_add_optional.mjs
function AddOptionalDeferred(type, options = {}) {
  return Deferred("AddOptional", [type], options);
}
function AddOptional(type, options = {}) {
  return AddOptionalAction(type, options);
}

// node_modules/typebox/build/type/types/_optional.mjs
function Optional(type) {
  return AddOptional(type);
}
function IsOptional(value) {
  return IsSchema(value) && guard_exports.HasPropertyKey(value, "~optional");
}

// node_modules/typebox/build/type/types/properties.mjs
function RequiredArray(properties) {
  return guard_exports.Keys(properties).filter((key) => !IsOptional(properties[key]));
}
function PropertyKeys(properties) {
  return guard_exports.Keys(properties);
}
function PropertyValues(properties) {
  return guard_exports.Values(properties);
}

// node_modules/typebox/build/type/types/object.mjs
function _Object_(properties, options = {}) {
  const requiredKeys = RequiredArray(properties);
  const required = requiredKeys.length > 0 ? { required: requiredKeys } : {};
  return memory_exports.Create({ "~kind": "Object" }, { type: "object", ...required, properties }, options);
}
function IsObject2(value) {
  return IsKind(value, "Object");
}
function ObjectOptions(type) {
  return memory_exports.Discard(type, ["~kind", "type", "properties", "required"]);
}

// node_modules/typebox/build/type/types/unknown.mjs
function Unknown(options) {
  return memory_exports.Create({ ["~kind"]: "Unknown" }, {}, options);
}
function IsUnknown(value) {
  return IsKind(value, "Unknown");
}

// node_modules/typebox/build/type/types/cyclic.mjs
function Cyclic($defs, $ref, options) {
  const defs = guard_exports.Keys($defs).reduce((result, key) => {
    return { ...result, [key]: memory_exports.Update($defs[key], {}, { $id: key }) };
  }, {});
  return memory_exports.Create({ ["~kind"]: "Cyclic" }, { $defs: defs, $ref }, options);
}
function IsCyclic(value) {
  return IsKind(value, "Cyclic");
}

// node_modules/typebox/build/type/types/unsafe.mjs
function Unsafe(schema) {
  return memory_exports.Update(schema, { ["~unsafe"]: null }, {});
}
function IsUnsafe(value) {
  return guard_exports.IsObjectNotArray(value) && guard_exports.HasPropertyKey(value, "~unsafe") && guard_exports.IsNull(value["~unsafe"]);
}

// node_modules/typebox/build/system/arguments/arguments.mjs
var arguments_exports = {};
__export(arguments_exports, {
  Match: () => Match
});
function Match(args, match) {
  return match[args.length]?.(...args) ?? (() => {
    throw Error("Invalid Arguments");
  })();
}

// node_modules/typebox/build/type/types/infer.mjs
function Infer(...args) {
  const [name, extends_] = arguments_exports.Match(args, {
    2: (name2, extends_2) => [name2, extends_2, extends_2],
    1: (name2) => [name2, Unknown(), Unknown()]
  });
  return memory_exports.Create({ ["~kind"]: "Infer" }, { type: "infer", name, extends: extends_ }, {});
}
function IsInfer(value) {
  return IsKind(value, "Infer");
}

// node_modules/typebox/build/type/types/dependent.mjs
function Dependent(if_, then_, else_, options = {}) {
  return memory_exports.Create({ "~kind": "Dependent" }, { if: if_, then: then_, else: else_ }, options);
}
function IsDependent(value) {
  return IsKind(value, "Dependent");
}
function DependentOptions(type) {
  return memory_exports.Discard(type, ["~kind", "if", "then", "else"]);
}

// node_modules/typebox/build/type/engine/enum/typescript_enum_to_enum_values.mjs
function IsTypeScriptEnumLike(value) {
  return guard_exports.IsObjectNotArray(value);
}
function TypeScriptEnumToEnumValues(type) {
  const keys = guard_exports.Keys(type).filter((key) => isNaN(key));
  return keys.reduce((result, key) => [...result, type[key]], []);
}

// node_modules/typebox/build/type/types/enum.mjs
function IsEnumValue(value) {
  return guard_exports.IsString(value) || guard_exports.IsNumber(value);
}
function Enum(value, options) {
  const values = IsTypeScriptEnumLike(value) ? TypeScriptEnumToEnumValues(value) : value;
  return memory_exports.Create({ "~kind": "Enum" }, { enum: values }, options);
}
function IsEnum(value) {
  return IsKind(value, "Enum");
}

// node_modules/typebox/build/type/types/intersect.mjs
function Intersect(types, options = {}) {
  return memory_exports.Create({ "~kind": "Intersect" }, { allOf: types }, options);
}
function IsIntersect(value) {
  return IsKind(value, "Intersect");
}
function IntersectOptions(type) {
  return memory_exports.Discard(type, ["~kind", "allOf"]);
}

// node_modules/typebox/build/system/unreachable/unreachable.mjs
function Unreachable() {
  throw new Error("Unreachable");
}

// node_modules/typebox/build/system/hashing/hash.mjs
var ByteMarker;
(function(ByteMarker2) {
  ByteMarker2[ByteMarker2["Array"] = 0] = "Array";
  ByteMarker2[ByteMarker2["BigInt"] = 1] = "BigInt";
  ByteMarker2[ByteMarker2["Boolean"] = 2] = "Boolean";
  ByteMarker2[ByteMarker2["Date"] = 3] = "Date";
  ByteMarker2[ByteMarker2["Constructor"] = 4] = "Constructor";
  ByteMarker2[ByteMarker2["Function"] = 5] = "Function";
  ByteMarker2[ByteMarker2["Null"] = 6] = "Null";
  ByteMarker2[ByteMarker2["Number"] = 7] = "Number";
  ByteMarker2[ByteMarker2["Object"] = 8] = "Object";
  ByteMarker2[ByteMarker2["RegExp"] = 9] = "RegExp";
  ByteMarker2[ByteMarker2["String"] = 10] = "String";
  ByteMarker2[ByteMarker2["Symbol"] = 11] = "Symbol";
  ByteMarker2[ByteMarker2["TypeArray"] = 12] = "TypeArray";
  ByteMarker2[ByteMarker2["Undefined"] = 13] = "Undefined";
})(ByteMarker || (ByteMarker = {}));
var Accumulator = BigInt("14695981039346656037");
var [Prime, Size] = [BigInt("1099511628211"), BigInt(
  "18446744073709551616"
  /* 2 ^ 64 */
)];
var Bytes = Array.from({ length: 256 }).map((_, i) => BigInt(i));
var F64 = new Float64Array(1);
var F64In = new DataView(F64.buffer);
var F64Out = new Uint8Array(F64.buffer);
var encoder = new TextEncoder();

// node_modules/typebox/build/type/types/_codec.mjs
var EncodeBuilder = class {
  constructor(type, decode) {
    this.type = type;
    this.decode = decode;
  }
  Encode(callback) {
    const type = this.type;
    const decode = IsCodec(type) ? (value) => this.decode(type["~codec"].decode(value)) : this.decode;
    const encode = IsCodec(type) ? (value) => type["~codec"].encode(callback(value)) : callback;
    const codec = { decode, encode };
    return memory_exports.Update(this.type, { "~codec": codec }, {});
  }
};
var DecodeBuilder = class {
  constructor(type) {
    this.type = type;
  }
  Decode(callback) {
    return new EncodeBuilder(this.type, callback);
  }
};
function Codec(type) {
  return new DecodeBuilder(type);
}
function Decode(type, callback) {
  return Codec(type).Decode(callback).Encode(() => {
    throw Error("Encode not implemented");
  });
}
function Encode(type, callback) {
  return Codec(type).Decode(() => {
    throw Error("Decode not implemented");
  }).Encode(callback);
}
function IsCodec(value) {
  return IsSchema(value) && guard_exports.HasPropertyKey(value, "~codec") && guard_exports.IsObject(value["~codec"]) && guard_exports.HasPropertyKey(value["~codec"], "encode") && guard_exports.HasPropertyKey(value["~codec"], "decode");
}

// node_modules/typebox/build/type/types/_immutable.mjs
function Immutable(type) {
  return AddImmutable(type);
}
function IsImmutable(value) {
  return IsSchema(value) && guard_exports.HasPropertyKey(value, "~immutable");
}

// node_modules/typebox/build/type/action/_add_readonly.mjs
function AddReadonlyDeferred(type, options = {}) {
  return Deferred("AddReadonly", [type], options);
}
function AddReadonly(type, options = {}) {
  return AddReadonlyAction(type, options);
}

// node_modules/typebox/build/type/types/_readonly.mjs
function Readonly(type) {
  return AddReadonly(type);
}
function IsReadonly(value) {
  return IsSchema(value) && guard_exports.HasPropertyKey(value, "~readonly");
}

// node_modules/typebox/build/type/types/_refine.mjs
function RefineAdd(type, refinement) {
  const refinements = IsRefine(type) ? [...type["~refine"], refinement] : [refinement];
  return memory_exports.Update(type, { "~refine": refinements }, {});
}
function Refine(...args) {
  const [type, check, error] = arguments_exports.Match(args, {
    3: (type2, check2, error2) => [type2, check2, error2],
    2: (type2, check2) => [type2, check2, () => "Refine Error"]
  });
  return RefineAdd(type, { check, error });
}
function IsRefinement(value) {
  return guard_exports.IsObjectNotArray(value) && guard_exports.HasPropertyKey(value, "check") && guard_exports.HasPropertyKey(value, "error") && guard_exports.IsFunction(value.check) && guard_exports.IsFunction(value.error);
}
function IsRefine(value) {
  return IsSchema(value) && guard_exports.HasPropertyKey(value, "~refine") && guard_exports.IsArray(value["~refine"]) && guard_exports.Every(value["~refine"], 0, (value2) => IsRefinement(value2));
}

// node_modules/typebox/build/type/types/bigint.mjs
var BigIntPattern = "-?(?:0|[1-9][0-9]*)n";
function BigInt2(options) {
  return memory_exports.Create({ "~kind": "BigInt" }, { type: "bigint" }, options);
}
function IsBigInt2(value) {
  return IsKind(value, "BigInt");
}

// node_modules/typebox/build/type/types/boolean.mjs
function Boolean2(options) {
  return memory_exports.Create({ "~kind": "Boolean" }, { type: "boolean" }, options);
}
function IsBoolean3(value) {
  return IsKind(value, "Boolean");
}

// node_modules/typebox/build/type/types/identifier.mjs
function Identifier(name) {
  return memory_exports.Create({ "~kind": "Identifier" }, { name });
}
function IsIdentifier(value) {
  return IsKind(value, "Identifier");
}

// node_modules/typebox/build/type/types/integer.mjs
var IntegerPattern = "-?(?:0|[1-9][0-9]*)";
function Integer(options) {
  return memory_exports.Create({ "~kind": "Integer" }, { type: "integer" }, options);
}
function IsInteger2(value) {
  return IsKind(value, "Integer");
}

// node_modules/typebox/build/type/types/literal.mjs
var InvalidLiteralValue = class extends Error {
  constructor(value) {
    super(`Invalid Literal value`);
    Object.defineProperty(this, "cause", {
      value: { value },
      writable: false,
      configurable: false,
      enumerable: false
    });
  }
};
function LiteralTypeName(value) {
  return guard_exports.IsBigInt(value) ? "bigint" : guard_exports.IsBoolean(value) ? "boolean" : guard_exports.IsNumber(value) ? "number" : guard_exports.IsString(value) ? "string" : (() => {
    throw new InvalidLiteralValue(value);
  })();
}
function Literal(value, options) {
  return memory_exports.Create({ "~kind": "Literal" }, { type: LiteralTypeName(value), const: value }, options);
}
function IsLiteralValue(value) {
  return guard_exports.IsBigInt(value) || guard_exports.IsBoolean(value) || guard_exports.IsNumber(value) || guard_exports.IsString(value);
}
function IsLiteralNumber(value) {
  return IsLiteral(value) && guard_exports.IsNumber(value.const);
}
function IsLiteralString(value) {
  return IsLiteral(value) && guard_exports.IsString(value.const);
}
function IsLiteral(value) {
  return IsKind(value, "Literal");
}

// node_modules/typebox/build/type/types/null.mjs
function Null(options) {
  return memory_exports.Create({ "~kind": "Null" }, { type: "null" }, options);
}
function IsNull2(value) {
  return IsKind(value, "Null");
}

// node_modules/typebox/build/type/types/number.mjs
var NumberPattern = "-?(?:0|[1-9][0-9]*)(?:\\.[0-9]+)?";
function Number2(options) {
  return memory_exports.Create({ "~kind": "Number" }, { type: "number" }, options);
}
function IsNumber3(value) {
  return IsKind(value, "Number");
}

// node_modules/typebox/build/type/types/symbol.mjs
function Symbol2(options) {
  return memory_exports.Create({ "~kind": "Symbol" }, { type: "symbol" }, options);
}
function IsSymbol2(value) {
  return IsKind(value, "Symbol");
}

// node_modules/typebox/build/type/types/parameter.mjs
function Parameter(...args) {
  const [name, extends_, equals] = arguments_exports.Match(args, {
    3: (name2, extends_2, equals2) => [name2, extends_2, equals2],
    2: (name2, extends_2) => [name2, extends_2, extends_2],
    1: (name2) => [name2, Unknown(), Unknown()]
  });
  return memory_exports.Create({ "~kind": "Parameter" }, { name, extends: extends_, equals }, {});
}
function IsParameter(value) {
  return IsKind(value, "Parameter");
}

// node_modules/typebox/build/type/types/string.mjs
var StringPattern = ".*";
function String2(options) {
  return memory_exports.Create({ "~kind": "String" }, { type: "string" }, options);
}
function IsString3(value) {
  return IsKind(value, "String");
}

// node_modules/typebox/build/type/types/union.mjs
function Union(anyOf, options = {}) {
  return memory_exports.Create({ "~kind": "Union" }, { anyOf }, options);
}
function IsUnion(value) {
  return IsKind(value, "Union");
}
function UnionOptions(type) {
  return memory_exports.Discard(type, ["~kind", "anyOf"]);
}

// node_modules/typebox/build/type/engine/patterns/pattern.mjs
function ParsePatternIntoTypes(pattern) {
  const parsed = Pattern(pattern);
  const result = guard_exports.IsEqual(parsed.length, 2) ? parsed[0] : [];
  return result;
}

// node_modules/typebox/build/type/engine/template_literal/is_finite.mjs
function FromLiteral(_value) {
  return true;
}
function FromTypesReduce(types) {
  return guard_exports.ShiftLeft(types, (left, right) => FromType(left) ? FromTypesReduce(right) : false, () => true);
}
function FromTypes(types) {
  const result = guard_exports.IsEqual(types.length, 0) ? false : FromTypesReduce(types);
  return result;
}
function FromType(type) {
  return IsUnion(type) ? FromTypes(type.anyOf) : IsLiteral(type) ? FromLiteral(type.const) : false;
}
function IsTemplateLiteralFinite(types) {
  const result = FromTypes(types);
  return result;
}

// node_modules/typebox/build/type/engine/template_literal/create.mjs
function TemplateLiteralCreate(pattern) {
  return memory_exports.Create({ ["~kind"]: "TemplateLiteral" }, { type: "string", pattern }, {});
}

// node_modules/typebox/build/type/engine/template_literal/decode.mjs
function FromLiteralPush(variants, value, result = []) {
  return guard_exports.ShiftLeft(variants, (left, right) => FromLiteralPush(right, value, [...result, `${left}${value}`]), () => result);
}
function FromLiteral2(variants, value) {
  return guard_exports.IsEqual(variants.length, 0) ? [`${value}`] : FromLiteralPush(variants, value);
}
function FromUnion(variants, types, result = []) {
  return guard_exports.ShiftLeft(types, (left, right) => FromUnion(variants, right, [...result, ...FromType2(variants, left)]), () => result);
}
function FromType2(variants, type) {
  const result = IsUnion(type) ? FromUnion(variants, type.anyOf) : IsLiteral(type) ? FromLiteral2(variants, type.const) : Unreachable();
  return result;
}
function DecodeFromSpan(variants, types) {
  return guard_exports.ShiftLeft(types, (left, right) => DecodeFromSpan(FromType2(variants, left), right), () => variants);
}
function VariantsToLiterals(variants) {
  return variants.map((variant) => Literal(variant));
}
function DecodeTypesAsUnion(types) {
  const variants = DecodeFromSpan([], types);
  const literals = VariantsToLiterals(variants);
  const result = Union(literals);
  return result;
}
function DecodeTypes(types) {
  return guard_exports.IsEqual(types.length, 0) ? Unreachable() : (
    // Literal('') :
    guard_exports.IsEqual(types.length, 1) && IsLiteral(types[0]) ? types[0] : DecodeTypesAsUnion(types)
  );
}
function TemplateLiteralDecodeUnsafe(pattern) {
  const types = ParsePatternIntoTypes(pattern);
  const result = guard_exports.IsEqual(types.length, 0) ? String2() : IsTemplateLiteralFinite(types) ? DecodeTypes(types) : TemplateLiteralCreate(pattern);
  return result;
}
function TemplateLiteralDecode(pattern) {
  const decoded = TemplateLiteralDecodeUnsafe(pattern);
  const result = IsTemplateLiteral(decoded) ? String2() : decoded;
  return result;
}

// node_modules/typebox/build/type/engine/record/record_create.mjs
function CreateRecord(key, value) {
  const type = "object";
  const patternProperties = { [key]: value };
  return memory_exports.Create({ ["~kind"]: "Record" }, { type, patternProperties });
}

// node_modules/typebox/build/type/engine/record/from_key_any.mjs
function FromAnyKey(value) {
  return CreateRecord(StringKey, value);
}

// node_modules/typebox/build/type/engine/record/from_key_boolean.mjs
function FromBooleanKey(value) {
  return _Object_({ true: value, false: value });
}

// node_modules/typebox/build/type/types/tuple.mjs
function Tuple(types, options = {}) {
  const [items, minItems, additionalItems] = [types, types.length, false];
  return memory_exports.Create({ ["~kind"]: "Tuple" }, { type: "array", additionalItems, items, minItems }, options);
}
function IsTuple(value) {
  return IsKind(value, "Tuple");
}
function TupleOptions(type) {
  return memory_exports.Discard(type, ["~kind", "type", "items", "minItems", "additionalItems"]);
}

// node_modules/typebox/build/type/engine/readonly/instantiate_remove.mjs
function RemoveReadonlyOperation(type) {
  return memory_exports.Discard(type, ["~readonly"]);
}
function RemoveReadonlyAction(type, options) {
  const result = memory_exports.Update(RemoveReadonlyOperation(type), {}, options);
  return result;
}
function RemoveReadonlyInstantiate(context, state, type, options) {
  const instantiatedType = InstantiateType(context, state, type);
  return RemoveReadonlyAction(instantiatedType, options);
}

// node_modules/typebox/build/type/action/_remove_readonly.mjs
function RemoveReadonlyDeferred(type, options = {}) {
  return Deferred("RemoveReadonly", [type], options);
}
function RemoveReadonly(type, options = {}) {
  return RemoveReadonlyAction(type, options);
}

// node_modules/typebox/build/type/engine/optional/instantiate_remove.mjs
function RemoveOptionalOperation(type) {
  return memory_exports.Discard(type, ["~optional"]);
}
function RemoveOptionalAction(type, options) {
  const result = memory_exports.Update(RemoveOptionalOperation(type), {}, options);
  return result;
}
function RemoveOptionalInstantiate(context, state, type, options) {
  const instantiatedType = InstantiateType(context, state, type);
  return RemoveOptionalAction(instantiatedType, options);
}

// node_modules/typebox/build/type/action/_remove_optional.mjs
function RemoveOptionalDeferred(type, options = {}) {
  return Deferred("RemoveOptional", [type], options);
}
function RemoveOptional(type, options = {}) {
  return RemoveOptionalAction(type, options);
}

// node_modules/typebox/build/type/engine/tuple/to_object.mjs
function TupleElementsToProperties(types) {
  const result = types.reduceRight((result2, right, index) => {
    return { [index]: right, ...result2 };
  }, {});
  return result;
}
function TupleToObject(type) {
  const properties = TupleElementsToProperties(type.items);
  const result = _Object_(properties);
  return result;
}

// node_modules/typebox/build/type/engine/evaluate/composite.mjs
function IsReadonlyProperty(left, right) {
  return IsReadonly(left) ? IsReadonly(right) ? true : false : false;
}
function IsOptionalProperty(left, right) {
  return IsOptional(left) ? IsOptional(right) ? true : false : false;
}
function CompositeProperty(left, right) {
  const isReadonly = IsReadonlyProperty(left, right);
  const isOptional = IsOptionalProperty(left, right);
  const evaluated = EvaluateIntersect([left, right]);
  const property = RemoveReadonly(RemoveOptional(evaluated));
  return isReadonly && isOptional ? AddReadonly(AddOptional(property)) : isReadonly && !isOptional ? AddReadonly(property) : !isReadonly && isOptional ? AddOptional(property) : property;
}
function CompositePropertyKey(left, right, key) {
  return key in left ? key in right ? CompositeProperty(left[key], right[key]) : left[key] : key in right ? right[key] : Never();
}
function CompositeProperties(left, right) {
  const keys = /* @__PURE__ */ new Set([...guard_exports.Keys(right), ...guard_exports.Keys(left)]);
  return [...keys].reduce((result, key) => {
    return { ...result, [key]: CompositePropertyKey(left, right, key) };
  }, {});
}
function GetProperties(type) {
  const result = IsObject2(type) ? type.properties : IsTuple(type) ? TupleElementsToProperties(type.items) : Unreachable();
  return result;
}
function Composite(left, right) {
  const leftProperties = GetProperties(left);
  const rightProperties = GetProperties(right);
  const properties = CompositeProperties(leftProperties, rightProperties);
  return _Object_(properties);
}

// node_modules/typebox/build/type/engine/evaluate/narrow.mjs
function Narrow(left, right) {
  const result = Compare(left, right);
  return guard_exports.IsEqual(result, ResultLeftInside) ? left : guard_exports.IsEqual(result, ResultRightInside) ? right : guard_exports.IsEqual(result, ResultEqual) ? right : Never();
}

// node_modules/typebox/build/type/engine/evaluate/distribute.mjs
function IsObjectLike(type) {
  return IsObject2(type) || IsTuple(type);
}
function IsUnionOperand(left, right) {
  const isUnionLeft = IsUnion(left);
  const isUnionRight = IsUnion(right);
  const result = isUnionLeft || isUnionRight;
  return result;
}
function DistributeOperation(left, right) {
  const evaluatedLeft = EvaluateType(left);
  const evaluatedRight = EvaluateType(right);
  const isUnionOperand = IsUnionOperand(evaluatedLeft, evaluatedRight);
  const isObjectLeft = IsObjectLike(evaluatedLeft);
  const IsObjectRight = IsObjectLike(evaluatedRight);
  const result = isUnionOperand ? EvaluateIntersect([evaluatedLeft, evaluatedRight]) : isObjectLeft && IsObjectRight ? Composite(evaluatedLeft, evaluatedRight) : isObjectLeft && !IsObjectRight ? evaluatedLeft : !isObjectLeft && IsObjectRight ? evaluatedRight : Narrow(evaluatedLeft, evaluatedRight);
  return result;
}
function DistributeType(type, types, result = []) {
  return guard_exports.ShiftLeft(types, (left, right) => DistributeType(type, right, [...result, DistributeOperation(type, left)]), () => guard_exports.IsEqual(result.length, 0) ? [type] : result);
}
function DistributeUnion(types, distribution, result = []) {
  return guard_exports.ShiftLeft(types, (left, right) => DistributeUnion(right, distribution, [...result, ...Distribute([left], distribution)]), () => result);
}
function Distribute(types, result = []) {
  return guard_exports.ShiftLeft(types, (left, right) => IsUnion(left) ? Distribute(right, DistributeUnion(left.anyOf, result)) : Distribute(right, DistributeType(left, result)), () => result);
}

// node_modules/typebox/build/type/engine/exclude/operation.mjs
function ExcludeType(left, right) {
  const check = Extends({}, left, right);
  const result = result_exports.IsExtendsTrueLike(check) ? [] : [left];
  return result;
}
function ExcludeUnion(types, right) {
  return types.reduce((result, head) => {
    return [...result, ...ExcludeType(head, right)];
  }, []);
}
function ExcludeOperation(left, right) {
  const evaluated = EvaluateType(left);
  const canonical = IsUnion(evaluated) ? evaluated.anyOf : [evaluated];
  const remaining = ExcludeUnion(canonical, right);
  const result = EvaluateUnion(remaining);
  return result;
}

// node_modules/typebox/build/type/engine/evaluate/evaluate.mjs
function EvaluateDependent(if_, then_, else_) {
  const intersect = Intersect([if_, then_]);
  const excluded = ExcludeOperation(else_, if_);
  const result = EvaluateUnion([intersect, excluded]);
  return result;
}
function EvaluateEnum(values) {
  const result = values.map((value) => Literal(value));
  return EvaluateUnion(result);
}
function EvaluateIntersect(types) {
  const distribution = Distribute(types);
  const broadend = Broaden(distribution);
  const result = EvaluateUnionFast(broadend);
  return result;
}
function EvaluateTemplateLiteral(pattern) {
  const evaluated = TemplateLiteralDecode(pattern);
  const result = EvaluateType(evaluated);
  return result;
}
function EvaluateUnion(types) {
  const broadend = Broaden(types);
  const result = EvaluateUnionFast(broadend);
  return result;
}
function EvaluateType(type) {
  return IsDependent(type) ? EvaluateDependent(type.if, type.then, type.else) : IsEnum(type) ? EvaluateEnum(type.enum) : IsIntersect(type) ? EvaluateIntersect(type.allOf) : IsTemplateLiteral(type) ? EvaluateTemplateLiteral(type.pattern) : IsUnion(type) ? EvaluateUnion(type.anyOf) : type;
}
function EvaluateUnionFast(types) {
  const result = guard_exports.IsEqual(types.length, 1) ? types[0] : guard_exports.IsEqual(types.length, 0) ? Never() : Union(types);
  return result;
}

// node_modules/typebox/build/type/engine/record/from_key_enum.mjs
function FromEnumKey(values, value) {
  const unionKey = EvaluateEnum(values);
  const result = FromKey(unionKey, value);
  return result;
}

// node_modules/typebox/build/type/engine/record/from_key_integer.mjs
function FromIntegerKey(_key, value) {
  const result = CreateRecord(IntegerKey, value);
  return result;
}

// node_modules/typebox/build/type/engine/record/from_key_intersect.mjs
function FromIntersectKey(types, value) {
  const evaluatedKey = EvaluateIntersect(types);
  const result = FromKey(evaluatedKey, value);
  return result;
}

// node_modules/typebox/build/type/engine/record/from_key_literal.mjs
function FromLiteralKey(key, value) {
  return guard_exports.IsString(key) || guard_exports.IsNumber(key) ? _Object_({ [key]: value }) : guard_exports.IsEqual(key, false) ? _Object_({ false: value }) : guard_exports.IsEqual(key, true) ? _Object_({ true: value }) : _Object_({});
}

// node_modules/typebox/build/type/engine/record/from_key_number.mjs
function FromNumberKey(_key, value) {
  const result = CreateRecord(NumberKey, value);
  return result;
}

// node_modules/typebox/build/type/engine/record/from_key_string.mjs
function FromStringKey(key, value) {
  return guard_exports.HasPropertyKey(key, "pattern") && (guard_exports.IsString(key.pattern) || key.pattern instanceof RegExp) ? CreateRecord(key.pattern.toString(), value) : CreateRecord(StringKey, value);
}

// node_modules/typebox/build/type/engine/record/from_key_template_literal.mjs
function FromTemplateKey(pattern, value) {
  const types = ParsePatternIntoTypes(pattern);
  const finite = IsTemplateLiteralFinite(types);
  const result = finite ? FromKey(EvaluateTemplateLiteral(pattern), value) : CreateRecord(pattern, value);
  return result;
}

// node_modules/typebox/build/type/engine/evaluate/flatten.mjs
function FlattenType(type) {
  const result = IsUnion(type) ? Flatten(type.anyOf) : [type];
  return result;
}
function Flatten(types) {
  return types.reduce((result, type) => {
    return [...result, ...FlattenType(type)];
  }, []);
}

// node_modules/typebox/build/type/engine/record/from_key_union.mjs
function StringOrNumberCheck(types) {
  return types.some((type) => IsString3(type) || IsNumber3(type) || IsInteger2(type));
}
function TryBuildRecord(types, value) {
  return guard_exports.IsEqual(StringOrNumberCheck(types), true) ? CreateRecord(StringKey, value) : void 0;
}
function CreateProperties(types, value) {
  return types.reduce((result, left) => {
    return IsLiteral(left) && (guard_exports.IsString(left.const) || guard_exports.IsNumber(left.const)) ? { ...result, [left.const]: value } : result;
  }, {});
}
function CreateObject(types, value) {
  const properties = CreateProperties(types, value);
  const result = _Object_(properties);
  return result;
}
function FromUnionKey(types, value) {
  const flattened = Flatten(types);
  const record = TryBuildRecord(flattened, value);
  return IsSchema(record) ? record : CreateObject(flattened, value);
}

// node_modules/typebox/build/type/engine/record/from_key.mjs
function FromKey(key, value) {
  const result = IsAny(key) ? FromAnyKey(value) : IsBoolean3(key) ? FromBooleanKey(value) : IsEnum(key) ? FromEnumKey(key.enum, value) : IsInteger2(key) ? FromIntegerKey(key, value) : IsIntersect(key) ? FromIntersectKey(key.allOf, value) : IsLiteral(key) ? FromLiteralKey(key.const, value) : IsNumber3(key) ? FromNumberKey(key, value) : IsUnion(key) ? FromUnionKey(key.anyOf, value) : IsString3(key) ? FromStringKey(key, value) : IsTemplateLiteral(key) ? FromTemplateKey(key.pattern, value) : _Object_({});
  return result;
}

// node_modules/typebox/build/type/engine/record/instantiate.mjs
function RecordAction(key, value, options) {
  const result = CanInstantiate([key]) ? memory_exports.Update(FromKey(key, value), {}, options) : RecordDeferred(key, value, options);
  return result;
}
function RecordInstantiate(context, state, key, value, options) {
  const instantiatedKey = InstantiateType(context, state, key);
  const instantiatedValue = InstantiateType(context, state, value);
  return RecordAction(instantiatedKey, instantiatedValue, options);
}

// node_modules/typebox/build/type/types/record.mjs
var IntegerKey = `^${IntegerPattern}$`;
var NumberKey = `^${NumberPattern}$`;
var StringKey = `^${StringPattern}$`;
function RecordDeferred(key, value, options = {}) {
  return Deferred("Record", [key, value], options);
}
function Record(key, value, options = {}) {
  return RecordAction(key, value, options);
}
function RecordFromPattern(pattern, value) {
  return CreateRecord(pattern, value);
}
function RecordPatternToType(pattern) {
  const result = guard_exports.IsEqual(pattern, StringKey) ? String2() : guard_exports.IsEqual(pattern, IntegerKey) ? Integer() : guard_exports.IsEqual(pattern, NumberKey) ? Number2() : TemplateLiteralDecodeUnsafe(pattern);
  return result;
}
function RecordPattern(type) {
  return guard_exports.Keys(type.patternProperties)[0];
}
function RecordKey(type) {
  const pattern = RecordPattern(type);
  const result = RecordPatternToType(pattern);
  return result;
}
function RecordValue(type) {
  return type.patternProperties[RecordPattern(type)];
}
function IsRecord(value) {
  return IsKind(value, "Record");
}

// node_modules/typebox/build/type/types/rest.mjs
function Rest(type) {
  return memory_exports.Create({ "~kind": "Rest" }, { type: "rest", items: type }, {});
}
function IsRest(value) {
  return IsKind(value, "Rest");
}

// node_modules/typebox/build/type/types/this.mjs
function This(options) {
  return memory_exports.Create({ ["~kind"]: "This" }, { $ref: "#" }, options);
}
function IsThis(value) {
  return IsKind(value, "This");
}

// node_modules/typebox/build/type/types/undefined.mjs
function Undefined(options) {
  return memory_exports.Create({ "~kind": "Undefined" }, { type: "undefined" }, options);
}
function IsUndefined2(value) {
  return IsKind(value, "Undefined");
}

// node_modules/typebox/build/type/types/void.mjs
function Void(options) {
  return memory_exports.Create({ "~kind": "Void" }, { type: "void" }, options);
}
function IsVoid(value) {
  return IsKind(value, "Void");
}

// node_modules/typebox/build/type/script/mapping.mjs
function IntrinsicOrCall(ref, parameters) {
  return guard_exports.IsEqual(ref, "Array") ? _Array_(parameters[0]) : guard_exports.IsEqual(ref, "Capitalize") ? CapitalizeDeferred(parameters[0]) : guard_exports.IsEqual(ref, "ConstructorParameters") ? ConstructorParametersDeferred(parameters[0]) : guard_exports.IsEqual(ref, "Evaluate") ? EvaluateDeferred(parameters[0]) : guard_exports.IsEqual(ref, "Exclude") ? ExcludeDeferred(parameters[0], parameters[1]) : guard_exports.IsEqual(ref, "Extract") ? ExtractDeferred(parameters[0], parameters[1]) : guard_exports.IsEqual(ref, "Index") ? IndexDeferred(parameters[0], parameters[1]) : guard_exports.IsEqual(ref, "InstanceType") ? InstanceTypeDeferred(parameters[0]) : guard_exports.IsEqual(ref, "Lowercase") ? LowercaseDeferred(parameters[0]) : guard_exports.IsEqual(ref, "NonNullable") ? NonNullableDeferred(parameters[0]) : guard_exports.IsEqual(ref, "Omit") ? OmitDeferred(parameters[0], parameters[1]) : guard_exports.IsEqual(ref, "Parameters") ? ParametersDeferred(parameters[0]) : guard_exports.IsEqual(ref, "Partial") ? PartialDeferred(parameters[0]) : guard_exports.IsEqual(ref, "Pick") ? PickDeferred(parameters[0], parameters[1]) : guard_exports.IsEqual(ref, "Readonly") ? ReadonlyObjectDeferred(parameters[0]) : guard_exports.IsEqual(ref, "KeyOf") ? KeyOfDeferred(parameters[0]) : guard_exports.IsEqual(ref, "Record") ? RecordDeferred(parameters[0], parameters[1]) : guard_exports.IsEqual(ref, "Required") ? RequiredDeferred(parameters[0]) : guard_exports.IsEqual(ref, "ReturnType") ? ReturnTypeDeferred(parameters[0]) : guard_exports.IsEqual(ref, "Uncapitalize") ? UncapitalizeDeferred(parameters[0]) : guard_exports.IsEqual(ref, "Uppercase") ? UppercaseDeferred(parameters[0]) : CallConstruct(Ref(ref), parameters);
}
function Unreachable2() {
  throw Error("Unreachable");
}
var DelimitedDecode = (input, result = []) => {
  return input.reduce((result2, left) => {
    return guard_exports.IsArray(left) && guard_exports.IsEqual(left.length, 2) ? [...result2, left[0]] : [...result2, left];
  }, []);
};
var Delimited = (input) => {
  const [left, right] = input;
  return DelimitedDecode([...left, ...right]);
};
function GenericParameterExtendsEqualsMapping(input) {
  return Parameter(input[0], input[2], input[4]);
}
function GenericParameterExtendsMapping(input) {
  return Parameter(input[0], input[2], input[2]);
}
function GenericParameterEqualsMapping(input) {
  return Parameter(input[0], Unknown(), input[2]);
}
function GenericParameterIdentifierMapping(input) {
  return Parameter(input, Unknown(), Unknown());
}
function GenericParameterMapping(input) {
  return input;
}
function GenericParameterListMapping(input) {
  return Delimited(input);
}
function GenericParametersMapping(input) {
  return input[1];
}
function GenericCallArgumentListMapping(input) {
  return Delimited(input);
}
function GenericCallArgumentsMapping(input) {
  return input[1];
}
function GenericCallMapping(input) {
  return IntrinsicOrCall(input[0], input[1]);
}
function OptionalSemiColonMapping(input) {
  return null;
}
function KeywordStringMapping(input) {
  return String2();
}
function KeywordNumberMapping(input) {
  return Number2();
}
function KeywordBooleanMapping(input) {
  return Boolean2();
}
function KeywordUndefinedMapping(input) {
  return Undefined();
}
function KeywordNullMapping(input) {
  return Null();
}
function KeywordIntegerMapping(input) {
  return Integer();
}
function KeywordBigIntMapping(input) {
  return BigInt2();
}
function KeywordUnknownMapping(input) {
  return Unknown();
}
function KeywordAnyMapping(input) {
  return Any();
}
function KeywordObjectMapping(input) {
  return _Object_({});
}
function KeywordNeverMapping(input) {
  return Never();
}
function KeywordSymbolMapping(input) {
  return Symbol2();
}
function KeywordVoidMapping(input) {
  return Void();
}
function KeywordThisMapping(input) {
  return This();
}
function LiteralBigIntMapping(input) {
  return Literal(BigInt(input));
}
function LiteralBooleanMapping(input) {
  return Literal(guard_exports.IsEqual(input, "true"));
}
function LiteralNumberMapping(input) {
  return Literal(parseFloat(input));
}
function LiteralStringMapping(input) {
  return Literal(input);
}
function TemplateInterpolateMapping(input) {
  return input[1];
}
function TemplateSpanMapping(input) {
  return Literal(input);
}
function TemplateBodyMapping(input) {
  return guard_exports.IsEqual(input.length, 3) ? [input[0], input[1], ...input[2]] : [input[0]];
}
function TemplateLiteralTypesMapping(input) {
  return input[1];
}
function TemplateLiteralMapping(input) {
  return TemplateLiteralDeferred(input);
}
function DependentMapping(input) {
  return guard_exports.IsEqual(input.length, 6) ? Dependent(input[1], input[3], input[5]) : Dependent(input[1], input[3], Unknown());
}
function KeyOfMapping(input) {
  return input.length > 0;
}
function IndexArrayMapping(input) {
  return input.reduce((result, current) => {
    return guard_exports.IsEqual(current.length, 3) ? [...result, [current[1]]] : [...result, []];
  }, []);
}
function ExtendsMapping(input) {
  return guard_exports.IsEqual(input.length, 6) ? [input[1], input[3], input[5]] : [];
}
function BaseMapping(input) {
  return guard_exports.IsArray(input) && guard_exports.IsEqual(input.length, 3) ? input[1] : input;
}
function WithMapping(input) {
  return guard_exports.IsEqual(input.length, 2) ? input[1] : [];
}
function FactorIndexArray(Type2, indexArray) {
  return indexArray.reduce((result, left) => {
    const _left = left;
    return guard_exports.IsEqual(_left.length, 1) ? IndexDeferred(result, _left[0]) : guard_exports.IsEqual(_left.length, 0) ? _Array_(result) : Unreachable2();
  }, Type2);
}
function FactorExtends(type, extend) {
  return guard_exports.IsEqual(extend.length, 3) ? ConditionalDeferred(type, extend[0], extend[1], extend[2]) : type;
}
function FactorWith(type, withClause) {
  return guard_exports.IsArray(withClause) && guard_exports.IsEqual(withClause.length, 0) ? type : WithDeferred(type, withClause);
}
function FactorMapping(input) {
  const [keyOf, type, indexArray, extend, withClause] = input;
  return FactorWith(keyOf ? FactorExtends(KeyOfDeferred(FactorIndexArray(type, indexArray)), extend) : FactorExtends(FactorIndexArray(type, indexArray), extend), withClause);
}
function ExprBinaryMapping(left, rest) {
  return guard_exports.IsEqual(rest.length, 3) ? (() => {
    const [operator, right, next] = rest;
    const Schema = ExprBinaryMapping(right, next);
    if (guard_exports.IsEqual(operator, "&")) {
      return IsIntersect(Schema) ? Intersect([left, ...Schema.allOf]) : Intersect([left, Schema]);
    }
    if (guard_exports.IsEqual(operator, "|")) {
      return IsUnion(Schema) ? Union([left, ...Schema.anyOf]) : Union([left, Schema]);
    }
    Unreachable2();
  })() : left;
}
function ExprTermTailMapping(input) {
  return input;
}
function ExprTermMapping(input) {
  const [left, rest] = input;
  return ExprBinaryMapping(left, rest);
}
function ExprTailMapping(input) {
  return input;
}
function ExprMapping(input) {
  const [left, rest] = input;
  return ExprBinaryMapping(left, rest);
}
function ExprReadonlyMapping(input) {
  return AddImmutableDeferred(input[1]);
}
function ExprPipeMapping(input) {
  return input[1];
}
function GenericTypeMapping(input) {
  return Generic(input[0], input[2]);
}
function InferTypeMapping(input) {
  return guard_exports.IsEqual(input.length, 4) ? Infer(input[1], input[3]) : guard_exports.IsEqual(input.length, 2) ? Infer(input[1], Unknown()) : Unreachable2();
}
function TypeMapping(input) {
  return input;
}
function PropertyKeyNumberMapping(input) {
  return `${input}`;
}
function PropertyKeyIdentMapping(input) {
  return input;
}
function PropertyKeyQuotedMapping(input) {
  return input;
}
function PropertyKeyIndexMapping(input) {
  return IsInteger2(input[3]) ? IntegerKey : IsNumber3(input[3]) ? NumberKey : IsSymbol2(input[3]) ? StringKey : IsString3(input[3]) ? StringKey : Unreachable2();
}
function PropertyKeyMapping(input) {
  return input;
}
function ReadonlyMapping(input) {
  return input.length > 0;
}
function OptionalMapping(input) {
  return input.length > 0;
}
function PropertyMapping(input) {
  const [isReadonly, key, isOptional, _colon, type] = input;
  return {
    [key]: isReadonly && isOptional ? AddReadonlyDeferred(AddOptionalDeferred(type)) : isReadonly && !isOptional ? AddReadonlyDeferred(type) : !isReadonly && isOptional ? AddOptionalDeferred(type) : type
  };
}
function PropertyDelimiterMapping(input) {
  return input;
}
function PropertyListMapping(input) {
  return Delimited(input);
}
function PropertiesReduce(propertyList) {
  return propertyList.reduce((result, left) => {
    const isPatternProperties = guard_exports.HasPropertyKey(left, IntegerKey) || guard_exports.HasPropertyKey(left, NumberKey) || guard_exports.HasPropertyKey(left, StringKey);
    return isPatternProperties ? [result[0], memory_exports.Assign(result[1], left)] : [memory_exports.Assign(result[0], left), result[1]];
  }, [{}, {}]);
}
function PropertiesMapping(input) {
  return PropertiesReduce(input[1]);
}
function _Object_Mapping(input) {
  const [properties, patternProperties] = input;
  const options = guard_exports.IsEqual(guard_exports.Keys(patternProperties).length, 0) ? {} : { patternProperties };
  return _Object_(properties, options);
}
function ElementNamedMapping(input) {
  return guard_exports.IsEqual(input.length, 5) ? AddReadonlyDeferred(AddOptionalDeferred(input[4])) : guard_exports.IsEqual(input.length, 3) ? input[2] : guard_exports.IsEqual(input.length, 4) ? guard_exports.IsEqual(input[2], "readonly") ? AddReadonlyDeferred(input[3]) : AddOptionalDeferred(input[3]) : Unreachable2();
}
function ElementReadonlyOptionalMapping(input) {
  return AddReadonlyDeferred(AddOptionalDeferred(input[1]));
}
function ElementReadonlyMapping(input) {
  return AddReadonlyDeferred(input[1]);
}
function ElementOptionalMapping(input) {
  return AddOptionalDeferred(input[0]);
}
function ElementBaseMapping(input) {
  return input;
}
function ElementMapping(input) {
  return guard_exports.IsEqual(input.length, 2) ? Rest(input[1]) : guard_exports.IsEqual(input.length, 1) ? input[0] : Unreachable2();
}
function ElementListMapping(input) {
  return Delimited(input);
}
function _Tuple_Mapping(input) {
  return Tuple(input[1]);
}
function ParameterReadonlyOptionalMapping(input) {
  return AddReadonlyDeferred(AddOptionalDeferred(input[4]));
}
function ParameterReadonlyMapping(input) {
  return AddReadonlyDeferred(input[3]);
}
function ParameterOptionalMapping(input) {
  return AddOptionalDeferred(input[3]);
}
function ParameterTypeMapping(input) {
  return input[2];
}
function ParameterBaseMapping(input) {
  return input;
}
function ParameterMapping(input) {
  return guard_exports.IsEqual(input.length, 2) ? Rest(input[1]) : guard_exports.IsEqual(input.length, 1) ? input[0] : Unreachable2();
}
function ParameterListMapping(input) {
  return Delimited(input);
}
function _Function_Mapping(input) {
  return _Function_(input[1], input[4]);
}
function _Constructor_Mapping(input) {
  return Constructor(input[2], input[5]);
}
function ApplyReadonly(state, type) {
  return guard_exports.IsEqual(state, "remove") ? RemoveReadonlyDeferred(type) : guard_exports.IsEqual(state, "add") ? AddReadonlyDeferred(type) : type;
}
function MappedReadonlyMapping(input) {
  return guard_exports.IsEqual(input.length, 2) && guard_exports.IsEqual(input[0], "-") ? "remove" : guard_exports.IsEqual(input.length, 2) && guard_exports.IsEqual(input[0], "+") ? "add" : guard_exports.IsEqual(input.length, 1) ? "add" : "none";
}
function ApplyOptional(state, type) {
  return guard_exports.IsEqual(state, "remove") ? RemoveOptionalDeferred(type) : guard_exports.IsEqual(state, "add") ? AddOptionalDeferred(type) : type;
}
function MappedOptionalMapping(input) {
  return guard_exports.IsEqual(input.length, 2) && guard_exports.IsEqual(input[0], "-") ? "remove" : guard_exports.IsEqual(input.length, 2) && guard_exports.IsEqual(input[0], "+") ? "add" : guard_exports.IsEqual(input.length, 1) ? "add" : "none";
}
function MappedAsMapping(input) {
  return guard_exports.IsEqual(input.length, 2) ? [input[1]] : [];
}
function _Mapped_Mapping(input) {
  return guard_exports.IsArray(input[6]) && guard_exports.IsEqual(input[6].length, 1) ? MappedDeferred(Identifier(input[3]), input[5], input[6][0], ApplyReadonly(input[1], ApplyOptional(input[8], input[10]))) : MappedDeferred(Identifier(input[3]), input[5], Ref(input[3]), ApplyReadonly(input[1], ApplyOptional(input[8], input[10])));
}
function ReferenceMapping(input) {
  return Ref(input);
}
function WithBigIntMapping(input) {
  return BigInt(input);
}
function WithNumberMapping(input) {
  return parseFloat(input);
}
function WithBooleanMapping(input) {
  return guard_exports.IsEqual(input, "true");
}
function WithStringMapping(input) {
  return input;
}
function WithNullMapping(input) {
  return null;
}
function WithUndefinedMapping(input) {
  return void 0;
}
function WithPropertyMapping(input) {
  return { [input[0]]: input[2] };
}
function WithPropertyListMapping(input) {
  return Delimited(input);
}
function WithObjectMappingReduce(propertyList) {
  return propertyList.reduce((result, left) => {
    return memory_exports.Assign(result, left);
  }, {});
}
function WithObjectMapping(input) {
  return WithObjectMappingReduce(input[1]);
}
function WithElementListMapping(input) {
  return Delimited(input);
}
function WithArrayMapping(input) {
  return input[1];
}
function WithValueMapping(input) {
  return input;
}
function PatternBigIntMapping(input) {
  return BigInt2();
}
function PatternStringMapping(input) {
  return String2();
}
function PatternNumberMapping(input) {
  return Number2();
}
function PatternIntegerMapping(input) {
  return Integer();
}
function PatternNeverMapping(input) {
  return Never();
}
function PatternTextMapping(input) {
  return Literal(input);
}
function PatternBaseMapping(input) {
  return input;
}
function PatternGroupMapping(input) {
  return Union(input[1]);
}
function PatternUnionMapping(input) {
  return input.length === 3 ? [...input[0], ...input[2]] : input.length === 1 ? [...input[0]] : [];
}
function PatternTermMapping(input) {
  return [input[0], ...input[1]];
}
function PatternBodyMapping(input) {
  return input;
}
function PatternMapping(input) {
  return input[1];
}
function InterfaceDeclarationHeritageListMapping(input) {
  return Delimited(input);
}
function InterfaceDeclarationHeritageMapping(input) {
  return guard_exports.IsEqual(input.length, 2) ? input[1] : [];
}
function InterfaceDeclarationGenericMapping(input) {
  const parameters = input[2];
  const heritage = input[3];
  const [properties, patternProperties] = input[4];
  const options = guard_exports.IsEqual(guard_exports.Keys(patternProperties).length, 0) ? {} : { patternProperties };
  return { [input[1]]: Generic(parameters, InterfaceDeferred(heritage, properties, options)) };
}
function InterfaceDeclarationMapping(input) {
  const heritage = input[2];
  const [properties, patternProperties] = input[3];
  const options = guard_exports.IsEqual(guard_exports.Keys(patternProperties).length, 0) ? {} : { patternProperties };
  return { [input[1]]: InterfaceDeferred(heritage, properties, options) };
}
function TypeAliasDeclarationGenericMapping(input) {
  return { [input[1]]: Generic(input[2], input[4]) };
}
function TypeAliasDeclarationMapping(input) {
  return { [input[1]]: input[3] };
}
function ExportKeywordMapping(input) {
  return null;
}
function ModuleDeclarationDelimiterMapping(input) {
  return input;
}
function ModuleDeclarationListMapping(input) {
  return PropertiesReduce(Delimited(input));
}
function ModuleDeclarationMapping(input) {
  return input[1];
}
function ModuleMapping(input) {
  const moduleDeclaration = input[0];
  const moduleDeclarationList = input[1];
  return ModuleDeferred(memory_exports.Assign(moduleDeclaration, moduleDeclarationList[0]));
}
function ScriptMapping(input) {
  return input;
}

// node_modules/typebox/build/type/script/token/internal/match.mjs
function IsMatch(value) {
  return IsEqual(value.length, 2);
}
function Match2(input, ok, fail) {
  return IsMatch(input) ? ok(input[0], input[1]) : fail();
}

// node_modules/typebox/build/type/script/token/internal/take.mjs
function TakeVariant(variant, input) {
  return IsEqual(input.indexOf(variant), 0) ? [variant, input.slice(variant.length)] : [];
}
function Take(variants, input) {
  for (let i = 0; i < variants.length; i++) {
    const result = TakeVariant(variants[i], input);
    if (IsMatch(result))
      return result;
  }
  return [];
}

// node_modules/typebox/build/type/script/token/internal/char.mjs
function Range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, i) => String.fromCharCode(start + i));
}
var Alpha = [
  ...Range(97, 122),
  // Lowercase
  ...Range(65, 90)
  // Uppercase
];
var Zero = "0";
var NonZero = Range(49, 57);
var Digit = [Zero, ...NonZero];
var WhiteSpace = " ";
var NewLine = "\n";
var UnderScore = "_";
var Dot = ".";
var DollarSign = "$";
var Hyphen = "-";

// node_modules/typebox/build/type/script/token/internal/trim.mjs
var LineComment = "//";
var OpenComment = "/*";
var CloseComment = "*/";
function DiscardMultilineComment(input) {
  const index = input.indexOf(CloseComment);
  const result = IsEqual(index, -1) ? "" : input.slice(index + 2);
  return result;
}
function DiscardLineComment(input) {
  const index = input.indexOf(NewLine);
  const result = IsEqual(index, -1) ? "" : input.slice(index);
  return result;
}
function TrimStartUntilNewline(input) {
  return input.replace(/^[ \t\r\f\v]+/, "");
}
function TrimWhitespace(input) {
  const trimmed = TrimStartUntilNewline(input);
  return trimmed.startsWith(OpenComment) ? TrimWhitespace(DiscardMultilineComment(trimmed.slice(2))) : trimmed.startsWith(LineComment) ? TrimWhitespace(DiscardLineComment(trimmed.slice(2))) : trimmed;
}
function Trim(input) {
  const trimmed = input.trimStart();
  return trimmed.startsWith(OpenComment) ? Trim(DiscardMultilineComment(trimmed.slice(2))) : trimmed.startsWith(LineComment) ? Trim(DiscardLineComment(trimmed.slice(2))) : trimmed;
}

// node_modules/typebox/build/type/script/token/internal/optional.mjs
function Optional2(value, input) {
  return Match2(Take([value], input), (Optional4, Rest2) => [Optional4, Rest2], () => ["", input]);
}

// node_modules/typebox/build/type/script/token/internal/many.mjs
function IsDiscard(discard, input) {
  return discard.includes(input);
}
function Many(allowed, discard, input, result = "") {
  return Match2(Take(allowed, input), (Char, Rest2) => IsDiscard(discard, Char) ? Many(allowed, discard, Rest2, result) : Many(allowed, discard, Rest2, `${result}${Char}`), () => [result, input]);
}

// node_modules/typebox/build/type/script/token/unsigned_integer.mjs
function TakeNonZero(input) {
  return Take(NonZero, input);
}
var AllowedDigits = [...Digit, UnderScore];
function TakeDigits(input) {
  return Many(AllowedDigits, [UnderScore], input);
}
function TakeUnsignedInteger(input) {
  return Match2(Take([Zero], input), (Zero2, ZeroRest) => [Zero2, ZeroRest], () => Match2(
    TakeNonZero(input),
    (NonZero2, NonZeroRest) => Match2(TakeDigits(NonZeroRest), (Digits, DigitsRest) => [`${NonZero2}${Digits}`, DigitsRest], () => []),
    // fail: did not match Digits
    () => []
  ));
}
function UnsignedInteger(input) {
  return TakeUnsignedInteger(Trim(input));
}

// node_modules/typebox/build/type/script/token/integer.mjs
function TakeSign(input) {
  return Optional2(Hyphen, input);
}
function TakeSignedInteger(input) {
  return Match2(
    TakeSign(input),
    (Sign, SignRest) => Match2(UnsignedInteger(SignRest), (UnsignedInteger2, UnsignedIntegerRest) => [`${Sign}${UnsignedInteger2}`, UnsignedIntegerRest], () => []),
    // fail: did not match unsigned integer
    () => []
  );
}
function Integer2(input) {
  return TakeSignedInteger(Trim(input));
}

// node_modules/typebox/build/type/script/token/bigint.mjs
function TakeBigInt(input) {
  return Match2(
    Integer2(input),
    (Integer3, IntegerRest) => Match2(Take(["n"], IntegerRest), (_N, NRest) => [`${Integer3}`, NRest], () => []),
    // fail: did not match 'n'
    () => []
  );
}
function BigInt3(input) {
  return TakeBigInt(input);
}

// node_modules/typebox/build/type/script/token/const.mjs
function TakeConst(const_, input) {
  return Take([const_], input);
}
function Const(const_, input) {
  return IsEqual(const_, "") ? ["", input] : const_.startsWith(NewLine) ? TakeConst(const_, TrimWhitespace(input)) : const_.startsWith(WhiteSpace) ? TakeConst(const_, input) : TakeConst(const_, Trim(input));
}

// node_modules/typebox/build/type/script/token/ident.mjs
var Initial = [...Alpha, UnderScore, DollarSign];
function TakeInitial(input) {
  return Take(Initial, input);
}
var Remaining = [...Initial, ...Digit];
function TakeRemaining(input, result = "") {
  return Match2(Take(Remaining, input), (Remaining2, RemainingRest) => TakeRemaining(RemainingRest, `${result}${Remaining2}`), () => [result, input]);
}
function TakeIdent(input) {
  return Match2(
    TakeInitial(input),
    (Initial2, InitialRest) => Match2(TakeRemaining(InitialRest), (Remaining2, RemainingRest) => [`${Initial2}${Remaining2}`, RemainingRest], () => []),
    // fail: did not match Remaining
    () => []
  );
}
function Ident(input) {
  return TakeIdent(Trim(input));
}

// node_modules/typebox/build/type/script/token/unsigned_number.mjs
var AllowedDigits2 = [...Digit, UnderScore];
function IsLeadingDot(input) {
  return IsMatch(Take([Dot], input));
}
function TakeFractional(input) {
  return Match2(Many(AllowedDigits2, [UnderScore], input), (Digits, DigitsRest) => IsEqual(Digits, "") ? [] : [Digits, DigitsRest], () => []);
}
function LeadingDot(input) {
  return Match2(
    Take([Dot], input),
    (Dot2, DotRest) => Match2(TakeFractional(DotRest), (Fractional, FractionalRest) => [`0${Dot2}${Fractional}`, FractionalRest], () => []),
    // fail: did not match Fractional
    () => []
  );
}
function LeadingInteger(input) {
  return Match2(
    UnsignedInteger(input),
    (Integer3, IntegerRest) => Match2(
      Take([Dot], IntegerRest),
      (Dot2, DotRest) => Match2(TakeFractional(DotRest), (Fractional, FractionalRest) => [`${Integer3}${Dot2}${Fractional}`, FractionalRest], () => [`${Integer3}`, DotRest]),
      // fail: did not match Fractional, use Integer
      () => [`${Integer3}`, IntegerRest]
    ),
    // fail: did not match Dot, use Integer
    () => []
  );
}
function TakeUnsignedNumber(input) {
  return IsLeadingDot(input) ? LeadingDot(input) : LeadingInteger(input);
}
function UnsignedNumber(input) {
  return TakeUnsignedNumber(Trim(input));
}

// node_modules/typebox/build/type/script/token/number.mjs
function TakeSign2(input) {
  return Optional2(Hyphen, input);
}
function TakeSignedNumber(input) {
  return Match2(
    TakeSign2(input),
    (Sign, SignRest) => Match2(UnsignedNumber(SignRest), (UnsignedInteger2, UnsignedIntegerRest) => [`${Sign}${UnsignedInteger2}`, UnsignedIntegerRest], () => []),
    // fail: did not match unsigned integer
    () => []
  );
}
function Number3(input) {
  return TakeSignedNumber(Trim(input));
}

// node_modules/typebox/build/type/script/token/until.mjs
function TakeOne(input) {
  const result = IsEqual(input, "") ? [] : [input.slice(0, 1), input.slice(1)];
  return result;
}
function IsInputMatchSentinal(end, input) {
  return ShiftLeft(end, (left, right) => input.startsWith(left) ? true : IsInputMatchSentinal(right, input), () => false);
}
function Until(end, input, result = "") {
  return Match2(
    TakeOne(input),
    (One, Rest2) => IsInputMatchSentinal(end, input) ? [result, input] : Until(end, Rest2, `${result}${One}`),
    () => []
  );
}

// node_modules/typebox/build/type/script/token/span.mjs
function MultiLine(start, end, input) {
  return Match2(
    Take([start], input),
    (_, Rest2) => Match2(
      Until([end], Rest2),
      (Until2, UntilRest) => Match2(Take([end], UntilRest), (_2, Rest3) => [`${Until2}`, Rest3], () => []),
      // fail: did not match End
      () => []
    ),
    // fail: did not match Until
    () => []
  );
}
function SingleLine(start, end, input) {
  return Match2(
    Take([start], input),
    (_, Rest2) => Match2(
      Until([NewLine, end], Rest2),
      (Until2, UntilRest) => Match2(Take([end], UntilRest), (_2, EndRest) => [`${Until2}`, EndRest], () => []),
      // fail: did not match End
      () => []
    ),
    // fail: did not match Until
    () => []
  );
}
function Span(start, end, multiLine, input) {
  return multiLine ? MultiLine(start, end, Trim(input)) : SingleLine(start, end, Trim(input));
}

// node_modules/typebox/build/type/script/token/string.mjs
function TakeInitial2(quotes, input) {
  return Take(quotes, input);
}
function TakeSpan(quote, input) {
  return Span(quote, quote, false, input);
}
function TakeString(quotes, input) {
  return Match2(TakeInitial2(quotes, input), (Initial2, InitialRest) => TakeSpan(Initial2, `${Initial2}${InitialRest}`), () => []);
}
function String3(quotes, input) {
  return TakeString(quotes, Trim(input));
}

// node_modules/typebox/build/type/script/token/until_1.mjs
function Until_1(end, input) {
  return Match2(Until(end, input), (Until2, UntilRest) => IsEqual(Until2, "") ? [] : [Until2, UntilRest], () => []);
}

// node_modules/typebox/build/type/script/parser.mjs
var If = (result, left, right = () => []) => result.length === 2 ? left(result) : right();
var GenericParameterExtendsEquals = (input) => If(If(Ident(input), ([_0, input2]) => If(Const("extends", input2), ([_1, input3]) => If(Type(input3), ([_2, input4]) => If(Const("=", input4), ([_3, input5]) => If(Type(input5), ([_4, input6]) => [[_0, _1, _2, _3, _4], input6]))))), ([_0, input2]) => [GenericParameterExtendsEqualsMapping(_0), input2]);
var GenericParameterExtends = (input) => If(If(Ident(input), ([_0, input2]) => If(Const("extends", input2), ([_1, input3]) => If(Type(input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [GenericParameterExtendsMapping(_0), input2]);
var GenericParameterEquals = (input) => If(If(Ident(input), ([_0, input2]) => If(Const("=", input2), ([_1, input3]) => If(Type(input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [GenericParameterEqualsMapping(_0), input2]);
var GenericParameterIdentifier = (input) => If(Ident(input), ([_0, input2]) => [GenericParameterIdentifierMapping(_0), input2]);
var GenericParameter = (input) => If(If(GenericParameterExtendsEquals(input), ([_0, input2]) => [_0, input2], () => If(GenericParameterExtends(input), ([_0, input2]) => [_0, input2], () => If(GenericParameterEquals(input), ([_0, input2]) => [_0, input2], () => If(GenericParameterIdentifier(input), ([_0, input2]) => [_0, input2], () => [])))), ([_0, input2]) => [GenericParameterMapping(_0), input2]);
var GenericParameterList_0 = (input, result = []) => If(If(GenericParameter(input), ([_0, input2]) => If(Const(",", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => GenericParameterList_0(input2, [...result, _0]), () => [result, input]);
var GenericParameterList = (input) => If(If(GenericParameterList_0(input), ([_0, input2]) => If(If(If(GenericParameter(input2), ([_02, input3]) => [[_02], input3]), ([_02, input3]) => [_02, input3], () => If([[], input2], ([_02, input3]) => [_02, input3], () => [])), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [GenericParameterListMapping(_0), input2]);
var GenericParameters = (input) => If(If(Const("<", input), ([_0, input2]) => If(GenericParameterList(input2), ([_1, input3]) => If(Const(">", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [GenericParametersMapping(_0), input2]);
var GenericCallArgumentList_0 = (input, result = []) => If(If(Type(input), ([_0, input2]) => If(Const(",", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => GenericCallArgumentList_0(input2, [...result, _0]), () => [result, input]);
var GenericCallArgumentList = (input) => If(If(GenericCallArgumentList_0(input), ([_0, input2]) => If(If(If(Type(input2), ([_02, input3]) => [[_02], input3]), ([_02, input3]) => [_02, input3], () => If([[], input2], ([_02, input3]) => [_02, input3], () => [])), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [GenericCallArgumentListMapping(_0), input2]);
var GenericCallArguments = (input) => If(If(Const("<", input), ([_0, input2]) => If(GenericCallArgumentList(input2), ([_1, input3]) => If(Const(">", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [GenericCallArgumentsMapping(_0), input2]);
var GenericCall = (input) => If(If(Ident(input), ([_0, input2]) => If(GenericCallArguments(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [GenericCallMapping(_0), input2]);
var OptionalSemiColon = (input) => If(If(If(Const(";", input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => If([[], input], ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [OptionalSemiColonMapping(_0), input2]);
var KeywordString = (input) => If(Const("string", input), ([_0, input2]) => [KeywordStringMapping(_0), input2]);
var KeywordNumber = (input) => If(Const("number", input), ([_0, input2]) => [KeywordNumberMapping(_0), input2]);
var KeywordBoolean = (input) => If(Const("boolean", input), ([_0, input2]) => [KeywordBooleanMapping(_0), input2]);
var KeywordUndefined = (input) => If(Const("undefined", input), ([_0, input2]) => [KeywordUndefinedMapping(_0), input2]);
var KeywordNull = (input) => If(Const("null", input), ([_0, input2]) => [KeywordNullMapping(_0), input2]);
var KeywordInteger = (input) => If(Const("integer", input), ([_0, input2]) => [KeywordIntegerMapping(_0), input2]);
var KeywordBigInt = (input) => If(Const("bigint", input), ([_0, input2]) => [KeywordBigIntMapping(_0), input2]);
var KeywordUnknown = (input) => If(Const("unknown", input), ([_0, input2]) => [KeywordUnknownMapping(_0), input2]);
var KeywordAny = (input) => If(Const("any", input), ([_0, input2]) => [KeywordAnyMapping(_0), input2]);
var KeywordObject = (input) => If(Const("object", input), ([_0, input2]) => [KeywordObjectMapping(_0), input2]);
var KeywordNever = (input) => If(Const("never", input), ([_0, input2]) => [KeywordNeverMapping(_0), input2]);
var KeywordSymbol = (input) => If(Const("symbol", input), ([_0, input2]) => [KeywordSymbolMapping(_0), input2]);
var KeywordVoid = (input) => If(Const("void", input), ([_0, input2]) => [KeywordVoidMapping(_0), input2]);
var KeywordThis = (input) => If(Const("this", input), ([_0, input2]) => [KeywordThisMapping(_0), input2]);
var TemplateInterpolate = (input) => If(If(Const("${", input), ([_0, input2]) => If(Type(input2), ([_1, input3]) => If(Const("}", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [TemplateInterpolateMapping(_0), input2]);
var TemplateSpan = (input) => If(Until(["${", "`"], input), ([_0, input2]) => [TemplateSpanMapping(_0), input2]);
var TemplateBody = (input) => If(If(If(TemplateSpan(input), ([_0, input2]) => If(TemplateInterpolate(input2), ([_1, input3]) => If(TemplateBody(input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [_0, input2], () => If(If(TemplateSpan(input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => If(If(TemplateSpan(input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => []))), ([_0, input2]) => [TemplateBodyMapping(_0), input2]);
var TemplateLiteralTypes = (input) => If(If(Const("`", input), ([_0, input2]) => If(TemplateBody(input2), ([_1, input3]) => If(Const("`", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [TemplateLiteralTypesMapping(_0), input2]);
var TemplateLiteral = (input) => If(TemplateLiteralTypes(input), ([_0, input2]) => [TemplateLiteralMapping(_0), input2]);
var Dependent2 = (input) => If(If(If(Const("if", input), ([_0, input2]) => If(Type(input2), ([_1, input3]) => If(Const("then", input3), ([_2, input4]) => If(Type(input4), ([_3, input5]) => If(Const("else", input5), ([_4, input6]) => If(Type(input6), ([_5, input7]) => [[_0, _1, _2, _3, _4, _5], input7])))))), ([_0, input2]) => [_0, input2], () => If(If(Const("if", input), ([_0, input2]) => If(Type(input2), ([_1, input3]) => If(Const("then", input3), ([_2, input4]) => If(Type(input4), ([_3, input5]) => [[_0, _1, _2, _3], input5])))), ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [DependentMapping(_0), input2]);
var LiteralBigInt = (input) => If(BigInt3(input), ([_0, input2]) => [LiteralBigIntMapping(_0), input2]);
var LiteralBoolean = (input) => If(If(Const("true", input), ([_0, input2]) => [_0, input2], () => If(Const("false", input), ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [LiteralBooleanMapping(_0), input2]);
var LiteralNumber = (input) => If(Number3(input), ([_0, input2]) => [LiteralNumberMapping(_0), input2]);
var LiteralString = (input) => If(String3(["'", '"'], input), ([_0, input2]) => [LiteralStringMapping(_0), input2]);
var KeyOf = (input) => If(If(If(Const("keyof", input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => If([[], input], ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [KeyOfMapping(_0), input2]);
var IndexArray_0 = (input, result = []) => If(If(If(Const("[", input), ([_0, input2]) => If(Type(input2), ([_1, input3]) => If(Const("]", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [_0, input2], () => If(If(Const("[", input), ([_0, input2]) => If(Const("]", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => IndexArray_0(input2, [...result, _0]), () => [result, input]);
var IndexArray = (input) => If(IndexArray_0(input), ([_0, input2]) => [IndexArrayMapping(_0), input2]);
var Extends2 = (input) => If(If(If(Const("extends", input), ([_0, input2]) => If(Type(input2), ([_1, input3]) => If(Const("?", input3), ([_2, input4]) => If(Type(input4), ([_3, input5]) => If(Const(":", input5), ([_4, input6]) => If(Type(input6), ([_5, input7]) => [[_0, _1, _2, _3, _4, _5], input7])))))), ([_0, input2]) => [_0, input2], () => If([[], input], ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [ExtendsMapping(_0), input2]);
var Base = (input) => If(If(If(Const("(", input), ([_0, input2]) => If(Type(input2), ([_1, input3]) => If(Const(")", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [_0, input2], () => If(KeywordString(input), ([_0, input2]) => [_0, input2], () => If(KeywordNumber(input), ([_0, input2]) => [_0, input2], () => If(KeywordBoolean(input), ([_0, input2]) => [_0, input2], () => If(KeywordUndefined(input), ([_0, input2]) => [_0, input2], () => If(KeywordNull(input), ([_0, input2]) => [_0, input2], () => If(KeywordInteger(input), ([_0, input2]) => [_0, input2], () => If(KeywordBigInt(input), ([_0, input2]) => [_0, input2], () => If(KeywordUnknown(input), ([_0, input2]) => [_0, input2], () => If(KeywordAny(input), ([_0, input2]) => [_0, input2], () => If(KeywordObject(input), ([_0, input2]) => [_0, input2], () => If(KeywordNever(input), ([_0, input2]) => [_0, input2], () => If(KeywordSymbol(input), ([_0, input2]) => [_0, input2], () => If(KeywordVoid(input), ([_0, input2]) => [_0, input2], () => If(KeywordThis(input), ([_0, input2]) => [_0, input2], () => If(LiteralBigInt(input), ([_0, input2]) => [_0, input2], () => If(LiteralBoolean(input), ([_0, input2]) => [_0, input2], () => If(LiteralNumber(input), ([_0, input2]) => [_0, input2], () => If(LiteralString(input), ([_0, input2]) => [_0, input2], () => If(TemplateLiteral(input), ([_0, input2]) => [_0, input2], () => If(Dependent2(input), ([_0, input2]) => [_0, input2], () => If(_Object_2(input), ([_0, input2]) => [_0, input2], () => If(_Tuple_(input), ([_0, input2]) => [_0, input2], () => If(_Constructor_(input), ([_0, input2]) => [_0, input2], () => If(_Function_2(input), ([_0, input2]) => [_0, input2], () => If(_Mapped_(input), ([_0, input2]) => [_0, input2], () => If(GenericCall(input), ([_0, input2]) => [_0, input2], () => If(Reference(input), ([_0, input2]) => [_0, input2], () => [])))))))))))))))))))))))))))), ([_0, input2]) => [BaseMapping(_0), input2]);
var With = (input) => If(If(If(Const("with", input), ([_0, input2]) => If(WithObject(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => If([[], input], ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [WithMapping(_0), input2]);
var Factor = (input) => If(If(KeyOf(input), ([_0, input2]) => If(Base(input2), ([_1, input3]) => If(IndexArray(input3), ([_2, input4]) => If(Extends2(input4), ([_3, input5]) => If(With(input5), ([_4, input6]) => [[_0, _1, _2, _3, _4], input6]))))), ([_0, input2]) => [FactorMapping(_0), input2]);
var ExprTermTail = (input) => If(If(If(Const("&", input), ([_0, input2]) => If(Factor(input2), ([_1, input3]) => If(ExprTermTail(input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [_0, input2], () => If([[], input], ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [ExprTermTailMapping(_0), input2]);
var ExprTerm = (input) => If(If(Factor(input), ([_0, input2]) => If(ExprTermTail(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [ExprTermMapping(_0), input2]);
var ExprTail = (input) => If(If(If(Const("|", input), ([_0, input2]) => If(ExprTerm(input2), ([_1, input3]) => If(ExprTail(input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [_0, input2], () => If([[], input], ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [ExprTailMapping(_0), input2]);
var Expr = (input) => If(If(ExprTerm(input), ([_0, input2]) => If(ExprTail(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [ExprMapping(_0), input2]);
var ExprReadonly = (input) => If(If(Const("readonly", input), ([_0, input2]) => If(Expr(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [ExprReadonlyMapping(_0), input2]);
var ExprPipe = (input) => If(If(Const("|", input), ([_0, input2]) => If(Expr(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [ExprPipeMapping(_0), input2]);
var GenericType = (input) => If(If(GenericParameters(input), ([_0, input2]) => If(Const("=", input2), ([_1, input3]) => If(Type(input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [GenericTypeMapping(_0), input2]);
var InferType = (input) => If(If(If(Const("infer", input), ([_0, input2]) => If(Ident(input2), ([_1, input3]) => If(Const("extends", input3), ([_2, input4]) => If(Expr(input4), ([_3, input5]) => [[_0, _1, _2, _3], input5])))), ([_0, input2]) => [_0, input2], () => If(If(Const("infer", input), ([_0, input2]) => If(Ident(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [InferTypeMapping(_0), input2]);
var Type = (input) => If(If(InferType(input), ([_0, input2]) => [_0, input2], () => If(ExprPipe(input), ([_0, input2]) => [_0, input2], () => If(ExprReadonly(input), ([_0, input2]) => [_0, input2], () => If(Expr(input), ([_0, input2]) => [_0, input2], () => [])))), ([_0, input2]) => [TypeMapping(_0), input2]);
var PropertyKeyNumber = (input) => If(Number3(input), ([_0, input2]) => [PropertyKeyNumberMapping(_0), input2]);
var PropertyKeyIdent = (input) => If(Ident(input), ([_0, input2]) => [PropertyKeyIdentMapping(_0), input2]);
var PropertyKeyQuoted = (input) => If(String3(["'", '"'], input), ([_0, input2]) => [PropertyKeyQuotedMapping(_0), input2]);
var PropertyKeyIndex = (input) => If(If(Const("[", input), ([_0, input2]) => If(Ident(input2), ([_1, input3]) => If(Const(":", input3), ([_2, input4]) => If(If(KeywordInteger(input4), ([_02, input5]) => [_02, input5], () => If(KeywordNumber(input4), ([_02, input5]) => [_02, input5], () => If(KeywordString(input4), ([_02, input5]) => [_02, input5], () => If(KeywordSymbol(input4), ([_02, input5]) => [_02, input5], () => [])))), ([_3, input5]) => If(Const("]", input5), ([_4, input6]) => [[_0, _1, _2, _3, _4], input6]))))), ([_0, input2]) => [PropertyKeyIndexMapping(_0), input2]);
var PropertyKey = (input) => If(If(PropertyKeyNumber(input), ([_0, input2]) => [_0, input2], () => If(PropertyKeyIdent(input), ([_0, input2]) => [_0, input2], () => If(PropertyKeyQuoted(input), ([_0, input2]) => [_0, input2], () => If(PropertyKeyIndex(input), ([_0, input2]) => [_0, input2], () => [])))), ([_0, input2]) => [PropertyKeyMapping(_0), input2]);
var Readonly2 = (input) => If(If(If(Const("readonly", input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => If([[], input], ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [ReadonlyMapping(_0), input2]);
var Optional3 = (input) => If(If(If(Const("?", input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => If([[], input], ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [OptionalMapping(_0), input2]);
var Property = (input) => If(If(Readonly2(input), ([_0, input2]) => If(PropertyKey(input2), ([_1, input3]) => If(Optional3(input3), ([_2, input4]) => If(Const(":", input4), ([_3, input5]) => If(Type(input5), ([_4, input6]) => [[_0, _1, _2, _3, _4], input6]))))), ([_0, input2]) => [PropertyMapping(_0), input2]);
var PropertyDelimiter = (input) => If(If(If(Const(",", input), ([_0, input2]) => If(Const("\n", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => If(If(Const(";", input), ([_0, input2]) => If(Const("\n", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => If(If(Const(",", input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => If(If(Const(";", input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => If(If(Const("\n", input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => []))))), ([_0, input2]) => [PropertyDelimiterMapping(_0), input2]);
var PropertyList_0 = (input, result = []) => If(If(Property(input), ([_0, input2]) => If(PropertyDelimiter(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => PropertyList_0(input2, [...result, _0]), () => [result, input]);
var PropertyList = (input) => If(If(PropertyList_0(input), ([_0, input2]) => If(If(If(Property(input2), ([_02, input3]) => [[_02], input3]), ([_02, input3]) => [_02, input3], () => If([[], input2], ([_02, input3]) => [_02, input3], () => [])), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [PropertyListMapping(_0), input2]);
var Properties = (input) => If(If(Const("{", input), ([_0, input2]) => If(PropertyList(input2), ([_1, input3]) => If(Const("}", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [PropertiesMapping(_0), input2]);
var _Object_2 = (input) => If(Properties(input), ([_0, input2]) => [_Object_Mapping(_0), input2]);
var ElementNamed = (input) => If(If(If(Ident(input), ([_0, input2]) => If(Const("?", input2), ([_1, input3]) => If(Const(":", input3), ([_2, input4]) => If(Const("readonly", input4), ([_3, input5]) => If(Type(input5), ([_4, input6]) => [[_0, _1, _2, _3, _4], input6]))))), ([_0, input2]) => [_0, input2], () => If(If(Ident(input), ([_0, input2]) => If(Const(":", input2), ([_1, input3]) => If(Const("readonly", input3), ([_2, input4]) => If(Type(input4), ([_3, input5]) => [[_0, _1, _2, _3], input5])))), ([_0, input2]) => [_0, input2], () => If(If(Ident(input), ([_0, input2]) => If(Const("?", input2), ([_1, input3]) => If(Const(":", input3), ([_2, input4]) => If(Type(input4), ([_3, input5]) => [[_0, _1, _2, _3], input5])))), ([_0, input2]) => [_0, input2], () => If(If(Ident(input), ([_0, input2]) => If(Const(":", input2), ([_1, input3]) => If(Type(input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [_0, input2], () => [])))), ([_0, input2]) => [ElementNamedMapping(_0), input2]);
var ElementReadonlyOptional = (input) => If(If(Const("readonly", input), ([_0, input2]) => If(Type(input2), ([_1, input3]) => If(Const("?", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [ElementReadonlyOptionalMapping(_0), input2]);
var ElementReadonly = (input) => If(If(Const("readonly", input), ([_0, input2]) => If(Type(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [ElementReadonlyMapping(_0), input2]);
var ElementOptional = (input) => If(If(Type(input), ([_0, input2]) => If(Const("?", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [ElementOptionalMapping(_0), input2]);
var ElementBase = (input) => If(If(ElementNamed(input), ([_0, input2]) => [_0, input2], () => If(ElementReadonlyOptional(input), ([_0, input2]) => [_0, input2], () => If(ElementReadonly(input), ([_0, input2]) => [_0, input2], () => If(ElementOptional(input), ([_0, input2]) => [_0, input2], () => If(Type(input), ([_0, input2]) => [_0, input2], () => []))))), ([_0, input2]) => [ElementBaseMapping(_0), input2]);
var Element = (input) => If(If(If(Const("...", input), ([_0, input2]) => If(ElementBase(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => If(If(ElementBase(input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [ElementMapping(_0), input2]);
var ElementList_0 = (input, result = []) => If(If(Element(input), ([_0, input2]) => If(Const(",", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => ElementList_0(input2, [...result, _0]), () => [result, input]);
var ElementList = (input) => If(If(ElementList_0(input), ([_0, input2]) => If(If(If(Element(input2), ([_02, input3]) => [[_02], input3]), ([_02, input3]) => [_02, input3], () => If([[], input2], ([_02, input3]) => [_02, input3], () => [])), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [ElementListMapping(_0), input2]);
var _Tuple_ = (input) => If(If(Const("[", input), ([_0, input2]) => If(ElementList(input2), ([_1, input3]) => If(Const("]", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [_Tuple_Mapping(_0), input2]);
var ParameterReadonlyOptional = (input) => If(If(Ident(input), ([_0, input2]) => If(Const("?", input2), ([_1, input3]) => If(Const(":", input3), ([_2, input4]) => If(Const("readonly", input4), ([_3, input5]) => If(Type(input5), ([_4, input6]) => [[_0, _1, _2, _3, _4], input6]))))), ([_0, input2]) => [ParameterReadonlyOptionalMapping(_0), input2]);
var ParameterReadonly = (input) => If(If(Ident(input), ([_0, input2]) => If(Const(":", input2), ([_1, input3]) => If(Const("readonly", input3), ([_2, input4]) => If(Type(input4), ([_3, input5]) => [[_0, _1, _2, _3], input5])))), ([_0, input2]) => [ParameterReadonlyMapping(_0), input2]);
var ParameterOptional = (input) => If(If(Ident(input), ([_0, input2]) => If(Const("?", input2), ([_1, input3]) => If(Const(":", input3), ([_2, input4]) => If(Type(input4), ([_3, input5]) => [[_0, _1, _2, _3], input5])))), ([_0, input2]) => [ParameterOptionalMapping(_0), input2]);
var ParameterType = (input) => If(If(Ident(input), ([_0, input2]) => If(Const(":", input2), ([_1, input3]) => If(Type(input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [ParameterTypeMapping(_0), input2]);
var ParameterBase = (input) => If(If(ParameterReadonlyOptional(input), ([_0, input2]) => [_0, input2], () => If(ParameterReadonly(input), ([_0, input2]) => [_0, input2], () => If(ParameterOptional(input), ([_0, input2]) => [_0, input2], () => If(ParameterType(input), ([_0, input2]) => [_0, input2], () => [])))), ([_0, input2]) => [ParameterBaseMapping(_0), input2]);
var Parameter2 = (input) => If(If(If(Const("...", input), ([_0, input2]) => If(ParameterBase(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => If(If(ParameterBase(input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [ParameterMapping(_0), input2]);
var ParameterList_0 = (input, result = []) => If(If(Parameter2(input), ([_0, input2]) => If(Const(",", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => ParameterList_0(input2, [...result, _0]), () => [result, input]);
var ParameterList = (input) => If(If(ParameterList_0(input), ([_0, input2]) => If(If(If(Parameter2(input2), ([_02, input3]) => [[_02], input3]), ([_02, input3]) => [_02, input3], () => If([[], input2], ([_02, input3]) => [_02, input3], () => [])), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [ParameterListMapping(_0), input2]);
var _Function_2 = (input) => If(If(Const("(", input), ([_0, input2]) => If(ParameterList(input2), ([_1, input3]) => If(Const(")", input3), ([_2, input4]) => If(Const("=>", input4), ([_3, input5]) => If(Type(input5), ([_4, input6]) => [[_0, _1, _2, _3, _4], input6]))))), ([_0, input2]) => [_Function_Mapping(_0), input2]);
var _Constructor_ = (input) => If(If(Const("new", input), ([_0, input2]) => If(Const("(", input2), ([_1, input3]) => If(ParameterList(input3), ([_2, input4]) => If(Const(")", input4), ([_3, input5]) => If(Const("=>", input5), ([_4, input6]) => If(Type(input6), ([_5, input7]) => [[_0, _1, _2, _3, _4, _5], input7])))))), ([_0, input2]) => [_Constructor_Mapping(_0), input2]);
var MappedReadonly = (input) => If(If(If(Const("+", input), ([_0, input2]) => If(Const("readonly", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => If(If(Const("-", input), ([_0, input2]) => If(Const("readonly", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => If(If(Const("readonly", input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => If([[], input], ([_0, input2]) => [_0, input2], () => [])))), ([_0, input2]) => [MappedReadonlyMapping(_0), input2]);
var MappedOptional = (input) => If(If(If(Const("+", input), ([_0, input2]) => If(Const("?", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => If(If(Const("-", input), ([_0, input2]) => If(Const("?", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => If(If(Const("?", input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => If([[], input], ([_0, input2]) => [_0, input2], () => [])))), ([_0, input2]) => [MappedOptionalMapping(_0), input2]);
var MappedAs = (input) => If(If(If(Const("as", input), ([_0, input2]) => If(Type(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => If([[], input], ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [MappedAsMapping(_0), input2]);
var _Mapped_ = (input) => If(If(Const("{", input), ([_0, input2]) => If(MappedReadonly(input2), ([_1, input3]) => If(Const("[", input3), ([_2, input4]) => If(Ident(input4), ([_3, input5]) => If(Const("in", input5), ([_4, input6]) => If(Type(input6), ([_5, input7]) => If(MappedAs(input7), ([_6, input8]) => If(Const("]", input8), ([_7, input9]) => If(MappedOptional(input9), ([_8, input10]) => If(Const(":", input10), ([_9, input11]) => If(Type(input11), ([_10, input12]) => If(OptionalSemiColon(input12), ([_11, input13]) => If(Const("}", input13), ([_12, input14]) => [[_0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12], input14]))))))))))))), ([_0, input2]) => [_Mapped_Mapping(_0), input2]);
var Reference = (input) => If(Ident(input), ([_0, input2]) => [ReferenceMapping(_0), input2]);
var WithBigInt = (input) => If(BigInt3(input), ([_0, input2]) => [WithBigIntMapping(_0), input2]);
var WithNumber = (input) => If(Number3(input), ([_0, input2]) => [WithNumberMapping(_0), input2]);
var WithBoolean = (input) => If(If(Const("true", input), ([_0, input2]) => [_0, input2], () => If(Const("false", input), ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [WithBooleanMapping(_0), input2]);
var WithString = (input) => If(String3(['"', "'"], input), ([_0, input2]) => [WithStringMapping(_0), input2]);
var WithNull = (input) => If(Const("null", input), ([_0, input2]) => [WithNullMapping(_0), input2]);
var WithUndefined = (input) => If(Const("undefined", input), ([_0, input2]) => [WithUndefinedMapping(_0), input2]);
var WithProperty = (input) => If(If(PropertyKey(input), ([_0, input2]) => If(Const(":", input2), ([_1, input3]) => If(WithValue(input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [WithPropertyMapping(_0), input2]);
var WithPropertyList_0 = (input, result = []) => If(If(WithProperty(input), ([_0, input2]) => If(PropertyDelimiter(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => WithPropertyList_0(input2, [...result, _0]), () => [result, input]);
var WithPropertyList = (input) => If(If(WithPropertyList_0(input), ([_0, input2]) => If(If(If(WithProperty(input2), ([_02, input3]) => [[_02], input3]), ([_02, input3]) => [_02, input3], () => If([[], input2], ([_02, input3]) => [_02, input3], () => [])), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [WithPropertyListMapping(_0), input2]);
var WithObject = (input) => If(If(Const("{", input), ([_0, input2]) => If(WithPropertyList(input2), ([_1, input3]) => If(Const("}", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [WithObjectMapping(_0), input2]);
var WithElementList_0 = (input, result = []) => If(If(WithValue(input), ([_0, input2]) => If(Const(",", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => WithElementList_0(input2, [...result, _0]), () => [result, input]);
var WithElementList = (input) => If(If(WithElementList_0(input), ([_0, input2]) => If(If(If(WithValue(input2), ([_02, input3]) => [[_02], input3]), ([_02, input3]) => [_02, input3], () => If([[], input2], ([_02, input3]) => [_02, input3], () => [])), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [WithElementListMapping(_0), input2]);
var WithArray = (input) => If(If(Const("[", input), ([_0, input2]) => If(WithElementList(input2), ([_1, input3]) => If(Const("]", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [WithArrayMapping(_0), input2]);
var WithValue = (input) => If(If(WithBigInt(input), ([_0, input2]) => [_0, input2], () => If(WithNumber(input), ([_0, input2]) => [_0, input2], () => If(WithBoolean(input), ([_0, input2]) => [_0, input2], () => If(WithString(input), ([_0, input2]) => [_0, input2], () => If(WithNull(input), ([_0, input2]) => [_0, input2], () => If(WithUndefined(input), ([_0, input2]) => [_0, input2], () => If(WithObject(input), ([_0, input2]) => [_0, input2], () => If(WithArray(input), ([_0, input2]) => [_0, input2], () => [])))))))), ([_0, input2]) => [WithValueMapping(_0), input2]);
var PatternBigInt = (input) => If(Const("-?(?:0|[1-9][0-9]*)n", input), ([_0, input2]) => [PatternBigIntMapping(_0), input2]);
var PatternString = (input) => If(Const(".*", input), ([_0, input2]) => [PatternStringMapping(_0), input2]);
var PatternNumber = (input) => If(Const("-?(?:0|[1-9][0-9]*)(?:\\.[0-9]+)?", input), ([_0, input2]) => [PatternNumberMapping(_0), input2]);
var PatternInteger = (input) => If(Const("-?(?:0|[1-9][0-9]*)", input), ([_0, input2]) => [PatternIntegerMapping(_0), input2]);
var PatternNever = (input) => If(Const("(?!)", input), ([_0, input2]) => [PatternNeverMapping(_0), input2]);
var PatternText = (input) => If(Until_1(["-?(?:0|[1-9][0-9]*)n", ".*", "-?(?:0|[1-9][0-9]*)(?:\\.[0-9]+)?", "-?(?:0|[1-9][0-9]*)", "(?!)", "(", ")", "$", "|"], input), ([_0, input2]) => [PatternTextMapping(_0), input2]);
var PatternBase = (input) => If(If(PatternBigInt(input), ([_0, input2]) => [_0, input2], () => If(PatternString(input), ([_0, input2]) => [_0, input2], () => If(PatternNumber(input), ([_0, input2]) => [_0, input2], () => If(PatternInteger(input), ([_0, input2]) => [_0, input2], () => If(PatternNever(input), ([_0, input2]) => [_0, input2], () => If(PatternGroup(input), ([_0, input2]) => [_0, input2], () => If(PatternText(input), ([_0, input2]) => [_0, input2], () => []))))))), ([_0, input2]) => [PatternBaseMapping(_0), input2]);
var PatternGroup = (input) => If(If(Const("(", input), ([_0, input2]) => If(PatternBody(input2), ([_1, input3]) => If(Const(")", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [PatternGroupMapping(_0), input2]);
var PatternUnion = (input) => If(If(If(PatternTerm(input), ([_0, input2]) => If(Const("|", input2), ([_1, input3]) => If(PatternUnion(input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [_0, input2], () => If(If(PatternTerm(input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => If([[], input], ([_0, input2]) => [_0, input2], () => []))), ([_0, input2]) => [PatternUnionMapping(_0), input2]);
var PatternTerm = (input) => If(If(PatternBase(input), ([_0, input2]) => If(PatternBody(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [PatternTermMapping(_0), input2]);
var PatternBody = (input) => If(If(PatternUnion(input), ([_0, input2]) => [_0, input2], () => If(PatternTerm(input), ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [PatternBodyMapping(_0), input2]);
var Pattern = (input) => If(If(Const("^", input), ([_0, input2]) => If(PatternBody(input2), ([_1, input3]) => If(Const("$", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [PatternMapping(_0), input2]);
var InterfaceDeclarationHeritageList_0 = (input, result = []) => If(If(Type(input), ([_0, input2]) => If(Const(",", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => InterfaceDeclarationHeritageList_0(input2, [...result, _0]), () => [result, input]);
var InterfaceDeclarationHeritageList = (input) => If(If(InterfaceDeclarationHeritageList_0(input), ([_0, input2]) => If(If(If(Type(input2), ([_02, input3]) => [[_02], input3]), ([_02, input3]) => [_02, input3], () => If([[], input2], ([_02, input3]) => [_02, input3], () => [])), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [InterfaceDeclarationHeritageListMapping(_0), input2]);
var InterfaceDeclarationHeritage = (input) => If(If(If(Const("extends", input), ([_0, input2]) => If(InterfaceDeclarationHeritageList(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => If([[], input], ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [InterfaceDeclarationHeritageMapping(_0), input2]);
var InterfaceDeclarationGeneric = (input) => If(If(Const("interface", input), ([_0, input2]) => If(Ident(input2), ([_1, input3]) => If(GenericParameters(input3), ([_2, input4]) => If(InterfaceDeclarationHeritage(input4), ([_3, input5]) => If(Properties(input5), ([_4, input6]) => [[_0, _1, _2, _3, _4], input6]))))), ([_0, input2]) => [InterfaceDeclarationGenericMapping(_0), input2]);
var InterfaceDeclaration = (input) => If(If(Const("interface", input), ([_0, input2]) => If(Ident(input2), ([_1, input3]) => If(InterfaceDeclarationHeritage(input3), ([_2, input4]) => If(Properties(input4), ([_3, input5]) => [[_0, _1, _2, _3], input5])))), ([_0, input2]) => [InterfaceDeclarationMapping(_0), input2]);
var TypeAliasDeclarationGeneric = (input) => If(If(Const("type", input), ([_0, input2]) => If(Ident(input2), ([_1, input3]) => If(GenericParameters(input3), ([_2, input4]) => If(Const("=", input4), ([_3, input5]) => If(Type(input5), ([_4, input6]) => [[_0, _1, _2, _3, _4], input6]))))), ([_0, input2]) => [TypeAliasDeclarationGenericMapping(_0), input2]);
var TypeAliasDeclaration = (input) => If(If(Const("type", input), ([_0, input2]) => If(Ident(input2), ([_1, input3]) => If(Const("=", input3), ([_2, input4]) => If(Type(input4), ([_3, input5]) => [[_0, _1, _2, _3], input5])))), ([_0, input2]) => [TypeAliasDeclarationMapping(_0), input2]);
var ExportKeyword = (input) => If(If(If(Const("export", input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => If([[], input], ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [ExportKeywordMapping(_0), input2]);
var ModuleDeclarationDelimiter = (input) => If(If(If(Const(";", input), ([_0, input2]) => If(Const("\n", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => If(If(Const(";", input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => If(If(Const("\n", input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => []))), ([_0, input2]) => [ModuleDeclarationDelimiterMapping(_0), input2]);
var ModuleDeclarationList_0 = (input, result = []) => If(If(ModuleDeclaration(input), ([_0, input2]) => If(ModuleDeclarationDelimiter(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => ModuleDeclarationList_0(input2, [...result, _0]), () => [result, input]);
var ModuleDeclarationList = (input) => If(If(ModuleDeclarationList_0(input), ([_0, input2]) => If(If(If(ModuleDeclaration(input2), ([_02, input3]) => [[_02], input3]), ([_02, input3]) => [_02, input3], () => If([[], input2], ([_02, input3]) => [_02, input3], () => [])), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [ModuleDeclarationListMapping(_0), input2]);
var ModuleDeclaration = (input) => If(If(ExportKeyword(input), ([_0, input2]) => If(If(InterfaceDeclarationGeneric(input2), ([_02, input3]) => [_02, input3], () => If(InterfaceDeclaration(input2), ([_02, input3]) => [_02, input3], () => If(TypeAliasDeclarationGeneric(input2), ([_02, input3]) => [_02, input3], () => If(TypeAliasDeclaration(input2), ([_02, input3]) => [_02, input3], () => [])))), ([_1, input3]) => If(OptionalSemiColon(input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [ModuleDeclarationMapping(_0), input2]);
var Module = (input) => If(If(ModuleDeclaration(input), ([_0, input2]) => If(ModuleDeclarationList(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [ModuleMapping(_0), input2]);
var Script = (input) => If(If(Module(input), ([_0, input2]) => [_0, input2], () => If(GenericType(input), ([_0, input2]) => [_0, input2], () => If(Type(input), ([_0, input2]) => [_0, input2], () => []))), ([_0, input2]) => [ScriptMapping(_0), input2]);

// node_modules/typebox/build/type/engine/patterns/template.mjs
function ParseTemplateIntoTypes(template) {
  const parsed = TemplateLiteralTypes(`\`${template}\``);
  const result = guard_exports.IsEqual(parsed.length, 2) ? parsed[0] : Unreachable();
  return result;
}

// node_modules/typebox/build/type/engine/template_literal/encode.mjs
function JoinString(input) {
  return input.join("|");
}
function UnwrapTemplateLiteralPattern(pattern) {
  return pattern.slice(1, pattern.length - 1);
}
function EncodeLiteral(value, right, pattern) {
  return EncodeTypes(right, `${pattern}${value}`);
}
function EncodeBigInt(right, pattern) {
  return EncodeTypes(right, `${pattern}${BigIntPattern}`);
}
function EncodeInteger(right, pattern) {
  return EncodeTypes(right, `${pattern}${IntegerPattern}`);
}
function EncodeNumber(right, pattern) {
  return EncodeTypes(right, `${pattern}${NumberPattern}`);
}
function EncodeBoolean(right, pattern) {
  return EncodeType(Union([Literal("false"), Literal("true")]), right, pattern);
}
function EncodeString(right, pattern) {
  return EncodeTypes(right, `${pattern}${StringPattern}`);
}
function EncodeTemplateLiteral(templatePattern, right, pattern) {
  return EncodeTypes(right, `${pattern}${UnwrapTemplateLiteralPattern(templatePattern)}`);
}
function EncodeTemplateLiteralDeferred(types, right, pattern) {
  const templateLiteral = TemplateLiteralAction(types, {});
  const result = EncodeType(templateLiteral, right, pattern);
  return result;
}
function EncodeEnum(values, right, pattern) {
  const evaluated = EvaluateEnum(values);
  return EncodeType(evaluated, right, pattern);
}
function EncodeUnion(types, right, pattern, result = []) {
  return guard_exports.ShiftLeft(types, (head, tail) => EncodeUnion(tail, right, pattern, [...result, EncodeType(head, [], "")]), () => EncodeTypes(right, `${pattern}(${JoinString(result)})`));
}
function EncodeType(type, right, pattern) {
  return IsEnum(type) ? EncodeEnum(type.enum, right, pattern) : IsInteger2(type) ? EncodeInteger(right, pattern) : IsLiteral(type) ? EncodeLiteral(type.const, right, pattern) : IsBigInt2(type) ? EncodeBigInt(right, pattern) : IsBoolean3(type) ? EncodeBoolean(right, pattern) : IsNumber3(type) ? EncodeNumber(right, pattern) : IsString3(type) ? EncodeString(right, pattern) : IsTemplateLiteral(type) ? EncodeTemplateLiteral(type.pattern, right, pattern) : IsTemplateLiteralDeferred(type) ? EncodeTemplateLiteralDeferred(type.parameters[0], right, pattern) : IsUnion(type) ? EncodeUnion(type.anyOf, right, pattern) : NeverPattern;
}
function EncodeTypes(types, pattern) {
  return guard_exports.ShiftLeft(types, (left, right) => EncodeType(left, right, pattern), () => pattern);
}
function EncodePattern(types) {
  const encoded = EncodeTypes(types, "");
  const result = `^${encoded}$`;
  return result;
}
function TemplateLiteralEncode(types) {
  const pattern = EncodePattern(types);
  const result = TemplateLiteralCreate(pattern);
  return result;
}

// node_modules/typebox/build/type/engine/template_literal/instantiate.mjs
function TemplateLiteralAction(types, options) {
  const result = CanInstantiate(types) ? memory_exports.Update(TemplateLiteralEncode(types), {}, options) : TemplateLiteralDeferred(types, options);
  return result;
}
function TemplateLiteralInstantiate(context, state, types, options) {
  const instantiatedTypes = InstantiateTypes(context, state, types);
  return TemplateLiteralAction(instantiatedTypes, options);
}

// node_modules/typebox/build/type/types/template_literal.mjs
function TemplateLiteralDeferred(types, options = {}) {
  return Deferred("TemplateLiteral", [types], options);
}
function IsTemplateLiteralDeferred(value) {
  return IsSchema(value) && guard_exports.HasPropertyKey(value, "action") && guard_exports.IsEqual(value.action, "TemplateLiteral");
}
function TemplateLiteralFromTypes(types) {
  return TemplateLiteralAction(types, {});
}
function TemplateLiteralFromString(template) {
  const types = ParseTemplateIntoTypes(template);
  return TemplateLiteralFromTypes(types);
}
function TemplateLiteral2(input, options = {}) {
  const type = guard_exports.IsString(input) ? TemplateLiteralFromString(input) : TemplateLiteralFromTypes(input);
  return memory_exports.Update(type, {}, options);
}
function IsTemplateLiteral(value) {
  return IsKind(value, "TemplateLiteral");
}

// node_modules/typebox/build/type/extends/result.mjs
var result_exports = {};
__export(result_exports, {
  ExtendsFalse: () => ExtendsFalse,
  ExtendsTrue: () => ExtendsTrue,
  ExtendsUnion: () => ExtendsUnion,
  IsExtendsFalse: () => IsExtendsFalse,
  IsExtendsTrue: () => IsExtendsTrue,
  IsExtendsTrueLike: () => IsExtendsTrueLike,
  IsExtendsUnion: () => IsExtendsUnion,
  Match: () => Match3
});
function ExtendsUnion(inferred) {
  return memory_exports.Create({ ["~kind"]: "ExtendsUnion" }, { inferred });
}
function IsExtendsUnion(value) {
  return guard_exports.IsObject(value) && guard_exports.HasPropertyKey(value, "~kind") && guard_exports.HasPropertyKey(value, "inferred") && guard_exports.IsEqual(value["~kind"], "ExtendsUnion") && guard_exports.IsObject(value.inferred);
}
function ExtendsTrue(inferred) {
  return memory_exports.Create({ ["~kind"]: "ExtendsTrue" }, { inferred });
}
function IsExtendsTrue(value) {
  return guard_exports.IsObject(value) && guard_exports.HasPropertyKey(value, "~kind") && guard_exports.HasPropertyKey(value, "inferred") && guard_exports.IsEqual(value["~kind"], "ExtendsTrue") && guard_exports.IsObject(value.inferred);
}
function ExtendsFalse() {
  return memory_exports.Create({ ["~kind"]: "ExtendsFalse" }, {});
}
function IsExtendsFalse(value) {
  return guard_exports.IsObject(value) && guard_exports.HasPropertyKey(value, "~kind") && guard_exports.IsEqual(value["~kind"], "ExtendsFalse");
}
function IsExtendsTrueLike(value) {
  return IsExtendsUnion(value) || IsExtendsTrue(value);
}
function Match3(result, true_, false_) {
  return IsExtendsTrueLike(result) ? true_(result.inferred) : false_();
}

// node_modules/typebox/build/type/extends/extends_right.mjs
function ExtendsRightInfer(inferred, name, left, right) {
  return Match3(ExtendsLeft(inferred, left, right), (checkInferred) => ExtendsTrue(memory_exports.Assign(memory_exports.Assign(inferred, checkInferred), { [name]: left })), () => ExtendsFalse());
}
function ExtendsRightAny(inferred, _left) {
  return ExtendsTrue(inferred);
}
function ExtendsRightDependent(inferred, left, if_, then_, else_) {
  return Match3(ExtendsLeft(inferred, left, if_), (inferred2) => Match3(ExtendsLeft(inferred2, left, then_), (inferred3) => ExtendsTrue(inferred3), () => ExtendsFalse()), () => Match3(ExtendsLeft(inferred, left, else_), (inferred2) => ExtendsTrue(inferred2), () => ExtendsFalse()));
}
function ExtendsRightEnum(inferred, left, right) {
  const evaluated = EvaluateEnum(right);
  return ExtendsLeft(inferred, left, evaluated);
}
function ExtendsRightIntersect(inferred, left, right) {
  return guard_exports.ShiftLeft(right, (head, tail) => Match3(ExtendsLeft(inferred, left, head), (inferred2) => ExtendsRightIntersect(inferred2, left, tail), () => ExtendsFalse()), () => ExtendsTrue(inferred));
}
function ExtendsRightTemplateLiteral(inferred, left, right) {
  const evaluated = EvaluateTemplateLiteral(right);
  return ExtendsLeft(inferred, left, evaluated);
}
function ExtendsRightUnion(inferred, left, right) {
  return guard_exports.ShiftLeft(right, (head, tail) => Match3(ExtendsLeft(inferred, left, head), (inferred2) => ExtendsTrue(inferred2), () => ExtendsRightUnion(inferred, left, tail)), () => ExtendsFalse());
}
function ExtendsRight(inferred, left, right) {
  return IsAny(right) ? ExtendsRightAny(inferred, left) : IsDependent(right) ? ExtendsRightDependent(inferred, left, right.if, right.then, right.else) : IsEnum(right) ? ExtendsRightEnum(inferred, left, right.enum) : IsInfer(right) ? ExtendsRightInfer(inferred, right.name, left, right.extends) : IsIntersect(right) ? ExtendsRightIntersect(inferred, left, right.allOf) : IsTemplateLiteral(right) ? ExtendsRightTemplateLiteral(inferred, left, right.pattern) : IsUnion(right) ? ExtendsRightUnion(inferred, left, right.anyOf) : IsUnknown(right) ? ExtendsTrue(inferred) : ExtendsFalse();
}

// node_modules/typebox/build/type/extends/any.mjs
function ExtendsAny(inferred, left, right) {
  return IsInfer(right) ? ExtendsRight(inferred, left, right) : IsAny(right) ? ExtendsTrue(inferred) : IsUnknown(right) ? ExtendsTrue(inferred) : ExtendsUnion(inferred);
}

// node_modules/typebox/build/type/extends/array.mjs
function ExtendsImmutable(left, right) {
  const isImmutableLeft = IsImmutable(left);
  const isImmutableRight = IsImmutable(right);
  return isImmutableLeft && isImmutableRight ? true : !isImmutableLeft && isImmutableRight ? true : isImmutableLeft && !isImmutableRight ? false : true;
}
function ExtendsArray(inferred, arrayLeft, left, right) {
  return IsArray2(right) ? ExtendsImmutable(arrayLeft, right) ? ExtendsLeft(inferred, left, right.items) : ExtendsFalse() : ExtendsRight(inferred, arrayLeft, right);
}

// node_modules/typebox/build/type/extends/bigint.mjs
function ExtendsBigInt(inferred, left, right) {
  return IsBigInt2(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, left, right);
}

// node_modules/typebox/build/type/extends/boolean.mjs
function ExtendsBoolean(inferred, left, right) {
  return IsBoolean3(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, left, right);
}

// node_modules/typebox/build/type/extends/parameters.mjs
function ParameterCompare(inferred, left, leftRest, right, rightRest) {
  const checkLeft = IsInfer(right) ? left : right;
  const checkRight = IsInfer(right) ? right : left;
  const isLeftOptional = IsOptional(left);
  const isRightOptional = IsOptional(right);
  return !isLeftOptional && isRightOptional ? ExtendsFalse() : Match3(ExtendsLeft(inferred, checkLeft, checkRight), (inferred2) => ExtendsParameters(inferred2, leftRest, rightRest), () => ExtendsFalse());
}
function ParameterRight(inferred, left, leftRest, rightRest) {
  return guard_exports.ShiftLeft(rightRest, (head, tail) => ParameterCompare(inferred, left, leftRest, head, tail), () => IsOptional(left) ? ExtendsTrue(inferred) : ExtendsFalse());
}
function ParametersLeft(inferred, left, rightRest) {
  return guard_exports.ShiftLeft(left, (head, tail) => ParameterRight(inferred, head, tail, rightRest), () => ExtendsTrue(inferred));
}
function ExtendsParameters(inferred, left, right) {
  return ParametersLeft(inferred, left, right);
}

// node_modules/typebox/build/type/extends/return_type.mjs
function ExtendsReturnType(inferred, left, right) {
  return IsVoid(right) ? ExtendsTrue(inferred) : ExtendsLeft(inferred, left, right);
}

// node_modules/typebox/build/type/extends/constructor.mjs
function ExtendsConstructor(inferred, parameters, returnType, right) {
  return IsAny(right) ? ExtendsTrue(inferred) : IsUnknown(right) ? ExtendsTrue(inferred) : IsConstructor2(right) ? Match3(ExtendsParameters(inferred, parameters, right["parameters"]), (inferred2) => ExtendsReturnType(inferred2, returnType, right["instanceType"]), () => ExtendsFalse()) : ExtendsFalse();
}

// node_modules/typebox/build/type/extends/dependent.mjs
function ExtendsDependent(inferred, if_, then_, else_, right) {
  return Match3(ExtendsLeft(inferred, if_, right), () => ExtendsLeft(inferred, then_, right), () => ExtendsLeft(inferred, else_, right));
}

// node_modules/typebox/build/type/extends/enum.mjs
function ExtendsEnum(inferred, left, right) {
  const evaluated = EvaluateEnum(left);
  return ExtendsLeft(inferred, evaluated, right);
}

// node_modules/typebox/build/type/extends/function.mjs
function ExtendsFunction(inferred, parameters, returnType, right) {
  return IsAny(right) ? ExtendsTrue(inferred) : IsUnknown(right) ? ExtendsTrue(inferred) : IsFunction2(right) ? Match3(ExtendsParameters(inferred, parameters, right["parameters"]), (inferred2) => ExtendsReturnType(inferred2, returnType, right["returnType"]), () => ExtendsFalse()) : ExtendsFalse();
}

// node_modules/typebox/build/type/extends/integer.mjs
function ExtendsInteger(inferred, left, right) {
  return IsInteger2(right) ? ExtendsTrue(inferred) : IsNumber3(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, left, right);
}

// node_modules/typebox/build/type/extends/intersect.mjs
function ExtendsIntersect(inferred, left, right) {
  const evaluated = EvaluateIntersect(left);
  return ExtendsLeft(inferred, evaluated, right);
}

// node_modules/typebox/build/type/extends/literal.mjs
function ExtendsLiteralValue(inferred, left, right) {
  return left === right ? ExtendsTrue(inferred) : ExtendsFalse();
}
function ExtendsLiteralBigInt(inferred, left, right) {
  return IsLiteral(right) ? ExtendsLiteralValue(inferred, left, right.const) : IsBigInt2(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, Literal(left), right);
}
function ExtendsLiteralBoolean(inferred, left, right) {
  return IsLiteral(right) ? ExtendsLiteralValue(inferred, left, right.const) : IsBoolean3(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, Literal(left), right);
}
function ExtendsLiteralNumber(inferred, left, right) {
  return IsLiteral(right) ? ExtendsLiteralValue(inferred, left, right.const) : IsNumber3(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, Literal(left), right);
}
function ExtendsLiteralString(inferred, left, right) {
  return IsLiteral(right) ? ExtendsLiteralValue(inferred, left, right.const) : IsString3(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, Literal(left), right);
}
function ExtendsLiteral(inferred, left, right) {
  return guard_exports.IsBigInt(left.const) ? ExtendsLiteralBigInt(inferred, left.const, right) : guard_exports.IsBoolean(left.const) ? ExtendsLiteralBoolean(inferred, left.const, right) : guard_exports.IsNumber(left.const) ? ExtendsLiteralNumber(inferred, left.const, right) : guard_exports.IsString(left.const) ? ExtendsLiteralString(inferred, left.const, right) : Unreachable();
}

// node_modules/typebox/build/type/extends/never.mjs
function ExtendsNever(inferred, left, right) {
  return IsInfer(right) ? ExtendsRight(inferred, left, right) : ExtendsTrue(inferred);
}

// node_modules/typebox/build/type/extends/null.mjs
function ExtendsNull(inferred, left, right) {
  return IsNull2(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, left, right);
}

// node_modules/typebox/build/type/extends/number.mjs
function ExtendsNumber(inferred, left, right) {
  return IsNumber3(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, left, right);
}

// node_modules/typebox/build/type/extends/object.mjs
function ExtendsPropertyOptional(inferred, left, right) {
  return IsOptional(left) ? IsOptional(right) ? ExtendsTrue(inferred) : ExtendsFalse() : ExtendsTrue(inferred);
}
function ExtendsProperty(inferred, left, right) {
  return (
    // Right TInfer<TNever> is TExtendsFalse
    IsInfer(right) && IsNever(right.extends) ? ExtendsFalse() : Match3(ExtendsLeft(inferred, left, right), (inferred2) => ExtendsPropertyOptional(inferred2, left, right), () => ExtendsFalse())
  );
}
function ExtractInferredProperties(keys, properties) {
  return keys.reduce((result, key) => {
    return key in properties ? IsExtendsTrueLike(properties[key]) ? { ...result, ...properties[key].inferred } : Unreachable() : Unreachable();
  }, {});
}
function ExtendsPropertiesComparer(inferred, left, right) {
  const properties = {};
  for (const rightKey of guard_exports.Keys(right)) {
    properties[rightKey] = rightKey in left ? ExtendsProperty({}, left[rightKey], right[rightKey]) : IsOptional(right[rightKey]) ? IsInfer(right[rightKey]) ? ExtendsTrue(memory_exports.Assign(inferred, { [right[rightKey].name]: right[rightKey].extends })) : ExtendsTrue(inferred) : ExtendsFalse();
  }
  const checked = guard_exports.Values(properties).every((result) => IsExtendsTrueLike(result));
  const extracted = checked ? ExtractInferredProperties(guard_exports.Keys(properties), properties) : {};
  return checked ? ExtendsTrue(extracted) : ExtendsFalse();
}
function ExtendsProperties(inferred, left, right) {
  const compared = ExtendsPropertiesComparer(inferred, left, right);
  return IsExtendsTrueLike(compared) ? ExtendsTrue(memory_exports.Assign(inferred, compared.inferred)) : ExtendsFalse();
}
function ExtendsObjectToObject(inferred, left, right) {
  return ExtendsProperties(inferred, left, right);
}
function RecordMergeInferred(left, right) {
  return guard_exports.Keys(right).reduce((result, key) => {
    return {
      ...result,
      [key]: guard_exports.HasPropertyKey(left, key) ? IsUnion(result[key]) ? Union([...result[key].anyOf, right[key]]) : Union([left[key], right[key]]) : right[key]
    };
  }, left);
}
function ExtendsRecordComparer(properties, keys, type, result) {
  return guard_exports.ShiftLeft(keys, (left, right) => Match3(ExtendsLeft({}, properties[left], type), (inferred) => ExtendsRecordComparer(properties, right, type, RecordMergeInferred(result, inferred)), () => ExtendsFalse()), () => ExtendsTrue(result));
}
function ExtendsObjectToRecord(inferred, properties, _pattern, value) {
  const keys = guard_exports.Keys(properties);
  const result = ExtendsRecordComparer(properties, keys, value, inferred);
  return result;
}
function ExtendsObject(inferred, left, right) {
  return IsRecord(right) ? ExtendsObjectToRecord(inferred, left, RecordPattern(right), RecordValue(right)) : IsObject2(right) ? ExtendsObjectToObject(inferred, left, right.properties) : ExtendsRight(inferred, _Object_(left), right);
}

// node_modules/typebox/build/type/extends/record.mjs
function FromObject2(inferred, properties) {
  return guard_exports.IsEqual(guard_exports.Keys(properties).length, 0) ? ExtendsTrue(inferred) : ExtendsFalse();
}
function FromRecord(inferred, _leftKey, leftValue, _rightKey, rightValue) {
  return ExtendsLeft(inferred, leftValue, rightValue);
}
function ExtendsRecord(inferred, leftPattern, leftValue, right) {
  return IsRecord(right) ? FromRecord(inferred, RecordPatternToType(leftPattern), leftValue, RecordPatternToType(RecordPattern(right)), RecordValue(right)) : IsObject2(right) ? FromObject2(inferred, right.properties) : IsAny(right) ? ExtendsTrue(inferred) : IsUnknown(right) ? ExtendsTrue(inferred) : ExtendsFalse();
}

// node_modules/typebox/build/type/extends/string.mjs
function ExtendsString(inferred, left, right) {
  return IsString3(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, left, right);
}

// node_modules/typebox/build/type/extends/symbol.mjs
function ExtendsSymbol(inferred, left, right) {
  return IsSymbol2(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, left, right);
}

// node_modules/typebox/build/type/extends/template_literal.mjs
function ExtendsTemplateLiteral(inferred, left, right) {
  const evaluated = EvaluateTemplateLiteral(left);
  return ExtendsLeft(inferred, evaluated, right);
}

// node_modules/typebox/build/type/extends/inference.mjs
function Inferrable(name, type) {
  return memory_exports.Create({ "~kind": "Inferrable" }, { name, type }, {});
}
function IsInferable(value) {
  return guard_exports.IsObject(value) && guard_exports.HasPropertyKey(value, "~kind") && guard_exports.HasPropertyKey(value, "name") && guard_exports.HasPropertyKey(value, "type") && guard_exports.IsEqual(value["~kind"], "Inferrable") && guard_exports.IsString(value.name) && guard_exports.IsObject(value.type);
}
function TryRestInferable(type) {
  return IsRest(type) ? IsInfer(type.items) ? IsArray2(type.items.extends) ? Inferrable(type.items.name, type.items.extends.items) : IsUnknown(type.items.extends) ? Inferrable(type.items.name, type.items.extends) : void 0 : Unreachable() : void 0;
}
function TryInferable(type) {
  return IsInfer(type) ? Inferrable(type.name, type.extends) : void 0;
}
function TryInferResults(rest, right, result = []) {
  return guard_exports.ShiftLeft(rest, (head, tail) => Match3(ExtendsLeft({}, head, right), () => TryInferResults(tail, right, [...result, head]), () => void 0), () => result);
}
function InferTupleResult(inferred, name, left, right) {
  const results = TryInferResults(left, right);
  return guard_exports.IsArray(results) ? ExtendsTrue(memory_exports.Assign(inferred, { [name]: Tuple(results) })) : ExtendsFalse();
}
function InferUnionResult(inferred, name, left, right) {
  const results = TryInferResults(left, right);
  return guard_exports.IsArray(results) ? ExtendsTrue(memory_exports.Assign(inferred, { [name]: Union(results) })) : ExtendsFalse();
}

// node_modules/typebox/build/type/extends/tuple.mjs
function Reverse(types) {
  return [...types].reverse();
}
function ApplyReverse(types, reversed) {
  return reversed ? Reverse(types) : types;
}
function Reversed(types) {
  const first = types.length > 0 ? types[0] : void 0;
  const inferrable = IsSchema(first) ? TryRestInferable(first) : void 0;
  return IsSchema(inferrable);
}
function ElementsCompare(inferred, reversed, left, leftRest, right, rightRest) {
  return Match3(ExtendsLeft(inferred, left, right), (checkInferred) => Elements(checkInferred, reversed, leftRest, rightRest), () => ExtendsFalse());
}
function ElementsLeft(inferred, reversed, leftRest, right, rightRest) {
  const inferable = TryRestInferable(right);
  return (
    // Rest Inferrable Right Means we delegate to TInferTupleResult to Generate a Result
    IsInferable(inferable) ? InferTupleResult(inferred, inferable["name"], ApplyReverse(leftRest, reversed), inferable["type"]) : guard_exports.ShiftLeft(leftRest, (head, tail) => ElementsCompare(inferred, reversed, head, tail, right, rightRest), () => ExtendsFalse())
  );
}
function ElementsRight(inferred, reversed, leftRest, rightRest) {
  return guard_exports.ShiftLeft(rightRest, (head, tail) => ElementsLeft(inferred, reversed, leftRest, head, tail), () => guard_exports.IsEqual(leftRest.length, 0) ? ExtendsTrue(inferred) : ExtendsFalse());
}
function Elements(inferred, reversed, leftRest, rightRest) {
  return ElementsRight(inferred, reversed, leftRest, rightRest);
}
function ExtendsTupleToTuple(inferred, left, right) {
  const instantiatedRight = InstantiateElements(inferred, State([], []), right);
  const reversed = Reversed(instantiatedRight);
  return Elements(inferred, reversed, ApplyReverse(left, reversed), ApplyReverse(instantiatedRight, reversed));
}
function ExtendsTupleToArray(inferred, left, right) {
  const inferrable = TryInferable(right);
  return IsInferable(inferrable) ? InferUnionResult(inferred, inferrable["name"], left, inferrable["type"]) : guard_exports.ShiftLeft(left, (head, tail) => Match3(ExtendsLeft(inferred, head, right), (inferred2) => ExtendsTupleToArray(inferred2, tail, right), () => ExtendsFalse()), () => ExtendsTrue(inferred));
}
function ExtendsTuple(inferred, left, right) {
  const instantiatedLeft = InstantiateElements(inferred, State([], []), left);
  return IsTuple(right) ? ExtendsTupleToTuple(inferred, instantiatedLeft, right.items) : IsArray2(right) ? ExtendsTupleToArray(inferred, instantiatedLeft, right.items) : ExtendsRight(inferred, Tuple(instantiatedLeft), right);
}

// node_modules/typebox/build/type/extends/undefined.mjs
function ExtendsUndefined(inferred, left, right) {
  return IsVoid(right) ? ExtendsTrue(inferred) : IsUndefined2(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, left, right);
}

// node_modules/typebox/build/type/extends/union.mjs
function ExtendsUnionSome(inferred, type, unionTypes) {
  return guard_exports.ShiftLeft(unionTypes, (head, tail) => Match3(ExtendsLeft(inferred, type, head), (inferred2) => ExtendsTrue(inferred2), () => ExtendsUnionSome(inferred, type, tail)), () => ExtendsFalse());
}
function ExtendsUnionLeft(inferred, left, right) {
  return guard_exports.ShiftLeft(left, (head, tail) => Match3(ExtendsUnionSome(inferred, head, right), (inferred2) => ExtendsUnionLeft(inferred2, tail, right), () => ExtendsFalse()), () => ExtendsTrue(inferred));
}
function ExtendsUnion2(inferred, left, right) {
  const inferrable = TryInferable(right);
  return IsInferable(inferrable) ? InferUnionResult(inferred, inferrable.name, left, inferrable.type) : IsUnion(right) ? ExtendsUnionLeft(inferred, left, right.anyOf) : ExtendsUnionLeft(inferred, left, [right]);
}

// node_modules/typebox/build/type/extends/unknown.mjs
function ExtendsUnknown(inferred, left, right) {
  return IsInfer(right) ? ExtendsRight(inferred, left, right) : IsAny(right) ? ExtendsTrue(inferred) : IsUnknown(right) ? ExtendsTrue(inferred) : ExtendsFalse();
}

// node_modules/typebox/build/type/extends/void.mjs
function ExtendsVoid(inferred, left, right) {
  return IsVoid(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, left, right);
}

// node_modules/typebox/build/type/extends/extends_left.mjs
function ExtendsLeft(inferred, left, right) {
  return IsAny(left) ? ExtendsAny(inferred, left, right) : IsArray2(left) ? ExtendsArray(inferred, left, left.items, right) : IsBigInt2(left) ? ExtendsBigInt(inferred, left, right) : IsBoolean3(left) ? ExtendsBoolean(inferred, left, right) : IsConstructor2(left) ? ExtendsConstructor(inferred, left.parameters, left.instanceType, right) : IsDependent(left) ? ExtendsDependent(inferred, left.if, left.then, left.else, right) : IsEnum(left) ? ExtendsEnum(inferred, left.enum, right) : IsFunction2(left) ? ExtendsFunction(inferred, left.parameters, left.returnType, right) : IsInteger2(left) ? ExtendsInteger(inferred, left, right) : IsIntersect(left) ? ExtendsIntersect(inferred, left.allOf, right) : IsLiteral(left) ? ExtendsLiteral(inferred, left, right) : IsNever(left) ? ExtendsNever(inferred, left, right) : IsNull2(left) ? ExtendsNull(inferred, left, right) : IsNumber3(left) ? ExtendsNumber(inferred, left, right) : IsObject2(left) ? ExtendsObject(inferred, left.properties, right) : IsRecord(left) ? ExtendsRecord(inferred, RecordPattern(left), RecordValue(left), right) : IsString3(left) ? ExtendsString(inferred, left, right) : IsSymbol2(left) ? ExtendsSymbol(inferred, left, right) : IsTemplateLiteral(left) ? ExtendsTemplateLiteral(inferred, left.pattern, right) : IsTuple(left) ? ExtendsTuple(inferred, left.items, right) : IsUndefined2(left) ? ExtendsUndefined(inferred, left, right) : IsUnion(left) ? ExtendsUnion2(inferred, left.anyOf, right) : IsUnknown(left) ? ExtendsUnknown(inferred, left, right) : IsVoid(left) ? ExtendsVoid(inferred, left, right) : ExtendsFalse();
}

// node_modules/typebox/build/type/engine/interface/instantiate.mjs
function InterfaceOperation(heritage, properties) {
  const result = EvaluateIntersect([...heritage, _Object_(properties)]);
  return result;
}
function InterfaceAction(heritage, properties, options) {
  const result = CanInstantiate(heritage) ? memory_exports.Update(InterfaceOperation(heritage, properties), {}, options) : InterfaceDeferred(heritage, properties, options);
  return result;
}
function InterfaceInstantiate(context, state, heritage, properties, options) {
  const instantiatedHeritage = InstantiateTypes(context, state, heritage);
  const instantiatedProperties = InstantiateProperties(context, state, properties);
  return InterfaceAction(instantiatedHeritage, instantiatedProperties, options);
}

// node_modules/typebox/build/type/action/interface.mjs
function InterfaceDeferred(heritage, properties, options = {}) {
  return Deferred("Interface", [heritage, properties], options);
}
function IsInterfaceDeferred(value) {
  return IsSchema(value) && guard_exports.HasPropertyKey(value, "action") && guard_exports.IsEqual(value.action, "Interface");
}
function Interface(heritage, properties, options = {}) {
  return InterfaceAction(heritage, properties, options);
}

// node_modules/typebox/build/type/engine/cyclic/check.mjs
function FromRef(stack, context, ref) {
  return stack.includes(ref) ? true : FromType3([...stack, ref], context, context[ref]);
}
function FromProperties(stack, context, properties) {
  const types = PropertyValues(properties);
  return FromTypes2(stack, context, types);
}
function FromTypes2(stack, context, types) {
  return guard_exports.ShiftLeft(types, (left, right) => FromType3(stack, context, left) ? true : FromTypes2(stack, context, right), () => false);
}
function FromType3(stack, context, type) {
  return IsRef(type) ? FromRef(stack, context, type.$ref) : IsArray2(type) ? FromType3(stack, context, type.items) : IsConstructor2(type) ? FromTypes2(stack, context, [...type.parameters, type.instanceType]) : IsFunction2(type) ? FromTypes2(stack, context, [...type.parameters, type.returnType]) : IsInterfaceDeferred(type) ? FromProperties(stack, context, type.parameters[1]) : IsIntersect(type) ? FromTypes2(stack, context, type.allOf) : IsObject2(type) ? FromProperties(stack, context, type.properties) : IsUnion(type) ? FromTypes2(stack, context, type.anyOf) : IsTuple(type) ? FromTypes2(stack, context, type.items) : IsRecord(type) ? FromType3(stack, context, RecordValue(type)) : false;
}
function CyclicCheck(stack, context, type) {
  const result = FromType3(stack, context, type);
  return result;
}

// node_modules/typebox/build/type/engine/cyclic/candidates.mjs
function ResolveCandidateKeys(context, keys) {
  return keys.reduce((result, left) => {
    return CyclicCheck([left], context, context[left]) ? [...result, left] : result;
  }, []);
}
function CyclicCandidates(context) {
  const keys = PropertyKeys(context);
  const result = ResolveCandidateKeys(context, keys);
  return result;
}

// node_modules/typebox/build/type/engine/cyclic/dependencies.mjs
function FromRef2(context, ref, result) {
  return result.includes(ref) ? result : ref in context ? FromType4(context, context[ref], [...result, ref]) : Unreachable();
}
function FromProperties2(context, properties, result) {
  const types = PropertyValues(properties);
  return FromTypes3(context, types, result);
}
function FromTypes3(context, types, result) {
  return types.reduce((result2, left) => {
    return FromType4(context, left, result2);
  }, result);
}
function FromType4(context, type, result) {
  return IsRef(type) ? FromRef2(context, type.$ref, result) : IsArray2(type) ? FromType4(context, type.items, result) : IsConstructor2(type) ? FromTypes3(context, [...type.parameters, type.instanceType], result) : IsFunction2(type) ? FromTypes3(context, [...type.parameters, type.returnType], result) : IsInterfaceDeferred(type) ? FromProperties2(context, type.parameters[1], result) : IsIntersect(type) ? FromTypes3(context, type.allOf, result) : IsObject2(type) ? FromProperties2(context, type.properties, result) : IsUnion(type) ? FromTypes3(context, type.anyOf, result) : IsTuple(type) ? FromTypes3(context, type.items, result) : IsRecord(type) ? FromType4(context, RecordValue(type), result) : result;
}
function CyclicDependencies(context, key, type) {
  const result = FromType4(context, type, [key]);
  return result;
}

// node_modules/typebox/build/type/engine/cyclic/extends.mjs
function FromRef3(_ref) {
  return Any();
}
function FromProperties3(properties) {
  return guard_exports.Keys(properties).reduce((result, key) => {
    return { ...result, [key]: FromType5(properties[key]) };
  }, {});
}
function FromTypes4(types) {
  return types.reduce((result, left) => {
    return [...result, FromType5(left)];
  }, []);
}
function FromType5(type) {
  return IsRef(type) ? FromRef3(type.$ref) : IsArray2(type) ? _Array_(FromType5(type.items), ArrayOptions(type)) : IsConstructor2(type) ? Constructor(FromTypes4(type.parameters), FromType5(type.instanceType)) : IsFunction2(type) ? _Function_(FromTypes4(type.parameters), FromType5(type.returnType)) : IsIntersect(type) ? Intersect(FromTypes4(type.allOf)) : IsObject2(type) ? _Object_(FromProperties3(type.properties)) : IsRecord(type) ? Record(RecordKey(type), FromType5(RecordValue(type))) : IsUnion(type) ? Union(FromTypes4(type.anyOf)) : IsTuple(type) ? Tuple(FromTypes4(type.items)) : type;
}
function CyclicAnyFromParameters(defs, ref) {
  return ref in defs ? FromType5(defs[ref]) : Unknown();
}
function CyclicExtends(type) {
  return CyclicAnyFromParameters(type.$defs, type.$ref);
}

// node_modules/typebox/build/type/engine/cyclic/instantiate.mjs
function CyclicInterface(context, heritage, properties) {
  const instantiatedHeritage = InstantiateTypes(context, State([], []), heritage);
  const instantiatedProperties = InstantiateProperties({}, State([], []), properties);
  const evaluatedInterface = EvaluateIntersect([...instantiatedHeritage, _Object_(instantiatedProperties)]);
  return evaluatedInterface;
}
function CyclicDefinitions(context, dependencies) {
  const keys = guard_exports.Keys(context).filter((key) => dependencies.includes(key));
  return keys.reduce((result, key) => {
    const type = context[key];
    const instantiatedType = IsInterfaceDeferred(type) ? CyclicInterface(context, type.parameters[0], type.parameters[1]) : type;
    return { ...result, [key]: instantiatedType };
  }, {});
}
function InstantiateCyclic(context, ref, type) {
  const dependencies = CyclicDependencies(context, ref, type);
  const definitions = CyclicDefinitions(context, dependencies);
  const result = Cyclic(definitions, ref);
  return result;
}

// node_modules/typebox/build/type/engine/cyclic/target.mjs
function Resolve(defs, ref) {
  return ref in defs ? IsRef(defs[ref]) ? Resolve(defs, defs[ref].$ref) : defs[ref] : Never();
}
function CyclicTarget(defs, ref) {
  const result = Resolve(defs, ref);
  return result;
}

// node_modules/typebox/build/type/extends/extends.mjs
function Canonical(type) {
  return IsCyclic(type) ? CyclicExtends(type) : IsUnsafe(type) ? Unknown() : type;
}
function Extends(inferred, left, right) {
  const canonicalLeft = Canonical(left);
  const canonicalRight = Canonical(right);
  return ExtendsLeft(inferred, canonicalLeft, canonicalRight);
}

// node_modules/typebox/build/type/engine/evaluate/compare.mjs
var ResultEqual = "equal";
var ResultDisjoint = "disjoint";
var ResultLeftInside = "left-inside";
var ResultRightInside = "right-inside";
function Compare(left, right) {
  const extendsCheck = [
    IsUnknown(left) ? result_exports.ExtendsFalse() : Extends({}, left, right),
    IsUnknown(left) ? result_exports.ExtendsTrue({}) : Extends({}, right, left)
  ];
  return result_exports.IsExtendsTrueLike(extendsCheck[0]) && result_exports.IsExtendsTrueLike(extendsCheck[1]) ? ResultEqual : result_exports.IsExtendsTrueLike(extendsCheck[0]) && result_exports.IsExtendsFalse(extendsCheck[1]) ? ResultLeftInside : result_exports.IsExtendsFalse(extendsCheck[0]) && result_exports.IsExtendsTrueLike(extendsCheck[1]) ? ResultRightInside : ResultDisjoint;
}

// node_modules/typebox/build/type/engine/evaluate/broaden.mjs
function BroadFilter(type, types) {
  return types.filter((left) => {
    return Compare(type, left) === ResultRightInside ? false : true;
  });
}
function IsBroadestType(type, types) {
  const result = types.some((left) => {
    const result2 = Compare(type, left);
    return guard_exports.IsEqual(result2, ResultLeftInside) || guard_exports.IsEqual(result2, ResultEqual);
  });
  return guard_exports.IsEqual(result, false);
}
function BroadenType(type, types) {
  const evaluated = EvaluateType(type);
  return IsAny(evaluated) ? [evaluated] : IsBroadestType(evaluated, types) ? [...BroadFilter(evaluated, types), evaluated] : types;
}
function BroadenTypes(types) {
  return types.reduce((result, left) => {
    return IsObject2(left) ? [...result, left] : (
      // push
      IsNever(left) ? result : (
        // ignore
        BroadenType(left, result)
      )
    );
  }, []);
}
function Broaden(types) {
  const broadened = BroadenTypes(types);
  const flattened = Flatten(broadened);
  return flattened;
}

// node_modules/typebox/build/type/engine/evaluate/instantiate.mjs
function EvaluateAction(type, options) {
  const result = memory_exports.Update(EvaluateType(type), {}, options);
  return result;
}
function EvaluateInstantiate(context, state, type, options) {
  const instantiatedType = InstantiateType(context, state, type);
  return EvaluateAction(instantiatedType, options);
}

// node_modules/typebox/build/type/engine/call/distribute_arguments.mjs
function CollectDistributionNames(expression, result = []) {
  return (
    // Conditional
    IsDeferred(expression) && guard_exports.IsEqual(expression.action, "Conditional") ? IsRef(expression.parameters[0]) ? CollectDistributionNames(expression.parameters[2], CollectDistributionNames(expression.parameters[3], [...result, expression.parameters[0]["$ref"]])) : CollectDistributionNames(expression.parameters[2], CollectDistributionNames(expression.parameters[3], result)) : IsDeferred(expression) && guard_exports.IsEqual(expression.action, "Mapped") ? IsDeferred(expression.parameters[1]) && guard_exports.IsEqual(expression.parameters[1].action, "KeyOf") && IsRef(expression.parameters[1].parameters[0]) ? [...result, expression.parameters[1].parameters[0]["$ref"]] : result : result
  );
}
function BuildDistributionArray(parameters, names) {
  return parameters.reduce((result, left) => [...result, names.includes(left.name)], []);
}
function ZipDistributionArray(arguments_, distributionArray, result = []) {
  return guard_exports.ShiftLeft(arguments_, (argumentLeft, argumentRight) => guard_exports.ShiftLeft(distributionArray, (booleanLeft, booleanRight) => ZipDistributionArray(argumentRight, booleanRight, [...result, [booleanLeft, argumentLeft]]), () => result), () => result);
}
function Expand(type) {
  return IsUnion(type) ? [...type.anyOf] : [type];
}
function Append(current, type) {
  return current.reduce((result, left) => [...result, [...left, type]], []);
}
function Cross(current, variants) {
  return variants.reduce((result, left) => {
    return [...result, ...Append(current, left)];
  }, []);
}
function Distribute2(zipped) {
  return zipped.reduce((result, left) => {
    return guard_exports.IsEqual(left[0], true) ? Cross(result, Expand(left[1])) : Cross(result, [left[1]]);
  }, [[]]);
}
function DistributeArguments(parameters, arguments_, expression) {
  const distributionNames = CollectDistributionNames(expression);
  const distributionArray = BuildDistributionArray(parameters, distributionNames);
  const zippedArguments = ZipDistributionArray(arguments_, distributionArray);
  return IsDeferred(expression) && guard_exports.IsEqual(expression.action, "Conditional") ? Distribute2(zippedArguments) : IsDeferred(expression) && guard_exports.IsEqual(expression.action, "Mapped") ? Distribute2(zippedArguments) : [arguments_];
}

// node_modules/typebox/build/type/engine/call/resolve_target.mjs
function FromNotResolvable() {
  return ["(not-resolvable)", Never()];
}
function FromNotGeneric() {
  return ["(not-generic)", Never()];
}
function FromGeneric(name, parameters, expression) {
  return [name, Generic(parameters, expression)];
}
function FromRef4(context, ref, arguments_) {
  return ref in context ? FromType6(context, ref, context[ref], arguments_) : FromNotResolvable();
}
function FromType6(context, name, target, arguments_) {
  return IsGeneric(target) ? FromGeneric(name, target.parameters, target.expression) : IsRef(target) ? FromRef4(context, target.$ref, arguments_) : FromNotGeneric();
}
function ResolveTarget(context, target, arguments_) {
  return FromType6(context, "(anonymous)", target, arguments_);
}

// node_modules/typebox/build/type/engine/call/resolve_arguments.mjs
function AssertArgumentExtends(name, type, extends_) {
  if (IsInfer(type) || IsCall(type) || result_exports.IsExtendsTrueLike(Extends({}, type, extends_)))
    return;
  const cause = { parameter: name, expect: extends_, actual: type };
  throw new Error(`Argument for parameter ${name} does not satisfy constraint`, { cause });
}
function BindArgument(context, state, name, extends_, type) {
  const instantiatedArgument = InstantiateType(context, state, type);
  AssertArgumentExtends(name, instantiatedArgument, extends_);
  return memory_exports.Assign(context, { [name]: instantiatedArgument });
}
function BindArguments(context, state, parameterLeft, parameterRight, arguments_) {
  const instantiatedExtends = InstantiateType(context, state, parameterLeft.extends);
  const instantiatedEquals = InstantiateType(context, state, parameterLeft.equals);
  return guard_exports.ShiftLeft(arguments_, (left, right) => BindParameters(BindArgument(context, state, parameterLeft["name"], instantiatedExtends, left), state, parameterRight, right), () => BindParameters(BindArgument(context, state, parameterLeft["name"], instantiatedExtends, instantiatedEquals), state, parameterRight, []));
}
function BindParameters(context, state, parameters, arguments_) {
  return guard_exports.ShiftLeft(parameters, (left, right) => BindArguments(context, state, left, right, arguments_), () => context);
}
function ResolveArgumentsContext(context, state, parameters, arguments_) {
  return BindParameters(context, state, parameters, arguments_);
}

// node_modules/typebox/build/type/engine/call/instantiate.mjs
function Peek(state) {
  const result = guard_exports.IsGreaterThan(state.callstack.length, 0) ? state.callstack[state.callstack.length - 1] : "";
  return result;
}
function IsTailCall(state, name) {
  const result = guard_exports.IsEqual(Peek(state), name);
  return result;
}
function CallDispatch(context, state, target, parameters, expression, arguments_) {
  const argumentsContext = ResolveArgumentsContext(context, state, parameters, arguments_);
  const returnType = InstantiateType(argumentsContext, State([...state["callstack"], target["$ref"]], state["visited"]), expression);
  return InstantiateType(argumentsContext, State([], []), returnType);
}
function CallDistributed(context, state, target, parameters, expression, distributedArguments) {
  return distributedArguments.reduce((result, arguments_) => [...result, CallDispatch(context, state, target, parameters, expression, arguments_)], []);
}
function CallImmediate(context, state, target, parameters, expression, arguments_) {
  const distributedArguments = DistributeArguments(parameters, arguments_, expression);
  const returnTypes = CallDistributed(context, state, target, parameters, expression, distributedArguments);
  const result = guard_exports.IsEqual(returnTypes.length, 1) ? returnTypes[0] : EvaluateUnion(returnTypes);
  return result;
}
function CallInstantiate(context, state, target, arguments_) {
  const instantiatedArguments = InstantiateTypes(context, state, arguments_);
  const resolved = ResolveTarget(context, target, arguments_);
  const name = resolved[0];
  const type = resolved[1];
  const result = IsGeneric(type) ? IsTailCall(state, name) ? CallConstruct(Ref(name), instantiatedArguments) : CallImmediate(context, state, Ref(name), type.parameters, type.expression, instantiatedArguments) : CallConstruct(target, instantiatedArguments);
  return result;
}

// node_modules/typebox/build/type/types/call.mjs
function CallConstruct(target, arguments_) {
  return memory_exports.Create({ ["~kind"]: "Call" }, { type: "call", target, arguments: arguments_ }, {});
}
function Call(target, arguments_) {
  return CallInstantiate({}, State([], []), target, arguments_);
}
function IsCall(value) {
  return IsKind(value, "Call");
}

// node_modules/typebox/build/type/engine/immutable/instantiate_remove.mjs
function RemoveImmutableOperation(type) {
  return memory_exports.Discard(type, ["~immutable"]);
}
function RemoveImmutableAction(type, options) {
  const result = memory_exports.Update(RemoveImmutableOperation(type), {}, options);
  return result;
}
function RemoveImmutableInstantiate(context, state, type, options) {
  const instantiatedType = InstantiateType(context, state, type);
  return RemoveImmutableAction(instantiatedType, options);
}

// node_modules/typebox/build/type/engine/intrinsics/mapping.mjs
function ApplyMapping(mapping, value) {
  return mapping(value);
}

// node_modules/typebox/build/type/engine/intrinsics/from_literal.mjs
function FromLiteral3(mapping, value) {
  return guard_exports.IsString(value) ? Literal(ApplyMapping(mapping, value)) : Literal(value);
}

// node_modules/typebox/build/type/engine/intrinsics/from_template_literal.mjs
function FromTemplateLiteral(mapping, pattern) {
  const evaluated = EvaluateTemplateLiteral(pattern);
  const result = FromType7(mapping, evaluated);
  return result;
}

// node_modules/typebox/build/type/engine/intrinsics/from_union.mjs
function FromUnion2(mapping, types) {
  const result = types.map((type) => FromType7(mapping, type));
  return Union(result);
}

// node_modules/typebox/build/type/engine/intrinsics/from_type.mjs
function FromType7(mapping, type) {
  return IsLiteral(type) ? FromLiteral3(mapping, type.const) : IsTemplateLiteral(type) ? FromTemplateLiteral(mapping, type.pattern) : IsUnion(type) ? FromUnion2(mapping, type.anyOf) : type;
}

// node_modules/typebox/build/type/action/capitalize.mjs
function CapitalizeDeferred(type, options = {}) {
  return Deferred("Capitalize", [type], options);
}
function Capitalize(type, options = {}) {
  return CapitalizeAction(type, options);
}

// node_modules/typebox/build/type/action/lowercase.mjs
function LowercaseDeferred(type, options = {}) {
  return Deferred("Lowercase", [type], options);
}
function Lowercase(type, options = {}) {
  return LowercaseAction(type, options);
}

// node_modules/typebox/build/type/action/uncapitalize.mjs
function UncapitalizeDeferred(type, options = {}) {
  return Deferred("Uncapitalize", [type], options);
}
function Uncapitalize(type, options = {}) {
  return UncapitalizeAction(type, options);
}

// node_modules/typebox/build/type/action/uppercase.mjs
function UppercaseDeferred(type, options = {}) {
  return Deferred("Uppercase", [type], options);
}
function Uppercase(type, options = {}) {
  return UppercaseAction(type, options);
}

// node_modules/typebox/build/type/engine/intrinsics/instantiate.mjs
var CapitalizeMapping = (input) => input[0].toUpperCase() + input.slice(1);
var LowercaseMapping = (input) => input.toLowerCase();
var UncapitalizeMapping = (input) => input[0].toLowerCase() + input.slice(1);
var UppercaseMapping = (input) => input.toUpperCase();
function CapitalizeAction(type, options) {
  const result = CanInstantiate([type]) ? memory_exports.Update(FromType7(CapitalizeMapping, type), {}, options) : CapitalizeDeferred(type, options);
  return result;
}
function LowercaseAction(type, options) {
  const result = CanInstantiate([type]) ? memory_exports.Update(FromType7(LowercaseMapping, type), {}, options) : LowercaseDeferred(type, options);
  return result;
}
function UncapitalizeAction(type, options) {
  const result = CanInstantiate([type]) ? memory_exports.Update(FromType7(UncapitalizeMapping, type), {}, options) : UncapitalizeDeferred(type, options);
  return result;
}
function UppercaseAction(type, options) {
  const result = CanInstantiate([type]) ? memory_exports.Update(FromType7(UppercaseMapping, type), {}, options) : UppercaseDeferred(type, options);
  return result;
}
function CapitalizeInstantiate(context, state, type, options) {
  const instantiatedType = InstantiateType(context, state, type);
  return CapitalizeAction(instantiatedType, options);
}
function LowercaseInstantiate(context, state, type, options) {
  const instantiatedType = InstantiateType(context, state, type);
  return LowercaseAction(instantiatedType, options);
}
function UncapitalizeInstantiate(context, state, type, options) {
  const instantiatedType = InstantiateType(context, state, type);
  return UncapitalizeAction(instantiatedType, options);
}
function UppercaseInstantiate(context, state, type, options) {
  const instantiatedType = InstantiateType(context, state, type);
  return UppercaseAction(instantiatedType, options);
}

// node_modules/typebox/build/type/action/conditional.mjs
function ConditionalDeferred(left, right, true_, false_, options = {}) {
  return Deferred("Conditional", [left, right, true_, false_], options);
}
function Conditional(left, right, true_, false_, options = {}) {
  return ConditionalAction({}, State([], []), left, right, true_, false_, options);
}

// node_modules/typebox/build/type/engine/conditional/instantiate.mjs
function ConditionalOperation(context, state, left, right, true_, false_) {
  const extendsResult = Extends(context, left, right);
  return result_exports.IsExtendsUnion(extendsResult) ? Union([InstantiateType(extendsResult.inferred, state, true_), InstantiateType(context, state, false_)]) : result_exports.IsExtendsTrue(extendsResult) ? InstantiateType(extendsResult.inferred, state, true_) : InstantiateType(context, state, false_);
}
function ConditionalAction(context, state, left, right, true_, false_, options) {
  const result = CanInstantiate([left, right]) ? memory_exports.Update(ConditionalOperation(context, state, left, right, true_, false_), {}, options) : ConditionalDeferred(left, right, true_, false_, options);
  return result;
}
function ConditionalInstantiate(context, state, left, right, true_, false_, options) {
  const instantiatedLeft = InstantiateType(context, state, left);
  const instantiatedRight = InstantiateType(context, state, right);
  return ConditionalAction(context, state, instantiatedLeft, instantiatedRight, true_, false_, options);
}

// node_modules/typebox/build/type/action/constructor_parameters.mjs
function ConstructorParametersDeferred(type, options = {}) {
  return Deferred("ConstructorParameters", [type], options);
}
function ConstructorParameters(type, options = {}) {
  return ConstructorParametersAction(type, options);
}

// node_modules/typebox/build/type/engine/constructor_parameters/instantiate.mjs
function ConstructorParametersOperation(type) {
  const parameters = IsConstructor2(type) ? type["parameters"] : [];
  const instantiatedParameters = InstantiateElements({}, State([], []), parameters);
  const result = Tuple(instantiatedParameters);
  return result;
}
function ConstructorParametersAction(type, options) {
  const result = CanInstantiate([type]) ? memory_exports.Update(ConstructorParametersOperation(type), {}, options) : ConstructorParametersDeferred(type, options);
  return result;
}
function ConstructorParametersInstantiate(context, state, type, options) {
  const instantiatedType = InstantiateType(context, state, type);
  return ConstructorParametersAction(instantiatedType, options);
}

// node_modules/typebox/build/type/action/exclude.mjs
function ExcludeDeferred(left, right, options = {}) {
  return Deferred("Exclude", [left, right], options);
}
function Exclude(left, right, options = {}) {
  return ExcludeAction(left, right, options);
}

// node_modules/typebox/build/type/engine/exclude/instantiate.mjs
function ExcludeAction(left, right, options) {
  const result = CanInstantiate([left, right]) ? memory_exports.Update(ExcludeOperation(left, right), {}, options) : ExcludeDeferred(left, right, options);
  return result;
}
function ExcludeInstantiate(context, state, left, right, options) {
  const instantiatedLeft = InstantiateType(context, state, left);
  const instantiatedRight = InstantiateType(context, state, right);
  return ExcludeAction(instantiatedLeft, instantiatedRight, options);
}

// node_modules/typebox/build/type/action/extract.mjs
function ExtractDeferred(left, right, options = {}) {
  return Deferred("Extract", [left, right], options);
}
function Extract(left, right, options = {}) {
  return ExtractAction(left, right, options);
}

// node_modules/typebox/build/type/engine/extract/operation.mjs
function ExtractType(left, right) {
  const check = Extends({}, left, right);
  const result = result_exports.IsExtendsTrueLike(check) ? [left] : [];
  return result;
}
function ExtractUnion(types, right) {
  return types.reduce((result, head) => {
    return [...result, ...ExtractType(head, right)];
  }, []);
}
function ExtractOperation(left, right) {
  const evaluated = EvaluateType(left);
  const canonical = IsUnion(evaluated) ? evaluated.anyOf : [evaluated];
  const remaining = ExtractUnion(canonical, right);
  const result = EvaluateUnion(remaining);
  return result;
}

// node_modules/typebox/build/type/engine/extract/instantiate.mjs
function ExtractAction(left, right, options) {
  const result = CanInstantiate([left, right]) ? memory_exports.Update(ExtractOperation(left, right), {}, options) : ExtractDeferred(left, right, options);
  return result;
}
function ExtractInstantiate(context, state, left, right, options) {
  const instantiatedLeft = InstantiateType(context, state, left);
  const instantiatedRight = InstantiateType(context, state, right);
  return ExtractAction(instantiatedLeft, instantiatedRight, options);
}

// node_modules/typebox/build/type/engine/helpers/keys_to_indexer.mjs
function KeysToLiterals(keys) {
  return keys.reduce((result, left) => {
    return IsLiteralValue(left) ? [...result, Literal(left)] : result;
  }, []);
}
function KeysToIndexer(keys) {
  const literals = KeysToLiterals(keys);
  const result = Union(literals);
  return result;
}

// node_modules/typebox/build/type/action/indexed.mjs
function IndexDeferred(type, indexer, options = {}) {
  return Deferred("Index", [type, indexer], options);
}
function Index(type, indexer_or_keys, options = {}) {
  const indexer = guard_exports.IsArray(indexer_or_keys) ? KeysToIndexer(indexer_or_keys) : indexer_or_keys;
  return IndexAction(type, indexer, options);
}

// node_modules/typebox/build/type/engine/object/from_cyclic.mjs
function FromCyclic(defs, ref) {
  const target = CyclicTarget(defs, ref);
  const result = FromType8(target);
  return result;
}

// node_modules/typebox/build/type/engine/object/from_dependent.mjs
function FromDependent(if_, then_, else_) {
  const evaluated = EvaluateDependent(if_, then_, else_);
  const result = FromType8(evaluated);
  return result;
}

// node_modules/typebox/build/type/engine/object/from_intersect.mjs
function CollapseIntersectProperties(left, right) {
  const leftKeys = guard_exports.Keys(left).filter((key) => !guard_exports.HasPropertyKey(right, key));
  const rightKeys = guard_exports.Keys(right).filter((key) => !guard_exports.HasPropertyKey(left, key));
  const sharedKeys = guard_exports.Keys(left).filter((key) => guard_exports.HasPropertyKey(right, key));
  const leftProperties = leftKeys.reduce((result, key) => ({ ...result, [key]: left[key] }), {});
  const rightProperties = rightKeys.reduce((result, key) => ({ ...result, [key]: right[key] }), {});
  const sharedProperties = sharedKeys.reduce((result, key) => ({ ...result, [key]: EvaluateIntersect([left[key], right[key]]) }), {});
  const unique = memory_exports.Assign(leftProperties, rightProperties);
  const shared = memory_exports.Assign(unique, sharedProperties);
  return shared;
}
function FromIntersect(types) {
  return types.reduce((result, left) => {
    return CollapseIntersectProperties(result, FromType8(left));
  }, {});
}

// node_modules/typebox/build/type/engine/object/from_object.mjs
function FromObject3(properties) {
  return properties;
}

// node_modules/typebox/build/type/engine/object/from_tuple.mjs
function FromTuple(types) {
  const object = TupleToObject(Tuple(types));
  const result = FromType8(object);
  return result;
}

// node_modules/typebox/build/type/engine/object/from_union.mjs
function CollapseUnionProperties(left, right) {
  const sharedKeys = guard_exports.Keys(left).filter((key) => key in right);
  const result = sharedKeys.reduce((result2, key) => {
    return { ...result2, [key]: EvaluateUnion([left[key], right[key]]) };
  }, {});
  return result;
}
function ReduceVariants(types, result) {
  return guard_exports.ShiftLeft(types, (left, right) => ReduceVariants(right, CollapseUnionProperties(result, FromType8(left))), () => result);
}
function FromUnion3(types) {
  return guard_exports.ShiftLeft(types, (left, right) => ReduceVariants(right, FromType8(left)), () => Unreachable());
}

// node_modules/typebox/build/type/engine/object/from_type.mjs
function FromType8(type) {
  return IsCyclic(type) ? FromCyclic(type.$defs, type.$ref) : IsDependent(type) ? FromDependent(type.if, type.then, type.else) : IsIntersect(type) ? FromIntersect(type.allOf) : IsUnion(type) ? FromUnion3(type.anyOf) : IsTuple(type) ? FromTuple(type.items) : IsObject2(type) ? FromObject3(type.properties) : {};
}

// node_modules/typebox/build/type/engine/object/collapse.mjs
function CollapseToObject(type) {
  const properties = FromType8(type);
  const result = _Object_(properties);
  return result;
}

// node_modules/typebox/build/type/engine/helpers/keys.mjs
var integerKeyPattern = new RegExp("^(?:0|[1-9][0-9]*)$");
function ConvertToIntegerKey(value) {
  const normal = `${value}`;
  return integerKeyPattern.test(normal) ? parseInt(normal) : value;
}

// node_modules/typebox/build/type/engine/indexed/from_array.mjs
function NormalizeLiteral(value) {
  return Literal(ConvertToIntegerKey(value));
}
function NormalizeIndexerTypes(types) {
  return types.map((type) => NormalizeIndexer(type));
}
function NormalizeIndexer(type) {
  return IsIntersect(type) ? Intersect(NormalizeIndexerTypes(type.allOf)) : IsUnion(type) ? Union(NormalizeIndexerTypes(type.anyOf)) : IsLiteral(type) ? NormalizeLiteral(type.const) : type;
}
function FromArray2(type, indexer) {
  const normalizedIndexer = NormalizeIndexer(indexer);
  const check = Extends({}, normalizedIndexer, Number2());
  const result = (
    // indexer
    result_exports.IsExtendsTrueLike(check) ? type : IsLiteral(indexer) && guard_exports.IsEqual(indexer.const, "length") ? Number2() : Never()
  );
  return result;
}

// node_modules/typebox/build/type/engine/indexable/from_cyclic.mjs
function FromCyclic2(defs, ref) {
  const target = CyclicTarget(defs, ref);
  const result = FromType9(target);
  return result;
}

// node_modules/typebox/build/type/engine/indexable/from_dependent.mjs
function FromDependent2(if_, then_, else_) {
  const evaluated = EvaluateDependent(if_, then_, else_);
  const result = FromType9(evaluated);
  return result;
}

// node_modules/typebox/build/type/engine/indexable/from_enum.mjs
function FromEnum(values) {
  const evaluated = EvaluateEnum(values);
  const result = FromType9(evaluated);
  return result;
}

// node_modules/typebox/build/type/engine/indexable/from_intersect.mjs
function FromIntersect2(types) {
  const evaluated = EvaluateIntersect(types);
  const result = FromType9(evaluated);
  return result;
}

// node_modules/typebox/build/type/engine/indexable/from_literal.mjs
function FromLiteral4(value) {
  const result = [`${value}`];
  return result;
}

// node_modules/typebox/build/type/engine/indexable/from_template_literal.mjs
function FromTemplateLiteral2(pattern) {
  const evaluated = EvaluateTemplateLiteral(pattern);
  const result = FromType9(evaluated);
  return result;
}

// node_modules/typebox/build/type/engine/indexable/from_union.mjs
function FromUnion4(types) {
  return types.reduce((result, left) => {
    return [...result, ...FromType9(left)];
  }, []);
}

// node_modules/typebox/build/type/engine/indexable/from_type.mjs
function FromType9(type) {
  return IsCyclic(type) ? FromCyclic2(type.$defs, type.$ref) : IsDependent(type) ? FromDependent2(type.if, type.then, type.else) : IsEnum(type) ? FromEnum(type.enum) : IsIntersect(type) ? FromIntersect2(type.allOf) : IsLiteral(type) ? FromLiteral4(type.const) : IsTemplateLiteral(type) ? FromTemplateLiteral2(type.pattern) : IsUnion(type) ? FromUnion4(type.anyOf) : [];
}

// node_modules/typebox/build/type/engine/indexable/to_indexable_keys.mjs
function ToIndexableKeys(type) {
  const result = FromType9(type);
  return result;
}

// node_modules/typebox/build/type/engine/this/expand_this.mjs
function FromTypes5(properties, types) {
  return types.map((type) => FromType10(properties, type));
}
function FromType10(properties, type) {
  return IsArray2(type) ? _Array_(FromType10(properties, type.items)) : IsConstructor2(type) ? Constructor(FromTypes5(properties, type.parameters), FromType10(properties, type.instanceType)) : IsFunction2(type) ? _Function_(FromTypes5(properties, type.parameters), FromType10(properties, type.returnType)) : IsTuple(type) ? Tuple(FromTypes5(properties, type.items)) : IsUnion(type) ? Union(FromTypes5(properties, type.anyOf)) : IsIntersect(type) ? Intersect(FromTypes5(properties, type.allOf)) : IsThis(type) ? _Object_(properties) : type;
}
function ExpandThis(properties, type) {
  const result = FromType10(properties, type);
  return result;
}

// node_modules/typebox/build/type/engine/indexed/from_object.mjs
function IndexProperty(properties, key) {
  const selectedType = key in properties ? properties[key] : Never();
  const result = ExpandThis(properties, selectedType);
  return result;
}
function IndexProperties(properties, keys) {
  return keys.reduce((result, left) => {
    return [...result, IndexProperty(properties, left)];
  }, []);
}
function FromIndexer(properties, indexer) {
  const keys = ToIndexableKeys(indexer);
  const variants = IndexProperties(properties, keys);
  const result = EvaluateUnion(variants);
  return result;
}
var NumericKeyPattern = new RegExp(IntegerKey);
function NumericKeys(keys) {
  const result = keys.filter((key) => NumericKeyPattern.test(key));
  return result;
}
function FromIndexerNumber(properties) {
  const keys = PropertyKeys(properties);
  const numericKeys = NumericKeys(keys);
  const variants = IndexProperties(properties, numericKeys);
  const result = EvaluateUnion(variants);
  return result;
}
function FromObject4(properties, indexer) {
  const result = IsNumber3(indexer) ? FromIndexerNumber(properties) : FromIndexer(properties, indexer);
  return result;
}

// node_modules/typebox/build/type/engine/indexed/array_indexer.mjs
function ConvertLiteral(value) {
  return Literal(ConvertToIntegerKey(value));
}
function ArrayIndexerTypes(types) {
  return types.map((type) => FormatArrayIndexer(type));
}
function FormatArrayIndexer(type) {
  return IsIntersect(type) ? Intersect(ArrayIndexerTypes(type.allOf)) : IsUnion(type) ? Union(ArrayIndexerTypes(type.anyOf)) : IsLiteral(type) ? ConvertLiteral(type.const) : type;
}

// node_modules/typebox/build/type/engine/indexed/from_tuple.mjs
function IndexElementsWithIndexer(types, indexer) {
  return types.reduceRight((result, right, index) => {
    const check = Extends({}, Literal(index), indexer);
    return result_exports.IsExtendsTrueLike(check) ? [right, ...result] : result;
  }, []);
}
function FromTupleWithIndexer(types, indexer) {
  const formattedArrayIndexer = FormatArrayIndexer(indexer);
  const elements = IndexElementsWithIndexer(types, formattedArrayIndexer);
  return EvaluateUnionFast(elements);
}
function FromTupleWithoutIndexer(types) {
  return EvaluateUnionFast(types);
}
function FromTuple2(types, indexer) {
  return (
    // length (intrinsic)
    IsLiteral(indexer) && guard_exports.IsEqual(indexer.const, "length") ? Literal(types.length) : IsNumber3(indexer) || IsInteger2(indexer) ? FromTupleWithoutIndexer(types) : FromTupleWithIndexer(types, indexer)
  );
}

// node_modules/typebox/build/type/engine/indexed/from_type.mjs
function FromType11(type, indexer) {
  return IsArray2(type) ? FromArray2(type.items, indexer) : IsObject2(type) ? FromObject4(type.properties, indexer) : IsTuple(type) ? FromTuple2(type.items, indexer) : Never();
}

// node_modules/typebox/build/type/engine/indexed/instantiate.mjs
function NormalizeType(type) {
  const result = IsCyclic(type) || IsDependent(type) || IsIntersect(type) || IsUnion(type) ? CollapseToObject(type) : type;
  return result;
}
function IndexAction(type, indexer, options) {
  const result = CanInstantiate([type, indexer]) ? memory_exports.Update(FromType11(NormalizeType(type), indexer), {}, options) : IndexDeferred(type, indexer, options);
  return result;
}
function IndexInstantiate(context, state, type, indexer, options) {
  const instantiatedType = InstantiateType(context, state, type);
  const instantiatedIndexer = InstantiateType(context, state, indexer);
  return IndexAction(instantiatedType, instantiatedIndexer, options);
}

// node_modules/typebox/build/type/action/instance_type.mjs
function InstanceTypeDeferred(type, options = {}) {
  return Deferred("InstanceType", [type], options);
}
function InstanceType(type, options = {}) {
  return InstanceTypeAction(type, options);
}

// node_modules/typebox/build/type/engine/instance_type/instantiate.mjs
function InstanceTypeOperation(type) {
  return IsConstructor2(type) ? type["instanceType"] : Never();
}
function InstanceTypeAction(type, options) {
  const result = CanInstantiate([type]) ? memory_exports.Update(InstanceTypeOperation(type), {}, options) : InstanceTypeDeferred(type, options);
  return result;
}
function InstanceTypeInstantiate(context, state, type, options = {}) {
  const instantiatedType = InstantiateType(context, state, type);
  return InstanceTypeAction(instantiatedType, options);
}

// node_modules/typebox/build/type/action/keyof.mjs
function KeyOfDeferred(type, options = {}) {
  return Deferred("KeyOf", [type], options);
}
function KeyOf2(type, options = {}) {
  return KeyOfAction(type, options);
}

// node_modules/typebox/build/type/engine/keyof/from_any.mjs
function FromAny() {
  return Union([Number2(), String2(), Symbol2()]);
}

// node_modules/typebox/build/type/engine/keyof/from_array.mjs
function FromArray3(_type) {
  return Number2();
}

// node_modules/typebox/build/type/engine/keyof/from_object.mjs
function FromPropertyKeys(keys) {
  const result = keys.reduce((result2, left) => {
    return IsLiteralValue(left) ? [...result2, Literal(ConvertToIntegerKey(left))] : Unreachable();
  }, []);
  return result;
}
function FromObject5(properties) {
  const propertyKeys = guard_exports.Keys(properties);
  const variants = FromPropertyKeys(propertyKeys);
  const result = EvaluateUnionFast(variants);
  return result;
}

// node_modules/typebox/build/type/engine/keyof/from_record.mjs
function FromRecord2(type) {
  return RecordKey(type);
}

// node_modules/typebox/build/type/engine/keyof/from_tuple.mjs
function FromTuple3(types) {
  const result = types.map((_, index) => Literal(index));
  return EvaluateUnionFast(result);
}

// node_modules/typebox/build/type/engine/keyof/from_type.mjs
function FromType12(type) {
  return IsAny(type) ? FromAny() : IsArray2(type) ? FromArray3(type.items) : IsObject2(type) ? FromObject5(type.properties) : IsRecord(type) ? FromRecord2(type) : IsTuple(type) ? FromTuple3(type.items) : Never();
}

// node_modules/typebox/build/type/engine/keyof/instantiate.mjs
function NormalizeType2(type) {
  const result = IsCyclic(type) || IsDependent(type) || IsIntersect(type) || IsUnion(type) ? CollapseToObject(type) : type;
  return result;
}
function KeyOfAction(type, options) {
  return CanInstantiate([type]) ? memory_exports.Update(FromType12(NormalizeType2(type)), {}, options) : KeyOfDeferred(type, options);
}
function KeyOfInstantiate(context, state, type, options) {
  const instantiatedType = InstantiateType(context, state, type);
  return KeyOfAction(instantiatedType, options);
}

// node_modules/typebox/build/type/action/mapped.mjs
function MappedDeferred(identifier, type, as, property, options = {}) {
  return Deferred("Mapped", [identifier, type, as, property], options);
}
function Mapped(identifier, type, as, property, options = {}) {
  return MappedAction({}, State([], []), identifier, type, as, property, options);
}

// node_modules/typebox/build/type/engine/mapped/mapped_variants.mjs
function FromTemplateLiteral3(pattern) {
  const evaluated = EvaluateTemplateLiteral(pattern);
  const result = FromType13(evaluated);
  return result;
}
function FromUnion5(types) {
  return types.reduce((result, left) => {
    return [...result, ...FromType13(left)];
  }, []);
}
function FromEnum2(values) {
  const evaluated = EvaluateEnum(values);
  const result = FromType13(evaluated);
  return result;
}
function FromLiteral5(value) {
  const result = guard_exports.IsNumber(value) ? [Literal(`${value}`)] : [Literal(value)];
  return result;
}
function FromType13(type) {
  const result = IsEnum(type) ? FromEnum2(type.enum) : IsLiteral(type) ? FromLiteral5(type.const) : IsTemplateLiteral(type) ? FromTemplateLiteral3(type.pattern) : IsUnion(type) ? FromUnion5(type.anyOf) : [type];
  return result;
}
function MappedVariants(type) {
  const result = FromType13(type);
  return result;
}

// node_modules/typebox/build/type/engine/mapped/mapped_operation.mjs
function CanonicalAs(instantiatedAs) {
  const result = IsTemplateLiteral(instantiatedAs) ? EvaluateTemplateLiteral(instantiatedAs.pattern) : instantiatedAs;
  return result;
}
function MappedVariant(context, state, identifier, variant, as, property) {
  const variantContext = memory_exports.Assign(context, { [identifier["name"]]: variant });
  const instantiatedAs = InstantiateType(variantContext, state, as);
  const canonicalAs = CanonicalAs(instantiatedAs);
  const instantiatedProperty = InstantiateType(variantContext, state, property);
  return IsLiteralNumber(canonicalAs) || IsLiteralString(canonicalAs) ? { [canonicalAs.const]: instantiatedProperty } : {};
}
function MappedProperties(context, state, identifier, variants, as, property) {
  return variants.reduce((result, left) => {
    return [...result, MappedVariant(context, state, identifier, left, as, property)];
  }, []);
}
function MappedObjects(properties) {
  return properties.reduce((result, left) => {
    return [...result, _Object_(left)];
  }, []);
}
function MappedOperation(context, state, identifier, type, as, property) {
  const variants = MappedVariants(type);
  const mappedProperties = MappedProperties(context, state, identifier, variants, as, property);
  const mappedObjects = MappedObjects(mappedProperties);
  const result = EvaluateIntersect(mappedObjects);
  return result;
}

// node_modules/typebox/build/type/engine/mapped/instantiate.mjs
function MappedAction(context, state, identifier, type, as, property, options) {
  const result = CanInstantiate([type]) ? memory_exports.Update(MappedOperation(context, state, identifier, type, as, property), {}, options) : MappedDeferred(identifier, type, as, property, options);
  return result;
}
function MappedInstantiate(context, state, identifier, type, as, property, options) {
  const instantiatedType = InstantiateType(context, state, type);
  return MappedAction(context, state, identifier, instantiatedType, as, property, options);
}

// node_modules/typebox/build/type/engine/module/instantiate.mjs
function InstantiateCyclics(context, declarations, cyclicKeys) {
  const declarationContext = memory_exports.Assign(context, declarations);
  const declarationKeys = guard_exports.Keys(declarations).filter((key) => cyclicKeys.includes(key));
  return declarationKeys.reduce((result, key) => {
    return { ...result, [key]: InstantiateCyclic(declarationContext, key, declarations[key]) };
  }, {});
}
function InstantiateNonCyclics(context, declarations, cyclicKeys) {
  const declarationContext = memory_exports.Assign(context, declarations);
  const declarationKeys = guard_exports.Keys(declarations).filter((key) => !cyclicKeys.includes(key));
  return declarationKeys.reduce((result, key) => {
    return { ...result, [key]: InstantiateType(declarationContext, State([], []), declarations[key]) };
  }, {});
}
function InstantiateModule(context, declarations, options) {
  const cyclicCandidates = CyclicCandidates(declarations);
  const instantiatedCyclics = InstantiateCyclics(context, declarations, cyclicCandidates);
  const instantiatedNonCyclics = InstantiateNonCyclics(context, declarations, cyclicCandidates);
  const instantiatedModule = { ...instantiatedCyclics, ...instantiatedNonCyclics };
  return memory_exports.Update(instantiatedModule, {}, options);
}
function ModuleInstantiate(context, _state, declarations, options) {
  const instantiatedModule = InstantiateModule(context, declarations, options);
  return instantiatedModule;
}

// node_modules/typebox/build/type/action/non_nullable.mjs
function NonNullableDeferred(type, options = {}) {
  return Deferred("NonNullable", [type], options);
}
function NonNullable(type, options = {}) {
  return NonNullableAction(type, options);
}

// node_modules/typebox/build/type/engine/non_nullable/instantiate.mjs
function NonNullableOperation(type) {
  const excluded = Union([Null(), Undefined()]);
  return ExcludeAction(type, excluded, {});
}
function NonNullableAction(type, options) {
  const result = CanInstantiate([type]) ? memory_exports.Update(NonNullableOperation(type), {}, options) : NonNullableDeferred(type, options);
  return result;
}
function NonNullableInstantiate(context, state, type, options) {
  const instantiatedType = InstantiateType(context, state, type);
  return NonNullableAction(instantiatedType, options);
}

// node_modules/typebox/build/type/action/omit.mjs
function OmitDeferred(type, indexer, options = {}) {
  return Deferred("Omit", [type, indexer], options);
}
function Omit(type, indexer_or_keys, options = {}) {
  const indexer = guard_exports.IsArray(indexer_or_keys) ? KeysToIndexer(indexer_or_keys) : indexer_or_keys;
  return OmitAction(type, indexer, options);
}

// node_modules/typebox/build/type/engine/indexable/to_indexable.mjs
function ToIndexable(type) {
  const collapsed = CollapseToObject(type);
  const result = IsObject2(collapsed) ? collapsed.properties : Unreachable();
  return result;
}

// node_modules/typebox/build/type/engine/omit/from_type.mjs
function FromKeys(properties, keys) {
  const result = guard_exports.Keys(properties).reduce((result2, key) => {
    return keys.includes(key) ? result2 : { ...result2, [key]: properties[key] };
  }, {});
  return result;
}
function FromType14(type, indexer) {
  const indexable = ToIndexable(type);
  const indexableKeys = ToIndexableKeys(indexer);
  const omitted = FromKeys(indexable, indexableKeys);
  const result = _Object_(omitted);
  return result;
}

// node_modules/typebox/build/type/engine/omit/instantiate.mjs
function OmitAction(type, indexer, options) {
  const result = CanInstantiate([type, indexer]) ? memory_exports.Update(FromType14(type, indexer), {}, options) : OmitDeferred(type, indexer, options);
  return result;
}
function OmitInstantiate(context, state, type, indexer, options) {
  const instantiatedType = InstantiateType(context, state, type);
  const instantiatedIndexer = InstantiateType(context, state, indexer);
  return OmitAction(instantiatedType, instantiatedIndexer, options);
}

// node_modules/typebox/build/type/action/parameters.mjs
function ParametersDeferred(type, options = {}) {
  return Deferred("Parameters", [type], options);
}
function Parameters(type, options = {}) {
  return ParametersAction(type, options);
}

// node_modules/typebox/build/type/engine/parameters/instantiate.mjs
function ParametersOperation(type) {
  const parameters = IsFunction2(type) ? type["parameters"] : [];
  const instantiatedParameters = InstantiateElements({}, State([], []), parameters);
  const result = Tuple(instantiatedParameters);
  return result;
}
function ParametersAction(type, options) {
  const result = CanInstantiate([type]) ? memory_exports.Update(ParametersOperation(type), {}, options) : ParametersDeferred(type, options);
  return result;
}
function ParametersInstantiate(context, state, type, options) {
  const instantiatedType = InstantiateType(context, state, type);
  return ParametersAction(instantiatedType, options);
}

// node_modules/typebox/build/type/action/partial.mjs
function PartialDeferred(type, options = {}) {
  return Deferred("Partial", [type], options);
}
function Partial(type, options = {}) {
  return PartialAction(type, options);
}

// node_modules/typebox/build/type/engine/partial/from_cyclic.mjs
function FromCyclic3(defs, ref) {
  const target = CyclicTarget(defs, ref);
  const partial = FromType15(target);
  const result = Cyclic(memory_exports.Assign(defs, { [ref]: partial }), ref);
  return result;
}

// node_modules/typebox/build/type/engine/partial/from_dependent.mjs
function FromDependent3(if_, then_, else_) {
  const evaluated = EvaluateDependent(if_, then_, else_);
  const result = FromType15(evaluated);
  return result;
}

// node_modules/typebox/build/type/engine/partial/from_intersect.mjs
function FromIntersect3(types) {
  const evaluated = EvaluateIntersect(types);
  const result = FromType15(evaluated);
  return result;
}

// node_modules/typebox/build/type/engine/partial/from_union.mjs
function FromUnion6(types) {
  const result = types.map((type) => FromType15(type));
  return Union(result);
}

// node_modules/typebox/build/type/engine/partial/from_object.mjs
function FromObject6(properties) {
  const mapped = guard_exports.Keys(properties).reduce((result2, left) => {
    return { ...result2, [left]: AddOptional(properties[left]) };
  }, {});
  const result = _Object_(mapped);
  return result;
}

// node_modules/typebox/build/type/engine/partial/from_type.mjs
function FromType15(type) {
  return IsCyclic(type) ? FromCyclic3(type.$defs, type.$ref) : IsDependent(type) ? FromDependent3(type.if, type.then, type.else) : IsIntersect(type) ? FromIntersect3(type.allOf) : IsUnion(type) ? FromUnion6(type.anyOf) : IsObject2(type) ? FromObject6(type.properties) : _Object_({});
}

// node_modules/typebox/build/type/engine/partial/instantiate.mjs
function PartialAction(type, options) {
  const result = CanInstantiate([type]) ? memory_exports.Update(FromType15(type), {}, options) : PartialDeferred(type, options);
  return result;
}
function PartialInstantiate(context, state, type, options) {
  const instantiatedType = InstantiateType(context, state, type);
  return PartialAction(instantiatedType, options);
}

// node_modules/typebox/build/type/action/pick.mjs
function PickDeferred(type, indexer, options = {}) {
  return Deferred("Pick", [type, indexer], options);
}
function Pick(type, indexer_or_keys, options = {}) {
  const indexer = guard_exports.IsArray(indexer_or_keys) ? KeysToIndexer(indexer_or_keys) : indexer_or_keys;
  return PickAction(type, indexer, options);
}

// node_modules/typebox/build/type/engine/pick/from_type.mjs
function FromKeys2(properties, keys) {
  const result = guard_exports.Keys(properties).reduce((result2, key) => {
    return keys.includes(key) ? memory_exports.Assign(result2, { [key]: properties[key] }) : result2;
  }, {});
  return result;
}
function FromType16(type, indexer) {
  const indexable = ToIndexable(type);
  const keys = ToIndexableKeys(indexer);
  const applied = FromKeys2(indexable, keys);
  const result = _Object_(applied);
  return result;
}

// node_modules/typebox/build/type/engine/pick/instantiate.mjs
function PickAction(type, indexer, options) {
  const result = CanInstantiate([type, indexer]) ? memory_exports.Update(FromType16(type, indexer), {}, options) : PickDeferred(type, indexer, options);
  return result;
}
function PickInstantiate(context, state, type, indexer, options) {
  const instantiatedType = InstantiateType(context, state, type);
  const instantiatedIndexer = InstantiateType(context, state, indexer);
  return PickAction(instantiatedType, instantiatedIndexer, options);
}

// node_modules/typebox/build/type/action/readonly_object.mjs
function ReadonlyObjectDeferred(type, options = {}) {
  return Deferred("ReadonlyObject", [type], options);
}
function ReadonlyObject(type, options = {}) {
  return ReadonlyObjectAction(type, options);
}
var ReadonlyType = ReadonlyObject;

// node_modules/typebox/build/type/engine/readonly_object/from_array.mjs
function FromArray4(type) {
  const result = AddImmutable(_Array_(type));
  return result;
}

// node_modules/typebox/build/type/engine/readonly_object/from_cyclic.mjs
function FromCyclic4(defs, ref) {
  const target = CyclicTarget(defs, ref);
  const partial = FromType17(target);
  const result = Cyclic(memory_exports.Assign(defs, { [ref]: partial }), ref);
  return result;
}

// node_modules/typebox/build/type/engine/readonly_object/from_dependent.mjs
function FromDependent4(if_, then_, else_) {
  const evaluated = EvaluateDependent(if_, then_, else_);
  const result = FromType17(evaluated);
  return result;
}

// node_modules/typebox/build/type/engine/readonly_object/from_intersect.mjs
function FromIntersect4(types) {
  const evaluated = EvaluateIntersect(types);
  const result = FromType17(evaluated);
  return result;
}

// node_modules/typebox/build/type/engine/readonly_object/from_object.mjs
function FromObject7(properties) {
  const mapped = guard_exports.Keys(properties).reduce((result2, left) => {
    return { ...result2, [left]: AddReadonly(properties[left]) };
  }, {});
  const result = _Object_(mapped);
  return result;
}

// node_modules/typebox/build/type/engine/readonly_object/from_tuple.mjs
function FromTuple4(types) {
  const result = AddImmutable(Tuple(types));
  return result;
}

// node_modules/typebox/build/type/engine/readonly_object/from_union.mjs
function FromUnion7(types) {
  const result = types.map((type) => FromType17(type));
  return Union(result);
}

// node_modules/typebox/build/type/engine/readonly_object/from_type.mjs
function FromType17(type) {
  return IsArray2(type) ? FromArray4(type.items) : IsCyclic(type) ? FromCyclic4(type.$defs, type.$ref) : IsDependent(type) ? FromDependent4(type.if, type.then, type.else) : IsIntersect(type) ? FromIntersect4(type.allOf) : IsObject2(type) ? FromObject7(type.properties) : IsTuple(type) ? FromTuple4(type.items) : IsUnion(type) ? FromUnion7(type.anyOf) : type;
}

// node_modules/typebox/build/type/engine/readonly_object/instantiate.mjs
function ReadonlyObjectAction(type, options) {
  const result = CanInstantiate([type]) ? memory_exports.Update(FromType17(type), {}, options) : ReadonlyObjectDeferred(type);
  return result;
}
function ReadonlyObjectInstantiate(context, state, type, options) {
  const instantiatedType = InstantiateType(context, state, type);
  return ReadonlyObjectAction(instantiatedType, options);
}

// node_modules/typebox/build/type/engine/ref/instantiate.mjs
function RefInstantiate(context, state, type, ref) {
  return state.visited.includes(ref) ? type : ref in context ? InstantiateType(context, State(state["callstack"], [...state["visited"], ref]), context[ref]) : type;
}

// node_modules/typebox/build/type/engine/required/from_cyclic.mjs
function FromCyclic5(defs, ref) {
  const target = CyclicTarget(defs, ref);
  const partial = FromType18(target);
  const result = Cyclic(memory_exports.Assign(defs, { [ref]: partial }), ref);
  return result;
}

// node_modules/typebox/build/type/engine/required/from_dependent.mjs
function FromDependent5(if_, then_, else_) {
  const evaluated = EvaluateDependent(if_, then_, else_);
  const result = FromType18(evaluated);
  return result;
}

// node_modules/typebox/build/type/engine/required/from_intersect.mjs
function FromIntersect5(types) {
  const evaluated = EvaluateIntersect(types);
  const result = FromType18(evaluated);
  return result;
}

// node_modules/typebox/build/type/engine/required/from_union.mjs
function FromUnion8(types) {
  const result = types.map((type) => FromType18(type));
  return Union(result);
}

// node_modules/typebox/build/type/engine/required/from_object.mjs
function FromObject8(properties) {
  const mapped = guard_exports.Keys(properties).reduce((result2, left) => {
    return { ...result2, [left]: RemoveOptional(properties[left]) };
  }, {});
  const result = _Object_(mapped);
  return result;
}

// node_modules/typebox/build/type/engine/required/from_type.mjs
function FromType18(type) {
  return IsCyclic(type) ? FromCyclic5(type.$defs, type.$ref) : IsDependent(type) ? FromDependent5(type.if, type.then, type.else) : IsIntersect(type) ? FromIntersect5(type.allOf) : IsUnion(type) ? FromUnion8(type.anyOf) : IsObject2(type) ? FromObject8(type.properties) : _Object_({});
}

// node_modules/typebox/build/type/action/required.mjs
function RequiredDeferred(type, options = {}) {
  return Deferred("Required", [type], options);
}
function Required(type, options = {}) {
  return RequiredAction(type, options);
}

// node_modules/typebox/build/type/engine/required/instantiate.mjs
function RequiredAction(type, options) {
  const result = CanInstantiate([type]) ? memory_exports.Update(FromType18(type), {}, options) : RequiredDeferred(type, options);
  return result;
}
function RequiredInstantiate(context, state, type, options) {
  const instaniatedType = InstantiateType(context, state, type);
  return RequiredAction(instaniatedType, options);
}

// node_modules/typebox/build/type/action/return_type.mjs
function ReturnTypeDeferred(type, options = {}) {
  return Deferred("ReturnType", [type], options);
}
function ReturnType(type, options = {}) {
  return ReturnTypeAction(type, options);
}

// node_modules/typebox/build/type/engine/return_type/instantiate.mjs
function ReturnTypeOperation(type) {
  return IsFunction2(type) ? type["returnType"] : Never();
}
function ReturnTypeAction(type, options) {
  const result = CanInstantiate([type]) ? memory_exports.Update(ReturnTypeOperation(type), {}, options) : ReturnTypeDeferred(type, options);
  return result;
}
function ReturnTypeInstantiate(context, state, type, options = {}) {
  const instantiatedType = InstantiateType(context, state, type);
  return ReturnTypeAction(instantiatedType, options);
}

// node_modules/typebox/build/type/action/with.mjs
function WithDeferred(type, options) {
  return Deferred("With", [type, options], {});
}
function With2(type, options) {
  return WithAction(type, options);
}

// node_modules/typebox/build/type/engine/with/instantiate.mjs
function WithAction(type, options) {
  const result = CanInstantiate([type]) ? memory_exports.Update(type, {}, options) : WithDeferred(type, options);
  return result;
}
function WithInstantiate(context, state, type, options) {
  const instaniatedType = InstantiateType(context, state, type);
  return WithAction(instaniatedType, options);
}

// node_modules/typebox/build/type/engine/rest/spread.mjs
function SpreadElement(type) {
  const result = IsRest(type) ? IsTuple(type.items) ? RestSpread(type.items.items) : IsInfer(type.items) ? [type] : IsRef(type.items) ? [type] : [Never()] : [type];
  return result;
}
function RestSpread(types) {
  const result = types.reduce((result2, left) => {
    return [...result2, ...SpreadElement(left)];
  }, []);
  return result;
}

// node_modules/typebox/build/type/engine/instantiate.mjs
function State(callstack, visited) {
  return { callstack, visited };
}
function CanInstantiate(types) {
  return guard_exports.ShiftLeft(types, (left, right) => IsRef(left) ? false : CanInstantiate(right), () => true);
}
function InstantiateProperties(context, state, properties) {
  return guard_exports.Keys(properties).reduce((result, key) => {
    return { ...result, [key]: InstantiateType(context, state, properties[key]) };
  }, {});
}
function InstantiateElements(context, state, types) {
  const elements = InstantiateTypes(context, state, types);
  const result = RestSpread(elements);
  return result;
}
function InstantiateTypes(context, state, types) {
  return types.map((type) => InstantiateType(context, state, type));
}
function WithModifiers(type, instantiatedType) {
  const withOptional = IsOptional(type) ? AddOptionalAction(instantiatedType, {}) : instantiatedType;
  const withReadonly = IsReadonly(type) ? AddReadonlyAction(withOptional, {}) : withOptional;
  const withImmutable = IsImmutable(type) ? AddImmutableAction(withReadonly, {}) : withReadonly;
  return withImmutable;
}
function InstantiateDeferred(context, state, action, parameters, options) {
  return (
    // Modifiers
    guard_exports.IsEqual(action, "AddImmutable") ? AddImmutableInstantiate(context, state, parameters[0], options) : guard_exports.IsEqual(action, "RemoveImmutable") ? RemoveImmutableInstantiate(context, state, parameters[0], options) : guard_exports.IsEqual(action, "AddReadonly") ? AddReadonlyInstantiate(context, state, parameters[0], options) : guard_exports.IsEqual(action, "RemoveReadonly") ? RemoveReadonlyInstantiate(context, state, parameters[0], options) : guard_exports.IsEqual(action, "AddOptional") ? AddOptionalInstantiate(context, state, parameters[0], options) : guard_exports.IsEqual(action, "RemoveOptional") ? RemoveOptionalInstantiate(context, state, parameters[0], options) : (
      // Actions
      guard_exports.IsEqual(action, "Capitalize") ? CapitalizeInstantiate(context, state, parameters[0], options) : guard_exports.IsEqual(action, "Conditional") ? ConditionalInstantiate(context, state, parameters[0], parameters[1], parameters[2], parameters[3], options) : guard_exports.IsEqual(action, "ConstructorParameters") ? ConstructorParametersInstantiate(context, state, parameters[0], options) : guard_exports.IsEqual(action, "Evaluate") ? EvaluateInstantiate(context, state, parameters[0], options) : guard_exports.IsEqual(action, "Exclude") ? ExcludeInstantiate(context, state, parameters[0], parameters[1], options) : guard_exports.IsEqual(action, "Extract") ? ExtractInstantiate(context, state, parameters[0], parameters[1], options) : guard_exports.IsEqual(action, "Index") ? IndexInstantiate(context, state, parameters[0], parameters[1], options) : guard_exports.IsEqual(action, "InstanceType") ? InstanceTypeInstantiate(context, state, parameters[0], options) : guard_exports.IsEqual(action, "Interface") ? InterfaceInstantiate(context, state, parameters[0], parameters[1], options) : guard_exports.IsEqual(action, "KeyOf") ? KeyOfInstantiate(context, state, parameters[0], options) : guard_exports.IsEqual(action, "Lowercase") ? LowercaseInstantiate(context, state, parameters[0], options) : guard_exports.IsEqual(action, "Mapped") ? MappedInstantiate(context, state, parameters[0], parameters[1], parameters[2], parameters[3], options) : guard_exports.IsEqual(action, "Module") ? ModuleInstantiate(context, state, parameters[0], options) : guard_exports.IsEqual(action, "NonNullable") ? NonNullableInstantiate(context, state, parameters[0], options) : guard_exports.IsEqual(action, "Pick") ? PickInstantiate(context, state, parameters[0], parameters[1], options) : guard_exports.IsEqual(action, "Parameters") ? ParametersInstantiate(context, state, parameters[0], options) : guard_exports.IsEqual(action, "Partial") ? PartialInstantiate(context, state, parameters[0], options) : guard_exports.IsEqual(action, "Omit") ? OmitInstantiate(context, state, parameters[0], parameters[1], options) : guard_exports.IsEqual(action, "ReadonlyObject") ? ReadonlyObjectInstantiate(context, state, parameters[0], options) : guard_exports.IsEqual(action, "Record") ? RecordInstantiate(context, state, parameters[0], parameters[1], options) : guard_exports.IsEqual(action, "Required") ? RequiredInstantiate(context, state, parameters[0], options) : guard_exports.IsEqual(action, "ReturnType") ? ReturnTypeInstantiate(context, state, parameters[0], options) : guard_exports.IsEqual(action, "TemplateLiteral") ? TemplateLiteralInstantiate(context, state, parameters[0], options) : guard_exports.IsEqual(action, "Uncapitalize") ? UncapitalizeInstantiate(context, state, parameters[0], options) : guard_exports.IsEqual(action, "Uppercase") ? UppercaseInstantiate(context, state, parameters[0], options) : guard_exports.IsEqual(action, "With") ? WithInstantiate(context, state, parameters[0], parameters[1]) : Deferred(action, parameters, options)
    )
  );
}
function InstantiateImmediate(context, state, type) {
  const instantiatedType = IsRef(type) ? RefInstantiate(context, state, type, type.$ref) : IsArray2(type) ? _Array_(InstantiateType(context, state, type.items), ArrayOptions(type)) : IsCall(type) ? CallInstantiate(context, state, type.target, type.arguments) : IsConstructor2(type) ? Constructor(InstantiateTypes(context, state, type.parameters), InstantiateType(context, state, type.instanceType), ConstructorOptions(type)) : IsFunction2(type) ? _Function_(InstantiateTypes(context, state, type.parameters), InstantiateType(context, state, type.returnType), FunctionOptions(type)) : IsDependent(type) ? Dependent(InstantiateType(context, state, type.if), InstantiateType(context, state, type.then), InstantiateType(context, state, type.else), DependentOptions(type)) : IsIntersect(type) ? Intersect(InstantiateTypes(context, state, type.allOf), IntersectOptions(type)) : IsObject2(type) ? _Object_(InstantiateProperties(context, state, type.properties), ObjectOptions(type)) : IsRecord(type) ? RecordFromPattern(RecordPattern(type), InstantiateType(context, state, RecordValue(type))) : IsRest(type) ? Rest(InstantiateType(context, state, type.items)) : IsTuple(type) ? Tuple(InstantiateElements(context, state, type.items), TupleOptions(type)) : IsUnion(type) ? Union(InstantiateTypes(context, state, type.anyOf), UnionOptions(type)) : type;
  const withModifiers = WithModifiers(type, instantiatedType);
  return withModifiers;
}
function InstantiateType(context, state, type) {
  const result = IsDeferred(type) ? InstantiateDeferred(context, state, type.action, type.parameters, type.options) : InstantiateImmediate(context, state, type);
  return result;
}
function Instantiate(context, type) {
  return InstantiateType(context, State([], []), type);
}

// node_modules/typebox/build/type/engine/immutable/instantiate_add.mjs
function AddImmutableOperation(type) {
  return memory_exports.Update(type, { "~immutable": true }, {});
}
function AddImmutableAction(type, options) {
  const result = memory_exports.Update(AddImmutableOperation(type), {}, options);
  return result;
}
function AddImmutableInstantiate(context, state, type, options) {
  const instantiatedType = InstantiateType(context, state, type);
  return AddImmutableAction(instantiatedType, options);
}

// node_modules/typebox/build/type/action/_add_immutable.mjs
function AddImmutableDeferred(type, options = {}) {
  return Deferred("AddImmutable", [type], options);
}
function AddImmutable(type, options = {}) {
  return AddImmutableAction(type, options);
}

// node_modules/typebox/build/type/action/evaluate.mjs
function EvaluateDeferred(type, options = {}) {
  return Deferred("Evaluate", [type], options);
}
function Evaluate(type, options = {}) {
  return EvaluateAction(type, options);
}

// node_modules/typebox/build/type/action/module.mjs
function ModuleDeferred(declarations, options = {}) {
  return Deferred("Module", [declarations], options);
}
function Module2(declarations, options = {}) {
  return ModuleInstantiate({}, State([], []), declarations, options);
}

// node_modules/typebox/build/type/script/script.mjs
function Script2(...args) {
  const [context, input, options] = arguments_exports.Match(args, {
    2: (script, options2) => guard_exports.IsString(script) ? [{}, script, options2] : [script, options2, {}],
    3: (context2, script, options2) => [context2, script, options2],
    1: (script) => [{}, script, {}]
  });
  const result = Script(input);
  const parsed = guard_exports.IsArray(result) && guard_exports.IsEqual(result.length, 2) ? InstantiateType(context, State([], []), result[0]) : Never();
  return memory_exports.Update(parsed, {}, options);
}

// node_modules/typebox/build/typebox.mjs
var typebox_exports = {};
__export(typebox_exports, {
  Any: () => Any,
  Array: () => _Array_,
  BigInt: () => BigInt2,
  Boolean: () => Boolean2,
  Call: () => Call,
  Capitalize: () => Capitalize,
  Codec: () => Codec,
  Conditional: () => Conditional,
  Constructor: () => Constructor,
  ConstructorParameters: () => ConstructorParameters,
  Cyclic: () => Cyclic,
  Decode: () => Decode,
  DecodeBuilder: () => DecodeBuilder,
  Dependent: () => Dependent,
  Encode: () => Encode,
  EncodeBuilder: () => EncodeBuilder,
  Enum: () => Enum,
  Evaluate: () => Evaluate,
  Exclude: () => Exclude,
  Extends: () => Extends,
  ExtendsResult: () => result_exports,
  Extract: () => Extract,
  Function: () => _Function_,
  Generic: () => Generic,
  Identifier: () => Identifier,
  Immutable: () => Immutable,
  Index: () => Index,
  Infer: () => Infer,
  InstanceType: () => InstanceType,
  Instantiate: () => Instantiate,
  Integer: () => Integer,
  Interface: () => Interface,
  Intersect: () => Intersect,
  IsAny: () => IsAny,
  IsArray: () => IsArray2,
  IsBigInt: () => IsBigInt2,
  IsBoolean: () => IsBoolean3,
  IsCall: () => IsCall,
  IsCodec: () => IsCodec,
  IsConstructor: () => IsConstructor2,
  IsCyclic: () => IsCyclic,
  IsDependent: () => IsDependent,
  IsEnum: () => IsEnum,
  IsEnumValue: () => IsEnumValue,
  IsFunction: () => IsFunction2,
  IsGeneric: () => IsGeneric,
  IsIdentifier: () => IsIdentifier,
  IsImmutable: () => IsImmutable,
  IsInfer: () => IsInfer,
  IsInteger: () => IsInteger2,
  IsIntersect: () => IsIntersect,
  IsKind: () => IsKind,
  IsLiteral: () => IsLiteral,
  IsNever: () => IsNever,
  IsNull: () => IsNull2,
  IsNumber: () => IsNumber3,
  IsObject: () => IsObject2,
  IsOptional: () => IsOptional,
  IsParameter: () => IsParameter,
  IsReadonly: () => IsReadonly,
  IsRecord: () => IsRecord,
  IsRef: () => IsRef,
  IsRefine: () => IsRefine,
  IsRest: () => IsRest,
  IsSchema: () => IsSchema,
  IsString: () => IsString3,
  IsSymbol: () => IsSymbol2,
  IsTemplateLiteral: () => IsTemplateLiteral,
  IsThis: () => IsThis,
  IsTuple: () => IsTuple,
  IsUndefined: () => IsUndefined2,
  IsUnion: () => IsUnion,
  IsUnknown: () => IsUnknown,
  IsUnsafe: () => IsUnsafe,
  IsVoid: () => IsVoid,
  KeyOf: () => KeyOf2,
  Literal: () => Literal,
  Lowercase: () => Lowercase,
  Mapped: () => Mapped,
  Module: () => Module2,
  Never: () => Never,
  NonNullable: () => NonNullable,
  Null: () => Null,
  Number: () => Number2,
  Object: () => _Object_,
  Omit: () => Omit,
  Optional: () => Optional,
  Parameter: () => Parameter,
  Parameters: () => Parameters,
  Partial: () => Partial,
  Pick: () => Pick,
  Readonly: () => Readonly,
  ReadonlyObject: () => ReadonlyObject,
  ReadonlyType: () => ReadonlyType,
  Record: () => Record,
  RecordKey: () => RecordKey,
  RecordPattern: () => RecordPattern,
  RecordValue: () => RecordValue,
  Ref: () => Ref,
  Refine: () => Refine,
  Required: () => Required,
  Rest: () => Rest,
  ReturnType: () => ReturnType,
  Script: () => Script2,
  String: () => String2,
  Symbol: () => Symbol2,
  TemplateLiteral: () => TemplateLiteral2,
  This: () => This,
  Tuple: () => Tuple,
  Uncapitalize: () => Uncapitalize,
  Undefined: () => Undefined,
  Union: () => Union,
  Unknown: () => Unknown,
  Unsafe: () => Unsafe,
  Uppercase: () => Uppercase,
  Void: () => Void,
  With: () => With2
});

// src/backend/src/tools.ts
init_card_redaction();

// src/backend/src/tools-card-mutations.ts
init_contract();
var ClaimTokenFieldName = "token";
function cardIdField() {
  return typebox_exports.String({ description: "Flowboard card id." });
}
function claimTokenField(description = "Claim token returned by flowboard_claim.") {
  return typebox_exports.Optional(typebox_exports.String({ description }));
}
function createFlowboardMoveTool(params) {
  return {
    name: "flowboard_move",
    label: "Flowboard Move",
    description: "Move a Flowboard card to another status. Claimed cards require matching claim scope.",
    parameters: typebox_exports.Object(
      {
        id: cardIdField(),
        status: typebox_exports.Union(
          FLOWBOARD_STATUSES.map((status) => typebox_exports.Literal(status)),
          { description: "Target Flowboard status." }
        ),
        [ClaimTokenFieldName]: claimTokenField("Claim token for claimed cards.")
      },
      { additionalProperties: false }
    ),
    execute: async (_toolCallId, rawParams) => {
      const { record, id, scope } = await params.readScopedCardToolParams(rawParams);
      return params.redactedCardResult(
        await params.store.move(id, record.status, void 0, scope)
      );
    }
  };
}

// src/backend/src/tools.ts
function contextOwner(ctx) {
  const record = ctx ?? {};
  return typeof record.agentId === "string" && record.agentId || typeof record.sessionKey === "string" && record.sessionKey || typeof record.sessionId === "string" && record.sessionId || "agent";
}
function canMutateCard(card, ownerId, token) {
  const claim = card.metadata?.claim;
  return !claim || claim.ownerId === ownerId || safeEqualSecret3(token, claim.token);
}
function readParentIds(value) {
  if (value == null) {
    return [];
  }
  const entries = typeof value === "string" ? value.split(",") : Array.isArray(value) ? value : void 0;
  if (!entries) {
    throw new Error("parents must be an array or comma-separated string.");
  }
  const parents = [];
  for (const entry of entries) {
    if (typeof entry !== "string") {
      throw new Error("parents must contain only strings.");
    }
    const parent = entry.trim();
    if (!parent || parents.includes(parent)) {
      continue;
    }
    if (parent.length > 120) {
      throw new Error("parents must be 120 characters or fewer.");
    }
    parents.push(parent);
    if (parents.length >= 20) {
      break;
    }
  }
  return parents;
}
async function requireScopedCard(store, cardId, ownerId, token) {
  const card = await store.get(cardId);
  if (!card) {
    throw new Error(`card not found: ${cardId}`);
  }
  if (!canMutateCard(card, ownerId, token)) {
    throw new Error(`card is claimed by ${card.metadata?.claim?.ownerId ?? "another agent"}.`);
  }
  return card;
}
async function requireClaimedCard(store, cardId, ownerId, token) {
  const card = await requireScopedCard(store, cardId, ownerId, token);
  if (!card.metadata?.claim) {
    throw new Error("card must be claimed before lifecycle completion.");
  }
  return card;
}
function summarizeCard(card) {
  return {
    id: card.id,
    title: card.title,
    status: card.status,
    priority: card.priority,
    agentId: card.agentId,
    tenant: card.metadata?.automation?.tenant,
    boardId: card.metadata?.automation?.boardId ?? "default",
    milestoneId: card.milestoneId,
    parents: card.metadata?.links?.filter((link) => link.type === "parent" && link.targetCardId).map((link) => link.targetCardId),
    children: card.metadata?.links?.filter((link) => link.type === "child" && link.targetCardId).map((link) => link.targetCardId),
    claim: card.metadata?.claim ? {
      ownerId: card.metadata.claim.ownerId,
      claimedAt: card.metadata.claim.claimedAt,
      lastHeartbeatAt: card.metadata.claim.lastHeartbeatAt,
      expiresAt: card.metadata.claim.expiresAt
    } : void 0,
    diagnostics: card.metadata?.diagnostics,
    archivedAt: card.metadata?.archivedAt,
    updatedAt: card.updatedAt
  };
}
var ScopedClaimTokenField = claimTokenField("Claim token for claimed cards.");
var OptionalNextStatusField = typebox_exports.Optional(
  typebox_exports.String({ description: "Optional next status." })
);
var OptionalOperatorNoteField = typebox_exports.Optional(
  typebox_exports.String({ description: "Optional operator note." })
);
function readCardToolParams(rawParams, ownerId) {
  const record = rawParams;
  const id = readStringParam(record, "id", { required: true });
  const token = record.token;
  return {
    record,
    id,
    token,
    scope: { ownerId, token }
  };
}
function redactedCardResult(card) {
  return jsonResult({ card: redactClaimToken(card) });
}
function redactedRawCardResult(card) {
  return jsonResult(redactClaimToken(card));
}
function redactedProofResult(card) {
  const proofId = card.metadata?.proof?.at(-1)?.id;
  if (!proofId) {
    throw new Error("proof was not retained in card metadata.");
  }
  return jsonResult({
    card: redactClaimToken(card),
    proofId
  });
}
var CardIdSchema = typebox_exports.Object(
  {
    id: cardIdField(),
    token: claimTokenField()
  },
  { additionalProperties: false }
);
function createFlowboardTools(params) {
  const store = params.store ?? FlowboardStore.openSqlite();
  const ownerId = contextOwner(params.context);
  const readScopedCardToolParams = async (rawParams) => {
    const input = readCardToolParams(rawParams, ownerId);
    await requireScopedCard(store, input.id, ownerId, input.token);
    return input;
  };
  const readClaimedCardToolParams = async (rawParams) => {
    const input = readCardToolParams(rawParams, ownerId);
    await requireClaimedCard(store, input.id, ownerId, input.token);
    return input;
  };
  const runCardMutation = async (rawParams, readParams, mutate) => {
    const { record, id, scope } = await readParams(rawParams);
    return redactedCardResult(await mutate(id, record, scope));
  };
  const runScopedCardMutation = (rawParams, mutate) => runCardMutation(rawParams, readScopedCardToolParams, mutate);
  const runClaimedCardMutation = (rawParams, mutate) => runCardMutation(rawParams, readClaimedCardToolParams, mutate);
  return [
    {
      name: "flowboard_list",
      label: "Flowboard List",
      description: "List Flowboard cards with compact claim and diagnostic state. Use before choosing or routing board work.",
      parameters: typebox_exports.Object(
        {
          status: typebox_exports.Optional(typebox_exports.String({ description: "Optional card status filter." })),
          agentId: typebox_exports.Optional(typebox_exports.String({ description: "Optional agent id filter." })),
          tenant: typebox_exports.Optional(typebox_exports.String({ description: "Optional tenant filter." })),
          boardId: typebox_exports.Optional(typebox_exports.String({ description: "Optional board id filter." })),
          limit: typebox_exports.Optional(
            typebox_exports.Number({ description: "Maximum cards to return. Default 50." })
          ),
          refreshDiagnostics: typebox_exports.Optional(
            typebox_exports.Boolean({ description: "Refresh stored diagnostics before listing." })
          ),
          includeArchived: typebox_exports.Optional(
            typebox_exports.Boolean({ description: "Include archived cards. Default false." })
          )
        },
        { additionalProperties: false }
      ),
      execute: async (_toolCallId, rawParams) => {
        const record = rawParams;
        if (record.refreshDiagnostics === true) {
          await store.refreshDiagnostics();
        }
        const status = typeof record.status === "string" ? record.status : void 0;
        const agentId = typeof record.agentId === "string" ? record.agentId : void 0;
        const tenant = typeof record.tenant === "string" ? record.tenant : void 0;
        const boardId = typeof record.boardId === "string" ? record.boardId : void 0;
        const limit = typeof record.limit === "number" && Number.isFinite(record.limit) ? Math.max(1, Math.min(200, Math.trunc(record.limit))) : 50;
        const cards = (await store.list({ boardId })).filter((card) => record.includeArchived === true || !card.metadata?.archivedAt).filter((card) => !status || card.status === status).filter((card) => !agentId || card.agentId === agentId).filter((card) => !tenant || card.metadata?.automation?.tenant === tenant).slice(0, limit).map(summarizeCard);
        return jsonResult({ cards });
      }
    },
    {
      name: "flowboard_create",
      label: "Flowboard Create",
      description: "Create a Flowboard card, optionally with parent dependencies, tenant, skills, workspace, and idempotency key.",
      parameters: typebox_exports.Object(
        {
          title: typebox_exports.String({ description: "Card title." }),
          notes: typebox_exports.Optional(typebox_exports.String({ description: "Card notes or acceptance criteria." })),
          status: typebox_exports.Optional(typebox_exports.String({ description: "Initial status." })),
          priority: typebox_exports.Optional(typebox_exports.String({ description: "low, normal, high, or urgent." })),
          labels: typebox_exports.Optional(typebox_exports.Array(typebox_exports.String(), { description: "Card labels." })),
          agentId: typebox_exports.Optional(typebox_exports.String({ description: "Assigned agent id." })),
          parents: typebox_exports.Optional(typebox_exports.Array(typebox_exports.String(), { description: "Parent card ids." })),
          token: typebox_exports.Optional(
            typebox_exports.String({ description: "Claim token for claimed parent cards." })
          ),
          tenant: typebox_exports.Optional(typebox_exports.String({ description: "Soft tenant namespace." })),
          boardId: typebox_exports.Optional(typebox_exports.String({ description: "Soft board namespace." })),
          milestoneId: typebox_exports.Optional(
            typebox_exports.String({ description: "Active milestone id; omit for the Unassigned column." })
          ),
          createdByCardId: typebox_exports.Optional(
            typebox_exports.String({ description: "Parent card that created this card." })
          ),
          idempotencyKey: typebox_exports.Optional(typebox_exports.String({ description: "Idempotent create key." })),
          skills: typebox_exports.Optional(typebox_exports.Array(typebox_exports.String(), { description: "Suggested skills." })),
          workspace: typebox_exports.Optional(
            typebox_exports.Object(
              {
                kind: typebox_exports.String({ description: "scratch, dir, or worktree." }),
                path: typebox_exports.Optional(typebox_exports.String({ description: "Absolute dir/worktree path." })),
                branch: typebox_exports.Optional(typebox_exports.String({ description: "Suggested branch." }))
              },
              { additionalProperties: false }
            )
          ),
          maxRuntimeSeconds: typebox_exports.Optional(typebox_exports.Number({ description: "Run timeout seconds." })),
          maxRetries: typebox_exports.Optional(typebox_exports.Number({ description: "Retry budget." })),
          scheduledAt: typebox_exports.Optional(typebox_exports.Number({ description: "Unix epoch milliseconds." }))
        },
        { additionalProperties: false }
      ),
      execute: async (_toolCallId, rawParams) => {
        const record = rawParams;
        readParentIds(record.parents);
        return jsonResult({
          card: redactClaimToken(
            await store.create(record, { ownerId, token: record.token })
          )
        });
      }
    },
    {
      name: "flowboard_link",
      label: "Flowboard Link",
      description: "Link a parent card to a child card so the child becomes ready only after parents are done.",
      parameters: typebox_exports.Object(
        {
          parentId: typebox_exports.String({ description: "Parent card id." }),
          childId: typebox_exports.String({ description: "Child card id." }),
          token: typebox_exports.Optional(
            typebox_exports.String({ description: "Claim token for claimed parent or child cards." })
          )
        },
        { additionalProperties: false }
      ),
      execute: async (_toolCallId, rawParams) => {
        const record = rawParams;
        const parentId = readStringParam(record, "parentId", { required: true });
        const childId = readStringParam(record, "childId", { required: true });
        const token = record.token;
        return jsonResult({
          card: redactClaimToken(await store.linkCards(parentId, childId, { ownerId, token }))
        });
      }
    },
    {
      name: "flowboard_read",
      label: "Flowboard Read",
      description: "Read one Flowboard card and return bounded worker context with notes, attempts, comments, proof, links, and diagnostics.",
      parameters: CardIdSchema,
      execute: async (_toolCallId, rawParams) => {
        const record = rawParams;
        const id = readStringParam(record, "id", { required: true });
        const card = await store.get(id);
        if (!card) {
          throw new Error(`card not found: ${id}`);
        }
        return jsonResult({
          card: redactClaimToken(card),
          workerContext: await store.buildWorkerContext(id)
        });
      }
    },
    {
      name: "flowboard_claim",
      label: "Flowboard Claim",
      description: "Claim a Flowboard card for this agent and move backlog/todo cards into running. Returns a claim token for heartbeats and release.",
      parameters: typebox_exports.Object(
        {
          id: cardIdField(),
          ttlSeconds: typebox_exports.Optional(typebox_exports.Number({ description: "Claim TTL in seconds." }))
        },
        { additionalProperties: false }
      ),
      execute: async (_toolCallId, rawParams) => {
        const record = rawParams;
        const id = readStringParam(record, "id", { required: true });
        const claimed = await store.claim(id, {
          ownerId,
          ttlSeconds: record.ttlSeconds
        });
        return jsonResult({ ...claimed, card: redactClaimToken(claimed.card) });
      }
    },
    {
      name: "flowboard_heartbeat",
      label: "Flowboard Heartbeat",
      description: "Refresh this agent's Flowboard claim heartbeat. Use during long-running card work so diagnostics do not mark it stale.",
      parameters: typebox_exports.Object(
        {
          id: cardIdField(),
          token: claimTokenField(),
          note: typebox_exports.Optional(typebox_exports.String({ description: "Optional compact progress note." }))
        },
        { additionalProperties: false }
      ),
      execute: async (_toolCallId, rawParams) => {
        const { record, id, scope } = await readScopedCardToolParams(rawParams);
        return redactedRawCardResult(
          await store.heartbeat(id, {
            ...scope,
            note: record.note
          })
        );
      }
    },
    {
      name: "flowboard_release",
      label: "Flowboard Release",
      description: "Release this agent's Flowboard claim after finishing, pausing, or handing off card work.",
      parameters: typebox_exports.Object(
        {
          id: cardIdField(),
          token: claimTokenField(),
          status: typebox_exports.Optional(
            typebox_exports.String({ description: "Optional next card status after release." })
          )
        },
        { additionalProperties: false }
      ),
      execute: async (_toolCallId, rawParams) => {
        const { record, id, scope } = await readScopedCardToolParams(rawParams);
        return redactedRawCardResult(
          await store.releaseClaim(id, {
            ...scope,
            status: record.status
          })
        );
      }
    },
    {
      name: "flowboard_comment",
      label: "Flowboard Comment",
      description: "Append a compact comment to a Flowboard card.",
      parameters: typebox_exports.Object(
        {
          id: cardIdField(),
          body: typebox_exports.String({ description: "Comment body." }),
          token: ScopedClaimTokenField
        },
        { additionalProperties: false }
      ),
      execute: async (_toolCallId, rawParams) => {
        const { record, id, scope } = await readScopedCardToolParams(rawParams);
        return redactedRawCardResult(await store.addComment(id, { body: record.body }, scope));
      }
    },
    {
      name: "flowboard_proof",
      label: "Flowboard Proof",
      description: "Attach proof or artifact metadata to a Flowboard card after running tests, checks, or producing screenshots/logs. Returns proofId; pass it to flowboard_complete when that call reports the terminal status for this proof.",
      parameters: typebox_exports.Object(
        {
          id: cardIdField(),
          status: typebox_exports.Optional(
            typebox_exports.String({ description: "passed, failed, skipped, or unknown." })
          ),
          label: typebox_exports.Optional(typebox_exports.String({ description: "Proof label." })),
          command: typebox_exports.Optional(typebox_exports.String({ description: "Command or exact step run." })),
          url: typebox_exports.Optional(typebox_exports.String({ description: "Proof or artifact URL." })),
          note: typebox_exports.Optional(typebox_exports.String({ description: "Short proof note." })),
          artifactPath: typebox_exports.Optional(
            typebox_exports.String({ description: "Optional local artifact path." })
          ),
          token: ScopedClaimTokenField
        },
        { additionalProperties: false }
      ),
      execute: async (_toolCallId, rawParams) => {
        const { record, id, scope } = await readScopedCardToolParams(rawParams);
        const hasArtifact = typeof record.artifactPath === "string" && record.artifactPath.trim() !== "" || typeof record.url === "string" && record.url.trim() !== "";
        const card = hasArtifact ? await store.addProofWithArtifact(
          id,
          record,
          {
            label: record.label,
            path: record.artifactPath,
            url: record.url
          },
          scope
        ) : await store.addProof(id, record, scope);
        return redactedProofResult(card);
      }
    },
    {
      name: "flowboard_complete",
      label: "Flowboard Complete",
      description: "Complete a claimed Flowboard card with a structured summary, proof, artifacts, and created-card manifest.",
      parameters: typebox_exports.Object(
        {
          id: cardIdField(),
          token: claimTokenField(),
          summary: typebox_exports.Optional(typebox_exports.String({ description: "Completion summary." })),
          proofId: typebox_exports.Optional(
            typebox_exports.String({
              description: "Proof id returned by flowboard_proof when resolving that pending proof."
            })
          ),
          proof: typebox_exports.Optional(
            typebox_exports.Object(
              {
                status: typebox_exports.Optional(
                  typebox_exports.String({ description: "passed, failed, skipped, or unknown." })
                ),
                label: typebox_exports.Optional(typebox_exports.String({ description: "Proof label." })),
                command: typebox_exports.Optional(typebox_exports.String({ description: "Command or step run." })),
                url: typebox_exports.Optional(typebox_exports.String({ description: "Proof URL." })),
                note: typebox_exports.Optional(typebox_exports.String({ description: "Proof note." }))
              },
              { additionalProperties: false }
            )
          ),
          artifacts: typebox_exports.Optional(
            typebox_exports.Array(
              typebox_exports.Object(
                {
                  label: typebox_exports.Optional(typebox_exports.String()),
                  url: typebox_exports.Optional(typebox_exports.String()),
                  path: typebox_exports.Optional(typebox_exports.String()),
                  mimeType: typebox_exports.Optional(typebox_exports.String())
                },
                { additionalProperties: false }
              )
            )
          ),
          createdCardIds: typebox_exports.Optional(
            typebox_exports.Array(typebox_exports.String(), { description: "Cards created during this run." })
          )
        },
        { additionalProperties: false }
      ),
      execute: async (_toolCallId, rawParams) => {
        return runClaimedCardMutation(
          rawParams,
          (id, record, scope) => store.complete(id, record, scope)
        );
      }
    },
    {
      name: "flowboard_attachment_add",
      label: "Flowboard Attachment Add",
      description: "Store a small Flowboard attachment in plugin SQLite KV and link it to the card.",
      parameters: typebox_exports.Object(
        {
          id: cardIdField(),
          fileName: typebox_exports.String({ description: "Attachment file name." }),
          contentBase64: typebox_exports.String({ description: "Base64 attachment content." }),
          mimeType: typebox_exports.Optional(typebox_exports.String({ description: "Attachment MIME type." })),
          note: typebox_exports.Optional(typebox_exports.String({ description: "Optional attachment note." })),
          token: ScopedClaimTokenField
        },
        { additionalProperties: false }
      ),
      execute: async (_toolCallId, rawParams) => {
        const { record, id, scope } = await readScopedCardToolParams(rawParams);
        return redactedCardResult(await store.addAttachment(id, record, scope));
      }
    },
    {
      name: "flowboard_attachment_read",
      label: "Flowboard Attachment Read",
      description: "Read one Flowboard attachment from plugin SQLite KV.",
      parameters: typebox_exports.Object(
        {
          id: typebox_exports.String({ description: "Attachment id." })
        },
        { additionalProperties: false }
      ),
      execute: async (_toolCallId, rawParams) => {
        const id = readStringParam(rawParams, "id", {
          required: true
        });
        const attachment = await store.getAttachment(id);
        if (!attachment) {
          throw new Error(`attachment not found: ${id}`);
        }
        return jsonResult(attachment);
      }
    },
    {
      name: "flowboard_attachment_delete",
      label: "Flowboard Attachment Delete",
      description: "Delete one Flowboard attachment from plugin SQLite KV and the card index.",
      parameters: typebox_exports.Object(
        {
          id: cardIdField(),
          attachmentId: typebox_exports.String({ description: "Attachment id." }),
          token: ScopedClaimTokenField
        },
        { additionalProperties: false }
      ),
      execute: async (_toolCallId, rawParams) => {
        const { record, id, scope } = await readScopedCardToolParams(rawParams);
        const attachmentId = readStringParam(record, "attachmentId", { required: true });
        return redactedCardResult(await store.deleteAttachment(id, attachmentId, scope));
      }
    },
    {
      name: "flowboard_block",
      label: "Flowboard Block",
      description: "Block a claimed Flowboard card with a durable reason and release the claim.",
      parameters: typebox_exports.Object(
        {
          id: cardIdField(),
          token: claimTokenField(),
          reason: typebox_exports.Optional(typebox_exports.String({ description: "Blocker summary." }))
        },
        { additionalProperties: false }
      ),
      execute: async (_toolCallId, rawParams) => {
        return runClaimedCardMutation(
          rawParams,
          (id, record, scope) => store.block(id, record, scope)
        );
      }
    },
    {
      name: "flowboard_unblock",
      label: "Flowboard Unblock",
      description: "Move a blocked Flowboard card back to todo after adding enough context.",
      parameters: CardIdSchema,
      execute: async (_toolCallId, rawParams) => {
        const { id, scope } = await readScopedCardToolParams(rawParams);
        return redactedRawCardResult(await store.unblock(id, scope));
      }
    },
    createFlowboardMoveTool({ store, readScopedCardToolParams, redactedCardResult }),
    {
      name: "flowboard_projects",
      label: "Flowboard Projects",
      description: "List Flowboard projects and their card summaries.",
      parameters: typebox_exports.Object(
        {
          includeArchived: typebox_exports.Optional(typebox_exports.Boolean())
        },
        { additionalProperties: false }
      ),
      execute: async (_toolCallId, rawParams) => jsonResult(await store.listProjects(rawParams))
    },
    {
      name: "flowboard_project_create",
      label: "Flowboard Project Create",
      description: "Create a Flowboard project with its first milestone and standard documents.",
      parameters: typebox_exports.Object(
        {
          id: typebox_exports.String({ description: "Stable project id." }),
          name: typebox_exports.String({ description: "Project name." }),
          initialMilestoneTitle: typebox_exports.String({ description: "First milestone title." }),
          description: typebox_exports.Optional(typebox_exports.String()),
          color: typebox_exports.Optional(typebox_exports.String()),
          repositoryUrl: typebox_exports.Optional(typebox_exports.String()),
          planningPath: typebox_exports.Optional(typebox_exports.String())
        },
        { additionalProperties: false }
      ),
      execute: async (_toolCallId, rawParams) => jsonResult({ project: await store.createProject(rawParams) })
    },
    {
      name: "flowboard_project_read",
      label: "Flowboard Project Read",
      description: "Read one Flowboard project's settings, milestones, and cards.",
      parameters: typebox_exports.Object({ id: typebox_exports.String() }, { additionalProperties: false }),
      execute: async (_toolCallId, rawParams) => jsonResult({
        project: await store.getProject(readStringParam(rawParams, "id", {
          required: true
        }))
      })
    },
    {
      name: "flowboard_milestone_create",
      label: "Flowboard Milestone Create",
      description: "Create an active milestone column in a Flowboard project.",
      parameters: typebox_exports.Object(
        {
          boardId: typebox_exports.String(),
          title: typebox_exports.String(),
          description: typebox_exports.Optional(typebox_exports.String()),
          color: typebox_exports.Optional(typebox_exports.String())
        },
        { additionalProperties: false }
      ),
      execute: async (_toolCallId, rawParams) => jsonResult({ milestone: await store.createMilestone(rawParams) })
    },
    {
      name: "flowboard_move_milestone",
      label: "Flowboard Move Milestone",
      description: "Move a card between milestone columns without changing its execution status.",
      parameters: typebox_exports.Object(
        {
          id: cardIdField(),
          milestoneId: typebox_exports.Optional(
            typebox_exports.String({ description: "Target milestone id; omit to move into Unassigned." })
          ),
          position: typebox_exports.Optional(typebox_exports.Number()),
          token: ScopedClaimTokenField
        },
        { additionalProperties: false }
      ),
      execute: async (_toolCallId, rawParams) => {
        const { record, id } = await readScopedCardToolParams(rawParams);
        return redactedCardResult(await store.moveMilestone(id, record));
      }
    },
    {
      name: "flowboard_move_project",
      label: "Flowboard Move Project",
      description: "Move a card to another active project while retaining its execution history.",
      parameters: typebox_exports.Object(
        {
          id: cardIdField(),
          boardId: typebox_exports.String({ description: "Target project id." }),
          milestoneId: typebox_exports.Optional(typebox_exports.String()),
          position: typebox_exports.Optional(typebox_exports.Number()),
          token: ScopedClaimTokenField
        },
        { additionalProperties: false }
      ),
      execute: async (_toolCallId, rawParams) => {
        const { record, id } = await readScopedCardToolParams(rawParams);
        return redactedCardResult(await store.moveProject(id, record));
      }
    },
    {
      name: "flowboard_project_documents",
      label: "Flowboard Project Documents",
      description: "List a project's long-lived context documents.",
      parameters: typebox_exports.Object(
        {
          boardId: typebox_exports.String(),
          includeHidden: typebox_exports.Optional(typebox_exports.Boolean())
        },
        { additionalProperties: false }
      ),
      execute: async (_toolCallId, rawParams) => {
        const record = rawParams;
        return jsonResult(
          await store.listProjectDocuments(record.boardId, {
            includeHidden: record.includeHidden
          })
        );
      }
    },
    {
      name: "flowboard_project_document_create",
      label: "Flowboard Project Document Create",
      description: "Add a typed project document without reading files or secrets.",
      parameters: typebox_exports.Object(
        {
          boardId: typebox_exports.String(),
          key: typebox_exports.String(),
          section: typebox_exports.String({ description: "project, codebase, environment, or knowledge." }),
          type: typebox_exports.String({ description: "markdown, json, link, path, or secret_ref." }),
          title: typebox_exports.String(),
          summary: typebox_exports.Optional(typebox_exports.String()),
          target: typebox_exports.Optional(typebox_exports.String()),
          content: typebox_exports.Optional(typebox_exports.String())
        },
        { additionalProperties: false }
      ),
      execute: async (_toolCallId, rawParams) => jsonResult({
        document: await store.createProjectDocument(rawParams)
      })
    },
    {
      name: "flowboard_boards",
      label: "Flowboard Boards",
      description: "List Flowboard board namespaces with active, archived, and status counts.",
      parameters: typebox_exports.Object({}, { additionalProperties: false }),
      execute: async () => jsonResult(await store.listBoards())
    },
    {
      name: "flowboard_board_create",
      label: "Flowboard Board Create",
      description: "Create or update a Flowboard board namespace with persisted SQLite metadata.",
      parameters: typebox_exports.Object(
        {
          id: typebox_exports.String({ description: "Board id." }),
          name: typebox_exports.Optional(typebox_exports.String({ description: "Display name." })),
          description: typebox_exports.Optional(typebox_exports.String({ description: "Board description." })),
          icon: typebox_exports.Optional(typebox_exports.String({ description: "Short icon or label." })),
          color: typebox_exports.Optional(typebox_exports.String({ description: "Display color token." })),
          defaultWorkspace: typebox_exports.Optional(
            typebox_exports.Object(
              {
                kind: typebox_exports.String({ description: "scratch, dir, or worktree." }),
                path: typebox_exports.Optional(typebox_exports.String({ description: "Absolute dir/worktree path." })),
                branch: typebox_exports.Optional(typebox_exports.String({ description: "Suggested branch." }))
              },
              { additionalProperties: false }
            )
          ),
          orchestration: typebox_exports.Optional(
            typebox_exports.Object(
              {
                autoDecompose: typebox_exports.Optional(
                  typebox_exports.Boolean({ description: "Mark ready triage cards for decomposition." })
                ),
                autoDecomposePerDispatch: typebox_exports.Optional(
                  typebox_exports.Number({ description: "Maximum orchestration candidates per dispatch." })
                ),
                defaultAssignee: typebox_exports.Optional(typebox_exports.String({ description: "Default assignee." })),
                orchestratorProfile: typebox_exports.Optional(
                  typebox_exports.String({ description: "Orchestrator profile id." })
                )
              },
              { additionalProperties: false }
            )
          )
        },
        { additionalProperties: false }
      ),
      execute: async (_toolCallId, rawParams) => jsonResult({ board: await store.upsertBoard(rawParams) })
    },
    {
      name: "flowboard_board_archive",
      label: "Flowboard Board Archive",
      description: "Archive or restore persisted Flowboard board metadata.",
      parameters: typebox_exports.Object(
        {
          id: typebox_exports.String({ description: "Board id." }),
          archived: typebox_exports.Optional(typebox_exports.Boolean({ description: "Archive when true." }))
        },
        { additionalProperties: false }
      ),
      execute: async (_toolCallId, rawParams) => {
        const record = rawParams;
        return jsonResult({ board: await store.archiveBoard(record.id, record.archived) });
      }
    },
    {
      name: "flowboard_board_delete",
      label: "Flowboard Board Delete",
      description: "Delete an empty non-default Flowboard board metadata record.",
      parameters: typebox_exports.Object(
        { id: typebox_exports.String({ description: "Board id." }) },
        { additionalProperties: false }
      ),
      execute: async (_toolCallId, rawParams) => jsonResult(await store.deleteBoard(rawParams.id))
    },
    {
      name: "flowboard_stats",
      label: "Flowboard Stats",
      description: "Summarize Flowboard counts by status and assignee for one board or all boards.",
      parameters: typebox_exports.Object(
        {
          boardId: typebox_exports.Optional(typebox_exports.String({ description: "Optional board id filter." }))
        },
        { additionalProperties: false }
      ),
      execute: async (_toolCallId, rawParams) => {
        const record = rawParams;
        return jsonResult(await store.stats({ boardId: record.boardId }));
      }
    },
    {
      name: "flowboard_runs",
      label: "Flowboard Runs",
      description: "List persisted Flowboard run attempts for one card.",
      parameters: CardIdSchema,
      execute: async (_toolCallId, rawParams) => {
        const id = readStringParam(rawParams, "id", { required: true });
        const result = await store.runs(id);
        return jsonResult({ ...result, card: redactClaimToken(result.card) });
      }
    },
    {
      name: "flowboard_specify",
      label: "Flowboard Specify",
      description: "Turn a rough triage/backlog Flowboard card into a specified todo card after reasoning through the requirements.",
      parameters: typebox_exports.Object(
        {
          id: typebox_exports.String({ description: "Flowboard card id." }),
          title: typebox_exports.Optional(typebox_exports.String({ description: "Clarified title." })),
          notes: typebox_exports.Optional(
            typebox_exports.String({ description: "Clarified notes or acceptance criteria." })
          ),
          agentId: typebox_exports.Optional(typebox_exports.String({ description: "Assigned agent id." })),
          priority: typebox_exports.Optional(typebox_exports.String({ description: "low, normal, high, or urgent." })),
          labels: typebox_exports.Optional(typebox_exports.Array(typebox_exports.String(), { description: "Card labels." })),
          boardId: typebox_exports.Optional(typebox_exports.String({ description: "Board id." })),
          tenant: typebox_exports.Optional(typebox_exports.String({ description: "Tenant or routing namespace." })),
          skills: typebox_exports.Optional(typebox_exports.Array(typebox_exports.String(), { description: "Suggested skills." })),
          workspace: typebox_exports.Optional(
            typebox_exports.Object(
              {
                kind: typebox_exports.String({ description: "scratch, dir, or worktree." }),
                path: typebox_exports.Optional(typebox_exports.String({ description: "Absolute dir/worktree path." })),
                branch: typebox_exports.Optional(typebox_exports.String({ description: "Suggested branch." }))
              },
              { additionalProperties: false }
            )
          ),
          maxRuntimeSeconds: typebox_exports.Optional(typebox_exports.Number({ description: "Runtime budget." })),
          maxRetries: typebox_exports.Optional(typebox_exports.Number({ description: "Retry budget." })),
          summary: typebox_exports.Optional(typebox_exports.String({ description: "Specification summary comment." })),
          token: typebox_exports.Optional(typebox_exports.String({ description: "Claim token for claimed cards." }))
        },
        { additionalProperties: false }
      ),
      execute: async (_toolCallId, rawParams) => {
        const record = rawParams;
        const id = readStringParam(record, "id", { required: true });
        await requireScopedCard(store, id, ownerId, record.token);
        return jsonResult({
          card: redactClaimToken(await store.specify(id, record, { ownerId, token: record.token }))
        });
      }
    },
    {
      name: "flowboard_decompose",
      label: "Flowboard Decompose",
      description: "Fan out a Flowboard card into linked child cards and optionally complete the parent orchestration card.",
      parameters: typebox_exports.Object(
        {
          id: typebox_exports.String({ description: "Parent Flowboard card id." }),
          token: typebox_exports.Optional(typebox_exports.String({ description: "Claim token for claimed cards." })),
          summary: typebox_exports.Optional(typebox_exports.String({ description: "Decomposition summary." })),
          completeParent: typebox_exports.Optional(
            typebox_exports.Boolean({
              description: "Complete the parent after child creation. Default true."
            })
          ),
          children: typebox_exports.Array(
            typebox_exports.Object(
              {
                title: typebox_exports.String({ description: "Child title." }),
                notes: typebox_exports.Optional(typebox_exports.String({ description: "Child notes." })),
                agentId: typebox_exports.Optional(typebox_exports.String({ description: "Assigned agent id." })),
                priority: typebox_exports.Optional(
                  typebox_exports.String({ description: "low, normal, high, or urgent." })
                ),
                labels: typebox_exports.Optional(typebox_exports.Array(typebox_exports.String())),
                boardId: typebox_exports.Optional(typebox_exports.String()),
                tenant: typebox_exports.Optional(typebox_exports.String()),
                skills: typebox_exports.Optional(typebox_exports.Array(typebox_exports.String())),
                workspace: typebox_exports.Optional(
                  typebox_exports.Object(
                    {
                      kind: typebox_exports.String({ description: "scratch, dir, or worktree." }),
                      path: typebox_exports.Optional(
                        typebox_exports.String({ description: "Absolute dir/worktree path." })
                      ),
                      branch: typebox_exports.Optional(typebox_exports.String({ description: "Suggested branch." }))
                    },
                    { additionalProperties: false }
                  )
                ),
                maxRuntimeSeconds: typebox_exports.Optional(typebox_exports.Number()),
                maxRetries: typebox_exports.Optional(typebox_exports.Number()),
                idempotencyKey: typebox_exports.Optional(typebox_exports.String())
              },
              { additionalProperties: false }
            )
          )
        },
        { additionalProperties: false }
      ),
      execute: async (_toolCallId, rawParams) => {
        const record = rawParams;
        const id = readStringParam(record, "id", { required: true });
        await requireScopedCard(store, id, ownerId, record.token);
        const result = await store.decompose(id, record, { ownerId, token: record.token });
        return jsonResult({
          parent: redactClaimToken(result.parent),
          children: result.children.map(redactClaimToken)
        });
      }
    },
    {
      name: "flowboard_notify_subscribe",
      label: "Flowboard Notify Subscribe",
      description: "Persist a Flowboard notification subscription in the plugin SQLite store.",
      parameters: typebox_exports.Object(
        {
          boardId: typebox_exports.Optional(typebox_exports.String({ description: "Board id. Default default." })),
          cardId: typebox_exports.Optional(typebox_exports.String({ description: "Card id." })),
          sessionKey: typebox_exports.Optional(typebox_exports.String({ description: "Session key." })),
          runId: typebox_exports.Optional(typebox_exports.String({ description: "Run id." })),
          target: typebox_exports.Optional(typebox_exports.String({ description: "Human-readable target." })),
          eventKinds: typebox_exports.Optional(
            typebox_exports.Array(typebox_exports.String(), { description: "completed, failed, stale." })
          )
        },
        { additionalProperties: false }
      ),
      execute: async (_toolCallId, rawParams) => jsonResult({
        subscription: await store.subscribeNotifications(rawParams)
      })
    },
    {
      name: "flowboard_notify_list",
      label: "Flowboard Notify List",
      description: "List persisted Flowboard notification subscriptions.",
      parameters: typebox_exports.Object(
        {
          boardId: typebox_exports.Optional(typebox_exports.String({ description: "Board id." })),
          cardId: typebox_exports.Optional(typebox_exports.String({ description: "Card id." }))
        },
        { additionalProperties: false }
      ),
      execute: async (_toolCallId, rawParams) => jsonResult(await store.listNotificationSubscriptions(rawParams))
    },
    {
      name: "flowboard_notify_events",
      label: "Flowboard Notify Events",
      description: "Read replay-safe Flowboard notification events without advancing cursors.",
      parameters: typebox_exports.Object(
        {
          subscriptionId: typebox_exports.Optional(typebox_exports.String({ description: "Subscription id." })),
          boardId: typebox_exports.Optional(typebox_exports.String({ description: "Board id." })),
          cardId: typebox_exports.Optional(typebox_exports.String({ description: "Card id." })),
          limit: typebox_exports.Optional(typebox_exports.Number({ description: "Maximum events. Default 50." }))
        },
        { additionalProperties: false }
      ),
      execute: async (_toolCallId, rawParams) => jsonResult(await store.notificationEvents(rawParams))
    },
    {
      name: "flowboard_notify_advance",
      label: "Flowboard Notify Advance",
      description: "Read Flowboard notification events and advance the subscription cursor.",
      parameters: typebox_exports.Object(
        {
          subscriptionId: typebox_exports.String({ description: "Subscription id." }),
          limit: typebox_exports.Optional(typebox_exports.Number({ description: "Maximum events. Default 50." }))
        },
        { additionalProperties: false }
      ),
      execute: async (_toolCallId, rawParams) => jsonResult(await store.advanceNotificationEvents(rawParams))
    },
    {
      name: "flowboard_notify_unsubscribe",
      label: "Flowboard Notify Unsubscribe",
      description: "Delete a persisted Flowboard notification subscription.",
      parameters: typebox_exports.Object(
        { id: typebox_exports.String({ description: "Subscription id." }) },
        { additionalProperties: false }
      ),
      execute: async (_toolCallId, rawParams) => {
        const id = readStringParam(rawParams, "id", { required: true });
        return jsonResult(await store.deleteNotificationSubscription(id));
      }
    },
    {
      name: "flowboard_promote",
      label: "Flowboard Promote",
      description: "Promote a dependency-ready card into ready, optionally forcing past holds for operator recovery.",
      parameters: typebox_exports.Object(
        {
          id: cardIdField(),
          token: ScopedClaimTokenField,
          force: typebox_exports.Optional(
            typebox_exports.Boolean({ description: "Bypass dependency or schedule holds." })
          ),
          reason: OptionalOperatorNoteField
        },
        { additionalProperties: false }
      ),
      execute: async (_toolCallId, rawParams) => {
        return runScopedCardMutation(
          rawParams,
          (id, record, scope) => store.promote(id, record, scope)
        );
      }
    },
    {
      name: "flowboard_reassign",
      label: "Flowboard Reassign",
      description: "Change a card assignee and optionally reset failure state during recovery.",
      parameters: typebox_exports.Object(
        {
          id: cardIdField(),
          token: ScopedClaimTokenField,
          agentId: typebox_exports.Optional(typebox_exports.String({ description: "New assignee id." })),
          status: OptionalNextStatusField,
          resetFailures: typebox_exports.Optional(typebox_exports.Boolean({ description: "Reset failure count." })),
          reason: OptionalOperatorNoteField
        },
        { additionalProperties: false }
      ),
      execute: async (_toolCallId, rawParams) => {
        return runScopedCardMutation(
          rawParams,
          (id, record, scope) => store.reassign(id, record, scope)
        );
      }
    },
    {
      name: "flowboard_reclaim",
      label: "Flowboard Reclaim",
      description: "Release a stale claim and stop running attempts so another agent can pick it up.",
      parameters: typebox_exports.Object(
        {
          id: cardIdField(),
          token: ScopedClaimTokenField,
          status: OptionalNextStatusField,
          reason: OptionalOperatorNoteField
        },
        { additionalProperties: false }
      ),
      execute: async (_toolCallId, rawParams) => {
        return runScopedCardMutation(
          rawParams,
          (id, record, scope) => store.reclaim(id, record, scope)
        );
      }
    },
    {
      name: "flowboard_dispatch",
      label: "Flowboard Dispatch",
      description: "Advance persisted board state without launching workers: promote unblocked cards, reclaim expired claims, and block timed-out runs.",
      parameters: typebox_exports.Object(
        {
          boardId: typebox_exports.Optional(typebox_exports.String({ description: "Optional board id filter." }))
        },
        { additionalProperties: false }
      ),
      execute: async (_toolCallId, rawParams) => {
        const record = rawParams && typeof rawParams === "object" && !Array.isArray(rawParams) ? rawParams : {};
        const result = await store.dispatch({ boardId: record.boardId });
        return jsonResult({
          ...result,
          promoted: result.promoted.map(redactClaimToken),
          reclaimed: result.reclaimed.map(redactClaimToken),
          blocked: result.blocked.map(redactClaimToken),
          orchestrated: result.orchestrated.map(redactClaimToken)
        });
      }
    },
    {
      name: "flowboard_worker_log",
      label: "Flowboard Worker Log",
      description: "Append a persisted worker log entry to a Flowboard card.",
      parameters: typebox_exports.Object(
        {
          id: cardIdField(),
          level: typebox_exports.Optional(typebox_exports.String({ description: "info, warning, or error." })),
          message: typebox_exports.String({ description: "Worker log message." }),
          sessionKey: typebox_exports.Optional(typebox_exports.String({ description: "Linked session key." })),
          runId: typebox_exports.Optional(typebox_exports.String({ description: "Linked run id." })),
          token: ScopedClaimTokenField
        },
        { additionalProperties: false }
      ),
      execute: async (_toolCallId, rawParams) => {
        const { record, id, scope } = await readScopedCardToolParams(rawParams);
        return redactedCardResult(await store.addWorkerLog(id, record, scope));
      }
    },
    {
      name: "flowboard_protocol_violation",
      label: "Flowboard Protocol Violation",
      description: "Block a card and record a worker protocol violation when work stops without complete/block.",
      parameters: typebox_exports.Object(
        {
          id: cardIdField(),
          detail: typebox_exports.Optional(typebox_exports.String({ description: "Violation detail." })),
          sessionKey: typebox_exports.Optional(typebox_exports.String({ description: "Linked session key." })),
          runId: typebox_exports.Optional(typebox_exports.String({ description: "Linked run id." })),
          token: ScopedClaimTokenField
        },
        { additionalProperties: false }
      ),
      execute: async (_toolCallId, rawParams) => {
        const { record, id, scope } = await readClaimedCardToolParams(rawParams);
        return redactedCardResult(await store.recordProtocolViolation(id, record, scope));
      }
    }
  ];
}

// src/ui-static.ts
import fs4 from "node:fs";
import path5 from "node:path";
import { fileURLToPath } from "node:url";
var UI_PREFIX = "/flowboard/";
var MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".woff2": "font/woff2"
};
function send(req, res, status, headers, body) {
  res.writeHead(status, headers);
  if (req.method !== "HEAD" && body) {
    res.end(body);
    return;
  }
  res.end();
}
function isWithinRoot(root, candidate) {
  const relative = path5.relative(root, candidate);
  return relative === "" || !relative.startsWith(`..${path5.sep}`) && relative !== "..";
}
function resolveUiFile(root, requestPath) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(requestPath);
  } catch {
    return null;
  }
  if (decodedPath.includes("\0") || decodedPath.includes("\\")) {
    return null;
  }
  const relativePath = decodedPath.slice(UI_PREFIX.length).replace(/^\/+/, "");
  const candidate = path5.resolve(root, relativePath || "index.html");
  if (!isWithinRoot(root, candidate)) {
    return null;
  }
  if (fs4.existsSync(candidate) && fs4.statSync(candidate).isFile()) {
    return { filePath: candidate, fallback: false };
  }
  if (path5.extname(relativePath) === "") {
    return { filePath: path5.join(root, "index.html"), fallback: true };
  }
  return null;
}
function createFlowboardStaticUiHandler(uiRoot) {
  const root = path5.resolve(
    uiRoot ?? fileURLToPath(new URL("../ui/dist/", import.meta.url))
  );
  return (req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      send(req, res, 405, { Allow: "GET, HEAD" });
      return true;
    }
    const pathname = new URL(req.url ?? UI_PREFIX, "http://flowboard.local").pathname;
    if (!pathname.startsWith(UI_PREFIX)) {
      send(req, res, 404, {});
      return true;
    }
    const resolved = resolveUiFile(root, pathname);
    if (!resolved) {
      send(req, res, 404, { "Content-Type": "text/plain; charset=utf-8" }, Buffer.from("Not found"));
      return true;
    }
    try {
      const content = fs4.readFileSync(resolved.filePath);
      const extension = path5.extname(resolved.filePath).toLowerCase();
      const immutableAsset = pathname.includes("/assets/") && !resolved.fallback;
      send(
        req,
        res,
        200,
        {
          "Cache-Control": immutableAsset ? "public, max-age=31536000, immutable" : "no-cache",
          "Content-Type": MIME_TYPES[extension] ?? "application/octet-stream",
          "X-Content-Type-Options": "nosniff"
        },
        content
      );
    } catch {
      send(req, res, 404, { "Content-Type": "text/plain; charset=utf-8" }, Buffer.from("Not found"));
    }
    return true;
  };
}

// src/backend/index.ts
var FLOWBOARD_CLI_OPTIONS = {
  descriptors: [
    {
      name: "flowboard",
      description: "Manage Flowboard cards and worker dispatch",
      hasSubcommands: true
    }
  ]
};
var index_default = definePluginEntry({
  id: "flowboard",
  name: "Flowboard",
  description: "Flowboard for agent-owned issues and sessions.",
  register(api) {
    if (api.registrationMode === "cli-metadata") {
      api.registerCli(() => {
      }, FLOWBOARD_CLI_OPTIONS);
      return;
    }
    const store = FlowboardStore.openSqlite();
    api.session.controls.registerControlUiDescriptor({
      surface: "tab",
      id: "flowboard",
      label: "Flowboard",
      description: "Gateway-local board for agent-owned work.",
      icon: "kanban",
      group: "control",
      path: "/flowboard/",
      requiredScopes: ["operator.write"]
    });
    api.registerHttpRoute({
      path: "/flowboard/",
      auth: "plugin",
      match: "prefix",
      handler: createFlowboardStaticUiHandler()
    });
    registerFlowboardGatewayMethods({ api, store });
    registerFlowboardCommand({ api, store });
    api.registerService(createFlowboardChangeEventService(store));
    api.on("subagent_ended", async (event) => {
      if (event.runId) {
        await store.finishExecutionForRun(event.runId, {
          outcome: event.outcome,
          endedAt: event.endedAt,
          reason: event.error ?? event.reason
        });
        await cleanupFlowboardRunWorktree({
          store,
          worktrees: api.runtime.worktrees,
          runId: event.runId
        });
      }
    });
    api.registerCli(
      async ({ program }) => {
        const { registerFlowboardCli: registerFlowboardCli2 } = await Promise.resolve().then(() => (init_cli(), cli_exports));
        registerFlowboardCli2({ program, store });
      },
      FLOWBOARD_CLI_OPTIONS
    );
    api.registerTool(
      (context) => guardFlowboardToolsForWorkspaceAccess(
        createFlowboardTools({ api, context, store }),
        context,
        void 0
      ),
      {
        names: [...FLOWBOARD_TOOL_NAMES],
        optional: true
      }
    );
  }
});
export {
  index_default as default
};
