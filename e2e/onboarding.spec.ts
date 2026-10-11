import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mockApi } from "./fixtures/mockApi";
import { publicStatus } from "./fixtures/publicData";

// Guided onboarding (issue #306) on the public layout: read-only allowlisted endpoints only.
const API = "http://127.0.0.1:8000";
const ALLOWED_PATHS = new Set(["/healthz", "/public/status", "/public/opportunities"]);
const LIVE = { last_poll_ok: true, ws_connected: true, ws_healthy: true };

interface ApiRequest {
  method: string;
  path: string;
}

function trackApi(page: Page) {
  const requests: ApiRequest[] = [];
  const sockets: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin === API) requests.push({ method: request.method(), path: url.pathname });
  });
  page.on("websocket", (socket) => sockets.push(socket.url()));
  return { requests, sockets };
}

function expectReadOnly({ requests, sockets }: ReturnType<typeof trackApi>) {
  expect(requests.length).toBeGreaterThan(0);
  for (const { method, path } of requests) {
    expect(["GET", "HEAD"], `${method} ${path}`).toContain(method);
    expect(ALLOWED_PATHS.has(path), `${method} ${path} is not allowlisted`).toBe(true);
  }
  expect(sockets.filter((url) => url.startsWith("ws://127.0.0.1:8000"))).toEqual([]);
}

/** Public status with a fresh `last_updated_at`, so the freshness check passes. */
function freshStatus(overrides: Record<string, unknown> = {}) {
  return { ...publicStatus, last_updated_at: new Date().toISOString(), ...overrides };
}

async function routeStatus(page: Page, body: unknown) {
  await page.route(`${API}/public/status`, (route) => route.fulfill({ json: body }));
}

async function expectNoSeriousA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const seriousOrCritical = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious"
  );
  expect(seriousOrCritical.map((v) => v.id)).toEqual([]);
  const ignoredLabels = results.incomplete.filter((item) => item.id === "aria-prohibited-attr");
  expect(ignoredLabels).toEqual([]);
}

const progressSteps = (page: Page) =>
  page.getByRole("list", { name: "Onboarding progress" }).getByRole("listitem");

/** The polite live region that announces the current step's result. */
const stepSummary = (page: Page) =>
  page
    .getByRole("region", { name: /^(Prerequisites|Access and connectivity|First runtime signal)$/ })
    .getByRole("status");

const nextButton = (page: Page) => page.getByRole("button", { name: /^(Next|Continue anyway)$/ });

