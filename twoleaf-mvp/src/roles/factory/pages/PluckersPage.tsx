import { Link, useNavigate } from 'react-router-dom';
import { Card, DataTable, IdTag, StatCard, type DataTableColumn } from '../../../design-system';
import { useQuery } from '../../../api';
import { formatDateTime, formatKg, formatNumber, formatPct } from '../../../lib/format';
import { LoadError, PageHeader } from '../../../layouts/WebLayout';
import type { FactoryPluckerRow, PluckerSession } from '../../../types';
import { useFactoryShell } from '../FactoryContext';
import { DeliveryStatusBadge } from '../components/Badges';
import { useOpenDelivery } from '../components/DeliveryDrawer';
import { CardSkeleton, StatSkeletons, useUuidParam } from '../../../components/web/common';

const COLUMNS: DataTableColumn<FactoryPluckerRow>[] = [
  { key: 'name', label: 'Name', render: (r) => <span className="web-nowrap">{r.name}</span> },
  { key: 'id', label: 'TwoLeaf ID', render: (r) => <IdTag value={r.readableId} copyable={false} /> },
  {
    key: 'farmers',
    label: 'Works for',
    render: (r) => (r.farmers.length === 0 ? <span className="text-muted">No farmers here</span> : r.farmers.map((f) => `${f.name} (${f.farmerRef})`).join(', ')),
  },
  { key: 'sessions', label: 'Sessions this month', align: 'right', render: (r) => formatNumber(r.sessionsThisMonth) },
  { key: 'kg', label: 'Kilos this month', align: 'right', render: (r) => <span className="web-nowrap">{formatKg(r.kgThisMonth)}</span> },
  { key: 'fine', label: 'Avg fine leaf', align: 'right', render: (r) => (r.avgFineLeafPct === null ? <span className="text-muted">–</span> : formatPct(r.avgFineLeafPct)) },
];

/** Pluckers recorded on this factory's deliveries. */
export function PluckersPage() {
  const { factoryUuid } = useFactoryShell();
  const navigate = useNavigate();
  const q = useQuery((api) => api.listPluckers(factoryUuid), [factoryUuid]);

  return (
    <>
      <PageHeader title="Pluckers" subtitle="Pay is agreed between farmer and plucker. TwoLeaf records who picked each delivery." />
      {q.error && !q.data ? <LoadError title="Could not load pluckers." message={q.error.message} onRetry={q.reload} /> : null}
      <DataTable
        caption="Pluckers"
        columns={COLUMNS}
        rows={q.data ?? []}
        loading={q.initialLoading}
        rowKey={(r) => r.uuid}
        onRowClick={(r) => navigate(`/factory/pluckers/${r.uuid}`)}
        emptyMessage="No pluckers recorded at this factory."
      />
    </>
  );
}

/** One plucker's sessions at this factory. */
export function PluckerDetailPage() {
  const { factoryUuid } = useFactoryShell();
  const pluckerUuid = useUuidParam('pluckerUuid');
  const open = useOpenDelivery();
  const q = useQuery((api) => (pluckerUuid ? api.getPlucker(factoryUuid, pluckerUuid) : Promise.reject(new Error('Plucker not found.'))), [factoryUuid, pluckerUuid], {
    enabled: pluckerUuid !== null,
  });
  const d = q.data && q.data.uuid === pluckerUuid ? q.data : undefined;

  if (!pluckerUuid || (q.error && !d)) {
    return (
      <>
        <PageHeader title="Plucker" back={{ to: '/factory/pluckers', label: 'Pluckers' }} />
        <LoadError title="Could not load this plucker." message={q.error?.message ?? 'This plucker link is not valid.'} onRetry={pluckerUuid ? q.reload : undefined} />
      </>
    );
  }

  const columns: DataTableColumn<PluckerSession>[] = [
    { key: 'at', label: 'Date and time', render: (r) => <span className="web-nowrap">{formatDateTime(r.recordedAt)}</span> },
    { key: 'id', label: 'Delivery ID', render: (r) => <IdTag value={r.displayId} copyable={false} /> },
    { key: 'farmer', label: 'Farmer', render: (r) => <span className="web-nowrap">{r.farmerName}</span> },
    { key: 'centre', label: 'Centre', render: (r) => <span className="web-nowrap">{r.centre.code}</span> },
    { key: 'kg', label: 'Kilos', align: 'right', render: (r) => <span className="web-nowrap">{formatKg(r.kg)}</span> },
    { key: 'fine', label: 'Fine leaf', align: 'right', render: (r) => formatPct(r.fineLeafPct) },
    { key: 'status', label: 'Status', render: (r) => <DeliveryStatusBadge status={r.status} /> },
  ];

  return (
    <>
      <PageHeader
        title={d ? d.name : 'Plucker'}
        subtitle={d ? `Phone ${d.phone}` : 'Loading…'}
        back={{ to: '/factory/pluckers', label: 'Pluckers' }}
        meta={d ? <IdTag value={d.readableId} /> : null}
      />
      <div className="web-stats">
        {!d ? (
          <StatSkeletons count={3} />
        ) : (
          <>
            <StatCard label="Sessions this month" value={formatNumber(d.sessionsThisMonth)} />
            <StatCard label="Kilos this month" value={formatNumber(d.kgThisMonth, 1)} unit="kg" />
            <StatCard label="Average fine leaf" value={d.avgFineLeafPct === null ? '–' : formatPct(d.avgFineLeafPct)} />
          </>
        )}
      </div>
      <Card titleLevel={2} title="Farmers worked for" subtitle="At this factory only">
        {!d ? (
          <CardSkeleton />
        ) : d.farmers.length === 0 ? (
          <p className="body-sm text-muted">No farmers at this factory.</p>
        ) : (
          <ul className="fac-simple-list">
            {d.farmers.map((f) => (
              <li key={f.membershipUuid}>
                <Link to={`/factory/farmers/${f.uuid}`}>{f.name}</Link>
                <span className="text-muted">{f.farmerRef}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <section className="web-section" aria-labelledby="fac-pl-sessions">
        <h2 id="fac-pl-sessions" className="h3">
          Picking sessions
        </h2>
        <DataTable
          caption="Picking sessions"
          columns={columns}
          rows={d?.sessions ?? []}
          loading={!d}
          rowKey={(r) => r.deliveryUuid}
          onRowClick={(r) => open(r.deliveryUuid)}
          emptyMessage="No sessions at this factory yet."
        />
      </section>
    </>
  );
}
