// Taskfold contract declarations define the plugin and Control UI data model.
export const TASKFOLD_STATUSES = [
  "triage",
  "backlog",
  "todo",
  "scheduled",
  "ready",
  "running",
  "review",
  "blocked",
  "done",
] as const;

export const TASKFOLD_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
/** Built-in launch choices. Persisted execution engines remain an open runtime identifier. */
export const TASKFOLD_EXECUTION_ENGINES = ["codex", "claude"] as const;
export const TASKFOLD_EXECUTION_MODES = ["autonomous", "manual"] as const;
export const TASKFOLD_EXECUTION_STATUSES = [
  "idle",
  "running",
  "review",
  "blocked",
  "done",
] as const;
export const TASKFOLD_EVENT_KINDS = [
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
  "stale",
] as const;
export const TASKFOLD_ATTEMPT_STATUSES = [
  "running",
  "succeeded",
  "failed",
  "blocked",
  "stopped",
] as const;
export const TASKFOLD_LINK_TYPES = [
  "parent",
  "child",
  "blocks",
  "blocked_by",
  "relates_to",
] as const;
export const TASKFOLD_PROOF_STATUSES = ["passed", "failed", "skipped", "unknown"] as const;
export const TASKFOLD_TEMPLATE_IDS = ["bugfix", "docs", "release", "pr_review", "plugin"] as const;
export const TASKFOLD_DIAGNOSTIC_KINDS = [
  "stranded_ready",
  "running_without_heartbeat",
  "blocked_too_long",
  "repeated_failures",
  "missing_proof",
  "orphaned_session",
] as const;
export const TASKFOLD_DIAGNOSTIC_SEVERITIES = ["warning", "error", "critical"] as const;
export const TASKFOLD_NOTIFICATION_KINDS = ["completed", "failed", "stale"] as const;
export const TASKFOLD_MILESTONE_STATES = ["active", "completed", "archived"] as const;
export const TASKFOLD_PROJECT_DOCUMENT_SECTIONS = [
  "project",
  "codebase",
  "environment",
  "knowledge",
] as const;
export const TASKFOLD_PROJECT_DOCUMENT_TYPES = [
  "markdown",
  "json",
  "link",
  "path",
  "secret_ref",
] as const;
export const TASKFOLD_PROJECT_DOCUMENT_SOURCES = ["project", "ai_system"] as const;
export const TASKFOLD_DELIVERY_IMPLEMENTATION_STATES = [
  "not_started",
  "in_progress",
  "code_complete",
  "not_applicable",
  "unknown",
] as const;
export const TASKFOLD_DELIVERY_VERIFICATION_STATES = [
  "not_started",
  "partial",
  "passed",
  "failed",
  "human_required",
  "not_required",
  "unknown",
] as const;
export const TASKFOLD_DELIVERY_RELEASE_STATES = [
  "not_started",
  "pending",
  "released",
  "not_required",
  "unknown",
] as const;
export const TASKFOLD_BOARD_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,79}$/;

export function isValidTaskfoldBoardId(value: unknown): value is string {
  return typeof value === "string" && TASKFOLD_BOARD_ID_PATTERN.test(value);
}

export type TaskfoldStatus = (typeof TASKFOLD_STATUSES)[number];
export type TaskfoldPriority = (typeof TASKFOLD_PRIORITIES)[number];
export type TaskfoldExecutionEngine = string;
export type TaskfoldExecutionMode = (typeof TASKFOLD_EXECUTION_MODES)[number];
export type TaskfoldExecutionStatus = (typeof TASKFOLD_EXECUTION_STATUSES)[number];
export type TaskfoldEventKind = (typeof TASKFOLD_EVENT_KINDS)[number];
export type TaskfoldAttemptStatus = (typeof TASKFOLD_ATTEMPT_STATUSES)[number];
export type TaskfoldLinkType = (typeof TASKFOLD_LINK_TYPES)[number];
export type TaskfoldProofStatus = (typeof TASKFOLD_PROOF_STATUSES)[number];
export type TaskfoldTemplateId = (typeof TASKFOLD_TEMPLATE_IDS)[number];
export type TaskfoldDiagnosticKind = (typeof TASKFOLD_DIAGNOSTIC_KINDS)[number];
export type TaskfoldDiagnosticSeverity = (typeof TASKFOLD_DIAGNOSTIC_SEVERITIES)[number];
export type TaskfoldNotificationKind = (typeof TASKFOLD_NOTIFICATION_KINDS)[number];
export type TaskfoldMilestoneState = (typeof TASKFOLD_MILESTONE_STATES)[number];
export type TaskfoldProjectDocumentSection =
  (typeof TASKFOLD_PROJECT_DOCUMENT_SECTIONS)[number];
export type TaskfoldProjectDocumentType = (typeof TASKFOLD_PROJECT_DOCUMENT_TYPES)[number];
export type TaskfoldProjectDocumentSource =
  (typeof TASKFOLD_PROJECT_DOCUMENT_SOURCES)[number];
