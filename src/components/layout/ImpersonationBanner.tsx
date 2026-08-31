import { useState } from 'react';
import { ShieldAlert, X, Loader2 } from 'lucide-react';
import { api } from '../../auth/services/api';
import { tokenStorage } from '../../auth/storage/tokenStorage';

const IMPERSONATION_ORIGINAL_KEY = 'auth:impersonation-original-tokens';

/**
 * Save the admin's current tokens before entering impersonation.
 * Called by the admin UI that triggers impersonation.
 */
export function saveOriginalTokensForImpersonation(): void {
  const current = tokenStorage.get();
  if (current) {
    try { localStorage.setItem(IMPERSONATION_ORIGINAL_KEY, JSON.stringify(current)); } catch {}
  }
}

/**
 * Restore the admin's original tokens after exiting impersonation.
 */
function restoreOriginalTokens(): boolean {
  const raw = localStorage.getItem(IMPERSONATION_ORIGINAL_KEY);
  if (!raw) return false;
  try {
    const tokens = JSON.parse(raw);
    tokenStorage.set(tokens);
    localStorage.removeItem(IMPERSONATION_ORIGINAL_KEY);
    return true;
  } catch {
    return false;
  }
}

interface ImpersonationBannerProps {
  impersonatedUserName: string;
}

export function ImpersonationBanner({ impersonatedUserName }: ImpersonationBannerProps) {
  const [exiting, setExiting] = useState(false);

  const handleExit = async () => {
    setExiting(true);
    try {
      await api.post('/api/v1/sessions/exit-impersonation');
    } catch {
      // Session may already be revoked; proceed with token restore
    }
    const restored = restoreOriginalTokens();
    if (restored) {
      window.location.reload();
    } else {
      // No original tokens — fall back to full logout
      tokenStorage.clear();
      window.location.href = '/login';
    }
  };

  return (
    <div
      role="alert"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        background: '#b45309',
        color: '#fff',
        fontSize: 13,
        fontWeight: 600,
        boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <ShieldAlert size={15} />
        <span>Viewing as <strong>{impersonatedUserName}</strong> — Admin impersonation active</span>
      </div>
      <button
        onClick={handleExit}
        disabled={exiting}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 12px',
          borderRadius: 4,
          border: '1px solid rgba(255,255,255,0.4)',
          background: 'rgba(255,255,255,0.15)',
          color: '#fff',
          fontWeight: 600,
          fontSize: 12,
          cursor: exiting ? 'not-allowed' : 'pointer',
        }}
      >
        {exiting ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <X size={12} />}
        {exiting ? 'Exiting…' : 'Exit Impersonation'}
      </button>
    </div>
  );
}
