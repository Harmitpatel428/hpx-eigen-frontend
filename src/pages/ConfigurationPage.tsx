import { useAuth } from '../auth/public';
import { useCaseEngineSettings, useSetCaseEngineEnabled } from '../hooks/useCaseFields';
import { useCollapsed } from '../hooks/useCollapsed';
import { useState } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
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
  const [subnavCollapsed, setSubnavCollapsed] = useCollapsed('hpx:ui:v1:configNavCollapsed');

  if (isLoading) return null;

  if (enabled === false) {
    return (
      <div style={{ maxWidth: 560, paddingTop: 'var(--space-12)' }}>
        <h1 className="type-title" style={{ marginBottom: 'var(--space-4)' }}>Configuration</h1>
        <p className="type-body" style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-8)' }}>
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

  return (
    <div style={{ maxWidth: 1280 }}>
      <header style={{ marginBottom: 'var(--space-4)' }}>
        <h1 className="type-title" style={{ marginBottom: 'var(--space-2)' }}>Configuration</h1>
        <p className="type-body" style={{ color: 'var(--text-secondary)' }}>
          Define the custom fields, case types, and rules for the Case Operations Engine.
        </p>
      </header>

      <div style={{ display: 'flex', gap: 'var(--space-16)', alignItems: 'flex-start' }}>
        <div style={{ width: subnavCollapsed ? 'auto' : 240, flexShrink: 0, position: 'sticky', top: 'var(--space-12)' }}>
          {subnavCollapsed ? (
            <button className="btn-icon" onClick={() => setSubnavCollapsed(false)}
              aria-label="Expand configuration navigation" title="Expand navigation">
              <PanelLeftOpen size={18} />
            </button>
          ) : (
          <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-2)' }}>
            <button className="btn-icon" onClick={() => setSubnavCollapsed(true)}
              aria-label="Collapse configuration navigation" title="Collapse navigation">
              <PanelLeftClose size={18} />
            </button>
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            {TABS.map(t => (
              <button
                key={t}
                className={`type-ui transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] ${tab === t ? '' : 'hover:bg-[var(--bg-subtle)]'}`}
                aria-current={tab === t ? 'page' : undefined}
                onClick={() => setTab(t)}
                style={tab === t
                  ? { ...tabBase, backgroundColor: 'var(--bg-subtle)', color: 'var(--text-primary)', fontWeight: 500 }
                  : { ...tabBase, color: 'var(--text-secondary)', backgroundColor: 'transparent' }}
              >
                {t}
              </button>
            ))}
          </nav>
          {canManage && (
            <div role="group" aria-label="Danger zone" style={{ marginTop: 'var(--space-8)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border-light)' }}>
              <p className="type-micro" style={{ marginBottom: 'var(--space-2)', color: 'var(--color-danger)' }}>Danger zone</p>
              <button
                className="type-ui transition-colors hover:bg-[var(--bg-subtle)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
                disabled={setEnabled.isPending}
                onClick={() => {
                  if (window.confirm('Turn off the Case Operations Engine for your whole organization?')) setEnabled.mutate(false);
                }}
                style={{ ...tabBase, width: '100%', justifyContent: 'flex-start', color: 'var(--color-danger)' }}
              >
                Turn off Case Operations Engine
              </button>
            </div>
          )}
          </>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0, paddingBottom: 'var(--space-24)' }}>
          {tab === 'Fields' && <FieldBuilder />}
          {tab === 'Case Types' && <CaseTypeBuilder />}
          {tab === 'Rules' && <RuleBuilder />}
        </div>
      </div>
    </div>
  );
}
