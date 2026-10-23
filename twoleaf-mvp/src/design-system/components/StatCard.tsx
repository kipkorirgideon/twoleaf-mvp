import type { ReactNode } from 'react';
import { cx } from '../cx';
import { Card } from './Card';

export interface StatCardProps {
  label: string;
  value: ReactNode;
  unit?: string;
  /** Percent change. Positive shows a green up arrow, negative a red down arrow. */
  delta?: number;
  deltaLabel?: string;
  className?: string;
}

export function StatCard({ label, value, unit, delta, deltaLabel, className }: StatCardProps) {
  const dir = delta == null ? null : delta >= 0 ? 'up' : 'down';
  return (
    <Card className={cx('tl-stat', className)}>
      <span className="tl-stat-label">{label}</span>
      <span className="tl-stat-value">
        {value}
        {unit ? <span className="tl-stat-unit">{unit}</span> : null}
      </span>
      {dir && delta != null ? (
        <span className="tl-stat-delta">
          <b className={dir === 'up' ? 'tl-up' : 'tl-down'}>{(delta >= 0 ? '▲ +' : '▼ ') + delta + '%'}</b> {deltaLabel || 'vs last month'}
        </span>
      ) : null}
    </Card>
  );
}
