import { Link, useNavigate } from 'react-router-dom';
import { Badge, Card, DataTable, IdTag, StatCard, type DataTableColumn } from '../../../design-system';
import { useQuery } from '../../../api';
import { DISPUTE_REASON_LABEL } from '../../../lib/labels';
import { formatDate, formatKg, formatKsh, formatKshPerKg, formatMonth, formatNumber, formatPct } from '../../../lib/format';
import { LoadError, PageHeader } from '../../../layouts/WebLayout';
import type { DisputeRow, MonthlyPayment } from '../../../types';
import { useFactoryShell } from '../FactoryContext';
import { DeadlineBadge, DisputeStatusBadge, PaymentStatusBadge } from '../components/Badges';
import { FineLeafLineChart, KgBarChart } from '../../../components/web/Charts';
import { DeliveryTable } from '../components/DeliveryTable';
import { CardSkeleton, StatSkeletons, useUuidParam } from '../../../components/web/common';

const PAYMENT_COLUMNS: DataTableColumn<MonthlyPayment>[] = [
  { key: 'month', label: 'Month', render: (r) => <span className="web-nowrap">{formatMonth(r.month)}</span> },
  { key: 'centre', label: 'Centre', render: (r) => r.centreCode },
  { key: 'kg', label: 'Kilos', align: 'right', render: (r) => <span className="web-nowrap">{formatKg(r.kg)}</span> },
  { key: 'rate', label: 'Rate', align: 'right', render: (r) => <span className="web-nowrap">{formatKshPerKg(r.rateCentsPerKg)}</span> },
  { key: 'amount', label: 'Amount', align: 'right', render: (r) => <span className="web-nowrap">{formatKsh(r.amountCents)}</span> },
  { key: 'status', label: 'Status', render: (r) => <PaymentStatusBadge status={r.status} date={r.payDate} /> },
];

const DISPUTE_COLUMNS: DataTableColumn<DisputeRow>[] = [
  { key: 'id', label: 'Dispute ID', render: (r) => <IdTag value={r.readableId} copyable={false} /> },
  { key: 'reason', label: 'Reason', render: (r) => DISPUTE_REASON_LABEL[r.reason] },
  { key: 'opened', label: 'Opened', render: (r) => <span className="web-nowrap">{formatDate(r.openedAt)}</span> },
  { key: 'deadline', label: 'Deadline', render: (r) => <DeadlineBadge dispute={r} /> },
  { key: 'status', label: 'Status', render: (r) => <DisputeStatusBadge status={r.status} /> },
];

