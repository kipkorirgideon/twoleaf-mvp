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
 *   const f = useLocalFormat();         // dates and months in the current language
 *   f.date('2026-10-23')                // "23 Oct 2026" / "23 Okt 2026"
 *
 *   const [lang, setLang] = useLang();  // 'en' | 'sw', saved under "twoleaf-lang"
 *
 * Money ("KSh 1,234.50"), kilos and percentages read the same in both languages,
 * so they use `lib/format.ts` directly.
 *
 * The web apps and the clerk app are English only and do not use this file.
 */
import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type { DisputeReason, DisputeStatus, FarmerPeriod, IsoDate, IsoDateTime, Lang, MonthKey } from '../types';
import { formatTime } from './format';
import { dateKeyOf } from './time';

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
  'shell.notFound': 'This page was not found.',
  'shell.showMore': 'Show more',
  'shell.settings': 'Settings',
  'shell.dismiss': 'Dismiss',

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
  'common.averageFineLeaf': 'Average fine leaf',
  'common.averageFineLeafMonth': 'Average fine leaf this month',
  'common.buyingCentre': 'Buying centre',
  'common.allCentres': 'All centres',
  'common.factory': 'Factory',
  'common.farmer': 'Farmer',
  'common.allFarmers': 'All farmers',
  'common.total': 'Total',
  'common.reportProblem': 'Report a problem',
  'common.send': 'Send',
  'common.theme': 'Theme',
  'common.twoLeafId': 'TwoLeaf ID',
  'common.phone': 'Phone',
  'common.farmerNumber': 'Farmer number',
  'common.myQrCard': 'My QR card',
  'common.demoQr': 'Demo QR',
  'common.farmersWorkedFor': 'Farmers worked for',
  'common.pickedBy': 'Picked by',
  'common.pickedByFarmer': 'You picked it',
  'common.clerk': 'Clerk',
  'common.scale': 'Scale',
  'common.period': 'Period',
  'common.paid': 'Paid',
  'common.toBePaid': 'To be paid',
  'common.centreScore': 'Buying centre score',
  'common.intakeScore': 'Factory intake score',
  'common.notScored': 'Factory intake score: not scored yet.',
  'common.photoEstimate': 'Photo estimate {pct}%',
  'common.leafPhoto': 'Leaf sample photo',
  'common.dateTime': 'Date and time',

  // Quality meter caption
  'meter.meets': 'Meets the {target}% target',
  'meter.below': '{gap} points below the {target}% target',
  'meter.belowOne': '1 point below the {target}% target',
  'meter.aria': '{label} {value}%, target {target}%',

  // Theme toggle
  'theme.light': 'Light',
  'theme.dark': 'Dark',
  'theme.group': 'Colour theme',

  // Greetings and messages
  'greeting': 'Hello, {name}',
  'plucker.payNote': 'Pay is agreed with the farmer. TwoLeaf records your work.',

  // Ledger entries as a farmer sees them
  'entry.recorded': 'Recorded',
  'entry.pending': 'Waiting to sync',
  'entry.replaced': 'Replaced',
  'entry.reversal': 'Cancels old entry',
  'entry.correction': 'Corrected entry',
  'entry.recordedHelp': 'Recorded at the buying centre and sent to the factory.',
  'entry.pendingHelp': 'The buying centre saved this without signal. It gets its TwoLeaf ID when their device syncs.',
  'entry.replacedHelp': 'This delivery was corrected. The corrected entry replaces it. Both stay in your record.',
  'entry.reversalHelp': 'This entry takes away the old weight, so it is not counted twice.',
  'entry.correctionHelp': 'This entry replaces an earlier delivery after a correction.',
  'entry.reason': 'Reason: {reason}',

  // Dispute statuses
  'disputeStatus.open': 'Open',
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

  // Farmer Home
  'home.totals': 'All my buying centres',
  'home.deliveriesCount': '{count} deliveries',
  'home.byCentre': 'By buying centre',
  'home.thisMonthPay': 'This month: {amount}',
  'home.toBePaidOn': 'To be paid {date}',
  'home.paidOn': 'Paid {date}',
  'home.chartTitle': 'Kilos, last 6 months',
  'home.chartLabel': 'Kilos delivered each month: {list}',
  'home.tipTitle': 'Tip to raise your leaf quality',
  'home.tipBody': 'Your fine leaf share is {pct}%, below the {target}% target. Pick two leaves and a bud, leave the coarse third leaf, and deliver soon after picking.',
  'home.noDeliveries': 'No deliveries in this period.',

  // Deliveries
  'deliveries.count': '{count} entries',
  'deliveries.empty': 'No deliveries yet.',
  'deliveries.detailTitle': 'Delivery',
  'deliveries.related': 'Linked entries',
  'deliveries.alreadyReported': 'You have reported a problem with this delivery. The factory will reply in Disputes.',
  'deliveries.seeDisputes': 'See my disputes',

  // Report a problem
  'report.about': 'About this delivery',
  'report.reasonLegend': 'What is wrong?',
  'report.noteLabel': 'Tell us more (optional)',
  'report.noteLabelRequired': 'Tell us what went wrong',
  'report.noteHint': 'For example: my own scale showed 32 kg.',
  'report.centreLabel': 'Which buying centre?',
  'report.chooseReason': 'Choose what is wrong.',
  'report.chooseCentre': 'Choose the buying centre.',
  'report.noteRequired': 'Write a few words about the problem.',
  'report.noteTooLong': 'Keep the note under 500 characters.',
  'report.sending': 'Sending…',
  'report.errorDuplicate': 'You have already reported a problem with this delivery.',
  'report.errorGeneric': 'Could not send your report. Try again.',
  'report.sentTitle': 'Problem reported',
  'report.sentBody': '{factory} has until {date} to reply. You will see the reply in Disputes.',
  'report.missingIntro': 'Use this if a delivery is missing from your statement.',
  'report.missingButton': 'Report a missing delivery',

  // Payments
  'payments.intro': 'TwoLeaf shows what your factory pays you and how it is worked out. TwoLeaf does not send money.',
  'payments.monthly': 'Monthly payments',
  'payments.bonusSection': 'Bonus (second payment)',
  'payments.noDeliveries': 'No deliveries',
  'payments.bonusTitle': 'Bonus FY {fy}',
  'payments.bonusSentence': '{factory} sold made tea at {price}/kg on average. After costs, levies and monthly payments, {rate} was left for every kg of green leaf. You delivered {kg} kg, so your bonus is {amount}.',
  'payments.bonusPaidOn': 'Paid on {date}',
  'payments.bonusDueOn': 'To be paid on {date}',
  'payments.breakdown': 'How {factory} worked it out',
  'payments.formula': 'Formula {version}',
  'payments.noBreakdown': 'The factory has not shared the figures behind this bonus.',
  'payments.empty': 'No payments to show yet.',
  'payments.leftFormula': 'Income − costs − levies − monthly payments',

  // Bonus breakdown lines
  'bonusLine.made_tea_sold': 'Made tea sold',
  'bonusLine.avg_auction_price': 'Average auction price',
  'bonusLine.auction_income': 'Auction income',
  'bonusLine.green_leaf_received': 'Green leaf received',
  'bonusLine.processing_costs': 'Processing costs',
  'bonusLine.management_fee_levies': 'Management fee and levies',
  'bonusLine.monthly_payments': 'Monthly payments already made',
  'bonusLine.left_for_second_payment': 'Left for second payment',
  'bonusLine.bonus_per_kg': 'Bonus per kg',

  // Disputes
  'disputes.empty': 'You have not reported any problems.',
  'disputes.opened': 'Reported {date}',
  'disputes.replyBy': 'Factory replies by {date}',
  'disputes.overdue': 'Reply was due {date}',
  'disputes.waiting': 'Waiting for the factory to reply.',
  'disputes.response': 'Factory’s response',
  'disputes.respondedOn': 'Replied {date}',
  'disputes.yourNote': 'Your note',
  'disputes.delivery': 'Delivery {id}',
  'disputes.seeCorrected': 'See the corrected delivery',

  // Me
  'me.qrHelp': 'Show this card at the buying centre so the clerk can find you quickly.',
  'me.qrLabel': 'Demo QR code for {name}. Not a real code.',
  'me.joinedOn': 'Joined {date}',
  'me.memberships': 'My buying centres',
  'me.pluckers': 'My pluckers',
  'me.linkedFarmers': 'Farmers I pick for',

  // Plucker
  'plucker.sessionsThisMonth': 'Sessions this month',
  'plucker.sessionsEmpty': 'No picking sessions yet.',
  'plucker.sessionsCount': '{count} sessions',
  'plucker.tipsAverage': 'Your fine leaf share is {pct}%.',
  'plucker.tipsBelow': 'Pick two leaves and a bud; leave the coarse third leaf.',
  'plucker.tipsAbove': 'Well done: you are above the {target}% target. Keep picking two leaves and a bud.',
  'plucker.tipsNoData': 'No sessions in the last 30 days, so there is no score yet.',
  'plucker.tipsBasedOn': 'Based on your sessions in the last 30 days.',
  'plucker.guidanceTitle': 'Good plucking',
  'tip.1': 'Pick only two leaves and a bud from each shoot.',
  'tip.2': 'Leave the hard third leaf and old stems on the bush.',
  'tip.3': 'Snap the shoot with your fingers; do not crush or tear it.',
  'tip.4': 'Carry leaf loosely in an open basket, not a pressed sack.',
  'tip.5': 'Keep picked leaf in the shade and bring it to the buying centre the same day.',
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
  'shell.notFound': 'Ukurasa huu haukupatikana.',
  'shell.showMore': 'Onyesha zaidi',
  'shell.settings': 'Mipangilio',
  'shell.dismiss': 'Funga',

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
  'common.averageFineLeaf': 'Wastani wa majani bora',
  'common.averageFineLeafMonth': 'Wastani wa majani bora mwezi huu',
  'common.buyingCentre': 'Kituo cha kununulia',
  'common.allCentres': 'Vituo vyote',
  'common.factory': 'Kiwanda',
  'common.farmer': 'Mkulima',
  'common.allFarmers': 'Wakulima wote',
  'common.total': 'Jumla',
  'common.reportProblem': 'Ripoti tatizo',
  'common.send': 'Tuma',
  'common.theme': 'Mandhari',
  'common.twoLeafId': 'Nambari ya TwoLeaf',
  'common.phone': 'Simu',
  'common.farmerNumber': 'Nambari ya mkulima',
  'common.myQrCard': 'Kadi yangu ya QR',
  'common.demoQr': 'QR ya majaribio',
  'common.farmersWorkedFor': 'Wakulima uliowafanyia kazi',
  'common.pickedBy': 'Imechumwa na',
  'common.pickedByFarmer': 'Ulichuma mwenyewe',
  'common.clerk': 'Karani',
  'common.scale': 'Mizani',
  'common.period': 'Kipindi',
  'common.paid': 'Imelipwa',
  'common.toBePaid': 'Italipwa',
  'common.centreScore': 'Alama ya kituo',
  'common.intakeScore': 'Alama ya kiwandani',
  'common.notScored': 'Alama ya kiwandani: bado haijapimwa.',
  'common.photoEstimate': 'Makadirio ya picha {pct}%',
  'common.leafPhoto': 'Picha ya sampuli ya majani',
  'common.dateTime': 'Tarehe na saa',

  'meter.meets': 'Imefikia lengo la {target}%',
  'meter.below': 'Alama {gap} chini ya lengo la {target}%',
  'meter.belowOne': 'Alama 1 chini ya lengo la {target}%',
  'meter.aria': '{label} {value}%, lengo {target}%',

  'theme.light': 'Mwanga',
  'theme.dark': 'Giza',
  'theme.group': 'Rangi ya skrini',

  'greeting': 'Habari, {name}',
  'plucker.payNote': 'Malipo yanakubaliwa na mkulima. TwoLeaf inarekodi kazi yako.',

  'entry.recorded': 'Imerekodiwa',
  'entry.pending': 'Inasubiri kutumwa',
  'entry.replaced': 'Imebadilishwa',
  'entry.reversal': 'Inafuta rekodi ya zamani',
  'entry.correction': 'Rekodi iliyosahihishwa',
  'entry.recordedHelp': 'Imerekodiwa kituoni na kutumwa kiwandani.',
  'entry.pendingHelp': 'Kituo kilihifadhi hii bila mtandao. Itapata nambari ya TwoLeaf kifaa chao kikituma.',
  'entry.replacedHelp': 'Uwasilishaji huu ulisahihishwa. Rekodi iliyosahihishwa inachukua nafasi yake. Zote zinabaki kwenye rekodi yako.',
  'entry.reversalHelp': 'Rekodi hii inaondoa uzito wa zamani ili usihesabiwe mara mbili.',
  'entry.correctionHelp': 'Rekodi hii inachukua nafasi ya uwasilishaji wa awali baada ya kusahihishwa.',
  'entry.reason': 'Sababu: {reason}',

  'disputeStatus.open': 'Wazi',
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

  'home.totals': 'Vituo vyangu vyote',
  'home.deliveriesCount': 'Uwasilishaji {count}',
  'home.byCentre': 'Kwa kila kituo',
  'home.thisMonthPay': 'Mwezi huu: {amount}',
  'home.toBePaidOn': 'Italipwa {date}',
  'home.paidOn': 'Imelipwa {date}',
  'home.chartTitle': 'Kilo, miezi 6 iliyopita',
  'home.chartLabel': 'Kilo zilizowasilishwa kila mwezi: {list}',
  'home.tipTitle': 'Kidokezo cha kuongeza ubora wa majani',
  'home.tipBody': 'Sehemu yako ya majani bora ni {pct}%, chini ya lengo la {target}%. Chuma majani mawili na chipukizi, acha jani la tatu gumu, na uwasilishe mapema baada ya kuchuma.',
  'home.noDeliveries': 'Hakuna uwasilishaji katika kipindi hiki.',

  'deliveries.count': 'Rekodi {count}',
  'deliveries.empty': 'Bado hakuna uwasilishaji.',
  'deliveries.detailTitle': 'Uwasilishaji',
  'deliveries.related': 'Rekodi zinazohusiana',
  'deliveries.alreadyReported': 'Umeripoti tatizo kuhusu uwasilishaji huu. Kiwanda kitajibu kwenye Malalamiko.',
  'deliveries.seeDisputes': 'Tazama malalamiko yangu',

  'report.about': 'Kuhusu uwasilishaji huu',
  'report.reasonLegend': 'Tatizo ni nini?',
  'report.noteLabel': 'Tueleze zaidi (si lazima)',
  'report.noteLabelRequired': 'Tueleze kilichokwenda vibaya',
  'report.noteHint': 'Kwa mfano: mizani yangu ilionyesha kg 32.',
  'report.centreLabel': 'Kituo kipi?',
  'report.chooseReason': 'Chagua tatizo.',
  'report.chooseCentre': 'Chagua kituo cha kununulia.',
  'report.noteRequired': 'Andika maneno machache kuhusu tatizo.',
  'report.noteTooLong': 'Maelezo yasizidi herufi 500.',
  'report.sending': 'Inatuma…',
  'report.errorDuplicate': 'Tayari umeripoti tatizo kuhusu uwasilishaji huu.',
  'report.errorGeneric': 'Imeshindwa kutuma ripoti yako. Jaribu tena.',
  'report.sentTitle': 'Tatizo limeripotiwa',
  'report.sentBody': '{factory} kina hadi {date} kujibu. Utaona jibu kwenye Malalamiko.',
  'report.missingIntro': 'Tumia hii kama uwasilishaji haupo kwenye taarifa yako.',
  'report.missingButton': 'Ripoti uwasilishaji uliokosekana',

  'payments.intro': 'TwoLeaf inaonyesha malipo ya kiwanda chako na jinsi yanavyokokotolewa. TwoLeaf haitumi pesa.',
  'payments.monthly': 'Malipo ya kila mwezi',
  'payments.bonusSection': 'Bonasi (malipo ya pili)',
  'payments.noDeliveries': 'Hakuna uwasilishaji',
  'payments.bonusTitle': 'Bonasi mwaka wa fedha {fy}',
  'payments.bonusSentence': '{factory} kiliuza chai iliyotengenezwa kwa wastani wa {price} kwa kilo. Baada ya gharama, ushuru na malipo ya kila mwezi, {rate} kilibaki kwa kila kilo ya majani mabichi. Uliwasilisha kilo {kg}, kwa hiyo bonasi yako ni {amount}.',
  'payments.bonusPaidOn': 'Ililipwa {date}',
  'payments.bonusDueOn': 'Italipwa {date}',
  'payments.breakdown': 'Jinsi {factory} kilivyokokotoa',
  'payments.formula': 'Fomula {version}',
  'payments.noBreakdown': 'Kiwanda hakijatoa takwimu za bonasi hii.',
  'payments.empty': 'Bado hakuna malipo ya kuonyesha.',
  'payments.leftFormula': 'Mapato − gharama − ushuru − malipo ya kila mwezi',

  'bonusLine.made_tea_sold': 'Chai iliyotengenezwa na kuuzwa',
  'bonusLine.avg_auction_price': 'Wastani wa bei ya mnada',
  'bonusLine.auction_income': 'Mapato ya mnada',
  'bonusLine.green_leaf_received': 'Majani mabichi yaliyopokelewa',
  'bonusLine.processing_costs': 'Gharama za usindikaji',
  'bonusLine.management_fee_levies': 'Ada ya usimamizi na ushuru',
  'bonusLine.monthly_payments': 'Malipo ya kila mwezi yaliyokwisha lipwa',
  'bonusLine.left_for_second_payment': 'Kilichobaki kwa malipo ya pili',
  'bonusLine.bonus_per_kg': 'Bonasi kwa kilo',

  'disputes.empty': 'Hujaripoti tatizo lolote.',
  'disputes.opened': 'Iliripotiwa {date}',
  'disputes.replyBy': 'Kiwanda kitajibu kufikia {date}',
  'disputes.overdue': 'Jibu lilitakiwa {date}',
  'disputes.waiting': 'Inasubiri jibu la kiwanda.',
  'disputes.response': 'Jibu la kiwanda',
  'disputes.respondedOn': 'Ilijibiwa {date}',
  'disputes.yourNote': 'Maelezo yako',
  'disputes.delivery': 'Uwasilishaji {id}',
  'disputes.seeCorrected': 'Tazama uwasilishaji uliosahihishwa',

  'me.qrHelp': 'Onyesha kadi hii kituoni ili karani akupate haraka.',
  'me.qrLabel': 'QR ya majaribio ya {name}. Si msimbo halisi.',
  'me.joinedOn': 'Ulijiunga {date}',
  'me.memberships': 'Vituo vyangu vya kununulia',
  'me.pluckers': 'Wachumaji wangu',
  'me.linkedFarmers': 'Wakulima ninaowachumia',

  'plucker.sessionsThisMonth': 'Vipindi mwezi huu',
  'plucker.sessionsEmpty': 'Bado hakuna vipindi vya kuchuma.',
  'plucker.sessionsCount': 'Vipindi {count}',
  'plucker.tipsAverage': 'Sehemu yako ya majani bora ni {pct}%.',
  'plucker.tipsBelow': 'Chuma majani mawili na chipukizi; acha jani la tatu gumu.',
  'plucker.tipsAbove': 'Hongera: uko juu ya lengo la {target}%. Endelea kuchuma majani mawili na chipukizi.',
  'plucker.tipsNoData': 'Hakuna vipindi katika siku 30 zilizopita, kwa hiyo bado hakuna alama.',
  'plucker.tipsBasedOn': 'Kulingana na vipindi vyako vya siku 30 zilizopita.',
  'plucker.guidanceTitle': 'Uchumaji bora',
  'tip.1': 'Chuma majani mawili na chipukizi tu kwa kila tawi changa.',
  'tip.2': 'Acha jani la tatu gumu na mashina ya zamani kichakani.',
  'tip.3': 'Vunja tawi kwa vidole; usiliponde wala kulirarua.',
  'tip.4': 'Beba majani kwa ulegevu kwenye kikapu wazi, si gunia lililoshindiliwa.',
  'tip.5': 'Weka majani yaliyochumwa kivulini na uyapeleke kituoni siku hiyo hiyo.',
};

