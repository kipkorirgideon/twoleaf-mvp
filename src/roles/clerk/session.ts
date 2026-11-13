import { createContext, useContext } from 'react';
import type { DeviceId, Uuid } from '../../types';

/** Base path of the clerk app (App.tsx mounts it at `/clerk/*`). */
export const CLERK_BASE = '/clerk';

/** Who the clerk app acts as, from `api.getSession('clerk')`. */
export interface ClerkSession {
  personName: string;
  factoryUuid: Uuid;
  centreUuid: Uuid;
  deviceId: DeviceId;
  staffUuid: Uuid;
}

export const ClerkSessionContext = createContext<ClerkSession | null>(null);

/** The clerk's session. Only used below <ClerkApp>, which renders pages once the session has loaded. */
export function useClerkSession(): ClerkSession {
  const s = useContext(ClerkSessionContext);
  if (!s) throw new Error('useClerkSession must be used inside ClerkApp');
  return s;
}
