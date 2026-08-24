// Regression test — Lead export → import round-trip integrity (incident
// 2026-08-24: multiline note split a row, remainder collapsed into First Name,
// "Last Name is required.", custom fields dropped by the backend).
//
// Bundles the REAL src/utils/csv.ts + src/utils/lead-import.ts with esbuild
// (already installed as a vite dependency) and drives the exact pipeline the
// app runs: toCSV (export) → parseCSV/parseTSV (import) → buildAutoMap →
// validateImportRows → rowToPayload.
//
// Run: npm run test:csv   (no new dependencies)
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csv-roundtrip-'));
for (const mod of ['csv', 'lead-import']) {
  execSync(`npx esbuild src/utils/${mod}.ts --bundle --format=esm --outfile="${path.join(tmp, `${mod}.mjs`)}"`, { stdio: 'pipe' });
}
const { toCSV, parseCSV, parseTSV } = await import(pathToFileURL(path.join(tmp, 'csv.mjs')).href);
const { buildAutoMap, validateImportRows, rowToPayload, parseDateValue }
  = await import(pathToFileURL(path.join(tmp, 'lead-import.mjs')).href);

let passed = 0;
const check = (name, fn) => { fn(); passed++; console.log(`ok - ${name}`); };

// ── golden fixture: the exact incident lead + adversarial extras ────────────
const CF_DEFS = [
  { id: 'cf-gst',  name: 'GST' },
  { id: 'cf-kva',  name: 'KVA' },
  { id: 'cf-test', name: 'Test' },
  { id: 'cf-t2',   name: 'Test-2' },
  // Spec-mandated extra field whose value contains comma, quote AND newline.
  { id: 'cf-new',  name: 'NewCustom' },
];
const STATIC_HEADERS = [
  'First Name','Last Name','Email','Phone','Company','Source','Status','Stage','Priority',
  'Score','Expected Value','Expected Close Date','Follow-Up Date','Country','State','City',
  'Area','Postal Code','Full Address','Owner ID','Owner Name','Owner Role',
  'Assigned By (Manager ID)','Tags','Notes','Notes Count','Created Date','Updated Date',
];
const HEADERS = STATIC_HEADERS.concat(CF_DEFS.map((f) => f.name));

const NEWCUSTOM_VALUE = 'Value with comma, quote " and newline\nsecond line';

const mkRow = (over = {}, cf = {}) => ({
  'First Name': 'Harmit', 'Last Name': 'Patel', 'Email': 'tempm2204@gmail.com',
  'Phone': '+919876543210', 'Company': 'HPX EIGEN CRM', 'Source': 'COLD_CALL',
  'Status': 'NEW', 'Stage': 'INTERESTED', 'Priority': 'HIGH', 'Score': '0',
  'Expected Value': '0', 'Expected Close Date': '', 'Follow-Up Date': '26/08/2026',
  'Country': '', 'State': '', 'City': '', 'Area': '', 'Postal Code': '',
  'Full Address': 'B-104, Ashray Gold GST Road New Ranip', 'Owner ID': '',
  'Owner Name': '', 'Owner Role': '', 'Assigned By (Manager ID)': '',
  'Tags': 'vip', 'Notes': 'Testing lead', 'Notes Count': '0',
  'Created Date': '24/08/2026', 'Updated Date': '24/08/2026', ...over,
  ...Object.fromEntries(CF_DEFS.map((f) => [f.name, cf[f.name] ?? ''])),
});

const ROWS = [
  mkRow({}, { GST: 'GST', KVA: '1250', Test: '8/26/2026', 'Test-2': 'Test 4', NewCustom: NEWCUSTOM_VALUE }), // the incident lead, exactly as exported
  mkRow({
    'First Name': 'Unicode Ünït', 'Last Name': 'Testø',
    'Company': 'Acme, Inc.',                      // comma in company
    'Full Address': '1 "Quoted" Way, Suite #3',   // quotes + comma
    'Notes': 'line one\nline two',                // the field that broke production
    'Email': '',
  }, { GST: 'GST', KVA: '1250', Test: '8/26/2026', 'Test-2': 'Test 4, extra', NewCustom: NEWCUSTOM_VALUE }),
  mkRow({ 'First Name': 'Empty', 'Last Name': 'Optionals' }), // all custom fields empty
];

// ── 1. export → parse: shape survives ───────────────────────────────────────
check('round trip preserves row/column shape', () => {
  const parsed = parseCSV(toCSV(HEADERS, ROWS));
  assert.equal(parsed.error, undefined);
  assert.equal(parsed.headers.length, HEADERS.length);
  assert.equal(parsed.rows.length, ROWS.length); // no phantom rows from embedded newlines
  for (const count of parsed.columnCounts) assert.equal(count, HEADERS.length);
});

// ── 2. golden row values survive byte-for-byte ──────────────────────────────
check('incident lead fields survive exactly', () => {
  const parsed = parseCSV(toCSV(HEADERS, ROWS));
  const r = parsed.rows[0];
  assert.equal(r['First Name'], 'Harmit');
  assert.equal(r['Last Name'], 'Patel');
  assert.equal(r['Full Address'], 'B-104, Ashray Gold GST Road New Ranip');
  assert.equal(r['Company'], 'HPX EIGEN CRM');
});

