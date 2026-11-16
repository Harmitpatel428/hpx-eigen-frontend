import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { portalService } from '../services/portal.service';
import type { PortalCaseView, DocCaseStatus } from '../types';
import { normaliseCaseIdInput, isValidCaseId, CASE_ID_FORMAT_HINT, phoneLast4 } from '../domain/caseId';
import { PORTAL_ERROR_MESSAGES, groupPortalDocuments, DOC_CATEGORY_META, ACTION_REQUIRED_GUIDANCE } from '../domain/portal';
import { HpxMark } from '../components/brand/HpxLogo';

// ── Design tokens (portal uses same type scale at 390pt / mobile-first) ───────

const CSS = `
  @keyframes portal-fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* The portal converges on the established HPX Eigen design system (index.css tokens, loaded globally via
     main.tsx). It renders outside the authed shell, so the --portal-* names are kept as thin aliases of the
     app tokens — every colour, the accent, and dark-mode all come from the app system with a minimal diff.
     Inter + --font-sans are inherited from body (no separate font load). #root is a flex row — claim it. */
  .portal-root {
    --portal-bg: var(--bg-subtle); --portal-surface: var(--bg-app); --portal-hairline: var(--border-medium);
    --portal-text: var(--text-primary); --portal-text-2: var(--text-secondary); --portal-text-3: var(--text-tertiary);
    --portal-brand: var(--color-accent);
    width: 100%; min-height: 100vh;
    background: var(--portal-bg); color: var(--portal-text);
    -webkit-font-smoothing: antialiased;
  }
  .portal-screen { animation: portal-fadeIn 0.24s cubic-bezier(0.22,1,0.36,1) both; }

  /* Micro-interactions: 140ms ease-out on hover/press; visible focus ring; reduced-motion honoured below. */
  .portal-btn { transition: background 0.14s ease-out, color 0.14s ease-out, opacity 0.14s ease-out, transform 0.1s ease-out; }
  .portal-btn:hover:not(:disabled) { opacity: 0.9; }
  .portal-btn:active:not(:disabled) { transform: scale(0.98); }
  .portal-link { color: var(--portal-brand); cursor: pointer; transition: opacity 0.14s ease-out; }
  .portal-link:hover { opacity: 0.78; }
  .portal-focusable:focus-visible, .portal-btn:focus-visible, .portal-link:focus-visible { outline: 2px solid var(--portal-brand); outline-offset: 2px; border-radius: 8px; }

  .portal-digit-input {
    width: 52px; height: 56px; text-align: center; font-size: 22px; font-weight: 600;
    border-radius: 12px; border: 1.5px solid var(--border-strong); background: var(--portal-surface); outline: none;
    transition: border-color 0.14s ease-out, box-shadow 0.14s ease-out; caret-color: var(--portal-brand);
  }
  .portal-digit-input:focus { border-color: var(--portal-brand); box-shadow: 0 0 0 3px var(--color-neutral-tint); }

  /* Verify/lockout keep the narrow 420px column; the case view widens responsively. */
  .portal-main { margin: 0 auto; padding: 40px 20px 72px; }
  .portal-main-narrow { max-width: 420px; }
  .portal-main-wide { max-width: 880px; }
  @media (max-width: 1023px) { .portal-main-wide { max-width: 720px; } }
  @media (max-width: 767px)  { .portal-main-wide { max-width: 100%; padding-left: 16px; padding-right: 16px; } }

  /* Documents: two-column cards ≥768px, stacked below. */
  .portal-doc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  @media (max-width: 767px) { .portal-doc-grid { grid-template-columns: 1fr; } }

  /* Flat surfaces with hairlines; no static shadow (elevation reserved for interactive, of which there is none here). */
  .portal-card { background: var(--portal-surface); border-radius: 16px; border: 1px solid var(--portal-hairline); }
  .portal-chip { display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; }
  .portal-chip-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }

  /* Identity monogram — company initials in the accent square; an anchor, not decoration. */
  .portal-mono {
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    width: 54px; height: 54px; border-radius: 15px; background: var(--color-accent);
    color: var(--text-inverse); font-size: 19px; font-weight: 600; letter-spacing: 0.01em;
    font-variant-numeric: tabular-nums;
  }

  /* Sectioned entrance: each major block rises in just after the one above — a quiet, premium cascade. */
  @keyframes portal-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  .portal-reveal { animation: portal-rise 0.5s cubic-bezier(0.22,1,0.36,1) both; }

  @media (prefers-reduced-motion: reduce) {
    .portal-screen, .portal-reveal { animation: none; }
    .portal-btn, .portal-link, .portal-digit-input, .portal-text-input, .portal-primary-action { transition: none; }
  }

  /* ── Mobile polish (≤767px) — hooks are inert on desktop so ≥768 stays identical ──
     Desktop defaults: the action-bar wrapper is transparent (display:contents → the
     button renders exactly as before); the eyebrow and disabled hint are hidden. */
  .portal-eyebrow { display: none; }
  .portal-actionbar { display: contents; }
  .portal-action-hint { display: none; }

  @media (max-width: 767px) {
    /* Lookup/verify become a full-height sheet: content top-aligned, primary action
       pushed into the thumb zone via flex (no fixed/sticky → no transform-containing-block
       trap from the entrance animation, and no reserved-space CLS). Narrow screens only;
       the wide case view is out of scope and untouched. */
    .portal-main-narrow {
      min-height: calc(100vh - 56px);   /* fallback where dvh is unsupported */
      min-height: calc(100dvh - 56px);
      display: flex; flex-direction: column;
      padding: 24px 16px calc(16px + env(safe-area-inset-bottom));
    }
    .portal-main-narrow .portal-screen { flex: 1; display: flex; flex-direction: column; }

    /* Eyebrow micro-label + larger display title */
    .portal-eyebrow {
      display: block; font-size: 11px; font-weight: 700; letter-spacing: 0.12em;
      text-transform: uppercase; color: var(--portal-brand); margin-bottom: 10px;
    }
    .portal-title-lg { font-size: 30px !important; margin-bottom: 10px !important; letter-spacing: -0.02em; }
    .portal-title-md { font-size: 26px !important; letter-spacing: -0.02em; }

    /* Edge-to-edge action bar flush to the bottom; soft elevation lives only here */
    .portal-actionbar {
      margin: auto -16px calc(-16px - env(safe-area-inset-bottom)) -16px;
      display: flex; flex-direction: column; gap: 8px;
      padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
      background: var(--portal-surface);
      border-top: 1px solid var(--portal-hairline);
      box-shadow: 0 -8px 24px rgba(0,0,0,0.06);
    }
    .portal-action-hint { display: block; text-align: center; font-size: 12px; line-height: 1.4; color: var(--portal-text-2); margin: 0; }
    .portal-primary-action { margin-top: 0 !important; width: 100% !important; height: 52px !important; font-size: 16px !important; }
    /* Disabled reads as 'not ready yet', not broken grey */
    .portal-primary-action:disabled { background: var(--color-accent) !important; color: var(--text-inverse) !important; opacity: 0.4 !important; cursor: default !important; }
    .portal-primary-action[data-loading="true"]:disabled { opacity: 1 !important; background: var(--color-accent) !important; }

    /* Text input: larger touch target + 2px accent focus ring with offset */
    .portal-text-input { height: 52px !important; font-size: 18px !important; }
    .portal-text-input:focus-visible, .portal-text-input:focus {
      border-color: var(--color-accent) !important;
      box-shadow: 0 0 0 2px var(--portal-surface), 0 0 0 4px var(--color-accent) !important;
    }

    /* OTP: ≥48×60 targets that fill the row evenly, filled-state tint, accent focus ring */
    .portal-otp-row { gap: 10px !important; }
    .portal-digit-input { width: 100% !important; max-width: 70px; height: 60px !important; font-size: 24px !important; }
    .portal-digit-input.is-filled { border-color: var(--color-accent) !important; background: var(--color-neutral-tint) !important; }
    .portal-digit-input:focus-visible, .portal-digit-input:focus {
      border-color: var(--color-accent) !important;
      box-shadow: 0 0 0 2px var(--portal-surface), 0 0 0 4px var(--color-accent) !important;
    }

    /* Reserve the validation slot so messages never shift layout */
    .portal-alert-slot { min-height: 20px; }

    /* Banner: darken the success ink on mobile so label + mono ID clear AA (4.5:1)
       on the success tint (binding amendment). Desktop keeps the lighter token. */
    :root:not([data-theme="dark"]) .portal-banner span,
    :root:not([data-theme="dark"]) .portal-banner svg { color: #065F46 !important; }

    /* The fixed disclaimer footer would collide with the bottom action bar; its
       reassurance is carried by the action hint / verify helper instead. */
    .portal-footer { display: none; }

    /* Back button: a real 44px target, left-aligned (the flex column would otherwise
       stretch it full-width), with a focus-visible ring. Mobile-only → desktop intact. */
    .portal-back { align-self: flex-start; min-height: 44px; padding: 4px 8px 4px 0 !important; }
    .portal-back:focus-visible { outline: 2px solid var(--portal-brand); outline-offset: 2px; border-radius: 8px; }

    /* Honour reduced-motion for the inline-transitioned controls too (inline beats a
       plain stylesheet rule, so these need !important); scoped to mobile. */
    @media (prefers-reduced-motion: reduce) {
      .portal-screen { animation: none !important; }
      .portal-primary-action, .portal-text-input, .portal-digit-input, .portal-back { transition: none !important; }
    }
  }
`;

