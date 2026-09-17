import { useState, useEffect, useRef } from 'react';
import { Copy, Check } from 'lucide-react';
import type { Lead, CustomFieldDef } from '../../../types';
import type { LeadContact } from '../../../services/lead-contacts.service';
import type { NotesSummary } from '../../../services/lead-notes.service';
import { resolveDisplayContact, resolveLeadIdentity } from '../../../utils/crm';
import { LEAD_STAGE_LABELS as STAGE_LABELS } from '../../../domain/leadStage';

// ── scoped styles — shared by every host that renders a lead section ──────────
// Single source of truth for the `.ldp-*` animation layer. Both LeadDetailPanel
// (/leads, /activities) and the Documentation workspace inject this once and
// wrap their section tree in `.ldp-root` so the timing tokens resolve.

export const LEAD_SECTION_CSS = `
/* ── timing tokens ─────────────────────────────────────────────── */
.ldp-root {
  --ldp-ease: cubic-bezier(0.2, 0, 0, 1);
  --ldp-spring: cubic-bezier(0.175, 0.885, 0.32, 1.05);
  --ldp-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ldp-t-instant: 80ms;
  --ldp-t-fast: 120ms;
  --ldp-t-normal: 200ms;
}

/* ── entrance animation ────────────────────────────────────────── */
@keyframes ldp-settle {
  from { opacity: 0; transform: translate3d(0, 5px, 0); }
  to   { opacity: 1; transform: translate3d(0, 0, 0); }
}
@keyframes ldp-copyFlash {
  0%   { box-shadow: 0 0 0 0 rgba(5,150,105,0.3); }
  50%  { box-shadow: 0 0 0 6px rgba(5,150,105,0); }
  100% { box-shadow: none; }
}

.ldp-section {
  animation: ldp-settle 220ms var(--ldp-ease) both;
}
.ldp-copy-flash {
  animation: ldp-copyFlash 0.5s var(--ldp-ease) both;
}

/* ── header ────────────────────────────────────────────────────── */
.ldp-frost {
  background: var(--bg-app);
  border-bottom: 1px solid var(--border-light);
}

/* ── scroll body ───────────────────────────────────────────────── */
.ldp-body {
  contain: layout style paint;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

/* ── interactive rows ──────────────────────────────────────────── */
.ldp-row {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px; margin: 0 -10px;
  border-radius: 8px;
  transition: background var(--ldp-t-instant) var(--ldp-ease);
  text-decoration: none; cursor: default;
  -webkit-tap-highlight-color: transparent;
}
.ldp-row:hover { background: var(--bg-subtle); }
.ldp-row[href] { cursor: pointer; }
.ldp-row[href]:hover .ldp-icon {
  color: var(--text-secondary) !important;
  transition: color var(--ldp-t-instant) var(--ldp-ease);
}
.ldp-row[href]:hover .ldp-val {
  color: var(--text-primary) !important;
  transition: color var(--ldp-t-instant) var(--ldp-ease);
}

/* ── action buttons ────────────────────────────────────────────── */
.ldp-act {
  transition:
    transform var(--ldp-t-fast) var(--ldp-spring),
    box-shadow var(--ldp-t-normal) var(--ldp-ease),
    background var(--ldp-t-fast) var(--ldp-ease),
    border-color var(--ldp-t-fast) var(--ldp-ease);
  -webkit-tap-highlight-color: transparent;
}
.ldp-act:hover:not(:disabled) {
  will-change: transform;
  transform: translate3d(0, -1px, 0);
  box-shadow: 0 4px 12px rgba(0,0,0,0.06);
}
.ldp-act:active:not(:disabled) {
  transform: translate3d(0, 0, 0) scale(0.97);
  box-shadow: none;
  transition-duration: 60ms;
}

/* ── contact cards ─────────────────────────────────────────────── */
.ldp-card {
  transition:
    border-color var(--ldp-t-fast) var(--ldp-ease),
    background var(--ldp-t-fast) var(--ldp-ease),
    box-shadow var(--ldp-t-normal) var(--ldp-ease),
    transform var(--ldp-t-fast) var(--ldp-spring);
}
.ldp-card:hover {
  will-change: transform;
  border-color: var(--border-medium) !important;
  background: var(--bg-subtle) !important;
  box-shadow: 0 2px 8px rgba(0,0,0,0.03);
  transform: translate3d(0, -1px, 0);
}

/* ── header buttons ────────────────────────────────────────────── */
.ldp-hdr-btn {
  transition:
    background var(--ldp-t-instant) var(--ldp-ease),
    border-color var(--ldp-t-instant) var(--ldp-ease),
    transform 60ms var(--ldp-ease);
  -webkit-tap-highlight-color: transparent;
}
.ldp-hdr-btn:hover { background: var(--bg-muted) !important; }
.ldp-hdr-btn:active { transform: scale(0.96); }
.ldp-hdr-danger:hover {
  background: rgba(220,38,38,0.06) !important;
  border-color: rgba(220,38,38,0.18) !important;
}

/* ── whatsapp glow ─────────────────────────────────────────────── */
.ldp-wa:hover:not(:disabled) {
  background: rgba(34,197,94,0.1) !important;
  border-color: #86efac !important;
}

/* ── copy mini button ──────────────────────────────────────────── */
.ldp-copy-sm {
  transition:
    border-color var(--ldp-t-instant) var(--ldp-ease),
    color var(--ldp-t-instant) var(--ldp-ease),
    background var(--ldp-t-instant) var(--ldp-ease),
    transform 60ms var(--ldp-ease);
}
.ldp-copy-sm:hover {
  border-color: var(--border-strong) !important;
  color: var(--text-secondary) !important;
}
.ldp-copy-sm:active { transform: scale(0.92); }

/* ── reduced motion ────────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .ldp-section { animation: none !important; opacity: 1 !important; }
  .ldp-copy-flash { animation: none !important; }
  .ldp-act, .ldp-card, .ldp-hdr-btn, .ldp-row {
    transition-duration: 0ms !important;
  }
}
`;

