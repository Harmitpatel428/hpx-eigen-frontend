import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, ChevronDown } from 'lucide-react';
import { documentationService } from '../../services/documentation.service';
import { toast } from '../notifications/notify';
import type { DocActivity } from '../../types';

/**
 * Documentation follow-up control — the same popover interaction as the Sales
 * lead panel's follow-up date picker (LeadStageSelector), wired to DocActivity.
 * Editing an existing follow-up UPDATES it in place (date + optional notes) rather
 * than inserting a second PENDING row — that was the "old date still shows" bug.
 */
export function DocFollowUpControl({ caseId, canEdit, activities }: {
  caseId: string; canEdit: boolean; activities: DocActivity[];
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  // Soonest pending follow-up → the Sales-style amber/overdue badge AND the row we edit.
  const next = activities
    .filter(a => a.state === 'PENDING' && a.scheduledAt && a.type === 'FOLLOW_UP')
    .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())[0];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const overdue = !!next && new Date(next.scheduledAt!) < today;
  const fmt = (iso: string) => new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });

  const save = useMutation({
    // Edit the existing follow-up in place when one exists; otherwise create.
    mutationFn: () => {
      const scheduledAt = `${date}T00:00:00.000Z`; // UTC midnight — backend follow-up convention.
      const n = notes.trim();
      return next
        ? documentationService.updateActivity(next.id, { scheduledAt, notes: n })
        : documentationService.createActivity(caseId, {
            type: 'FOLLOW_UP', subject: 'Follow-up', scheduledAt, metadata: n ? { notes: n } : {},
          });
    },
    onSuccess: () => {
      toast.success('Follow-up saved');
      setOpen(false); setDate(''); setNotes('');
      qc.invalidateQueries({ queryKey: ['doc-case', caseId] });
      qc.invalidateQueries({ queryKey: ['doc-activities'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Could not save follow-up.'),
  });

  // Prefill from the current follow-up so the popover opens as an edit, not a blank form.
  const openPopover = () => {
    setDate(next?.scheduledAt ? new Date(next.scheduledAt).toISOString().slice(0, 10) : '');
    setNotes(typeof next?.metadata?.notes === 'string' ? (next.metadata.notes as string) : '');
    setOpen(true);
  };

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <div ref={ref} style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => { if (!canEdit) return; open ? setOpen(false) : openPopover(); }}
          disabled={!canEdit}
          style={{
            display: 'flex', alignItems: 'center', gap: 4, cursor: canEdit ? 'pointer' : 'default',
            padding: '3px 9px', borderRadius: 5, border: '1px solid var(--border-medium)',
            background: 'var(--bg-app)', color: 'var(--text-secondary)',
            fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
            opacity: canEdit ? 1 : 0.6,
          }}
        >
          <Calendar size={10} /> {next ? 'Edit Follow-up' : 'New Follow-up'}
          {canEdit && <ChevronDown size={9} style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 120ms' }} />}
        </button>
        {open && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 200,
            background: 'var(--bg-app)', border: '1px solid var(--border-medium)',
            borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 230, overflow: 'hidden',
          }}>
            <div style={{ padding: '10px 12px 12px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Follow-up Date</div>
              <input
                type="date"
                autoFocus
                value={date}
                min={new Date().toISOString().slice(0, 10)}
                onChange={e => setDate(e.target.value)}
                style={{ width: '100%', fontSize: 12, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border-medium)', background: 'var(--bg-app)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
              />
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', margin: '10px 0 6px' }}>Notes <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>(optional)</span></div>
              <textarea
                value={notes}
                rows={2}
                onChange={e => setNotes(e.target.value)}
                placeholder="What to follow up on…"
                style={{ width: '100%', resize: 'vertical', fontSize: 12, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border-medium)', background: 'var(--bg-app)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: 6, marginTop: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setOpen(false); setDate(''); setNotes(''); }}
                  style={{ padding: '4px 10px', fontSize: 11, borderRadius: 5, border: '1px solid var(--border-medium)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  Back
                </button>
                <button type="button" disabled={!date || save.isPending} onClick={() => date && save.mutate()}
                  style={{ padding: '4px 10px', fontSize: 11, borderRadius: 5, border: 'none', background: '#0f172a', color: '#fff', cursor: date ? 'pointer' : 'not-allowed', opacity: date ? 1 : 0.5 }}>
                  {save.isPending ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {next && (
        <span title={typeof next.metadata?.notes === 'string' ? (next.metadata.notes as string) : 'Next follow-up'} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 5,
          background: overdue ? 'rgba(220,38,38,0.1)' : 'rgba(245,158,11,0.1)',
          color: overdue ? '#dc2626' : '#d97706', fontSize: 10, fontWeight: 600,
        }}>
          <Calendar size={9} />
          {fmt(next.scheduledAt!)}{overdue && ' · Overdue'}
        </span>
      )}
    </div>
  );
}
