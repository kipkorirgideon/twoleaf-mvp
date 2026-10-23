import { useQuery } from '../../api';
import { Alert, StatCard } from '../../design-system';
import { PhoneError, PhoneLoading, PhoneScreen } from '../../layouts/PhoneLayout';
import { formatNumber } from '../../lib/format';
import { useT } from '../../lib/i18n';
import { usePluckerSession } from './session';

/** Phase 3 placeholder: proves the data wiring. The full Home is built in phase 6. */
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
          <h2 className="h3">{t('greeting', { name: home.plucker.name.split(' ')[0] ?? home.plucker.name })}</h2>
          <div className="phone-stats">
            <StatCard label={t('common.kilosThisWeek')} value={formatNumber(home.kgThisWeek, 1)} unit={t('common.kg')} />
            <StatCard label={t('common.kilosThisMonth')} value={formatNumber(home.kgThisMonth, 1)} unit={t('common.kg')} />
          </div>
          <Alert tone="info">{t('plucker.payNote')}</Alert>
          <p className="phone-muted">{t('shell.comingSoon')}</p>
        </>
      ) : null}
    </PhoneScreen>
  );
}
