import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { StoreProvider } from './store';
import { DesignPage } from './design-system/DesignPage';
import { Icon, ToastProvider } from './design-system';
import { DemoBar } from './components/DemoBar';
import { RolePicker } from './roles/RolePicker';
import { CountyApp } from './roles/county/CountyApp';
import { FactoryApp } from './roles/factory/FactoryApp';
import { ClerkApp } from './roles/clerk/ClerkApp';
import { FarmerApp } from './roles/farmer/FarmerApp';
import { PluckerApp } from './roles/plucker/PluckerApp';
import './AppShell.css';

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
              <Route path="/design/*" element={<DesignPage />} />
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
