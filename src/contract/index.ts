// Flowboard contract declarations define the plugin and Control UI data model.
export const FLOWBOARD_STATUSES = [
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

export const FLOWBOARD_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
/** Built-in launch choices. Persisted execution engines remain an open runtime identifier. */
export const FLOWBOARD_EXECUTION_ENGINES = ["codex", "claude"] as const;
export const FLOWBOARD_EXECUTION_MODES = ["autonomous", "manual"] as const;
export const FLOWBOARD_EXECUTION_STATUSES = [
  "idle",
  "running",
  "review",
  "blocked",
  "done",
] as const;
export const FLOWBOARD_EVENT_KINDS = [
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
export const FLOWBOARD_ATTEMPT_STATUSES = [
  "running",
  "succeeded",
  "failed",
  "blocked",
  "stopped",
] as const;
export const FLOWBOARD_LINK_TYPES = [
  "parent",
  "child",
  "blocks",
  "blocked_by",
  "relates_to",
] as const;
export const FLOWBOARD_PROOF_STATUSES = ["passed", "failed", "skipped", "unknown"] as const;
export const FLOWBOARD_TEMPLATE_IDS = ["bugfix", "docs", "release", "pr_review", "plugin"] as const;
export const FLOWBOARD_DIAGNOSTIC_KINDS = [
  "stranded_ready",
  "running_without_heartbeat",
  "blocked_too_long",
  "repeated_failures",
  "missing_proof",
  "orphaned_session",
] as const;
export const FLOWBOARD_DIAGNOSTIC_SEVERITIES = ["warning", "error", "critical"] as const;
export const FLOWBOARD_NOTIFICATION_KINDS = ["completed", "failed", "stale"] as const;
export const FLOWBOARD_MILESTONE_STATES = ["active", "completed", "archived"] as const;
export const FLOWBOARD_PROJECT_DOCUMENT_SECTIONS = [
  "project",
  "codebase",
  "environment",
  "knowledge",
] as const;
export const FLOWBOARD_PROJECT_DOCUMENT_TYPES = [
  "markdown",
  "json",
  "link",
  "path",
  "secret_ref",
] as const;
export const FLOWBOARD_PROJECT_DOCUMENT_SOURCES = ["project", "ai_system"] as const;
export const FLOWBOARD_DELIVERY_IMPLEMENTATION_STATES = [
  "not_started",
  "in_progress",
  "code_complete",
  "not_applicable",
  "unknown",
] as const;
export const FLOWBOARD_DELIVERY_VERIFICATION_STATES = [
  "not_started",
  "partial",
  "passed",
  "failed",
  "human_required",
  "not_required",
  "unknown",
] as const;
export const FLOWBOARD_DELIVERY_RELEASE_STATES = [
  "not_started",
  "pending",
  "released",
  "not_required",
  "unknown",
] as const;
export const FLOWBOARD_BOARD_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,79}$/;

export function isValidFlowboardBoardId(value: unknown): value is string {
  return typeof value === "string" && FLOWBOARD_BOARD_ID_PATTERN.test(value);
}

export type FlowboardStatus = (typeof FLOWBOARD_STATUSES)[number];
export type FlowboardPriority = (typeof FLOWBOARD_PRIORITIES)[number];
export type FlowboardExecutionEngine = string;
export type FlowboardExecutionMode = (typeof FLOWBOARD_EXECUTION_MODES)[number];
export type FlowboardExecutionStatus = (typeof FLOWBOARD_EXECUTION_STATUSES)[number];
export type FlowboardEventKind = (typeof FLOWBOARD_EVENT_KINDS)[number];
export type FlowboardAttemptStatus = (typeof FLOWBOARD_ATTEMPT_STATUSES)[number];
export type FlowboardLinkType = (typeof FLOWBOARD_LINK_TYPES)[number];
export type FlowboardProofStatus = (typeof FLOWBOARD_PROOF_STATUSES)[number];
export type FlowboardTemplateId = (typeof FLOWBOARD_TEMPLATE_IDS)[number];
export type FlowboardDiagnosticKind = (typeof FLOWBOARD_DIAGNOSTIC_KINDS)[number];
export type FlowboardDiagnosticSeverity = (typeof FLOWBOARD_DIAGNOSTIC_SEVERITIES)[number];
export type FlowboardNotificationKind = (typeof FLOWBOARD_NOTIFICATION_KINDS)[number];
export type FlowboardMilestoneState = (typeof FLOWBOARD_MILESTONE_STATES)[number];
export type FlowboardProjectDocumentSection =
  (typeof FLOWBOARD_PROJECT_DOCUMENT_SECTIONS)[number];
export type FlowboardProjectDocumentType = (typeof FLOWBOARD_PROJECT_DOCUMENT_TYPES)[number];
export type FlowboardProjectDocumentSource =
  (typeof FLOWBOARD_PROJECT_DOCUMENT_SOURCES)[number];
export type FlowboardDeliveryImplementationState =
  (typeof FLOWBOARD_DELIVERY_IMPLEMENTATION_STATES)[number];
export type FlowboardDeliveryVerificationState =
  (typeof FLOWBOARD_DELIVERY_VERIFICATION_STATES)[number];
export type FlowboardDeliveryReleaseState = (typeof FLOWBOARD_DELIVERY_RELEASE_STATES)[number];

export type FlowboardExecution = {
  id: string;
  kind: "agent-session";
  engine?: FlowboardExecutionEngine;
  mode: FlowboardExecutionMode;
  status: FlowboardExecutionStatus;
  model?: string;
  sessionKey?: string;
  runId?: string;
  startedAt: number;
  updatedAt: number;
};

export type FlowboardEvent = {
  id: string;
  kind: FlowboardEventKind;
  at: number;
  fromStatus?: FlowboardStatus;
  toStatus?: FlowboardStatus;
  fromMilestoneId?: string;
  toMilestoneId?: string;
  sessionKey?: string;
  runId?: string;
};

export type FlowboardRunAttempt = {
  id: string;
  status: FlowboardAttemptStatus;
  startedAt: number;
  endedAt?: number;
  engine?: FlowboardExecutionEngine;
  mode?: FlowboardExecutionMode;
  model?: string;
  sessionKey?: string;
  runId?: string;
  error?: string;
};

export type FlowboardComment = {
  id: string;
  body: string;
  createdAt: number;
  updatedAt?: number;
};

export type FlowboardLink = {
  id: string;
  type: FlowboardLinkType;
  createdAt: number;
  targetCardId?: string;
  title?: string;
  url?: string;
};

export type FlowboardProof = {
  id: string;
  status: FlowboardProofStatus;
  createdAt: number;
  label?: string;
  command?: string;
  url?: string;
  note?: string;
};

export type FlowboardArtifact = {
  id: string;
  createdAt: number;
  label?: string;
  url?: string;
  path?: string;
  mimeType?: string;
};

export type FlowboardDelivery = {
  objective?: string;
  deliverySummary?: string;
  openItems?: string;
  implementationState?: FlowboardDeliveryImplementationState;
  verificationState?: FlowboardDeliveryVerificationState;
  releaseState?: FlowboardDeliveryReleaseState;
  updatedAt: number;
};

export type FlowboardSourceReference = {
  id: string;
  label: string;
  target: string;
  position: number;
  createdAt: number;
  updatedAt: number;
  note?: string;
};

export type FlowboardAttachment = {
  id: string;
  cardId: string;
  createdAt: number;
  fileName: string;
  byteSize: number;
  mimeType?: string;
  note?: string;
};

export type FlowboardWorkerLog = {
  id: string;
  createdAt: number;
  level: "info" | "warning" | "error";
  message: string;
  sessionKey?: string;
  runId?: string;
};

export type FlowboardWorkerProtocol = {
  state: "idle" | "running" | "completed" | "blocked" | "violated";
  updatedAt: number;
  detail?: string;
};

export type FlowboardStaleState = {
  detectedAt: number;
  lastSessionUpdatedAt?: number;
  reason: string;
};

export type FlowboardClaim = {
  ownerId: string;
  token: string;
  claimedAt: number;
  lastHeartbeatAt: number;
  expiresAt?: number;
};

export type FlowboardDiagnosticAction = {
  kind: "claim" | "unblock" | "promote" | "reclaim" | "reassign" | "add_proof" | "open_session";
  label: string;
};

export type FlowboardDiagnostic = {
  kind: FlowboardDiagnosticKind;
  severity: FlowboardDiagnosticSeverity;
  title: string;
  detail: string;
  firstSeenAt: number;
  lastSeenAt: number;
  count: number;
  actions: FlowboardDiagnosticAction[];
};

export type FlowboardNotification = {
  id: string;
  kind: FlowboardNotificationKind;
  createdAt: number;
  sequence?: number;
  message: string;
  sessionKey?: string;
  runId?: string;
};

export const FLOWBOARD_CHANGED_EVENT = "plugin.flowboard.changed";

export type FlowboardChange = {
  epoch: string;
  revision: number;
};

export type FlowboardWorkspace = {
  kind: "scratch" | "dir" | "worktree";
  path?: string;
  branch?: string;
  sourcePath?: string;
  sourceBranch?: string;
};

export type FlowboardWorkspaceAccess =
  | { unrestricted: true }
  | { unrestricted: false; roots: string[]; writable: boolean };

export type FlowboardAutomation = {
  tenant?: string;
  boardId?: string;
  createdByCardId?: string;
  idempotencyKey?: string;
  skills?: string[];
  workspace?: FlowboardWorkspace;
  workspaceAccess?: FlowboardWorkspaceAccess;
  maxRuntimeSeconds?: number;
  maxRetries?: number;
  scheduledAt?: number;
  summary?: string;
  createdCardIds?: string[];
  dispatchCount?: number;
  lastDispatchAt?: number;
};

export type FlowboardBoardMetadata = {
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
  defaultWorkspace?: FlowboardWorkspace;
  orchestration?: FlowboardOrchestrationSettings;
  createdAt: number;
  updatedAt: number;
  archivedAt?: number;
};

export type FlowboardBoardSummary = {
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
  defaultWorkspace?: FlowboardWorkspace;
  orchestration?: FlowboardOrchestrationSettings;
  total: number;
  active: number;
  archived: number;
  byStatus: Partial<Record<FlowboardStatus, number>>;
  updatedAt?: number;
  archivedAt?: number;
};

export type FlowboardOrchestrationSettings = {
  autoDecompose?: boolean;
  autoDecomposePerDispatch?: number;
  defaultAssignee?: string;
  orchestratorProfile?: string;
};

export type FlowboardMilestone = {
  id: string;
  boardId: string;
  title: string;
  description?: string;
  color?: string;
  position: number;
  state: FlowboardMilestoneState;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  archivedAt?: number;
};

export type FlowboardProjectDocument = {
  id: string;
  boardId: string;
  key: string;
  section: FlowboardProjectDocumentSection;
  source: FlowboardProjectDocumentSource;
  type: FlowboardProjectDocumentType;
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

export type FlowboardProjectDocumentRead = {
  document: FlowboardProjectDocument;
  content: string;
  source: "stored" | "path";
  revision: string;
  path?: string;
  modifiedAt?: number;
};

export type FlowboardNotificationSubscription = {
  id: string;
  boardId: string;
  cardId?: string;
  sessionKey?: string;
  runId?: string;
  target?: string;
  eventKinds?: FlowboardNotificationKind[];
  lastEventAt?: number;
  lastEventId?: string;
  lastEventSequence?: number;
  deliveredEventIds?: string[];
  createdAt: number;
  updatedAt: number;
};

export type FlowboardMetadata = {
  attempts?: FlowboardRunAttempt[];
  comments?: FlowboardComment[];
  links?: FlowboardLink[];
  proof?: FlowboardProof[];
  artifacts?: FlowboardArtifact[];
  attachments?: FlowboardAttachment[];
  workerLogs?: FlowboardWorkerLog[];
  workerProtocol?: FlowboardWorkerProtocol;
  automation?: FlowboardAutomation;
  claim?: FlowboardClaim;
  diagnostics?: FlowboardDiagnostic[];
  notifications?: FlowboardNotification[];
  templateId?: FlowboardTemplateId;
  archivedAt?: number;
  stale?: FlowboardStaleState;
  lifecycleStatusSourceUpdatedAt?: number;
  failureCount?: number;
};

export type FlowboardCard = {
  id: string;
  title: string;
  notes?: string;
  status: FlowboardStatus;
  priority: FlowboardPriority;
  labels: string[];
  agentId?: string;
  sessionKey?: string;
  runId?: string;
  taskId?: string;
  sourceUrl?: string;
  execution?: FlowboardExecution;
  delivery?: FlowboardDelivery;
  sourceReferences?: FlowboardSourceReference[];
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
  events?: FlowboardEvent[];
  metadata?: FlowboardMetadata;
};

export type FlowboardProjectView = {
  board: FlowboardBoardMetadata;
  milestones: FlowboardMilestone[];
  cards: FlowboardCard[];
};

export type FlowboardListResult = {
  cards: FlowboardCard[];
  statuses: readonly FlowboardStatus[];
};
