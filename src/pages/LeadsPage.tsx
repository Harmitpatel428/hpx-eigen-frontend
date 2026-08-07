import { useState, useCallback, useEffect, memo, type CSSProperties } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Plus, ListFilter, ArrowDownToLine, ArrowUpFromLine,
  Phone, Mail, X, Edit2, Trash2,
  Building2, Calendar, MapPin,
  MessageCircle, Copy, Check,
} from 'lucide-react';
import type { Lead, LeadStage, LeadPriority } from '../types';
import { leadService } from '../services/lead.service';
import { leadContactsService, LeadContact } from '../services/lead-contacts.service';
import { ContextPanel } from '../components/layout/ContextPanel';
import { LeadModal } from '../components/leads/LeadModal';

// ============================================================================
// HELPERS
// ============================================================================

const STAGE_LABELS: Record<LeadStage, string> = {
  NEW: 'New', CONTACTED: 'Contacted', QUALIFIED: 'Qualified',
  DISQUALIFIED: 'Disqualified', CONVERTED: 'Converted',
};

const STAGE_COLORS: Record<LeadStage, { bg: string; text: string; dot: string }> = {
  NEW:          { bg: 'rgba(99,102,241,0.1)',  text: '#6366f1', dot: '#6366f1' },
  CONTACTED:    { bg: 'rgba(245,158,11,0.1)', text: '#d97706', dot: '#d97706' },
  QUALIFIED:    { bg: 'rgba(16,185,129,0.1)', text: '#059669', dot: '#059669' },
  DISQUALIFIED: { bg: 'rgba(239,68,68,0.1)',  text: '#dc2626', dot: '#dc2626' },
  CONVERTED:    { bg: 'rgba(139,92,246,0.1)', text: '#7c3aed', dot: '#7c3aed' },
};

const PRIORITY_COLORS: Record<LeadPriority, { color: string; bg: string }> = {
  CRITICAL: { color: '#dc2626', bg: 'rgba(220,38,38,0.08)' },
  HIGH:     { color: '#ea580c', bg: 'rgba(234,88,12,0.08)'  },
  MEDIUM:   { color: '#2563eb', bg: 'rgba(37,99,235,0.08)'  },
  LOW:      { color: '#6b7280', bg: 'rgba(107,114,128,0.08)' },
};

