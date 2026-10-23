# TwoLeaf — Static MVP Master Prompt

You are building a **static, clickable MVP** of TwoLeaf, a tea delivery, quality and bonus platform by Mariakani Labs for Kericho County, Kenya. It must look and behave like a finished product with counties, factories, buying centres, farmers and pluckers already onboarded, but it uses **static seed data held in memory**. There is no backend.

The goal is to let people see the full UI and workflows: click through every screen, record a delivery, open a dispute, resolve it, verify the audit trail, switch themes and languages, and see actions in one role show up in the others.

Read this whole prompt before writing code. Build in the phases listed at the end, and check each phase against the acceptance checklist before moving on.

---

## 1. Tech constraints

- **React 18 with TypeScript** (`.tsx` / `.ts`), `strict: true` in `tsconfig.json`. No `any` except where a comment explains why.
- **Vite** (`react-ts` template) for the dev server and build. `npm run build` must pass `tsc` with no errors.
- **React Router 6** for navigation.
- **State:** one React Context + `useReducer` store holding all data. No Redux, no external state library.
- **Styling:** the TwoLeaf design system only (section 2). Plain CSS files for app layout. No Tailwind, no UI kits (MUI, Chakra, etc.).
- **No backend, no network calls** except Google Fonts. A small fake API layer (section 5) wraps the store and adds a short delay so loading states are real.
- **No charting library.** Draw the few charts with SVG or CSS.
- Dependencies allowed: `react`, `react-dom`, `react-router-dom`, plus dev dependencies `typescript`, `@types/react`, `@types/react-dom` and the Vite React plugin. Nothing else unless a section below names it.
- Keep state in memory; a **Reset demo data** button restores the seed. Save only the theme and language choice in `localStorage` (wrapped in try/catch).

---

## 2. Design system (mandatory)

The design system is in the folder `twoleaf-design-system/` (provided alongside this prompt). Copy it to `src/design-system/` and follow its `README.md`.

### What to use

- `tokens.css`: all colour, spacing, radius, shadow and font tokens. Import once in `main.jsx`. Themes switch with `data-theme="light"` or `"dark"` on `<html>`.
- `components/bundle.css`: component styles (`tl-` classes). Import once in `main.jsx`. Remove its `@import` line and add the Google Fonts `<link>` to `index.html` instead:
  `https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500&family=Poppins:wght@500;600;700&display=swap`
- `components/bundle.js` is a browser bundle for previews. **Do not load it.** Instead, port each component into its own typed module under `src/design-system/components/` (e.g. `Button.tsx`) with the **same props, same class names and same behaviour** as `bundle.js`. Use `components/index.d.ts` as the source of truth for prop types: each component exports its `<Name>Props` interface. Export everything from `src/design-system/index.ts`.

Components to port: `Icon`, `Button`, `Badge`, `IdTag`, `Card`, `StatCard`, `QualityMeter`, `TextField`, `Alert`, `DataTable`, `ThemeToggle`, `Sidebar`, `PoweredBy`, `Footer`, `MariakaniMark`.

### Required changes while porting

- **Sidebar**: items must navigate with React Router. Accept `items[].to` and render `NavLink` (keep the `tl-sb-item` class and `aria-current="page"` on the active item). Keep `logoUrl`, `orgName`, `orgSubtitle`, `footer`, the theme toggle slot and the fixed **Powered by Mariakani Labs** credit at the bottom.
- **DataTable**: add an optional `onRowClick(row)`. Rows that are clickable get `cursor: pointer`, a hover state and keyboard access (Enter opens the row).
- **ThemeToggle**: on first load, if `localStorage` has no choice, follow `prefers-color-scheme`. Store the choice under `twoleaf-theme`.
- **Icon**: you may add icons in the same style (24px grid, 1.8 stroke, `currentColor`): `menu`, `x`, `search`, `plus`, `camera`, `qr`, `wifi`, `wifi-off`, `refresh`, `upload`, `receipt`, `phone`, `lock`, `shield`, `arrow-left`, `chevron-right`, `globe`.

### Rules

