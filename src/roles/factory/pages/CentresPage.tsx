import { Link, useNavigate } from 'react-router-dom';
import { Alert, Card, DataTable, IdTag, QualityMeter, Skeleton, StatCard, type DataTableColumn } from '../../../design-system';
import { useQuery } from '../../../api';
import { formatKg, formatNumber, formatPct, formatPts, formatWhen, plural } from '../../../lib/format';
import { demoNow } from '../../../lib/time';
import { LoadError, PageHeader } from '../../../layouts/WebLayout';
import type { CentreSummary, FactoryFarmerRow } from '../../../types';
import { useFactoryShell } from '../FactoryContext';
import { ConnectivityBadge } from '../components/Badges';
import { FineLeafLineChart, KgBarChart } from '../../../components/web/Charts';
import { DeliveryTable } from '../components/DeliveryTable';
import { CardSkeleton, StatSkeletons, useUuidParam } from '../../../components/web/common';

function CentreCard({ c }: { c: CentreSummary }) {
  return (
    <Link className="fac-card-link" to={`/factory/centres/${c.uuid}`}>
      <span className="fac-card-link-head">
        <span>
          <span className="fac-card-link-title">
            {c.code} {c.name}
          </span>
          <IdTag value={c.readableId} copyable={false} />
        </span>
        <ConnectivityBadge connectivity={c.connectivity} />
      </span>
      <span className="fac-kv">
        <span>Clerk</span>
        <strong>{c.clerkName}</strong>
      </span>
      <span className="fac-kv">
        <span>Farmers</span>
        <strong className="tl-num">{formatNumber(c.farmerCount)}</strong>
      </span>
      <span className="fac-kv">
        <span>Kilos this month</span>
        <strong className="tl-num">{formatKg(c.kgThisMonth)}</strong>
      </span>
      <QualityMeter value={c.quality.centreFineLeafPct} target={60} />
      <span className="body-sm text-muted">Last sync {formatWhen(c.connectivity.lastSyncAt, demoNow())}</span>
    </Link>
  );
}

/** Cards for each of this factory's buying centres. */
export function CentresPage() {
  const { factoryUuid } = useFactoryShell();
  const q = useQuery((api) => api.listCentres(factoryUuid), [factoryUuid]);

  return (
    <>
      <PageHeader title="Buying centres" subtitle="Where farmers weigh their leaf. Each clerk's device syncs to the factory ledger." />
      {q.error && !q.data ? <LoadError title="Could not load buying centres." message={q.error.message} onRetry={q.reload} /> : null}
      <div className="fac-card-grid">
        {!q.data && !q.error
          ? Array.from({ length: 6 }, (_, i) => (
              <Card key={i}>
                <CardSkeleton lines={5} />
              </Card>
            ))
          : null}
        {q.data?.map((c) => <CentreCard key={c.uuid} c={c} />)}
      </div>
      {q.data && q.data.length === 0 ? <p className="body text-muted">No buying centres yet.</p> : null}
    </>
  );
}

const FARMER_COLUMNS: DataTableColumn<FactoryFarmerRow>[] = [
  { key: 'ref', label: 'Number', render: (r) => <span className="web-nowrap">{r.farmer.farmerRef}</span> },
  { key: 'name', label: 'Name', render: (r) => <span className="web-nowrap">{r.farmer.name}</span> },
  { key: 'kg', label: 'Kilos this month', align: 'right', render: (r) => <span className="web-nowrap">{formatKg(r.kgThisMonth)}</span> },
  { key: 'fine', label: 'Fine leaf', align: 'right', render: (r) => (r.fineLeafPct === null ? <span className="text-muted">–</span> : formatPct(r.fineLeafPct)) },
];

