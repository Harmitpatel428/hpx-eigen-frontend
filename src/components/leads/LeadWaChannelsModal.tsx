import { memo, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Star, Trash2, Edit2, Check } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  waChannelsService, WaChannel, WaChannelType, CHANNEL_TYPE_LABELS,
} from '../../services/wa-channels.service';

interface Props {
  leadId: string;
  leadName: string;
  onClose: () => void;
  anchorRight?: number;
}

const PANEL_W = 420;

const TYPES: WaChannelType[] = ['INDIVIDUAL_NUMBER', 'GROUP', 'USERNAME', 'BUSINESS_ACCOUNT'];

function ChannelTypeIcon({ type, size = 13 }: { type: WaChannelType; size?: number }) {
  const icons: Record<WaChannelType, string> = {
    INDIVIDUAL_NUMBER: '👤',
    GROUP: '👥',
    USERNAME: '@',
    BUSINESS_ACCOUNT: '🏢',
  };
  return <span style={{ fontSize: size - 2 }}>{icons[type]}</span>;
}

function ChannelRow({
  channel, leadId, onMutate,
}: {
  channel: WaChannel;
  leadId: string;
  onMutate: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(channel.displayName);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim() || name.trim() === channel.displayName) { setEditing(false); return; }
    setSaving(true);
    try {
      await waChannelsService.update(leadId, channel.id, { displayName: name.trim() });
      onMutate();
      setEditing(false);
    } finally { setSaving(false); }
  };

  const archive = async () => {
    if (!confirm(`Archive "${channel.displayName}"?`)) return;
    await waChannelsService.remove(leadId, channel.id);
    onMutate();
  };

  const makePrimary = async () => {
    await waChannelsService.makePrimary(leadId, channel.id);
    onMutate();
  };

  return (
    <div style={{
      padding: '10px 16px',
      borderBottom: '1px solid var(--border-light)',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <ChannelTypeIcon type={channel.channelType} size={16} />

      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
            style={{
              width: '100%', fontSize: 13, fontWeight: 500,
              border: '1px solid var(--border-medium)', borderRadius: 5,
              padding: '2px 6px', background: 'var(--bg-app)', color: 'var(--text-primary)',
            }}
          />
        ) : (
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {channel.displayName}
            {channel.isPrimary && (
              <span style={{
                marginLeft: 6, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                background: 'rgba(34,197,94,0.1)', color: '#16a34a', padding: '1px 5px', borderRadius: 3,
              }}>
                Primary
              </span>
            )}
          </div>
        )}
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>
          {CHANNEL_TYPE_LABELS[channel.channelType]} · {channel.identifier}
        </div>
      </div>

      {editing ? (
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button onClick={save} disabled={saving} style={smBtn('#0f172a', '#fff')}>
            <Check size={11} strokeWidth={2.5} />
          </button>
          <button onClick={() => setEditing(false)} style={smBtn('transparent', 'var(--text-tertiary)', 'var(--border-light)')}>
            <X size={11} />
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {!channel.isPrimary && (
            <button onClick={makePrimary} title="Make primary" style={smBtn('transparent', 'var(--text-tertiary)', 'var(--border-light)')}>
              <Star size={11} />
            </button>
          )}
          <button onClick={() => setEditing(true)} title="Edit name" style={smBtn('transparent', 'var(--text-tertiary)', 'var(--border-light)')}>
            <Edit2 size={11} />
          </button>
          <button onClick={archive} title="Archive" style={smBtn('transparent', '#dc2626', 'rgba(220,38,38,0.12)')}>
            <Trash2 size={11} />
          </button>
        </div>
      )}
    </div>
  );
}

function smBtn(bg: string, color: string, border = 'transparent'): React.CSSProperties {
  return {
    width: 26, height: 26, borderRadius: 6, flexShrink: 0,
    border: `1px solid ${border}`, background: bg, color,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  };
}

