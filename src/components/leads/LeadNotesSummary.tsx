import { memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import { leadNotesService } from '../../services/lead-notes.service';

interface LeadNotesSummaryProps {
  leadId: string;
  leadName: string;
  legacyNote?: string | null;
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
  leadName,
  legacyNote,
  onOpen,
}: LeadNotesSummaryProps) {

  const { data: summary } = useQuery({
    queryKey: ['notes-summary', leadId],
    queryFn: () => leadNotesService.summary(leadId),
    staleTime: 30_000,
  });

  const count = summary?.count ?? 0;
  const latest = summary?.latest ?? null;
  const hasNotes = count > 0 || !!legacyNote;

  if (!hasNotes && !summary) return null;

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
        ) : legacyNote ? (
          <p style={{
            fontSize: 13,
            color: 'var(--text-secondary)',
            lineHeight: 1.65,
            margin: '0 0 10px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            {legacyNote}
          </p>
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