- Every colour comes from a token (`var(--primary)` etc.). No hard-coded hex values in app CSS, except inside the Mariakani mark and logo images.
- Fonts: Poppins for page titles and card titles, Inter for everything else, JetBrains Mono for IDs.
- Numbers use `font-variant-numeric: tabular-nums`.
- Status always has a word, never colour alone (Badge text, meter caption, arrows on deltas).
- Touch targets at least 44px on mobile screens.
- Use the logo PNGs in `assets/Logos/` for the TwoLeaf app icon and login screens, and `assets/Mariakani Labs/` only for the Powered by credit.

---

## 3. Product rules the UI must reflect

### Hierarchy and tenancy

**County → Factories → Buying centres → Farmers → Pluckers.**

- The **county** sees everything **in aggregate**: factory-level figures, comparisons, trends. It never sees an individual farmer's name, deliveries or payments. Show a short note where this matters: "Farmer-level records stay with each factory."
- A **factory** sees only its own buying centres, farmers, pluckers, deliveries and disputes. If a farmer also delivers to another factory, this factory cannot see that.
- A **farmer** sees all their own memberships combined, plus a card per buying centre.
- A **plucker** sees their own picking sessions across the farmers they work for.

### IDs

Every record has three identifiers:

| Identifier | Example | Where it shows |
|---|---|---|
| Internal key | `42` | Never shown |
| UUID (v7 style) | `0192f3a4-7c1e-7b2a-9d41-5e8f2c6a1b07` | Fake API paths only, never in the UI |
| Readable TwoLeaf ID | `TLF-KCO-FMR-0004817` | Screens, receipts, QR cards, via `IdTag` |

Readable ID formats (`KCO` = Kericho, fixed at registration and never changed):

| Entity | Format |
|---|---|
| County | `TLF-KCO` |
| Factory | `TLF-KCO-FAC-000014` |
| Buying centre | `TLF-KCO-BC-000231` |
| Farmer | `TLF-KCO-FMR-0004817` |
| Plucker | `TLF-KCO-PLK-0012094` |
| Delivery | `TLF-KCO-DLV-2026-00845123` |
| Dispute | `TLF-KCO-DSP-2026-000318` |

External codes are stored separately and shown alongside:

- **Buying centre code**: e.g. `TG-043` (factory prefix + number).
- **Farmer number**: unique **within a buying centre only**. Show it as `TG-043 / 123`. The same number can exist at another centre for a different person.
- A farmer who delivers to two centres has one TwoLeaf ID and two memberships, each with its own farmer number.

Write a helper `generateUuidV7()` that produces v7-looking UUIDs (timestamp prefix + random).

### Ledger and audit

- Deliveries are **append-only**. Nothing is edited or deleted.
- A correction creates a **reversing entry** (negative kg, linked to the original) plus a **new corrected entry**, both with a reason and who made it. The original stays visible, marked "Corrected".
- Each finished day at a factory is **sealed**: a day record stores the count, total kg, the previous day's hash and its own hash (`hash(prevHash + date + count + totalKg + list of delivery IDs)`). Use a simple deterministic hash (FNV-1a, shown as 16 hex characters). Today stays open until midnight.
- **Verify chain** recomputes every sealed day from the current deliveries and compares. A demo-only **Simulate tampering** button silently changes one old delivery's kg so verification fails on that day; **Restore** undoes it.
- Every view or export of farmer-level data by an auditor is logged in an **access log**.

### Money

- The system **does not pay anyone**. It shows and explains payments made by the factory. Never show a "Pay" button.
- Monthly green leaf rate: **KSh 21.50/kg** until January 2026, **KSh 26.00/kg** from February 2026.
- Bonus (second payment) for FY 2025/26 (1 Jul 2025 – 30 Jun 2026), declared September 2026, paid 15 October 2026.
- Bonus formula version `v2026.1`, computed from saved inputs (Tegat example):

| Input | Value |
|---|---|
| Made tea sold | 3,962,000 kg |
| Average auction price | KSh 249 / kg |
| Auction income | made tea × price |
| Green leaf received | 17,830,000 kg |
| Processing costs | KSh 271,400,000 |
| Management fee and levies | KSh 26,900,000 |
| Monthly payments already made | green leaf × KSh 21.50 |
| **Left for second payment** | income − costs − levies − monthly payments |
| **Bonus per kg** | left ÷ green leaf received (≈ KSh 17.10) |