/** One farmer, as this factory sees them: this factory's memberships only. */
export function FarmerDetailPage() {
  const { factoryUuid } = useFactoryShell();
  const farmerUuid = useUuidParam('farmerUuid');
  const navigate = useNavigate();
  const q = useQuery((api) => (farmerUuid ? api.getFarmer(factoryUuid, farmerUuid) : Promise.reject(new Error('Farmer not found.'))), [factoryUuid, farmerUuid], {
    enabled: farmerUuid !== null,
  });
  const d = q.data && q.data.farmer.uuid === farmerUuid ? q.data : undefined;

  if (!farmerUuid || (q.error && !d)) {
    return (
      <>
        <PageHeader title="Farmer" back={{ to: '/factory/farmers', label: 'Farmers' }} />
        <LoadError title="Could not load this farmer." message={q.error?.message ?? 'This farmer link is not valid.'} onRetry={farmerUuid ? q.reload : undefined} />
      </>
    );
  }

  const month = d?.trend[d.trend.length - 1];
  const fyKg = d?.bonus?.kg;

  return (
    <>
      <PageHeader
        title={d ? d.farmer.name : 'Farmer'}
        subtitle={d ? `Registered ${formatDate(d.farmer.joinedOn)} · phone ${d.farmer.phone}` : 'Loading…'}
        back={{ to: '/factory/farmers', label: 'Farmers' }}
        meta={
          d ? (
            <>
              <IdTag value={d.farmer.readableId} />
              {d.memberships.map((m) => (
                <IdTag key={m.membershipUuid} value={m.farmerRef} />
              ))}
            </>
          ) : null
        }
      />

      <div className="web-stats">
        {!d ? (
          <StatSkeletons />
        ) : (
          <>
            <StatCard label="Kilos this month" value={formatNumber(month?.kg ?? 0, 1)} unit="kg" />
            <StatCard label="Fine leaf this month" value={month && month.deliveries > 0 ? formatPct(month.fineLeafPct) : '–'} />
            <StatCard label="Deliveries this month" value={formatNumber(month?.deliveries ?? 0)} />
            <StatCard label="FY 2025/26 kilos" value={fyKg !== undefined ? formatNumber(fyKg, 1) : '–'} unit={fyKg !== undefined ? 'kg' : undefined} />
          </>
        )}
      </div>

      <div className="web-grid-2">
        <Card titleLevel={2} title="Memberships at this factory" subtitle="Farmer numbers are unique within a buying centre.">
          {!d ? (
            <CardSkeleton />
          ) : (
            <ul className="fac-simple-list">
              {d.memberships.map((m) => (
                <li key={m.membershipUuid}>
                  <span>
                    <strong>{m.farmerRef}</strong> · <Link to={`/factory/centres/${m.centre.uuid}`}>{m.centre.name}</Link>
                  </span>
                  <span className="fac-inline">
                    <span className="text-muted body-sm">since {formatDate(m.joinedOn)}</span>
                    {m.status === 'active' ? <Badge tone="success">Active</Badge> : <Badge tone="danger">Suspended</Badge>}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="body-sm text-muted web-mt">Only this factory's memberships are shown. Deliveries to other factories stay with those factories.</p>
        </Card>

        <Card titleLevel={2} title="Linked pluckers" subtitle="Pluckers recorded on this farmer's deliveries">
          {!d ? (
            <CardSkeleton />
          ) : d.pluckers.length === 0 ? (
            <p className="body-sm text-muted">No pluckers linked. The farmer picks their own leaf.</p>
          ) : (
            <ul className="fac-simple-list">
              {d.pluckers.map((p) => (
                <li key={p.uuid}>
                  <Link to={`/factory/pluckers/${p.uuid}`}>{p.name}</Link>
                  <IdTag value={p.readableId} copyable={false} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="web-grid-2">
        <Card titleLevel={2} title="Kilos, last 6 months" subtitle="* this month to date">
          {!d ? <CardSkeleton lines={4} /> : <KgBarChart months={d.trend} />}
        </Card>
        <Card titleLevel={2} title="Fine leaf, last 6 months" subtitle="Centre score, kilo-weighted">
          {!d ? <CardSkeleton lines={4} /> : <FineLeafLineChart months={d.trend.filter((m) => m.deliveries > 0)} target={60} />}
        </Card>
      </div>

      <section className="web-section" aria-labelledby="fac-fd-del">
        <h2 id="fac-fd-del" className="h3">
          Deliveries
        </h2>
        <DeliveryTable caption="Deliveries by this farmer" rows={d?.deliveries} loading={!d} hideFarmer emptyMessage="No deliveries at this factory yet." />
      </section>

      <section className="web-section" aria-labelledby="fac-fd-pay">
        <div className="fac-section-head">
          <h2 id="fac-fd-pay" className="h3">
            Payments
          </h2>
          <span className="body-sm text-muted">Made by the factory. TwoLeaf shows and explains them.</span>
        </div>
        <DataTable caption="Monthly payments" columns={PAYMENT_COLUMNS} rows={d?.payments ?? []} loading={!d} rowKey={(r) => `${r.month}-${r.membershipUuid}`} emptyMessage="No payments yet." />
        {d?.bonus ? (
          <Card title={`Bonus FY ${d.bonus.fy}`} subtitle="Second payment, computed from the factory's saved inputs">
            <p className="body tl-num">
              {formatKg(d.bonus.kg)} × {formatKshPerKg(d.bonus.ratePerKgCents)} = <strong>{formatKsh(d.bonus.amountCents)}</strong>{' '}
              <PaymentStatusBadge status={d.bonus.status} date={d.bonus.paidOn} />
            </p>
          </Card>
        ) : null}
      </section>

      <section className="web-section" aria-labelledby="fac-fd-disp">
        <h2 id="fac-fd-disp" className="h3">
          Disputes
        </h2>
        <DataTable
          caption="Disputes from this farmer"
          columns={DISPUTE_COLUMNS}
          rows={d?.disputes ?? []}
          loading={!d}
          rowKey={(r) => r.uuid}
          onRowClick={(r) => navigate(`/factory/disputes/${r.uuid}`)}
          emptyMessage="No disputes from this farmer."
        />
      </section>
    </>
  );
}
