import { useState, useCallback, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Phone, Mail, X, Edit2, Trash2,
  Building2, Calendar, MapPin,
  MessageCircle, Copy, Check,
} from 'lucide-react';
import type { Lead, LeadStage, LeadPriority } from '../../types';
import { leadContactsService, LeadContact } from '../../services/lead-contacts.service';

const STAGE_LABELS: Record<LeadStage, string> = {
  NEW: 'New', CONTACTED: 'Contacted', QUALIFIED: 'Qualified',
  DISQUALIFIED: 'Disqualified', CONVERTED: 'Converted',
};

const STAGE_COLORS: Record<LeadStage, { bg: string; text: string; dot: string }> = {
  NEW:          { bg: 'rgba(99,102,241,0.1)',  text: '#6366f1', dot: '#6366f1' },
  CONTACTED:    { bg: 'rgba(245,158,11,0.1)',  text: '#d97706', dot: '#d97706' },
  QUALIFIED:    { bg: 'rgba(16,185,129,0.1)',  text: '#059669', dot: '#059669' },
  DISQUALIFIED: { bg: 'rgba(239,68,68,0.1)',   text: '#dc2626', dot: '#dc2626' },
  CONVERTED:    { bg: 'rgba(139,92,246,0.1)',  text: '#7c3aed', dot: '#7c3aed' },
};

const PRIORITY_COLORS: Record<LeadPriority, { color: string; bg: string }> = {
  CRITICAL: { color: '#dc2626', bg: 'rgba(220,38,38,0.08)'  },
  HIGH:     { color: '#ea580c', bg: 'rgba(234,88,12,0.08)'  },
  MEDIUM:   { color: '#2563eb', bg: 'rgba(37,99,235,0.08)'  },
  LOW:      { color: '#6b7280', bg: 'rgba(107,114,128,0.08)'},
};

function whatsappUrl(phone: string) {
  return `https://wa.me/${phone.replace(/\D/g, '')}`;
}

// ── tiny copy button ──────────────────────────────────────────────────────────
function CopyBtn({ text, tooltip }: { text: string; tooltip: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => navigator.clipboard.writeText(text).then(() => {
        setCopied(true); setTimeout(() => setCopied(false), 2000);
      })}
      title={tooltip}
      aria-label={tooltip}
      style={{
        width: 26, height: 26, borderRadius: 6, flexShrink: 0,
        border: `1px solid ${copied ? '#d1fae5' : '#e2e8f0'}`,
        background: copied ? 'rgba(5,150,105,0.06)' : 'transparent',
        color: copied ? '#059669' : '#94a3b8',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
      }}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
    </button>
  );
}

// ── section label ─────────────────────────────────────────────────────────────
function Section({ label, action, children }: {
  label: string; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {label}
        </span>
        {action}
      </div>
      {children}
    </div>
  );
}

// ── contact row ───────────────────────────────────────────────────────────────
function ContactRow({ icon: Icon, children, href }: {
  icon: React.ComponentType<{ size: number; style?: React.CSSProperties }>;
  children: React.ReactNode;
  href?: string;
}) {
  const Tag = href ? 'a' : 'div';
  return (
    <Tag
      href={href}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '7px 0',
        fontSize: 13, color: href ? '#334155' : '#64748b',
        textDecoration: 'none',
        borderBottom: '1px solid #f1f5f9',
      }}
    >
      <Icon size={13} style={{ color: '#94a3b8', flexShrink: 0 }} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{children}</span>
    </Tag>
  );
}

// ── main ──────────────────────────────────────────────────────────────────────
interface Props { lead: Lead; onEdit: () => void; onDelete: () => void; onClose: () => void; }