// ── Shared layout ─────────────────────────────────────────────────────────────

function PortalShell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="portal-root">
      <style>{CSS}</style>
      {/* Header — official HPX EIGEN mark, left brand axis */}
      <header style={{
        borderBottom: '1px solid var(--portal-hairline)', background: 'var(--portal-surface)',
        display: 'flex', alignItems: 'center', height: 56, paddingInline: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <HpxMark size={26} />
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>HPX&nbsp;EIGEN&nbsp;CRM</span>
        </div>
      </header>

      {/* Content */}
      <main className={`portal-main ${wide ? 'portal-main-wide' : 'portal-main-narrow'}`}>
        {children}
      </main>

      {/* Footer disclaimer — relevant only to lookup/verify; hidden on the case view. */}
      {!wide && (
        <footer className="portal-footer" style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          textAlign: 'center', padding: '14px 16px',
          background: 'var(--portal-bg)', borderTop: '1px solid var(--portal-hairline)',
          fontSize: 11, color: 'var(--portal-text-3)', lineHeight: 1.5,
        }}>
          You'll confirm the last 4 digits of your registered phone number. No code is sent.
        </footer>
      )}
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
      <span className="portal-eyebrow">Secure case lookup</span>
      <h1 className="portal-title-lg" style={{ fontSize: 26, fontWeight: 700, marginBottom: 8, letterSpacing: '-0.02em' }}>
        Check your case
      </h1>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 32, lineHeight: 1.55 }}>
        Enter your Case ID to check your application status and documents.
      </p>

      <label htmlFor="portal-caseid" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, letterSpacing: '0.02em' }}>
        Case ID
      </label>
      <input
        id="portal-caseid"
        className="portal-text-input"
        value={value}
        onChange={e => handleChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
        placeholder="HPX-XXXX-XXXX"
        autoFocus
        autoCapitalize="characters"
        spellCheck={false}
        style={{
          width: '100%', height: 48, borderRadius: 12, paddingInline: 14,
          border: `1.5px solid ${isValid ? 'var(--color-accent)' : 'var(--border-strong)'}`,
          outline: 'none', fontSize: 18, fontWeight: 700, boxSizing: 'border-box',
          fontFamily: 'ui-monospace, "Cascadia Code", Menlo, monospace',
          letterSpacing: '0.07em', color: 'var(--text-primary)',
          background: 'var(--bg-app)',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          boxShadow: isValid ? '0 0 0 3px var(--color-neutral-tint)' : 'none',
        }}
      />
      <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 7 }}>{CASE_ID_FORMAT_HINT}</p>

      <div className="portal-actionbar">
        <p className="portal-action-hint">
          {isValid ? "Next: confirm your phone's last 4 digits · no code is sent" : 'Enter your Case ID to continue'}
        </p>
        <button
          className="portal-btn portal-primary-action"
          onClick={handleSubmit}
          disabled={!isValid}
          style={{
            marginTop: 20, width: '100%', height: 48, borderRadius: 12, border: 'none',
            background: isValid ? 'var(--color-accent)' : 'var(--bg-muted)',
            color: isValid ? 'var(--text-inverse)' : 'var(--text-tertiary)',
            fontSize: 15, fontWeight: 700, cursor: isValid ? 'pointer' : 'not-allowed',
            transition: 'background 0.15s, color 0.15s',
          }}
        >
          Continue
        </button>
      </div>
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
      if (result.success) {
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
        className="portal-back"
        onClick={onBack}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', color: 'var(--text-secondary)',
          fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: 0,
          marginBottom: 24,
        }}
      >
        <ChevronLeft size={16} /> Back
      </button>

      <div className="portal-banner" style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 12px', borderRadius: 10,
        background: 'var(--color-success-tint)', border: '1px solid var(--color-success-tint)',
        marginBottom: 28,
      }}>
        <CheckCircle2 size={14} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-success)' }}>
          Case ID format recognised
        </span>
        <span style={{
          marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: 'var(--color-success)',
          fontFamily: 'ui-monospace, monospace', letterSpacing: '0.05em',
        }}>
          {caseId}
        </span>
      </div>

      <span className="portal-eyebrow">Verify your identity</span>
      <h2 className="portal-title-md" style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, letterSpacing: '-0.02em' }}>
        Confirm it's you
      </h2>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 28, lineHeight: 1.55 }}>
        Enter the last 4 digits of the phone number registered with your case.
      </p>

      <div className="portal-otp-row" style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 24 }}>
        {refs.map((ref, i) => (
          <input
            key={i}
            ref={ref}
            className={`portal-digit-input${digits[i] && !error ? ' is-filled' : ''}`}
            type="text"
            inputMode="numeric"
            maxLength={2}
            aria-label={`Phone digit ${i + 1} of 4`}
            value={digits[i]}
            onChange={e => handleDigit(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            onPaste={i === 0 ? handlePaste : undefined}
            disabled={loading || !!isLocked}
            style={{
              ...(error ? { borderColor: 'var(--color-danger)', boxShadow: '0 0 0 3px var(--color-danger-tint)' } : {}),
            }}
          />
        ))}
      </div>

      <div className="portal-alert-slot" role="alert" aria-live="polite">
        {error && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px',
            borderRadius: 10, background: 'var(--color-danger-tint)', border: '1px solid var(--color-danger-tint)',
            marginBottom: 16,
          }}>
            <AlertCircle size={14} style={{ color: 'var(--color-danger)', flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 13, color: 'var(--color-danger)', lineHeight: 1.45 }}>{error}</span>
          </div>
        )}
      </div>

      <div className="portal-actionbar">
        <p className="portal-action-hint">
          {!isComplete && !isLocked ? 'Enter all 4 digits to verify' : ' '}
        </p>
        <button
          className="portal-btn portal-primary-action"
          onClick={handleVerify}
          disabled={!isComplete || loading || !!isLocked}
          data-loading={loading}
          style={{
            width: '100%', height: 48, borderRadius: 12, border: 'none',
            background: isComplete && !loading && !isLocked ? 'var(--color-accent)' : 'var(--bg-muted)',
            color: isComplete && !loading && !isLocked ? 'var(--text-inverse)' : 'var(--text-tertiary)',
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
    </div>
  );
}