Compute the bonus rate in code from these inputs, never hard-code the result. A **Recalculate** button recomputes and shows "Matches the declared figure" or the difference.

### Quality

- Quality = share of fine leaf (two leaves and a bud) in a delivery sample, scored by an AI model from a photo at the buying centre, then confirmed by the clerk.
- Target: **60%** (Tea Board standard). Use `QualityMeter` with `target={60}`.
- Each lot also gets a **factory intake score**. The gap between centre score and intake score shows leaf damaged in transport. Show this comparison per buying centre.

---

## 4. Seed data

Put all seed data in `src/data/seed.ts`, typed with the domain types from `src/types/` (section 6), generated by a **seeded random generator** (mulberry32, seed `20261023`) so it is the same on every load. "Today" is **Friday 23 October 2026, 15:00 EAT**; make it a constant `DEMO_NOW`, not `new Date()`.

Show a small permanent banner in the demo bar: **"Demo · all data is invented"**.

### County

Kericho County Government, `TLF-KCO`, official county code `035`.

### Factories (6)

| Code | Name | Readable ID | Avg price KSh/kg | Bonus KSh/kg | Fine leaf % |
|---|---|---|---|---|---|
| TG | Tegat Tea Factory | `TLF-KCO-FAC-000014` | 249 | computed (≈17.10) | from its centres |
| TR | Toror Tea Factory | `TLF-KCO-FAC-000015` | 241 | 15.80 | 53 |
| MM | Momul Tea Factory | `TLF-KCO-FAC-000016` | 262 | 21.70 | 61 |
| LT | Litein Tea Factory | `TLF-KCO-FAC-000017` | 238 | 16.10 | 52 |
| CH | Chelal Tea Factory | `TLF-KCO-FAC-000018` | 251 | 18.90 | 57 |
| KS | Kapset Tea Factory | `TLF-KCO-FAC-000019` | 246 | 17.80 | 55 |

Give each non-Tegat factory plausible aggregate figures (farmers 900–1,500, kilos this month 180,000–320,000, open disputes 1–9, last sync time). **Tegat is the fully detailed factory** used in the factory role.

### Tegat buying centres (6)

| Code | Name | Readable ID | Clerk | Centre fine leaf % | Intake % | Connectivity |
|---|---|---|---|---|---|---|
| TG-043 | Kapsoit | `TLF-KCO-BC-000231` | Geoffrey Kirui | 66 | 63 | Online |
| TG-044 | Ainamoi | `TLF-KCO-BC-000232` | Nancy Cheruiyot | 58 | 55 | Online |
| TG-051 | Kiptere | `TLF-KCO-BC-000233` | Dennis Mutai | 47 | 43 | Offline 3 h, 14 deliveries waiting to sync |
| TG-058 | Sosiot | `TLF-KCO-BC-000234` | Mercy Koech | 61 | 59 | Online |
| TG-062 | Chesinende | `TLF-KCO-BC-000235` | Kevin Bett | 54 | 52 | Online |
| TG-067 | Kapkugerwet | `TLF-KCO-BC-000236` | Purity Langat | 59 | 58 | Online |

Plus one Toror centre used by the demo farmer's second membership: `TR-012` Kaptebengwet, `TLF-KCO-BC-000302`.

### Farmers (24 at Tegat)

Spread across the six centres, each with a 3-digit farmer number unique within its centre. Use these names:

Kipkoech Ngetich, Chepkemoi Rotich, Kiprotich Langat, Chebet Koech, Kipngeno Mutai, Jepkorir Bett, Kibet Cheruiyot, Cherono Sang, Kipkirui Kirui, Chepngetich Tanui, Kiplangat Soi, Jerotich Kemboi, Kipyegon Too, Chelangat Ruto, Kiprop Kosgei, Chemutai Kiplagat, Kipchumba Yegon, Chepkoech Maritim, Kipruto Kiptoo, Jebet Chirchir, Kimutai Korir, Chepkurui Ngeno, Kipsang Rono, Chesang Keter.

Each farmer: readable ID, UUID, phone (`07XX XXX XXX`, invented), joined date, memberships.

**Demo farmer: Kipkoech Ngetich**, `TLF-KCO-FMR-0004817`:

