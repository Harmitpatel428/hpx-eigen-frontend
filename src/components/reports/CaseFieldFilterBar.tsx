import React from 'react';
import { Plus, X } from 'lucide-react';
import { useCaseFields, useCaseFieldOptions } from '../../hooks/useCaseFields';
import { operatorsForType, operatorNeedsValue, conditionUsesOption } from '../../pages/configuration/ruleSchema';
import type { CaseFieldFilter } from '../../services/documentation.service';
import type { CaseFieldType } from '../../types/caseConfig';

export const MAX_FILTERS = 5;
const NUMERIC: CaseFieldType[] = ['NUMBER', 'DECIMAL', 'CURRENCY', 'PERCENTAGE'];

function typed(type: CaseFieldType, s: string): unknown {
  if (NUMERIC.includes(type)) return Number(s);
  if (type === 'BOOLEAN') return s === 'true';
  return s;
}

interface Props { value: CaseFieldFilter[]; onChange: (f: CaseFieldFilter[]) => void }

export const CaseFieldFilterBar: React.FC<Props> = ({ value, onChange }) => {
  const { data: allFields = [] } = useCaseFields();
  const fields = allFields.filter((f) => f.filterable);
  const [fieldId, setFieldId] = React.useState('');
  const [operator, setOperator] = React.useState<CaseFieldFilter['operator']>('EQUALS');
  const [raw, setRaw] = React.useState('');
  const [rawMulti, setRawMulti] = React.useState<string[]>([]);

  const field = fields.find((f) => f.id === fieldId);
  const { data: options = [] } = useCaseFieldOptions(field && conditionUsesOption(field.type) ? field.id : null);
  const needsValue = operatorNeedsValue(operator);
  const multi = field?.type === 'MULTI_SELECT';
  const hasValue = multi ? rawMulti.length > 0 : raw !== '';
  const canAdd = !!field && value.length < MAX_FILTERS && (!needsValue || hasValue);

  const pickField = (id: string) => {
    const f = fields.find((x) => x.id === id);
    setFieldId(id); setRaw(''); setRawMulti([]);
    setOperator(f ? operatorsForType(f.type)[0] : 'EQUALS');
  };

  const add = () => {
    if (!field || !canAdd) return;
    const entry: CaseFieldFilter = { fieldId: field.id, operator };
    if (needsValue) entry.value = multi ? rawMulti : typed(field.type, raw);
    onChange([...value, entry]);
    setRaw(''); setRawMulti([]);
  };

  const nameOf = (id: string) => allFields.find((f) => f.id === id)?.name ?? id;
  const cls = 'input';
  const sty = { width: 'auto', minWidth: 140 } as const;

  let input: React.ReactNode = null;
  if (field && needsValue) {
    if (multi) {
      input = (
        <select aria-label="Filter values" multiple className={cls} style={{ ...sty, height: "auto" }} value={rawMulti}
          onChange={(e) => setRawMulti(Array.from(e.target.selectedOptions, (o) => o.value))}>
          {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      );
    } else if (conditionUsesOption(field.type)) {
      input = (
        <select aria-label="Filter value" className={cls} style={sty} value={raw} onChange={(e) => setRaw(e.target.value)}>
          <option value="">Select...</option>
          {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      );
    } else if (field.type === 'BOOLEAN') {
      input = (
        <select aria-label="Filter value" className={cls} style={sty} value={raw} onChange={(e) => setRaw(e.target.value)}>
          <option value="">Select...</option><option value="true">Yes</option><option value="false">No</option>
        </select>
      );
    } else {
      const t = NUMERIC.includes(field.type) ? 'number' : field.type === 'DATE' ? 'date' : field.type === 'DATETIME' ? 'datetime-local' : field.type === 'TIME' ? 'time' : 'text';
      input = <input aria-label="Filter value" type={t} className={cls} style={sty} value={raw} onChange={(e) => setRaw(e.target.value)} />;
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Filter field" className={cls} style={sty} value={fieldId} onChange={(e) => pickField(e.target.value)}>
          <option value="">Field...</option>
          {fields.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        {field && (
          <select aria-label="Filter operator" className={cls} style={sty} value={operator}
            onChange={(e) => setOperator(e.target.value as CaseFieldFilter['operator'])}>
            {operatorsForType(field.type).map((op) => <option key={op} value={op}>{op}</option>)}
          </select>
        )}
        {input}
        <button className="btn btn-primary" type="button" onClick={add} disabled={!canAdd}
          title={value.length >= MAX_FILTERS ? `Maximum ${MAX_FILTERS} filters` : undefined}>
          <Plus size={14} /> Add filter
        </button>
      </div>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {value.map((f, i) => (
            <li key={i} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs">
              {nameOf(f.fieldId)} {f.operator}{f.value !== undefined ? ` ${JSON.stringify(f.value)}` : ''}
              <button className="btn btn-icon" type="button" style={{ width: 18, height: 18 }} aria-label={`Remove filter ${i + 1}`} onClick={() => onChange(value.filter((_, j) => j !== i))}>
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
