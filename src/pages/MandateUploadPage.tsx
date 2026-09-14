/**
 * Public mandate upload page — /mandate/upload?token=...
 *
 * No auth. The token in the query string is the credential. On load the token is
 * stripped from the URL (history, analytics, logs) and held in memory only.
 */
import { useEffect, useRef, useState } from 'react';
import { UploadCloud, FileCheck2, AlertTriangle, Loader2, XCircle } from 'lucide-react';
import {
  mandateService, mandateErrorMessage, isStorageNotConfigured, isScannerUnavailable, MANDATE_POLICY,
  type AllowedContentType,
} from '../services/mandate.service';

type Phase = 'ready' | 'uploading' | 'confirming' | 'done' | 'expired' | 'no-token' | 'storage-unconfigured';

const ACCEPT = '.pdf,.jpg,.jpeg,.png';

function isAllowed(type: string): type is AllowedContentType {
  return (MANDATE_POLICY.ALLOWED_CONTENT_TYPES as string[]).includes(type);
}

export function MandateUploadPage() {
  const tokenRef = useRef<string | null>(null);
  const [phase, setPhase] = useState<Phase>('ready');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Live across the component's life: abort an in-flight upload and stop any
  // setState after the page unmounts (e.g. client navigates away mid-upload).
  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  // Read token once, then scrub it from the URL immediately.
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (token) {
      tokenRef.current = token;
      window.history.replaceState({}, '', '/mandate/upload');
    } else {
      setPhase('no-token');
    }
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  function pickFile(f: File | null) {
    setError(null);
    if (!f) return;
    if (!isAllowed(f.type)) {
      setError('File type not supported. Please upload a PDF, JPG, or PNG.');
      return;
    }
    if (f.size > MANDATE_POLICY.MAX_FILE_SIZE_BYTES) {
      setError('File is too large. Maximum size is 5 MB.');
      return;
    }
    setFile(f);
  }

  async function handleUpload() {
    const token = tokenRef.current;
    if (!token || !file || !isAllowed(file.type)) return;
    setError(null);
    setProgress(0);
    setPhase('uploading');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { uploadUrl, uploadId } = await mandateService.requestUploadUrl({
        token,
        fileName: file.name,
        contentType: file.type,
        fileSizeBytes: file.size,
      });

      await mandateService.uploadToPresigned(uploadUrl, file, setProgress, controller.signal);

      setPhase('confirming');
      await mandateService.confirmUpload({ token, uploadId, fileName: file.name });
      setPhase('done');
    } catch (e: unknown) {
      // The page has gone away (navigated / unmounted) — the upload was aborted
      // in cleanup; do not touch state.
      if (!mountedRef.current || (e as { name?: string })?.name === 'AbortError') return;
      if (isStorageNotConfigured(e)) {
        setPhase('storage-unconfigured');
        return;
      }
      // Scanner down is transient — keep the file and let the client retry, with a
      // message distinct from the terminal STORAGE_NOT_CONFIGURED state.
      if (isScannerUnavailable(e)) {
        setError('Our security check is temporarily unavailable. Please wait a moment and try again.');
        setPhase('ready');
        return;
      }
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 410 || status === 404) {
        setPhase('expired');
        return;
      }
      if (status === 409) {
        setError('Upload failed. Please refresh the page and try again.');
      } else {
        setError(mandateErrorMessage(status));
      }
      setPhase('ready');
    }
  }

  return (
    <div style={{ minHeight: '100vh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-subtle)', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 480, background: 'var(--bg-app)', borderRadius: 20, boxShadow: '0 4px 24px var(--border-medium)', padding: '2rem' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Upload your document</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
          PDF, JPG or PNG · maximum 5 MB
        </p>

        {phase === 'no-token' && (
          <StateCard icon={<XCircle size={40} color="var(--color-danger)" />} title="Invalid link"
            body="This upload link is missing its access token. Please use the exact link your advisor sent you." />
        )}

        {phase === 'expired' && (
          <StateCard icon={<AlertTriangle size={40} color="var(--color-warning)" />} title="Link expired"
            body="This upload link has expired. Please contact your advisor for a new link." />
        )}

        {phase === 'storage-unconfigured' && (
          <StateCard icon={<AlertTriangle size={40} color="var(--color-warning)" />} title="Uploads temporarily unavailable"
            body="Document uploads aren't available right now. Please contact your advisor — nothing is needed from you at the moment." />
        )}

        {phase === 'done' && (
          <StateCard icon={<FileCheck2 size={40} color="var(--color-success)" />} title="Upload complete"
            body="Thank you. Our team will review your document and be in touch." />
        )}

        {(phase === 'ready' || phase === 'uploading' || phase === 'confirming') && (
          <>
            <div
              role="button"
              tabIndex={phase === 'ready' ? 0 : -1}
              aria-label="Upload document. Drag and drop or activate to choose a PDF, JPG or PNG. Maximum 5 megabytes."
              aria-disabled={phase !== 'ready'}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); if (phase === 'ready') pickFile(e.dataTransfer.files?.[0] ?? null); }}
              onClick={() => phase === 'ready' && inputRef.current?.click()}
              onKeyDown={(e) => {
                if (phase === 'ready' && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  inputRef.current?.click();
                }
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              style={{
                border: `2px dashed ${dragging || focused ? 'var(--text-primary)' : 'var(--border-strong)'}`,
                borderRadius: 14, padding: '2rem 1rem', textAlign: 'center',
                cursor: phase === 'ready' ? 'pointer' : 'default',
                background: dragging ? 'var(--bg-muted)' : 'var(--bg-subtle)', transition: 'all .15s',
                outline: focused ? '2px solid var(--text-primary)' : 'none', outlineOffset: 2,
              }}
            >
              <UploadCloud size={32} color="var(--text-tertiary)" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>
                {file ? file.name : 'Drag & drop, or click to choose a file'}
              </div>
              {file && (
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </div>
              )}
              <input ref={inputRef} type="file" accept={ACCEPT} hidden
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
            </div>

            {(phase === 'uploading' || phase === 'confirming') && (
              <div style={{ marginTop: 16 }} role="status" aria-live="polite">
                <div style={{ height: 8, background: 'var(--bg-muted)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${phase === 'confirming' ? 100 : progress}%`, background: 'var(--color-accent)', transition: 'width .2s' }} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Loader2 size={13} className="animate-spin" />
                  {phase === 'confirming' ? 'Finalizing…' : `Uploading… ${progress}%`}
                </div>
              </div>
            )}

            {error && (
              <div role="alert" style={{ marginTop: 16, padding: '10px 12px', background: 'color-mix(in srgb, var(--color-danger) 8%, transparent)', color: 'var(--color-danger)', borderRadius: 10, fontSize: 13 }}>
                {error}
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!file || phase !== 'ready'}
              style={{
                marginTop: 20, width: '100%', padding: '12px', borderRadius: 12, border: 'none',
                background: !file || phase !== 'ready' ? 'var(--text-tertiary)' : 'var(--color-accent)', color: 'var(--text-inverse)',
                fontSize: 14, fontWeight: 600, cursor: !file || phase !== 'ready' ? 'not-allowed' : 'pointer',
              }}
            >
              {phase === 'ready' ? 'Upload document' : 'Uploading…'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function StateCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div role="status" aria-live="polite" style={{ textAlign: 'center', padding: '1.5rem 0' }}>
      <div style={{ marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{body}</div>
    </div>
  );
}
