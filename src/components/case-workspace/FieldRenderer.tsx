import { useCaseFieldOptions } from '../../hooks/useCaseFields';
import type { CaseFieldWithRuntime } from '../../types/caseConfig';

interface Props {
  field: CaseFieldWithRuntime;
  /** form value: string | number | boolean | null; string[] of option ids for MULTI_SELECT */
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}

const NUMERIC = ['NUMBER', 'DECIMAL', 'CURRENCY', 'PERCENTAGE'];
const DATE_INPUT: Record<string, string> = { DATE: 'date', DATETIME: 'datetime-local', TIME: 'time' };
const TYPE_HINT: Record<string, string> = {
  TEXT: 'Text', TEXTAREA: 'Long text', NUMBER: 'Number', DECIMAL: 'Decimal',
  CURRENCY: 'Currency', PERCENTAGE: 'Percent', DATE: 'Date', DATETIME: 'Date & time',
  TIME: 'Time', BOOLEAN: 'Yes / no', SELECT: 'Select', MULTI_SELECT: 'Multi-select',
};

function OptionInputs({ field, value, onChange, disabled, id }: Props & { id: string }) {
  const { data: options = [] } = useCaseFieldOptions(field.id);
  const sel = field.type === 'SELECT' ? [value as string] : ((value as string[]) ?? []);
  // keep currently-selected options even if inactive so saving doesn't drop them
  const active = options.filter((o) => o.isActive || sel.includes(o.id));
  const label = (o: { label: string; isActive: boolean }) => (o.isActive ? o.label : `${o.label} (inactive)`);
  if (field.type === 'SELECT') {
    return (
      <select id={id} className="input" value={(value as string) ?? ''} disabled={disabled} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">—</option>
        {active.map((o) => <option key={o.id} value={o.id} title={label(o)}>{label(o)}</option>)}
      </select>
    );
  }
  const selected = (value as string[]) ?? [];
  return (
    <div
      role="group"
      aria-labelledby={`${id}-label`}
      className="input"
      style={{ height: 'auto', minHeight: 40, padding: 'var(--space-2) var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}
    >
      {active.map((o) => (
        <label key={o.id} title={label(o)} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', minWidth: 0, cursor: disabled ? 'default' : 'pointer' }}>
          <input
            type="checkbox"
            style={{ flexShrink: 0 }}
            checked={selected.includes(o.id)}
            disabled={disabled}
            onChange={(e) => onChange(e.target.checked ? [...selected, o.id] : selected.filter((x) => x !== o.id))}
          />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{label(o)}</span>
        </label>
      ))}
    </div>
  );
}

export function FieldRenderer(props: Props) {
  const { field, value, onChange, disabled } = props;
  if (field.isHidden) return null;
  const id = `case-field-${field.id}`;
  const hint = TYPE_HINT[field.type] ?? field.type;

  let control;
  if (field.type === 'SELECT' || field.type === 'MULTI_SELECT') {
    control = <OptionInputs {...props} id={id} />;
  } else if (field.type === 'BOOLEAN') {
    control = <input id={id} type="checkbox" style={{ width: 18, height: 18 }} checked={value === true} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />;
  } else if (field.type === 'TEXTAREA') {
    control = <textarea id={id} className="input" style={{ height: 'auto', minHeight: 80, paddingTop: 'var(--space-2)', paddingBottom: 'var(--space-2)', resize: 'vertical' }} value={(value as string) ?? ''} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
  } else if (NUMERIC.includes(field.type)) {
    control = <input id={id} className="input" type="number" value={(value as number | string | null) ?? ''} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
  } else if (DATE_INPUT[field.type]) {
    control = <input id={id} className="input" type={DATE_INPUT[field.type]} value={(value as string) ?? ''} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
  } else {
    // ponytail: reference types are plain id text inputs in phase 11; entity pickers later
    control = <input id={id} className="input" type="text" value={(value as string) ?? ''} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
  }

  return (
    <div className="case-field" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', minWidth: 0 }}>
      <label
        id={`${id}-label`}
        htmlFor={id}
        className="type-ui"
        style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)', color: 'var(--text-primary)', minWidth: 0 }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{field.name}</span>
        {field.isRequired && <span aria-hidden="true" title="Required" style={{ color: 'var(--color-danger)', flexShrink: 0 }}>*</span>}
        <span aria-hidden="true" style={{ marginLeft: 'auto', flexShrink: 0, fontSize: 'var(--text-micro)', fontWeight: 400, color: 'var(--text-tertiary)' }}>{hint}</span>
      </label>
      {control}
    </div>
  );
}
