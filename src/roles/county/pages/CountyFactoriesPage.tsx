import { useNavigate } from 'react-router-dom';
import { Badge, Card, DataTable, IdTag, QualityMeter, StatCard, type DataTableColumn } from '../../../design-system';
import { useQuery } from '../../../api';
import { formatDate, formatKg, formatKshPerKg, formatNumber, formatPct, formatPts, formatWhen } from '../../../lib/format';
import { demoNow } from '../../../lib/time';
import { LoadError, PageHeader } from '../../../layouts/WebLayout';
import type { CountyFactorySummary, FactoryOverview } from '../../../types';
import { KgLineChart } from '../../../components/web/Charts';
import { CardSkeleton, StatSkeletons, signedPct, useUuidParam } from '../../../components/web/common';
import { useCountyShell } from '../CountyContext';
import { PrivacyNote } from '../components/PrivacyNote';

const COLUMNS: DataTableColumn<FactoryOverview>[] = [
  { key: 'name', label: 'Factory', render: (f) => <span className="web-nowrap">{f.name}</span> },
  { key: 'id', label: 'ID', render: (f) => <IdTag value={f.readableId} copyable={false} /> },
  { key: 'farmers', label: 'Farmers', align: 'right', render: (f) => formatNumber(f.farmerCount) },
  { key: 'centres', label: 'Buying centres', align: 'right', render: (f) => formatNumber(f.centreCount) },
  { key: 'kg', label: 'Kilos this month', align: 'right', render: (f) => <span className="web-nowrap">{formatKg(f.kgThisMonth, 1)}</span> },
  {
    key: 'fine',
    label: 'Fine leaf',
    render: (f) => (
      <span className="cty-table-meter">
        <QualityMeter value={f.fineLeafPct} target={60} />
      </span>
    ),
  },
  { key: 'price', label: 'Avg price', align: 'right', render: (f) => <span className="web-nowrap">{formatKshPerKg(f.avgAuctionPriceCentsPerKg)}</span> },
  { key: 'bonus', label: 'Bonus per kg', align: 'right', render: (f) => <span className="web-nowrap">{formatKshPerKg(f.bonusPerKgCents)}</span> },
  { key: 'disputes', label: 'Open disputes', align: 'right', render: (f) => formatNumber(f.openDisputes) },
  {
    key: 'sync',
    label: 'Last sync',
    render: (f) => (
      <span className="web-cell-2">
        <span className="web-nowrap">{formatWhen(f.lastSyncAt, demoNow())}</span>
        {f.offlineCentreCount > 0 ? <Badge tone="danger">{`${f.offlineCentreCount} centre offline`}</Badge> : null}
      </span>
    ),
  },
];

/** All factories in the county, factory-level figures only. */
export function CountyFactoriesPage() {
  const { countyUuid } = useCountyShell();
  const navigate = useNavigate();
  const q = useQuery((api) => api.listFactories(countyUuid), [countyUuid]);

  return (
    <>
      <PageHeader title="Factories" subtitle="Factory-level figures for every factory in the county. Select a factory for its summary." />
      {q.error && !q.data ? <LoadError title="Could not load factories." message={q.error.message} onRetry={q.reload} /> : null}
      <DataTable
        caption="Factories in the county"
        columns={COLUMNS}
        rows={q.data ?? []}
        loading={q.initialLoading}
        rowKey={(f) => f.uuid}
        onRowClick={(f) => navigate(`/county/factories/${f.uuid}`)}
        emptyMessage="No factories registered yet."
      />
      <PrivacyNote />
    </>
  );
}

type CentreRow = CountyFactorySummary['centres'][number];

const CENTRE_COLUMNS: DataTableColumn<CentreRow>[] = [
  { key: 'centre', label: 'Buying centre', render: (c) => <span className="web-nowrap">{`${c.code} ${c.name}`}</span> },
  { key: 'farmers', label: 'Farmers', align: 'right', render: (c) => formatNumber(c.farmerCount) },
  { key: 'kg', label: 'Kilos this month', align: 'right', render: (c) => <span className="web-nowrap">{formatKg(c.kgThisMonth, 1)}</span> },
  {
    key: 'centreScore',
    label: 'Centre score',
    render: (c) => (
      <span className="cty-table-meter">
        <QualityMeter value={c.centreFineLeafPct} target={60} label="At centre" />
      </span>
    ),
  },
  { key: 'intake', label: 'Intake score', align: 'right', render: (c) => formatPct(c.intakeFineLeafPct) },
  { key: 'gap', label: 'Transport gap', align: 'right', render: (c) => <span className="web-nowrap">{c.gapPts > 0 ? `↓ ${formatPts(c.gapPts, 1)}` : formatPts(c.gapPts, 1)}</span> },
];

