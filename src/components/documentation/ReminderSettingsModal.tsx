import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from '../notifications/notify';
import { RotateCcw } from 'lucide-react';
import { Modal } from '../Modal';
import { crmSettingsService } from '../../services/crm-settings.service';
import {
  formatReminderMessage, validateTemplate, DEFAULT_TEMPLATE, DEFAULT_ORG_NAME,
} from '../../utils/pendingReminder';

interface SettingsModalProps {
  initialTemplate: string;
  initialOrgName: string;
  pendingNames: string[];
  customerName?: string;
  onClose: () => void;
  onSaved: () => void;
}

export function ReminderSettingsModal({ initialTemplate, initialOrgName, pendingNames, customerName, onClose, onSaved }: SettingsModalProps) {
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
