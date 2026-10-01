import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center" style={{ padding: 'var(--space-8) var(--space-6)', gap: 'var(--space-2)' }}>
      <span style={{ color: 'var(--text-tertiary)' }}>{icon ?? <Inbox size={28} aria-hidden="true" />}</span>
      <h3 className="type-ui" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h3>
      {children && <p className="type-body" style={{ color: 'var(--text-secondary)', maxWidth: 480 }}>{children}</p>}
      {action && <div style={{ marginTop: 'var(--space-2)' }}>{action}</div>}
    </div>
  );
}

export function LoadingRows({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', padding: 'var(--space-4) 0' }}>
      {Array.from({ length: rows }, (_, i) => <div key={i} style={{ height: 16, borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)' }} />)}
    </div>
  );
}
