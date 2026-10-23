import { useQuery } from '../../api';
import { Card, IdTag } from '../../design-system';
import { PhoneError, PhoneLoading, PhoneScreen } from '../../layouts/PhoneLayout';
import { CLERK_BASE, useClerkSession } from './session';

/** Phase 3 placeholder for the step-by-step Record delivery flow (phase 5). */
export function ClerkRecordPage() {
  const { deviceId } = useClerkSession();
  const q = useQuery((api) => api.getClerkHome(deviceId), [deviceId]);
  const home = q.data;
  return (
    <PhoneScreen title="Record delivery" back={CLERK_BASE}>
      {q.initialLoading ? <PhoneLoading rows={2} /> : null}
      {q.error && !home ? <PhoneError message={q.error.message} onRetry={q.reload} /> : null}
      {home ? (
        <Card title="Record delivery" subtitle={`${home.centre.code} ${home.centre.name}`}>
          <p className="phone-muted">Scale: {home.scaleIds.join(', ') || 'none'} · Device: {home.deviceId}</p>
          <IdTag value={home.centre.readableId} />
          <p className="phone-muted">The six-step flow (farmer, plucker, weigh, leaf sample, confirm, receipt) is built in phase 5.</p>
        </Card>
      ) : null}
    </PhoneScreen>
  );
}
