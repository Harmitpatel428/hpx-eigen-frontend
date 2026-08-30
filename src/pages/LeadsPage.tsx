import { useState, useCallback, useEffect, useMemo, memo, useRef, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Plus, ListFilter, ArrowDownToLine, ArrowUpFromLine,
  X, Trash2,
  Building2, Calendar, MapPin,
  Copy, Check, UserCheck,
} from 'lucide-react';
import type { Lead, LeadStage, CustomFieldDef } from '../types';
import { leadService } from '../services/lead.service';
import { leadContactsService, LeadContact } from '../services/lead-contacts.service';
import { customFieldService } from '../services/custom-field.service';
import { crmSettingsService } from '../services/crm-settings.service';
import { toast } from 'sonner';
import { useAuth } from '../auth/context/AuthContext';
import { saveOriginalTokensForImpersonation } from '../components/layout/ImpersonationBanner';
import { tokenStorage } from '../auth/storage/tokenStorage';
import { api } from '../services/api';
import { ContextPanel } from '../components/layout/ContextPanel';
import { LeadModal } from '../components/leads/LeadModal';
import { LeadDetailPanel } from '../components/leads/LeadDetailPanel';
import { LeadImportWizard } from '../components/leads/LeadImportWizard';
import { LeadAssignModal } from '../components/leads/LeadAssignModal';
import { DeleteConfirm } from '../components/leads/DeleteConfirm';
import { exportCSV } from '../utils/csv';
import { loadColourfulFilters, loadStageFilter, saveStageFilter } from '../utils/salesDashboardPrefs';
import type { AssignmentSummary } from '../services/lead.service';
import { normaliseCaseIdInput, isValidCaseId } from '../domain/caseId';

// ============================================================================
// HELPERS
// ============================================================================

const STAGE_LABELS: Record<LeadStage, string> = {
  NEW: 'New', QUALIFIED: 'Qualified', INTERESTED: 'Interested', FOLLOW_UP: 'Follow-Up',
  CALL_BACK_REQUESTED: 'Call Back Requested', CALL_NOT_RECEIVED: 'Call Not Received',
  OTHER: 'Other', DISQUALIFIED: 'Disqualified',
  CONTACTED: 'Contacted', CONVERTED: 'Converted',
};

const STAGE_COLORS: Record<LeadStage, { bg: string; text: string; dot: string }> = {
  NEW:                 { bg: 'rgba(99,102,241,0.1)',  text: '#6366f1', dot: '#6366f1' },
  QUALIFIED:           { bg: 'rgba(16,185,129,0.1)',  text: '#059669', dot: '#059669' },
  INTERESTED:          { bg: 'rgba(13,148,136,0.1)',  text: '#0d9488', dot: '#0d9488' },
  FOLLOW_UP:           { bg: 'rgba(245,158,11,0.1)',  text: '#d97706', dot: '#d97706' },
  CALL_BACK_REQUESTED: { bg: 'rgba(249,115,22,0.1)',  text: '#ea580c', dot: '#ea580c' },
  CALL_NOT_RECEIVED:   { bg: 'rgba(239,68,68,0.08)',  text: '#dc2626', dot: '#dc2626' },
  OTHER:               { bg: 'rgba(107,114,128,0.1)', text: '#6b7280', dot: '#6b7280' },
  DISQUALIFIED:        { bg: 'rgba(239,68,68,0.1)',   text: '#dc2626', dot: '#dc2626' },
  CONTACTED:           { bg: 'rgba(245,158,11,0.1)',  text: '#d97706', dot: '#d97706' },
  CONVERTED:           { bg: 'rgba(139,92,246,0.1)',  text: '#7c3aed', dot: '#7c3aed' },
};


