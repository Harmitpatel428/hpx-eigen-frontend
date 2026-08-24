import { useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import type { Lead } from '../../types';

// Shared soft-delete confirmation used by LeadsPage and ActivitiesPage.
interface DeleteConfirmProps {
  lead: Lead;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

export function DeleteConfirm({ lead, onConfirm, onCancel, isDeleting }: DeleteConfirmProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }} />
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