// ── Screen 3: Case view ────────────────────────────────────────────────────────

// Common company suffixes skipped when deriving initials so "Acme Industries Pvt Ltd" → "AI", not "AL".
const NAME_SUFFIXES = new Set(['pvt', 'ltd', 'inc', 'llc', 'co', 'corp', 'corporation', 'limited', 'private', 'plc', 'llp', 'gmbh', 'group']);

/** 1–2 uppercase initials for the identity monogram, skipping legal suffixes. */
function monogram(name: string): string {
  const words = name.trim().split(/\s+/).filter(w => /[a-z0-9]/i.test(w) && !NAME_SUFFIXES.has(w.replace(/[^a-z0-9]/gi, '').toLowerCase()));
  if (words.length === 0) { const t = name.replace(/[^a-z0-9]/gi, ''); return t ? t.slice(0, 2).toUpperCase() : '—'; }
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

const CASE_STATUS_LABELS: Partial<Record<DocCaseStatus, string>> = {
  ACTIVE: 'Application in progress',
  DOCUMENTATION_READY: 'Documentation complete — awaiting processing',
  TRANSFERRED_TO_PROCESS: 'Under processing',
  PENDING_PROCESS_REVIEW: 'Processing',
  RETURNED_TO_DOCUMENTATION: 'Under review',
  CLOSED: 'Case closed',
  CANCELLED: 'Case cancelled',
};

// Category chip: app semantic palette (warning/info/success) + dot + text label (text, not color-only).
function DocCategoryChip({ category }: { category: keyof typeof DOC_CATEGORY_META }) {
  const m = DOC_CATEGORY_META[category] ?? DOC_CATEGORY_META.ACTION_REQUIRED;
  return (
    <span className="portal-chip" style={{ background: m.tint, color: m.color }}>
      <span className="portal-chip-dot" style={{ background: m.color }} />
      {m.label}
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

export function CaseViewScreen({ sessionToken, caseId, previewData }: { sessionToken: string; caseId: string; previewData?: PortalCaseView }) {
  const [data, setData] = useState<PortalCaseView | null>(previewData ?? null);
  const [loading, setLoading] = useState(!previewData);
  const [error, setError] = useState<string | null>(null);

  // Keep the case view in sync without a WebSocket: load on mount, refetch on focus/visibility, and poll
  // every 30s while the tab is visible. A background refresh updates data silently (a transient failure never
  // clobbers a loaded view); only the initial load drives the loading/error states. Timers cleared on unmount.
  useEffect(() => {
    if (previewData) return;
    let alive = true;
    const load = (isInitial: boolean) =>
      portalService.getCaseView(sessionToken)
        .then(d => { if (alive) setData(d); })
        .catch(() => { if (alive && isInitial) setError('Unable to load case details. Please try again.'); })
        .finally(() => { if (alive && isInitial) setLoading(false); });

    load(true);
    const refresh = () => { if (!document.hidden) load(false); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    const poll = window.setInterval(refresh, 30_000);
    return () => {
      alive = false;
      window.clearInterval(poll);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [sessionToken, previewData]);

  // Grouping derivation memoized; hook stays above the early returns (rules of hooks).
  const docGroups = useMemo(() => groupPortalDocuments(data?.documents ?? []), [data]);

  if (loading) return (
    <div className="portal-screen" style={{ paddingTop: 60, textAlign: 'center', color: 'var(--portal-text-3)', fontSize: 14 }}>
      <div style={{ width: 28, height: 28, border: '2.5px solid var(--bg-muted)', borderTopColor: 'var(--portal-brand)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
      Loading your case…
    </div>
  );

  if (error || !data) return (
    <div className="portal-screen" style={{ paddingTop: 40 }}>
      <div style={{
        padding: '16px', borderRadius: 12, background: 'var(--color-danger-tint)',
        border: '1px solid var(--color-danger-tint)', color: 'var(--color-danger)', fontSize: 14,
      }}>
        {error ?? 'Something went wrong.'}
      </div>
    </div>
  );

  return (
    <div className="portal-screen" style={{ paddingBottom: 100 }}>
      {/* Identity — the company is the anchor: a monogram, who the case is for, and its status at a glance. */}
      <div className="portal-reveal" style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 24 }}>
        <div className="portal-mono" aria-hidden="true">{monogram(data.company ?? data.clientName)}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 5, fontVariantNumeric: 'tabular-nums' }}>
            {data.caseId}
          </div>
          <h1 style={{ fontSize: 27, fontWeight: 600, margin: 0, letterSpacing: '-0.03em', color: 'var(--text-primary)', lineHeight: 1.08, overflowWrap: 'anywhere' }}>
            {data.company ?? data.clientName}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '7px 0 0', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 7 }}>
            {data.company && <span>{data.clientName}</span>}
            {data.company && <span aria-hidden="true" style={{ color: 'var(--text-tertiary)' }}>·</span>}
            <span>Opened {new Date(data.portalActivatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            <span className="portal-chip" style={{ background: 'var(--color-neutral-tint)', color: 'var(--text-secondary)' }}>
              <span className="portal-chip-dot" style={{ background: data.status === 'CLOSED' ? 'var(--color-success)' : data.status === 'CANCELLED' ? 'var(--color-danger)' : 'var(--color-accent)' }} />
              {CASE_STATUS_LABELS[data.status] ?? data.status}
            </span>
            {/* Mandate status — derived server-side; AA-safe -800 shade on the semantic tint. */}
            <span className="portal-chip" style={{
              background: data.mandateStatus === 'UPLOADED' ? 'var(--color-success-tint)' : 'var(--color-warning-tint)',
              color: data.mandateStatus === 'UPLOADED' ? '#065F46' : '#92400E',
            }}>
              <span className="portal-chip-dot" style={{ background: data.mandateStatus === 'UPLOADED' ? '#065F46' : '#92400E' }} />
              {`Mandate ${data.mandateStatus === 'UPLOADED' ? 'uploaded' : 'pending'}`}
            </span>
          </div>
        </div>
      </div>

      {/* Progress timeline */}
      <div className="portal-card portal-reveal" style={{ padding: 20, marginBottom: 16, animationDelay: '0.07s' }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--portal-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16, marginTop: 0 }}>
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
                    background: isCompleted ? 'var(--color-success)' : isCurrent ? 'var(--color-accent)' : 'var(--border-strong)',
                    border: isCurrent ? '2px solid var(--color-neutral-tint)' : 'none',
                    boxShadow: isCurrent ? '0 0 0 3px var(--color-neutral-tint)' : 'none',
                    flexShrink: 0,
                  }} />
                  {!isLast && <div style={{ width: 2, flex: 1, background: isCompleted ? 'var(--color-success-tint)' : 'var(--bg-muted)', marginTop: 4, marginBottom: 4, minHeight: 20 }} />}
                </div>
                {/* Label */}
                <div style={{ paddingBottom: isLast ? 0 : 16 }}>
                  <div style={{
                    fontSize: 13, fontWeight: isCurrent ? 700 : isCompleted ? 600 : 500,
                    color: isCurrent ? 'var(--text-primary)' : isCompleted ? 'var(--text-secondary)' : 'var(--text-tertiary)',
                  }}>
                    {stage.label}
                  </div>
                  {stage.completedAt && (
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                      {new Date(stage.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </div>
                  )}
                  {isCurrent && (
                    /* Current step: monochrome "In progress" pill (neutral tint + secondary text) — the black
                       accent dot already marks "you are here"; one hue family per meaning. */
                    <span className="portal-chip" style={{ background: 'var(--color-neutral-tint)', color: 'var(--text-secondary)', marginTop: 4 }}>
                      <span className="portal-chip-dot" style={{ background: 'var(--text-secondary)' }} />
                      In progress
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Documents — grouped by client-meaningful category, attention-first */}
      <section className="portal-card portal-reveal" style={{ padding: 20, marginBottom: 20, animationDelay: '0.14s' }} aria-labelledby="portal-docs-h">
        <h3 id="portal-docs-h" style={{ fontSize: 12, fontWeight: 700, color: 'var(--portal-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16, marginTop: 0 }}>
          Documents
        </h3>
        {data.documents.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--portal-text-3)' }}>No documents to show yet.</p>
        ) : (
          docGroups.filter(g => g.docs.length > 0).map(g => {
            const m = DOC_CATEGORY_META[g.category];
            return (
              <div key={g.category} style={{ marginBottom: 24 }}>
                {/* Count appears once, inline in the group header (no redundant summary strip). */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--portal-text)' }}>{m.title}</h4>
                  <span style={{ fontSize: 12, color: 'var(--portal-text-3)', fontVariantNumeric: 'tabular-nums' }}>{g.docs.length}</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--portal-text-3)', marginBottom: 12 }}>{m.subtitle}</p>
                <div className="portal-doc-grid">
                  {g.docs.map(doc => (
                    <div key={doc.id} style={{ padding: 14, borderRadius: 12, background: 'var(--portal-bg)', border: '1px solid var(--portal-hairline)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--portal-text)' }}>{doc.name}</div>
                        <DocCategoryChip category={g.category} />
                      </div>
                      {doc.receivedAt && (
                        <div style={{ fontSize: 11, color: 'var(--portal-text-3)', marginTop: 6 }}>
                          Received {new Date(doc.receivedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      )}
                      {g.category === 'ACTION_REQUIRED' && (
                        <p style={{ fontSize: 12, color: 'var(--portal-text-2)', lineHeight: 1.5, marginTop: 8 }}>{ACTION_REQUIRED_GUIDANCE}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* Latest updates / notes */}
      {data.notes.length > 0 && (
        <div className="portal-card portal-reveal" style={{ padding: 20, animationDelay: '0.21s' }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--portal-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16, marginTop: 0 }}>
            Latest Updates
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {data.notes.map(note => (
              <div key={note.id} style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--portal-brand)', flexShrink: 0, marginTop: 5 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, color: 'var(--portal-text)', lineHeight: 1.55, margin: 0, marginBottom: 4 }}>
                    {note.content}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--portal-text-3)', display: 'flex', alignItems: 'center', gap: 4, margin: 0 }}>
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
  const initialId = params.get('caseId') ?? params.get('id') ?? '';

  const [screen, setScreen] = useState<Screen>(initialId && isValidCaseId(initialId) ? 'verify' : 'entry');
  const [caseId, setCaseId] = useState(initialId);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  return (
    <PortalShell wide={screen === 'case'}>
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

export function PortalPreviewPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<PortalCaseView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!caseId) return;
    import('../services/portal.service').then(({ getPortalPreview }) =>
      getPortalPreview(caseId).then(setData).catch(e => setError(e?.response?.data?.message ?? 'Unable to load preview.'))
    ).finally(() => setLoading(false));
  }, [caseId]);

  // No case chosen (reached from the staff "Client Portal" nav): pick one to preview. Reuses the case-id entry;
  // navigating to /portal-preview/:caseId renders the read-only preview below. No client session is minted.
  if (!caseId) return (
    <PortalShell>
      <CaseIdEntryScreen initialId="" onNext={(id) => navigate(`/portal-preview/${encodeURIComponent(id)}`)} />
    </PortalShell>
  );

  return (
    <PortalShell wide>
      <div style={{
        position: 'sticky', top: 0, zIndex: 50, padding: '8px 16px',
        background: 'var(--color-warning)', color: '#000', textAlign: 'center',
        fontWeight: 700, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase',
      }}>
        Internal Preview — Not Visible to Client
      </div>
      {loading ? (
        <div style={{ paddingTop: 60, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 14 }}>
          <div style={{ width: 28, height: 28, border: '2.5px solid var(--bg-muted)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          Loading preview…
        </div>
      ) : error || !data ? (
        <div style={{ padding: '40px 20px' }}>
          <div style={{ padding: 16, borderRadius: 12, background: 'var(--color-danger-tint)', border: '1px solid var(--color-danger-tint)', color: 'var(--color-danger)', fontSize: 14 }}>
            {error ?? 'Something went wrong.'}
          </div>
        </div>
      ) : (
        <CaseViewScreen sessionToken="" caseId={caseId} previewData={data} />
      )}
    </PortalShell>
  );
}
