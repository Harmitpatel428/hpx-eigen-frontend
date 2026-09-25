import { memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import { leadNotesService, leadNotesKeys } from '../../services/lead-notes.service';

interface LeadNotesSummaryProps {
  leadId: string;
  onOpen: () => void;
}

function fmtDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export const LeadNotesSummary = memo(function LeadNotesSummary({
  leadId,
  onOpen,
}: LeadNotesSummaryProps) {

  const { data: summary, isLoading, isError, refetch } = useQuery({
    queryKey: leadNotesKeys.summary(leadId),
    queryFn: () => leadNotesService.summary(leadId),
    staleTime: 30_000,
  });

  // Single source of truth: the notes table via the summary endpoint (sorted createdAt desc
  // server-side, so `latest` is the most recent persisted note and `count` the persisted count).
  const count = summary?.count ?? 0;
  const latest = summary?.latest ?? null;

  // While loading, show a skeleton — never a "No notes yet." flash and no height jump when it fills.
  if (isLoading) {
    return (
      <div aria-hidden style={{ margin: '0 0 10px' }}>
        <div style={{ height: 38, background: 'var(--bg-subtle, #f1f5f9)', borderRadius: 8, marginBottom: 8 }} />
        <div style={{ height: 14, width: 110, background: 'var(--bg-subtle, #f1f5f9)', borderRadius: 5 }} />
      </div>
    );
  }

  // On load error, offer a retry instead of silently rendering nothing (which reads as "no notes").
  if (isError) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 10px' }}>
        <span style={{ fontSize: 12, color: '#b91c1c' }}>Couldn’t load notes.</span>
        <button
          type="button"
          onClick={() => refetch()}
          style={{ fontSize: 12, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 500 }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <div>
        {/* Latest note preview */}
        {latest ? (
          <>
            <p style={{
              fontSize: 13,
              color: 'var(--text-secondary)',
              lineHeight: 1.65,
              background: 'var(--bg-subtle)',
              padding: '10px 14px',
              margin: '0 0 6px',
              borderRadius: 8,
              border: '1px solid var(--border-light, #f1f5f9)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {latest.content}
            </p>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 10 }}>
              {fmtDateTime(latest.createdAt)}
            </div>
          </>
        ) : (
          <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 10px' }}>No notes yet.</p>
        )}

        {/* Actions row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={onOpen}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12,
              color: '#2563eb',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              fontWeight: 500,
            }}
          >
            <FileText size={13} />
            {count > 0
              ? `View all ${count} note${count === 1 ? '' : 's'} →`
              : 'Manage notes →'}
          </button>
        </div>
      </div>

    </>
  );
});
