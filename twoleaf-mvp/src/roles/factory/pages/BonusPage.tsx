import { useState } from 'react';
import { Alert, Badge, Button, Card, DataTable, SelectField, Skeleton, type DataTableColumn } from '../../../design-system';
import { useMutation, useQuery } from '../../../api';
import { formatDate, formatKg, formatKsh, formatKshPerKg, formatKshPerKgExact, formatNumber } from '../../../lib/format';
import { LoadError, PageHeader } from '../../../layouts/WebLayout';
import type { BonusLine, Uuid } from '../../../types';
import { useFactoryShell } from '../FactoryContext';
import { PaymentStatusBadge } from '../components/Badges';
import { CardSkeleton } from '../../../components/web/common';

function lineValue(l: BonusLine): string {
  switch (l.kind) {
    case 'kg':
      return `${formatNumber(l.value)} kg`;
    case 'money':
      return formatKsh(l.value, { decimals: 0 });
    case 'money_per_kg':
      return formatKshPerKg(l.value);
    default: {
      const never: never = l.kind;
      return String(never);
    }
  }
}

const COLUMNS: DataTableColumn<BonusLine>[] = [
  {
    key: 'label',
    label: 'Line',
    render: (l) => (
      <span className={l.key === 'bonus_per_kg' || l.key === 'left_for_second_payment' ? 'fac-strong' : undefined}>
        {l.label} {l.computed ? <Badge tone="info">Computed</Badge> : <Badge tone="neutral">Saved input</Badge>}
      </span>
    ),
  },
  { key: 'formula', label: 'How', render: (l) => (l.formula ? <span className="text-muted body-sm">{l.formula}</span> : <span className="text-muted">–</span>) },
  {
    key: 'value',
    label: 'Value',
    align: 'right',
    render: (l) => <span className={l.key === 'bonus_per_kg' ? 'web-nowrap fac-strong' : 'web-nowrap'}>{lineValue(l)}</span>,
  },
];

/** FY 2025/26 bonus (second payment): saved inputs, every computed line, recalculation and a farmer lookup. */
export function BonusPage() {
  const { factoryUuid } = useFactoryShell();
  const q = useQuery((api) => api.getBonus(factoryUuid), [factoryUuid]);
  const recalc = useMutation((api) => api.recalculateBonus(factoryUuid));
  const farmersQ = useQuery((api) => api.listFarmers({ factoryUuid }), [factoryUuid], { live: false });
  const [farmer, setFarmer] = useState('');
  const farmerUuid = farmer ? (farmer as Uuid) : null;
  const bonusQ = useQuery((api) => (farmerUuid ? api.getFarmerBonus(factoryUuid, farmerUuid) : Promise.reject(new Error('Choose a farmer.'))), [factoryUuid, farmerUuid], {
    enabled: farmerUuid !== null,
  });
  const fb = bonusQ.data && farmerUuid ? bonusQ.data : undefined;
  const d = q.data;
  const comp = d?.computation;

  // One option per farmer (a farmer may hold two numbers at this factory).
  const farmerOptions = (farmersQ.data ?? []).filter((r, i, all) => all.findIndex((x) => x.farmer.uuid === r.farmer.uuid) === i);

  return (
    <>
      <PageHeader
        title="Bonus"
        subtitle={d ? `Second payment for FY ${d.declaration.fy} (${formatDate(d.declaration.fyStart)} – ${formatDate(d.declaration.fyEnd)})` : 'Second payment'}
        actions={
          <Button icon="refresh" onClick={() => void recalc.run(undefined).catch(() => undefined)} disabled={!comp || recalc.pending}>
            {recalc.pending ? 'Recalculating…' : 'Recalculate'}
          </Button>
        }
      />
      {q.error && !d ? <LoadError title="Could not load the bonus." message={q.error.message} onRetry={q.reload} /> : null}

      {recalc.data ? (
        <Alert tone={recalc.data.matches ? 'success' : 'warning'} title="Recalculated">
          {recalc.data.message}
        </Alert>
      ) : null}
      {recalc.error ? <Alert tone="danger" title="Could not recalculate">{recalc.error.message}</Alert> : null}

      <div className="web-grid-2">
        <Card titleLevel={2} title="Declared bonus" subtitle="TwoLeaf shows and explains payments. The factory makes them.">
          {!d ? (
            <CardSkeleton />
          ) : (
            <div className="web-stack-sm">
              <p className="fac-big-figure tl-num">{formatKshPerKg(d.declaration.declaredPerKgCents)}</p>
              <p className="body-sm text-muted">
                Declared {formatDate(d.declaration.declaredOn)} · paid {formatDate(d.declaration.paidOn)}
              </p>
              <p className="body-sm">
                Formula version <span className="mono">{d.declaration.formulaVersion ?? 'not recorded'}</span>
              </p>
            </div>
          )}
        </Card>
        <Card titleLevel={2} title="Farmer bonus lookup" subtitle="FY kilos × rate = bonus">
          <div className="web-stack">
            <SelectField label="Farmer" value={farmer} onChange={(e) => setFarmer(e.target.value)} disabled={!farmersQ.data}>
              <option value="">{farmersQ.data ? 'Choose a farmer' : 'Loading farmers…'}</option>
              {farmerOptions.map((r) => (
                <option key={r.farmer.uuid} value={r.farmer.uuid}>
                  {r.farmer.name} ({r.farmer.farmerRef})
                </option>
              ))}
            </SelectField>
            {farmerUuid && bonusQ.error && !fb ? <LoadError title="Could not load this farmer's bonus." message={bonusQ.error.message} onRetry={bonusQ.reload} /> : null}
            {farmerUuid && !fb && !bonusQ.error ? <Skeleton height={24} /> : null}
            {fb ? (
              <div className="web-stack-sm" aria-live="polite">
                <p className="body tl-num">
                  {formatKg(fb.kg)} × {formatKshPerKg(fb.ratePerKgCents)} = <strong>{formatKsh(fb.amountCents)}</strong>
                </p>
                <span>
                  <PaymentStatusBadge status={fb.status} date={fb.paidOn} />
                </span>
                <p className="body-sm text-muted">Kilos delivered to this factory in FY {fb.fy}, after corrections.</p>
              </div>
            ) : null}
            {!farmerUuid ? <p className="body-sm text-muted">Choose a farmer to see their bonus.</p> : null}
          </div>
        </Card>
      </div>

      <section className="web-section" aria-labelledby="fac-bonus-lines">
        <div className="fac-section-head">
          <h2 id="fac-bonus-lines" className="h3">
            How the bonus is computed
          </h2>
          {comp ? <span className="body-sm text-muted">Formula {comp.formulaVersion}, from saved inputs</span> : null}
        </div>
        {d && !comp ? (
          <Alert tone="info">Only the declared figure is held for this factory.</Alert>
        ) : (
          <DataTable caption="Bonus computation lines" columns={COLUMNS} rows={comp?.lines ?? []} loading={!d} loadingRows={9} rowKey={(l) => l.key} emptyMessage="No saved inputs." />
        )}
        {comp ? (
          <p className="body-sm text-muted">
            Left for second payment ÷ green leaf received = {formatKshPerKgExact(comp.bonusPerKgCentsExact, 4)}, rounded to{' '}
            {formatKshPerKgExact(comp.bonusPerKgCents, 2)}.
          </p>
        ) : null}
      </section>
    </>
  );
}
