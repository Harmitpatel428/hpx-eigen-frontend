import { useState, useEffect, useRef, useMemo } from 'react';

// Formatters are expensive to construct — reuse them across renders.
const timeFmt = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit', minute: '2-digit', hour12: true,
});
const dayFmt = new Intl.DateTimeFormat(undefined, {
  weekday: 'short', month: 'short', day: 'numeric',
});
const tzFmt = new Intl.DateTimeFormat(undefined, {
  timeZoneName: 'short',
});

function extractTz(): string {
  try {
    const parts = tzFmt.formatToParts(new Date());
    return parts.find(p => p.type === 'timeZoneName')?.value ?? '';
  } catch { return ''; }
}

function formatTime(d: Date): string {
  return timeFmt.format(d);
}

function formatDay(d: Date): string {
  return dayFmt.format(d);
}

export function HeaderTimeStat() {
  const [now, setNow] = useState(() => new Date());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Sync to the start of the next minute for clean rollover
    const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    const timeout = setTimeout(() => {
      setNow(new Date());
      intervalRef.current = setInterval(() => setNow(new Date()), 60_000);
    }, msUntilNextMinute);

    return () => {
      clearTimeout(timeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const time = formatTime(now);
  const day = formatDay(now);
  const tz = useMemo(extractTz, []);

  // Split time into numeric part and period for differential styling
  const spaceIdx = time.lastIndexOf(' ');
  const timePart = spaceIdx > 0 ? time.slice(0, spaceIdx) : time;
  const period = spaceIdx > 0 ? time.slice(spaceIdx + 1) : '';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: 1,
        userSelect: 'none',
        cursor: 'default',
        padding: '0 16px 0 12px',
        borderRight: '1px solid var(--border-light)',
        height: 34,
      }}
      title={`${day} · ${time} ${tz}`}
      aria-label={`Current time: ${time}, ${day}`}
    >
      {/* Time — hero line */}
      <div style={{
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--text-primary)',
        lineHeight: 1,
        letterSpacing: '-0.01em',
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
      }}>
        {timePart}
        {period && (
          <span style={{
            fontSize: 9,
            fontWeight: 600,
            color: 'var(--text-tertiary)',
            marginLeft: 3,
            letterSpacing: '0.04em',
          }}>
            {period}
          </span>
        )}
      </div>

      {/* Day/date — secondary line */}
      <div style={{
        fontSize: 10,
        fontWeight: 500,
        color: 'var(--text-tertiary)',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        letterSpacing: '0.01em',
      }}>
        {day}
      </div>
    </div>
  );
}
