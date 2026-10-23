/**
 * Clerk app (spec section 9): Geoffrey Kirui at TG-043 Kapsoit. English only.
 * Mounted by App.tsx at `/clerk/*`.
 */
import { useMemo } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useQuery } from '../../api';
import { PhoneError, PhoneLayout, PhoneLoading, PhoneScreen, type PhoneSidePanel, type PhoneTab } from '../../layouts/PhoneLayout';
import { ClerkHomePage } from './ClerkHomePage';
import { ClerkRecordPage } from './ClerkRecordPage';
import { ClerkSyncPage } from './ClerkSyncPage';
import { ClerkTodayPage } from './ClerkTodayPage';
import { CLERK_BASE, ClerkSessionContext, type ClerkSession } from './session';

const SIDE: PhoneSidePanel = {
  role: 'Buying centre clerk',
  person: 'Geoffrey Kirui · TG-043 Kapsoit',
  description: 'Weighs each farmer’s green leaf, scores a leaf sample and gives a receipt. Works offline when the signal drops.',
  tryThis: [
    'Record a delivery for farmer number 123.',
    'Switch to Offline, record two deliveries, then Sync now.',
    'Open the farmer app to see the new delivery.',
  ],
};

export function ClerkApp() {
  const sessionQ = useQuery((api) => api.getSession('clerk'), [], { live: false });
  const s = sessionQ.data;
  const session = useMemo<ClerkSession | null>(
    () =>
      s && s.factoryUuid && s.centreUuid && s.deviceId && s.staffUuid
        ? { personName: s.personName, factoryUuid: s.factoryUuid, centreUuid: s.centreUuid, deviceId: s.deviceId, staffUuid: s.staffUuid }
        : null,
    [s],
  );
  const deviceId = session?.deviceId ?? null;

  // Pending count for the Sync tab badge.
  const homeQ = useQuery((api) => api.getClerkHome(deviceId ?? ''), [deviceId], { enabled: deviceId !== null });
  const pending = homeQ.data?.pendingCount ?? 0;

  const tabs: PhoneTab[] = [
    { to: CLERK_BASE, label: 'Home', icon: 'home', end: true },
    { to: `${CLERK_BASE}/record`, label: 'Record', icon: 'scale' },
    { to: `${CLERK_BASE}/today`, label: 'Today', icon: 'receipt' },
    { to: `${CLERK_BASE}/sync`, label: 'Sync', icon: 'refresh', count: pending },
  ];

  return (
    <PhoneLayout appLabel="Clerk app" tabs={tabs} side={SIDE}>
      {session ? (
        <ClerkSessionContext.Provider value={session}>
          <Routes>
            <Route index element={<ClerkHomePage />} />
            <Route path="record/*" element={<ClerkRecordPage />} />
            <Route path="today/*" element={<ClerkTodayPage />} />
            <Route path="sync" element={<ClerkSyncPage />} />
            <Route path="*" element={<Navigate to={CLERK_BASE} replace />} />
          </Routes>
        </ClerkSessionContext.Provider>
      ) : (
        <PhoneScreen title="Clerk">
          {sessionQ.error ? (
            <PhoneError message={sessionQ.error.message} onRetry={sessionQ.reload} />
          ) : sessionQ.loading ? (
            <PhoneLoading />
          ) : (
            <PhoneError message="This demo has no clerk set up." />
          )}
        </PhoneScreen>
      )}
    </PhoneLayout>
  );
}
