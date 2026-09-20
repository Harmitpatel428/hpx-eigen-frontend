import { useRef, useState } from 'react';
import { UploadCloud, FileCheck2, X } from 'lucide-react';

export const DOC_ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
export const DOC_MAX_BYTES = 5 * 1024 * 1024;
export const DOC_ACCEPT = '.pdf,.jpg,.jpeg,.png';

/**
 * E7: reject an empty or non-allowlisted `file.type` (and oversize) BEFORE any
 * presign, so Branch-A signed-header mismatches never surface raw SigV4 errors.
 * Returns an error message, or null when the file is acceptable.
 */
export function validateFile(file: File, opts: { allowed?: string[]; maxBytes?: number } = {}): string | null {
  const allowed = opts.allowed ?? DOC_ALLOWED_TYPES;
  const maxBytes = opts.maxBytes ?? DOC_MAX_BYTES;
  if (!file.type || !allowed.includes(file.type)) return 'File type not supported. Please upload a PDF, JPG, or PNG.';
  if (file.size > maxBytes) return `File is too large. Maximum size is ${Math.round(maxBytes / 1024 / 1024)} MB.`;
  return null;
}

/** Presentational dropzone. Validates on pick (E7); only emits valid files. */
export function FileDropzone({
  file, onSelect, disabled = false, progress, allowed, maxBytes,
}: {
  file: File | null;
  onSelect: (file: File | null) => void;
  disabled?: boolean;
  progress?: number | null;
  allowed?: string[];
  maxBytes?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = (f: File | null) => {
    setError(null);
    if (!f) { onSelect(null); return; }
    const err = validateFile(f, { allowed, maxBytes });
    if (err) { setError(err); onSelect(null); return; }
    onSelect(f);
  };

  const uploading = typeof progress === 'number' && progress > 0 && progress < 100;

  return (
    <div>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-label="Upload a file — drag and drop, or press Enter to browse"
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); inputRef.current?.click(); } }}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); if (!disabled) pick(e.dataTransfer.files?.[0] ?? null); }}
        style={{
          border: `1.5px dashed ${dragging ? 'var(--color-accent, #6366f1)' : 'var(--border-medium)'}`,
          background: dragging ? 'rgba(99,102,241,0.06)' : 'var(--bg-subtle)',
          borderRadius: 'var(--radius-md, 10px)',
          padding: '18px 16px',
          textAlign: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          transition: 'border-color 120ms, background 120ms',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={DOC_ACCEPT}
          hidden
          disabled={disabled}
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
        />
        {file ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <FileCheck2 size={16} style={{ color: '#059669', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>{file.name}</span>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
            {!disabled && (
              <button type="button" aria-label="Remove file" onClick={(e) => { e.stopPropagation(); pick(null); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', padding: 2 }}>
                <X size={14} />
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <UploadCloud size={22} style={{ color: 'var(--text-tertiary)' }} />
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Drag a file here, or <span style={{ color: 'var(--color-accent, #6366f1)', fontWeight: 600 }}>browse</span></div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>PDF, JPG or PNG · max 5 MB</div>
          </div>
        )}
      </div>

      {uploading && (
        <div style={{ marginTop: 8 }}>
          <div style={{ height: 6, background: 'var(--bg-muted)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'var(--color-accent, #6366f1)', borderRadius: 99, transition: 'width 0.2s' }} />
          </div>
          <div aria-live="polite" style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 3 }}>Uploading… {progress}%</div>
        </div>
      )}

      {error && (
        <div role="alert" style={{ marginTop: 8, fontSize: 12, color: '#dc2626' }}>{error}</div>
      )}
    </div>
  );
}
