import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mockApi, mockBackendUnavailable } from "./fixtures/mockApi";
import { openTradeButton } from "./fixtures/selectors";
import { stopTrading } from "./fixtures/operationsData";

// A critical stop with cooldown still pending, so the card shows every gate fact and the form.
const latchedStopTrading = {
  ...stopTrading,
  state: "stopped",
  latched_at: "2026-10-16T08:00:00Z",
  last_tripped_at: "2026-10-16T09:00:00Z",
  active: [
    {
      trigger: "risk_breach",
      reason: "lighter margin below force-close",
      observed: 1.05,
      threshold: 1.1,
      subject: "lighter",
      critical: true,
      first_tripped_at: "2026-10-16T08:00:00Z",
      last_tripped_at: "2026-10-16T09:00:00Z",
      trips: 2,
    },
  ],
  gate: {
    ...stopTrading.gate,
    stopped: true,
    cooldown_elapsed: false,
    cooldown_remaining_s: 300,
    ack_required: true,
    blockers: ["cooldown_pending", "manual_ack_required"],
  },
};

type AxeViolations = Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"];

function summarizeViolations(violations: AxeViolations) {
  return violations.map((violation) => {
    const groups = new Map<string, string[]>();
    for (const node of violation.nodes) {
      const data = (node.any[0]?.data ?? {}) as Record<string, unknown>;
      const key =
        violation.id === "color-contrast"
          ? `${data.fgColor} on ${data.bgColor}: ${data.contrastRatio} (need ${data.expectedContrastRatio}), ${data.fontSize}`
          : (node.failureSummary ?? "").replace(/\s+/g, " ").trim();
      groups.set(key, [...(groups.get(key) ?? []), node.target.join(" ")]);
    }
    return {
      rule: violation.id,
      impact: violation.impact,
      groups: [...groups.entries()].map(([what, targets]) => ({
        what,
        count: targets.length,
        examples: targets.slice(0, 3),
      })),
    };
  });
}

async function expectNoSeriousViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const seriousOrCritical = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious"
  );

  if (seriousOrCritical.length > 0) {
    console.log(JSON.stringify(summarizeViolations(seriousOrCritical), null, 2));
  }

  expect(
    seriousOrCritical.length,
    "serious/critical accessibility violations found, see the summary above"
  ).toBe(0);

  const ignoredLabels = results.incomplete
    .filter((item) => item.id === "aria-prohibited-attr")
    .flatMap((item) => item.nodes.map((node) => node.target.join(" ")));

  expect(
    ignoredLabels,
    "aria-label on an element without a role is not announced; use visible or visually hidden text"
  ).toEqual([]);
}

