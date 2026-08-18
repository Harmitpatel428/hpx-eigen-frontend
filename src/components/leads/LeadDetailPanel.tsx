import { useState, useEffect, useRef, memo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Phone, Mail, X, Edit2, Trash2,
  Building2, Calendar, MapPin,
  MessageCircle, Copy, Check, Clock, User, Activity, ChevronDown,
} from 'lucide-react';
import type { Lead, LeadStage, LeadPriority, CustomFieldDef, LeadActivity } from '../../types';
import { leadContactsService, LeadContact } from '../../services/lead-contacts.service';
import { leadNotesService, type NotesSummary } from '../../services/lead-notes.service';
import { listLeadActivities } from '../../services/lead-activities.service';
import { LeadNotesSummary } from './LeadNotesSummary';
import { customFieldService } from '../../services/custom-field.service';
import { crmSettingsService } from '../../services/crm-settings.service';
import { leadService } from '../../services/lead.service';
import { waChannelsService, buildWaUrl, type WaChannel } from '../../services/wa-channels.service';
import { LeadWaChannelsModal } from './LeadWaChannelsModal';

// ── constants ─────────────────────────────────────────────────────────────────

const STAGE_LABELS: Record<LeadStage, string> = {
  NEW: 'New', QUALIFIED: 'Qualified', FOLLOW_UP: 'Follow-Up',
  CALL_BACK_REQUESTED: 'Call Back Requested', CALL_NOT_RECEIVED: 'Call Not Received',
  OTHER: 'Other', DISQUALIFIED: 'Disqualified',
  // legacy read-only
  CONTACTED: 'Contacted', CONVERTED: 'Converted',
};

const STAGE_COLORS: Record<LeadStage, { bg: string; text: string; dot: string }> = {
  NEW:                  { bg: 'rgba(99,102,241,0.1)',  text: '#6366f1', dot: '#6366f1' },
  QUALIFIED:            { bg: 'rgba(16,185,129,0.1)',  text: '#059669', dot: '#059669' },
  FOLLOW_UP:            { bg: 'rgba(245,158,11,0.1)',  text: '#d97706', dot: '#d97706' },
  CALL_BACK_REQUESTED:  { bg: 'rgba(249,115,22,0.1)',  text: '#ea580c', dot: '#ea580c' },
  CALL_NOT_RECEIVED:    { bg: 'rgba(239,68,68,0.08)',  text: '#dc2626', dot: '#dc2626' },
  OTHER:                { bg: 'rgba(107,114,128,0.1)', text: '#6b7280', dot: '#6b7280' },
  DISQUALIFIED:         { bg: 'rgba(239,68,68,0.1)',   text: '#dc2626', dot: '#dc2626' },
  // legacy read-only
  CONTACTED:            { bg: 'rgba(245,158,11,0.1)',  text: '#d97706', dot: '#d97706' },
  CONVERTED:            { bg: 'rgba(139,92,246,0.1)',  text: '#7c3aed', dot: '#7c3aed' },
};

const PRIORITY_COLORS: Record<LeadPriority, { color: string; bg: string }> = {
  CRITICAL: { color: '#dc2626', bg: 'rgba(220,38,38,0.08)' },
  HIGH:     { color: '#ea580c', bg: 'rgba(234,88,12,0.08)' },
  MEDIUM:   { color: '#2563eb', bg: 'rgba(37,99,235,0.08)' },
  LOW:      { color: '#6b7280', bg: 'rgba(107,114,128,0.08)' },
};

const PIPELINE: LeadStage[] = ['NEW', 'QUALIFIED', 'FOLLOW_UP', 'CALL_BACK_REQUESTED', 'CALL_NOT_RECEIVED', 'DISQUALIFIED'];

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
  const ms = new Date(date).getTime();
  if (isNaN(ms)) return '—';
  const s = Math.floor((Date.now() - ms) / 1000);
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

