import { describe, it, expect } from 'vitest';
import { isCaseOverdue } from './DocumentationPage';

// Feature 2: overdue predicate — past due date flags only while Documentation still owns the case.
const past = '2000-01-01';
const future = '2999-01-01';

describe('isCaseOverdue', () => {
  it('flags a past due date on a non-terminal case', () => {
    expect(isCaseOverdue({ dueDate: past, status: 'ACTIVE' })).toBe(true);
    expect(isCaseOverdue({ dueDate: past, status: 'RETURNED' })).toBe(true);
    expect(isCaseOverdue({ dueDate: past, status: 'DOCUMENTATION_READY' })).toBe(true);
  });

  it('does not flag a future or missing due date', () => {
    expect(isCaseOverdue({ dueDate: future, status: 'ACTIVE' })).toBe(false);
    expect(isCaseOverdue({ dueDate: null, status: 'ACTIVE' })).toBe(false);
  });

  it('never flags a terminal case, even past due', () => {
    for (const status of ['CLOSED', 'CANCELLED', 'CLOSED_NO_DOCS', 'TRANSFERRED_TO_PROCESS', 'PENDING_PROCESS_REVIEW']) {
      expect(isCaseOverdue({ dueDate: past, status })).toBe(false);
    }
  });
});
