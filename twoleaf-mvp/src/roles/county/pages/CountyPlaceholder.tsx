import { Alert, Card, Icon, QualityMeter, Skeleton, StatCard } from '../../../design-system';
import { useQuery } from '../../../api';
import { formatNumber } from '../../../lib/format';
import { PRIVACY_NOTE } from '../../../lib/labels';
import { LoadError, PageHeader } from '../../../layouts/WebLayout';
import { useCountyShell } from '../CountyContext';
import '../county.css';

export interface CountyPlaceholderProps {
  title: string;
  subtitle: string;
  /** What this page will hold once phase 7 builds it. */
  plan: string;
}

/**
 * Phase 3 placeholder for a county page. Loads the county overview through the
 * fake API (aggregates only) so loading and error states are exercised.
 */
export function CountyPlaceholder({ title, subtitle, plan }: CountyPlaceholderProps) {
  const { countyUuid } = useCountyShell();
  const q = useQuery((api) => api.getCountyOverview(countyUuid), [countyUuid]);

  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      <Alert tone="info" title="Built in phase 7">
        {plan}
      </Alert>

      {q.error && !q.data ? (
        <LoadError title="Could not load the county figures." message={q.error.message} onRetry={q.reload} />
      ) : (
        <div className="cty-stats" aria-busy={q.initialLoading}>
          {q.initialLoading || !q.data ? (
            [0, 1, 2, 3].map((i) => (
              <Card key={i} className="cty-stat-skeleton">
                <Skeleton width="50%" />
                <Skeleton width="70%" height={32} />
              </Card>
            ))
          ) : (
            <>
              <StatCard label="Factories" value={formatNumber(q.data.factoryCount)} />
              <StatCard label="Registered farmers" value={formatNumber(q.data.farmerCount)} />
              <StatCard label="Kilos this month" value={formatNumber(q.data.kgThisMonth)} unit="kg" />
              <StatCard label="Open disputes" value={formatNumber(q.data.openDisputes)} />
            </>
          )}
        </div>
      )}

      {q.data ? (
        <Card title="Average fine leaf" subtitle="All six factories this month">
          <QualityMeter value={q.data.avgFineLeafPct} target={q.data.target} />
        </Card>
      ) : null}

      <p className="cty-privacy">
        <Icon name="lock" />
        {PRIVACY_NOTE}
      </p>
    </>
  );
}
