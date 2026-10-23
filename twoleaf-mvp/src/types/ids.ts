/**
 * Identifier types.
 *
 * Every record has three identifiers (spec section 3):
 *  - `key`: internal integer, never shown.
 *  - `uuid`: v7-style UUID, used only in fake API arguments / URLs, never on screen.
 *  - `readableId`: TwoLeaf ID such as `TLF-KCO-FMR-0004817`, shown on screens via `IdTag`.
 *
 * Both string identifiers are branded so they cannot be mixed up with each other or
 * with plain strings. Create them only through the helpers in `src/lib/ids.ts`.
 */

/** v7-style UUID. Create with `generateUuidV7()` or `asUuid()` from `src/lib/ids.ts`. */
export type Uuid = string & { readonly __brand: 'Uuid' };

/** Readable TwoLeaf ID (`TLF-KCO-…`). Create with the formatters in `src/lib/ids.ts`. */
export type ReadableId = string & { readonly __brand: 'ReadableId' };

/** The kinds of readable ID defined in spec section 3. */
export type ReadableIdKind =
  | 'county'
  | 'factory'
  | 'centre'
  | 'farmer'
  | 'plucker'
  | 'delivery'
  | 'dispute';

/** Internal integer key. Never shown in the UI. */
export type InternalKey = number;

/** Clerk device ID, e.g. `DEV-TG043-01`. Not secret, may be shown. */
export type DeviceId = string;

/**
 * ISO 8601 date-time string, always written in East Africa Time with an explicit
 * offset, e.g. `2026-10-23T15:00:00.000+03:00`. Build with `toEatIso()` in `src/lib/time.ts`.
 */
export type IsoDateTime = string;

/** Calendar date in EAT, `YYYY-MM-DD`. */
export type IsoDate = string;

/** Calendar month in EAT, `YYYY-MM`. */
export type MonthKey = string;
