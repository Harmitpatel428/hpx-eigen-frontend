import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Copy } from 'lucide-react';
import { Modal } from '../Modal';
import { crmSettingsService } from '../../services/crm-settings.service';
import {
  buildPendingNames, formatReminderMessage,
  DEFAULT_TEMPLATE, DEFAULT_ORG_NAME,
} from '../../utils/pendingReminder';
import type { DocCaseDocument } from '../../types';

interface Props {
  documents: DocCaseDocument[] | undefined;
  customerName?: string;
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

export default function PendingReminderButton({ documents, customerName }: Props) {
  const { data: settings } = useQuery({
    queryKey: ['crm-settings'],
    queryFn: () => crmSettingsService.get(),
  });

  const pendingNames = useMemo(() => buildPendingNames(documents), [documents]);
  const pendingCount = pendingNames.length;
  const template = settings?.pendingReminderTemplate ?? DEFAULT_TEMPLATE;
  const orgName = settings?.pendingReminderOrgName ?? DEFAULT_ORG_NAME;

  const [fallbackText, setFallbackText] = useState<string | null>(null);

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
    <>
      <button
        className="btn btn-ghost"
        style={{ height: 28, paddingInline: 12, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, opacity: pendingCount === 0 ? 0.5 : 1 }}
        onClick={handleCopy}
        disabled={pendingCount === 0}
        title={pendingCount === 0 ? 'No pending documents' : 'Copy a WhatsApp reminder for pending documents'}
      >
        <Copy size={13} /> Copy Pending Documents
      </button>

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
    </>
  );
}
