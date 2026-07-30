import { randomUUID } from "node:crypto";
import {
  isValidTaskfoldBoardId,
  TASKFOLD_ATTEMPT_STATUSES,
  TASKFOLD_DIAGNOSTIC_KINDS,
  TASKFOLD_DIAGNOSTIC_SEVERITIES,
  TASKFOLD_DELIVERY_IMPLEMENTATION_STATES,
  TASKFOLD_DELIVERY_RELEASE_STATES,
  TASKFOLD_DELIVERY_VERIFICATION_STATES,
  TASKFOLD_EVENT_KINDS,
  TASKFOLD_EXECUTION_MODES,
  TASKFOLD_EXECUTION_STATUSES,
  TASKFOLD_LINK_TYPES,
  TASKFOLD_NOTIFICATION_KINDS,
  TASKFOLD_PRIORITIES,
  TASKFOLD_PROOF_STATUSES,
  TASKFOLD_STATUSES,
  TASKFOLD_TEMPLATE_IDS,
  type TaskfoldArtifact,
  type TaskfoldAttachment,
  type TaskfoldAttemptStatus,
  type TaskfoldAutomation,
  type TaskfoldBoardMetadata,
  type TaskfoldClaim,
  type TaskfoldComment,
  type TaskfoldDiagnostic,
  type TaskfoldDiagnosticAction,
  type TaskfoldDiagnosticKind,
  type TaskfoldDiagnosticSeverity,
  type TaskfoldDelivery,
  type TaskfoldDeliveryImplementationState,
  type TaskfoldDeliveryReleaseState,
  type TaskfoldDeliveryVerificationState,
  type TaskfoldEvent,
  type TaskfoldEventKind,
  type TaskfoldExecution,
  type TaskfoldExecutionMode,
  type TaskfoldExecutionStatus,
  type TaskfoldLink,
  type TaskfoldLinkType,
  type TaskfoldMetadata,
  type TaskfoldNotification,
  type TaskfoldNotificationKind,
  type TaskfoldNotificationSubscription,
  type TaskfoldOrchestrationSettings,
  type TaskfoldPriority,
  type TaskfoldProof,
  type TaskfoldProofStatus,
  type TaskfoldRunAttempt,
  type TaskfoldStatus,
  type TaskfoldTemplateId,
  type TaskfoldWorkerLog,
  type TaskfoldWorkerProtocol,
  type TaskfoldWorkspace,
} from "../../contract/index.js";
import {
  MAX_ATTACHMENT_BYTES,
  MAX_CARD_ARTIFACTS,
  MAX_CARD_ATTACHMENTS,
  MAX_CARD_ATTEMPTS,
  MAX_CARD_COMMENTS,
  MAX_CARD_DIAGNOSTICS,
  MAX_CARD_EVENTS,
  MAX_CARD_LINKS,
  MAX_CARD_METADATA_BYTES,
  MAX_CARD_NOTIFICATIONS,
  MAX_CARD_PROOF,
  MAX_CARD_WORKER_LOGS,
} from "./store-constants.js";
import type {
  TaskfoldAttachmentInput,
  TaskfoldBoardInput,
  TaskfoldNotificationSubscribeInput,
  TaskfoldProofInput,
} from "./store-inputs.js";
import { isAbsoluteWorkspacePath } from "./workspace-path.js";

export function normalizeOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function normalizeBoardId(value: unknown, fallback?: string): string | undefined {
  const raw = normalizeBoundedString(value, fallback, 80, "board id");
  if (!raw) {
    return undefined;
  }
  const boardId = raw.toLowerCase();
  if (!isValidTaskfoldBoardId(boardId)) {
    throw new Error("board id must match [a-z0-9][a-z0-9._-]{0,79}.");
  }
  return boardId;
}

export function normalizeBoardIdRequired(value: unknown): string {
  return normalizeBoardId(value) ?? "default";
}

export function normalizeBoardMetadata(
  input: TaskfoldBoardInput,
  fallback: TaskfoldBoardMetadata | undefined,
  now = Date.now(),
): TaskfoldBoardMetadata {
  const id = normalizeBoardId(input.id, fallback?.id) ?? "default";
  const name = normalizeBoundedString(input.name, fallback?.name, 120, "board name");
  const description = normalizeBoundedString(
    input.description,
    fallback?.description,
    1000,
    "board description",
  );
  const icon = normalizeBoundedString(input.icon, fallback?.icon, 40, "board icon");
  const color = normalizeBoundedString(input.color, fallback?.color, 40, "board color");
  const position = Object.hasOwn(input, "position")
    ? normalizePosition(input.position, fallback?.position ?? 0)
    : fallback?.position;
  const version = normalizeBoundedString(input.version, fallback?.version, 120, "project version");
  const currentObjective = normalizeBoundedString(
    input.currentObjective,
    fallback?.currentObjective,
    2000,
    "current objective",
  );
  const coreValue = normalizeBoundedString(input.coreValue, fallback?.coreValue, 2000, "core value");
  const sourceOfTruth = Object.hasOwn(input, "sourceOfTruth")
    ? normalizeExternalUrl(input.sourceOfTruth, fallback?.sourceOfTruth, "source of truth")
    : fallback?.sourceOfTruth;
  const repositoryUrl = Object.hasOwn(input, "repositoryUrl")
    ? normalizeExternalUrl(input.repositoryUrl, fallback?.repositoryUrl, "repository URL")
    : fallback?.repositoryUrl;
  const planningPath = normalizeBoundedString(
    input.planningPath,
    fallback?.planningPath,
    2000,
    "planning path",
  );
  const homepageUrl = Object.hasOwn(input, "homepageUrl")
    ? normalizeExternalUrl(input.homepageUrl, fallback?.homepageUrl, "homepage URL")
    : fallback?.homepageUrl;
  const defaultWorkspace = Object.hasOwn(input, "defaultWorkspace")
    ? normalizeWorkspace(input.defaultWorkspace, fallback?.defaultWorkspace)
    : fallback?.defaultWorkspace;
  const orchestration = Object.hasOwn(input, "orchestration")
    ? normalizeOrchestration(input.orchestration, fallback?.orchestration)
    : fallback?.orchestration;
  const archivedAt = Object.hasOwn(input, "archived")
    ? input.archived === false
      ? undefined
      : now
    : fallback?.archivedAt;
  return {
    id,
    ...(name ? { name } : {}),
    ...(description ? { description } : {}),
    ...(icon ? { icon } : {}),
    ...(color ? { color } : {}),
    ...(position !== undefined ? { position } : {}),
    ...(version ? { version } : {}),
    ...(currentObjective ? { currentObjective } : {}),
    ...(coreValue ? { coreValue } : {}),
    ...(sourceOfTruth ? { sourceOfTruth } : {}),
    ...(repositoryUrl ? { repositoryUrl } : {}),
    ...(planningPath ? { planningPath } : {}),
    ...(homepageUrl ? { homepageUrl } : {}),
    ...(defaultWorkspace ? { defaultWorkspace } : {}),
    ...(orchestration ? { orchestration } : {}),
    createdAt: fallback?.createdAt ?? now,
    updatedAt: now,
    ...(archivedAt ? { archivedAt } : {}),
  };
}

