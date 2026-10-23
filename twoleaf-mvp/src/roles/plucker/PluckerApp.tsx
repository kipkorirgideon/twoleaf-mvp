/**
 * Plucker app (spec section 11): Faith Chebet. EN / SW through src/lib/i18n.ts.
 * Mounted by App.tsx at `/plucker/*`.
 */
import { useMemo } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useQuery } from '../../api';
import { PhoneError, PhoneLayout, PhoneLoading, PhoneScreen, type PhoneSidePanel, type PhoneTab } from '../../layouts/PhoneLayout';
import { useT } from '../../lib/i18n';
import { PluckerHomePage } from './PluckerHomePage';
import { PluckerMePage } from './PluckerMePage';
import { PluckerSessionsPage } from './PluckerSessionsPage';
import { PluckerTipsPage } from './PluckerTipsPage';
import { PLUCKER_BASE, PluckerSessionContext, type PluckerSession } from './session';

// The side panel sits outside the phone and is part of the English demo frame.
const SIDE: PhoneSidePanel = {
  role: 'Plucker',
  person: 'Faith Chebet',
  description: 'Picks tea for three farmers. TwoLeaf records each picking session; pay is agreed with the farmer.',
  tryThis: [
    'Switch the language to SW in the header.',
    'Filter Sessions by farmer.',
    'Read the quality tips based on her average.',
  ],
};

export function PluckerApp() {
  const t = useT();
  const sessionQ = useQuery((api) => api.getSession('plucker'), [], { live: false });
  const s = sessionQ.data;
  const session = useMemo<PluckerSession | null>(() => (s && s.pluckerUuid ? { personName: s.personName, pluckerUuid: s.pluckerUuid } : null), [s]);

  const tabs: PhoneTab[] = [
    { to: PLUCKER_BASE, label: t('tab.home'), icon: 'home', end: true },
    { to: `${PLUCKER_BASE}/sessions`, label: t('tab.sessions'), icon: 'leaf' },
    { to: `${PLUCKER_BASE}/tips`, label: t('tab.tips'), icon: 'info' },
    { to: `${PLUCKER_BASE}/me`, label: t('tab.me'), icon: 'users' },
  ];

  return (
    <PhoneLayout appLabel={t('app.plucker')} tabs={tabs} side={SIDE} langToggle>
      {session ? (
        <PluckerSessionContext.Provider value={session}>
          <Routes>
            <Route index element={<PluckerHomePage />} />
            <Route path="sessions" element={<PluckerSessionsPage />} />
            <Route path="tips" element={<PluckerTipsPage />} />
            <Route path="me" element={<PluckerMePage />} />
            <Route path="*" element={<Navigate to={PLUCKER_BASE} replace />} />
          </Routes>
        </PluckerSessionContext.Provider>
      ) : (
        <PhoneScreen title={t('app.plucker')}>
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
