import { useState, useRef, useEffect, useCallback } from 'react';
import { Calendar, Clock, X, FileText } from 'lucide-react';
import { documentationService, DocActivityFilter, CreateDocActivityPayload } from '../../services/documentation.service';
import { useAuth } from '../../auth/context/AuthContext';
import { toast } from '../notifications/notify';
import { ActivitiesView, type ActivitiesAdapter, type ActivityVM } from '../activities/ActivitiesView';
import type { DocActivity } from '../../types';

// Documentation adapter for the shared ActivitiesView (same UI as Sales, bound to
// DocActivity + DocCase). Note: no "My Activities" filter for Documentation.

// ─── Case Combobox (department equivalent of the Sales LeadCombobox) ───────────

interface CaseOption { id: string; label: string }

function CaseCombobox({ value, onChange }: { value: CaseOption | null; onChange: (v: CaseOption | null) => void }) {
  const [query, setQuery]     = useState('');
  const [open, setOpen]       = useState(false);
  const [results, setResults] = useState<CaseOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor]   = useState(-1);
  const timerRef              = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((q: string) => {
    if (!q.trim()) { setResults([]); setLoading(false); return; }
    setLoading(true);
    documentationService.listCases({ search: q, pageSize: 10, page: 1 })
      .then(res => {
        setResults((res.data ?? []).map(c => ({
          id: c.id,
          label: [c.lead?.company?.trim() || [c.lead?.firstName, c.lead?.lastName].filter(Boolean).join(' ').trim() || 'Case', c.caseNumber].filter(Boolean).join(' · '),
        })));
        setLoading(false); setCursor(-1);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(query), 250);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query, search]);

  function select(c: CaseOption) { onChange(c); setOpen(false); setQuery(''); setResults([]); }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { setOpen(false); return; }
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    if (e.key === 'Enter' && cursor >= 0) { e.preventDefault(); select(results[cursor]); }
  }

  if (value) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', border: '1px solid var(--border-medium)', borderRadius: 8, background: 'var(--bg-muted)' }}>
      <FileText size={13} style={{ color: 'var(--text-tertiary)' }} />
      <span style={{ fontSize: 13, color: 'var(--text-primary)', flex: 1 }}>{value.label}</span>
      <button type="button" onClick={() => { onChange(null); setQuery(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-tertiary)', display: 'flex' }}><X size={13} /></button>
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
        placeholder="Search cases…"
        aria-label="Search cases"
        style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--border-medium)', borderRadius: 8, fontSize: 13, background: 'var(--bg-app)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
      />
      {open && (loading || results.length > 0) && (
        <ul role="listbox" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'var(--bg-app)', border: '1px solid var(--border-medium)', borderRadius: 8, marginTop: 4, padding: 4, maxHeight: 200, overflowY: 'auto', listStyle: 'none', boxShadow: '0 4px 16px rgba(0,0,0,.1)' }}>
          {loading && <li style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text-tertiary)' }}>Searching…</li>}
          {results.map((c, i) => (
            <li key={c.id} role="option" aria-selected={i === cursor} onMouseDown={() => select(c)}
              style={{ padding: '7px 10px', fontSize: 13, borderRadius: 6, cursor: 'pointer', background: i === cursor ? 'var(--bg-muted)' : 'transparent', color: 'var(--text-primary)' }}>
              {c.label}
            </li>
          ))}
          {!loading && results.length === 0 && query.trim() && <li style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text-tertiary)' }}>No cases found</li>}
        </ul>
      )}
    </div>
  );
}

// ─── Documentation adapter ────────────────────────────────────────────────────

