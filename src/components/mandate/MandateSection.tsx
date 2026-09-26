/**
 * Mandate lifecycle — staff UI for the case detail panel.
 *
 * Bundles: Send Mandate dialog, Mandate status card, and the Verify/Reject dialog.
 * All three are tightly coupled to one caseId and share query invalidation, so they
 * live together rather than as separate files.
 */
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FileText, ExternalLink, CheckCircle2, XCircle, RefreshCw, Send, Upload, Building2 } from 'lucide-react';
import { Modal } from '../Modal';
import { FileDropzone } from '../documents/FileDropzone';
import { useAuth } from '../../auth/context/AuthContext';
import {
  mandateService, mandateErrorMessage, isStorageNotConfigured, uploadToPresigned,
  type MandateRequestStatus, type MandateRequestSummary, type FirmSourceChannel,
} from '../../services/mandate.service';

const FIRM_CHANNEL_LABELS: Record<FirmSourceChannel, string> = {
  WHATSAPP: 'WhatsApp', EMAIL: 'Email', PHYSICAL: 'Physical', FIRM_UPLOAD: 'Firm upload', OTHER: 'Other',
};

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

export function MandateSection({ caseId, caseStatus, leadEmail, autoOpenSend }: {
  caseId: string; caseStatus: string; leadEmail: string | null; autoOpenSend?: boolean;
}) {
  const qc = useQueryClient();
  const { permissions } = useAuth();
  const [showSend, setShowSend] = useState(false);
  const [showFirmUpload, setShowFirmUpload] = useState(false);
  const [verifyReq, setVerifyReq] = useState<MandateRequestSummary | null>(null);

  const canSend = permissions.can('mandate:send');
  const canVerify = permissions.can('mandate:verify');
  const canView = permissions.can('mandate:view');
  const canUpload = permissions.can('mandate:upload');

  const { data: requests = [] } = useQuery({
    queryKey: ['mandate-requests', caseId],
    queryFn: () => mandateService.listForCase(caseId),
    enabled: canView,
    staleTime: 10_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['mandate-requests', caseId] });

  // F2: current = first non-SUPERSEDED (list is ordered desc). When every request
  // is superseded, current is undefined and the empty/send state renders.
  const current = requests.find(r => r.status !== 'SUPERSEDED');
  const caseOpen = ['INCOMING', 'ACTIVE'].includes(caseStatus);

  // Deep-link from the handoff toast ("Send mandate now") auto-opens the dialog.
  useEffect(() => {
    if (autoOpenSend && canSend && caseOpen && !current) setShowSend(true);
  }, [autoOpenSend, canSend, caseOpen, current]);

  const regenMutation = useMutation({
    mutationFn: (id: string) => mandateService.regenerateLink(id),
    onSuccess: () => { toast.success('New upload link sent to client. Expires in 7 days.'); invalidate(); },
    onError: (e) => toast.error(apiError(e)),
  });

  if (!canView) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', flex: 'none' }}>Mandate</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {canUpload && caseOpen && (
            <button className="btn btn-ghost" style={{ height: 26, paddingInline: 10, fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
              onClick={() => setShowFirmUpload(true)}>
              <Upload size={13} /> Upload Mandate
            </button>
          )}
          {canSend && caseOpen && (
            <button className="btn btn-ghost" style={{ height: 26, paddingInline: 10, fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
              onClick={() => setShowSend(true)}>
              <Send size={13} /> Send Mandate Request
            </button>
          )}
        </div>
      </div>

      {!current && (
        (canSend || canUpload) && caseOpen ? (
          <div className="surface" style={{ padding: 16, borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px dashed var(--border-subtle, #d1d5db)' }}>
            <Send size={22} color="var(--text-tertiary)" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>No mandate requested yet</div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 12 }}>
              Send a request so the client can upload, or upload a mandate you already received.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              {canSend && (
                <button className="btn btn-primary" style={{ height: 30, paddingInline: 14, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  onClick={() => setShowSend(true)}>
                  <Send size={13} /> Send Mandate
                </button>
              )}
              {canUpload && (
                <button className="btn btn-ghost" style={{ height: 30, paddingInline: 14, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  onClick={() => setShowFirmUpload(true)}>
                  <Upload size={13} /> Upload Mandate
                </button>
              )}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: '8px 0' }}>
            No mandate request yet.
          </div>
        )
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

      {showFirmUpload && (
        <FirmMandateUploadDialog caseId={caseId} canVerify={canVerify}
          onClose={() => setShowFirmUpload(false)} onDone={invalidate} />
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
  const [storageDown, setStorageDown] = useState(false);

  const openDocument = async () => {
    if (!upload) return;
    try {
      const { viewUrl } = await mandateService.getViewUrl(upload.id);
      window.open(viewUrl, '_blank', 'noopener,noreferrer');
    } catch (e) {
      if (isStorageNotConfigured(e)) { setStorageDown(true); return; }
      toast.error(apiError(e));
    }
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
        {req.verifiedAt && <div><span style={{ fontWeight: 600 }}>Verified</span> {fmtDate(req.verifiedAt)}</div>}
        {req.sentToEmail && <div>{req.sentToEmail}</div>}
      </div>

      {upload?.uploadedByParty === 'FIRM' && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 10, padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: 11, fontWeight: 600, background: 'rgba(124,58,237,0.1)', color: '#7c3aed' }}>
          <Building2 size={11} />
          Uploaded by firm{upload.sourceChannel && upload.sourceChannel !== 'FIRM_UPLOAD' && upload.sourceChannel !== 'CLIENT_PORTAL'
            ? ` · via ${FIRM_CHANNEL_LABELS[upload.sourceChannel as FirmSourceChannel] ?? upload.sourceChannel}` : ''}
        </div>
      )}

      {req.status === 'REJECTED' && req.rejectionReason && (
        <div style={{ fontSize: 12, color: '#b91c1c', background: 'rgba(220,38,38,0.06)', padding: '6px 10px', borderRadius: 8, marginBottom: 10 }}>
          Rejected: {req.rejectionReason}
        </div>
      )}

      {storageDown && (
        <div role="alert" style={{ marginBottom: 10, padding: '8px 10px', borderRadius: 8, fontSize: 12, background: 'rgba(217,119,6,0.1)', color: '#b45309', border: '1px solid rgba(217,119,6,0.25)' }}>
          Document storage is not configured yet. The uploaded file can’t be opened until R2 storage is provisioned.
        </div>
      )}

      {/* Post-upload status with no file on record — file cannot be previewed */}
      {!upload && ['UPLOADED', 'VERIFIED', 'REJECTED', 'SUPERSEDED'].includes(req.status) && (
        <div role="status" style={{ marginBottom: 10, padding: '8px 10px', borderRadius: 8, fontSize: 12, background: 'var(--bg-muted)', color: 'var(--text-tertiary)', border: '1px solid var(--border-light)' }}>
          Mandate {req.status === 'VERIFIED' ? 'accepted' : req.status.toLowerCase()}, but the uploaded file is unavailable for preview.
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {/* View is available whenever a file exists, regardless of status (a
            verified/accepted mandate keeps its uploaded file — audit: preview
            must survive verification). The URL is minted per click so it is
            never stale. */}
        {upload && (
          <button className="btn btn-ghost" style={{ height: 28, paddingInline: 10, fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
            onClick={openDocument}>
            <ExternalLink size={13} /> View Document
          </button>
        )}
        {/* Verify / Reject stays gated to an awaiting-review upload. */}
        {req.status === 'UPLOADED' && upload && canVerify && (
          <button className="btn btn-primary" style={{ height: 28, paddingInline: 10, fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
            onClick={onVerifyReject}>
            <FileText size={13} /> Verify / Reject
          </button>
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
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
          Mandate Type
          <input className="input" value={mandateType} maxLength={200} autoFocus
            onChange={(e) => setMandateType(e.target.value)}
            placeholder="e.g. Signed authorization form"
            style={{ marginTop: 6, width: '100%' }} />
        </label>

        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
          Client Email
          <input className="input" value={leadEmail ?? 'No email on file'} disabled readOnly
            style={{ marginTop: 6, width: '100%', opacity: 0.7 }} />
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
          Send email notification to client
        </label>

        {sendEmail && !leadEmail && (
          <div style={{ fontSize: 12, color: 'var(--color-warning)' }}>
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
        <div style={{ height: 420, background: 'var(--bg-muted)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isLoading && <span style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Loading document…</span>}
          {isError && <span style={{ color: 'var(--color-danger)', fontSize: 13 }}>Could not load the document.</span>}
          {view && (isImage
            ? <img src={view.viewUrl} alt={view.fileName} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            : <iframe src={view.viewUrl} title={view.fileName} style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }} />
          )}
        </div>
        {view && <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{view.fileName} · {(view.fileSizeBytes / 1024 / 1024).toFixed(2)} MB</div>}

        {rejecting && (
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
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
                style={{ fontSize: 13, background: 'var(--color-danger)', color: 'var(--text-inverse)', border: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
                <XCircle size={14} /> Reject
              </button>
              <button className="btn btn-primary" onClick={() => verifyMutation.mutate()}
                disabled={verifyMutation.isPending}
                style={{ fontSize: 13, background: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <CheckCircle2 size={14} /> {verifyMutation.isPending ? 'Approving…' : 'Approve'}
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-ghost" onClick={() => { setRejecting(false); setReason(''); }} style={{ fontSize: 13 }}>Cancel</button>
              <button className="btn" onClick={() => rejectMutation.mutate()}
                disabled={reason.trim().length < 1 || rejectMutation.isPending}
                style={{ fontSize: 13, background: 'var(--color-danger)', color: 'var(--text-inverse)', border: 'none' }}>
                {rejectMutation.isPending ? 'Rejecting…' : 'Confirm Rejection'}
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ─── Firm mandate upload dialog (staff direct upload) ───────────────────────

function FirmMandateUploadDialog({ caseId, canVerify, onClose, onDone }: {
  caseId: string; canVerify: boolean; onClose: () => void; onDone: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [mandateType, setMandateType] = useState('');
  const [sourceChannel, setSourceChannel] = useState<FirmSourceChannel>('WHATSAPP');
  const [internalNote, setInternalNote] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [verify, setVerify] = useState(false);
  const [phase, setPhase] = useState<'ready' | 'uploading' | 'confirming'>('ready');
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // R1: reuse the same uploadId across retries; only re-PUT if the bytes never landed.
  const uploadIdRef = useRef<string | null>(null);
  const uploadedRef = useRef(false);
  const busy = phase !== 'ready';
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

  async function submit() {
    if (!file || busy) return;
    setError(null);
    const controller = new AbortController();
    try {
      if (!uploadIdRef.current || !uploadedRef.current) {
        setPhase('uploading'); setProgress(0);
        const { uploadUrl, uploadId } = await mandateService.firmUploadUrl(caseId, {
          fileName: file.name, contentType: file.type, fileSizeBytes: file.size,
        });
        uploadIdRef.current = uploadId; uploadedRef.current = false;
        await uploadToPresigned(uploadUrl, file, (p) => setProgress(p), controller.signal);
        uploadedRef.current = true;
      }
      setPhase('confirming');
      const res = await mandateService.firmConfirmUpload(caseId, {
        uploadId: uploadIdRef.current!,
        fileName: file.name,
        mandateType: mandateType.trim() || undefined,
        sourceChannel,
        internalNote: internalNote.trim() || undefined,
        expiresAt: expiresAt ? new Date(`${expiresAt}T00:00:00`).toISOString() : undefined,
        verify: verify || undefined,
      });
      toast.success(res.status === 'VERIFIED' ? 'Mandate uploaded and verified.' : 'Mandate uploaded.');
      onDone();
      onClose();
    } catch (e) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      const serverMsg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      const retryable = status === undefined || status >= 500;
      if (!retryable) { uploadIdRef.current = null; uploadedRef.current = false; } // terminal → fresh attempt
      setError(serverMsg || apiError(e));
      setPhase('ready');
      setProgress(null);
    }
  }

  return (
    <Modal isOpen onClose={busy ? () => {} : onClose} title="Upload Mandate" size="sm">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FileDropzone file={file} onSelect={setFile} disabled={busy} progress={progress} />

        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
          Received via
          <select className="input" value={sourceChannel} disabled={busy}
            onChange={(e) => setSourceChannel(e.target.value as FirmSourceChannel)}
            style={{ marginTop: 6, width: '100%' }}>
            {(Object.keys(FIRM_CHANNEL_LABELS) as FirmSourceChannel[]).map((c) => (
              <option key={c} value={c}>{FIRM_CHANNEL_LABELS[c]}</option>
            ))}
          </select>
        </label>

        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
          Mandate type <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>(optional)</span>
          <input className="input" value={mandateType} maxLength={200} disabled={busy}
            onChange={(e) => setMandateType(e.target.value)}
            placeholder="e.g. Signed authorization form"
            style={{ marginTop: 6, width: '100%' }} />
        </label>

        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
          Internal note <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>(optional, staff-only)</span>
          <textarea className="input" value={internalNote} maxLength={2000} rows={2} disabled={busy}
            onChange={(e) => setInternalNote(e.target.value)}
            style={{ marginTop: 6, width: '100%', resize: 'vertical' }} />
        </label>

        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
          Expiry date <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>(optional)</span>
          <input className="input" type="date" value={expiresAt} min={tomorrow} disabled={busy}
            onChange={(e) => setExpiresAt(e.target.value)}
            style={{ marginTop: 6, width: '100%' }} />
        </label>

        {canVerify ? (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)', cursor: busy ? 'default' : 'pointer' }}>
            <input type="checkbox" checked={verify} disabled={busy} onChange={(e) => setVerify(e.target.checked)} />
            Mark as verified (accepted) on upload
          </label>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Status after upload: <strong>Received</strong>.</div>
        )}

        {error && <div role="alert" style={{ fontSize: 12, color: '#dc2626' }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={busy} style={{ fontSize: 13 }}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={!file || busy} style={{ fontSize: 13 }}>
            {phase === 'uploading' ? 'Uploading…' : phase === 'confirming' ? 'Saving…' : 'Upload'}
          </button>
        </div>
      </div>
    </Modal>
  );
}