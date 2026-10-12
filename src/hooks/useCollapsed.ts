import { useState, useEffect } from 'react';

// Per-browser collapsed/expanded state for a nav panel, persisted under the
// existing hpx:ui:v1:* localStorage convention. Graceful fallback when storage
// is unavailable (private mode, blocked): defaults to expanded, writes no-op.
export function useCollapsed(key: string): [boolean, (v: boolean) => void] {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(key) === '1'; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, collapsed ? '1' : '0'); } catch { /* storage unavailable */ }
  }, [key, collapsed]);
  return [collapsed, setCollapsed];
}
