import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '../../api';
import { Alert, Badge, Button, Card, IdTag, LeafIllustration } from '../../design-system';
import { PhoneError, PhoneLoading, PhoneScreen } from '../../layouts/PhoneLayout';
import { formatKg, formatNumber, formatPct } from '../../lib/format';
import { isUuid } from '../../lib/ids';
import { useLocalFormat, useT } from '../../lib/i18n';
import { ENTRY_HELP, ENTRY_LABEL, ENTRY_TONE, entryKind } from './entry';
import { FineLeafMeter } from './FineLeafMeter';
import { FARMER_BASE, useFarmerSession } from './session';

/** One delivery: receipt, leaf photo, scores, plucker, ID, linked entries and Report a problem. */
export function FarmerDeliveryDetailPage() {
  const t = useT();
  const f = useLocalFormat();
  const navigate = useNavigate();
  const { farmerUuid } = useFarmerSession();
  const { deliveryUuid } = useParams();
  const uuid = deliveryUuid && isUuid(deliveryUuid) ? deliveryUuid : null;
  const q = useQuery((api) => (uuid ? api.getFarmerDelivery(farmerUuid, uuid) : Promise.reject(new Error('not found'))), [farmerUuid, uuid], {
    enabled: uuid !== null,
  });
  const d = q.data;
  const kind = d ? entryKind(d) : null;

  return (
    <PhoneScreen title={t('deliveries.detailTitle')} back={`${FARMER_BASE}/deliveries`} backLabel={t('shell.back')}>
      {uuid === null ? <PhoneError message={t('shell.notFound')} /> : null}
      {q.initialLoading ? <PhoneLoading label={t('shell.loading')} /> : null}
      {q.error && !d ? <PhoneError message={q.error.code === 'not_found' ? t('shell.notFound') : t('shell.error')} retryLabel={t('shell.tryAgain')} onRetry={q.reload} /> : null}
      {d && kind ? (
        <>
          <Card className="fm-stack">
            <div className="fm-receipt">
              <Badge tone={ENTRY_TONE[kind]}>{t(ENTRY_LABEL[kind])}</Badge>
              <span className="fm-receipt-kg">
                {formatNumber(d.kg, 1)}
                <span>{t('common.kg')}</span>
              </span>
              <IdTag value={d.displayId} copyable={false} />
            </div>
            <p className="fm-muted">{t(ENTRY_HELP[kind])}</p>
            {d.correction ? <p className="fm-small">{t('entry.reason', { reason: d.correction.reason })}</p> : null}
            <dl className="fm-dl">
              <dt>{t('common.dateTime')}</dt>
              <dd>{f.dateTime(d.recordedAt)}</dd>
              <dt>{t('common.buyingCentre')}</dt>
              <dd>
                {d.centre.code} {d.centre.name}
              </dd>
              <dt>{t('common.factory')}</dt>
              <dd>{d.factoryShortName}</dd>
              <dt>{t('common.farmerNumber')}</dt>
              <dd className="mono">{d.farmerRef}</dd>
              <dt>{t('common.pickedBy')}</dt>
              <dd>{d.plucker ? d.plucker.name : t('common.pickedByFarmer')}</dd>
              <dt>{t('common.clerk')}</dt>
              <dd>{d.clerkName}</dd>
              <dt>{t('common.scale')}</dt>
              <dd className="mono">{d.scaleId}</dd>
            </dl>
          </Card>

          <Card titleLevel={2} title={t('common.leafQuality')} className="fm-stack">
            <LeafIllustration label={t('common.leafPhoto')} caption={d.photoRef} />
            <FineLeafMeter value={d.fineLeafPct} label={t('common.centreScore')} />
            <p className="fm-small">{t('common.photoEstimate', { pct: formatNumber(d.aiFineLeafPct) })}</p>
            {d.intakeFineLeafPct !== null ? (
              <FineLeafMeter value={d.intakeFineLeafPct} label={t('common.intakeScore')} />
            ) : (
              <p className="fm-small">{t('common.notScored')}</p>
            )}
          </Card>

          {d.related.length > 0 ? (
            <Card titleLevel={2} title={t('deliveries.related')}>
              <ul className="fm-list">
                {d.related.map((r) => {
                  const k = entryKind(r);
                  return (
                    <li key={r.uuid}>
                      <Link className="fm-item" to={`${FARMER_BASE}/deliveries/${r.uuid}`}>
                        <span className="fm-item-main">
                          <span className="fm-item-title">{f.dateTime(r.recordedAt)}</span>
                          <span className="fm-item-sub">
                            {r.displayId} · {formatPct(r.fineLeafPct)}
                          </span>
                        </span>
                        <span className="fm-item-side">
                          <span className={r.kg < 0 ? 'fm-item-kg is-negative' : 'fm-item-kg'}>{formatKg(r.kg)}</span>
                          <Badge tone={ENTRY_TONE[k]}>{t(ENTRY_LABEL[k])}</Badge>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          ) : null}

          {d.openDisputeUuid ? (
            <>
              <Alert tone="info">{t('deliveries.alreadyReported')}</Alert>
              <Button variant="secondary" fullWidth icon="alert" onClick={() => navigate(`${FARMER_BASE}/disputes`)}>
                {t('deliveries.seeDisputes')}
              </Button>
            </>
          ) : kind !== 'reversal' ? (
            <Button fullWidth icon="alert" onClick={() => navigate(`${FARMER_BASE}/deliveries/${d.uuid}/report`)}>
              {t('common.reportProblem')}
            </Button>
          ) : null}
        </>
      ) : null}
    </PhoneScreen>
  );
}
