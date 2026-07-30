import {
  TASKFOLD_STATUSES,
  type TaskfoldCard,
  type TaskfoldStatus,
} from "../../contract/index.js";
// Taskfold plugin module implements cli behavior.
import type { Command } from "commander";
import { formatErrorMessage } from "openclaw/plugin-sdk/error-runtime";
import { addGatewayClientOptions, callGatewayFromCli } from "openclaw/plugin-sdk/gateway-runtime";
import { parseStrictPositiveInteger } from "openclaw/plugin-sdk/number-runtime";
import { getRuntimeConfig } from "openclaw/plugin-sdk/runtime-config-snapshot";
import { isRecord } from "openclaw/plugin-sdk/string-coerce-runtime";
import { resolveTaskfoldCardByIdOrPrefix } from "./card-lookup.js";
import { redactClaimToken } from "./card-redaction.js";
import type { TaskfoldDispatchResult, TaskfoldStore } from "./store.js";

type JsonOptions = {
  json?: boolean;
};

type GatewayOptions = JsonOptions & {
  admin?: boolean;
  url?: string;
  token?: string;
  timeout?: string;
  expectFinal?: boolean;
  board?: string;
};

type DispatchOptions = GatewayOptions & {
  maxStarts?: number;
};

function invalidCliArgument(message: string): Error & { code: string; exitCode: number } {
  const error = new Error(message) as Error & { code: string; exitCode: number };
  error.name = "InvalidArgumentError";
  error.code = "commander.invalidArgument";
  error.exitCode = 1;
  return error;
}

function parsePositiveIntegerOption(value: string, flag: string): number {
  const parsed = parseStrictPositiveInteger(value);
  if (parsed === undefined) {
    throw invalidCliArgument(`${flag} must be a positive integer.`);
  }
  return parsed;
}

function writeJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function writeLine(value: string): void {
  process.stdout.write(`${value}\n`);
}

