import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Search, Plus, FileCheck, Clock, AlertTriangle, CheckCircle2,
  ChevronRight, X, ArrowRight, Building2, FileText, Layers,
  MoreVertical, Shield, RefreshCw, ExternalLink, MessageSquare,
  FolderOpen, Calendar, AlertCircle, Inbox, History,
} from 'lucide-react';
import { documentationService } from '../services/documentation.service';
import { ContextPanel } from '../components/layout/ContextPanel';
import type {
  DocCase, DocCaseDocument, DocDocumentStatus, DocNoteType,
  DocStorageType, DocPreset,
} from '../types';

// ============================================================================
// HELPERS & CONSTANTS
// ============================================================================

const DOC_STATUS_META: Record<DocDocumentStatus, { label: string; color: string; bg: string; dot: string }> = {
  REQUESTED:          { label: 'Requested',          color: '#6366f1', bg: 'rgba(99,102,241,0.1)',  dot: '#6366f1' },
  PENDING_COLLECTION: { label: 'Pending Collection', color: '#d97706', bg: 'rgba(245,158,11,0.1)', dot: '#d97706' },
  RECEIVED:           { label: 'Received',           color: '#2563eb', bg: 'rgba(37,99,235,0.1)',  dot: '#2563eb' },
  UNDER_VERIFICATION: { label: 'Under Verification', color: '#7c3aed', bg: 'rgba(124,58,237,0.1)', dot: '#7c3aed' },
  APPROVED:           { label: 'Approved',           color: '#059669', bg: 'rgba(5,150,105,0.1)',  dot: '#059669' },
  REJECTED:           { label: 'Rejected',           color: '#dc2626', bg: 'rgba(220,38,38,0.1)',  dot: '#dc2626' },
  RE_REQUESTED:       { label: 'Re-Requested',       color: '#ea580c', bg: 'rgba(234,88,12,0.1)',  dot: '#ea580c' },
  EXPIRED:            { label: 'Expired',            color: '#9ca3af', bg: 'rgba(156,163,175,0.1)',dot: '#9ca3af' },
  NOT_APPLICABLE:     { label: 'N/A',                color: '#9ca3af', bg: 'rgba(156,163,175,0.1)',dot: '#9ca3af' },
  WAIVED:             { label: 'Waived',             color: '#0891b2', bg: 'rgba(8,145,178,0.1)',  dot: '#0891b2' },
  MANAGER_APPROVED:   { label: 'Manager Approved',   color: '#059669', bg: 'rgba(5,150,105,0.1)',  dot: '#059669' },
};

const CASE_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  ACTIVE:                  { label: 'Active',               color: '#2563eb', bg: 'rgba(37,99,235,0.1)'  },
  DOCUMENTATION_READY:     { label: 'Ready',                color: '#059669', bg: 'rgba(5,150,105,0.1)'  },
  TRANSFERRED_TO_PROCESS:  { label: 'Transferred',          color: '#7c3aed', bg: 'rgba(124,58,237,0.1)' },
  CLOSED:                  { label: 'Closed',               color: '#9ca3af', bg: 'rgba(156,163,175,0.1)'},
  CANCELLED:               { label: 'Cancelled',            color: '#dc2626', bg: 'rgba(220,38,38,0.1)'  },
};

const STORAGE_LABELS: Record<DocStorageType, string> = {
  GOOGLE_DRIVE:     'Google Drive',
  ONEDRIVE:         'OneDrive',
  DROPBOX:          'Dropbox',
  SHAREPOINT:       'SharePoint',
  NAS_PATH:         'NAS Path',
  LOCAL_FOLDER:     'Local Folder',
  PHYSICAL_CABINET: 'Physical Cabinet',
  REFERENCE_NUMBER: 'Reference Number',
  EMAIL:            'Email',
  EXTERNAL_PORTAL:  'External Portal',
  STORED_OFFLINE:   'Stored Offline',
  OTHER:            'Other',
};

