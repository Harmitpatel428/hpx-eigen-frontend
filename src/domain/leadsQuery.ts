import type { LeadStage } from '../types';

// When a search term is active, search must span ALL stages. Otherwise, with the
// intentional default of the "New" stage (product decision S-01), the search box
// silently finds nothing for the common case — every lead that lives in another
// stage. This is a display/query decision only: it does NOT change the persisted
// selected stage (so the New default and its persistence are untouched); it just
// drops the stage constraint from the query while a search is running.
//
// Regression guard: leadsQuery.test.ts asserts search overrides the stage filter.
export function effectiveStageForSearch(
  stage: LeadStage | '',
  search: string,
): LeadStage | '' {
  return search.trim().length > 0 ? '' : stage;
}
