import type { HandoffFlag, HandoffReturnReason, Lead } from '../types';

// ── Aging ladder ─────────────────────────────────────────────────────────────
// Thresholds in hours. A submission older than the threshold is "stale" at that level.

export const HANDOFF_AGING_THRESHOLDS = {
  NORMAL: 24,   // 0–24 h: fresh
  STALE: 48,    // 24–48 h: stale
  WARNING: 96,  // 48–96 h: warning
  CRITICAL: 168 // 96–168 h: critical (7 days)
} as const;

export type HandoffAge = 'FRESH' | 'STALE' | 'WARNING' | 'CRITICAL' | 'OVERDUE';

export function getHandoffAge(submittedAt: string): HandoffAge {
  const hours = (Date.now() - new Date(submittedAt).getTime()) / 3_600_000;
  if (hours < HANDOFF_AGING_THRESHOLDS.NORMAL) return 'FRESH';
  if (hours < HANDOFF_AGING_THRESHOLDS.STALE)  return 'STALE';
  if (hours < HANDOFF_AGING_THRESHOLDS.WARNING) return 'WARNING';
  if (hours < HANDOFF_AGING_THRESHOLDS.CRITICAL) return 'CRITICAL';
  return 'OVERDUE';
}

export const HANDOFF_AGE_COLORS: Record<HandoffAge, string> = {
  FRESH:   '#059669',
  STALE:   '#d97706',
  WARNING: '#ea580c',
  CRITICAL:'#dc2626',
  OVERDUE: '#7f1d1d',
};

// ── Manager review rule ──────────────────────────────────────────────────────
// After 2 rejections the case requires manager sign-off before next submission.

export const MANAGER_REVIEW_REJECTION_THRESHOLD = 2;

export function requiresManagerReview(lead: Pick<Lead, 'handoffReturnCount'>): boolean {
  return lead.handoffReturnCount >= MANAGER_REVIEW_REJECTION_THRESHOLD;
}

// ── State machine ────────────────────────────────────────────────────────────

const HANDOFF_TRANSITIONS: Record<HandoffFlag | 'NONE', HandoffFlag[]> = {
  NONE:       ['SUBMITTED'],
  SUBMITTED:  ['ACCEPTED', 'REJECTED'],
  ACCEPTED:   ['TRANSFERRED'],
  REJECTED:   ['SUBMITTED'],
  RETURNED:   ['SUBMITTED'],
  TRANSFERRED: [],
};

export function canTransitionHandoff(current: HandoffFlag | null, next: HandoffFlag): boolean {
  const key: HandoffFlag | 'NONE' = current ?? 'NONE';
  return HANDOFF_TRANSITIONS[key].includes(next);
}

// ── Return reason gating ─────────────────────────────────────────────────────
// Some return reasons block Fix & Resend until the underlying data is corrected.

const BLOCKED_REASONS: HandoffReturnReason[] = ['COMPLIANCE_ISSUE'];

export function isFixAndResendBlocked(reason: HandoffReturnReason | null): boolean {
  if (!reason) return false;
  return BLOCKED_REASONS.includes(reason);
}

// ── Return-after-transfer guard ──────────────────────────────────────────────
// Once TRANSFERRED, the process team owns the case. No CRM return is permitted.

export function isReturnAfterTransferBlocked(handoffFlag: HandoffFlag | null): boolean {
  return handoffFlag === 'TRANSFERRED';
}

export const RETURN_AFTER_TRANSFER_TOOLTIP =
  'Process owns this case. Use a Process correction flow.';