- Membership 1: Tegat, `TG-043 / 123`.
- Membership 2: Toror, `TR-012 / 0456`. Tegat must not see this one.

### Pluckers (8)

Faith Chebet (demo plucker, `TLF-KCO-PLK-0012094`), Brian Kiprono, Mary Jepchirchir, Daniel Kipkemboi, Ann Chepkirui, Joseph Kiptanui, Lilian Cherotich, Samuel Kipsigei. Each links to 1–3 farmers. Faith works for Kipkoech Ngetich, Chepkemoi Rotich and Kibet Cheruiyot.

### Deliveries

- Demo farmer at TG-043: from 1 July 2025 to yesterday, on about 45% of days, 18–55 kg, fine leaf 52–74%, often with a plucker attached (Faith on about half).
- Demo farmer at TR-012: about 15% of days, 10–30 kg.
- Other Tegat farmers: last 21 days, about 35% of days, 15–50 kg.
- Today at TG-043: 6 deliveries between 07:00 and 11:30.
- Each delivery: readable ID (sequential), UUID, farmer, membership, centre, factory, date-time, kg (one decimal), centre fine leaf %, intake fine leaf %, plucker (optional), clerk, scale ID (e.g. `SCL-TG043-02`), device ID, photo reference, status (`synced`, `pending`, `corrected`, `reversal`), hash.

### Disputes (6)

| Farmer | Centre | Reason | Status |
|---|---|---|---|
| Chepkemoi Rotich | TG-043 / 087 | Weight lower than my own scale | Open, 2 days |
| Kiplangat Soi | TG-051 | Quality score too low | Open, 1 day |
| Chebet Koech | TG-044 | Delivery missing from statement | Open, 4 days |
| Kipyegon Too | TG-062 | Wrong farmer number on receipt | Open, today |
| Jerotich Kemboi | TG-058 | Quality score too low | Open, 6 days |
| Kipkoech Ngetich | TG-043 / 123 | Delivery missing from statement (August) | Resolved: upheld, delivery added by correction |

Each dispute has a readable ID, linked delivery (if any), reason, farmer's note, opened date, a response deadline (7 days), status and resolution note.

### Audit

- Sealed day records for Tegat for the last 14 days, built from the seeded deliveries.
- Two audit packs already prepared (August 2026, September 2026) with a checksum.
- Access log with a few entries (e.g. "County auditor viewed Tegat factory summary").

---

## 5. Fake API layer

`src/api/` exposes typed async functions (each returning `Promise<T>` of a domain type) that read and write the store, each wrapped in a 250–500 ms delay, and named like the real REST API will be. Define request and response types in `src/api/types.ts` so they can later match the Django REST serializers:

```ts
api.getFactory(uuid)
api.listDeliveries({ factoryUuid, centreUuid, status, search, from, to })
api.createDelivery(payload)            // returns the saved delivery
api.correctDelivery(uuid, { kg, reason })
api.lookupFarmer({ centreUuid, query })  // query = farmer number, short ID or "TG-043 / 123"
api.openDispute(payload)
api.resolveDispute(uuid, { outcome, note })
api.verifyAuditChain(factoryUuid)
api.prepareAuditPack(factoryUuid, month)
api.syncPending(deviceId)
```

Every screen loads through these functions and shows a loading state (skeleton rows or a spinner in the card) while waiting. Comment each function with the real endpoint it stands for, e.g. `// GET /api/v1/factories/{uuid}/deliveries`. URLs and API calls use UUIDs only.

---

## 6. App structure

```
src/
  main.tsx               imports tokens.css, bundle.css, app.css; renders <App/>
  App.tsx                router, store provider, demo bar
  design-system/         copied folder + ported components (.tsx)
  types/                 domain types: County, Factory, BuyingCentre, Farmer, Membership,
                         Plucker, Delivery, Dispute, SealedDay, AuditPack, AccessLogEntry,
                         plus ReadableId, Uuid, DeliveryStatus, DisputeStatus, Role, Lang
  data/seed.ts           seeded generator
  store/                 context, reducer (discriminated-union actions), selectors
  api/                   fake API + types.ts
  lib/                   ids.ts, hash.ts, format.ts, i18n.ts, bonus.ts
  layouts/
    WebLayout.tsx        sidebar + top bar + content, for county and factory
    PhoneLayout.tsx      phone frame + header + bottom tabs, for clerk, farmer, plucker
  roles/
    RolePicker.tsx
    county/  factory/  clerk/  farmer/  plucker/
  app.css
```

