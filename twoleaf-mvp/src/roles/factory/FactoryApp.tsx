import { useMemo } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { Spinner, type SidebarGroup } from '../../design-system';
import { useQuery } from '../../api';
import { LoadError, PageHeader, WebLayout } from '../../layouts/WebLayout';
import { FactoryShellContext, type FactoryShell } from './FactoryContext';
import { FactoryPlaceholder } from './pages/FactoryPlaceholder';
import './factory.css';

const BASE = '/factory';

function buildGroups(openDisputes: number): SidebarGroup[] {
  return [
    {
      items: [
        { label: 'Dashboard', icon: 'home', to: BASE, end: true },
        { label: 'Deliveries', icon: 'scale', to: `${BASE}/deliveries` },
        { label: 'Farmers', icon: 'users', to: `${BASE}/farmers` },
        { label: 'Pluckers', icon: 'leaf', to: `${BASE}/pluckers` },
        { label: 'Buying centres', icon: 'map', to: `${BASE}/centres` },
        { label: 'Quality', icon: 'chart', to: `${BASE}/quality` },
        { label: 'Bonus', icon: 'receipt', to: `${BASE}/bonus` },
        { label: 'Disputes', icon: 'alert', to: `${BASE}/disputes`, count: openDisputes },
        { label: 'Audit', icon: 'shield', to: `${BASE}/audit` },
        { label: 'Settings', icon: 'settings', to: `${BASE}/settings` },
      ],
    },
  ];
}

function FactoryNotFound() {
  return (
    <>
      <PageHeader title="Page not found" subtitle="This page is not part of the Tegat factory app." />
      <p className="body">
        <Link to={BASE}>Go to the dashboard</Link>
      </p>
    </>
  );
}

/** Tegat Tea Factory app (`/factory/*`): web layout and nested routes. */
export function FactoryApp() {
  const sessionQ = useQuery((api) => api.getSession('factory'), [], { live: false });
  const factoryUuid = sessionQ.data?.factoryUuid ?? null;
  // Live: refetches on every store change, so a new logo or dispute shows at once.
  const factoryQ = useQuery(
    (api) => (factoryUuid ? api.getFactory(factoryUuid) : Promise.reject(new Error('No factory in this session.'))),
    [factoryUuid],
    { enabled: factoryUuid !== null },
  );

  const factory = factoryQ.data;
  const groups = useMemo(() => buildGroups(factory?.openDisputes ?? 0), [factory?.openDisputes]);

  const shell = useMemo<FactoryShell | null>(
    () => (sessionQ.data && factoryUuid ? { session: sessionQ.data, factoryUuid, factory } : null),
    [sessionQ.data, factoryUuid, factory],
  );

  const factoryFailed = factoryQ.error !== null && factory === undefined;

  let content;
  if (sessionQ.error) {
    content = <LoadError title="Could not open the factory app." message={sessionQ.error.message} onRetry={sessionQ.reload} />;
  } else if (factoryFailed) {
    content = <LoadError title="Could not load the factory." message={factoryQ.error?.message} onRetry={factoryQ.reload} />;
  } else if (!shell) {
    content = (
      <div className="fac-shell-state">
        <Spinner label="Loading the factory app…" />
      </div>
    );
  } else {
    content = (
      <FactoryShellContext.Provider value={shell}>
        <Routes>
          <Route
            index
            element={
              <FactoryPlaceholder
                title="Dashboard"
                subtitle="Today at Tegat Tea Factory"
                plan="Kilos today and this month, active farmers, fine leaf, open disputes, offline centre alerts, quality by centre and the last 10 deliveries."
              />
            }
          />
          <Route
            path="deliveries/*"
            element={
              <FactoryPlaceholder
                title="Deliveries"
                subtitle="Every delivery at Tegat's buying centres"
                plan="Filters by centre, status, dates and search, the deliveries table and the delivery drawer with corrections."
              />
            }
          />
          <Route
            path="farmers/*"
            element={
              <FactoryPlaceholder
                title="Farmers"
                subtitle="Farmers registered at Tegat's buying centres"
                plan="Farmer search and table, Register farmer with a suggested farmer number, and the farmer detail page."
              />
            }
          />
          <Route
            path="pluckers/*"
            element={
              <FactoryPlaceholder
                title="Pluckers"
                subtitle="Pluckers recorded on Tegat deliveries"
                plan="Pluckers with farmers worked for, sessions, kilos and fine leaf this month, plus a detail page with sessions."
              />
            }
          />
          <Route
            path="centres/*"
            element={
              <FactoryPlaceholder
                title="Buying centres"
                subtitle="Tegat's six buying centres"
                plan="A card per centre with clerk, farmers, kilos, fine leaf, connectivity and last sync, and a centre detail page."
              />
            }
          />
          <Route
            path="quality/*"
            element={
              <FactoryPlaceholder
                title="Quality"
                subtitle="Fine leaf at the centre and at factory intake"
                plan="Centre score vs intake score and the transport gap per centre, top and bottom 5 farmers, and plucking tips."
              />
            }
          />
          <Route
            path="bonus/*"
            element={
              <FactoryPlaceholder
                title="Bonus"
                subtitle="Second payment for FY 2025/26"
                plan="Formula v2026.1 with every input and computed line, Recalculate, and a farmer bonus lookup."
              />
            }
          />
          <Route
            path="disputes/*"
            element={
              <FactoryPlaceholder
                title="Disputes"
                subtitle="Problems reported by farmers"
                plan="The dispute queue with deadlines, and dispute detail with Uphold (with a correction) or Reject."
              />
            }
          />
          <Route
            path="audit/*"
            element={
              <FactoryPlaceholder
                title="Audit"
                subtitle="Sealed days, chain verification and audit packs"
                plan="Verify chain, the demo-only tampering controls, sealed days, audit packs and the access log."
              />
            }
          />
          <Route
            path="settings/*"
            element={
              <FactoryPlaceholder
                title="Settings"
                subtitle="Factory logo, profile, users and roles"
                plan="Factory logo upload and removal, the factory profile, and users and roles."
              />
            }
          />
          <Route path="*" element={<FactoryNotFound />} />
        </Routes>
      </FactoryShellContext.Provider>
    );
  }

  return (
    <WebLayout
      orgName={factory?.name ?? 'Factory'}
      orgSubtitle={factory ? factory.readableId : sessionQ.error || factoryFailed ? 'Could not load' : 'Loading…'}
      logoUrl={factory?.logoDataUrl ?? undefined}
      groups={groups}
    >
      {content}
    </WebLayout>
  );
}
