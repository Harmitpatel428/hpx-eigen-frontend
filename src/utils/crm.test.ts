import { describe, it, expect } from 'vitest';
import { displayName, mergeLeadOwner, resolveDisplayContact, initialsOf } from './crm';
import type { Contact } from '../types';
import type { Lead } from '../types';

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

// ── mergeLeadOwner ─────────────────────────────────────────────────────────────

const BASE: Lead = {
  id: 'lead-1',
  firstName: 'Ravi', lastName: 'Kumar',
  email: null, phone: null, company: null,
  source: 'OTHER', status: 'NEW', score: null, stage: null,
  followUpDate: null, expectedValue: null, priority: 'LOW',
  expectedCloseDate: null, country: null, state: null, city: null,
  area: null, postalCode: null, freeformAddress: null,
  ownerId: 'user-old',
  owner: { id: 'user-old', firstName: 'Old', lastName: 'Owner' },
  notes: null, tags: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  deletedAt: null,
};

describe('mergeLeadOwner', () => {
  it('returns updated.owner when a new owner is provided', () => {
    const newOwner = { id: 'user-new', firstName: 'New', lastName: 'Owner' };
    const result = mergeLeadOwner(BASE, { id: 'lead-1', ownerId: 'user-new', owner: newOwner });
    expect(result.owner).toEqual(newOwner);
  });

  it('returns null when owner is explicitly null (unassign)', () => {
    // This is the D2 bug: `updated.owner ?? prev.owner` returns prev.owner for null.
    const result = mergeLeadOwner(BASE, { id: 'lead-1', ownerId: null, owner: null });
    expect(result.owner).toBeNull();
  });

  it('preserves prev.owner when the owner key is absent from updated', () => {
    const result = mergeLeadOwner(BASE, { id: 'lead-1', firstName: 'Rohan' });
    expect(result.owner).toEqual(BASE.owner);
  });

  it('returns prev unchanged when IDs do not match', () => {
    const result = mergeLeadOwner(BASE, { id: 'lead-99', owner: null });
    expect(result).toBe(BASE); // reference equality — no new object created
  });

  it('merges scalar fields correctly alongside owner', () => {
    const result = mergeLeadOwner(BASE, {
      id: 'lead-1',
      firstName: 'Rohan',
      owner: { id: 'user-2', firstName: 'A', lastName: 'B' },
    });
    expect(result.firstName).toBe('Rohan');
    expect(result.lastName).toBe('Kumar'); // unchanged
    expect(result.owner?.id).toBe('user-2');
  });
});

// ── resolveDisplayContact ────────────────────────────────────────────────────

const LEAD = { firstName: 'Basant', lastName: 'Gupta', phone: '9876543210', email: 'basant@test.com' };
const MAIN_CONTACT: Pick<Contact, 'firstName' | 'lastName' | 'phone' | 'email' | 'isMain'> = {
  firstName: 'Rakhesh', lastName: 'Sharma', phone: '1234567890', email: 'rakhesh@test.com', isMain: true,
};