export function LeadSectionStyles() {
  return <style>{LEAD_SECTION_CSS}</style>;
}

// ── helpers ───────────────────────────────────────────────────────────────────

export function whatsappUrl(phone: string) {
  return `https://web.whatsapp.com/send?phone=${encodeURIComponent(phone.replace(/\D/g, ''))}`;
}

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

export function avatarGradient(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_GRADIENTS[Math.abs(h) % AVATAR_GRADIENTS.length];
}

function fmtDateSlash(d: string | Date) {
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${dt.getFullYear()}`;
}

// The structured location string used across the lead sections. Deliberately
// omits postalCode to stay byte-identical with the historical /leads copy/display
// (formatLeadAddress in utils/crm adds postalCode for the Documentation panel).
function locationString(lead: Pick<Lead, 'area' | 'city' | 'state' | 'country' | 'freeformAddress'>): string {
  const structured = [lead.area, lead.city, lead.state, lead.country].filter(Boolean).join(', ');
  return structured || lead.freeformAddress || '';
}

// ── shared section shell ────────────────────────────────────────────────────

export function Section({ label, action, delay = 0, children }: {
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

export function CopyBtn({ text, tooltip }: { text: string; tooltip: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <button
      className={`ldp-copy-sm${copied ? ' ldp-copy-flash' : ''}`}
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => setCopied(false), 2000);
        }).catch(() => {});
      }}
      title={tooltip}
      aria-label={tooltip}
      style={{
        width: 28, height: 28, borderRadius: 7, flexShrink: 0,
        border: `1px solid ${copied ? 'rgba(5,150,105,0.3)' : 'var(--border-medium)'}`,
        background: copied ? 'rgba(5,150,105,0.06)' : 'transparent',
        color: copied ? '#059669' : 'var(--text-tertiary)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {copied ? <Check size={12} strokeWidth={2.5} /> : <Copy size={12} />}
    </button>
  );
}

// ── copy-text builders (pure) ───────────────────────────────────────────────
// Single source of truth for the clipboard payloads, reused by LeadDetailPanel
// and the Documentation workspace so both copy byte-identical output.

export function buildContactCopyText(lead: Lead, contacts: LeadContact[]): string {
  const fullName = resolveLeadIdentity(lead);
  const resolved = resolveDisplayContact(lead, contacts);
  const locationStr = locationString(lead);
  return [
    fullName,
    lead.company     && `Company: ${lead.company}`,
    resolved.phone   && `Phone: ${resolved.phone}`,
    resolved.email   && `Email: ${resolved.email}`,
    locationStr      && `Location: ${locationStr}`,
  ].filter(Boolean).join('\n');
}

export function buildLeadCopyText(
  lead: Lead,
  opts: { contacts?: LeadContact[]; notesSummary?: NotesSummary | null; fieldDefs?: CustomFieldDef[] } = {},
): string {
  const contacts = opts.contacts ?? [];
  const notesSummary = opts.notesSummary ?? null;
  const fieldDefs = opts.fieldDefs ?? [];

  const fullName = resolveLeadIdentity(lead);
  const resolved = resolveDisplayContact(lead, contacts);
  const contactPhone = resolved.phone;
  const contactEmail = resolved.email;
  const locationStr = locationString(lead);

  const storedCustomValues: Array<{ fieldId: string; value: string | null }> =
    Array.isArray((lead as any).customFieldValues) ? (lead as any).customFieldValues : [];
  const populatedCustomValues = storedCustomValues.filter(v => v.value !== null && v.value !== '');

  const sep = '─────────────────────────────';
  const lines: string[] = [sep, fullName];
  if (lead.company) lines.push(lead.company);
  lines.push(sep);
  lines.push(
    [`Stage: ${STAGE_LABELS[lead.stage ?? 'NEW']}`, `Priority: ${lead.priority ?? 'MEDIUM'}`, `Source: ${(lead.source ?? 'OTHER').replace(/_/g, ' ')}`].join('  ·  ')
  );
  if (lead.expectedCloseDate) lines.push(`Expected Close: ${fmtDateSlash(lead.expectedCloseDate)}`);
  lines.push('');
  if (contactPhone) lines.push(`Phone: ${contactPhone}`);
  if (contactEmail) lines.push(`Email: ${contactEmail}`);
  if (locationStr)  lines.push(`Location: ${locationStr}`);
  if (notesSummary?.latest || lead.notes) {
    lines.push('');
    lines.push(`Notes (${notesSummary?.count ?? 0})`);
    if (notesSummary?.latest) lines.push(notesSummary.latest.content);
    else if (lead.notes) lines.push(lead.notes);
  }
  if (contacts.length > 0) {
    lines.push('');
    lines.push(`Contacts (${contacts.length})`);
    contacts.forEach(c =>
      lines.push(`  • ${c.firstName} ${c.lastName}${c.role ? ` (${c.role})` : ''}${c.phone ? ` — ${c.phone}` : ''}${c.email ? ` — ${c.email}` : ''}`)
    );
  }
  if (populatedCustomValues.length > 0) {
    lines.push('');
    lines.push('Custom Fields');
    populatedCustomValues.forEach(v => {
      const def = fieldDefs.find(d => d.id === v.fieldId);
      lines.push(`  ${def?.name ?? v.fieldId}: ${v.value}`);
    });
  }
  lines.push('');
  lines.push(`Created: ${fmtDateSlash(lead.createdAt)}`);
  lines.push(sep);
  return lines.join('\n');
}
