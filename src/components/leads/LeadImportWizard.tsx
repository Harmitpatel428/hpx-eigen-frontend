import { useState, useRef, useCallback } from 'react';
import { X, Upload, FileText, AlertTriangle, Check, ChevronRight, RotateCcw, EyeOff } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { parseCSV, detectFieldKey, IMPORTABLE_FIELDS, type ParseResult } from '../../utils/csv';
import { leadService } from '../../services/lead.service';
import type { CreateLeadPayload } from '../../services/lead.service';
import type { LeadSource, LeadStage, LeadPriority, CustomFieldDef } from '../../types';

// ── validation ────────────────────────────────────────────────────────────────

interface RowError { row: number; column: string; message: string; suggestedFix?: string }

const VALID_STAGES  = new Set(['NEW','CONTACTED','QUALIFIED','DISQUALIFIED','CONVERTED']);
const VALID_SOURCES = new Set(['WEBSITE','REFERRAL','COLD_CALL','EMAIL_CAMPAIGN','SOCIAL_MEDIA','TRADE_SHOW','OTHER']);
const VALID_PRIOS   = new Set(['CRITICAL','HIGH','MEDIUM','LOW']);

function validateRows(rows: Record<string, string>[], map: Record<string, string>): RowError[] {
  const errors: RowError[] = [];
  rows.forEach((row, idx) => {
    const n = idx + 1;
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
    if (stage && !VALID_STAGES.has(stage.toUpperCase())) {
      errors.push({ row: n, column: 'stage', message: `Unknown stage: "${stage}".`, suggestedFix: `Use one of: ${[...VALID_STAGES].join(', ')}.` });
    }

    const source = get('source');
    if (source && !VALID_SOURCES.has(source.toUpperCase().replace(/ /g, '_'))) {
      errors.push({ row: n, column: 'source', message: `Unknown source: "${source}".`, suggestedFix: `Use one of: ${[...VALID_SOURCES].join(', ')}.` });
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
  });
  return errors;
}

function rowToPayload(row: Record<string, string>, map: Record<string, string>): CreateLeadPayload | null {
  const get = (key: string): string => {
    const col = Object.entries(map).find(([, v]) => v === key)?.[0];
    return col ? row[col]?.trim() ?? '' : '';
  };

  const firstName = get('firstName');
  const lastName  = get('lastName');
  if (!firstName || !lastName) return null;

  const stageRaw  = get('stage').toUpperCase();
  const sourceRaw = get('source').toUpperCase().replace(/ /g, '_');
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
    expectedCloseDate: get('expectedCloseDate') || undefined,
    ownerId: get('ownerId') || undefined,
    score: scoreStr ? Number(scoreStr) : undefined,
    expectedValue: evStr || undefined,
    tagNames: tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : undefined,
    ...(customFieldValues.length > 0 ? { customFieldValues } : {}),
  };
}

// ── styles ────────────────────────────────────────────────────────────────────

const inp: React.CSSProperties = {
  background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '0.375rem',
  padding: '6px 10px', fontSize: 13, color: '#0f172a', outline: 'none',
};

const STEPS = ['Upload', 'Map Columns', 'Preview & Validate', 'Importing', 'Done'] as const;
type Step = 0 | 1 | 2 | 3 | 4;

// ── main component ────────────────────────────────────────────────────────────

interface Props { onClose: () => void; fieldDefs: CustomFieldDef[] }

