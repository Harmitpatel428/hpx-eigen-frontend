import { useState, useCallback, useEffect, useMemo, memo, type CSSProperties } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Plus, ListFilter, ArrowDownToLine, ArrowUpFromLine,
  Phone, Mail, X, Edit2, Trash2,
  Building2, Calendar, MapPin,
  MessageCircle, Copy, Check, UserCheck,
} from 'lucide-react';
import type { Lead, LeadStage, LeadPriority, CustomFieldDef } from '../types';
import { leadService } from '../services/lead.service';
import { leadContactsService, LeadContact } from '../services/lead-contacts.service';
import { customFieldService } from '../services/custom-field.service';
import { crmSettingsService } from '../services/crm-settings.service';
import { ContextPanel } from '../components/layout/ContextPanel';
import { LeadModal } from '../components/leads/LeadModal';
import { LeadDetailPanel } from '../components/leads/LeadDetailPanel';
import { LeadImportWizard } from '../components/leads/LeadImportWizard';
import { LeadAssignModal } from '../components/leads/LeadAssignModal';
import { exportCSV } from '../utils/csv';

// ============================================================================
// HELPERS
// ============================================================================

const STAGE_LABELS: Record<LeadStage, string> = {
  NEW: 'New', CONTACTED: 'Contacted', QUALIFIED: 'Qualified',
  DISQUALIFIED: 'Disqualified', CONVERTED: 'Converted',
};

const STAGE_COLORS: Record<LeadStage, { bg: string; text: string; dot: string }> = {
  NEW:          { bg: 'rgba(99,102,241,0.1)',  text: '#6366f1', dot: '#6366f1' },
  CONTACTED:    { bg: 'rgba(245,158,11,0.1)', text: '#d97706', dot: '#d97706' },
  QUALIFIED:    { bg: 'rgba(16,185,129,0.1)', text: '#059669', dot: '#059669' },
  DISQUALIFIED: { bg: 'rgba(239,68,68,0.1)',  text: '#dc2626', dot: '#dc2626' },
  CONVERTED:    { bg: 'rgba(139,92,246,0.1)', text: '#7c3aed', dot: '#7c3aed' },
};

const PRIORITY_COLORS: Record<LeadPriority, { color: string; bg: string }> = {
  CRITICAL: { color: '#dc2626', bg: 'rgba(220,38,38,0.08)' },
  HIGH:     { color: '#ea580c', bg: 'rgba(234,88,12,0.08)'  },
  MEDIUM:   { color: '#2563eb', bg: 'rgba(37,99,235,0.08)'  },
  LOW:      { color: '#6b7280', bg: 'rgba(107,114,128,0.08)' },
};

