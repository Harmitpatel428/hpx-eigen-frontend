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

function OptionInputs({ field, value, onChange, disabled, id }: Props & { id: string }) {
  const { data: options = [] } = useCaseFieldOptions(field.id);
  const sel = field.type === 'SELECT' ? [value as string] : ((value as string[]) ?? []);
  // keep currently-selected options even if inactive so saving doesn't drop them
  const active = options.filter((o) => o.isActive || sel.includes(o.id));
  const label = (o: { label: string; isActive: boolean }) => (o.isActive ? o.label : `${o.label} (inactive)`);
  if (field.type === 'SELECT') {
    return (
      <select id={id} value={(value as string) ?? ''} disabled={disabled} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">—</option>
        {active.map((o) => <option key={o.id} value={o.id}>{label(o)}</option>)}
      </select>
    );
  }
  const selected = (value as string[]) ?? [];
  return (
    <div role="group" aria-labelledby={`${id}-label`}>
      {active.map((o) => (
        <label key={o.id} style={{ display: 'block' }}>
          <input
            type="checkbox"
            checked={selected.includes(o.id)}
            disabled={disabled}
            onChange={(e) => onChange(e.target.checked ? [...selected, o.id] : selected.filter((x) => x !== o.id))}
          />{' '}
          {label(o)}
        </label>
      ))}
    </div>
  );
}

export function FieldRenderer(props: Props) {
  const { field, value, onChange, disabled } = props;
  if (field.isHidden) return null;
  const id = `case-field-${field.id}`;

  let control;
  if (field.type === 'SELECT' || field.type === 'MULTI_SELECT') {
    control = <OptionInputs {...props} id={id} />;
  } else if (field.type === 'BOOLEAN') {
    control = <input id={id} type="checkbox" checked={value === true} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />;
  } else if (field.type === 'TEXTAREA') {
    control = <textarea id={id} value={(value as string) ?? ''} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
  } else if (NUMERIC.includes(field.type)) {
    control = <input id={id} type="number" value={(value as number | string | null) ?? ''} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
  } else if (DATE_INPUT[field.type]) {
    control = <input id={id} type={DATE_INPUT[field.type]} value={(value as string) ?? ''} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
  } else {
    // ponytail: reference types are plain id text inputs in phase 11; entity pickers later
    control = <input id={id} type="text" value={(value as string) ?? ''} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
  }

  return (
    <div className="case-field">
      <label id={`${id}-label`} htmlFor={id}>
        {field.name}
        {field.isRequired && <span aria-hidden="true" title="Required"> *</span>}
      </label>
      {control}
    </div>
  );
}
