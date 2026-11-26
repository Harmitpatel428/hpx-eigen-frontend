import { describe, it, expect } from 'vitest';
import { savedViewsKey } from './DocumentationPage';

// Feature 1: saved-view localStorage keys must be strictly scoped per tenant + user, so two
// accounts on a shared workstation never read each other's views.
describe('savedViewsKey', () => {
  it('is scoped by both tenant and user', () => {
    expect(savedViewsKey('t1', 'u1')).toBe('doc:saved-views:t1:u1');
  });

  it('differs across users within one tenant and across tenants for one user', () => {
    expect(savedViewsKey('t1', 'u1')).not.toBe(savedViewsKey('t1', 'u2'));
    expect(savedViewsKey('t1', 'u1')).not.toBe(savedViewsKey('t2', 'u1'));
  });

  it('never collapses missing ids to a shared key', () => {
    expect(savedViewsKey('', '')).toBe('doc:saved-views:na:na');
    expect(savedViewsKey('t1', '')).not.toBe(savedViewsKey('', 'u1'));
  });
});
