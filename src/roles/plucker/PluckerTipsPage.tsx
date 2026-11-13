import { useQuery } from '../../api';
import { Alert, Card } from '../../design-system';
import { PhoneError, PhoneLoading, PhoneScreen } from '../../layouts/PhoneLayout';
import { formatNumber } from '../../lib/format';
import { useT, type MessageKey } from '../../lib/i18n';
import { FINE_LEAF_TARGET } from '../../lib/time';
import { FineLeafMeter } from '../farmer/FineLeafMeter';
import { usePluckerSession } from './session';

const TIPS: MessageKey[] = ['tip.1', 'tip.2', 'tip.3', 'tip.4', 'tip.5'];

/** Quality feedback from her 30-day average, plus simple plucking guidance. */
export function PluckerTipsPage() {
  const t = useT();
  const { pluckerUuid } = usePluckerSession();
  const q = useQuery((api) => api.getPluckerProfile(pluckerUuid), [pluckerUuid]);
  const p = q.data;
  const target = FINE_LEAF_TARGET;
  const avg = p?.avgFineLeafPct ?? null;

  return (
    <PhoneScreen title={t('tab.tips')}>
      {q.initialLoading ? <PhoneLoading label={t('shell.loading')} rows={2} /> : null}
      {q.error && !p ? <PhoneError message={t('shell.error')} retryLabel={t('shell.tryAgain')} onRetry={q.reload} /> : null}
      {p ? (
        <>
          <Card titleLevel={2} title={t('common.leafQuality')} className="fm-stack">
            {avg !== null ? (
              <>
                <FineLeafMeter value={avg} target={target} label={t('common.averageFineLeaf')} />
                <Alert tone={avg < target ? 'warning' : 'success'}>
                  {t('plucker.tipsAverage', { pct: formatNumber(avg) })} {avg < target ? t('plucker.tipsBelow') : t('plucker.tipsAbove', { target })}
                </Alert>
                <p className="fm-small">{t('plucker.tipsBasedOn')}</p>
              </>
            ) : (
              <p className="fm-muted">{t('plucker.tipsNoData')}</p>
            )}
          </Card>
          <Card titleLevel={2} title={t('plucker.guidanceTitle')}>
            <ol className="fm-tips">
              {TIPS.map((k) => (
                <li key={k}>{t(k)}</li>
              ))}
            </ol>
          </Card>
        </>
      ) : null}
    </PhoneScreen>
  );
}
