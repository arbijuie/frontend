# Arbijuie Frontend

## Quick Links

- Frontend source: [frontend/src](src)
- E2E tests: [frontend/e2e](e2e)
- Frontend package scripts: [frontend/package.json](package.json)
- Root docs index: [docs/index.md](../docs/index.md)
- Operations hub: [docs/operations/index.md](../docs/operations/index.md)
- Architecture hub: [docs/architecture/index.md](../docs/architecture/index.md)

## Scope

Public/operator web UI for the arbitrage screener platform.

- This folder contains frontend code only.
- Backend strategy/execution services live in the root workspace.

## Stack

- React + TypeScript + Vite
- SCSS Modules
- TanStack Query
- React Router

## Quick Start

```bash
pnpm install
cp .env.local.example .env.local
pnpm dev
```

Default URL: `http://localhost:5173`

Minimal `.env.local`:

```bash
VITE_ARB_API_URL=http://127.0.0.1:8000
VITE_ARB_WS_URL=
VITE_ARB_API_TOKEN=
VITE_ARB_TELEGRAM_SESSION_HEADER_NAME=X-Arb-Telegram-Session
```

Notes:

- Leave `VITE_ARB_WS_URL` empty to derive WS endpoint from `VITE_ARB_API_URL`.
- `VITE_` variables are bundled into browser assets; do not treat them as secrets.
- For production env template, use [frontend/.env.production.example](.env.production.example).

## Main Routes

- Operator pages: `/`, `/status`, `/config`, `/backtest`, `/execution/preflight`
- Public pages: `/product`, `/how-it-works`, `/statistics`, `/onboarding`

Navigation registries:

- Operator nav: [frontend/src/lib/navigation.ts](src/lib/navigation.ts)
- Public nav: [frontend/src/lib/navigation.ts](src/lib/navigation.ts)

## Quality Checks

```bash
pnpm lint
pnpm test
pnpm build
pnpm types:check
pnpm audit:ci
pnpm test:e2e:install
pnpm test:e2e
pnpm test:e2e:local
```

## Accessibility and E2E

Primary suites:

- Accessibility scan: [frontend/e2e/accessibility.spec.ts](e2e/accessibility.spec.ts)
- Keyboard navigation: [frontend/e2e/keyboard-navigation.spec.ts](e2e/keyboard-navigation.spec.ts)
- Public layout behavior: [frontend/e2e/public-layout.spec.ts](e2e/public-layout.spec.ts)

Fixture data:

- [frontend/e2e/fixtures](e2e/fixtures)

## Contributing

- Open frontend issues: [github.com/arbijuie/frontend/issues](https://github.com/arbijuie/frontend/issues)
- For root project governance/workflows, see [docs/operations/issue-management-workflow.md](../docs/operations/issue-management-workflow.md)
