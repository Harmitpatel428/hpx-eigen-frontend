import { useAuth } from '../auth/public';
import { useCaseEngineSettings, useSetCaseEngineEnabled } from '../hooks/useCaseFields';
import { useState } from 'react';
import { FieldBuilder } from './configuration/FieldBuilder';
import { CaseTypeBuilder } from './configuration/CaseTypeBuilder';
import { RuleBuilder } from './configuration/RuleBuilder';

const TABS = ['Fields', 'Case Types', 'Rules'] as const;

const tabBase = {
  display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
  padding: '8px var(--space-3)', borderRadius: 'var(--radius-md)',
} as const;

export function ConfigurationPage() {
  const { permissions } = useAuth();
  const { data, isLoading } = useCaseEngineSettings();
  const setEnabled = useSetCaseEngineEnabled();
  const canManage = permissions.can('case-engine:manage');
  const enabled = data?.caseOperationsEngineEnabled;
  const [tab, setTab] = useState<(typeof TABS)[number]>('Fields');

  if (isLoading) return null;

  if (enabled === false) {
    return (
      <div style={{ maxWidth: 600, paddingTop: 72 }}>
        <h1 className="type-title" style={{ marginBottom: 'var(--space-4)' }}>Configuration</h1>
        <p className="type-body" style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
          The Case Operations Engine is off for this organization.
        </p>
        {canManage && (
          <button
            className="type-ui"
            disabled={setEnabled.isPending}
            onClick={() => setEnabled.mutate(true)}
          >
            Enable
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 'var(--space-16)', maxWidth: 1280 }}>
      <div style={{ width: 240, flexShrink: 0, position: 'sticky', top: 'var(--space-12)' }}>
        <h1 className="type-title" style={{ marginBottom: 'var(--space-2)' }}>Configuration</h1>
        <p className="type-body" style={{ marginBottom: 'var(--space-8)', color: 'var(--text-secondary)' }}>
          Define the custom fields, case types, and rules for the Case Operations Engine.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          {TABS.map(t => (
            <button
              key={t}
              className={`type-ui transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] ${tab === t ? '' : 'hover:bg-[var(--bg-subtle)]'}`}
              aria-current={tab === t ? 'page' : undefined}
              onClick={() => setTab(t)}
              style={tab === t
                ? { ...tabBase, backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)', fontWeight: 500 }
                : { ...tabBase, color: 'var(--text-secondary)' }}
            >
              {t}
            </button>
          ))}
        </div>
        {canManage && (
          <button
            className="btn btn-ghost"
            disabled={setEnabled.isPending}
            onClick={() => {
              if (window.confirm('Turn off the Case Operations Engine for your whole organization?')) setEnabled.mutate(false);
            }}
            style={{ marginTop: 'var(--space-8)', color: 'var(--color-danger)' }}
          >
            Turn off Case Operations Engine
          </button>
        )}
      </div>
      <div style={{ flex: 1, paddingBottom: 'var(--space-24)', marginTop: 72 }}>
        {tab === 'Fields' && <FieldBuilder />}
        {tab === 'Case Types' && <CaseTypeBuilder />}
        {tab === 'Rules' && <RuleBuilder />}
      </div>
    </div>
  );
}
