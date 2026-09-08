import type { LeadStage } from '../types';

// Search operates within the selected stage. The stage filter is no longer
// dropped when a search term is active — selecting 'All Leads' is the
// global-search path.
export function effectiveStageForSearch(
  stage: LeadStage | '',
  _search: string,
): LeadStage | '' {
  return stage;
}
