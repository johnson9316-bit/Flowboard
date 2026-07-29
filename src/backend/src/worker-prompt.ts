// Flowboard plugin module builds the worker prompt.
//
// The prompt is the interface between Flowboard and the agent doing the work, so
// it lives in one place and carries a version. Recording that version on each
// attempt is what makes "which prompt produced this run" answerable after the
// fact — otherwise a prompt change silently rewrites the meaning of old runs.
import type { FlowboardCard, FlowboardRunAttempt } from "../../contract/index.js";
import {
  capText,
  cardBoardId,
  cardParentIds,
  computeCardDiagnostics,
} from "./store-card-helpers.js";
import { FLOWBOARD_PROMPT_VERSION } from "./store-constants.js";

/**
 * Bump on any change below that could alter worker behavior. Declared in
 * `store-constants.ts` so the attempt recorder can stamp it without importing
 * this module, and re-exported here because this is where it is decided.
 */
export { FLOWBOARD_PROMPT_VERSION };

const RECENT_ATTEMPTS = 8;
const FAILED_ATTEMPT_DETAIL = 3;

function cardResultSummary(card: FlowboardCard): string | undefined {
  return (
    card.metadata?.automation?.summary ??
    card.metadata?.comments?.findLast((comment) => comment.body.trim())?.body ??
    card.metadata?.proof?.findLast((proof) => proof.note?.trim())?.note
  );
}

function isFailedAttempt(attempt: FlowboardRunAttempt): boolean {
  return attempt.status === "failed" || attempt.status === "blocked" || attempt.status === "stopped";
}

/**
 * Explicit guidance derived from prior failures. The attempt list alone states
 * that earlier tries failed without asking for anything different, so a retry
 * tends to repeat the same approach; this says what to do instead, and warns when
 * the card is on its last try so the worker records findings before the budget
 * closes.
 */
function retryGuidance(card: FlowboardCard): string[] {
  const attempts = card.metadata?.attempts ?? [];
  const failed = attempts.filter(isFailedAttempt);
  if (failed.length === 0) {
    return [];
  }
  const lines = ["", "## This is a retry"];
  lines.push(
    `${failed.length} previous attempt${failed.length === 1 ? "" : "s"} on this card did not succeed. Do not simply repeat the previous approach.`,
  );
  const detailed = failed.slice(-FAILED_ATTEMPT_DETAIL);
  for (const attempt of detailed) {
    const reason = capText(attempt.error, 300) ?? "no reason recorded";
    lines.push(`- ${attempt.status}: ${reason}`);
  }
  lines.push(
    "Before you start: state what you believe went wrong last time and what you are doing differently. If the previous failure looks environmental rather than a code defect, say so instead of retrying blindly.",
  );

  const maxRetries = card.metadata?.automation?.maxRetries;
  const failureCount = card.metadata?.failureCount ?? 0;
  if (maxRetries && failureCount >= maxRetries) {
    lines.push(
      "This is the final attempt within the card's retry budget. If you cannot finish, call flowboard_block with a precise diagnosis and record what you learned — a bare failure leaves the next person with nothing.",
    );
  }
  return lines;
}

/** Card state the worker needs to act: notes, history, dependencies, diagnostics. */
export function buildWorkerContext(
  card: FlowboardCard,
  cards: readonly FlowboardCard[] = [],
  now = Date.now(),
): string {
  const lines = [
    `# Flowboard card ${card.id}`,
    `Title: ${card.title}`,
    `Status: ${card.status}`,
    `Priority: ${card.priority}`,
    `Board: ${cardBoardId(card)}`,
    `Agent: ${card.agentId ?? "(default)"}`,
  ];
  if (card.notes) {
    lines.push("", "## Notes", capText(card.notes, 4000) ?? "");
  }
  const attempts = card.metadata?.attempts?.slice(-RECENT_ATTEMPTS) ?? [];
  if (attempts.length) {
    lines.push("", "## Recent attempts");
    for (const attempt of attempts) {
      lines.push(
        `- ${attempt.status} ${attempt.model ?? ""} ${attempt.error ? `error=${capText(attempt.error, 240)}` : ""}`.trim(),
      );
    }
  }
  lines.push(...retryGuidance(card));
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
        `- ${entry.status}: ${capText(entry.label ?? entry.command ?? entry.url ?? entry.note, 400)}`,
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
        attachment.note,
      ]
        .filter(Boolean)
        .join(" · ");
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
  const parentResults = cardParentIds(card)
    .map((parentId) => cardsById.get(parentId))
    .filter((parent): parent is FlowboardCard => parent !== undefined && parent.status === "done")
    .slice(-6);
  if (parentResults.length) {
    lines.push("", "## Parent results");
    for (const parent of parentResults) {
      lines.push(
        `- ${parent.id} ${parent.title}: ${capText(cardResultSummary(parent), 500) ?? "done"}`,
      );
    }
  }
  const recentAgentWork =
    card.agentId && cards.length
      ? cards
          .filter(
            (entry) =>
              entry.id !== card.id &&
              cardBoardId(entry) === cardBoardId(card) &&
              entry.agentId === card.agentId &&
              entry.status === "done",
          )
          .toSorted((a, b) => b.updatedAt - a.updatedAt)
          .slice(0, 5)
      : [];
  if (recentAgentWork.length) {
    lines.push("", `## Recent done work by ${card.agentId}`);
    for (const entry of recentAgentWork) {
      lines.push(
        `- ${entry.id} ${entry.title}: ${capText(cardResultSummary(entry), 300) ?? "done"}`,
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
        `Workspace: ${automation.workspace.kind}${automation.workspace.path ? ` ${automation.workspace.path}` : ""}`,
      );
    }
    if (automation.summary) {
      lines.push(`Summary: ${capText(automation.summary, 400)}`);
    }
  }
  const diagnostics = computeCardDiagnostics(card, now);
  if (diagnostics.length) {
    lines.push("", "## Active diagnostics");
    for (const entry of diagnostics) {
      lines.push(`- ${entry.severity}: ${entry.title}`);
    }
  }
  return lines.join("\n");
}

/** The worker protocol header plus the card context, as sent to the agent. */
export function buildWorkerPrompt(params: {
  card: FlowboardCard;
  context: string;
  ownerId: string;
  token: string;
}): string {
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
    params.context,
  ].join("\n");
}
