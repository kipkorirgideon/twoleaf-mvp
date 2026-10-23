import { useQuery } from '../../api';
import { Card } from '../../design-system';
import { PhoneError, PhoneLoading, PhoneScreen } from '../../layouts/PhoneLayout';
import { formatKg } from '../../lib/format';
import { useClerkSession } from './session';

/** Phase 3 placeholder for today's deliveries at the centre (phase 5). */
export function ClerkTodayPage() {
  const { centreUuid } = useClerkSession();
  const q = useQuery((api) => api.listTodayDeliveries(centreUuid), [centreUuid]);
  const rows = q.data;
  const kg = rows ? rows.reduce((sum, r) => sum + r.kg, 0) : 0;
  return (
    <PhoneScreen title="Today">
      {q.initialLoading ? <PhoneLoading /> : null}
      {q.error && !rows ? <PhoneError message={q.error.message} onRetry={q.reload} /> : null}
      {rows ? (
        <Card title="Today’s deliveries" subtitle={`${rows.length} ${rows.length === 1 ? 'delivery' : 'deliveries'} · ${formatKg(kg)}`}>
          <p className="phone-muted">The delivery list with status and details is built in phase 5.</p>
        </Card>
      ) : null}
    </PhoneScreen>
  );
}
