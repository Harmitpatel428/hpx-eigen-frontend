import { useState, useEffect, useRef, memo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  X, AlertTriangle, User, Calendar, AlertCircle,
  UserCheck, Users, Zap, Plus, Trash2, Star, Edit3, Check,
} from 'lucide-react';
import type { Lead, LeadPriority } from '../../types';
import { leadService, CreateLeadPayload, UpdateLeadPayload, DuplicateLead } from '../../services/lead.service';
import { leadContactsService, LeadContact, UpsertContactPayload } from '../../services/lead-contacts.service';
import { userService, TenantUser } from '../../services/user.service';
import type { CustomFieldDef, CustomFieldValue } from '../../types';
import { customFieldService } from '../../services/custom-field.service';
import { CustomFieldRenderer, getFieldValue, setFieldValue } from './CustomFieldRenderer';
import { CustomFieldBuilder } from './CustomFieldBuilder';

// ============================================================================
// CONSTANTS
// ============================================================================

const PRIORITY_OPTIONS: { value: LeadPriority; label: string; color: string; bg: string }[] = [
  { value: 'CRITICAL', label: 'Critical', color: '#dc2626', bg: 'rgba(220,38,38,0.08)' },
  { value: 'HIGH',     label: 'High',     color: '#ea580c', bg: 'rgba(234,88,12,0.08)'  },
  { value: 'MEDIUM',   label: 'Medium',   color: '#2563eb', bg: 'rgba(37,99,235,0.08)'  },
  { value: 'LOW',      label: 'Low',      color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
];

const CONTACT_ROLES = [
  'Primary Contact',
  'Accounts Contact',
  'Purchase Manager',
  'Technical Contact',
  'Finance Contact',
  'Decision Maker',
  'Other',
];

type OwnerMode = 'auto' | 'user' | 'unassigned';

// ============================================================================
// FORM SCHEMA
// ============================================================================

const leadSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  company: z.string().optional(),
  source: z.enum(['WEBSITE', 'REFERRAL', 'COLD_CALL', 'EMAIL_CAMPAIGN', 'SOCIAL_MEDIA', 'TRADE_SHOW', 'OTHER']).optional(),
  stage: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'DISQUALIFIED', 'CONVERTED']).optional(),
  expectedCloseDate: z.string().optional(),
  notes: z.string().optional(),
  country: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  area: z.string().optional(),
  postalCode: z.string().optional(),
  freeformAddress: z.string().optional(),
});

type LeadFormData = z.infer<typeof leadSchema>;

// ============================================================================
// DUPLICATE WARNING
// ============================================================================

const DuplicateWarning = memo(function DuplicateWarning({
  duplicates, onDismiss,
}: { duplicates: DuplicateLead[]; onDismiss: () => void }) {
  if (!duplicates.length) return null;
  return (
    <div style={{
      background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.3)',
      borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <AlertTriangle size={13} color="#d97706" />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Possible Duplicate{duplicates.length > 1 ? 's' : ''} Found
          </span>
        </div>
        <button type="button" onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#92400e', fontSize: 15, lineHeight: 1, padding: 0 }}>×</button>
      </div>
      {duplicates.map((d) => (
        <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '0.375rem', padding: '5px 8px', marginBottom: 4 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{d.firstName} {d.lastName}</div>
            <div style={{ fontSize: 11, color: '#64748b', display: 'flex', gap: 6, marginTop: 1 }}>
              {d.company && <span>{d.company}</span>}
              <span style={{ textTransform: 'uppercase', letterSpacing: '0.02em' }}>{d.stage}</span>
            </div>
          </div>
          <span style={{ fontSize: 10, color: '#64748b', padding: '2px 5px', background: 'rgba(0,0,0,0.04)', borderRadius: 3, whiteSpace: 'nowrap' }}>Continue anyway</span>
        </div>
      ))}
      <p style={{ fontSize: 10, color: '#92400e', marginTop: 4, lineHeight: 1.4 }}>Non-blocking — you can still create this lead.</p>
    </div>
  );
});

// ============================================================================
// INLINE FIELD
// ============================================================================

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</label>
      {children}
      {error && <p style={{ fontSize: 11, color: '#dc2626', marginTop: 3, display: 'flex', alignItems: 'center', gap: 3 }}><AlertCircle size={10} />{error}</p>}
    </div>
  );
}

// ============================================================================
// CONTACT FORM (inline add/edit)
// ============================================================================

