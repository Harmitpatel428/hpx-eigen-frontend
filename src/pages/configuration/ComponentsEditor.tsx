import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { useAuth } from '../../auth/public';
import { useCaseTypeComponentList, useCreateComponent, useUpdateComponent } from '../../hooks/useCaseTypes';
import type { CaseType, CaseTypeComponent } from '../../types/caseConfig';
import { ComponentDocumentsPanel } from './ComponentDocumentsPanel';

interface Props {
  caseType: CaseType;
  disabled?: boolean; // archived/soft-deleted case type → read-only
}

/**
 * Reusable sub-panel for a case type's reusable document components.
 * Rendered inside the case-type editor (CaseTypeFormModal) for saved types.
 */
export function ComponentsEditor({ caseType, disabled = false }: Props) {
  const { permissions } = useAuth();
  const canManage = permissions.can('case-type:manage') && !disabled;

  const [includeInactive, setIncludeInactive] = useState(true);
  const { data: components = [], isLoading } = useCaseTypeComponentList(caseType.id, includeInactive);
  const create = useCreateComponent();
  const update = useUpdateComponent();

  const [openComponentId, setOpenComponentId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: '', description: '', isMandatory: false, displayOrder: 0 });
  const resetDraft = () => setDraft({ name: '', description: '', isMandatory: false, displayOrder: 0 });

  const addComponent = () => {
    if (!draft.name.trim()) return;
    create.mutate(
      { caseTypeId: caseType.id, payload: { name: draft.name.trim(), description: draft.description.trim() || null, isMandatory: draft.isMandatory, displayOrder: draft.displayOrder } },
      { onSuccess: resetDraft },
    );
  };
  const patch = (c: CaseTypeComponent, payload: Parameters<typeof update.mutate>[0]['payload'], options?: Parameters<typeof update.mutate>[1]) =>
    update.mutate({ caseTypeId: caseType.id, componentId: c.id, payload }, options);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ name: '', description: '', displayOrder: 0, isMandatory: false });
  const startEdit = (c: CaseTypeComponent) => {
    setEditDraft({ name: c.name, description: c.description ?? '', displayOrder: c.displayOrder, isMandatory: c.isMandatory });
    setEditingId(c.id);
  };
  const editValid = !!editDraft.name.trim() && Number.isInteger(editDraft.displayOrder) && editDraft.displayOrder >= 0;
  const saveEdit = (c: CaseTypeComponent) => {
    if (!editValid || update.isPending) return;
    // isActive is re-sent unchanged on purpose (defensive against a full-replace handler); only onSuccess closes the editor so a failure can be retried.
    patch(c, { name: editDraft.name.trim(), description: editDraft.description.trim() || null, displayOrder: editDraft.displayOrder, isMandatory: editDraft.isMandatory, isActive: c.isActive },
      { onSuccess: () => setEditingId(null) });
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
          <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} /> Show archived
        </label>
      </div>

      {isLoading ? (
        <div className="type-ui">Loading…</div>
      ) : components.length === 0 ? (
        <div className="type-ui">No components yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {components.map((c) => (
            <div key={c.id} className="surface" style={{ padding: 8, borderRadius: 'var(--radius-md)', opacity: c.isActive ? 1 : 0.6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {editingId === c.id ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end', flex: '1 1 100%' }}>
                    <label style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 2, flex: '1 1 140px' }}>
                      Name
                      <input className="input" value={editDraft.name} maxLength={200} onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })} />
                    </label>
                    <label style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 2, flex: '2 1 160px' }}>
                      Description
                      <input className="input" value={editDraft.description} maxLength={2000} onChange={(e) => setEditDraft({ ...editDraft, description: e.target.value })} />
                    </label>
                    <label style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 2, width: 80 }}>
                      Order
                      <input className="input" type="number" min={0} step={1} value={editDraft.displayOrder} onChange={(e) => setEditDraft({ ...editDraft, displayOrder: e.target.value === '' ? NaN : Number(e.target.value) })} />
                    </label>
                    <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input type="checkbox" checked={editDraft.isMandatory} onChange={(e) => setEditDraft({ ...editDraft, isMandatory: e.target.checked })} /> Mandatory
                    </label>
                    <button type="button" className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => setEditingId(null)}>Cancel</button>
                    <button type="button" className="btn btn-primary" style={{ fontSize: 12 }} disabled={!editValid || update.isPending} onClick={() => saveEdit(c)}>
                      {update.isPending ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                ) : (
                  <>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</span>
                    {c.isMandatory && <span className="chip">mandatory</span>}
                    {!c.isActive && <span className="chip">archived</span>}
                    <span style={{ fontSize: 'var(--text-micro)', color: 'var(--text-tertiary)' }}>#{c.displayOrder}</span>
                  </>
                )}
                <div style={{ marginLeft: 'auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 6 }}>
                  <button type="button" className="btn btn-secondary" style={{ fontSize: 11 }}
                    aria-expanded={openComponentId === c.id}
                    onClick={() => setOpenComponentId(openComponentId === c.id ? null : c.id)}>
                    {openComponentId === c.id ? 'Hide documents' : 'Documents'}
                  </button>
                  {canManage && (
                    <>
                      <button type="button" className="btn btn-secondary" style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }} aria-label={`Edit ${c.name}`} onClick={() => startEdit(c)}>
                        <Pencil size={12} aria-hidden="true" /> Edit
                      </button>
                      <button type="button" className="btn btn-secondary" style={{ fontSize: 11 }} disabled={editingId === c.id} onClick={() => patch(c, { isMandatory: !c.isMandatory })}>
                        {c.isMandatory ? 'Make optional' : 'Make mandatory'}
                      </button>
                      <button type="button" className="btn btn-secondary" style={{ fontSize: 11 }} disabled={editingId === c.id} onClick={() => patch(c, { isActive: !c.isActive })}>
                        {c.isActive ? 'Archive' : 'Reactivate'}
                      </button>
                    </>
                  )}
                </div>
              </div>
              {openComponentId === c.id && (
                <ComponentDocumentsPanel caseTypeId={caseType.id} component={c} disabled={disabled} />
              )}
            </div>
          ))}
        </div>
      )}

      {canManage && (
        <div className="surface" style={{ padding: 10, borderRadius: 'var(--radius-md)', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end', marginTop: 8 }}>
          <label style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 2 }}>
            Name
            <input className="input" value={draft.name} maxLength={200} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </label>
          <label style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 160 }}>
            Description
            <input className="input" value={draft.description} maxLength={2000} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </label>
          <label style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 2, width: 80 }}>
            Order
            <input className="input" type="number" min={0} value={draft.displayOrder} onChange={(e) => setDraft({ ...draft, displayOrder: Math.max(0, Number(e.target.value) || 0) })} />
          </label>
          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
            <input type="checkbox" checked={draft.isMandatory} onChange={(e) => setDraft({ ...draft, isMandatory: e.target.checked })} /> Mandatory
          </label>
          <button type="button" className="btn btn-primary" style={{ fontSize: 12 }} disabled={!draft.name.trim() || create.isPending} onClick={addComponent}>
            {create.isPending ? 'Adding…' : 'Add component'}
          </button>
        </div>
      )}
      {disabled && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>This case type is archived — components are read-only.</div>}
    </div>
  );
}
