import { memo } from 'react';

const MAX_CHARS = 500;

interface NoteCharacterCounterProps {
  length: number;
  className?: string;
  style?: React.CSSProperties;
}

export const NoteCharacterCounter = memo(function NoteCharacterCounter({
  length,
  className = '',
  style = {},
}: NoteCharacterCounterProps) {
  const isNearLimit = length > 450;
  const isAtLimit = length >= MAX_CHARS;

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: '12px',
        fontWeight: 500,
        ...style,
      }}
    >
      <span
        style={{
          color: isAtLimit ? '#dc2626' : isNearLimit ? '#ea580c' : '#94a3b8',
          transition: 'color 0.15s',
        }}
      >
        {length}
      </span>
      <span style={{ color: '#cbd5e1' }}>/ {MAX_CHARS}</span>
    </div>
  );
});
