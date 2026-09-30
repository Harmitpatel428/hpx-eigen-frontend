import { useAuth } from '../auth/public';
import { useCaseEngineSettings, useSetCaseEngineEnabled } from '../hooks/useCaseFields';
import { FieldBuilder } from './configuration/FieldBuilder';

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
        <h1 className="type-title" style={{ marginBottom: 'var(--space-8)' }}>Configuration</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          <button
            className="type-ui"
            aria-current="page"
            style={{ ...tabBase, backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)', fontWeight: 500 }}
          >
            Fields
          </button>
          {['Case Types', 'Rules'].map(t => (
            <button
              key={t}
              className="type-ui"
              disabled
              style={{ ...tabBase, color: 'var(--text-tertiary)', cursor: 'not-allowed', opacity: 0.6 }}
            >
              {t} <span className="type-micro">Coming soon</span>
            </button>
          ))}
        </div>
        {canManage && (
          <button
            className="type-ui"
            disabled={setEnabled.isPending}
            onClick={() => setEnabled.mutate(false)}
            style={{ marginTop: 'var(--space-8)', color: 'var(--text-tertiary)' }}
          >
            Turn off Case Operations Engine
          </button>
        )}
      </div>
      <div style={{ flex: 1, paddingBottom: 'var(--space-24)', marginTop: 72 }}>
        <FieldBuilder />
      </div>
    </div>
  );
}
