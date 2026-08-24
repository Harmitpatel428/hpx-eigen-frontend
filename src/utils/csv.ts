// RFC 4180 compliant CSV parser + formula-injection-safe exporter

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_ROWS = 5_000;
const MAX_COLS = 200;

// ── parser ────────────────────────────────────────────────────────────────────
// Quote-aware state machine over the WHOLE text — quoted fields may span
// lines. (The previous version split on newlines first, which shredded any
// multi-line quoted value into phantom rows.)

/** Inverse of exportCSV's formula-injection prefix: our writer turns "-5 into
 *  '-5, so reading strips exactly one leading apostrophe when followed by a
 *  trigger char. Values users genuinely type with '=… keep their ambiguity,
 *  same as Excel. */
function unescapeCell(cell: string): string {
  return /^'[=+\-@\t\r]/.test(cell) ? cell.slice(1) : cell;
}

function splitRecords(text: string, delimiter: string): string[][] | null {
  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  let inQuote = false;
  const pushField = () => { record.push(unescapeCell(field.trim())); field = ''; };
  const pushRecord = () => { pushField(); records.push(record); record = []; };

  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (inQuote) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i += 2; }
      else if (ch === '"') { inQuote = false; i++; }
      else { field += ch; i++; }
    } else if (ch === '"' && field === '') {
      inQuote = true; i++; // quote opens only at field start; elsewhere literal
    } else if (ch === delimiter) {
      pushField(); i++;
    } else if (ch === '\n' || ch === '\r') {
      pushRecord();
      if (ch === '\r' && text[i + 1] === '\n') i++;
      i++;
    } else {
      field += ch; i++;
    }
  }
  if (inQuote) return null; // unclosed quote
  if (field !== '' || record.length > 0) pushRecord();
  return records;
}

export interface ParseResult {
  headers: string[];
  rows: Record<string, string>[];
  /** Actual column count of each raw row, parallel to `rows` — used for
   *  structural validation before any field mapping. */
  columnCounts: number[];
  error?: string;
}

export function parseCSV(text: string): ParseResult {
  return parseDelimited(text, ',');
}

/** Clipboard tables pasted from Excel / Google Sheets arrive tab-separated
 *  (multiline cells arrive quoted). Parsed with the same quote-aware machine
 *  as CSV instead of the old blind tab→comma replacement that shredded cells
 *  containing commas. */
export function parseTSV(text: string): ParseResult {
  return parseDelimited(text, '\t');
}

function parseDelimited(text: string, delimiter: string): ParseResult {
  const fail = (error: string): ParseResult => ({ headers: [], rows: [], columnCounts: [], error });
  if (text.length > MAX_FILE_BYTES) return fail('File too large (max 5 MB).');

  // strip BOM
  const clean = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
  const allRecords = splitRecords(clean, delimiter);
  if (!allRecords) return fail('Unclosed quoted field — check that every opening quote has a closing quote.');

  // drop blank lines / trailing-newline artifacts
  const records = allRecords.filter(r => !(r.length === 1 && r[0] === ''));

  if (records.length < 2) return fail('CSV must have at least one header row and one data row.');
  if (records.length > MAX_ROWS + 1) return fail(`Too many rows (max ${MAX_ROWS}).`);

  const headers = records[0].map(h => h.trim());
  if (headers.length > MAX_COLS) return fail(`Too many columns (max ${MAX_COLS}).`);

  const dup = headers.find((h, i) => headers.indexOf(h, i + 1) !== -1);
  if (dup) return fail(`Duplicate column header: "${dup}". Columns must be unique.`);

  const rows: Record<string, string>[] = [];
  const columnCounts: number[] = [];
  for (const rec of records.slice(1)) {
    columnCounts.push(rec.length);
    rows.push(Object.fromEntries(headers.map((h, i) => [h, rec[i] ?? ''])));
  }
  return { headers, rows, columnCounts };
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

/** Pure RFC 4180 serializer — separated so tests can run without a DOM. */
export function toCSV(headers: string[], rows: Record<string, unknown>[]): string {
  const header = headers.map(escapeCell).join(',');
  const body = rows.map(row => headers.map(h => escapeCell(row[h])).join(',')).join('\r\n');
  return `${header}\r\n${body}`;
}

export function exportCSV(
  filename: string,
  headers: string[],
  rows: Record<string, unknown>[],
): void {
  const csv = toCSV(headers, rows);
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
  // NOTE: no 'status' alias — our own export has BOTH a Status and a Stage
  // column, and mapping Status→stage silently overwrote the real stage on
  // every round trip. Status is system-controlled and skipped instead.
  'stage': 'stage', 'lead stage': 'stage',
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
