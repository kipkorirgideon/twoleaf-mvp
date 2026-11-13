import { Suspense, lazy } from 'react';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { StoreProvider } from './store';
import { Icon, Spinner, ToastProvider } from './design-system';
import { DemoBar } from './components/DemoBar';
import { RolePicker } from './roles/RolePicker';
import { CountyApp } from './roles/county/CountyApp';
import { FactoryApp } from './roles/factory/FactoryApp';
import { ClerkApp } from './roles/clerk/ClerkApp';
import { FarmerApp } from './roles/farmer/FarmerApp';
import { PluckerApp } from './roles/plucker/PluckerApp';
import './AppShell.css';

/**
 * The design-system gallery is a developer page, so it is split out of the main
 * bundle. `DesignPage` is a named export, hence the `then` mapping to `default`.
 */
const DesignPage = lazy(() => import('./design-system/DesignPage').then((m) => ({ default: m.DesignPage })));

function RouteLoading() {
  return (
    <div className="app-route-loading">
      <Spinner label="Loading…" />
    </div>
  );
}

function NotFound() {
  return (
    <main className="app-not-found">
      <Icon name="map" />
      <h1 className="h2">Page not found</h1>
      <p className="body text-muted">This address is not part of the TwoLeaf demo.</p>
      <Link className="tl-btn tl-btn-primary" to="/">
        <Icon name="arrow-left" />
        <span>Choose a role</span>
      </Link>
    </main>
  );
}

/**
 * App root: store provider, router and the demo bar above every route.
 * `--demo-bar-height` is set on `.app-root` (AppShell.css) so layouts can size
 * themselves as `calc(100dvh - var(--demo-bar-height))`.
 */
export function App() {
  return (
    <StoreProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ToastProvider>
          <div className="app-root">
            <DemoBar />
          <div className="app-body">
            <Routes>
              <Route path="/" element={<RolePicker />} />
              <Route
                path="/design/*"
                element={
                  <Suspense fallback={<RouteLoading />}>
                    <DesignPage />
                  </Suspense>
                }
              />
              <Route path="/county/*" element={<CountyApp />} />
              <Route path="/factory/*" element={<FactoryApp />} />
              <Route path="/clerk/*" element={<ClerkApp />} />
              <Route path="/farmer/*" element={<FarmerApp />} />
              <Route path="/plucker/*" element={<PluckerApp />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </div>
          </div>
        </ToastProvider>
      </BrowserRouter>
    </StoreProvider>
  );
}
