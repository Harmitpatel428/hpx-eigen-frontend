import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus, Filter, ArrowRight } from 'lucide-react';
import type { Opportunity } from '../types';
import { opportunityService } from '../services/opportunity.service';

const STAGES = ['PROSPECTING','QUALIFICATION','PROPOSAL','NEGOTIATION','CLOSED_WON','CLOSED_LOST'];

function formatCurrency(v: string|number) {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (n >= 10_000_000) return `₹${(n/10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000)    return `₹${(n/100_000).toFixed(1)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

export function OpportunitiesPage() {
  const [search, setSearch] = useState('');

  const { data: opportunities = [], isLoading } = useQuery<Opportunity[]>({
    queryKey: ['opportunities'],
    queryFn: () => opportunityService.findAll(),
  });

  const activeOpps = opportunities.filter(o => !['CLOSED_LOST'].includes(o.stage));
  const BOARD_STAGES = STAGES.filter(s => s !== 'CLOSED_LOST');

  return (
    <div className="workspace-bleed">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-8)', padding: '0 var(--space-16)' }}>
        <div>
          <h1 className="type-title" style={{ marginBottom: 'var(--space-2)' }}>Pipeline</h1>
          <p className="type-body">{activeOpps.length} active opportunities</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button className="btn btn-secondary">
            <Filter size={16} /> Filters
          </button>
          <button className="btn btn-primary">
            <Plus size={16} /> New Deal
          </button>
        </div>
      </div>

      <div style={{ padding: '0 var(--space-16)', marginBottom: 'var(--space-12)' }}>
        <div style={{ position: 'relative', width: 400 }}>
          <Search size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input 
            className="input" 
            placeholder="Search deals..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 44, height: 48, backgroundColor: 'transparent', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-full)' }} 
          />
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: 'var(--space-12)', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading pipeline...</div>
      ) : (
        <div style={{ display: 'flex', gap: 'var(--space-6)', overflowX: 'auto', padding: '0 var(--space-16) var(--space-16)', flex: 1 }}>
          {BOARD_STAGES.map((stage) => {
            const inStage = activeOpps.filter(o => o.stage === stage && (o.title.toLowerCase().includes(search.toLowerCase()) || (o.lead?.company || '').toLowerCase().includes(search.toLowerCase())));
            const total = inStage.reduce((s, o) => s + parseFloat(o.value || '0'), 0);
            return (
              <div key={stage} style={{ width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
                  <span className="type-h2" style={{ fontSize: 18 }}>{stage.replace('_', ' ')}</span>
                  <span className="type-ui" style={{ color: 'var(--text-tertiary)' }}>{inStage.length}</span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {inStage.map(opp => (
                    <div key={opp.id} className="surface" style={{ padding: 'var(--space-5)', cursor: 'grab', position: 'relative', transition: 'all var(--transition-fast)' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-strong)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-light)'}>
                      <div className="type-h2" style={{ fontSize: 15, marginBottom: 'var(--space-1)' }}>{opp.title}</div>
                      <div className="type-ui" style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--space-4)' }}>
                        {opp.lead?.company || `${opp.lead?.firstName} ${opp.lead?.lastName}`}
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="type-ui" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(opp.value)}</span>
                        {opp.expectedCloseDate && (
                           <span className="type-micro" style={{ color: 'var(--text-tertiary)' }}>
                             {new Date(opp.expectedCloseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                           </span>
                        )}
                      </div>
                      
                      <div style={{ position: 'absolute', top: 'var(--space-5)', right: 'var(--space-5)', opacity: 0, transition: 'opacity var(--transition-fast)' }} className="hover-arrow">
                        <ArrowRight size={14} className="text-tertiary" />
                      </div>
                    </div>
                  ))}
                  
                  {inStage.length === 0 && (
                    <div style={{ padding: 'var(--space-4)', border: '1px dashed var(--border-medium)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                      <span className="type-ui" style={{ color: 'var(--text-tertiary)' }}>No deals in this stage</span>
                    </div>
                  )}
                </div>
                
                <div style={{ marginTop: 'var(--space-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-light)', paddingTop: 'var(--space-4)' }}>
                  <span className="type-micro">Total Value</span>
                  <span className="type-ui" style={{ fontWeight: 500 }}>{formatCurrency(total)}</span>
                </div>
              </div>
            );
          })}
          <style>{`
            .surface:hover .hover-arrow { opacity: 1 !important; }
          `}</style>
        </div>
      )}
    </div>
  );
}