function fmtDateSlash(d: string | Date) {
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${dt.getFullYear()}`;
}

// ── scoped styles — Apple-grade animation layer ──────────────────────────────

const CSS = `
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

// ── stage selector ────────────────────────────────────────────────────────────

function LeadStageSelector({
  currentStage, onSelect, variant = 'badge',
}: {
  currentStage: LeadStage;
  onSelect: (stage: LeadStage) => void;
  variant?: 'badge' | 'action-button' | 'text-button';
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const sc = STAGE_COLORS[currentStage];

  let trigger: React.ReactNode;
  let wrapperStyle: React.CSSProperties;

  if (variant === 'badge') {
    wrapperStyle = { position: 'relative', display: 'inline-block' };
    trigger = (
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer',
          padding: '3px 9px', borderRadius: 5, border: 'none',
          background: sc.bg, color: sc.text,
          fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
        }}
      >
        {STAGE_LABELS[currentStage]}
        <ChevronDown size={9} style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 120ms' }} />
      </button>
    );
  } else if (variant === 'action-button') {
    wrapperStyle = { flex: 1, position: 'relative' };
    trigger = (
      <button
        onClick={() => setOpen(o => !o)}
        className="ldp-act"
        style={{
          width: '100%', height: 34, borderRadius: 8,
          border: '1px solid var(--border-medium)', background: 'var(--bg-app)',
          color: 'var(--text-secondary)', fontSize: 11, fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        }}
      >
        <Activity size={13} /> Status
      </button>
    );
  } else {
    wrapperStyle = { position: 'relative', display: 'inline-block' };
    trigger = (
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-tertiary)', fontSize: 11, fontWeight: 600, padding: 0,
        }}
      >
        <ChevronDown size={11} style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 120ms' }} />
        Change Stage
      </button>
    );
  }

  return (
    <div ref={ref} style={wrapperStyle}>
      {trigger}
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 200,
          background: 'var(--bg-app)', border: '1px solid var(--border-medium)',
          borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          minWidth: 190, overflow: 'hidden',
        }}>
          <div style={{
            padding: '8px 12px 4px', fontSize: 10, fontWeight: 700,
            color: 'var(--text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            Stage
          </div>
          {PIPELINE.map(stage => {
            const s = STAGE_COLORS[stage];
            const active = stage === currentStage;
            return (
              <button
                key={stage}
                onClick={() => { onSelect(stage); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '7px 12px', border: 'none', textAlign: 'left',
                  background: active ? s.bg : 'transparent', cursor: 'pointer',
                  color: active ? s.text : 'var(--text-primary)',
                  fontSize: 12, fontWeight: active ? 700 : 450,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
                {STAGE_LABELS[stage]}
                {active && <Check size={11} style={{ marginLeft: 'auto' }} strokeWidth={2.5} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── small helpers ─────────────────────────────────────────────────────────────

function CopyBtn({ text, tooltip }: { text: string; tooltip: string }) {
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

// ── Activity type display config ──────────────────────────────────────────────

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  STAGE_CHANGE:           'Stage Changed',
  FOLLOW_UP_SCHEDULED:    'Follow-Up Scheduled',
  CALLBACK_SCHEDULED:     'Callback Scheduled',
  CALL_NOT_RECEIVED_EVENT:'Call Not Received',
  ASSIGNMENT_CHANGE:      'Lead Assigned',
  LEAD_CREATED:           'Lead Created',
  NOTE_ADDED:             'Note Added',
  OTHER:                  'Activity',
};

function TimelineSection({ leadId }: { leadId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['lead-activities', leadId],
    queryFn: () => listLeadActivities(leadId, 1, 30),
    staleTime: 30_000,
  });

  const activities: LeadActivity[] = data?.data ?? [];
  const now = Date.now();
  const upcoming = activities.filter(a => a.state === 'PENDING' && a.scheduledAt && new Date(a.scheduledAt).getTime() > now);
  const historical = activities.filter(a => !upcoming.includes(a));

  if (isLoading) return (
    <div style={{ padding: '1rem 0', textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)' }}>
      Loading timeline…
    </div>
  );

  if (!activities.length) return (
    <div style={{ padding: '0.5rem 0', fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center' }}>
      No timeline events yet.
    </div>
  );

  const renderActivity = (a: LeadActivity) => {
    const label = ACTIVITY_TYPE_LABELS[a.type] ?? a.type;
    const meta = a.metadata as any;
    let detail = '';
    if (a.type === 'STAGE_CHANGE' && meta.from && meta.to) {
      detail = `${STAGE_LABELS[meta.from as LeadStage] ?? meta.from} → ${STAGE_LABELS[meta.to as LeadStage] ?? meta.to}`;
    } else if (a.type === 'ASSIGNMENT_CHANGE') {
      detail = a.subject;
    } else if (a.scheduledAt) {
      detail = fmtDate(a.scheduledAt);
    }
    const actor = a.actor ? `${a.actor.firstName ?? ''} ${a.actor.lastName ?? ''}`.trim() : null;
    const ts = a.completedAt ?? a.scheduledAt ?? a.createdAt;
    return (
      <div key={a.id} style={{ display: 'flex', gap: 10, paddingBottom: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', marginTop: 3, flexShrink: 0,
            background: a.state === 'PENDING' ? '#f59e0b' : 'var(--text-tertiary)',
          }} />
          <div style={{ flex: 1, width: 1, background: 'var(--border-light)', minHeight: 12 }} />
        </div>
        <div style={{ flex: 1, paddingBottom: 2 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', lineHeight: '1.3' }}>{label}</div>
          {detail && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>{detail}</div>}
          <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2, display: 'flex', gap: 6 }}>
            <span>{fmtDate(ts)}</span>
            {actor && <span>· {actor}</span>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '0.25rem 0' }}>
      {upcoming.length > 0 && (
        <>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Upcoming</div>
          {upcoming.map(renderActivity)}
        </>
      )}
      {historical.length > 0 && (
        <>
          {upcoming.length > 0 && <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, marginTop: 4 }}>History</div>}
          {historical.map(renderActivity)}
        </>
      )}
    </div>
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

  const { data: fieldDefs = [] } = useQuery<CustomFieldDef[]>({
    queryKey: ['custom-fields'],
    queryFn: () => customFieldService.list(),
    staleTime: 60_000,
  });

  const { data: notesSummary } = useQuery<NotesSummary>({
    queryKey: ['notes-summary', lead.id],
    queryFn: () => leadNotesService.summary(lead.id),
    staleTime: 30_000,
  });

  const { data: crmSettings } = useQuery({
    queryKey: ['crm-settings'],
    queryFn: () => crmSettingsService.get(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: waChannels = [] } = useQuery<WaChannel[]>({
    queryKey: ['wa-channels', lead.id],
    queryFn: () => waChannelsService.list(lead.id),
    staleTime: 30_000,
  });

  const HDR_KEY = 'hpx:ui:v1:leadHeaderFreeze';
  const [headerFreeze, setHeaderFreeze] = useState(() => {
    try { return localStorage.getItem(HDR_KEY) !== 'free'; } catch { return true; }
  });
  const toggleHeaderFreeze = () => {
    const next = !headerFreeze;
    setHeaderFreeze(next);
    try { localStorage.setItem(HDR_KEY, next ? 'freeze' : 'free'); } catch {}
  };

  const [waOpen, setWaOpen] = useState(false);
  const [leadCopied, setLeadCopied] = useState(false);
  const leadCopyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(leadCopyTimer.current), []);

  const qc = useQueryClient();
  const [localStage, setLocalStage] = useState<LeadStage>(lead.stage ?? 'NEW');
  useEffect(() => { setLocalStage(lead.stage ?? 'NEW'); }, [lead.stage]);

  const handleStageChange = async (stage: LeadStage) => {
    if (stage === localStage) return;
    const prev = localStage;
    setLocalStage(stage);
    try {
      const needsDate = (['FOLLOW_UP', 'CALL_BACK_REQUESTED', 'CALL_NOT_RECEIVED'] as LeadStage[]).includes(stage);
      await leadService.update(lead.id, {
        stage,
        ...(needsDate && !lead.followUpDate ? { followUpDate: new Date().toISOString() } : {}),
      });
      qc.invalidateQueries({ queryKey: ['leads'] });
    } catch {
      setLocalStage(prev);
    }
  };

  const primaryWaChannel = waChannels.find(c => c.isPrimary) ?? waChannels[0] ?? null;

  const priority     = PRIORITY_COLORS[lead.priority ?? 'MEDIUM'] ?? PRIORITY_COLORS.MEDIUM;
  const mainContact  = contacts.find(c => c.isMain) ?? contacts[0] ?? null;
  const contactPhone = mainContact?.phone ?? lead.phone;
  const contactEmail = mainContact?.email ?? lead.email;
  const structuredLocation = [lead.area, lead.city, lead.state, lead.country].filter(Boolean).join(', ');
  const locationStr = structuredLocation || lead.freeformAddress || '';
  const fullName     = `${lead.firstName} ${lead.lastName}`;

  const headerPref = crmSettings?.leadHeaderPreference ?? null;
  const headerIdentity = headerPref === 'company'
    ? (lead.company || 'Unnamed Lead')
    : fullName;

  const storedCustomValues: Array<{ fieldId: string; value: string | null }> =
    Array.isArray((lead as any).customFieldValues) ? (lead as any).customFieldValues : [];
  const populatedCustomValues = storedCustomValues.filter(v => v.value !== null && v.value !== '');

  const copyContactText = [
    fullName,
    lead.company   && `Company: ${lead.company}`,
    contactPhone   && `Phone: ${contactPhone}`,
    contactEmail   && `Email: ${contactEmail}`,
    locationStr    && `Location: ${locationStr}`,
  ].filter(Boolean).join('\n');

  const copyLeadText = (() => {
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
  })();

  const px = '1.375rem';
  const divider = (
    <div style={{ height: 1, background: 'var(--border-light)', margin: '1.375rem 0' }} />
  );

  const headerContent = (
        <div className="ldp-frost" style={{
          padding: `1.125rem ${px} 0.75rem`,
          ...(headerFreeze ? {} : { borderBottom: 'none' }),
        }}>
          {/* avatar · name · close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <div style={{
              width: 46, height: 46, borderRadius: 13, flexShrink: 0,
              background: avatarGradient(fullName),
              color: '#fff', fontSize: 15, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              letterSpacing: '0.02em',
              boxShadow: '0 1px 4px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.06)',
            }}>
              {lead.firstName?.[0] ?? '?'}{lead.lastName?.[0] ?? ''}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{
                fontSize: 20, fontWeight: 750, color: 'var(--text-primary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                lineHeight: 1.2, letterSpacing: '-0.02em',
              }}>
                {headerIdentity}
              </h2>
              {headerPref === 'company' ? (
                <div style={{
                  fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500,
                  marginTop: 2,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {fullName}
                </div>
              ) : lead.company ? (
                <div style={{
                  fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 450,
                  marginTop: 2,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <Building2 size={11} style={{ flexShrink: 0 }} />
                  {lead.company}
                </div>
              ) : null}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
              <button
                className="ldp-hdr-btn"
                onClick={toggleHeaderFreeze}
                aria-label={headerFreeze ? 'Free-glide header' : 'Freeze header'}
                title={headerFreeze ? 'Header: Frozen — click for Free Glide' : 'Header: Free Glide — click to Freeze'}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  border: '1px solid var(--border-medium)', background: 'var(--bg-app)',
                  color: headerFreeze ? 'var(--text-secondary)' : 'var(--text-tertiary)',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13,
                }}
              >
                {headerFreeze ? '❄' : '↕'}
              </button>
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

          {/* stage + medium cards */}
          <div style={{ display: 'flex', gap: 12, paddingTop: 12, paddingBottom: 2 }}>
            <div>
              <LeadStageSelector currentStage={localStage} onSelect={handleStageChange} variant="badge" />
              <div style={{ fontSize: 9, color: 'var(--text-tertiary)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Stage</div>
            </div>
            <div>
              <span style={{
                display: 'inline-block', padding: '3px 9px', borderRadius: 5,
                background: 'var(--bg-muted)', color: 'var(--text-secondary)',
                fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase',
              }}>
                {(lead.source ?? 'OTHER').replace(/_/g, ' ')}
              </span>
              <div style={{ fontSize: 9, color: 'var(--text-tertiary)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Medium</div>
            </div>
          </div>

          {/* badges */}
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
          </div>
        </div>
  );

  const bodyContent = (
        <div style={{ padding: `1.375rem ${px}` }}>

          {/* Contact Information */}
          <Section
            label="Contact Information"
            action={<CopyBtn text={copyContactText} tooltip="Copy contact info" />}
            delay={40}
          >
            {/* Lead name */}
            <div className="ldp-row" style={{ marginBottom: 2 }}>
              <User size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
              <span style={{
                fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {fullName}
              </span>
            </div>

            {/* Phone before Email */}
            {contactPhone ? (
              <a className="ldp-row" href={`tel:${contactPhone}`}
                style={{ color: 'var(--text-secondary)' }}
              >
                <Phone className="ldp-icon" size={14}
                  style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}
                />
                <span className="ldp-val" style={{ flex: 1, fontSize: 13 }}>
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

            {locationStr && (
              <div className="ldp-row" style={{ alignItems: 'flex-start' }}>
                <MapPin size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {locationStr}
                </span>
              </div>
            )}
          </Section>

          {/* All Contacts */}
          {contacts.length > 1 && (
            <>
              {divider}
              <Section label={`All Contacts (${contacts.length})`} delay={70}>
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
                        {c.firstName?.[0] ?? '?'}{c.lastName?.[0] ?? ''}
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

          {/* Quick Actions */}
          <Section label="Quick Actions" delay={100}>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className="ldp-act"
                onClick={onEdit}
                aria-label="Edit lead"
                style={{
                  flex: 1, height: 34, borderRadius: 8,
                  border: '1px solid var(--border-medium)', background: 'var(--bg-app)',
                  color: 'var(--text-secondary)',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                }}
              >
                <Edit2 size={13} /> Edit
              </button>
              <button
                className="ldp-act ldp-hdr-danger"
                onClick={onDelete}
                aria-label="Delete lead"
                style={{
                  flex: 1, height: 34, borderRadius: 8,
                  border: '1px solid rgba(220,38,38,0.12)', background: 'rgba(220,38,38,0.03)',
                  color: '#dc2626',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                }}
              >
                <Trash2 size={13} /> Delete
              </button>
              <button
                className="ldp-act ldp-wa"
                onClick={() => {
                  if (waChannels.length > 1) { setWaOpen(true); return; }
                  const dest = primaryWaChannel
                    ? buildWaUrl(primaryWaChannel)
                    : contactPhone ? whatsappUrl(contactPhone) : null;
                  if (dest) window.open(dest, '_blank');
                }}
                disabled={!primaryWaChannel && !contactPhone}
                aria-label={waChannels.length > 1 ? 'Choose WhatsApp channel' : 'Send WhatsApp'}
                style={{
                  flex: 1, height: 34, borderRadius: 8,
                  border: (primaryWaChannel || contactPhone) ? '1px solid rgba(34,197,94,0.2)' : '1px solid var(--border-medium)',
                  background: (primaryWaChannel || contactPhone) ? 'rgba(34,197,94,0.05)' : 'var(--bg-subtle)',
                  color: (primaryWaChannel || contactPhone) ? '#16a34a' : 'var(--text-tertiary)',
                  fontSize: 11, fontWeight: 600,
                  cursor: (primaryWaChannel || contactPhone) ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                }}
              >
                <MessageCircle size={13} /> WA{waChannels.length > 1 ? ` (${waChannels.length})` : ''}
              </button>
              <button
                className={`ldp-act${leadCopied ? ' ldp-copy-flash' : ''}`}
                onClick={() => {
                  navigator.clipboard.writeText(copyLeadText).then(() => {
                    setLeadCopied(true);
                    clearTimeout(leadCopyTimer.current);
                    leadCopyTimer.current = setTimeout(() => setLeadCopied(false), 2000);
                  }).catch(() => {});
                }}
                aria-label={leadCopied ? 'Copied!' : 'Copy lead details'}
                style={{
                  flex: 1, height: 34, borderRadius: 8,
                  border: `1px solid ${leadCopied ? 'rgba(5,150,105,0.3)' : 'var(--border-medium)'}`,
                  background: leadCopied ? 'rgba(5,150,105,0.06)' : 'var(--bg-app)',
                  color: leadCopied ? '#059669' : 'var(--text-secondary)',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                }}
              >
                {leadCopied ? <><Check size={13} strokeWidth={2.5} /> Copied</> : <><Copy size={13} /> Copy</>}
              </button>
              <LeadStageSelector currentStage={localStage} onSelect={handleStageChange} variant="action-button" />
            </div>
          </Section>

          {/* Notes */}
          <>
            {divider}
            <Section label="Notes" delay={130}>
              <LeadNotesSummary
                leadId={lead.id}
                leadName={fullName}
                legacyNote={lead.notes}
                anchorRight={480}
              />
              <div style={{ marginTop: 8 }}>
                <LeadStageSelector currentStage={localStage} onSelect={handleStageChange} variant="text-button" />
              </div>
            </Section>
          </>

          {/* WhatsApp Channels */}
          {waChannels.length > 0 && (
            <>
              {divider}
              <Section label="WhatsApp Channels" delay={138}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {primaryWaChannel && (
                    <div className="ldp-row" style={{ cursor: 'default', padding: '6px 0', margin: 0 }}>
                      <MessageCircle size={14} style={{ color: '#16a34a', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                          {primaryWaChannel.displayName}
                        </span>
                        {waChannels.length > 1 && (
                          <span style={{ marginLeft: 6, fontSize: 9, color: 'var(--text-tertiary)' }}>
                            +{waChannels.length - 1} more
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--text-tertiary)', flexShrink: 0 }}>Primary</span>
                    </div>
                  )}
                  <button
                    onClick={() => setWaOpen(true)}
                    style={{
                      background: 'none', border: 'none', padding: '2px 0',
                      fontSize: 11.5, color: '#16a34a', cursor: 'pointer',
                      fontWeight: 500, textAlign: 'left',
                    }}
                  >
                    Manage channels →
                  </button>
                </div>
              </Section>
            </>
          )}

          {/* Custom Fields */}
          {populatedCustomValues.length > 0 && (
            <>
              {divider}
              <Section label="Custom Fields" delay={145}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {populatedCustomValues.map(v => {
                    const def = fieldDefs.find(d => d.id === v.fieldId);
                    return (
                      <div key={v.fieldId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '4px 0', borderBottom: '1px solid var(--border-light)' }}>
                        <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 500 }}>{def?.name ?? v.fieldId}</span>
                        <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 450, maxWidth: '60%', textAlign: 'right', wordBreak: 'break-word' }}>{v.value}</span>
                      </div>
                    );
                  })}
                </div>
              </Section>
            </>
          )}

          {/* Timeline */}
          <>
            {divider}
            <Section label="Timeline" delay={150}>
              <TimelineSection leadId={lead.id} />
            </Section>
          </>

          {/* Metadata */}
          <div className="ldp-section" style={{
            marginTop: '1.75rem', paddingTop: '1rem',
            borderTop: '1px solid var(--border-light)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontSize: 11, color: 'var(--text-tertiary)',
            animationDelay: '160ms',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={10} />
              Created {fmtDate(lead.createdAt)}
              <span style={{ opacity: 0.6 }}>· {timeAgo(lead.createdAt)}</span>
            </span>
            <span>Updated {fmtDate(lead.updatedAt)} <span style={{ opacity: 0.6 }}>· {timeAgo(lead.updatedAt)}</span></span>
          </div>

        </div>
  );

  return (
    <>
      <style>{CSS}</style>
      <div className="ldp-root" style={{
        display: 'flex', flexDirection: 'column',
        height: '100%', background: 'var(--bg-app)',
      }}>
        {headerFreeze ? (
          <>
            {headerContent}
            <div className="ldp-body" style={{ flex: 1, overflowY: 'auto' }}>
              {bodyContent}
            </div>
          </>
        ) : (
          <div className="ldp-body" style={{ flex: 1, overflowY: 'auto' }}>
            {headerContent}
            {bodyContent}
          </div>
        )}
      </div>
      {waOpen && (
        <LeadWaChannelsModal
          leadId={lead.id}
          leadName={fullName}
          onClose={() => setWaOpen(false)}
          anchorRight={480}
        />
      )}
    </>
  );
});
