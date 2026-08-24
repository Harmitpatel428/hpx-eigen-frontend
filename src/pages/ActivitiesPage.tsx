import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Check, Clock, Plus, X, ChevronDown, MapPin, User, Keyboard, Lock, Settings } from 'lucide-react';
import { leadActivityService, GlobalFilter, LeadActivityItem } from '../services/lead-activity.service';
import { leadService } from '../services/lead.service';
import { toast } from 'sonner';
import { ContextPanel } from '../components/layout/ContextPanel';
import { LeadDetailPanel } from '../components/leads/LeadDetailPanel';
import { LeadModal } from '../components/leads/LeadModal';
import { DeleteConfirm } from '../components/leads/DeleteConfirm';
import type { Lead } from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const FILTERS: { key: GlobalFilter; label: string }[] = [
  { key: 'DUE_TODAY', label: 'Due Today'     },
  { key: 'UPCOMING',  label: 'Upcoming'      },
  { key: 'OVERDUE',   label: 'Overdue'       },
  { key: 'MINE',      label: 'My Activities' },
];

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

const LAST_LOCATION_KEY = 'last_activity_location';
const SAVED_LOCATIONS_KEY = 'hpx-activity-locations';
const MAX_SAVED_LOCATIONS = 8;
const UNLOCK_SETTINGS_KEY = 'hpx-activities-unlock';
const ACTIVITY_TAB_KEY = 'hpx-activities-tab';

// Default landing tab is Due Today; a deliberately chosen tab survives reloads.
// Saved values are validated against current FILTERS so renamed/removed tabs
// fall back to the default instead of breaking the page.
function getInitialFilter(): GlobalFilter {
  try {
    const saved = localStorage.getItem(ACTIVITY_TAB_KEY) as GlobalFilter | null;
    if (saved && FILTERS.some(f => f.key === saved)) return saved;
  } catch { /* storage unavailable */ }
  return 'DUE_TODAY';
}

interface UnlockSettings { enabled: boolean; count: number; }

function getUnlockSettings(): UnlockSettings {
  try { return JSON.parse(localStorage.getItem(UNLOCK_SETTINGS_KEY) ?? '{"enabled":false,"count":5}'); }
  catch { return { enabled: false, count: 5 }; }
}

