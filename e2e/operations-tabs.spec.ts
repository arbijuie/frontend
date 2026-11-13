import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mockApi } from "./fixtures/mockApi";

type AxeViolations = Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"];

function summarizeViolations(violations: AxeViolations) {
  return violations.map((violation) => ({
    rule: violation.id,
    impact: violation.impact,
    targets: violation.nodes.slice(0, 3).map((node) => node.target.join(" ")),
  }));
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
}

const OPERATIONS_TABS: Array<{
  tab: string;
  ready: (page: Page) => Promise<void>;
  tables: string[];
}> = [
  {
    tab: "actions",
    ready: async (page) => {
      await expect(page.getByRole("heading", { name: "Attempt timeline" })).toBeVisible();
    },
    tables: ["Execution attempts table"],
  },
  {
    tab: "positions",
    ready: async (page) => {
      await expect(page.getByRole("heading", { name: "Venue accounts" })).toBeVisible();
    },
    tables: ["Venue accounts table", "Open positions table", "Daily PnL table"],
  },
  {
    tab: "guardrails",
    ready: async (page) => {
      await expect(page.getByRole("heading", { name: "Thresholds" })).toBeVisible();
    },
    tables: ["Guardrail thresholds table"],
  },
  {
    tab: "continuity",
    ready: async (page) => {
      await expect(page.getByRole("heading", { name: "Capture window" })).toBeVisible();
    },
    tables: ["Capture window table"],
  },
];

test.describe("Operations tabs", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mockApi(page);
  });

  for (const { tab, ready, tables } of OPERATIONS_TABS) {
    test(`${tab}: one level-1 heading, focusable tables and no serious or critical violations`, async ({
      page,
    }) => {
      await page.goto(`/operations?tab=${tab}`);
      await ready(page);

      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      for (const name of tables) {
        const region = page.getByRole("region", { name });
        await expect(region).toHaveAttribute("tabindex", "0");
      }
      await expectNoSeriousViolations(page);
    });
  }
});
