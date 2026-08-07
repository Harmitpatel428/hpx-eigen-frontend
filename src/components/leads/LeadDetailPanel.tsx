import { useState, memo, Fragment } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Phone, Mail, X, Edit2, Trash2,
  Building2, Calendar, MapPin,
  MessageCircle, Copy, Check, Clock,
} from 'lucide-react';
import type { Lead, LeadStage, LeadPriority } from '../../types';
import { leadContactsService, LeadContact } from '../../services/lead-contacts.service';

// ── constants ─────────────────────────────────────────────────────────────────

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
  CRITICAL: { color: '#dc2626', bg: 'rgba(220,38,38,0.08)' },
  HIGH:     { color: '#ea580c', bg: 'rgba(234,88,12,0.08)' },
  MEDIUM:   { color: '#2563eb', bg: 'rgba(37,99,235,0.08)' },
  LOW:      { color: '#6b7280', bg: 'rgba(107,114,128,0.08)' },
};

const PIPELINE: LeadStage[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED'];

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #1e3a5f, #2563eb)',
  'linear-gradient(135deg, #4b134f, #7c3aed)',
  'linear-gradient(135deg, #064e3b, #059669)',
  'linear-gradient(135deg, #7c2d12, #ea580c)',
  'linear-gradient(135deg, #1e1b4b, #6366f1)',
  'linear-gradient(135deg, #134e4a, #14b8a6)',
  'linear-gradient(135deg, #3b0764, #a855f7)',
  'linear-gradient(135deg, #0f172a, #475569)',
];

// ── helpers ───────────────────────────────────────────────────────────────────

function whatsappUrl(phone: string) {
  return `https://wa.me/${phone.replace(/\D/g, '')}`;
}

function avatarGradient(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_GRADIENTS[Math.abs(h) % AVATAR_GRADIENTS.length];
}

