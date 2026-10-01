import { useState } from 'react';
import { DataTable, type Column } from '../../components/DataTable';
import { useAuth } from '../../auth/public';
import {
  useCaseFields, useActivateField, useSetFieldReadOnly, useArchiveField,
} from '../../hooks/useCaseFields';
import type { CaseFieldDefinition, CaseFieldStatus } from '../../types/caseConfig';
import { FieldFormModal } from './FieldFormModal';

const STATUS_STYLE: Record<CaseFieldStatus, { bg: string; fg: string }> = {
  DRAFT: { bg: 'rgba(107,114,128,0.1)', fg: '#6b7280' },
  ACTIVE: { bg: 'rgba(22,163,74,0.1)', fg: '#16a34a' },
  READ_ONLY: { bg: 'rgba(37,99,235,0.1)', fg: '#2563eb' },
  ARCHIVED: { bg: 'rgba(220,38,38,0.1)', fg: '#dc2626' },
};

const FLAGS = [['reportable', 'Reportable'], ['filterable', 'Filterable'], ['sortable', 'Sortable']] as const;

// Mount as <FieldBuilder /> (named export, no props).
export function FieldBuilder() {
  const { permissions } = useAuth();
  const canManage = permissions.can('case-field:manage');
  const [includeArchived, setIncludeArchived] = useState(false);
  const { data = [], isLoading } = useCaseFields(includeArchived);
  const [modal, setModal] = useState<{ open: boolean; field: CaseFieldDefinition | null }>({ open: false, field: null });
  const activate = useActivateField();
  const setReadOnly = useSetFieldReadOnly();
  const archive = useArchiveField();

  const columns: Column<CaseFieldDefinition>[] = [
    { key: 'name', label: 'Name' },
    { key: 'key', label: 'Key' },
    { key: 'type', label: 'Type' },
    {
      key: 'status', label: 'Status',
      render: (s: CaseFieldStatus) => (
        <span style={{
          display: 'inline-block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
          background: STATUS_STYLE[s].bg, color: STATUS_STYLE[s].fg, padding: '3px 8px', borderRadius: 6,
        }}>{s}</span>
      ),
    },
    { key: 'flags', label: 'Flags', render: (_v, r) => {
      const on = FLAGS.filter(([k]) => (r as unknown as Record<string, unknown>)[k]);
      return on.length
        ? <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4 }}>{on.map(([k, l]) => <span key={k} className="chip">{l}</span>)}</span>
        : <span style={{ color: 'var(--text-tertiary)' }}>—</span>;
    } },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <label className="type-ui">
          <input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} /> Show archived
        </label>
        {canManage && <button className="btn btn-ghost" type="button" onClick={() => setModal({ open: true, field: null })}>New field</button>}
      </div>
      <DataTable<CaseFieldDefinition>
        columns={columns}
        data={data}
        rowKey="id"
        isLoading={isLoading}
        emptyTitle="No fields yet"
        emptyMessage="No fields yet. Create field → Activate → place on a case type → Publish → assign to a case"
        rowActions={canManage ? (f) => (
          <div className="whitespace-nowrap" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" type="button" onClick={() => setModal({ open: true, field: f })}>Edit</button>
            {f.status === 'DRAFT' && <button className="btn btn-ghost" type="button" onClick={() => activate.mutate(f.id)}>Activate</button>}
            {f.status === 'ACTIVE' && <button className="btn btn-ghost" type="button" onClick={() => window.confirm(`Set "${f.name}" to read-only? This cannot be undone from the UI.`) && setReadOnly.mutate(f.id)}>Set read-only</button>}
            {f.status !== 'ARCHIVED' && <button className="btn btn-ghost" type="button" onClick={() => window.confirm(`Archive "${f.name}"? This cannot be undone from the UI.`) && archive.mutate(f.id)}>Archive</button>}
          </div>
        ) : undefined}
      />
      <FieldFormModal isOpen={modal.open} field={modal.field} onClose={() => setModal({ open: false, field: null })} />
    </div>
  );
}
