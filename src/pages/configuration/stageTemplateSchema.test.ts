import { describe, it, expect } from 'vitest';
import { stageTemplateFormSchema as schema, buildStageTemplatePayload, EMPTY_STAGE_TEMPLATE_FORM } from './stageTemplateSchema';

const base = { ...EMPTY_STAGE_TEMPLATE_FORM, key: 'kyc_check', label: 'KYC' };
const ok = (o: object) => schema.safeParse({ ...base, ...o }).success;

describe('stageTemplateSchema', () => {
  it('key regex and length', () => {
    expect(ok({})).toBe(true);
    for (const k of ['Kyc', '1x', 'a-b', '']) expect(ok({ key: k })).toBe(false);
    expect(ok({ key: 'a'.repeat(65) })).toBe(false);
  });
  it('label required, max 200', () => {
    expect(ok({ label: '' })).toBe(false);
    expect(ok({ label: 'x'.repeat(201) })).toBe(false);
  });
  it('durationValue positive int', () => {
    expect(ok({ durationValue: '3' })).toBe(true);
    for (const v of ['0', '-1', '1.5', 'abc']) expect(ok({ durationValue: v })).toBe(false);
  });
  it('atRiskPercent 1-100', () => {
    expect(ok({ atRiskPercent: '1' })).toBe(true);
    expect(ok({ atRiskPercent: '100' })).toBe(true);
    expect(ok({ atRiskPercent: '0' })).toBe(false);
    expect(ok({ atRiskPercent: '101' })).toBe(false);
  });
  it('warnDaysRemaining and bufferDays >= 0', () => {
    expect(ok({ warnDaysRemaining: '0', bufferDays: '0' })).toBe(true);
    expect(ok({ warnDaysRemaining: '-1' })).toBe(false);
    expect(ok({ bufferDays: '-2' })).toBe(false);
  });
  it('payload: empty numerics -> null, values coerced', () => {
    expect(buildStageTemplatePayload(base)).toEqual({
      key: 'kyc_check', label: 'KYC', durationValue: null, durationType: null, externalWaiting: false, bufferDays: null,
      dependsOnPrevious: false, enforceRequiredOnComplete: false, atRiskPercent: null, warnDaysRemaining: null, hardBlock: false,
    });
    const p = buildStageTemplatePayload({ ...base, durationValue: '5', durationType: 'WEEKS', atRiskPercent: '80' });
    expect(p).toMatchObject({ durationValue: 5, durationType: 'WEEKS', atRiskPercent: 80 });
  });
});
