import { z } from 'zod';
import type { CreateStageTemplatePayload } from '../../types/caseConfig';
import { KEY_RE } from './caseTypeSchema';

// numeric inputs stay strings in the form; '' = unset
const optInt = (min: number, max: number, msg: string) =>
  z.string().refine((v) => v === '' || (/^\d+$/.test(v) && +v >= min && +v <= max), msg);

export const stageTemplateFormSchema = z.object({
  key: z.string().regex(KEY_RE, 'lowercase snake_case').max(64),
  label: z.string().min(1, 'Label is required').max(200),
  durationValue: optInt(1, 100000, 'Positive whole number'),
  durationType: z.enum(['', 'DAYS', 'WEEKS', 'MONTHS']),
  externalWaiting: z.boolean(),
  bufferDays: optInt(0, 100000, 'Whole number >= 0'),
  dependsOnPrevious: z.boolean(),
  enforceRequiredOnComplete: z.boolean(),
  atRiskPercent: optInt(1, 100, 'Whole number 1-100'),
  warnDaysRemaining: optInt(0, 100000, 'Whole number >= 0'),
  hardBlock: z.boolean(),
});
export type StageTemplateFormValues = z.infer<typeof stageTemplateFormSchema>;

export const EMPTY_STAGE_TEMPLATE_FORM: StageTemplateFormValues = {
  key: '', label: '', durationValue: '', durationType: '', externalWaiting: false, bufferDays: '',
  dependsOnPrevious: false, enforceRequiredOnComplete: false, atRiskPercent: '', warnDaysRemaining: '', hardBlock: false,
};

const num = (v: string) => (v === '' ? null : Number(v));

export const buildStageTemplatePayload = (f: StageTemplateFormValues): CreateStageTemplatePayload => ({
  key: f.key,
  label: f.label,
  durationValue: num(f.durationValue),
  durationType: f.durationType === '' ? null : f.durationType,
  externalWaiting: f.externalWaiting,
  bufferDays: num(f.bufferDays),
  dependsOnPrevious: f.dependsOnPrevious,
  enforceRequiredOnComplete: f.enforceRequiredOnComplete,
  atRiskPercent: num(f.atRiskPercent),
  warnDaysRemaining: num(f.warnDaysRemaining),
  hardBlock: f.hardBlock,
});