export function LeadImportWizard({ onClose, fieldDefs }: Props) {
  const queryClient  = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allFields = [
    ...IMPORTABLE_FIELDS,
    ...fieldDefs.map(f => ({ key: `cf:${f.id}`, label: f.name })),
  ];

  // Captures the auto-detected mapping so we can restore it when the user un-skips a column
  const autoMapRef = useRef<Record<string, string>>({});

  const [step, setStep]           = useState<Step>(0);
  const [parsed, setParsed]       = useState<ParseResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<RowError[]>([]);
  const [importErrors, setImportErrors]         = useState<{ row: number; message: string }[]>([]);
  const [importResult, setImportResult]         = useState<{ imported: number; skipped: number } | null>(null);
  const [progress, setProgress]   = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState('');

  const handleText = useCallback((text: string) => {
    setParseError(null);
    const result = parseCSV(text);
    if (result.error) { setParseError(result.error); return; }
    if (result.headers.length === 0) { setParseError('No valid data found.'); return; }

    // auto-map: standard fields first, then custom field name match
    const autoMap: Record<string, string> = {};
    result.headers.forEach(h => {
      const standard = detectFieldKey(h);
      if (standard) {
        autoMap[h] = standard;
      } else {
        const norm = h.toLowerCase().trim();
        const cf = fieldDefs.find(f => f.name.toLowerCase() === norm);
        autoMap[h] = cf ? `cf:${cf.id}` : '__skip__';
      }
    });
    autoMapRef.current = autoMap;
    setParsed(result);
    setColumnMap(autoMap);
    setStep(1);
  }, [fieldDefs]);

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv' && file.type !== 'application/vnd.ms-excel') {
      setParseError('Please upload a CSV file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setParseError('File is too large. Maximum size is 5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = e => handleText(e.target?.result as string);
    reader.readAsText(file, 'UTF-8');
  };

  const goToPreview = () => {
    if (!parsed) return;
    const errors = validateRows(parsed.rows, columnMap);
    setValidationErrors(errors);
    setStep(2);
  };

  const runImport = async () => {
    if (!parsed) return;
    setStep(3);
    setProgress(0);
    const payloads = parsed.rows.map(r => rowToPayload(r, columnMap)).filter(Boolean) as CreateLeadPayload[];
    const result = await leadService.importBatch(payloads, (done, total) => {
      setProgress(Math.round((done / total) * 100));
    });
    setImportResult({ imported: result.imported, skipped: result.errors.length });
    setImportErrors(result.errors);
    queryClient.invalidateQueries({ queryKey: ['leads'] });
    setStep(4);
  };

  const reset = () => {
    setParsed(null); setParseError(null); setColumnMap({});
    setValidationErrors([]); setImportErrors([]);
    setImportResult(null); setProgress(0); setPasteText(''); setPasteMode(false);
    setStep(0);
  };

  const validRows   = parsed ? parsed.rows.length - new Set(validationErrors.map(e => e.row)).size : 0;
  const invalidRows = new Set(validationErrors.map(e => e.row)).size;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }} />

      <div style={{ position: 'relative', zIndex: 1, background: '#fff', borderRadius: '0.875rem', boxShadow: '0 32px 64px -12px rgba(0,0,0,0.4)', width: '100%', maxWidth: 680, maxHeight: '92vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid #f1f5f9', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Import Leads</h2>
            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>Import from CSV, Excel, or Google Sheets</p>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
            <X size={14} />
          </button>
        </div>

        {/* Stepper */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '0.75rem 1.5rem', borderBottom: '1px solid #f8fafc', gap: 0 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, background: i < step ? '#059669' : i === step ? '#0f172a' : '#e2e8f0', color: i <= step ? '#fff' : '#94a3b8' }}>
                  {i < step ? <Check size={10} strokeWidth={3} /> : i + 1}
                </div>
                <span style={{ fontSize: 11, fontWeight: i === step ? 600 : 400, color: i === step ? '#0f172a' : i < step ? '#059669' : '#94a3b8', whiteSpace: 'nowrap' }}>{s}</span>
              </div>
              {i < STEPS.length - 1 && <div style={{ flex: 1, height: 1, background: i < step ? '#bbf7d0' : '#e2e8f0', margin: '0 8px' }} />}
            </div>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: '1.25rem 1.5rem', flex: 1 }}>

          {/* ── STEP 0: Upload ── */}
          {step === 0 && (
            <div>
              {!pasteMode ? (
                <>
                  <div
                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                    onClick={() => fileInputRef.current?.click()}
                    style={{ border: `2px dashed ${isDragging ? '#6366f1' : '#e2e8f0'}`, borderRadius: '0.75rem', padding: '2.5rem', textAlign: 'center', cursor: 'pointer', background: isDragging ? 'rgba(99,102,241,0.04)' : '#fafafa', transition: 'all 0.15s', marginBottom: '1rem' }}
                    role="button"
                    aria-label="Click or drag to upload CSV file"
                  >
                    <Upload size={28} style={{ margin: '0 auto 0.75rem', color: '#94a3b8', display: 'block' }} />
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>Drop a CSV file here or click to browse</p>
                    <p style={{ fontSize: 12, color: '#94a3b8' }}>CSV format · max 5 MB · max 5,000 rows</p>
                    <input ref={fileInputRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                  </div>

                  <button
                    type="button"
                    onClick={() => setPasteMode(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 500 }}
                  >
                    <FileText size={13} /> Paste from Excel / Google Sheets instead
                  </button>
                </>
              ) : (
                <>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                      Paste CSV or tab-separated data
                    </label>
                    <textarea
                      value={pasteText}
                      onChange={e => setPasteText(e.target.value)}
                      rows={10}
                      placeholder={'firstName,lastName,email,phone,company\nRajesh,Kumar,rajesh@acme.com,9876543210,Acme Ltd\n...'}
                      style={{ ...inp, width: '100%', resize: 'vertical', fontFamily: 'monospace', fontSize: 12, boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" onClick={() => setPasteMode(false)} style={{ padding: '7px 14px', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 12, cursor: 'pointer' }}>
                      ← Back to file upload
                    </button>
                    <button
                      type="button"
                      onClick={() => { const t = pasteText.replace(/\t/g, ','); handleText(t); }}
                      disabled={!pasteText.trim()}
                      style={{ flex: 1, padding: '7px', borderRadius: '0.5rem', background: pasteText.trim() ? '#0f172a' : '#94a3b8', color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: pasteText.trim() ? 'pointer' : 'not-allowed' }}
                    >
                      Parse Data <ChevronRight size={13} />
                    </button>
                  </div>
                </>
              )}

              {parseError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: '1rem', background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '0.5rem', padding: '0.625rem 0.75rem' }}>
                  <AlertTriangle size={14} color="#dc2626" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: '#dc2626' }}>{parseError}</span>
                </div>
              )}

              {/* Template hint */}
              <div style={{ marginTop: '1.5rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Expected columns (in any order, any capitalization):</p>
                <p style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace', lineHeight: 1.6 }}>
                  firstName, lastName, email, phone, company, stage, source, priority, score, expectedValue, tags, country, state, city, area, postalCode, notes, expectedCloseDate
                </p>
                {fieldDefs.length > 0 && (
                  <p style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace', lineHeight: 1.6, marginTop: 4 }}>
                    Custom fields: {fieldDefs.map(f => f.name).join(', ')}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 1: Map Columns ── */}
          {step === 1 && parsed && (
            <div>
              <p style={{ fontSize: 13, color: '#475569', marginBottom: '1rem' }}>
                Found <strong style={{ color: '#0f172a' }}>{parsed.rows.length} rows</strong> and <strong style={{ color: '#0f172a' }}>{parsed.headers.length} columns</strong>. Columns are mapped automatically. Toggle <em>Skip</em> for any column you want to exclude.
              </p>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '0.625rem', overflow: 'hidden', marginBottom: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 0, background: '#f8fafc', padding: '7px 12px', borderBottom: '1px solid #e2e8f0', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <span>CSV Column</span><span>Detected As</span><span>Skip</span>
                </div>
                {parsed.headers.map(h => {
                  const mapped = columnMap[h] ?? '__skip__';
                  const isSkipped = mapped === '__skip__';
                  const detectedLabel = allFields.find(f => f.key === mapped && f.key !== '__skip__')?.label;
                  return (
                    <div key={h} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, padding: '8px 12px', borderBottom: '1px solid #f8fafc', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', fontFamily: 'monospace', background: '#f1f5f9', padding: '2px 6px', borderRadius: 3, display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h}</span>
                      <span style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 5, color: isSkipped ? '#94a3b8' : '#059669' }}>
                        {isSkipped
                          ? <><EyeOff size={13} style={{ flexShrink: 0 }} /> <em style={{ fontStyle: 'normal' }}>Skip column</em></>
                          : <><Check size={13} strokeWidth={2.5} style={{ flexShrink: 0 }} /> {detectedLabel}</>
                        }
                      </span>
                      <label title={isSkipped ? 'Include this column' : 'Skip this column'} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={isSkipped}
                          onChange={e => setColumnMap(prev => ({
                            ...prev,
                            [h]: e.target.checked ? '__skip__' : (autoMapRef.current[h] ?? '__skip__'),
                          }))}
                          style={{ accentColor: '#0f172a', cursor: 'pointer' }}
                        />
                      </label>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={reset} style={{ padding: '7px 14px', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 12, cursor: 'pointer' }}>
                  Start Over
                </button>
                <button type="button" onClick={goToPreview} style={{ padding: '7px 20px', borderRadius: '0.5rem', background: '#0f172a', color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                  Preview & Validate <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Preview & Validate ── */}
          {step === 2 && parsed && (
            <div>
              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: '1rem' }}>
                {[
                  { label: 'Total Rows', value: parsed.rows.length, color: '#0f172a' },
                  { label: 'Valid', value: validRows, color: '#059669' },
                  { label: 'With Errors', value: invalidRows, color: invalidRows > 0 ? '#dc2626' : '#059669' },
                ].map(s => (
                  <div key={s.label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.75rem', textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Preview table — first 5 rows */}
              <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                Preview (first {Math.min(5, parsed.rows.length)} rows)
              </p>
              <div style={{ overflowX: 'auto', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>#</th>
                      {parsed.headers.filter(h => columnMap[h] !== '__skip__').map(h => (
                        <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.rows.slice(0, 5).map((row, i) => {
                      const rowErrors = validationErrors.filter(e => e.row === i + 1);
                      const errorCols = new Set(rowErrors.map(e => {
                        return Object.entries(columnMap).find(([, v]) => v === e.column)?.[0];
                      }));
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #f8fafc', background: rowErrors.length > 0 ? 'rgba(220,38,38,0.02)' : 'transparent' }}>
                          <td style={{ padding: '5px 10px', color: '#94a3b8' }}>{i + 1}</td>
                          {parsed.headers.filter(h => columnMap[h] !== '__skip__').map(h => (
                            <td key={h} style={{ padding: '5px 10px', background: errorCols.has(h) ? 'rgba(220,38,38,0.08)' : 'transparent', color: errorCols.has(h) ? '#dc2626' : '#0f172a', whiteSpace: 'nowrap' }}>
                              {row[h] || <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>empty</span>}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Errors */}
              {validationErrors.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                    Validation Errors ({validationErrors.length})
                  </p>
                  <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid rgba(220,38,38,0.15)', borderRadius: '0.5rem' }}>
                    {validationErrors.map((e, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '60px 100px 1fr auto', gap: 8, padding: '6px 10px', borderBottom: '1px solid rgba(220,38,38,0.08)', fontSize: 12, alignItems: 'start' }}>
                        <span style={{ color: '#94a3b8' }}>Row {e.row}</span>
                        <span style={{ color: '#64748b', fontWeight: 500 }}>{e.column}</span>
                        <span style={{ color: '#dc2626' }}>{e.message}</span>
                        {e.suggestedFix && <span style={{ color: '#64748b', fontSize: 11 }}>{e.suggestedFix}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setStep(1)} style={{ padding: '7px 14px', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 12, cursor: 'pointer' }}>
                  ← Back
                </button>
                {validRows > 0 && (
                  <button type="button" onClick={runImport} style={{ padding: '7px 20px', borderRadius: '0.5rem', background: '#0f172a', color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                    Import {validRows} Lead{validRows !== 1 ? 's' : ''} {invalidRows > 0 && `(skip ${invalidRows} invalid)`}
                    <ChevronRight size={13} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 3: Importing ── */}
          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div style={{ width: 48, height: 48, border: '3px solid #f1f5f9', borderTopColor: '#0f172a', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1.25rem' }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>Importing leads…</p>
              <div style={{ background: '#f1f5f9', borderRadius: 999, height: 6, width: '100%', maxWidth: 320, margin: '0 auto', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#0f172a', borderRadius: 999, width: `${progress}%`, transition: 'width 0.2s' }} />
              </div>
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>{progress}% complete</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* ── STEP 4: Done ── */}
          {step === 4 && importResult && (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: importErrors.length === 0 ? 'rgba(5,150,105,0.1)' : 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                <Check size={24} color={importErrors.length === 0 ? '#059669' : '#d97706'} strokeWidth={2.5} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Import Complete</h3>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: '1.5rem' }}>
                {importErrors.length === 0 ? 'All leads imported successfully.' : 'Import finished with some errors.'}
              </p>

              <div style={{ display: 'inline-grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: '1.5rem' }}>
                {[
                  { label: 'Imported', value: importResult.imported, color: '#059669', bg: 'rgba(5,150,105,0.08)' },
                  { label: 'Skipped', value: importResult.skipped + importErrors.length, color: '#d97706', bg: 'rgba(245,158,11,0.08)' },
                  { label: 'Errors', value: importErrors.length, color: importErrors.length > 0 ? '#dc2626' : '#059669', bg: importErrors.length > 0 ? 'rgba(220,38,38,0.06)' : 'rgba(5,150,105,0.06)' },
                ].map(s => (
                  <div key={s.label} style={{ background: s.bg, borderRadius: '0.5rem', padding: '1rem 1.25rem', minWidth: 100 }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {importErrors.length > 0 && (
                <div style={{ textAlign: 'left', marginBottom: '1.25rem', maxHeight: 150, overflowY: 'auto', border: '1px solid rgba(220,38,38,0.15)', borderRadius: '0.5rem' }}>
                  {importErrors.map((e, i) => (
                    <div key={i} style={{ padding: '5px 10px', borderBottom: '1px solid rgba(220,38,38,0.08)', fontSize: 12 }}>
                      <span style={{ color: '#94a3b8', marginRight: 8 }}>Row {e.row}</span>
                      <span style={{ color: '#dc2626' }}>{e.message}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button type="button" onClick={reset} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 12, cursor: 'pointer' }}>
                  <RotateCcw size={13} /> Import Another File
                </button>
                <button type="button" onClick={onClose} style={{ padding: '8px 20px', borderRadius: '0.5rem', background: '#0f172a', color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
