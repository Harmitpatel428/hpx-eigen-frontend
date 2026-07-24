import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Search, Plus, ListFilter, ArrowDownToLine, ArrowUpFromLine,
  Phone, Mail, X, Edit2, Trash2, IndianRupee, Target, TrendingUp,
  Building2, ChevronRight, AlertCircle
} from 'lucide-react';
import type { Lead, Opportunity, LeadStage } from '../types';
import { leadService, CreateLeadPayload, UpdateLeadPayload } from '../services/lead.service';
import { opportunityService } from '../services/opportunity.service';
import { ContextPanel } from '../components/layout/ContextPanel';
import { formatINR } from '../utils/crm';

// ============================================================================
// ZOD SCHEMA — shared for create & edit
// ============================================================================

const leadSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  company: z.string().optional(),
  source: z.enum(['WEBSITE', 'REFERRAL', 'COLD_CALL', 'EMAIL_CAMPAIGN', 'SOCIAL_MEDIA', 'TRADE_SHOW', 'OTHER']).optional(),
  stage: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'DISQUALIFIED', 'CONVERTED']).optional(),
  score: z.number().min(0).max(100).optional(),
  expectedValue: z.number().min(0).optional(),
  notes: z.string().optional(),
});

type LeadFormData = z.infer<typeof leadSchema>;

// ============================================================================
// HELPERS
// ============================================================================

const STAGE_LABELS: Record<LeadStage, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  DISQUALIFIED: 'Disqualified',
  CONVERTED: 'Converted',
};

const STAGE_COLORS: Record<LeadStage, { bg: string; text: string; dot: string }> = {
  NEW:           { bg: 'rgba(99,102,241,0.1)',  text: '#6366f1', dot: '#6366f1' },
  CONTACTED:     { bg: 'rgba(245,158,11,0.1)', text: '#d97706', dot: '#d97706' },
  QUALIFIED:     { bg: 'rgba(16,185,129,0.1)', text: '#059669', dot: '#059669' },
  DISQUALIFIED:  { bg: 'rgba(239,68,68,0.1)',  text: '#dc2626', dot: '#dc2626' },
  CONVERTED:     { bg: 'rgba(139,92,246,0.1)', text: '#7c3aed', dot: '#7c3aed' },
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  NEW:           { bg: 'rgba(99,102,241,0.1)',  text: '#6366f1' },
  CONTACTED:     { bg: 'rgba(245,158,11,0.1)', text: '#d97706' },
  QUALIFIED:     { bg: 'rgba(16,185,129,0.1)', text: '#059669' },
  DISQUALIFIED:  { bg: 'rgba(239,68,68,0.1)',  text: '#dc2626' },
  CONVERTED:     { bg: 'rgba(139,92,246,0.1)', text: '#7c3aed' },
};

function scoreColor(score: number | null | undefined): string {
  if (score == null) return 'var(--text-tertiary)';
  if (score >= 80) return 'var(--color-success, #10b981)';
  if (score >= 60) return 'var(--color-warning, #f59e0b)';
  return 'var(--text-tertiary)';
}

