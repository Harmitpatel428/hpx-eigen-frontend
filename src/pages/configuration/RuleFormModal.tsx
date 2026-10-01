import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../../components/Modal';
import { useCaseFields, useCaseFieldOptions } from '../../hooks/useCaseFields';
import { useCreateRule, useUpdateRule } from '../../hooks/useCaseFieldRules';
import { extractApiError } from '../../utils/extractApiError';
import type { CaseFieldRule, CaseFieldType } from '../../types/caseConfig';
import {
  EFFECT_TYPES, EMPTY_RULE_FORM, buildRulePayload, conditionUsesOption, defaultPayloadKind,
  operatorNeedsValue, operatorsForType, ruleFormSchema, ruleToFormValues, type RuleFormValues,
} from './ruleSchema';

interface Props { isOpen: boolean; onClose: () => void; rule?: CaseFieldRule | null }

const row = { display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 } as const;
const err = { color: '#dc2626', fontSize: 12 } as const;

function scalarInput(type: CaseFieldType | undefined, id: string, reg: object) {
  if (type === 'BOOLEAN') {
    return <select id={id} className="input" {...reg}><option value="">Select…</option><option value="true">true</option><option value="false">false</option></select>;
  }
  const t = type === 'DATE' ? 'date' : type === 'TIME' ? 'time'
    : type && ['NUMBER', 'DECIMAL', 'CURRENCY', 'PERCENTAGE'].includes(type) ? 'number' : 'text';
  return <input id={id} className="input" type={t} step={t === 'number' ? 'any' : undefined} {...reg} />;
}

