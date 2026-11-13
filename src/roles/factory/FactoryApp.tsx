import { useMemo } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { Spinner, type SidebarGroup } from '../../design-system';
import { useQuery } from '../../api';
import { LoadError, PageHeader, WebLayout } from '../../layouts/WebLayout';
import { FactoryShellContext, type FactoryShell } from './FactoryContext';
import { DeliveryDrawer } from './components/DeliveryDrawer';
import { AuditPage } from './pages/AuditPage';
import { BonusPage } from './pages/BonusPage';
import { CentreDetailPage, CentresPage } from './pages/CentresPage';
import { DashboardPage } from './pages/DashboardPage';
import { DeliveriesPage } from './pages/DeliveriesPage';
import { DisputeDetailPage, DisputesPage } from './pages/DisputesPage';
import { FarmerDetailPage } from './pages/FarmerDetailPage';
import { FarmersPage } from './pages/FarmersPage';
import { PluckerDetailPage, PluckersPage } from './pages/PluckersPage';
import { QualityPage } from './pages/QualityPage';
import { RegisterFarmerPage } from './pages/RegisterFarmerPage';
import { SettingsPage } from './pages/SettingsPage';
import '../../components/web/web.css';
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
            <Route index element={<DashboardPage />} />
            <Route path="deliveries" element={<DeliveriesPage />} />
            <Route path="farmers" element={<FarmersPage />} />
            <Route path="farmers/new" element={<RegisterFarmerPage />} />
            <Route path="farmers/:farmerUuid" element={<FarmerDetailPage />} />
            <Route path="pluckers" element={<PluckersPage />} />
            <Route path="pluckers/:pluckerUuid" element={<PluckerDetailPage />} />
            <Route path="centres" element={<CentresPage />} />
            <Route path="centres/:centreUuid" element={<CentreDetailPage />} />
            <Route path="quality" element={<QualityPage />} />
            <Route path="bonus" element={<BonusPage />} />
            <Route path="disputes" element={<DisputesPage />} />
            <Route path="disputes/:disputeUuid" element={<DisputeDetailPage />} />
            <Route path="audit" element={<AuditPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<FactoryNotFound />} />
          </Routes>
          <DeliveryDrawer />
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
