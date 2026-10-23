import { useNavigate } from 'react-router-dom';
import { useQuery } from '../../api';
import { Badge, Button, Card, StatCard } from '../../design-system';
import { PhoneError, PhoneLoading, PhoneScreen } from '../../layouts/PhoneLayout';
import { formatNumber, formatPct } from '../../lib/format';
import { CLERK_BASE, useClerkSession } from './session';

/** Phase 3 placeholder: proves the data wiring. The full Home is built in phase 5. */
export function ClerkHomePage() {
  const { deviceId } = useClerkSession();
  const navigate = useNavigate();
  const q = useQuery((api) => api.getClerkHome(deviceId), [deviceId]);
  const home = q.data;

  return (
    <PhoneScreen title="Home">
      {q.initialLoading ? <PhoneLoading /> : null}
      {q.error && !home ? <PhoneError message={q.error.message} onRetry={q.reload} /> : null}
      {home ? (
        <>
          <Card title={`${home.centre.code} ${home.centre.name}`} subtitle={home.factory.name} action={<Badge tone={home.online ? 'success' : 'warning'}>{home.online ? 'Online' : 'Offline'}</Badge>}>
            <p className="phone-muted">Clerk: {home.clerkName}</p>
          </Card>
          <div className="phone-stats">
            <StatCard label="Deliveries today" value={home.today.deliveries} />
            <StatCard label="Kilos today" value={formatNumber(home.today.kg, 1)} unit="kg" />
            <StatCard label="Fine leaf" value={home.today.avgFineLeafPct === null ? '–' : formatPct(home.today.avgFineLeafPct)} />
            <StatCard label="Waiting to sync" value={home.pendingCount} />
          </div>
          <Button icon="scale" fullWidth onClick={() => navigate(`${CLERK_BASE}/record`)}>
            Record delivery
          </Button>
          <p className="phone-muted">The full clerk Home, with the Online / Offline switch, is built in phase 5.</p>
        </>
      ) : null}
    </PhoneScreen>
  );
}
