import { useMemo } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { Spinner, type SidebarGroup } from '../../design-system';
import { useQuery } from '../../api';
import { LoadError, PageHeader, WebLayout } from '../../layouts/WebLayout';
import { CountyShellContext, type CountyShell } from './CountyContext';
import { CountyAuditPage } from './pages/CountyAuditPage';
import { CountyDisputesPage } from './pages/CountyDisputesPage';
import { CountyFactoriesPage, CountyFactorySummaryPage } from './pages/CountyFactoriesPage';
import { CountyOverviewPage } from './pages/CountyOverviewPage';
import { CountyQualityPage } from './pages/CountyQualityPage';
import '../../components/web/web.css';
import './county.css';

const BASE = '/county';

const GROUPS: SidebarGroup[] = [
  {
    items: [
      { label: 'Overview', icon: 'home', to: BASE, end: true },
      { label: 'Factories', icon: 'map', to: `${BASE}/factories` },
      { label: 'Quality', icon: 'leaf', to: `${BASE}/quality` },
      { label: 'Disputes', icon: 'alert', to: `${BASE}/disputes` },
      { label: 'Audit & reports', icon: 'shield', to: `${BASE}/audit` },
    ],
  },
];

function CountyNotFound() {
  return (
    <>
      <PageHeader title="Page not found" subtitle="This page is not part of the county app." />
      <p className="body">
        <Link to={BASE}>Go to the overview</Link>
      </p>
    </>
  );
}

/** Kericho County Government app (`/county/*`): web layout and nested routes. Aggregates only. */
export function CountyApp() {
  const sessionQ = useQuery((api) => api.getSession('county'), [], { live: false });
  const countyUuid = sessionQ.data?.countyUuid ?? null;
  const countyQ = useQuery(
    (api) => (countyUuid ? api.getCounty(countyUuid) : Promise.reject(new Error('No county in this session.'))),
    [countyUuid],
    { enabled: countyUuid !== null, live: false },
  );
  const county = countyQ.data;

  const shell = useMemo<CountyShell | null>(
    () => (sessionQ.data && countyUuid ? { session: sessionQ.data, countyUuid } : null),
    [sessionQ.data, countyUuid],
  );

  const countyFailed = countyQ.error !== null && county === undefined;

  let content;
  if (sessionQ.error) {
    content = <LoadError title="Could not open the county app." message={sessionQ.error.message} onRetry={sessionQ.reload} />;
  } else if (countyFailed) {
    content = <LoadError title="Could not load the county." message={countyQ.error?.message} onRetry={countyQ.reload} />;
  } else if (!shell) {
    content = (
      <div className="cty-shell-state">
        <Spinner label="Loading the county app…" />
      </div>
    );
  } else {
    content = (
      <CountyShellContext.Provider value={shell}>
                  <Routes>
            <Route index element={<CountyOverviewPage />} />
            <Route path="factories" element={<CountyFactoriesPage />} />
            <Route path="factories/:factoryUuid" element={<CountyFactorySummaryPage />} />
            <Route path="quality" element={<CountyQualityPage />} />
            <Route path="disputes" element={<CountyDisputesPage />} />
            <Route path="audit" element={<CountyAuditPage />} />
            <Route path="*" element={<CountyNotFound />} />
          </Routes>
              </CountyShellContext.Provider>
    );
  }

  return (
    <WebLayout
      orgName={county?.name ?? 'County'}
      orgSubtitle={county ? `${county.readableId} · County ${county.officialCode}` : sessionQ.error || countyFailed ? 'Could not load' : 'Loading…'}
      groups={GROUPS}
    >
      {content}
    </WebLayout>
  );
}
