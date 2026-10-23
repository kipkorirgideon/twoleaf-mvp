import { useQuery } from '../../api';
import { Card } from '../../design-system';
import { PhoneError, PhoneLoading, PhoneScreen } from '../../layouts/PhoneLayout';
import { formatNumber } from '../../lib/format';
import { useT } from '../../lib/i18n';
import { usePluckerSession } from './session';

/** Phase 3 placeholder for picking sessions (phase 6). */
export function PluckerSessionsPage() {
  const t = useT();
  const { pluckerUuid } = usePluckerSession();
  const q = useQuery((api) => api.listPluckerSessions(pluckerUuid), [pluckerUuid]);
  const rows = q.data;
  return (
    <PhoneScreen title={t('tab.sessions')}>
      {q.initialLoading ? <PhoneLoading label={t('shell.loading')} /> : null}
      {q.error && !rows ? <PhoneError message={t('shell.error')} retryLabel={t('shell.tryAgain')} onRetry={q.reload} /> : null}
      {rows ? (
        <Card title={t('tab.sessions')} subtitle={formatNumber(rows.length)}>
          <p className="phone-muted">{t('shell.comingSoon')}</p>
        </Card>
      ) : null}
    </PhoneScreen>
  );
}
