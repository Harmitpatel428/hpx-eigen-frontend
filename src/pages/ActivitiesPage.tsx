import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Check, Clock, Plus, X, ChevronDown, MapPin, User } from 'lucide-react';
import { leadActivityService, GlobalFilter, LeadActivityItem } from '../services/lead-activity.service';
import { leadService } from '../services/lead.service';
import { useAuth } from '../auth/context/AuthContext';

// ─── Constants ────────────────────────────────────────────────────────────────

const FILTERS: { key: GlobalFilter; label: string }[] = [
  { key: 'ALL',      label: 'All'          },
  { key: 'DUE_TODAY', label: 'Due Today'   },
  { key: 'UPCOMING', label: 'Upcoming'     },
  { key: 'OVERDUE',  label: 'Overdue'      },
  { key: 'MINE',     label: 'My Activities'},
];

const DURATION_OPTIONS = [
  { value: 'M15',      label: '15 min'   },
  { value: 'M30',      label: '30 min'   },
  { value: 'M45',      label: '45 min'   },
  { value: 'H1',       label: '1 hour'   },
  { value: 'H2',       label: '2 hours'  },
  { value: 'HALF_DAY', label: 'Half Day' },
  { value: 'WHOLE_DAY', label: 'Whole Day' },
  { value: 'CUSTOM',   label: 'Custom'   },
];

const DURATION_MINUTES: Record<string, number | null> = {
  M15: 15, M30: 30, M45: 45, H1: 60, H2: 120,
  HALF_DAY: null, WHOLE_DAY: null, CUSTOM: null,
};

const LOCATIONS_KEY = 'hpx-activity-locations';
const MAX_SAVED_LOCATIONS = 8;

function getSavedLocations(): string[] {
  try { return JSON.parse(localStorage.getItem(LOCATIONS_KEY) ?? '[]'); } catch { return []; }
}
function saveLocation(loc: string) {
  const prev = getSavedLocations().filter(l => l !== loc);
  localStorage.setItem(LOCATIONS_KEY, JSON.stringify([loc, ...prev].slice(0, MAX_SAVED_LOCATIONS)));
}

function activityIcon(type: string) {
  switch (type) {
    case 'MEETING_SCHEDULED': return <Calendar size={14} />;
    case 'CALL_NOT_RECEIVED_EVENT': return <User size={14} />;
    case 'FOLLOW_UP_SCHEDULED': return <Clock size={14} />;
    default: return <Clock size={14} />;
  }
}

function formatScheduled(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const dDay = new Date(d); dDay.setHours(0,0,0,0);
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (dDay.getTime() === today.getTime())    return `Today ${time}`;
  if (dDay.getTime() === tomorrow.getTime()) return `Tomorrow ${time}`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + time;
}

// ─── Lead Search Combobox ─────────────────────────────────────────────────────

interface LeadOption { id: string; firstName: string; lastName: string; }