function normalizeOrchestration(
  value: unknown,
  fallback?: TaskfoldOrchestrationSettings,
): TaskfoldOrchestrationSettings | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }
  const record = value as Record<string, unknown>;
  const autoDecompose =
    typeof record.autoDecompose === "boolean" ? record.autoDecompose : fallback?.autoDecompose;
  const autoDecomposePerDispatch =
    typeof record.autoDecomposePerDispatch === "number" &&
    Number.isFinite(record.autoDecomposePerDispatch)
      ? Math.max(1, Math.min(20, Math.trunc(record.autoDecomposePerDispatch)))
      : fallback?.autoDecomposePerDispatch;
  const defaultAssignee = normalizeBoundedString(
    record.defaultAssignee,
    fallback?.defaultAssignee,
    120,
    "default assignee",
  );
  const orchestratorProfile = normalizeBoundedString(
    record.orchestratorProfile,
    fallback?.orchestratorProfile,
    120,
    "orchestrator profile",
  );
  const next: TaskfoldOrchestrationSettings = {
    ...(autoDecompose !== undefined ? { autoDecompose } : {}),
    ...(autoDecomposePerDispatch ? { autoDecomposePerDispatch } : {}),
    ...(defaultAssignee ? { defaultAssignee } : {}),
    ...(orchestratorProfile ? { orchestratorProfile } : {}),
  };
  return Object.keys(next).length ? next : undefined;
}

function normalizeNotificationKinds(value: unknown): TaskfoldNotificationKind[] | undefined {
  if (value == null) {
    return undefined;
  }
  const entries = typeof value === "string" ? value.split(",") : Array.isArray(value) ? value : [];
  const kinds: TaskfoldNotificationKind[] = [];
  for (const entry of entries) {
    const kind = typeof entry === "string" ? entry.trim() : "";
    if (!TASKFOLD_NOTIFICATION_KINDS.includes(kind as TaskfoldNotificationKind)) {
      throw new Error(
        `notification kind must be one of: ${TASKFOLD_NOTIFICATION_KINDS.join(", ")}.`,
      );
    }
    const notificationKind = kind as TaskfoldNotificationKind;
    if (!kinds.includes(notificationKind)) {
      kinds.push(notificationKind);
    }
  }
  return kinds.length ? kinds : undefined;
}

export function normalizeNotificationSubscription(
  input: TaskfoldNotificationSubscribeInput,
  fallback?: TaskfoldNotificationSubscription,
  now = Date.now(),
): TaskfoldNotificationSubscription {
  const boardId = normalizeBoardId(input.boardId, fallback?.boardId) ?? "default";
  const cardId = normalizeBoundedString(input.cardId, fallback?.cardId, 120, "card id");
  const sessionKey = normalizeBoundedString(
    input.sessionKey,
    fallback?.sessionKey,
    240,
    "session key",
  );
  const runId = normalizeBoundedString(input.runId, fallback?.runId, 160, "run id");
  const target = normalizeBoundedString(input.target, fallback?.target, 240, "notification target");
  if (!cardId && !sessionKey && !runId && !target) {
    throw new Error("notification subscription needs cardId, sessionKey, runId, or target.");
  }
  const eventKinds = normalizeNotificationKinds(input.eventKinds);
  const preservedFields: Partial<TaskfoldNotificationSubscription> = {};
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
    ...(cardId ? { cardId } : {}),
    ...(sessionKey ? { sessionKey } : {}),
    ...(runId ? { runId } : {}),
    ...(target ? { target } : {}),
    ...(eventKinds ? { eventKinds } : {}),
    ...preservedFields,
    createdAt: fallback?.createdAt ?? now,
    updatedAt: now,
  };
}

export function normalizeTitle(value: unknown): string {
  const title = normalizeOptionalString(value);
  if (!title) {
    throw new Error("title is required.");
  }
  if (title.length > 180) {
    throw new Error("title must be 180 characters or fewer.");
  }
  return title;
}

export function normalizeNotes(value: unknown): string | undefined {
  const notes = normalizeOptionalString(value);
  if (!notes) {
    return undefined;
  }
  if (notes.length > 4000) {
    throw new Error("notes must be 4000 characters or fewer.");
  }
  return notes;
}

function normalizeOptionalBoundedString(
  value: unknown,
  maxLength: number,
  fieldName: string,
): string | undefined {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return undefined;
  }
  if (normalized.length > maxLength) {
    throw new Error(`${fieldName} must be ${maxLength} characters or fewer.`);
  }
  return normalized;
}

function normalizeDeliveryState<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fieldName: string,
): T | undefined {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }
  if (!allowed.includes(value as T)) {
    throw new Error(`${fieldName} must be one of: ${allowed.join(", ")}.`);
  }
  return value as T;
}