function getLastLocation(): string {
  return localStorage.getItem(LAST_LOCATION_KEY) || 'Phone';
}
function getSavedLocations(): string[] {
  try { return JSON.parse(localStorage.getItem(SAVED_LOCATIONS_KEY) ?? '[]'); } catch { return []; }
}
function persistLocation(loc: string) {
  localStorage.setItem(LAST_LOCATION_KEY, loc);
  const prev = getSavedLocations().filter(l => l !== loc);
  localStorage.setItem(SAVED_LOCATIONS_KEY, JSON.stringify([loc, ...prev].slice(0, MAX_SAVED_LOCATIONS)));
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

const ACTIVITY_TEMPLATES = [
  { label: 'Follow-up Call',  type: 'FOLLOW_UP_SCHEDULED', duration: 'M30', location: 'Phone',   subject: 'Follow-up call'   },
  { label: 'Demo Meeting',    type: 'MEETING_SCHEDULED',   duration: 'H1',  location: 'Virtual', subject: 'Product demo'     },
  { label: 'Send Proposal',   type: 'OTHER',               duration: null,  location: '',        subject: 'Send proposal'    },
  { label: 'Contract Review', type: 'MEETING_SCHEDULED',   duration: 'M45', location: '',        subject: 'Contract review'  },
] as const;

type Template = typeof ACTIVITY_TEMPLATES[number];

const KEYBOARD_SHORTCUTS = [
  { key: 'j / k',   action: 'Navigate down / up' },
  { key: 'Enter',   action: 'Open lead panel for focused activity' },
  { key: 'c',       action: 'Quick complete focused activity' },
  { key: 'e',       action: 'Edit / reschedule focused activity' },
  { key: '/',       action: 'Focus search bar' },
  { key: 'a',       action: 'Select all visible activities' },
  { key: 'Escape',  action: 'Close panel / deselect' },
  { key: '?',       action: 'Toggle this shortcuts modal' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function activityIcon(type: string) {
  switch (type) {
    case 'MEETING_SCHEDULED':     return <Calendar size={14} />;
    case 'FOLLOW_UP_SCHEDULED':   return <Clock size={14} />;
    case 'CALL_NOT_RECEIVED_EVENT': return <User size={14} />;
    default: return <Clock size={14} />;
  }
}

function formatScheduled(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const dDay = new Date(d); dDay.setHours(0, 0, 0, 0);
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (dDay.getTime() === today.getTime())    return `Today ${time}`;
  if (dDay.getTime() === tomorrow.getTime()) return `Tomorrow ${time}`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + time;
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
  if (choice === 'tomorrow') {
    d.setDate(d.getDate() + 1);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  } else {
    d.setDate(d.getDate() + 7);
  }
  d.setHours(10, 0, 0, 0);
  return d.toISOString();
}

// ─── Lead Combobox ────────────────────────────────────────────────────────────

interface LeadOption { id: string; firstName: string; lastName: string; }

function LeadCombobox({ value, onChange }: { value: LeadOption | null; onChange: (v: LeadOption | null) => void }) {
  const [query, setQuery]     = useState('');
  const [open, setOpen]       = useState(false);
  const [results, setResults] = useState<LeadOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor]   = useState(-1);
  const abortRef              = useRef<AbortController | null>(null);
  const timerRef              = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((q: string) => {
    if (abortRef.current) abortRef.current.abort();
    if (!q.trim()) { setResults([]); setLoading(false); return; }
    abortRef.current = new AbortController();
    setLoading(true);
    leadService.findAll({ search: q, pageSize: 10, page: 1 })
      .then(res => { setResults(res.data ?? []); setLoading(false); setCursor(-1); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(query), 250);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query, search]);

  function select(lead: LeadOption) { onChange(lead); setOpen(false); setQuery(''); setResults([]); }
  function clear() { onChange(null); setQuery(''); }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { setOpen(false); return; }
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    if (e.key === 'Enter' && cursor >= 0) { e.preventDefault(); select(results[cursor]); }
  }

  if (value) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', border: '1px solid var(--border-medium)', borderRadius: 8, background: 'var(--bg-muted)' }}>
      <User size={13} style={{ color: 'var(--text-tertiary)' }} />
      <span style={{ fontSize: 13, color: 'var(--text-primary)', flex: 1 }}>{value.firstName} {value.lastName}</span>
      <button type="button" onClick={clear} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-tertiary)', display: 'flex' }}><X size={13} /></button>
    </div>
  );

  return (
    <div style={{ position: 'relative' }} role="combobox" aria-expanded={open} aria-haspopup="listbox">
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKey}
        placeholder="Search leads…"
        aria-label="Search leads"
        aria-autocomplete="list"
        style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--border-medium)', borderRadius: 8, fontSize: 13, background: 'var(--bg-app)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
      />
      {open && (loading || results.length > 0) && (
        <ul role="listbox" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'var(--bg-app)', border: '1px solid var(--border-medium)', borderRadius: 8, marginTop: 4, padding: 4, maxHeight: 200, overflowY: 'auto', listStyle: 'none', boxShadow: '0 4px 16px rgba(0,0,0,.1)' }}>
          {loading && <li style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text-tertiary)' }}>Searching…</li>}
          {results.map((lead, i) => (
            <li key={lead.id} role="option" aria-selected={i === cursor} onMouseDown={() => select(lead)}
              style={{ padding: '7px 10px', fontSize: 13, borderRadius: 6, cursor: 'pointer', background: i === cursor ? 'var(--bg-muted)' : 'transparent', color: 'var(--text-primary)' }}>
              {lead.firstName} {lead.lastName}
            </li>
          ))}
          {!loading && results.length === 0 && query.trim() && (
            <li style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text-tertiary)' }}>No leads found</li>
          )}
        </ul>
      )}
    </div>
  );
}

