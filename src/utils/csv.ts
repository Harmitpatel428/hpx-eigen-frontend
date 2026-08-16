// RFC 4180 compliant CSV parser + formula-injection-safe exporter

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_ROWS = 5_000;
const MAX_COLS = 50;

// ── parser ────────────────────────────────────────────────────────────────────

function parseRow(line: string): string[] {
  const fields: string[] = [];
  let field = '';
  let inQuote = false;
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"' && line[i + 1] === '"') { field += '"'; i += 2; }
      else if (ch === '"') { inQuote = false; i++; }
      else { field += ch; i++; }
    } else {
      if (ch === '"') { inQuote = true; i++; }
      else if (ch === ',') { fields.push(field); field = ''; i++; }
      else { field += ch; i++; }
    }
  }
  fields.push(field);
  return fields;
}

export interface ParseResult {
  headers: string[];
  rows: Record<string, string>[];
  error?: string;
}

export function parseCSV(text: string): ParseResult {
  if (text.length > MAX_FILE_BYTES) return { headers: [], rows: [], error: 'File too large (max 5 MB).' };

  // strip BOM
  const clean = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
  const lines = clean.split(/\r?\n/).filter(l => l.trim());

  if (lines.length < 2) return { headers: [], rows: [], error: 'CSV must have at least one header row and one data row.' };
  if (lines.length > MAX_ROWS + 1) return { headers: [], rows: [], error: `Too many rows (max ${MAX_ROWS}).` };

  const headers = parseRow(lines[0]).map(h => h.trim());
  if (headers.length > MAX_COLS) return { headers: [], rows: [], error: `Too many columns (max ${MAX_COLS}).` };

  const rows = lines.slice(1).map(line => {
    const vals = parseRow(line);
    return Object.fromEntries(headers.map((h, i) => [h, (vals[i] ?? '').trim()]));
  });

  return { headers, rows };
}

// ── exporter ──────────────────────────────────────────────────────────────────

function escapeCell(value: unknown): string {
  const str = value == null ? '' : String(value);
  // CSV formula injection prevention — prefix dangerous chars with single quote
  const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  // Quote if the value contains comma, newline, or double-quote
  if (/[,"\n\r]/.test(safe)) return `"${safe.replace(/"/g, '""')}"`;
  return safe;
}

export function exportCSV(
  filename: string,
  headers: string[],
  rows: Record<string, unknown>[],
): void {
  const header = headers.map(escapeCell).join(',');
  const body = rows.map(row => headers.map(h => escapeCell(row[h])).join(',')).join('\r\n');
  const csv = `${header}\r\n${body}`;
  // UTF-8 BOM so Excel opens correctly
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── header fuzzy matcher ──────────────────────────────────────────────────────

const ALIASES: Record<string, string> = {
  'first name': 'firstName', 'firstname': 'firstName', 'fname': 'firstName', 'given name': 'firstName', 'first': 'firstName',
  'last name': 'lastName', 'lastname': 'lastName', 'lname': 'lastName', 'surname': 'lastName', 'family name': 'lastName', 'last': 'lastName',
  'email': 'email', 'email address': 'email', 'e-mail': 'email', 'mail': 'email',
  'phone': 'phone', 'mobile': 'phone', 'phone number': 'phone', 'telephone': 'phone', 'cell': 'phone', 'contact number': 'phone',
  'company': 'company', 'organization': 'company', 'organisation': 'company', 'firm': 'company', 'business': 'company', 'account': 'company',
  'source': 'source', 'lead source': 'source',
  'stage': 'stage', 'lead stage': 'stage', 'status': 'stage',
  'priority': 'priority',
  'country': 'country',
  'state': 'state', 'province': 'state', 'region': 'state',
  'city': 'city', 'town': 'city',
  'area': 'area', 'office/factory location': 'area', 'office location': 'area', 'factory location': 'area',
  'postal code': 'postalCode', 'zip': 'postalCode', 'pin': 'postalCode', 'zip code': 'postalCode', 'postcode': 'postalCode', 'pincode': 'postalCode',
  'owner': 'ownerId', 'assigned to': 'ownerId', 'rep': 'ownerId', 'sales rep': 'ownerId', 'owner id': 'ownerId',
  'notes': 'notes', 'note': 'notes', 'comments': 'notes', 'remarks': 'notes', 'description': 'notes',
  'address': 'freeformAddress', 'full address': 'freeformAddress', 'freeform address': 'freeformAddress',
  'close date': 'expectedCloseDate', 'expected close date': 'expectedCloseDate', 'close by': 'expectedCloseDate',
  'follow up date': 'followUpDate', 'followupdate': 'followUpDate', 'follow-up date': 'followUpDate', 'callback date': 'followUpDate', 'call back date': 'followUpDate',
  'score': 'score', 'lead score': 'score',
  'expected value': 'expectedValue', 'deal value': 'expectedValue', 'value': 'expectedValue',
  'tags': 'tagNames', 'tag': 'tagNames', 'labels': 'tagNames',
  'created date': '__skip__',
};

export function detectFieldKey(header: string): string | null {
  return ALIASES[header.toLowerCase().trim()] ?? null;
}

export const IMPORTABLE_FIELDS: { key: string; label: string }[] = [
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'company', label: 'Company' },
  { key: 'source', label: 'Source' },
  { key: 'stage', label: 'Stage' },
  { key: 'priority', label: 'Priority' },
  { key: 'country', label: 'Country' },
  { key: 'state', label: 'State' },
  { key: 'city', label: 'City' },
  { key: 'area', label: 'Office / Factory Location' },
  { key: 'postalCode', label: 'Postal Code' },
  { key: 'freeformAddress', label: 'Full Address (Freeform)' },
  { key: 'notes', label: 'Notes' },
  { key: 'followUpDate', label: 'Follow-Up Date' },
  { key: 'expectedCloseDate', label: 'Expected Close Date' },
  { key: 'ownerId', label: 'Owner (email)' },
  { key: 'score', label: 'Score' },
  { key: 'expectedValue', label: 'Expected Value' },
  { key: 'tagNames', label: 'Tags' },
  { key: '__skip__', label: '— Skip column —' },
];
