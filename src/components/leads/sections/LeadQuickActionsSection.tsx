import { useState, useEffect, useRef } from 'react';
import { Edit2, Trash2, MessageCircle, Copy, Check } from 'lucide-react';
import { buildWaUrl, type WaChannel } from '../../../services/wa-channels.service';
import { Section, whatsappUrl } from './shared';

// Presentational — Edit/Delete/WA-modal are host callbacks; the host owns the
// LeadModal, DeleteConfirm, and WhatsApp-channels modal. Only the copy-flash is
// local UI state (same pattern as CopyBtn).
export function LeadQuickActionsSection({
  onEdit, onDelete, primaryWaChannel, contactPhone, copyLeadText, onOpenWaModal,
}: {
  onEdit: () => void;
  onDelete: () => void;
  primaryWaChannel: WaChannel | null;
  contactPhone: string | null;
  copyLeadText: string;
  onOpenWaModal?: () => void;
}) {
  const [leadCopied, setLeadCopied] = useState(false);
  const leadCopyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(leadCopyTimer.current), []);

  return (
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
            const dest = primaryWaChannel
              ? buildWaUrl(primaryWaChannel)
              : contactPhone ? whatsappUrl(contactPhone) : null;
            if (dest) { window.open(dest, 'crm_whatsapp'); return; }
            else onOpenWaModal?.();
          }}
          disabled={!primaryWaChannel && !contactPhone}
          aria-label={primaryWaChannel ? `Open WhatsApp — ${primaryWaChannel.displayName}` : 'Send WhatsApp'}
          style={{
            flex: 1, height: 34, borderRadius: 8,
            border: (primaryWaChannel || contactPhone) ? '1px solid rgba(34,197,94,0.2)' : '1px solid var(--border-medium)',
            background: (primaryWaChannel || contactPhone) ? 'rgba(34,197,94,0.05)' : 'var(--bg-subtle)',
            color: (primaryWaChannel || contactPhone) ? '#16a34a' : 'var(--text-tertiary)',
            fontSize: 11, fontWeight: 600,
            cursor: (!primaryWaChannel && !contactPhone) ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}
        >
          <MessageCircle size={13} /> WA
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
      </div>
    </Section>
  );
}
