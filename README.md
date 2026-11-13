# Arbijuie Frontend

## Quick Links

- Frontend source: [frontend/src](src)
- E2E tests: [frontend/e2e](e2e)
- Frontend package scripts: [frontend/package.json](package.json)
- Root docs index: [docs/index.md](../docs/index.md)
- Operations hub: [docs/operations/index.md](../docs/operations/index.md)
- Architecture hub: [docs/architecture/index.md](../docs/architecture/index.md)

## Scope

Web UI for the arbitrage screener platform (Telegram Mini App).

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
VITE_ARB_TELEGRAM_SESSION_HEADER_NAME=X-Arb-Telegram-Session
```

Notes:

- Leave `VITE_ARB_WS_URL` empty to derive WS endpoint from
  `VITE_ARB_API_URL`.
- `VITE_` variables are bundled into browser assets; do not treat them as
  secrets.
- For production env template, use
  [frontend/.env.production.example](.env.production.example).

## Navigation

Every page uses one layout (`OperatorLayout`) with a bottom menu of four items,
so it fits on a phone and the menu is on every screen:

- `Deals` (`/`): Ranked list of deals, ready deals first.
- `Health` (`/status`): Traffic light for exchanges and data freshness, plus
  diagnostics.
- `Settings` (`/config`): Personal Deals profile and shared runtime settings.
- `More` (`/more`): Every other screen, grouped as Learn and For experts. It
  stays highlighted on the Learn pages (`/learn/*`) and on `/welcome`.

Groups under More:

- Learn: Getting started (`/welcome`), How it works (`/learn/how-it-works`),
  About the app (`/learn/about`), Results so far (`/learn/statistics`),
  Onboarding (`/learn/onboarding`).
- For experts: Auto (`/automation`), My open deals (`/positions`), Backtest
  (`/backtest`), Pre-trade check (`/execution/preflight`), System logs
  (`/operations`). Auto and positions stay under More while execution is
  latched off.

The header has a Back and a Forward button. They follow the in-app history,
including filter changes on Deals, and stay reachable with the keyboard when
unavailable (`aria-disabled`). After a reload the history starts again, so
Forward is unavailable until the user goes back.

The menu lives in `NAV_ITEMS` and the groups under More in `MORE_SECTIONS`,
both in [frontend/src/lib/navigation.ts](src/lib/navigation.ts). A new
screen is added to `MORE_SECTIONS` unless it truly belongs on the bottom menu.

## Main Routes

Routes are in [frontend/src/App.tsx](src/App.tsx):

- `/` Deals: ready deals first, On watch and Blocked folded. The status tiles
  are the only status filter (`?status=` in the URL). Each card has an
  "Open position" button (see "Opening a position") and a link to the deal
  page.
- `/deals/:symbol/:long/:short` Deal page: costs, both sides of the deal, a
  size calculator, the reasons a deal is blocked and the wrong-coin warning.
- `/positions` My Positions (More > For experts > My open deals): open pairs
  with Net PnL, funding income, notional and Net APR, the 7 day realized PnL,
  and "Close position" (see "Closing a position"). The Positions tab in
  `/operations` shows similar data for operators; `/positions` is the trader
  view.
- `/welcome` Getting started (More > Learn): four short screens explaining how deals work and
  how to read them. Finishing or skipping marks the welcome guide as completed
  in the user's profile (with localStorage fallback when the profile API is
  unavailable).
- `/status` Health. Its Stop-Trading Latch card reads `GET /risk/stop-trading`:
  running or stopped, the latched triggers, and the recovery gate (cooldown,
  health checks, manual acknowledgment). When a critical stop needs a manual
  acknowledgment, the card takes a reason, shows what the acknowledgment will
  do in an explicit review step, and only then sends
  `POST /risk/stop-trading/ack`; the answered state is shown without a page reload.
- `/config` Settings: split between personal Deals profile overrides
  ("My Deals Profile", applied
  only to that user's feed; supports preset base + manual overrides) and
  shared runtime/operator settings. Runtime-based personal profiles inherit the
  latest shared runtime defaults after shared config saves. "Disable profile"
  clears only personal preset/override fields and keeps tutorial progress flags.
  "Product Modes" are personal too: applying a mode saves its preset as the
  user's profile base through `PATCH /me/preferences` (clearing manual
  overrides) and never calls `PATCH /config`; only "Custom Runbook Fields"
  change the shared runtime settings.
- `/backtest` (More > For experts) adds `History` (per-pair replay history and
  the history gate) and `Survival` (READY-episode survival and the persistence
  forecast) tabs.
- `/execution/preflight` Pre-trade check (More > For experts).
- `/automation` Auto (More > For experts) shows the entry and exit evaluator
  decision logs with a page-size control, separate from the operator control
  log.
- `/operations` System logs (More > For experts) has one tab per operator
  surface, kept in the URL as `?tab=`: `actions` (open/close with an explicit confirmation
  step and the attempt timeline), `positions` (open pairs, venue accounts,
  daily PnL), `guardrails` (risk decisions and next steps), and `continuity`
  (durable snapshot capture health). Opens and closes are only enabled while
  `/execution/preflight` reports execution enabled, and the mode (dry-run or
  live) is shown before confirmation.
- `/more` More.
- Any other path shows the not-found page.

Learn pages (under the same layout, so the bottom menu stays):

- `/learn/about` Product: explains the screener and the product modes; each
  mode card links to Settings, where the mode is chosen per user (static, no
  API calls).
- `/learn/how-it-works` explains the pipeline, the READY/WATCHING/BLOCKED
  verdicts (each links to Deals with that status), and the costs taken off the
  edge (static, no API calls).
- `/learn/statistics` and `/learn/journal` show live aggregates and daily
  history from the read-only `/public/*` projections, and explain
  closed-channel, rate-limit and network failures. Cards and rows on Statistics
  link to Deals and Health. Journal stays routable but off the menu until
  backtest capture is on.
- `/learn/onboarding` is the guided 3-step technical check (prerequisites,
  public access and venue connectivity, first runtime signal); its checks only
  read `GET /healthz`, `/public/status` and `/public/opportunities`. Steps
  already reached can be selected again. It is not the Getting started guide
  for traders, which is `/welcome`. When step 3 reaches "passed", onboarding
  completion is recorded in the user's profile.
- The old addresses `/product`, `/how-it-works`, `/statistics`, `/journal` and
  `/onboarding` redirect to their `/learn/*` page and keep the query and hash.

Known limitation (deep links): the single-host nginx template routes `/status`,
`/config`, `/positions`, `/opportunities`, `/automation`, `/backtest` and
`/execution/preflight` to the API, so a full-page load or refresh of those
operator routes returns API JSON instead of the SPA; in-app navigation is
unaffected. Template:
[nginx-arbitrage-single-host.conf](../docs/operations/templates/nginx-arbitrage-single-host.conf).

Navigation registry:

- Bottom menu and More groups:
  [frontend/src/lib/navigation.ts](src/lib/navigation.ts)

## Opening a position

"Open position" opens the Execution Sheet (`ExecutionSheet`). The button on a
deal card is only shown for Ready deals without a wrong-coin warning, and the
sheet checks the same rules itself.
"Open Both Legs" is enabled only when all of these are true:

- the pre-trade safety check (`GET /execution/preflight`) has answered;
- trading is turned on;
- the exchange route is ready (no `vooi_route_unavailable` blocker);
- the safety check does not block opening;
- the deal status is Ready;
- the price check does not show "probably not the same coin" (see `src/lib/priceCheck.ts`);
- in real-money mode, the risk box is ticked. It is asked every time and never
  shown in
  practice mode.

When a rule fails, a short sentence on the sheet says why. The backend also
refuses a manual open of a route that is not in the last screener output or is
not Ready, with
409 `route_not_screened` or 409 `route_not_ready`.

## Closing a position

"Close position" on `/positions` opens `ClosePositionDialog`. It names the
symbol and both exchanges and says that orders are sent to close both legs.
Outside practice mode it also says that the orders use real money. There are
two buttons, "Close both legs" and "Keep open", and no checkbox, so a trader
can exit quickly when funding flips.

The dialog behaves like the Execution Sheet for the keyboard: focus starts on
"Keep open", Tab stays inside, Escape cancels, and focus returns to the button
that opened it (or to the page heading when that button is disabled or gone).

## Supported Viewports

Layouts are mobile-first. Every primary page must be usable without
horizontal page scroll at these widths:

- Phone (`390px`): Single column; navigation is a fixed bottom tab
  bar.
- Tablet (`768px`): Two to four column grids; bottom tab bar.
- Desktop (`960px` and up): Navigation moves into the sticky top header;
  content up to `72rem`.

Wide tables scroll inside their own container; the page itself never scrolls sideways.
[frontend/e2e/responsive-layout.spec.ts](e2e/responsive-layout.spec.ts) checks
every primary page, including the learn pages, at 390px and 768px for
horizontal overflow and keeps the title and navigation on screen. Playwright
also runs the whole e2e suite on a phone (`chromium-mobile`, Pixel 7) and a
tablet (`chromium-tablet`, 768px) project next to `chromium-desktop`.

## Design Tokens

The design system lives in [frontend/src/styles](src/styles):

- `_tokens.scss`: the only place that holds raw values. Colors, type scale,
  spacing (0.25rem grid), radius, shadows, z-index, motion, layout sizes and
  the 390 / 768 / 960 / 1280px breakpoints. Each token is emitted once as a
  CSS custom property on `:root`
  (`--color-surface`, `--space-3`, ...).
- `_mixins.scss`: base styles built from tokens: `card`, `button($variant)`,
  `badge($tone)`, `pill`, `input`, `select`, `chip`, `callout($tone)`,
  `focus-ring`, and the shared page frame.
- `_variables.scss`: injected into every SCSS module as `v`. It forwards the
  two files above
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
- Text colors and fill colors are separate tokens. `*-text` colors are for
  text on dark surfaces; `*-fill` colors are solid backgrounds under
  `text-on-fill` (white). Both clear WCAG AA 4.5:1, which the axe e2e suites
  enforce.
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

- Accessibility scan: [e2e/accessibility.spec.ts](e2e/accessibility.spec.ts)
- Keyboard navigation:
  [e2e/keyboard-navigation.spec.ts](e2e/keyboard-navigation.spec.ts)
- Learn pages and redirects: [e2e/learn-layout.spec.ts](e2e/learn-layout.spec.ts)
- Responsive layout (390px and 768px):
  [e2e/responsive-layout.spec.ts](e2e/responsive-layout.spec.ts)

Read-only guard: the Statistics, Journal and Onboarding specs
([e2e/public-pages.spec.ts](e2e/public-pages.spec.ts),
[e2e/onboarding.spec.ts](e2e/onboarding.spec.ts)) record every API request.
Public reads must stay on the allowlist (`/healthz`, `/public/status`,
`/public/opportunities`, `/public/correlation`, `/public/journal`); everything
else must be a GET, apart from the WebSocket ticket request of the shell
(`POST /ws/auth-ticket`).

Fixture data:

- [frontend/e2e/fixtures](e2e/fixtures)

## Contributing

- Open frontend issues:
  [github.com/arbijuie/frontend/issues](https://github.com/arbijuie/frontend/issues)
- For root project governance/workflows, see
  [docs/operations/issue-management-workflow.md](../docs/operations/issue-management-workflow.md)
