export const WAITING_AUTHORITY_TOOLTIP =
  'Employee work completed. Do not work on or call this lead. Waiting for higher authority.';
export const WAITING_AUTHORITY_FULL_LABEL = 'Work Completed — Waiting for Higher Authority';

// Compact dense-row badge for the manual "waiting for higher authority" flag. Short
// label keeps the Stage column from stretching (full status in title/aria-label).
// With `onClick` (lead:edit) it taps to toggle the status; without it, it renders a
// read-only chip. Returns null when the flag is off.
export function WaitingAuthorityBadge({
  waiting,
  onClick,
}: {
  waiting: boolean;
  onClick?: () => void;
}) {
  if (!waiting) return null;
  if (!onClick) {
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
  return (
    <button
      type="button"
      className="status-chip status-chip-waiting"
      title={WAITING_AUTHORITY_FULL_LABEL}
      aria-label={WAITING_AUTHORITY_FULL_LABEL}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      Work Completed
    </button>
  );
}