function AddChannelForm({ leadId, onDone, onCancel }: { leadId: string; onDone: () => void; onCancel: () => void }) {
  const [type, setType] = useState<WaChannelType>('INDIVIDUAL_NUMBER');
  const [identifier, setIdentifier] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    if (!identifier.trim()) { setErr('Identifier is required.'); return; }
    if (!displayName.trim()) { setErr('Display name is required.'); return; }
    setSaving(true);
    try {
      await waChannelsService.create(leadId, { channelType: type, identifier: identifier.trim(), displayName: displayName.trim(), isPrimary });
      onDone();
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? 'Failed to save.');
    } finally { setSaving(false); }
  };

  const identifierPlaceholder: Record<WaChannelType, string> = {
    INDIVIDUAL_NUMBER: '+91 98765 43210',
    GROUP: 'Group invite link or ID',
    USERNAME: 'whatsapp_username',
    BUSINESS_ACCOUNT: '+91 98765 43210',
  };

  return (
    <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-light)', background: 'var(--bg-subtle)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
        Add Channel
      </div>

      {err && (
        <div style={{ fontSize: 11, color: '#b91c1c', background: '#fef2f2', padding: '4px 8px', borderRadius: 5, marginBottom: 8 }}>
          {err}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <select
          value={type}
          onChange={e => setType(e.target.value as WaChannelType)}
          style={inputStyle}
        >
          {TYPES.map(t => <option key={t} value={t}>{CHANNEL_TYPE_LABELS[t]}</option>)}
        </select>

        <input
          placeholder={identifierPlaceholder[type]}
          value={identifier}
          onChange={e => setIdentifier(e.target.value)}
          style={inputStyle}
          autoFocus
        />

        <input
          placeholder="Display name"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          style={inputStyle}
        />

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <input type="checkbox" checked={isPrimary} onChange={e => setIsPrimary(e.target.checked)} />
          Set as primary
        </label>

        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 2 }}>
          <button onClick={onCancel} disabled={saving} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border-medium)', background: 'var(--bg-app)', color: 'var(--text-secondary)', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={submit} disabled={saving} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: '#0f172a', color: '#fff', fontSize: 11, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', fontSize: 12, padding: '6px 10px', borderRadius: 6,
  border: '1px solid var(--border-medium)', background: 'var(--bg-app)',
  color: 'var(--text-primary)', boxSizing: 'border-box',
};

export const LeadWaChannelsModal = memo(function LeadWaChannelsModal({ leadId, leadName, onClose, anchorRight = 0 }: Props) {
  const qc = useQueryClient();
  const panelRef = useRef<HTMLDivElement>(null);
  const [adding, setAdding] = useState(false);

  const { data: channels = [], isLoading } = useQuery({
    queryKey: ['wa-channels', leadId],
    queryFn: () => waChannelsService.list(leadId),
    staleTime: 30_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['wa-channels', leadId] });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => prev?.focus();
  }, []);

  const header = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 16px', flexShrink: 0, borderBottom: '1px solid var(--border-light)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>WhatsApp Channels</h2>
        <p style={{ fontSize: 10.5, color: 'var(--text-tertiary)', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {leadName}
        </p>
      </div>
      {!adding && (
        <button
          onClick={() => setAdding(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '4px 10px', borderRadius: 6, border: 'none', background: '#0f172a', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
        >
          <Plus size={9} strokeWidth={3} /> Add
        </button>
      )}
      <button
        onClick={onClose}
        style={{ width: 24, height: 24, borderRadius: 5, border: 'none', background: 'transparent', color: 'var(--text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
      >
        <X size={13} />
      </button>
    </div>
  );

  const body = (
    <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
      {isLoading ? (
        <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 12 }}>Loading…</div>
      ) : channels.length === 0 && !adding ? (
        <div style={{ padding: '52px 16px', textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '0 0 7px' }}>No WhatsApp channels yet.</p>
          <button onClick={() => setAdding(true)} style={{ fontSize: 11.5, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
            Add the first channel →
          </button>
        </div>
      ) : (
        channels.map(ch => (
          <ChannelRow key={ch.id} channel={ch} leadId={leadId} onMutate={invalidate} />
        ))
      )}
    </div>
  );

  const footer = adding ? (
    <AddChannelForm
      leadId={leadId}
      onDone={() => { invalidate(); setAdding(false); }}
      onCancel={() => setAdding(false)}
    />
  ) : null;

  const isPanelMode = anchorRight > 0;

  const content = isPanelMode ? (
    <>
      <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: anchorRight + PANEL_W, bottom: 0, zIndex: 1149 }} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`WhatsApp Channels — ${leadName}`}
        tabIndex={-1}
        style={{
          position: 'fixed', top: 0, right: anchorRight, bottom: 0, width: PANEL_W,
          zIndex: 1150, background: 'var(--bg-app)',
          borderLeft: '1px solid var(--border-medium)',
          boxShadow: '-10px 0 36px rgba(15,23,42,0.09)',
          display: 'flex', flexDirection: 'column', outline: 'none',
        }}
      >
        {header}
        {body}
        {footer}
      </div>
    </>
  ) : (
    <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 1150, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.3)' }} />
      <div
        ref={panelRef}
        tabIndex={-1}
        style={{
          position: 'relative', zIndex: 1,
          width: '100%', maxWidth: 480, maxHeight: '80vh',
          background: 'var(--bg-app)', borderRadius: 16,
          boxShadow: '0 20px 48px rgba(0,0,0,0.13)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden', outline: 'none',
        }}
      >
        {header}
        {body}
        {footer}
      </div>
    </div>
  );

  return createPortal(content, document.body);
});
