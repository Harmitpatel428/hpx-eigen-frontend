import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../../components/Modal';
import { useCreateStageTemplate, useUpdateStageTemplate } from '../../hooks/useCaseTypes';
import type { CaseStageTemplate } from '../../types/caseConfig';
import {
  stageTemplateFormSchema, buildStageTemplatePayload, EMPTY_STAGE_TEMPLATE_FORM, type StageTemplateFormValues,
} from './stageTemplateSchema';

interface Props { isOpen: boolean; onClose: () => void; caseTypeId: string; template?: CaseStageTemplate | null }

const row = { display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 } as const;
const err = { color: '#dc2626', fontSize: 12 } as const;
const s = (n: number | null) => (n == null ? '' : String(n));

const toForm = (t: CaseStageTemplate): StageTemplateFormValues => ({
  key: t.key, label: t.label, durationValue: s(t.durationValue), durationType: t.durationType ?? '',
  externalWaiting: t.externalWaiting, bufferDays: s(t.bufferDays), dependsOnPrevious: t.dependsOnPrevious,
  enforceRequiredOnComplete: t.enforceRequiredOnComplete, atRiskPercent: s(t.atRiskPercent),
  warnDaysRemaining: s(t.warnDaysRemaining), hardBlock: t.hardBlock,
});

type NumField = 'durationValue' | 'bufferDays' | 'atRiskPercent' | 'warnDaysRemaining';
type CheckField = 'externalWaiting' | 'dependsOnPrevious' | 'enforceRequiredOnComplete' | 'hardBlock';

export function StageTemplateFormModal({ isOpen, onClose, caseTypeId, template }: Props) {
  const isEdit = !!template;
  const create = useCreateStageTemplate();
  const update = useUpdateStageTemplate();

  const { register, handleSubmit, reset, formState: { errors, isValid } } = useForm<StageTemplateFormValues>({
    resolver: zodResolver(stageTemplateFormSchema),
    defaultValues: EMPTY_STAGE_TEMPLATE_FORM,
    mode: 'onChange',
  });

  useEffect(() => {
    if (isOpen) reset(template ? toForm(template) : EMPTY_STAGE_TEMPLATE_FORM);
  }, [isOpen, template, reset]);

  const onSubmit = (form: StageTemplateFormValues) => {
    const payload = buildStageTemplatePayload(form);
    if (isEdit) {
      const { key: _key, ...rest } = payload; // key is immutable on edit
      update.mutate({ caseTypeId, templateId: template!.id, payload: rest }, { onSuccess: onClose });
    } else create.mutate({ caseTypeId, payload }, { onSuccess: onClose });
  };

  const num = (id: NumField, label: string) => (
    <div style={row}>
      <label className="type-ui" htmlFor={`st-${id}`}>{label}</label>
      <input id={`st-${id}`} className="input" inputMode="numeric" {...register(id)} />
      {errors[id] && <span style={err}>{errors[id]!.message}</span>}
    </div>
  );
  const check = (id: CheckField, label: string) => (
    <label className="type-ui" style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
      <input type="checkbox" {...register(id)} /> {label}
    </label>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit stage' : 'New stage'} size="lg" closeOnEsc={false}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div style={row}>
          <label className="type-ui" htmlFor="st-key">Key</label>
          <input id="st-key" className="input" readOnly={isEdit} disabled={isEdit} {...register('key')} />
          {errors.key && <span style={err}>{errors.key.message}</span>}
        </div>
        <div style={row}>
          <label className="type-ui" htmlFor="st-label">Label</label>
          <input id="st-label" className="input" {...register('label')} />
          {errors.label && <span style={err}>{errors.label.message}</span>}
        </div>
        {num('durationValue', 'Duration')}
        <div style={row}>
          <label className="type-ui" htmlFor="st-durationType">Duration unit</label>
          <select id="st-durationType" className="input" {...register('durationType')}>
            <option value="">-</option><option value="DAYS">Days</option><option value="WEEKS">Weeks</option><option value="MONTHS">Months</option>
          </select>
        </div>
        {num('bufferDays', 'Buffer days')}
        {num('atRiskPercent', 'At-risk percent')}
        {num('warnDaysRemaining', 'Warn days remaining')}
        {check('externalWaiting', 'External waiting')}
        {check('dependsOnPrevious', 'Depends on previous')}
        {check('enforceRequiredOnComplete', 'Enforce required fields on complete')}
        {check('hardBlock', 'Hard block')}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit" disabled={!isValid || create.isPending || update.isPending}>{isEdit ? 'Save' : 'Create'}</button>
        </div>
      </form>
    </Modal>
  );
}
