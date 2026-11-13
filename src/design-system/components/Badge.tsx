import type { ReactNode } from 'react';
import { cx } from '../cx';

export interface BadgeProps {
  tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  children?: ReactNode;
  className?: string;
}

export function Badge({ tone = 'neutral', children, className }: BadgeProps) {
  return <span className={cx('tl-badge', `tl-badge-${tone}`, className)}>{children}</span>;
}
