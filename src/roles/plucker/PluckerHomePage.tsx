import { useQuery } from '../../api';
import { Alert, Card, StatCard } from '../../design-system';
import { PhoneError, PhoneLoading, PhoneScreen } from '../../layouts/PhoneLayout';
import { formatNumber } from '../../lib/format';
import { useT } from '../../lib/i18n';
import { FineLeafMeter } from '../farmer/FineLeafMeter';
import { usePluckerSession } from './session';

/** Plucker Home: kilos this week and month, average fine leaf, farmers worked for, pay note. */
export function PluckerHomePage() {
  const t = useT();
  const { pluckerUuid } = usePluckerSession();
  const q = useQuery((api) => api.getPluckerHome(pluckerUuid), [pluckerUuid]);
  const home = q.data;
  return (
    <PhoneScreen title={t('tab.home')}>
      {q.initialLoading ? <PhoneLoading label={t('shell.loading')} /> : null}
      {q.error && !home ? <PhoneError message={t('shell.error')} retryLabel={t('shell.tryAgain')} onRetry={q.reload} /> : null}
      {home ? (
        <>
          <h2 className="fm-greeting">{t('greeting', { name: home.plucker.name.split(' ')[0] ?? home.plucker.name })}</h2>
          <div className="phone-stats">
            <StatCard label={t('common.kilosThisWeek')} value={formatNumber(home.kgThisWeek, 1)} unit={t('common.kg')} />
            <StatCard label={t('common.kilosThisMonth')} value={formatNumber(home.kgThisMonth, 1)} unit={t('common.kg')} />
            <StatCard label={t('common.farmersWorkedFor')} value={formatNumber(home.farmerCount)} />
            <StatCard label={t('plucker.sessionsThisMonth')} value={formatNumber(home.sessionsThisMonth)} />
          </div>
          {home.avgFineLeafPct !== null ? (
            <Card>
              <FineLeafMeter value={home.avgFineLeafPct} target={home.target} label={t('common.averageFineLeafMonth')} />
            </Card>
          ) : null}
          <Alert tone="info">{t('plucker.payNote')}</Alert>
        </>
      ) : null}
    </PhoneScreen>
  );
}
