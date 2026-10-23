import { useQuery } from '../../api';
import { Card } from '../../design-system';
import { PhoneError, PhoneLoading, PhoneScreen } from '../../layouts/PhoneLayout';
import { formatKsh, formatMonth } from '../../lib/format';
import { useT } from '../../lib/i18n';
import { useFarmerSession } from './session';

/** Phase 3 placeholder for Payments (phase 6). The system never pays anyone: it shows payments only. */
export function FarmerPaymentsPage() {
  const t = useT();
  const { farmerUuid } = useFarmerSession();
  const q = useQuery((api) => api.getFarmerPayments(farmerUuid), [farmerUuid]);
  const data = q.data;
  const latest = data ? data.months[data.months.length - 1] : undefined;
  return (
    <PhoneScreen title={t('tab.payments')}>
      {q.initialLoading ? <PhoneLoading label={t('shell.loading')} /> : null}
      {q.error && !data ? <PhoneError message={t('shell.error')} retryLabel={t('shell.tryAgain')} onRetry={q.reload} /> : null}
      {data ? (
        <Card title={latest ? formatMonth(latest.month) : t('tab.payments')} subtitle={latest ? `${t('common.amount')}: ${formatKsh(latest.totalCents)}` : undefined}>
          <p className="phone-muted">{t('shell.comingSoon')}</p>
        </Card>
      ) : null}
    </PhoneScreen>
  );
}
