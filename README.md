# Arbitrage Screener — Frontend

Web dashboard for the funding rate arbitrage screener. Shows opportunities found by the backend (Hyperliquid ↔ Lighter), built mobile-first for future use as a Telegram Mini App.

## Tech stack

- React + TypeScript
- Vite
- SCSS Modules (dark theme, design tokens in `src/styles/_variables.scss`)
- TanStack Query (data fetching + polling)
- React Router

## Setup

1. Install dependencies:

```bash
   cd frontend
   pnpm install
```

1. Create your local env file:

```bash
   cp .env.local.example .env.local
```

1. Fill in `.env.local`:

```bash
VITE_ARB_API_URL=http://127.0.0.1:8000
VITE_ARB_API_TOKEN=
```

Leave `VITE_ARB_API_TOKEN` empty unless `ARB_API_TOKEN` is set on the backend.

## Running

Start the backend first (from repo root):

```bash
python -m src.main --serve
```

Then start the frontend dev server:

```bash
cd frontend
pnpm dev
```

Opens on `http://localhost:5173`. Requires CORS to be enabled on the backend (`src/api/server.py`) for `http://localhost:5173`.

### Fast-Local Pairing

If the UI stays empty too often during local checks, apply a lighter runtime preset via
`PATCH /config` (`aggressive` or `exploratory`) or use a temporary session-only runbook patch (`persist=false`).

See operational examples in [../docs/operations/index.md](../docs/operations/index.md), then run frontend as usual:

```bash
cd frontend
pnpm dev
```

Variable scope reminder:

- Backend runtime uses `ARB_...` variables (root `.env` or shell session).
- Frontend runtime uses `VITE_...` variables (`frontend/.env.local`).

To build for production:

```bash
pnpm build
```

To run frontend unit tests:

```bash
pnpm test
```

To regenerate API contract types from backend OpenAPI:

```bash
pnpm types:generate
```

To verify generated types are up to date (same check used in CI):

```bash
pnpm types:check
```

## What's implemented

- **Opportunities page** — live list of arbitrage opportunities from `GET /opportunities`
  - Search by symbol, filter by status (ready/watching/blocked), sort (score/funding APR/breakeven)
  - Live countdown to next funding time per leg
  - Summary stats (total/ready/watching/blocked)
  - Auto-refresh every 32s (`POLL_INTERVAL_MS`) + manual refresh button
  - Validation reasons are structured objects (`code`, `message`, `severity`) rendered per card
  - Pipeline counters and diagnostics hints for empty-result triage (`raw`, `post-cost`, `validated`, `ready`)
  - Runtime tuning snapshot card (`min_score`, `hold`, `order size`, `real depth`, `max diff APR`)
- **Config page** — reads live config (`GET /config`) and can apply updates (`PATCH /config`)
  - One-click preset apply (Conservative/Balanced/Aggressive)
  - Custom edits for runbook fields only (same scope as backend `PATCH /config`)
  - Save persists to backend runtime and `.env` by default
  - Prevents concurrent preset updates while an update is pending
- **Status page** — runtime health from `GET /status`
  - Poll uptime and success/failure counters
  - Screener stage counters (`raw`, `post-cost`, `validated`, `ready`)
  - Exchange health (`ok`, `down`, `unknown`)
  - Runtime tuning snapshot and diagnostics hints

## Not yet implemented

- WebSocket live updates (currently REST polling only)
- Telegram bot integration

## Project structure

```text
frontend/src/
├── api/ # fetch functions + generated OpenAPI-based TS contract types
├── components/ # one folder per component (Component.tsx + Component.module.scss)
├── hooks/ # data-fetching hooks (TanStack Query)
├── lib/ # plain utility functions (formatting, colors, etc.)
├── pages/ # route-level pages
└── styles/ # shared SCSS variables/tokens
```

## Coding conventions

See `AGENTS.md` in this folder for detailed conventions used throughout this codebase.