function LeadCombobox({
  value, onChange,
}: {
  value: LeadOption | null;
  onChange: (lead: LeadOption | null) => void;
}) {
  const [query, setQuery]           = useState('');
  const [open, setOpen]             = useState(false);
  const [results, setResults]       = useState<LeadOption[]>([]);
  const [loading, setLoading]       = useState(false);
  const [cursor, setCursor]         = useState(-1);
  const abortRef                    = useRef<AbortController | null>(null);
  const timerRef                    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef                    = useRef<HTMLInputElement>(null);
  const listRef                     = useRef<HTMLUListElement>(null);

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

  function select(lead: LeadOption) {
    onChange(lead);
    setOpen(false);
    setQuery('');
    setResults([]);
  }

  function clear() { onChange(null); setQuery(''); }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { setOpen(false); return; }
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    if (e.key === 'Enter' && cursor >= 0) { e.preventDefault(); select(results[cursor]); }
  }

  if (value) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', border: '1px solid var(--border-medium)', borderRadius: 8, background: 'var(--bg-muted)' }}>
        <User size={13} style={{ color: 'var(--text-tertiary)' }} />
        <span style={{ fontSize: 13, color: 'var(--text-primary)', flex: 1 }}>
          {value.firstName} {value.lastName}
        </span>
        <button type="button" onClick={clear} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-tertiary)', display: 'flex' }}>
          <X size={13} />
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }} role="combobox" aria-expanded={open} aria-haspopup="listbox">
      <input
        ref={inputRef}
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKey}
        placeholder="Search leads…"
        aria-label="Search leads"
        aria-autocomplete="list"
        aria-controls="lead-listbox"
        style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--border-medium)', borderRadius: 8, fontSize: 13, background: 'var(--bg-app)', color: 'var(--text-primary)', outline: 'none' }}
      />
      {open && (loading || results.length > 0) && (
        <ul
          id="lead-listbox"
          ref={listRef}
          role="listbox"
          style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'var(--bg-app)', border: '1px solid var(--border-medium)', borderRadius: 8, marginTop: 4, padding: 4, maxHeight: 200, overflowY: 'auto', listStyle: 'none', boxShadow: '0 4px 16px rgba(0,0,0,.1)' }}
        >
          {loading && <li style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text-tertiary)' }}>Searching…</li>}
          {results.map((lead, i) => (
            <li
              key={lead.id}
              role="option"
              aria-selected={i === cursor}
              onMouseDown={() => select(lead)}
              style={{ padding: '7px 10px', fontSize: 13, borderRadius: 6, cursor: 'pointer', background: i === cursor ? 'var(--bg-muted)' : 'transparent', color: 'var(--text-primary)' }}
            >
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
  const suggestions       = getSavedLocations().filter(l => l.toLowerCase().includes(input.toLowerCase()));

  function pick(loc: string) { setInput(loc); onChange(loc); setOpen(false); }
  function commit(loc: string) { if (loc.trim()) { saveLocation(loc.trim()); onChange(loc.trim()); } setOpen(false); }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', border: '1px solid var(--border-medium)', borderRadius: 8, background: 'var(--bg-app)' }}>
        <MapPin size={13} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
        <input
          value={input}
          onChange={e => { setInput(e.target.value); onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => { commit(input); setOpen(false); }, 150)}
          placeholder="Add location (optional)"
          style={{ border: 'none', outline: 'none', flex: 1, fontSize: 13, background: 'transparent', color: 'var(--text-primary)' }}
        />
        {input && <button type="button" onClick={() => { setInput(''); onChange(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-tertiary)', display: 'flex' }}><X size={13} /></button>}
      </div>
      {open && suggestions.length > 0 && (
        <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'var(--bg-app)', border: '1px solid var(--border-medium)', borderRadius: 8, marginTop: 4, padding: 4, listStyle: 'none', boxShadow: '0 4px 16px rgba(0,0,0,.1)' }}>
          {suggestions.map(loc => (
            <li key={loc} onMouseDown={() => pick(loc)} style={{ padding: '7px 10px', fontSize: 13, cursor: 'pointer', borderRadius: 6, color: 'var(--text-primary)' }}>
              {loc}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Schedule Modal ───────────────────────────────────────────────────────────

interface ScheduleModalProps { onClose: () => void; }

function ScheduleModal({ onClose }: ScheduleModalProps) {
  const qc = useQueryClient();
  const [lead, setLead]           = useState<LeadOption | null>(null);
  const [subject, setSubject]     = useState('');
  const [duration, setDuration]   = useState('M30');
  const [location, setLocation]   = useState('');
  const [date, setDate]           = useState('');
  const [startTime, setStartTime] = useState('');
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

      let scheduledAt: string | undefined;
      if (!hideTimes && date && startTime) {
        scheduledAt = new Date(`${date}T${startTime}`).toISOString();
      } else if (hideTimes && date) {
        scheduledAt = new Date(`${date}T00:00`).toISOString();
      }

      const mins = DURATION_MINUTES[duration];
      const meta: Record<string, unknown> = { duration };
      if (location.trim()) meta.location = location.trim();
      if (showEndTime && endTime && date) meta.endTime = new Date(`${date}T${endTime}`).toISOString();
      if (mins !== null) meta.durationMinutes = mins;

      return leadActivityService.create({
        leadId: lead.id,
        type: 'MEETING_SCHEDULED',
        subject: subject.trim(),
        scheduledAt,
        metadata: meta,
      });
    },
    onSuccess: () => {
      if (location.trim()) saveLocation(location.trim());
      qc.invalidateQueries({ queryKey: ['lead-activities'] });
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-app)', borderRadius: 14, padding: 24, width: 420, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Schedule Meeting</h2>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', padding: 4 }}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 5 }}>Lead *</label>
            <LeadCombobox value={lead} onChange={setLead} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 5 }}>Subject *</label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="e.g. Discovery call"
              style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border-medium)', borderRadius: 8, fontSize: 13, background: 'var(--bg-app)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 5 }}>Duration</label>
            <div style={{ position: 'relative' }}>
              <select
                value={duration}
                onChange={e => setDuration(e.target.value)}
                style={{ width: '100%', padding: '7px 30px 7px 10px', border: '1px solid var(--border-medium)', borderRadius: 8, fontSize: 13, background: 'var(--bg-app)', color: 'var(--text-primary)', appearance: 'none', outline: 'none', cursor: 'pointer' }}
              >
                {DURATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 5 }}>Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border-medium)', borderRadius: 8, fontSize: 13, background: 'var(--bg-app)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {!hideTimes && (
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 5 }}>Start time</label>
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border-medium)', borderRadius: 8, fontSize: 13, background: 'var(--bg-app)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              {showEndTime && (
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 5 }}>End time</label>
                  <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border-medium)', borderRadius: 8, fontSize: 13, background: 'var(--bg-app)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }} />
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

