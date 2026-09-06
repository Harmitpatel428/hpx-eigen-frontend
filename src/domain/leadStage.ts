import type { LeadStage } from '../types';

// ── Single source of truth for lead-stage display labels ──────────────────────
// Every surface (list stage pills, list rows, detail panel, create/edit modal,
// timeline) reads its stage text from here. Defining labels in more than one
// place is what let the filter tabs ("Call Back") drift from the dropdowns
// ("Call Back Requested"). Enum *values* are the contract and never change here;
// only their human labels live in this map.
export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  NEW: 'New',
  QUALIFIED: 'Qualified',
  INTERESTED: 'Interested',
  FOLLOW_UP: 'Follow-Up',
  CALL_BACK_REQUESTED: 'Call Back Requested',
  CALL_NOT_RECEIVED: 'Call Not Received',
  OTHER: 'Other',
  DISQUALIFIED: 'Disqualified',
  // legacy read-only stages
  CONTACTED: 'Contacted',
  CONVERTED: 'Converted',
};

// Ordered set of user-selectable stages (excludes legacy CONTACTED/CONVERTED).
// Drives the filter pills and any "pick a stage" list so their order/among is
// also single-sourced.
export const SELECTABLE_STAGES: LeadStage[] = [
  'NEW', 'QUALIFIED', 'INTERESTED', 'FOLLOW_UP',
  'CALL_BACK_REQUESTED', 'CALL_NOT_RECEIVED', 'DISQUALIFIED', 'OTHER',
];

export function stageLabel(stage: LeadStage | null | undefined): string {
  return stage ? (LEAD_STAGE_LABELS[stage] ?? stage) : LEAD_STAGE_LABELS.NEW;
}
