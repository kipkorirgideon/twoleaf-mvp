import { cx } from '../cx';

export interface QualityMeterProps {
  /** Fine leaf share, 0–100. */
  value: number;
  /** Defaults to the Tea Board's 60%. */
  target?: number;
  label?: string;
  /** Replaces the visible caption under the bar (e.g. Kiswahili). Default: "N points below the T% target" / "Meets the T% target". */
  caption?: string;
  /** Replaces the meter's accessible name. Default: "<label> V%, target T%". */
  ariaLabel?: string;
  className?: string;
}

export function QualityMeter({ value: raw, target: rawTarget, label, caption, ariaLabel, className }: QualityMeterProps) {
  const value = Math.max(0, Math.min(100, raw || 0));
  const target = rawTarget == null ? 60 : rawTarget;
  const below = value < target;
  // Rounded to one decimal so 60 - 57.3 shows 2.7, not 2.700000000000003.
  const gap = Math.round((target - value) * 10) / 10;
  const name = label || 'Fine leaf';
  return (
    <div className={cx('tl-meter', className)}>
      <div className="tl-meter-top">
        <span>{name}</span>
        <strong>{value + '%'}</strong>
      </div>
      <div
        className="tl-meter-track"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-label={ariaLabel ?? `${name} ${value}%, target ${target}%`}
      >
        <div className={cx('tl-meter-fill', below && 'tl-below')} style={{ width: `${value}%` }} />
        <div className="tl-meter-target" style={{ left: `calc(${target}% - 1px)` }} />
      </div>
      <span className="tl-meter-foot">
        {caption ?? (below ? `${gap} ${gap === 1 ? 'point' : 'points'} below the ${target}% target` : `Meets the ${target}% target`)}
      </span>
    </div>
  );
}
