import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Copy, Settings, RotateCcw } from 'lucide-react';
import { Modal } from '../Modal';
import { crmSettingsService } from '../../services/crm-settings.service';
import {
  buildPendingNames, formatReminderMessage, validateTemplate,
  DEFAULT_TEMPLATE, DEFAULT_ORG_NAME,
} from '../../utils/pendingReminder';
import type { DocCaseDocument } from '../../types';

interface Props {
  documents: DocCaseDocument[] | undefined;
  customerName?: string;
  canManageSettings: boolean;
}

// Silent copy fallback for insecure contexts / denied Clipboard API.
function copyViaExecCommand(text: string): boolean {
  try {
    if (typeof document.execCommand !== 'function') return false;
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export default function PendingReminderButton({ documents, customerName, canManageSettings }: Props) {
  const qc = useQueryClient();
  const { data: settings } = useQuery({
    queryKey: ['crm-settings'],
    queryFn: () => crmSettingsService.get(),
  });

  const pendingNames = useMemo(() => buildPendingNames(documents), [documents]);
  const pendingCount = pendingNames.length;
  const template = settings?.pendingReminderTemplate ?? DEFAULT_TEMPLATE;
  const orgName = settings?.pendingReminderOrgName ?? DEFAULT_ORG_NAME;

  const [fallbackText, setFallbackText] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const mountedRef = useRef(true);
  const copyingRef = useRef(false);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const handleCopy = async () => {
    if (pendingCount === 0) {
      toast('All documents have been received. No pending documents reminder is needed.');
      return;
    }
    if (copyingRef.current) return;
    copyingRef.current = true;
    const msg = formatReminderMessage({ pendingNames, template, organizationName: orgName, customerName });
    try {
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(msg);
          if (mountedRef.current) toast.success('Pending documents reminder copied to clipboard');
          return;
        }
      } catch {
        /* fall through to execCommand */
      }
      if (!mountedRef.current) return;
      if (copyViaExecCommand(msg)) {
        toast.success('Pending documents reminder copied to clipboard');
      } else {
        setFallbackText(msg);
        toast.error('Could not copy automatically — copy the text from the box.');
      }
    } finally {
      copyingRef.current = false;
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <button
        className="btn btn-ghost"
        style={{ height: 28, paddingInline: 12, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, opacity: pendingCount === 0 ? 0.5 : 1 }}
        onClick={handleCopy}
        disabled={pendingCount === 0}
        title={pendingCount === 0 ? 'No pending documents' : 'Copy a WhatsApp reminder for pending documents'}
      >
        <Copy size={13} /> Copy Pending Documents
      </button>

      {canManageSettings && (
        <button
          className="btn btn-ghost"
          style={{ height: 28, width: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setSettingsOpen(true)}
          aria-label="Customize reminder template"
          title="Customize reminder template"
        >
          <Settings size={14} />
        </button>
      )}

      {fallbackText !== null && (
        <Modal isOpen onClose={() => setFallbackText(null)} title="Copy pending documents reminder" size="md">
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>
            Automatic copy is unavailable here. Select the text below and copy it manually.
          </p>
          <textarea
            readOnly
            autoFocus
            value={fallbackText}
            onFocus={(e) => e.currentTarget.select()}
            style={{ width: '100%', minHeight: 320, fontFamily: 'inherit', fontSize: 13, padding: 10,
              border: '1px solid var(--border-medium)', borderRadius: 8, resize: 'vertical' }}
          />
        </Modal>
      )}

      {settingsOpen && (
        <ReminderSettingsModal
          initialTemplate={settings?.pendingReminderTemplate ?? DEFAULT_TEMPLATE}
          initialOrgName={settings?.pendingReminderOrgName ?? DEFAULT_ORG_NAME}
          pendingNames={pendingNames}
          customerName={customerName}
          onClose={() => setSettingsOpen(false)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['crm-settings'] }); setSettingsOpen(false); }}
        />
      )}
    </div>
  );
}

interface SettingsModalProps {
  initialTemplate: string;
  initialOrgName: string;
  pendingNames: string[];
  customerName?: string;
  onClose: () => void;
  onSaved: () => void;
}

function ReminderSettingsModal({ initialTemplate, initialOrgName, pendingNames, customerName, onClose, onSaved }: SettingsModalProps) {
  const [draft, setDraft] = useState(initialTemplate);
  const [draftOrg, setDraftOrg] = useState(initialOrgName);
  const [error, setError] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: () => crmSettingsService.setReminderTemplate(draft, draftOrg),
    onSuccess: () => { toast.success('Reminder template saved'); onSaved(); },
    onError: () => { toast.error('Could not save template — using the current template for now.'); },
  });

  const preview = useMemo(
    () => formatReminderMessage({ pendingNames, template: draft, organizationName: draftOrg, customerName }),
    [pendingNames, draft, draftOrg, customerName],
  );

  const handleSave = () => {
    const err = validateTemplate(draft);
    if (err) { setError(err); return; }
    if (!draftOrg.trim()) { setError('Organization name is required.'); return; }
    setError(null);
    saveMutation.mutate();
  };

  return (
    <Modal isOpen onClose={onClose} title="Customize Reminder" size="lg">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
          Organization name
          <input
            value={draftOrg}
            onChange={(e) => setDraftOrg(e.target.value)}
            maxLength={200}
            style={{ marginTop: 4, width: '100%', fontSize: 13, padding: '8px 10px',
              border: '1px solid var(--border-medium)', borderRadius: 8 }}
          />
        </label>

        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
          Message template
          <div style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-tertiary)', margin: '2px 0 4px' }}>
            Use <code>{'{{pending_documents}}'}</code> (required), <code>{'{{organization_name}}'}</code>, and optionally <code>{'{{customer_name}}'}</code>.
          </div>
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={10000}
            style={{ width: '100%', minHeight: 220, fontFamily: 'inherit', fontSize: 13, padding: 10,
              border: `1px solid ${error ? '#dc2626' : 'var(--border-medium)'}`, borderRadius: 8, resize: 'vertical' }}
          />
        </label>

        {error && <div style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>{error}</div>}

        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Preview</div>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'inherit', fontSize: 13,
            background: 'var(--bg-subtle)', padding: 10, borderRadius: 8, margin: 0, maxHeight: 200, overflowY: 'auto' }}>
            {preview}
          </pre>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <button
            className="btn btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => { setDraft(DEFAULT_TEMPLATE); setDraftOrg(DEFAULT_ORG_NAME); setError(null); }}
          >
            <RotateCcw size={13} /> Reset to default
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={onClose} disabled={saveMutation.isPending}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
