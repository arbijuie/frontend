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

- Operator pages: `/`, `/status`, `/config`, `/backtest`, `/execution/preflight`, `/automation`
- Public pages: `/product`, `/how-it-works`, `/statistics`, `/journal`, `/onboarding`
  - `/product` explains the screener and the product modes (static, no API calls).
  - `/statistics` and `/journal` show live aggregates and daily history from the read-only
    `/public/*` projections, and explain closed-channel, rate-limit and network failures.
  - `/onboarding` is the guided 3-step check (prerequisites, public access and venue
    connectivity, first runtime signal); it only reads `GET /healthz`, `/public/status` and
    `/public/opportunities`.

Navigation registries:

- Operator nav: [frontend/src/lib/navigation.ts](src/lib/navigation.ts)
- Public nav: [frontend/src/lib/navigation.ts](src/lib/navigation.ts)

## Supported Viewports

Layouts are mobile-first. Every primary page (operator and public) must be usable without
horizontal page scroll at these widths:

| Target | Width | Layout |
| --- | --- | --- |
| Phone | 390px | Single column; operator navigation is a fixed bottom tab bar |
| Tablet | 768px | Two to four column grids; bottom tab bar |
| Desktop | 960px and up | Navigation moves into the sticky top header; content up to 72rem |

Wide tables scroll inside their own container; the page itself never scrolls sideways.
[frontend/e2e/responsive-layout.spec.ts](e2e/responsive-layout.spec.ts) checks every primary
page at 390px and 768px for horizontal overflow and keeps the title and navigation on screen.
Playwright also runs the whole e2e suite on a phone (`chromium-mobile`, Pixel 7) and a tablet
(`chromium-tablet`, 768px) project next to `chromium-desktop`.

## Design Tokens

The design system lives in [frontend/src/styles](src/styles):

- `_tokens.scss`: the only place that holds raw values. Colors, type scale, spacing
  (0.25rem grid), radius, shadows, z-index, motion, layout sizes and the 390 / 768 / 960 /
  1280px breakpoints. Each token is emitted once as a CSS custom property on `:root`
  (`--color-surface`, `--space-3`, ...).
- `_mixins.scss`: base styles built from tokens: `card`, `button($variant)`, `badge($tone)`,
  `pill`, `input`, `select`, `chip`, `callout($tone)`, `focus-ring`, and the shared page frame.
- `_variables.scss`: injected into every SCSS module as `v`. It forwards the two files above
  and keeps the older `$bg-card`-style names as aliases.

Usage in a module:

```scss
.panel {
  @include v.card;
  gap: v.space(3);
  color: v.color(text-secondary);

  @include v.bp-up(md) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
```

Rules:

- Do not put hex or rgba values in modules; add or reuse a token.
- Text colors and fill colors are separate tokens. `*-text` colors are for text on dark
  surfaces; `*-fill` colors are solid backgrounds under `text-on-fill` (white). Both clear
  WCAG AA 4.5:1, which the axe e2e suites enforce.
- State is never shown by color alone: badges and dots always come with a text label.
- Keep the visible focus ring (`focus-ring` mixin) on every interactive element.

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
- Responsive layout (390px and 768px): [frontend/e2e/responsive-layout.spec.ts](e2e/responsive-layout.spec.ts)

Fixture data:

- [frontend/e2e/fixtures](e2e/fixtures)

## Contributing

- Open frontend issues: [github.com/arbijuie/frontend/issues](https://github.com/arbijuie/frontend/issues)
- For root project governance/workflows, see [docs/operations/issue-management-workflow.md](../docs/operations/issue-management-workflow.md)
