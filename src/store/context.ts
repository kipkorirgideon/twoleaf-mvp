import { createContext, useContext } from 'react';
import type { Api } from '../api/client';
import type { AppState } from '../types';
import type { Action } from './actions';

export interface StoreContextValue {
  /** Current state (re-renders on every change). */
  state: AppState;
  /** Dispatch an action; returns the state after it. Prefer the API. */
  dispatch: (action: Action) => AppState;
  /** The fake API bound to this store. */
  api: Api;
}

export const StoreContext = createContext<StoreContextValue | null>(null);

export function useStoreContext(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}

/** Raw state and dispatch. Screens should load data through `useApi()` / `useQuery()` instead. */
export function useStore(): { state: AppState; dispatch: (action: Action) => AppState } {
  const { state, dispatch } = useStoreContext();
  return { state, dispatch };
}

/** Current state only, e.g. for the demo bar's open-dispute badge. */
export function useAppState(): AppState {
  return useStoreContext().state;
}
