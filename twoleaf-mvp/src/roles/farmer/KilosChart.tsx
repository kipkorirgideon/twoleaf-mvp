/** Small 6-month kilos bar chart in plain SVG (no chart library). */
import { formatNumber } from '../../lib/format';
import { useLocalFormat, useT } from '../../lib/i18n';
import type { MonthKey } from '../../types';

export interface KilosChartProps {
  points: ReadonlyArray<{ month: MonthKey; kg: number }>;
}

const W = 320;
const H = 150;
const TOP = 20;
const BOTTOM = 22;

export function KilosChart({ points }: KilosChartProps) {
  const t = useT();
  const f = useLocalFormat();
  const max = Math.max(1, ...points.map((p) => p.kg));
  const slot = W / Math.max(1, points.length);
  const barW = Math.min(36, slot * 0.6);
  const plotH = H - TOP - BOTTOM;
  const list = points.map((p) => `${f.monthAbbr(p.month)} ${formatNumber(p.kg, 0)} kg`).join(', ');

  return (
    <svg className="kg-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('home.chartLabel', { list })}>
      <line className="kg-chart-axis" x1={0} x2={W} y1={H - BOTTOM} y2={H - BOTTOM} />
      {points.map((p, i) => {
        const h = Math.round((p.kg / max) * plotH);
        const x = i * slot + (slot - barW) / 2;
        const y = H - BOTTOM - h;
        const last = i === points.length - 1;
        return (
          <g key={p.month}>
            <rect className={last ? 'kg-chart-bar is-current' : 'kg-chart-bar'} x={x} y={y} width={barW} height={Math.max(h, 1)} rx={4} />
            <text className="kg-chart-value" x={x + barW / 2} y={y - 5} textAnchor="middle">
              {formatNumber(p.kg, 0)}
            </text>
            <text className="kg-chart-label" x={x + barW / 2} y={H - 6} textAnchor="middle">
              {f.monthAbbr(p.month)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
