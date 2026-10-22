import { useAuth } from '../auth/public';
import { useCaseEngineSettings, useSetCaseEngineEnabled } from '../hooks/useCaseFields';
import { useState, useRef, type KeyboardEvent } from 'react';
import { CaseTypeBuilder } from './configuration/CaseTypeBuilder';

const TABS = ['Case Types'] as const;

export function ConfigurationPage() {
  const { permissions } = useAuth();
  const { data, isLoading } = useCaseEngineSettings();
  const setEnabled = useSetCaseEngineEnabled();
  const canManage = permissions.can('case-engine:manage');
  const enabled = data?.caseOperationsEngineEnabled;
  const [tab, setTab] = useState<(typeof TABS)[number]>('Case Types');
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  if (isLoading) return null;

  if (enabled === false) {
    return (
      <div style={{ maxWidth: 560, paddingTop: 'var(--space-12)' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Configuration</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 'var(--space-8)', lineHeight: 1.6 }}>
          The Case Operations Engine is off for this organization.
        </p>
        {canManage && (
          <button
            className="btn btn-primary"
            disabled={setEnabled.isPending}
            onClick={() => setEnabled.mutate(true)}
          >
            Enable
          </button>
        )}
      </div>
    );
  }

  // WAI-ARIA Tabs — automatic activation: Arrow keys move focus AND select.
  const onTabKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = TABS.indexOf(tab);
    let next = i;
    if (e.key === 'ArrowRight') next = (i + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = TABS.length - 1;
    else return;
    e.preventDefault();
    setTab(TABS[next]);
    tabRefs.current[next]?.focus();
  };

  return (
    <div style={{ maxWidth: 1280, width: '100%', minWidth: 0 }}>
      <header style={{ marginBottom: 'var(--space-4)' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Configuration</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 0, lineHeight: 1.6 }}>
          Define the case types for the Case Operations Engine.
        </p>
      </header>

      {/* Horizontal sub-nav (replaces the old left column) */}
      <div role="tablist" aria-label="Configuration sections" aria-orientation="horizontal" onKeyDown={onTabKeyDown}
        style={{ display: 'flex', borderBottom: '1px solid var(--border-medium)' }}>
        {TABS.map((t, idx) => (
          <button
            key={t}
            role="tab"
            id={`cfg-tab-${idx}`}
            ref={el => { tabRefs.current[idx] = el; }}
            aria-selected={tab === t}
            aria-controls={`cfg-panel-${idx}`}
            tabIndex={tab === t ? 0 : -1}
            onClick={() => setTab(t)}
            style={{
              padding: 'var(--space-3)', fontSize: 'var(--text-xs)', fontWeight: tab === t ? 600 : 450,
              color: tab === t ? 'var(--text-primary)' : 'var(--text-tertiary)',
              background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: tab === t ? '2px solid var(--text-primary)' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {TABS.map((t, idx) => (
        <div
          key={t}
          role="tabpanel"
          id={`cfg-panel-${idx}`}
          aria-labelledby={`cfg-tab-${idx}`}
          tabIndex={0}
          hidden={tab !== t}
          style={{ minWidth: 0, paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-24)' }}
        >
          {t === 'Case Types' && <CaseTypeBuilder />}
        </div>
      ))}

      {canManage && (
        <div role="group" aria-label="Danger zone"
          style={{ border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-md)', padding: 24, marginTop: 32 }}>
          <p className="type-micro" style={{ marginBottom: 'var(--space-2)', color: 'var(--color-danger)' }}>Danger zone</p>
          <button
            className="type-ui transition-colors hover:bg-[var(--bg-subtle)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
            disabled={setEnabled.isPending}
            onClick={() => {
              if (window.confirm('Turn off the Case Operations Engine for your whole organization?')) setEnabled.mutate(false);
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
              padding: '8px var(--space-3)', borderRadius: 'var(--radius-md)',
              justifyContent: 'flex-start', color: 'var(--color-danger)',
            }}
          >
            Turn off Case Operations Engine
          </button>
        </div>
      )}
    </div>
  );
}