const MESSAGES: Record<Lang, Record<MessageKey, string>> = { en, sw };

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
export const disputeStatusKey = (s: DisputeStatus): MessageKey => `disputeStatus.${s}`;
export const disputeReasonKey = (r: DisputeReason): MessageKey => `disputeReason.${r}`;
export const periodKey = (p: FarmerPeriod): MessageKey => `period.${p}`;

/* ------------------------------------------------------------------ */
/* Dates in the current language                                       */
/* ------------------------------------------------------------------ */

type Twelve = readonly [string, string, string, string, string, string, string, string, string, string, string, string];

const MONTHS_LONG: Record<Lang, Twelve> = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  sw: ['Januari', 'Februari', 'Machi', 'Aprili', 'Mei', 'Juni', 'Julai', 'Agosti', 'Septemba', 'Oktoba', 'Novemba', 'Desemba'],
};
const MONTHS_SHORT: Record<Lang, Twelve> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  sw: ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ago', 'Sep', 'Okt', 'Nov', 'Des'],
};

function ymd(isoOrDate: IsoDate | IsoDateTime): { y: number; m: number; d: number } {
  const key = isoOrDate.length <= 10 ? isoOrDate : dateKeyOf(isoOrDate as IsoDateTime);
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return { y, m, d };
}

