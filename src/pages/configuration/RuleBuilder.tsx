import { useState } from 'react';
import { DataTable, type Column } from '../../components/DataTable';
import { useAuth } from '../../auth/public';
import { useCaseFields } from '../../hooks/useCaseFields';
import { useCaseFieldRules, useArchiveRule } from '../../hooks/useCaseFieldRules';
import type { CaseFieldRule } from '../../types/caseConfig';
import { RuleFormModal } from './RuleFormModal';

// Mount as <RuleBuilder /> (named export, no props).
export function RuleBuilder() {
  const { permissions } = useAuth();
  const canManage = permissions.can('case-field:manage');
  const [includeArchived, setIncludeArchived] = useState(false);
  const { data = [], isLoading } = useCaseFieldRules(includeArchived);
  const { data: fields = [] } = useCaseFields(true);
  const archive = useArchiveRule();
  const [modal, setModal] = useState<{ open: boolean; rule: CaseFieldRule | null }>({ open: false, rule: null });

  const fname = (id: string) => fields.find((f) => f.id === id)?.name ?? id;
  const condSummary = (r: CaseFieldRule) => {
    const v = r.conditionOptionId ? `option ${r.conditionOptionId}` : r.conditionValue != null ? String(r.conditionValue) : '';
    return [fname(r.conditionFieldId), r.conditionOperator, v].filter(Boolean).join(' · ');
  };

  const columns: Column<CaseFieldRule>[] = [
    { key: 'name', label: 'Name' },
    { key: 'condition', label: 'Condition', render: (_v, r) => condSummary(r) },
    { key: 'effectType', label: 'Effect' },
    { key: 'targetFieldId', label: 'Target', render: (id: string) => fname(id) },
    { key: 'priority', label: 'Priority' },
    {
      key: 'isActive', label: 'Active',
      render: (on: boolean) => (
        <span style={{
          fontSize: 11, fontWeight: 600, textTransform: 'uppercase', padding: '3px 8px', borderRadius: 6,
          background: on ? 'rgba(22,163,74,0.1)' : 'rgba(107,114,128,0.1)', color: on ? '#16a34a' : '#6b7280',
        }}>{on ? 'Active' : 'Inactive'}</span>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <label className="type-ui">
          <input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} /> Show archived
        </label>
        {canManage && <button type="button" onClick={() => setModal({ open: true, rule: null })}>New rule</button>}
      </div>
      <DataTable<CaseFieldRule>
        columns={columns}
        data={data}
        rowKey="id"
        isLoading={isLoading}
        emptyMessage="No rules yet"
        rowActions={canManage ? (r) => (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setModal({ open: true, rule: r })}>Edit</button>
            {!r.deletedAt && <button type="button" onClick={() => window.confirm(`Archive rule "${r.name}"?`) && archive.mutate(r.id)}>Archive</button>}
          </div>
        ) : undefined}
      />
      <RuleFormModal isOpen={modal.open} rule={modal.rule} onClose={() => setModal({ open: false, rule: null })} />
    </div>
  );
}
