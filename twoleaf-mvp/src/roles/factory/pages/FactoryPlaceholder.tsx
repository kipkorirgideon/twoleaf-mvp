import type { ReactNode } from 'react';
import { Alert, Card, QualityMeter, Skeleton, StatCard } from '../../../design-system';
import { useQuery } from '../../../api';
import { formatNumber } from '../../../lib/format';
import type { Change } from '../../../types';
import { LoadError, PageHeader } from '../../../layouts/WebLayout';
import { useFactoryShell } from '../FactoryContext';
import '../factory.css';

/** Change → signed percent with one decimal, for StatCard's delta arrow. */
function signedPct(change: Change): number {
  const pct = Math.round(Math.abs(change.pct) * 10) / 10;
  return change.direction === 'down' ? -pct : pct;
}

export interface FactoryPlaceholderProps {
  title: string;
  subtitle: string;
  /** What this page will hold once phase 4 builds it. */
  plan: string;
  actions?: ReactNode;
}

/**
 * Phase 3 placeholder for a factory page. Loads the real dashboard through the
 * fake API so the loading, error and live-update states are exercised.
 */
export function FactoryPlaceholder({ title, subtitle, plan, actions }: FactoryPlaceholderProps) {
  const { factoryUuid } = useFactoryShell();
  const q = useQuery((api) => api.getFactoryDashboard(factoryUuid), [factoryUuid]);

  return (
    <>
      <PageHeader title={title} subtitle={subtitle} actions={actions} />
      <Alert tone="info" title="Built in phase 4">
        {plan}
      </Alert>

      {q.error && !q.data ? (
        <LoadError title="Could not load Tegat's figures." message={q.error.message} onRetry={q.reload} />
      ) : (
        <div className="fac-stats" aria-busy={q.initialLoading}>
          {q.initialLoading || !q.data ? (
            [0, 1, 2, 3].map((i) => (
              <Card key={i} className="fac-stat-skeleton">
                <Skeleton width="50%" />
                <Skeleton width="70%" height={32} />
              </Card>
            ))
          ) : (
            <>
              <StatCard label="Kilos today" value={formatNumber(q.data.factory.kgToday, 1)} unit="kg" />
              <StatCard
                label="Kilos this month"
                value={formatNumber(q.data.factory.kgThisMonth)}
                unit="kg"
                delta={signedPct(q.data.factory.changeVsLastMonth)}
              />
              <StatCard label="Active farmers" value={formatNumber(q.data.activeFarmers)} />
              <StatCard label="Open disputes" value={formatNumber(q.data.factory.openDisputes)} />
            </>
          )}
        </div>
      )}

      {q.data ? (
        <Card title="Fine leaf this month" subtitle="All Tegat buying centres, target 60%">
          <QualityMeter value={q.data.factory.fineLeafPct} target={60} />
        </Card>
      ) : null}
    </>
  );
}
