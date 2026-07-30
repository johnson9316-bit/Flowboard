import { TASKFOLD_STATUSES, type TaskfoldCard } from "../../contract/index.js";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import type { AgentToolResult } from "openclaw/plugin-sdk/tool-results";
import { Type } from "typebox";
import type { TaskfoldMutationScope } from "./store-inputs.js";
import type { TaskfoldStore } from "./store.js";

type ScopedMoveParams = {
  record: Record<string, unknown>;
  id: string;
  scope: TaskfoldMutationScope;
};

const ClaimTokenFieldName = "token" as const;

export function cardIdField() {
  return Type.String({ description: "Taskfold card id." });
}

export function claimTokenField(description = "Claim token returned by taskfold_claim.") {
  return Type.Optional(Type.String({ description }));
}

export function createTaskfoldMoveTool(params: {
  store: TaskfoldStore;
  readScopedCardToolParams: (rawParams: unknown) => Promise<ScopedMoveParams>;
  redactedCardResult: (card: TaskfoldCard) => AgentToolResult<{ card: TaskfoldCard }>;
}): AnyAgentTool {
  return {
    name: "taskfold_move",
    label: "Taskfold Move",
    description:
      "Move a Taskfold card to another status. Claimed cards require matching claim scope.",
    parameters: Type.Object(
      {
        id: cardIdField(),
        status: Type.Union(
          TASKFOLD_STATUSES.map((status) => Type.Literal(status)),
          { description: "Target Taskfold status." },
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