### TypeScript rules

- Model statuses and roles as string literal unions (`type DeliveryStatus = 'synced' | 'pending' | 'corrected' | 'reversal'`), not enums.
- Readable IDs and UUIDs are branded strings (`type Uuid = string & { readonly __brand: 'Uuid' }`) so they can't be mixed up; create them only through helpers in `lib/ids.ts`.
- Reducer actions are a discriminated union (`{ type: 'delivery/created'; delivery: Delivery } | …`) with an exhaustive `switch` (a `never` check in `default`).
- Money is stored as integer cents (`amountCents: number`) and formatted only in `lib/format.ts`. Kilos are stored to one decimal as numbers.
- Dates are ISO strings in the store; format with `lib/format.ts`.
- The i18n dictionary is typed so a missing Kiswahili key is a compile error (`Record<MessageKey, string>` for each language).
- Component props are explicit interfaces; no `React.FC`.

### Demo bar (always visible, top of every screen)

- Left: TwoLeaf icon, "TwoLeaf demo", and the "Demo · all data is invented" pill.
- Middle: **Viewing as** select with the five roles. Switching keeps all data.
- Right: theme toggle, **Reset demo data** (asks for confirmation inside the page, not with `confirm()`).

### Role picker (`/`)

A welcome screen with the TwoLeaf logo, one sentence on what the demo shows, and five large cards:

1. **Kericho County Government**: county officer, sees all factories in aggregate.
2. **Tegat Tea Factory**: factory unit manager.
3. **Buying centre clerk**: Geoffrey Kirui at TG-043 Kapsoit (mobile).
4. **Farmer**: Kipkoech Ngetich (mobile).
5. **Plucker**: Faith Chebet (mobile).

Each card shows the role, the person, and one line on what they can do.

### Web layout (county, factory)

- Desktop: `Sidebar` on the left (260px), content on the right with a page header (title, subtitle, actions).
- Under 900px: the sidebar becomes an overlay drawer opened from a menu button in a top bar.
- The sidebar shows the tenant's logo and name. Only the factory can change its logo (Settings). The bottom of the sidebar shows the theme toggle and the Powered by credit.
- Content max width 1280px, page padding `space-6` on desktop, `space-4` on mobile.

### Phone layout (clerk, farmer, plucker)

- On screens wider than 700px: a phone frame (390 × 800, rounded, centred), with a short side panel describing the role and two or three things to try.
- On phones: the app fills the screen with no frame.
- Inside: a header (title, back button where needed, language toggle EN/SW for farmer and plucker), a scrolling body and a bottom tab bar (icons + labels, 44px+).

---

## 7. County app (`/county/...`)

Sidebar items: Overview, Factories, Quality, Disputes, Audit & reports.

**Overview**
- Stat cards: Factories (6), Registered farmers, Kilos this month, Average fine leaf % (with target 60), Open disputes.
- Bar chart: fine leaf % by factory with a dashed 60% target line, bars below target in the warning colour with the value labelled.
- Price comparison card: West of Rift vs East of Rift average auction price (KSh 226 vs KSh 380 per kg, Jan–Sep 2025), with one sentence on why the gap matters.
- "Needs attention" list: factories under target, centres offline for more than 2 hours (TG-051), dispute rate above 0.5%.

**Factories**
- Table: factory, ID, farmers, buying centres, kilos this month, fine leaf % (meter), avg price, bonus per kg, open disputes, last sync. Click a row for the summary.
- Factory summary: same figures plus a 6-month kilos trend (SVG line), quality by buying centre (aggregate), and the privacy note. No farmer names anywhere.

**Quality**
- Fine leaf % per factory over the last 6 months (small multiples or a grouped table with meters), centre vs intake gap per factory.

**Disputes**
- Counts and rates per factory, average days to resolve, oldest open. No individual farmer details.

**Audit & reports**
- Chain status per factory ("Verified today 06:00", all intact), prepared audit packs, and **Prepare audit pack** (pick factory + month → new row "Ready", with checksum). Show "Downloads are disabled in this demo" instead of downloading.
- Access log table.

