/**
 * Identifier helpers. The only place branded `Uuid` and `ReadableId` values are created.
 */
import type { ReadableId, ReadableIdKind, Uuid } from '../types';

/** TwoLeaf region code for Kericho, fixed at registration. */
export const REGION_CODE = 'KCO';
const PREFIX = `TLF-${REGION_CODE}`;

/* ------------------------------------------------------------------ */
/* UUIDs                                                               */
/* ------------------------------------------------------------------ */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function isUuid(value: string): value is Uuid {
  return UUID_RE.test(value);
}

/** Brand a string as a Uuid, throwing if it is not UUID-shaped (e.g. from a route param). */
export function asUuid(value: string): Uuid {
  if (!isUuid(value)) throw new Error(`Not a UUID: ${value}`);
  return value;
}

/**
 * A v7-looking UUID: 48-bit millisecond timestamp prefix, version nibble 7,
 * variant bits 10xx, random remainder. `atMs` is required: pass the demo clock
 * (`demoNowMs()`) at runtime, or a seed timestamp. Pass a seeded `random` for deterministic output.
 */
export function generateUuidV7(atMs: number, random: () => number = Math.random): Uuid {
  const ts = Math.max(0, Math.floor(atMs)).toString(16).padStart(12, '0').slice(-12);
  const hex = (n: number): string => {
    let s = '';
    for (let i = 0; i < n; i += 1) s += Math.floor(random() * 16).toString(16);
    return s;
  };
  const variant = (8 + Math.floor(random() * 4)).toString(16);
  return `${ts.slice(0, 8)}-${ts.slice(8, 12)}-7${hex(3)}-${variant}${hex(3)}-${hex(12)}` as Uuid;
}

/* ------------------------------------------------------------------ */
/* Readable TwoLeaf IDs                                                */
/* ------------------------------------------------------------------ */

const pad = (n: number, width: number): string => String(n).padStart(width, '0');

export const countyReadableId = (): ReadableId => PREFIX as ReadableId;
/** `TLF-KCO-FAC-000014` */
export const factoryReadableId = (seq: number): ReadableId => `${PREFIX}-FAC-${pad(seq, 6)}` as ReadableId;
/** `TLF-KCO-BC-000231` */
export const centreReadableId = (seq: number): ReadableId => `${PREFIX}-BC-${pad(seq, 6)}` as ReadableId;
/** `TLF-KCO-FMR-0004817` */
export const farmerReadableId = (seq: number): ReadableId => `${PREFIX}-FMR-${pad(seq, 7)}` as ReadableId;
/** `TLF-KCO-PLK-0012094` */
export const pluckerReadableId = (seq: number): ReadableId => `${PREFIX}-PLK-${pad(seq, 7)}` as ReadableId;
/** `TLF-KCO-DLV-2026-00845123` */
export const deliveryReadableId = (year: number, seq: number): ReadableId =>
  `${PREFIX}-DLV-${year}-${pad(seq, 8)}` as ReadableId;
/** `TLF-KCO-DSP-2026-000318` */
export const disputeReadableId = (year: number, seq: number): ReadableId =>
  `${PREFIX}-DSP-${year}-${pad(seq, 6)}` as ReadableId;

const KIND_CODES: Record<string, ReadableIdKind> = {
  FAC: 'factory',
  BC: 'centre',
  FMR: 'farmer',
  PLK: 'plucker',
  DLV: 'delivery',
  DSP: 'dispute',
};

export interface ParsedReadableId {
  kind: ReadableIdKind;
  year: number | null;
  seq: number | null;
}

/** Parse a full readable ID. Returns null if it is not one. */
export function parseReadableId(value: string): ParsedReadableId | null {
  const v = value.trim().toUpperCase();
  if (v === PREFIX) return { kind: 'county', year: null, seq: null };
  const m = /^TLF-KCO-(FAC|BC|FMR|PLK|DLV|DSP)-(?:(\d{4})-)?(\d+)$/.exec(v);
  if (!m) return null;
  const kind = KIND_CODES[m[1] as string];
  if (!kind) return null;
  const hasYear = kind === 'delivery' || kind === 'dispute';
  if (hasYear !== Boolean(m[2])) return null;
  return { kind, year: m[2] ? Number(m[2]) : null, seq: Number(m[3]) };
}

/** Brand a known-good readable ID string (e.g. from user input after `parseReadableId`). */
export function asReadableId(value: string): ReadableId {
  if (!parseReadableId(value)) throw new Error(`Not a TwoLeaf ID: ${value}`);
  return value.trim().toUpperCase() as ReadableId;
}

/** Short form without the `TLF-KCO-` prefix, e.g. `FMR-0004817`. */
export function shortReadableId(id: ReadableId): string {
  return id.startsWith(`${PREFIX}-`) ? id.slice(PREFIX.length + 1) : id;
}

/* ------------------------------------------------------------------ */
/* External codes                                                      */
/* ------------------------------------------------------------------ */

/** `TG-043` → `TG043` (used inside device, scale and temp IDs). */
export const compactCentreCode = (centreCode: string): string => centreCode.replace('-', '');

/** `SCL-TG043-02` */
export const scaleIdFor = (centreCode: string, n: number): string => `SCL-${compactCentreCode(centreCode)}-${pad(n, 2)}`;

/** `DEV-TG043-01` */
export const deviceIdFor = (centreCode: string, n: number): string => `DEV-${compactCentreCode(centreCode)}-${pad(n, 2)}`;

/** Temporary ID for a delivery saved offline: `TMP-TG043-0007`. */
export const tempDeliveryId = (centreCode: string, seq: number): string => `TMP-${compactCentreCode(centreCode)}-${pad(seq, 4)}`;

/** Farmer reference as shown everywhere: `TG-043 / 123`. */
export function formatFarmerRef(centreCode: string, farmerNumber: string): string {
  return `${centreCode} / ${farmerNumber}`;
}

/** Normalise `tg043`, `TG 043`, `tg-43` → `TG-043`. Returns null if not a centre code. */
export function normaliseCentreCode(input: string): string | null {
  const m = /^\s*([A-Za-z]{2})\s*-?\s*(\d{1,3})\s*$/.exec(input);
  if (!m) return null;
  return `${(m[1] as string).toUpperCase()}-${(m[2] as string).padStart(3, '0')}`;
}

export interface ParsedFarmerRef {
  /** Null when only a number was typed. */
  centreCode: string | null;
  farmerNumber: string;
}

/**
 * Parse `TG-043 / 123`, `TG043/123`, `tg-043 123` or a bare number (`123`).
 * Returns null for anything else.
 */
export function parseFarmerRef(input: string): ParsedFarmerRef | null {
  const v = input.trim();
  const bare = /^(\d{1,4})$/.exec(v);
  if (bare) return { centreCode: null, farmerNumber: bare[1] as string };
  const m = /^([A-Za-z]{2})\s*-?\s*(\d{1,3})\s*[/\s]\s*(\d{1,4})$/.exec(v);
  if (!m) return null;
  return {
    centreCode: `${(m[1] as string).toUpperCase()}-${(m[2] as string).padStart(3, '0')}`,
    farmerNumber: m[3] as string,
  };
}

/** Compare farmer numbers ignoring leading zeros (`0123` matches `123`). */
export function sameFarmerNumber(a: string, b: string): boolean {
  return Number(a) === Number(b) && /^\d+$/.test(a) && /^\d+$/.test(b);
}

/** Farmer number padded to the centre's width (3 digits by default). */
export function padFarmerNumber(n: number, width = 3): string {
  return pad(n, width);
}