function whatsappUrl(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits}`;
}

// ============================================================================
// COPY ICON BUTTON
// ============================================================================

function CopyIconButton({ text, tooltip }: { text: string; tooltip: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);
  return (
    <button
      onClick={handleCopy}
      title={tooltip}
      style={{
        width: 26, height: 26, borderRadius: '0.375rem',
        border: `1px solid ${copied ? '#d1fae5' : '#e2e8f0'}`,
        background: copied ? 'rgba(5,150,105,0.06)' : 'transparent',
        color: copied ? '#059669' : '#94a3b8',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s', flexShrink: 0,
      }}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
    </button>
  );
}

// ============================================================================
// DELETE CONFIRM
// ============================================================================

interface DeleteConfirmProps {
  lead: Lead;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

function DeleteConfirm({ lead, onConfirm, onCancel, isDeleting }: DeleteConfirmProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div onClick={onCancel} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'relative', zIndex: 1, background: '#fff', borderRadius: '0.875rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)', padding: '1.5rem', width: '100%', maxWidth: '360px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.625rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trash2 size={16} color="#dc2626" />
          </div>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' }}>Delete Lead</h3>
        </div>
        <p style={{ fontSize: '0.8125rem', color: '#475569', marginBottom: '1.25rem', lineHeight: 1.5 }}>
          Delete <strong>{lead.firstName} {lead.lastName}</strong>? This soft-deletes the record.
        </p>
        <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '0.4375rem 1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
          <button onClick={onConfirm} disabled={isDeleting} style={{ padding: '0.4375rem 1rem', borderRadius: '0.5rem', background: isDeleting ? '#ef4444aa' : '#dc2626', color: '#fff', fontSize: '0.8125rem', fontWeight: 600, cursor: isDeleting ? 'not-allowed' : 'pointer', border: 'none' }}>
            {isDeleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// LEAD DETAIL PANEL
// ============================================================================

interface LeadDetailPanelProps {
  lead: Lead;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

const LeadDetailPanel = memo(function LeadDetailPanel({ lead, onEdit, onDelete, onClose }: LeadDetailPanelProps) {
  const { data: contacts = [] } = useQuery<LeadContact[]>({
    queryKey: ['lead-contacts', lead.id],
    queryFn: () => leadContactsService.list(lead.id),
    staleTime: 30_000,
  });

  const [leadCopied, setLeadCopied] = useState(false);

  const stageStyle    = STAGE_COLORS[lead.stage ?? 'NEW'] ?? STAGE_COLORS.NEW;
  const priorityStyle = PRIORITY_COLORS[lead.priority ?? 'MEDIUM'] ?? PRIORITY_COLORS.MEDIUM;

  const mainContact  = contacts.find(c => c.isMain) ?? contacts[0] ?? null;
  const contactPhone = mainContact?.phone ?? lead.phone;
  const contactEmail = mainContact?.email ?? lead.email;
  const hasLocation  = lead.country || lead.state || lead.city;
  const locationStr  = [lead.area, lead.city, lead.state, lead.country].filter(Boolean).join(', ');

  const copyContactText = [
    mainContact ? `${mainContact.firstName} ${mainContact.lastName}` : `${lead.firstName} ${lead.lastName}`,
    lead.company  && `Company: ${lead.company}`,
    contactPhone  && `Phone: ${contactPhone}`,
    contactEmail  && `Email: ${contactEmail}`,
    hasLocation   && `Location: ${locationStr}`,
  ].filter(Boolean).join('\n');

  const copyLeadText = [
    '─────────────────────────────',
    'LEAD',
    `${lead.firstName} ${lead.lastName}`,
    '',
    lead.company  && `Company\n${lead.company}`,
    contactPhone  && `Phone\n${contactPhone}`,
    contactEmail  && `Email\n${contactEmail}`,
    hasLocation   && `Location\n${locationStr}`,
    '',
    `Priority\n${lead.priority ?? 'MEDIUM'}`,
    `Stage\n${STAGE_LABELS[lead.stage ?? 'NEW']}`,
    `Source\n${(lead.source ?? 'OTHER').replace(/_/g, ' ')}`,
    lead.expectedCloseDate && `Expected Close\n${new Date(lead.expectedCloseDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`,
    lead.notes && `\nNotes\n${lead.notes}`,
    contacts.length > 0 && `\nContacts\n${contacts.map(c => `  • ${c.firstName} ${c.lastName}${c.role ? ` (${c.role})` : ''}${c.phone ? ` — ${c.phone}` : ''}${c.email ? ` — ${c.email}` : ''}`).join('\n')}`,
    '',
    `Created: ${new Date(lead.createdAt).toLocaleDateString('en-IN')}`,
    '─────────────────────────────',
  ].filter(Boolean).join('\n');

  const handleCopyLead = () => {
    navigator.clipboard.writeText(copyLeadText).then(() => {
      setLeadCopied(true);
      setTimeout(() => setLeadCopied(false), 2000);
    });
  };

  const btnBase: CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 4, height: 28,
    padding: '0 0.625rem', borderRadius: '0.375rem',
    fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
  };

  return (
    <div>

      {/* ── Sticky Header ── */}
      <div style={{
        padding: '0.875rem 1.125rem 0.75rem',
        borderBottom: '1px solid #edf0f4',
        position: 'sticky', top: 0,
        background: 'var(--bg-app)', zIndex: 5,
      }}>
        {/* Row 1: Avatar · Name · Action group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem' }}>
          <div style={{
            width: 38, height: 38, borderRadius: '0.5rem', flexShrink: 0,
            background: 'linear-gradient(135deg,#0f172a 0%,#334155 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: '0.8125rem', fontWeight: 700, letterSpacing: '0.01em',
          }}>
            {lead.firstName[0]}{lead.lastName[0]}
          </div>

          <h2 style={{
            flex: 1, minWidth: 0,
            fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.25,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {lead.firstName} {lead.lastName}
          </h2>

          {/* Edit + Delete as action group */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
            <button onClick={onEdit} style={{ ...btnBase, border: '1px solid #e2e8f0', background: '#fff', color: '#475569' }}>
              <Edit2 size={11} /> Edit
            </button>
            <button onClick={onDelete} style={{ ...btnBase, border: '1px solid #fecaca', background: 'rgba(239,68,68,0.04)', color: '#dc2626' }}>
              <Trash2 size={11} /> Delete
            </button>
            {/* Visual separator before Close */}
            <div style={{ width: 1, height: 16, background: '#e2e8f0', margin: '0 0.125rem' }} />
            <button onClick={onClose} style={{
              width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '0.375rem', border: '1px solid #e2e8f0',
              background: '#fff', color: '#64748b', cursor: 'pointer',
            }}>
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Row 2: Status chips */}
        <div style={{ display: 'flex', gap: '0.3125rem', flexWrap: 'wrap' }}>
          <span style={{
            padding: '0.1875rem 0.5rem', borderRadius: '0.25rem',
            background: stageStyle.bg, color: stageStyle.text,
            fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', gap: 3,
          }}>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: stageStyle.dot }} />
            {STAGE_LABELS[lead.stage ?? 'NEW']}
          </span>
          <span style={{
            padding: '0.1875rem 0.5rem', borderRadius: '0.25rem',
            background: priorityStyle.bg, color: priorityStyle.color,
            fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            {lead.priority ?? 'MEDIUM'}
          </span>
          {lead.expectedCloseDate && (
            <span style={{
              padding: '0.1875rem 0.5rem', borderRadius: '0.25rem',
              background: 'rgba(5,150,105,0.08)', color: '#059669',
              fontSize: '0.5625rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3,
            }}>
              <Calendar size={9} />
              {new Date(lead.expectedCloseDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          )}
          <span style={{
            padding: '0.1875rem 0.5rem', borderRadius: '0.25rem',
            background: '#f1f5f9', color: '#64748b',
            fontSize: '0.5625rem', fontWeight: 500, letterSpacing: '0.03em',
          }}>
            {(lead.source ?? 'OTHER').replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* ── Scrollable Body ── */}
      <div style={{ padding: '0.875rem 1.125rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

        {/* ── Contact Information Card ── */}
        <div style={{
          background: '#f8fafc', borderRadius: '0.625rem',
          border: '1px solid #e8edf2', padding: '0.875rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h4 style={{
              fontSize: '0.5625rem', fontWeight: 700, color: '#94a3b8',
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              Contact Information
            </h4>
            <CopyIconButton text={copyContactText} tooltip="Copy Contact Information" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4375rem' }}>
            {/* Company */}
            {lead.company && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a' }}>
                <Building2 size={13} color="#94a3b8" style={{ flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.company}</span>
              </div>
            )}

            {/* Thin divider between company and contact person */}
            {lead.company && (mainContact || contactEmail || contactPhone) && (
              <div style={{ height: 1, background: '#edf0f3', margin: '0.0625rem 0' }} />
            )}

            {/* Main contact person */}
            {mainContact && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  background: '#1e293b', color: '#fff',
                  fontSize: '0.5625rem', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {mainContact.firstName[0]}{mainContact.lastName[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {mainContact.firstName} {mainContact.lastName}
                    {mainContact.title && (
                      <span style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 400 }}> · {mainContact.title}</span>
                    )}
                  </div>
                  {mainContact.role && (
                    <div style={{ fontSize: '0.6875rem', color: '#64748b', lineHeight: 1.3 }}>
                      {mainContact.role}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Email */}
            {contactEmail ? (
              <a href={`mailto:${contactEmail}`} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                color: '#334155', fontSize: '0.8125rem', textDecoration: 'none',
              }}>
                <Mail size={12} color="#94a3b8" style={{ flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contactEmail}</span>
              </a>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#cbd5e1', fontSize: '0.8125rem' }}>
                <Mail size={12} style={{ flexShrink: 0 }} /> No email
              </div>
            )}

            {/* Phone */}
            {contactPhone ? (
              <a href={`tel:${contactPhone}`} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                color: '#334155', fontSize: '0.8125rem', textDecoration: 'none',
              }}>
                <Phone size={12} color="#94a3b8" style={{ flexShrink: 0 }} />
                <span>{contactPhone}</span>
              </a>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#cbd5e1', fontSize: '0.8125rem' }}>
                <Phone size={12} style={{ flexShrink: 0 }} /> No phone
              </div>
            )}

            {/* Location */}
            {hasLocation && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: '#64748b', fontSize: '0.8125rem' }}>
                <MapPin size={12} color="#94a3b8" style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ lineHeight: 1.45 }}>{locationStr}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Additional Contacts ── */}
        {contacts.length > 1 && (
          <div>
            <h4 style={{
              fontSize: '0.5625rem', fontWeight: 700, color: '#94a3b8',
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4375rem',
            }}>
              All Contacts ({contacts.length})
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3125rem' }}>
              {contacts.map(c => (
                <div key={c.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '0.5rem 0.75rem',
                  background: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e8edf2',
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                    background: c.isMain ? '#1e293b' : '#e2e8f0',
                    color: c.isMain ? '#fff' : '#64748b',
                    fontSize: '0.5625rem', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {c.firstName[0]}{c.lastName[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.firstName} {c.lastName}
                      </span>
                      {c.isMain && (
                        <span style={{
                          fontSize: '0.5rem', color: '#fff', background: '#334155',
                          padding: '1px 5px', borderRadius: 3, letterSpacing: '0.04em', flexShrink: 0,
                        }}>
                          MAIN
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: '#64748b', display: 'flex', gap: 5, marginTop: 1, flexWrap: 'wrap' }}>
                      {c.role && <span>{c.role}</span>}
                      {c.email && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email}</span>}
                      {c.phone && <span>{c.phone}</span>}
                    </div>
                  </div>
                  {c.phone && (
                    <button
                      onClick={() => window.open(whatsappUrl(c.phone!), '_blank')}
                      title="WhatsApp"
                      style={{
                        width: 26, height: 26, border: '1px solid #dcfce7',
                        background: 'rgba(34,197,94,0.06)', cursor: 'pointer',
                        color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '0.375rem', flexShrink: 0,
                      }}
                    >
                      <MessageCircle size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Quick Actions (replaces Opportunities section) ── */}
        <div style={{
          background: '#f8fafc', borderRadius: '0.625rem',
          border: '1px solid #e8edf2', padding: '0.875rem',
        }}>
          <h4 style={{
            fontSize: '0.5625rem', fontWeight: 700, color: '#94a3b8',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.625rem',
          }}>
            Quick Actions
          </h4>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => contactPhone && window.open(whatsappUrl(contactPhone), '_blank')}
              disabled={!contactPhone}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                height: 36, padding: '0 0.75rem', borderRadius: '0.5rem',
                border: contactPhone ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                background: contactPhone ? 'rgba(34,197,94,0.06)' : '#f8fafc',
                color: contactPhone ? '#16a34a' : '#cbd5e1',
                fontSize: '0.8125rem', fontWeight: 600,
                cursor: contactPhone ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s',
              }}
            >
              <MessageCircle size={14} /> WhatsApp
            </button>
            <button
              onClick={handleCopyLead}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                height: 36, padding: '0 0.75rem', borderRadius: '0.5rem',
                border: `1px solid ${leadCopied ? '#d1fae5' : '#e2e8f0'}`,
                background: leadCopied ? 'rgba(5,150,105,0.06)' : '#fff',
                color: leadCopied ? '#059669' : '#475569',
                fontSize: '0.8125rem', fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {leadCopied ? <Check size={14} /> : <Copy size={14} />}
              {leadCopied ? 'Copied!' : 'Copy Lead'}
            </button>
          </div>
        </div>

        {/* ── Notes ── */}
        {lead.notes && (
          <div style={{
            background: '#fffbeb', borderRadius: '0.625rem',
            border: '1px solid #fef3c7', padding: '0.875rem',
          }}>
            <h4 style={{
              fontSize: '0.5625rem', fontWeight: 700, color: '#92400e',
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.375rem',
            }}>
              Notes
            </h4>
            <p style={{ fontSize: '0.8125rem', color: '#78350f', lineHeight: 1.6 }}>{lead.notes}</p>
          </div>
        )}

        {/* ── Metadata ── */}
        <div style={{ borderTop: '1px solid #edf0f4', paddingTop: '0.625rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: '#94a3b8' }}>
            <span>Created {new Date(lead.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            <span>Updated {new Date(lead.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          </div>
        </div>

      </div>
    </div>
  );
});

// ============================================================================
// MAIN PAGE
// ============================================================================

export function LeadsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery]   = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [modal, setModal]               = useState<{ mode: 'create' | 'edit'; lead?: Lead } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);

  const { data: leadsResponse, isLoading } = useQuery({
    queryKey: ['leads', { search: searchQuery }],
    queryFn: () => leadService.findAll({ search: searchQuery || undefined, pageSize: 100 }),
    staleTime: 30_000,
  });

  const leads: Lead[] = leadsResponse?.data ?? [];
  const totalCount    = leadsResponse?.total ?? 0;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => leadService.softDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setDeleteTarget(null);
      setSelectedLead(null);
    },
  });

  const handleModalSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['leads'] });
    setModal(null);
  }, [queryClient]);

  const handleDeleteConfirm = useCallback(() => {
    if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
  }, [deleteTarget, deleteMutation]);

  const handleClosePanel = useCallback(() => setSelectedLead(null), []);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="type-title">Leads</h1>
          <p className="type-body">
            {isLoading ? 'Loading…' : `${totalCount} total · ${leads.filter(l => l.status === 'NEW').length} new`}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <div style={{ position: 'relative', width: 240 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input className="input" placeholder="Search leads…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ paddingLeft: 30, height: 28, fontSize: 13, backgroundColor: 'transparent', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)' }} />
          </div>
          <button className="btn-ghost" style={{ height: 28, padding: '0 8px', fontSize: 13, color: 'var(--text-secondary)' }}><ListFilter size={14} style={{ marginRight: 4 }} /> Filters</button>
          <button className="btn-ghost" style={{ height: 28, padding: '0 8px', fontSize: 13, color: 'var(--text-secondary)' }}><ArrowDownToLine size={14} style={{ marginRight: 4 }} /> Import</button>
          <button className="btn-ghost" style={{ height: 28, padding: '0 8px', fontSize: 13, color: 'var(--text-secondary)' }}><ArrowUpFromLine size={14} style={{ marginRight: 4 }} /> Export</button>
          <div style={{ width: 1, height: 16, backgroundColor: 'var(--border-medium)', margin: '0 4px' }} />
          <button className="btn btn-primary" style={{ height: 28, padding: '0 12px', fontSize: 13, borderRadius: 'var(--radius-sm)' }} onClick={() => setModal({ mode: 'create' })}>
            <Plus size={14} style={{ marginRight: 4 }} /> New Lead
          </button>
        </div>
      </div>

      {/* DATA GRID */}
      <div style={{ flex: 1, overflow: 'auto', marginRight: 'calc(var(--space-4) * -1)', paddingRight: 'var(--space-4)' }}>
        {isLoading ? (
          <div className="type-ui" style={{ color: 'var(--text-tertiary)', padding: 'var(--space-4)' }}>Loading leads…</div>
        ) : leads.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
            <p style={{ marginBottom: '0.5rem', fontWeight: 500 }}>No leads found</p>
            <p style={{ fontSize: 13 }}>{searchQuery ? `No results for "${searchQuery}"` : 'Create your first lead to get started'}</p>
          </div>
        ) : (
          <div style={{ minWidth: 1300 }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px,1fr) 130px 190px 90px 100px 110px 120px', gap: 10, padding: '7px 12px', borderBottom: '1px solid var(--border-strong)', position: 'sticky', top: 0, backgroundColor: 'var(--bg-app)', zIndex: 10, fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              <div>Lead</div><div>Company</div><div>Contact</div><div>Stage</div><div>Priority</div><div>Close Date</div><div>Actions</div>
            </div>

            {/* Rows */}
            <div>
              {leads.map(lead => {
                const ss = STAGE_COLORS[lead.stage ?? 'NEW'] ?? STAGE_COLORS.NEW;
                const ps = PRIORITY_COLORS[lead.priority ?? 'MEDIUM'] ?? PRIORITY_COLORS.MEDIUM;
                return (
                  <div key={lead.id} className="dense-row" onClick={() => setSelectedLead(lead)} style={{ display: 'grid', gridTemplateColumns: 'minmax(180px,1fr) 130px 190px 90px 100px 110px 120px', gap: 10, padding: '7px 12px', borderBottom: '1px solid var(--border-light)', fontSize: 13, alignItems: 'center', cursor: 'pointer' }}>

                    {/* Name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                      <div style={{ width: 22, height: 22, borderRadius: '4px', background: 'linear-gradient(135deg,#0f172a 0%,#334155 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
                        {lead.firstName[0]}{lead.lastName[0]}
                      </div>
                      <span style={{ fontWeight: 500, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{lead.firstName} {lead.lastName}</span>
                    </div>

                    {/* Company */}
                    <div style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', fontSize: 12 }}>
                      {lead.company || <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                    </div>

                    {/* Contact */}
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ color: 'var(--text-secondary)', fontSize: 12, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{lead.email || '—'}</div>
                      {lead.phone && <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{lead.phone}</div>}
                    </div>

                    {/* Stage */}
                    <div>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 6px', background: ss.bg, color: ss.text, borderRadius: 3, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>
                        {STAGE_LABELS[lead.stage ?? 'NEW']}
                      </span>
                    </div>

                    {/* Priority */}
                    <div>
                      <span style={{ display: 'inline-block', padding: '2px 6px', background: ps.bg, color: ps.color, borderRadius: 3, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                        {lead.priority ?? 'MEDIUM'}
                      </span>
                    </div>

                    {/* Close Date */}
                    <div style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>
                      {lead.expectedCloseDate
                        ? new Date(lead.expectedCloseDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                        : <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                      }
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 3 }} onClick={e => e.stopPropagation()}>
                      <button className="btn-ghost" style={{ width: 26, height: 26, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Edit" onClick={() => setModal({ mode: 'edit', lead })}>
                        <Edit2 size={12} />
                      </button>
                      <button className="btn-ghost" style={{ width: 26, height: 26, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-error, #dc2626)' }} title="Delete" onClick={() => setDeleteTarget(lead)}>
                        <Trash2 size={12} />
                      </button>
                      <button className="btn-ghost" style={{ width: 26, height: 26, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Call" onClick={() => lead.phone && window.open(`tel:${lead.phone}`)}>
                        <Phone size={12} />
                      </button>
                      <button className="btn-ghost" style={{ width: 26, height: 26, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Email" onClick={() => lead.email && window.open(`mailto:${lead.email}`)}>
                        <Mail size={12} />
                      </button>
                      {lead.phone && (
                        <button className="btn-ghost" style={{ width: 26, height: 26, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }} title="WhatsApp" onClick={() => window.open(whatsappUrl(lead.phone!), '_blank')}>
                          <MessageCircle size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              <style>{`.dense-row:hover { background-color: var(--bg-hover, rgba(0,0,0,0.02)) !important; }`}</style>
            </div>
          </div>
        )}
      </div>

      {/* CONTEXT PANEL */}
      <ContextPanel isOpen={!!selectedLead} onClose={handleClosePanel} width={480} hideCloseButton>
        {selectedLead && (
          <LeadDetailPanel
            lead={selectedLead}
            onEdit={() => { setModal({ mode: 'edit', lead: selectedLead }); setSelectedLead(null); }}
            onDelete={() => { setDeleteTarget(selectedLead); setSelectedLead(null); }}
            onClose={handleClosePanel}
          />
        )}
      </ContextPanel>

      {/* LEAD MODAL */}
      {modal && (
        <LeadModal
          mode={modal.mode}
          lead={modal.lead}
          onClose={() => setModal(null)}
          onSuccess={handleModalSuccess}
        />
      )}

      {/* DELETE CONFIRM */}
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
