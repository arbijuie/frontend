import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mockApi } from "./fixtures/mockApi";

const API = "http://127.0.0.1:8000";

async function expectNoSeriousViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const seriousOrCritical = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious"
  );
  expect(seriousOrCritical.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
}

/** Every API call the page makes, to prove public pages stay on the read-only allowlist. */
function recordApiCalls(page: Page) {
  const calls: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin === API) calls.push(`${request.method()} ${url.pathname}`);
  });
  return calls;
}

const PUBLIC_READS = new Set([
  "GET /public/status",
  "GET /public/opportunities",
  "GET /public/correlation",
  "GET /public/journal",
]);

test.describe("Public Statistics page", () => {
  test("shows coverage, funnel, confidence and reasons from public projections", async ({
    page,
  }) => {
    const calls = recordApiCalls(page);
    await mockApi(page);
    await page.goto("/statistics");

    await expect(page.getByRole("heading", { level: 1, name: "Statistics" })).toBeVisible();
    const venues = page.getByRole("list", { name: "Venue data sources" });
    await expect(venues.getByRole("listitem")).toHaveCount(4);
    await expect(venues).toContainText("REST fallback");
    await expect(venues).toContainText("Unavailable");
    await expect(page.getByRole("list", { name: "Screening funnel" })).toContainText(
      "Candidates found120"
    );
    await expect(page.getByRole("list", { name: "Most common reasons" })).toContainText(
      "Market data is stale"
    );
    await expect(page.getByText(/1 of 2 symbol pairs move together/)).toBeVisible();

    await expectNoSeriousViolations(page);
    expect(calls.length).toBeGreaterThan(0);
    expect(calls.filter((call) => !PUBLIC_READS.has(call))).toEqual([]);
  });

  test("explains a closed public channel", async ({ page }) => {
    await mockApi(page);
    await page.route(`${API}/public/**`, (route) =>
      route.fulfill({ status: 401, contentType: "application/json", body: '{"detail":"no"}' })
    );
    await page.goto("/statistics");

    await expect(page.getByRole("alert").first()).toContainText(
      "Public data is not open on this deployment"
    );
    await expectNoSeriousViolations(page);
  });
});

test.describe("Public Journal page", () => {
  test("shows daily history and switches the window", async ({ page }) => {
    const calls = recordApiCalls(page);
    const journalRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/public/journal")) journalRequests.push(request.url());
    });
    await mockApi(page);
    await page.goto("/journal");

    await expect(page.getByRole("heading", { level: 1, name: "Journal" })).toBeVisible();
    await expect(page.getByRole("table")).toContainText("Funding arbitrage 50");
    await expect(page.getByRole("list", { name: "Ready observations per day" })).toBeVisible();
    await expectNoSeriousViolations(page);

    await page.getByRole("button", { name: "30 days" }).click();
    await expect(page.getByRole("button", { name: "30 days" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    await expect.poll(() => journalRequests.some((url) => url.endsWith("days=30"))).toBe(true);
    expect(calls.filter((call) => !PUBLIC_READS.has(call))).toEqual([]);
  });

  test("explains rate limiting with the retry wait", async ({ page }) => {
    await mockApi(page);
    await page.route(`${API}/public/journal**`, (route) =>
      route.fulfill({
        status: 429,
        // The API exposes Retry-After through CORS (src/api/server.py), so the page can read it.
        headers: {
          "Retry-After": "15",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Expose-Headers": "Retry-After",
        },
        body: "",
      })
    );
    await page.goto("/journal");

    await expect(page.getByRole("alert")).toContainText("Too many requests");
    await expect(page.getByRole("alert")).toContainText("Try again in 15 s.");
  });
});