export function normalizeDelivery(
  value: unknown,
  fallback?: TaskfoldDelivery,
  now = Date.now(),
): TaskfoldDelivery | undefined {
  if (value === null) {
    return undefined;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }
  const record = value as Record<string, unknown>;
  const readText = (
    key: "objective" | "deliverySummary" | "openItems",
    maxLength: number,
    fieldName: string,
  ) =>
    Object.hasOwn(record, key)
      ? normalizeOptionalBoundedString(record[key], maxLength, fieldName)
      : fallback?.[key];
  const implementationState = Object.hasOwn(record, "implementationState")
    ? normalizeDeliveryState(
        record.implementationState,
        TASKFOLD_DELIVERY_IMPLEMENTATION_STATES,
        "implementation state",
      )
    : fallback?.implementationState;
  const verificationState = Object.hasOwn(record, "verificationState")
    ? normalizeDeliveryState(
        record.verificationState,
        TASKFOLD_DELIVERY_VERIFICATION_STATES,
        "verification state",
      )
    : fallback?.verificationState;
  const releaseState = Object.hasOwn(record, "releaseState")
    ? normalizeDeliveryState(
        record.releaseState,
        TASKFOLD_DELIVERY_RELEASE_STATES,
        "release state",
      )
    : fallback?.releaseState;
  const delivery: Omit<TaskfoldDelivery, "updatedAt"> = {
    ...(readText("objective", 2000, "delivery objective")
      ? { objective: readText("objective", 2000, "delivery objective") }
      : {}),
    ...(readText("deliverySummary", 4000, "delivery summary")
      ? { deliverySummary: readText("deliverySummary", 4000, "delivery summary") }
      : {}),
    ...(readText("openItems", 4000, "delivery open items")
      ? { openItems: readText("openItems", 4000, "delivery open items") }
      : {}),
    ...(implementationState
      ? { implementationState: implementationState as TaskfoldDeliveryImplementationState }
      : {}),
    ...(verificationState
      ? { verificationState: verificationState as TaskfoldDeliveryVerificationState }
      : {}),
    ...(releaseState ? { releaseState: releaseState as TaskfoldDeliveryReleaseState } : {}),
  };
  return Object.keys(delivery).length ? { ...delivery, updatedAt: now } : undefined;
}

export function normalizeBoundedString(
  value: unknown,
  fallback: string | undefined,
  maxLength: number,
  fieldName: string,
): string | undefined {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return fallback;
  }
  if (normalized.length > maxLength) {
    throw new Error(`${fieldName} must be ${maxLength} characters or fewer.`);
  }
  return normalized;
}

export function normalizeExternalUrl(
  value: unknown,
  fallback: string | undefined,
  fieldName: string,
): string | undefined {
  const normalized = normalizeBoundedString(value, fallback, 2000, fieldName);
  if (!normalized) {
    return undefined;
  }
  let parsed: URL;
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

export function normalizeStatus(value: unknown, fallback: TaskfoldStatus): TaskfoldStatus {
  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }
  if ((TASKFOLD_STATUSES as readonly string[]).includes(value)) {
    return value as TaskfoldStatus;
  }
  throw new Error(`status must be one of: ${TASKFOLD_STATUSES.join(", ")}.`);
}

export function normalizePriority(value: unknown, fallback: TaskfoldPriority): TaskfoldPriority {
  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }
  if ((TASKFOLD_PRIORITIES as readonly string[]).includes(value)) {
    return value as TaskfoldPriority;
  }
  throw new Error(`priority must be one of: ${TASKFOLD_PRIORITIES.join(", ")}.`);
}

export function normalizeLabels(value: unknown, fallback: string[] = []): string[] {
  if (value == null) {
    return fallback;
  }
  const entries =
    typeof value === "string" ? value.split(",") : Array.isArray(value) ? value : undefined;
  if (!entries) {
    throw new Error("labels must be an array or comma-separated string.");
  }
  const labels: string[] = [];
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

export function normalizeStringList(value: unknown, fieldName: string, maxLength = 80): string[] {
  if (value == null) {
    return [];
  }
  const entries =
    typeof value === "string" ? value.split(",") : Array.isArray(value) ? value : undefined;
  if (!entries) {
    throw new Error(`${fieldName} must be an array or comma-separated string.`);
  }
  const values: string[] = [];
  for (const entry of entries) {
    if (Array.isArray(value) && typeof entry !== "string") {
      throw new Error(`${fieldName} entries must be strings.`);
    }
    const normalized = normalizeBoundedString(entry, undefined, maxLength, fieldName);
    if (normalized && !values.includes(normalized)) {
      values.push(normalized);
    }
    if (values.length > 20) {
      throw new Error(`${fieldName} supports at most 20 entries.`);
    }
  }
  return values;
}

export function normalizePosition(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, Math.trunc(value));
}

