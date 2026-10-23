import { useQuery } from '../../api';
import { Card } from '../../design-system';
import { PhoneError, PhoneLoading, PhoneScreen } from '../../layouts/PhoneLayout';
import { useClerkSession } from './session';

/** Phase 3 placeholder for Sync (phase 5). */
export function ClerkSyncPage() {
  const { deviceId } = useClerkSession();
  const q = useQuery((api) => api.listPendingDeliveries(deviceId), [deviceId]);
  const rows = q.data;
  return (
    <PhoneScreen title="Sync">
      {q.initialLoading ? <PhoneLoading rows={2} /> : null}
      {q.error && !rows ? <PhoneError message={q.error.message} onRetry={q.reload} /> : null}
      {rows ? (
        <Card title="Waiting to sync" subtitle={rows.length === 0 ? 'Everything is synced.' : `${rows.length} ${rows.length === 1 ? 'delivery' : 'deliveries'} on this device`}>
          <p className="phone-muted">Sync now, with readable IDs assigned on sync, is built in phase 5.</p>
        </Card>
      ) : null}
    </PhoneScreen>
  );
}