test.describe("Onboarding wizard", () => {
  test("walks through all three steps to the first runtime signal", async ({ page }) => {
    await mockApi(page);
    const traffic = trackApi(page);
    await routeStatus(
      page,
      freshStatus({ exchanges: { hyperliquid: LIVE, lighter: LIVE, binance: LIVE, bybit: LIVE } })
    );

    await page.goto("/onboarding");
    await expect(page.getByRole("heading", { level: 1, name: "Onboarding" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Public" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Primary" })).toHaveCount(0);

    // Step 1: prerequisites and /healthz.
    await expect(page.getByRole("heading", { level: 2, name: "Prerequisites" })).toBeVisible();
    await expect(page.getByText("Running for 3 h.")).toBeVisible();
    await expect(progressSteps(page).nth(0)).toHaveAttribute("aria-current", "step");
    await expect(progressSteps(page).nth(0)).toContainText("Passed");
    await expect(progressSteps(page).nth(1)).toContainText("Not started");
    await nextButton(page).click();

    // Step 2: public channel and venue connectivity.
    await expect(
      page.getByRole("heading", { level: 2, name: "Access and connectivity" })
    ).toBeFocused();
    await expect(progressSteps(page).nth(1)).toHaveAttribute("aria-current", "step");
    await expect(page.getByText("Public data is readable.")).toBeVisible();
    await expect(page.getByText("All 4 venues stream live.")).toBeVisible();
    await expect(nextButton(page)).toHaveText("Next");
    await nextButton(page).click();

    // Step 3: first runtime signal and next steps.
    await expect(
      page.getByRole("heading", { level: 2, name: "First runtime signal" })
    ).toBeVisible();
    await expect(stepSummary(page)).toHaveText(
      "Signal observed: the screener has run 336 times; 4 routes screened, 2 ready."
    );
    for (const index of [0, 1, 2]) {
      await expect(progressSteps(page).nth(index)).toContainText("Passed");
    }
    await expect(page.getByRole("link", { name: "Public statistics" })).toHaveAttribute(
      "href",
      "/statistics"
    );
    await expect(page.getByRole("link", { name: "Daily journal" })).toHaveAttribute(
      "href",
      "/journal"
    );
    await expect(page.getByRole("link", { name: "Product modes" })).toHaveAttribute(
      "href",
      "/product"
    );
    await expectNoSeriousA11yViolations(page);

    await page.getByRole("button", { name: "Run checks again" }).click();
    await expect(page.getByRole("button", { name: "Run checks again" })).toBeVisible();

    expectReadOnly(traffic);
    expect(new Set(traffic.requests.map(({ path }) => path))).toEqual(ALLOWED_PATHS);
  });

  test("shows the WS degraded fallback and lets the user continue anyway", async ({ page }) => {
    await mockApi(page);
    const traffic = trackApi(page);
    // Default fixture: one venue on REST fallback, one unavailable.
    await routeStatus(page, freshStatus());

    await page.goto("/onboarding");
    await expect(page.getByText("Running for 3 h.")).toBeVisible();
    await nextButton(page).click();

    await expect(
      page.getByText("Live stream degraded: 1 of 4 venues on REST fallback", { exact: true })
    ).toBeVisible();
    await expect(stepSummary(page)).toHaveText(
      "Passed with warnings. Live stream degraded: 1 of 4 venues on REST fallback."
    );
    const venues = page.getByRole("list", { name: "Venues" });
    await expect(venues.getByText("REST fallback")).toBeVisible();
    await expect(venues.getByText("Unavailable")).toBeVisible();
    await expect(page.getByText("Live streaming and tickets")).toBeVisible();
    await expect(progressSteps(page).nth(1)).toContainText("Passed with warnings");
    await expectNoSeriousA11yViolations(page);

    await page.getByRole("button", { name: "Continue anyway" }).click();
    await expect(stepSummary(page)).toHaveText(/^Signal observed/);
    expectReadOnly(traffic);
  });

  test("explains a closed public channel (401) and blocks the next step", async ({ page }) => {
    await mockApi(page);
    const traffic = trackApi(page);
    await page.route(`${API}/public/status`, (route) =>
      route.fulfill({ status: 401, json: { detail: "Not authenticated" } })
    );

    await page.goto("/onboarding");
    await expect(page.getByText("Running for 3 h.")).toBeVisible();
    await nextButton(page).click();

    await expect(page.getByText("The public channel is closed", { exact: true })).toBeVisible();
    await expect(stepSummary(page)).toHaveText("Needs attention. The public channel is closed.");
    await expect(page.getByText(/Telegram Mini App or with an API token/)).toBeVisible();
    await expect(progressSteps(page).nth(1)).toContainText("Needs attention");
    await expect(nextButton(page)).toHaveAttribute("aria-disabled", "true");
    await expect(page.getByText(/Fix the problem above/)).toBeVisible();
    await expectNoSeriousA11yViolations(page);
    expectReadOnly(traffic);
  });

  test("shows the rate-limit fallback and unlocks the retry after Retry-After", async ({
    page,
  }) => {
    await mockApi(page);
    const traffic = trackApi(page);
    let limited = true;
    await page.route(`${API}/public/status`, (route) =>
      limited
        ? route.fulfill({
            status: 429,
            // Cross-origin in e2e: the header must be exposed to be readable.
            headers: { "Retry-After": "2", "Access-Control-Expose-Headers": "Retry-After" },
            json: { detail: "slow" },
          })
        : route.fulfill({ json: freshStatus() })
    );

    await page.goto("/onboarding");
    await expect(page.getByText("Running for 3 h.")).toBeVisible();
    await nextButton(page).click();

    await expect(page.getByText("Too many requests", { exact: true })).toBeVisible();
    await expect(stepSummary(page)).toHaveText("Needs attention. Too many requests.");
    await expect(page.getByText(/asked to wait 2 s/)).toBeVisible();
    const retry = page.getByRole("button", { name: "Run checks again" });
    await expect(retry).toHaveAttribute("aria-disabled", "true");
    await expect(page.getByText(/Rate-limited: available in [12] s/)).toBeVisible();
    await expect(nextButton(page)).toHaveAttribute("aria-disabled", "true");
    await expectNoSeriousA11yViolations(page);

    limited = false;
    await expect(retry).not.toHaveAttribute("aria-disabled", "true", { timeout: 5_000 });
    await retry.click();
    await expect(page.getByText("Public data is readable.")).toBeVisible();
    expectReadOnly(traffic);
  });

  test("blocks step 1 when the API cannot be reached", async ({ page }) => {
    await mockApi(page);
    const traffic = trackApi(page);
    await page.route(`${API}/healthz`, (route) => route.abort("connectionrefused"));

    await page.goto("/onboarding");
    // Network failures are retried twice before the fallback shows.
    await expect(page.getByText("The API cannot be reached", { exact: true })).toBeVisible({
      timeout: 10_000,
    });
    await expect(stepSummary(page)).toHaveText("Needs attention. The API cannot be reached.");
    await expect(nextButton(page)).toHaveText("Next");
    await expect(nextButton(page)).toHaveAttribute("aria-disabled", "true");
    expectReadOnly(traffic);
  });
});
