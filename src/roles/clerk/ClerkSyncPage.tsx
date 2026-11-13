import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '../../api';
import type { SyncResult } from '../../types';
import { Alert, Badge, Button, Card, Icon, IdTag, useToast } from '../../design-system';
import { PhoneError, PhoneLoading, PhoneScreen } from '../../layouts/PhoneLayout';
import { formatKg, formatTime, formatWhen, plural } from '../../lib/format';
import { demoNow } from '../../lib/time';
import { useSetPendingBadge } from './ClerkContext';
import { CLERK_BASE, useClerkSession } from './session';

/** Deliveries waiting on this device, and Sync now (disabled offline). */
export function ClerkSyncPage() {
  const { deviceId } = useClerkSession();
  const navigate = useNavigate();
  const { show: toast } = useToast();
  const setPendingBadge = useSetPendingBadge();
  const homeQ = useQuery((api) => api.getClerkHome(deviceId), [deviceId]);
  const pendingQ = useQuery((api) => api.listPendingDeliveries(deviceId), [deviceId]);
  const sync = useMutation((api, _args: void) => api.syncPending(deviceId));
  const [last, setLast] = useState<SyncResult | null>(null);

  const home = homeQ.data;
  const online = home?.online ?? false;
  // Right after Sync now the lists refetch; hide what was just synced so the screen never shows it twice.
  const synced = new Set(last?.deliveries.map((d) => d.uuid) ?? []);
  const stale = pendingQ.data?.some((r) => synced.has(r.uuid)) ?? false;
  const rows = pendingQ.data?.filter((r) => !synced.has(r.uuid));
  const total = home ? (stale && last ? Math.max(0, home.pendingCount - last.syncedCount) : home.pendingCount) : (rows?.length ?? 0);
  const unlisted = rows && home ? Math.max(0, total - rows.length) : 0;

  async function syncNow(): Promise<void> {
    try {
      const r = await sync.run(undefined);
      setLast(r);
      toast(r.message);
      // Clear the Sync tab badge with the toast, and refresh this screen's figures.
      setPendingBadge(0);
      homeQ.reload();
    } catch {
      // Shown below.
    }
  }

  const loading = homeQ.initialLoading || pendingQ.initialLoading;
  const error = (homeQ.error && !home) || (pendingQ.error && !pendingQ.data) ? (homeQ.error ?? pendingQ.error) : null;

  return (
    <PhoneScreen title="Sync">
      {loading ? <PhoneLoading /> : null}
      {error ? (
        <PhoneError
          message={error.message}
          onRetry={() => {
            homeQ.reload();
            pendingQ.reload();
          }}
        />
      ) : null}
      {home && rows ? (
        <>
          <Card
            titleLevel={2}
            title={total === 0 ? 'Everything is synced' : `${plural(total, 'delivery', 'deliveries')} waiting`}
            subtitle={`Last sync ${formatWhen(home.lastSyncAt, demoNow())}`}
            action={<Badge tone={online ? 'success' : 'warning'}>{online ? 'Online' : 'Offline'}</Badge>}
          >
            {!online ? (
              <p className="phone-muted">You are offline. Sync needs a connection: switch to Online on Home when you have signal.</p>
            ) : total === 0 ? (
              <p className="phone-muted">New deliveries are sent straight away while you are online.</p>
            ) : (
              <p className="phone-muted">Syncing gives each delivery its TwoLeaf ID. The records themselves do not change.</p>
            )}
          </Card>

          {sync.error ? <Alert tone="danger">{sync.error.message}</Alert> : null}

          {online ? (
            <Button fullWidth icon="refresh" className="clerk-big-btn" onClick={() => void syncNow()} disabled={sync.pending || total === 0}>
              {sync.pending ? 'Syncing…' : 'Sync now'}
            </Button>
          ) : (
            <>
              <Button fullWidth icon="refresh" className="clerk-big-btn" disabled aria-describedby="clerk-sync-offline">
                Sync now
              </Button>
              <p id="clerk-sync-offline" className="phone-muted">
                Sync is not available offline.
              </p>
              <Button variant="secondary" fullWidth icon="wifi" onClick={() => navigate(CLERK_BASE)}>
                Go to Home to go online
              </Button>
            </>
          )}

          {rows.length > 0 ? (
            <ul className="clerk-list" aria-label="Waiting to sync">
              {rows.map((r) => (
                <li key={r.uuid} className="clerk-item">
                  <span className="clerk-item-main">
                    <span className="clerk-item-name">{r.farmer.name}</span>
                    <span className="clerk-item-sub">
                      {formatTime(r.recordedAt)} · <span className="mono">{r.farmer.farmerRef}</span>
                    </span>
                  </span>
                  <span className="clerk-item-side">
                    <span className="clerk-item-kg">{formatKg(r.kg)}</span>
                    <Badge tone="warning">Pending sync</Badge>
                  </span>
                  <span className="clerk-item-id">
                    <IdTag value={r.displayId} copyable={false} />
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          {unlisted > 0 ? <p className="phone-muted">Plus {plural(unlisted, 'earlier delivery', 'earlier deliveries')} saved on this device.</p> : null}

          {last && last.deliveries.length > 0 ? (
            <Card titleLevel={2} title="Just synced" subtitle={last.message}>
              <ul className="clerk-list">
                {last.deliveries.map((r) => (
                  <li key={r.uuid} className="clerk-item">
                    <span className="clerk-item-main">
                      <span className="clerk-item-name">{r.farmer.name}</span>
                      <span className="clerk-item-sub">{formatKg(r.kg)}</span>
                    </span>
                    <span className="clerk-item-side">
                      <Badge tone="success">Synced</Badge>
                    </span>
                    <span className="clerk-item-id">
                      {r.tempId ? (
                        <>
                          <IdTag value={r.tempId} copyable={false} />
                          <Icon name="chevron-right" size={14} label="became" />
                          <IdTag value={r.displayId} copyable={false} />
                        </>
                      ) : (
                        <IdTag value={r.displayId} copyable={false} />
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </>
      ) : null}
    </PhoneScreen>
  );
}
