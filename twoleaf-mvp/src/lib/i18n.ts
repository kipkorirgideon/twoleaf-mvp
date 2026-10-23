/**
 * English / Kiswahili dictionary for the farmer and plucker apps (spec section 12).
 *
 * NOTE: TRANSLATIONS NEED REVIEW. The Kiswahili strings below (apart from the
 * examples given in the spec) are draft translations. Have them reviewed by a
 * native Kiswahili speaker before any real use with farmers or pluckers.
 *
 * How it is typed:
 * - `en` is the source of truth; `MessageKey` is the union of its keys.
 * - `sw` is `Record<MessageKey, string>`, so a missing (or extra) Kiswahili key
 *   is a compile error and `npm run build` fails.
 *
 * Usage in a component:
 *   const t = useT();
 *   t('tab.home')                       // "Home" / "Nyumbani"
 *   t('greeting', { name: 'Kipkoech' }) // placeholders written as {name}
 *
 *   const [lang, setLang] = useLang();  // 'en' | 'sw', saved under "twoleaf-lang"
 *
 * The web apps and the clerk app are English only and do not use this file.
 */
import { useCallback, useSyncExternalStore } from 'react';
import type { DeliveryStatus, DisputeReason, DisputeStatus, FarmerPeriod, Lang, PaymentStatus } from '../types';

const en = {
  // App names and shell
  'app.farmer': 'Farmer app',
  'app.plucker': 'Plucker app',
  'shell.language': 'Language',
  'shell.back': 'Back',
  'shell.mainNav': 'Main menu',
  'shell.loading': 'Loading…',
  'shell.error': 'Could not load this page. Check your connection and try again.',
  'shell.tryAgain': 'Try again',
  'shell.comingSoon': 'This screen is built in phase 6.',

  // Tabs and page titles
  'tab.home': 'Home',
  'tab.deliveries': 'Deliveries',
  'tab.payments': 'Payments',
  'tab.disputes': 'Disputes',
  'tab.me': 'Me',
  'tab.sessions': 'Sessions',
  'tab.tips': 'Tips',

  // Common words
  'common.kg': 'kg',
  'common.kilos': 'Kilos',
  'common.kilosThisWeek': 'Kilos this week',
  'common.kilosThisMonth': 'Kilos this month',
  'common.leafQuality': 'Leaf quality',
  'common.fineLeaf': 'Fine leaf',
  'common.target': 'Target',
  'common.buyingCentre': 'Buying centre',
  'common.factory': 'Factory',
  'common.farmer': 'Farmer',
  'common.farmers': 'Farmers',
  'common.plucker': 'Plucker',
  'common.date': 'Date',
  'common.time': 'Time',
  'common.status': 'Status',
  'common.bonus': 'Bonus',
  'common.amount': 'Amount',
  'common.deliveries': 'Deliveries',
  'common.reportProblem': 'Report a problem',
  'common.send': 'Send',
  'common.cancel': 'Cancel',
  'common.note': 'Note',
  'common.deadline': 'Deadline',
  'common.theme': 'Theme',
  'common.twoLeafId': 'TwoLeaf ID',
  'common.phone': 'Phone',
  'common.myQrCard': 'My QR card',
  'common.demoQr': 'Demo QR',
  'common.farmersWorkedFor': 'Farmers worked for',
  'common.averageFineLeaf': 'Average fine leaf',

  // Greetings and messages
  'greeting': 'Hello, {name}',
  'plucker.payNote': 'Pay is agreed with the farmer. TwoLeaf records your work.',

  // Delivery statuses
  'deliveryStatus.synced': 'Recorded',
  'deliveryStatus.pending': 'Waiting to sync',
  'deliveryStatus.corrected': 'Corrected',
  'deliveryStatus.reversal': 'Reversal',

  // Dispute statuses
  'disputeStatus.open': 'Open',
  'disputeStatus.resolved': 'Resolved',
  'disputeStatus.resolved_upheld': 'Resolved: upheld',
  'disputeStatus.resolved_rejected': 'Resolved: rejected',

  // Dispute reasons
  'disputeReason.weight_wrong': 'Weight is wrong',
  'disputeReason.quality_wrong': 'Quality score is wrong',
  'disputeReason.delivery_missing': 'Delivery is missing',
  'disputeReason.wrong_farmer_number': 'Wrong farmer number',
  'disputeReason.other': 'Other',

  // Payment statuses
  'paymentStatus.paid': 'Paid',
  'paymentStatus.due': 'To be paid',

  // Farmer Home period selector
  'period.this_month': 'This month',
  'period.3_months': '3 months',
  'period.6_months': '6 months',
  'period.9_months': '9 months',
  'period.this_year': 'This year',
  'period.last_year': 'Last year',
} satisfies Record<string, string>;

export type MessageKey = keyof typeof en;

