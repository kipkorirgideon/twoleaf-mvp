import { Link } from 'react-router-dom';
import { useQuery } from '../../api';
import { Badge, Card, Icon, IdTag } from '../../design-system';
import { PhoneError, PhoneLoading, PhoneScreen } from '../../layouts/PhoneLayout';
import { formatKg, formatPct, formatTime, plural } from '../../lib/format';
import { DELIVERY_STATUS_LABEL } from '../../lib/labels';
import { CLERK_BASE, useClerkSession } from './session';
import { DELIVERY_STATUS_TONE } from './status';

/** Today's deliveries at the centre, newest first. Tap one for details. */
export function ClerkTodayPage() {
  const { centreUuid } = useClerkSession();
  const q = useQuery((api) => api.listTodayDeliveries(centreUuid), [centreUuid]);
  const rows = q.data;
  const effective = rows ? rows.filter((r) => r.status !== 'reversal' && r.status !== 'corrected') : [];
  const kg = effective.reduce((sum, r) => sum + r.kg, 0);

  return (
    <PhoneScreen title="Today">
      {q.initialLoading ? <PhoneLoading /> : null}
      {q.error && !rows ? <PhoneError message={q.error.message} onRetry={q.reload} /> : null}
      {rows && rows.length === 0 ? (
        <Card>
          <div className="clerk-empty">
            <Icon name="scale" />
            <strong>No deliveries yet today</strong>
            <span>Deliveries you record appear here.</span>
          </div>
        </Card>
      ) : null}
      {rows && rows.length > 0 ? (
        <>
          <p className="phone-muted">
            {plural(effective.length, 'delivery', 'deliveries')} · {formatKg(kg)}
          </p>
          <ul className="clerk-list">
            {rows.map((r) => (
              <li key={r.uuid}>
                <Link className="clerk-item" to={`${CLERK_BASE}/today/${r.uuid}`}>
                  <span className="clerk-item-main">
                    <span className="clerk-item-name">{r.farmer.name}</span>
                    <span className="clerk-item-sub">
                      {formatTime(r.recordedAt)} · <span className="mono">{r.farmer.farmerRef}</span> · {formatPct(r.fineLeafPct)} fine leaf
                    </span>
                  </span>
                  <span className="clerk-item-side">
                    <span className="clerk-item-kg">{formatKg(r.kg)}</span>
                    <Badge tone={DELIVERY_STATUS_TONE[r.status]}>{DELIVERY_STATUS_LABEL[r.status]}</Badge>
                  </span>
                  <span className="clerk-item-id">
                    <IdTag value={r.displayId} copyable={false} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </PhoneScreen>
  );
}