---

## 8. Factory app (`/factory/...`) — Tegat Tea Factory

Sidebar: Dashboard, Deliveries, Farmers, Pluckers, Buying centres, Quality, Bonus, Disputes (with open count), Audit, Settings.

**Dashboard**
- Stat cards: kilos today, kilos this month (with change vs last month), active farmers, fine leaf % (meter), open disputes.
- Alert: "TG-051 Kiptere has been offline for 3 hours. 14 deliveries are waiting to sync."
- Quality by buying centre: a `QualityMeter` per centre.
- Recent deliveries table (last 10) with status badges. Click opens the delivery drawer.

**Deliveries**
- Filters: buying centre, status, date range, search (farmer name, readable ID, or `TG-043 / 123`).
- Table: date-time, delivery ID, farmer (`TG-043 / 123` + name), kg, fine leaf %, plucker, status.
- **Delivery drawer** (right side panel): all fields, the leaf sample photo (use an SVG illustration of tea leaves as the placeholder), centre score vs intake score, scale and device IDs, hash, linked corrections, and **Record a correction** (new kg + reason → creates reversal + corrected entries; the original shows "Corrected").

**Farmers**
- Search and table: name, TwoLeaf ID, centre / number, phone, kilos this month, fine leaf %, status.
- **Register farmer** form: name, phone, national ID, buying centre; farmer number suggested as the next free number at that centre (editable, validated as unique within the centre). Saving creates the farmer with a new readable ID and UUID and shows a success alert with the new IDs.
- **Farmer detail**: IDs, this factory's membership only, kilos and quality trend (6 months), deliveries table, payments summary, disputes, linked pluckers.

**Pluckers**
- Table: name, ID, farmers worked for, sessions this month, kilos this month, average fine leaf %. Detail shows sessions.

**Buying centres**
- Cards for each centre: code, name, readable ID, clerk, farmers, kilos this month, fine leaf meter, connectivity badge (Online / Offline · 3 h / 14 waiting), last sync. Click for centre detail with its deliveries and farmers.

**Quality**
- Per centre: centre score vs intake score and the transport gap, with a sentence explaining the gap. Top and bottom 5 farmers by fine leaf % this month. Plucking tips that clerks share with farmers.

**Bonus**
- Formula version and the inputs table from section 3, each line computed, ending in bonus per kg.
- **Recalculate** → "Recomputed from saved inputs: KSh 17.10 per kg. Matches the declared figure."
- Farmer bonus lookup: pick a farmer → their FY kilos × rate = their bonus.

**Disputes**
- Queue: ID, farmer, centre / number, reason, opened, deadline (badge turns warning within 2 days of the deadline), status.
- Dispute detail: the farmer's note, the linked delivery with its photo and score, and actions **Uphold** (choose: correct the delivery, which opens the correction form) or **Reject** (note required). Resolution updates the farmer's app immediately.

**Audit**
- Chain status card with **Verify chain**: progress over each sealed day, then "All 14 days intact" or "Day 16 Oct 2026 does not match its seal" with the expected vs found totals.
- **Simulate tampering** and **Restore** buttons in a clearly labelled "Demo only" box.
- Sealed days table: date, deliveries, kg, previous hash, hash (mono, truncated with copy).
- Audit packs and access log.

**Settings**
- **Factory logo**: upload an image (file input + `FileReader`, PNG/JPG/SVG under 1 MB, preview) → the sidebar shows it immediately. **Remove logo** falls back to initials. Note: "Your logo appears in the sidebar for everyone at Tegat. Colours, fonts and the Powered by credit stay the same."
- Factory profile (read-only): name, readable ID, county, number of centres.
- Users and roles (read-only list: unit manager, clerks, auditors).

---

## 9. Clerk app (`/clerk/...`) — Geoffrey Kirui, TG-043 Kapsoit

Tabs: Home, Record, Today, Sync.

**Home**
- Centre name and code, connectivity switch (**Online / Offline**, a demo control), today's totals (deliveries, kg, average fine leaf %), pending sync count, big **Record delivery** button.