export type TaskfoldDeliveryImplementationState =
  (typeof TASKFOLD_DELIVERY_IMPLEMENTATION_STATES)[number];
export type TaskfoldDeliveryVerificationState =
  (typeof TASKFOLD_DELIVERY_VERIFICATION_STATES)[number];
export type TaskfoldDeliveryReleaseState = (typeof TASKFOLD_DELIVERY_RELEASE_STATES)[number];

export type TaskfoldExecution = {
  id: string;
  kind: "agent-session";
  engine?: TaskfoldExecutionEngine;
  mode: TaskfoldExecutionMode;
  status: TaskfoldExecutionStatus;
  model?: string;
  sessionKey?: string;
  runId?: string;
  startedAt: number;
  updatedAt: number;
};

export type TaskfoldEvent = {
  id: string;
  kind: TaskfoldEventKind;
  at: number;
  fromStatus?: TaskfoldStatus;
  toStatus?: TaskfoldStatus;
  fromMilestoneId?: string;
  toMilestoneId?: string;
  sessionKey?: string;
  runId?: string;
};

export type TaskfoldRunAttempt = {
  id: string;
  status: TaskfoldAttemptStatus;
  startedAt: number;
  endedAt?: number;
  engine?: TaskfoldExecutionEngine;
  mode?: TaskfoldExecutionMode;
  model?: string;
  sessionKey?: string;
  runId?: string;
  error?: string;
  /**
   * Worker-prompt version that drove this attempt. Without it, changing the
   * prompt silently changes how past attempts should be read.
   */
  promptVersion?: number;
};

export type TaskfoldComment = {
  id: string;
  body: string;
  createdAt: number;
  updatedAt?: number;
};

export type TaskfoldLink = {
  id: string;
  type: TaskfoldLinkType;
  createdAt: number;
  targetCardId?: string;
  title?: string;
  url?: string;
};

export type TaskfoldProof = {
  id: string;
  status: TaskfoldProofStatus;
  createdAt: number;
  label?: string;
  command?: string;
  url?: string;
  note?: string;
};

export type TaskfoldArtifact = {
  id: string;
  createdAt: number;
  label?: string;
  url?: string;
  path?: string;
  mimeType?: string;
};

export type TaskfoldDelivery = {
  objective?: string;
  deliverySummary?: string;
  openItems?: string;
  implementationState?: TaskfoldDeliveryImplementationState;
  verificationState?: TaskfoldDeliveryVerificationState;
  releaseState?: TaskfoldDeliveryReleaseState;
  updatedAt: number;
};

export type TaskfoldSourceReference = {
  id: string;
  label: string;
  target: string;
  position: number;
  createdAt: number;
  updatedAt: number;
  note?: string;
};

export type TaskfoldAttachment = {
  id: string;
  cardId: string;
  createdAt: number;
  fileName: string;
  byteSize: number;
  mimeType?: string;
  note?: string;
};

export type TaskfoldWorkerLog = {
  id: string;
  createdAt: number;
  level: "info" | "warning" | "error";
  message: string;
  sessionKey?: string;
  runId?: string;
};

export type TaskfoldWorkerProtocol = {
  state: "idle" | "running" | "completed" | "blocked" | "violated";
  updatedAt: number;
  detail?: string;
};

export type TaskfoldStaleState = {
  detectedAt: number;
  lastSessionUpdatedAt?: number;
  reason: string;
};

export type TaskfoldClaim = {
  ownerId: string;
  token: string;
  claimedAt: number;
  lastHeartbeatAt: number;
  expiresAt?: number;
};

export type TaskfoldDiagnosticAction = {
  kind: "claim" | "unblock" | "promote" | "reclaim" | "reassign" | "add_proof" | "open_session";
  label: string;
};

export type TaskfoldDiagnostic = {
  kind: TaskfoldDiagnosticKind;
  severity: TaskfoldDiagnosticSeverity;
  title: string;
  detail: string;
  firstSeenAt: number;
  lastSeenAt: number;
  count: number;
  actions: TaskfoldDiagnosticAction[];
};

export type TaskfoldNotification = {
  id: string;
  kind: TaskfoldNotificationKind;
  createdAt: number;
  sequence?: number;
  message: string;
  sessionKey?: string;
  runId?: string;
};

export const TASKFOLD_CHANGED_EVENT = "plugin.taskfold.changed";

export type TaskfoldChange = {
  epoch: string;
  revision: number;
};

export type TaskfoldWorkspace = {
  kind: "scratch" | "dir" | "worktree";
  path?: string;
  branch?: string;
  sourcePath?: string;
  sourceBranch?: string;
};

export type TaskfoldWorkspaceAccess =
  | { unrestricted: true }
  | { unrestricted: false; roots: string[]; writable: boolean };

