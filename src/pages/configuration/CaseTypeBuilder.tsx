import { useState } from 'react';
import { DataTable, type Column } from '../../components/DataTable';
import { useAuth } from '../../auth/public';
import { useCaseTypes, usePublishCaseType, useArchiveCaseType } from '../../hooks/useCaseTypes';
import type { CaseType, CaseTypeStatus } from '../../types/caseConfig';
import { CaseTypeFormModal } from './CaseTypeFormModal';

const STATUS_STYLE: Record<CaseTypeStatus, { bg: string; fg: string }> = {
  DRAFT: { bg: 'rgba(107,114,128,0.1)', fg: '#6b7280' },
  ACTIVE: { bg: 'rgba(22,163,74,0.1)', fg: '#16a34a' },
  ARCHIVED: { bg: 'rgba(220,38,38,0.1)', fg: '#dc2626' },
};

// Mount as <CaseTypeBuilder /> (named export, no props).
export function CaseTypeBuilder() {
  const { permissions } = useAuth();
  const canManage = permissions.can('case-type:manage');
  const canPublish = permissions.can('case-type:publish');
  const [includeArchived, setIncludeArchived] = useState(false);
  const { data = [], isLoading } = useCaseTypes(includeArchived);
  const [modal, setModal] = useState<{ open: boolean; caseType: CaseType | null }>({ open: false, caseType: null });
  const publish = usePublishCaseType();
  const archive = useArchiveCaseType();

  const columns: Column<CaseType>[] = [
    { key: 'name', label: 'Name' },
    { key: 'key', label: 'Key' },
    {
      key: 'status', label: 'Status',
      render: (s: CaseTypeStatus) => (
        <span style={{
          display: 'inline-block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
          background: STATUS_STYLE[s].bg, color: STATUS_STYLE[s].fg, padding: '3px 8px', borderRadius: 6,
        }}>{s}</span>
      ),
    },
    { key: 'displayOrder', label: 'Order' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <label className="type-ui">
          <input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} /> Show archived
        </label>
        {canManage && <button type="button" onClick={() => setModal({ open: true, caseType: null })}>New case type</button>}
      </div>
      <DataTable<CaseType>
        columns={columns}
        data={data}
        rowKey="id"
        isLoading={isLoading}
        emptyMessage="No case types yet. Create field → Activate → place on a case type → Publish → assign to a case"
        rowActions={canManage || canPublish ? (c) => (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            {canManage && <button type="button" onClick={() => setModal({ open: true, caseType: c })}>Edit</button>}
            {canPublish && c.status === 'DRAFT' && <button type="button" onClick={() => window.confirm(`Publish "${c.name}"? This cannot be undone from the UI.`) && publish.mutate(c.id)}>Publish</button>}
            {canManage && c.status !== 'ARCHIVED' && <button type="button" onClick={() => window.confirm(`Archive "${c.name}"? This cannot be undone from the UI.`) && archive.mutate(c.id)}>Archive</button>}
          </div>
        ) : undefined}
      />
      <CaseTypeFormModal isOpen={modal.open} caseType={modal.caseType} onClose={() => setModal({ open: false, caseType: null })} />
    </div>
  );
}
