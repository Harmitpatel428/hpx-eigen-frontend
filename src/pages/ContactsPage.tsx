import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus, ListFilter, ArrowDownToLine, ArrowUpFromLine, ExternalLink } from 'lucide-react';
import type { Contact } from '../types';
import { contactService } from '../services/contact.service';
import { ContextPanel } from '../components/layout/ContextPanel';

export function ContactsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ['contacts'],
    queryFn: () => contactService.findAll(),
  });

  const filtered = contacts.filter(c => {
    const q = searchQuery.toLowerCase();
    return !q || `${c.firstName} ${c.lastName} ${c.company ?? ''} ${c.email ?? ''}`.toLowerCase().includes(q);
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex flex-col gap-1">
          <h1 className="type-title">Contacts</h1>
          <p className="type-body">{filtered.length} People</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <div style={{ position: 'relative', width: 240 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input 
              className="input" 
              placeholder="Search by name, role..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 30, height: 28, fontSize: 13, backgroundColor: 'transparent', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)' }} 
            />
          </div>
          
          <button className="btn-ghost" style={{ height: 28, padding: '0 8px', fontSize: 13, color: 'var(--text-secondary)' }}>
            <ListFilter size={14} style={{ marginRight: 4 }} /> Segment: All
          </button>
          
          <button className="btn-ghost" style={{ height: 28, padding: '0 8px', fontSize: 13, color: 'var(--text-secondary)' }}>
            <ArrowDownToLine size={14} style={{ marginRight: 4 }} /> Import
          </button>
          
          <button className="btn-ghost" style={{ height: 28, padding: '0 8px', fontSize: 13, color: 'var(--text-secondary)' }}>
            <ArrowUpFromLine size={14} style={{ marginRight: 4 }} /> Export
          </button>
          
          <div style={{ width: 1, height: 16, backgroundColor: 'var(--border-medium)', margin: '0 4px' }} />
          
          <button className="btn btn-primary" style={{ height: 28, padding: '0 12px', fontSize: 13, borderRadius: 'var(--radius-sm)' }}>
            <Plus size={14} style={{ marginRight: 4 }} /> Person
          </button>
        </div>
      </div>

      {/* ─── HYPER-DENSE DATA GRID ───────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'auto', marginRight: 'calc(var(--space-4) * -1)', paddingRight: 'var(--space-4)' }}>
        {isLoading ? (
          <div className="type-ui" style={{ color: 'var(--text-tertiary)', padding: 'var(--space-4)' }}>Loading directory...</div>
        ) : (
          <div style={{ minWidth: 1400 }}> 
            
            {/* Table Header */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'minmax(200px, 1.5fr) 200px 200px 140px 100px 120px 140px minmax(200px, 1.5fr)', 
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
              <div>Contact</div>
              <div>Role / Department</div>
              <div>Company</div>
              <div>Communication</div>
              <div>Health</div>
              <div>LTV</div>
              <div>Owner</div>
              <div>Recent Activity</div>
            </div>

            {/* Table Body */}
            <div>
              {filtered.map(contact => {
                const healthScore = Math.floor(Math.random() * 20 + 80);
                const lifetimeValue = Math.floor(Math.random() * 500000 + 50000);
                const role = contact.title || "Director";
                const dept = "Operations";
                const activity = "Email sent today";

                return (
                  <div 
                    key={contact.id}
                    className="dense-row"
                    onClick={() => setSelectedContact(contact)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(200px, 1.5fr) 200px 200px 140px 100px 120px 140px minmax(200px, 1.5fr)', 
                      gap: 12,
                      padding: '8px 12px',
                      borderBottom: '1px solid var(--border-light)',
                      fontSize: 13,
                      alignItems: 'center',
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                  >
                    {/* 1. Contact */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, flexShrink: 0, border: '1px solid var(--border-medium)' }}>
                        {contact.firstName[0]}{contact.lastName[0]}
                      </div>
                      <span style={{ fontWeight: 500, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{contact.firstName} {contact.lastName}</span>
                    </div>

                    {/* 2. Role / Dept */}
                    <div style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      <div style={{ color: 'var(--text-primary)' }}>{role}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{dept}</div>
                    </div>

                    {/* 3. Company */}
                    <div style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {contact.company || '—'}
                    </div>

                    {/* 4. Communication */}
                    <div style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      <div style={{ color: 'var(--text-secondary)' }}>{contact.email || '—'}</div>
                      {contact.phone && <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{contact.phone}</div>}
                    </div>

                    {/* 5. Health */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: healthScore > 90 ? 'var(--color-success)' : 'var(--color-info)' }} />
                      <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{healthScore}%</span>
                    </div>

                    {/* 6. LTV */}
                    <div style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: 12 }}>
                      ${lifetimeValue.toLocaleString()}
                    </div>

                    {/* 7. Owner */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: 'var(--border-medium)', flexShrink: 0 }} />
                      <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Admin User</span>
                    </div>

                    {/* 8. Recent Activity */}
                    <div style={{ color: 'var(--text-tertiary)', fontSize: 12, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {activity}
                    </div>

                    {/* Hover Actions (Inline) */}
                    <div className="row-actions" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 2, backgroundColor: 'var(--bg-app)', padding: 2, borderRadius: 4, border: '1px solid var(--border-medium)', opacity: 0, pointerEvents: 'none' }}>
                      <button className="btn-ghost" style={{ width: 24, height: 24, padding: 0 }} onClick={e => e.stopPropagation()}><ExternalLink size={12} /></button>
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
      <ContextPanel isOpen={!!selectedContact} onClose={() => setSelectedContact(null)} width={600}>
        {selectedContact && (
          <div style={{ padding: 'var(--space-6)' }}>
            <h2 className="type-h1" style={{ fontSize: 20, marginBottom: 4 }}>{selectedContact.firstName} {selectedContact.lastName}</h2>
            <div className="type-ui" style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
              {selectedContact.title || 'Professional'} {selectedContact.company ? `at ${selectedContact.company}` : ''}
            </div>
            
            <div className="type-ui" style={{ color: 'var(--text-tertiary)' }}>
              (Context panel content will be deeply embedded here in Phase 4)
            </div>
          </div>
        )}
      </ContextPanel>
    </div>
  );
}
