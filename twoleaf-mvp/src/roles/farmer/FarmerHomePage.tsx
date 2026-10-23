import { useQuery } from '../../api';
import { Card, QualityMeter, StatCard } from '../../design-system';
import { PhoneError, PhoneLoading, PhoneScreen } from '../../layouts/PhoneLayout';
import { formatNumber } from '../../lib/format';
import { useT } from '../../lib/i18n';
import { useFarmerSession } from './session';

/** Phase 3 placeholder: proves the data wiring. The full Home is built in phase 6. */
export function FarmerHomePage() {
  const t = useT();
  const { farmerUuid } = useFarmerSession();
  const q = useQuery((api) => api.getFarmerHome(farmerUuid, 'this_month'), [farmerUuid]);
  const home = q.data;
  return (
    <PhoneScreen title={t('tab.home')}>
      {q.initialLoading ? <PhoneLoading label={t('shell.loading')} /> : null}
      {q.error && !home ? <PhoneError message={t('shell.error')} retryLabel={t('shell.tryAgain')} onRetry={q.reload} /> : null}
      {home ? (
        <>
          <h2 className="h3">{t('greeting', { name: home.farmer.name.split(' ')[0] ?? home.farmer.name })}</h2>
          <StatCard label={t('common.kilosThisMonth')} value={formatNumber(home.totals.kg, 1)} unit={t('common.kg')} />
          {home.totals.fineLeafPct !== null ? (
            <Card title={t('common.leafQuality')}>
              <QualityMeter value={home.totals.fineLeafPct} target={home.target} label={t('common.fineLeaf')} />
            </Card>
          ) : null}
          <p className="phone-muted">{t('shell.comingSoon')}</p>
        </>
      ) : null}
    </PhoneScreen>
  );
}