export type TaskfoldAutomation = {
  tenant?: string;
  boardId?: string;
  createdByCardId?: string;
  idempotencyKey?: string;
  skills?: string[];
  workspace?: TaskfoldWorkspace;
  workspaceAccess?: TaskfoldWorkspaceAccess;
  maxRuntimeSeconds?: number;
  maxRetries?: number;
  scheduledAt?: number;
  summary?: string;
  createdCardIds?: string[];
  dispatchCount?: number;
  lastDispatchAt?: number;
};

export type TaskfoldBoardMetadata = {
  id: string;
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  position?: number;
  version?: string;
  currentObjective?: string;
  coreValue?: string;
  sourceOfTruth?: string;
  repositoryUrl?: string;
  planningPath?: string;
  homepageUrl?: string;
  defaultWorkspace?: TaskfoldWorkspace;
  orchestration?: TaskfoldOrchestrationSettings;
  createdAt: number;
  updatedAt: number;
  archivedAt?: number;
};

export type TaskfoldBoardSummary = {
  id: string;
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  position?: number;
  version?: string;
  currentObjective?: string;
  coreValue?: string;
  sourceOfTruth?: string;
  repositoryUrl?: string;
  planningPath?: string;
  homepageUrl?: string;
  defaultWorkspace?: TaskfoldWorkspace;
  orchestration?: TaskfoldOrchestrationSettings;
  total: number;
  active: number;
  archived: number;
  byStatus: Partial<Record<TaskfoldStatus, number>>;
  updatedAt?: number;
  archivedAt?: number;
};

export type TaskfoldOrchestrationSettings = {
  autoDecompose?: boolean;
  autoDecomposePerDispatch?: number;
  defaultAssignee?: string;
  orchestratorProfile?: string;
};

export type TaskfoldMilestone = {
  id: string;
  boardId: string;
  title: string;
  description?: string;
  color?: string;
  position: number;
  state: TaskfoldMilestoneState;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  archivedAt?: number;
};

export type TaskfoldProjectDocument = {
  id: string;
  boardId: string;
  key: string;
  section: TaskfoldProjectDocumentSection;
  source: TaskfoldProjectDocumentSource;
  type: TaskfoldProjectDocumentType;
  title: string;
  summary?: string;
  target?: string;
  content?: string;
  position: number;
  hiddenAt?: number;
  system?: boolean;
  createdAt: number;
  updatedAt: number;
};

export type TaskfoldProjectDocumentRead = {
  document: TaskfoldProjectDocument;
  content: string;
  source: "stored" | "path";
  revision: string;
  path?: string;
  modifiedAt?: number;
};

export type TaskfoldNotificationSubscription = {
  id: string;
  boardId: string;
  cardId?: string;
  sessionKey?: string;
  runId?: string;
  target?: string;
  eventKinds?: TaskfoldNotificationKind[];
  lastEventAt?: number;
  lastEventId?: string;
  lastEventSequence?: number;
  deliveredEventIds?: string[];
  createdAt: number;
  updatedAt: number;
};

export type TaskfoldMetadata = {
  attempts?: TaskfoldRunAttempt[];
  comments?: TaskfoldComment[];
  links?: TaskfoldLink[];
  proof?: TaskfoldProof[];
  artifacts?: TaskfoldArtifact[];
  attachments?: TaskfoldAttachment[];
  workerLogs?: TaskfoldWorkerLog[];
  workerProtocol?: TaskfoldWorkerProtocol;
  automation?: TaskfoldAutomation;
  claim?: TaskfoldClaim;
  diagnostics?: TaskfoldDiagnostic[];
  notifications?: TaskfoldNotification[];
  templateId?: TaskfoldTemplateId;
  archivedAt?: number;
  stale?: TaskfoldStaleState;
  lifecycleStatusSourceUpdatedAt?: number;
  failureCount?: number;
};

export type TaskfoldCard = {
  id: string;
  title: string;
  notes?: string;
  status: TaskfoldStatus;
  priority: TaskfoldPriority;
  labels: string[];
  agentId?: string;
  sessionKey?: string;
  runId?: string;
  taskId?: string;
  sourceUrl?: string;
  execution?: TaskfoldExecution;
  delivery?: TaskfoldDelivery;
  sourceReferences?: TaskfoldSourceReference[];
  milestoneId?: string;
  position: number;
  createdAt: number;
  updatedAt: number;
  /**
   * Monotonic write counter. Bumped on every persisted card write and used as
   * the optimistic-concurrency token for cross-process compare-and-swap. Unlike
   * `updatedAt` it never collides within a millisecond and never changes without
   * an actual write.
   */
  revision: number;
  startedAt?: number;
  completedAt?: number;
  events?: TaskfoldEvent[];
  metadata?: TaskfoldMetadata;
};

export type TaskfoldProjectView = {
  board: TaskfoldBoardMetadata;
  milestones: TaskfoldMilestone[];
  cards: TaskfoldCard[];
};

export type TaskfoldListResult = {
  cards: TaskfoldCard[];
  statuses: readonly TaskfoldStatus[];
};
