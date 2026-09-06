import type { HandoffState, HandoffReturnReason } from '../types';

// ── Aging ladder (client-side display only; backend is authority) ─────────────

export const HANDOFF_AGING_THRESHOLDS = {
  FRESH: 24,
  STALE: 48,
  WARNING: 96,
  CRITICAL: 168,
} as const;

export type HandoffAge = 'FRESH' | 'STALE' | 'WARNING' | 'CRITICAL' | 'OVERDUE';

export function getHandoffAge(handoffAt: string): HandoffAge {
  const hours = (Date.now() - new Date(handoffAt).getTime()) / 3_600_000;
  if (hours < HANDOFF_AGING_THRESHOLDS.FRESH) return 'FRESH';
  if (hours < HANDOFF_AGING_THRESHOLDS.STALE)  return 'STALE';
  if (hours < HANDOFF_AGING_THRESHOLDS.WARNING) return 'WARNING';
  if (hours < HANDOFF_AGING_THRESHOLDS.CRITICAL) return 'CRITICAL';
  return 'OVERDUE';
}

export const HANDOFF_AGE_COLORS: Record<HandoffAge, string> = {
  FRESH:    '#059669',
  STALE:    '#d97706',
  WARNING:  '#ea580c',
  CRITICAL: '#dc2626',
  OVERDUE:  '#7f1d1d',
};

// ── Auto-drop countdown (display helper) ─────────────────────────────────────

export function daysUntilAutoDrop(autoDropAt: string | null): number | null {
  if (!autoDropAt) return null;
  const ms = new Date(autoDropAt).getTime() - Date.now();
  return ms > 0 ? Math.ceil(ms / 86_400_000) : 0;
}

// ── UI display helpers ───────────���───────────────────────────────────────────

export const HANDOFF_STATE_LABELS: Record<HandoffState, string> = {
  NONE: 'Not handed off',
  HANDED_OFF: 'Awaiting acceptance',
  ACCEPTED: 'Accepted',
  RETURNED: 'Returned',
  RESENT: 'Resent',
  MANAGER_REVIEW_REQUIRED: 'Manager review required',
  AUTO_DROPPED: 'Auto-dropped',
};

export const HANDOFF_STATE_COLORS: Record<HandoffState, string> = {
  NONE: '#6b7280',
  HANDED_OFF: '#2563eb',
  ACCEPTED: '#059669',
  RETURNED: '#dc2626',
  RESENT: '#d97706',
  MANAGER_REVIEW_REQUIRED: '#ea580c',
  AUTO_DROPPED: '#6b7280',
};

export function isReturnedState(state: HandoffState): boolean {
  return state === 'RETURNED' || state === 'MANAGER_REVIEW_REQUIRED';
}

export function canShowFixAndResend(state: HandoffState, managerReviewRequired: boolean): boolean {
  return isReturnedState(state) && !managerReviewRequired;
}

export const RETURN_REASON_LABELS: Record<HandoffReturnReason, string> = {
  WRONG_OR_MISSING_CONTACT: 'Wrong or missing contact',
  WRONG_PRESET: 'Wrong preset',
  INCOMPLETE_INFORMATION: 'Incomplete information',
  DUPLICATE_CASE: 'Duplicate case',
  COMPLIANCE_ISSUE: 'Compliance issue',
  OTHER: 'Other',
};
