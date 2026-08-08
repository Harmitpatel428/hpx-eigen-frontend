import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, RotateCcw, AlertTriangle, X, Search } from 'lucide-react';
import type { Lead } from '../types';
import { leadService } from '../services/lead.service';

const STAGE_LABELS: Record<string, string> = {
  NEW: 'New', CONTACTED: 'Contacted', QUALIFIED: 'Qualified',
  DISQUALIFIED: 'Disqualified', CONVERTED: 'Converted',
};

export function RecycleBinPage() {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<'restore' | 'permanent-delete' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: response, isLoading } = useQuery({
    queryKey: ['leads-deleted'],
    queryFn: () => leadService.listDeleted(1, 200),
    staleTime: 15_000,
  });

  const leads: Lead[] = response?.data ?? [];
  const filtered = searchQuery
    ? leads.filter(l => `${l.firstName} ${l.lastName} ${l.company ?? ''} ${l.email ?? ''}`.toLowerCase().includes(searchQuery.toLowerCase()))
    : leads;

  const restoreMutation = useMutation({
    mutationFn: (ids: string[]) => ids.length === 1 ? leadService.restoreLead(ids[0]).then(() => ({ count: 1 })) : leadService.bulkRestore(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads-deleted'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setSelectedIds(new Set());
      setConfirmAction(null);
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => ids.length === 1 ? leadService.permanentDelete(ids[0]).then(() => ({ count: 1 })) : leadService.bulkPermanentDelete(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads-deleted'] });
      setSelectedIds(new Set());
      setConfirmAction(null);
    },
  });

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(l => l.id)));
  }, [filtered]);

  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;
  const isPending = restoreMutation.isPending || permanentDeleteMutation.isPending;

  const handleConfirm = () => {
    const ids = [...selectedIds];
    if (confirmAction === 'restore') restoreMutation.mutate(ids);
    else if (confirmAction === 'permanent-delete') permanentDeleteMutation.mutate(ids);
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="type-title">Recycle Bin</h1>
          <p className="type-body">
            {isLoading ? 'Loading…' : `${leads.length} deleted lead${leads.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div style={{ position: 'relative', width: 240 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input className="input" placeholder="Search deleted leads…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ paddingLeft: 30, height: 28, fontSize: 13, backgroundColor: 'transparent', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)' }} />
        </div>
      </div>

      {/* BULK ACTIONS */}
      {selectedIds.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', marginBottom: 12, background: 'var(--bg-muted)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)', fontSize: 13 }}>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedIds.size} selected</span>
          <div style={{ width: 1, height: 16, background: 'var(--border-medium)' }} />
          <button className="btn-ghost" style={{ height: 26, padding: '0 10px', fontSize: 12, color: '#059669' }} onClick={() => setConfirmAction('restore')}>
            <RotateCcw size={12} style={{ marginRight: 4 }} /> Restore
          </button>
          <button className="btn-ghost" style={{ height: 26, padding: '0 10px', fontSize: 12, color: '#dc2626' }} onClick={() => setConfirmAction('permanent-delete')}>
            <Trash2 size={12} style={{ marginRight: 4 }} /> Delete Permanently
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn-ghost" style={{ height: 26, padding: '0 10px', fontSize: 12, color: 'var(--text-tertiary)' }} onClick={() => setSelectedIds(new Set())}>
            <X size={12} style={{ marginRight: 4 }} /> Clear
          </button>
        </div>
      )}

      {/* TABLE */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {isLoading ? (
          <div className="type-ui" style={{ color: 'var(--text-tertiary)', padding: 'var(--space-4)' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
            <Trash2 size={32} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
            <p style={{ marginBottom: '0.5rem', fontWeight: 500 }}>{leads.length === 0 ? 'Recycle Bin is empty' : 'No matches'}</p>
            <p style={{ fontSize: 13 }}>{leads.length === 0 ? 'Deleted leads will appear here' : 'Try a different search'}</p>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '32px minmax(160px,1fr) 130px 170px 80px 110px 130px', gap: 10, padding: '7px 12px', borderBottom: '1px solid var(--border-strong)', position: 'sticky', top: 0, backgroundColor: 'var(--bg-app)', zIndex: 10, fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} style={{ width: 14, height: 14, accentColor: '#0f172a', cursor: 'pointer' }} aria-label="Select all" />
              </div>
              <div>Lead</div><div>Company</div><div>Email</div><div>Stage</div><div>Deleted On</div><div>Actions</div>
            </div>

            {/* Rows */}
            {filtered.map(lead => {
              const isChecked = selectedIds.has(lead.id);
              return (
                <div key={lead.id} style={{ display: 'grid', gridTemplateColumns: '32px minmax(160px,1fr) 130px 170px 80px 110px 130px', gap: 10, padding: '7px 12px', borderBottom: '1px solid var(--border-light)', fontSize: 13, alignItems: 'center', background: isChecked ? 'rgba(99,102,241,0.04)' : undefined }}>

                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <input type="checkbox" checked={isChecked} onChange={() => toggleSelect(lead.id)} style={{ width: 14, height: 14, accentColor: '#0f172a', cursor: 'pointer' }} aria-label={`Select ${lead.firstName} ${lead.lastName}`} />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '4px', background: 'linear-gradient(135deg,#64748b 0%,#94a3b8 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0, opacity: 0.7 }}>
                      {lead.firstName[0]}{lead.lastName[0]}
                    </div>
                    <span style={{ fontWeight: 500, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', color: 'var(--text-secondary)' }}>{lead.firstName} {lead.lastName}</span>
                  </div>

                  <div style={{ color: 'var(--text-tertiary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', fontSize: 12 }}>
                    {lead.company || '—'}
                  </div>

                  <div style={{ color: 'var(--text-tertiary)', fontSize: 12, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {lead.email || '—'}
                  </div>

                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                    {STAGE_LABELS[lead.stage ?? 'NEW'] ?? lead.stage}
                  </div>

                  <div style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>
                    {lead.updatedAt ? fmtDate(lead.updatedAt) : '—'}
                  </div>

                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn-ghost" style={{ height: 24, padding: '0 8px', fontSize: 11, color: '#059669' }} onClick={() => { setSelectedIds(new Set([lead.id])); setConfirmAction('restore'); }} title="Restore">
                      <RotateCcw size={11} style={{ marginRight: 3 }} /> Restore
                    </button>
                    <button className="btn-ghost" style={{ height: 24, padding: '0 8px', fontSize: 11, color: '#dc2626' }} onClick={() => { setSelectedIds(new Set([lead.id])); setConfirmAction('permanent-delete'); }} title="Delete permanently">
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CONFIRMATION DIALOG */}
      {confirmAction && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'relative', zIndex: 1, background: '#fff', borderRadius: '0.875rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)', padding: '1.5rem', width: '100%', maxWidth: '400px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.625rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: confirmAction === 'restore' ? 'rgba(5,150,105,0.1)' : 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {confirmAction === 'restore' ? <RotateCcw size={16} color="#059669" /> : <AlertTriangle size={16} color="#dc2626" />}
              </div>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' }}>
                {confirmAction === 'restore' ? `Restore ${selectedIds.size} Lead${selectedIds.size !== 1 ? 's' : ''}` : `Permanently Delete ${selectedIds.size} Lead${selectedIds.size !== 1 ? 's' : ''}`}
              </h3>
            </div>
            <p style={{ fontSize: '0.8125rem', color: '#475569', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              {confirmAction === 'restore'
                ? `${selectedIds.size} lead${selectedIds.size !== 1 ? 's' : ''} will be restored to the active leads list.`
                : `${selectedIds.size} lead${selectedIds.size !== 1 ? 's' : ''} will be permanently deleted. This action cannot be undone.`
              }
            </p>
            <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmAction(null)} style={{ padding: '0.4375rem 1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleConfirm} disabled={isPending} style={{
                padding: '0.4375rem 1rem', borderRadius: '0.5rem', border: 'none', fontSize: '0.8125rem', fontWeight: 600, cursor: isPending ? 'not-allowed' : 'pointer',
                background: confirmAction === 'restore' ? (isPending ? '#059669aa' : '#059669') : (isPending ? '#ef4444aa' : '#dc2626'),
                color: '#fff',
              }}>
                {isPending ? 'Processing…' : confirmAction === 'restore' ? 'Restore' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
