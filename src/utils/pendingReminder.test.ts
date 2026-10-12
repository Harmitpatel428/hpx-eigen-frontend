import { describe, it, expect } from 'vitest';
import {
  getPendingChecklistItems, buildPendingNames, sanitizeDocName,
  formatReminderMessage, validateTemplate, DEFAULT_TEMPLATE, DEFAULT_ORG_NAME,
} from './pendingReminder';
import type { DocCaseDocument } from '../types';

const doc = (name: string, status: string, order = 0): DocCaseDocument =>
  ({ id: name, name, status, displayOrder: order } as unknown as DocCaseDocument);

describe('getPendingChecklistItems', () => {
  it('includes awaiting-customer statuses, excludes fulfilled', () => {
    const docs = [
      doc('A', 'PENDING_COLLECTION'), doc('B', 'RECEIVED'), doc('C', 'REQUESTED'),
      doc('D', 'APPROVED'), doc('E', 'REJECTED'), doc('F', 'UNDER_VERIFICATION'),
      doc('G', 'EXPIRED'), doc('H', 'WAIVED'), doc('I', 'RE_REQUESTED'),
      doc('J', 'NOT_APPLICABLE'), doc('K', 'MANAGER_APPROVED'),
    ];
    expect(getPendingChecklistItems(docs).map(d => d.name)).toEqual(['A', 'C', 'E', 'G', 'I']);
  });
  it('preserves input order and returns [] for undefined/empty', () => {
    expect(getPendingChecklistItems(undefined)).toEqual([]);
    expect(getPendingChecklistItems([])).toEqual([]);
  });
  it('normalizes casing defensively', () => {
    expect(getPendingChecklistItems([doc('A', 'pending_collection' as string)]).length).toBe(1);
  });
});

describe('sanitizeDocName / buildPendingNames', () => {
  it('trims and collapses newlines to a single line', () => {
    expect(sanitizeDocName('  Bank\n Statement \t copy ')).toBe('Bank Statement copy');
  });
  it('drops empty-after-trim names but keeps distinct duplicates', () => {
    const docs = [doc('Bank', 'REQUESTED'), doc('   ', 'REQUESTED'), doc('Bank', 'REQUESTED')];
    expect(buildPendingNames(docs)).toEqual(['Bank', 'Bank']);
  });
});

describe('formatReminderMessage', () => {
  const names = ['Bank Statement', 'Audited Balance Sheet', 'Project Report'];
  it('inserts a 1-based numbered list, org name, preserves emoji + bold + line breaks', () => {
    const out = formatReminderMessage({ pendingNames: names, template: DEFAULT_TEMPLATE, organizationName: DEFAULT_ORG_NAME });
    expect(out).toContain('1. Bank Statement\n2. Audited Balance Sheet\n3. Project Report');
    expect(out).toContain('📄 *Pending Documents:*');
    expect(out).toContain('*Team HPX Eigen*');
    expect(out).not.toContain('{{');
  });
  it('substitutes customer_name and strips unknown placeholders', () => {
    const out = formatReminderMessage({
      pendingNames: names, organizationName: 'Org',
      template: 'Hi {{customer_name}} {{pending_documents}} {{unknown_var}} end',
      customerName: 'Nisha',
    });
    expect(out).toContain('Hi Nisha');
    expect(out).not.toContain('{{');
  });
  it('replaces missing customer_name with empty string (no leftover)', () => {
    const out = formatReminderMessage({ pendingNames: names, organizationName: 'Org', template: 'A{{customer_name}}B {{pending_documents}}' });
    expect(out).toContain('AB');
    expect(out).not.toContain('{{');
  });
});

describe('validateTemplate', () => {
  it('rejects a template missing {{pending_documents}}', () => {
    expect(validateTemplate('no vars here')).toBeTruthy();
  });
  it('accepts a template containing {{pending_documents}}', () => {
    expect(validateTemplate('X {{pending_documents}} Y')).toBeNull();
  });
  it('is case-insensitive: {{PENDING_DOCUMENTS}} is valid and substitutes', () => {
    expect(validateTemplate('X {{PENDING_DOCUMENTS}} Y')).toBeNull();
    const out = formatReminderMessage({ pendingNames: ['Bank'], organizationName: 'Org', template: '{{PENDING_DOCUMENTS}}' });
    expect(out).toBe('1. Bank');
  });
});