export const LeadDetailPanel = memo(function LeadDetailPanel({ lead, onEdit, onDelete, onClose }: Props) {
  const { data: contacts = [] } = useQuery<LeadContact[]>({
    queryKey: ['lead-contacts', lead.id],
    queryFn: () => leadContactsService.list(lead.id),
    staleTime: 30_000,
  });

  const [leadCopied, setLeadCopied] = useState(false);

  const stage    = STAGE_COLORS[lead.stage ?? 'NEW'] ?? STAGE_COLORS.NEW;
  const priority = PRIORITY_COLORS[lead.priority ?? 'MEDIUM'] ?? PRIORITY_COLORS.MEDIUM;

  const mainContact  = contacts.find(c => c.isMain) ?? contacts[0] ?? null;
  const contactPhone = mainContact?.phone ?? lead.phone;
  const contactEmail = mainContact?.email ?? lead.email;
  const locationStr  = [lead.area, lead.city, lead.state, lead.country].filter(Boolean).join(', ');

  const copyContactText = [
    mainContact ? `${mainContact.firstName} ${mainContact.lastName}` : `${lead.firstName} ${lead.lastName}`,
    lead.company   && `Company: ${lead.company}`,
    contactPhone   && `Phone: ${contactPhone}`,
    contactEmail   && `Email: ${contactEmail}`,
    locationStr    && `Location: ${locationStr}`,
  ].filter(Boolean).join('\n');

  const copyLeadText = [
    '─────────────────────────────',
    `${lead.firstName} ${lead.lastName}`,
    lead.company   && `Company: ${lead.company}`,
    contactPhone   && `Phone: ${contactPhone}`,
    contactEmail   && `Email: ${contactEmail}`,
    locationStr    && `Location: ${locationStr}`,
    `Stage: ${STAGE_LABELS[lead.stage ?? 'NEW']}`,
    `Priority: ${lead.priority ?? 'MEDIUM'}`,
    `Source: ${(lead.source ?? 'OTHER').replace(/_/g, ' ')}`,
    lead.expectedCloseDate && `Close: ${new Date(lead.expectedCloseDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`,
    lead.notes && `\nNotes: ${lead.notes}`,
    contacts.length > 0 && `\nContacts:\n${contacts.map(c => `  • ${c.firstName} ${c.lastName}${c.role ? ` (${c.role})` : ''}${c.phone ? ` — ${c.phone}` : ''}`).join('\n')}`,
    `\nCreated: ${new Date(lead.createdAt).toLocaleDateString('en-IN')}`,
    '─────────────────────────────',
  ].filter(Boolean).join('\n');

  const px = '1.25rem';
  const divider = <div style={{ height: 1, background: '#f1f5f9', margin: `1.25rem -${px}` }} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-app)' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        padding: `1rem ${px} 0.875rem`,
        borderBottom: '1px solid #f1f5f9',
        position: 'sticky', top: 0,
        background: 'var(--bg-app)', zIndex: 5,
      }}>
        {/* Row 1: avatar · name · actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg,#0f172a 0%,#334155 100%)',
            color: '#fff', fontSize: 13, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            letterSpacing: '0.01em',
          }}>
            {lead.firstName[0]}{lead.lastName[0]}
          </div>

          <h2 style={{
            flex: 1, minWidth: 0,
            fontSize: 16, fontWeight: 700, color: '#0f172a',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {lead.firstName} {lead.lastName}
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <button
              onClick={onEdit}
              aria-label="Edit lead"
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                height: 30, padding: '0 10px', borderRadius: 6,
                border: '1px solid #e2e8f0', background: '#fff',
                color: '#475569', fontSize: 12, fontWeight: 500, cursor: 'pointer',
              }}
            >
              <Edit2 size={11} /> Edit
            </button>
            <button
              onClick={onDelete}
              aria-label="Delete lead"
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                height: 30, padding: '0 10px', borderRadius: 6,
                border: '1px solid #fecaca', background: 'rgba(239,68,68,0.04)',
                color: '#dc2626', fontSize: 12, fontWeight: 500, cursor: 'pointer',
              }}
            >
              <Trash2 size={11} /> Delete
            </button>
            <div style={{ width: 1, height: 16, background: '#e2e8f0' }} />
            <button
              onClick={onClose}
              aria-label="Close panel"
              style={{
                width: 30, height: 30, borderRadius: 6,
                border: '1px solid #e2e8f0', background: '#fff',
                color: '#64748b', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Row 2: badges */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <span style={{
            padding: '3px 8px', borderRadius: 5,
            background: stage.bg, color: stage.text,
            fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: stage.dot }} />
            {STAGE_LABELS[lead.stage ?? 'NEW']}
          </span>
          <span style={{
            padding: '3px 8px', borderRadius: 5,
            background: priority.bg, color: priority.color,
            fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
          }}>
            {lead.priority ?? 'MEDIUM'}
          </span>
          {lead.expectedCloseDate && (
            <span style={{
              padding: '3px 8px', borderRadius: 5,
              background: 'rgba(5,150,105,0.08)', color: '#059669',
              fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <Calendar size={9} />
              {new Date(lead.expectedCloseDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          )}
          <span style={{
            padding: '3px 8px', borderRadius: 5,
            background: '#f1f5f9', color: '#64748b',
            fontSize: 10, fontWeight: 500,
          }}>
            {(lead.source ?? 'OTHER').replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: `1.25rem ${px}` }}>

        {/* Contact Information */}
        <Section label="Contact Information" action={<CopyBtn text={copyContactText} tooltip="Copy contact info" />}>
          {lead.company && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '7px 0', borderBottom: '1px solid #f1f5f9',
              fontSize: 13, fontWeight: 600, color: '#0f172a',
            }}>
              <Building2 size={13} style={{ color: '#94a3b8', flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.company}</span>
            </div>
          )}

          {mainContact && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 0', borderBottom: '1px solid #f1f5f9',
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                background: '#1e293b', color: '#fff',
                fontSize: 9, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {mainContact.firstName[0]}{mainContact.lastName[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {mainContact.firstName} {mainContact.lastName}
                </div>
                {mainContact.role && (
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{mainContact.role}</div>
                )}
              </div>
            </div>
          )}

          {contactEmail
            ? <ContactRow icon={Mail} href={`mailto:${contactEmail}`}>{contactEmail}</ContactRow>
            : <ContactRow icon={Mail}><span style={{ color: '#cbd5e1' }}>No email</span></ContactRow>
          }

          {contactPhone
            ? <ContactRow icon={Phone} href={`tel:${contactPhone}`}>{contactPhone}</ContactRow>
            : <ContactRow icon={Phone}><span style={{ color: '#cbd5e1' }}>No phone</span></ContactRow>
          }

          {locationStr && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '7px 0', fontSize: 13, color: '#64748b',
            }}>
              <MapPin size={13} style={{ color: '#94a3b8', flexShrink: 0, marginTop: 1 }} />
              <span style={{ lineHeight: 1.45 }}>{locationStr}</span>
            </div>
          )}
        </Section>

        {/* Additional contacts */}
        {contacts.length > 1 && (
          <>
            {divider}
            <Section label={`All Contacts (${contacts.length})`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {contacts.map(c => (
                  <div key={c.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 8,
                    border: '1px solid #f1f5f9', background: '#fafafa',
                  }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                      background: c.isMain ? '#1e293b' : '#e2e8f0',
                      color: c.isMain ? '#fff' : '#64748b',
                      fontSize: 9, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {c.firstName[0]}{c.lastName[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.firstName} {c.lastName}
                        </span>
                        {c.isMain && (
                          <span style={{ fontSize: 9, color: '#fff', background: '#334155', padding: '1px 5px', borderRadius: 3, flexShrink: 0 }}>
                            MAIN
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', display: 'flex', gap: 6, marginTop: 1, flexWrap: 'wrap' }}>
                        {c.role && <span>{c.role}</span>}
                        {c.email && <span>{c.email}</span>}
                        {c.phone && <span>{c.phone}</span>}
                      </div>
                    </div>
                    {c.phone && (
                      <button
                        onClick={() => window.open(whatsappUrl(c.phone!), '_blank')}
                        aria-label={`WhatsApp ${c.firstName}`}
                        style={{
                          width: 28, height: 28, border: '1px solid #dcfce7',
                          background: 'rgba(34,197,94,0.06)', color: '#16a34a',
                          borderRadius: 6, cursor: 'pointer', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <MessageCircle size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          </>
        )}

        {divider}

        {/* Quick Actions */}
        <Section label="Quick Actions">
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => contactPhone && window.open(whatsappUrl(contactPhone), '_blank')}
              disabled={!contactPhone}
              aria-label="Send WhatsApp"
              style={{
                flex: 1, height: 38, borderRadius: 8,
                border: contactPhone ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                background: contactPhone ? 'rgba(34,197,94,0.06)' : '#f8fafc',
                color: contactPhone ? '#16a34a' : '#cbd5e1',
                fontSize: 13, fontWeight: 600,
                cursor: contactPhone ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'all 0.15s',
              }}
            >
              <MessageCircle size={14} /> WhatsApp
            </button>
            <button
              onClick={() => navigator.clipboard.writeText(copyLeadText).then(() => {
                setLeadCopied(true); setTimeout(() => setLeadCopied(false), 2000);
              })}
              aria-label={leadCopied ? 'Copied!' : 'Copy lead details'}
              style={{
                flex: 1, height: 38, borderRadius: 8,
                border: `1px solid ${leadCopied ? '#d1fae5' : '#e2e8f0'}`,
                background: leadCopied ? 'rgba(5,150,105,0.06)' : '#fff',
                color: leadCopied ? '#059669' : '#475569',
                fontSize: 13, fontWeight: 600,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'all 0.15s',
              }}
            >
              {leadCopied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy Lead</>}
            </button>
          </div>
        </Section>

        {/* Notes */}
        {lead.notes && (
          <>
            {divider}
            <Section label="Notes">
              <p style={{
                fontSize: 13, color: '#78350f', lineHeight: 1.65,
                background: '#fffbeb', border: '1px solid #fef3c7',
                borderRadius: 8, padding: '10px 12px', margin: 0,
              }}>
                {lead.notes}
              </p>
            </Section>
          </>
        )}

        {/* Metadata */}
        <div style={{
          marginTop: '1.5rem', paddingTop: '0.875rem',
          borderTop: '1px solid #f1f5f9',
          display: 'flex', justifyContent: 'space-between',
          fontSize: 11, color: '#94a3b8',
        }}>
          <span>Created {new Date(lead.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          <span>Updated {new Date(lead.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
        </div>

      </div>
    </div>
  );
});
