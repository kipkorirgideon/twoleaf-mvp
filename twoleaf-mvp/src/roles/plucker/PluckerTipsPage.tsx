import { useQuery } from '../../api';
import { Card, QualityMeter } from '../../design-system';
import { PhoneError, PhoneLoading, PhoneScreen } from '../../layouts/PhoneLayout';
import { useT } from '../../lib/i18n';
import { usePluckerSession } from './session';

/** Phase 3 placeholder for quality tips (phase 6). */
export function PluckerTipsPage() {
  const t = useT();
  const { pluckerUuid } = usePluckerSession();
  const q = useQuery((api) => api.getPluckerHome(pluckerUuid), [pluckerUuid]);
  const home = q.data;
  return (
    <PhoneScreen title={t('tab.tips')}>
      {q.initialLoading ? <PhoneLoading label={t('shell.loading')} rows={2} /> : null}
      {q.error && !home ? <PhoneError message={t('shell.error')} retryLabel={t('shell.tryAgain')} onRetry={q.reload} /> : null}
      {home ? (
        <Card title={t('common.leafQuality')}>
          {home.avgFineLeafPct !== null ? <QualityMeter value={home.avgFineLeafPct} target={home.target} label={t('common.averageFineLeaf')} /> : null}
          <p className="phone-muted">{t('shell.comingSoon')}</p>
        </Card>
      ) : null}
    </PhoneScreen>
  );
}
