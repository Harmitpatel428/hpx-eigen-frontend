import type {
  CaseFieldType,
  CaseFieldWithRuntime,
  PatchValueEntry,
  StoredFieldValue,
} from '../../types/caseConfig';

export type ValueColumn = 'valueText' | 'valueNumber' | 'valueBoolean' | 'valueDate' | 'optionId' | 'selections';

export function valueColumnFor(type: CaseFieldType): ValueColumn {
  switch (type) {
    case 'NUMBER': case 'DECIMAL': case 'CURRENCY': case 'PERCENTAGE': return 'valueNumber';
    case 'BOOLEAN': return 'valueBoolean';
    case 'DATE': case 'DATETIME': case 'TIME': return 'valueDate';
    case 'SELECT': return 'optionId';
    case 'MULTI_SELECT': return 'selections';
    default: return 'valueText';
  }
}

// Runtime defaultValue is the SET_DEFAULT rule payload — { value } | { optionId } | { optionIds } —
// not a column value, so unwrap it into the same shape the stored column would have.
function decodeDefault(field: CaseFieldWithRuntime): unknown {
  const d = field.defaultValue;
  if (d == null || typeof d !== 'object') return d ?? null;
  const p = d as { value?: unknown; optionId?: string; optionIds?: string[] };
  switch (valueColumnFor(field.type)) {
    case 'optionId': return p.optionId ?? null;
    case 'selections': return (p.optionIds ?? []).map((optionId) => ({ optionId }));
    default: return p.value ?? null;
  }
}

export function readStoredValue(field: CaseFieldWithRuntime, value: StoredFieldValue | undefined): unknown {
  if (!value) return decodeDefault(field);
  return value[valueColumnFor(field.type)];
}

export function buildPatchEntry(field: CaseFieldWithRuntime, formValue: unknown, version?: number): PatchValueEntry {
  const entry: PatchValueEntry = { fieldId: field.id };
  switch (valueColumnFor(field.type)) {
    case 'valueNumber':
      entry.valueNumber = formValue === '' || formValue == null ? null : Number(formValue);
      break;
    case 'valueBoolean':
      entry.valueBoolean = formValue == null ? null : (formValue as boolean);
      break;
    case 'valueDate':
      entry.valueDate = formValue ? new Date(formValue as string).toISOString() : null;
      break;
    case 'optionId':
      entry.optionId = (formValue as string) || null;
      break;
    case 'selections':
      entry.selections = ((formValue as string[]) ?? []).map((optionId) => ({ optionId }));
      break;
    default:
      entry.valueText = formValue == null || formValue === '' ? null : String(formValue);
  }
  if (version !== undefined) entry.version = version;
  return entry;
}