const VALID_NEXT: Record<DocDocumentStatus, DocDocumentStatus[]> = {
  REQUESTED:           ['PENDING_COLLECTION', 'NOT_APPLICABLE', 'WAIVED'],
  PENDING_COLLECTION:  ['RECEIVED', 'NOT_APPLICABLE', 'WAIVED', 'EXPIRED'],
  RECEIVED:            ['UNDER_VERIFICATION', 'PENDING_COLLECTION'],
  UNDER_VERIFICATION:  ['APPROVED', 'REJECTED'],
  APPROVED:            ['EXPIRED'],
  REJECTED:            ['RE_REQUESTED', 'WAIVED', 'MANAGER_APPROVED'],
  RE_REQUESTED:        ['PENDING_COLLECTION', 'RECEIVED'],
  EXPIRED:             ['RE_REQUESTED'],
  NOT_APPLICABLE:      [],
  WAIVED:              [],
  MANAGER_APPROVED:    [],
};

function initials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
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

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// ─── KPI strip ───────────────────────────────────────────────────────────────
function KpiStrip({ kpis }: { kpis: { label: string; value: number; accent?: string }[] }) {
  return (
    <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', marginBottom: 'var(--space-8)' }}>
      {kpis.map(k => (
        <div key={k.label} className="surface" style={{
          padding: '14px 20px', borderRadius: 'var(--radius-lg)', minWidth: 140,
          borderLeft: `3px solid ${k.accent ?? 'var(--color-accent)'}`,
        }}>
          <div className="type-micro" style={{ marginBottom: 4, color: 'var(--text-tertiary)' }}>{k.label}</div>
          <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: k.accent ?? 'var(--text-primary)' }}>{k.value}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ pct, ready }: { pct: number; ready: boolean }) {
  const color = ready ? '#059669' : pct >= 80 ? '#d97706' : '#6366f1';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: 'var(--bg-muted)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.4s' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color, minWidth: 32, textAlign: 'right' }}>{pct}%</span>
    </div>
  );
}

// ─── Document status chip ─────────────────────────────────────────────────────
function StatusChip({ status }: { status: DocDocumentStatus }) {
  const m = DOC_STATUS_META[status];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px',
      borderRadius: 'var(--radius-full)', fontSize: 11, fontWeight: 600,
      background: m.bg, color: m.color,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: m.dot, flexShrink: 0 }} />
      {m.label}
    </span>
  );
}

// ─── Case row ─────────────────────────────────────────────────────────────────
function CaseRow({ docCase, onClick }: { docCase: DocCase; onClick: () => void }) {
  const sm = CASE_STATUS_META[docCase.status] ?? CASE_STATUS_META.ACTIVE;
  return (
    <div
      className="list-row"
      onClick={onClick}
      style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 180px 80px', alignItems: 'center', gap: 16, cursor: 'pointer' }}
    >
      {/* Lead */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-muted)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', flexShrink: 0,
        }}>
          {initials(docCase.lead.firstName, docCase.lead.lastName)}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
            {docCase.lead.firstName} {docCase.lead.lastName}
          </div>
          {docCase.lead.company && (
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{docCase.lead.company}</div>
          )}
        </div>
      </div>

      {/* Preset */}
      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
        {docCase.preset ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Layers size={12} />
            {docCase.preset.name}
          </span>
        ) : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
      </div>

      {/* Status */}
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px',
        borderRadius: 'var(--radius-full)', fontSize: 11, fontWeight: 600,
        background: sm.bg, color: sm.color, width: 'fit-content',
      }}>
        {sm.label}
      </span>

      {/* Progress */}
      <ProgressBar pct={docCase.completionPercent} ready={docCase.isReady} />

      {/* Chevron */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <ChevronRight size={16} style={{ color: 'var(--text-tertiary)' }} />
      </div>
    </div>
  );
}

