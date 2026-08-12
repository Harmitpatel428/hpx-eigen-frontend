import { describe, it, expect } from 'vitest';
import { displayName } from './crm';

describe('displayName', () => {
  it('returns "First Last" when both name fields are set', () => {
    expect(displayName({ firstName: 'Nisha', lastName: 'Patel', email: 'nisha@test.com' })).toBe('Nisha Patel');
  });

  it('returns email when firstName and lastName are null', () => {
    expect(displayName({ firstName: null, lastName: null, email: 'anon@test.com' })).toBe('anon@test.com');
  });

  it('returns email when name fields are undefined', () => {
    expect(displayName({ email: 'anon@test.com' })).toBe('anon@test.com');
  });

  it('returns "Unknown" when all fields are missing or null', () => {
    expect(displayName({})).toBe('Unknown');
    expect(displayName({ firstName: null, lastName: null, email: null })).toBe('Unknown');
  });

  it('uses only firstName when lastName is null', () => {
    expect(displayName({ firstName: 'Anil', lastName: null, email: 'anil@test.com' })).toBe('Anil');
  });
});
