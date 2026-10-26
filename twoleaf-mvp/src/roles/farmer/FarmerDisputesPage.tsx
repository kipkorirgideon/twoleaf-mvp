/** The farmer's disputes: status, deadline, their note and the factory's response. */
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '../../api';
import { Badge, Button, Card, Icon, IdTag } from '../../design-system';
import { PhoneError, PhoneLoading, PhoneScreen } from '../../layouts/PhoneLayout';
import { demoNow } from '../../lib/time';
import { disputeReasonKey, disputeStatusKey, useLocalFormat, useT } from '../../lib/i18n';
import type { DisputeStatus } from '../../types';
import { FARMER_BASE, useFarmerSession } from './session';

const TONE: Record<DisputeStatus, 'warning' | 'success' | 'neutral'> = {
  open: 'warning',
  resolved_upheld: 'success',
  resolved_rejected: 'neutral',
};

export function FarmerDisputesPage() {
  const t = useT();
  const f = useLocalFormat();
  const navigate = useNavigate();
  const { farmerUuid } = useFarmerSession();
  const q = useQuery((api) => api.listFarmerDisputes(farmerUuid), [farmerUuid]);
  const rows = q.data ? [...q.data].sort((a, b) => (a.openedAt < b.openedAt ? 1 : -1)) : undefined;
  const now = demoNow();

  return (
    <PhoneScreen title={t('tab.disputes')}>
      {q.initialLoading ? <PhoneLoading label={t('shell.loading')} /> : null}
      {q.error && !rows ? <PhoneError message={t('shell.error')} retryLabel={t('shell.tryAgain')} onRetry={q.reload} /> : null}
      {rows && rows.length === 0 ? (
        <Card>
          <div className="fm-empty">
            <Icon name="check" />
            <span>{t('disputes.empty')}</span>
          </div>
        </Card>
      ) : null}
      {rows
        ? rows.map((d) => (
            <Card key={d.uuid} className="fm-stack">
              <div className="fm-row">
                <Badge tone={TONE[d.status]}>{t(disputeStatusKey(d.status))}</Badge>
                <IdTag value={d.readableId} copyable={false} />
              </div>
              <p className="fm-centre-name">{t(disputeReasonKey(d.reason))}</p>
              <p className="fm-small">
                {d.factoryShortName} · <span className="fm-ref">{d.farmerRef}</span>
                {d.deliveryDisplayId ? ` · ${t('disputes.delivery', { id: d.deliveryDisplayId })}` : ''}
              </p>
              <p className="fm-small">{t('disputes.opened', { date: f.date(d.openedAt) })}</p>
              {d.farmerNote ? (
                <div className="fm-stack">
                  <span className="fm-small">{t('disputes.yourNote')}</span>
                  <blockquote className="fm-quote">{d.farmerNote}</blockquote>
                </div>
              ) : null}
              {d.status === 'open' ? (
                <>
                  <p className="fm-muted">{d.deadlineAt < now ? t('disputes.overdue', { date: f.date(d.deadlineAt) }) : t('disputes.replyBy', { date: f.date(d.deadlineAt) })}</p>
                  <p className="fm-small">{t('disputes.waiting')}</p>
                </>
              ) : null}
              {d.response ? (
                <div className="fm-response">
                  <strong>{t('disputes.response')}</strong>
                  <span>{d.response.note}</span>
                  <span className="fm-small">{t('disputes.respondedOn', { date: f.date(d.response.resolvedAt) })}</span>
                </div>
              ) : null}
              {d.correctedDeliveryUuid ? (
                <Link className="tl-btn tl-btn-secondary tl-btn-full" to={`${FARMER_BASE}/deliveries/${d.correctedDeliveryUuid}`}>
                  <Icon name="chevron-right" />
                  <span>{t('disputes.seeCorrected')}</span>
                </Link>
              ) : null}
            </Card>
          ))
        : null}
      {rows ? (
        <Card className="fm-stack">
          <p className="fm-muted">{t('report.missingIntro')}</p>
          <Button variant="secondary" fullWidth icon="plus" onClick={() => navigate(`${FARMER_BASE}/report`)}>
            {t('report.missingButton')}
          </Button>
        </Card>
      ) : null}
    </PhoneScreen>
  );
}
