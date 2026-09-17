import { Phone, Mail, MapPin, User } from 'lucide-react';
import { Section, CopyBtn } from './shared';

// Presentational — all data arrives via props; the host owns queries/mutations.
export function LeadContactInformationSection({
  fullName, contactPhone, contactEmail, locationStr, copyContactText,
}: {
  fullName: string;
  contactPhone: string | null;
  contactEmail: string | null;
  locationStr: string;
  copyContactText: string;
}) {
  return (
    <Section
      label="Contact Information"
      action={<CopyBtn text={copyContactText} tooltip="Copy contact info" />}
      delay={40}
    >
      {/* Lead name */}
      <div className="ldp-row" style={{ marginBottom: 2 }}>
        <User size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
        <span style={{
          fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {fullName}
        </span>
      </div>

      {/* Phone before Email */}
      {contactPhone ? (
        <a className="ldp-row" href={`tel:${contactPhone}`}
          style={{ color: 'var(--text-primary)' }}
        >
          <Phone className="ldp-icon" size={14}
            style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}
          />
          <span className="ldp-val" style={{ flex: 1, fontSize: 15, fontWeight: 500 }}>
            {contactPhone}
          </span>
        </a>
      ) : (
        <div className="ldp-row">
          <Phone size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0, opacity: 0.35 }} />
          <span style={{ fontSize: 13, color: 'var(--text-tertiary)', opacity: 0.5, fontStyle: 'italic' }}>
            No phone
          </span>
        </div>
      )}

      {contactEmail ? (
        <a className="ldp-row" href={`mailto:${contactEmail}`}
          style={{ color: 'var(--text-secondary)' }}
        >
          <Mail className="ldp-icon" size={14}
            style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}
          />
          <span className="ldp-val" style={{
            flex: 1, fontSize: 13,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {contactEmail}
          </span>
        </a>
      ) : (
        <div className="ldp-row">
          <Mail size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0, opacity: 0.35 }} />
          <span style={{ fontSize: 13, color: 'var(--text-tertiary)', opacity: 0.5, fontStyle: 'italic' }}>
            No email
          </span>
        </div>
      )}

      {locationStr && (
        <div className="ldp-row" style={{ alignItems: 'flex-start' }}>
          <MapPin size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {locationStr}
          </span>
        </div>
      )}
    </Section>
  );
}
