// Flowboard plugin entrypoint registers its OpenClaw integration.
import { definePluginEntry } from "./api.js";
import { registerFlowboardGatewayMethods } from "./runtime-api.js";
import { createFlowboardChangeEventService } from "./src/change-events.js";
import { registerFlowboardCommand } from "./src/command.js";
import { cleanupFlowboardRunWorktree } from "./src/dispatcher-workspace.js";
import { createFlowboardReconcilerService } from "./src/reconciler.js";
import { FlowboardStore } from "./src/store.js";
import { createFlowboardTools } from "./src/tools.js";
import { createFlowboardStaticUiHandler } from "../ui-static.js";
import {
  guardFlowboardToolsForWorkspaceAccess,
  FLOWBOARD_TOOL_NAMES,
} from "./src/workspace-access.js";

const FLOWBOARD_CLI_OPTIONS = {
  descriptors: [
    {
      name: "flowboard",
      description: "Manage Flowboard cards and worker dispatch",
      hasSubcommands: true,
    },
  ],
};

export default definePluginEntry({
  id: "flowboard",
  name: "Flowboard",
  description: "Flowboard for agent-owned issues and sessions.",
  register(api) {
    if (api.registrationMode === "cli-metadata") {
      api.registerCli(() => {}, FLOWBOARD_CLI_OPTIONS);
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
      requiredScopes: ["operator.write"],
    });
    api.registerHttpRoute({
      path: "/flowboard/",
      auth: "plugin",
      match: "prefix",
      handler: createFlowboardStaticUiHandler(),
    });
    registerFlowboardGatewayMethods({ api, store });
    registerFlowboardCommand({ api, store });
    api.registerService(createFlowboardChangeEventService(store));
    // Server-side control loop: converges card state with no browser attached, and
    // recovers runs orphaned by a Gateway restart. The hook below reports outcomes
    // for runs that end normally; the loop covers the case where this process did
    // not live long enough to receive one.
    api.registerService(createFlowboardReconcilerService({ store, runtime: api.runtime }));
    api.on("subagent_ended", async (event) => {
      if (event.runId) {
        await store.finishExecutionForRun(event.runId, {
          outcome: event.outcome,
          endedAt: event.endedAt,
          reason: event.error ?? event.reason,
        });
        await cleanupFlowboardRunWorktree({
          store,
          worktrees: api.runtime.worktrees,
          runId: event.runId,
        });
      }
    });
    api.registerCli(
      async ({ program }) => {
        const { registerFlowboardCli } = await import("./src/cli.js");
        registerFlowboardCli({ program, store });
      },
      FLOWBOARD_CLI_OPTIONS,
    );
    api.registerTool(
      (context) =>
        guardFlowboardToolsForWorkspaceAccess(
          createFlowboardTools({ api, context, store }),
          context,
          undefined,
        ),
      {
        names: [...FLOWBOARD_TOOL_NAMES],
        optional: true,
      },
    );
  },
});
