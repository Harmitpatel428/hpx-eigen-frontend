// Case ID domain logic — HPX-[A-Z0-9]{4}-[A-Z0-9]{4}
// All validation and formatting is centralised here so every caller agrees.

const CASE_ID_REGEX = /^HPX-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
const CASE_ID_PARTIAL_REGEX = /^HPX(-[A-Z0-9]{0,4}(-[A-Z0-9]{0,4})?)?$/i;

export function isValidCaseId(value: string): boolean {
  return CASE_ID_REGEX.test(value.toUpperCase());
}

export function isPartialCaseId(value: string): boolean {
  return CASE_ID_PARTIAL_REGEX.test(value);
}

/** Normalise user input to uppercase and insert dashes at correct positions. */
export function normaliseCaseIdInput(raw: string): string {
  const stripped = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (stripped.length <= 3) return stripped.length === 0 ? '' : 'HPX'.slice(0, stripped.length);
  const prefix = 'HPX';
  const seg1 = stripped.slice(3, 7);
  const seg2 = stripped.slice(7, 11);
  if (!seg1) return prefix;
  if (!seg2) return `${prefix}-${seg1}`;
  return `${prefix}-${seg1}-${seg2}`;
}

/** Format for display — adds monospace CSS hint via data attribute (applied by UI). */
export function formatCaseId(caseId: string): string {
  return caseId.toUpperCase();
}

/** Mask middle segment for privacy display: HPX-••••-9QXZ */
export function maskCaseId(caseId: string): string {
  if (!isValidCaseId(caseId)) return caseId;
  const parts = caseId.split('-');
  return `${parts[0]}-••••-${parts[2]}`;
}

/** Extract last 4 of a phone string (digits only). */
export function phoneLast4(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.slice(-4);
}

/** Constant-time comparison to prevent timing attacks on auth checks. */
export function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export const CASE_ID_PLACEHOLDER = 'HPX-XXXX-XXXX';
export const CASE_ID_FORMAT_HINT = 'Format: HPX-XXXX-XXXX (letters and numbers only)';