export function RuleFormModal({ isOpen, onClose, rule }: Props) {
  const isEdit = !!rule;
  const create = useCreateRule();
  const update = useUpdateRule();
  const { data: allFields = [] } = useCaseFields();
  const fields = allFields.filter((f) => f.status !== 'ARCHIVED');
  const [formError, setFormError] = useState<string | null>(null);

  const { register, handleSubmit, reset, watch, getValues, setValue, formState: { errors } } = useForm<RuleFormValues>({
    resolver: zodResolver(ruleFormSchema),
    defaultValues: EMPTY_RULE_FORM,
  });

  useEffect(() => {
    if (isOpen) { reset(rule ? ruleToFormValues(rule) : EMPTY_RULE_FORM); setFormError(null); }
  }, [isOpen, rule, reset]);

  const [condId, op, effect, targetId, defaultOptionIds] =
    watch(['conditionFieldId', 'conditionOperator', 'effectType', 'targetFieldId', 'defaultOptionIds']);
  const condType = fields.find((f) => f.id === condId)?.type;
  const targetType = fields.find((f) => f.id === targetId)?.type;
  const { data: condOptions = [] } = useCaseFieldOptions(condType && conditionUsesOption(condType) ? condId : null);
  const { data: targetOptions = [] } = useCaseFieldOptions(effect === 'SET_DEFAULT' && targetType && defaultPayloadKind(targetType) !== 'value' ? targetId : null);
  const operators = condType ? operatorsForType(condType) : [];

  const onSubmit = async (form: RuleFormValues) => {
    if (!condType || !targetType) return;
    setFormError(null);
    const payload = buildRulePayload(form, { conditionFieldType: condType, targetFieldType: targetType });
    try {
      if (isEdit) await update.mutateAsync({ id: rule!.id, payload: { ...payload, isActive: form.isActive } });
      else await create.mutateAsync(payload);
      onClose();
    } catch (e) {
      // Keep the modal open; the hook already toasts. Surfaces the 422 cycle message inline.
      // ponytail: MULTI_SELECT IN/NOT_IN uses a single conditionOptionId in 10b; backend validates and 400s otherwise (surfaced via toast).
      setFormError(extractApiError(e).message);
    }
  };

  // User-driven change only (not the edit-mode reset): keep operator valid for the new type and drop stale value/option.
  const onCondFieldChange = (id: string) => {
    const t = fields.find((f) => f.id === id)?.type;
    if (t && !operatorsForType(t).includes(getValues('conditionOperator'))) setValue('conditionOperator', operatorsForType(t)[0]);
    setValue('conditionValue', '');
    setValue('conditionOptionId', '');
  };

  const fieldSelect = (name: 'conditionFieldId' | 'targetFieldId', label: string) => {
    const reg = register(name);
    return (
    <div style={row}>
      <label className="type-ui" htmlFor={`rf-${name}`}>{label}</label>
      <select id={`rf-${name}`} className="input" {...reg}
        onChange={(e) => { reg.onChange(e); if (name === 'conditionFieldId') onCondFieldChange(e.target.value); }}>
        <option value="">Select field…</option>
        {fields.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
      </select>
      {errors[name] && <span style={err}>{errors[name]!.message}</span>}
    </div>
    );
  };

  const kind = targetType ? defaultPayloadKind(targetType) : 'value';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit rule' : 'New rule'} size="lg">
      <form onSubmit={handleSubmit(onSubmit)}>
        {formError && (
          <div role="alert" data-testid="rule-form-error" style={{ background: 'rgba(220,38,38,0.1)', color: '#b91c1c', border: '1px solid #dc2626', padding: 10, borderRadius: 6, marginBottom: 12, fontWeight: 600 }}>
            {formError}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          <div style={row} className="sm:col-span-2">
            <label className="type-ui" htmlFor="rf-name">Name</label>
            <input id="rf-name" className="input" {...register('name')} />
            {errors.name && <span style={err}>{errors.name.message}</span>}
          </div>
          <div style={row} className={!isEdit ? 'sm:col-span-2' : undefined}>
            <label className="type-ui" htmlFor="rf-priority">Priority</label>
            <input id="rf-priority" className="input" type="number" {...register('priority')} />
            {errors.priority && <span style={err}>{errors.priority.message}</span>}
          </div>
          {isEdit && <label style={{ ...row, justifyContent: 'flex-end' }}><span><input type="checkbox" {...register('isActive')} /> Active</span></label>}

          {fieldSelect('conditionFieldId', 'When field')}
          <div style={row}>
            <label className="type-ui" htmlFor="rf-op">Operator</label>
            <select id="rf-op" className="input" disabled={!condType} {...register('conditionOperator')}>
              {operators.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          {condType && operatorNeedsValue(op) && (
            <div style={row} className="sm:col-span-2">
              <label className="type-ui" htmlFor="rf-cval">Value</label>
              {conditionUsesOption(condType) ? (
                <select id="rf-cval" className="input" {...register('conditionOptionId')}>
                  <option value="">Select option…</option>
                  {condOptions.filter((o) => o.isActive).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              ) : scalarInput(condType, 'rf-cval', register('conditionValue'))}
              {errors.conditionValue && <span style={err}>{errors.conditionValue.message}</span>}
            </div>
          )}

          <div style={row}>
            <label className="type-ui" htmlFor="rf-effect">Effect</label>
            <select id="rf-effect" className="input" {...register('effectType')}>
              {EFFECT_TYPES.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          {fieldSelect('targetFieldId', 'Target field')}
          {effect === 'SET_DEFAULT' && targetType && (
            <div style={row} className="sm:col-span-2">
              <label className="type-ui" htmlFor="rf-default">Default</label>
              {kind === 'option' && (
                <select id="rf-default" className="input" {...register('defaultOptionId')}>
                  <option value="">Select option…</option>
                  {targetOptions.filter((o) => o.isActive).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              )}
              {kind === 'options' && (
                <select id="rf-default" className="input" multiple {...register('defaultOptionIds')} value={defaultOptionIds}
                  onChange={(e) => register('defaultOptionIds').onChange({ target: { name: 'defaultOptionIds', value: Array.from(e.target.selectedOptions, (o) => o.value) }, type: 'change' })}>
                  {targetOptions.filter((o) => o.isActive).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              )}
              {kind === 'value' && scalarInput(targetType, 'rf-default', register('defaultValue'))}
              {errors.defaultValue && <span style={err}>{errors.defaultValue.message}</span>}
            </div>
          )}

        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--border-medium)', paddingTop: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
          <button className="btn btn-secondary" type="button" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" type="submit" disabled={create.isPending || update.isPending}>{isEdit ? 'Save' : 'Create'}</button>
        </div>
      </form>
    </Modal>
  );
}
