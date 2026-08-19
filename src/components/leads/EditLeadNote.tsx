import { memo, useState } from 'react';
import { X } from 'lucide-react';
import type { LeadNote } from '../../services/lead-notes.service';
import { NoteCharacterCounter } from './NoteCharacterCounter';

interface EditLeadNoteProps {
  note: LeadNote;
  onSave: (content: string) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const EditLeadNote = memo(function EditLeadNote({
  note,
  onSave,
  onCancel,
  isLoading = false,
}: EditLeadNoteProps) {
  const [content, setContent] = useState(note.content);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!content.trim()) {
      setError('Note content is required');
      return;
    }

    if (content.length > 500) {
      setError('Note exceeds 500 characters');
      return;
    }

    try {
      setError(null);
      await onSave(content);
    } catch (err: any) {
      setError(err?.message || 'Failed to update note');
    }
  };

  const inp = 'w-full bg-slate-50 border border-slate-300 rounded-md py-2 px-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition disabled:opacity-50 disabled:cursor-not-allowed';

  const hasChanges = content !== note.content;

  return (
    <div
      style={{
        padding: '1rem',
        borderRadius: '0.5rem',
        border: '1px solid #e2e8f0',
        background: '#fff',
        marginBottom: '1rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <h4 style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: 0 }}>Edit Note</h4>
        <button
          onClick={onCancel}
          disabled={isLoading}
          style={{
            width: 24,
            height: 24,
            borderRadius: '0.375rem',
            border: '1px solid #e2e8f0',
            background: '#fff',
            color: '#94a3b8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s',
            opacity: isLoading ? 0.5 : 1,
          }}
        >
          <X size={14} />
        </button>
      </div>

      {error && (
        <div
          style={{
            paddingLeft: '0.75rem',
            paddingRight: '0.75rem',
            paddingTop: '0.5rem',
            paddingBottom: '0.5rem',
            borderRadius: '0.375rem',
            background: '#fee2e2',
            color: '#991b1b',
            fontSize: 12,
            marginBottom: '0.75rem',
          }}
        >
          {error}
        </div>
      )}

      <div style={{ marginBottom: '0.75rem' }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
          Note
        </label>
        <textarea
          value={content}
          onChange={(e) => {
            const val = e.target.value;
            if (val.length <= 500) {
              setContent(val);
              setError(null);
            }
          }}
          disabled={isLoading}
          className={inp}
          style={{
            minHeight: '80px',
            resize: 'vertical',
            fontFamily: 'inherit',
          } as any}
        />
        <NoteCharacterCounter length={content.length} style={{ marginTop: 4 }} />
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <button
          onClick={onCancel}
          disabled={isLoading}
          style={{
            paddingLeft: '1rem',
            paddingRight: '1rem',
            paddingTop: '0.5rem',
            paddingBottom: '0.5rem',
            borderRadius: '0.375rem',
            border: '1px solid #e2e8f0',
            background: '#f8fafc',
            color: '#64748b',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.15s',
            opacity: isLoading ? 0.5 : 1,
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isLoading || !hasChanges || !content.trim()}
          style={{
            paddingLeft: '1rem',
            paddingRight: '1rem',
            paddingTop: '0.5rem',
            paddingBottom: '0.5rem',
            borderRadius: '0.375rem',
            border: 'none',
            background: !hasChanges || !content.trim() ? '#cbd5e1' : '#0f172a',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: !hasChanges || !content.trim() || isLoading ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s',
            opacity: isLoading ? 0.7 : 1,
          }}
          onMouseEnter={(e) => {
            if (!isLoading && hasChanges && content.trim()) {
              e.currentTarget.style.background = '#1e293b';
            }
          }}
          onMouseLeave={(e) => {
            if (!isLoading && hasChanges && content.trim()) {
              e.currentTarget.style.background = '#0f172a';
            }
          }}
        >
          {isLoading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
});
