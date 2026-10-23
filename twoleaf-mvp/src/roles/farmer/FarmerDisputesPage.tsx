import { useQuery } from '../../api';
import { Badge, Card, IdTag } from '../../design-system';
import { PhoneError, PhoneLoading, PhoneScreen } from '../../layouts/PhoneLayout';
import { disputeReasonKey, disputeStatusKey, useT } from '../../lib/i18n';
import { useFarmerSession } from './session';

/** Phase 3 placeholder for Disputes (phase 6). */
export function FarmerDisputesPage() {
  const t = useT();
  const { farmerUuid } = useFarmerSession();
  const q = useQuery((api) => api.listFarmerDisputes(farmerUuid), [farmerUuid]);
  const rows = q.data;
  return (
    <PhoneScreen title={t('tab.disputes')}>
      {q.initialLoading ? <PhoneLoading label={t('shell.loading')} /> : null}
      {q.error && !rows ? <PhoneError message={t('shell.error')} retryLabel={t('shell.tryAgain')} onRetry={q.reload} /> : null}
      {rows
        ? rows.map((d) => (
            <Card key={d.uuid} title={t(disputeReasonKey(d.reason))} subtitle={<IdTag value={d.readableId} />} action={<Badge tone={d.status === 'open' ? 'warning' : 'success'}>{t(disputeStatusKey(d.status))}</Badge>} />
          ))
        : null}
      {rows ? <p className="phone-muted">{t('shell.comingSoon')}</p> : null}
    </PhoneScreen>
  );
}
