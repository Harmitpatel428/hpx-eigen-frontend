import { memo } from 'react';
import { Calendar, Clock } from 'lucide-react';
import type { LeadNote } from '../../services/lead-notes.service';

interface LeadNoteItemProps {
  note: LeadNote;
  isEditable: boolean;
  onEdit: (note: LeadNote) => void;
  onDelete: (noteId: string) => void;
  authorName?: string;
  isDeleting?: boolean;
  compact?: boolean;
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
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export const LeadNoteItem = memo(function LeadNoteItem({
  note,
  isEditable,
  onEdit,
  onDelete,
  authorName = 'You',
  isDeleting = false,
  compact = false,
}: LeadNoteItemProps) {
  const hasFollowUp = note.followUpDate || note.followUpTime;

  return (
    <div style={{ padding: compact ? '11px 16px' : '15px 22px' }}>
      {/* Content */}
      <p style={{
        fontSize: 13.5,
        lineHeight: 1.6,
        color: '#111827',
        margin: '0 0 7px',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {note.content}
      </p>

      {/* Follow-up badge */}
      {hasFollowUp && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 11,
          fontWeight: 500,
          color: '#2563eb',
          background: 'rgba(37,99,235,0.06)',
          border: '1px solid rgba(37,99,235,0.15)',
          borderRadius: 5,
          padding: '2px 7px',
          marginBottom: 8,
        }}>
          <Calendar size={10} strokeWidth={2.2} />
          Follow-up
          {note.followUpDate && (
            <> {new Date(note.followUpDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
          )}
          {note.followUpTime && (
            <><Clock size={9} style={{ display: 'inline', marginLeft: 2 }} />{note.followUpTime}</>
          )}
        </div>
      )}

      {/* Meta + actions row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 11.5, color: '#9ca3af', lineHeight: 1 }}>
          {authorName} · {formatDate(note.createdAt)}, {formatTime(note.createdAt)}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          {isEditable && (
            <button
              onClick={() => onEdit(note)}
              disabled={isDeleting}
              style={{
                fontSize: 11.5, color: '#64748b', background: 'none', border: 'none',
                cursor: 'pointer', padding: 0, fontWeight: 500,
                opacity: isDeleting ? 0.4 : 1, transition: 'color 0.1s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#0f172a'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; }}
            >
              Edit
            </button>
          )}
          <button
            onClick={() => onDelete(note.id)}
            disabled={isDeleting}
            style={{
              fontSize: 11.5, color: '#f87171', background: 'none', border: 'none',
              cursor: isDeleting ? 'not-allowed' : 'pointer', padding: 0, fontWeight: 500,
              opacity: isDeleting ? 0.5 : 1, transition: 'color 0.1s',
            }}
            onMouseEnter={e => { if (!isDeleting) e.currentTarget.style.color = '#dc2626'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#f87171'; }}
          >
            {isDeleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
});