**Record delivery** (step-by-step, with a progress indicator and Back on each step)
1. **Farmer**: type the farmer number (e.g. `123`) or tap **Scan QR card** (simulated: picks the demo farmer). Show the matched farmer's name, `TG-043 / 123` and TwoLeaf ID to confirm. Unknown number → clear error.
2. **Plucker** (optional): choose from pluckers linked to that farmer, or "Farmer picked it".
3. **Weigh**: **Read scale** → 1 second "Reading scale SCL-TG043-02…" → a kg value (random 18–48, one decimal). **Weigh again** is allowed. Manual entry is not allowed (explain why in one line).
4. **Leaf sample**: **Capture sample photo** (simulated: shows the leaf illustration) → "Scoring…" → AI estimate of fine leaf % shown with `QualityMeter`. The clerk confirms or adjusts by at most ±5 points with a reason.
5. **Confirm**: summary of everything → **Save delivery**.
6. **Receipt**: readable delivery ID (or a temporary device ID `TMP-TG043-0007` when offline), farmer, kg, fine leaf %, time, "SMS sent to 07XX XXX 123" (simulated), **Record next delivery**.

When online the delivery is synced immediately with a readable ID. When offline it is saved as **Pending sync**.

**Today**: list of today's deliveries at TG-043 with status. Tap for details.

**Sync**: pending deliveries, **Sync now** (disabled offline). Syncing assigns readable IDs, keeps the same UUIDs, and shows "3 deliveries synced". New deliveries appear in the factory app and the farmer app at once.

---

## 10. Farmer app (`/farmer/...`) — Kipkoech Ngetich

Tabs: Home, Deliveries, Payments, Disputes, Me. Language toggle **EN / SW** in the header.

**Home**
- Greeting with name.
- Period selector: This month, 3 months, 6 months, 9 months, This year, Last year.
- Combined totals for the period: kilos, average fine leaf %, amount paid or due.
- **One card per buying centre**: factory, `TG-043 / 123` and `TR-012 / 0456`, kilos for the period, quality meter, this month's payment status ("To be paid 31 Oct" or "Paid").
- Small 6-month kilos chart.
- Tip card when quality is below 60%.

**Deliveries**
- Filter by centre. List: date, time, centre, kg, fine leaf %, status. Tap → detail with receipt, leaf photo, centre score and intake score, plucker, delivery ID, and **Report a problem**.

**Report a problem** (opens a dispute)
- Reasons: Weight is wrong, Quality score is wrong, Delivery is missing, Wrong farmer number, Other. A note field. **Send**.
- Creates a dispute with a readable ID and a 7-day deadline, shown in Disputes and in the factory's queue at once.

**Payments**
- Per month (last 6), per centre: kilos × rate = amount, with status.
- **Bonus FY 2025/26** per factory: "Tegat sold made tea at KSh 249/kg on average. After costs, levies and monthly payments, KSh 17.10 was left for every kg of green leaf. You delivered X kg, so your bonus is KSh Y." Plus an expandable breakdown of the factory figures.

**Disputes**
- List with status (Open, Resolved: upheld, Resolved: rejected), deadline, the factory's response.

**Me**
- Name, TwoLeaf ID, phone, memberships with farmer numbers.
- **My QR card**: a card with the farmer's name, IDs and a QR-style pattern (generated SVG from the ID hash, labelled "Demo QR").
- Language, theme, "Powered by Mariakani Labs" at the bottom.

---

## 11. Plucker app (`/plucker/...`) — Faith Chebet

Tabs: Home, Sessions, Tips, Me. EN / SW toggle.

- **Home**: kilos this week and this month, average fine leaf %, number of farmers worked for, a short message: "Pay is agreed with the farmer. TwoLeaf records your work."
- **Sessions**: picking sessions (date, farmer, centre, kg, fine leaf %). Filter by farmer.
- **Tips**: quality feedback based on her average ("Your fine leaf share is 58%. Pick two leaves and a bud; leave the coarse third leaf.") and simple plucking guidance.
- **Me**: name, ID, linked farmers, QR card.

---

## 12. Language (EN / SW)

Farmer and plucker apps support English and Kiswahili through a typed dictionary in `src/lib/i18n.ts`, covering all labels, tabs, buttons, statuses and messages in those two apps. Web apps and the clerk app are English only. Examples:

