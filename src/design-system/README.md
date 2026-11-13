# TwoLeaf

The design system for TwoLeaf, the tea delivery, quality and bonus platform built by Mariakani Labs for Kericho's tea farmers, factories and county government. It covers the factory and county web apps and the farmer, plucker and clerk mobile apps.

## Principles

- **Tea green on white.** The interface is mainly green, like a tea field, on a clean white background. Dark mode uses deep green surfaces, never pure black.
- **Numbers first.** Kilos, quality and money are what people come for. Figures are large, use tabular numbers, and always show their unit.
- **Trust is visible.** Every record shows its ID, its status and where it came from. Status never relies on colour alone: badges have a word, meters have a target marker and a caption.
- **Works in the field.** Touch targets are at least 44px, text is never smaller than 12px, and offline and syncing states are always shown.
- **One brand, many tenants.** Factories change only the logo and name in the sidebar drawer. Colours, type and layout stay TwoLeaf, and the *Powered by Mariakani Labs* credit is always present.

## Voice

Plain English and Kiswahili, short sentences, sentence case. Say what happened and what happens next: "412 kg added to TG-043. The farmer will get an SMS." Avoid jargon such as "transaction persisted". Address farmers directly ("You delivered…").

## Colour

Built around the logo's tea greens. Use `primary` for actions and active navigation, `primary-soft` for selected states, and `bud` only as decoration (it is too light for text).

| Token | Light | Dark | Use |
|---|---|---|---|
| `bg` | #FFFFFF | #0F1A13 | Page background |
| `surface` | #FFFFFF | #16241B | Cards, sidebar |
| `primary` | #2E7D3F | #6FBF5A | Buttons, links, active nav |
| `primary-strong` | #1F5130 | #A9D77E | Brand headings, text on soft green |
| `text` / `text-muted` | #1C2A20 / #5B6B60 | #E7F0E8 / #A3B5A8 | Body and secondary text |

Status colours (`success`, `warning`, `danger`, `info`, each with `-fg` and `-bg`) are reserved for record states. All text pairs pass 4.5:1 in both themes; control borders (`border-strong`) pass 3:1.

## Theme

Both themes ship in `tokens.css` and switch with `data-theme="light"` or `"dark"` on `<html>`. Use the **ThemeToggle** component in the sidebar footer. On first load, follow the device's `prefers-color-scheme`, then remember the person's choice (`localStorage` key `twoleaf-theme`).

## Typography

- **Poppins** (display): page titles, card titles and brand moments. It matches the logo wordmark.
- **Inter** (sans): all body text, tables, forms and numbers. Use `font-variant-numeric: tabular-nums` for figures (the `.tl-num` class does this).
- **JetBrains Mono** (mono): platform IDs and codes such as `TLF-KCO-FMR-0004817` and `TG-043`.

All three load from Google Fonts. The bundle stylesheet imports them; in an app, add the same `<link>` to the page head.

## Spacing and shape

A 4px base: `space-1` (4) to `space-7` (48). Cards use `space-5` padding on web and `space-4` on mobile. Radii: `radius-sm` for badges, `radius-md` for buttons and inputs, `radius-lg` for cards, `radius-pill` for toggles and meters.

## Logos

- **TwoLeaf icon**: the storm-and-tea square. Use it as the app icon and on login screens.
- **TwoLeaf lockup**: icon plus wordmark, light and dark versions.
- **Mariakani Labs**: the company mark: a navy night sky with a storm cloud, rain and a glowing lightning bolt. Used only in the *Powered by* credit and company documents, never inside TwoLeaf's own UI chrome.
- **Factory logos**: uploaded per tenant and shown only in the sidebar drawer.

Keep clear space around logos equal to a quarter of the icon's width. Never recolour, stretch or add effects.

## IDs

People see readable IDs (`TLF-KCO-FMR-0004817`) in the **IdTag** component. The API uses UUIDs, which never appear in the interface.

## Components

Button, Badge, IdTag, Card, StatCard, QualityMeter, TextField, Alert, DataTable, ThemeToggle, Sidebar, PoweredBy, Footer and Icon. All are React 18 components on `window.TwoLeaf`, styled by `components/bundle.css` with `tl-` class names.
