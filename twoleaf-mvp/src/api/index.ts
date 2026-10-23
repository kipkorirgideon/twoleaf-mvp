/**
 * Fake API entry point.
 *
 * Wrap the app once in `<StoreProvider>` (from `src/store`), then in any component:
 *   const api = useApi();                       // the typed API object
 *   const q = useQuery((api) => api.listCentres(factoryUuid), [factoryUuid]);
 *
 * Get the demo identities (factory, centre, device, farmer, plucker UUIDs) from
 * `api.getSession(role)`.
 */
export { createApi, type Api, type StoreHandle } from './client';
export { useApi, useMutation, useQuery, type MutationResult, type QueryOptions, type QueryResult } from './hooks';
export * from './types';
