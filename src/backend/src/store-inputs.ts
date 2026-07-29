import type {
  FlowboardBoardSummary,
  FlowboardCard,
  FlowboardDiagnostic,
  FlowboardWorkspace,
  FlowboardWorkspaceAccess,
} from "../../contract/index.js";

export type { FlowboardBoardSummary } from "../../contract/index.js";

type FlowboardCardInput = {
  title?: unknown;
  notes?: unknown;
  status?: unknown;
  priority?: unknown;
  labels?: unknown;
  agentId?: unknown;
  sessionKey?: unknown;
  runId?: unknown;
  taskId?: unknown;
  sourceUrl?: unknown;
  execution?: unknown;
  delivery?: unknown;
  metadata?: unknown;
  templateId?: unknown;
  position?: unknown;
  tenant?: unknown;
  boardId?: unknown;
  milestoneId?: unknown;
  createdByCardId?: unknown;
  idempotencyKey?: unknown;
  skills?: unknown;
  workspace?: unknown;
  /** Trusted mutation provenance; not accepted from public tool schemas. */
  workspaceAccess?: unknown;
  maxRuntimeSeconds?: unknown;
  maxRetries?: unknown;
  scheduledAt?: unknown;
  startedAt?: unknown;
  completedAt?: unknown;
  parents?: unknown;
};

export type FlowboardCardPatch = Partial<
  Omit<FlowboardCardInput, "boardId" | "milestoneId" | "position">
>;
export type FlowboardCommentInput = { body?: unknown };
export type FlowboardLinkInput = {
  type?: unknown;
  targetCardId?: unknown;
  title?: unknown;
  url?: unknown;
};
export type FlowboardLinkedCreateInput = FlowboardCardInput & {
  parents?: unknown;
};
export type FlowboardProofInput = {
  status?: unknown;
  label?: unknown;
  command?: unknown;
  url?: unknown;
  note?: unknown;
};
export type FlowboardArtifactInput = {
  label?: unknown;
  url?: unknown;
  path?: unknown;
  mimeType?: unknown;
};
export type FlowboardSourceReferenceCreateInput = {
  label?: unknown;
  target?: unknown;
  note?: unknown;
};
export type FlowboardSourceReferenceUpdateInput = FlowboardSourceReferenceCreateInput & {
  sourceReferenceId?: unknown;
};
export type FlowboardSourceReferenceDeleteInput = {
  sourceReferenceId?: unknown;
};
export type FlowboardSourceReferenceReorderInput = {
  sourceReferenceIds?: unknown;
};
export type FlowboardAttachmentInput = {
  fileName?: unknown;
  contentBase64?: unknown;
  mimeType?: unknown;
  note?: unknown;
};
export type FlowboardWorkerLogInput = {
  level?: unknown;
  message?: unknown;
  sessionKey?: unknown;
  runId?: unknown;
};
export type FlowboardProtocolViolationInput = {
  detail?: unknown;
  sessionKey?: unknown;
  runId?: unknown;
};
export type FlowboardClaimInput = {
  ownerId?: unknown;
  token?: unknown;
  ttlSeconds?: unknown;
};
export type FlowboardClaimOptions = {
  /** Trusted dispatcher guard; never accepted from public tool or gateway input. */
  expectedAuthority?: {
    boardId: string;
    status: FlowboardCard["status"];
    agentId?: string;
    workspace?: FlowboardWorkspace;
    workspaceAccess?: FlowboardWorkspaceAccess;
  };
  /** Trusted legacy-card adoption; applied only while expectedAuthority still matches. */
  adoptWorkspaceAccess?: FlowboardWorkspaceAccess;
};
export type FlowboardHeartbeatInput = {
  token?: unknown;
  ownerId?: unknown;
  note?: unknown;
};
export type FlowboardBulkInput = {
  ids?: unknown;
  patch?: unknown;
  archived?: unknown;
};
export type FlowboardCompleteInput = {
  ownerId?: unknown;
  token?: unknown;
  summary?: unknown;
  proof?: unknown;
  proofId?: unknown;
  artifacts?: unknown;
  createdCardIds?: unknown;
};
export type FlowboardBlockInput = {
  ownerId?: unknown;
  token?: unknown;
  reason?: unknown;
};
export type FlowboardDispatchResult = {
  promoted: FlowboardCard[];
  reclaimed: FlowboardCard[];
  blocked: FlowboardCard[];
  orchestrated: FlowboardCard[];
  count: number;
};
export type FlowboardListOptions = {
  boardId?: unknown;
};
export type FlowboardDispatchOptions = FlowboardListOptions & {
  now?: unknown;
};
export type FlowboardStatsResult = FlowboardBoardSummary & {
  byAgent: Record<string, number>;
  oldestReadyAgeMs?: number;
};
export type FlowboardPromoteInput = {
  force?: unknown;
  reason?: unknown;
};
export type FlowboardReassignInput = {
  agentId?: unknown;
  status?: unknown;
  resetFailures?: unknown;
  reason?: unknown;
};
export type FlowboardReclaimInput = {
  status?: unknown;
  reason?: unknown;
};
export type FlowboardBoardInput = {
  id?: unknown;
  name?: unknown;
  description?: unknown;
  icon?: unknown;
  color?: unknown;
  position?: unknown;
  version?: unknown;
  currentObjective?: unknown;
  coreValue?: unknown;
  sourceOfTruth?: unknown;
  repositoryUrl?: unknown;
  planningPath?: unknown;
  homepageUrl?: unknown;
  defaultWorkspace?: unknown;
  orchestration?: unknown;
  archived?: unknown;
};
export type FlowboardProjectCreateInput = FlowboardBoardInput & {
  initialMilestoneTitle?: unknown;
};
export type FlowboardMilestoneCreateInput = {
  boardId?: unknown;
  title?: unknown;
  description?: unknown;
  color?: unknown;
  position?: unknown;
};
export type FlowboardMilestoneUpdateInput = {
  title?: unknown;
  description?: unknown;
  color?: unknown;
};
export type FlowboardMilestoneReorderInput = {
  boardId?: unknown;
  milestoneIds?: unknown;
};
export type FlowboardProjectDocumentCreateInput = {
  boardId?: unknown;
  key?: unknown;
  section?: unknown;
  type?: unknown;
  title?: unknown;
  summary?: unknown;
  target?: unknown;
  content?: unknown;
  position?: unknown;
};
export type FlowboardProjectDocumentUpdateInput = Omit<
  FlowboardProjectDocumentCreateInput,
  "boardId" | "key" | "section"
