import { Card, DataTable, QualityMeter, type DataTableColumn } from '../../../design-system';
import { useQuery } from '../../../api';
import { formatPts } from '../../../lib/format';
import { LoadError, PageHeader } from '../../../layouts/WebLayout';
import type { CountyQualityRow } from '../../../types';
import { FineLeafLineChart } from '../../../components/web/Charts';
import { CardSkeleton } from '../../../components/web/common';
import { useCountyShell } from '../CountyContext';
import { PrivacyNote } from '../components/PrivacyNote';

function gapText(gap: number): string {
  return gap > 0 ? `↓ ${formatPts(gap, 1)} lost in transport` : `${formatPts(gap, 1)}: no loss in transport`;
}

const GAP_COLUMNS: DataTableColumn<CountyQualityRow>[] = [
  { key: 'factory', label: 'Factory', render: (r) => <span className="web-nowrap">{r.factory.name}</span> },
  {
    key: 'centre',
    label: 'Centre score',
    render: (r) => (
      <span className="cty-table-meter">
        <QualityMeter value={r.current.centreFineLeafPct} target={60} label="At centres" />
      </span>
    ),
  },
  {
    key: 'intake',
    label: 'Intake score',
    render: (r) => (
      <span className="cty-table-meter">
        <QualityMeter value={r.current.intakeFineLeafPct} target={60} label="At intake" />
      </span>
    ),
  },
  { key: 'gap', label: 'Transport gap', render: (r) => <span className="web-nowrap">{gapText(r.current.gapPts)}</span> },
];

/** Fine leaf per factory over 6 months, and the centre vs intake gap. */
export function CountyQualityPage() {
  const { countyUuid } = useCountyShell();
  const q = useQuery((api) => api.getCountyQuality(countyUuid), [countyUuid]);
  const rows = q.data;

  return (
    <>
      <PageHeader title="Quality" subtitle="Share of fine leaf (two leaves and a bud) by factory. The Tea Board target is 60%." />
      {q.error && !rows ? <LoadError title="Could not load quality figures." message={q.error.message} onRetry={q.reload} /> : null}

      <section className="web-section" aria-labelledby="cty-q-months">
        <h2 id="cty-q-months" className="h3">
          Fine leaf, last 6 months
        </h2>
        <div className="cty-multiples">
          {!rows
            ? Array.from({ length: 6 }, (_, i) => (
                <Card key={i}>
                  <CardSkeleton lines={5} />
                </Card>
              ))
            : rows.map((r) => (
                <Card key={r.factory.uuid} title={r.factory.name} subtitle={gapText(r.current.gapPts)}>
                  <FineLeafLineChart
                    target={60}
                    months={r.months.map((m) => ({ month: m.month, fineLeafPct: m.fineLeafPct, intakeFineLeafPct: m.intakeFineLeafPct, kg: 0, deliveries: 0 }))}
                  />
                </Card>
              ))}
        </div>
      </section>

      <section className="web-section" aria-labelledby="cty-q-gap">
        <h2 id="cty-q-gap" className="h3">
          Centre score vs intake score
        </h2>
        <p className="body text-muted">
          Each lot is scored at the buying centre and again at factory intake. The gap shows leaf damaged on the way: bruised in tight bags, heated in
          the sun, or left too long before collection.
        </p>
        <DataTable caption="Centre score vs intake score by factory" columns={GAP_COLUMNS} rows={rows ?? []} loading={!rows} rowKey={(r) => r.factory.uuid} emptyMessage="No quality figures yet." />
      </section>

      <PrivacyNote />
    </>
  );
}
