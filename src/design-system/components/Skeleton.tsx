import type { CSSProperties } from 'react';
import { cx } from '../cx';

/**
 * Addition for the MVP (not in bundle.js): loading placeholders, so every
 * screen shows the same loading state while the fake API resolves.
 */
export interface SkeletonProps {
  /** CSS width, e.g. `120` or `'60%'`. Defaults to 100%. */
  width?: number | string;
  /** CSS height. Defaults to one line of text. */
  height?: number | string;
  className?: string;
  style?: CSSProperties;
}

export function Skeleton({ width, height, className, style }: SkeletonProps) {
  return <span className={cx('tl-skeleton', className)} aria-hidden="true" style={{ width, height, ...style }} />;
}

export interface SpinnerProps {
  /** Visible text next to the spinner, also the accessible name. */
  label?: string;
  className?: string;
}

export function Spinner({ label = 'Loading…', className }: SpinnerProps) {
  return (
    <span className={cx('tl-spinner', className)} role="status">
      <span className="tl-spinner-ring" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
