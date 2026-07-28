import { FLOWBOARD_STATUSES, type FlowboardCard } from "../../contract/index.js";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import type { AgentToolResult } from "openclaw/plugin-sdk/tool-results";
import { Type } from "typebox";
import type { FlowboardMutationScope } from "./store-inputs.js";
import type { FlowboardStore } from "./store.js";

type ScopedMoveParams = {
  record: Record<string, unknown>;
  id: string;
  scope: FlowboardMutationScope;
};

const ClaimTokenFieldName = "token" as const;

export function cardIdField() {
  return Type.String({ description: "Flowboard card id." });
}

export function claimTokenField(description = "Claim token returned by flowboard_claim.") {
  return Type.Optional(Type.String({ description }));
}

export function createFlowboardMoveTool(params: {
  store: FlowboardStore;
  readScopedCardToolParams: (rawParams: unknown) => Promise<ScopedMoveParams>;
  redactedCardResult: (card: FlowboardCard) => AgentToolResult<{ card: FlowboardCard }>;
}): AnyAgentTool {
  return {
    name: "flowboard_move",
    label: "Flowboard Move",
    description:
      "Move a Flowboard card to another status. Claimed cards require matching claim scope.",
    parameters: Type.Object(
      {
        id: cardIdField(),
        status: Type.Union(
          FLOWBOARD_STATUSES.map((status) => Type.Literal(status)),
          { description: "Target Flowboard status." },
        ),
        [ClaimTokenFieldName]: claimTokenField("Claim token for claimed cards."),
      },
      { additionalProperties: false },
    ),
    execute: async (_toolCallId, rawParams) => {
      const { record, id, scope } = await params.readScopedCardToolParams(rawParams);
      return params.redactedCardResult(
        await params.store.move(id, record.status, undefined, scope),
      );
    },
  };
}
