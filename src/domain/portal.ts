import type { DocCase, DocCaseStatus } from '../types';

// ── Portal activation conditions ─────────────────────────────────────────────
// ALL four conditions must be true for the portal to be considered active.

const NON_PORTAL_STATUSES: DocCaseStatus[] = ['CLOSED', 'CANCELLED'];

export interface PortalActivationCheck {
  isActive: boolean;
  reason?: string;
}

export function checkPortalActivation(
  portalEnabled: boolean,
  clientVisibleCount: number,
  portalPhone: string | null,
  status: DocCaseStatus
): PortalActivationCheck {
  if (!portalEnabled)
    return { isActive: false, reason: 'Portal is disabled for this case.' };
  if (clientVisibleCount < 1)
    return { isActive: false, reason: 'No client-visible notes or documents published yet.' };
  if (!portalPhone)
    return { isActive: false, reason: 'No portal phone number configured.' };
  if (NON_PORTAL_STATUSES.includes(status))
    return { isActive: false, reason: 'Case is closed — portal access is not available.' };
  return { isActive: true };
}

export function isPortalActive(docCase: Pick<DocCase, 'portalEnabled' | 'clientVisibleNotesCount' | 'clientVisibleDocsCount' | 'portalActivatedAt' | 'status'> & { lead: { phone: string | null } }): boolean {
  const clientVisibleCount = docCase.clientVisibleNotesCount + docCase.clientVisibleDocsCount;
  const { isActive } = checkPortalActivation(
    docCase.portalEnabled,
    clientVisibleCount,
    docCase.portalActivatedAt ? 'ok' : null, // activatedAt implies phone was snapshotted
    docCase.status,
  );
  return isActive;
}

// ── Security constants ───────────────────────────────────────────────────────

export const PORTAL_AUTH = {
  MAX_ATTEMPTS: 5,
  LOCKOUT_MINUTES: 30,
  SESSION_MINUTES: 15,
} as const;

// ── Generic error messages (anti-enumeration) ────────────────────────────────
// Never reveal whether the Case ID exists, the phone is wrong, etc.

export const PORTAL_ERROR_MESSAGES = {
  INVALID_CREDENTIALS: "We couldn't verify those details.",
  ACCOUNT_LOCKED: 'Too many attempts. Please wait a while and try again.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  CASE_UNAVAILABLE: "We couldn't verify those details.",
} as const;

// ── Portal contact change policy ─────────────────────────────────────────────
// A staff member requests the change; manager/admin approves it.
// Approval triggers: new phone snapshot + session revocation + audit log.
// The verification call is a staff process only — not a system gate.

export const PORTAL_CONTACT_CHANGE_POLICY = {
  requiresManagerApproval: true,
  sessionRevocationOnApproval: true,
  auditEventOnApproval: 'PORTAL_CONTACT_CHANGED',
} as const;

// ── Progress stage definitions ───────────────────────────────────────────────

export const PORTAL_PROGRESS_STAGES = [
  { key: 'RECEIVED',     label: 'Application received' },
  { key: 'IN_REVIEW',    label: 'Documents under review' },
  { key: 'VERIFIED',     label: 'Verification complete' },
  { key: 'PROCESSING',   label: 'Processing' },
  { key: 'COMPLETED',    label: 'Case completed' },
] as const;

export type PortalProgressStageKey = typeof PORTAL_PROGRESS_STAGES[number]['key'];

// ── Client document categories (3-category client abstraction; backend-aligned) ──
// The backend delivers one of these three per document (toClientDocStatus). The FE treats any
// unrecognised/future value as ACTION_REQUIRED (safe default) so the UI never crashes or hides a doc.

export type DocCategory = 'ACTION_REQUIRED' | 'AWAITING_REVIEW' | 'APPROVED';

// Attention-first display order.
export const DOC_CATEGORY_ORDER: readonly DocCategory[] = ['ACTION_REQUIRED', 'AWAITING_REVIEW', 'APPROVED'];

export const DOC_CATEGORY_META: Record<DocCategory, { label: string; color: string; tint: string; title: string; subtitle: string }> = {
  // Light tints = app semantic status hues (--color-warning/info/success); text+dot use the AA-safe -800
  // shade of the same hue so 11px chip text clears WCAG AA (≥4.5:1) on the tint. "Align, keep identity".
  ACTION_REQUIRED: { label: 'Action needed', color: '#92400E', tint: 'rgba(217,119,6,0.12)', title: 'Action needed', subtitle: 'These documents need your attention.' },
  AWAITING_REVIEW: { label: 'In review',     color: '#1E40AF', tint: 'rgba(37,99,235,0.12)', title: 'In review',     subtitle: 'Submitted — our team is reviewing these.' },
  APPROVED:        { label: 'Approved',       color: '#065F46', tint: 'rgba(5,150,105,0.12)', title: 'Approved',      subtitle: 'These documents are complete.' },
};

// Guidance shown for ACTION_REQUIRED documents — honest, no upload/resubmit/download action exists.
export const ACTION_REQUIRED_GUIDANCE =
  'This document needs your attention — contact your documentation representative to submit or resubmit it.';

/** Any value that is not a known non-action category falls back to ACTION_REQUIRED (safe default). */
export function toDocCategory(status: string): DocCategory {
  return status === 'AWAITING_REVIEW' || status === 'APPROVED' ? status : 'ACTION_REQUIRED';
}

/** Group documents into the 3 categories in attention-first order. Sum of group sizes === docs.length. */
export function groupPortalDocuments<T extends { status: string }>(docs: readonly T[]): Array<{ category: DocCategory; docs: T[] }> {
  return DOC_CATEGORY_ORDER.map(category => ({
    category,
    docs: docs.filter(d => toDocCategory(d.status) === category),
  }));
}
