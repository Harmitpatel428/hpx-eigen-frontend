import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search, ChevronRight, X, Building2, User, Phone, Mail, ArrowRight,
  FileText, Clock, UserCheck, Loader2, MapPin,
} from 'lucide-react';
import { toast } from '../components/notifications/notify';
import { useAuth } from '../auth/context/AuthContext';
import { Modal } from '../components/Modal';
import { ContextPanel } from '../components/layout/ContextPanel';
import { processService, processKeys } from '../services/process.service';
import { userService } from '../services/user.service';
import { extractApiError } from '../utils/extractApiError';
import { resolveDisplayContact, displayName } from '../utils/crm';
import { PROCESS_RETURN_REASON_LABELS } from '../types';
import type { DocCase, ProcessReturnReason, DocDocumentStatus } from '../types';

// Process-relevant case statuses that count as "incoming to Process" — these rows
// get inline Accept / Return, mirroring the Documentation incoming queue.
const PROCESS_INCOMING_STATUSES = ['TRANSFERRED_TO_PROCESS', 'PENDING_PROCESS_REVIEW'];

// ─── Status badge (copy-adapted from DocumentationPage CASE_STATUS_META) ───────
const CASE_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  INCOMING:                  { label: 'Incoming',           color: '#d97706', bg: 'rgba(245,158,11,0.1)' },
  ACTIVE:                    { label: 'Active',             color: '#2563eb', bg: 'rgba(37,99,235,0.1)'  },
  RETURNED:                  { label: 'Returned',           color: '#dc2626', bg: 'rgba(220,38,38,0.1)'  },
  DOCUMENTATION_READY:       { label: 'Ready',              color: '#059669', bg: 'rgba(5,150,105,0.1)'  },
  TRANSFERRED_TO_PROCESS:    { label: 'Transferred',        color: '#475569', bg: 'rgba(71,85,105,0.1)'  },
  PENDING_PROCESS_REVIEW:    { label: 'Pending Process',    color: '#475569', bg: 'rgba(71,85,105,0.1)'  },
  RETURNED_TO_DOCUMENTATION: { label: 'Returned by Process', color: '#d97706', bg: 'rgba(217,119,6,0.1)' },
  CLOSED:                    { label: 'Closed',             color: '#9ca3af', bg: 'rgba(156,163,175,0.1)'},
  CANCELLED:                 { label: 'Cancelled',          color: '#dc2626', bg: 'rgba(220,38,38,0.1)'  },
  CLOSED_NO_DOCS:            { label: 'Closed No Docs',     color: '#6b7280', bg: 'rgba(107,114,128,0.1)'},
};

const DOC_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  REQUESTED:          { label: 'Requested',          color: '#2563eb', bg: 'rgba(37,99,235,0.1)' },
  PENDING_COLLECTION: { label: 'Collection Pending', color: '#d97706', bg: 'rgba(245,158,11,0.1)' },
  RECEIVED:           { label: 'Received',           color: '#2563eb', bg: 'rgba(37,99,235,0.1)' },
  UNDER_VERIFICATION: { label: 'Under Verification', color: '#475569', bg: 'rgba(71,85,105,0.1)' },
  APPROVED:           { label: 'Approved',           color: '#059669', bg: 'rgba(5,150,105,0.1)' },
  MANAGER_APPROVED:   { label: 'Manager Approved',   color: '#059669', bg: 'rgba(5,150,105,0.1)' },
  REJECTED:           { label: 'Rejected',           color: '#dc2626', bg: 'rgba(220,38,38,0.1)' },
  RE_REQUESTED:       { label: 'Re-Requested',       color: '#ea580c', bg: 'rgba(234,88,12,0.1)' },
  EXPIRED:            { label: 'Expired',            color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' },
  NOT_APPLICABLE:     { label: 'N/A',                color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' },
  WAIVED:             { label: 'Waived',             color: '#0891b2', bg: 'rgba(8,145,178,0.1)' },
};

function CaseBadge({ status }: { status: string }) {
  const m = CASE_STATUS_META[status] ?? CASE_STATUS_META.ACTIVE;
  return (
    <span style={{
      display: 'inline-block', padding: '2px 6px', borderRadius: 3,
      fontSize: 10, fontWeight: 600, background: m.bg, color: m.color,
      textTransform: 'uppercase', letterSpacing: '0.02em', whiteSpace: 'nowrap',
    }}>
      {m.label}
    </span>
  );
}

function DocStatusChip({ status }: { status: DocDocumentStatus }) {
  const m = DOC_STATUS_META[status] ?? { label: status, color: '#6b7280', bg: 'rgba(107,114,128,0.1)' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 7px',
      borderRadius: 'var(--radius-full)', fontSize: 10, fontWeight: 600, background: m.bg, color: m.color, flexShrink: 0,
    }}>
      {m.label}
    </span>
  );
}