// ─── Activity Row ─────────────────────────────────────────────────────────────

function ActivityRow({ item }: { item: LeadActivityItem }) {
  const qc = useQueryClient();
  const isOverdue = item.state === 'PENDING' && item.scheduledAt && new Date(item.scheduledAt) < new Date();

  const completeMut = useMutation<LeadActivityItem, Error, string>({
    mutationFn: (id: string) => leadActivityService.markComplete(id),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['lead-activities'] });
      const snap = qc.getQueriesData<any>({ queryKey: ['lead-activities'] });
      qc.setQueriesData<any>({ queryKey: ['lead-activities'] }, (old: any) => {
        if (!old?.data) return old;
        return { ...old, data: old.data.map((a: LeadActivityItem) => a.id === item.id ? { ...a, state: 'COMPLETED', completedAt: new Date().toISOString() } : a) };
      });
      return { snap };
    },
    onError: (_err: unknown, _vars: unknown, ctx: any) => {
      if (ctx?.snap) ctx.snap.forEach(([key, data]: [any, any]) => qc.setQueryData(key, data));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['lead-activities'] }),
  });

  const leadName = item.lead ? `${item.lead.firstName} ${item.lead.lastName}` : '—';

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border-light)' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: isOverdue ? 'rgba(239,68,68,.12)' : 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: isOverdue ? '#ef4444' : 'var(--text-tertiary)', marginTop: 2 }}>
        {activityIcon(item.type)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div>
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{item.subject}</span>
            <span style={{ fontSize: 13, color: 'var(--text-tertiary)', marginLeft: 8 }}>{leadName}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 12, color: isOverdue ? '#ef4444' : 'var(--text-tertiary)' }}>
              {formatScheduled(item.scheduledAt)}
            </span>
            {item.state === 'PENDING' && (
              <button
                type="button"
                onClick={() => completeMut.mutate(item.id)}
                disabled={completeMut.isPending}
                title="Mark complete"
                style={{ width: 26, height: 26, borderRadius: '50%', border: '1.5px solid var(--border-medium)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', flexShrink: 0 }}
              >
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
        {item.metadata && typeof item.metadata.location === 'string' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
            <MapPin size={11} style={{ color: 'var(--text-tertiary)' }} />
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{item.metadata.location}</span>
          </div>
        )}
        {item.actor && (
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2, display: 'block' }}>
            {item.actor.firstName} {item.actor.lastName}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

const EMPTY: Record<GlobalFilter, { icon: React.ReactNode; msg: string }> = {
  ALL:      { icon: <Calendar size={32} />, msg: 'No activities yet. Schedule a meeting to get started.' },
  DUE_TODAY:{ icon: <Clock size={32} />,    msg: 'Nothing due today — you\'re all caught up!'            },
  UPCOMING: { icon: <Calendar size={32} />, msg: 'No upcoming activities scheduled.'                      },
  OVERDUE:  { icon: <Clock size={32} />,    msg: 'No overdue activities — great work!'                    },
  MINE:     { icon: <User size={32} />,     msg: 'No activities assigned to you.'                         },
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ActivitiesPage() {
  const [filter, setFilter]       = useState<GlobalFilter>('ALL');
  const [showModal, setShowModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['lead-activities', filter],
    queryFn: () => leadActivityService.findAll(filter),
    staleTime: 30_000,
  });

  const items = data?.data ?? [];
  const total = data?.total ?? 0;

  return (
    <div style={{ padding: '24px 32px', minHeight: '100vh', background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>Activities</h1>
          {total > 0 && <span style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2, display: 'block' }}>{total} activities</span>}
        </div>
        <button type="button" onClick={() => setShowModal(true)} className="btn btn-primary" style={{ fontSize: 13, gap: 6 }}>
          <Plus size={15} /> Schedule Meeting
        </button>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`btn ${filter === f.key ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: 13, padding: '5px 14px' }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 14 }}>
          Loading…
        </div>
      ) : items.length === 0 ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-tertiary)' }}>
          <div style={{ marginBottom: 12, opacity: 0.4 }}>{EMPTY[filter].icon}</div>
          <p style={{ margin: 0, fontSize: 14 }}>{EMPTY[filter].msg}</p>
        </div>
      ) : (
        <div>
          {items.map(item => <ActivityRow key={item.id} item={item} />)}
        </div>
      )}

      {showModal && <ScheduleModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
