import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, CheckCircle2, Download, Clock, AlertCircle } from 'lucide-react';
import { portalService } from '../services/portal.service';
import type { PortalCaseView, PortalDocument, DocCaseStatus } from '../types';
import { normaliseCaseIdInput, isValidCaseId, CASE_ID_FORMAT_HINT, phoneLast4 } from '../domain/caseId';
import { PORTAL_ERROR_MESSAGES, PORTAL_PROGRESS_STAGES } from '../domain/portal';

// ── Design tokens (portal uses same type scale at 390pt / mobile-first) ───────

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  @keyframes portal-fadeIn {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .portal-root {
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    min-height: 100vh;
    background: #fafafa;
    color: #111827;
    -webkit-font-smoothing: antialiased;
  }
  .portal-screen {
    animation: portal-fadeIn 0.28s cubic-bezier(0.22,1,0.36,1) both;
  }
  .portal-btn {
    transition: opacity 0.12s, transform 0.1s;
  }
  .portal-btn:hover:not(:disabled) { opacity: 0.88; }
  .portal-btn:active:not(:disabled) { transform: scale(0.97); }
  .portal-digit-input {
    width: 52px; height: 56px; text-align: center;
    font-size: 22px; font-weight: 700; border-radius: 12px;
    border: 1.5px solid #d1d5db; background: #fff; outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    caret-color: #7C3AED;
  }
  .portal-digit-input:focus {
    border-color: #7C3AED;
    box-shadow: 0 0 0 3px rgba(124,58,237,0.12);
  }
`;

// ── Shared layout ─────────────────────────────────────────────────────────────

function PortalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="portal-root">
      <style>{CSS}</style>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid #f0f0f0', background: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: 56, paddingInline: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>HPX EIGEN</span>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 420, margin: '0 auto', padding: '40px 20px 80px' }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        textAlign: 'center', padding: '14px 16px',
        background: '#fafafa', borderTop: '1px solid #f0f0f0',
        fontSize: 11, color: '#9ca3af', lineHeight: 1.5,
      }}>
        You'll confirm the last 4 digits of your registered phone number. No code is sent.
      </footer>
    </div>
  );
}

// ── Screen 1: Case ID entry ───────────────────────────────────────────────────

function CaseIdEntryScreen({ initialId, onNext }: {
  initialId: string;
  onNext: (caseId: string) => void;
}) {
  const [value, setValue] = useState(initialId || '');
  const isValid = isValidCaseId(value);

  const handleChange = (raw: string) => setValue(normaliseCaseIdInput(raw));
  const handleSubmit = () => { if (isValid) onNext(value); };

  return (
    <div className="portal-screen">
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8, letterSpacing: '-0.02em' }}>
        Check your case
      </h1>
      <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 32, lineHeight: 1.55 }}>
        Enter your Case ID to check your application status and documents.
      </p>

      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8, letterSpacing: '0.02em' }}>
        Case ID
      </label>
      <input
        value={value}
        onChange={e => handleChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
        placeholder="HPX-XXXX-XXXX"
        autoFocus
        autoCapitalize="characters"
        spellCheck={false}
        style={{
          width: '100%', height: 48, borderRadius: 12, paddingInline: 14,
          border: `1.5px solid ${isValid ? '#7C3AED' : '#d1d5db'}`,
          outline: 'none', fontSize: 18, fontWeight: 700, boxSizing: 'border-box',
          fontFamily: 'ui-monospace, "Cascadia Code", Menlo, monospace',
          letterSpacing: '0.07em', color: '#111827',
          background: '#fff',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          boxShadow: isValid ? '0 0 0 3px rgba(124,58,237,0.12)' : 'none',
        }}
      />
      <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 7 }}>{CASE_ID_FORMAT_HINT}</p>

      <button
        className="portal-btn"
        onClick={handleSubmit}
        disabled={!isValid}
        style={{
          marginTop: 20, width: '100%', height: 48, borderRadius: 12, border: 'none',
          background: isValid ? '#111827' : '#e5e7eb',
          color: isValid ? '#fff' : '#9ca3af',
          fontSize: 15, fontWeight: 700, cursor: isValid ? 'pointer' : 'not-allowed',
          transition: 'background 0.15s, color 0.15s',
        }}
      >
        Continue
      </button>
    </div>
  );
}

// ── Screen 2: Phone digit verification ────────────────────────────────────────

function VerifyScreen({ caseId, onBack, onVerified }: {
  caseId: string;
  onBack: () => void;
  onVerified: (token: string) => void;
}) {
  const [digits, setDigits] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null);
  const refs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const isComplete = digits.every(d => d.length === 1);

  useEffect(() => { refs[0].current?.focus(); }, []);

  const handleDigit = (idx: number, val: string) => {
    const d = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[idx] = d;
    setDigits(next);
    setError(null);
    if (d && idx < 3) refs[idx + 1].current?.focus();
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      refs[idx - 1].current?.focus();
    }
    if (e.key === 'ArrowLeft' && idx > 0) refs[idx - 1].current?.focus();
    if (e.key === 'ArrowRight' && idx < 3) refs[idx + 1].current?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted.length > 0) {
      const next = ['', '', '', ''];
      for (let i = 0; i < 4 && i < pasted.length; i++) next[i] = pasted[i];
      setDigits(next);
      refs[Math.min(pasted.length, 3)].current?.focus();
    }
    e.preventDefault();
  };

  const handleVerify = useCallback(async () => {
    if (!isComplete || loading) return;
    setLoading(true);
    setError(null);
    try {
      const idempotencyKey = `portal-auth-${caseId}-${digits.join('')}-${Date.now()}`;
      const result = await portalService.authenticate(caseId, digits.join(''), idempotencyKey);
      if (result.success && result.sessionToken) {
        onVerified(result.sessionToken);
      } else if (result.lockedUntil) {
        setLockedUntil(new Date(result.lockedUntil));
        setError(PORTAL_ERROR_MESSAGES.ACCOUNT_LOCKED);
      } else {
        setError(PORTAL_ERROR_MESSAGES.INVALID_CREDENTIALS);
        setDigits(['', '', '', '']);
        setTimeout(() => refs[0].current?.focus(), 50);
      }
    } catch {
      setError(PORTAL_ERROR_MESSAGES.INVALID_CREDENTIALS);
    } finally {
      setLoading(false);
    }
  }, [caseId, digits, isComplete, loading, onVerified]);

  useEffect(() => {
    if (isComplete && !error) handleVerify();
  }, [isComplete]);

  const isLocked = lockedUntil && lockedUntil > new Date();

  return (
    <div className="portal-screen">
      <button
        onClick={onBack}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', color: '#6b7280',
          fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: 0,
          marginBottom: 24,
        }}
      >
        <ChevronLeft size={16} /> Back
      </button>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 12px', borderRadius: 10,
        background: 'rgba(5,150,105,0.07)', border: '1px solid rgba(5,150,105,0.2)',
        marginBottom: 28,
      }}>
        <CheckCircle2 size={14} style={{ color: '#059669', flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 500, color: '#059669' }}>
          Case ID format recognised
        </span>
        <span style={{
          marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: '#059669',
          fontFamily: 'ui-monospace, monospace', letterSpacing: '0.05em',
        }}>
          {caseId}
        </span>
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, letterSpacing: '-0.02em' }}>
        Confirm it's you
      </h2>
      <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 28, lineHeight: 1.55 }}>
        Enter the last 4 digits of the phone number registered with your case.
      </p>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 24 }}>
        {refs.map((ref, i) => (
          <input
            key={i}
            ref={ref}
            className="portal-digit-input"
            type="text"
            inputMode="numeric"
            maxLength={2}
            value={digits[i]}
            onChange={e => handleDigit(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            onPaste={i === 0 ? handlePaste : undefined}
            disabled={loading || !!isLocked}
            style={{
              ...(error ? { borderColor: '#ef4444', boxShadow: '0 0 0 3px rgba(239,68,68,0.1)' } : {}),
            }}
          />
        ))}
      </div>

      {error && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px',
          borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
          marginBottom: 16,
        }}>
          <AlertCircle size={14} style={{ color: '#dc2626', flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 13, color: '#dc2626', lineHeight: 1.45 }}>{error}</span>
        </div>
      )}

      <button
        className="portal-btn"
        onClick={handleVerify}
        disabled={!isComplete || loading || !!isLocked}
        style={{
          width: '100%', height: 48, borderRadius: 12, border: 'none',
          background: isComplete && !loading && !isLocked ? '#7C3AED' : '#e5e7eb',
          color: isComplete && !loading && !isLocked ? '#fff' : '#9ca3af',
          fontSize: 15, fontWeight: 700,
          cursor: isComplete && !loading && !isLocked ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'background 0.15s, color 0.15s',
        }}
      >
        {loading ? (
          <span style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
        ) : 'Verify'}
      </button>
    </div>
  );
}

// ── Screen 3: Case view ────────────────────────────────────────────────────────

const CASE_STATUS_LABELS: Partial<Record<DocCaseStatus, string>> = {
  ACTIVE: 'Application in progress',
  DOCUMENTATION_READY: 'Documentation complete — awaiting processing',
  TRANSFERRED_TO_PROCESS: 'Under processing',
  CLOSED: 'Case closed',
  CANCELLED: 'Case cancelled',
};

function DocBadge({ status }: { status: string }) {
  const isReceived = ['RECEIVED', 'APPROVED', 'UNDER_VERIFICATION', 'MANAGER_APPROVED'].includes(status);
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
      padding: '2px 7px', borderRadius: 99,
      background: isReceived ? 'rgba(5,150,105,0.1)' : 'rgba(245,158,11,0.1)',
      color: isReceived ? '#059669' : '#d97706',
    }}>
      {isReceived ? 'Received' : 'Pending'}
    </span>
  );
}

function timeAgo(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function CaseViewScreen({ sessionToken, caseId }: { sessionToken: string; caseId: string }) {
  const [data, setData] = useState<PortalCaseView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    portalService.getCaseView(sessionToken)
      .then(setData)
      .catch(() => setError('Unable to load case details. Please try again.'))
      .finally(() => setLoading(false));
  }, [sessionToken]);

  if (loading) return (
    <div className="portal-screen" style={{ paddingTop: 60, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
      <div style={{ width: 28, height: 28, border: '2.5px solid #e5e7eb', borderTopColor: '#7C3AED', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
      Loading your case…
    </div>
  );

  if (error || !data) return (
    <div className="portal-screen" style={{ paddingTop: 40 }}>
      <div style={{
        padding: '16px', borderRadius: 12, background: 'rgba(239,68,68,0.06)',
        border: '1px solid rgba(239,68,68,0.15)', color: '#dc2626', fontSize: 14,
      }}>
        {error ?? 'Something went wrong.'}
      </div>
    </div>
  );

  const clientDocuments = data.documents.filter(d => d.clientVisible);

  return (
    <div className="portal-screen" style={{ paddingBottom: 100 }}>
      {/* Case ID & status */}
      <div style={{ marginBottom: 28 }}>
        <div style={{
          fontFamily: 'ui-monospace, "Cascadia Code", Menlo, monospace',
          fontSize: 13, fontWeight: 700, color: '#7C3AED',
          letterSpacing: '0.06em', marginBottom: 6,
        }}>
          {data.caseId}
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, letterSpacing: '-0.02em' }}>
          {CASE_STATUS_LABELS[data.status] ?? data.status}
        </h2>
        <p style={{ fontSize: 13, color: '#6b7280' }}>
          Opened {new Date(data.portalActivatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Progress timeline */}
      <div style={{
        background: '#fff', borderRadius: 16, padding: '20px', marginBottom: 20,
        border: '1px solid #f0f0f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
          Progress
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {data.progressStages.map((stage, i) => {
            const isCompleted = !!stage.completedAt;
            const isCurrent = stage.isCurrent;
            const isLast = i === data.progressStages.length - 1;
            return (
              <div key={stage.key} style={{ display: 'flex', gap: 12 }}>
                {/* Dot + line */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%', marginTop: 2,
                    background: isCompleted ? '#059669' : isCurrent ? '#7C3AED' : '#d1d5db',
                    border: isCurrent ? '2px solid rgba(124,58,237,0.3)' : 'none',
                    boxShadow: isCurrent ? '0 0 0 3px rgba(124,58,237,0.1)' : 'none',
                    flexShrink: 0,
                  }} />
                  {!isLast && <div style={{ width: 2, flex: 1, background: isCompleted ? 'rgba(5,150,105,0.25)' : '#e5e7eb', marginTop: 4, marginBottom: 4, minHeight: 20 }} />}
                </div>
                {/* Label */}
                <div style={{ paddingBottom: isLast ? 0 : 16 }}>
                  <div style={{
                    fontSize: 13, fontWeight: isCurrent ? 700 : isCompleted ? 600 : 500,
                    color: isCurrent ? '#111827' : isCompleted ? '#374151' : '#9ca3af',
                  }}>
                    {stage.label}
                  </div>
                  {stage.completedAt && (
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                      {new Date(stage.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </div>
                  )}
                  {isCurrent && (
                    <div style={{ fontSize: 11, color: '#7C3AED', marginTop: 2, fontWeight: 600 }}>
                      In progress
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Documents */}
      {clientDocuments.length > 0 && (
        <div style={{
          background: '#fff', borderRadius: 16, padding: '20px', marginBottom: 20,
          border: '1px solid #f0f0f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
            Documents
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {clientDocuments.map(doc => (
              <div key={doc.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10, background: '#fafafa',
                border: '1px solid #f0f0f0',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 3 }}>
                    {doc.name}
                  </div>
                  <DocBadge status={doc.status} />
                </div>
                {doc.downloadUrl && (
                  <a
                    href={doc.downloadUrl}
                    download
                    style={{
                      width: 30, height: 30, borderRadius: 8,
                      border: '1px solid #e5e7eb', background: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#6b7280', flexShrink: 0,
                    }}
                  >
                    <Download size={13} />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Latest updates / notes */}
      {data.notes.length > 0 && (
        <div style={{
          background: '#fff', borderRadius: 16, padding: '20px',
          border: '1px solid #f0f0f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
            Latest Updates
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {data.notes.map(note => (
              <div key={note.id} style={{ display: 'flex', gap: 12 }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%', background: '#7C3AED',
                  flexShrink: 0, marginTop: 5,
                }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.55, marginBottom: 4 }}>
                    {note.content}
                  </p>
                  <p style={{ fontSize: 11, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={10} />
                    {timeAgo(note.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Router (3-screen flow) ─────────────────────────────────────────────────────

type Screen = 'entry' | 'verify' | 'case';

export function ClientPortalPage() {
  const [params] = useSearchParams();
  const initialId = params.get('id') ?? '';
  const isPreview = params.get('preview') === '1';

  const [screen, setScreen] = useState<Screen>(initialId && isValidCaseId(initialId) ? 'verify' : 'entry');
  const [caseId, setCaseId] = useState(initialId);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  return (
    <PortalShell>
      {screen === 'entry' && (
        <CaseIdEntryScreen
          initialId={caseId}
          onNext={(id) => { setCaseId(id); setScreen('verify'); }}
        />
      )}
      {screen === 'verify' && (
        <VerifyScreen
          caseId={caseId}
          onBack={() => setScreen('entry')}
          onVerified={(token) => { setSessionToken(token); setScreen('case'); }}
        />
      )}
      {screen === 'case' && sessionToken && (
        <CaseViewScreen sessionToken={sessionToken} caseId={caseId} />
      )}
    </PortalShell>
  );
}

export default ClientPortalPage;
