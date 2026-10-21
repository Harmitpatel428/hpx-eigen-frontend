import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '../auth/context/AuthContext';
import { Modal } from '../components/Modal';
import { processService } from '../services/process.service';
import { extractApiError } from '../utils/extractApiError';
import { PROCESS_RETURN_REASON_LABELS } from '../types';
import type { DocCase, ProcessReturnReason } from '../types';

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

// ─── Page ─────────────────────────────────────────────────────────────────────
const Tile: React.FC<{ label: string; value: number | string }> = ({ label, value }) => (
  <div className="surface-elevated" style={{ padding: 'var(--space-4)', minWidth: 140, borderRadius: 'var(--radius-xl)' }}>
    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600 }}>{label}</div>
    <div style={{ fontSize: 26, fontWeight: 800 }}>{value}</div>
  </div>
);

const th: React.CSSProperties = { textAlign: 'left', fontSize: 12, fontWeight: 600, padding: '8px 12px', color: 'var(--text-tertiary)' };
const td: React.CSSProperties = { fontSize: 13, padding: '10px 12px', verticalAlign: 'top' };

export const ProcessQueuePage: React.FC = () => {
  const { permissions } = useAuth();
  const qc = useQueryClient();
  const [returning, setReturning] = useState<DocCase | null>(null);

  const { data: queue, isLoading, isError, error } = useQuery({
    queryKey: ['process-incoming'],
    queryFn: () => processService.listIncoming(),
  });
  const cases = queue?.cases ?? [];
  const counts = queue?.counts;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['process-incoming'] });
  };

  // On failure also refresh the queue: a 409 means another Process user acted first,
  // so the row on screen is stale.
  const refreshQueue = () => qc.invalidateQueries({ queryKey: ['process-incoming'] });

  const acceptMut = useMutation({
    mutationFn: (id: string) => processService.accept(id),
    onSuccess: () => { toast.success('Case accepted'); invalidate(); },
    onError: (err) => { toast.error(extractApiError(err).message); refreshQueue(); },
  });

  const returnMut = useMutation({
    mutationFn: (v: { id: string; reasonCode: ProcessReturnReason; note: string }) =>
      processService.returnToDocumentation(v.id, v.reasonCode, v.note),
    onSuccess: () => { toast.success('Case returned to Documentation'); setReturning(null); invalidate(); },
    onError: (err) => { toast.error(extractApiError(err).message); refreshQueue(); },
  });

  const canAccept = permissions.can('process:accept');
  const canReturn = permissions.can('process:return');

  return (
    <div style={{ padding: 'var(--space-8)', maxWidth: 1200 }}>
      <h1 className="type-title" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 'var(--space-5)' }}>
        Process
      </h1>

      <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        {/* On the error path the counts are unknown, not zero — show '—' so stale/0 tiles don't mislead. */}
        <Tile label="Incoming" value={isError ? '—' : counts?.incoming ?? 0} />
        <Tile label="Processing" value={isError ? '—' : counts?.processing ?? 0} />
        <Tile label="Returned" value={isError ? '—' : counts?.returned ?? 0} />
      </div>

      {isLoading ? (
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Loading…</p>
      ) : isError ? (
        <p role="alert" style={{ fontSize: 13, color: '#dc2626' }}>
          Could not load the Process queue: {extractApiError(error).message}
        </p>
      ) : cases.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No cases waiting for Process review.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
              <th style={th}>Case ID</th>
              <th style={th}>Client</th>
              <th style={th}>Case type</th>
              <th style={th}>Transferred</th>
              <th style={th}>Remarks</th>
              <th style={th} />
            </tr>
          </thead>
          <tbody>
            {cases.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                <td style={{ ...td, fontWeight: 600 }}>{c.caseNumber ?? '—'}</td>
                <td style={td}>
                  <div>{c.lead.firstName} {c.lead.lastName}</div>
                  {c.lead.company && <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{c.lead.company}</div>}
                </td>
                <td style={td}>{c.caseType?.name ?? c.preset?.name ?? '—'}</td>
                <td style={td}>
                  {c.processHandoffAt ? new Date(c.processHandoffAt).toLocaleDateString() : '—'}
                  {(c.processHandoffByName ?? c.processHandoffBy) && <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{c.processHandoffByName ?? c.processHandoffBy}</div>}
                </td>
                <td style={td}>{c.handoverRemarks || ''}</td>
                <td style={{ ...td, whiteSpace: 'nowrap', textAlign: 'right' }}>
                  {canAccept && (
                    <button type="button" className="btn btn-primary" style={{ marginRight: 8 }}
                      disabled={acceptMut.isPending}
                      onClick={() => acceptMut.mutate(c.id)}>
                      Accept
                    </button>
                  )}
                  {canReturn && (
                    <button type="button" className="btn btn-ghost" onClick={() => setReturning(c)}>Return</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

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
