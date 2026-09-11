/**
 * Public mandate upload page — /mandate/upload?token=...
 *
 * No auth. The token in the query string is the credential. On load the token is
 * stripped from the URL (history, analytics, logs) and held in memory only.
 */
import { useEffect, useRef, useState } from 'react';
import { UploadCloud, FileCheck2, AlertTriangle, Loader2, XCircle } from 'lucide-react';
import {
  mandateService, mandateErrorMessage, MANDATE_POLICY,
  type AllowedContentType,
} from '../services/mandate.service';

type Phase = 'ready' | 'uploading' | 'confirming' | 'done' | 'expired' | 'no-token';

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
  const inputRef = useRef<HTMLInputElement>(null);

  // Read token once, then scrub it from the URL immediately.
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (token) {
      tokenRef.current = token;
      window.history.replaceState({}, '', '/mandate/upload');
    } else {
      setPhase('no-token');
    }
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

    try {
      const { uploadUrl, uploadId } = await mandateService.requestUploadUrl({
        token,
        fileName: file.name,
        contentType: file.type,
        fileSizeBytes: file.size,
      });

      await mandateService.uploadToPresigned(uploadUrl, file, setProgress);

      setPhase('confirming');
      await mandateService.confirmUpload({ token, uploadId, fileName: file.name });
      setPhase('done');
    } catch (e: unknown) {
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
    <div style={{ minHeight: '100vh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 480, background: '#fff', borderRadius: 20, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', padding: '2rem' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Upload your document</h1>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>
          PDF, JPG or PNG · maximum 5 MB
        </p>

        {phase === 'no-token' && (
          <StateCard icon={<XCircle size={40} color="#dc2626" />} title="Invalid link"
            body="This upload link is missing its access token. Please use the exact link your advisor sent you." />
        )}

        {phase === 'expired' && (
          <StateCard icon={<AlertTriangle size={40} color="#d97706" />} title="Link expired"
            body="This upload link has expired. Please contact your advisor for a new link." />
        )}

        {phase === 'done' && (
          <StateCard icon={<FileCheck2 size={40} color="#059669" />} title="Upload complete"
            body="Thank you. Our team will review your document and be in touch." />
        )}

        {(phase === 'ready' || phase === 'uploading' || phase === 'confirming') && (
          <>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files?.[0] ?? null); }}
              onClick={() => phase === 'ready' && inputRef.current?.click()}
              style={{
                border: `2px dashed ${dragging ? '#111827' : '#d1d5db'}`,
                borderRadius: 14, padding: '2rem 1rem', textAlign: 'center',
                cursor: phase === 'ready' ? 'pointer' : 'default',
                background: dragging ? '#f3f4f6' : '#fafafa', transition: 'all .15s',
              }}
            >
              <UploadCloud size={32} color="#9ca3af" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontSize: 14, color: '#374151', fontWeight: 500 }}>
                {file ? file.name : 'Drag & drop, or click to choose a file'}
              </div>
              {file && (
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </div>
              )}
              <input ref={inputRef} type="file" accept={ACCEPT} hidden
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
            </div>

            {(phase === 'uploading' || phase === 'confirming') && (
              <div style={{ marginTop: 16 }}>
                <div style={{ height: 8, background: '#e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${phase === 'confirming' ? 100 : progress}%`, background: '#111827', transition: 'width .2s' }} />
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Loader2 size={13} className="animate-spin" />
                  {phase === 'confirming' ? 'Finalizing…' : `Uploading… ${progress}%`}
                </div>
              </div>
            )}

            {error && (
              <div style={{ marginTop: 16, padding: '10px 12px', background: 'rgba(220,38,38,0.06)', color: '#dc2626', borderRadius: 10, fontSize: 13 }}>
                {error}
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!file || phase !== 'ready'}
              style={{
                marginTop: 20, width: '100%', padding: '12px', borderRadius: 12, border: 'none',
                background: !file || phase !== 'ready' ? '#9ca3af' : '#111827', color: '#fff',
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
    <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
      <div style={{ marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>{body}</div>
    </div>
  );
}