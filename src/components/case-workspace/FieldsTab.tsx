import { useState } from 'react';
import { toast } from '../notifications/notify';
import { useAuth } from '../../auth/public';
import { useCaseFieldValues, usePatchFieldValues } from '../../hooks/useCaseWorkspace';
import { extractApiError } from '../../utils/extractApiError';
import type { CaseFieldWithRuntime, StoredFieldValue } from '../../types/caseConfig';
import { buildPatchEntry, readStoredValue } from './fieldValueHelpers';
import { FieldRenderer } from './FieldRenderer';
import { Card } from '../ui/Card';
import { EmptyState, LoadingRows } from '../EmptyState';

// Stored -> form value. Dates become input-friendly strings; MULTI_SELECT becomes string[].
function toForm(field: CaseFieldWithRuntime, stored?: StoredFieldValue): unknown {
  const raw = readStoredValue(field, stored);
  if (field.type === 'MULTI_SELECT') {
    return Array.isArray(raw) ? raw.map((s: { optionId: string }) => s.optionId) : [];
  }
  if (field.type === 'DATETIME' && typeof raw === 'string') {
    // datetime-local is wall-clock local time; buildPatchEntry's new Date() parses it back as local -> round-trips.
    const d = new Date(raw);
    if (isNaN(d.getTime())) return '';
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  }
  if (typeof raw === 'string') {
    if (field.type === 'DATE') return raw.slice(0, 10);
    if (field.type === 'TIME') return raw.slice(11, 16);
  }
  return raw;
}

// buildPatchEntry parses valueDate with new Date(), which can't take a bare "HH:mm".
const forPatch = (field: CaseFieldWithRuntime, v: unknown) =>
  field.type === 'TIME' && v ? `1970-01-01T${v}:00.000Z` : v;

export function FieldsTab({ caseId, caseTypeName }: { caseId: string; caseTypeName?: string }) {
  const { permissions } = useAuth();
  const canEdit = permissions.can('doc:edit');
  const { data, isLoading, refetch } = useCaseFieldValues(caseId, true);
  const patch = usePatchFieldValues(caseId);
  const [edits, setEdits] = useState<Record<string, unknown>>({});

  if (isLoading || !data) return <LoadingRows rows={6} />;

  const fields = data.fields.filter((f) => f.isApplicable && !f.isHidden);
  const stored = new Map(data.values.map((v) => [v.fieldId, v]));
  const dirty = fields.filter((f) => f.id in edits);

  const save = () => {
    const entries = dirty.map((f) => buildPatchEntry(f, forPatch(f, edits[f.id]), stored.get(f.id)?.version));
    patch.mutate(entries, {
      onSuccess: () => { setEdits({}); toast.success('Fields saved'); },
      onError: (err) => {
        // hook only invalidates on success, so refetch explicitly on conflict
        if (extractApiError(err).status === 409) {
          toast.error('This field changed since you loaded it — reloading.');
          setEdits({});
          refetch();
        }
      },
    });
  };

  if (fields.length === 0) {
    return (
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <EmptyState title="No fields to show">No fields on this case type yet — place fields on the case type in Configuration.</EmptyState>
      </Card>
    );
  }

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-3)', padding: 'var(--space-4) var(--space-6)', borderBottom: '1px solid var(--border-light)' }}>
        <h3 className="type-ui" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Case fields</h3>
        {caseTypeName && <span className="type-ui" style={{ color: 'var(--text-tertiary)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{caseTypeName}</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2" style={{ columnGap: 'var(--space-6)', rowGap: 'var(--space-4)', padding: 'var(--space-6)' }}>
        {fields.map((f) => (
          <FieldRenderer
            key={f.id}
            field={f}
            value={f.id in edits ? edits[f.id] : toForm(f, stored.get(f.id))}
            onChange={(v) => setEdits((e) => ({ ...e, [f.id]: v }))}
            disabled={!canEdit || patch.isPending}
          />
        ))}
      </div>

      {canEdit && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-6)', borderTop: '1px solid var(--border-light)' }}>
          {dirty.length > 0 && <span className="type-ui" style={{ color: 'var(--text-tertiary)' }}>Unsaved changes</span>}
          <button className="btn btn-primary" type="button" onClick={save} disabled={dirty.length === 0 || patch.isPending}>Save</button>
        </div>
      )}
    </Card>
  );
}