const sw: Record<MessageKey, string> = {
  'app.farmer': 'Programu ya mkulima',
  'app.plucker': 'Programu ya mchumaji',
  'shell.language': 'Lugha',
  'shell.back': 'Rudi',
  'shell.mainNav': 'Menyu kuu',
  'shell.loading': 'Inapakia…',
  'shell.error': 'Imeshindwa kupakia ukurasa huu. Angalia mtandao na ujaribu tena.',
  'shell.tryAgain': 'Jaribu tena',
  'shell.comingSoon': 'Skrini hii itajengwa katika awamu ya 6.',

  'tab.home': 'Nyumbani',
  'tab.deliveries': 'Uwasilishaji',
  'tab.payments': 'Malipo',
  'tab.disputes': 'Malalamiko',
  'tab.me': 'Mimi',
  'tab.sessions': 'Vipindi',
  'tab.tips': 'Vidokezo',

  'common.kg': 'kg',
  'common.kilos': 'Kilo',
  'common.kilosThisWeek': 'Kilo wiki hii',
  'common.kilosThisMonth': 'Kilo mwezi huu',
  'common.leafQuality': 'Ubora wa majani',
  'common.fineLeaf': 'Majani bora',
  'common.target': 'Lengo',
  'common.buyingCentre': 'Kituo cha kununulia',
  'common.factory': 'Kiwanda',
  'common.farmer': 'Mkulima',
  'common.farmers': 'Wakulima',
  'common.plucker': 'Mchumaji',
  'common.date': 'Tarehe',
  'common.time': 'Saa',
  'common.status': 'Hali',
  'common.bonus': 'Bonasi',
  'common.amount': 'Kiasi',
  'common.deliveries': 'Uwasilishaji',
  'common.reportProblem': 'Ripoti tatizo',
  'common.send': 'Tuma',
  'common.cancel': 'Ghairi',
  'common.note': 'Maelezo',
  'common.deadline': 'Tarehe ya mwisho',
  'common.theme': 'Mandhari',
  'common.twoLeafId': 'Nambari ya TwoLeaf',
  'common.phone': 'Simu',
  'common.myQrCard': 'Kadi yangu ya QR',
  'common.demoQr': 'QR ya majaribio',
  'common.farmersWorkedFor': 'Wakulima uliowafanyia kazi',
  'common.averageFineLeaf': 'Wastani wa majani bora',

  'greeting': 'Habari, {name}',
  'plucker.payNote': 'Malipo yanakubaliwa na mkulima. TwoLeaf inarekodi kazi yako.',

  'deliveryStatus.synced': 'Imerekodiwa',
  'deliveryStatus.pending': 'Inasubiri kusawazishwa',
  'deliveryStatus.corrected': 'Imesahihishwa',
  'deliveryStatus.reversal': 'Ubatilishaji',

  'disputeStatus.open': 'Wazi',
  'disputeStatus.resolved': 'Imetatuliwa',
  'disputeStatus.resolved_upheld': 'Imetatuliwa: imekubaliwa',
  'disputeStatus.resolved_rejected': 'Imetatuliwa: imekataliwa',

  'disputeReason.weight_wrong': 'Uzito si sahihi',
  'disputeReason.quality_wrong': 'Alama ya ubora si sahihi',
  'disputeReason.delivery_missing': 'Uwasilishaji haupo',
  'disputeReason.wrong_farmer_number': 'Nambari ya mkulima si sahihi',
  'disputeReason.other': 'Nyingine',

  'paymentStatus.paid': 'Imelipwa',
  'paymentStatus.due': 'Italipwa',

  'period.this_month': 'Mwezi huu',
  'period.3_months': 'Miezi 3',
  'period.6_months': 'Miezi 6',
  'period.9_months': 'Miezi 9',
  'period.this_year': 'Mwaka huu',
  'period.last_year': 'Mwaka jana',
};

export const MESSAGES: Record<Lang, Record<MessageKey, string>> = { en, sw };

export const LANGS: readonly Lang[] = ['en', 'sw'];
export const LANG_LABEL: Record<Lang, string> = { en: 'EN', sw: 'SW' };
/** Full language names, each written in its own language. */
export const LANG_NAME: Record<Lang, string> = { en: 'English', sw: 'Kiswahili' };

export type MessageVars = Record<string, string | number>;

/** Looks up a message and fills `{name}` placeholders. */
export function translate(lang: Lang, key: MessageKey, vars?: MessageVars): string {
  const text = MESSAGES[lang][key];
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}

/* Typed key helpers for statuses and options, so callers never build keys by hand. */
export const deliveryStatusKey = (s: DeliveryStatus): MessageKey => `deliveryStatus.${s}`;
export const disputeStatusKey = (s: DisputeStatus): MessageKey => `disputeStatus.${s}`;
export const disputeReasonKey = (r: DisputeReason): MessageKey => `disputeReason.${r}`;
export const paymentStatusKey = (s: PaymentStatus): MessageKey => `paymentStatus.${s}`;
export const periodKey = (p: FarmerPeriod): MessageKey => `period.${p}`;

/* ------------------------------------------------------------------ */
/* Language store (shared by every component, no provider needed)      */
/* ------------------------------------------------------------------ */

export const LANG_STORAGE_KEY = 'twoleaf-lang';

function isLang(v: unknown): v is Lang {
  return v === 'en' || v === 'sw';
}

function readStoredLang(): Lang {
  try {
    const v = window.localStorage.getItem(LANG_STORAGE_KEY);
    return isLang(v) ? v : 'en';
  } catch {
    return 'en';
  }
}

let currentLang: Lang | null = null;
const listeners = new Set<() => void>();

export function getLang(): Lang {
  if (currentLang === null) currentLang = readStoredLang();
  return currentLang;
}

/** Sets the language for the farmer and plucker apps and saves the choice. */
export function setLang(lang: Lang): void {
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // Storage can be unavailable (private mode); the choice still applies for this session.
  }
  currentLang = lang;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Current language plus a setter that saves the choice. */
export function useLang(): [Lang, (lang: Lang) => void] {
  const lang = useSyncExternalStore(subscribe, getLang, () => 'en' as Lang);
  const set = useCallback((l: Lang) => setLang(l), []);
  return [lang, set];
}

export type Translate = (key: MessageKey, vars?: MessageVars) => string;

/** Translator bound to the current language. Re-renders when the language changes. */
export function useT(): Translate {
  const [lang] = useLang();
  return useCallback((key: MessageKey, vars?: MessageVars) => translate(lang, key, vars), [lang]);
}