interface ContactFormProps {
  initial?: Partial<UpsertContactPayload>;
  onSave: (data: UpsertContactPayload) => void;
  onCancel: () => void;
  isFirst: boolean;
}

function ContactForm({ initial, onSave, onCancel, isFirst }: ContactFormProps) {
  const [firstName, setFirstName] = useState(initial?.firstName ?? '');
  const [lastName, setLastName]   = useState(initial?.lastName ?? '');
  const [email, setEmail]         = useState(initial?.email ?? '');
  const [phone, setPhone]         = useState(initial?.phone ?? '');
  const [title, setTitle]         = useState(initial?.title ?? '');
  const [role, setRole]           = useState(initial?.role ?? CONTACT_ROLES[0]);
  const [isMain, setIsMain]       = useState(initial?.isMain ?? isFirst);

  const inp = {
    background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '0.375rem',
    padding: '6px 10px', fontSize: 13, color: '#0f172a', width: '100%',
    outline: 'none', boxSizing: 'border-box' as const,
  };

  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.75rem', marginTop: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <input style={inp} placeholder="First name *" value={firstName} onChange={e => setFirstName(e.target.value)} />
        <input style={inp} placeholder="Last name *" value={lastName} onChange={e => setLastName(e.target.value)} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <input style={inp} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input style={inp} placeholder="Mobile / Direct line" value={phone} onChange={e => setPhone(e.target.value)} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <input style={inp} placeholder="Job title" value={title} onChange={e => setTitle(e.target.value)} />
        <select style={{ ...inp, cursor: 'pointer' }} value={role} onChange={e => setRole(e.target.value)}>
          {CONTACT_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#475569', cursor: 'pointer' }}>
          <input type="checkbox" checked={isMain} onChange={e => setIsMain(e.target.checked)} style={{ accentColor: '#0f172a' }} />
          Set as Main Contact
        </label>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" onClick={onCancel} style={{ padding: '4px 10px', borderRadius: '0.375rem', border: '1px solid #e2e8f0', background: '#fff', fontSize: 12, color: '#475569', cursor: 'pointer' }}>Cancel</button>
          <button type="button" onClick={() => {
            if (!firstName.trim() || !lastName.trim()) return;
            onSave({ firstName: firstName.trim(), lastName: lastName.trim(), email: email || undefined, phone: phone || undefined, title: title || undefined, role: role || undefined, isMain });
          }} style={{ padding: '4px 10px', borderRadius: '0.375rem', border: 'none', background: '#0f172a', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CONTACTS MANAGER (Edit mode only)
// ============================================================================

interface ContactsManagerProps {
  leadId: string;
}

function ContactsManager({ leadId }: ContactsManagerProps) {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: contacts = [] } = useQuery<LeadContact[]>({
    queryKey: ['lead-contacts', leadId],
    queryFn: () => leadContactsService.list(leadId),
    staleTime: 30_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['lead-contacts', leadId] });

  const addMutation = useMutation({
    mutationFn: (payload: UpsertContactPayload) => leadContactsService.add(leadId, payload),
    onSuccess: () => { invalidate(); setAdding(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<UpsertContactPayload> }) =>
      leadContactsService.update(leadId, id, payload),
    onSuccess: () => { invalidate(); setEditingId(null); },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => leadContactsService.remove(leadId, id),
    onSuccess: invalidate,
  });

  const setMainMutation = useMutation({
    mutationFn: (id: string) => leadContactsService.update(leadId, id, { isMain: true }),
    onSuccess: invalidate,
  });

  return (
    <div>
      {contacts.length === 0 && !adding && (
        <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '0.5rem', border: '1px dashed #e2e8f0', textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>
          No contacts added yet.
        </div>
      )}

      {contacts.map((c) => (
        <div key={c.id}>
          {editingId === c.id ? (
            <ContactForm
              initial={{ firstName: c.firstName, lastName: c.lastName, email: c.email ?? '', phone: c.phone ?? '', title: c.title ?? '', role: c.role ?? '', isMain: c.isMain }}
              onSave={(payload) => updateMutation.mutate({ id: c.id, payload })}
              onCancel={() => setEditingId(null)}
              isFirst={false}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0', marginBottom: 6 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: c.isMain ? '#0f172a' : '#e2e8f0', color: c.isMain ? '#fff' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                {c.firstName[0]}{c.lastName[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 5 }}>
                  {c.firstName} {c.lastName}
                  {c.isMain && <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: '#0f172a', padding: '1px 5px', borderRadius: 3, letterSpacing: '0.03em' }}>MAIN</span>}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', display: 'flex', gap: 8, marginTop: 1, flexWrap: 'wrap' }}>
                  {c.role && <span>{c.role}</span>}
                  {c.email && <span>{c.email}</span>}
                  {c.phone && <span>{c.phone}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                {!c.isMain && (
                  <button type="button" title="Set as Main" onClick={() => setMainMutation.mutate(c.id)} style={{ width: 24, height: 24, border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0.25rem' }}>
                    <Star size={12} />
                  </button>
                )}
                <button type="button" title="Edit" onClick={() => setEditingId(c.id)} style={{ width: 24, height: 24, border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0.25rem' }}>
                  <Edit3 size={12} />
                </button>
                <button type="button" title="Remove" onClick={() => removeMutation.mutate(c.id)} style={{ width: 24, height: 24, border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0.25rem' }}>
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {adding ? (
        <ContactForm
          onSave={(payload) => addMutation.mutate(payload)}
          onCancel={() => setAdding(false)}
          isFirst={contacts.length === 0}
        />
      ) : (
        <button type="button" onClick={() => setAdding(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#6366f1', fontWeight: 500, background: 'none', border: '1px dashed #c7d2fe', borderRadius: '0.375rem', padding: '5px 10px', cursor: 'pointer', width: '100%', justifyContent: 'center', marginTop: contacts.length > 0 ? 4 : 0 }}>
          <Plus size={12} /> Add Contact
        </button>
      )}
    </div>
  );
}

// ============================================================================
// SECTION DIVIDER
// ============================================================================

function Divider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '1rem 0 0.75rem' }}>
      <div style={{ flex: 1, height: 1, background: '#f1f5f9' }} />
      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: '#f1f5f9' }} />
    </div>
  );
}

// ============================================================================
// MAIN MODAL
// ============================================================================

interface LeadModalProps {
  mode: 'create' | 'edit';
  lead?: Lead;
  onClose: () => void;
  onSuccess: () => void;
}

export const LeadModal = memo(function LeadModal({ mode, lead, onClose, onSuccess }: LeadModalProps) {
  const [ownerMode, setOwnerMode] = useState<OwnerMode>(() =>
    mode === 'edit' && lead?.ownerId ? 'user' : 'auto'
  );
  const [selectedOwnerId, setSelectedOwnerId] = useState(lead?.ownerId ?? '');
  const [ownerSearch, setOwnerSearch] = useState('');
  const [priority, setPriority] = useState<LeadPriority>(lead?.priority ?? 'MEDIUM');
  const [duplicates, setDuplicates] = useState<DuplicateLead[]>([]);
  const [duplicatesDismissed, setDuplicatesDismissed] = useState(false);
  const duplicateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const LOC_KEY = 'hpx:ui:v1:leadLocMode';
  const [locMode, setLocMode] = useState<'structured' | 'freeform'>(() => {
    try { return (localStorage.getItem(LOC_KEY) as 'structured' | 'freeform') ?? 'structured'; }
    catch { return 'structured'; }
  });
  const [customFieldValues, setCustomFieldValues] = useState<CustomFieldValue[]>(
    lead?.customFieldValues ?? []
  );
  const [showFieldBuilder, setShowFieldBuilder] = useState(false);
  const queryClient = useQueryClient();

  const handleLocMode = (m: 'structured' | 'freeform') => {
    setLocMode(m);
    try { localStorage.setItem(LOC_KEY, m); } catch {}
  };

  const {
    register, handleSubmit, watch,
    formState: { errors, isSubmitting },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: mode === 'edit' && lead ? {
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email ?? '',
      phone: lead.phone ?? '',
      company: lead.company ?? '',
      source: lead.source,
      stage: lead.stage ?? 'NEW',
      expectedCloseDate: lead.expectedCloseDate ? lead.expectedCloseDate.split('T')[0] : '',
      notes: lead.notes ?? '',
      country: lead.country ?? '',
      state: lead.state ?? '',
      city: lead.city ?? '',
      area: lead.area ?? '',
      postalCode: lead.postalCode ?? '',
      freeformAddress: lead.freeformAddress ?? '',
    } : { source: 'OTHER', stage: 'NEW' },
  });

  const { data: users = [] } = useQuery<TenantUser[]>({
    queryKey: ['users-list'],
    queryFn: () => userService.listAll(),
    staleTime: 5 * 60_000,
    enabled: ownerMode === 'user',
  });

  const { data: customFields = [] } = useQuery<CustomFieldDef[]>({
    queryKey: ['custom-fields'],
    queryFn: () => customFieldService.list(),
    staleTime: 60_000,
  });

  const filteredUsers = users.filter(
    (u) => u.status === 'ACTIVE' && (!ownerSearch || u.email.toLowerCase().includes(ownerSearch.toLowerCase()))
  );

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Duplicate detection
  const watchedEmail   = watch('email');
  const watchedPhone   = watch('phone');
  const watchedCompany = watch('company');
  const watchedFirst   = watch('firstName');
  const watchedLast    = watch('lastName');

  useEffect(() => {
    if (duplicatesDismissed) return;
    if (!watchedEmail && !watchedPhone && !watchedCompany) { setDuplicates([]); return; }
    if (duplicateTimer.current) clearTimeout(duplicateTimer.current);
    duplicateTimer.current = setTimeout(async () => {
      try {
        const results = await leadService.checkDuplicates({
          email: watchedEmail || undefined,
          phone: watchedPhone || undefined,
          company: watchedCompany || undefined,
          firstName: watchedFirst || undefined,
          lastName: watchedLast || undefined,
          excludeId: mode === 'edit' ? lead?.id : undefined,
        });
        setDuplicates(results);
      } catch { /* silent */ }
    }, 800);
    return () => { if (duplicateTimer.current) clearTimeout(duplicateTimer.current); };
  }, [watchedEmail, watchedPhone, watchedCompany, watchedFirst, watchedLast, duplicatesDismissed, mode, lead?.id]);

  const onSubmit = async (values: LeadFormData) => {
    const resolvedOwnerId = ownerMode === 'user' ? selectedOwnerId || undefined : undefined;
    const locationFields = locMode === 'structured'
      ? { country: values.country || undefined, state: values.state || undefined, city: values.city || undefined, area: values.area || undefined, postalCode: values.postalCode || undefined, freeformAddress: undefined }
      : { freeformAddress: values.freeformAddress || undefined, country: undefined, state: undefined, city: undefined, area: undefined, postalCode: undefined };
    const payload: CreateLeadPayload | UpdateLeadPayload = {
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email || undefined,
      phone: values.phone || undefined,
      company: values.company || undefined,
      source: values.source,
      stage: values.stage,
      priority,
      expectedCloseDate: values.expectedCloseDate || undefined,
      ...locationFields,
      ownerId: resolvedOwnerId,
      notes: values.notes || undefined,
      customFieldValues: customFieldValues.length > 0
        ? customFieldValues.map(v => ({ fieldId: v.fieldId, value: v.value }))
        : undefined,
    };
    if (mode === 'create') {
      await leadService.create(payload as CreateLeadPayload);
    } else if (lead) {
      await leadService.update(lead.id, payload);
    }
    onSuccess();
  };

  const inp = 'w-full bg-slate-50 border border-slate-300 rounded-md py-2 px-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }} />

      <div style={{
        position: 'relative', zIndex: 1, background: '#ffffff',
        borderRadius: '0.875rem', boxShadow: '0 32px 64px -12px rgba(0,0,0,0.4)',
        width: '100%', maxWidth: mode === 'edit' ? '680px' : '600px',
        maxHeight: '92vh', overflowY: 'auto', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid #f1f5f9', position: 'sticky', top: 0, background: '#fff', zIndex: 10, borderRadius: '0.875rem 0.875rem 0 0' }}>
          <div>
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' }}>{mode === 'create' ? 'New Lead' : 'Edit Lead'}</h2>
            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{mode === 'create' ? 'Capture a new prospect' : 'Update lead information'}</p>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.25rem 1.5rem' }}>
          <DuplicateWarning duplicates={duplicates} onDismiss={() => setDuplicatesDismissed(true)} />

          <form onSubmit={handleSubmit(onSubmit)}>

            {/* ── Basic Information ─── */}
            <Divider label="Basic Information" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <Field label="First Name *" error={errors.firstName?.message}>
                <input {...register('firstName')} className={inp} />
              </Field>
              <Field label="Last Name *" error={errors.lastName?.message}>
                <input {...register('lastName')} className={inp} />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <Field label="Email" error={errors.email?.message}>
                <input {...register('email')} type="email" className={inp} />
              </Field>
              <Field label="Phone">
                <input {...register('phone')} className={inp} />
                <span style={{ fontSize: 10, color: '#94a3b8', marginTop: 3, display: 'block' }}>Primary / company number</span>
              </Field>
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <Field label="Company">
                <input {...register('company')} className={inp} />
              </Field>
            </div>

            {/* ── Classification ─── */}
            <Divider label="Classification" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <Field label="Stage">
                <select {...register('stage')} className={inp} style={{ cursor: 'pointer' }}>
                  <option value="NEW">New</option>
                  <option value="CONTACTED">Contacted</option>
                  <option value="QUALIFIED">Qualified</option>
                  <option value="DISQUALIFIED">Disqualified</option>
                  <option value="CONVERTED">Converted</option>
                </select>
              </Field>
              <Field label="Source">
                <select {...register('source')} className={inp} style={{ cursor: 'pointer' }}>
                  <option value="OTHER">Other</option>
                  <option value="WEBSITE">Website</option>
                  <option value="REFERRAL">Referral</option>
                  <option value="COLD_CALL">Cold Call</option>
                  <option value="EMAIL_CAMPAIGN">Email Campaign</option>
                  <option value="SOCIAL_MEDIA">Social Media</option>
                  <option value="TRADE_SHOW">Trade Show</option>
                </select>
              </Field>
            </div>

            {/* Priority */}
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Priority</label>
              <div style={{ display: 'flex', gap: 5 }}>
                {PRIORITY_OPTIONS.map(opt => {
                  const active = priority === opt.value;
                  return (
                    <button key={opt.value} type="button" onClick={() => setPriority(opt.value)} style={{ flex: 1, padding: '6px 0', borderRadius: '0.375rem', border: active ? `1.5px solid ${opt.color}` : '1px solid #e2e8f0', background: active ? opt.bg : '#f8fafc', color: active ? opt.color : '#64748b', fontSize: 11, fontWeight: active ? 700 : 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, transition: 'all 0.1s' }}>
                      {active && <span style={{ width: 5, height: 5, borderRadius: '50%', background: opt.color }} />}
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Sales ─── */}
            <Divider label="Sales" />
            <div style={{ marginBottom: '0.75rem' }}>
              <Field label="Expected Close Date">
                <input {...register('expectedCloseDate')} type="date" className={inp} min={new Date().toISOString().split('T')[0]} style={{ display: 'flex', alignItems: 'center', gap: 4 }} />
              </Field>
            </div>

            {/* ── Location ─── */}
            <Divider label="Location · Optional" />
            {/* Segmented mode toggle */}
            <div style={{ display: 'flex', gap: 3, background: '#f1f5f9', borderRadius: '0.5rem', padding: 3, marginBottom: '0.75rem' }}>
              {(['structured', 'freeform'] as const).map(m => (
                <button key={m} type="button" onClick={() => handleLocMode(m)} style={{ flex: 1, padding: '5px', borderRadius: '0.375rem', border: 'none', background: locMode === m ? '#fff' : 'transparent', color: locMode === m ? '#0f172a' : '#64748b', fontSize: 12, fontWeight: locMode === m ? 600 : 400, cursor: 'pointer', boxShadow: locMode === m ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
                  {m === 'structured' ? 'Structured' : 'Freeform'}
                </button>
              ))}
            </div>
            {/* Structured fields — always registered, hidden when inactive */}
            <div style={{ display: locMode === 'structured' ? 'block' : 'none' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <Field label="Country">
                  <input {...register('country')} className={inp} />
                </Field>
                <Field label="State">
                  <input {...register('state')} className={inp} />
                </Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <Field label="City">
                  <input {...register('city')} className={inp} />
                </Field>
                <Field label="Office / Factory Location">
                  <input {...register('area')} className={inp} />
                </Field>
                <Field label="Postal Code">
                  <input {...register('postalCode')} className={inp} />
                </Field>
              </div>
            </div>
            {/* Freeform — always registered, hidden when inactive */}
            <div style={{ display: locMode === 'freeform' ? 'block' : 'none', marginBottom: '0.75rem' }}>
              <Field label="Address">
                <textarea {...register('freeformAddress')} className={inp} rows={3} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
              </Field>
            </div>

            {/* ── Owner ─── */}
            <Divider label="Owner Assignment" />
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', gap: 5, marginBottom: '0.625rem' }}>
                {([
                  { mode: 'auto' as OwnerMode, label: 'Auto Assign', icon: <Zap size={10} /> },
                  { mode: 'user' as OwnerMode, label: 'Assign to User', icon: <Users size={10} /> },
                  { mode: 'unassigned' as OwnerMode, label: 'Leave Unassigned', icon: <User size={10} /> },
                ] as const).map(opt => {
                  const active = ownerMode === opt.mode;
                  return (
                    <button key={opt.mode} type="button" onClick={() => setOwnerMode(opt.mode)} style={{ flex: 1, padding: '6px', borderRadius: '0.375rem', border: active ? '1.5px solid #0f172a' : '1px solid #e2e8f0', background: active ? '#0f172a' : '#f8fafc', color: active ? '#fff' : '#475569', fontSize: 11, fontWeight: active ? 600 : 400, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, transition: 'all 0.1s' }}>
                      {opt.icon} {opt.label}
                    </button>
                  );
                })}
              </div>

              {ownerMode === 'user' && (
                <div>
                  <input value={ownerSearch} onChange={e => setOwnerSearch(e.target.value)} placeholder="Search by email…" className={inp} style={{ marginBottom: 5 }} />
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '0.375rem', maxHeight: 130, overflowY: 'auto', background: '#f8fafc' }}>
                    {filteredUsers.length === 0 ? (
                      <div style={{ padding: '10px', textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>No active users found</div>
                    ) : filteredUsers.map(u => (
                      <button key={u.id} type="button" onClick={() => setSelectedOwnerId(u.id)} style={{ display: 'flex', alignItems: 'center', gap: 7, width: '100%', padding: '7px 10px', border: 'none', borderBottom: '1px solid #f1f5f9', background: selectedOwnerId === u.id ? 'rgba(15,23,42,0.06)' : 'transparent', cursor: 'pointer', fontSize: 12, textAlign: 'left', color: '#0f172a' }}>
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#0f172a', color: '#fff', fontSize: 8, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {u.email[0].toUpperCase()}
                        </div>
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</span>
                        {selectedOwnerId === u.id && <Check size={12} color="#0f172a" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {ownerMode === 'auto' && (
                <p style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.4 }}>Lead will be auto-assigned based on territory rules when configured. Currently left unassigned.</p>
              )}
            </div>

            {/* ── Contacts (Edit only) ─── */}
            {mode === 'edit' && lead && (
              <>
                <Divider label="Contacts" />
                <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: '0.5rem', lineHeight: 1.4 }}>
                  Individual people at this company — each with their own direct line and role.
                </p>
                <div style={{ marginBottom: '0.75rem' }}>
                  <ContactsManager leadId={lead.id} />
                </div>
              </>
            )}

            {/* ── Custom Fields ─── */}
            <Divider label="Custom Fields" />
            <div style={{ marginBottom: '0.75rem' }}>
              {customFields.map(f => (
                <div key={f.id} style={{ marginBottom: 8 }}>
                  <Field label={`${f.name}${f.required ? ' *' : ''}`}>
                    <CustomFieldRenderer
                      field={f}
                      value={getFieldValue(customFieldValues, f.id)}
                      onChange={v => setCustomFieldValues(prev => setFieldValue(prev, f, v))}
                    />
                  </Field>
                </div>
              ))}
              <button type="button" onClick={() => setShowFieldBuilder(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#6366f1', fontWeight: 500, background: 'none', border: '1px dashed #c7d2fe', borderRadius: '0.375rem', padding: '5px 10px', cursor: 'pointer', width: '100%', justifyContent: 'center', marginTop: customFields.length > 0 ? 4 : 0 }}>
                <Plus size={12} /> Add Custom Field
              </button>
            </div>

            {/* ── Notes ─── */}
            <Divider label="Notes" />
            <div style={{ marginBottom: '1.25rem' }}>
              <textarea {...register('notes')} className={inp} rows={3} placeholder="Key context about this lead…" style={{ resize: 'vertical' }} />
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={onClose} style={{ padding: '0.5rem 1.125rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting} style={{ padding: '0.5rem 1.375rem', borderRadius: '0.5rem', background: isSubmitting ? '#475569' : '#0f172a', color: '#fff', fontSize: '0.8125rem', fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer', border: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
                {isSubmitting ? 'Saving…' : mode === 'create' ? 'Create Lead' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {showFieldBuilder && (
        <CustomFieldBuilder onClose={() => {
          setShowFieldBuilder(false);
          queryClient.invalidateQueries({ queryKey: ['custom-fields'] });
        }} />
      )}
    </div>
  );
});