/** One factory as the county sees it: aggregates only, no farmer data. */
export function CountyFactorySummaryPage() {
  const factoryUuid = useUuidParam('factoryUuid');
  const q = useQuery((api) => (factoryUuid ? api.getFactorySummary(factoryUuid) : Promise.reject(new Error('Factory not found.'))), [factoryUuid], {
    enabled: factoryUuid !== null,
  });
  const d = q.data && q.data.factory.uuid === factoryUuid ? q.data : undefined;
  const f = d?.factory;

  if (!factoryUuid || (q.error && !d)) {
    return (
      <>
        <PageHeader title="Factory" back={{ to: '/county/factories', label: 'Factories' }} />
        <LoadError title="Could not load this factory." message={q.error?.message ?? 'This factory link is not valid.'} onRetry={factoryUuid ? q.reload : undefined} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={f ? f.name : 'Factory'}
        subtitle={f ? `Last sync ${formatWhen(f.lastSyncAt, demoNow())}` : 'Loading…'}
        back={{ to: '/county/factories', label: 'Factories' }}
        meta={
          f ? (
            <>
              <IdTag value={f.readableId} />
              {f.chain.intact ? (
                <Badge tone="success">{`Chain intact · verified ${formatWhen(f.chain.lastVerifiedAt, demoNow())}`}</Badge>
              ) : (
                <Badge tone="danger">{f.chain.failedDate ? `Chain failed on ${formatDate(f.chain.failedDate)}` : 'Chain failed'}</Badge>
              )}
            </>
          ) : null
        }
      />

      <div className="web-stats">
        {!f ? (
          <StatSkeletons count={8} />
        ) : (
          <>
            <StatCard label="Farmers" value={formatNumber(f.farmerCount)} />
            <StatCard label="Buying centres" value={formatNumber(f.centreCount)} />
            <StatCard label="Kilos this month" value={formatNumber(f.kgThisMonth, 1)} unit="kg" delta={signedPct(f.changeVsLastMonth)} deltaLabel="vs same days last month" />
            <Card className="tl-stat web-stat-meter">
              <span className="tl-stat-label">Fine leaf this month</span>
              <QualityMeter value={f.fineLeafPct} target={60} label="Centre score" />
            </Card>
            <StatCard label="Avg auction price" value={formatKshPerKg(f.avgAuctionPriceCentsPerKg)} />
            <StatCard label="Bonus per kg" value={formatKshPerKg(f.bonusPerKgCents)} />
            <StatCard label="Open disputes" value={formatNumber(f.openDisputes)} />
            <StatCard label="Dispute rate" value={formatPct(f.disputeRatePct, 2)} />
          </>
        )}
      </div>

      <div className="web-grid-2">
        <Card titleLevel={2} title="Kilos, last 6 months" subtitle="* this month to date">
          {!f ? <CardSkeleton lines={4} /> : <KgLineChart months={f.trend} />}
        </Card>
        <Card titleLevel={2} title="Sync" subtitle="Buying centre devices">
          {!f ? (
            <CardSkeleton />
          ) : (
            <div className="web-stack-sm">
              <p className="body">
                {f.offlineCentreCount === 0 ? 'All centres online.' : `${formatNumber(f.offlineCentreCount)} of ${formatNumber(f.centreCount)} centres offline.`}
              </p>
              <p className="body-sm text-muted">
                {formatNumber(f.pendingSyncCount)} {f.pendingSyncCount === 1 ? 'delivery is' : 'deliveries are'} waiting to sync. Last sync{' '}
                {formatWhen(f.lastSyncAt, demoNow())}.
              </p>
            </div>
          )}
        </Card>
      </div>

      <section className="web-section" aria-labelledby="cty-fs-centres">
        <h2 id="cty-fs-centres" className="h3">
          Quality by buying centre
        </h2>
        <DataTable caption="Quality by buying centre" columns={CENTRE_COLUMNS} rows={d?.centres ?? []} loading={!d} rowKey={(c) => c.code} emptyMessage="No buying centre figures for this factory." />
      </section>

      <PrivacyNote text={d?.privacyNote} />
    </>
  );
}
