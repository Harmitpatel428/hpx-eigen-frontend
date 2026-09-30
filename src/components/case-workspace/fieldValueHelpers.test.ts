import { describe, expect, it } from 'vitest';
import { buildPatchEntry, readStoredValue, valueColumnFor } from './fieldValueHelpers';
import type { CaseFieldType, CaseFieldWithRuntime, StoredFieldValue } from '../../types/caseConfig';

const f = (type: CaseFieldType, defaultValue: unknown = null) =>
  ({ id: 'f1', type, defaultValue } as unknown as CaseFieldWithRuntime);

describe('fieldValueHelpers', () => {
  it('maps types to columns', () => {
    expect(valueColumnFor('TEXT')).toBe('valueText');
    expect(valueColumnFor('EMAIL')).toBe('valueText');
    expect(valueColumnFor('USER_REFERENCE')).toBe('valueText');
    expect(valueColumnFor('CURRENCY')).toBe('valueNumber');
    expect(valueColumnFor('BOOLEAN')).toBe('valueBoolean');
    expect(valueColumnFor('DATETIME')).toBe('valueDate');
    expect(valueColumnFor('SELECT')).toBe('optionId');
    expect(valueColumnFor('MULTI_SELECT')).toBe('selections');
  });

  it('builds patch entries per column with version passthrough', () => {
    expect(buildPatchEntry(f('TEXT'), 'hi')).toEqual({ fieldId: 'f1', valueText: 'hi' });
    expect(buildPatchEntry(f('NUMBER'), '42', 3)).toEqual({ fieldId: 'f1', valueNumber: 42, version: 3 });
    expect(buildPatchEntry(f('BOOLEAN'), true)).toEqual({ fieldId: 'f1', valueBoolean: true });
    expect(buildPatchEntry(f('DATE'), '2026-01-02T00:00:00.000Z')).toEqual({
      fieldId: 'f1', valueDate: '2026-01-02T00:00:00.000Z',
    });
    expect(buildPatchEntry(f('SELECT'), 'o1')).toEqual({ fieldId: 'f1', optionId: 'o1' });
    expect(buildPatchEntry(f('MULTI_SELECT'), ['a', 'b'])).toEqual({
      fieldId: 'f1', selections: [{ optionId: 'a' }, { optionId: 'b' }],
    });
  });

  it('reads stored value, falling back to defaultValue', () => {
    const stored = { valueNumber: 7 } as StoredFieldValue;
    expect(readStoredValue(f('NUMBER'), stored)).toBe(7);
    expect(readStoredValue(f('TEXT', 'dflt'), undefined)).toBe('dflt');
  });
});
