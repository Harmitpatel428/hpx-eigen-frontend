import { useState } from 'react';
import { useAuth } from '../../auth/public';
import { useCaseFields } from '../../hooks/useCaseFields';
import { usePlacements, useAddPlacement, useUpdatePlacement, useRemovePlacement } from '../../hooks/useCaseTypes';

interface Props { caseTypeId: string; disabled?: boolean }

// ponytail: Up/Down displayOrder swap; dnd-kit drag-reorder is the later upgrade
export function PlacementEditor({ caseTypeId, disabled = false }: Props) {
  const { permissions } = useAuth();
  const canEdit = permissions.can('case-type:manage') && !disabled;
  const { data: placements = [] } = usePlacements(caseTypeId);
  const { data: fields = [] } = useCaseFields();
  const add = useAddPlacement();
  const update = useUpdatePlacement();
  const remove = useRemovePlacement();
  const [pick, setPick] = useState('');

  const sorted = [...placements].sort((a, b) => a.displayOrder - b.displayOrder);
  const nameOf = (id: string) => fields.find((f) => f.id === id)?.name ?? id;
  const placed = new Set(sorted.map((p) => p.fieldId));
  const available = fields.filter((f) => f.status === 'ACTIVE' && !placed.has(f.id));
  const nextOrder = sorted.length ? Math.max(...sorted.map((p) => p.displayOrder)) + 1 : 0;

  const swap = (i: number, j: number) => {
    const a = sorted[i], b = sorted[j];
    // equal orders would make a swap a no-op; fall back to index positions
    const ao = a.displayOrder === b.displayOrder ? i : a.displayOrder;
    const bo = a.displayOrder === b.displayOrder ? j : b.displayOrder;
    update.mutate({ caseTypeId, fieldId: a.fieldId, displayOrder: bo });
    update.mutate({ caseTypeId, fieldId: b.fieldId, displayOrder: ao });
  };

  return (
    <div>
      <div className="type-ui" style={{ fontWeight: 600, marginBottom: 8 }}>Placed fields</div>
      {sorted.length === 0 && <div className="type-ui">No fields placed yet.</div>}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {sorted.map((p, i) => (
          <li key={p.fieldId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
            <span style={{ flex: 1 }}>{nameOf(p.fieldId)}</span>
            {canEdit && (<>
              <button type="button" aria-label={`Move ${nameOf(p.fieldId)} up`} disabled={i === 0} onClick={() => swap(i, i - 1)}>Up</button>
              <button type="button" aria-label={`Move ${nameOf(p.fieldId)} down`} disabled={i === sorted.length - 1} onClick={() => swap(i, i + 1)}>Down</button>
              <button type="button" aria-label={`Remove ${nameOf(p.fieldId)}`} onClick={() => remove.mutate({ caseTypeId, fieldId: p.fieldId })}>Remove</button>
            </>)}
          </li>
        ))}
      </ul>
      {canEdit && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <select className="input" aria-label="Field to add" value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">Select a field…</option>
            {available.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <button type="button" disabled={!pick} onClick={() => add.mutate({ caseTypeId, payload: { fieldId: pick, displayOrder: nextOrder } }, { onSuccess: () => setPick('') })}>Add</button>
        </div>
      )}
    </div>
  );
}
