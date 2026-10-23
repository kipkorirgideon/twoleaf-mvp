import { useMemo } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { Spinner, type SidebarGroup } from '../../design-system';
import { useQuery } from '../../api';
import { LoadError, PageHeader, WebLayout } from '../../layouts/WebLayout';
import { CountyShellContext, type CountyShell } from './CountyContext';
import { CountyPlaceholder } from './pages/CountyPlaceholder';
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
  // The county's name and codes for the sidebar (no farmer-level data in this response).
  const countyQ = useQuery(
    (api) => (countyUuid ? api.getCountyOverview(countyUuid) : Promise.reject(new Error('No county in this session.'))),
    [countyUuid],
    { enabled: countyUuid !== null, live: false },
  );
  const county = countyQ.data?.county;

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
          <Route
            index
            element={
              <CountyPlaceholder
                title="Overview"
                subtitle="All factories in Kericho County, in aggregate"
                plan="Stat cards, fine leaf by factory against the 60% target, West vs East of Rift prices, and what needs attention."
              />
            }
          />
          <Route
            path="factories/*"
            element={
              <CountyPlaceholder
                title="Factories"
                subtitle="Factory-level figures for the six factories"
                plan="The factories table and a summary per factory with a 6-month kilos trend and quality by buying centre."
              />
            }
          />
          <Route
            path="quality/*"
            element={
              <CountyPlaceholder
                title="Quality"
                subtitle="Fine leaf by factory over the last 6 months"
                plan="Fine leaf per factory over 6 months and the centre vs intake gap per factory."
              />
            }
          />
          <Route
            path="disputes/*"
            element={
              <CountyPlaceholder
                title="Disputes"
                subtitle="Dispute counts and rates by factory"
                plan="Counts and rates per factory, average days to resolve and the oldest open dispute."
              />
            }
          />
          <Route
            path="audit/*"
            element={
              <CountyPlaceholder
                title="Audit & reports"
                subtitle="Chain status, audit packs and the access log"
                plan="Chain status per factory, prepared audit packs, Prepare audit pack, and the access log."
              />
            }
          />
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