// ─── Location Combobox ────────────────────────────────────────────────────────

function LocationCombobox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen]   = useState(false);
  const [input, setInput] = useState(value);
  const suggestions = getSavedLocations().filter(l => l.toLowerCase().includes(input.toLowerCase()));

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

interface QuickCompleteProps { item: LeadActivityItem; onClose: () => void; }

function QuickCompleteForm({ item, onClose }: QuickCompleteProps) {
  const qc = useQueryClient();
  const [note, setNote]           = useState('');
  const [followUp, setFollowUp]   = useState<'none' | 'tomorrow' | 'next-week' | 'custom'>('none');
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('10:00');

  const mut = useMutation<LeadActivityItem, Error, { note?: string; nextFollowUp?: string }>({
    mutationFn: (opts) => leadActivityService.markComplete(item.id, opts),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['lead-activities'] });
      const snaps = qc.getQueriesData<any>({ queryKey: ['lead-activities'] });
      qc.setQueriesData<any>({ queryKey: ['lead-activities'] }, (old: any) => {
        if (!old?.data) return old;
        return { ...old, data: old.data.map((a: LeadActivityItem) => a.id === item.id ? { ...a, state: 'COMPLETED' } : a) };
      });
      return { snaps };
    },
    onError: (_e, _v, ctx: any) => {
      if (ctx?.snaps) ctx.snaps.forEach(([key, data]: [any, any]) => qc.setQueryData(key, data));
    },
    onSuccess: () => {
      // Invalidate notes so the saved note appears immediately in the lead panel
      qc.invalidateQueries({ queryKey: ['notes-summary', item.leadId] });
      qc.invalidateQueries({ queryKey: ['notes', item.leadId] });
      onClose();
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['lead-activities'] }),
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
    <div style={{ marginTop: 8, padding: '12px 14px', background: 'var(--bg-muted)', borderRadius: 8, border: '1px solid var(--border-light)' }}>
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

interface ScheduleModalProps { onClose: () => void; initialValues?: Partial<Template> | null; }

