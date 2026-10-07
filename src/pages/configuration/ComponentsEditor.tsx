import { useState } from 'react';
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
  const patch = (c: CaseTypeComponent, payload: Parameters<typeof update.mutate>[0]['payload']) =>
    update.mutate({ caseTypeId: caseType.id, componentId: c.id, payload });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <strong className="type-ui">Components</strong>
        <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
          <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} /> Show archived
        </label>
      </div>

      {isLoading ? (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Loading…</div>
      ) : components.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>No components yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {components.map((c) => (
            <div key={c.id} className="surface" style={{ padding: 8, borderRadius: 'var(--radius-md)', opacity: c.isActive ? 1 : 0.6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</span>
                {c.isMandatory && <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>mandatory</span>}
                {!c.isActive && <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>archived</span>}
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>#{c.displayOrder}</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                  <button type="button" className="btn btn-ghost" style={{ fontSize: 11 }}
                    aria-expanded={openComponentId === c.id}
                    onClick={() => setOpenComponentId(openComponentId === c.id ? null : c.id)}>
                    {openComponentId === c.id ? 'Hide documents' : 'Documents'}
                  </button>
                  {canManage && (
                    <>
                      <button type="button" className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => patch(c, { isMandatory: !c.isMandatory })}>
                        {c.isMandatory ? 'Make optional' : 'Make mandatory'}
                      </button>
                      <button type="button" className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => patch(c, { isActive: !c.isActive })}>
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
