import { createContext, useContext } from 'react';
import type { FactoryOverview, Session, Uuid } from '../../types';

/** Who the factory app acts as. Provided by FactoryApp once the session has loaded. */
export interface FactoryShell {
  session: Session;
  /** Tegat's UUID: use it for every factory API call. */
  factoryUuid: Uuid;
  /** Live factory overview (name, readable ID, logo, open disputes). Undefined while the first load is in flight. */
  factory: FactoryOverview | undefined;
}

export const FactoryShellContext = createContext<FactoryShell | null>(null);

/** The factory session for pages inside FactoryApp. */
export function useFactoryShell(): FactoryShell {
  const v = useContext(FactoryShellContext);
  if (!v) throw new Error('useFactoryShell must be used inside FactoryApp');
  return v;
}
