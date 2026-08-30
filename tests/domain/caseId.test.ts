// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  isValidCaseId,
  isPartialCaseId,
  normaliseCaseIdInput,
  maskCaseId,
  phoneLast4,
  safeCompare,
} from '../../src/domain/caseId';

describe('isValidCaseId', () => {
  it('accepts canonical format', () => {
    expect(isValidCaseId('HPX-7K3M-92QD')).toBe(true);
  });

  it('accepts lowercase', () => {
    expect(isValidCaseId('hpx-7k3m-92qd')).toBe(true);
  });

  it.each([
    'HPX-7K3M',
    'ABC-7K3M-92QD',
    'HPX7K3M92QD',
    '',
    'HPX-7K3M-92QDX',
  ])('rejects %s', (input) => {
    expect(isValidCaseId(input)).toBe(false);
  });
});

describe('normaliseCaseIdInput', () => {
  it.each([
    ['hpx7k3m92qd', 'HPX-7K3M-92QD'],
    ['HPX', 'HPX'],
    ['HPX7K3M', 'HPX-7K3M'],
    ['', ''],
  ])('%s → %s', (input, expected) => {
    expect(normaliseCaseIdInput(input)).toBe(expected);
  });
});

describe('maskCaseId', () => {
  it('masks the middle segment', () => {
    expect(maskCaseId('HPX-7K3M-92QD')).toBe('HPX-••••-92QD');
  });

  it('returns invalid ids unchanged', () => {
    expect(maskCaseId('bad')).toBe('bad');
  });
});

describe('phoneLast4', () => {
  it.each([
    ['9876543210', '3210'],
    ['+91 98765-43210', '3210'],
    ['(555) 000-1234', '1234'],
  ])('%s → %s', (input, expected) => {
    expect(phoneLast4(input)).toBe(expected);
  });
});

describe('safeCompare', () => {
  it('matches identical strings', () => {
    expect(safeCompare('3210', '3210')).toBe(true);
  });

  it('rejects different strings', () => {
    expect(safeCompare('3210', '3211')).toBe(false);
  });

  it('rejects length mismatch', () => {
    expect(safeCompare('3210', '321')).toBe(false);
  });
});

describe('isPartialCaseId', () => {
  it.each([
    ['HPX', true],
    ['HPX-7K', true],
    ['HPX-7K3M', true],
    ['HPX-7K3M-92', true],
    ['HPX-7K3M-92QD', true],
    ['ABC', false],
    ['HPX-7K3M-92QD-X', false],
  ])('%s → %s', (input, expected) => {
    expect(isPartialCaseId(input)).toBe(expected);
  });
});
