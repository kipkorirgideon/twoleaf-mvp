import { useQuery } from '../../api';
import { Card } from '../../design-system';
import { PhoneError, PhoneLoading, PhoneScreen } from '../../layouts/PhoneLayout';
import { formatNumber } from '../../lib/format';
import { useT } from '../../lib/i18n';
import { useFarmerSession } from './session';

/** Phase 3 placeholder for the deliveries list (phase 6). */
export function FarmerDeliveriesPage() {
  const t = useT();
  const { farmerUuid } = useFarmerSession();
  const q = useQuery((api) => api.listFarmerDeliveries(farmerUuid), [farmerUuid]);
  const rows = q.data;
  return (
    <PhoneScreen title={t('tab.deliveries')}>
      {q.initialLoading ? <PhoneLoading label={t('shell.loading')} /> : null}
      {q.error && !rows ? <PhoneError message={t('shell.error')} retryLabel={t('shell.tryAgain')} onRetry={q.reload} /> : null}
      {rows ? (
        <Card title={t('common.deliveries')} subtitle={formatNumber(rows.length)}>
          <p className="phone-muted">{t('shell.comingSoon')}</p>
        </Card>
      ) : null}
    </PhoneScreen>
  );
}