function normalizePositiveInteger(value: unknown, fieldName: string): number | undefined {
  if (value == null || value === "") {
    return undefined;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${fieldName} must be a number.`);
  }
  return Math.max(1, Math.trunc(value));
}

function normalizeWorkspace(
  value: unknown,
  fallback?: TaskfoldWorkspace,
): TaskfoldWorkspace | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }
  const record = value as Record<string, unknown>;
  const kind =
    record.kind === "scratch" || record.kind === "dir" || record.kind === "worktree"
      ? record.kind
      : fallback?.kind;
  if (!kind) {
    throw new Error("workspace kind must be scratch, dir, or worktree.");
  }
  const workspacePath = normalizeBoundedString(record.path, fallback?.path, 2000, "workspace path");
  if (kind === "dir" && (!workspacePath || !isAbsoluteWorkspacePath(workspacePath))) {
    throw new Error("dir workspace path must be absolute.");
  }
  const branch = normalizeBoundedString(record.branch, fallback?.branch, 160, "workspace branch");
  const sourcePath = normalizeBoundedString(
    record.sourcePath,
    fallback?.sourcePath,
    2000,
    "workspace source path",
  );
  if (sourcePath && !isAbsoluteWorkspacePath(sourcePath)) {
    throw new Error("workspace source path must be absolute.");
  }
  const sourceBranch = normalizeBoundedString(
    record.sourceBranch,
    fallback?.sourceBranch,
    160,
    "workspace source branch",
  );
  return {
    kind,
    ...(workspacePath ? { path: workspacePath } : {}),
    ...(branch ? { branch } : {}),
    ...(kind === "worktree" && sourcePath ? { sourcePath } : {}),
    ...(kind === "worktree" && sourceBranch ? { sourceBranch } : {}),
  };
}

export function normalizeAutomation(
  value: unknown,
  fallback: TaskfoldAutomation = {},
): TaskfoldAutomation | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return Object.keys(fallback).length ? fallback : undefined;
  }
  const record = value as Record<string, unknown>;
  const tenant = normalizeBoundedString(record.tenant, fallback.tenant, 80, "tenant");
  const boardId = Object.hasOwn(record, "boardId")
    ? normalizeBoardId(record.boardId, fallback.boardId)
    : fallback.boardId;
  const createdByCardId = normalizeBoundedString(
    record.createdByCardId,
    fallback.createdByCardId,
    120,
    "created by card id",
  );
  const idempotencyKey = normalizeBoundedString(
    record.idempotencyKey,
    fallback.idempotencyKey,
    160,
    "idempotency key",
  );
  const summary = normalizeBoundedString(record.summary, fallback.summary, 2000, "summary");
  const skills = Object.hasOwn(record, "skills")
    ? normalizeStringList(record.skills, "skills")
    : fallback.skills;
  const createdCardIds = Object.hasOwn(record, "createdCardIds")
    ? normalizeStringList(record.createdCardIds, "created card ids", 120)
    : fallback.createdCardIds;
  const scheduledAt = Object.hasOwn(record, "scheduledAt")
    ? normalizeTimestamp(record.scheduledAt, 0) || undefined
    : fallback.scheduledAt;
  const maxRuntimeSeconds = Object.hasOwn(record, "maxRuntimeSeconds")
    ? normalizePositiveInteger(record.maxRuntimeSeconds, "max runtime seconds")
    : fallback.maxRuntimeSeconds;
  const maxRetries = Object.hasOwn(record, "maxRetries")
    ? normalizePositiveInteger(record.maxRetries, "max retries")
    : fallback.maxRetries;
  const dispatchCount = Object.hasOwn(record, "dispatchCount")
    ? normalizeTimestamp(record.dispatchCount, 0) || undefined
    : fallback.dispatchCount;
  const lastDispatchAt = Object.hasOwn(record, "lastDispatchAt")
    ? normalizeTimestamp(record.lastDispatchAt, 0) || undefined
    : fallback.lastDispatchAt;
  const workspace = Object.hasOwn(record, "workspace")
    ? normalizeWorkspace(record.workspace, fallback.workspace)
    : fallback.workspace;
  // Raw metadata preserves host-issued authority but cannot mint or widen it.
  const workspaceAccess = fallback.workspaceAccess;
  const next = removeUndefinedAutomationFields({
    ...(tenant ? { tenant } : {}),
    ...(boardId ? { boardId } : {}),
    ...(createdByCardId ? { createdByCardId } : {}),
    ...(idempotencyKey ? { idempotencyKey } : {}),
    ...(skills?.length ? { skills } : {}),
    ...(workspace ? { workspace } : {}),
    ...(workspaceAccess ? { workspaceAccess } : {}),
    ...(maxRuntimeSeconds ? { maxRuntimeSeconds } : {}),
    ...(maxRetries ? { maxRetries } : {}),
    ...(scheduledAt ? { scheduledAt } : {}),
    ...(summary ? { summary } : {}),
    ...(createdCardIds?.length ? { createdCardIds } : {}),
    ...(dispatchCount ? { dispatchCount } : {}),
    ...(lastDispatchAt ? { lastDispatchAt } : {}),
  });
  return Object.keys(next).length ? next : undefined;
}

export function deriveChildIdempotencyKey(
  parentKey: string | undefined,
  index: number,
): string | undefined {
  if (!parentKey) {
    return undefined;
  }
  const key = `${parentKey}:child:${index}`;
  return key.length <= 160 ? key : undefined;
}

function normalizeExecutionMode(
  value: unknown,
  fallback: TaskfoldExecutionMode,
): TaskfoldExecutionMode {
  if (
    typeof value === "string" &&
    TASKFOLD_EXECUTION_MODES.includes(value as TaskfoldExecutionMode)
  ) {
    return value as TaskfoldExecutionMode;
  }
  return fallback;
}

function normalizeExecutionStatus(
  value: unknown,
  fallback: TaskfoldExecutionStatus,
): TaskfoldExecutionStatus {
  if (
    typeof value === "string" &&
    TASKFOLD_EXECUTION_STATUSES.includes(value as TaskfoldExecutionStatus)
  ) {
    return value as TaskfoldExecutionStatus;
  }
  return fallback;
}

function normalizeAttemptStatus(
  value: unknown,
  fallback: TaskfoldAttemptStatus,
): TaskfoldAttemptStatus {
  if (
    typeof value === "string" &&
    TASKFOLD_ATTEMPT_STATUSES.includes(value as TaskfoldAttemptStatus)
  ) {
    return value as TaskfoldAttemptStatus;
  }
  return fallback;
}

export function normalizeLinkType(value: unknown, fallback: TaskfoldLinkType): TaskfoldLinkType {
  if (typeof value === "string" && TASKFOLD_LINK_TYPES.includes(value as TaskfoldLinkType)) {
    return value as TaskfoldLinkType;
  }
  return fallback;
}

function normalizeProofStatus(
  value: unknown,
  fallback: TaskfoldProofStatus,
): TaskfoldProofStatus {
  if (
    typeof value === "string" &&
    TASKFOLD_PROOF_STATUSES.includes(value as TaskfoldProofStatus)
  ) {
    return value as TaskfoldProofStatus;
  }
  return fallback;
}

export function normalizeTemplateId(value: unknown): TaskfoldTemplateId | undefined {
  return typeof value === "string" && TASKFOLD_TEMPLATE_IDS.includes(value as TaskfoldTemplateId)
    ? (value as TaskfoldTemplateId)
    : undefined;
}

export function normalizeTimestamp(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.trunc(value))
    : fallback;
}

function normalizeEvent(value: unknown): TaskfoldEvent | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const id = normalizeOptionalString(record.id);
  const kind = TASKFOLD_EVENT_KINDS.includes(record.kind as TaskfoldEventKind)
    ? (record.kind as TaskfoldEventKind)
    : null;
  const at = normalizeTimestamp(record.at, 0);
  if (!id || !kind || !at) {
    return null;
  }
  const fromStatus =
    typeof record.fromStatus === "string" &&
    TASKFOLD_STATUSES.includes(record.fromStatus as TaskfoldStatus)
      ? (record.fromStatus as TaskfoldStatus)
      : undefined;
  const toStatus =
    typeof record.toStatus === "string" &&
    TASKFOLD_STATUSES.includes(record.toStatus as TaskfoldStatus)
      ? (record.toStatus as TaskfoldStatus)
      : undefined;
  const fromMilestoneId = normalizeBoundedString(
    record.fromMilestoneId,
    undefined,
    120,
    "event source milestone",
  );
  const toMilestoneId = normalizeBoundedString(
    record.toMilestoneId,
    undefined,
    120,
    "event target milestone",
  );
  const sessionKey = normalizeOptionalString(record.sessionKey);
  const runId = normalizeOptionalString(record.runId);
  return {
    id,
    kind,
    at,
    ...(fromStatus ? { fromStatus } : {}),
    ...(toStatus ? { toStatus } : {}),
    ...(fromMilestoneId ? { fromMilestoneId } : {}),
    ...(toMilestoneId ? { toMilestoneId } : {}),
    ...(sessionKey ? { sessionKey } : {}),
    ...(runId ? { runId } : {}),
  };
}

export function normalizeEvents(value: unknown): TaskfoldEvent[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map(normalizeEvent)
    .filter((event): event is TaskfoldEvent => event !== null)
    .slice(-MAX_CARD_EVENTS);
}

function normalizeAttempt(value: unknown): TaskfoldRunAttempt | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const id = normalizeOptionalString(record.id);
  const startedAt = normalizeTimestamp(record.startedAt, 0);
  if (!id || !startedAt) {
    return null;
  }
  const endedAt = normalizeTimestamp(record.endedAt, 0);
  const sessionKey = normalizeOptionalString(record.sessionKey);
  const runId = normalizeOptionalString(record.runId);
  const error = normalizeBoundedString(record.error, undefined, 800, "attempt error");
  const engine = normalizeBoundedString(record.engine, undefined, 160, "attempt engine");
  const model = normalizeBoundedString(record.model, undefined, 160, "attempt model");
  const promptVersion =
    typeof record.promptVersion === "number" &&
    Number.isSafeInteger(record.promptVersion) &&
    record.promptVersion > 0
      ? record.promptVersion
      : undefined;
  return {
    id,
    status: normalizeAttemptStatus(record.status, "running"),
    startedAt,
    ...(endedAt ? { endedAt } : {}),
    ...(engine ? { engine } : {}),
    ...(typeof record.mode === "string" &&
    TASKFOLD_EXECUTION_MODES.includes(record.mode as TaskfoldExecutionMode)
      ? { mode: record.mode as TaskfoldExecutionMode }
      : {}),
    ...(model ? { model } : {}),
    ...(sessionKey ? { sessionKey } : {}),
    ...(runId ? { runId } : {}),
    ...(error ? { error } : {}),
    ...(promptVersion !== undefined ? { promptVersion } : {}),
  };
}

function normalizeComment(value: unknown): TaskfoldComment | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const id = normalizeOptionalString(record.id);
  const body = normalizeBoundedString(record.body, undefined, 2000, "comment body");
  const createdAt = normalizeTimestamp(record.createdAt, 0);
  if (!id || !body || !createdAt) {
    return null;
  }
  const updatedAt = normalizeTimestamp(record.updatedAt, 0);
  return { id, body, createdAt, ...(updatedAt ? { updatedAt } : {}) };
}

function normalizeLink(value: unknown): TaskfoldLink | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const id = normalizeOptionalString(record.id);
  const createdAt = normalizeTimestamp(record.createdAt, 0);
  if (!id || !createdAt) {
    return null;
  }
  const targetCardId = normalizeBoundedString(record.targetCardId, undefined, 120, "link target");
  const title = normalizeBoundedString(record.title, undefined, 180, "link title");
  const url = normalizeBoundedString(record.url, undefined, 2000, "link URL");
  if (!targetCardId && !url) {
    return null;
  }
  return {
    id,
    type: normalizeLinkType(record.type, "relates_to"),
    createdAt,
    ...(targetCardId ? { targetCardId } : {}),
    ...(title ? { title } : {}),
    ...(url ? { url } : {}),
  };
}

function isDependencyLink(link: TaskfoldLink): boolean {
  return link.type === "parent" || link.type === "child";
}

function normalizeProof(value: unknown): TaskfoldProof | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const id = normalizeOptionalString(record.id);
  const createdAt = normalizeTimestamp(record.createdAt, 0);
  if (!id || !createdAt) {
    return null;
  }
  const label = normalizeBoundedString(record.label, undefined, 160, "proof label");
  const command = normalizeBoundedString(record.command, undefined, 1000, "proof command");
  const url = normalizeBoundedString(record.url, undefined, 2000, "proof URL");
  const note = normalizeBoundedString(record.note, undefined, 2000, "proof note");
  return {
    id,
    status: normalizeProofStatus(record.status, "unknown"),
    createdAt,
    ...(label ? { label } : {}),
    ...(command ? { command } : {}),
    ...(url ? { url } : {}),
    ...(note ? { note } : {}),
  };
}

export function normalizeArtifact(value: unknown): TaskfoldArtifact | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const id = normalizeOptionalString(record.id) ?? randomUUID();
  const createdAt = normalizeTimestamp(record.createdAt, Date.now());
  const label = normalizeBoundedString(record.label, undefined, 160, "artifact label");
  const url = normalizeBoundedString(record.url, undefined, 2000, "artifact URL");
  const artifactPath = normalizeBoundedString(record.path, undefined, 2000, "artifact path");
  const mimeType = normalizeBoundedString(record.mimeType, undefined, 160, "artifact MIME type");
  if (!url && !artifactPath) {
    return null;
  }
  return {
    id,
    createdAt,
    ...(label ? { label } : {}),
    ...(url ? { url } : {}),
    ...(artifactPath ? { path: artifactPath } : {}),
    ...(mimeType ? { mimeType } : {}),
  };
}

function normalizeAttachment(value: unknown): TaskfoldAttachment | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const id = normalizeOptionalString(record.id);
  const cardId = normalizeBoundedString(record.cardId, undefined, 120, "card id");
  const fileName = normalizeBoundedString(record.fileName, undefined, 240, "attachment file name");
  const createdAt = normalizeTimestamp(record.createdAt, 0);
  const byteSize =
    typeof record.byteSize === "number" && Number.isFinite(record.byteSize)
      ? Math.max(0, Math.trunc(record.byteSize))
      : 0;
  if (!id || !cardId || !fileName || !createdAt || byteSize <= 0) {
    return null;
  }
  const mimeType = normalizeBoundedString(record.mimeType, undefined, 160, "attachment MIME type");
  const note = normalizeBoundedString(record.note, undefined, 400, "attachment note");
  return {
    id,
    cardId,
    createdAt,
    fileName,
    byteSize,
    ...(mimeType ? { mimeType } : {}),
    ...(note ? { note } : {}),
  };
}

function normalizeWorkerLog(value: unknown): TaskfoldWorkerLog | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const id = normalizeOptionalString(record.id);
  const message = normalizeBoundedString(record.message, undefined, 800, "worker log message");
  const createdAt = normalizeTimestamp(record.createdAt, 0);
  if (!id || !message || !createdAt) {
    return null;
  }
  const level =
    record.level === "warning" || record.level === "error" || record.level === "info"
      ? record.level
      : "info";
  const sessionKey = normalizeBoundedString(record.sessionKey, undefined, 240, "session key");
  const runId = normalizeBoundedString(record.runId, undefined, 160, "run id");
  return {
    id,
    level,
    message,
    createdAt,
    ...(sessionKey ? { sessionKey } : {}),
    ...(runId ? { runId } : {}),
  };
}

function normalizeWorkerProtocol(
  value: unknown,
  fallback?: TaskfoldWorkerProtocol,
): TaskfoldWorkerProtocol | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }
  const record = value as Record<string, unknown>;
  const state =
    record.state === "idle" ||
    record.state === "running" ||
    record.state === "completed" ||
    record.state === "blocked" ||
    record.state === "violated"
      ? record.state
      : fallback?.state;
  if (!state) {
    return undefined;
  }
  const updatedAt = normalizeTimestamp(record.updatedAt, fallback?.updatedAt ?? Date.now());
  const detail = normalizeBoundedString(record.detail, fallback?.detail, 800, "protocol detail");
  return {
    state,
    updatedAt,
    ...(detail ? { detail } : {}),
  };
}

export function normalizeAttachmentInput(
  cardId: string,
  input: TaskfoldAttachmentInput,
  now: number,
): { attachment: TaskfoldAttachment; contentBase64: string } {
  const fileName = normalizeBoundedString(input.fileName, undefined, 240, "attachment file name");
  if (!fileName) {
    throw new Error("attachment fileName is required.");
  }
  const contentBase64 =
    typeof input.contentBase64 === "string" && input.contentBase64
      ? input.contentBase64
      : undefined;
  if (!contentBase64) {
    throw new Error("attachment contentBase64 is required.");
  }
  if (
    !/^[A-Za-z0-9+/]*={0,2}$/.test(contentBase64) ||
    contentBase64.length % 4 !== 0 ||
    contentBase64.length > Math.ceil(MAX_ATTACHMENT_BYTES / 3) * 4
  ) {
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
  const mimeType = normalizeBoundedString(input.mimeType, undefined, 160, "attachment MIME type");
  const note = normalizeBoundedString(input.note, undefined, 400, "attachment note");
  const attachment: TaskfoldAttachment = {
    id: randomUUID(),
    cardId,
    createdAt: now,
    fileName,
    byteSize,
    ...(mimeType ? { mimeType } : {}),
    ...(note ? { note } : {}),
  };
  return { attachment, contentBase64 };
}

function normalizeClaim(value: unknown, fallback?: TaskfoldClaim): TaskfoldClaim | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }
  const record = value as Record<string, unknown>;
  const ownerId = normalizeBoundedString(record.ownerId, fallback?.ownerId, 120, "claim owner");
  const token = normalizeBoundedString(record.token, fallback?.token, 160, "claim token");
  const claimedAt = normalizeTimestamp(record.claimedAt, fallback?.claimedAt ?? Date.now());
  const lastHeartbeatAt = normalizeTimestamp(
    record.lastHeartbeatAt,
    fallback?.lastHeartbeatAt ?? claimedAt,
  );
  const expiresAt = normalizeTimestamp(record.expiresAt, fallback?.expiresAt ?? 0);
  if (!ownerId || !token || !claimedAt || !lastHeartbeatAt) {
    return undefined;
  }
  return {
    ownerId,
    token,
    claimedAt,
    lastHeartbeatAt,
    ...(expiresAt ? { expiresAt } : {}),
  };
}

function normalizeDiagnosticAction(value: unknown): TaskfoldDiagnosticAction | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const kind =
    record.kind === "claim" ||
    record.kind === "unblock" ||
    record.kind === "reassign" ||
    record.kind === "add_proof" ||
    record.kind === "open_session"
      ? record.kind
      : undefined;
  const label = normalizeBoundedString(record.label, undefined, 120, "diagnostic action label");
  return kind && label ? { kind, label } : null;
}

function normalizeDiagnostic(value: unknown): TaskfoldDiagnostic | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const kind = TASKFOLD_DIAGNOSTIC_KINDS.includes(record.kind as TaskfoldDiagnosticKind)
    ? (record.kind as TaskfoldDiagnosticKind)
    : undefined;
  const severity = TASKFOLD_DIAGNOSTIC_SEVERITIES.includes(
    record.severity as TaskfoldDiagnosticSeverity,
  )
    ? (record.severity as TaskfoldDiagnosticSeverity)
    : "warning";
  const title = normalizeBoundedString(record.title, undefined, 160, "diagnostic title");
  const detail = normalizeBoundedString(record.detail, undefined, 800, "diagnostic detail");
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
    count:
      typeof record.count === "number" && Number.isFinite(record.count)
        ? Math.max(1, Math.trunc(record.count))
        : 1,
    actions: Array.isArray(record.actions)
      ? record.actions
          .map(normalizeDiagnosticAction)
          .filter((action): action is TaskfoldDiagnosticAction => action !== null)
          .slice(0, 4)
      : [],
  };
}

function normalizeNotification(value: unknown): TaskfoldNotification | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const id = normalizeOptionalString(record.id) ?? randomUUID();
  const kind = TASKFOLD_NOTIFICATION_KINDS.includes(record.kind as TaskfoldNotificationKind)
    ? (record.kind as TaskfoldNotificationKind)
    : undefined;
  const createdAt = normalizeTimestamp(record.createdAt, Date.now());
  const sequence = normalizeTimestamp(record.sequence, 0) || undefined;
  const message = normalizeBoundedString(record.message, undefined, 240, "notification message");
  if (!kind || !message) {
    return null;
  }
  const sessionKey = normalizeBoundedString(record.sessionKey, undefined, 240, "session key");
  const runId = normalizeBoundedString(record.runId, undefined, 120, "run id");
  return {
    id,
    kind,
    createdAt,
    ...(sequence ? { sequence } : {}),
    message,
    ...(sessionKey ? { sessionKey } : {}),
    ...(runId ? { runId } : {}),
  };
}

export function normalizeProofInput(input: TaskfoldProofInput, now: number): TaskfoldProof {
  const label = normalizeBoundedString(input.label, undefined, 160, "proof label");
  const command = normalizeBoundedString(input.command, undefined, 1000, "proof command");
  const url = normalizeBoundedString(input.url, undefined, 2000, "proof URL");
  const note = normalizeBoundedString(input.note, undefined, 2000, "proof note");
  return {
    id: randomUUID(),
    status: normalizeProofStatus(input.status, "unknown"),
    createdAt: now,
    ...(label ? { label } : {}),
    ...(command ? { command } : {}),
    ...(url ? { url } : {}),
    ...(note ? { note } : {}),
  };
}

function completionProofConflicts(existing: TaskfoldProof, completion: TaskfoldProof): boolean {
  return (["label", "command", "url", "note"] as const).some(
    (field) => completion[field] !== undefined && completion[field] !== existing[field],
  );
}

export function appendCompletionProof(
  existing: readonly TaskfoldProof[] | undefined,
  proof: TaskfoldProof,
  proofId?: string,
): TaskfoldProof[] {
  const entries = [...(existing ?? [])];
  if (!proofId) {
    return [...entries, proof].slice(-MAX_CARD_PROOF);
  }
  const index = entries.findIndex((entry) => entry.id === proofId);
  const pending = index >= 0 ? entries[index] : undefined;
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
  // A proof id is the durable correlation boundary between a separately recorded check and its
  // completion. Preserve the original evidence identity and timestamp while resolving its status.
  entries[index] = { ...pending, status: proof.status };
  return entries.slice(-MAX_CARD_PROOF);
}

export function normalizeMetadata(
  value: unknown,
  fallback: TaskfoldMetadata = {},
  options: { allowDependencyLinks?: boolean; preserveProofId?: string } = {},
): TaskfoldMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return trimMetadataToBudget(fallback, options);
  }
  const record = value as Record<string, unknown>;
  const stale =
    record.stale && typeof record.stale === "object" && !Array.isArray(record.stale)
      ? (record.stale as Record<string, unknown>)
      : null;
  const hasArchivedAt = Object.hasOwn(record, "archivedAt");
  const hasStale = Object.hasOwn(record, "stale");
  const hasLifecycleStatusSourceUpdatedAt = Object.hasOwn(record, "lifecycleStatusSourceUpdatedAt");
  const links = Array.isArray(record.links)
    ? record.links.map(normalizeLink).filter((link): link is TaskfoldLink => link !== null)
    : undefined;
  const normalizedLinks =
    links === undefined
      ? fallback.links
      : options.allowDependencyLinks === false
        ? (() => {
            const dependencyLinks = (fallback.links ?? []).filter(isDependencyLink);
            const ordinaryCapacity = Math.max(0, MAX_CARD_LINKS - dependencyLinks.length);
            return [
              ...dependencyLinks.slice(-MAX_CARD_LINKS),
              ...(ordinaryCapacity > 0
                ? links.filter((link) => !isDependencyLink(link)).slice(-ordinaryCapacity)
                : []),
            ];
          })()
        : links.slice(-MAX_CARD_LINKS);
  const normalized = {
    attempts: Array.isArray(record.attempts)
      ? record.attempts
          .map(normalizeAttempt)
          .filter((attempt): attempt is TaskfoldRunAttempt => attempt !== null)
          .slice(-MAX_CARD_ATTEMPTS)
      : fallback.attempts,
    comments: Array.isArray(record.comments)
      ? record.comments
          .map(normalizeComment)
          .filter((comment): comment is TaskfoldComment => comment !== null)
          .slice(-MAX_CARD_COMMENTS)
      : fallback.comments,
    links: normalizedLinks,
    proof: Array.isArray(record.proof)
      ? record.proof
          .map(normalizeProof)
          .filter((proof): proof is TaskfoldProof => proof !== null)
          .slice(-MAX_CARD_PROOF)
      : fallback.proof,
    artifacts: Array.isArray(record.artifacts)
      ? record.artifacts
          .map(normalizeArtifact)
          .filter((artifact): artifact is TaskfoldArtifact => artifact !== null)
          .slice(-MAX_CARD_ARTIFACTS)
      : fallback.artifacts,
    attachments: Array.isArray(record.attachments)
      ? record.attachments
          .map(normalizeAttachment)
          .filter((attachment): attachment is TaskfoldAttachment => attachment !== null)
          .slice(-MAX_CARD_ATTACHMENTS)
      : fallback.attachments,
    workerLogs: Array.isArray(record.workerLogs)
      ? record.workerLogs
          .map(normalizeWorkerLog)
          .filter((log): log is TaskfoldWorkerLog => log !== null)
          .slice(-MAX_CARD_WORKER_LOGS)
      : fallback.workerLogs,
    workerProtocol: Object.hasOwn(record, "workerProtocol")
      ? normalizeWorkerProtocol(record.workerProtocol, fallback.workerProtocol)
      : fallback.workerProtocol,
    automation: Object.hasOwn(record, "automation")
      ? normalizeAutomation(record.automation, fallback.automation)
      : fallback.automation,
    claim: Object.hasOwn(record, "claim")
      ? record.claim
        ? normalizeClaim(record.claim, fallback.claim)
        : undefined
      : fallback.claim,
    diagnostics: Array.isArray(record.diagnostics)
      ? record.diagnostics
          .map(normalizeDiagnostic)
          .filter(
            (diagnosticLocal): diagnosticLocal is TaskfoldDiagnostic => diagnosticLocal !== null,
          )
          .slice(-MAX_CARD_DIAGNOSTICS)
      : fallback.diagnostics,
    notifications: Array.isArray(record.notifications)
      ? record.notifications
          .map(normalizeNotification)
          .filter((notification): notification is TaskfoldNotification => notification !== null)
          .slice(-MAX_CARD_NOTIFICATIONS)
      : fallback.notifications,
    templateId: normalizeTemplateId(record.templateId) ?? fallback.templateId,
    archivedAt: hasArchivedAt
      ? normalizeTimestamp(record.archivedAt, 0) || undefined
      : fallback.archivedAt,
    stale: hasStale
      ? stale
        ? {
            detectedAt: normalizeTimestamp(stale.detectedAt, Date.now()),
            lastSessionUpdatedAt: normalizeTimestamp(stale.lastSessionUpdatedAt, 0) || undefined,
            reason:
              normalizeBoundedString(stale.reason, fallback.stale?.reason, 240, "stale reason") ??
              "Session has not reported recent activity.",
          }
        : undefined
      : fallback.stale,
    lifecycleStatusSourceUpdatedAt: hasLifecycleStatusSourceUpdatedAt
      ? normalizeTimestamp(record.lifecycleStatusSourceUpdatedAt, 0)
      : fallback.lifecycleStatusSourceUpdatedAt,
    failureCount:
      typeof record.failureCount === "number" && Number.isFinite(record.failureCount)
        ? Math.max(0, Math.trunc(record.failureCount))
        : fallback.failureCount,
  };
  return trimMetadataToBudget(normalized, options);
}

export function normalizeExecution(value: unknown): TaskfoldExecution | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const now = Date.now();
  // Preserve historical labels as written; old hardcoded "codex" rows cannot be inferred safely.
  const engine = normalizeBoundedString(record.engine, undefined, 160, "execution engine");
  const model = normalizeBoundedString(record.model, undefined, 160, "execution model");
  const normalizedId = normalizeOptionalString(record.id);
  const sessionKey = normalizeOptionalString(record.sessionKey);
  const runId = normalizeOptionalString(record.runId);
  if (!normalizedId && !engine && !model && !sessionKey && !runId) {
    return undefined;
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
    ...(engine ? { engine } : {}),
    ...(model ? { model } : {}),
    ...(sessionKey ? { sessionKey } : {}),
    ...(runId ? { runId } : {}),
  };
}

export function syncExecutionSessionKey(
  execution: TaskfoldExecution | undefined,
  sessionKey: string | undefined,
): TaskfoldExecution | undefined {
  if (!execution) {
    return undefined;
  }
  return removeUndefinedExecutionFields({
    ...execution,
    sessionKey,
    updatedAt: Date.now(),
  });
}

function removeUndefinedExecutionFields(execution: TaskfoldExecution): TaskfoldExecution {
  const next = { ...execution };
  if (next.engine === undefined) {
    delete next.engine;
  }
  if (next.model === undefined) {
    delete next.model;
  }
  if (next.sessionKey === undefined) {
    delete next.sessionKey;
  }
  if (next.runId === undefined) {
    delete next.runId;
  }
  return next;
}

function removeUndefinedAutomationFields(automation: TaskfoldAutomation): TaskfoldAutomation {
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
    "lastDispatchAt",
  ] as const) {
    const value = next[key];
    if (
      value === undefined ||
      (Array.isArray(value) && value.length === 0) ||
      (typeof value === "object" && value !== null && Object.keys(value).length === 0)
    ) {
      delete next[key];
    }
  }
  return next;
}

export function removeUndefinedMetadataFields(metadata: TaskfoldMetadata): TaskfoldMetadata {
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
    "failureCount",
  ] as const) {
    const value = next[key];
    if (
      value === undefined ||
      (Array.isArray(value) && value.length === 0) ||
      (typeof value === "number" && value === 0 && key === "failureCount")
    ) {
      delete next[key];
    }
  }
  return next;
}

export function clearDiagnostics(
  metadata: TaskfoldMetadata | undefined,
  kinds: readonly TaskfoldDiagnosticKind[],
): TaskfoldMetadata {
  if (!metadata?.diagnostics) {
    return metadata ?? {};
  }
  return {
    ...metadata,
    diagnostics: metadata.diagnostics.filter((entry) => !kinds.includes(entry.kind)),
  };
}

export function metadataIsEmpty(metadata: TaskfoldMetadata | undefined): boolean {
  return !metadata || Object.keys(metadata).length === 0;
}

function metadataByteSize(metadata: TaskfoldMetadata): number {
  return Buffer.byteLength(JSON.stringify(metadata), "utf8");
}

function dropFirst<T>(items: readonly T[] | undefined): T[] | undefined {
  if (!items?.length) {
    return undefined;
  }
  const next = items.slice(1);
  return next.length ? next : undefined;
}

function dropFirstProofExcept(
  items: readonly TaskfoldProof[] | undefined,
  preserveProofId: string | undefined,
): TaskfoldProof[] | undefined {
  if (!items?.length) {
    return undefined;
  }
  const index = preserveProofId ? items.findIndex((proof) => proof.id !== preserveProofId) : 0;
  if (index < 0) {
    return items.slice();
  }
  const next = items.filter((_, itemIndex) => itemIndex !== index);
  return next.length ? next : undefined;
}

function dropFirstNonDependencyLink(
  items: readonly TaskfoldLink[] | undefined,
): TaskfoldLink[] | undefined {
  if (!items?.length) {
    return undefined;
  }
  const index = items.findIndex((link) => !isDependencyLink(link));
  if (index < 0) {
    return items.slice();
  }
  const next = items.filter((_, itemIndex) => itemIndex !== index);
  return next.length ? next : undefined;
}

export function appendLinkPreservingDependencies(
  links: readonly TaskfoldLink[],
  link: TaskfoldLink,
): TaskfoldLink[] {
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

export function trimMetadataToBudget(
  metadata: TaskfoldMetadata,
  options: { preserveProofId?: string } = {},
): TaskfoldMetadata {
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
        notifications: dropFirst(next.notifications),
      });
    } else if (
      next.proof?.some((proof) => !options.preserveProofId || proof.id !== options.preserveProofId)
    ) {
      next = removeUndefinedMetadataFields({
        ...next,
        proof: dropFirstProofExcept(next.proof, options.preserveProofId),
      });
    } else if (next.artifacts?.length) {
      next = removeUndefinedMetadataFields({ ...next, artifacts: dropFirst(next.artifacts) });
    } else if (next.attachments?.length) {
      next = removeUndefinedMetadataFields({
        ...next,
        attachments: dropFirst(next.attachments),
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
/* oxlint-disable max-lines -- TODO: split this grandfathered oversized file. */