check('adversarial cells survive (comma, quotes, newline)', () => {
  const parsed = parseCSV(toCSV(HEADERS, ROWS));
  const r = parsed.rows[1];
  assert.equal(r['Company'], 'Acme, Inc.');
  assert.equal(r['Full Address'], '1 "Quoted" Way, Suite #3');
  assert.equal(r['Notes'], 'line one\nline two');
  assert.equal(parsed.rows[2]['First Name'], 'Empty'); // row order intact after it
});

// ── 3. custom fields round-trip exactly (HARD RULE) ─────────────────────────
check('custom field values round-trip exactly, including comma/quote/newline', () => {
  const parsed = parseCSV(toCSV(HEADERS, ROWS));
  assert.equal(parsed.rows[0]['GST'], 'GST');
  assert.equal(parsed.rows[0]['KVA'], '1250');
  assert.equal(parsed.rows[0]['Test'], '8/26/2026');
  assert.equal(parsed.rows[0]['Test-2'], 'Test 4');
  assert.equal(parsed.rows[0]['NewCustom'], NEWCUSTOM_VALUE);
  assert.equal(parsed.rows[1]['Test-2'], 'Test 4, extra'); // comma inside value
  for (const f of CF_DEFS) assert.equal(parsed.rows[2][f.name], ''); // empty stays empty
});

// ── 4. auto-map: customs map to their ids; Status must NOT own stage ────────
check('auto-map maps custom fields by name and never lets Status drive Stage', () => {
  const parsed = parseCSV(toCSV(HEADERS, ROWS));
  const map = buildAutoMap(parsed.headers, CF_DEFS);
  for (const f of CF_DEFS) assert.equal(map[f.name], `cf:${f.id}`);
  assert.notEqual(map['Status'], 'stage'); // removed alias — was silently overwriting Stage
  assert.equal(map['Stage'], 'stage');

  const payload = rowToPayload(parsed.rows[0], map);
  assert.equal(payload.stage, 'INTERESTED'); // exported stage wins, not Status=NEW
  assert.deepEqual(
    payload.customFieldValues?.sort((a, b) => a.fieldId.localeCompare(b.fieldId)),
    [
      { fieldId: 'cf-gst', value: 'GST' },
      { fieldId: 'cf-kva', value: '1250' },
      { fieldId: 'cf-new', value: NEWCUSTOM_VALUE },
      { fieldId: 'cf-t2', value: 'Test 4' },
      { fieldId: 'cf-test', value: '8/26/2026' },
    ],
  );
});

// ── 5. formula-injection prefix is inverted on import ────────────────────────
check('exporter injection prefix is stripped back off import', () => {
  const csv = toCSV(HEADERS, ROWS);
  assert.match(csv, /'\+919876543210/); // exporter wrote the guard prefix…
  const parsed = parseCSV(csv);
  assert.equal(parseCSV(csv).rows[0]['Phone'], '+919876543210'); // …parser removes it
});

// ── 6. structural validation rejects ragged rows BEFORE business rules ──────
check('ragged row rejected with precise column-count error, intact rows still validated', () => {
  const goodCsv = toCSV(HEADERS, [ROWS[0]]);
  const lines = goodCsv.split('\r\n').filter(Boolean);
  const ragged = lines.concat('Only,Three,Cells').join('\r\n'); // data row 2 short
  const parsed = parseCSV(ragged);
  assert.equal(parsed.error, undefined); // parser accepts; validation rejects
  const errors = validateImportRows(parsed, buildAutoMap(parsed.headers, CF_DEFS));
  const structural = errors.filter((e) => e.column === '__structure__');
  assert.equal(structural.length, 1);
  assert.equal(structural[0].row, 2);
  assert.equal(
    structural[0].message,
    'Row 2 — Column count mismatch. Expected 33 columns. Received 3. This row cannot be safely imported.',
  );
  // business validation still ran on row 1 and found no issues
  assert.equal(errors.filter((e) => e.row === 1).length, 0);
});

// ── 7. full golden import validates clean end-to-end ────────────────────────
check('full golden fixture passes validation with zero errors', () => {
  const parsed = parseCSV(toCSV(HEADERS, ROWS));
  const errors = validateImportRows(parsed, buildAutoMap(parsed.headers, CF_DEFS));
  assert.deepEqual(errors, []);
});

// ── 8. paste mode: TSV from Excel/Sheets keeps commas inside cells ───────────
check('paste mode parses tab-separated clipboard without splitting on commas', () => {
  const tsv = ['First Name\tLast Name\tFull Address', 'Paste\tVictim\tB-104, Ashray Gold GST Road New Ranip'].join('\n');
  const parsed = parseTSV(tsv);
  assert.deepEqual(parsed.headers, ['First Name', 'Last Name', 'Full Address']);
  assert.equal(parsed.rows[0]['Full Address'], 'B-104, Ashray Gold GST Road New Ranip');
});

// ── 9. malformed input fails loudly instead of shifting silently ────────────
check('duplicate headers are rejected', () => {
  assert.match(parseCSV('a,a\n1,2').error, /Duplicate column header: "a"/);
});
check('unclosed quote is an error, not silent truncation', () => {
  assert.match(parseCSV('a,b\n"open,2').error, /quote/i);
});
check('DD/MM/YYYY wins over locale-dependent Date parsing', () => {
  assert.equal(parseDateValue('26/08/2026'), '2026-08-26'); // not Aug 2 in M/D locales
  assert.equal(parseDateValue('2026-08-26'), '2026-08-26');
  assert.equal(parseDateValue('garbage'), undefined);
});

console.log(`\n${passed} checks passed`);
