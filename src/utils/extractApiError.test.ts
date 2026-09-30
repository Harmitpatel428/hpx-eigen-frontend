import { describe, it, expect } from 'vitest';
import { extractApiError } from './extractApiError';

describe('extractApiError', () => {
  it('reads axios-shaped errors', () => {
    const err = { message: 'x', response: { status: 409, data: { message: 'Key exists', code: 'DUP' } } };
    expect(extractApiError(err)).toEqual({ code: 'DUP', message: 'Key exists', status: 409 });
  });
  it('falls back to err.message', () => {
    expect(extractApiError({ message: 'Network Error', response: { status: 500, data: {} } }).message).toBe('Network Error');
  });
  it('defaults for non-axios values', () => {
    expect(extractApiError('boom').message).toBe('Something went wrong.');
    expect(extractApiError(null).message).toBe('Something went wrong.');
  });
});
