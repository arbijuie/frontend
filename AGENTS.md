# Agent Instructions (Frontend)

This file is the entrypoint for coding agents working inside `frontend/`. The repo root `AGENTS.md` applies everywhere; this file adds frontend-specific rules on top of it.

Backend is a separate Python/FastAPI service in `../src`. Do not edit backend files from here unless explicitly asked.

## Project Context

This is a **read-only** UI for a funding rate arbitrage screener (Hyperliquid ↔ Lighter). It shows opportunities found by the backend — it does not place trades. Trading is done manually by the user on the actual exchanges; an execution engine is planned for a future phase but doesn't exist yet.

Backend endpoints and current frontend status:

- `GET /opportunities` — **done** (Opportunities page)
- `GET /config` — **done** (Config page with preset apply and scoped runbook field updates via `PATCH /config`)
- `GET /status` — **done** (Status page with runtime metrics, screener stage counters, and exchange health)
- `WS /ws/opportunities` — **not used yet**, deliberately deferred in favor of REST polling (see Data Fetching). Ticket-based auth for this was researched but isn't implemented in the frontend.

Eventual goal: a Telegram bot sending similar opportunity data as notifications — keep `OpportunityCard` self-contained, since it may become the basis for a bot notification or Mini App deep-link route later.

## Core Guardrails

- Never invent or guess a field that isn't actually in `src/api/types.ts`. Check the type before displaying a new value.
- Only `.scss`/`.module.scss` files get SCSS variables auto-injected (via `vite.config.ts`) — never add a manual `@use` for variables inside a component's own file, it will break the build.
- Countdown timers must use the shared `useNow()` clock, never a per-component `setInterval`.
- Keep all API calls inside `src/api/` — never `fetch()` directly inside a component.
- Never touch backend Python files (`../src`) without confirming first, except the previously-agreed CORS setup in `server.py`.

## Stack

- React + TypeScript + Vite
- SCSS Modules only — never plain CSS, inline styles, or CSS-in-JS
- TanStack Query (`@tanstack/react-query`) for all data fetching
- React Router for pages

## Coding Conventions

- One component per folder: `components/Foo/Foo.tsx` + `components/Foo/Foo.module.scss`
- Components: `const Foo = (props) => { ... }; export default Foo;` — always at the bottom, never `export default function Foo()`
- Hooks and utility functions: named exports, regular `function` declarations — never `export default`
- Pages live in `src/pages/`, one file per route

## Refactoring

- Do not refactor working code without being asked.
- Do not rename files, folders, components, props, variables, or API field names without permission — especially field names in `src/api/types.ts`, which must match the backend's actual schema exactly.
- Make the smallest safe change needed to solve the task.
- If a larger refactor would be better, explain it first and wait for confirmation.
- Never change the established component style (`const X = () => {}` + `export default X`, hooks/utils as named `function` exports) to "modernize" it — this is an intentional project convention, not an oversight.

## SCSS

- Shared variables live in `src/styles/_variables.scss` (a partial — never imported directly)
- `vite.config.ts` injects `@use "src/styles/variables" as v;` into every `.scss` file automatically — access as `v.$variable-name`
- Dark theme only: `$bg-primary`, `$bg-card`, `$border-color`, `$text-primary/secondary/muted`, `$green`, `$yellow`, `$red`, `$accent-purple`
- Use `signColor()` from `src/lib/format.ts` for any profit/loss-style value (green/red/neutral) — never hardcode these colors

## Data Fetching

- One function per endpoint in `src/api/`, typed from `src/api/types.ts`
- Base URL/token/headers always from `src/api/config.ts` (`API_URL`, `API_TOKEN`, `authHeaders()`)
- Wrap fetching in a hook under `src/hooks/` using `useQuery` with `refetchInterval` for polling
- Backend refreshes on its own cycle (`ARB_LOOP_INTERVAL_S`, default 30s) — keep `POLL_INTERVAL_MS` in `src/api/config.ts` close to that

## Known Data Quirks (Don't "Fix" These As Bugs)

- `long_exchange`/`short_exchange` can show the same direction on many cards at once — reflects real market conditions (Lighter's funding rate is an approximation, can be skewed for periods). Verify against raw `/opportunities` JSON before assuming a bug.
- `/opportunities` returns a cached snapshot, refreshed only on the backend's own screener cycle — a manual refresh can legitimately return identical data. Not a frontend bug.
- `combined_score` values are typically small (tens to low hundreds) under normal conditions. If you see an extreme value (thousands+), verify it against the documented formula before assuming it's expected — don't add frontend-side clamping without checking with the backend first.

## Domain Glossary

- **Funding rate** — periodic payment on perpetual futures exchanges; can be positive or negative depending on market imbalance.
- **Funding APR** (`funding_diff_apr`) — the funding rate difference between the two legs, annualized, for easy comparison across symbols.
- **Funding Edge** (`funding_edge_bps`) — funding APR converted into expected bps profit over the actual hold window (not a full year).
- **Score** (`combined_score`) — the main "how good is this" number: `funding_edge_bps - roundtrip_fee_bps + basis_bonus_bps`. Sort/highlight by this by default.
- **Basis** (`basis_bps`) — the current price difference between the two exchanges for the same asset.
- **Breakeven** (`hours_to_breakeven`) — hours needed to hold the position before fees are covered. `null` means it couldn't be calculated.
- **Status** (`ready`/`watching`/`blocked`) — the backend's own entry validator verdict. `ready` = passed all checks. `watching` = candidate but not stable enough yet. `blocked` = currently not tradable. Don't visually treat `watching`/`blocked` as equal to `ready` (e.g. "top score" stats should only consider `ready` items).
- **Liquidity tier** (`H`/`M`/`L`) — rough liquidity classification; a high score on a low-liquidity (`L`) symbol deserves more caution, not less.

## Funding Countdown Timer

- Anchor the target time from `data.updated_at` + hours (`getFundingTargetTime()` in `src/lib/format.ts`), never from render time directly
- Under 5 minutes remaining = urgent/red styling; under 10 minutes = show `M:SS`; otherwise `Hh Mm`

## Mobile-First (Telegram Mini App Target)

- Design for narrow viewports first (~380-420px)
- Long lists (50-90+ cards) need sticky search/filter/sort controls
- Fixed/floating elements need a high `z-index` (current pattern: `20`) to stay above sticky content

## Git Workflow

- One branch per page/feature (e.g. `feature/status-page`), never commit directly to `main`
- Small, focused commits per logical change
- Never merge your own PR

## Validation

Before considering a task done:

```bash
pnpm exec eslint --fix .
pnpm exec prettier --write .
pnpm build
```

`pnpm build` must succeed — `pnpm dev` can hide type errors that only surface in a production build.
