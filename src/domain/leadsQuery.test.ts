import { describe, it, expect } from 'vitest';
import { effectiveStageForSearch } from './leadsQuery';

describe('effectiveStageForSearch', () => {
  it('returns the stage unchanged regardless of search term', () => {
    expect(effectiveStageForSearch('NEW', 'KRUNA')).toBe('NEW');
    expect(effectiveStageForSearch('FOLLOW_UP', 'acme')).toBe('FOLLOW_UP');
    expect(effectiveStageForSearch('NEW', '')).toBe('NEW');
    expect(effectiveStageForSearch('', 'anything')).toBe('');
    expect(effectiveStageForSearch('', '')).toBe('');
  });
});
