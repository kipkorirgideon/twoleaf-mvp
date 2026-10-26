import { Badge, DataTable, StatCard, type DataTableColumn } from '../../../design-system';
import { useQuery } from '../../../api';
import { formatDate, formatNumber, formatPct } from '../../../lib/format';
import { LoadError, PageHeader } from '../../../layouts/WebLayout';
import type { CountyDisputeRow } from '../../../types';
import { StatSkeletons } from '../../../components/web/common';
import { useCountyShell } from '../CountyContext';
import { PrivacyNote } from '../components/PrivacyNote';

const RATE_LIMIT = 0.5;

const COLUMNS: DataTableColumn<CountyDisputeRow>[] = [
  { key: 'factory', label: 'Factory', render: (r) => <span className="web-nowrap">{r.factory.name}</span> },
  { key: 'open', label: 'Open', align: 'right', render: (r) => formatNumber(r.openDisputes) },
  { key: 'opened', label: 'Opened this FY', align: 'right', render: (r) => formatNumber(r.openedThisFy) },
  { key: 'resolved', label: 'Resolved this FY', align: 'right', render: (r) => formatNumber(r.resolvedThisFy) },
  {
    key: 'rate',
    label: 'Dispute rate',
    render: (r) =>
      r.disputeRatePct > RATE_LIMIT ? (
        <Badge tone="warning">{`${formatPct(r.disputeRatePct, 2)} · above 0.5%`}</Badge>
      ) : (
        <Badge tone="neutral">{formatPct(r.disputeRatePct, 2)}</Badge>
      ),
  },
  { key: 'days', label: 'Avg days to resolve', align: 'right', render: (r) => formatNumber(r.avgDaysToResolve, 1) },
  {
    key: 'oldest',
    label: 'Oldest open',
    render: (r) =>
      r.oldestOpenAt && r.oldestOpenDays !== null ? (
        <span className="web-cell-2">
          <span className="web-nowrap">{r.oldestOpenDays === 0 ? 'Today' : `${formatNumber(r.oldestOpenDays)} ${r.oldestOpenDays === 1 ? 'day' : 'days'}`}</span>
          <span className="text-muted body-sm web-nowrap">since {formatDate(r.oldestOpenAt)}</span>
        </span>
      ) : (
        <span className="text-muted">None open</span>
      ),
  },
];

/** Dispute counts and rates per factory. No individual farmer details. */
export function CountyDisputesPage() {
  const { countyUuid } = useCountyShell();
  const q = useQuery((api) => api.getCountyDisputes(countyUuid), [countyUuid]);
  const rows = q.data;
  const open = rows?.reduce((a, r) => a + r.openDisputes, 0) ?? 0;
  const opened = rows?.reduce((a, r) => a + r.openedThisFy, 0) ?? 0;
  const resolved = rows?.reduce((a, r) => a + r.resolvedThisFy, 0) ?? 0;
  const high = rows?.filter((r) => r.disputeRatePct > RATE_LIMIT).length ?? 0;

  return (
    <>
      <PageHeader title="Disputes" subtitle="Problems farmers reported to their factory, counted per factory. Factories respond within 7 days." />
      {q.error && !rows ? <LoadError title="Could not load dispute figures." message={q.error.message} onRetry={q.reload} /> : null}
      <div className="web-stats">
        {!rows ? (
          <StatSkeletons count={4} />
        ) : (
          <>
            <StatCard label="Open now" value={formatNumber(open)} />
            <StatCard label="Opened this FY" value={formatNumber(opened)} />
            <StatCard label="Resolved this FY" value={formatNumber(resolved)} />
            <StatCard label="Factories above 0.5%" value={formatNumber(high)} />
          </>
        )}
      </div>
      <DataTable caption="Disputes by factory" columns={COLUMNS} rows={rows ?? []} loading={!rows} rowKey={(r) => r.factory.uuid} emptyMessage="No disputes reported this year." />
      <p className="body-sm text-muted">Dispute rate is open disputes per 100 registered farmers. Above 0.5% needs attention.</p>
      <PrivacyNote />
    </>
  );
}
