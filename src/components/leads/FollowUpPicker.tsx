import { memo, useState } from 'react';
import { Calendar, Clock, X } from 'lucide-react';

interface FollowUpPickerProps {
  followUpDate?: string | null;
  followUpTime?: string | null;
  onDateChange: (date: string | null) => void;
  onTimeChange: (time: string | null) => void;
  disabled?: boolean;
}

export const FollowUpPicker = memo(function FollowUpPicker({
  followUpDate = null,
  followUpTime = null,
  onDateChange,
  onTimeChange,
  disabled = false,
}: FollowUpPickerProps) {
  const [showClear, setShowClear] = useState(!!followUpDate || !!followUpTime);

  const handleClearFollowUp = () => {
    onDateChange(null);
    onTimeChange(null);
    setShowClear(false);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onDateChange(value || null);
    setShowClear(true);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onTimeChange(value || null);
    setShowClear(true);
  };

  const inp = 'w-full bg-slate-50 border border-slate-300 rounded-md py-2 px-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
        Follow-up (optional)
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem', alignItems: 'flex-end' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Calendar size={14} style={{ color: '#94a3b8' }} />
            <span style={{ fontSize: 11, color: '#64748b' }}>Date</span>
          </div>
          <input
            type="date"
            value={followUpDate || ''}
            onChange={handleDateChange}
            disabled={disabled}
            className={inp}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Clock size={14} style={{ color: '#94a3b8' }} />
            <span style={{ fontSize: 11, color: '#64748b' }}>Time</span>
          </div>
          <input
            type="time"
            value={followUpTime || ''}
            onChange={handleTimeChange}
            disabled={disabled}
            className={inp}
          />
        </div>

        {showClear && !disabled && (
          <button
            type="button"
            onClick={handleClearFollowUp}
            title="Clear follow-up"
            style={{
              width: 32,
              height: 32,
              borderRadius: '0.375rem',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f1f5f9';
              e.currentTarget.style.color = '#64748b';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.color = '#94a3b8';
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
});