/** One buying centre: figures, connectivity, deliveries and farmers. */
export function CentreDetailPage() {
  const { factoryUuid } = useFactoryShell();
  const centreUuid = useUuidParam('centreUuid');
  const navigate = useNavigate();
  const q = useQuery((api) => (centreUuid ? api.getCentre(factoryUuid, centreUuid) : Promise.reject(new Error('Centre not found.'))), [factoryUuid, centreUuid], {
    enabled: centreUuid !== null,
  });
  const d = q.data && q.data.uuid === centreUuid ? q.data : undefined;

  if (!centreUuid || (q.error && !d)) {
    return (
      <>
        <PageHeader title="Buying centre" back={{ to: '/factory/centres', label: 'Buying centres' }} />
        <LoadError title="Could not load this buying centre." message={q.error?.message ?? 'This centre link is not valid.'} onRetry={centreUuid ? q.reload : undefined} />
      </>
    );
  }

  const conn = d?.connectivity;
  const unlistedFarmers = d ? d.farmerCount - d.listedFarmerCount : 0;

  return (
    <>
      <PageHeader
        title={d ? `${d.code} ${d.name}` : 'Buying centre'}
        subtitle={d ? `Clerk ${d.clerkName}` : 'Loading…'}
        back={{ to: '/factory/centres', label: 'Buying centres' }}
        meta={d && conn ? (
          <>
            <IdTag value={d.readableId} />
            <ConnectivityBadge connectivity={conn} />
            <span className="body-sm text-muted">Last sync {formatWhen(conn.lastSyncAt, demoNow())}</span>
          </>
        ) : null}
      />

      {conn && conn.status === 'offline' ? (
        <Alert tone="warning" title={`${d?.code} ${d?.name} has been offline for ${plural(conn.offlineHours, 'hour')}. ${plural(conn.pendingCount, 'delivery', 'deliveries')} ${conn.pendingCount === 1 ? 'is' : 'are'} waiting to sync.`}>
          {conn.listedPendingCount} {conn.listedPendingCount === 1 ? 'is' : 'are'} listed below; {conn.unlistedPendingCount}{' '}
          {conn.unlistedPendingCount === 1 ? 'is' : 'are'} from farmers not listed in this demo. They join the ledger when the device reconnects.
        </Alert>
      ) : null}

      <div className="web-stats">
        {!d ? (
          <StatSkeletons />
        ) : (
          <>
            <StatCard label="Kilos today" value={formatNumber(d.kgToday, 1)} unit="kg" />
            <StatCard label="Deliveries today" value={formatNumber(d.deliveriesToday)} />
            <StatCard label="Kilos this month" value={formatNumber(d.kgThisMonth, 1)} unit="kg" />
            <StatCard label="Farmers" value={formatNumber(d.farmerCount)} />
          </>
        )}
      </div>

      <div className="web-grid-2">
        <Card titleLevel={2} title="Leaf quality this month" subtitle="Centre score vs factory intake score">
          {!d ? (
            <CardSkeleton />
          ) : (
            <div className="web-stack">
              <QualityMeter value={d.quality.centreFineLeafPct} target={60} label="At the centre" />
              <QualityMeter value={d.quality.intakeFineLeafPct} target={60} label="At factory intake" />
              <p className="body-sm text-muted">
                Transport gap {formatPts(d.quality.gapPts, 1)}. Leaf that sits in bags or lorries too long bruises and loses fine leaf before it
                reaches the factory.
              </p>
            </div>
          )}
        </Card>
        <Card titleLevel={2} title="Kilos, last 6 months" subtitle="* this month to date">
          {!d ? <Skeleton height={160} /> : <KgBarChart months={d.months} />}
        </Card>
      </div>
      {d ? (
        <Card titleLevel={2} title="Fine leaf, last 6 months" subtitle="Centre score, kilo-weighted">
          <FineLeafLineChart months={d.months.filter((m) => m.deliveries > 0)} target={60} />
        </Card>
      ) : null}

      <section className="web-section" aria-labelledby="fac-cd-del">
        <h2 id="fac-cd-del" className="h3">
          Deliveries
        </h2>
        <DeliveryTable caption="Deliveries at this centre" rows={d?.deliveries} loading={!d} emptyMessage="No deliveries at this centre yet." />
      </section>

      <section className="web-section" aria-labelledby="fac-cd-farmers">
        <div className="fac-section-head">
          <h2 id="fac-cd-farmers" className="h3">
            Farmers
          </h2>
          {unlistedFarmers > 0 ? (
            <span className="body-sm text-muted">{formatNumber(unlistedFarmers)} more {unlistedFarmers === 1 ? 'farmer is' : 'farmers are'} registered here but not listed in this demo.</span>
          ) : null}
        </div>
        <DataTable
          caption="Farmers at this centre"
          columns={FARMER_COLUMNS}
          rows={d?.farmers ?? []}
          loading={!d}
          rowKey={(r) => r.farmer.membershipUuid}
          onRowClick={(r) => navigate(`/factory/farmers/${r.farmer.uuid}`)}
          emptyMessage="No farmers listed at this centre."
        />
      </section>
    </>
  );
}
