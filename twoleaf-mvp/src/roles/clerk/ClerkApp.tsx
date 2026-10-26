/**
 * Clerk app (spec section 9): Geoffrey Kirui at TG-043 Kapsoit. English only.
 * Mounted by App.tsx at `/clerk/*`.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useQuery } from '../../api';
import { ToastProvider, ToastRegion } from '../../design-system';
import { PhoneError, PhoneLayout, PhoneLoading, PhoneScreen, type PhoneSidePanel, type PhoneTab } from '../../layouts/PhoneLayout';
import { ClerkDeliveryDetailPage } from './ClerkDeliveryDetailPage';
import { ClerkHomePage } from './ClerkHomePage';
import { ClerkRecordPage } from './ClerkRecordPage';
import { ClerkSyncPage } from './ClerkSyncPage';
import { ClerkTodayPage } from './ClerkTodayPage';
import { ClerkHomeContext, ClerkPendingBadgeContext, EMPTY_DRAFT, RecordDraftContext, type RecordDraft, type RecordDraftContextValue } from './ClerkContext';
import { CLERK_BASE, ClerkSessionContext, type ClerkSession } from './session';
import './clerk.css';

const SIDE: PhoneSidePanel = {
  role: 'Buying centre clerk',
  person: 'Geoffrey Kirui · TG-043 Kapsoit',
  description: 'Weighs each farmer’s green leaf, scores a leaf sample and gives a receipt. Works offline when the signal drops.',
  tryThis: [
    'Record a delivery for farmer number 123, then open the farmer or factory app.',
    'Switch to Offline on Home, record two deliveries, then Sync now.',
    'Open Today and tap a delivery to see its details.',
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

  // Live clerk Home: Sync tab badge, plus scale IDs and Online / Offline for the Record steps.
  const homeQ = useQuery((api) => api.getClerkHome(deviceId ?? ''), [deviceId], { enabled: deviceId !== null });
  const [pendingOverride, setPendingOverride] = useState<number | null>(null);
  // Fresh Home data always wins over a temporary count set by the Sync page.
  useEffect(() => setPendingOverride(null), [homeQ.data]);
  const pending = pendingOverride ?? homeQ.data?.pendingCount ?? 0;

  // In-progress delivery: kept here so it survives switching tabs.
  const [draft, setDraft] = useState<RecordDraft>(EMPTY_DRAFT);
  const update = useCallback((patch: Partial<RecordDraft>) => setDraft((d) => ({ ...d, ...patch })), []);
  const reset = useCallback(() => setDraft(EMPTY_DRAFT), []);
  const draftValue = useMemo<RecordDraftContextValue>(() => ({ draft, update, reset }), [draft, update, reset]);


  const tabs: PhoneTab[] = [
    { to: CLERK_BASE, label: 'Home', icon: 'home', end: true },
    { to: `${CLERK_BASE}/record`, label: 'Record', icon: 'scale' },
    { to: `${CLERK_BASE}/today`, label: 'Today', icon: 'receipt' },
    { to: `${CLERK_BASE}/sync`, label: 'Sync', icon: 'refresh', count: pending },
  ];

  return (
    <ToastProvider region={false}>
      <PhoneLayout appLabel="Clerk app" tabs={tabs} side={SIDE}>
        {session ? (
          <ClerkSessionContext.Provider value={session}>
            <ClerkHomeContext.Provider value={homeQ.data}>
              <RecordDraftContext.Provider value={draftValue}>
                <ClerkPendingBadgeContext.Provider value={setPendingOverride}>
                  <Routes>
                    <Route index element={<ClerkHomePage />} />
                    <Route path="record" element={<ClerkRecordPage />} />
                    <Route path="today" element={<ClerkTodayPage />} />
                    <Route path="today/:deliveryUuid" element={<ClerkDeliveryDetailPage />} />
                    <Route path="sync" element={<ClerkSyncPage />} />
                    <Route path="*" element={<Navigate to={CLERK_BASE} replace />} />
                  </Routes>
                </ClerkPendingBadgeContext.Provider>
              </RecordDraftContext.Provider>
            </ClerkHomeContext.Provider>
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
        {/* Toasts sit inside the phone frame, above the tab bar. */}
        <ToastRegion placement="inside" />
      </PhoneLayout>
    </ToastProvider>
  );
}
