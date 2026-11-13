import { Link } from 'react-router-dom';
import { Alert, Card, QualityMeter, Skeleton, StatCard } from '../../../design-system';
import { useQuery } from '../../../api';
import { formatNumber, formatTime, formatWeekdayDate, plural } from '../../../lib/format';
import { demoNow } from '../../../lib/time';
import { LoadError, PageHeader } from '../../../layouts/WebLayout';
import type { CentreSummary, FactoryAlert } from '../../../types';
import { useFactoryShell } from '../FactoryContext';
import { ConnectivityBadge } from '../components/Badges';
import { DeliveryTable } from '../components/DeliveryTable';
import { StatSkeletons, signedPct } from '../../../components/web/common';

function OfflineAlert({ alert, centre }: { alert: FactoryAlert; centre: CentreSummary | undefined }) {
  const c = centre?.connectivity;
  return (
    <Alert tone="warning" title={alert.message}>
      {c ? (
        <span>
          {c.listedPendingCount} {c.listedPendingCount === 1 ? 'is' : 'are'} listed here;{' '}
          {c.unlistedPendingCount} {c.unlistedPendingCount === 1 ? 'is' : 'are'} from farmers not listed in this demo.{' '}
          <Link to={`/factory/centres/${alert.centreUuid}`}>Open {alert.centreCode}</Link>
        </span>
      ) : null}
    </Alert>
  );
}

/** Factory dashboard: today's figures, alerts, quality by centre and recent deliveries. */
export function DashboardPage() {
  const { factoryUuid } = useFactoryShell();
  const q = useQuery((api) => api.getFactoryDashboard(factoryUuid), [factoryUuid]);
  const d = q.data;

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`${d ? d.factory.name : 'Today'} · ${formatWeekdayDate(demoNow())}, ${formatTime(demoNow())}`} />

      {q.error && !d ? <LoadError title="Could not load the dashboard." message={q.error.message} onRetry={q.reload} /> : null}

      {d
        ? d.alerts.map((a) => <OfflineAlert key={a.centreUuid} alert={a} centre={d.centres.find((c) => c.uuid === a.centreUuid)} />)
        : null}

      {!q.error || d ? (
        <div className="web-stats" aria-busy={q.initialLoading}>
          {!d ? (
            <StatSkeletons count={5} />
          ) : (
            <>
              <StatCard label="Kilos today" value={formatNumber(d.factory.kgToday, 1)} unit="kg" />
              <StatCard
                label="Kilos this month"
                value={formatNumber(d.factory.kgThisMonth)}
                unit="kg"
                delta={signedPct(d.factory.changeVsLastMonth)}
                deltaLabel="vs same days last month"
              />
              <StatCard label="Active farmers" value={formatNumber(d.activeFarmers)} />
              <Card className="tl-stat web-stat-meter">
                <span className="tl-stat-label">Fine leaf this month</span>
                <QualityMeter value={d.factory.fineLeafPct} target={60} label="All centres" />
              </Card>
              <StatCard label="Open disputes" value={formatNumber(d.factory.openDisputes)} />
              <StatCard label="Waiting to sync" value={formatNumber(d.factory.pendingSyncCount)} unit={d.factory.pendingSyncCount === 1 ? 'delivery' : 'deliveries'} />
            </>
          )}
        </div>
      ) : null}

      <div className="web-grid-2">
        <Card titleLevel={2} title="Quality by buying centre" subtitle="Fine leaf this month at the centre, target 60%" action={<Link to="/factory/quality">Quality report</Link>}>
          {!d ? (
            <div className="web-stack">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} height={36} />
              ))}
            </div>
          ) : (
            <ul className="fac-meter-list">
              {d.centres.map((c) => (
                <li key={c.uuid}>
                  <QualityMeter value={c.quality.centreFineLeafPct} target={60} label={`${c.code} ${c.name}`} />
                  <span className="fac-inline">
                    <ConnectivityBadge connectivity={c.connectivity} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card titleLevel={2} title="Buying centres today" subtitle="Deliveries and kilos recorded so far" action={<Link to="/factory/centres">All centres</Link>}>
          {!d ? (
            <div className="web-stack">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} height={24} />
              ))}
            </div>
          ) : (
            <ul className="fac-simple-list">
              {d.centres.map((c) => (
                <li key={c.uuid}>
                  <Link to={`/factory/centres/${c.uuid}`}>
                    {c.code} {c.name}
                  </Link>
                  <span className="tl-num text-muted">
                    {plural(c.deliveriesToday, 'delivery', 'deliveries')} · {formatNumber(c.kgToday, 1)} kg
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <section className="web-section" aria-labelledby="fac-recent-title">
        <div className="fac-section-head">
          <h2 id="fac-recent-title" className="h3">
            Recent deliveries
          </h2>
          <Link to="/factory/deliveries">All deliveries</Link>
        </div>
        <DeliveryTable caption="Recent deliveries" rows={d?.recentDeliveries} loading={!d} emptyMessage="No deliveries recorded yet." />
      </section>
    </>
  );
}
