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
VITE_ARB_API_TOKEN=
```

## Navigation

Primary navigation is the fixed bottom bar rendered by `src/components/Nav/Nav.tsx`.
Sections, their order, and their icons come from one registry: `src/lib/navigation.ts`.
Order reflects the operator workflow: find opportunities, check status, tune config, validate via backtest, execute.

| Route                  | Section       | Status                                            |
| ---------------------- | ------------- | ------------------------------------------------- |
| `/`                    | Opportunities | Implemented (WebSocket-first, see below)          |
| `/status`              | Status        | Implemented (includes Deep Pipeline Diagnostics)  |
| `/config`              | Config        | Implemented                                       |
| `/backtest`            | Backtest      | Implemented                                       |
| `/execution/preflight` | Preflight     | Implemented (readiness center for execution gate) |
| `*`                    | Not found     | Fallback page with link back to `/`               |

The Status page includes a Deep Pipeline Diagnostics section with:

- Drop-counter heatmap
- Top 3 blockers summary
- Reason-code and severity distributions
- Unified exchange split table for source-quality counters

The Opportunities page consumes `/ws/opportunities` as its primary data source, with automatic fallback to REST polling:

- Connects on load; a transport indicator near the title shows `live (WS)`, `connecting...`, `reconnecting (attempt N)...`, or `polling fallback`, with a manual retry button in fallback mode.
- If a bearer token is configured, a short-lived ticket (`POST /ws/auth-ticket`) is sent as the first WS message — the token itself is never sent over the socket.
- Ticket auth failures are surfaced in the transport indicator: 429 responses show Retry-After guidance, rejected tickets trigger bounded automatic reissue attempts, and repeated failures switch to polling fallback with explicit status text.
- When available, the indicator distinguishes `expired` vs `reused` rejects using diagnostics from the next authenticated `POST /ws/auth-ticket` response.
- Reconnects with exponential backoff (1s–16s, 5 attempts) and a 60s stall timeout before permanently falling back to REST polling.
- Manual refresh continues to work in any transport state.

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
