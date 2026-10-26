import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '../../api';
import { Alert, Badge, Button, Card, IdTag, StatCard, useToast } from '../../design-system';
import { PhoneError, PhoneLoading, PhoneScreen } from '../../layouts/PhoneLayout';
import { formatNumber, formatPct, formatWhen, plural } from '../../lib/format';
import { demoNow } from '../../lib/time';
import { useRecordDraft } from './ClerkContext';
import { CLERK_BASE, useClerkSession } from './session';

/** Clerk Home: centre, Online / Offline demo switch, today's totals, pending sync, Record delivery. */
export function ClerkHomePage() {
  const { deviceId, personName } = useClerkSession();
  const navigate = useNavigate();
  const { show: toast } = useToast();
  const { draft, reset } = useRecordDraft();
  const q = useQuery((api) => api.getClerkHome(deviceId), [deviceId]);
  const setOnline = useMutation((api, online: boolean) => api.setDeviceOnline(deviceId, online));
  const home = q.data;

  async function toggle(): Promise<void> {
    if (!home) return;
    const next = !home.online;
    try {
      await setOnline.run(next);
      toast(next ? 'Back online. New deliveries sync straight away.' : 'Offline. Deliveries are saved on this device until you sync.', next ? 'success' : 'info');
    } catch {
      // The error is shown under the switch.
    }
  }

  function record(): void {
    // A finished delivery (receipt showing) starts a fresh one.
    if (draft.step === 6) reset();
    navigate(`${CLERK_BASE}/record`);
  }

  const inProgress = draft.step > 1 && draft.step < 6;
  const now = demoNow();

  return (
    <PhoneScreen title="Home">
      {q.initialLoading ? <PhoneLoading /> : null}
      {q.error && !home ? <PhoneError message={q.error.message} onRetry={q.reload} /> : null}
      {home ? (
        <>
          <Card className="clerk-centre">
            <div>
              <p className="clerk-centre-name">
                {home.centre.code} {home.centre.name}
              </p>
              <p className="phone-muted">
                {home.factory.name} · {personName}
              </p>
            </div>
            <div className="clerk-centre-meta">
              <IdTag value={home.centre.readableId} />
            </div>
            <div className="clerk-switch-row">
              <div className="clerk-switch-text">
                <span className="clerk-switch-label" id="clerk-conn-label">
                  Connection
                </span>
                <span className="phone-muted">
                  {home.online
                    ? `Last sync ${formatWhen(home.lastSyncAt, now)}`
                    : home.offlineSince
                      ? `Offline since ${formatWhen(home.offlineSince, now)}`
                      : 'Offline'}
                </span>
                <span className="phone-muted">Demo control</span>
              </div>
              <button
                type="button"
                role="switch"
                className="clerk-switch"
                aria-checked={home.online}
                aria-labelledby="clerk-conn-label"
                aria-describedby="clerk-conn-state"
                disabled={setOnline.pending}
                onClick={() => void toggle()}
              >
                <span className="clerk-switch-track" aria-hidden="true">
                  <span className="clerk-switch-thumb" />
                </span>
                <span id="clerk-conn-state">{home.online ? 'Online' : 'Offline'}</span>
              </button>
            </div>
            {setOnline.error ? <Alert tone="danger">{setOnline.error.message}</Alert> : null}
          </Card>

          {!home.online ? (
            <Alert tone="warning" title="You are offline">
              Deliveries are saved on this device with a temporary ID and get their TwoLeaf ID when you sync.
            </Alert>
          ) : null}

          <div className="phone-stats">
            <StatCard label="Deliveries today" value={formatNumber(home.today.deliveries)} />
            <StatCard label="Kilos today" value={formatNumber(home.today.kg, 1)} unit="kg" />
            <StatCard label="Fine leaf" value={home.today.avgFineLeafPct === null ? '–' : formatPct(home.today.avgFineLeafPct)} />
            <StatCard label="Waiting to sync" value={formatNumber(home.pendingCount)} />
          </div>

          {home.pendingCount > 0 ? (
            <Card
              titleLevel={2}
              title={`${plural(home.pendingCount, 'delivery', 'deliveries')} waiting to sync`}
              subtitle={home.online ? 'You are online. Sync them now.' : 'They sync when you are back online.'}
              action={<Badge tone="warning">Pending</Badge>}
            >
              <Button variant="secondary" icon="refresh" fullWidth onClick={() => navigate(`${CLERK_BASE}/sync`)}>
                Go to Sync
              </Button>
            </Card>
          ) : null}

          <Button icon="scale" fullWidth className="clerk-big-btn" onClick={record}>
            {inProgress ? 'Continue recording' : 'Record delivery'}
          </Button>
        </>
      ) : null}
    </PhoneScreen>
  );
}
