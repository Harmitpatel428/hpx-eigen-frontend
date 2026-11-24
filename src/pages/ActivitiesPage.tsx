import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Clock, X, User } from 'lucide-react';
import { leadActivityService, GlobalFilter, LeadActivityItem } from '../services/lead-activity.service';
import { leadService } from '../services/lead.service';
import { invalidateLeadNotes } from '../services/lead-notes.service';
import { toast } from '../components/notifications/notify';
import { ContextPanel } from '../components/layout/ContextPanel';
import { LeadDetailPanel } from '../components/leads/LeadDetailPanel';
import { LeadModal } from '../components/leads/LeadModal';
import { DeleteConfirm } from '../components/leads/DeleteConfirm';
import { ActivitiesView, type ActivitiesAdapter, type ActivityVM } from '../components/activities/ActivitiesView';
import type { Lead } from '../types';

// ─── Lead Combobox (Sales entity picker) ──────────────────────────────────────

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

// ─── Sales adapter ────────────────────────────────────────────────────────────

const salesActivitiesAdapter: ActivitiesAdapter = {
  queryKey: 'lead-activities',
  heading: 'Activities',
  entityNoun: 'lead',
  fullPage: true,
  filters: [
    { key: 'DUE_TODAY', label: 'Due Today'     },
    { key: 'UPCOMING',  label: 'Upcoming'      },
    { key: 'OVERDUE',   label: 'Overdue'       },
    { key: 'MINE',      label: 'My Activities' },
  ],
  defaultFilter: 'DUE_TODAY',
  templates: [
    { label: 'Follow-up Call',  type: 'FOLLOW_UP_SCHEDULED', duration: 'M30', location: 'Phone',   subject: 'Follow-up call'   },
    { label: 'Demo Meeting',    type: 'MEETING_SCHEDULED',   duration: 'H1',  location: 'Virtual', subject: 'Product demo'     },
    { label: 'Send Proposal',   type: 'OTHER',               duration: null,  location: '',        subject: 'Send proposal'    },
    { label: 'Contract Review', type: 'MEETING_SCHEDULED',   duration: 'M45', location: '',        subject: 'Contract review'  },
  ],
  keyboardShortcuts: [
    { key: 'j / k',   action: 'Navigate down / up' },
    { key: 'Enter',   action: 'Open lead panel for focused activity' },
    { key: 'c',       action: 'Quick complete focused activity' },
    { key: 'e',       action: 'Edit / reschedule focused activity' },
    { key: '/',       action: 'Focus search bar' },
    { key: 'a',       action: 'Select all visible activities' },
    { key: 'Escape',  action: 'Close panel / deselect' },
    { key: '?',       action: 'Toggle this shortcuts modal' },
  ],
  emptyStates: {
    DUE_TODAY: { icon: <Clock size={32} />,    msg: "Nothing due today — you're all caught up!" },
    UPCOMING:  { icon: <Calendar size={32} />, msg: 'No upcoming activities scheduled.'         },
    OVERDUE:   { icon: <Clock size={32} />,    msg: 'No overdue activities — great work!'       },
    MINE:      { icon: <User size={32} />,     msg: 'No activities assigned to you.'            },
  },
  storage: {
    tab: 'hpx-activities-tab',
    sticky: 'hpx-activities-sticky',
    unlock: 'hpx-activities-unlock',
    lastLocation: 'last_activity_location',
    savedLocations: 'hpx-activity-locations',
  },
  activityIcon: (type) => {
    switch (type) {
      case 'MEETING_SCHEDULED':       return <Calendar size={14} />;
      case 'FOLLOW_UP_SCHEDULED':     return <Clock size={14} />;
      case 'CALL_NOT_RECEIVED_EVENT': return <User size={14} />;
      default: return <Clock size={14} />;
    }
  },
  list: (filter) => leadActivityService.findAll(filter as GlobalFilter),
  toVM: (a: LeadActivityItem): ActivityVM => ({
    id: a.id,
    state: a.state,
    type: a.type,
    subject: a.subject,
    scheduledAt: a.scheduledAt,
    completedAt: a.completedAt,
    createdAt: a.createdAt,
    metadata: a.metadata,
    actorName: a.actor ? `${a.actor.firstName} ${a.actor.lastName}` : '',
    entityId: a.leadId,
    identity: a.lead
      ? { company: a.lead.company?.trim() || null, person: `${a.lead.firstName} ${a.lead.lastName}`.trim(), code: null }
      : null,
  }),
  complete: (id, opts) => leadActivityService.markComplete(id, opts),
  bulkComplete: (ids) => leadActivityService.bulkComplete(ids),
  scheduleTitle: 'Schedule Meeting',
  subjectPlaceholder: 'e.g. Discovery call',
  EntityPicker: LeadCombobox,
  getPickedEntityId: (lead: LeadOption) => lead.id,
  createFromModal: (lead: LeadOption, input) => leadActivityService.create({ leadId: lead.id, ...input }),
  defaultCreateType: 'MEETING_SCHEDULED',
  isSelectable: () => true,
  editNeedsFocus: true,
  // Invalidate notes so the saved note appears immediately in the lead panel
  onCompleteSuccess: (qc, vm) => invalidateLeadNotes(qc, vm.entityId!),
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ActivitiesPage({ embedded = false }: { embedded?: boolean } = {}) {
  const qc = useQueryClient();
  // Embedded in the Sales page's Activities tab → drop the standalone full-page
  // chrome (own <h1> + 100vh) so it sits under the Leads header like Documentation's panel.
  const adapter = useMemo(
    () => (embedded ? { ...salesActivitiesAdapter, fullPage: false } : salesActivitiesAdapter),
    [embedded],
  );
  const [selectedLeadId, setSelectedLeadId]     = useState<string | null>(null);
  // Lead edit modal + delete confirm opened from the detail panel — same
  // components LeadsPage uses, so saving goes through the existing update path.
  const [editModal, setEditModal]               = useState<{ mode: 'create' | 'edit'; lead?: Lead } | null>(null);
  const [deleteTarget, setDeleteTarget]         = useState<Lead | null>(null);

  const { data: selectedLead } = useQuery({
    queryKey: ['lead', selectedLeadId],
    queryFn: () => leadService.findById(selectedLeadId!),
    enabled: !!selectedLeadId,
  });

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

  return (
    <>
      <ActivitiesView
        adapter={adapter}
        canEdit={true}
        onOpen={setSelectedLeadId}
        // Edit modal / delete confirm handle their own Escape; never yank the
        // panel out from under them.
        onEscape={() => setSelectedLeadId(null)}
        suspendKeys={!!(editModal || deleteTarget)}
      />

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
            if (updated) {
              qc.setQueryData(['lead', updated.id], updated);
              qc.invalidateQueries({ queryKey: ['lead-contacts', updated.id] });
            }
            setEditModal(null);
          }}
          onLeadChanged={(fresh) => {
            // Contact edit refreshed the authoritative lead — repaint the open
            // detail panel (keyed ['lead', selectedLeadId]) without closing the modal.
            qc.setQueryData(['lead', fresh.id], fresh);
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
    </>
  );
}