function initials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
}
function Avatar({ first, last }: { first: string; last: string }) {
  return (
    <div style={{
      width: 22, height: 22, borderRadius: 4, flexShrink: 0,
      background: 'linear-gradient(135deg,#1e293b 0%,#334155 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 9, fontWeight: 700, color: '#fff',
    }}>
      {initials(first, last)}
    </div>
  );
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const assignedName = (c: DocCase) =>
  [c.assignedUser?.firstName, c.assignedUser?.lastName].filter(Boolean).join(' ') || c.assignedUser?.emailHandle || '—';

// ─── Return dialog ────────────────────────────────────────────────────────────
// Client-side mirror of the server's checkReturnReason: OTHER requires a note.
export function ReturnToDocumentationDialog({
  docCase, onClose, onConfirm, submitting,
}: {
  docCase: DocCase;
  onClose: () => void;
  onConfirm: (reasonCode: ProcessReturnReason, note: string) => void;
  submitting: boolean;
}) {
  const [reason, setReason] = useState<ProcessReturnReason>('MISSING_DOCUMENT');
  const [note, setNote] = useState('');
  const noteRequired = reason === 'OTHER';

  return (
    <Modal isOpen onClose={onClose} title="Return to Documentation" size="sm">
      <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 'var(--space-4)' }}>
        Case {docCase.caseNumber ?? docCase.id} goes back to the Documentation team for correction.
      </p>
      <div style={{ marginBottom: 'var(--space-3)' }}>
        <label htmlFor="process-return-reason" style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Reason</label>
        <select id="process-return-reason" className="input" style={{ width: '100%' }} value={reason}
          onChange={e => setReason(e.target.value as ProcessReturnReason)}>
          {Object.entries(PROCESS_RETURN_REASON_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <label htmlFor="process-return-note" style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
          Note {noteRequired && <span style={{ color: '#dc2626' }}>*</span>}
        </label>
        <textarea id="process-return-note" className="input" rows={3} style={{ width: '100%', resize: 'vertical' }}
          value={note} onChange={e => setNote(e.target.value)} placeholder="Describe the issue…" />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button type="button" className="btn"
          style={{
            background: '#d97706', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            opacity: (noteRequired && !note.trim()) || submitting ? 0.5 : 1,
          }}
          disabled={(noteRequired && !note.trim()) || submitting}
          onClick={() => onConfirm(reason, note.trim())}>
          {submitting ? 'Returning…' : 'Return to Documentation'}
        </button>
      </div>
    </Modal>
  );
}

// ─── Assignee picker ──────────────────────────────────────────────────────────
// Simple single-select over tenant users → POST /cases/:id/assign. The shared
// LeadAssignModal only supports a DOCUMENTATION context (writes Lead.ownerId), so
// Process gets its own thin modal that hits the frozen assign endpoint directly.
function AssigneeSelectModal({ docCase, onClose, onAssigned }: {
  docCase: DocCase; onClose: () => void; onAssigned: () => void;
}) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(docCase.assignedUser?.id ?? null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => userService.listAll(),
    staleTime: 60_000,
  });
  const active = users.filter(u => u.status === 'ACTIVE');
  const filtered = search.trim()
    ? active.filter(u => `${u.firstName ?? ''} ${u.lastName ?? ''} ${u.email}`.toLowerCase().includes(search.toLowerCase()))
    : active;

  const assignMut = useMutation({
    mutationFn: (userId: string) => processService.assignCase(docCase.id, userId),
    onSuccess: () => { toast.success('Case assigned'); onAssigned(); },
    onError: (err) => toast.error(extractApiError(err).message),
  });

  return (
    <Modal isOpen onClose={onClose} title="Assign case" size="sm">
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
        <input autoFocus className="input" style={{ width: '100%', paddingLeft: 30 }} placeholder="Search employees…"
          value={search} onChange={e => setSearch(e.target.value)} aria-label="Search employees" />
      </div>
      <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid var(--border-light)', borderRadius: 8, marginBottom: 12 }}>
        {isLoading ? (
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', padding: 16, textAlign: 'center' }}>Loading users…</p>
        ) : filtered.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', padding: 16, textAlign: 'center' }}>No active employees found.</p>
        ) : filtered.map(u => {
          const sel = selectedId === u.id;
          return (
            <button key={u.id} type="button" onClick={() => setSelectedId(u.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', border: 'none',
                borderBottom: '1px solid var(--border-light)', cursor: 'pointer', textAlign: 'left',
                background: sel ? 'rgba(37,99,235,0.08)' : 'transparent',
              }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName(u)}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
              </div>
              {sel && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb', flexShrink: 0 }} />}
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          disabled={!selectedId || assignMut.isPending}
          onClick={() => selectedId && assignMut.mutate(selectedId)}>
          {assignMut.isPending ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <UserCheck size={13} />}
          {assignMut.isPending ? 'Assigning…' : 'Assign'}
        </button>
      </div>
    </Modal>
  );
}

// ─── Case detail panel (ContextPanel) ─────────────────────────────────────────
type DetailTab = 'overview' | 'timeline' | 'requirements' | 'documents' | 'notes' | 'activities';

function ProcessCaseDetailPanel({ caseId, onClose }: { caseId: string; onClose: () => void }) {
  const { permissions } = useAuth();
  const [tab, setTab] = useState<DetailTab>('overview');
  const [showAssign, setShowAssign] = useState(false);
  const qc = useQueryClient();

  const { data: docCase, isLoading } = useQuery({
    queryKey: processKeys.case(caseId),
    queryFn: () => processService.getCase(caseId),
    staleTime: 10_000,
  });

  const canAssign = permissions.can('process:assign');

  if (isLoading || !docCase) {
    return (
      <div style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />
      </div>
    );
  }

  const sm = CASE_STATUS_META[docCase.status] ?? CASE_STATUS_META.ACTIVE;
  const companyName = docCase.lead.company || 'Company not set';
  const personName = `${docCase.lead.firstName} ${docCase.lead.lastName}`.trim();
  const contact = resolveDisplayContact(docCase.lead, []);
  const requirements = docCase.documents ?? [];
  const uploaded = docCase.uploadedDocuments ?? [];
  const notes = docCase.caseNotes ?? [];
  const events = docCase.events ?? [];

  const TABS: DetailTab[] = ['overview', 'timeline', 'requirements', 'documents', 'notes', 'activities'];
  const tabLabel = (t: DetailTab) =>
    t === 'overview' ? 'Overview'
    : t === 'timeline' ? 'Timeline'
    : t === 'requirements' ? `Requirements (${requirements.length})`
    : t === 'documents' ? `Documents (${uploaded.length})`
    : t === 'notes' ? 'Notes'
    : 'Activities';

  const infoRow = (icon: React.ReactNode, label: string, value: React.ReactNode) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--text-secondary)', padding: '4px 0' }}>
      <span style={{ color: 'var(--text-tertiary)', flexShrink: 0, marginTop: 1, display: 'flex' }}>{icon}</span>
      <span style={{ color: 'var(--text-tertiary)', minWidth: 110, flexShrink: 0 }}>{label}</span>
      <span style={{ color: 'var(--text-primary)', minWidth: 0, wordBreak: 'break-word' }}>{value}</span>
    </div>
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: 'var(--space-6) var(--space-6) 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minWidth: 0 }}>
          <Building2 size={20} style={{ flexShrink: 0, color: 'var(--text-tertiary)' }} />
          <h2 title={companyName} className="type-h1" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
            {companyName}
          </h2>
          <span style={{
            display: 'inline-flex', alignItems: 'center', flexShrink: 0, padding: '2px 10px',
            borderRadius: 'var(--radius-full)', fontSize: 'var(--text-micro)', fontWeight: 600, background: sm.bg, color: sm.color,
          }}>{sm.label}</span>
          <button onClick={onClose} aria-label="Close panel" className="btn-icon" style={{ marginLeft: 'auto', flexShrink: 0, width: 32, height: 32 }}>
            <X size={18} />
          </button>
        </div>
        {personName && (
          <div title={personName} style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 'var(--space-1)', paddingLeft: 'var(--space-8)' }}>
            {personName}
          </div>
        )}
        {docCase.caseNumber && (
          <div style={{ marginTop: 'var(--space-1)', paddingLeft: 'var(--space-8)', marginBottom: 'var(--space-4)' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 'var(--text-micro)', fontWeight: 600, letterSpacing: '0.04em', color: 'var(--text-tertiary)' }}>
              {docCase.caseNumber}
            </span>
          </div>
        )}

        {/* Tabs */}
        <div role="tablist" aria-label="Case sections" style={{ display: 'flex', borderBottom: '1px solid var(--border-medium)', marginTop: 'var(--space-3)', overflowX: 'auto' }}>
          {TABS.map(t => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
              style={{
                padding: 'var(--space-3)', fontSize: 'var(--text-xs)', fontWeight: tab === t ? 600 : 450,
                color: tab === t ? 'var(--text-primary)' : 'var(--text-tertiary)', background: 'none', border: 'none',
                cursor: 'pointer', whiteSpace: 'nowrap',
                borderBottom: tab === t ? '2px solid var(--text-primary)' : '2px solid transparent', marginBottom: -1,
              }}>
              {tabLabel(t)}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-6)' }}>
        {tab === 'overview' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
              <h3 className="type-ui" style={{ fontWeight: 600 }}>Case details</h3>
              {canAssign && (
                <button type="button" className="btn btn-secondary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={() => setShowAssign(true)}>
                  <UserCheck size={14} /> Assign
                </button>
              )}
            </div>
            <div className="surface" style={{ padding: 'var(--space-4) var(--space-6)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)' }}>
              {infoRow(<Building2 size={14} />, 'Company', companyName)}
              {personName && infoRow(<User size={14} />, 'Contact', personName)}
              {contact.phone && infoRow(<Phone size={14} />, 'Phone', <a href={`tel:${contact.phone}`} style={{ color: 'var(--text-primary)' }}>{contact.phone}</a>)}
              {contact.email && infoRow(<Mail size={14} />, 'Email', <a href={`mailto:${contact.email}`} style={{ color: 'var(--text-primary)' }}>{contact.email}</a>)}
              {infoRow(<MapPin size={14} />, 'Case type', docCase.caseType?.name ?? docCase.preset?.name ?? '—')}
              {infoRow(<UserCheck size={14} />, 'Assigned', assignedName(docCase))}
            </div>

            {/* Process handoff state */}
            <h3 className="type-ui" style={{ fontWeight: 600, marginBottom: 'var(--space-3)' }}>Process handoff</h3>
            <div className="surface" style={{ padding: 'var(--space-4) var(--space-6)', borderRadius: 'var(--radius-md)' }}>
              {infoRow(<ArrowRight size={14} />, 'Status', <CaseBadge status={docCase.status} />)}
              {infoRow(<Clock size={14} />, 'Transferred', docCase.processHandoffAt ? new Date(docCase.processHandoffAt).toLocaleString() : '—')}
              {infoRow(<User size={14} />, 'Handed off by', docCase.processHandoffByName ?? docCase.processHandoffBy ?? '—')}
              {docCase.handoverRemarks && infoRow(<FileText size={14} />, 'Remarks', docCase.handoverRemarks)}
              {docCase.processReturnReasonCode && infoRow(<ArrowRight size={14} />, 'Return reason',
                `${PROCESS_RETURN_REASON_LABELS[docCase.processReturnReasonCode]}${docCase.processReturnReasonNote ? ` — ${docCase.processReturnReasonNote}` : ''}`)}
            </div>
          </div>
        )}

        {tab === 'timeline' && (
          <div>
            <h3 className="type-ui" style={{ fontWeight: 600, marginBottom: 'var(--space-3)' }}>Timeline</h3>
            {events.length === 0 ? (
              <div className="surface" style={{ textAlign: 'center', padding: 'var(--space-8) 0', borderRadius: 'var(--radius-md)', color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' }}>No events yet</div>
            ) : (
              <div className="surface" style={{ padding: 'var(--space-4) var(--space-6)', borderRadius: 'var(--radius-md)' }}>
                {events.map(ev => (
                  <div key={ev.id} style={{ marginBottom: 14, paddingLeft: 14, borderLeft: '2px solid var(--border-medium)' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {ev.eventType.charAt(0) + ev.eventType.slice(1).toLowerCase().replace(/_/g, ' ')}
                    </div>
                    {ev.remarks && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{ev.remarks}</div>}
                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>{relativeTime(ev.createdAt)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'requirements' && (
          <div>
            <h3 className="type-ui" style={{ fontWeight: 600, marginBottom: 'var(--space-3)' }}>Requirements</h3>
            {requirements.length === 0 ? (
              <div className="surface" style={{ textAlign: 'center', padding: 'var(--space-8) 0', borderRadius: 'var(--radius-md)', color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' }}>No requirements</div>
            ) : requirements.map(d => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid var(--border-light)', borderRadius: 8, marginBottom: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: d.isMandatory ? '#dc2626' : '#9ca3af' }} title={d.isMandatory ? 'Mandatory' : 'Optional'} />
                <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</span>
                <DocStatusChip status={d.status} />
              </div>
            ))}
          </div>
        )}

        {tab === 'documents' && (
          <div>
            <h3 className="type-ui" style={{ fontWeight: 600, marginBottom: 'var(--space-3)' }}>Documents</h3>
            {uploaded.length === 0 ? (
              <div className="surface" style={{ textAlign: 'center', padding: 'var(--space-8) 0', borderRadius: 'var(--radius-md)', color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' }}>No uploaded documents</div>
            ) : uploaded.map(f => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--bg-subtle)', borderRadius: 8, marginBottom: 4 }}>
                <FileText size={13} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</span>
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{f.status}</span>
              </div>
            ))}
          </div>
        )}

        {tab === 'notes' && (
          <div>
            <h3 className="type-ui" style={{ fontWeight: 600, marginBottom: 'var(--space-3)' }}>Notes</h3>
            {notes.length === 0 ? (
              <div className="surface" style={{ textAlign: 'center', padding: 'var(--space-8) 0', borderRadius: 'var(--radius-md)', color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' }}>No notes</div>
            ) : notes.map(n => (
              <div key={n.id} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: n.noteType === 'CUSTOMER' ? '#111827' : '#475569' }}>
                    {n.noteType === 'CUSTOMER' ? 'Client-visible' : 'Internal'}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{relativeTime(n.createdAt)}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5, padding: '8px 12px', background: 'var(--bg-subtle)', borderRadius: 8 }}>{n.content}</div>
              </div>
            ))}
          </div>
        )}

        {tab === 'activities' && (
          <div className="surface" style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-6)', borderRadius: 'var(--radius-md)', color: 'var(--text-tertiary)' }}>
            <Clock size={28} style={{ opacity: 0.3, marginBottom: 10 }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Activities coming in a later slice</div>
            {/* ponytail: no Process activities endpoint in the frozen contract; the shared
                ActivitiesView adapter needs list/complete/create endpoints that don't exist
                for Process yet. Wire processActivitiesAdapter once the backend ships them. */}
            <div style={{ fontSize: 12 }}>Case activity tracking for the Process department is not available yet.</div>
          </div>
        )}
      </div>

      {showAssign && (
        <AssigneeSelectModal
          docCase={docCase}
          onClose={() => setShowAssign(false)}
          onAssigned={() => {
            setShowAssign(false);
            qc.invalidateQueries({ queryKey: processKeys.case(caseId) });
            qc.invalidateQueries({ queryKey: ['process-cases'] });
          }}
        />
      )}
    </div>
  );
}

// ─── KPI tile ─────────────────────────────────────────────────────────────────
const Tile: React.FC<{ label: string; value: number | string }> = ({ label, value }) => (
  <div data-testid={`kpi-${label.toLowerCase()}`} className="surface-elevated" style={{ padding: 'var(--space-4)', minWidth: 130, borderRadius: 'var(--radius-xl)' }}>
    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600 }}>{label}</div>
    <div style={{ fontSize: 26, fontWeight: 800 }}>{value}</div>
  </div>
);

// ─── Dense case row ───────────────────────────────────────────────────────────
const CASE_GRID = 'minmax(200px,1.8fr) minmax(130px,1fr) minmax(120px,1fr) 160px';

function CaseRow({ docCase, onOpen, actions }: { docCase: DocCase; onOpen: () => void; actions: React.ReactNode }) {
  return (
    <div className="dense-row" onClick={onOpen}
      style={{
        display: 'grid', gridTemplateColumns: CASE_GRID, alignItems: 'center', gap: 12,
        cursor: 'pointer', padding: '8px 12px', borderBottom: '1px solid var(--border-light)',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <Avatar first={docCase.lead.firstName} last={docCase.lead.lastName} />
        <div style={{ minWidth: 0 }}>
          <div title={docCase.lead.company ?? undefined} style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {docCase.lead.company || 'Company not set'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {docCase.lead.firstName} {docCase.lead.lastName}{docCase.caseNumber ? ` · ${docCase.caseNumber}` : ''}
          </div>
        </div>
      </div>
      <div><CaseBadge status={docCase.status} /></div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
        {assignedName(docCase)}
      </div>
      <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
        {actions}
        <ChevronRight size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
      </div>
    </div>
  );
}

// ─── Status filter pills — buckets match the counts/dashboard keys ────────────
const PILL_DEFS: { key: string; label: string; countKey?: 'incoming' | 'processing' | 'returned' | 'overdue' }[] = [
  { key: '',           label: 'All Cases' },
  { key: 'incoming',   label: 'Incoming',   countKey: 'incoming' },
  { key: 'processing', label: 'Processing', countKey: 'processing' },
  { key: 'returned',   label: 'Returned',   countKey: 'returned' },
  { key: 'overdue',    label: 'Overdue',    countKey: 'overdue' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export const ProcessQueuePage: React.FC = () => {
  const { permissions } = useAuth();
  const qc = useQueryClient();
  const [returning, setReturning] = useState<DocCase | null>(null);
  const [statusBucket, setStatusBucket] = useState('');
  const [rawSearch, setRawSearch] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  // 400ms debounce — matches Documentation / Leads pages.
  useEffect(() => {
    const t = setTimeout(() => setSearch(rawSearch), 400);
    return () => clearTimeout(t);
  }, [rawSearch]);

  const { data: queue, isLoading, isError, error } = useQuery({
    queryKey: processKeys.cases({ status: statusBucket || undefined, search: search || undefined }),
    queryFn: () => processService.listCases({ status: statusBucket || undefined, search: search || undefined, pageSize: 50 }),
    staleTime: 15_000,
  });
  const cases = queue?.cases ?? [];

  // KPI tiles + pill badges from the dedicated dashboard endpoint (single source).
  const { data: dash, isError: dashError } = useQuery({
    queryKey: processKeys.dashboard(),
    queryFn: () => processService.getDashboard(),
    staleTime: 30_000,
  });
  const counts = dash;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['process-cases'] });
    qc.invalidateQueries({ queryKey: processKeys.dashboard() });
  };

  const acceptMut = useMutation({
    mutationFn: (id: string) => processService.accept(id),
    onSuccess: () => { toast.success('Case accepted'); invalidate(); },
    onError: (err) => { toast.error(extractApiError(err).message); invalidate(); },
  });

  const returnMut = useMutation({
    mutationFn: (v: { id: string; reasonCode: ProcessReturnReason; note: string }) =>
      processService.returnToDocumentation(v.id, v.reasonCode, v.note),
    onSuccess: () => { toast.success('Case returned to Documentation'); setReturning(null); invalidate(); },
    onError: (err) => { toast.error(extractApiError(err).message); invalidate(); },
  });

  const canAccept = permissions.can('process:accept');
  const canReturn = permissions.can('process:return');

  const rowActions = (c: DocCase) => {
    if (!PROCESS_INCOMING_STATUSES.includes(c.status)) return null;
    return (
      <>
        {canAccept && (
          <button type="button" className="btn btn-primary" style={{ height: 24, paddingInline: 10, fontSize: 12 }}
            disabled={acceptMut.isPending} onClick={() => acceptMut.mutate(c.id)}>
            Accept
          </button>
        )}
        {canReturn && (
          <button type="button" className="btn btn-ghost" style={{ height: 24, paddingInline: 10, fontSize: 12 }}
            onClick={() => setReturning(c)}>
            Return
          </button>
        )}
      </>
    );
  };

  return (
    <div style={{ padding: 'var(--space-8)' }}>
      <h1 className="type-title" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 'var(--space-5)' }}>
        Process
      </h1>

      {/* KPI tiles */}
      <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
        <Tile label="Incoming"   value={dashError ? '—' : counts?.incoming ?? 0} />
        <Tile label="Processing" value={dashError ? '—' : counts?.processing ?? 0} />
        <Tile label="Returned"   value={dashError ? '—' : counts?.returned ?? 0} />
        <Tile label="Overdue"    value={dashError ? '—' : counts?.overdue ?? 0} />
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 6, padding: 6, marginBottom: 'var(--space-4)', overflowX: 'auto' }}>
        {PILL_DEFS.map(pill => {
          const active = statusBucket === pill.key;
          const count = pill.countKey ? counts?.[pill.countKey] ?? 0 : undefined;
          return (
            <button key={pill.key} type="button" aria-pressed={active}
              onClick={() => setStatusBucket(active ? '' : pill.key)}
              className={`stage-pill${active ? ' stage-pill--active' : ''}`}>
              <span className="stage-pill-dot" />
              {pill.label}
              {count !== undefined && count > 0 && <span className="stage-pill-count">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 'var(--space-3)', position: 'relative', width: 220 }}>
        <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
        <input className="input" style={{ width: '100%', paddingLeft: 30, height: 28, fontSize: 13 }}
          placeholder="Search cases…" value={rawSearch} onChange={e => setRawSearch(e.target.value)} aria-label="Search process cases" />
      </div>

      {/* List header */}
      <div style={{ display: 'grid', gridTemplateColumns: CASE_GRID, gap: 12, padding: '6px 12px', borderBottom: '1px solid var(--border-medium)' }}>
        {['Lead', 'Status', 'Assigned', ''].map((h, i) => (
          <div key={i} style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--text-tertiary)', textAlign: i === 3 ? 'right' : 'left' }}>{h}</div>
        ))}
      </div>

      {isLoading ? (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900 mx-auto" />
        </div>
      ) : isError ? (
        <p role="alert" style={{ fontSize: 13, color: '#dc2626', padding: '20px 12px' }}>
          Could not load the Process queue: {extractApiError(error).message}
        </p>
      ) : cases.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-tertiary)' }}>
          <FileText size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No cases</div>
          <div style={{ fontSize: 13 }}>{rawSearch ? 'No cases match your search' : 'No cases in this view.'}</div>
        </div>
      ) : (
        cases.map(c => (
          <CaseRow key={c.id} docCase={c} onOpen={() => setSelectedCaseId(c.id)} actions={rowActions(c)} />
        ))
      )}

      {/* Detail panel */}
      <ContextPanel isOpen={!!selectedCaseId} onClose={() => setSelectedCaseId(null)} width={960} hideCloseButton ariaLabel="Process case">
        {selectedCaseId && <ProcessCaseDetailPanel caseId={selectedCaseId} onClose={() => setSelectedCaseId(null)} />}
      </ContextPanel>

      {returning && (
        <ReturnToDocumentationDialog
          docCase={returning}
          submitting={returnMut.isPending}
          onClose={() => setReturning(null)}
          onConfirm={(reasonCode, note) => returnMut.mutate({ id: returning.id, reasonCode, note })}
        />
      )}
    </div>
  );
};
