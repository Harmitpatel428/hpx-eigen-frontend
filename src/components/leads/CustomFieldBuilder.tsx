import { useState, useEffect } from 'react';
import { X, Plus, Trash2, ArrowUp, ArrowDown, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { CustomFieldDef, CustomFieldType } from '../../types';
import { customFieldService } from '../../services/custom-field.service';

// ── constants ─────────────────────────────────────────────────────────────────

const FIELD_TYPES: { value: CustomFieldType; label: string; hint: string }[] = [
  { value: 'text',     label: 'Text',     hint: 'Free-form text input' },
  { value: 'number',   label: 'Number',   hint: 'Numeric value' },
  { value: 'date',     label: 'Date',     hint: 'Date picker' },
  { value: 'dropdown', label: 'Dropdown', hint: 'Select from options' },
];

const RESERVED_KEYS = new Set([
  'id','firstname','lastname','email','phone','company','source','status','stage',
  'priority','score','expectedvalue','expectedclosedate','country','state','city',
  'area','postalcode','freeformaddress','ownerid','notes','tags','createdat','updatedat','tenantid',
]);

function toKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function validateName(name: string, existing: CustomFieldDef[], editingId?: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Field name is required.';
  if (trimmed.length > 50) return 'Field name must be 50 characters or less.';
  if (!/^[a-zA-Z]/.test(trimmed)) return 'Field name must start with a letter.';
  if (RESERVED_KEYS.has(toKey(trimmed))) return 'This name is reserved by the system.';
  const dupe = existing.find(f => f.key === toKey(trimmed) && f.id !== editingId);
  if (dupe) return 'A field with this name already exists.';
  return null;
}

// ── input style ───────────────────────────────────────────────────────────────

const inp: React.CSSProperties = {
  background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.375rem',
  padding: '7px 10px', fontSize: 13, color: '#0f172a', width: '100%',
  outline: 'none', boxSizing: 'border-box',
};

// ── dropdown option builder ───────────────────────────────────────────────────

function OptionList({
  options, onChange,
}: { options: string[]; onChange: (opts: string[]) => void }) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const val = draft.trim();
    if (!val || options.includes(val)) return;
    onChange([...options, val]);
    setDraft('');
  };

  const remove = (i: number) => onChange(options.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const next = [...options];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    onChange(next);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        <input
          style={{ ...inp, flex: 1 }}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="Type an option and press Enter…"
          maxLength={100}
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim() || options.includes(draft.trim())}
          style={{ padding: '7px 12px', borderRadius: '0.375rem', background: '#0f172a', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, opacity: (!draft.trim() || options.includes(draft.trim())) ? 0.4 : 1 }}
        >
          <Plus size={13} />
        </button>
      </div>

      {options.length === 0 && (
        <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: '8px 0' }}>No options yet — add some above.</p>
      )}

      {options.map((opt, i) => (
        <div key={opt} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.375rem', padding: '5px 8px' }}>
          <span style={{ flex: 1, fontSize: 13, color: '#0f172a' }}>{opt}</span>
          <button type="button" onClick={() => move(i, -1)} disabled={i === 0} style={{ width: 22, height: 22, border: 'none', background: 'none', cursor: i === 0 ? 'default' : 'pointer', color: i === 0 ? '#cbd5e1' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowUp size={12} />
          </button>
          <button type="button" onClick={() => move(i, 1)} disabled={i === options.length - 1} style={{ width: 22, height: 22, border: 'none', background: 'none', cursor: i === options.length - 1 ? 'default' : 'pointer', color: i === options.length - 1 ? '#cbd5e1' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowDown size={12} />
          </button>
          <button type="button" onClick={() => remove(i)} style={{ width: 22, height: 22, border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trash2 size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
}

export function CustomFieldBuilder({ onClose }: Props) {
  const queryClient = useQueryClient();

  const { data: fields = [] } = useQuery<CustomFieldDef[]>({
    queryKey: ['custom-fields'],
    queryFn: () => customFieldService.list(),
    staleTime: 60_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['custom-fields'] });

  const createMutation = useMutation({
    mutationFn: (payload: Parameters<typeof customFieldService.create>[0]) =>
      customFieldService.create(payload),
    onSuccess: () => { invalidate(); resetForm(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customFieldService.remove(id),
    onSuccess: invalidate,
  });

  const [name, setName]       = useState('');
  const [type, setType]       = useState<CustomFieldType>('text');
  const [options, setOptions] = useState<string[]>([]);
  const [required, setRequired] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const resetForm = () => { setName(''); setType('text'); setOptions([]); setRequired(false); setNameError(null); };

  // ESC self-close: guard dirty draft so the user doesn't accidentally lose work.
  // stopPropagation blocks the parent's window listener from also closing LeadModal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      const dirty = name.trim() !== '' || options.length > 0;
      if (dirty && !window.confirm('Discard unsaved field draft?')) return;
      onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, name, options]);

  const handleCreate = () => {
    const err = validateName(name, fields);
    if (err) { setNameError(err); return; }
    if (type === 'dropdown' && options.length === 0) { setNameError('Add at least one dropdown option.'); return; }
    createMutation.mutate({
      name: name.trim(),
      key: toKey(name.trim()),
      type,
      options: type === 'dropdown' ? options : undefined,
      required,
      displayOrder: fields.length,
    });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }} />

      <div style={{ position: 'relative', zIndex: 1, background: '#fff', borderRadius: '0.875rem', boxShadow: '0 32px 64px -12px rgba(0,0,0,0.35)', width: '100%', maxWidth: 520, maxHeight: '85vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', position: 'sticky', top: 0, background: '#fff', zIndex: 5 }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Custom Fields</h3>
            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>Add extra fields to capture business-specific data.</p>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: '1rem 1.25rem', flex: 1 }}>

          {/* Existing fields */}
          {fields.length > 0 && (
            <div style={{ marginBottom: '1.25rem' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                Existing Fields ({fields.length})
              </p>
              {fields.map(f => (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', marginBottom: 5 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{f.name}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', display: 'flex', gap: 6, marginTop: 1 }}>
                      <span style={{ textTransform: 'capitalize' }}>{f.type}</span>
                      {f.required && <span style={{ color: '#dc2626' }}>Required</span>}
                      {f.type === 'dropdown' && f.options && <span>{f.options.length} options</span>}
                    </div>
                  </div>
                  <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace', background: '#f1f5f9', padding: '2px 5px', borderRadius: 3 }}>{f.key}</span>
                  <button
                    type="button"
                    onClick={() => window.confirm(`Delete field "${f.name}"? This will remove all stored values.`) && deleteMutation.mutate(f.id)}
                    style={{ width: 24, height: 24, border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    aria-label={`Delete ${f.name}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* New field form */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.625rem', padding: '1rem' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>New Field</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, marginBottom: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Field Name *</label>
                <input
                  style={inp}
                  value={name}
                  onChange={e => { setName(e.target.value); setNameError(null); }}
                  placeholder="e.g. GST Number"
                  maxLength={50}
                />
                {nameError && (
                  <p style={{ fontSize: 11, color: '#dc2626', marginTop: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <AlertCircle size={10} />{nameError}
                  </p>
                )}
                {name && !nameError && (
                  <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Key: <code>{toKey(name)}</code></p>
                )}
              </div>
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Field Type</label>
              <div style={{ display: 'flex', gap: 5 }}>
                {FIELD_TYPES.map(ft => (
                  <button
                    key={ft.value}
                    type="button"
                    onClick={() => { setType(ft.value); setOptions([]); }}
                    title={ft.hint}
                    style={{ flex: 1, padding: '6px 4px', borderRadius: '0.375rem', border: type === ft.value ? '1.5px solid #0f172a' : '1px solid #e2e8f0', background: type === ft.value ? '#0f172a' : '#fff', color: type === ft.value ? '#fff' : '#475569', fontSize: 11, fontWeight: type === ft.value ? 700 : 500, cursor: 'pointer' }}
                  >
                    {ft.label}
                  </button>
                ))}
              </div>
            </div>

            {type === 'dropdown' && (
              <div style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Options</label>
                <OptionList options={options} onChange={setOptions} />
              </div>
            )}

            <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#475569', cursor: 'pointer', marginBottom: 12 }}>
              <input type="checkbox" checked={required} onChange={e => setRequired(e.target.checked)} style={{ accentColor: '#0f172a' }} />
              Required field
            </label>

            <button
              type="button"
              onClick={handleCreate}
              disabled={createMutation.isPending || !name.trim()}
              style={{ width: '100%', padding: '8px', borderRadius: '0.5rem', background: createMutation.isPending || !name.trim() ? '#94a3b8' : '#0f172a', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: createMutation.isPending || !name.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <Plus size={14} /> {createMutation.isPending ? 'Creating…' : 'Create Field'}
            </button>

            {createMutation.isError && (
              <p style={{ fontSize: 11, color: '#dc2626', marginTop: 6, textAlign: 'center' }}>
                Failed to create field. Is the backend API running?
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