const safeFormatINR = (val: string | number | null | undefined) => {
  if (val === null || val === undefined || val === '') return '₹0.00';
  const num = Number(val);
  if (isNaN(num)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(num);
};

// ============================================================================
// LEAD MODAL (Create & Edit)
// ============================================================================

interface LeadModalProps {
  mode: 'create' | 'edit';
  lead?: Lead;
  onClose: () => void;
  onSuccess: () => void;
}

function LeadModal({ mode, lead, onClose, onSuccess }: LeadModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: mode === 'edit' && lead
      ? {
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email ?? '',
          phone: lead.phone ?? '',
          company: lead.company ?? '',
          source: lead.source,
          stage: lead.stage ?? 'NEW',
          score: lead.score ?? 0,
          expectedValue: lead.expectedValue ? parseFloat(lead.expectedValue) : 0,
          notes: lead.notes ?? '',
        }
      : {
          source: 'OTHER',
          stage: 'NEW',
          score: 0,
          expectedValue: 0,
        },
  });

  const onSubmit = async (values: LeadFormData) => {
    const payload: CreateLeadPayload | UpdateLeadPayload = {
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email || undefined,
      phone: values.phone || undefined,
      company: values.company || undefined,
      source: values.source,
      stage: values.stage,
      score: values.score,
      expectedValue: values.expectedValue,
      notes: values.notes || undefined,
    };

    if (mode === 'create') {
      await leadService.create(payload as CreateLeadPayload);
    } else if (lead) {
      await leadService.update(lead.id, payload);
    }
    onSuccess();
  };

  const inputClass =
    'w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition';
  const labelClass = 'block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5';
  const errorClass = 'text-red-500 text-xs mt-1 flex items-center gap-1';

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Modal Container */}
      <div
        style={{
          position: 'relative', zIndex: 1,
          background: '#ffffff',
          borderRadius: '1rem',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
          padding: '1.75rem',
          width: '100%', maxWidth: '540px',
          maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>
            {mode === 'create' ? 'New Lead' : 'Edit Lead'}
          </h2>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              border: '1px solid #e2e8f0', background: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#64748b',
            }}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Name Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label className={labelClass}>First Name *</label>
              <input {...register('firstName')} className={inputClass} placeholder="Rajesh" />
              {errors.firstName && (
                <p className={errorClass}><AlertCircle size={11} />{errors.firstName.message}</p>
              )}
            </div>
            <div>
              <label className={labelClass}>Last Name *</label>
              <input {...register('lastName')} className={inputClass} placeholder="Kumar" />
              {errors.lastName && (
                <p className={errorClass}><AlertCircle size={11} />{errors.lastName.message}</p>
              )}
            </div>
          </div>

          {/* Email & Phone */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label className={labelClass}>Email</label>
              <input {...register('email')} type="email" className={inputClass} placeholder="rajesh@acme.com" />
              {errors.email && (
                <p className={errorClass}><AlertCircle size={11} />{errors.email.message}</p>
              )}
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input {...register('phone')} className={inputClass} placeholder="+91 98765 43210" />
            </div>
          </div>

          {/* Company */}
          <div style={{ marginBottom: '1rem' }}>
            <label className={labelClass}>Company</label>
            <input {...register('company')} className={inputClass} placeholder="Acme Consulting Pvt Ltd" />
          </div>

          {/* Stage & Source */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label className={labelClass}>Stage</label>
              <select {...register('stage')} className={inputClass} style={{ cursor: 'pointer' }}>
                <option value="NEW">New</option>
                <option value="CONTACTED">Contacted</option>
                <option value="QUALIFIED">Qualified</option>
                <option value="DISQUALIFIED">Disqualified</option>
                <option value="CONVERTED">Converted</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Source</label>
              <select {...register('source')} className={inputClass} style={{ cursor: 'pointer' }}>
                <option value="OTHER">Other</option>
                <option value="WEBSITE">Website</option>
                <option value="REFERRAL">Referral</option>
                <option value="COLD_CALL">Cold Call</option>
                <option value="EMAIL_CAMPAIGN">Email Campaign</option>
                <option value="SOCIAL_MEDIA">Social Media</option>
                <option value="TRADE_SHOW">Trade Show</option>
              </select>
            </div>
          </div>

          {/* Score & Expected Value */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label className={labelClass}>Lead Score (0–100)</label>
              <input
                {...register('score', { valueAsNumber: true })}
                type="number" min={0} max={100}
                className={inputClass}
                placeholder="75"
              />
              {errors.score && (
                <p className={errorClass}><AlertCircle size={11} />{errors.score.message}</p>
              )}
            </div>
            <div>
              <label className={labelClass}>Expected Value (₹)</label>
              <input
                {...register('expectedValue', { valueAsNumber: true })}
                type="number" min={0}
                className={inputClass}
                placeholder="500000"
              />
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label className={labelClass}>Notes</label>
            <textarea
              {...register('notes')}
              className={inputClass}
              rows={3}
              placeholder="Key context about this lead..."
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: '0.5rem',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                color: '#475569',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '0.625rem 1.5rem',
                borderRadius: '0.5rem',
                background: isSubmitting ? '#475569' : '#0f172a',
                color: '#ffffff',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                border: 'none',
              }}
            >
              {isSubmitting ? 'Saving…' : mode === 'create' ? 'Create Lead' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// DELETE CONFIRM DIALOG
// ============================================================================

interface DeleteConfirmProps {
  lead: Lead;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

function DeleteConfirm({ lead, onConfirm, onCancel, isDeleting }: DeleteConfirmProps) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        onClick={onCancel}
        style={{
          position: 'absolute', inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(4px)',
        }}
      />
      <div
        style={{
          position: 'relative', zIndex: 1,
          background: '#ffffff',
          borderRadius: '1rem',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
          padding: '1.75rem',
          width: '100%', maxWidth: '380px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trash2 size={18} color="#dc2626" />
          </div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>Delete Lead</h3>
        </div>
        <p style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          Are you sure you want to delete <strong>{lead.firstName} {lead.lastName}</strong>? This action soft-deletes the record and can be recovered from the database.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '0.5rem 1.25rem', borderRadius: '0.5rem',
              border: '1px solid #e2e8f0', background: '#fff',
              color: '#475569', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            style={{
              padding: '0.5rem 1.25rem', borderRadius: '0.5rem',
              background: isDeleting ? '#ef4444aa' : '#dc2626',
              color: '#fff', fontSize: '0.875rem', fontWeight: 600,
              cursor: isDeleting ? 'not-allowed' : 'pointer', border: 'none',
            }}
          >
            {isDeleting ? 'Deleting…' : 'Delete Lead'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CONTEXT PANEL CONTENT
// ============================================================================

interface LeadDetailPanelProps {
  lead: Lead;
  onEdit: () => void;
  onDelete: () => void;
}

function LeadDetailPanel({ lead, onEdit, onDelete }: LeadDetailPanelProps) {
  const { data: oppsResponse } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => opportunityService.findAll(),
  });

  const opportunities = Array.isArray(oppsResponse)
    ? oppsResponse
    : (oppsResponse as any)?.data ?? [];

  const leadOpportunities: Opportunity[] = opportunities.filter(
    (o: Opportunity) => o.leadId === lead.id
  );

  const stageStyle = STAGE_COLORS[lead.stage ?? 'NEW'] ?? STAGE_COLORS.NEW;
  const statusStyle = STATUS_COLORS[lead.status] ?? STATUS_COLORS.NEW;

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          {/* Avatar */}
          <div style={{
            width: 52, height: 52, borderRadius: '0.75rem',
            background: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.75rem',
          }}>
            {lead.firstName[0]}{lead.lastName[0]}
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
            {lead.firstName} {lead.lastName}
          </h2>
          {lead.company && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#64748b', fontSize: '0.875rem' }}>
              <Building2 size={13} />
              {lead.company}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={onEdit}
            style={{
              padding: '0.375rem 0.75rem', borderRadius: '0.5rem',
              border: '1px solid #e2e8f0', background: '#fff',
              color: '#475569', fontSize: '0.75rem', fontWeight: 500,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem',
            }}
          >
            <Edit2 size={12} /> Edit
          </button>
          <button
            onClick={onDelete}
            style={{
              padding: '0.375rem 0.75rem', borderRadius: '0.5rem',
              border: '1px solid #fecaca', background: 'rgba(239,68,68,0.05)',
              color: '#dc2626', fontSize: '0.75rem', fontWeight: 500,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem',
            }}
          >
            <Trash2 size={12} /> Delete
          </button>
        </div>
      </div>

      {/* Status & Stage Badges */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span style={{
          padding: '0.25rem 0.625rem', borderRadius: '0.375rem',
          background: statusStyle.bg, color: statusStyle.text,
          fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase',
        }}>
          {lead.status}
        </span>
        <span style={{
          padding: '0.25rem 0.625rem', borderRadius: '0.375rem',
          background: (STAGE_COLORS[lead.stage ?? 'NEW'] ?? STAGE_COLORS.NEW).bg, 
          color: (STAGE_COLORS[lead.stage ?? 'NEW'] ?? STAGE_COLORS.NEW).text,
          fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', gap: '0.25rem',
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: (STAGE_COLORS[lead.stage ?? 'NEW'] ?? STAGE_COLORS.NEW).dot, display: 'inline-block' }} />
          {STAGE_LABELS[lead.stage ?? 'NEW'] ?? (lead.stage ?? 'NEW')}
        </span>
      </div>

      {/* Key Metrics */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        gap: '0.75rem',
      }}>
        {[
          { icon: <Target size={14} />, label: 'Score', value: (lead.score ?? 0).toString(), color: scoreColor(lead.score) },
          { icon: <IndianRupee size={14} />, label: 'Expected Value', value: safeFormatINR(lead.expectedValue), color: '#0f172a' },
          { icon: <TrendingUp size={14} />, label: 'Opportunities', value: leadOpportunities.length.toString(), color: '#0f172a' },
        ].map(({ icon, label, value, color }) => (
          <div key={label} style={{
            background: '#f8fafc', borderRadius: '0.75rem',
            border: '1px solid #e2e8f0',
            padding: '0.875rem 0.75rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#94a3b8', marginBottom: '0.375rem' }}>
              {icon}
              <span style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
            </div>
            <div style={{ fontSize: '1.125rem', fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Contact Info */}
      <div style={{ background: '#f8fafc', borderRadius: '0.75rem', border: '1px solid #e2e8f0', padding: '1rem' }}>
        <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
          Contact Info
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {lead.email ? (
            <a href={`mailto:${lead.email}`} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', color: '#0f172a', fontSize: '0.875rem', textDecoration: 'none' }}>
              <Mail size={14} color="#64748b" />
              {lead.email}
            </a>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', color: '#94a3b8', fontSize: '0.875rem' }}>
              <Mail size={14} /> No email on record
            </span>
          )}
          {lead.phone ? (
            <a href={`tel:${lead.phone}`} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', color: '#0f172a', fontSize: '0.875rem', textDecoration: 'none' }}>
              <Phone size={14} color="#64748b" />
              {lead.phone}
            </a>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', color: '#94a3b8', fontSize: '0.875rem' }}>
              <Phone size={14} /> No phone on record
            </span>
          )}
        </div>
      </div>

      {/* Notes */}
      {lead.notes && (
        <div style={{ background: '#fffbeb', borderRadius: '0.75rem', border: '1px solid #fef3c7', padding: '1rem' }}>
          <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
            Notes
          </h4>
          <p style={{ fontSize: '0.875rem', color: '#78350f', lineHeight: 1.6 }}>{lead.notes}</p>
        </div>
      )}

      {/* Linked Opportunities */}
      <div>
        <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
          Linked Opportunities ({leadOpportunities.length})
        </h4>
        {leadOpportunities.length === 0 ? (
          <div style={{ padding: '1.25rem', background: '#f8fafc', borderRadius: '0.75rem', border: '1px dashed #e2e8f0', textAlign: 'center', color: '#94a3b8', fontSize: '0.8125rem' }}>
            No opportunities linked to this lead yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {leadOpportunities.map((opp) => (
              <div key={opp.id} style={{
                padding: '0.875rem 1rem',
                background: '#f8fafc',
                borderRadius: '0.75rem',
                border: '1px solid #e2e8f0',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.25rem' }}>
                    {opp.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {opp.stage.replace(/_/g, ' ')}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>
                    {formatINR(parseFloat(opp.value))}
                  </div>
                  <ChevronRight size={14} color="#94a3b8" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Timestamps */}
      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' }}>
          <span>Created {new Date(lead.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          <span>Source: {lead.source.replace(/_/g, ' ')}</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export function LeadsPage() {
  const queryClient = useQueryClient();

  // ── UI State ──────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; lead?: Lead } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);

  // ── Data Fetching ─────────────────────────────────────────────────
  const { data: leadsResponse, isLoading } = useQuery({
    queryKey: ['leads', { search: searchQuery }],
    queryFn: () => leadService.findAll({ search: searchQuery || undefined, pageSize: 100 }),
    staleTime: 30_000,
  });

  const leads: Lead[] = leadsResponse?.data ?? [];
  const totalCount = leadsResponse?.total ?? 0;

  // ── Mutations — all with mandatory invalidateQueries ──────────────
  const createMutation = useMutation({
    mutationFn: (payload: CreateLeadPayload) => leadService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setModal(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateLeadPayload }) =>
      leadService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setModal(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => leadService.softDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setDeleteTarget(null);
      setSelectedLead(null);
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────
  const handleModalSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['leads'] });
    setModal(null);
  }, [queryClient]);

  const handleDeleteConfirm = useCallback(() => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id);
    }
  }, [deleteTarget, deleteMutation]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* ─── HEADER ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex flex-col gap-1">
          <h1 className="type-title">Leads</h1>
          <p className="type-body">
            {isLoading ? 'Loading…' : `${totalCount} total · ${leads.filter(l => l.status === 'NEW').length} new`}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          {/* Search */}
          <div style={{ position: 'relative', width: 240 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input
              className="input"
              placeholder="Search leads…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 30, height: 28, fontSize: 13, backgroundColor: 'transparent', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)' }}
            />
          </div>

          <button className="btn-ghost" style={{ height: 28, padding: '0 8px', fontSize: 13, color: 'var(--text-secondary)' }}>
            <ListFilter size={14} style={{ marginRight: 4 }} /> Filters
          </button>
          <button className="btn-ghost" style={{ height: 28, padding: '0 8px', fontSize: 13, color: 'var(--text-secondary)' }}>
            <ArrowDownToLine size={14} style={{ marginRight: 4 }} /> Import
          </button>
          <button className="btn-ghost" style={{ height: 28, padding: '0 8px', fontSize: 13, color: 'var(--text-secondary)' }}>
            <ArrowUpFromLine size={14} style={{ marginRight: 4 }} /> Export
          </button>

          <div style={{ width: 1, height: 16, backgroundColor: 'var(--border-medium)', margin: '0 4px' }} />

          <button
            className="btn btn-primary"
            style={{ height: 28, padding: '0 12px', fontSize: 13, borderRadius: 'var(--radius-sm)' }}
            onClick={() => setModal({ mode: 'create' })}
          >
            <Plus size={14} style={{ marginRight: 4 }} /> New Lead
          </button>
        </div>
      </div>

      {/* ─── DATA GRID ───────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'auto', marginRight: 'calc(var(--space-4) * -1)', paddingRight: 'var(--space-4)' }}>
        {isLoading ? (
          <div className="type-ui" style={{ color: 'var(--text-tertiary)', padding: 'var(--space-4)' }}>Loading leads…</div>
        ) : leads.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
            <p style={{ marginBottom: '0.5rem', fontWeight: 500 }}>No leads found</p>
            <p style={{ fontSize: 13 }}>
              {searchQuery ? `No results for "${searchQuery}"` : 'Create your first lead to get started'}
            </p>
          </div>
        ) : (
          <div style={{ minWidth: 1400 }}>
            {/* Table Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(180px, 1fr) 140px 180px 80px 80px 120px 100px 120px 140px',
              gap: 10,
              padding: '8px 12px',
              borderBottom: '1px solid var(--border-strong)',
              position: 'sticky', top: 0,
              backgroundColor: 'var(--bg-app)', zIndex: 10,
              fontSize: 11, fontWeight: 600,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase', letterSpacing: '0.02em',
            }}>
              <div>Lead</div>
              <div>Company</div>
              <div>Contact</div>
              <div>Score</div>
              <div>Stage</div>
              <div>Status</div>
              <div>Value</div>
              <div>Last Updated</div>
              <div>Actions</div>
            </div>

            {/* Table Body */}
            <div>
              {leads.map(lead => {
                const stageStyle = STAGE_COLORS[lead.stage ?? 'NEW'] ?? STAGE_COLORS.NEW;
                const statusStyle = STATUS_COLORS[lead.status] ?? STATUS_COLORS.NEW;

                return (
                  <div
                    key={lead.id}
                    className="dense-row"
                    onClick={() => setSelectedLead(lead)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(180px, 1fr) 140px 180px 80px 80px 120px 100px 120px 140px',
                      gap: 10,
                      padding: '8px 12px',
                      borderBottom: '1px solid var(--border-light)',
                      fontSize: 13,
                      alignItems: 'center',
                      cursor: 'pointer',
                      position: 'relative',
                    }}
                  >
                    {/* 1. Lead Name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: '4px',
                        background: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
                        color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, fontWeight: 700, flexShrink: 0,
                      }}>
                        {lead.firstName[0]}{lead.lastName[0]}
                      </div>
                      <span style={{ fontWeight: 500, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        {lead.firstName} {lead.lastName}
                      </span>
                    </div>

                    {/* 2. Company */}
                    <div style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', fontSize: 12 }}>
                      {lead.company || <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                    </div>

                    {/* 3. Contact */}
                    <div style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{lead.email || '—'}</div>
                      {lead.phone && <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{lead.phone}</div>}
                    </div>

                    {/* 4. Score */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{
                        width: 6, height: 6, borderRadius: '50%',
                        backgroundColor: scoreColor(lead.score),
                        flexShrink: 0,
                      }} />
                      <span style={{ fontWeight: 600, color: scoreColor(lead.score), fontSize: 12 }}>
                        {lead.score ?? 0}
                      </span>
                    </div>

                    {/* 5. Stage */}
                    <div>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 6px',
                        background: stageStyle.bg,
                        color: stageStyle.text,
                        borderRadius: 3, fontSize: 10, fontWeight: 600,
                        textTransform: 'uppercase', letterSpacing: '0.03em',
                        whiteSpace: 'nowrap',
                      }}>
                        {STAGE_LABELS[lead.stage ?? 'NEW'] ?? (lead.stage ?? 'NEW')}
                      </span>
                    </div>

                    {/* 6. Status */}
                    <div>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 6px',
                        background: statusStyle.bg,
                        color: statusStyle.text,
                        borderRadius: 3, fontSize: 10, fontWeight: 600,
                        textTransform: 'uppercase', letterSpacing: '0.03em',
                      }}>
                        {lead.status}
                      </span>
                    </div>

                    {/* 7. Expected Value */}
                    <div style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: 12, fontWeight: 500 }}>
                      {safeFormatINR(lead.expectedValue)}
                    </div>

                    {/* 8. Last Updated */}
                    <div style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>
                      {new Date(lead.updatedAt ?? lead.createdAt).toLocaleDateString('en-IN')}
                    </div>

                    {/* 9. Actions */}
                    <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                      <button
                        className="btn-ghost"
                        style={{ width: 26, height: 26, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Edit lead"
                        onClick={e => { e.stopPropagation(); setModal({ mode: 'edit', lead }); }}
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        className="btn-ghost"
                        style={{ width: 26, height: 26, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-error, #dc2626)' }}
                        title="Delete lead"
                        onClick={e => { e.stopPropagation(); setDeleteTarget(lead); }}
                      >
                        <Trash2 size={12} />
                      </button>
                      <button
                        className="btn-ghost"
                        style={{ width: 26, height: 26, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Call"
                        onClick={() => lead.phone && window.open(`tel:${lead.phone}`)}
                      >
                        <Phone size={12} />
                      </button>
                      <button
                        className="btn-ghost"
                        style={{ width: 26, height: 26, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Email"
                        onClick={() => lead.email && window.open(`mailto:${lead.email}`)}
                      >
                        <Mail size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}

              <style>{`
                .dense-row:hover { background-color: var(--bg-hover, rgba(0,0,0,0.02)) !important; }
              `}</style>
            </div>
          </div>
        )}
      </div>

      {/* ─── CONTEXT PANEL ───────────────────────────────────────────── */}
      <ContextPanel isOpen={!!selectedLead} onClose={() => setSelectedLead(null)} width={520}>
        {selectedLead && (
          <LeadDetailPanel
            lead={selectedLead}
            onEdit={() => { setModal({ mode: 'edit', lead: selectedLead }); setSelectedLead(null); }}
            onDelete={() => { setDeleteTarget(selectedLead); setSelectedLead(null); }}
          />
        )}
      </ContextPanel>

      {/* ─── MODALS ───────────────────────────────────────────────────── */}
      {modal && (
        <LeadModal
          mode={modal.mode}
          lead={modal.lead}
          onClose={() => setModal(null)}
          onSuccess={handleModalSuccess}
        />
      )}

      {deleteTarget && (
        <DeleteConfirm
          lead={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          isDeleting={deleteMutation.isPending}
        />
      )}
    </div>
  );
}
