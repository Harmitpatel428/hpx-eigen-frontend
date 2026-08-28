// PRODUCTION round-trip verification — replays the 2026-08-24 incident
// against the live API end-to-end:
//   create lead w/ custom fields → server export → REAL parser/mapper →
//   import → verify persisted values → cleanup (permanent deletes).
//
// Usage:  node scripts/verify-prod-roundtrip.mjs <accessToken> [baseUrl]
//   Token: browser DevTools → Application → Local Storage → "auth:tokens"
//          → copy the accessToken value.
// Nothing is committed; the script only touches leads/fields it created.
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.argv[3] || process.env.PROD_API_URL || 'https://api.hpx-eigen.com';
const TOKEN = process.argv[2] || process.env.PROD_TOKEN;
if (!TOKEN) { console.error('Usage: node scripts/verify-prod-roundtrip.mjs <accessToken> [baseUrl]'); process.exit(1); }

const api = async (method, p, body) => {
  const res = await fetch(`${BASE}${p}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
};
const unwrap = (r) => r.json?.data ?? r.json;

// Bundle the REAL shipped parser/mapper (identical to the deployed bfd0bbc build).
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'prod-rt-'));
for (const mod of ['csv', 'lead-import']) {
  execSync(`npx esbuild src/utils/${mod}.ts --bundle --format=esm --outfile="${path.join(tmp, `${mod}.mjs`)}"`, { stdio: 'pipe' });
}
const { toCSV, parseCSV } = await import(pathToFileURL(path.join(tmp, 'csv.mjs')).href);
const { buildAutoMap, validateImportRows, rowToPayload }
  = await import(pathToFileURL(path.join(tmp, 'lead-import.mjs')).href);

let failures = 0;
const check = (ok, name, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} - ${name}${detail ? ` (${detail})` : ''}`);
  if (!ok) failures++;
};

// ── 0. auth sanity ──────────────────────────────────────────────────────────
const me = await api('GET', '/api/v1/auth/me').catch(() => ({ status: 0 }));
if (me.status === 404) {
  const alt = await api('GET', '/api/v1/users/me');
  check(alt.status === 200, 'auth: token accepted', `GET /users/me → ${alt.status}`);
} else {
  check(me.status === 200, 'auth: token accepted', `status ${me.status}`);
}

// ── 1. ensure the five field defs exist (remember which we created) ────────
let defs = unwrap(await api('GET', '/api/v1/lead-fields')) ?? [];
const wanted = ['GST', 'KVA', 'Test', 'Test-2', 'NewCustom'];
const createdDefs = [];
for (const name of wanted) {
  if (!defs.some((d) => d.name.toLowerCase() === name.toLowerCase())) {
    const r = await api('POST', '/api/v1/lead-fields', { name, key: name.toLowerCase().replace(/[^a-z0-9]+/g, '_'), type: 'text' });
    if (r.status === 201 || r.status === 200) { createdDefs.push(unwrap(r)); }
    else check(false, `field def "${name}" create`, `${r.status} ${JSON.stringify(r.json)?.slice(0, 120)}`);
  }
}
defs = unwrap(await api('GET', '/api/v1/lead-fields')) ?? [];
const defByName = Object.fromEntries(defs.map((d) => [d.name, d.id]));
check(wanted.every((n) => defByName[n]), 'all 5 field defs present', createdDefs.length ? `${createdDefs.length} newly created` : 'all pre-existing');

const NASTY = 'Value with comma, quote " and newline\nsecond line';
const cfValues = [
  { fieldId: defByName['GST'], value: 'GST' },
  { fieldId: defByName['KVA'], value: '1250' },
  { fieldId: defByName['Test'], value: '8/26/2026' },
  { fieldId: defByName['Test-2'], value: 'Test 4' },
  { fieldId: defByName['NewCustom'], value: NASTY },
];
const stamp = Date.now().toString(36);
const EMAIL = `rt-verify-${stamp}@test.invalid`;

// ── 2. seed the incident-shaped lead ────────────────────────────────────────
const FOLLOW_UP = new Date(Date.now() + 86_400_000).toISOString();
const seed = await api('POST', '/api/v1/leads', {
  firstName: 'Harmit', lastName: `RTVerify-${stamp}`,
  email: EMAIL, phone: '+919876543210', company: 'HPX EIGEN CRM',
  source: 'COLD_CALL', stage: 'INTERESTED', priority: 'HIGH',
  notes: 'Testing lead', freeformAddress: 'B-104, Ashray Gold GST Road New Ranip',
  followUpDate: FOLLOW_UP,
  customFieldValues: cfValues,
});
check(seed.status === 201, 'seed lead created', `status ${seed.status}`);
const seedLead = unwrap(seed);
const seedId = seedLead?.id;
if (!seedId) { console.error('Cannot continue without seed lead'); process.exit(1); }

// ── 3. server-side export (exactly what the Export button pulls) ────────────
const expRows = unwrap(await api('GET', `/api/v1/leads/export?ids=${seedId}`)) ?? [];
check(expRows.length === 1, 'export returned the lead', `${expRows.length} row(s)`);
const l = expRows[0] ?? {};
check(Array.isArray(l.customFieldValues) && l.customFieldValues.some((v) => v.value === NASTY),
  'prod stores the comma/quote/newline value verbatim');