const docActivitiesAdapter: ActivitiesAdapter = {
  queryKey: 'doc-activities',
  heading: 'Activities',
  entityNoun: 'case',
  fullPage: false,
  filters: [
    { key: 'DUE_TODAY', label: 'Due Today' },
    { key: 'UPCOMING',  label: 'Upcoming'  },
    { key: 'OVERDUE',   label: 'Overdue'   },
  ],
  defaultFilter: 'DUE_TODAY',
  templates: [
    { label: 'Follow-up',    type: 'FOLLOW_UP',     duration: 'M30', location: 'Phone',   subject: 'Follow-up'         },
    { label: 'Call',         type: 'CALL',          duration: 'M15', location: 'Phone',   subject: 'Call client'       },
    { label: 'Meeting',      type: 'MEETING',       duration: 'H1',  location: 'Virtual', subject: 'Meeting'           },
    { label: 'Request Docs', type: 'DOC_REQUESTED', duration: null,  location: '',        subject: 'Request documents' },
  ],
  keyboardShortcuts: [
    { key: 'j / k',  action: 'Navigate down / up' },
    { key: 'Enter',  action: 'Open case for focused activity' },
    { key: 'c',      action: 'Quick complete focused activity' },
    { key: 'e',      action: 'Schedule a new activity' },
    { key: '/',      action: 'Focus search bar' },
    { key: 'a',      action: 'Select all visible activities' },
    { key: 'Escape', action: 'Close panel / deselect' },
    { key: '?',      action: 'Toggle this shortcuts modal' },
  ],
  emptyStates: {
    DUE_TODAY: { icon: <Clock size={32} />,    msg: "Nothing due today — you're all caught up!" },
    UPCOMING:  { icon: <Calendar size={32} />, msg: 'No upcoming activities scheduled.'         },
    OVERDUE:   { icon: <Clock size={32} />,    msg: 'No overdue activities — great work!'       },
  },
  storage: {
    tab: 'hpx-doc-activities-tab',
    sticky: 'hpx-doc-activities-sticky',
    unlock: 'hpx-doc-activities-unlock',
    lastLocation: 'hpx-doc-last-activity-location',
    savedLocations: 'hpx-doc-activity-locations',
  },
  activityIcon: (type) => {
    switch (type) {
      case 'MEETING':       return <Calendar size={14} />;
      case 'DOC_REQUESTED': return <FileText size={14} />;
      default:              return <Clock size={14} />;
    }
  },
  list: (filter) => documentationService.listActivities(filter as DocActivityFilter),
  toVM: (a: DocActivity): ActivityVM => {
    const lead = a.case?.lead;
    return {
      id: a.id,
      state: a.state,
      type: a.type,
      subject: a.subject,
      scheduledAt: a.scheduledAt,
      completedAt: a.completedAt,
      createdAt: a.createdAt,
      metadata: a.metadata,
      actorName: a.actor ? `${a.actor.firstName ?? ''} ${a.actor.lastName ?? ''}`.trim() : '',
      entityId: a.case?.id,
      identity: a.case
        ? {
            company: lead?.company?.trim() || null,
            person: lead ? `${lead.firstName ?? ''} ${lead.lastName ?? ''}`.trim() : null,
            code: a.case.caseNumber,
          }
        : null,
    };
  },
  complete: (id, opts) => documentationService.completeActivity(id, opts),
  bulkComplete: (ids) => documentationService.bulkCompleteActivities(ids),
  scheduleTitle: 'Schedule Activity',
  subjectPlaceholder: 'e.g. Chase passport copy',
  EntityPicker: CaseCombobox,
  getPickedEntityId: (c: CaseOption) => c.id,
  createFromModal: (c: CaseOption, input) => documentationService.createActivity(c.id, input as CreateDocActivityPayload),
  defaultCreateType: 'FOLLOW_UP',
  isSelectable: (vm) => vm.state === 'PENDING',
  editNeedsFocus: false,
  loadErrorMsg: 'Could not load activities.',
  onCompleteSuccess: (qc, vm) => { if (vm.entityId) qc.invalidateQueries({ queryKey: ['doc-case', vm.entityId] }); },
  onCompleteError: () => { toast.error('Could not complete activity.'); },
  onBulkError: () => { toast.error('Could not complete activities.'); },
  onCreateSuccess: (qc, caseId) => { qc.invalidateQueries({ queryKey: ['doc-case', caseId] }); },
};

export function DocActivitiesPanel({ onOpenCase }: { onOpenCase?: (caseId: string) => void }) {
  const { permissions } = useAuth();
  const canEdit = permissions.can('doc:edit');
  return <ActivitiesView adapter={docActivitiesAdapter} canEdit={canEdit} onOpen={(id) => onOpenCase?.(id)} />;
}
