# Arbijuie Frontend

Public operator interface for the Arbijuie funding-rate arbitrage product.

## Public Scope

This repository contains only the frontend application.
Core strategy and execution services are currently private during reliability and risk hardening.

## Repository

- [frontend](https://github.com/arbijuie/frontend)

## What You Can Do Here

- Run the web interface locally
- Explore UI architecture and product direction
- Open issues with product, UX, and integration ideas

## Tech Stack

- React + TypeScript
- Vite
- SCSS Modules
- TanStack Query
- React Router

## Quick Start

```bash
pnpm install
cp .env.local.example .env.local
pnpm dev
```

Default frontend URL: `http://localhost:5173`

Configure backend endpoint in `.env.local`:

```bash
VITE_ARB_API_URL=http://127.0.0.1:8000
VITE_ARB_WS_URL=
VITE_ARB_API_TOKEN=
VITE_ARB_TELEGRAM_SESSION_HEADER_NAME=X-Arb-Telegram-Session
```

Notes:

- `VITE_ARB_WS_URL` is optional. When empty, the frontend derives WS URL from `VITE_ARB_API_URL`.
- `VITE_ARB_TELEGRAM_SESSION_HEADER_NAME` is optional and should match backend
  `ARB_API_TELEGRAM_SESSION_HEADER_NAME` when overridden.
- `VITE_` values are bundled into browser assets. Treat `VITE_ARB_API_TOKEN` as non-secret in
  browser threat models, or avoid setting it in public builds.
- For production builds, use `frontend/.env.production.example` as a template.
- For Telegram Mini App mode, open the app from Telegram so `window.Telegram.WebApp.initData`
  is available for runtime session bootstrap.

## Navigation

Primary navigation is the fixed bottom bar rendered by `src/components/Nav/Nav.tsx`.
Sections, their order, and their icons come from one registry: `src/lib/navigation.ts`.
Order reflects the operator workflow: find opportunities, check status, tune config, validate via backtest, execute.

| Route                  | Section       | Status                                            |
| ---------------------- | ------------- | ------------------------------------------------- |
| `/`                    | Opportunities | Implemented (WebSocket-first, see below)          |
| `/status`              | Status        | Implemented (includes Deep Pipeline Diagnostics)  |
| `/config`              | Config        | Implemented (Editor v2, see below)                |
| `/backtest`            | Backtest      | Implemented                                       |
| `/execution/preflight` | Preflight     | Implemented (readiness center for execution gate) |
| `*`                    | Not found     | Fallback page with link back to `/`               |

The Status page includes a Deep Pipeline Diagnostics section with:

- Drop-counter heatmap
- Top 3 blockers summary
- Reason-code and severity distributions
- Unified exchange split table for source-quality counters

The Opportunities page consumes `/ws/opportunities` as its primary data source, with automatic fallback to REST polling:

- Connects on load; a transport indicator near the title shows `live (WS)`, `connecting...`, `reconnecting transport (attempt N)...`, `reissuing auth ticket (attempt N)...`, or `polling fallback`, with a manual retry button in fallback mode.
- When runtime auth is available (bearer token or Telegram session), a short-lived ticket (`POST /ws/auth-ticket`) is sent as the first WS message.
- In Telegram mode, the first WS auth message carries both ticket and runtime session id; the bearer token itself is never sent over the socket.
- Ticket auth failures are surfaced in the transport indicator: 429 responses show Retry-After guidance; if Retry-After is missing/invalid or below the safe minimum, the UI explicitly notes delay clamping/default usage; rejected tickets trigger bounded automatic reissue attempts, and repeated failures switch to polling fallback with explicit status text.
- When available, the indicator distinguishes `expired` vs `reused` rejects using diagnostics from the next authenticated `POST /ws/auth-ticket` response.
- Reconnects with exponential backoff (1s–16s, 5 attempts) and a 60s stall timeout before permanently falling back to REST polling.
- Manual refresh continues to work in any transport state.

The WS connection itself is owned by an app-level `OpportunitiesSocketProvider` (wrapping `AppShell` in `App.tsx`), not by the Opportunities page component — so it stays open while navigating between pages. This lets the Status page surface the same live connection state through a **Live Transport** section:

- Connection health as one of `connected` / `reconnecting` / `degraded`, always shown as text (never color alone)
- Age of the last received WS message and current REST fallback polling activity
- Combined transport/auth retry-attempt counters
- A short history of the most recent state transitions with timestamps
- A degraded-state banner with an operator hint and a manual Retry button, announced via `aria-live` for screen readers
- This is the browser's own connection to the backend — a separate concern from the "WS Feed Reliability" section above it, which reports the backend's own connections to the exchanges

Each Opportunity card's expanded ("More details") view includes:

- **Score breakdown, risk, and history metrics** — visible immediately, including a **Risk Lens** block (liquidity tier, funding timing asymmetry, basis divergence, effective hold window, minimum profitable hours), each with a tap-friendly help tooltip (`HelpTooltip`) explaining the metric — works identically on desktop (click or hover) and mobile (tap), unlike a plain `title` attribute.
- **Provenance** (per-exchange data source labels, effective taker fees, spread, depth bands, mid price for both legs) — nested behind its own "Show data provenance" toggle, since it's consulted less often than the metrics above it; keeps the default expanded view compact.
- Nullable risk/provenance fields show an explicit, meaning-specific placeholder ("not enough data", "unknown") rather than a bare dash.

The Config page's "Custom Runbook Fields" editor supports both numeric and boolean runbook fields, grouped by category (matching the read-only Live Configuration accordion above it, including a dedicated Nautilus Migration group with accurate help text). Any newly-added runbook field without a specific label yet falls into an "Other" group instead of silently disappearing. Workflow:

- Edit values, then click **Preview changes** to see the exact old → new diff before anything is sent — this is the same payload the app actually submits, not a separately-computed approximation.
- An explicit **Persist** checkbox controls whether the change is written to `.env` (checked) or applied for the current session only (unchecked) — reflected in the submitted payload either way.
- **Revert draft to preset** loads a preset's values into the draft for review, without applying anything until you preview and confirm.
- If the live config changes in the background while you have an unsaved draft, a conflict banner names the affected fields and offers to reload the draft from the current live values. Background polling for this check is only active while a draft is in progress.

Adding a section:

1. Create `src/pages/<Name>Page/<Name>Page.tsx`, wrap content in the shared `.page` layout, and call `usePageTitle("<Name>")`.
2. Add a `<Route>` in `src/App.tsx` inside `AppShell` (routes live under `RouteErrorBoundary`, so a broken page never hides the nav).
3. Append an entry to `NAV_ITEMS` in `src/lib/navigation.ts`.
4. Extend the smoke tests in `src/App.test.tsx` and `src/components/Nav/Nav.test.tsx`.

Behavior contributors can rely on:

- Active state uses `NavLink`, so the current link carries `aria-current="page"` and the `.active` style.
- Links are keyboard reachable in nav order and show a visible `:focus-visible` ring.
- Every section is directly addressable by URL; unknown paths render the not-found page.
- `document.title` follows the active section (`<Section> · Arbijuie`).

## Quality Checks

```bash
pnpm lint
pnpm test
pnpm test:e2e:install
pnpm test:e2e
pnpm test:e2e:local
pnpm build
pnpm audit:ci   # dependency audit, high severity and above (same gate as CI)
pnpm types:check
```

If Chromium download is blocked in your environment, run E2E using a locally installed browser channel:

```bash
pnpm test:e2e:local
```

Optional override for a different installed channel:

```bash
PW_E2E_LOCAL_FALLBACK=1 PW_E2E_LOCAL_FALLBACK_CHANNEL=chrome pnpm test:e2e
```

`pnpm check` runs lint, test, build and the audit in one go. `pnpm install` also
installs a repository `pre-push` git hook that runs `pnpm check` automatically
whenever the commits being pushed touch `frontend/`. Bypass in an emergency with
`ARB_SKIP_PREPUSH_CHECKS=1`.

## Contributing

Use GitHub Issues for proposals, bugs, and integration requests:

- [Open an issue](https://github.com/arbijuie/frontend/issues)
