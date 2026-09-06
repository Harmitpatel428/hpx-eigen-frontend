import { describe, it, expect } from 'vitest';
import { effectiveStageForSearch } from './leadsQuery';

describe('effectiveStageForSearch', () => {
  it('drops the stage filter when a search term is present (search spans all stages)', () => {
    expect(effectiveStageForSearch('NEW', 'KRUNA')).toBe('');
    expect(effectiveStageForSearch('FOLLOW_UP', 'acme')).toBe('');
  });
  it('keeps the stage filter when there is no search', () => {
    expect(effectiveStageForSearch('NEW', '')).toBe('NEW');
    expect(effectiveStageForSearch('FOLLOW_UP', '   ')).toBe('FOLLOW_UP'); // whitespace-only = no search
    expect(effectiveStageForSearch('', '')).toBe('');
  });
});
