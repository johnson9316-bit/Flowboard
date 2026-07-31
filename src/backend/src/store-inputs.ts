import type {
  TaskfoldBoardSummary,
  TaskfoldCard,
  TaskfoldDiagnostic,
  TaskfoldWorkspace,
  TaskfoldWorkspaceAccess,
} from "../../contract/index.js";

export type { TaskfoldBoardSummary } from "../../contract/index.js";

type TaskfoldCardInput = {
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
  kind?: unknown;
  requirementId?: unknown;
};

export type TaskfoldCardPatch = Partial<
  Omit<TaskfoldCardInput, "boardId" | "milestoneId" | "position" | "kind" | "requirementId">
>;
export type TaskfoldCommentInput = { body?: unknown };
export type TaskfoldLinkInput = {
  type?: unknown;
  targetCardId?: unknown;
  title?: unknown;
  url?: unknown;
};
export type TaskfoldLinkedCreateInput = TaskfoldCardInput & {
  parents?: unknown;
};
export type TaskfoldProofInput = {
  status?: unknown;
  label?: unknown;
  command?: unknown;
  url?: unknown;
  note?: unknown;
};
export type TaskfoldArtifactInput = {
  label?: unknown;
  url?: unknown;
  path?: unknown;
  mimeType?: unknown;
};
export type TaskfoldSourceReferenceCreateInput = {
  label?: unknown;
  target?: unknown;
  note?: unknown;
};
export type TaskfoldSourceReferenceUpdateInput = TaskfoldSourceReferenceCreateInput & {
  sourceReferenceId?: unknown;
};
export type TaskfoldSourceReferenceDeleteInput = {
  sourceReferenceId?: unknown;
};
export type TaskfoldSourceReferenceReorderInput = {
  sourceReferenceIds?: unknown;
};
export type TaskfoldAttachmentInput = {
  fileName?: unknown;
  contentBase64?: unknown;
  mimeType?: unknown;
  note?: unknown;
};
export type TaskfoldWorkerLogInput = {
  level?: unknown;
  message?: unknown;
  sessionKey?: unknown;
  runId?: unknown;
};
export type TaskfoldProtocolViolationInput = {
  detail?: unknown;
  sessionKey?: unknown;
  runId?: unknown;
};
export type TaskfoldClaimInput = {
  ownerId?: unknown;
  token?: unknown;
  ttlSeconds?: unknown;
};
export type TaskfoldClaimOptions = {
  /** Trusted dispatcher guard; never accepted from public tool or gateway input. */
  expectedAuthority?: {
    boardId: string;
    status: TaskfoldCard["status"];
    agentId?: string;
    workspace?: TaskfoldWorkspace;
    workspaceAccess?: TaskfoldWorkspaceAccess;
  };
  /** Trusted legacy-card adoption; applied only while expectedAuthority still matches. */
  adoptWorkspaceAccess?: TaskfoldWorkspaceAccess;
};
export type TaskfoldHeartbeatInput = {
  token?: unknown;
  ownerId?: unknown;
  note?: unknown;
};
export type TaskfoldBulkInput = {
  ids?: unknown;
  patch?: unknown;
  archived?: unknown;
};
export type TaskfoldCompleteInput = {
  ownerId?: unknown;
  token?: unknown;
  summary?: unknown;
  proof?: unknown;
  proofId?: unknown;
  artifacts?: unknown;
  createdCardIds?: unknown;
};
export type TaskfoldBlockInput = {
  ownerId?: unknown;
  token?: unknown;
  reason?: unknown;
};
export type TaskfoldDispatchResult = {
  promoted: TaskfoldCard[];
  reclaimed: TaskfoldCard[];
  blocked: TaskfoldCard[];
  orchestrated: TaskfoldCard[];
  count: number;
};
export type TaskfoldListOptions = {
  boardId?: unknown;
};
export type TaskfoldDispatchOptions = TaskfoldListOptions & {
  now?: unknown;
};
export type TaskfoldStatsResult = TaskfoldBoardSummary & {
  byAgent: Record<string, number>;
  oldestReadyAgeMs?: number;
};
export type TaskfoldPromoteInput = {
  force?: unknown;
  reason?: unknown;
};
export type TaskfoldReassignInput = {
  agentId?: unknown;
  status?: unknown;
  resetFailures?: unknown;
  reason?: unknown;
};
export type TaskfoldReclaimInput = {
  status?: unknown;
  reason?: unknown;
};
export type TaskfoldBoardInput = {
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
  boardView?: unknown;
  archived?: unknown;
};
export type TaskfoldProjectCreateInput = TaskfoldBoardInput & {
  projectMode?: unknown;
  initialMilestoneTitle?: unknown;
};
export type TaskfoldMilestoneCreateInput = {
  boardId?: unknown;
  title?: unknown;
  description?: unknown;
  color?: unknown;
  position?: unknown;
};
export type TaskfoldMilestoneUpdateInput = {
  title?: unknown;
  description?: unknown;
  color?: unknown;
};
export type TaskfoldMilestoneReorderInput = {
  boardId?: unknown;
  milestoneIds?: unknown;
};
export type TaskfoldProjectDocumentCreateInput = {
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
export type TaskfoldProjectDocumentUpdateInput = Omit<
  TaskfoldProjectDocumentCreateInput,
  "boardId" | "key" | "section"
>;
export type TaskfoldProjectDocumentReorderInput = {
  boardId?: unknown;
  documentIds?: unknown;
};
export type TaskfoldMoveMilestoneInput = {
  milestoneId?: unknown;
  position?: unknown;
};
export type TaskfoldMoveProjectInput = {
  boardId?: unknown;
  milestoneId?: unknown;
  position?: unknown;
};
export type TaskfoldSpecifyInput = TaskfoldCardPatch & {
  summary?: unknown;
};
export type TaskfoldDecomposeChildInput = TaskfoldLinkedCreateInput & {
  idempotencyKey?: unknown;
};
export type TaskfoldDecomposeInput = {
  summary?: unknown;
  children?: unknown;
  completeParent?: unknown;
};
export type TaskfoldNotificationSubscribeInput = {
  boardId?: unknown;
  cardId?: unknown;
  sessionKey?: unknown;
  runId?: unknown;
  target?: unknown;
  eventKinds?: unknown;
};
export type TaskfoldNotificationListOptions = {
  boardId?: unknown;
  cardId?: unknown;
};
export type TaskfoldNotificationEventsInput = TaskfoldNotificationListOptions & {
  subscriptionId?: unknown;
  limit?: unknown;
};
export type TaskfoldMutationScope = {
  ownerId?: unknown;
  token?: unknown;
};

export type TaskfoldDiagnosticsResult = {
  diagnostics: Array<{
    card: TaskfoldCard;
    diagnostics: TaskfoldDiagnostic[];
  }>;
  count: number;
};
