import { Link } from 'react-router-dom';
import { Badge, Card, QualityMeter, StatCard } from '../../../design-system';
import { useQuery } from '../../../api';
import { formatKshPerKg, formatNumber, formatPct } from '../../../lib/format';
import { LoadError, PageHeader } from '../../../layouts/WebLayout';
import type { AttentionItem } from '../../../types';
import { PctBarChart } from '../../../components/web/Charts';
import { CardSkeleton, StatSkeletons } from '../../../components/web/common';
import { useCountyShell } from '../CountyContext';
import { PrivacyNote } from '../components/PrivacyNote';

const KIND_LABEL: Record<AttentionItem['kind'], string> = {
  below_target: 'Below quality target',
  centre_offline: 'Centre offline',
  dispute_rate: 'High dispute rate',
};

/** County overview: totals, fine leaf by factory, prices and what needs attention. */
export function CountyOverviewPage() {
  const { countyUuid } = useCountyShell();
  const q = useQuery((api) => api.getCountyOverview(countyUuid), [countyUuid]);
  const d = q.data;
  const p = d?.prices;
  const maxPrice = p ? Math.max(p.westOfRiftCentsPerKg, p.eastOfRiftCentsPerKg) : 1;
  const gapCents = p ? p.eastOfRiftCentsPerKg - p.westOfRiftCentsPerKg : 0;

  return (
    <>
      <PageHeader title="Overview" subtitle={d ? `${d.county.name} · all ${d.factoryCount} factories, in aggregate` : 'All factories, in aggregate'} />
      {q.error && !d ? <LoadError title="Could not load the county overview." message={q.error.message} onRetry={q.reload} /> : null}

      <div className="web-stats">
        {!d ? (
          <StatSkeletons count={5} />
        ) : (
          <>
            <StatCard label="Factories" value={formatNumber(d.factoryCount)} />
            <StatCard label="Registered farmers" value={formatNumber(d.farmerCount)} />
            <StatCard label="Kilos this month" value={formatNumber(d.kgThisMonth, 1)} unit="kg" />
            <Card className="tl-stat web-stat-meter">
              <span className="tl-stat-label">Average fine leaf</span>
              <QualityMeter value={d.avgFineLeafPct} target={d.target} label="All factories" />
            </Card>
            <StatCard label="Open disputes" value={formatNumber(d.openDisputes)} />
          </>
        )}
      </div>

      <div className="web-grid-2">
        <Card titleLevel={2} title="Fine leaf by factory" subtitle={d ? `This month, target ${d.target}%` : 'This month'}>
          {!d ? (
            <CardSkeleton lines={5} />
          ) : (
            <PctBarChart
              ariaLabel="Fine leaf by factory this month"
              target={d.target}
              bars={d.factories.map((f) => ({ key: f.uuid, label: f.shortName, pct: f.fineLeafPct }))}
            />
          )}
        </Card>

        <Card titleLevel={2} title="Average auction price" subtitle={p ? p.periodLabel : undefined}>
          {!p ? (
            <CardSkeleton lines={4} />
          ) : (
            <div className="cty-prices">
              <div className="cty-price-row">
                <span>West of Rift</span>
                <span className="cty-price-track" aria-hidden="true">
                  <span className="cty-price-fill cty-price-fill-low" style={{ display: 'block', width: `${(p.westOfRiftCentsPerKg / maxPrice) * 100}%` }} />
                </span>
                <strong className="tl-num">{formatKshPerKg(p.westOfRiftCentsPerKg)}</strong>
              </div>
              <div className="cty-price-row">
                <span>East of Rift</span>
                <span className="cty-price-track" aria-hidden="true">
                  <span className="cty-price-fill" style={{ display: 'block', width: `${(p.eastOfRiftCentsPerKg / maxPrice) * 100}%` }} />
                </span>
                <strong className="tl-num">{formatKshPerKg(p.eastOfRiftCentsPerKg)}</strong>
              </div>
              <p className="body-sm">
                <span aria-hidden="true">↓ </span>West of Rift sold for <strong>{formatKshPerKg(gapCents)} less</strong> ({formatPct((gapCents / p.eastOfRiftCentsPerKg) * 100)} lower).
              </p>
              <p className="body-sm text-muted">{p.note}</p>
            </div>
          )}
        </Card>
      </div>

      <Card titleLevel={2} title="Needs attention" subtitle="Factories under the quality target, centres offline for more than 2 hours, dispute rate above 0.5%">
        {!d ? (
          <CardSkeleton lines={4} />
        ) : d.needsAttention.length === 0 ? (
          <p className="body-sm text-muted">Nothing needs attention right now.</p>
        ) : (
          <ul className="cty-attention">
            {d.needsAttention.map((a, i) => (
              <li key={`${a.kind}-${a.factoryUuid}-${i}`}>
                <Badge tone={a.severity}>{KIND_LABEL[a.kind]}</Badge>
                <span className="cty-attention-text">
                  <span>{a.message}</span>
                  <Link to={`/county/factories/${a.factoryUuid}`}>Open {a.factoryName}</Link>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <PrivacyNote />
    </>
  );
}
