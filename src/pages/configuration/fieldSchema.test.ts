import { describe, it, expect } from 'vitest';
import { KEY_RE, fieldFormSchema, buildValidationRules, buildCreatePayload } from './fieldSchema';
import { isSelectType, SELECT_TYPES, type CaseFieldType } from '../../types/caseConfig';

const base = { key: 'loan_type', name: 'Loan type', type: 'TEXT' as const, reportable: false, filterable: false };

describe('fieldSchema', () => {
  it('key regex', () => {
    expect(KEY_RE.test('loan_type')).toBe(true);
    for (const k of ['Loan', '1x', 'a-b']) expect(KEY_RE.test(k)).toBe(false);
    expect(fieldFormSchema.safeParse({ ...base, key: 'Loan' }).success).toBe(false);
  });
  it('name required and max 200', () => {
    expect(fieldFormSchema.safeParse({ ...base, name: '' }).success).toBe(false);
    expect(fieldFormSchema.safeParse({ ...base, name: 'x'.repeat(201) }).success).toBe(false);
    expect(fieldFormSchema.safeParse(base).success).toBe(true);
  });
  it('validation rules per type', () => {
    const all = { minLength: '1', maxLength: '9', pattern: '^a', min: '0', max: '5', integer: true,
      minDate: '2026-01-01', maxDate: '2026-12-31', minSelections: '1', maxSelections: '3' };
    expect(buildValidationRules('TEXT', all)).toEqual({ minLength: 1, maxLength: 9, pattern: '^a' });
    expect(buildValidationRules('NUMBER', all)).toEqual({ min: 0, max: 5, integer: true });
    expect(buildValidationRules('DATE', all)).toEqual({ minDate: '2026-01-01', maxDate: '2026-12-31' });
    expect(buildValidationRules('MULTI_SELECT', all)).toEqual({ minSelections: 1, maxSelections: 3 });
    for (const t of ['CURRENCY', 'BOOLEAN', 'EMAIL'] as CaseFieldType[]) expect(buildValidationRules(t, all)).toEqual({});
    expect(buildValidationRules('TEXT', { minLength: '', pattern: '' })).toEqual({});
  });
  it('create payload', () => {
    expect(buildCreatePayload({ ...base, description: '' }, 'd1')).toMatchObject({ key: 'loan_type', owningDepartmentId: 'd1', validationRules: {} });
  });
  it('isSelectType only SELECT/MULTI_SELECT', () => {
    expect(SELECT_TYPES).toEqual(['SELECT', 'MULTI_SELECT']);
    expect(isSelectType('SELECT')).toBe(true);
    expect(isSelectType('TEXT')).toBe(false);
  });
});
