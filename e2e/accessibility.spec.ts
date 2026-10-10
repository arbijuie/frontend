import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mockApi, mockBackendUnavailable } from "./fixtures/mockApi";

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

  test("Opportunities: list with ready, watching and blocked cards", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("AERO").first()).toBeVisible();
    await expect(page.getByText("live (WS)")).toBeVisible();
    await expectNoSeriousViolations(page);
  });

  test("Opportunities: expanded card with provenance and an open help tooltip", async ({
    page,
  }) => {
    await page.goto("/");
    await page
      .getByRole("button", { name: "More details for AERO, hyperliquid to lighter" })
      .click();
    await page.getByRole("button", { name: /show data provenance/i }).click();
    await page.getByRole("button", { name: "Help: Liquidity tier" }).click();
    await expect(page.getByRole("tooltip")).toBeVisible();
    await expectNoSeriousViolations(page);
  });

  test("Status: full page with diagnostics and live transport", async ({ page }) => {
    await page.goto("/status");
    await expect(page.getByRole("heading", { name: "Live Transport" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Pipeline Diagnostics", exact: true })
    ).toBeVisible();
    await expect(page.getByText(/relative intensity/i).first()).toBeAttached();
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

test.describe("Accessibility baseline (backend unavailable)", () => {
  const PAGES = [
    { path: "/", name: "Opportunities" },
    { path: "/status", name: "Status" },
    { path: "/config", name: "Config" },
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