function whatsappUrl(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits}`;
}

// ============================================================================
// DELETE CONFIRM
// ============================================================================

interface DeleteConfirmProps {
  lead: Lead;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

function DeleteConfirm({ lead, onConfirm, onCancel, isDeleting }: DeleteConfirmProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'relative', zIndex: 1, background: '#fff', borderRadius: '0.875rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)', padding: '1.5rem', width: '100%', maxWidth: '360px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.625rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trash2 size={16} color="#dc2626" />
          </div>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' }}>Delete Lead</h3>
        </div>
        <p style={{ fontSize: '0.8125rem', color: '#475569', marginBottom: '1.25rem', lineHeight: 1.5 }}>
          Delete <strong>{lead.firstName} {lead.lastName}</strong>? This soft-deletes the record.
        </p>
        <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '0.4375rem 1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
          <button onClick={onConfirm} disabled={isDeleting} style={{ padding: '0.4375rem 1rem', borderRadius: '0.5rem', background: isDeleting ? '#ef4444aa' : '#dc2626', color: '#fff', fontSize: '0.8125rem', fontWeight: 600, cursor: isDeleting ? 'not-allowed' : 'pointer', border: 'none' }}>
            {isDeleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export function LeadsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery]   = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [modal, setModal]               = useState<{ mode: 'create' | 'edit'; lead?: Lead } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const { data: leadsResponse, isLoading } = useQuery({
    queryKey: ['leads', { search: searchQuery }],
    queryFn: () => leadService.findAll({ search: searchQuery || undefined, pageSize: 100 }),
    staleTime: 30_000,
  });

  const { data: crmSettings } = useQuery({
    queryKey: ['crm-settings'],
    queryFn: () => crmSettingsService.get(),
    staleTime: 5 * 60 * 1000,
  });
  const companyFirst = crmSettings?.leadHeaderPreference === 'company';

  const { data: fieldDefs = [] } = useQuery<CustomFieldDef[]>({
    queryKey: ['custom-fields'],
    queryFn: () => customFieldService.list(),
    staleTime: 60_000,
  });

  const leads: Lead[] = leadsResponse?.data ?? [];
  const totalCount    = leadsResponse?.total ?? 0;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => leadService.softDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads-deleted'] });
      setDeleteTarget(null);
      setSelectedLead(null);
    },
  });

  const handleModalSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['leads'] });
    setModal(null);
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

  const buildExportRows = useCallback((source: Lead[]) => {
    const STATIC_HEADERS = [
      'First Name','Last Name','Email','Phone','Company',
      'Stage','Priority','Source',
      'Score','Expected Value','Owner ID','Tags',
      'Country','State','City','Area','Postal Code','Full Address',
      'Notes','Expected Close Date','Created Date',
    ];
    const cfHeaders = fieldDefs.map(f => f.name);
    const rows = source.map(l => {
      const stored: Array<{ fieldId: string; value: string | null }> =
        Array.isArray((l as any).customFieldValues) ? (l as any).customFieldValues : [];
      const tagStr = Array.isArray(l.tags) ? l.tags.map(t => t.name).join(', ') : '';
      const row: Record<string, unknown> = {
        'First Name': l.firstName, 'Last Name': l.lastName,
        'Email': l.email ?? '', 'Phone': l.phone ?? '', 'Company': l.company ?? '',
        'Stage': l.stage ?? '', 'Priority': l.priority ?? '', 'Source': l.source ?? '',
        'Score': l.score ?? '', 'Expected Value': l.expectedValue ?? '',
        'Owner ID': l.ownerId ?? '', 'Tags': tagStr,
        'Country': l.country ?? '', 'State': l.state ?? '', 'City': l.city ?? '',
        'Area': l.area ?? '', 'Postal Code': l.postalCode ?? '',
        'Full Address': (l as any).freeformAddress ?? '',
        'Notes': l.notes ?? '',
        'Expected Close Date': fmtExportDate(l.expectedCloseDate),
        'Created Date': fmtExportDate(l.createdAt),
      };
      fieldDefs.forEach(f => {
        const v = stored.find(sv => sv.fieldId === f.id);
        row[f.name] = v?.value ?? '';
      });
      return row;
    });
    return { headers: [...STATIC_HEADERS, ...cfHeaders], rows };
  }, [fieldDefs]);

  const handleExport = useCallback(() => {
    const { headers, rows } = buildExportRows(leads);
    exportCSV('leads-export', headers, rows);
  }, [leads, buildExportRows]);

  const handleExportSelected = useCallback(() => {
    const selected = leads.filter(l => selectedIds.has(l.id));
    if (selected.length === 0) return;
    const { headers, rows } = buildExportRows(selected);
    exportCSV('leads-selected-export', headers, rows);
  }, [leads, selectedIds, buildExportRows]);

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => leadService.bulkDelete(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads-deleted'] });
      setSelectedIds(new Set());
      setBulkDeleteConfirm(false);
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

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="type-title">Leads</h1>
          <p className="type-body">
            {isLoading ? 'Loading…' : `${totalCount} total · ${leads.filter(l => l.status === 'NEW').length} new`}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <div style={{ position: 'relative', width: 240 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input className="input" placeholder="Search leads…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ paddingLeft: 30, height: 28, fontSize: 13, backgroundColor: 'transparent', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)' }} />
          </div>
          <button className="btn-ghost" style={{ height: 28, padding: '0 8px', fontSize: 13, color: 'var(--text-secondary)' }}><ListFilter size={14} style={{ marginRight: 4 }} /> Filters</button>
          <button className="btn-ghost" style={{ height: 28, padding: '0 8px', fontSize: 13, color: 'var(--text-secondary)' }} onClick={() => setShowImportWizard(true)}><ArrowDownToLine size={14} style={{ marginRight: 4 }} /> Import</button>
          <button className="btn-ghost" style={{ height: 28, padding: '0 8px', fontSize: 13, color: 'var(--text-secondary)' }} onClick={handleExport}><ArrowUpFromLine size={14} style={{ marginRight: 4 }} /> Export</button>
          <div style={{ width: 1, height: 16, backgroundColor: 'var(--border-medium)', margin: '0 4px' }} />
          <button className="btn btn-primary" style={{ height: 28, padding: '0 12px', fontSize: 13, borderRadius: 'var(--radius-sm)' }} onClick={() => setModal({ mode: 'create' })}>
            <Plus size={14} style={{ marginRight: 4 }} /> New Lead
          </button>
        </div>
      </div>

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
          <button className="btn-ghost" style={{ height: 26, padding: '0 10px', fontSize: 12, color: 'var(--text-secondary)' }} onClick={handleExportSelected}>
            <ArrowUpFromLine size={12} style={{ marginRight: 4 }} /> Export Selected
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn-ghost" style={{ height: 26, padding: '0 10px', fontSize: 12, color: 'var(--text-tertiary)' }} onClick={() => setSelectedIds(new Set())}>
            <X size={12} style={{ marginRight: 4 }} /> Clear
          </button>
        </div>
      )}

      {/* DATA GRID */}
      <div style={{ flex: 1, overflow: 'auto', marginRight: 'calc(var(--space-4) * -1)', paddingRight: 'var(--space-4)' }}>
        {isLoading ? (
          <div className="type-ui" style={{ color: 'var(--text-tertiary)', padding: 'var(--space-4)' }}>Loading leads…</div>
        ) : leads.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
            <p style={{ marginBottom: '0.5rem', fontWeight: 500 }}>No leads found</p>
            <p style={{ fontSize: 13 }}>{searchQuery ? `No results for "${searchQuery}"` : 'Create your first lead to get started'}</p>
          </div>
        ) : (
          <div style={{ minWidth: 1300 }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '32px minmax(180px,1fr) 130px 190px 90px 100px 110px 120px', gap: 10, padding: '7px 12px', borderBottom: '1px solid var(--border-strong)', position: 'sticky', top: 0, backgroundColor: 'var(--bg-app)', zIndex: 10, fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} style={{ width: 14, height: 14, accentColor: '#0f172a', cursor: 'pointer' }} aria-label="Select all leads" />
              </div>
              {companyFirst
                ? <><div>Company</div><div>Lead</div></>
                : <><div>Lead</div><div>Company</div></>
              }
              <div>Contact</div><div>Stage</div><div>Priority</div><div>Close Date</div><div>Actions</div>
            </div>

            {/* Rows */}
            <div>
              {leads.map(lead => {
                const ss = STAGE_COLORS[lead.stage ?? 'NEW'] ?? STAGE_COLORS.NEW;
                const ps = PRIORITY_COLORS[lead.priority ?? 'MEDIUM'] ?? PRIORITY_COLORS.MEDIUM;
                const isChecked = selectedIds.has(lead.id);
                return (
                  <div key={lead.id} className="dense-row" onClick={() => setSelectedLead(lead)} style={{ display: 'grid', gridTemplateColumns: '32px minmax(180px,1fr) 130px 190px 90px 100px 110px 120px', gap: 10, padding: '7px 12px', borderBottom: '1px solid var(--border-light)', fontSize: 13, alignItems: 'center', cursor: 'pointer', background: isChecked ? 'rgba(99,102,241,0.04)' : undefined }}>

                    {/* Checkbox */}
                    <div style={{ display: 'flex', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={isChecked} onChange={() => toggleSelect(lead.id)} style={{ width: 14, height: 14, accentColor: '#0f172a', cursor: 'pointer' }} aria-label={`Select ${lead.firstName} ${lead.lastName}`} />
                    </div>

                    {/* Primary + Secondary identity columns (swap based on org preference) */}
                    {companyFirst ? (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                          <div style={{ width: 22, height: 22, borderRadius: '4px', background: 'linear-gradient(135deg,#0f172a 0%,#334155 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
                            {(lead.company?.[0] ?? '?').toUpperCase()}
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
                          <div style={{ width: 22, height: 22, borderRadius: '4px', background: 'linear-gradient(135deg,#0f172a 0%,#334155 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
                            {lead.firstName[0]}{lead.lastName[0]}
                          </div>
                          <span style={{ fontWeight: 500, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{lead.firstName} {lead.lastName}</span>
                        </div>
                        <div style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', fontSize: 12 }}>
                          {lead.company || <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                        </div>
                      </>
                    )}

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

                    {/* Priority */}
                    <div>
                      <span style={{ display: 'inline-block', padding: '2px 6px', background: ps.bg, color: ps.color, borderRadius: 3, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                        {lead.priority ?? 'MEDIUM'}
                      </span>
                    </div>

                    {/* Close Date */}
                    <div style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>
                      {lead.expectedCloseDate
                        ? new Date(lead.expectedCloseDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                        : <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                      }
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 3 }} onClick={e => e.stopPropagation()}>
                      <button className="btn-ghost" style={{ width: 26, height: 26, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Edit" onClick={() => setModal({ mode: 'edit', lead })}>
                        <Edit2 size={12} />
                      </button>
                      <button className="btn-ghost" style={{ width: 26, height: 26, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-error, #dc2626)' }} title="Delete" onClick={() => setDeleteTarget(lead)}>
                        <Trash2 size={12} />
                      </button>
                      <button className="btn-ghost" style={{ width: 26, height: 26, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Call" onClick={() => lead.phone && window.open(`tel:${lead.phone}`)}>
                        <Phone size={12} />
                      </button>
                      <button className="btn-ghost" style={{ width: 26, height: 26, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Email" onClick={() => lead.email && window.open(`mailto:${lead.email}`)}>
                        <Mail size={12} />
                      </button>
                      {lead.phone && (
                        <button className="btn-ghost" style={{ width: 26, height: 26, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }} title="WhatsApp" onClick={() => window.open(whatsappUrl(lead.phone!), '_blank')}>
                          <MessageCircle size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              <style>{`.dense-row:hover { background-color: var(--bg-hover, rgba(0,0,0,0.02)) !important; }`}</style>
            </div>
          </div>
        )}
      </div>

      {/* CONTEXT PANEL */}
      <ContextPanel isOpen={!!selectedLead} onClose={handleClosePanel} width={480} hideCloseButton>
        {selectedLead && (
          <LeadDetailPanel
            lead={selectedLead}
            onEdit={() => { setModal({ mode: 'edit', lead: selectedLead }); setSelectedLead(null); }}
            onDelete={() => { setDeleteTarget(selectedLead); setSelectedLead(null); }}
            onClose={handleClosePanel}
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
            setSelectedIds(new Set());
            setShowAssignModal(false);
          }}
          onClose={() => setShowAssignModal(false)}
        />
      )}
    </div>
  );
}
