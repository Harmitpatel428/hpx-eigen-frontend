import { z } from 'zod';
import {
  isSelectType,
  type CaseFieldConditionOperator, type CaseFieldRule, type CaseFieldRuleEffectType, type CaseFieldType,
  type CreateRulePayload,
} from '../../types/caseConfig';

export const EFFECT_TYPES: CaseFieldRuleEffectType[] = ['REQUIRE_FIELD', 'HIDE_FIELD', 'SET_DEFAULT'];

const EMPTY_OPS: CaseFieldConditionOperator[] = ['IS_EMPTY', 'IS_NOT_EMPTY'];
const NUMERIC: CaseFieldType[] = ['NUMBER', 'DECIMAL', 'CURRENCY', 'PERCENTAGE'];
const ORDERED: CaseFieldType[] = [...NUMERIC, 'DATE', 'DATETIME'];

// Mirrors backend operatorAllowedForType.
export function operatorsForType(type: CaseFieldType): CaseFieldConditionOperator[] {
  if (type === 'MULTI_SELECT') return ['IN', 'NOT_IN', ...EMPTY_OPS];
  if (ORDERED.includes(type)) return ['EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'LESS_THAN', ...EMPTY_OPS];
  return ['EQUALS', 'NOT_EQUALS', ...EMPTY_OPS];
}

export const operatorNeedsValue = (op: CaseFieldConditionOperator) => !EMPTY_OPS.includes(op);
export const conditionUsesOption = (t: CaseFieldType) => isSelectType(t);
export const defaultPayloadKind = (t: CaseFieldType): 'option' | 'options' | 'value' =>
  t === 'SELECT' ? 'option' : t === 'MULTI_SELECT' ? 'options' : 'value';

export const ruleFormSchema = z.object({
  name: z.string().min(1, 'Required').max(200),
  priority: z.string().optional().refine((v) => !v || Number.isInteger(Number(v)), 'Must be a whole number'),
  isActive: z.boolean(),
  conditionFieldId: z.string().min(1, 'Required'),
  conditionOperator: z.enum(['EQUALS', 'NOT_EQUALS', 'IS_EMPTY', 'IS_NOT_EMPTY', 'GREATER_THAN', 'LESS_THAN', 'IN', 'NOT_IN']),
  conditionValue: z.string(),
  conditionOptionId: z.string(),
  effectType: z.enum(['REQUIRE_FIELD', 'HIDE_FIELD', 'SET_DEFAULT']),
  targetFieldId: z.string().min(1, 'Required'),
  defaultValue: z.string(),
  defaultOptionId: z.string(),
  defaultOptionIds: z.array(z.string()),
})
  .refine((f) => !f.conditionFieldId || f.conditionFieldId !== f.targetFieldId, {
    message: 'Condition and target must differ', path: ['targetFieldId'],
  })
  .refine((f) => !operatorNeedsValue(f.conditionOperator) || !!(f.conditionValue || f.conditionOptionId), {
    message: 'A condition value is required', path: ['conditionValue'],
  })
  .refine((f) => f.effectType !== 'SET_DEFAULT' || !!(f.defaultValue || f.defaultOptionId || f.defaultOptionIds.length), {
    message: 'A default is required', path: ['defaultValue'],
  });

export type RuleFormValues = z.infer<typeof ruleFormSchema>;

export const EMPTY_RULE_FORM: RuleFormValues = {
  name: '', priority: '', isActive: true, conditionFieldId: '', conditionOperator: 'EQUALS',
  conditionValue: '', conditionOptionId: '', effectType: 'REQUIRE_FIELD', targetFieldId: '',
  defaultValue: '', defaultOptionId: '', defaultOptionIds: [],
};

function typed(type: CaseFieldType | undefined, s: string): unknown {
  if (type && NUMERIC.includes(type)) return Number(s);
  if (type === 'BOOLEAN') return s === 'true';
  return s;
}

export function buildRulePayload(
  f: RuleFormValues,
  types: { conditionFieldType: CaseFieldType; targetFieldType: CaseFieldType },
): CreateRulePayload {
  const p: CreateRulePayload = {
    name: f.name.trim(),
    conditionFieldId: f.conditionFieldId,
    conditionOperator: f.conditionOperator,
    effectType: f.effectType,
    targetFieldId: f.targetFieldId,
  };
  if (f.priority) p.priority = Number(f.priority);
  if (operatorNeedsValue(f.conditionOperator)) {
    if (conditionUsesOption(types.conditionFieldType)) p.conditionOptionId = f.conditionOptionId;
    else p.conditionValue = typed(types.conditionFieldType, f.conditionValue);
  }
  if (f.effectType === 'SET_DEFAULT') {
    const kind = defaultPayloadKind(types.targetFieldType);
    p.defaultPayload = kind === 'option' ? { optionId: f.defaultOptionId }
      : kind === 'options' ? { optionIds: f.defaultOptionIds }
      : { value: typed(types.targetFieldType, f.defaultValue) };
  }
  return p;
}

export function ruleToFormValues(r: CaseFieldRule): RuleFormValues {
  const dp = (r.defaultPayload ?? {}) as { optionId?: string; optionIds?: string[]; value?: unknown };
  return {
    ...EMPTY_RULE_FORM,
    name: r.name, priority: String(r.priority), isActive: r.isActive,
    conditionFieldId: r.conditionFieldId, conditionOperator: r.conditionOperator,
    conditionValue: r.conditionValue == null ? '' : String(r.conditionValue),
    conditionOptionId: r.conditionOptionId ?? '',
    effectType: r.effectType, targetFieldId: r.targetFieldId,
    defaultValue: dp.value == null ? '' : String(dp.value),
    defaultOptionId: dp.optionId ?? '', defaultOptionIds: dp.optionIds ?? [],
  };
}
