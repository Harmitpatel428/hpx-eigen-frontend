import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { Check, Plus, X, ChevronDown, MapPin, Keyboard, Lock, Settings } from 'lucide-react';

// Department-agnostic Activities UI. Sales (ActivitiesPage) and Documentation
// (DocActivitiesPanel) each supply an ActivitiesAdapter; all markup lives here.

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActivityVM {
  id: string;
  state: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  type: string;
  subject: string;
  scheduledAt: string | null;
  completedAt: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
  actorName: string;                 // '' when no actor, else 'First Last'
  entityId?: string;                 // leadId (Sales) | caseId (Doc) — nav + unlock keying
  identity: { company: string | null; person: string | null; code: string | null } | null;
}

export type ActivityTemplate = { label: string; type: string; duration: string | null; location: string; subject: string };

export interface ActivitiesAdapter {
  queryKey: string;
  heading: string;
  entityNoun: string;
  fullPage: boolean;
  filters: { key: string; label: string }[];
  defaultFilter: string;
  templates: readonly ActivityTemplate[];
  keyboardShortcuts: { key: string; action: string }[];
  emptyStates: Record<string, { icon: React.ReactNode; msg: string }>;
  storage: { tab: string; sticky: string; unlock: string; lastLocation: string; savedLocations: string };
  activityIcon: (type: string) => React.ReactNode;
  list: (filter: string) => Promise<{ data: unknown[]; total: number }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toVM: (raw: any) => ActivityVM;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  complete: (id: string, opts?: { note?: string; nextFollowUp?: string }) => Promise<any>;
  bulkComplete: (ids: string[]) => Promise<{ count: number }>;
  scheduleTitle: string;
  subjectPlaceholder: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  EntityPicker: React.ComponentType<{ value: any; onChange: (v: any) => void }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getPickedEntityId: (picked: any) => string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createFromModal: (entity: any, input: { type: string; subject: string; scheduledAt?: string; metadata: Record<string, unknown> }) => Promise<any>;
  defaultCreateType: string;
  isSelectable: (vm: ActivityVM) => boolean;
  editNeedsFocus: boolean;           // 'e' shortcut requires a focused row (Sales) or not (Doc)
  loadErrorMsg?: string;             // shown when the list query errors (Doc); Sales shows the empty state
  onCompleteSuccess?: (qc: QueryClient, vm: ActivityVM) => void;
  onCompleteError?: () => void;
  onBulkError?: () => void;
  onCreateSuccess?: (qc: QueryClient, pickedEntityId: string) => void;
}

// ─── Constants / helpers ──────────────────────────────────────────────────────

const DURATION_OPTIONS = [
  { value: 'M15',       label: '15 min'    },
  { value: 'M30',       label: '30 min'    },
  { value: 'M45',       label: '45 min'    },
  { value: 'H1',        label: '1 hour'    },
  { value: 'H2',        label: '2 hours'   },
  { value: 'HALF_DAY',  label: 'Half Day'  },
  { value: 'WHOLE_DAY', label: 'Whole Day' },
  { value: 'CUSTOM',    label: 'Custom'    },
];

const DURATION_MINUTES: Record<string, number | null> = {
  M15: 15, M30: 30, M45: 45, H1: 60, H2: 120,
  HALF_DAY: null, WHOLE_DAY: null, CUSTOM: null,
};

const MAX_SAVED_LOCATIONS = 8;

interface UnlockSettings { enabled: boolean; count: number; }

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function getSavedLocations(key: string): string[] {
  try { return JSON.parse(localStorage.getItem(key) ?? '[]'); } catch { return []; }
}
function persistLocation(adapter: ActivitiesAdapter, loc: string) {
  try {
    localStorage.setItem(adapter.storage.lastLocation, loc);
    const prev = getSavedLocations(adapter.storage.savedLocations).filter(l => l !== loc);
    localStorage.setItem(adapter.storage.savedLocations, JSON.stringify([loc, ...prev].slice(0, MAX_SAVED_LOCATIONS)));
  } catch {}
}

// Returns next business day at 11:00 using LOCAL date (not UTC)
function defaultScheduledDate(): { date: string; time: string } {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return { date: `${year}-${month}-${day}`, time: '11:00' };
}

function formatScheduled(iso: string | null, eventIso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const dDay = new Date(d); dDay.setHours(0, 0, 0, 0);
  const isDateOnly = d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0;
  const timeFmt: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
  // Date-only scheduledAt → show the event creation time instead (when the update happened)
  const time = !isDateOnly
    ? ' · ' + d.toLocaleTimeString([], timeFmt)
    : eventIso
      ? ' · ' + new Date(eventIso).toLocaleTimeString([], timeFmt)
      : '';
  if (dDay.getTime() === today.getTime())    return `Today${time}`;
  if (dDay.getTime() === tomorrow.getTime()) return `Tomorrow${time}`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + time;
}