test.describe("Accessibility baseline (pages with realistic data)", () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
  });

  test("Deals: list with ready, watching and blocked cards", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("AERO").first()).toBeVisible();
    await expect(page.getByText("live (WS)")).toBeVisible();
    await expectNoSeriousViolations(page);
  });

  test("Deals: expanded card with provenance and an open help tooltip", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("button", { name: "More details for AERO, hyperliquid to lighter" })
      .click();
    await page.getByRole("button", { name: /show data provenance/i }).click();
    await page.getByRole("button", { name: "Help: Liquidity tier" }).click();
    await expect(page.getByRole("tooltip")).toBeVisible();
    await expectNoSeriousViolations(page);
  });

  test("Health: full page with diagnostics and live transport", async ({ page }) => {
    await page.goto("/status");
    await expect(page.getByRole("heading", { name: "Live Transport" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Pipeline Diagnostics", exact: true })
    ).toBeVisible();
    await expect(page.getByText(/relative intensity/i).first()).toBeAttached();
    await expectNoSeriousViolations(page);
  });

  test("Health: latched stop-trading card with the acknowledgment review open", async ({
    page,
  }) => {
    await page.route("http://127.0.0.1:8000/risk/stop-trading", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(latchedStopTrading),
      })
    );
    await page.goto("/status");
    await expect(page.getByText("Stopped", { exact: true })).toBeVisible();
    await page
      .getByLabel("Acknowledgment reason (what you checked or fixed)")
      .fill("lighter margin topped up");
    await page.getByRole("button", { name: "Review acknowledgment" }).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await expectNoSeriousViolations(page);
  });

  test("Config: editor with fields", async ({ page }) => {
    await page.goto("/config");
    await expect(page.getByRole("heading", { name: "Custom Runbook Fields" })).toBeVisible();
    await expectNoSeriousViolations(page);
  });

  test("Config: diff preview dialog is open", async ({ page }) => {
    await page.goto("/config");
    await page.getByLabel("Min Score (bps)", { exact: true }).fill("9");
    await page.getByRole("button", { name: /preview changes/i }).click();
    await expect(page.getByRole("dialog", { name: /preview config changes/i })).toBeVisible();
    await expectNoSeriousViolations(page);
  });

  test("Backtest: lock detail tab", async ({ page }) => {
    await page.goto("/backtest");
    await page.getByRole("tab", { name: /^locks/i }).click();
    await page.getByRole("button", { name: "View details for lock-fail-002" }).click();
    await expect(page.getByRole("heading", { name: "Exit Reasons" })).toBeVisible();
    await expectNoSeriousViolations(page);
  });

  test("Backtest: replay result panel", async ({ page }) => {
    await page.goto("/backtest");
    await page.getByRole("tab", { name: /^replay/i }).click();
    await page.getByRole("button", { name: "Run Replay" }).click();
    await expect(page.getByRole("region", { name: "Replay result" })).toBeVisible();
    await expectNoSeriousViolations(page);
  });

  const BACKTEST_TABS: Array<{ tab: RegExp; ready: (page: Page) => Promise<void> }> = [
    {
      tab: /^summary/i,
      ready: async (page) => {
        await expect(page.getByText("Total Snapshots")).toBeVisible();
      },
    },
    {
      tab: /^replay/i,
      ready: async (page) => {
        await expect(page.getByRole("button", { name: "Run Replay" })).toBeVisible();
      },
    },
    {
      tab: /^gate/i,
      ready: async (page) => {
        await expect(page.getByText("Gate: Not Passed")).toBeVisible();
      },
    },
    {
      tab: /^locks/i,
      ready: async (page) => {
        await expect(page.getByText("Gate Failed")).toBeVisible();
        await expect(page.getByText("Gate Passed")).toBeVisible();
      },
    },
  ];

  for (const { tab, ready } of BACKTEST_TABS) {
    test(`Backtest: ${tab.source} tab`, async ({ page }) => {
      await page.goto("/backtest");
      await page.getByRole("tab", { name: tab }).click();
      await ready(page);
      await expectNoSeriousViolations(page);
    });
  }
});

test.describe("Accessibility baseline (trader screens)", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mockApi(page);
  });

  const TRADER_PAGES = [
    { path: "/positions", name: "Positions" },
    { path: "/more", name: "More" },
    { path: "/welcome", name: "Welcome" },
    { path: "/automation", name: "Auto" },
    { path: "/execution/preflight", name: "Pre-trade check" },
    { path: "/deals/AERO/hyperliquid/lighter", name: "Deal page" },
    { path: "/operations", name: "System logs" },
  ];

  for (const { path, name } of TRADER_PAGES) {
    test(`${name}: no serious or critical violations`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expectNoSeriousViolations(page);
    });
  }

  test("Deals: the open Execution Sheet has no serious or critical violations", async ({
    page,
  }) => {
    await mockApi(page, { allowOpenTrades: true });
    await page.goto("/");
    await openTradeButton(page, "AERO", "hyperliquid", "lighter").click();
    await expect(page.getByRole("dialog", { name: "Open Arbitrage Position" })).toBeVisible();
    await expectNoSeriousViolations(page);
  });

  test("Positions: the open close-position dialog has no serious or critical violations", async ({
    page,
  }) => {
    await page.goto("/positions");
    await page.getByRole("button", { name: "Close position" }).first().click();
    await expect(page.getByRole("dialog", { name: /^Close .+\?$/ })).toBeVisible();
    await expectNoSeriousViolations(page);
  });
});

test.describe("Accessibility baseline (backend unavailable)", () => {
  const PAGES = [
    { path: "/", name: "Deals" },
    { path: "/status", name: "Health" },
    { path: "/config", name: "Settings" },
    { path: "/backtest", name: "Backtest" },
  ];

  test.beforeEach(async ({ page }) => {
    await mockBackendUnavailable(page);
  });

  for (const { path, name } of PAGES) {
    test(`${name} page error state has no critical/serious violations`, async ({ page }) => {
      test.setTimeout(60_000);
      await page.goto(path);
      await expect(page.getByRole("alert").first()).toBeVisible({ timeout: 20_000 });
      await expectNoSeriousViolations(page);
    });
  }
});
