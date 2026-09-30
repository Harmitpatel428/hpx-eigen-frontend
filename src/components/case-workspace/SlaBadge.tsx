import type { CaseSlaState } from '../../types/caseConfig';

const META: Record<Exclude<CaseSlaState, null>, { label: string; bg: string; fg: string }> = {
  ON_TRACK: { label: 'On track', bg: '#dcfce7', fg: '#166534' },
  COMPLETED_ON_TIME: { label: 'Completed on time', bg: '#dcfce7', fg: '#166534' },
  AT_RISK: { label: 'At risk', bg: '#fef3c7', fg: '#92400e' },
  COMPLETED_LATE: { label: 'Completed late', bg: '#fef3c7', fg: '#92400e' },
  OVERDUE: { label: 'Overdue', bg: '#fee2e2', fg: '#991b1b' },
  WAITING_EXTERNAL: { label: 'Waiting external', bg: '#e5e7eb', fg: '#374151' },
  EXCEPTION_APPROVED: { label: 'Exception approved', bg: '#dbeafe', fg: '#1e40af' },
};

export function SlaBadge({ state }: { state: CaseSlaState }) {
  if (!state) return null;
  const m = META[state];
  return (
    <span
      data-testid="sla-badge"
      style={{ background: m.bg, color: m.fg, padding: '2px 8px', borderRadius: 999, fontSize: 12, fontWeight: 600 }}
    >
      {m.label}
    </span>
  );
}
