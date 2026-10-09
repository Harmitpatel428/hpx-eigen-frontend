export const WAITING_AUTHORITY_TOOLTIP =
  'Employee work completed. Do not work on or call this lead. Waiting for higher authority.';
export const WAITING_AUTHORITY_FULL_LABEL = 'Work Completed — Waiting for Higher Authority';

// Compact, read-only dense-row badge for the manual "waiting for higher authority"
// flag. Short label keeps the Stage column from stretching (full status in the
// title/aria-label). Display only — there is no UI path to toggle the flag.
// Returns null when the flag is off.
export function WaitingAuthorityBadge({ waiting }: { waiting: boolean }) {
  if (!waiting) return null;
  return (
    <span
      className="status-chip status-chip-waiting"
      style={{ cursor: 'default' }}
      title={WAITING_AUTHORITY_FULL_LABEL}
      aria-label={WAITING_AUTHORITY_FULL_LABEL}
    >
      Work Completed
    </span>
  );
}
