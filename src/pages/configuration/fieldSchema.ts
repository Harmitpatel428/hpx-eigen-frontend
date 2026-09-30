import { z } from 'zod';
import type { CaseFieldDefinition, CaseFieldType, CreateCaseFieldPayload, UpdateCaseFieldPayload } from '../../types/caseConfig';

export const KEY_RE = /^[a-z][a-z0-9_]*$/;

export const FIELD_TYPES = [
  'TEXT', 'TEXTAREA', 'NUMBER', 'DECIMAL', 'CURRENCY', 'PERCENTAGE',
  'DATE', 'DATETIME', 'TIME', 'BOOLEAN', 'SELECT', 'MULTI_SELECT',
  'EMAIL', 'PHONE', 'URL', 'USER_REFERENCE', 'DEPARTMENT_REFERENCE',
  'CASE_REFERENCE', 'DOCUMENT_REFERENCE',
] as const satisfies readonly CaseFieldType[];

// Numeric rule inputs are kept as strings in the form (empty = unset) and
// converted in buildValidationRules; this avoids ''->0 coercion surprises.
const numStr = z.string().optional().refine((v) => !v || Number.isFinite(Number(v)), 'Must be a number');

export const fieldFormSchema = z.object({
  key: z.string().regex(KEY_RE, 'lowercase snake_case, must start with a letter').max(64),
  name: z.string().min(1, 'Required').max(200),
  description: z.string().max(2000).optional(),
  type: z.enum(FIELD_TYPES),
  reportable: z.boolean(),
  filterable: z.boolean(),
  minLength: numStr,
  maxLength: numStr,
  pattern: z.string().optional(),
  min: numStr,
  max: numStr,
  integer: z.boolean().optional(),
  minDate: z.string().optional(),
  maxDate: z.string().optional(),
  minSelections: numStr,
  maxSelections: numStr,
});

export type FieldFormValues = z.infer<typeof fieldFormSchema>;

const RULE_KEYS: Partial<Record<CaseFieldType, { num: string[]; str: string[]; bool: string[] }>> = {
  TEXT: { num: ['minLength', 'maxLength'], str: ['pattern'], bool: [] },
  TEXTAREA: { num: ['minLength', 'maxLength'], str: ['pattern'], bool: [] },
  NUMBER: { num: ['min', 'max'], str: [], bool: ['integer'] },
  DATE: { num: [], str: ['minDate', 'maxDate'], bool: [] },
  MULTI_SELECT: { num: ['minSelections', 'maxSelections'], str: [], bool: [] },
};

export function buildValidationRules(type: CaseFieldType, form: Partial<FieldFormValues>): Record<string, unknown> {
  const spec = RULE_KEYS[type];
  const out: Record<string, unknown> = {};
  if (!spec) return out;
  const f = form as Record<string, unknown>;
  for (const k of spec.num) if (f[k] !== undefined && f[k] !== '') out[k] = Number(f[k]);
  for (const k of spec.str) if (typeof f[k] === 'string' && f[k] !== '') out[k] = f[k];
  for (const k of spec.bool) if (f[k] === true) out[k] = true;
  return out;
}

export function buildCreatePayload(form: FieldFormValues, owningDepartmentId: string): CreateCaseFieldPayload {
  return {
    key: form.key,
    name: form.name,
    ...(form.description ? { description: form.description } : {}),
    type: form.type,
    owningDepartmentId,
    validationRules: buildValidationRules(form.type, form),
    reportable: form.reportable,
    filterable: form.filterable,
  };
}

export function buildUpdatePayload(form: FieldFormValues): UpdateCaseFieldPayload {
  return {
    name: form.name,
    description: form.description ? form.description : null,
    validationRules: buildValidationRules(form.type, form),
    reportable: form.reportable,
    filterable: form.filterable,
  };
}

export function fieldToFormValues(f: CaseFieldDefinition): FieldFormValues {
  const r = f.validationRules ?? {};
  const s = (k: string) => (r[k] === undefined || r[k] === null ? '' : String(r[k]));
  return {
    key: f.key, name: f.name, description: f.description ?? '', type: f.type,
    reportable: f.reportable, filterable: f.filterable,
    minLength: s('minLength'), maxLength: s('maxLength'), pattern: s('pattern'),
    min: s('min'), max: s('max'), integer: r.integer === true,
    minDate: s('minDate'), maxDate: s('maxDate'),
    minSelections: s('minSelections'), maxSelections: s('maxSelections'),
  };
}
