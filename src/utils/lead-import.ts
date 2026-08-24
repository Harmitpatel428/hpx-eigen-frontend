// Pure lead-import logic (mapping, structural + business validation, payload
// building) — extracted from LeadImportWizard so it can be unit-tested
// without a DOM. The wizard owns UI state; this owns correctness.
import type { ParseResult } from './csv';
import { detectFieldKey } from './csv';
import type { CreateLeadPayload } from '../services/lead.service';
import type { LeadSource, LeadStage, LeadPriority, CustomFieldDef } from '../types';

export interface RowError { row: number; column: string; message: string; suggestedFix?: string }

const VALID_STAGES   = new Set(['NEW','QUALIFIED','INTERESTED','FOLLOW_UP','CALL_BACK_REQUESTED','CALL_NOT_RECEIVED','OTHER','DISQUALIFIED']);
const LEGACY_STAGES  = new Set(['CONTACTED','CONVERTED']);
const VALID_SOURCES  = new Set(['WEBSITE','REFERRAL','COLD_CALL','EMAIL_CAMPAIGN','SOCIAL_MEDIA','TRADE_SHOW','OTHER']);
const VALID_PRIOS    = new Set(['CRITICAL','HIGH','MEDIUM','LOW']);

const STAGE_ALIASES: Record<string, string> = {
  'FOLLOW UP': 'FOLLOW_UP', 'FOLLOW-UP': 'FOLLOW_UP',
  'CALLBACK': 'CALL_BACK_REQUESTED', 'CALL BACK': 'CALL_BACK_REQUESTED', 'CALL-BACK': 'CALL_BACK_REQUESTED',
  'NOT RECEIVED': 'CALL_NOT_RECEIVED', 'CALL NOT RECEIVED': 'CALL_NOT_RECEIVED',
};
const SOURCE_ALIASES: Record<string, string> = {
  LINKEDIN: 'SOCIAL_MEDIA', FACEBOOK: 'SOCIAL_MEDIA', TWITTER: 'SOCIAL_MEDIA',
  INSTAGRAM: 'SOCIAL_MEDIA', YOUTUBE: 'SOCIAL_MEDIA', SOCIAL: 'SOCIAL_MEDIA',
  WEB: 'WEBSITE', TRADESHOW: 'TRADE_SHOW', TRADE_SHOWS: 'TRADE_SHOW',
  EMAIL_CAMPAIGNS: 'EMAIL_CAMPAIGN', EMAILCAMPAIGN: 'EMAIL_CAMPAIGN',
};

export function normalizeStageValue(raw: string): string {
  const up = raw.trim().toUpperCase();
  return STAGE_ALIASES[up] ?? up;
}
export function normalizeSourceValue(raw: string): string {
  const up = raw.trim().toUpperCase().replace(/ /g, '_');
  return SOURCE_ALIASES[up] ?? up;
}

/** Auto-map CSV headers to field keys: standard aliases first, then custom
 *  field definitions by display name (tenant-scoped — defs come from the
 *  caller's tenant), everything else skipped. */
export function buildAutoMap(headers: string[], fieldDefs: CustomFieldDef[]): Record<string, string> {
  const autoMap: Record<string, string> = {};
  for (const h of headers) {
    const standard = detectFieldKey(h);
    if (standard) { autoMap[h] = standard; continue; }
    const norm = h.toLowerCase().trim();
    const cf = fieldDefs.find(f => f.name.toLowerCase() === norm);
    autoMap[h] = cf ? `cf:${cf.id}` : '__skip__';
  }
  return autoMap;
}

/** Structural validation comes BEFORE field mapping and business validation:
 *  a row whose column count differs from the header count has already shifted
 *  somewhere, and no per-field check can be trusted on it. */
function structuralErrors(parsed: ParseResult): RowError[] {
  const errors: RowError[] = [];
  parsed.columnCounts.forEach((count, idx) => {
    if (count !== parsed.headers.length) {
      errors.push({
        row: idx + 1,
        column: '__structure__',
        message: `Row ${idx + 1} — Column count mismatch. Expected ${parsed.headers.length} columns. Received ${count}. This row cannot be safely imported.`,
        suggestedFix: 'Fix the source row so it has the same number of columns as the header row.',
      });
    }
  });
  return errors;
}

