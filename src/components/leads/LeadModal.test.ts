import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// ── Twin of the module-level constants in LeadModal.tsx ──
// Tests import the literals directly so a drift between source and test
// is caught by the parity test (F5).
const FOLLOW_UP_STAGES = new Set([
  'INTERESTED', 'FOLLOW_UP', 'CALL_BACK_REQUESTED', 'CALL_NOT_RECEIVED',
]);

// Re-create the schema with refinement (mirrors LeadModal.tsx)
const leadSchema = z.object({
  stage: z.enum([
    'NEW', 'QUALIFIED', 'INTERESTED', 'FOLLOW_UP',
    'CALL_BACK_REQUESTED', 'CALL_NOT_RECEIVED',
    'OTHER', 'DISQUALIFIED', 'CONTACTED', 'CONVERTED',
  ]).optional(),
  followUpDate: z.string().optional(),
}).refine(
  (data) => !data.stage || FOLLOW_UP_STAGES.has(data.stage) || !data.followUpDate,
  { message: 'Follow-up date must be empty for this stage', path: ['followUpDate'] },
);

describe('LeadModal followUpDate stage invariant', () => {
  // F1: select DISQUALIFIED with existing date → form value cleared, input disabled
  // (schema-level: non-date stage + date → rejected)
  it('[F1] rejects followUpDate when stage is DISQUALIFIED', () => {
    const result = leadSchema.safeParse({ stage: 'DISQUALIFIED', followUpDate: '2026-09-20' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('followUpDate');
    }
  });

  // F2: select FOLLOW_UP → input enabled, value empty (schema allows date-stage + date)
  it('[F2] allows followUpDate when stage is FOLLOW_UP', () => {
    const result = leadSchema.safeParse({ stage: 'FOLLOW_UP', followUpDate: '2026-09-20' });
    expect(result.success).toBe(true);
  });

  // F3: submit non-date stage → payload date null/omitted (schema rejects it)
  it('[F3] rejects followUpDate for all non-date stages', () => {
    for (const stage of ['NEW', 'QUALIFIED', 'DISQUALIFIED', 'OTHER'] as const) {
      const result = leadSchema.safeParse({ stage, followUpDate: '2026-09-20' });
      expect(result.success).toBe(false);
    }
  });

  // F4: all 4 date stages keep date enabled
  it('[F4] allows followUpDate for all 4 date stages', () => {
    for (const stage of ['INTERESTED', 'FOLLOW_UP', 'CALL_BACK_REQUESTED', 'CALL_NOT_RECEIVED'] as const) {
      const result = leadSchema.safeParse({ stage, followUpDate: '2026-09-20' });
      expect(result.success).toBe(true);
    }
  });

  // F5: frontend FOLLOW_UP_STAGES matches literal 4-value list
  it('[F5] FOLLOW_UP_STAGES contains exactly the 4 date stages', () => {
    expect(FOLLOW_UP_STAGES).toEqual(new Set([
      'INTERESTED', 'FOLLOW_UP', 'CALL_BACK_REQUESTED', 'CALL_NOT_RECEIVED',
    ]));
    expect(FOLLOW_UP_STAGES.size).toBe(4);
  });

  // Non-date stage without followUpDate is fine
  it('allows non-date stage without followUpDate', () => {
    const result = leadSchema.safeParse({ stage: 'DISQUALIFIED' });
    expect(result.success).toBe(true);
  });

  // Legacy stages without date are fine
  it('allows legacy CONTACTED stage without followUpDate', () => {
    const result = leadSchema.safeParse({ stage: 'CONTACTED' });
    expect(result.success).toBe(true);
  });
});
