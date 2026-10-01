import { useState } from 'react';
import { useAuth } from '../../auth/public';
import { useCaseFieldOptions, useCreateOption, useUpdateOption, useArchiveOption } from '../../hooks/useCaseFields';

interface Props { fieldId: string | null; disabled?: boolean }

export function FieldOptionsEditor({ fieldId, disabled }: Props) {
  const { permissions } = useAuth();
  const canManage = permissions.can('case-field:manage') && !disabled;
  const { data: options = [], isLoading } = useCaseFieldOptions(fieldId);
  const createOpt = useCreateOption();
  const updateOpt = useUpdateOption();
  const archiveOpt = useArchiveOption();
  const [draft, setDraft] = useState({ key: '', label: '', displayOrder: '' });

  if (!fieldId) {
    return <p className="type-ui" style={{ color: 'var(--text-tertiary)' }}>Save the field first, then add options.</p>;
  }

  const add = () => {
    if (!draft.key.trim() || !draft.label.trim()) return;
    createOpt.mutate(
      {
        fieldId,
        payload: {
          key: draft.key.trim(), label: draft.label.trim(),
          ...(draft.displayOrder !== '' ? { displayOrder: Number(draft.displayOrder) } : {}),
        },
      },
      { onSuccess: () => setDraft({ key: '', label: '', displayOrder: '' }) },
    );
  };

  // ponytail: numeric displayOrder edit; drag-reorder later
  const commit = (optionId: string, payload: { label?: string; displayOrder?: number }) =>
    updateOpt.mutate({ fieldId, optionId, payload });

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
      // Enter here must never submit the enclosing field form; in the new-option row it adds the option.
      onKeyDown={(e) => {
        if (e.key !== 'Enter' || !(e.target instanceof HTMLInputElement)) return;
        e.preventDefault();
        if (e.target.getAttribute('aria-label')?.startsWith('New option')) add();
        else e.target.blur();
      }}
    >
      <div className="type-ui" style={{ fontWeight: 500 }}>Options</div>
      {isLoading && <p className="type-ui">Loading options...</p>}
      <table style={{ width: '100%', fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: 'left' }}><th>Key</th><th>Label</th><th>Order</th><th /></tr>
        </thead>
        <tbody>
          {options.map((o) => (
            <tr key={o.id}>
              <td>{o.key}</td>
              <td>
                <input className="input" defaultValue={o.label} disabled={!canManage} aria-label={`Label for ${o.key}`}
                  onBlur={(e) => e.target.value.trim() && e.target.value !== o.label && commit(o.id, { label: e.target.value.trim() })} />
              </td>
              <td>
                <input className="input" type="number" style={{ width: 70 }} defaultValue={o.displayOrder} disabled={!canManage}
                  aria-label={`Order for ${o.key}`}
                  onBlur={(e) => e.target.value !== '' && Number(e.target.value) !== o.displayOrder && commit(o.id, { displayOrder: Number(e.target.value) })} />
              </td>
              <td>
                {canManage && (
                  <button className="btn btn-ghost" type="button" onClick={() => archiveOpt.mutate({ fieldId, optionId: o.id })}>Archive</button>
                )}
              </td>
            </tr>
          ))}
          {canManage && (
            <tr>
              <td><input className="input" placeholder="key" value={draft.key} onChange={(e) => setDraft({ ...draft, key: e.target.value })} aria-label="New option key" /></td>
              <td><input className="input" placeholder="label" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} aria-label="New option label" /></td>
              <td><input className="input" type="number" style={{ width: 70 }} value={draft.displayOrder} onChange={(e) => setDraft({ ...draft, displayOrder: e.target.value })} aria-label="New option order" /></td>
              <td><button className="btn btn-ghost" type="button" onClick={add} disabled={createOpt.isPending}>Add</button></td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