| English | Kiswahili |
|---|---|
| Home | Nyumbani |
| Deliveries | Uwasilishaji |
| Payments | Malipo |
| Disputes | Malalamiko |
| Report a problem | Ripoti tatizo |
| Kilos this month | Kilo mwezi huu |
| Leaf quality | Ubora wa majani |
| Buying centre | Kituo cha kununulia |
| Bonus | Bonasi |
| Paid | Imelipwa |
| Open | Wazi |
| Resolved | Imetatuliwa |

Have the remaining translations reviewed by a native speaker before any real use; mark the file with that note.

---

## 13. Cross-role flows that must work

1. Clerk records a delivery for `123` online → it appears in the factory Deliveries and Dashboard, and in the farmer's Home totals and Deliveries.
2. Clerk goes offline, records two deliveries → they show as Pending; factory dashboard shows the pending count for TG-043; after **Sync now** they get readable IDs everywhere.
3. Farmer reports a problem on a delivery → the factory Disputes count increases → factory upholds with a correction → farmer sees "Resolved: upheld" and the corrected delivery; the ledger shows original, reversal and corrected entries.
4. Factory uploads a logo in Settings → sidebar logo changes.
5. Factory runs **Simulate tampering** → **Verify chain** fails on the right day → **Restore** → verify passes.
6. County Overview reflects new Tegat kilos after deliveries are recorded.
7. Theme toggle changes every screen in all roles; the choice persists after reload.
8. **Reset demo data** restores the seed everywhere.

---

## 14. Quality bar

- Every screen has a real empty state, loading state and error message where applicable.
- Forms validate inline with clear messages ("Kilos must be more than 0").
- Every interactive element is keyboard reachable with a visible focus ring; icon-only buttons have `aria-label`; drawers trap focus and close on Escape.
- No horizontal page scroll at 375px width; wide tables scroll inside their own container.
- No `alert()`, `confirm()` or `prompt()`; confirmations are built into the page.
- Text and copy: plain English, sentence case, verbs on buttons, toasts confirm actions ("Delivery saved", "3 deliveries synced").
- No console errors or React key warnings.

---

## 15. Build phases

Work in this order. Finish and check each phase before starting the next.

1. **Setup**: Vite (`react-ts`) + React + Router with strict TypeScript; copy the design system; port all components; `index.html` fonts; theme toggle working; a `/design` page rendering every component in both themes.
2. **Data**: domain types in `src/types/`, `lib/` helpers (IDs, UUID v7, hash, format, bonus), seeded generator, store, selectors, fake API. Log a summary of seed counts in development.
3. **Shell**: demo bar, role picker, web layout, phone layout, routing for all five roles with placeholder pages.
4. **Factory app**: all sections in section 8.
5. **Clerk app**: section 9, including offline and sync.
6. **Farmer and plucker apps**: sections 10–12.
7. **County app**: section 7.
8. **Cross-role check**: run every flow in section 13 and fix what breaks.
9. **Polish**: responsive pass at 375px, 768px and 1280px in both themes; accessibility pass; remove dead code.

At the end, give a short summary of what was built, anything you could not do, and how to run it (`npm install`, `npm run dev`).

---

## 16. Acceptance checklist

- [ ] All five roles reachable from the role picker and the demo bar.
- [ ] Only design-system tokens and components are used for styling.
- [ ] Light and dark themes work everywhere and persist.
- [ ] IDs follow section 3 exactly; UUIDs never appear on screen.
- [ ] Farmer numbers are unique per buying centre and shown as `TG-043 / 123`.
- [ ] County never shows farmer-level data; Tegat never sees the demo farmer's Toror membership.
- [ ] Ledger is append-only; corrections create reversal + corrected entries.
- [ ] Audit chain verifies, detects simulated tampering, and restores.
- [ ] Bonus rate is computed from inputs and recalculates.
- [ ] Clerk offline/sync flow works end to end.
- [ ] Disputes flow works farmer → factory → farmer.
- [ ] Factory logo upload changes only the sidebar logo; Powered by credit always present.
- [ ] Farmer and plucker apps switch EN / SW.
- [ ] Works at 375px with no horizontal page scroll.
- [ ] No console errors.
- [ ] `npm run build` passes `tsc` in strict mode with no errors and no unexplained `any`.