// ─── Document row inside case panel ──────────────────────────────────────────
function DocumentRow({
  doc,
  onStatusChange,
  onAddStorageRef,
}: {
  doc: DocCaseDocument;
  onStatusChange: (docId: string, status: DocDocumentStatus, remarks?: string, rejectionReason?: string) => void;
  onAddStorageRef: (docId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const nextStatuses = VALID_NEXT[doc.status];

  return (
    <div style={{
      border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)',
      marginBottom: 8, overflow: 'hidden',
    }}>
      <div
        style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
        onClick={() => setExpanded(e => !e)}
      >
        {/* Mandatory dot */}
        <span style={{
          width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
          background: doc.isMandatory ? '#dc2626' : '#9ca3af',
        }} title={doc.isMandatory ? 'Mandatory' : 'Optional'} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            {doc.name}
            {doc.isBlocking && (
              <span style={{ fontSize: 10, background: 'rgba(220,38,38,0.1)', color: '#dc2626', padding: '1px 5px', borderRadius: 4, fontWeight: 600 }}>
                BLOCKING
              </span>
            )}
          </div>
          {doc.description && (
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>{doc.description}</div>
          )}
        </div>

        <StatusChip status={doc.status} />

        {doc.storageRefs.length > 0 && (
          <FolderOpen size={14} style={{ color: 'var(--text-tertiary)' }} />
        )}

        <ChevronRight size={14} style={{ color: 'var(--text-tertiary)', transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid var(--border-light)', padding: '12px 14px', background: 'var(--bg-subtle)' }}>
          {/* Timestamps */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 10, flexWrap: 'wrap' }}>
            {doc.receivedAt && (
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Received: </span>
                {new Date(doc.receivedAt).toLocaleDateString()}
              </div>
            )}
            {doc.verifiedAt && (
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Verified: </span>
                {new Date(doc.verifiedAt).toLocaleDateString()}
              </div>
            )}
            {doc.expiryDate && (
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Expires: </span>
                {new Date(doc.expiryDate).toLocaleDateString()}
              </div>
            )}
          </div>

          {doc.rejectionReason && (
            <div style={{ marginBottom: 10, padding: '6px 10px', background: 'rgba(220,38,38,0.06)', borderRadius: 6, fontSize: 12, color: '#dc2626' }}>
              <strong>Rejection reason:</strong> {doc.rejectionReason}
            </div>
          )}

          {doc.verificationRemarks && (
            <div style={{ marginBottom: 10, padding: '6px 10px', background: 'rgba(5,150,105,0.06)', borderRadius: 6, fontSize: 12, color: '#059669' }}>
              <strong>Verification remarks:</strong> {doc.verificationRemarks}
            </div>
          )}

          {/* Storage refs */}
          {doc.storageRefs.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 4 }}>STORAGE REFERENCES</div>
              {doc.storageRefs.map(ref => (
                <div key={ref.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 3 }}>
                  <ExternalLink size={11} />
                  <strong>{STORAGE_LABELS[ref.storageType]}:</strong>
                  <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{ref.reference}</span>
                  {ref.label && <span style={{ color: 'var(--text-tertiary)' }}>({ref.label})</span>}
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {nextStatuses.map(next => {
              const m = DOC_STATUS_META[next];
              return (
                <button key={next} className="btn"
                  style={{ fontSize: 11, padding: '4px 10px', background: m.bg, color: m.color, border: 'none', borderRadius: 'var(--radius-full)', fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => {
                    const remarks = next === 'REJECTED'
                      ? window.prompt('Rejection reason (optional):') ?? undefined
                      : next === 'WAIVED'
                      ? window.prompt('Waiver reason:') ?? undefined
                      : undefined;
                    const rejReason = next === 'REJECTED' ? remarks : undefined;
                    onStatusChange(doc.id, next, next === 'WAIVED' ? remarks : undefined, rejReason);
                  }}
                >
                  → {m.label}
                </button>
              );
            })}
            <button className="btn"
              style={{ fontSize: 11, padding: '4px 10px', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-full)', cursor: 'pointer', background: 'none', color: 'var(--text-secondary)' }}
              onClick={() => onAddStorageRef(doc.id)}
            >
              + Storage Ref
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Storage ref modal ────────────────────────────────────────────────────────
const storageRefSchema = z.object({
  storageType: z.enum(['GOOGLE_DRIVE', 'ONEDRIVE', 'DROPBOX', 'SHAREPOINT', 'NAS_PATH', 'LOCAL_FOLDER', 'PHYSICAL_CABINET', 'REFERENCE_NUMBER', 'EMAIL', 'EXTERNAL_PORTAL', 'STORED_OFFLINE', 'OTHER']),
  reference:   z.string().min(1, 'Reference is required'),
  label:       z.string().optional(),
});
type StorageRefForm = z.infer<typeof storageRefSchema>;

function StorageRefModal({
  docId,
  onClose,
  onSuccess,
}: {
  docId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<StorageRefForm>({
    resolver: zodResolver(storageRefSchema),
    defaultValues: { storageType: 'OTHER' },
  });

  const onSubmit = async (vals: StorageRefForm) => {
    await documentationService.addStorageRef(docId, vals);
    onSuccess();
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="surface-elevated" style={{ width: 440, borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
          <h3 style={{ fontWeight: 700, fontSize: 16 }}>Add Storage Reference</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 'var(--space-4)' }}>
          Informational only. The CRM does not access this location.
        </p>
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Storage Type</label>
            <select {...register('storageType')} className="input" style={{ width: '100%' }}>
              {Object.entries(STORAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Reference / Path / Location</label>
            <input {...register('reference')} className="input" style={{ width: '100%' }} placeholder="e.g. /Shared/ClientDocs or Cabinet-A/Row-3" />
            {errors.reference && <p style={{ fontSize: 11, color: '#dc2626', marginTop: 3 }}>{errors.reference.message}</p>}
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Label (optional)</label>
            <input {...register('label')} className="input" style={{ width: '100%' }} placeholder="e.g. PAN Card folder" />
          </div>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ marginTop: 4 }}>
            {isSubmitting ? 'Saving…' : 'Add Reference'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Create Case modal ────────────────────────────────────────────────────────
const createCaseSchema = z.object({
  leadId:     z.string().min(1, 'Lead is required'),
  presetId:   z.string().optional(),
  dueDate:    z.string().optional(),
  priority:   z.number().min(0).max(2).optional(),
  notes:      z.string().optional(),
});
type CreateCaseForm = z.infer<typeof createCaseSchema>;

function CreateCaseModal({
  leads,
  presets,
  onClose,
  onSuccess,
}: {
  leads: Array<{ id: string; firstName: string; lastName: string; company: string | null }>;
  presets: DocPreset[];
  onClose: () => void;
  onSuccess: (docCase: DocCase) => void;
}) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CreateCaseForm>({
    resolver: zodResolver(createCaseSchema),
  });

  const onSubmit = async (vals: CreateCaseForm) => {
    const docCase = await documentationService.createCase({
      leadId:   vals.leadId,
      presetId: vals.presetId || undefined,
      dueDate:  vals.dueDate || undefined,
      priority: vals.priority,
      notes:    vals.notes,
    });
    onSuccess(docCase);
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="surface-elevated" style={{ width: 500, borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
          <h3 style={{ fontWeight: 700, fontSize: 16 }}>New Documentation Case</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Lead <span style={{ color: '#dc2626' }}>*</span></label>
            <select {...register('leadId')} className="input" style={{ width: '100%' }}>
              <option value="">Select lead…</option>
              {leads.map(l => (
                <option key={l.id} value={l.id}>
                  {l.firstName} {l.lastName}{l.company ? ` — ${l.company}` : ''}
                </option>
              ))}
            </select>
            {errors.leadId && <p style={{ fontSize: 11, color: '#dc2626', marginTop: 3 }}>{errors.leadId.message}</p>}
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Document Preset</label>
            <select {...register('presetId')} className="input" style={{ width: '100%' }}>
              <option value="">No preset — add documents manually</option>
              {presets.map(p => <option key={p.id} value={p.id}>{p.name} ({p.items.length} docs)</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Due Date</label>
              <input {...register('dueDate')} type="date" className="input" style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Priority</label>
              <select {...register('priority')} className="input" style={{ width: '100%' }}>
                <option value={0}>Normal</option>
                <option value={1}>High</option>
                <option value={2}>Urgent</option>
              </select>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Notes</label>
            <textarea {...register('notes')} className="input" rows={2} style={{ width: '100%', resize: 'vertical' }} placeholder="Internal notes…" />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Creating…' : 'Create Case'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Case detail panel (ContextPanel) ────────────────────────────────────────
function CaseDetailPanel({
  caseId,
  onClose,
}: {
  caseId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [tab, setTab]   = useState<'documents' | 'timeline' | 'notes'>('documents');
  const [noteInput, setNoteInput] = useState('');
  const [noteType, setNoteType]   = useState<DocNoteType>('INTERNAL');
  const [storageDocId, setStorageDocId] = useState<string | null>(null);

  const { data: docCase, isLoading } = useQuery({
    queryKey:  ['doc-case', caseId],
    queryFn:   () => documentationService.getCase(caseId),
    staleTime: 10_000,
  });

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['doc-case', caseId] });
    qc.invalidateQueries({ queryKey: ['doc-cases'] });
  }, [qc, caseId]);

  const statusMutation = useMutation({
    mutationFn: ({ docId, status, remarks, rejectionReason }: {
      docId: string; status: DocDocumentStatus; remarks?: string; rejectionReason?: string;
    }) => documentationService.updateDocumentStatus(docId, { status, remarks, rejectionReason }),
    onSuccess: invalidate,
  });

  const transferMutation = useMutation({
    mutationFn: () => documentationService.transferToProcess(caseId),
    onSuccess: invalidate,
  });

  const noteMutation = useMutation({
    mutationFn: () => documentationService.addNote(caseId, noteType, noteInput),
    onSuccess: () => { setNoteInput(''); invalidate(); },
  });

  const overrideMutation = useMutation({
    mutationFn: (reason: string) => documentationService.managerOverride(caseId, reason),
    onSuccess: invalidate,
  });

  if (isLoading || !docCase) {
    return (
      <div style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />
      </div>
    );
  }

  const sm = CASE_STATUS_META[docCase.status] ?? CASE_STATUS_META.ACTIVE;
  const missingMandatory = (docCase.documents ?? []).filter(d =>
    d.isMandatory && !['APPROVED', 'MANAGER_APPROVED', 'WAIVED', 'NOT_APPLICABLE'].includes(d.status)
  );
  const rejected = (docCase.documents ?? []).filter(d => d.status === 'REJECTED');
  const canTransfer = docCase.isReady && docCase.status !== 'TRANSFERRED_TO_PROCESS';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '24px 24px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>
              {docCase.lead.firstName} {docCase.lead.lastName}
            </div>
            {docCase.lead.company && (
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{docCase.lead.company}</div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px',
              borderRadius: 'var(--radius-full)', fontSize: 11, fontWeight: 600,
              background: sm.bg, color: sm.color,
            }}>{sm.label}</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <X size={18} style={{ color: 'var(--text-tertiary)' }} />
            </button>
          </div>
        </div>

        {/* Progress summary */}
        <div className="surface" style={{ padding: 16, borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Documentation Progress</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: docCase.isReady ? '#059669' : 'var(--text-primary)' }}>
              {docCase.completionPercent}%
            </span>
          </div>
          <ProgressBar pct={docCase.completionPercent} ready={docCase.isReady} />
          <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
            {[
              { label: 'Total',    val: docCase.totalDocs },
              { label: 'Received', val: docCase.receivedDocs },
              { label: 'Approved', val: docCase.approvedDocs, color: '#059669' },
              { label: 'Rejected', val: docCase.rejectedDocs, color: '#dc2626' },
              { label: 'Mandatory Pending', val: docCase.mandatoryDocs - docCase.mandatoryApproved, color: docCase.mandatoryDocs - docCase.mandatoryApproved > 0 ? '#d97706' : '#059669' },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: s.color ?? 'var(--text-primary)' }}>{s.val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Missing / Rejected alert */}
        {(missingMandatory.length > 0 || rejected.length > 0) && (
          <div style={{ marginBottom: 12, padding: '8px 12px', background: 'rgba(220,38,38,0.06)', borderRadius: 8, fontSize: 12, color: '#dc2626' }}>
            {missingMandatory.length > 0 && <div><strong>{missingMandatory.length}</strong> mandatory document(s) missing</div>}
            {rejected.length > 0 && <div><strong>{rejected.length}</strong> document(s) rejected</div>}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {canTransfer && (
            <button className="btn btn-primary" style={{ fontSize: 12, gap: 6, display: 'flex', alignItems: 'center' }}
              onClick={() => { if (window.confirm('Transfer this case to Process Department?')) transferMutation.mutate(); }}
              disabled={transferMutation.isPending}
            >
              <ArrowRight size={14} />
              {transferMutation.isPending ? 'Transferring…' : 'Transfer to Process'}
            </button>
          )}
          {!docCase.isReady && docCase.status === 'ACTIVE' && (
            <button className="btn" style={{ fontSize: 12, border: '1px solid var(--border-medium)', background: 'none', color: 'var(--text-secondary)', gap: 6, display: 'flex', alignItems: 'center' }}
              onClick={() => {
                const reason = window.prompt('Manager override reason (required):');
                if (reason?.trim()) overrideMutation.mutate(reason.trim());
              }}
              disabled={overrideMutation.isPending}
            >
              <Shield size={14} />
              Manager Override
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-medium)', marginBottom: 0 }}>
          {(['documents', 'timeline', 'notes'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '8px 14px', fontSize: 12, fontWeight: tab === t ? 600 : 400,
              color: tab === t ? 'var(--text-primary)' : 'var(--text-tertiary)',
              background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: tab === t ? '2px solid var(--text-primary)' : '2px solid transparent',
              marginBottom: -1,
            }}>
              {t === 'documents' ? `Documents (${docCase.totalDocs})` : t === 'timeline' ? 'Timeline' : 'Notes'}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 24px' }}>
        {tab === 'documents' && (
          <div>
            {/* Missing panel */}
            {missingMandatory.length > 0 && (
              <div style={{ marginBottom: 16, padding: 12, background: 'rgba(220,38,38,0.04)', borderRadius: 8, border: '1px solid rgba(220,38,38,0.12)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Missing Mandatory Documents
                </div>
                {missingMandatory.map(d => (
                  <div key={d.id} style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                    <AlertCircle size={11} style={{ color: '#dc2626' }} />
                    {d.name} — <StatusChip status={d.status} />
                  </div>
                ))}
              </div>
            )}

            {(docCase.documents ?? []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-tertiary)' }}>
                <Inbox size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
                <div style={{ fontSize: 14 }}>No documents yet</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Apply a preset or add documents manually</div>
              </div>
            ) : (
              (docCase.documents ?? []).map(doc => (
                <DocumentRow
                  key={doc.id}
                  doc={doc}
                  onStatusChange={(docId, status, remarks, rejectionReason) =>
                    statusMutation.mutate({ docId, status, remarks, rejectionReason })
                  }
                  onAddStorageRef={(docId) => setStorageDocId(docId)}
                />
              ))
            )}
          </div>
        )}

        {tab === 'timeline' && (
          <div>
            {(docCase.events ?? []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-tertiary)', fontSize: 13 }}>No events yet</div>
            ) : (
              <div style={{ position: 'relative', paddingLeft: 20 }}>
                <div style={{ position: 'absolute', left: 7, top: 8, bottom: 8, width: 1, background: 'var(--border-medium)' }} />
                {(docCase.events ?? []).map(ev => (
                  <div key={ev.id} style={{ position: 'relative', marginBottom: 16 }}>
                    <div style={{
                      position: 'absolute', left: -13, top: 4, width: 8, height: 8,
                      borderRadius: '50%', background: 'var(--color-accent)', border: '2px solid var(--bg-app)',
                    }} />
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                      {ev.eventType.replace(/_/g, ' ')}
                    </div>
                    {ev.fromStatus && ev.toStatus && (
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <StatusChip status={ev.fromStatus} />
                        <ArrowRight size={10} />
                        <StatusChip status={ev.toStatus} />
                      </div>
                    )}
                    {ev.remarks && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{ev.remarks}</div>}
                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>{relativeTime(ev.createdAt)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'notes' && (
          <div>
            {/* New note */}
            <div className="surface" style={{ padding: 14, borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                {(['INTERNAL', 'CUSTOMER'] as DocNoteType[]).map(nt => (
                  <button key={nt} onClick={() => setNoteType(nt)} style={{
                    fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 'var(--radius-full)',
                    background: noteType === nt ? 'var(--color-accent)' : 'var(--bg-muted)',
                    color: noteType === nt ? 'var(--text-inverse)' : 'var(--text-secondary)',
                    border: 'none', cursor: 'pointer',
                  }}>
                    {nt}
                  </button>
                ))}
              </div>
              <textarea
                value={noteInput}
                onChange={e => setNoteInput(e.target.value)}
                className="input"
                rows={3}
                style={{ width: '100%', resize: 'vertical', marginBottom: 8 }}
                placeholder={noteType === 'INTERNAL' ? 'Internal note (only visible to staff)…' : 'Customer-facing note…'}
              />
              <button className="btn btn-primary" style={{ fontSize: 12 }}
                onClick={() => noteMutation.mutate()}
                disabled={!noteInput.trim() || noteMutation.isPending}
              >
                {noteMutation.isPending ? 'Saving…' : 'Add Note'}
              </button>
            </div>

            {/* Existing notes */}
            {(docCase.caseNotes ?? []).map(note => (
              <div key={note.id} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                    color: note.noteType === 'INTERNAL' ? '#7c3aed' : '#2563eb',
                  }}>{note.noteType}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{relativeTime(note.createdAt)}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5, padding: '8px 12px', background: 'var(--bg-subtle)', borderRadius: 8 }}>
                  {note.content}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Storage ref modal */}
      {storageDocId && (
        <StorageRefModal
          docId={storageDocId}
          onClose={() => setStorageDocId(null)}
          onSuccess={invalidate}
        />
      )}
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export function DocumentationPage() {
  const qc = useQueryClient();
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showCreate, setShowCreate]     = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  // Cases list
  const { data: casesResponse, isLoading: casesLoading } = useQuery({
    queryKey:  ['doc-cases', { search, status: statusFilter }],
    queryFn:   () => documentationService.listCases({ search: search || undefined, status: statusFilter || undefined, pageSize: 50 }),
    staleTime: 30_000,
  });
  const cases: DocCase[] = casesResponse?.data ?? [];

  // KPIs
  const { data: kpis } = useQuery({
    queryKey:  ['doc-dashboard'],
    queryFn:   () => documentationService.getDashboardKPIs(),
    staleTime: 60_000,
  });

  // Presets & leads (for create modal)
  const { data: presets = [] } = useQuery({
    queryKey: ['doc-presets'],
    queryFn:  () => documentationService.listPresets(),
    staleTime: 300_000,
  });

  // Leads list (for create case dropdown — reuse existing leads query)
  const { data: leadsResponse } = useQuery({
    queryKey: ['leads', {}],
    queryFn:  async () => {
      const { api } = await import('../services/api');
      const res = await api.get('/leads?pageSize=200');
      return res.data;
    },
    staleTime: 60_000,
  });
  const leads = (leadsResponse?.data ?? []) as Array<{ id: string; firstName: string; lastName: string; company: string | null }>;

  const kpiItems = kpis ? [
    { label: 'Total Cases',       value: kpis.totalCases,       accent: '#6366f1' },
    { label: 'Active',            value: kpis.activeCases,       accent: '#2563eb' },
    { label: 'Ready for Process', value: kpis.readyCases,        accent: '#059669' },
    { label: 'Transferred',       value: kpis.transferredCases,  accent: '#7c3aed' },
    { label: 'Rejected Docs',     value: kpis.rejectedDocs,      accent: '#dc2626' },
    { label: 'Pending Verify',    value: kpis.pendingVerification, accent: '#d97706' },
  ] : [];

  return (
    <div style={{ padding: 'var(--space-8)', maxWidth: 1200 }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 className="type-title" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>Documentation</h1>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>
            Track document collection readiness across all cases
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <Plus size={16} /> New Case
        </button>
      </div>

      {/* KPIs */}
      {kpis && <KpiStrip kpis={kpiItems} />}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            className="input"
            style={{ paddingLeft: 34, width: '100%' }}
            placeholder="Search leads…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="input" style={{ width: 180 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {Object.entries(CASE_STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Table header */}
      <div style={{
        display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 180px 80px',
        padding: '8px 16px', gap: 16, marginBottom: 4,
      }}>
        {['Lead', 'Preset', 'Status', 'Progress', ''].map(h => (
          <div key={h} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)' }}>{h}</div>
        ))}
      </div>

      {/* Cases */}
      {casesLoading ? (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900 mx-auto" />
        </div>
      ) : cases.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-tertiary)' }}>
          <FileText size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No documentation cases</div>
          <div style={{ fontSize: 13 }}>Create a case from a qualified lead to start tracking documents</div>
        </div>
      ) : (
        cases.map(c => (
          <CaseRow key={c.id} docCase={c} onClick={() => setSelectedCaseId(c.id)} />
        ))
      )}

      {/* Case detail panel */}
      <ContextPanel isOpen={!!selectedCaseId} onClose={() => setSelectedCaseId(null)} width={600}>
        {selectedCaseId && (
          <CaseDetailPanel caseId={selectedCaseId} onClose={() => setSelectedCaseId(null)} />
        )}
      </ContextPanel>

      {/* Create modal */}
      {showCreate && (
        <CreateCaseModal
          leads={leads}
          presets={presets}
          onClose={() => setShowCreate(false)}
          onSuccess={(newCase) => {
            qc.invalidateQueries({ queryKey: ['doc-cases'] });
            qc.invalidateQueries({ queryKey: ['doc-dashboard'] });
            setSelectedCaseId(newCase.id);
          }}
        />
      )}
    </div>
  );
}
