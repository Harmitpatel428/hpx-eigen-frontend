import { describe, it, expect } from 'vitest';
import { KEY_RE, caseTypeFormSchema, buildCreateCaseTypePayload, buildUpdateCaseTypePayload } from './caseTypeSchema';

const base = { key: 'loan_case', name: 'Loan case' };

describe('caseTypeSchema', () => {
  it('key accept/reject', () => {
    expect(KEY_RE.test('loan_case')).toBe(true);
    for (const k of ['Loan', '1x', 'a-b']) expect(caseTypeFormSchema.safeParse({ ...base, key: k }).success).toBe(false);
    expect(caseTypeFormSchema.safeParse({ ...base, key: 'a'.repeat(65) }).success).toBe(false);
    expect(caseTypeFormSchema.safeParse(base).success).toBe(true);
  });
  it('name required and max 200', () => {
    expect(caseTypeFormSchema.safeParse({ ...base, name: '' }).success).toBe(false);
    expect(caseTypeFormSchema.safeParse({ ...base, name: 'x'.repeat(201) }).success).toBe(false);
  });
  it('payload builders', () => {
    expect(buildCreateCaseTypePayload(base)).toEqual({ key: 'loan_case', name: 'Loan case', displayOrder: 0 });
    expect(buildUpdateCaseTypePayload({ ...base, description: '' })).toEqual({ name: 'Loan case', description: null });
  });
});
