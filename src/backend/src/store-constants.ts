import type { FlowboardClaim } from "../../contract/index.js";
import {
  MAX_DATE_TIMESTAMP_MS,
  resolveExpiresAtMsFromDurationMs,
} from "openclaw/plugin-sdk/number-runtime";

export const POSITION_STEP = 1000;
export const MAX_CARDS = 2000;
export const MAX_CARD_EVENTS = 50;
export const MAX_CARD_ATTEMPTS = 30;
export const MAX_CARD_COMMENTS = 50;
export const MAX_CARD_LINKS = 50;
export const MAX_CARD_PROOF = 40;
export const MAX_CARD_ARTIFACTS = 40;
export const MAX_CARD_ATTACHMENTS = 20;
export const MAX_ATTACHMENT_ENTRIES = MAX_CARDS * (MAX_CARD_ATTACHMENTS + 1);
export const MAX_CARD_WORKER_LOGS = 40;
export const MAX_ATTACHMENT_BYTES = 256 * 1024;
export const MAX_CARD_DIAGNOSTICS = 12;
export const MAX_CARD_NOTIFICATIONS = 20;
export const MAX_CARD_METADATA_BYTES = 24 * 1024;
export const DEFAULT_CLAIM_TTL_MS = 30 * 60 * 1000;
export const READY_STRANDED_MS = 60 * 60 * 1000;
export const RUNNING_HEARTBEAT_STALE_MS = 20 * 60 * 1000;
export const BLOCKED_TOO_LONG_MS = 24 * 60 * 60 * 1000;
const CLAIM_RECLAIM_MS = 5 * 60 * 1000;

/** Revision assigned to a freshly created card before its first update. */
export const FLOWBOARD_INITIAL_CARD_REVISION = 1;

/**
 * Next monotonic revision for a card write. Rows persisted before the revision
 * column existed read back as 0, so an absent or non-finite value still advances.
 */
export function nextFlowboardCardRevision(current: number | undefined): number {
  return Number.isSafeInteger(current) && (current as number) > 0
    ? (current as number) + 1
    : FLOWBOARD_INITIAL_CARD_REVISION;
}

export function isFlowboardClaimReclaimable(
  claim: FlowboardClaim | undefined,
  now: number,
): boolean {
  return Boolean(claim?.expiresAt && now - claim.expiresAt > CLAIM_RECLAIM_MS);
}

export function secondsToDurationMs(seconds: number): number {
  const ms = Math.trunc(seconds) * 1000;
  return Number.isFinite(ms)
    ? Math.min(MAX_DATE_TIMESTAMP_MS, Math.max(1, ms))
    : MAX_DATE_TIMESTAMP_MS;
}

export function addFlowboardDurationMs(now: number, durationMs: number): number {
  return resolveExpiresAtMsFromDurationMs(durationMs, { nowMs: now }) ?? MAX_DATE_TIMESTAMP_MS;
}
