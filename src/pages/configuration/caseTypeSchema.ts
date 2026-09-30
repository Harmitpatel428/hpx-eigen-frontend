import { z } from 'zod';
import type { CreateCaseTypePayload, UpdateCaseTypePayload } from '../../types/caseConfig';

export const KEY_RE = /^[a-z][a-z0-9_]*$/;

export const caseTypeFormSchema = z.object({
  key: z.string().regex(KEY_RE, 'lowercase snake_case').max(64),
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(2000).optional(),
});
export type CaseTypeFormValues = z.infer<typeof caseTypeFormSchema>;

export const buildCreateCaseTypePayload = (f: CaseTypeFormValues): CreateCaseTypePayload => ({
  key: f.key,
  name: f.name,
  ...(f.description ? { description: f.description } : {}),
  displayOrder: 0,
});

export const buildUpdateCaseTypePayload = (f: CaseTypeFormValues): UpdateCaseTypePayload => ({
  name: f.name,
  description: f.description ? f.description : null,
});
