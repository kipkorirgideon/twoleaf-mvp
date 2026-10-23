# TwoLeaf MVP

Static React + TypeScript MVP of TwoLeaf by Mariakani Labs. The full build spec is imported at the bottom of this file. Every agent follows it.

## Project rules (all agents)

- React 18 + TypeScript (strict) + Vite + React Router 6. No other runtime dependencies.
- Style only with the TwoLeaf design system in `src/design-system/` (tokens and `tl-` classes). No hard-coded colours.
- Static data only, in memory, through the fake API in `src/api/`. No real network calls.
- Readable IDs (`TLF-KCO-…`) on screen; UUIDs only in API calls. Farmer numbers are unique per buying centre, shown as `TG-043 / 123`.
- Run `npm run build` before reporting any task as done. It must pass with no TypeScript errors.

## Team

You are the **lead**. You plan, delegate and integrate. You do not write feature code yourself unless an agent is blocked.

| Agent | Owns (may edit) | Phases |
|---|---|---|
| `design-system-engineer` | `src/design-system/**`, `index.html`, `src/main.tsx`, `src/app.css` | 1 |
| `data-engineer` | `src/types/**`, `src/lib/**` (except `i18n.ts`), `src/data/**`, `src/store/**`, `src/api/**` | 2 |
| `web-app-engineer` | `src/App.tsx`, `src/roles/RolePicker.tsx`, `src/components/DemoBar.tsx`, `src/layouts/WebLayout.tsx`, `src/roles/county/**`, `src/roles/factory/**` | 3, 4, 7 |
| `mobile-app-engineer` | `src/layouts/PhoneLayout.tsx`, `src/roles/clerk/**`, `src/roles/farmer/**`, `src/roles/plucker/**`, `src/lib/i18n.ts` | 5, 6 |
| `qa-reviewer` | Nothing (read-only, may run commands) | 8, 9 and after every phase |

### How to run the build

1. Phase 1 and phase 2 in parallel: `design-system-engineer` and `data-engineer`.
2. Phase 3 (shell and routing): `web-app-engineer`.
3. Phases 4 + 7 (`web-app-engineer`) in parallel with phases 5 + 6 (`mobile-app-engineer`).
4. After each phase: `qa-reviewer` checks it against the spec. Send each issue back to the agent that owns the file. Repeat until the reviewer reports no blocking issues.
5. Phase 8 (cross-role flows) and phase 9 (polish): `qa-reviewer` reviews, owners fix.

### Rules for delegating

- Give each agent a task message that names the phase, the spec sections to follow, the files it owns, and what "done" means.
- Agents edit only the files they own. If an agent needs a change in another agent's files (for example a new store action or API function), it stops and reports the exact change needed; you send that to the owner.
- `src/types/` is the contract between agents. Only `data-engineer` changes it.
- After each phase, summarise for the user in a few lines: what was built, what the reviewer found, what is next.

@docs/twoleaf-mvp-master-prompt.md
