import { describe, it, expect } from 'vitest';
import {
  operatorsForType, operatorNeedsValue, defaultPayloadKind, buildRulePayload, ruleFormSchema, EMPTY_RULE_FORM,
  type RuleFormValues,
} from './ruleSchema';

const base: RuleFormValues = {
  ...EMPTY_RULE_FORM, name: 'r', conditionFieldId: 'a', targetFieldId: 'b', conditionValue: 'x',
};

describe('operatorsForType', () => {
  it('table', () => {
    expect(operatorsForType('MULTI_SELECT')).toEqual(['IN', 'NOT_IN', 'IS_EMPTY', 'IS_NOT_EMPTY']);
    expect(operatorsForType('NUMBER')).toContain('GREATER_THAN');
    expect(operatorsForType('SELECT')).not.toContain('GREATER_THAN');
    expect(operatorsForType('TEXT')).toEqual(['EQUALS', 'NOT_EQUALS', 'IS_EMPTY', 'IS_NOT_EMPTY']);
    expect(operatorNeedsValue('IS_EMPTY')).toBe(false);
    expect(operatorNeedsValue('EQUALS')).toBe(true);
  });
});

describe('ruleFormSchema', () => {
  it('rejects condition === target on targetFieldId', () => {
    const r = ruleFormSchema.safeParse({ ...base, targetFieldId: 'a' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.some((i) => i.path[0] === 'targetFieldId' && i.message === 'Condition and target must differ')).toBe(true);
  });
  it('accepts a valid rule', () => expect(ruleFormSchema.safeParse(base).success).toBe(true));
});

describe('defaultPayloadKind', () => {
  it('by target type', () => {
    expect(defaultPayloadKind('SELECT')).toBe('option');
    expect(defaultPayloadKind('MULTI_SELECT')).toBe('options');
    expect(defaultPayloadKind('NUMBER')).toBe('value');
  });
});

describe('buildRulePayload', () => {
  const sd = { ...base, effectType: 'SET_DEFAULT' as const, defaultOptionId: 'o1', defaultOptionIds: ['o1', 'o2'], defaultValue: '5' };
  it('SET_DEFAULT payload keyed on target type', () => {
    expect(buildRulePayload(sd, { conditionFieldType: 'TEXT', targetFieldType: 'SELECT' }).defaultPayload).toEqual({ optionId: 'o1' });
    expect(buildRulePayload(sd, { conditionFieldType: 'TEXT', targetFieldType: 'MULTI_SELECT' }).defaultPayload).toEqual({ optionIds: ['o1', 'o2'] });
    expect(buildRulePayload(sd, { conditionFieldType: 'TEXT', targetFieldType: 'NUMBER' }).defaultPayload).toEqual({ value: 5 });
  });
  it('condition value/option by condition type', () => {
    expect(buildRulePayload({ ...base, conditionOptionId: 'o9' }, { conditionFieldType: 'SELECT', targetFieldType: 'TEXT' }))
      .toMatchObject({ conditionOptionId: 'o9' });
    expect(buildRulePayload({ ...base, conditionValue: '3' }, { conditionFieldType: 'NUMBER', targetFieldType: 'TEXT' }).conditionValue).toBe(3);
  });
  it('empty operator omits value and option', () => {
    const p = buildRulePayload({ ...base, conditionOperator: 'IS_EMPTY', conditionOptionId: 'o9' }, { conditionFieldType: 'SELECT', targetFieldType: 'TEXT' });
    expect('conditionValue' in p).toBe(false);
    expect('conditionOptionId' in p).toBe(false);
  });
});