>;
export type FlowboardProjectDocumentReorderInput = {
  boardId?: unknown;
  documentIds?: unknown;
};
export type FlowboardMoveMilestoneInput = {
  milestoneId?: unknown;
  position?: unknown;
};
export type FlowboardMoveProjectInput = {
  boardId?: unknown;
  milestoneId?: unknown;
  position?: unknown;
};
export type FlowboardSpecifyInput = FlowboardCardPatch & {
  summary?: unknown;
};
export type FlowboardDecomposeChildInput = FlowboardLinkedCreateInput & {
  idempotencyKey?: unknown;
};
export type FlowboardDecomposeInput = {
  summary?: unknown;
  children?: unknown;
  completeParent?: unknown;
};
export type FlowboardNotificationSubscribeInput = {
  boardId?: unknown;
  cardId?: unknown;
  sessionKey?: unknown;
  runId?: unknown;
  target?: unknown;
  eventKinds?: unknown;
};
export type FlowboardNotificationListOptions = {
  boardId?: unknown;
  cardId?: unknown;
};
export type FlowboardNotificationEventsInput = FlowboardNotificationListOptions & {
  subscriptionId?: unknown;
  limit?: unknown;
};
export type FlowboardMutationScope = {
  ownerId?: unknown;
  token?: unknown;
};

export type FlowboardDiagnosticsResult = {
  diagnostics: Array<{
    card: FlowboardCard;
    diagnostics: FlowboardDiagnostic[];
  }>;
  count: number;
};
