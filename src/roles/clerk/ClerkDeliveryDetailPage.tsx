import { useParams } from 'react-router-dom';
import { useQuery } from '../../api';
import { Alert, Badge, Card, IdTag, LeafIllustration, QualityMeter } from '../../design-system';
import { PhoneError, PhoneLoading, PhoneScreen } from '../../layouts/PhoneLayout';
import { formatDateTime, formatKg, formatPct } from '../../lib/format';
import { DELIVERY_STATUS_LABEL } from '../../lib/labels';
import { FINE_LEAF_TARGET } from '../../lib/time';
import { isUuid } from '../../lib/ids';
import { CLERK_BASE, useClerkSession } from './session';
import { DELIVERY_STATUS_TONE } from './status';

/** One delivery from Today. The URL carries the UUID; the screen shows readable IDs only. */
export function ClerkDeliveryDetailPage() {
  const { factoryUuid } = useClerkSession();
  const { deliveryUuid } = useParams();
  // The route param is the delivery UUID from the Today list.
  const uuid = deliveryUuid && isUuid(deliveryUuid) ? deliveryUuid : null;
  const q = useQuery((api) => (uuid ? api.getDelivery(factoryUuid, uuid) : Promise.reject(new Error('not found'))), [factoryUuid, uuid], { enabled: uuid !== null });
  const d = q.data;

  return (
    <PhoneScreen title="Delivery" back={`${CLERK_BASE}/today`} backLabel="Back to Today">
      {uuid === null ? <PhoneError message="This delivery was not found." /> : null}
      {q.initialLoading ? <PhoneLoading /> : null}
      {q.error && !d ? <PhoneError message={q.error.code === 'not_found' ? 'This delivery was not found. It may have been removed by Reset demo data.' : q.error.message} onRetry={q.reload} /> : null}
      {d ? (
        <>
          <Card>
            <div className="clerk-farmer">
              <Badge tone={DELIVERY_STATUS_TONE[d.status]}>{DELIVERY_STATUS_LABEL[d.status]}</Badge>
              <IdTag value={d.displayId} />
              <p className="clerk-farmer-name">{d.farmer.name}</p>
              <span className="clerk-ref">{d.farmer.farmerRef}</span>
              <IdTag value={d.farmer.readableId} />
            </div>
          </Card>
          {d.status === 'pending' ? <Alert tone="warning">Waiting to sync. It gets its TwoLeaf ID when the device syncs.</Alert> : null}
          {d.correction ? <Alert tone="info">{d.status === 'reversal' ? 'Reversal entry' : 'Corrected'}: {d.correction.reason}</Alert> : null}
          <Card>
            <dl className="clerk-summary">
              <dt>Weight</dt>
              <dd>
                <strong>{formatKg(d.kg)}</strong>
              </dd>
              <dt>Recorded</dt>
              <dd>{formatDateTime(d.recordedAt)}</dd>
              <dt>Picked by</dt>
              <dd>{d.plucker ? d.plucker.name : 'Farmer'}</dd>
              <dt>Clerk</dt>
              <dd>{d.clerkName}</dd>
              <dt>Scale</dt>
              <dd className="mono">{d.scaleId}</dd>
              <dt>Device</dt>
              <dd className="mono">{d.deviceId}</dd>
            </dl>
          </Card>
          <Card className="clerk-card-stack" titleLevel={2} title="Leaf sample">
            <LeafIllustration caption={d.photoRef} />
            <QualityMeter value={d.fineLeafPct} target={FINE_LEAF_TARGET} label="Centre score" />
            <p className="phone-muted">
              AI estimate {formatPct(d.aiFineLeafPct)}
              {d.qualityAdjustReason ? `, changed by the clerk: ${d.qualityAdjustReason}` : ''}
            </p>
            {d.intakeFineLeafPct !== null ? (
              <QualityMeter value={d.intakeFineLeafPct} target={FINE_LEAF_TARGET} label="Factory intake score" />
            ) : (
              <p className="phone-muted">Factory intake score: not scored yet.</p>
            )}
          </Card>
        </>
      ) : null}
    </PhoneScreen>
  );
}
