import { useState } from 'react';
import { useAuth } from '../../auth/public';
import { useComponentDocumentList, useCreateComponentDocument, useUpdateComponentDocument } from '../../hooks/useCaseTypes';
import type { CaseTypeComponent, CaseTypeComponentDocument } from '../../types/caseConfig';

interface Props {
  caseTypeId: string;
  component: CaseTypeComponent;
  /** True when the parent case type is archived/soft-deleted. */
  disabled?: boolean;
}

/**
 * The document preset lines a component requires. These are what actually
 * materialize case requirements — the component itself creates nothing.
 */
export function ComponentDocumentsPanel({ caseTypeId, component, disabled = false }: Props) {
  const { permissions } = useAuth();
  // The API 422s on writes against an archived type or component; do not offer
  // actions that are guaranteed to fail.
  const componentWritable = component.isActive && !component.deletedAt;
  const canManage = permissions.can('case-type:manage') && !disabled && componentWritable;

  const [includeInactive, setIncludeInactive] = useState(true);
  const { data: documents = [], isLoading } = useComponentDocumentList(caseTypeId, component.id, includeInactive);
  const create = useCreateComponentDocument();
  const update = useUpdateComponentDocument();

  const [draft, setDraft] = useState({ name: '', description: '', isMandatory: false, displayOrder: 0 });
  const resetDraft = () => setDraft({ name: '', description: '', isMandatory: false, displayOrder: 0 });

  const addDocument = () => {
    if (!draft.name.trim()) return;
    create.mutate(
      { caseTypeId, componentId: component.id, payload: { name: draft.name.trim(), description: draft.description.trim() || null, isMandatory: draft.isMandatory, displayOrder: draft.displayOrder } },
      { onSuccess: resetDraft },
    );
  };
  const patch = (d: CaseTypeComponentDocument, payload: Parameters<typeof update.mutate>[0]['payload']) =>
    update.mutate({ caseTypeId, componentId: component.id, componentDocumentId: d.id, payload });

  return (
    <div style={{ marginTop: 8, paddingLeft: 12, borderLeft: '2px solid var(--border-medium)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <strong style={{ fontSize: 12 }}>Required documents</strong>
        <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
          <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} /> Show archived
        </label>
      </div>

      {isLoading ? (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Loading…</div>
      ) : documents.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>No documents yet — this component creates no requirements.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {documents.map((d) => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, opacity: d.isActive ? 1 : 0.6 }}>
              <span style={{ fontWeight: 600 }}>{d.name}</span>
              {d.isMandatory && <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>mandatory</span>}
              {!d.isActive && <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>archived</span>}
              <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>#{d.displayOrder}</span>
              {canManage && (
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                  <button type="button" className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => patch(d, { isMandatory: !d.isMandatory })}>
                    {d.isMandatory ? 'Make optional' : 'Make mandatory'}
                  </button>
                  <button type="button" className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => patch(d, { isActive: !d.isActive })}>
                    {d.isActive ? 'Archive' : 'Reactivate'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {canManage && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'flex-end', marginTop: 8 }}>
          <label style={{ fontSize: 11, display: 'flex', flexDirection: 'column', gap: 2 }}>
            Document name
            <input className="input" value={draft.name} maxLength={200} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </label>
          <label style={{ fontSize: 11, display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 140 }}>
            Description
            <input className="input" value={draft.description} maxLength={2000} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </label>
          <label style={{ fontSize: 11, display: 'flex', flexDirection: 'column', gap: 2, width: 72 }}>
            Order
            <input className="input" type="number" min={0} value={draft.displayOrder} onChange={(e) => setDraft({ ...draft, displayOrder: Math.max(0, Number(e.target.value) || 0) })} />
          </label>
          <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
            <input type="checkbox" checked={draft.isMandatory} onChange={(e) => setDraft({ ...draft, isMandatory: e.target.checked })} /> Mandatory
          </label>
          <button type="button" className="btn btn-primary" style={{ fontSize: 11 }} disabled={!draft.name.trim() || create.isPending} onClick={addDocument}>
            {create.isPending ? 'Adding…' : 'Add document'}
          </button>
        </div>
      )}
      {!componentWritable && !disabled && (
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>This component is archived — its documents are read-only.</div>
      )}
    </div>
  );
}
