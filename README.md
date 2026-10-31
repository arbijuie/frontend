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

## Navigation

The operator layout has a bottom menu with four items, so it fits on a phone:

| Item   | Route         | What it is                                                       |
| ------ | ------------- | ---------------------------------------------------------------- |
| Deals  | `/`           | Ranked list of deals, ready deals first                          |
| Auto   | `/automation` | Automatic entry and exit, in plain words                         |
| Health | `/status`     | Traffic light for exchanges and data freshness, plus diagnostics |
| More   | `/more`       | Every other screen, grouped as My trading, Learn and For experts |

The menu lives in `NAV_ITEMS` and the groups under More in `MORE_SECTIONS`, both in
[frontend/src/lib/navigation.ts](src/lib/navigation.ts). A new operator screen is added to
`MORE_SECTIONS` unless it truly belongs on the bottom menu.

Public pages use their own layout and top navigation (`PUBLIC_NAV_ITEMS` in the same file).

## Main Routes

Operator layout (routes in [frontend/src/App.tsx](src/App.tsx)):

- `/` Deals: ready deals first, On watch and Blocked folded. Each card has an "Open position"
  button (see "Opening a position") and a link to the deal page.
- `/deals/:symbol/:long/:short` Deal page: costs, both sides of the deal, a size calculator,
  the reasons a deal is blocked and the wrong-coin warning.
- `/positions` My Positions (More > My trading > My open deals): open pairs with Net PnL,
  funding income, notional and Net APR, the 7 day realized PnL, and "Close position" (see
  "Closing a position"). The Positions tab in `/operations` shows similar data for operators;
  `/positions` is the trader view.
- `/welcome` Getting started: four short screens explaining how deals work and how to read them.
- `/status` Health.
- `/config` Settings.
- `/backtest` adds `History` (per-pair replay history and the history gate) and `Survival`
  (READY-episode survival and the persistence forecast) tabs (issue #514).
- `/execution/preflight` Pre-trade check.
- `/automation` shows the entry and exit evaluator decision logs with a page-size control,
  separate from the operator control log (issue #510).
- `/operations` (issues #507 to #513) has one tab per operator surface, kept in the URL as
  `?tab=`: `actions` (open/close with an explicit confirmation step and the attempt timeline),
  `positions` (open pairs, venue accounts, daily PnL), `guardrails` (risk decisions and next
  steps), `parity` (legacy versus shadow parity report and artifacts), and `continuity`
  (durable snapshot capture health). Opens and closes are only enabled while
  `/execution/preflight` reports execution enabled, and the mode (dry-run or live) is shown
  before confirmation.
- `/more` More.
- Any other path shows the not-found page.

Public layout:

- `/product` explains the screener and the product modes (static, no API calls).
- `/how-it-works` explains the pipeline, the READY/WATCHING/BLOCKED verdicts, and the costs
  taken off the edge (static, no API calls; issue #515).
- `/statistics` and `/journal` show live aggregates and daily history from the read-only
  `/public/*` projections, and explain closed-channel, rate-limit and network failures.
- `/onboarding` is the guided 3-step technical check (prerequisites, public access and venue
  connectivity, first runtime signal); it only reads `GET /healthz`, `/public/status` and
  `/public/opportunities`. In the app it is listed as More > For experts > System check. It is
  not the Getting started guide for traders, which is `/welcome`.

Navigation registries:

- Bottom menu, More groups and public navigation: [frontend/src/lib/navigation.ts](src/lib/navigation.ts)

## Opening a position

"Open position" opens the Execution Sheet (`ExecutionSheet`). The button on a deal card is only
shown for Ready deals without a wrong-coin warning, and the sheet checks the same rules itself.
"Open Both Legs" is enabled only when all of these are true:

- the pre-trade safety check (`GET /execution/preflight`) has answered;
- trading is turned on;
- the exchange route is ready (no `vooi_route_unavailable` blocker);
- the safety check does not block opening;
- the deal status is Ready;
- the price check does not show "probably not the same coin" (see `src/lib/priceCheck.ts`);
- in real-money mode, the risk box is ticked. It is asked every time and never shown in
  practice mode.

When a rule fails, a short sentence on the sheet says why. The backend also refuses a manual open
of a route that is not in the last screener output or is not Ready, with
409 `route_not_screened` or 409 `route_not_ready`.

## Closing a position

"Close position" on `/positions` opens `ClosePositionDialog`. It names the symbol and both
exchanges and says that orders are sent to close both legs. Outside practice mode it also says
that the orders use real money. There are two buttons, "Close both legs" and "Keep open", and no
checkbox, so a trader can exit quickly when funding flips.

The dialog behaves like the Execution Sheet for the keyboard: focus starts on "Keep open", Tab
stays inside, Escape cancels, and focus returns to the button that opened it (or to the page
heading when that button is disabled or gone).

## Supported Viewports

Layouts are mobile-first. Every primary page (operator and public) must be usable without
horizontal page scroll at these widths:

| Target  | Width        | Layout                                                           |
| ------- | ------------ | ---------------------------------------------------------------- |
| Phone   | 390px        | Single column; operator navigation is a fixed bottom tab bar     |
| Tablet  | 768px        | Two to four column grids; bottom tab bar                         |
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
