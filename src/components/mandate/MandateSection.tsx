/**
 * Mandate lifecycle — staff UI for the case detail panel.
 *
 * Bundles: Send Mandate dialog, Mandate status card, and the Verify/Reject dialog.
 * All three are tightly coupled to one caseId and share query invalidation, so they
 * live together rather than as separate files.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FileText, ExternalLink, CheckCircle2, XCircle, RefreshCw, Send } from 'lucide-react';
import { Modal } from '../Modal';
import { useAuth } from '../../auth/context/AuthContext';
import {
  mandateService, mandateErrorMessage,
  type MandateRequestStatus, type MandateRequestSummary,
} from '../../services/mandate.service';

const STATUS_META: Record<MandateRequestStatus, { label: string; bg: string; color: string }> = {
  PENDING_UPLOAD: { label: 'Pending upload', bg: 'rgba(217,119,6,0.12)',  color: '#b45309' },
  UPLOADED:       { label: 'Uploaded',        bg: 'rgba(37,99,235,0.12)',  color: '#1d4ed8' },
  VERIFIED:       { label: 'Verified',        bg: 'rgba(5,150,105,0.12)',  color: '#047857' },
  REJECTED:       { label: 'Rejected',        bg: 'rgba(220,38,38,0.12)',  color: '#b91c1c' },
  EXPIRED:        { label: 'Expired',         bg: 'rgba(107,114,128,0.14)', color: '#4b5563' },
  SUPERSEDED:     { label: 'Superseded',      bg: 'rgba(107,114,128,0.14)', color: '#4b5563' },
};

const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString() : '—');

function apiError(e: unknown): string {
  const status = (e as { response?: { status?: number } })?.response?.status;
  return mandateErrorMessage(status);
}

export function MandateSection({ caseId, caseStatus, leadEmail }: {
  caseId: string; caseStatus: string; leadEmail: string | null;
}) {
  const qc = useQueryClient();
  const { permissions } = useAuth();
  const [showSend, setShowSend] = useState(false);
  const [verifyReq, setVerifyReq] = useState<MandateRequestSummary | null>(null);

  const canSend = permissions.can('mandate:send');
  const canVerify = permissions.can('mandate:verify');
  const canView = permissions.can('mandate:view');

  const { data: requests = [] } = useQuery({
    queryKey: ['mandate-requests', caseId],
    queryFn: () => mandateService.listForCase(caseId),
    enabled: canView,
    staleTime: 10_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['mandate-requests', caseId] });

  const current = requests[0]; // most recent (list is ordered desc)
  const caseOpen = ['INCOMING', 'ACTIVE'].includes(caseStatus);

  const regenMutation = useMutation({
    mutationFn: (id: string) => mandateService.regenerateLink(id),
    onSuccess: () => { toast.success('New upload link sent to client. Expires in 7 days.'); invalidate(); },
    onError: (e) => toast.error(apiError(e)),
  });

  if (!canView) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Mandate</span>
        {canSend && caseOpen && (
          <button className="btn btn-ghost" style={{ height: 26, paddingInline: 10, fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
            onClick={() => setShowSend(true)}>
            <Send size={13} /> Send Mandate Request
          </button>
        )}
      </div>

      {!current && (
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: '8px 0' }}>
          No mandate request yet.
        </div>
      )}

      {current && <MandateStatusCard
        req={current}
        canVerify={canVerify}
        canSend={canSend}
        onVerifyReject={() => setVerifyReq(current)}
        onRegenerate={() => regenMutation.mutate(current.id)}
        regenerating={regenMutation.isPending}
      />}

      {showSend && (
        <SendMandateDialog caseId={caseId} leadEmail={leadEmail}
          onClose={() => setShowSend(false)} onSent={invalidate} />
      )}

      {verifyReq && (
        <VerifyRejectDialog req={verifyReq}
          onClose={() => setVerifyReq(null)} onDone={invalidate} />
      )}
    </div>
  );
}

// ─── Component 3: status card ───────────────────────────────────────────────

function MandateStatusCard({ req, canVerify, canSend, onVerifyReject, onRegenerate, regenerating }: {
  req: MandateRequestSummary;
  canVerify: boolean; canSend: boolean;
  onVerifyReject: () => void; onRegenerate: () => void; regenerating: boolean;
}) {
  const meta = STATUS_META[req.status];
  const upload = req.uploads[0];
  const canRegen = ['PENDING_UPLOAD', 'EXPIRED', 'REJECTED'].includes(req.status);

  const openDocument = async () => {
    if (!upload) return;
    try {
      const { viewUrl } = await mandateService.getViewUrl(upload.id);
      window.open(viewUrl, '_blank', 'noopener,noreferrer');
    } catch (e) { toast.error(apiError(e)); }
  };

  return (
    <div className="surface" style={{ padding: 14, borderRadius: 'var(--radius-md)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{req.mandateType}</span>
        <span style={{ padding: '3px 9px', borderRadius: 'var(--radius-full)', fontSize: 11, fontWeight: 600, background: meta.bg, color: meta.color }}>
          {meta.label}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 20, fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 10 }}>
        <div><span style={{ fontWeight: 600 }}>Sent</span> {fmtDate(req.createdAt)}</div>
        <div><span style={{ fontWeight: 600 }}>Expires</span> {fmtDate(req.tokenExpiresAt)}</div>
        {req.sentToEmail && <div>{req.sentToEmail}</div>}
      </div>

      {req.status === 'REJECTED' && req.rejectionReason && (
        <div style={{ fontSize: 12, color: '#b91c1c', background: 'rgba(220,38,38,0.06)', padding: '6px 10px', borderRadius: 8, marginBottom: 10 }}>
          Rejected: {req.rejectionReason}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {req.status === 'UPLOADED' && upload && (
          <>
            <button className="btn btn-ghost" style={{ height: 28, paddingInline: 10, fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
              onClick={openDocument}>
              <ExternalLink size={13} /> View Document
            </button>
            {canVerify && (
              <button className="btn btn-primary" style={{ height: 28, paddingInline: 10, fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
                onClick={onVerifyReject}>
                <FileText size={13} /> Verify / Reject
              </button>
            )}
          </>
        )}
        {canRegen && canSend && (
          <button className="btn btn-ghost" style={{ height: 28, paddingInline: 10, fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
            onClick={onRegenerate} disabled={regenerating}>
            <RefreshCw size={13} /> {regenerating ? 'Sending…' : 'Regenerate Link'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Component 2: send dialog ───────────────────────────────────────────────

function SendMandateDialog({ caseId, leadEmail, onClose, onSent }: {
  caseId: string; leadEmail: string | null; onClose: () => void; onSent: () => void;
}) {
  const [mandateType, setMandateType] = useState('');
  const [sendEmail, setSendEmail] = useState(true);

  const sendMutation = useMutation({
    mutationFn: () => mandateService.send(caseId, { mandateType: mandateType.trim(), sendEmail }),
    onSuccess: () => { toast.success('Mandate sent. Link expires in 7 days.'); onSent(); onClose(); },
    onError: (e) => toast.error(apiError(e)),
  });

  const valid = mandateType.trim().length >= 1 && mandateType.trim().length <= 200;

  return (
    <Modal isOpen onClose={onClose} title="Send Mandate Request" size="sm">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#d1d5db' }}>
          Mandate Type
          <input className="input" value={mandateType} maxLength={200} autoFocus
            onChange={(e) => setMandateType(e.target.value)}
            placeholder="e.g. Signed authorization form"
            style={{ marginTop: 6, width: '100%' }} />
        </label>

        <label style={{ fontSize: 12, fontWeight: 600, color: '#d1d5db' }}>
          Client Email
          <input className="input" value={leadEmail ?? 'No email on file'} disabled readOnly
            style={{ marginTop: 6, width: '100%', opacity: 0.7 }} />
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#d1d5db', cursor: 'pointer' }}>
          <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
          Send email notification to client
        </label>

        {sendEmail && !leadEmail && (
          <div style={{ fontSize: 12, color: '#fbbf24' }}>
            No email on file — the request will be created but no email can be sent.
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <button className="btn btn-ghost" onClick={onClose} style={{ fontSize: 13 }}>Cancel</button>
          <button className="btn btn-primary" onClick={() => sendMutation.mutate()}
            disabled={!valid || sendMutation.isPending} style={{ fontSize: 13 }}>
            {sendMutation.isPending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Component 4: verify / reject dialog ────────────────────────────────────

function VerifyRejectDialog({ req, onClose, onDone }: {
  req: MandateRequestSummary; onClose: () => void; onDone: () => void;
}) {
  const upload = req.uploads[0];
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  const { data: view, isLoading, isError } = useQuery({
    queryKey: ['mandate-view-url', upload?.id],
    queryFn: () => mandateService.getViewUrl(upload!.id),
    enabled: !!upload,
    staleTime: 0,
  });

  const verifyMutation = useMutation({
    mutationFn: () => mandateService.verify(req.id),
    onSuccess: () => { toast.success('Mandate verified.'); onDone(); onClose(); },
    onError: (e) => toast.error(apiError(e)),
  });

  const rejectMutation = useMutation({
    mutationFn: () => mandateService.reject(req.id, reason.trim()),
    onSuccess: () => { toast.success('Mandate rejected.'); onDone(); onClose(); },
    onError: (e) => toast.error(apiError(e)),
  });

  const isImage = view?.contentType.startsWith('image/');

  return (
    <Modal isOpen onClose={onClose} title="Review Mandate Document" size="lg">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ height: 420, background: '#0f0f1e', borderRadius: 10, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isLoading && <span style={{ color: '#9ca3af', fontSize: 13 }}>Loading document…</span>}
          {isError && <span style={{ color: '#fca5a5', fontSize: 13 }}>Could not load the document.</span>}
          {view && (isImage
            ? <img src={view.viewUrl} alt={view.fileName} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            : <iframe src={view.viewUrl} title={view.fileName} style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }} />
          )}
        </div>
        {view && <div style={{ fontSize: 12, color: '#9ca3af' }}>{view.fileName} · {(view.fileSizeBytes / 1024 / 1024).toFixed(2)} MB</div>}

        {rejecting && (
          <label style={{ fontSize: 12, fontWeight: 600, color: '#d1d5db' }}>
            Rejection Reason
            <textarea className="input" value={reason} maxLength={1000} rows={3} autoFocus
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why the document is rejected…"
              style={{ marginTop: 6, width: '100%', resize: 'vertical' }} />
          </label>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {!rejecting ? (
            <>
              <button className="btn" onClick={() => setRejecting(true)}
                style={{ fontSize: 13, background: '#dc2626', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
                <XCircle size={14} /> Reject
              </button>
              <button className="btn btn-primary" onClick={() => verifyMutation.mutate()}
                disabled={verifyMutation.isPending}
                style={{ fontSize: 13, background: '#059669', display: 'flex', alignItems: 'center', gap: 5 }}>
                <CheckCircle2 size={14} /> {verifyMutation.isPending ? 'Approving…' : 'Approve'}
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-ghost" onClick={() => { setRejecting(false); setReason(''); }} style={{ fontSize: 13 }}>Cancel</button>
              <button className="btn" onClick={() => rejectMutation.mutate()}
                disabled={reason.trim().length < 1 || rejectMutation.isPending}
                style={{ fontSize: 13, background: '#dc2626', color: '#fff', border: 'none' }}>
                {rejectMutation.isPending ? 'Rejecting…' : 'Confirm Rejection'}
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}