function splitLabels(value: string | undefined): string[] | undefined {
  return value
    ?.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function isTaskfoldStatus(value: string): value is TaskfoldStatus {
  return (TASKFOLD_STATUSES as readonly string[]).includes(value);
}

function formatCardLine(card: TaskfoldCard): string {
  const boardId = card.metadata?.automation?.boardId ?? "default";
  const milestone = card.milestoneId ? `/${card.milestoneId.slice(0, 8)}` : "/unassigned";
  const agent = card.agentId ? ` ${card.agentId}` : "";
  return `${card.id.slice(0, 8)}  ${card.status.padEnd(8)}  ${card.priority.padEnd(6)}  ${boardId}${milestone}${agent}  ${card.title}`;
}

function redactDispatchResult(result: TaskfoldDispatchResult): TaskfoldDispatchResult {
  return {
    ...result,
    promoted: result.promoted.map(redactClaimToken),
    reclaimed: result.reclaimed.map(redactClaimToken),
    blocked: result.blocked.map(redactClaimToken),
    orchestrated: result.orchestrated.map(redactClaimToken),
  };
}

function writeCards(cards: TaskfoldCard[], options: JsonOptions): void {
  if (options.json) {
    writeJson({ cards: cards.map(redactClaimToken) });
    return;
  }
  for (const card of cards) {
    writeLine(formatCardLine(card));
  }
}

async function callTaskfoldGateway(
  method: string,
  options: GatewayOptions,
  params?: unknown,
): Promise<unknown> {
  return await callGatewayFromCli(method, options, params, {
    mode: "cli",
    scopes: options.admin
      ? ["operator.admin", "operator.write", "operator.read"]
      : ["operator.write", "operator.read"],
  });
}

function isGatewayUnavailableError(error: unknown): boolean {
  const message = formatErrorMessage(error).toLowerCase();
  if (
    [
      "econnrefused",
      "econnreset",
      "ehostunreach",
      "enotfound",
      "gateway not connected",
      "gateway unavailable",
    ].some((marker) => message.includes(marker))
  ) {
    return true;
  }
  const unknownMethod = message.match(/unknown method:\s*([a-z0-9._-]+)/)?.[1];
  return unknownMethod === "taskfold.cards.dispatch";
}

function hasExplicitGatewayTarget(options: GatewayOptions): boolean {
  return Boolean(options.url?.trim() || options.token?.trim());
}

function hasConfiguredRemoteGatewayTarget(): boolean {
  if (process.env.OPENCLAW_GATEWAY_URL?.trim()) {
    return true;
  }
  try {
    return getRuntimeConfig().gateway?.mode === "remote";
  } catch {
    return false;
  }
}

export function registerTaskfoldCli(params: { program: Command; store: TaskfoldStore }): void {
  const taskfold = params.program
    .command("taskfold")
    .description("Manage Taskfold cards and worker dispatch");

  taskfold
    .command("list")
    .description("List Taskfold cards")
    .option("--board <id>", "Board id")
    .option("--status <status>", "Filter by status")
    .option("--include-archived", "Include archived cards (default false)")
    .option("--json", "Print JSON", false)
    .action(
      async (
        options: JsonOptions & {
          board?: string;
          status?: string;
          includeArchived?: boolean;
        },
      ) => {
        // Text output hides archived cards like /taskfold list, while --json
        // keeps the shipped full-card contract for existing scripts.
        let cards = await params.store.list({ boardId: options.board });
        if (!options.json && options.includeArchived !== true) {
          cards = cards.filter((card) => !card.metadata?.archivedAt);
        }
        if (options.status) {
          cards = cards.filter((card) => card.status === options.status);
        }
        writeCards(cards, options);
      },
    );

  taskfold
    .command("create")
    .argument("<title...>", "Card title")
    .description("Create a Taskfold card")
    .option("--notes <text>", "Card notes")
    .option("--status <status>", "Initial status", "todo")
    .option("--priority <priority>", "Priority", "normal")
    .option("--agent <id>", "Assigned agent id")
    .option("--board <id>", "Board id")
    .option("--milestone <id>", "Milestone id; omit for Unassigned")
    .option("--labels <items>", "Comma-separated labels")
    .option("--json", "Print JSON", false)
    .action(
      async (
        title: string[],
        options: JsonOptions & {
          notes?: string;
          status?: string;
          priority?: string;
          agent?: string;
          board?: string;
          milestone?: string;
          labels?: string;
        },
      ) => {
        const card = await params.store.create({
          title: title.join(" "),
          notes: options.notes,
          status: options.status,
          priority: options.priority,
          agentId: options.agent,
          boardId: options.board,
          milestoneId: options.milestone,
          labels: splitLabels(options.labels),
          workspaceAccess: { unrestricted: true },
        });
        if (options.json) {
          writeJson({ card: redactClaimToken(card) });
        } else {
          writeLine(formatCardLine(card));
        }
      },
    );

  taskfold
    .command("show")
    .argument("<id>", "Card id or prefix")
    .description("Show one Taskfold card")
    .option("--json", "Print JSON", false)
    .action(async (id: string, options: JsonOptions) => {
      const cards = await params.store.list();
      const { card, error } = resolveTaskfoldCardByIdOrPrefix(cards, id);
      if (!card) {
        throw new Error(error);
      }
      if (options.json) {
        writeJson({ card: redactClaimToken(card) });
      } else {
        writeLine(formatCardLine(card));
        if (card.notes) {
          writeLine(card.notes);
        }
      }
    });

  const project = taskfold.command("project").description("Manage Taskfold projects");
  project
    .command("list")
    .option("--archived", "Include archived projects")
    .option("--json", "Print JSON", false)
    .action(async (options: JsonOptions & { archived?: boolean }) => {
      const result = await params.store.listProjects({ includeArchived: options.archived });
      if (options.json) {
        writeJson(result);
        return;
      }
      for (const entry of result.projects) {
        writeLine(`${entry.id}  ${entry.name ?? entry.id}${entry.archivedAt ? "  archived" : ""}`);
      }
    });
  project
    .command("create")
    .argument("<id>", "Project id")
    .argument("<name...>", "Project name")
    .option("--milestone <title>", "Optional initial milestone title")
    .option("--workspace <path>", "Existing local project directory")
    .option("--json", "Print JSON", false)
    .action(async (
      id: string,
      name: string[],
      options: JsonOptions & { milestone?: string; workspace?: string },
    ) => {
      const projectView = await params.store.createProject({
        id,
        name: name.join(" "),
        ...(options.milestone ? { initialMilestoneTitle: options.milestone } : {}),
        ...(options.workspace
          ? {
              projectMode: "existing",
              defaultWorkspace: { kind: "dir", path: options.workspace },
            }
          : {}),
      });
      if (options.json) {
        writeJson({ project: projectView });
      } else {
        writeLine(`Created project ${projectView.board.id}`);
      }
    });
  project
    .command("show")
    .argument("<id>", "Project id")
    .option("--json", "Print JSON", false)
    .action(async (id: string, options: JsonOptions) => {
      const projectView = await params.store.getProject(id);
      if (options.json) {
        writeJson({ project: projectView });
      } else {
        writeLine(`${projectView.board.name ?? projectView.board.id} (${projectView.board.id})`);
        for (const milestone of projectView.milestones) {
          writeLine(`- ${milestone.state.padEnd(9)} ${milestone.title}`);
        }
      }
    });
  project
    .command("archive")
    .argument("<id>", "Project id")
    .action(async (id: string) => {
      const result = await params.store.archiveProject(id);
      writeLine(
        `Archived ${result.board.id}${result.runningCards.length ? `; ${result.runningCards.length} running cards remain` : ""}`,
      );
    });
  project
    .command("restore")
    .argument("<id>", "Project id")
    .action(async (id: string) => {
      const result = await params.store.archiveProject(id, false);
      writeLine(`Restored ${result.board.id}`);
    });

  const milestone = project.command("milestone").description("Manage project milestones");
  milestone
    .command("list")
    .argument("<project>", "Project id")
    .option("--json", "Print JSON", false)
    .action(async (boardId: string, options: JsonOptions) => {
      const result = await params.store.listMilestones(boardId);
      if (options.json) {
        writeJson(result);
        return;
      }
      for (const entry of result.milestones) {
        writeLine(`${entry.id.slice(0, 8)}  ${entry.state.padEnd(9)}  ${entry.title}`);
      }
    });
  milestone
    .command("create")
    .argument("<project>", "Project id")
    .argument("<title...>", "Milestone title")
    .action(async (boardId: string, title: string[]) => {
      const created = await params.store.createMilestone({ boardId, title: title.join(" ") });
      writeLine(`Created milestone ${created.id.slice(0, 8)} ${created.title}`);
    });
  milestone
    .command("move-card")
    .argument("<id>", "Card id or prefix")
    .requiredOption("--milestone <id>", "Target milestone id; use unassigned to clear")
    .action(async (id: string, options: { milestone: string }) => {
      const cards = await params.store.list();
      const { card, error } = resolveTaskfoldCardByIdOrPrefix(cards, id);
      if (!card) {
        throw new Error(error);
      }
      const updated = await params.store.moveMilestone(card.id, {
        milestoneId: options.milestone === "unassigned" ? undefined : options.milestone,
      });
      writeLine(formatCardLine(updated));
    });

  const docs = project.command("docs").description("Manage project documents");
  docs
    .command("list")
    .argument("<project>", "Project id")
    .option("--hidden", "Include hidden documents")
    .option("--json", "Print JSON", false)
    .action(async (boardId: string, options: JsonOptions & { hidden?: boolean }) => {
      const result = await params.store.listProjectDocuments(boardId, {
        includeHidden: options.hidden,
      });
      if (options.json) {
        writeJson(result);
        return;
      }
      for (const document of result.documents) {
        writeLine(`${document.section.padEnd(12)} ${document.key.padEnd(20)} ${document.title}`);
      }
    });

  taskfold
    .command("move")
    .argument("<id>", "Card id or prefix")
    .description("Move a Taskfold card to another status")
    .requiredOption("--status <status>", "Target status")
    .option("--json", "Print JSON", false)
    .action(async (id: string, options: JsonOptions & { status: string }) => {
      if (!isTaskfoldStatus(options.status)) {
        throw new Error(`--status must be one of: ${TASKFOLD_STATUSES.join(", ")}.`);
      }
      const cards = await params.store.list();
      const { card, error } = resolveTaskfoldCardByIdOrPrefix(cards, id);
      if (!card) {
        throw new Error(error);
      }
      const updated = await params.store.move(card.id, options.status, undefined);
      if (options.json) {
        writeJson({ card: redactClaimToken(updated) });
      } else {
        writeLine(formatCardLine(updated));
      }
    });

  addGatewayClientOptions(
    taskfold
      .command("dispatch")
      .description("Promote ready cards and start worker runs through the Gateway")
      .option("--board <id>", "Dispatch a single board")
      .option(
        "--max-starts <count>",
        "Maximum new worker runs to start in this pass (default 3)",
        (value: string) => parsePositiveIntegerOption(value, "--max-starts"),
      )
      .option("--admin", "Request full-host workspace access", false)
      .option("--json", "Print JSON", false) as never,
  ).action(async (options: DispatchOptions) => {
    try {
      const method =
        options.maxStarts === undefined
          ? "taskfold.cards.dispatch"
          : "taskfold.cards.dispatchWithOptions";
      const result = await callTaskfoldGateway(method, options, {
        boardId: options.board,
        ...(options.maxStarts !== undefined ? { maxStarts: options.maxStarts } : {}),
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
      if (
        !isGatewayUnavailableError(error) ||
        hasExplicitGatewayTarget(options) ||
        hasConfiguredRemoteGatewayTarget()
      ) {
        throw error;
      }
      const result = redactDispatchResult(await params.store.dispatch({ boardId: options.board }));
      if (options.json) {
        writeJson({ ...result, gatewayUnavailable: true });
      } else {
        writeLine(
          `gateway unavailable; data dispatch only: promoted=${result.promoted.length} blocked=${result.blocked.length}`,
        );
      }
    }
  });
}
