export function formatScheduled(iso: string | null, metadata?: Record<string, unknown>): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const dDay = new Date(d); dDay.setHours(0, 0, 0, 0);
  // metadata.dateOnly is authoritative when present (new records).
  // Fallback: UTC midnight heuristic for legacy records without the flag.
  const dateOnly = metadata?.dateOnly !== undefined
    ? !!metadata.dateOnly
    : d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0;
  const time = dateOnly ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const sep = time ? ' · ' : '';
  if (dDay.getTime() === today.getTime())    return `Today${sep}${time}`;
  if (dDay.getTime() === tomorrow.getTime()) return `Tomorrow${sep}${time}`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + sep + time;
}

export function formatCompleted(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' · ' +
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
