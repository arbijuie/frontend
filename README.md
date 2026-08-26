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

2. Create your local env file:

```bash
   cp .env.local.example .env.local
```

3. Fill in `.env.local`:

VITE_ARB_API_URL=http://127.0.0.1:8000
VITE_ARB_API_TOKEN=

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

To build for production:

```bash
pnpm build
```

## What's implemented

- **Opportunities page** — live list of arbitrage opportunities from `GET /opportunities`
  - Search by symbol, filter by status (ready/watching/blocked), sort (score/funding APR/breakeven)
  - Live countdown to next funding time per leg
  - Summary stats (total/ready/watching/blocked)
  - Auto-refresh every 30s (matches backend's `ARB_LOOP_INTERVAL_S`) + manual refresh button

## Not yet implemented

- Config page (`GET /config`)
- Status page (`GET /status`)
- WebSocket live updates (currently REST polling only)
- Telegram bot integration

## Project structure

\`\`\`
frontend/src/
├── api/ # fetch functions + TS types for backend responses
├── components/ # one folder per component (Component.tsx + Component.module.scss)
├── hooks/ # data-fetching hooks (TanStack Query)
├── lib/ # plain utility functions (formatting, colors, etc.)
├── pages/ # route-level pages
└── styles/ # shared SCSS variables/tokens
\`\`\`

## Coding conventions

See `AGENTS.md` in this folder for detailed conventions used throughout this codebase.