function ScheduleModal({ onClose, initialValues }: ScheduleModalProps) {
  const qc = useQueryClient();
  const defaults = defaultScheduledDate();
  const [lead, setLead]           = useState<LeadOption | null>(null);
  const [subject, setSubject]     = useState(initialValues?.subject ?? '');
  const [duration, setDuration]   = useState<string>(initialValues?.duration ?? 'M30');
  const [location, setLocation]   = useState(initialValues?.location ?? getLastLocation());
  const [date, setDate]           = useState(defaults.date);
  const [startTime, setStartTime] = useState(defaults.time);
  const [endTime, setEndTime]     = useState('');
  const [error, setError]         = useState('');

  const hideTimes   = duration === 'HALF_DAY' || duration === 'WHOLE_DAY';
  const showEndTime = duration === 'CUSTOM';

  const createMut = useMutation({
    mutationFn: () => {
      if (!lead) throw new Error('Select a lead');
      if (!subject.trim()) throw new Error('Subject is required');
      if (!hideTimes && !date) throw new Error('Date is required');
      if (!hideTimes && !startTime) throw new Error('Start time is required');
      if (showEndTime && endTime && endTime <= startTime) throw new Error('End time must be after start time');

      // Use local datetime parsing — browser treats YYYY-MM-DDTHH:mm as local time
      let scheduledAt: string | undefined;
      if (!hideTimes && date && startTime) scheduledAt = new Date(`${date}T${startTime}`).toISOString();
      else if (hideTimes && date) scheduledAt = new Date(`${date}T00:00`).toISOString();

      const mins = DURATION_MINUTES[duration];
      const meta: Record<string, unknown> = { duration };
      if (location.trim()) meta.location = location.trim();
      if (showEndTime && endTime && date) meta.endTime = new Date(`${date}T${endTime}`).toISOString();
      if (mins !== null) meta.durationMinutes = mins;

      return leadActivityService.create({
        leadId: lead.id,
        type: initialValues?.type ?? 'MEETING_SCHEDULED',
        subject: subject.trim(),
        scheduledAt,
        metadata: meta,
      });
    },
    onSuccess: () => {
      if (location.trim()) persistLocation(location.trim());
      qc.invalidateQueries({ queryKey: ['lead-activities'] });
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
            {initialValues?.label ?? 'Schedule Meeting'}
          </h2>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', padding: 4 }}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 5 }}>Lead *</label>
            <LeadCombobox value={lead} onChange={setLead} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 5 }}>Subject *</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Discovery call"
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
            <LocationCombobox value={location} onChange={setLocation} />
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

function ShortcutsModal({ onClose }: { onClose: () => void }) {
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
            {KEYBOARD_SHORTCUTS.map(({ key, action }) => (
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

interface UnlockSettingsPopoverProps {
  settings: UnlockSettings;
  onChange: (s: UnlockSettings) => void;
  onClose: () => void;
}

function UnlockSettingsPopover({ settings, onChange, onClose }: UnlockSettingsPopoverProps) {
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
        Lead Unlock Settings
      </div>

      {/* Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Limit unlocked leads</div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
            {settings.enabled ? 'Restricts workable leads to configured count' : 'All leads are workable'}
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
          aria-label={settings.enabled ? 'Disable lead limit' : 'Enable lead limit'}
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
            Number of unlocked leads (1–20)
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
            First {settings.count} lead{settings.count !== 1 ? 's' : ''} in the list are workable. Others are locked.
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Activity Row ─────────────────────────────────────────────────────────────

interface ActivityRowProps {
  item: LeadActivityItem;
  focused: boolean;
  checked: boolean;
  expanded: boolean;
  locked: boolean;
  onLeadClick: (leadId: string) => void;
  onExpand: (id: string | null) => void;
  onCheck: (id: string, shiftKey: boolean) => void;
}

function ActivityRow({ item, focused, checked, expanded, locked, onLeadClick, onExpand, onCheck }: ActivityRowProps) {
  const isOverdue = item.state === 'PENDING' && item.scheduledAt && new Date(item.scheduledAt) < new Date();
  // Pending rows show their due date; completed/cancelled history shows when it actually happened
  const rowTime = item.state === 'PENDING'
    ? formatScheduled(item.scheduledAt)
    : formatCompleted(item.completedAt ?? item.createdAt);

  const company    = item.lead?.company?.trim() || null;
  const personName = item.lead ? `${item.lead.firstName} ${item.lead.lastName}`.trim() : null;

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
            <input type="checkbox" checked onChange={() => {}} onClick={e => onCheck(item.id, e.shiftKey)} style={{ cursor: 'pointer', accentColor: 'var(--color-accent)' }} />
          ) : (
            <>
              <div className="activity-icon" style={{ width: 28, height: 28, borderRadius: '50%', background: isOverdue ? 'rgba(239,68,68,.12)' : 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isOverdue ? '#ef4444' : 'var(--text-tertiary)' }}>
                {activityIcon(item.type)}
              </div>
              <input type="checkbox" className="activity-check-input" checked={false} onChange={() => {}} onClick={e => onCheck(item.id, e.shiftKey)} style={{ display: 'none', cursor: 'pointer', accentColor: 'var(--color-accent)' }} />
            </>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title row + right meta */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.subject}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {/* by {actor} · {timestamp} */}
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                {item.actor && <>{`by ${item.actor.firstName} ${item.actor.lastName}`}{' · '}</>}
                <span style={{ color: isOverdue ? '#ef4444' : 'var(--text-tertiary)' }}>{rowTime}</span>
              </span>
              {!locked && item.state === 'PENDING' && (
                <button type="button" onClick={() => onExpand(expanded ? null : item.id)} title="Quick complete"
                  style={{ width: 26, height: 26, borderRadius: '50%', border: '1.5px solid var(--border-medium)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', flexShrink: 0 }}>
                  <Check size={13} />
                </button>
              )}
              {item.state === 'COMPLETED' && (
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
                  <Check size={13} />
                </div>
              )}
            </div>
          </div>

          {/* Identity line: [avatar] Company · Person */}
          {item.lead && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, minWidth: 0, overflow: 'hidden' }}>
              {!company && !personName ? (
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', cursor: 'default' }}>Unnamed lead</span>
              ) : (
                <>
                  <button
                    type="button"
                    className="activity-lead-btn"
                    onClick={() => !locked && onLeadClick(item.leadId)}
                    disabled={locked}
                    aria-label={`Open lead: ${company || personName}`}
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
                </>
              )}
            </div>
          )}

          {/* Location metadata */}
          {item.metadata && typeof item.metadata.location === 'string' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
              <MapPin size={11} style={{ color: 'var(--text-tertiary)' }} />
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{item.metadata.location}</span>
            </div>
          )}
        </div>
      </div>

      {expanded && !locked && item.state === 'PENDING' && (
        <QuickCompleteForm item={item} onClose={() => onExpand(null)} />
      )}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

const EMPTY: Record<GlobalFilter, { icon: React.ReactNode; msg: string }> = {
  DUE_TODAY: { icon: <Clock size={32} />,    msg: "Nothing due today — you're all caught up!"              },
  UPCOMING:  { icon: <Calendar size={32} />, msg: 'No upcoming activities scheduled.'                      },
  OVERDUE:   { icon: <Clock size={32} />,    msg: 'No overdue activities — great work!'                    },
  MINE:      { icon: <User size={32} />,     msg: 'No activities assigned to you.'                         },
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ActivitiesPage() {
  const qc = useQueryClient();
  const [filter, setFilterState]        = useState<GlobalFilter>(getInitialFilter);

  // Persist the chosen tab so refresh/reopen restores it (validated on read).
  const setFilter = useCallback((f: GlobalFilter) => {
    setFilterState(f);
    try { localStorage.setItem(ACTIVITY_TAB_KEY, f); } catch { /* storage unavailable */ }
  }, []);
  const [showModal, setShowModal]       = useState(false);
  const [templateInit, setTemplateInit] = useState<Partial<Template> | null>(null);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [selectedLeadId, setSelectedLeadId]     = useState<string | null>(null);
  // Lead edit modal + delete confirm opened from the detail panel — same
  // components LeadsPage uses, so saving goes through the existing update path.
  const [editModal, setEditModal]               = useState<{ mode: 'create' | 'edit'; lead?: Lead } | null>(null);
  const [deleteTarget, setDeleteTarget]         = useState<Lead | null>(null);
  const [expandedId, setExpandedId]     = useState<string | null>(null);
  const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showUnlockSettings, setShowUnlockSettings] = useState(false);
  const [unlockSettings, setUnlockSettings] = useState<UnlockSettings>(getUnlockSettings);
  const [search, setSearch]             = useState('');
  const searchRef                       = useRef<HTMLInputElement>(null);
  const lastSelectedIndex               = useRef<number>(-1);
  const templateMenuRef                 = useRef<HTMLDivElement>(null);
  const unlockSettingsRef               = useRef<HTMLDivElement>(null);

  // Persist unlock settings to localStorage
  useEffect(() => {
    localStorage.setItem(UNLOCK_SETTINGS_KEY, JSON.stringify(unlockSettings));
  }, [unlockSettings]);

  // staleTime: 0 ensures deleted leads are cleared immediately on re-visit
  const { data, isLoading } = useQuery({
    queryKey: ['lead-activities', filter],
    queryFn: () => leadActivityService.findAll(filter),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: selectedLead } = useQuery({
    queryKey: ['lead', selectedLeadId],
    queryFn: () => leadService.findById(selectedLeadId!),
    enabled: !!selectedLeadId,
  });

  const items = data?.data ?? [];
  const total = data?.total ?? 0;

  const filteredItems = search.trim()
    ? items.filter(a =>
        a.subject.toLowerCase().includes(search.toLowerCase()) ||
        (a.lead && `${a.lead.firstName} ${a.lead.lastName}`.toLowerCase().includes(search.toLowerCase())) ||
        (a.lead?.company && a.lead.company.toLowerCase().includes(search.toLowerCase()))
      )
    : items;

  // Compute unlocked lead IDs for the current filtered list.
  // Tracks unique leadIds in list order; first N are unlocked.
  const unlockedLeadIds = useMemo<Set<string> | null>(() => {
    if (!unlockSettings.enabled) return null; // null = all unlocked
    const ids = new Set<string>();
    for (const item of filteredItems) {
      if (!item.leadId) continue;
      if (ids.size >= unlockSettings.count) break;
      ids.add(item.leadId);
    }
    return ids;
  }, [filteredItems, unlockSettings]);

  // ─── Bulk complete ───────────────────────────────────────────────────────────
  const bulkMut = useMutation<{ count: number }, Error, string[]>({
    mutationFn: (ids) => leadActivityService.bulkComplete(ids),
    onMutate: async (ids) => {
      await qc.cancelQueries({ queryKey: ['lead-activities'] });
      const snaps = qc.getQueriesData<any>({ queryKey: ['lead-activities'] });
      qc.setQueriesData<any>({ queryKey: ['lead-activities'] }, (old: any) => {
        if (!old?.data) return old;
        return { ...old, data: old.data.filter((a: LeadActivityItem) => !ids.includes(a.id)) };
      });
      return { snaps };
    },
    onError: (_e, _ids, ctx: any) => {
      if (ctx?.snaps) ctx.snaps.forEach(([key, val]: [any, any]) => qc.setQueryData(key, val));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['lead-activities'] });
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
        if (item?.leadId) setSelectedLeadId(item.leadId);
        return;
      }
      if (e.key === 'c' && focusedIndex >= 0) {
        const item = filteredItems[focusedIndex];
        if (item) setExpandedId(id => id === item.id ? null : item.id);
        return;
      }
      if (e.key === 'e' && focusedIndex >= 0) {
        setTemplateInit(null);
        setShowModal(true);
        return;
      }
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); return; }
      if (e.key === 'a' && !e.metaKey && !e.ctrlKey) {
        setSelectedIds(new Set(filteredItems.map(i => i.id)));
        return;
      }
      if (e.key === 'Escape') {
        // Edit modal / delete confirm handle their own Escape; never yank the
        // panel out from under them.
        if (editModal || deleteTarget) return;
        setSelectedLeadId(null);
        setShowShortcuts(false);
        setShowUnlockSettings(false);
        setExpandedId(null);
        setSelectedIds(new Set());
        return;
      }
      if (e.key === '?') { setShowShortcuts(v => !v); return; }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [filteredItems, focusedIndex, editModal, deleteTarget]);

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

  function handleLeadPanelClose() {
    setSelectedLeadId(null);
    qc.invalidateQueries({ queryKey: ['lead-activities'] });
    qc.invalidateQueries({ queryKey: ['leads'] });
    qc.invalidateQueries({ queryKey: ['lead-stage-counts'] });
  }

  // Single-lead soft delete from the panel — mirrors LeadsPage.deleteMutation
  const deleteMut = useMutation({
    mutationFn: (id: string) => leadService.softDelete(id),
    onSuccess: () => {
      handleLeadPanelClose();
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['lead-activities'] });
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['lead-stage-counts'] });
      toast.success('Lead moved to Recycle Bin');
    },
    onError: (err: any) => {
      // Keep the confirm open — the lead was not deleted
      toast.error(err?.response?.data?.error?.message ?? 'Failed to delete lead.');
    },
  });

  function handleCheck(id: string, shiftKey: boolean) {
    const idx = filteredItems.findIndex(i => i.id === id);
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (shiftKey && lastSelectedIndex.current >= 0) {
        const lo = Math.min(idx, lastSelectedIndex.current);
        const hi = Math.max(idx, lastSelectedIndex.current);
        for (let i = lo; i <= hi; i++) next.add(filteredItems[i].id);
      } else {
        next.has(id) ? next.delete(id) : next.add(id);
      }
      return next;
    });
    lastSelectedIndex.current = idx;
  }

  return (
    <div style={{ padding: '24px 32px', minHeight: '100vh', background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>Activities</h1>
          {total > 0 && <span style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2, display: 'block' }}>{total} activities</span>}
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
              title="Lead unlock settings"
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
                settings={unlockSettings}
                onChange={s => setUnlockSettings(s)}
                onClose={() => setShowUnlockSettings(false)}
              />
            )}
          </div>

          {/* Template split button */}
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
                {ACTIVITY_TEMPLATES.map(t => (
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
        </div>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {FILTERS.map(f => (
          <button key={f.key} type="button" onClick={() => { setFilter(f.key); setFocusedIndex(-1); }}
            className={`btn ${filter === f.key ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: 13, padding: '5px 14px' }}>
            {f.label}
          </button>
        ))}
        {unlockSettings.enabled && (
          <span style={{ alignSelf: 'center', fontSize: 12, color: 'var(--text-tertiary)', marginLeft: 4 }}>
            <Lock size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />
            {unlockSettings.count} lead{unlockSettings.count !== 1 ? 's' : ''} unlocked
          </span>
        )}
      </div>

      {/* Activity list */}
      {isLoading ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 14 }}>Loading…</div>
      ) : filteredItems.length === 0 ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-tertiary)' }}>
          <div style={{ marginBottom: 12, opacity: 0.4 }}>{EMPTY[filter].icon}</div>
          <p style={{ margin: 0, fontSize: 14 }}>{EMPTY[filter].msg}</p>
        </div>
      ) : (
        <div>
          {filteredItems.map((item, i) => {
            const locked = unlockedLeadIds !== null && !unlockedLeadIds.has(item.leadId);
            return (
              <ActivityRow
                key={item.id}
                item={item}
                focused={focusedIndex === i}
                checked={selectedIds.has(item.id)}
                expanded={expandedId === item.id}
                locked={locked}
                onLeadClick={setSelectedLeadId}
                onExpand={setExpandedId}
                onCheck={handleCheck}
              />
            );
          })}
        </div>
      )}

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
      {showModal && <ScheduleModal onClose={() => { setShowModal(false); setTemplateInit(null); }} initialValues={templateInit} />}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}

      {/* Lead Detail Panel — always opens company-first for Activities context.
          Inert while the edit modal / delete confirm is stacked above it. */}
      <ContextPanel
        isOpen={!!selectedLeadId && !!selectedLead}
        onClose={() => { if (!editModal && !deleteTarget) handleLeadPanelClose(); }}
        width={480}
      >
        {selectedLead && (
          <LeadDetailPanel
            lead={selectedLead}
            onEdit={() => setEditModal({ mode: 'edit', lead: selectedLead })}
            onDelete={() => setDeleteTarget(selectedLead)}
            onUpdated={(u) => qc.setQueryData(['lead', u.id], u)}
            onClose={handleLeadPanelClose}
            displayOverride="company"
          />
        )}
      </ContextPanel>

      {/* LEAD EDIT MODAL — same component/flow as Sales Dashboard */}
      {editModal && selectedLead && (
        <LeadModal
          mode="edit"
          lead={editModal.lead ?? selectedLead}
          onClose={() => setEditModal(null)}
          onSuccess={(updated) => {
            // Persist through the existing mutation happened inside LeadModal;
            // refresh every surface this page touches, then return to the panel.
            qc.invalidateQueries({ queryKey: ['lead-activities'] });
            qc.invalidateQueries({ queryKey: ['leads'] });
            qc.invalidateQueries({ queryKey: ['lead-stage-counts'] });
            if (updated) qc.setQueryData(['lead', updated.id], updated);
            setEditModal(null);
          }}
        />
      )}

      {/* DELETE CONFIRM — shared with LeadsPage */}
      {deleteTarget && selectedLead && (
        <DeleteConfirm
          lead={deleteTarget}
          onConfirm={() => {
            deleteMut.mutate(deleteTarget.id);
          }}
          onCancel={() => setDeleteTarget(null)}
          isDeleting={deleteMut.isPending}
        />
      )}
    </div>
  );
}
