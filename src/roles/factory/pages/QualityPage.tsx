import { Card, DataTable, QualityMeter, StatCard, type DataTableColumn } from '../../../design-system';
import { useQuery } from '../../../api';
import { formatKg, formatPct, formatPts } from '../../../lib/format';
import { LoadError, PageHeader } from '../../../layouts/WebLayout';
import type { FarmerQualityRow, QualityReport } from '../../../types';
import { useFactoryShell } from '../FactoryContext';
import { CardSkeleton, StatSkeletons } from '../../../components/web/common';

const FARMER_COLUMNS: DataTableColumn<FarmerQualityRow>[] = [
  { key: 'name', label: 'Farmer', render: (r) => <span className="web-nowrap">{r.farmer.name}</span> },
  { key: 'ref', label: 'Centre / number', render: (r) => <span className="web-nowrap">{r.farmer.farmerRef}</span> },
  { key: 'kg', label: 'Kilos', align: 'right', render: (r) => <span className="web-nowrap">{formatKg(r.kg)}</span> },
  { key: 'fine', label: 'Fine leaf', align: 'right', render: (r) => formatPct(r.fineLeafPct, 1) },
];

type CentreRow = QualityReport['centres'][number];

function gapWords(gap: number): string {
  if (gap <= 0) return 'No loss in transport.';
  if (gap < 2) return 'Small loss in transport.';
  if (gap < 4) return 'Some leaf is damaged on the way.';
  return 'Large loss: check how long leaf waits for collection.';
}

const CENTRE_COLUMNS: DataTableColumn<CentreRow>[] = [
  { key: 'centre', label: 'Buying centre', render: (r) => <span className="web-nowrap">{`${r.code} ${r.name}`}</span> },
  { key: 'centreScore', label: 'Centre score', render: (r) => <QualityMeter value={r.centreFineLeafPct} target={60} label="At centre" /> },
  { key: 'intake', label: 'Intake score', render: (r) => <QualityMeter value={r.intakeFineLeafPct} target={60} label="At intake" /> },
  {
    key: 'gap',
    label: 'Transport gap',
    render: (r) => (
      <span className="web-cell-2">
        <strong className="tl-num">{r.gapPts > 0 ? `↓ ${formatPts(r.gapPts, 1)}` : formatPts(r.gapPts, 1)}</strong>
        <span className="text-muted body-sm">{gapWords(r.gapPts)}</span>
      </span>
    ),
  },
  { key: 'kg', label: 'Kilos this month', align: 'right', render: (r) => <span className="web-nowrap">{formatKg(r.kgThisMonth)}</span> },
];

/** Leaf quality: centre vs intake per centre, best and worst farmers, plucking tips. */
export function QualityPage() {
  const { factoryUuid } = useFactoryShell();
  const q = useQuery((api) => api.getQualityReport(factoryUuid), [factoryUuid]);
  const d = q.data;

  return (
    <>
      <PageHeader title="Quality" subtitle="Share of fine leaf (two leaves and a bud) this month. The Tea Board target is 60%." />
      {q.error && !d ? <LoadError title="Could not load the quality report." message={q.error.message} onRetry={q.reload} /> : null}

      <div className="web-stats">
        {!d ? (
          <StatSkeletons count={3} />
        ) : (
          <>
            <Card className="tl-stat web-stat-meter">
              <span className="tl-stat-label">At the buying centres</span>
              <QualityMeter value={d.factoryFineLeafPct} target={d.target} label="Centre score" />
            </Card>
            <Card className="tl-stat web-stat-meter">
              <span className="tl-stat-label">At factory intake</span>
              <QualityMeter value={d.factoryIntakeFineLeafPct} target={d.target} label="Intake score" />
            </Card>
            <StatCard label="Transport gap" value={formatPts(Math.round((d.factoryFineLeafPct - d.factoryIntakeFineLeafPct) * 10) / 10, 1)} />
          </>
        )}
      </div>

      <section className="web-section" aria-labelledby="fac-q-centres">
        <h2 id="fac-q-centres" className="h3">
          Centre score vs intake score
        </h2>
        <p className="body text-muted">
          The clerk scores a sample when the farmer delivers. The factory scores the same lot again at intake. The gap between the two is leaf
          damaged in transport: bruised in tight bags, heated in the sun, or left waiting too long for the lorry.
        </p>
        <div className="fac-quality-table">
          <DataTable caption="Centre score vs intake score by buying centre" columns={CENTRE_COLUMNS} rows={d?.centres ?? []} loading={!d} rowKey={(r) => r.uuid} emptyMessage="No deliveries this month yet." />
        </div>
      </section>

      <div className="web-grid-2">
        <section className="web-section" aria-labelledby="fac-q-top">
          <h2 id="fac-q-top" className="h3">
            Top 5 farmers this month
          </h2>
          <DataTable caption="Top 5 farmers by fine leaf this month" columns={FARMER_COLUMNS} rows={d?.topFarmers.slice(0, 5) ?? []} loading={!d} rowKey={(r) => r.farmer.membershipUuid} emptyMessage="No deliveries this month yet." />
        </section>
        <section className="web-section" aria-labelledby="fac-q-bottom">
          <h2 id="fac-q-bottom" className="h3">
            Bottom 5 farmers this month
          </h2>
          <DataTable
            caption="Bottom 5 farmers by fine leaf this month"
            columns={FARMER_COLUMNS}
            rows={d?.bottomFarmers.slice(0, 5) ?? []}
            loading={!d}
            rowKey={(r) => r.farmer.membershipUuid}
            emptyMessage="No deliveries this month yet."
          />
        </section>
      </div>

      <Card titleLevel={2} title="Plucking tips clerks share with farmers" subtitle="Short advice for farmers below the target">
        {!d ? (
          <CardSkeleton lines={4} />
        ) : (
          <ul className="fac-tips">
            {d.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
