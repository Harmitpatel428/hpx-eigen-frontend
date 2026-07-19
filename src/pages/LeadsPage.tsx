import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus, ListFilter, ArrowDownToLine, ArrowUpFromLine, Sparkles, Phone, Mail, MessageCircle, Calendar } from 'lucide-react';
import type { Lead } from '../types';
import { leadService } from '../services/lead.service';
import { ContextPanel } from '../components/layout/ContextPanel';

export function LeadsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ['leads'],
    queryFn: () => leadService.findAll(),
  });

  const filteredLeads = leads.filter(l => 
    (l.firstName + ' ' + l.lastName + ' ' + (l.company || '')).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      
      {/* ─── ULTRA-COMPACT HEADER & TOOLBAR (< 64px) ────────────────────────── */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        paddingBottom: 'var(--space-3)', 
        borderBottom: '1px solid var(--border-light)',
        marginBottom: 'var(--space-3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <h1 className="type-h1" style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Leads</h1>
          <div style={{ width: 1, height: 16, backgroundColor: 'var(--border-medium)' }} />
          <div className="type-ui" style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', gap: 'var(--space-3)' }}>
            <span><strong style={{ color: 'var(--text-primary)' }}>{filteredLeads.length}</strong> Records</span>
            <span><strong style={{ color: 'var(--text-primary)' }}>$1.2M</strong> Pipeline</span>
            <span><strong style={{ color: 'var(--color-success)' }}>24%</strong> Conversion</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <div style={{ position: 'relative', width: 240 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input 
              className="input" 
              placeholder="Search leads..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 30, height: 28, fontSize: 13, backgroundColor: 'transparent', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)' }} 
            />
          </div>
          
          <button className="btn-ghost" style={{ height: 28, padding: '0 8px', fontSize: 13, color: 'var(--text-secondary)' }}>
            <ListFilter size={14} style={{ marginRight: 4 }} /> Filters
          </button>
          
          <button className="btn-ghost" style={{ height: 28, padding: '0 8px', fontSize: 13, color: 'var(--text-secondary)' }}>
            <ArrowDownToLine size={14} style={{ marginRight: 4 }} /> Import
          </button>
          
          <button className="btn-ghost" style={{ height: 28, padding: '0 8px', fontSize: 13, color: 'var(--text-secondary)' }}>
            <ArrowUpFromLine size={14} style={{ marginRight: 4 }} /> Export
          </button>
          
          <div style={{ width: 1, height: 16, backgroundColor: 'var(--border-medium)', margin: '0 4px' }} />
          
          <button className="btn btn-primary" style={{ height: 28, padding: '0 12px', fontSize: 13, borderRadius: 'var(--radius-sm)' }}>
            <Plus size={14} style={{ marginRight: 4 }} /> New
          </button>
        </div>
      </div>

      {/* ─── HYPER-DENSE DATA GRID ───────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'auto', marginRight: 'calc(var(--space-4) * -1)', paddingRight: 'var(--space-4)' }}>
        {isLoading ? (
          <div className="type-ui" style={{ color: 'var(--text-tertiary)', padding: 'var(--space-4)' }}>Loading...</div>
        ) : (
          <div style={{ minWidth: 1600 }}> {/* Force wide container for density */}
            
            {/* Table Header */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'minmax(200px, 1fr) 140px 180px 100px 90px 100px 100px 100px 120px 100px 140px minmax(200px, 1.5fr)', 
              gap: 12, 
              padding: '8px 12px', 
              borderBottom: '1px solid var(--border-strong)',
              position: 'sticky', 
              top: 0, 
              backgroundColor: 'var(--bg-app)', 
              zIndex: 10,
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.02em'
            }}>
              <div>Lead</div>
              <div>Company / Title</div>
              <div>Contact</div>
              <div>Location</div>
              <div>Score</div>
              <div>Stage</div>
              <div>Status</div>
              <div>Value</div>
              <div>Owner</div>
              <div>Next Step</div>
              <div>Last Activity</div>
              <div>AI Insight & Notes</div>
            </div>

            {/* Table Body */}
            <div>
              {filteredLeads.map(lead => {
                // Mock data for high density display
                const score = Math.floor(Math.random() * 30 + 70);
                const title = "VP of Sales";
                const location = "San Francisco, CA";
                const stage = "Qualified";
                const value = "$45,000";
                const nextStep = "Demo call tmrw";
                const insight = "High intent; discussed enterprise features.";

                return (
                  <div 
                    key={lead.id}
                    className="dense-row"
                    onClick={() => setSelectedLead(lead)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(200px, 1fr) 140px 180px 100px 90px 100px 100px 100px 120px 100px 140px minmax(200px, 1.5fr)', 
                      gap: 12,
                      padding: '8px 12px',
                      borderBottom: '1px solid var(--border-light)',
                      fontSize: 13,
                      alignItems: 'center',
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                  >
                    {/* 1. Lead */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                      <div style={{ width: 20, height: 20, borderRadius: '2px', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, flexShrink: 0 }}>
                        {lead.firstName[0]}{lead.lastName[0]}
                      </div>
                      <span style={{ fontWeight: 500, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{lead.firstName} {lead.lastName}</span>
                    </div>

                    {/* 2. Company / Title */}
                    <div style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      <div style={{ color: 'var(--text-primary)' }}>{lead.company || '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{title}</div>
                    </div>

                    {/* 3. Contact */}
                    <div style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      <div style={{ color: 'var(--text-secondary)' }}>{lead.email || '—'}</div>
                      {lead.phone && <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{lead.phone}</div>}
                    </div>

                    {/* 4. Location */}
                    <div style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{location}</div>

                    {/* 5. Score */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: score > 85 ? 'var(--color-success)' : score > 75 ? 'var(--color-warning)' : 'var(--text-tertiary)' }} />
                      <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{score}</span>
                    </div>

                    {/* 6. Stage */}
                    <div style={{ color: 'var(--text-secondary)' }}>{stage}</div>

                    {/* 7. Status */}
                    <div>
                      <span style={{ display: 'inline-block', padding: '2px 6px', backgroundColor: lead.status === 'NEW' ? 'var(--color-info)' : 'var(--bg-subtle)', color: lead.status === 'NEW' ? '#fff' : 'var(--text-secondary)', borderRadius: 2, fontSize: 11, fontWeight: 500 }}>
                        {lead.status}
                      </span>
                    </div>

                    {/* 8. Value */}
                    <div style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: 12 }}>{value}</div>

                    {/* 9. Owner */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: 'var(--border-medium)', flexShrink: 0 }} />
                      <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Admin User</span>
                    </div>

                    {/* 10. Next Step */}
                    <div style={{ color: 'var(--text-secondary)', fontSize: 12, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{nextStep}</div>

                    {/* 11. Last Activity */}
                    <div style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </div>

                    {/* 12. AI Insight & Notes */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                      <Sparkles size={12} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
                      <span style={{ color: 'var(--text-secondary)', fontSize: 12, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{insight}</span>
                    </div>

                    {/* Hover Actions (Inline) */}
                    <div className="row-actions" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 2, backgroundColor: 'var(--bg-app)', padding: 2, borderRadius: 4, border: '1px solid var(--border-medium)', opacity: 0, pointerEvents: 'none' }}>
                      <button className="btn-ghost" style={{ width: 24, height: 24, padding: 0 }} onClick={e => e.stopPropagation()}><Phone size={12} /></button>
                      <button className="btn-ghost" style={{ width: 24, height: 24, padding: 0 }} onClick={e => e.stopPropagation()}><Mail size={12} /></button>
                      <button className="btn-ghost" style={{ width: 24, height: 24, padding: 0 }} onClick={e => e.stopPropagation()}><MessageCircle size={12} /></button>
                      <button className="btn-ghost" style={{ width: 24, height: 24, padding: 0 }} onClick={e => e.stopPropagation()}><Calendar size={12} /></button>
                    </div>
                  </div>
                );
              })}
              
              <style>{`
                .dense-row:hover { background-color: var(--bg-hover) !important; }
                .dense-row:hover .row-actions { opacity: 1 !important; pointer-events: auto !important; }
              `}</style>
            </div>
          </div>
        )}
      </div>

      {/* ─── CONTEXT PANEL ───────────────────────────────────────────────────── */}
      <ContextPanel isOpen={!!selectedLead} onClose={() => setSelectedLead(null)} width={600}>
        {selectedLead && (
          <div style={{ padding: 'var(--space-6)' }}>
            <h2 className="type-h1" style={{ fontSize: 20, marginBottom: 4 }}>{selectedLead.firstName} {selectedLead.lastName}</h2>
            <div className="type-ui" style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>{selectedLead.company}</div>
            
            <div className="type-ui" style={{ color: 'var(--text-tertiary)' }}>
              (Context panel content will be deeply embedded here in Phase 4)
            </div>
          </div>
        )}
      </ContextPanel>
    </div>
  );
}