/** Date and month formatting in one language. Times stay 24-hour EAT ("15:00"). */
export interface LocalFormat {
  /** "23 Oct 2026" / "23 Okt 2026" */
  date: (isoOrDate: IsoDate | IsoDateTime) => string;
  /** "23 Oct" / "23 Okt" */
  dateShort: (isoOrDate: IsoDate | IsoDateTime) => string;
  /** "23 Oct 2026, 15:00" */
  dateTime: (iso: IsoDateTime) => string;
  /** "15:00" */
  time: (iso: IsoDateTime) => string;
  /** "October 2026" / "Oktoba 2026" */
  month: (month: MonthKey) => string;
  /** "Oct" / "Okt" */
  monthAbbr: (month: MonthKey) => string;
}

function localFormat(lang: Lang): LocalFormat {
  const short = MONTHS_SHORT[lang];
  const long = MONTHS_LONG[lang];
  const date = (v: IsoDate | IsoDateTime): string => {
    const p = ymd(v);
    return `${p.d} ${short[p.m - 1] ?? ''} ${p.y}`;
  };
  return {
    date,
    dateShort: (v) => {
      const p = ymd(v);
      return `${p.d} ${short[p.m - 1] ?? ''}`;
    },
    dateTime: (iso) => `${date(iso)}, ${formatTime(iso)}`,
    time: (iso) => formatTime(iso),
    month: (m) => {
      const [y, mm] = m.split('-').map(Number) as [number, number];
      return `${long[mm - 1] ?? m} ${y}`;
    },
    monthAbbr: (m) => short[Number(m.slice(5, 7)) - 1] ?? m,
  };
}

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

function getLang(): Lang {
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

/** Date and month formatting bound to the current language. */
export function useLocalFormat(): LocalFormat {
  const [lang] = useLang();
  return useMemo(() => localFormat(lang), [lang]);
}