// ── Task 3: stage pill order (per-browser, localStorage-persisted) ────────────
// ponytail: localStorage only — multi-device sync needs a user-preferences API
const DEFAULT_STAGES: { key: LeadStage; label: string }[] = [
  { key: 'NEW',                 label: 'New'          },
  { key: 'QUALIFIED',           label: 'Qualified'    },
  { key: 'INTERESTED',          label: 'Interested'   },
  { key: 'FOLLOW_UP',           label: 'Follow-Up'    },
  { key: 'CALL_BACK_REQUESTED', label: 'Call Back'    },
  { key: 'CALL_NOT_RECEIVED',   label: 'Not Received' },
  { key: 'DISQUALIFIED',        label: 'Disqualified' },
  { key: 'OTHER',               label: 'Others'       },
];
const STAGE_ORDER_KEY = 'sales_dashboard_stage_order';
function loadStageOrder(): { key: LeadStage; label: string }[] {
  try {
    const raw = localStorage.getItem(STAGE_ORDER_KEY);
    if (!raw) return DEFAULT_STAGES;
    const keys = JSON.parse(raw) as string[];
    const ordered = keys
      .map(k => DEFAULT_STAGES.find(s => s.key === k))
      .filter((s): s is { key: LeadStage; label: string } => !!s);
    const missing = DEFAULT_STAGES.filter(s => !keys.includes(s.key));
    return [...ordered, ...missing];
  } catch { return DEFAULT_STAGES; }
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export function LeadsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [caseIdInput, setCaseIdInput] = useState('');
  const [searchQuery, setSearchQuery]   = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [modal, setModal]               = useState<{ mode: 'create' | 'edit'; lead?: Lead } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  // Session-scoped: defaults to NEW, survives refresh, cleared on logout (see AuthContext)
  const [selectedStage, setSelectedStageState] = useState<LeadStage | ''>(loadStageFilter);
  const setSelectedStage = useCallback((stage: LeadStage | '') => {
    saveStageFilter(stage);
    setSelectedStageState(stage);
  }, []);
  const [colourfulFilters] = useState(loadColourfulFilters);
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  // Role/assignee dropdown: '' = All · 'UNASSIGNED' · `user:<id>` · `role:<id>`
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [stages, setStages] = useState(loadStageOrder);
  const dragIdx = useRef<number | null>(null);
  const [page, setPage] = useState(1);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const filterKey = `${debouncedSearch}||${selectedStage}||${assigneeFilter}`;
  const prevFilterKey = useRef(filterKey);

  const assigneeParams = useMemo(() => {
    if (assigneeFilter.startsWith('user:')) return { ownerId: assigneeFilter.slice(5) };
    if (assigneeFilter === 'UNASSIGNED')    return { ownerId: 'UNASSIGNED' };
    if (assigneeFilter.startsWith('role:')) return { roleId: assigneeFilter.slice(5) };
    return {};
  }, [assigneeFilter]);

  const { data: leadsResponse, isLoading, isFetching } = useQuery({
    queryKey: ['leads', { search: debouncedSearch, stage: selectedStage, page, assignee: assigneeFilter }],
    queryFn: () => leadService.findAll({ search: debouncedSearch || undefined, stage: selectedStage || undefined, pageSize: 100, page, ...assigneeParams }),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (prevFilterKey.current !== filterKey) {
      prevFilterKey.current = filterKey;
      setPage(1);
      setAllLeads([]);
    }
  }, [filterKey]);

  useEffect(() => {
    if (!leadsResponse?.data) return;
    if (leadsResponse.page === 1) {
      setAllLeads(leadsResponse.data);
    } else {
      setAllLeads(prev => [...prev, ...leadsResponse.data]);
    }
  }, [leadsResponse]);

  const { data: stageCounts = {} } = useQuery<Record<string, number>>({
    queryKey: ['lead-stage-counts'],
    queryFn: () => leadService.stageCounts(),
    staleTime: 60_000,
  });

  const { permissions } = useAuth();
  const canAssign = permissions.can('lead:assign');
  const { data: assignmentSummary } = useQuery<AssignmentSummary>({
    queryKey: ['lead-assignment-summary'],
    queryFn: () => leadService.assignmentSummary(),
    enabled: canAssign,
    staleTime: 30_000,
  });

  const { data: crmSettings } = useQuery({
    queryKey: ['crm-settings'],
    queryFn: () => crmSettingsService.get(),
    staleTime: 5 * 60 * 1000,
  });
  const companyFirst = crmSettings?.leadHeaderPreference === 'company';
  const canImpersonate = permissions.can('user:impersonate') && !!crmSettings?.allowImpersonation;
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);

  const handleImpersonate = useCallback(async (ownerId: string) => {
    if (impersonatingId) return;
    setImpersonatingId(ownerId);
    try {
      const res = await api.post('/api/v1/sessions/impersonate', { targetUserId: ownerId });
      saveOriginalTokensForImpersonation();
      tokenStorage.set({
        accessToken: res.data.accessToken,
        sessionId: res.data.impersonationSessionId,
        userId: res.data.impersonatedUser.id,
      });
      window.location.reload();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? 'Failed to start impersonation.');
      setImpersonatingId(null);
    }
  }, [impersonatingId]);

  const { data: fieldDefs = [] } = useQuery<CustomFieldDef[]>({
    queryKey: ['custom-fields'],
    queryFn: () => customFieldService.list(),
    staleTime: 60_000,
  });

  const leads: Lead[] = useMemo(() => {
    if (assignmentFilter === 'assigned')   return allLeads.filter(l => !!l.owner);
    if (assignmentFilter === 'unassigned') return allLeads.filter(l => !l.owner);
    return allLeads;
  }, [allLeads, assignmentFilter]);
  const totalCount = leadsResponse?.total ?? allLeads.length;
  const hasMore    = allLeads.length > 0 && allLeads.length < totalCount;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => leadService.softDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads-deleted'] });
      queryClient.invalidateQueries({ queryKey: ['lead-stage-counts'] });
      queryClient.invalidateQueries({ queryKey: ['lead-assignment-summary'] });
      queryClient.invalidateQueries({ queryKey: ['lead-activities'] });
      toast.success('Lead moved to Recycle Bin');
      setDeleteTarget(null);
      setSelectedLead(null);
    },
    onError: (err: any) => {
      // Keep the confirm dialog open — the lead was not deleted.
      // Surface HTTP status when the server sent no structured message, so
      // 403/404/500 from prod are diagnosable from the toast alone.
      toast.error(err?.response?.data?.error?.message ?? err?.response?.data?.message ?? `Failed to delete lead${err?.response?.status ? ` (HTTP ${err.response.status})` : ''}.`);
    },
  });

  const handleModalSuccess = useCallback((updated?: Lead | null) => {
    queryClient.invalidateQueries({ queryKey: ['leads'] });
    queryClient.invalidateQueries({ queryKey: ['lead-stage-counts'] });
    queryClient.invalidateQueries({ queryKey: ['lead-assignment-summary'] });
    queryClient.invalidateQueries({ queryKey: ['lead-activities'] });
    setModal(null);
    // Sync the open detail panel with the saved server state
    if (updated) {
      setSelectedLead(prev => prev && prev.id === updated.id ? { ...prev, ...updated, owner: prev.owner } : prev);
      queryClient.invalidateQueries({ queryKey: ['lead-contacts', updated.id] });
    }
  }, [queryClient]);

  const handleDeleteConfirm = useCallback(() => {
    if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
  }, [deleteTarget, deleteMutation]);

  const handleClosePanel = useCallback(() => setSelectedLead(null), []);

  const fmtExportDate = (v: string | null | undefined): string => {
    if (!v) return '';
    const d = new Date(v);
    if (isNaN(d.getTime())) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${d.getFullYear()}`;
  };

  // Export pulls full-fidelity rows from GET /leads/export (server-side), so
  // every stored field is included regardless of pagination or page filters.
  const [exporting, setExporting] = useState(false);

  const exportViaServer = useCallback(async (ids?: string[], filename = 'leads-export') => {
    setExporting(true);
    try {
      const source = await leadService.exportLeads(
        ids
          ? { ids }
          : { search: debouncedSearch || undefined, stage: selectedStage || undefined, ...assigneeParams }
      );
      if (source.length === 0) {
        toast.info('No leads match the current selection.');
        return;
      }
      const STATIC_HEADERS = [
        'First Name','Last Name','Email','Phone','Company',
        'Source','Status','Stage','Priority',
        'Score','Expected Value','Expected Close Date','Follow-Up Date',
        'Country','State','City','Area','Postal Code','Full Address',
        'Owner ID','Owner Name','Owner Role','Assigned By (Manager ID)','Tags',
        'Notes','Notes Count','Created Date','Updated Date',
      ];
      const cfHeaders = fieldDefs.map(f => f.name);
      const rows = source.map(l => {
        const stored: Array<{ fieldId: string; value: string | null }> =
          Array.isArray((l as any).customFieldValues) ? (l as any).customFieldValues : [];
        const tagStr = Array.isArray((l as any).tags) ? (l as any).tags.map((t: any) => t.name).join(', ') : '';
        // Real notes live in LeadNote (notesText); legacy scalar kept first so no stored data drops
        const noteStr = [(l as any).notes ?? '', (l as any).notesText ?? ''].filter(Boolean).join('\n');
        const ownerLabel = (l as any).owner
          ? [(l as any).owner.firstName, (l as any).owner.lastName].filter(Boolean).join(' ')
          : '';
        const row: Record<string, unknown> = {
          'First Name': l.firstName, 'Last Name': l.lastName,
          'Email': l.email ?? '', 'Phone': l.phone ?? '', 'Company': l.company ?? '',
          'Source': l.source ?? '', 'Status': l.status ?? '', 'Stage': l.stage ?? '',
          'Priority': l.priority ?? '',
          'Score': l.score ?? '', 'Expected Value': l.expectedValue ?? '',
          'Expected Close Date': fmtExportDate(l.expectedCloseDate),
          'Follow-Up Date': fmtExportDate(l.followUpDate),
          'Country': l.country ?? '', 'State': l.state ?? '', 'City': l.city ?? '',
          'Area': l.area ?? '', 'Postal Code': l.postalCode ?? '',
          'Full Address': (l as any).freeformAddress ?? '',
          'Owner ID': l.ownerId ?? '', 'Owner Name': ownerLabel,
          'Owner Role': ((l as any).owner?.roleNames ?? []).join(', '),
          'Assigned By (Manager ID)': (l as any).managerId ?? '',
          'Tags': tagStr,
          'Notes': noteStr,
          'Notes Count': (l as any).notesCount ?? 0,
          'Created Date': fmtExportDate(l.createdAt),
          'Updated Date': fmtExportDate(l.updatedAt),
        };
        fieldDefs.forEach(f => {
          const v = stored.find(sv => sv.fieldId === f.id);
          row[f.name] = v?.value ?? '';
        });
        return row;
      });
      exportCSV(filename, [...STATIC_HEADERS, ...cfHeaders], rows);
      toast.success(`Exported ${rows.length} lead${rows.length !== 1 ? 's' : ''}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? 'Export failed.');
    } finally {
      setExporting(false);
    }
  }, [debouncedSearch, selectedStage, assigneeParams, fieldDefs]);

  const handleExport = useCallback(() => { void exportViaServer(undefined, 'leads-export'); }, [exportViaServer]);

  const handleExportSelected = useCallback(() => {
    const ids = leads.filter(l => selectedIds.has(l.id)).map(l => l.id);
    if (ids.length === 0) return;
    void exportViaServer(ids, 'leads-selected-export');
  }, [leads, selectedIds, exportViaServer]);

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => leadService.bulkDelete(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads-deleted'] });
      queryClient.invalidateQueries({ queryKey: ['lead-stage-counts'] });
      queryClient.invalidateQueries({ queryKey: ['lead-assignment-summary'] });
      toast.success('Leads moved to Recycle Bin');
      setSelectedIds(new Set());
      setBulkDeleteConfirm(false);
    },
    onError: (err: any) => {
      // Same diagnosability rule as single delete: bare status beats a generic
      // message when prod returns 403 (permission not seeded), 404 (stale
      // deploy) or 500 (audit write failure after a partial delete).
      toast.error(err?.response?.data?.error?.message ?? err?.response?.data?.message ?? `Failed to delete leads${err?.response?.status ? ` (HTTP ${err.response.status})` : ''}.`);
    },
  });

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev => prev.size === leads.length ? new Set() : new Set(leads.map(l => l.id)));
  }, [leads]);

  const allSelected = leads.length > 0 && selectedIds.size === leads.length;

  const gridCols = '32px minmax(240px,1.4fr) minmax(240px,1.4fr) minmax(100px,0.75fr) minmax(120px,0.85fr) minmax(90px,0.7fr)';

  const normalisedCaseId = normaliseCaseIdInput(caseIdInput);
  const isCaseIdValid = isValidCaseId(normalisedCaseId);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" style={{ padding: '4px 12px' }}>
        <div>
          <h1 className="type-title">Leads</h1>
          <p className="type-body">
            {isLoading && allLeads.length === 0 ? 'Loading…' : `${totalCount} total · ${allLeads.filter(l => l.status === 'NEW').length} new`}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {selectedStage === 'QUALIFIED' && (
              <div style={{ position: 'relative', width: 190 }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                <input
                  className="input case-id-input"
                  aria-label="Search by Case ID"
                  value={caseIdInput}
                  onChange={e => setCaseIdInput(e.target.value.toUpperCase())}
                  placeholder="Case ID (HPX-XXXX-XXXX)"
                  style={{ paddingLeft: 30, width: '100%', height: 28, fontSize: 13, backgroundColor: 'transparent', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)' }}
                />
              </div>
            )}
            <div style={{ position: 'relative', width: 190 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input className="input" placeholder="Search leads…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ paddingLeft: 30, width: '100%', height: 28, fontSize: 13, backgroundColor: 'transparent', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)' }} />
            </div>
          </div>
          {selectedStage === 'QUALIFIED' && isCaseIdValid && (
            <>
              <button onClick={() => { setCaseIdInput(''); navigate(`/documentation?caseId=${encodeURIComponent(normalisedCaseId)}`); }} style={{ fontSize: 12, padding: '4px 10px', height: 28, borderRadius: 7, border: '1px solid var(--border-medium)', background: 'var(--bg-subtle)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 500 }}>Open case</button>
              <button onClick={() => { setCaseIdInput(''); navigate(`/portal-preview/${encodeURIComponent(normalisedCaseId)}`); }} style={{ fontSize: 12, padding: '4px 10px', height: 28, borderRadius: 7, border: 'none', background: '#7c3aed', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>Portal preview</button>
            </>
          )}
          {/* ROLE / ASSIGNEE FILTER — options are server-computed (assignment-summary),
              selection filters the list server-side via ownerId/roleId params */}
          {canAssign && (
            <select
              value={assigneeFilter}
              onChange={e => setAssigneeFilter(e.target.value)}
              aria-label="Filter by role or assignee"
              title="Filter by role or assignee"
              style={{ height: 28, fontSize: 13, backgroundColor: 'transparent', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', maxWidth: 220 }}
            >
              <option value="">Role / Assignee · All</option>
              {assignmentSummary && assignmentSummary.unassigned > 0 && (
                <option value="UNASSIGNED">Unassigned · {assignmentSummary.unassigned}</option>
              )}
              {(assignmentSummary?.roleGroups ?? []).map(g => {
                const roleTotal = g.users.reduce((s, u) => s + u.count, 0);
                return (
                  <optgroup key={g.roleId} label={`${g.roleName} (${roleTotal})`}>
                    <option value={`role:${g.roleId}`}>All {g.roleName} · {roleTotal}</option>
                    {g.users.map(u => (
                      <option key={u.userId} value={`user:${u.userId}`}>
                        {[u.firstName, u.lastName].filter(Boolean).join(' ') || 'Unnamed'} · {u.count}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
          )}
          <button className="btn-ghost" style={{ height: 28, padding: '0 8px', fontSize: 13, color: 'var(--text-secondary)' }}><ListFilter size={14} style={{ marginRight: 4 }} /> Filters</button>
          <button className="btn-ghost" style={{ height: 28, padding: '0 8px', fontSize: 13, color: 'var(--text-secondary)' }} onClick={() => setShowImportWizard(true)}><ArrowDownToLine size={14} style={{ marginRight: 4 }} /> Import</button>
          <button className="btn-ghost" style={{ height: 28, padding: '0 8px', fontSize: 13, color: 'var(--text-secondary)' }} disabled={exporting} onClick={handleExport}><ArrowUpFromLine size={14} style={{ marginRight: 4 }} /> {exporting ? 'Exporting…' : 'Export'}</button>
          <div style={{ width: 1, height: 16, backgroundColor: 'var(--border-medium)', margin: '0 4px' }} />
          <button className="btn btn-primary" style={{ height: 28, padding: '0 12px', fontSize: 13, borderRadius: 'var(--radius-sm)' }} onClick={() => setModal({ mode: 'create' })}>
            <Plus size={14} style={{ marginRight: 4 }} /> New Lead
          </button>
        </div>
      </div>

      {/* STAGE FILTER PILLS — draggable, keyboard-reorderable, localStorage-persisted */}
      {/* ponytail: order is per-browser; escalate to product for user-preferences API if multi-device sync needed */}
      <div style={{ display: 'flex', gap: 6, padding: '2px 12px 6px', overflowX: 'auto', flexShrink: 0, scrollbarWidth: 'none' }}>
        {/* All Leads pill — fixed position, not draggable */}
        {(() => {
          const allActive = selectedStage === '';
          const allTotal = Object.values(stageCounts).reduce((s, n) => s + n, 0);
          return (
            <button
              onClick={() => setSelectedStage('')}
              className={`stage-pill${allActive ? ' stage-pill--active' : ''}`}
              style={allActive ? { color: '#0f172a', background: 'rgba(15,23,42,0.07)', borderColor: 'rgba(15,23,42,0.15)' } : undefined}
            >
              <span className="stage-pill-dot" style={allActive ? { background: '#0f172a', opacity: 1 } : undefined} />
              All Leads
              {allTotal > 0 && <span className="stage-pill-count">{allTotal}</span>}
            </button>
          );
        })()}
        {stages.map(({ key, label }, i) => {
          const active = selectedStage === key;
          const sc = STAGE_COLORS[key];
          const count = stageCounts[key];
          return (
            <button
              key={key}
              draggable
              onDragStart={() => { dragIdx.current = i; }}
              onDragOver={e => {
                e.preventDefault();
                if (dragIdx.current === null || dragIdx.current === i) return;
                const next = [...stages];
                const [moved] = next.splice(dragIdx.current, 1);
                next.splice(i, 0, moved);
                dragIdx.current = i;
                setStages(next);
              }}
              onDrop={() => {
                dragIdx.current = null;
                localStorage.setItem(STAGE_ORDER_KEY, JSON.stringify(stages.map(s => s.key)));
              }}
              onKeyDown={e => {
                if (e.key === 'ArrowLeft' && i > 0) {
                  e.preventDefault();
                  const next = [...stages];
                  [next[i - 1], next[i]] = [next[i], next[i - 1]];
                  setStages(next);
                  localStorage.setItem(STAGE_ORDER_KEY, JSON.stringify(next.map(s => s.key)));
                } else if (e.key === 'ArrowRight' && i < stages.length - 1) {
                  e.preventDefault();
                  const next = [...stages];
                  [next[i], next[i + 1]] = [next[i + 1], next[i]];
                  setStages(next);
                  localStorage.setItem(STAGE_ORDER_KEY, JSON.stringify(next.map(s => s.key)));
                }
              }}
              onClick={() => setSelectedStage(active ? '' : key)}
              className={`stage-pill${active ? ' stage-pill--active' : ''}`}
              style={active
                ? { color: sc.text, background: sc.bg, borderColor: sc.text, cursor: 'grab' }
                : colourfulFilters
                ? { color: sc.text, background: sc.bg, borderColor: 'transparent', cursor: 'grab' }
                : { cursor: 'grab' }}
              aria-label={`${label}${count ? ` (${count})` : ''} — drag or use arrow keys to reorder`}
            >
              <span className="stage-pill-dot" style={active ? { background: sc.text, opacity: 1 } : undefined} />
              {label}
              {count != null && count > 0 && (
                <span className="stage-pill-count">{count}</span>
              )}
            </button>
          );
        })}
      </div>


      {/* ASSIGNMENT SUMMARY — replaced by the Role / Assignee dropdown in the header */}

      {/* BULK ACTIONS TOOLBAR */}
      {selectedIds.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', marginBottom: 12, background: 'var(--bg-muted)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)', fontSize: 13 }}>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedIds.size} selected</span>
          <div style={{ width: 1, height: 16, background: 'var(--border-medium)' }} />
          <button className="btn-ghost" style={{ height: 26, padding: '0 10px', fontSize: 12, color: '#6366f1' }} onClick={() => setShowAssignModal(true)}>
            <UserCheck size={12} style={{ marginRight: 4 }} /> Assign
          </button>
          <button className="btn-ghost" style={{ height: 26, padding: '0 10px', fontSize: 12, color: '#dc2626' }} onClick={() => setBulkDeleteConfirm(true)}>
            <Trash2 size={12} style={{ marginRight: 4 }} /> Delete
          </button>
          <button className="btn-ghost" style={{ height: 26, padding: '0 10px', fontSize: 12, color: 'var(--text-secondary)' }} disabled={exporting} onClick={handleExportSelected}>
            <ArrowUpFromLine size={12} style={{ marginRight: 4 }} /> {exporting ? 'Exporting…' : 'Export Selected'}
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn-ghost" style={{ height: 26, padding: '0 10px', fontSize: 12, color: 'var(--text-tertiary)' }} onClick={() => setSelectedIds(new Set())}>
            <X size={12} style={{ marginRight: 4 }} /> Clear
          </button>
        </div>
      )}

      {/* DATA GRID */}
      <div style={{ flex: 1, overflow: 'auto', width: '100%' }}>
        <div style={{ width: '100%', overflow: 'visible' }}>
          {/* Header — always rendered so a zero-match filter never removes the table shell */}
            <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 10, padding: '8px 12px', borderBottom: '1px solid var(--border-strong)', position: 'sticky', top: 0, backgroundColor: 'var(--bg-app)', zIndex: 10, fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} style={{ width: 14, height: 14, accentColor: '#0f172a', cursor: 'pointer' }} aria-label="Select all leads" />
              </div>
              {companyFirst
                ? <><div>Company</div><div>Lead</div></>
                : <><div>Lead</div><div>Company</div></>
              }
              <button
                onClick={() => setAssignmentFilter(f => f === 'all' ? 'assigned' : f === 'assigned' ? 'unassigned' : 'all')}
                title={assignmentFilter === 'all' ? 'Show all' : assignmentFilter === 'assigned' ? 'Showing assigned' : 'Showing unassigned'}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 'inherit', fontWeight: 'inherit', color: assignmentFilter !== 'all' ? 'var(--color-primary,#6366f1)' : 'inherit', textTransform: 'inherit', letterSpacing: 'inherit', display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'inherit' }}
              >
                Assigned
                <span style={{ fontSize: 9, opacity: assignmentFilter === 'all' ? 0.4 : 1 }}>
                  {assignmentFilter === 'assigned' ? '▲' : assignmentFilter === 'unassigned' ? '▼' : '⇅'}
                </span>
              </button>
              <div>Contact</div><div>Stage</div>
            </div>

            {/* Body — loading/empty states live inside the grid shell */}
            {isLoading && allLeads.length === 0 ? (
              <div className="type-ui" style={{ color: 'var(--text-tertiary)', padding: 'var(--space-4)' }}>Loading leads…</div>
            ) : leads.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                <p style={{ marginBottom: '0.5rem', fontWeight: 500 }}>No leads found</p>
                <p style={{ fontSize: 13 }}>{searchQuery ? `No results for "${searchQuery}"` : 'Create your first lead to get started'}</p>
              </div>
            ) : (
            <>
            <div>
              {leads.map(lead => {
                const ss = STAGE_COLORS[lead.stage ?? 'NEW'] ?? STAGE_COLORS.NEW;
                const isChecked = selectedIds.has(lead.id);
                const recentlyWorked = lead.lastMeaningfulActivityAt
                  ? (Date.now() - new Date(lead.lastMeaningfulActivityAt).getTime()) < 86_400_000
                  : false;
                return (
                  <div key={lead.id} className="dense-row" onClick={() => setSelectedLead(lead)} style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 10, padding: '8px 12px', borderBottom: '1px solid var(--border-light)', fontSize: 13, alignItems: 'center', cursor: 'pointer', background: isChecked ? 'rgba(99,102,241,0.04)' : undefined }}>

                    {/* Checkbox */}
                    <div style={{ display: 'flex', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={isChecked} onChange={() => toggleSelect(lead.id)} style={{ width: 14, height: 14, accentColor: '#0f172a', cursor: 'pointer' }} aria-label={`Select ${lead.firstName} ${lead.lastName}`} />
                    </div>

                    {/* Primary + Secondary identity columns (swap based on org preference) */}
                    {companyFirst ? (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                          <div style={{ position: 'relative', flexShrink: 0 }}>
                            <div style={{ width: 22, height: 22, borderRadius: '4px', background: 'linear-gradient(135deg,#0f172a 0%,#334155 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>
                              {(lead.company?.[0] ?? '?').toUpperCase()}
                            </div>
                            {recentlyWorked && <span style={{ position: 'absolute', top: -2, right: -2, width: 5, height: 5, borderRadius: '50%', background: '#22c55e', border: '1px solid var(--bg-app)' }} title="Recently worked" />}
                          </div>
                          <span style={{ fontWeight: 500, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{lead.company || 'Unnamed'}</span>
                        </div>
                        <div style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', fontSize: 12 }}>
                          {lead.firstName} {lead.lastName}
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                          <div style={{ position: 'relative', flexShrink: 0 }}>
                            <div style={{ width: 22, height: 22, borderRadius: '4px', background: 'linear-gradient(135deg,#0f172a 0%,#334155 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>
                              {lead.firstName[0]}{lead.lastName[0]}
                            </div>
                            {recentlyWorked && <span style={{ position: 'absolute', top: -2, right: -2, width: 5, height: 5, borderRadius: '50%', background: '#22c55e', border: '1px solid var(--bg-app)' }} title="Recently worked" />}
                          </div>
                          <span style={{ fontWeight: 500, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{lead.firstName} {lead.lastName}</span>
                        </div>
                        <div style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', fontSize: 12 }}>
                          {lead.company || <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                        </div>
                      </>
                    )}

                    {/* Assigned */}
                    <div style={{ overflow: 'hidden' }}>
                      {lead.owner ? (
                        canImpersonate ? (
                          <button
                            style={{ background: 'rgba(99,102,241,0.08)', border: 'none', borderRadius: 3, padding: '1px 5px', fontSize: 12, color: impersonatingId === lead.owner.id ? 'var(--text-tertiary)' : 'var(--color-primary,#6366f1)', fontWeight: 500, cursor: impersonatingId ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', textAlign: 'left', fontFamily: 'inherit', opacity: impersonatingId && impersonatingId !== lead.owner.id ? 0.5 : 1 }}
                            title="View as this user"
                            aria-label={`Enter account of ${[lead.owner.firstName, lead.owner.lastName].filter(Boolean).join(' ')}`}
                            disabled={!!impersonatingId}
                            onClick={(e) => { e.stopPropagation(); handleImpersonate(lead.owner!.id); }}
                          >
                            {impersonatingId === lead.owner.id ? 'Entering…' : ([lead.owner.firstName, lead.owner.lastName].filter(Boolean).join(' ') || '—')}
                          </button>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                            {[lead.owner.firstName, lead.owner.lastName].filter(Boolean).join(' ') || '—'}
                          </span>
                        )
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>—</span>
                      )}
                    </div>

                    {/* Contact */}
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ color: 'var(--text-secondary)', fontSize: 12, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{lead.email || '—'}</div>
                      {lead.phone && <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{lead.phone}</div>}
                    </div>

                    {/* Stage */}
                    <div>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 6px', background: ss.bg, color: ss.text, borderRadius: 3, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>
                        {STAGE_LABELS[lead.stage ?? 'NEW']}
                      </span>
                    </div>

                  </div>
                );
              })}
              <style>{`.dense-row:hover { background-color: var(--bg-hover, rgba(0,0,0,0.02)) !important; }`}</style>
            </div>
            </>
            )}

            {/* LOAD MORE */}
            {hasMore && (
              <div style={{ padding: '16px 12px', display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={isFetching}
                  style={{
                    padding: '7px 20px',
                    borderRadius: 8,
                    border: '1px solid var(--border-medium)',
                    background: isFetching ? 'var(--bg-subtle)' : 'var(--bg-app)',
                    color: isFetching ? 'var(--text-tertiary)' : 'var(--text-secondary)',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: isFetching ? 'not-allowed' : 'pointer',
                    transition: 'all 120ms ease',
                  }}
                >
                  {isFetching ? 'Loading…' : `Load More (${totalCount - allLeads.length} remaining)`}
                </button>
              </div>
            )}
          </div>
      </div>

      {/* CONTEXT PANEL */}
      {/* Stays mounted under the Edit modal / delete confirm so closing them returns here,
          not to the dashboard. onClose is inert while an overlay is stacked above. */}
      <ContextPanel
        isOpen={!!selectedLead}
        onClose={() => { if (!modal && !deleteTarget) handleClosePanel(); }}
        width={480}
        hideCloseButton
      >
        {selectedLead && (
          <LeadDetailPanel
            lead={selectedLead}
            onEdit={() => setModal({ mode: 'edit', lead: selectedLead })}
            onDelete={() => setDeleteTarget(selectedLead)}
            onUpdated={(u) => setSelectedLead(prev => prev && prev.id === u.id ? { ...prev, ...u, owner: prev.owner } : prev)}
            onClose={handleClosePanel}
            showCaseId={selectedStage === 'QUALIFIED'}
          />
        )}
      </ContextPanel>

      {/* LEAD MODAL */}
      {modal && (
        <LeadModal
          mode={modal.mode}
          lead={modal.lead}
          onClose={() => setModal(null)}
          onSuccess={handleModalSuccess}
        />
      )}

      {/* DELETE CONFIRM */}
      {deleteTarget && (
        <DeleteConfirm
          lead={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          isDeleting={deleteMutation.isPending}
        />
      )}

      {/* BULK DELETE CONFIRM */}
      {bulkDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div onClick={() => setBulkDeleteConfirm(false)} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'relative', zIndex: 1, background: '#fff', borderRadius: '0.875rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)', padding: '1.5rem', width: '100%', maxWidth: '400px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.625rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={16} color="#dc2626" />
              </div>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' }}>Delete {selectedIds.size} Lead{selectedIds.size !== 1 ? 's' : ''}</h3>
            </div>
            <p style={{ fontSize: '0.8125rem', color: '#475569', marginBottom: '0.5rem', lineHeight: 1.5 }}>
              {selectedIds.size} lead{selectedIds.size !== 1 ? 's' : ''} will be moved to the Recycle Bin. You can restore them from there at any time.
            </p>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
              All data including custom fields, notes, and contacts will be preserved.
            </p>
            <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setBulkDeleteConfirm(false)} style={{ padding: '0.4375rem 1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => bulkDeleteMutation.mutate([...selectedIds])} disabled={bulkDeleteMutation.isPending} style={{ padding: '0.4375rem 1rem', borderRadius: '0.5rem', background: bulkDeleteMutation.isPending ? '#ef4444aa' : '#dc2626', color: '#fff', fontSize: '0.8125rem', fontWeight: 600, cursor: bulkDeleteMutation.isPending ? 'not-allowed' : 'pointer', border: 'none' }}>
                {bulkDeleteMutation.isPending ? 'Deleting…' : `Delete ${selectedIds.size} Lead${selectedIds.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT WIZARD */}
      {showImportWizard && (
        <LeadImportWizard onClose={() => setShowImportWizard(false)} fieldDefs={fieldDefs} />
      )}

      {/* ASSIGN MODAL */}
      {showAssignModal && (
        <LeadAssignModal
          selectedIds={selectedIds}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['leads'] });
            queryClient.invalidateQueries({ queryKey: ['lead-assignment-summary'] });
            toast.success('Leads assigned');
            setSelectedIds(new Set());
            setShowAssignModal(false);
          }}
          onClose={() => setShowAssignModal(false)}
        />
      )}
    </div>
  );
}
