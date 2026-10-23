/**
 * Farmer app (spec section 10): Kipkoech Ngetich. EN / SW through src/lib/i18n.ts.
 * Mounted by App.tsx at `/farmer/*`.
 */
import { useMemo } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useQuery } from '../../api';
import { PhoneError, PhoneLayout, PhoneLoading, PhoneScreen, type PhoneSidePanel, type PhoneTab } from '../../layouts/PhoneLayout';
import { useT } from '../../lib/i18n';
import { FarmerDeliveriesPage } from './FarmerDeliveriesPage';
import { FarmerDisputesPage } from './FarmerDisputesPage';
import { FarmerHomePage } from './FarmerHomePage';
import { FarmerMePage } from './FarmerMePage';
import { FarmerPaymentsPage } from './FarmerPaymentsPage';
import { FARMER_BASE, FarmerSessionContext, type FarmerSession } from './session';

// The side panel sits outside the phone and is part of the English demo frame.
const SIDE: PhoneSidePanel = {
  role: 'Farmer',
  person: 'Kipkoech Ngetich',
  description: 'Delivers green leaf to two buying centres: TG-043 at Tegat and TR-012 at Toror. Sees both combined, plus a card per centre.',
  tryThis: [
    'Switch the language to SW in the header.',
    'Open a delivery and tap Report a problem.',
    'Check Payments to see how the bonus is worked out.',
  ],
};

export function FarmerApp() {
  const t = useT();
  const sessionQ = useQuery((api) => api.getSession('farmer'), [], { live: false });
  const s = sessionQ.data;
  const session = useMemo<FarmerSession | null>(() => (s && s.farmerUuid ? { personName: s.personName, farmerUuid: s.farmerUuid } : null), [s]);

  const tabs: PhoneTab[] = [
    { to: FARMER_BASE, label: t('tab.home'), icon: 'home', end: true },
    { to: `${FARMER_BASE}/deliveries`, label: t('tab.deliveries'), icon: 'leaf' },
    { to: `${FARMER_BASE}/payments`, label: t('tab.payments'), icon: 'receipt' },
    { to: `${FARMER_BASE}/disputes`, label: t('tab.disputes'), icon: 'alert' },
    { to: `${FARMER_BASE}/me`, label: t('tab.me'), icon: 'users' },
  ];

  return (
    <PhoneLayout appLabel={t('app.farmer')} tabs={tabs} side={SIDE} langToggle>
      {session ? (
        <FarmerSessionContext.Provider value={session}>
          <Routes>
            <Route index element={<FarmerHomePage />} />
            <Route path="deliveries/*" element={<FarmerDeliveriesPage />} />
            <Route path="payments" element={<FarmerPaymentsPage />} />
            <Route path="disputes/*" element={<FarmerDisputesPage />} />
            <Route path="me" element={<FarmerMePage />} />
            <Route path="*" element={<Navigate to={FARMER_BASE} replace />} />
          </Routes>
        </FarmerSessionContext.Provider>
      ) : (
        <PhoneScreen title={t('app.farmer')}>
          {sessionQ.error ? (
            <PhoneError message={t('shell.error')} retryLabel={t('shell.tryAgain')} onRetry={sessionQ.reload} />
          ) : sessionQ.loading ? (
            <PhoneLoading label={t('shell.loading')} />
          ) : (
            <PhoneError message={t('shell.error')} />
          )}
        </PhoneScreen>
      )}
    </PhoneLayout>
  );
}