// Completed history: the activity's own completion/creation timestamp, not the scheduled one
function formatCompleted(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' · ' +
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function nextFollowUpDate(choice: 'tomorrow' | 'next-week'): string {
  const d = new Date();
  // "Tomorrow" means literally tomorrow — no weekend skipping, or the label lies.
  d.setDate(d.getDate() + (choice === 'tomorrow' ? 1 : 7));
  d.setHours(10, 0, 0, 0);
  return d.toISOString();
}

// ─── Location Combobox ────────────────────────────────────────────────────────

function LocationCombobox({ value, onChange, savedKey }: { value: string; onChange: (v: string) => void; savedKey: string }) {
  const [open, setOpen]   = useState(false);
  const [input, setInput] = useState(value);
  const suggestions = getSavedLocations(savedKey).filter(l => l.toLowerCase().includes(input.toLowerCase()));

  function pick(loc: string) { setInput(loc); onChange(loc); setOpen(false); }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', border: '1px solid var(--border-medium)', borderRadius: 8, background: 'var(--bg-app)' }}>
        <MapPin size={13} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
        <input
          value={input}
          onChange={e => { setInput(e.target.value); onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Add location (optional)"
          style={{ border: 'none', outline: 'none', flex: 1, fontSize: 13, background: 'transparent', color: 'var(--text-primary)' }}
        />
        {input && <button type="button" onClick={() => { setInput(''); onChange(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-tertiary)', display: 'flex' }}><X size={13} /></button>}
      </div>
      {open && suggestions.length > 0 && (
        <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'var(--bg-app)', border: '1px solid var(--border-medium)', borderRadius: 8, marginTop: 4, padding: 4, listStyle: 'none', boxShadow: '0 4px 16px rgba(0,0,0,.1)' }}>
          {suggestions.map(loc => (
            <li key={loc} onMouseDown={() => pick(loc)} style={{ padding: '7px 10px', fontSize: 13, cursor: 'pointer', borderRadius: 6, color: 'var(--text-primary)' }}>{loc}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Quick Complete Inline Form ───────────────────────────────────────────────

function QuickCompleteForm({ vm, adapter, onClose }: { vm: ActivityVM; adapter: ActivitiesAdapter; onClose: () => void }) {
  const qc = useQueryClient();
  const [note, setNote]           = useState('');
  const [followUp, setFollowUp]   = useState<'none' | 'tomorrow' | 'next-week' | 'custom'>('none');
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('10:00');

  const mut = useMutation<unknown, Error, { note?: string; nextFollowUp?: string }>({
    mutationFn: (opts) => adapter.complete(vm.id, opts),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: [adapter.queryKey] });
      const snaps = qc.getQueriesData<any>({ queryKey: [adapter.queryKey] });
      qc.setQueriesData<any>({ queryKey: [adapter.queryKey] }, (old: any) => {
        if (!old?.data) return old;
        return { ...old, data: old.data.map((a: { id: string }) => a.id === vm.id ? { ...a, state: 'COMPLETED' } : a) };
      });
      return { snaps };
    },
    onError: (_e, _v, ctx: any) => {
      if (ctx?.snaps) ctx.snaps.forEach(([key, data]: [any, any]) => qc.setQueryData(key, data));
      adapter.onCompleteError?.();
    },
    onSuccess: () => {
      adapter.onCompleteSuccess?.(qc, vm);
      onClose();
    },
    onSettled: () => qc.invalidateQueries({ queryKey: [adapter.queryKey] }),
  });

  function submit() {
    let nextFollowUp: string | undefined;
    if (followUp === 'tomorrow') nextFollowUp = nextFollowUpDate('tomorrow');
    else if (followUp === 'next-week') nextFollowUp = nextFollowUpDate('next-week');
    // Use local datetime parsing — browser treats YYYY-MM-DDTHH:mm as local time
    else if (followUp === 'custom' && customDate) nextFollowUp = new Date(`${customDate}T${customTime}`).toISOString();
    mut.mutate({ note: note.trim() || undefined, nextFollowUp });
  }

  return (
    <div onClick={e => e.stopPropagation()} style={{ marginTop: 8, padding: '12px 14px', background: 'var(--bg-muted)', borderRadius: 8, border: '1px solid var(--border-light)' }}>
      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Add completion note (optional)"
        rows={2}
        style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border-medium)', borderRadius: 8, fontSize: 13, background: 'var(--bg-app)', color: 'var(--text-primary)', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
      />
      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)', alignSelf: 'center' }}>Follow-up:</span>
        {(['none', 'tomorrow', 'next-week', 'custom'] as const).map(opt => (
          <button key={opt} type="button" onClick={() => setFollowUp(opt)}
            className={`btn ${followUp === opt ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: 12, padding: '3px 10px' }}>
            {opt === 'none' ? 'None' : opt === 'tomorrow' ? 'Tomorrow' : opt === 'next-week' ? 'Next Week' : 'Custom'}
          </button>
        ))}
      </div>
      {followUp === 'custom' && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)}
            style={{ flex: 1, padding: '5px 8px', border: '1px solid var(--border-medium)', borderRadius: 6, fontSize: 13, background: 'var(--bg-app)', color: 'var(--text-primary)', outline: 'none' }} />
          <input type="time" value={customTime} onChange={e => setCustomTime(e.target.value)}
            style={{ width: 100, padding: '5px 8px', border: '1px solid var(--border-medium)', borderRadius: 6, fontSize: 13, background: 'var(--bg-app)', color: 'var(--text-primary)', outline: 'none' }} />
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
        <button type="button" onClick={onClose} className="btn btn-secondary" style={{ fontSize: 12 }}>Cancel</button>
        <button type="button" onClick={submit} disabled={mut.isPending} className="btn btn-primary" style={{ fontSize: 12 }}>
          {mut.isPending ? 'Saving…' : 'Mark Complete'}
        </button>
      </div>
    </div>
  );
}

// ─── Schedule Modal ───────────────────────────────────────────────────────────

function ScheduleModal({ adapter, onClose, initialValues }: { adapter: ActivitiesAdapter; onClose: () => void; initialValues?: Partial<ActivityTemplate> | null }) {
  const qc = useQueryClient();
  const defaults = defaultScheduledDate();
  const noun = adapter.entityNoun;
  const [entity, setEntity]       = useState<any>(null);
  const [subject, setSubject]     = useState(initialValues?.subject ?? '');
  const [duration, setDuration]   = useState<string>(initialValues?.duration ?? 'M30');
  const [location, setLocation]   = useState(initialValues?.location ?? (localStorage.getItem(adapter.storage.lastLocation) || 'Phone'));
  const [date, setDate]           = useState(defaults.date);
  const [startTime, setStartTime] = useState(defaults.time);
  const [endTime, setEndTime]     = useState('');
  const [error, setError]         = useState('');

  const hideTimes   = duration === 'HALF_DAY' || duration === 'WHOLE_DAY';
  const showEndTime = duration === 'CUSTOM';
  const { EntityPicker } = adapter;

  const createMut = useMutation({
    mutationFn: () => {
      if (!entity) throw new Error(`Select a ${noun}`);
      if (!subject.trim()) throw new Error('Subject is required');
      if (!hideTimes && !date) throw new Error('Date is required');
      if (!hideTimes && !startTime) throw new Error('Start time is required');
      if (showEndTime && endTime && endTime <= startTime) throw new Error('End time must be after start time');

      // Timed events: local datetime parsing — browser treats YYYY-MM-DDTHH:mm as local time
      // Date-only events (HALF_DAY/WHOLE_DAY): UTC midnight so isDateOnly detection works
      let scheduledAt: string | undefined;
      if (!hideTimes && date && startTime) scheduledAt = new Date(`${date}T${startTime}`).toISOString();
      else if (hideTimes && date) scheduledAt = `${date}T00:00:00.000Z`;

      const mins = DURATION_MINUTES[duration];
      const meta: Record<string, unknown> = { duration };
      if (location.trim()) meta.location = location.trim();
      if (showEndTime && endTime && date) meta.endTime = new Date(`${date}T${endTime}`).toISOString();
      if (mins !== null) meta.durationMinutes = mins;

      return adapter.createFromModal(entity, {
        type: initialValues?.type ?? adapter.defaultCreateType,
        subject: subject.trim(),
        scheduledAt,
        metadata: meta,
      });
    },
    onSuccess: () => {
      if (location.trim()) persistLocation(adapter, location.trim());
      qc.invalidateQueries({ queryKey: [adapter.queryKey] });
      if (entity) adapter.onCreateSuccess?.(qc, adapter.getPickedEntityId(entity));
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-app)', borderRadius: 14, padding: 24, width: 420, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,.2)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
            {initialValues?.label ?? adapter.scheduleTitle}
          </h2>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', padding: 4 }}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 5 }}>{cap(noun)} *</label>
            <EntityPicker value={entity} onChange={setEntity} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 5 }}>Subject *</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder={adapter.subjectPlaceholder}
              style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border-medium)', borderRadius: 8, fontSize: 13, background: 'var(--bg-app)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          {initialValues?.duration !== null && (
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 5 }}>Duration</label>
              <div style={{ position: 'relative' }}>
                <select value={duration} onChange={e => setDuration(e.target.value)}
                  style={{ width: '100%', padding: '7px 30px 7px 10px', border: '1px solid var(--border-medium)', borderRadius: 8, fontSize: 13, background: 'var(--bg-app)', color: 'var(--text-primary)', appearance: 'none', outline: 'none', cursor: 'pointer' }}>
                  {DURATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
              </div>
            </div>
          )}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 5 }}>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border-medium)', borderRadius: 8, fontSize: 13, background: 'var(--bg-app)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          {!hideTimes && (
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 5 }}>Start time</label>
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border-medium)', borderRadius: 8, fontSize: 13, background: 'var(--bg-app)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              {showEndTime && (
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 5 }}>End time</label>
                  <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border-medium)', borderRadius: 8, fontSize: 13, background: 'var(--bg-app)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              )}
            </div>
          )}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 5 }}>Location</label>
            <LocationCombobox value={location} onChange={setLocation} savedKey={adapter.storage.savedLocations} />
          </div>
          {error && <p style={{ margin: 0, fontSize: 12, color: 'var(--color-error, #ef4444)' }}>{error}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ fontSize: 13 }}>Cancel</button>
            <button type="button" onClick={() => createMut.mutate()} disabled={createMut.isPending} className="btn btn-primary" style={{ fontSize: 13 }}>
              {createMut.isPending ? 'Scheduling…' : 'Schedule'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Shortcuts Modal ──────────────────────────────────────────────────────────

function ShortcutsModal({ shortcuts, onClose }: { shortcuts: { key: string; action: string }[]; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}>
      <div style={{ background: 'var(--bg-app)', borderRadius: 12, padding: 24, width: 340, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Keyboard Shortcuts</h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex' }}><X size={16} /></button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {shortcuts.map(({ key, action }) => (
              <tr key={key}>
                <td style={{ padding: '5px 0', verticalAlign: 'top' }}>
                  <kbd style={{ display: 'inline-block', padding: '1px 6px', background: 'var(--bg-muted)', border: '1px solid var(--border-medium)', borderRadius: 4, fontSize: 12, fontFamily: 'monospace', color: 'var(--text-primary)' }}>{key}</kbd>
                </td>
                <td style={{ padding: '5px 0 5px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>{action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Unlock Settings Popover ──────────────────────────────────────────────────

function UnlockSettingsPopover({ noun, settings, onChange, onClose }: {
  noun: string; settings: UnlockSettings; onChange: (s: UnlockSettings) => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  function setCount(raw: string) {
    const n = parseInt(raw, 10);
    if (isNaN(n)) return;
    onChange({ ...settings, count: Math.min(20, Math.max(1, n)) });
  }

  return (
    <div ref={ref} style={{
      position: 'absolute', top: '100%', right: 0, zIndex: 150, marginTop: 6,
      background: 'var(--bg-app)', border: '1px solid var(--border-medium)',
      borderRadius: 10, padding: '14px 16px', width: 260,
      boxShadow: '0 8px 24px rgba(0,0,0,.12)',
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
        {cap(noun)} Unlock Settings
      </div>

      {/* Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Limit unlocked {noun}s</div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
            {settings.enabled ? `Restricts workable ${noun}s to configured count` : `All ${noun}s are workable`}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onChange({ ...settings, enabled: !settings.enabled })}
          style={{
            position: 'relative', width: 38, height: 22, borderRadius: 999,
            border: 'none', cursor: 'pointer', flexShrink: 0,
            background: settings.enabled ? '#0f172a' : '#cbd5e1',
            transition: 'background 0.15s',
          }}
          aria-label={settings.enabled ? `Disable ${noun} limit` : `Enable ${noun} limit`}
        >
          <span style={{
            position: 'absolute', top: 2, left: settings.enabled ? 18 : 2,
            width: 18, height: 18, borderRadius: '50%', background: '#fff',
            transition: 'left 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }} />
        </button>
      </div>

      {/* Count input — only when enabled */}
      {settings.enabled && (
        <div>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>
            Number of unlocked {noun}s (1–20)
          </label>
          <input
            type="number"
            min={1}
            max={20}
            value={settings.count}
            onChange={e => setCount(e.target.value)}
            style={{
              width: '100%', padding: '6px 10px', fontSize: 13, boxSizing: 'border-box',
              border: '1px solid var(--border-medium)', borderRadius: 7,
              background: 'var(--bg-app)', color: 'var(--text-primary)', outline: 'none',
            }}
          />
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
            First {settings.count} {noun}{settings.count !== 1 ? 's' : ''} in the list are workable. Others are locked.
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Activity Row ─────────────────────────────────────────────────────────────

interface ActivityRowProps {
  vm: ActivityVM;
  adapter: ActivitiesAdapter;
  focused: boolean;
  checked: boolean;
  expanded: boolean;
  locked: boolean;
  canEdit: boolean;
  onOpen: (entityId: string) => void;
  onExpand: (id: string | null) => void;
  onCheck: (id: string, shiftKey: boolean) => void;
}

function ActivityRow({ vm, adapter, focused, checked, expanded, locked, canEdit, onOpen, onExpand, onCheck }: ActivityRowProps) {
  const isOverdue = vm.state === 'PENDING' && vm.scheduledAt && (() => {
    const s = new Date(vm.scheduledAt!);
    const now = new Date();
    const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    return s.getTime() < todayUTC;
  })();
  // Pending rows show their due date; completed/cancelled history shows when it actually happened
  const rowTime = vm.state === 'PENDING'
    ? formatScheduled(vm.scheduledAt, vm.createdAt)
    : formatCompleted(vm.completedAt ?? vm.createdAt);

  const company    = vm.identity?.company || null;
  const personName = vm.identity?.person || null;
  const code       = vm.identity?.code || null;
  const noun       = adapter.entityNoun;
  const canComplete = canEdit && vm.state === 'PENDING';

  return (
    <div style={{ position: 'relative', opacity: locked ? 0.5 : 1 }}>
      <div
        style={{
          display: 'flex', alignItems: 'flex-start', gap: 12, padding: '11px 0',
          borderBottom: '1px solid var(--border-light)',
          outline: focused ? '2px solid var(--color-accent)' : 'none',
          outlineOffset: -2, borderRadius: focused ? 6 : 0,
        }}
      >
        {/* Checkbox / icon */}
        <div className="activity-checkbox" style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
          {locked ? (
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
              <Lock size={12} />
            </div>
          ) : checked ? (
            <input type="checkbox" checked onChange={() => {}} onClick={e => onCheck(vm.id, e.shiftKey)} style={{ cursor: 'pointer', accentColor: 'var(--color-accent)' }} />
          ) : (
            <>
              <div className="activity-icon" style={{ width: 28, height: 28, borderRadius: '50%', background: isOverdue ? 'rgba(239,68,68,.12)' : 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isOverdue ? '#ef4444' : 'var(--text-tertiary)' }}>
                {adapter.activityIcon(vm.type)}
              </div>
              {canEdit && adapter.isSelectable(vm) && (
                <input type="checkbox" className="activity-check-input" checked={false} onChange={() => {}} onClick={e => onCheck(vm.id, e.shiftKey)} style={{ display: 'none', cursor: 'pointer', accentColor: 'var(--color-accent)' }} />
              )}
            </>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title row + right meta */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {vm.subject}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {/* by {actor} · {timestamp} */}
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                {vm.actorName && <>{`by ${vm.actorName}`}{' · '}</>}
                <span style={{ color: isOverdue ? '#ef4444' : 'var(--text-tertiary)' }}>{rowTime}</span>
              </span>
              {!locked && canComplete && (
                <button type="button" onClick={() => onExpand(expanded ? null : vm.id)} title="Quick complete"
                  style={{ width: 26, height: 26, borderRadius: '50%', border: '1.5px solid var(--border-medium)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', flexShrink: 0 }}>
                  <Check size={13} />
                </button>
              )}
              {vm.state === 'COMPLETED' && (
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
                  <Check size={13} />
                </div>
              )}
            </div>
          </div>

          {/* Identity line: [avatar] Company · Person · code */}
          {vm.identity && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, minWidth: 0, overflow: 'hidden' }}>
              {!company && !personName ? (
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', cursor: 'default' }}>Unnamed {noun}</span>
              ) : (
                <>
                  <button
                    type="button"
                    className="activity-lead-btn"
                    onClick={() => !locked && vm.entityId && onOpen(vm.entityId)}
                    onMouseDown={adapter.fullPage ? undefined : (e) => e.preventDefault()}
                    disabled={locked}
                    aria-label={`Open ${noun}: ${company || personName}`}
                  >
                    <div className="activity-lead-avatar">
                      {(company?.[0] ?? personName?.[0] ?? '?').toUpperCase()}
                    </div>
                    <span className="activity-lead-name" title={company || personName || undefined}>
                      {company || personName}
                    </span>
                  </button>
                  {company && personName && personName !== company && (
                    <>
                      <span style={{ color: 'var(--text-tertiary)', fontSize: 12, flexShrink: 0, userSelect: 'none' }}>·</span>
                      <span
                        title={personName}
                        style={{
                          fontSize: 'var(--text-xs)', color: 'var(--text-secondary)',
                          fontWeight: 400, cursor: 'default', userSelect: 'none',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
                        }}
                      >
                        {personName}
                      </span>
                    </>
                  )}
                  {code && (
                    <>
                      <span style={{ color: 'var(--text-tertiary)', fontSize: 12, flexShrink: 0, userSelect: 'none' }}>·</span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontFamily: 'monospace', flexShrink: 0 }}>{code}</span>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* Location metadata */}
          {vm.metadata && typeof vm.metadata.location === 'string' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
              <MapPin size={11} style={{ color: 'var(--text-tertiary)' }} />
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{vm.metadata.location}</span>
            </div>
          )}
        </div>
      </div>

      {expanded && !locked && canComplete && (
        <QuickCompleteForm vm={vm} adapter={adapter} onClose={() => onExpand(null)} />
      )}
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export function ActivitiesView({ adapter, canEdit, onOpen, onEscape, suspendKeys }: {
  adapter: ActivitiesAdapter;
  canEdit: boolean;
  onOpen: (entityId: string) => void;
  onEscape?: () => void;
  suspendKeys?: boolean;
}) {
  const qc = useQueryClient();
  const { storage, entityNoun: noun, fullPage } = adapter;

  // Default landing tab is Due Today; a deliberately chosen tab survives reloads.
  // Saved values are validated against current filters so renamed/removed tabs
  // fall back to the default instead of breaking the page.
  const [filter, setFilterState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(storage.tab);
      if (saved && adapter.filters.some(f => f.key === saved)) return saved;
    } catch { /* storage unavailable */ }
    return adapter.defaultFilter;
  });

  // Persist the chosen tab so refresh/reopen restores it (validated on read).
  const setFilter = useCallback((f: string) => {
    setFilterState(f);
    try { localStorage.setItem(storage.tab, f); } catch { /* storage unavailable */ }
  }, [storage.tab]);

  const [showModal, setShowModal]       = useState(false);
  const [templateInit, setTemplateInit] = useState<ActivityTemplate | null>(null);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [expandedId, setExpandedId]     = useState<string | null>(null);
  const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showUnlockSettings, setShowUnlockSettings] = useState(false);
  const [unlockSettings, setUnlockSettings] = useState<UnlockSettings>(() => {
    try { return JSON.parse(localStorage.getItem(storage.unlock) ?? '{"enabled":false,"count":5}'); }
    catch { return { enabled: false, count: 5 }; }
  });
  const [stickyHeader, setStickyHeader] = useState<boolean>(() => {
    try { return localStorage.getItem(storage.sticky) === 'true'; }
    catch { return false; }
  });
  const [search, setSearch]             = useState('');
  const searchRef                       = useRef<HTMLInputElement>(null);
  const lastSelectedIndex               = useRef<number>(-1);
  const templateMenuRef                 = useRef<HTMLDivElement>(null);
  const unlockSettingsRef               = useRef<HTMLDivElement>(null);

  // Persist unlock settings to localStorage
  useEffect(() => {
    try { localStorage.setItem(storage.unlock, JSON.stringify(unlockSettings)); } catch {}
  }, [unlockSettings, storage.unlock]);

  // Persist sticky header pref
  const toggleStickyHeader = useCallback(() => {
    setStickyHeader(prev => {
      const next = !prev;
      try { localStorage.setItem(storage.sticky, String(next)); } catch {}
      return next;
    });
  }, [storage.sticky]);

  // staleTime: 0 ensures deleted entities are cleared immediately on re-visit
  const { data, isLoading, isError } = useQuery({
    queryKey: [adapter.queryKey, filter],
    queryFn: () => adapter.list(filter),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const items = useMemo(() => (data?.data ?? []).map(adapter.toVM), [data, adapter]);
  const total = data?.total ?? 0;

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(a =>
      a.subject.toLowerCase().includes(q) ||
      (a.identity?.person ?? '').toLowerCase().includes(q) ||
      (a.identity?.company ?? '').toLowerCase().includes(q) ||
      (a.identity?.code ?? '').toLowerCase().includes(q)
    );
  }, [items, search]);

  // Compute unlocked entity IDs for the current filtered list.
  // Tracks unique entityIds in list order; first N are unlocked.
  const unlockedEntityIds = useMemo<Set<string> | null>(() => {
    if (!unlockSettings.enabled) return null; // null = all unlocked
    const ids = new Set<string>();
    for (const item of filteredItems) {
      if (!item.entityId) continue;
      if (ids.size >= unlockSettings.count) break;
      ids.add(item.entityId);
    }
    return ids;
  }, [filteredItems, unlockSettings]);

  // ─── Bulk complete ───────────────────────────────────────────────────────────
  const bulkMut = useMutation<{ count: number }, Error, string[]>({
    mutationFn: (ids) => adapter.bulkComplete(ids),
    onMutate: async (ids) => {
      await qc.cancelQueries({ queryKey: [adapter.queryKey] });
      const snaps = qc.getQueriesData<any>({ queryKey: [adapter.queryKey] });
      qc.setQueriesData<any>({ queryKey: [adapter.queryKey] }, (old: any) => {
        if (!old?.data) return old;
        return { ...old, data: old.data.filter((a: { id: string }) => !ids.includes(a.id)) };
      });
      return { snaps };
    },
    onError: (_e, _ids, ctx: any) => {
      if (ctx?.snaps) ctx.snaps.forEach(([key, val]: [any, any]) => qc.setQueryData(key, val));
      adapter.onBulkError?.();
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: [adapter.queryKey] });
      setSelectedIds(new Set());
    },
  });

  // ─── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'j') { setFocusedIndex(i => Math.min(i + 1, filteredItems.length - 1)); return; }
      if (e.key === 'k') { setFocusedIndex(i => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter' && focusedIndex >= 0) {
        const item = filteredItems[focusedIndex];
        if (item?.entityId) onOpen(item.entityId);
        return;
      }
      if (e.key === 'c' && focusedIndex >= 0) {
        const item = filteredItems[focusedIndex];
        if (item && canEdit) setExpandedId(id => id === item.id ? null : item.id);
        return;
      }
      if (e.key === 'e' && canEdit && (!adapter.editNeedsFocus || focusedIndex >= 0)) {
        setTemplateInit(null);
        setShowModal(true);
        return;
      }
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); return; }
      if (e.key === 'a' && !e.metaKey && !e.ctrlKey && canEdit) {
        setSelectedIds(new Set(filteredItems.filter(adapter.isSelectable).map(i => i.id)));
        return;
      }
      if (e.key === 'Escape') {
        // Host edit modal / delete confirm handle their own Escape.
        if (suspendKeys) return;
        setShowShortcuts(false);
        setShowUnlockSettings(false);
        setExpandedId(null);
        setSelectedIds(new Set());
        onEscape?.();
        return;
      }
      if (e.key === '?') { setShowShortcuts(v => !v); return; }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [filteredItems, focusedIndex, canEdit, onOpen, onEscape, suspendKeys, adapter]);

  // Close template menu on outside click
  useEffect(() => {
    if (!showTemplateMenu) return;
    const handler = (e: MouseEvent) => {
      if (templateMenuRef.current && !templateMenuRef.current.contains(e.target as Node)) {
        setShowTemplateMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showTemplateMenu]);

  function handleCheck(id: string, shiftKey: boolean) {
    const idx = filteredItems.findIndex(i => i.id === id);
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (shiftKey && lastSelectedIndex.current >= 0) {
        const lo = Math.min(idx, lastSelectedIndex.current);
        const hi = Math.max(idx, lastSelectedIndex.current);
        for (let i = lo; i <= hi; i++) if (adapter.isSelectable(filteredItems[i])) next.add(filteredItems[i].id);
      } else {
        next.has(id) ? next.delete(id) : next.add(id);
      }
      return next;
    });
    lastSelectedIndex.current = idx;
  }

  const empty = adapter.emptyStates[filter];
  const stickyId = fullPage ? 'sticky-toggle' : 'doc-sticky-toggle';

  const body = (
    <>
      {/* Header + tabs — always rendered first; sticky when pref is ON */}
      <div style={fullPage ? {
        padding: '24px 32px 16px',
        background: 'var(--bg-app)',
        ...(stickyHeader ? { position: 'sticky', top: -32, zIndex: 10 } : {}),
      } : {
        // ponytail: -32 / paddingTop 32 clears AppLayout <main>'s 32px padding so a
        // scrolled row can't peek in the gap above the pinned header (same as fullPage top:-32).
        ...(stickyHeader ? { position: 'sticky', top: -32, zIndex: 10, background: 'var(--bg-app)', paddingTop: 32 } : {}),
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: fullPage ? 20 : 16 }}>
          <div>
            {/* Heading only on the standalone full page; when embedded in a dept
               page the toggle + page title already label it, so just show the count. */}
            {fullPage && <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>{adapter.heading}</h1>}
            <span data-testid="activities-count" style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: fullPage ? 2 : 0, display: 'block' }}>{total} activities</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search… (/)"
              style={{ padding: '6px 12px', border: '1px solid var(--border-medium)', borderRadius: 8, fontSize: 13, background: 'var(--bg-app)', color: 'var(--text-primary)', outline: 'none', width: 180 }}
            />
            <button type="button" onClick={() => setShowShortcuts(v => !v)} className="btn btn-secondary" style={{ fontSize: 13, padding: '5px 10px' }} title="Keyboard shortcuts (?)">
              <Keyboard size={14} />
            </button>

            {/* Unlock settings button */}
            <div style={{ position: 'relative' }} ref={unlockSettingsRef}>
              <button
                type="button"
                onClick={() => setShowUnlockSettings(v => !v)}
                className="btn btn-secondary"
                style={{ fontSize: 13, padding: '5px 10px', position: 'relative' }}
                title={`${cap(noun)} unlock settings`}
              >
                <Settings size={14} />
                {unlockSettings.enabled && (
                  <span style={{
                    position: 'absolute', top: -4, right: -4,
                    width: 8, height: 8, borderRadius: '50%',
                    background: '#0f172a', border: '1.5px solid var(--bg-app)',
                  }} />
                )}
              </button>
              {showUnlockSettings && (
                <UnlockSettingsPopover
                  noun={noun}
                  settings={unlockSettings}
                  onChange={s => setUnlockSettings(s)}
                  onClose={() => setShowUnlockSettings(false)}
                />
              )}
            </div>

            {/* Template split button */}
            {canEdit && (
              <div style={{ position: 'relative' }} ref={templateMenuRef}>
                <div style={{ display: 'flex', gap: 1 }}>
                  <button type="button" onClick={() => { setTemplateInit(null); setShowModal(true); }} className="btn btn-primary" style={{ fontSize: 13, gap: 6, borderRadius: '8px 0 0 8px' }}>
                    <Plus size={15} /> Schedule
                  </button>
                  <button type="button" onClick={() => setShowTemplateMenu(v => !v)} className="btn btn-primary" style={{ padding: '0 8px', borderRadius: '0 8px 8px 0', borderLeft: '1px solid rgba(255,255,255,.2)' }}>
                    <ChevronDown size={13} />
                  </button>
                </div>
                {showTemplateMenu && (
                  <ul style={{ position: 'absolute', top: '100%', right: 0, zIndex: 100, background: 'var(--bg-app)', border: '1px solid var(--border-medium)', borderRadius: 8, marginTop: 4, padding: 4, listStyle: 'none', minWidth: 180, boxShadow: '0 4px 16px rgba(0,0,0,.12)' }}>
                    {adapter.templates.map(t => (
                      <li key={t.label} onClick={() => { setTemplateInit(t); setShowModal(true); setShowTemplateMenu(false); }}
                        style={{ padding: '8px 12px', fontSize: 13, cursor: 'pointer', borderRadius: 6, color: 'var(--text-primary)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-muted)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        {t.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Filter pills + sticky toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: fullPage ? 0 : 'var(--space-4)', alignItems: 'center' }}>
          {adapter.filters.map(f => (
            <button key={f.key} type="button" onClick={() => { setFilter(f.key); setFocusedIndex(-1); }}
              className={`btn ${filter === f.key ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: 13, padding: '5px 14px' }}>
              {f.label}
            </button>
          ))}
          {unlockSettings.enabled && (
            <span style={{ alignSelf: 'center', fontSize: 12, color: 'var(--text-tertiary)', marginLeft: 4 }}>
              <Lock size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />
              {unlockSettings.count} {noun}{unlockSettings.count !== 1 ? 's' : ''} unlocked
            </span>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <label htmlFor={stickyId} style={{ fontSize: 12, color: 'var(--text-tertiary)', cursor: 'pointer', userSelect: 'none' }}>
              Sticky
            </label>
            <button
              id={stickyId}
              type="button"
              role="switch"
              aria-checked={stickyHeader}
              onClick={toggleStickyHeader}
              style={{
                position: 'relative', width: 32, height: 18, borderRadius: 999,
                border: 'none', cursor: 'pointer', flexShrink: 0,
                background: stickyHeader ? 'var(--text-primary, #0f172a)' : 'var(--border-medium, #cbd5e1)',
                transition: 'background 0.15s',
              }}
            >
              <span style={{
                position: 'absolute', top: 2, left: stickyHeader ? 16 : 2,
                width: 14, height: 14, borderRadius: '50%', background: '#fff',
                transition: 'left 0.15s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
              }} />
            </button>
          </div>
        </div>
      </div>

      {/* Content region — min-height prevents layout shift between populated/empty */}
      <div style={fullPage ? { padding: '0 32px 24px', minHeight: 'calc(100vh - 160px)' } : undefined}>
        {/* Activity list */}
        {isLoading ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 14 }}>Loading…</div>
        ) : isError && adapter.loadErrorMsg ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 14 }}>{adapter.loadErrorMsg}</div>
        ) : filteredItems.length === 0 ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-tertiary)' }}>
            <div style={{ marginBottom: 12, opacity: 0.4 }}>{empty?.icon}</div>
            <p style={{ margin: 0, fontSize: 14 }}>{empty?.msg}</p>
          </div>
        ) : (
          <div>
            {filteredItems.map((item, i) => {
              const locked = unlockedEntityIds !== null && !!item.entityId && !unlockedEntityIds.has(item.entityId);
              return (
                <ActivityRow
                  key={item.id}
                  vm={item}
                  adapter={adapter}
                  focused={focusedIndex === i}
                  checked={selectedIds.has(item.id)}
                  expanded={expandedId === item.id}
                  locked={locked}
                  canEdit={canEdit}
                  onOpen={onOpen}
                  onExpand={setExpandedId}
                  onCheck={handleCheck}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 50, background: 'var(--bg-app)', border: '1px solid var(--border-medium)', borderRadius: 12, padding: '10px 16px', display: 'flex', gap: 10, alignItems: 'center', boxShadow: '0 8px 32px rgba(0,0,0,.18)', whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{selectedIds.size} selected</span>
          <button type="button" onClick={() => bulkMut.mutate([...selectedIds])} disabled={bulkMut.isPending} className="btn btn-primary" style={{ fontSize: 13 }}>
            {bulkMut.isPending ? 'Completing…' : `Mark Complete (${selectedIds.size})`}
          </button>
          <button type="button" onClick={() => setSelectedIds(new Set())} className="btn btn-secondary" style={{ fontSize: 13 }}>
            <X size={13} />
          </button>
        </div>
      )}

      {/* Modals */}
      {showModal && <ScheduleModal adapter={adapter} onClose={() => { setShowModal(false); setTemplateInit(null); }} initialValues={templateInit} />}
      {showShortcuts && <ShortcutsModal shortcuts={adapter.keyboardShortcuts} onClose={() => setShowShortcuts(false)} />}
    </>
  );

  return fullPage
    ? <div style={{ minHeight: '100vh', background: 'var(--bg-app)', color: 'var(--text-primary)' }}>{body}</div>
    : <div>{body}</div>;
}
