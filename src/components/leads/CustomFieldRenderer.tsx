import type { CustomFieldDef, CustomFieldValue } from '../../types';

// ── per-type renderers — no switch statements, just a lookup map ──────────────

type RenderProps = {
  field: CustomFieldDef;
  value: string | null;
  onChange: (value: string | null) => void;
  className?: string;
  readOnly?: boolean;
};

const inp = {
  background: '#f8fafc',
  border: '1px solid #cbd5e1',
  borderRadius: '0.375rem',
  padding: '6px 10px',
  fontSize: 13,
  color: '#0f172a',
  width: '100%',
  outline: 'none',
  boxSizing: 'border-box' as const,
};

const RENDERERS: Record<CustomFieldDef['type'], (p: RenderProps) => React.ReactElement> = {
  text: ({ field, value, onChange, className }) => (
    <input
      type="text"
      style={className ? undefined : inp}
      className={className}
      value={value ?? ''}
      onChange={e => onChange(e.target.value || null)}
      placeholder={field.name}
      maxLength={500}
    />
  ),
  number: ({ field, value, onChange, className }) => (
    <input
      type="number"
      style={className ? undefined : inp}
      className={className}
      value={value ?? ''}
      onChange={e => onChange(e.target.value || null)}
      placeholder={field.name}
    />
  ),
  date: ({ value, onChange, className }) => (
    <input
      type="date"
      style={className ? undefined : inp}
      className={className}
      value={value ?? ''}
      onChange={e => onChange(e.target.value || null)}
    />
  ),
  dropdown: ({ field, value, onChange, className }) => (
    <select
      style={className ? undefined : { ...inp, cursor: 'pointer' }}
      className={className}
      value={value ?? ''}
      onChange={e => onChange(e.target.value || null)}
    >
      <option value="">Select…</option>
      {field.options?.map(opt => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  ),
};

// ── read-only display (for detail panel) ─────────────────────────────────────

function ReadOnlyValue({ field, value }: { field: CustomFieldDef; value: string | null }) {
  if (value == null || value === '') {
    return <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 13 }}>—</span>;
  }
  if (field.type === 'date') {
    return <span style={{ fontSize: 13 }}>{new Date(value).toLocaleDateString('en-IN')}</span>;
  }
  return <span style={{ fontSize: 13 }}>{value}</span>;
}

// ── public component ──────────────────────────────────────────────────────────

interface Props {
  field: CustomFieldDef;
  value: string | null;
  onChange?: (value: string | null) => void;
  className?: string;
  readOnly?: boolean;
}

export function CustomFieldRenderer({ field, value, onChange, className, readOnly }: Props) {
  if (readOnly || !onChange) {
    return <ReadOnlyValue field={field} value={value} />;
  }
  const Render = RENDERERS[field.type];
  return <Render field={field} value={value} onChange={onChange} className={className} />;
}

// ── helpers used by import wizard + export ────────────────────────────────────

export function getFieldValue(values: CustomFieldValue[] | undefined, fieldId: string): string | null {
  return values?.find(v => v.fieldId === fieldId)?.value ?? null;
}

export function setFieldValue(
  prev: CustomFieldValue[],
  field: CustomFieldDef,
  value: string | null,
): CustomFieldValue[] {
  const without = prev.filter(v => v.fieldId !== field.id);
  if (value == null) return without;
  return [...without, { fieldId: field.id, key: field.key, type: field.type, value }];
}
