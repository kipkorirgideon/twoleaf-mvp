/**
 * QualityMeter with its caption and accessible name translated through i18n.
 * Used by the farmer and plucker apps.
 */
import { QualityMeter } from '../../design-system';
import { useT } from '../../lib/i18n';
import { FINE_LEAF_TARGET } from '../../lib/time';

export interface FineLeafMeterProps {
  value: number;
  label: string;
  target?: number;
}

export function FineLeafMeter({ value, label, target = FINE_LEAF_TARGET }: FineLeafMeterProps) {
  const t = useT();
  // Whole points, matching the sentences that quote the same figure.
  const clamped = Math.round(Math.max(0, Math.min(100, value)));
  const gap = Math.round((target - clamped) * 10) / 10;
  return (
    <div className="fl-meter">
      <QualityMeter
        value={clamped}
        target={target}
        label={label}
        caption={clamped >= target ? t('meter.meets', { target }) : gap === 1 ? t('meter.belowOne', { target }) : t('meter.below', { gap, target })}
        ariaLabel={t('meter.aria', { label, value: clamped, target })}
      />
    </div>
  );
}
