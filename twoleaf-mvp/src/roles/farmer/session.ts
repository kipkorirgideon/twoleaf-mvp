import { createContext, useContext } from 'react';
import type { Uuid } from '../../types';

/** Base path of the farmer app (App.tsx mounts it at `/farmer/*`). */
export const FARMER_BASE = '/farmer';

/** Who the farmer app acts as, from `api.getSession('farmer')`. */
export interface FarmerSession {
  personName: string;
  farmerUuid: Uuid;
}

export const FarmerSessionContext = createContext<FarmerSession | null>(null);

/** The farmer's session. Only used below <FarmerApp>, which renders pages once the session has loaded. */
export function useFarmerSession(): FarmerSession {
  const s = useContext(FarmerSessionContext);
  if (!s) throw new Error('useFarmerSession must be used inside FarmerApp');
  return s;
}
