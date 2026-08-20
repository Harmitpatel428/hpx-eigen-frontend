import { memo, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadNotesService, type LeadNote } from '../../services/lead-notes.service';
import { LeadNoteItem } from './LeadNoteItem';
import { EditLeadNote } from './EditLeadNote';
import { NoteCharacterCounter } from './NoteCharacterCounter';

interface LeadNotesModalProps {
  leadId: string;
  leadName: string;
  onClose: () => void;
  /** Width of the right-anchored panel (e.g. ContextPanel). >0 = side-panel mode; 0 = centered overlay. */
  anchorRight?: number;
}

const PANEL_W = 400;

function isEditableToday(note: LeadNote): boolean {
  const d = new Date(note.createdAt);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

const SHARED_CSS = `
  @keyframes nm-fade  { from { opacity: 0 } to { opacity: 1 } }
  @keyframes nm-rise  { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
  @keyframes nm-addin { from { opacity:0; transform:translateY(4px) } to { opacity:1; transform:translateY(0) } }
  .nm-addform { animation: nm-addin 120ms ease both; }
`;

const TEXTAREA_CLASS = [
  'w-full rounded-lg py-2.5 px-3 text-sm text-slate-900 placeholder-slate-400',
  'bg-white border border-slate-200',
  'focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900',
  'transition resize-none font-[inherit]',
].join(' ');

export const LeadNotesModal = memo(function LeadNotesModal({
  leadId,
  leadName,
  onClose,
  anchorRight = 0,
}: LeadNotesModalProps) {
  const queryClient = useQueryClient();
  const panelRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [addContent, setAddContent] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['notes', leadId],
    queryFn: () => leadNotesService.list(leadId),
  });

  const count = notes.length;
  const atLimit = count >= 15;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['notes', leadId] });
    queryClient.invalidateQueries({ queryKey: ['notes-summary', leadId] });
  };

  const createMutation = useMutation({
    mutationFn: (p: Parameters<typeof leadNotesService.create>[1]) => leadNotesService.create(leadId, p),
    onSuccess: () => {
      invalidate();
      setIsAdding(false);
      setAddContent('');
      setAddError(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (p: { noteId: string; content?: string }) =>
      leadNotesService.update(leadId, p.noteId, { content: p.content }),
    onSuccess: () => { invalidate(); setEditingNoteId(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (noteId: string) => leadNotesService.delete(leadId, noteId),
    onSuccess: invalidate,
  });

  const openAdd = () => {
    if (atLimit) return;
    setIsAdding(true);
    setTimeout(() => textareaRef.current?.focus(), 40);
  };
  const cancelAdd = () => {
    setIsAdding(false);
    setAddContent('');
    setAddError(null);
  };

  const handleAdd = async () => {
    if (!addContent.trim()) { setAddError('Note cannot be empty'); return; }
    try {
      await createMutation.mutateAsync({ content: addContent });
    } catch (e: any) {
      setAddError(e?.message || 'Failed to save');
    }
  };

  const handleSaveEdit = async (content: string) => {
    if (!editingNoteId) return;
    await updateMutation.mutateAsync({ noteId: editingNoteId, content });
  };

  const handleDelete = async (noteId: string) => {
    if (!confirm('Delete this note?')) return;
    await deleteMutation.mutateAsync(noteId);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => prev?.focus();
  }, []);


  // Group notes by calendar day for the timeline view
  const notesByDay: Array<{ label: string; notes: typeof notes }> = [];
  for (const note of notes) {
    const label = dayLabel(note.createdAt);
    const last = notesByDay[notesByDay.length - 1];
    if (last?.label === label) last.notes.push(note);
    else notesByDay.push({ label, notes: [note] });
  }

  const header = (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '13px 16px', flexShrink: 0,
      borderBottom: '1px solid #f1f5f9',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>Notes</h2>
        <p style={{ fontSize: 10.5, color: '#94a3b8', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {leadName}
        </p>
      </div>

      <span style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '0.03em',
        color: atLimit ? '#dc2626' : '#94a3b8',
        flexShrink: 0,
      }}>
        {count}/15
      </span>

      {!atLimit && (
        <button
          onClick={openAdd}
          disabled={isAdding}
          aria-label="Add note"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            padding: '4px 10px', borderRadius: 6, border: 'none',
            background: isAdding ? '#f1f5f9' : '#0f172a',
            color: isAdding ? '#94a3b8' : '#fff',
            fontSize: 11, fontWeight: 600,
            cursor: isAdding ? 'default' : 'pointer',
            transition: 'background 0.1s', flexShrink: 0,
          }}
          onMouseEnter={e => { if (!isAdding) e.currentTarget.style.background = '#1e293b'; }}
          onMouseLeave={e => { if (!isAdding) e.currentTarget.style.background = '#0f172a'; }}
        >
          <Plus size={9} strokeWidth={3} />
          Add
        </button>
      )}

      <button
        onClick={onClose}
        aria-label="Close notes"
        style={{
          width: 24, height: 24, borderRadius: 5,
          border: 'none', background: 'transparent', color: '#94a3b8',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'all 0.1s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#475569'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
      >
        <X size={13} />
      </button>
    </div>
  );

  const body = (
    <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
      {isAdding && (
        <div className="nm-addform" style={{ margin: '10px 14px 0', padding: '11px 13px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e9ecf0' }}>
          {addError && (
            <div style={{ fontSize: 11, color: '#b91c1c', background: '#fef2f2', padding: '4px 8px', borderRadius: 5, marginBottom: 7 }}>
              {addError}
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={addContent}
            onChange={e => { if (e.target.value.length <= 500) { setAddContent(e.target.value); setAddError(null); } }}
            placeholder="Write your note…"
            className={TEXTAREA_CLASS}
            rows={3}
            disabled={createMutation.isPending}
          />
          <NoteCharacterCounter length={addContent.length} style={{ marginTop: 2, marginBottom: 7 }} />
          <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end', marginTop: 7 }}>
            <button
              onClick={cancelAdd}
              disabled={createMutation.isPending}
              style={{ padding: '5px 11px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={createMutation.isPending || !addContent.trim()}
              style={{
                padding: '5px 11px', borderRadius: 6, border: 'none',
                background: !addContent.trim() ? '#cbd5e1' : '#0f172a',
                color: '#fff', fontSize: 11, fontWeight: 600,
                cursor: !addContent.trim() || createMutation.isPending ? 'not-allowed' : 'pointer',
                opacity: createMutation.isPending ? 0.7 : 1,
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (addContent.trim() && !createMutation.isPending) e.currentTarget.style.background = '#334155'; }}
              onMouseLeave={e => { if (addContent.trim() && !createMutation.isPending) e.currentTarget.style.background = '#0f172a'; }}
            >
              {createMutation.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>Loading…</div>
      ) : notes.length === 0 && !isAdding ? (
        <div style={{ padding: '52px 16px', textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 7px' }}>No notes yet.</p>
          <button onClick={openAdd} style={{ fontSize: 11.5, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
            Add the first note →
          </button>
        </div>
      ) : (
        <div style={{ paddingBottom: atLimit ? 0 : 8 }}>
          {notesByDay.map(({ label, notes: dayNotes }, dayIdx) => (
            <div key={label}>
              {/* Day label */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px 4px' }}>
                <div style={{ flex: 1, height: 1, background: '#f1f5f9' }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: '#b0b8c8', letterSpacing: '0.05em', textTransform: 'uppercase', flexShrink: 0 }}>
                  {label}
                </span>
                <div style={{ flex: 1, height: 1, background: '#f1f5f9' }} />
              </div>

              {dayNotes.map((note, noteIdx) => (
                <div key={note.id}>
                  {editingNoteId === note.id ? (
                    <div style={{ padding: '6px 16px' }}>
                      <EditLeadNote
                        note={note}
                        onSave={handleSaveEdit}
                        onCancel={() => setEditingNoteId(null)}
                        isLoading={updateMutation.isPending}
                      />
                    </div>
                  ) : (
                    <LeadNoteItem
                      note={note}
                      isEditable={isEditableToday(note)}
                      onEdit={n => setEditingNoteId(n.id)}
                      onDelete={() => handleDelete(note.id)}
                      authorName="You"
                      isDeleting={deleteMutation.isPending && deleteMutation.variables === note.id}
                      compact
                    />
                  )}
                  {noteIdx < dayNotes.length - 1 && (
                    <div style={{ height: 1, background: '#f8fafc', margin: '0 16px' }} />
                  )}
                </div>
              ))}

              {dayIdx < notesByDay.length - 1 && <div style={{ height: 4 }} />}
            </div>
          ))}
        </div>
      )}

      {atLimit && (
        <div style={{ padding: '7px 16px 10px', fontSize: 11, color: '#b91c1c', textAlign: 'center' }}>
          Maximum of 15 notes reached.
        </div>
      )}
    </div>
  );

  const isPanelMode = anchorRight > 0;

  const panelContent = isPanelMode ? (
    <>
      <style>{SHARED_CSS}</style>
      {/* Transparent click-away covering only the main content area */}
      <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: anchorRight + PANEL_W, bottom: 0, zIndex: 1149 }} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Notes — ${leadName}`}
        tabIndex={-1}
        style={{
          position: 'fixed', top: 0, right: anchorRight, bottom: 0, width: PANEL_W,
          zIndex: 1150,
          background: '#fff',
          borderLeft: '1px solid #e2e8f0',
          boxShadow: '-10px 0 36px rgba(15,23,42,0.09)',
          display: 'flex', flexDirection: 'column',
          outline: 'none',
        }}
      >
        {header}
        {body}
      </div>
    </>
  ) : (
    // Centered overlay (inside LeadModal / no ContextPanel)
    <>
      <style>{SHARED_CSS}</style>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Notes — ${leadName}`}
        style={{ position: 'fixed', inset: 0, zIndex: 1150, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem' }}
      >
        <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.3)', animation: 'nm-fade 120ms ease both' }} />
        <div
          ref={panelRef}
          tabIndex={-1}
          style={{
            position: 'relative', zIndex: 1,
            width: '100%', maxWidth: 480, maxHeight: '80vh',
            background: '#fff', borderRadius: 16,
            boxShadow: '0 20px 48px rgba(0,0,0,0.13), 0 0 0 1px rgba(0,0,0,0.04)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            animation: 'nm-rise 180ms ease both',
            outline: 'none',
          }}
        >
          {header}
          {body}
        </div>
      </div>
    </>
  );

  // Portal to document.body so position:fixed escapes any transformed ancestor (e.g. ContextPanel's slideInRight animation)
  return createPortal(panelContent, document.body);
});
