/**
 * Official HPX EIGEN brand marks — single source of truth.
 *
 * These render the EXACT approved artwork, extracted pixel-for-pixel from the
 * supplied brand board (public/brand/hpx-mark.* and hpx-lockup.*). They are the
 * original asset used verbatim — not redrawn, recoloured, or re-typeset.
 *
 *   MARK   139×150  — icon only (sidebar, portal, favicon, loaders, app icons)
 *   LOCKUP 462×102  — mark + "HPX EIGEN" wordmark (full brand-identity contexts)
 *
 * The artwork is dark-ink, designed for light backgrounds. On a dark surface the
 * LOCKUP must sit on a light plate (no inverse artwork was supplied); the MARK's
 * blue/white reads directly.
 */
import type { CSSProperties } from 'react';

const MARK_SRC = '/brand/hpx-mark.png';
const LOCKUP_SRC = '/brand/hpx-lockup.png';
const MARK_RATIO = 150 / 139;   // height / width
const LOCKUP_RATIO = 462 / 102; // width / height

export interface HpxMarkProps {
  /** Rendered width in px. */
  size?: number;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

export function HpxMark({ size = 24, className, style, title = 'HPX EIGEN' }: HpxMarkProps) {
  return (
    <img
      src={MARK_SRC}
      width={size}
      height={Math.round(size * MARK_RATIO)}
      alt={title}
      className={className}
      style={{ display: 'block', flexShrink: 0, ...style }}
    />
  );
}

export interface HpxLockupProps {
  /** Rendered height in px (width follows the artwork's aspect ratio). */
  height?: number;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

export function HpxLockup({ height = 32, className, style, title = 'HPX EIGEN' }: HpxLockupProps) {
  return (
    <img
      src={LOCKUP_SRC}
      height={height}
      width={Math.round(height * LOCKUP_RATIO)}
      alt={title}
      className={className}
      style={{ display: 'block', ...style }}
    />
  );
}