function timeAgo(date: string | Date): string {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const hr = Math.floor(m / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── scoped styles ─────────────────────────────────────────────────────────────

const CSS = `
@keyframes ldp-fadeUp {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes ldp-pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.55; }
}
.ldp-section {
  animation: ldp-fadeUp 0.35s cubic-bezier(0.25,0.1,0.25,1) both;
}
.ldp-stage-dot-active {
  animation: ldp-pulse 2.4s ease-in-out infinite;
}
.ldp-row {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px; margin: 0 -10px;
  border-radius: 8px;
  transition: background 0.15s, color 0.15s;
  text-decoration: none; cursor: default;
}
.ldp-row:hover { background: var(--bg-subtle); }
.ldp-row[href] { cursor: pointer; }
.ldp-row[href]:hover .ldp-icon { color: var(--text-secondary) !important; }
.ldp-row[href]:hover .ldp-val  { color: var(--text-primary) !important; }

.ldp-act {
  transition: all 0.2s cubic-bezier(0.175,0.885,0.32,1.275);
}
.ldp-act:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(0,0,0,0.07);
}
.ldp-act:active:not(:disabled) {
  transform: translateY(0) scale(0.97);
  box-shadow: none;
}

.ldp-card {
  transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
}
.ldp-card:hover {
  border-color: var(--border-medium) !important;
  background: var(--bg-subtle) !important;
  box-shadow: 0 2px 8px rgba(0,0,0,0.03);
}

.ldp-hdr-btn {
  transition: background 0.15s, border-color 0.15s;
}
.ldp-hdr-btn:hover {
  background: var(--bg-muted) !important;
}
.ldp-hdr-danger:hover {
  background: rgba(220,38,38,0.08) !important;
  border-color: rgba(220,38,38,0.2) !important;
}
.ldp-wa:hover:not(:disabled) {
  background: rgba(34,197,94,0.12) !important;
  border-color: #86efac !important;
}
.ldp-copy-sm:hover {
  border-color: var(--border-strong) !important;
  color: var(--text-secondary) !important;
}
`;

// ── stage pipeline stepper ────────────────────────────────────────────────────

function StagePipeline({ current }: { current: LeadStage }) {
  const idx = PIPELINE.indexOf(current);
  const disq = current === 'DISQUALIFIED';

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start',
      padding: '14px 4px 6px', position: 'relative',
      opacity: disq ? 0.3 : 1, transition: 'opacity 0.3s',
    }}>
      {disq && (
        <div style={{
          position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
          background: STAGE_COLORS.DISQUALIFIED.bg, color: STAGE_COLORS.DISQUALIFIED.text,
          fontSize: 9, fontWeight: 700, padding: '2px 10px', borderRadius: 4,
          letterSpacing: '0.06em', zIndex: 2, opacity: 3,
        }}>
          DISQUALIFIED
        </div>
      )}

      {PIPELINE.map((stage, i) => {
        const done = !disq && idx >= 0 && i < idx;
        const active = !disq && i === idx;
        const sc = STAGE_COLORS[stage];
        const prevSc = i > 0 ? STAGE_COLORS[PIPELINE[i - 1]] : sc;

        return (
          <Fragment key={stage}>
            {i > 0 && (
              <div style={{
                flex: 1, height: 2, marginTop: 5, borderRadius: 1,
                background: done || active
                  ? `linear-gradient(90deg, ${prevSc.dot}, ${sc.dot})`
                  : 'var(--border-medium)',
                opacity: done || active ? 0.45 : 1,
                transition: 'all 0.4s',
              }} />
            )}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 5, minWidth: 0,
            }}>
              <div
                className={active ? 'ldp-stage-dot-active' : undefined}
                style={{
                  width: active ? 12 : 8, height: active ? 12 : 8,
                  borderRadius: '50%',
                  background: done || active ? sc.dot : 'transparent',
                  border: done || active ? `2px solid ${sc.dot}` : '2px solid var(--border-medium)',
                  boxShadow: active ? `0 0 0 4px ${sc.bg}` : 'none',
                  transition: 'all 0.35s cubic-bezier(0.25,0.1,0.25,1)',
                }}
              />
              <span style={{
                fontSize: 8, fontWeight: active ? 700 : 500,
                color: active ? sc.text : done ? 'var(--text-secondary)' : 'var(--text-tertiary)',
                letterSpacing: '0.06em', textTransform: 'uppercase',
                transition: 'color 0.3s', whiteSpace: 'nowrap',
              }}>
                {STAGE_LABELS[stage]}
              </span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

// ── small helpers ─────────────────────────────────────────────────────────────

function CopyBtn({ text, tooltip }: { text: string; tooltip: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="ldp-copy-sm"
      onClick={() => navigator.clipboard.writeText(text).then(() => {
        setCopied(true); setTimeout(() => setCopied(false), 2000);
      })}
      title={tooltip}
      aria-label={tooltip}
      style={{
        width: 28, height: 28, borderRadius: 7, flexShrink: 0,
        border: `1px solid ${copied ? 'rgba(5,150,105,0.3)' : 'var(--border-medium)'}`,
        background: copied ? 'rgba(5,150,105,0.06)' : 'transparent',
        color: copied ? '#059669' : 'var(--text-tertiary)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.2s',
      }}
    >
      {copied ? <Check size={12} strokeWidth={2.5} /> : <Copy size={12} />}
    </button>
  );
}

function Section({ label, action, delay = 0, children }: {
  label: string; action?: React.ReactNode; delay?: number; children: React.ReactNode;
}) {
  return (
    <div className="ldp-section" style={{ animationDelay: `${delay}ms` }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 10,
      }}>
        <span style={{
          fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)',
          textTransform: 'uppercase', letterSpacing: '0.1em',
        }}>
          {label}
        </span>
        {action}
      </div>
      {children}
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

interface Props {
  lead: Lead;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export const LeadDetailPanel = memo(function LeadDetailPanel({
  lead, onEdit, onDelete, onClose,
}: Props) {
  const { data: contacts = [] } = useQuery<LeadContact[]>({
    queryKey: ['lead-contacts', lead.id],
    queryFn: () => leadContactsService.list(lead.id),
    staleTime: 30_000,
  });

  const [leadCopied, setLeadCopied] = useState(false);

  const priority   = PRIORITY_COLORS[lead.priority ?? 'MEDIUM'] ?? PRIORITY_COLORS.MEDIUM;
  const mainContact  = contacts.find(c => c.isMain) ?? contacts[0] ?? null;
  const contactPhone = mainContact?.phone ?? lead.phone;
  const contactEmail = mainContact?.email ?? lead.email;
  const locationStr  = [lead.area, lead.city, lead.state, lead.country].filter(Boolean).join(', ');
  const fullName     = `${lead.firstName} ${lead.lastName}`;

  // ── copy payloads (unchanged logic) ──────────────────────────────────────

  const copyContactText = [
    mainContact ? `${mainContact.firstName} ${mainContact.lastName}` : fullName,
    lead.company   && `Company: ${lead.company}`,
    contactPhone   && `Phone: ${contactPhone}`,
    contactEmail   && `Email: ${contactEmail}`,
    locationStr    && `Location: ${locationStr}`,
  ].filter(Boolean).join('\n');

  const copyLeadText = [
    '─────────────────────────────',
    fullName,
    lead.company   && `Company: ${lead.company}`,
    contactPhone   && `Phone: ${contactPhone}`,
    contactEmail   && `Email: ${contactEmail}`,
    locationStr    && `Location: ${locationStr}`,
    `Stage: ${STAGE_LABELS[lead.stage ?? 'NEW']}`,
    `Priority: ${lead.priority ?? 'MEDIUM'}`,
    `Source: ${(lead.source ?? 'OTHER').replace(/_/g, ' ')}`,
    lead.expectedCloseDate && `Close: ${fmtDate(lead.expectedCloseDate)}`,
    lead.notes && `\nNotes: ${lead.notes}`,
    contacts.length > 0 && `\nContacts:\n${contacts.map(c =>
      `  • ${c.firstName} ${c.lastName}${c.role ? ` (${c.role})` : ''}${c.phone ? ` — ${c.phone}` : ''}`
    ).join('\n')}`,
    `\nCreated: ${new Date(lead.createdAt).toLocaleDateString('en-IN')}`,
    '─────────────────────────────',
  ].filter(Boolean).join('\n');

  const px = '1.375rem';
  const divider = (
    <div style={{ height: 1, background: 'var(--border-light)', margin: '1.375rem 0' }} />
  );

  return (
    <>
      <style>{CSS}</style>
      <div style={{
        display: 'flex', flexDirection: 'column',
        height: '100%', background: 'var(--bg-app)',
      }}>

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div style={{
          padding: `1.125rem ${px} 0.75rem`,
          borderBottom: '1px solid var(--border-light)',
          position: 'sticky', top: 0,
          background: 'var(--bg-app)', zIndex: 5,
        }}>
          {/* Row 1 — avatar · name · actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <div style={{
              width: 46, height: 46, borderRadius: 13, flexShrink: 0,
              background: avatarGradient(fullName),
              color: '#fff', fontSize: 15, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              letterSpacing: '0.02em',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            }}>
              {lead.firstName[0]}{lead.lastName[0]}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{
                fontSize: 18, fontWeight: 700, color: 'var(--text-primary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                lineHeight: 1.2, letterSpacing: '-0.015em',
              }}>
                {fullName}
              </h2>
              {lead.company && (
                <div style={{
                  fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 450,
                  marginTop: 2,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <Building2 size={11} style={{ flexShrink: 0 }} />
                  {lead.company}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
              <button
                className="ldp-hdr-btn"
                onClick={onEdit}
                aria-label="Edit lead"
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  height: 32, padding: '0 12px', borderRadius: 8,
                  border: '1px solid var(--border-medium)', background: 'var(--bg-app)',
                  color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                }}
              >
                <Edit2 size={12} /> Edit
              </button>
              <button
                className="ldp-hdr-btn ldp-hdr-danger"
                onClick={onDelete}
                aria-label="Delete lead"
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  height: 32, padding: '0 12px', borderRadius: 8,
                  border: '1px solid rgba(220,38,38,0.12)', background: 'rgba(220,38,38,0.03)',
                  color: '#dc2626', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                }}
              >
                <Trash2 size={12} /> Delete
              </button>
              <div style={{ width: 1, height: 18, background: 'var(--border-light)', margin: '0 2px' }} />
              <button
                className="ldp-hdr-btn"
                onClick={onClose}
                aria-label="Close panel"
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  border: '1px solid var(--border-medium)', background: 'var(--bg-app)',
                  color: 'var(--text-tertiary)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Row 2 — pipeline stepper */}
          <StagePipeline current={lead.stage ?? 'NEW'} />

          {/* Row 3 — badges */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', paddingTop: 2 }}>
            <span style={{
              padding: '3px 9px', borderRadius: 5,
              background: priority.bg, color: priority.color,
              fontSize: 10, fontWeight: 700,
              letterSpacing: '0.05em', textTransform: 'uppercase',
            }}>
              {lead.priority ?? 'MEDIUM'}
            </span>
            {lead.expectedCloseDate && (
              <span style={{
                padding: '3px 9px', borderRadius: 5,
                background: 'rgba(5,150,105,0.08)', color: '#059669',
                fontSize: 10, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <Calendar size={9} />
                {fmtDate(lead.expectedCloseDate)}
              </span>
            )}
            <span style={{
              padding: '3px 9px', borderRadius: 5,
              background: 'var(--bg-muted)', color: 'var(--text-secondary)',
              fontSize: 10, fontWeight: 500,
            }}>
              {(lead.source ?? 'OTHER').replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* ── Body ─────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: `1.375rem ${px}` }}>

          {/* ── Contact Information ──────────────────────────────────── */}
          <Section
            label="Contact Information"
            action={<CopyBtn text={copyContactText} tooltip="Copy contact info" />}
            delay={60}
          >
            {mainContact && (
              <div className="ldp-row" style={{ marginBottom: 2 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: avatarGradient(`${mainContact.firstName} ${mainContact.lastName}`),
                  color: '#fff', fontSize: 10, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {mainContact.firstName[0]}{mainContact.lastName[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    {mainContact.firstName} {mainContact.lastName}
                    {mainContact.isMain && (
                      <span style={{
                        fontSize: 8, color: '#fff', background: 'var(--text-secondary)',
                        padding: '1px 6px', borderRadius: 3, fontWeight: 700,
                        letterSpacing: '0.05em',
                      }}>
                        PRIMARY
                      </span>
                    )}
                  </div>
                  {mainContact.role && (
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>
                      {mainContact.role}
                    </div>
                  )}
                </div>
              </div>
            )}

            {contactEmail ? (
              <a className="ldp-row" href={`mailto:${contactEmail}`}
                style={{ color: 'var(--text-secondary)' }}
              >
                <Mail className="ldp-icon" size={14}
                  style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}
                />
                <span className="ldp-val" style={{
                  flex: 1, fontSize: 13,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  transition: 'color 0.15s',
                }}>
                  {contactEmail}
                </span>
              </a>
            ) : (
              <div className="ldp-row">
                <Mail size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0, opacity: 0.35 }} />
                <span style={{ fontSize: 13, color: 'var(--text-tertiary)', opacity: 0.5, fontStyle: 'italic' }}>
                  No email
                </span>
              </div>
            )}

            {contactPhone ? (
              <a className="ldp-row" href={`tel:${contactPhone}`}
                style={{ color: 'var(--text-secondary)' }}
              >
                <Phone className="ldp-icon" size={14}
                  style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}
                />
                <span className="ldp-val" style={{ flex: 1, fontSize: 13, transition: 'color 0.15s' }}>
                  {contactPhone}
                </span>
              </a>
            ) : (
              <div className="ldp-row">
                <Phone size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0, opacity: 0.35 }} />
                <span style={{ fontSize: 13, color: 'var(--text-tertiary)', opacity: 0.5, fontStyle: 'italic' }}>
                  No phone
                </span>
              </div>
            )}

            {locationStr && (
              <div className="ldp-row" style={{ alignItems: 'flex-start' }}>
                <MapPin size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {locationStr}
                </span>
              </div>
            )}
          </Section>

          {/* ── All Contacts ─────────────────────────────────────────── */}
          {contacts.length > 1 && (
            <>
              {divider}
              <Section label={`All Contacts (${contacts.length})`} delay={120}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {contacts.map(c => (
                    <div key={c.id} className="ldp-card" style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 10,
                      border: '1px solid var(--border-light)',
                      background: 'var(--bg-subtle)',
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                        background: avatarGradient(`${c.firstName} ${c.lastName}`),
                        color: '#fff', fontSize: 9, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {c.firstName[0]}{c.lastName[0]}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
                          display: 'flex', alignItems: 'center', gap: 5,
                        }}>
                          <span style={{
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {c.firstName} {c.lastName}
                          </span>
                          {c.isMain && (
                            <span style={{
                              fontSize: 8, color: '#fff', background: 'var(--text-secondary)',
                              padding: '1px 6px', borderRadius: 3, flexShrink: 0,
                              fontWeight: 700, letterSpacing: '0.05em',
                            }}>
                              PRIMARY
                            </span>
                          )}
                        </div>
                        <div style={{
                          fontSize: 11, color: 'var(--text-tertiary)',
                          display: 'flex', gap: 8, marginTop: 2, flexWrap: 'wrap',
                        }}>
                          {c.role && <span>{c.role}</span>}
                          {c.email && <span style={{ opacity: 0.8 }}>{c.email}</span>}
                          {c.phone && <span style={{ opacity: 0.8 }}>{c.phone}</span>}
                        </div>
                      </div>
                      {c.phone && (
                        <button
                          className="ldp-act ldp-wa"
                          onClick={() => window.open(whatsappUrl(c.phone!), '_blank')}
                          aria-label={`WhatsApp ${c.firstName}`}
                          style={{
                            width: 30, height: 30, border: '1px solid rgba(34,197,94,0.2)',
                            background: 'rgba(34,197,94,0.05)', color: '#16a34a',
                            borderRadius: 8, cursor: 'pointer', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <MessageCircle size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            </>
          )}

          {divider}

          {/* ── Quick Actions ────────────────────────────────────────── */}
          <Section label="Quick Actions" delay={160}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="ldp-act ldp-wa"
                onClick={() => contactPhone && window.open(whatsappUrl(contactPhone), '_blank')}
                disabled={!contactPhone}
                aria-label="Send WhatsApp"
                style={{
                  flex: 1, height: 40, borderRadius: 10,
                  border: contactPhone ? '1px solid rgba(34,197,94,0.2)' : '1px solid var(--border-medium)',
                  background: contactPhone ? 'rgba(34,197,94,0.05)' : 'var(--bg-subtle)',
                  color: contactPhone ? '#16a34a' : 'var(--text-tertiary)',
                  fontSize: 13, fontWeight: 600,
                  cursor: contactPhone ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                }}
              >
                <MessageCircle size={15} /> WhatsApp
              </button>

              <button
                className="ldp-act"
                onClick={() => navigator.clipboard.writeText(copyLeadText).then(() => {
                  setLeadCopied(true); setTimeout(() => setLeadCopied(false), 2000);
                })}
                aria-label={leadCopied ? 'Copied!' : 'Copy lead details'}
                style={{
                  flex: 1, height: 40, borderRadius: 10,
                  border: `1px solid ${leadCopied ? 'rgba(5,150,105,0.3)' : 'var(--border-medium)'}`,
                  background: leadCopied ? 'rgba(5,150,105,0.06)' : 'var(--bg-app)',
                  color: leadCopied ? '#059669' : 'var(--text-secondary)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                }}
              >
                {leadCopied
                  ? <><Check size={15} strokeWidth={2.5} /> Copied!</>
                  : <><Copy size={15} /> Copy Lead</>
                }
              </button>
            </div>
          </Section>

          {/* ── Notes ────────────────────────────────────────────────── */}
          {lead.notes && (
            <>
              {divider}
              <Section label="Notes" delay={200}>
                <div style={{
                  display: 'flex',
                  borderRadius: 10, overflow: 'hidden',
                  border: '1px solid #fef3c7',
                }}>
                  <div style={{ width: 3, background: '#f59e0b', flexShrink: 0 }} />
                  <p style={{
                    flex: 1, fontSize: 13, color: '#78350f', lineHeight: 1.65,
                    background: 'rgba(255,251,235,0.5)',
                    padding: '10px 14px', margin: 0,
                  }}>
                    {lead.notes}
                  </p>
                </div>
              </Section>
            </>
          )}

          {/* ── Metadata ─────────────────────────────────────────────── */}
          <div className="ldp-section" style={{
            marginTop: '1.75rem', paddingTop: '1rem',
            borderTop: '1px solid var(--border-light)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontSize: 11, color: 'var(--text-tertiary)',
            animationDelay: '240ms',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={10} />
              Created {fmtDate(lead.createdAt)}
              <span style={{ opacity: 0.6 }}>· {timeAgo(lead.createdAt)}</span>
            </span>
            <span>
              Updated {timeAgo(lead.updatedAt)}
            </span>
          </div>

        </div>
      </div>
    </>
  );
});
