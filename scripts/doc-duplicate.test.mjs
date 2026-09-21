// Regression test — I2 client-side duplicate-checksum pre-flight (Phase 1 cert closure).
//
// Bundles the REAL src/utils/doc-duplicate.ts with esbuild (already installed as a vite
// dependency) and exercises findDuplicateByChecksum the way FirmDocumentUploadDialog does:
// same-bucket ACTIVE checksum match → warn; everything else → no match.
//
// Run: node scripts/doc-duplicate.test.mjs
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'doc-duplicate-'));
execSync(`npx esbuild src/utils/doc-duplicate.ts --bundle --format=esm --outfile="${path.join(tmp, 'doc-duplicate.mjs')}"`, { stdio: 'pipe' });
const { findDuplicateByChecksum } = await import(pathToFileURL(path.join(tmp, 'doc-duplicate.mjs')).href);

let passed = 0;
const check = (name, fn) => { fn(); passed++; console.log(`ok - ${name}`); };

const mkDoc = (over = {}) => ({
  checksum: 'abc123', isActive: true, category: 'REQUIREMENT', requirementId: 'req-1', ...over,
});

check('match in the same requirement bucket returns the doc', () => {
  const doc = mkDoc();
  const found = findDuplicateByChecksum([doc], 'abc123', { category: 'REQUIREMENT', requirementId: 'req-1' });
  assert.equal(found, doc);
});

check('same checksum but a DIFFERENT requirementId → no match', () => {
  const doc = mkDoc({ requirementId: 'req-2' });
  const found = findDuplicateByChecksum([doc], 'abc123', { category: 'REQUIREMENT', requirementId: 'req-1' });
  assert.equal(found, null);
});

check('a GENERAL-target search never matches a REQUIREMENT doc', () => {
  const doc = mkDoc({ category: 'REQUIREMENT', requirementId: 'req-1' });
  const found = findDuplicateByChecksum([doc], 'abc123', { category: 'GENERAL' });
  assert.equal(found, null);
});

check('a REQUIREMENT-target search never matches a GENERAL doc', () => {
  const doc = mkDoc({ category: 'GENERAL', requirementId: null });
  const found = findDuplicateByChecksum([doc], 'abc123', { category: 'REQUIREMENT', requirementId: 'req-1' });
  assert.equal(found, null);
});

check('GENERAL bucket match returns the doc', () => {
  const doc = mkDoc({ category: 'GENERAL', requirementId: null });
  const found = findDuplicateByChecksum([doc], 'abc123', { category: 'GENERAL' });
  assert.equal(found, doc);
});

check('an INACTIVE doc with the same checksum → no match', () => {
  const doc = mkDoc({ isActive: false });
  const found = findDuplicateByChecksum([doc], 'abc123', { category: 'REQUIREMENT', requirementId: 'req-1' });
  assert.equal(found, null);
});

check('a null checksum on the candidate → no match', () => {
  const doc = mkDoc({ checksum: null });
  const found = findDuplicateByChecksum([doc], 'abc123', { category: 'REQUIREMENT', requirementId: 'req-1' });
  assert.equal(found, null);
});

check('an empty checksum arg → no match', () => {
  const doc = mkDoc();
  const found = findDuplicateByChecksum([doc], '', { category: 'REQUIREMENT', requirementId: 'req-1' });
  assert.equal(found, null);
});

console.log(`\n${passed} checks passed`);
