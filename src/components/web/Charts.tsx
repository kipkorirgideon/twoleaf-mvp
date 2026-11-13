import { formatMonthAbbr, formatMonth, formatNumber } from '../../lib/format';
import type { MonthlyFigure } from '../../types';
import './charts.css';

export interface MonthlyChartProps {
  months: MonthlyFigure[];
  /** Fine leaf target line. Default 60. */
  target?: number;
}

const W = 520;
const H = 180;
const PAD = { top: 26, right: 16, bottom: 30, left: 16 };

/** Kilos per month as bars, value-labelled. Hand-made SVG. The last month is month to date. */
export function KgBarChart({ months }: MonthlyChartProps) {
  if (months.length === 0) return <p className="body-sm text-muted">No deliveries in the last 6 months.</p>;
  const max = Math.max(1, ...months.map((m) => m.kg));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const slot = innerW / Math.max(1, months.length);
  const bw = Math.min(56, slot * 0.6);
  const summary = months.map((m) => `${formatMonth(m.month)}: ${formatNumber(m.kg)} kg`).join('; ');

  return (
    <svg className="web-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Kilos per month. ${summary}`}>
      <line className="web-chart-axis" x1={PAD.left} x2={W - PAD.right} y1={H - PAD.bottom} y2={H - PAD.bottom} />
      {months.map((m, i) => {
        const h = (m.kg / max) * innerH;
        const x = PAD.left + slot * i + (slot - bw) / 2;
        const y = H - PAD.bottom - h;
        const last = i === months.length - 1;
        return (
          <g key={m.month}>
            <rect className={last ? 'web-chart-bar web-chart-bar-partial' : 'web-chart-bar'} x={x} y={y} width={bw} height={Math.max(1, h)} rx="4" />
            <text className="web-chart-value" x={x + bw / 2} y={y - 6} textAnchor="middle">
              {formatNumber(m.kg >= 10000 ? Math.round(m.kg / 1000) : m.kg, 0)}
              {m.kg >= 10000 ? 'k' : ''}
            </text>
            <text className="web-chart-label" x={x + bw / 2} y={H - 8} textAnchor="middle">
              {formatMonthAbbr(m.month)}
              {last ? '*' : ''}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Fine leaf % per month as a line, with a dashed target line and value labels. */
export function FineLeafLineChart({ months, target = 60 }: MonthlyChartProps) {
  if (months.length === 0) return <p className="body-sm text-muted">No deliveries in the last 6 months.</p>;
  const values = months.map((m) => m.fineLeafPct);
  const lo = Math.max(0, Math.floor((Math.min(target, ...values) - 3) / 5) * 5);
  const hi = Math.min(100, Math.ceil((Math.max(target, ...values) + 3) / 5) * 5);
  const innerW = W - PAD.left - PAD.right - 48;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number): number => PAD.left + 24 + (months.length <= 1 ? innerW / 2 : (innerW * i) / (months.length - 1));
  const y = (v: number): number => PAD.top + innerH - ((v - lo) / Math.max(1, hi - lo)) * innerH;
  const points = months.map((m, i) => `${x(i)},${y(m.fineLeafPct)}`).join(' ');
  const summary = months.map((m) => `${formatMonth(m.month)}: ${formatNumber(m.fineLeafPct, 1)}%`).join('; ');

  return (
    <figure className="web-chart-fig">
      <svg className="web-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Fine leaf per month, target ${target}%. ${summary}`}>
      <line className="web-chart-target" x1={PAD.left} x2={W - PAD.right} y1={y(target)} y2={y(target)} />
      {months.length > 1 ? <polyline className="web-chart-line" points={points} /> : null}
      {months.map((m, i) => (
        <g key={m.month}>
          <circle className={m.fineLeafPct < target ? 'web-chart-dot web-chart-dot-below' : 'web-chart-dot'} cx={x(i)} cy={y(m.fineLeafPct)} r="4" />
          <text className="web-chart-value" x={x(i)} y={y(m.fineLeafPct) - 9} textAnchor="middle">
            {formatNumber(m.fineLeafPct, 0)}%
          </text>
          <text className="web-chart-label" x={x(i)} y={H - 8} textAnchor="middle">
            {formatMonthAbbr(m.month)}
          </text>
        </g>
      ))}
    </svg>
      <figcaption className="web-chart-legend">Dashed line: {target}% target. Amber dots are below target.</figcaption>
    </figure>
  );
}

/** Kilos per month as a line with value labels (county factory summary). */
export function KgLineChart({ months }: MonthlyChartProps) {
  if (months.length === 0) return <p className="body-sm text-muted">No deliveries in the last 6 months.</p>;
  const max = Math.max(1, ...months.map((m) => m.kg));
  const innerW = W - PAD.left - PAD.right - 48;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number): number => PAD.left + 24 + (months.length <= 1 ? innerW / 2 : (innerW * i) / (months.length - 1));
  const y = (v: number): number => PAD.top + innerH - (v / max) * innerH;
  const points = months.map((m, i) => `${x(i)},${y(m.kg)}`).join(' ');
  const base = H - PAD.bottom;
  const area = `${x(0)},${base} ${points} ${x(months.length - 1)},${base}`;
  const summary = months.map((m) => `${formatMonth(m.month)}: ${formatNumber(m.kg)} kg`).join('; ');
  const short = (kg: number): string => (kg >= 10000 ? `${formatNumber(Math.round(kg / 1000))}k` : formatNumber(kg));

  return (
    <svg className="web-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Kilos per month. ${summary}`}>
      <line className="web-chart-axis" x1={PAD.left} x2={W - PAD.right} y1={base} y2={base} />
      {months.length > 1 ? <polygon className="web-chart-area" points={area} /> : null}
      {months.length > 1 ? <polyline className="web-chart-line-kg" points={points} /> : null}
      {months.map((m, i) => {
        const last = i === months.length - 1;
        return (
          <g key={m.month}>
            <circle className="web-chart-dot" cx={x(i)} cy={y(m.kg)} r="4" />
            <text className="web-chart-value" x={x(i)} y={y(m.kg) - 9} textAnchor="middle">
              {short(m.kg)}
            </text>
            <text className="web-chart-label" x={x(i)} y={H - 8} textAnchor="middle">
              {formatMonthAbbr(m.month)}
              {last ? '*' : ''}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export interface PctBar {
  key: string;
  label: string;
  pct: number;
}

/** Percent per item as vertical bars with a dashed target line. Bars below target use the warning colour. */
export function PctBarChart({ bars, target = 60, ariaLabel }: { bars: PctBar[]; target?: number; ariaLabel: string }) {
  if (bars.length === 0) return <p className="body-sm text-muted">Nothing to show yet.</p>;
  const lo = Math.max(0, Math.floor((Math.min(target, ...bars.map((b) => b.pct)) - 15) / 10) * 10);
  const hi = Math.min(100, Math.ceil((Math.max(target, ...bars.map((b) => b.pct)) + 8) / 10) * 10);
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const slot = innerW / bars.length;
  const bw = Math.min(52, slot * 0.6);
  const y = (v: number): number => PAD.top + innerH - ((v - lo) / (hi - lo)) * innerH;
  const summary = bars.map((b) => `${b.label}: ${formatNumber(b.pct, 0)}%${b.pct < target ? ' (below target)' : ''}`).join('; ');

  return (
    <figure className="web-chart-fig">
      <svg className="web-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${ariaLabel}, target ${target}%. ${summary}`}>
      <line className="web-chart-axis" x1={PAD.left} x2={W - PAD.right} y1={H - PAD.bottom} y2={H - PAD.bottom} />
      <line className="web-chart-target" x1={PAD.left} x2={W - PAD.right} y1={y(target)} y2={y(target)} />
      {bars.map((b, i) => {
        const x = PAD.left + slot * i + (slot - bw) / 2;
        const top = y(b.pct);
        const below = b.pct < target;
        return (
          <g key={b.key}>
            <rect className={below ? 'web-chart-bar web-chart-bar-below' : 'web-chart-bar'} x={x} y={top} width={bw} height={Math.max(1, H - PAD.bottom - top)} rx="4" />
            <text className="web-chart-value" x={x + bw / 2} y={top - 6} textAnchor="middle">
              {formatNumber(b.pct, 0)}%
            </text>
            <text className="web-chart-label" x={x + bw / 2} y={H - 8} textAnchor="middle">
              {b.label}
            </text>
          </g>
        );
      })}
    </svg>
      <figcaption className="web-chart-legend">Dashed line: {target}% target. Amber bars are below target. Scale starts at {lo}%.</figcaption>
    </figure>
  );
}
