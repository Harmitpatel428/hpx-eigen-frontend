import type { DocCaseDocument, DocDocumentStatus } from '../types';

export const DEFAULT_ORG_NAME = 'Team HPX Eigen';

// Appendix A text, verbatim. Keep {{pending_documents}} and {{organization_name}}.
export const DEFAULT_TEMPLATE = `Dear Customer,

We request you to kindly submit the following pending documents as soon as possible:

📄 *Pending Documents:*

{{pending_documents}}

⚠️ *Important Notice:*

Please complete and submit all the pending documents at the earliest.

Any delay or failure to submit the required documents may result in missing out on applicable benefits, subsidies, or other financial assistance. In such cases, our firm will not be responsible for any loss of benefits arising due to non-submission or delayed submission of documents from your end.

We therefore request you to complete the documentation process as soon as possible to avoid any potential delays or loss of benefits.

Thank you for your cooperation.

*{{organization_name}}*`;

// "Awaiting customer" — the customer still owes us these. Everything else
// (RECEIVED, UNDER_VERIFICATION, APPROVED, MANAGER_APPROVED, WAIVED, NOT_APPLICABLE)
// is already submitted/fulfilled and must never appear in a reminder.
export const PENDING_STATUSES: ReadonlySet<DocDocumentStatus> = new Set<DocDocumentStatus>([
  'REQUESTED', 'PENDING_COLLECTION', 'RE_REQUESTED', 'REJECTED', 'EXPIRED',
]);

export function isPendingChecklistItem(doc: Pick<DocCaseDocument, 'status'>): boolean {
  const s = String(doc?.status ?? '').trim().toUpperCase() as DocDocumentStatus;
  return PENDING_STATUSES.has(s);
}

export function getPendingChecklistItems(docs: DocCaseDocument[] | undefined): DocCaseDocument[] {
  return (docs ?? []).filter(isPendingChecklistItem);
}

export function sanitizeDocName(name: string | null | undefined): string {
  return String(name ?? '').replace(/\s+/g, ' ').trim();
}

export function buildPendingNames(docs: DocCaseDocument[] | undefined): string[] {
  return getPendingChecklistItems(docs).map(d => sanitizeDocName(d.name)).filter(Boolean);
}

// Variable names are case-insensitive: {{PENDING_DOCUMENTS}} == {{pending_documents}}.
export const PENDING_DOCS_VAR = /\{\{\s*pending_documents\s*\}\}/i;

export function validateTemplate(template: string): string | null {
  return PENDING_DOCS_VAR.test(template)
    ? null
    : 'Template must contain {{pending_documents}}.';
}

export function formatReminderMessage(args: {
  pendingNames: string[];
  template: string;
  organizationName: string;
  customerName?: string;
}): string {
  const numbered = args.pendingNames.map((n, i) => `${i + 1}. ${n}`).join('\n');
  return args.template
    .replace(/\{\{\s*pending_documents\s*\}\}/gi, numbered)
    .replace(/\{\{\s*organization_name\s*\}\}/gi, args.organizationName)
    .replace(/\{\{\s*customer_name\s*\}\}/gi, args.customerName ?? '')
    // strip any remaining unknown placeholders so none leak into WhatsApp
    .replace(/\{\{\s*[\w.-]+\s*\}\}/g, '');
}
