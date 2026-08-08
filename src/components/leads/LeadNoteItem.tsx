import { memo } from 'react';
import { Edit3, Trash2, Calendar, Clock } from 'lucide-react';
import type { LeadNote } from '../../services/lead-notes.service';

interface LeadNoteItemProps {
  note: LeadNote;
  isEditable: boolean;
  onEdit: (note: LeadNote) => void;
  onDelete: (noteId: string) => void;
  authorName?: string;
  isDeleting?: boolean;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isToday) return 'Today';
  if (isYesterday) return 'Yesterday';

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export const LeadNoteItem = memo(function LeadNoteItem({
  note,
  isEditable,
  onEdit,
  onDelete,
  authorName = 'Unknown',
  isDeleting = false,
}: LeadNoteItemProps) {
  const dateLabel = formatDate(note.createdAt);
  const timeLabel = formatTime(note.createdAt);
  const hasFollowUp = note.followUpDate || note.followUpTime;

  return (
    <div
      style={{
        paddingBottom: '1rem',
        marginBottom: '1rem',
        borderBottom: '1px solid #f1f5f9',
      }}
    >
      {/* Content */}
      <p
        style={{
          fontSize: '14px',
          lineHeight: '1.5',
          color: '#0f172a',
          marginBottom: '0.75rem',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {note.content}
      </p>

      {/* Metadata */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: 12, color: '#64748b' }}>
          {authorName}
        </span>
        <span style={{ fontSize: 12, color: '#cbd5e1' }}>•</span>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>
          {dateLabel} · {timeLabel}
        </span>
      </div>

      {/* Follow-up Badge */}
      {hasFollowUp && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            paddingLeft: '0.5rem',
            paddingRight: '0.5rem',
            paddingTop: '0.25rem',
            paddingBottom: '0.25rem',
            borderRadius: '0.375rem',
            backgroundColor: 'rgba(37,99,235,0.06)',
            marginBottom: '0.75rem',
            fontSize: 11,
            color: '#2563eb',
            fontWeight: 500,
          }}
        >
          <Calendar size={12} />
          <span>
            Follow-up{' '}
            {note.followUpDate && (
              <>
                {new Date(note.followUpDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </>
            )}
            {note.followUpTime && (
              <>
                {' '}
                <Clock size={11} style={{ display: 'inline', marginLeft: '2px' }} />
                {note.followUpTime}
              </>
            )}
          </span>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        {isEditable && (
          <button
            onClick={() => onEdit(note)}
            disabled={isDeleting}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              paddingLeft: '0.75rem',
              paddingRight: '0.75rem',
              paddingTop: '0.375rem',
              paddingBottom: '0.375rem',
              borderRadius: '0.375rem',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              color: '#64748b',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s',
              opacity: isDeleting ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f1f5f9';
              e.currentTarget.style.color = '#475569';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.color = '#64748b';
            }}
          >
            <Edit3 size={13} />
            Edit
          </button>
        )}

        <button
          onClick={() => onDelete(note.id)}
          disabled={isDeleting}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            paddingLeft: '0.75rem',
            paddingRight: '0.75rem',
            paddingTop: '0.375rem',
            paddingBottom: '0.375rem',
            borderRadius: '0.375rem',
            border: '1px solid #fee2e2',
            background: '#fef2f2',
            color: '#dc2626',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.15s',
            opacity: isDeleting ? 0.5 : 1,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#fecaca';
            e.currentTarget.style.color = '#991b1b';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#fef2f2';
            e.currentTarget.style.color = '#dc2626';
          }}
        >
          <Trash2 size={13} />
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  );
});