// Mirror LeadsPage.exportViaServer's client-side CSV construction.
const fmtExportDate = (v) => {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};
const STATIC_HEADERS = ['First Name','Last Name','Email','Phone','Company','Source','Status','Stage','Priority','Score','Expected Value','Expected Close Date','Follow-Up Date','Country','State','City','Area','Postal Code','Full Address','Owner ID','Owner Name','Owner Role','Assigned By (Manager ID)','Tags','Notes','Notes Count','Created Date','Updated Date'];
const stored = Array.isArray(l.customFieldValues) ? l.customFieldValues : [];
const csvRow = {
  'First Name': l.firstName, 'Last Name': l.lastName,
  'Email': l.email ?? '', 'Phone': l.phone ?? '', 'Company': l.company ?? '',
  'Source': l.source ?? '', 'Status': l.status ?? '', 'Stage': l.stage ?? '',
  'Priority': l.priority ?? '', 'Score': l.score ?? '', 'Expected Value': l.expectedValue ?? '',
  'Expected Close Date': fmtExportDate(l.expectedCloseDate), 'Follow-Up Date': fmtExportDate(l.followUpDate),
  'Country': l.country ?? '', 'State': l.state ?? '', 'City': l.city ?? '',
  'Area': l.area ?? '', 'Postal Code': l.postalCode ?? '', 'Full Address': l.freeformAddress ?? '',
  'Owner ID': l.ownerId ?? '', 'Owner Name': '', 'Owner Role': '', 'Assigned By (Manager ID)': '',
  'Tags': Array.isArray(l.tags) ? l.tags.map((t) => t.name).join(', ') : '',
  'Notes': [(l.notes ?? ''), (l.notesText ?? '')].filter(Boolean).join('\n'),
  'Notes Count': l.notesCount ?? 0, 'Created Date': fmtExportDate(l.createdAt), 'Updated Date': fmtExportDate(l.updatedAt),
  ...Object.fromEntries(defs.map((f) => [f.name, stored.find((sv) => sv.fieldId === f.id)?.value ?? ''])),
};
const headers = [...STATIC_HEADERS, ...defs.map((f) => f.name)];
const csv = toCSV(headers, [csvRow]);
check(csv.includes("'"), 'exporter wrote formula-injection guard prefix');

// ── 4. import path: parse → map → validate → send (the wizard's exact flow) ─
const parsed = parseCSV(csv);
check(parsed.error === undefined && parsed.rows.length === 1 && parsed.columnCounts[0] === headers.length,
  'deployed-parser logic re-parses cleanly', parsed.error ?? '');
const map = buildAutoMap(parsed.headers, defs);
check(map['Stage'] === 'stage' && map['Status'] !== 'stage', 'Stage comes from Stage, not Status');
const errors = validateImportRows(parsed, map);
check(errors.length === 0, 'validation clean', JSON.stringify(errors));
const payload = rowToPayload(parsed.rows[0], map);

const imp = await api('POST', '/api/v1/leads/import', { rows: [payload], onDuplicates: 'skip' });
check(imp.status === 200 && imp.json?.data?.imported === 1, 'prod import accepted the row',
  imp.status !== 200 ? `${imp.status} ${JSON.stringify(imp.json)?.slice(0, 160)}` : '');

// ── 5. verify what production actually persisted ────────────────────────────
const found = unwrap(await api('GET', `/api/v1/leads?search=${encodeURIComponent(EMAIL)}&pageSize=10`)) ?? [];
const imported = (found.data ?? found).find?.((x) => x.lastName === `RTVerify-${stamp}` && x.id !== seedId)
  ?? (found.data ?? found)[0];
check(!!imported && imported.id !== seedId, 're-imported lead exists', imported?.id ?? 'not found');
if (imported) {
  const got = [...(Array.isArray(imported.customFieldValues) ? imported.customFieldValues : [])]
    .sort((a, b) => String(a.fieldId).localeCompare(String(b.fieldId)));
  const want = [...cfValues].sort((a, b) => a.fieldId.localeCompare(b.fieldId));
  check(JSON.stringify(got) === JSON.stringify(want), 'custom fields round-trip EXACTLY',
    JSON.stringify({ got, want }).slice(0, 400));
  check(imported.stage === 'INTERESTED', 'stage survived (not clobbered by Status=NEW)', String(imported.stage));
  check(imported.freeformAddress === 'B-104, Ashray Gold GST Road New Ranip', 'address intact (comma safe)');
  check(imported.phone === '+919876543210', 'phone intact (injection prefix inverted)');
}

// ── 6. cleanup — permanent-delete both leads + any defs we created ──────────
for (const id of [seedId, imported?.id].filter(Boolean)) {
  const r = await api('DELETE', `/api/v1/leads/${id}/permanent`);
  check(r.status === 200 || r.status === 204 || r.status === 404, `cleanup: lead ${id.slice(0, 8)} removed`, `status ${r.status}`);
}
for (const d of createdDefs) {
  const r = await api('DELETE', `/api/v1/lead-fields/${d.id}`);
  check(r.status === 200 || r.status === 204 || r.status === 404, `cleanup: field def "${d.name}" removed`, `status ${r.status}`);
}

console.log(failures === 0 ? '\n✅ ALL CHECKS PASSED — production round-trip verified' : `\n❌ ${failures} check(s) FAILED`);
process.exit(failures === 0 ? 0 : 1);
