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
  INVALID_CREDENTIALS: 'The Case ID or phone number is incorrect. Please check and try again.',
  ACCOUNT_LOCKED: 'Too many attempts. Please try again later.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  CASE_UNAVAILABLE: 'This case is not available through the portal.',
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