describe('resolveDisplayContact', () => {
  it('[1] contacts empty -> lead name/phone/email, source lead', () => {
    const r = resolveDisplayContact(LEAD, []);
    expect(r).toEqual({ name: 'Basant Gupta', phone: '9876543210', email: 'basant@test.com', source: 'lead' });
  });

  it('[2] main contact present -> contact name/phone/email, source contact', () => {
    const r = resolveDisplayContact(LEAD, [MAIN_CONTACT]);
    expect(r).toEqual({ name: 'Rakhesh Sharma', phone: '1234567890', email: 'rakhesh@test.com', source: 'contact' });
  });

  it('[3] main contact with empty email -> email falls back to lead.email', () => {
    const r = resolveDisplayContact(LEAD, [{ ...MAIN_CONTACT, email: null }]);
    expect(r.email).toBe('basant@test.com');
    expect(r.name).toBe('Rakhesh Sharma');
  });

  it('[4] main contact with empty name -> name falls back to lead name', () => {
    const r = resolveDisplayContact(LEAD, [{ ...MAIN_CONTACT, firstName: '', lastName: '' }]);
    expect(r.name).toBe('Basant Gupta');
    expect(r.source).toBe('lead');
    expect(r.phone).toBe('1234567890');
  });

  it('[5] contacts exist but none isMain -> falls back to first contact', () => {
    const nonMain = { ...MAIN_CONTACT, isMain: false };
    const r = resolveDisplayContact(LEAD, [nonMain]);
    expect(r.name).toBe('Rakhesh Sharma');
    expect(r.phone).toBe('1234567890');
    expect(r.source).toBe('contact');
  });

  it('[5b] contacts exist, none isMain, contact name empty -> lead fields', () => {
    const nonMain = { firstName: '', lastName: '', phone: '555', email: null, isMain: false };
    const r = resolveDisplayContact(LEAD, [nonMain]);
    expect(r.name).toBe('Basant Gupta');
    expect(r.phone).toBe('555');
    expect(r.source).toBe('lead');
  });

  it('[6] whitespace/trim: no "undefined", no double spaces', () => {
    const r1 = resolveDisplayContact(
      { firstName: '  Basant  ', lastName: '  ', phone: null, email: null },
      [],
    );
    expect(r1.name).toBe('Basant');
    expect(r1.name).not.toMatch(/undefined/);
    expect(r1.name).not.toMatch(/  /);

    const r2 = resolveDisplayContact(
      { firstName: '', lastName: '', phone: null, email: null },
      [{ firstName: '  ', lastName: '  ', phone: null, email: null, isMain: true }],
    );
    expect(r2.name).toBe('Unknown');
    expect(r2.source).toBe('lead');
  });

  it('[A1] empty names + company -> company, source lead', () => {
    const r = resolveDisplayContact(
      { firstName: '', lastName: '', phone: null, email: null, company: 'Acme Corp' },
      [],
    );
    expect(r.name).toBe('Acme Corp');
    expect(r.source).toBe('lead');
  });

  it('[A2] main contact present + company -> contact name wins', () => {
    const r = resolveDisplayContact(
      { ...LEAD, company: 'Acme Corp' },
      [MAIN_CONTACT],
    );
    expect(r.name).toBe('Rakhesh Sharma');
    expect(r.source).toBe('contact');
  });

  it('[E1] no isMain, unsorted createdAt -> earliest wins', () => {
    const late  = { firstName: 'Late',  lastName: 'One', phone: '111', email: null, isMain: false, createdAt: '2026-06-02T00:00:00Z' };
    const early = { firstName: 'Early', lastName: 'One', phone: '222', email: null, isMain: false, createdAt: '2026-06-01T00:00:00Z' };
    const r = resolveDisplayContact(LEAD, [late, early]);
    expect(r.name).toBe('Early One');
    expect(r.phone).toBe('222');
  });

  it('[E2] no isMain, no createdAt -> contacts[0]', () => {
    const a = { firstName: 'Alpha', lastName: 'A', phone: '111', email: null, isMain: false };
    const b = { firstName: 'Beta',  lastName: 'B', phone: '222', email: null, isMain: false };
    const r = resolveDisplayContact(LEAD, [a, b]);
    expect(r.name).toBe('Alpha A');
  });

  it('[E3] isMain present -> wins regardless of createdAt', () => {
    const early = { firstName: 'Early', lastName: 'One', phone: '111', email: null, isMain: false, createdAt: '2026-01-01T00:00:00Z' };
    const main  = { firstName: 'Main',  lastName: 'One', phone: '333', email: null, isMain: true,  createdAt: '2026-12-01T00:00:00Z' };
    const r = resolveDisplayContact(LEAD, [early, main]);
    expect(r.name).toBe('Main One');
    expect(r.phone).toBe('333');
  });
});

// ── initialsOf ───────────────────────────────────────────────────────────────

describe('initialsOf', () => {
  it('[D1] 2-word name -> first+last initials', () => {
    expect(initialsOf('Rakhesh Sharma')).toBe('RS');
  });

  it('[D2] 1-word name -> first two chars', () => {
    expect(initialsOf('Basant')).toBe('BA');
  });

  it('[D3] Unknown -> U', () => {
    expect(initialsOf('Unknown')).toBe('UN');
  });

  it('[D4] 4-word name -> first+last word initials', () => {
    expect(initialsOf('Sri Ravi Shankar Prasad')).toBe('SP');
  });

  it('empty string -> ?', () => {
    expect(initialsOf('')).toBe('?');
    expect(initialsOf('   ')).toBe('?');
  });
});
