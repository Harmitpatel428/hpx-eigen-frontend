import { MessageCircle } from 'lucide-react';
import type { LeadContact } from '../../../services/lead-contacts.service';
import { Section, avatarGradient, whatsappUrl } from './shared';

// Presentational — the host renders this only when contacts.length > 0 and owns
// any surrounding divider. Card markup is byte-identical to the former inline block.
export function LeadAllContactsSection({ contacts }: { contacts: LeadContact[] }) {
  return (
    <Section label={`All Contacts (${contacts.length})`} delay={70}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {contacts.map(c => (
          <div key={c.id} className="ldp-card" style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 10,
            border: '1px solid var(--border-light)',
            background: 'var(--bg-subtle)',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              background: avatarGradient(`${c.firstName} ${c.lastName}`),
              color: '#fff', fontSize: 9, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {c.firstName?.[0] ?? '?'}{c.lastName?.[0] ?? ''}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <span style={{
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {c.firstName} {c.lastName}
                </span>
                {c.isMain && (
                  <span style={{
                    fontSize: 8, color: '#fff', background: 'var(--text-secondary)',
                    padding: '1px 6px', borderRadius: 3, flexShrink: 0,
                    fontWeight: 700, letterSpacing: '0.05em',
                  }}>
                    PRIMARY
                  </span>
                )}
              </div>
              <div style={{
                fontSize: 11, color: 'var(--text-tertiary)',
                display: 'flex', gap: 8, marginTop: 2, flexWrap: 'wrap',
              }}>
                {/* Suppress a role that just restates "primary" — the PRIMARY
                    badge already conveys that, and showing it on several
                    contacts was the confusing duplicate (audit S-09). */}
                {c.role && !/^primary(\s+contact)?$/i.test(c.role.trim()) && <span>{c.role}</span>}
                {c.email && <span style={{ opacity: 0.8 }}>{c.email}</span>}
                {c.phone && <span style={{ opacity: 0.8 }}>{c.phone}</span>}
              </div>
            </div>
            {c.phone && (
              <button
                className="ldp-act ldp-wa"
                onClick={() => { window.open(whatsappUrl(c.phone!), 'crm_whatsapp'); }}
                aria-label={`WhatsApp ${c.firstName}`}
                style={{
                  width: 30, height: 30, border: '1px solid rgba(34,197,94,0.2)',
                  background: 'rgba(34,197,94,0.05)', color: '#16a34a',
                  borderRadius: 8, cursor: 'pointer', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <MessageCircle size={13} />
              </button>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}