function validateRow(row: Record<string, string>, map: Record<string, string>, n: number): RowError[] {
  const errors: RowError[] = [];
  const get = (key: string) => {
    const col = Object.entries(map).find(([, v]) => v === key)?.[0];
    return col ? row[col]?.trim() : '';
  };

  const first = get('firstName');
  const last  = get('lastName');
  if (!first) errors.push({ row: n, column: 'firstName', message: 'First Name is required.', suggestedFix: 'Add a first name.' });
  if (!last)  errors.push({ row: n, column: 'lastName',  message: 'Last Name is required.',  suggestedFix: 'Add a last name.' });

  const email = get('email');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push({ row: n, column: 'email', message: `Invalid email: "${email}".`, suggestedFix: 'Fix the email format.' });
  }

  const stage = get('stage');
  if (stage) {
    const normalized = normalizeStageValue(stage);
    if (LEGACY_STAGES.has(normalized)) {
      errors.push({ row: n, column: 'stage', message: `Stage "${stage}" is a legacy stage and is no longer importable.`, suggestedFix: 'Remove this value or use a current stage. The record remains readable in the system.' });
    } else if (!VALID_STAGES.has(normalized)) {
      errors.push({ row: n, column: 'stage', message: `Unknown stage: "${stage}".`, suggestedFix: `Use one of: ${[...VALID_STAGES].join(', ')}.` });
    } else if (normalized === 'INTERESTED' && !parseDateValue(get('followUpDate'))) {
      errors.push({ row: n, column: 'followUpDate', message: 'Follow-up Date is required for Interested leads.', suggestedFix: 'Add a valid Follow-Up Date for this row.' });
    }
  }

  const source = get('source');
  if (source && !VALID_SOURCES.has(normalizeSourceValue(source))) {
    errors.push({ row: n, column: 'source', message: `Unknown source: "${source}".`, suggestedFix: `Use one of: ${[...VALID_SOURCES].join(', ')}. Common values like LINKEDIN are mapped to SOCIAL_MEDIA automatically.` });
  }

  const prio = get('priority');
  if (prio && !VALID_PRIOS.has(prio.toUpperCase())) {
    errors.push({ row: n, column: 'priority', message: `Unknown priority: "${prio}".`, suggestedFix: `Use one of: ${[...VALID_PRIOS].join(', ')}.` });
  }

  const scoreRaw = get('score');
  if (scoreRaw && (isNaN(Number(scoreRaw)) || !Number.isInteger(Number(scoreRaw)))) {
    errors.push({ row: n, column: 'score', message: `Score must be an integer: "${scoreRaw}".`, suggestedFix: 'Use a whole number (e.g. 0, 50, 100).' });
  }

  const evRaw = get('expectedValue');
  if (evRaw && isNaN(Number(evRaw))) {
    errors.push({ row: n, column: 'expectedValue', message: `Expected Value must be a number: "${evRaw}".`, suggestedFix: 'Use a numeric value (e.g. 50000).' });
  }

  return errors;
}

/** Full validation pass: structural first; business rules run only against
 *  structurally intact rows. */
export function validateImportRows(parsed: ParseResult, map: Record<string, string>): RowError[] {
  const errors = structuralErrors(parsed);
  const broken = new Set(errors.map(e => e.row));
  parsed.rows.forEach((row, idx) => {
    const n = idx + 1;
    if (!broken.has(n)) errors.push(...validateRow(row, map, n));
  });
  return errors;
}

export function parseDateValue(raw: string): string | undefined {
  if (!raw) return undefined;
  // DD/MM/YYYY → YYYY-MM-DD (the format our own exporter writes)
  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) return `${slashMatch[3]}-${slashMatch[2].padStart(2, '0')}-${slashMatch[1].padStart(2, '0')}`;
  // already ISO or other parseable format
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return undefined;
}

export function rowToPayload(row: Record<string, string>, map: Record<string, string>): CreateLeadPayload | null {
  const get = (key: string): string => {
    const col = Object.entries(map).find(([, v]) => v === key)?.[0];
    return col ? row[col]?.trim() ?? '' : '';
  };

  const firstName = get('firstName');
  const lastName  = get('lastName');
  if (!firstName || !lastName) return null;

  const stageRaw  = normalizeStageValue(get('stage'));
  const sourceRaw = normalizeSourceValue(get('source'));
  const prioRaw   = get('priority').toUpperCase();

  // collect custom field values from cf: prefixed map entries
  const customFieldValues: Array<{ fieldId: string; value: string }> = [];
  Object.entries(map).forEach(([col, key]) => {
    if (!key.startsWith('cf:')) return;
    const fieldId = key.slice(3);
    const value = row[col]?.trim();
    if (value) customFieldValues.push({ fieldId, value });
  });

  const scoreStr = get('score');
  const evStr    = get('expectedValue');
  const tagsStr  = get('tagNames');

  return {
    firstName,
    lastName,
    email: get('email') || undefined,
    phone: get('phone') || undefined,
    company: get('company') || undefined,
    stage:    VALID_STAGES.has(stageRaw)  ? stageRaw  as LeadStage  : undefined,
    source:   VALID_SOURCES.has(sourceRaw) ? sourceRaw as LeadSource : undefined,
    priority: VALID_PRIOS.has(prioRaw)    ? prioRaw   as LeadPriority : undefined,
    country: get('country') || undefined,
    state:   get('state')   || undefined,
    city:    get('city')    || undefined,
    area:    get('area')    || undefined,
    postalCode: get('postalCode') || undefined,
    freeformAddress: get('freeformAddress') || undefined,
    notes:   get('notes')   || undefined,
    followUpDate: parseDateValue(get('followUpDate')) || undefined,
    expectedCloseDate: parseDateValue(get('expectedCloseDate')),
    ownerId: get('ownerId') || undefined,
    score: scoreStr ? Number(scoreStr) : undefined,
    expectedValue: evStr || undefined,
    tagNames: tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : undefined,
    ...(customFieldValues.length > 0 ? { customFieldValues } : {}),
  };
}
