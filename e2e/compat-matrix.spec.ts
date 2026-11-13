import { expect, test, type Page } from "@playwright/test";
import { mockApi } from "./fixtures/mockApi";
import { NAV_ITEMS } from "../src/lib/navigation";

// Compatibility matrix (issue #308). Every screen lives under the operator layout, so the
// bottom menu is always there. Routes come from the navigation registry.
const API = "http://127.0.0.1:8000";

const LEARN_PATHS = [
  { path: "/learn/about", name: "Product" },
  { path: "/learn/how-it-works", name: "How it works" },
  { path: "/learn/statistics", name: "Statistics" },
  { path: "/learn/journal", name: "Journal" },
  { path: "/learn/onboarding", name: "Onboarding" },
];

function recordApiCalls(page: Page): string[] {
  const calls: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin === API) calls.push(`${request.method()} ${url.pathname}`);
  });
  return calls;
}

async function expectOperatorLayout(page: Page) {
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Public" })).toHaveCount(0);
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
}

test.describe("Compatibility matrix: bottom menu pages", () => {
  for (const { to, label } of NAV_ITEMS) {
    test(`${to} renders in the operator layout and never calls public projections`, async ({
      page,
    }) => {
      const calls = recordApiCalls(page);
      await mockApi(page);
      await page.goto(to);

      await expectOperatorLayout(page);
      const link = page
        .getByRole("navigation", { name: "Primary" })
        .getByRole("link", { name: label, exact: true });
      await expect(link).toHaveAttribute("aria-current", "page");
      await expect(page).toHaveTitle(new RegExp(`· Arbijuie$`));

      await page.waitForLoadState("networkidle");
      expect(calls.filter((call) => call.includes("/public/"))).toEqual([]);
    });
  }

  test("unknown paths fall back to Not Found inside the operator layout", async ({ page }) => {
    await mockApi(page);
    for (const path of ["/does-not-exist", "/statistics/extra", "/public/status"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
      await expectOperatorLayout(page);
    }
  });
});

test.describe("Compatibility matrix: learn pages", () => {
  for (const { path, name } of LEARN_PATHS) {
    test(`${path} renders in the operator layout`, async ({ page }) => {
      await mockApi(page);
      await page.goto(path);

      await expectOperatorLayout(page);
      await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
      await expect(
        page
          .getByRole("navigation", { name: "Primary" })
          .getByRole("link", { name: "More", exact: true })
      ).toHaveAttribute("aria-current", "page");
    });
  }
});

test.describe("Compatibility matrix: moving between pages", () => {
  test("history navigation restores each page", async ({ page }) => {
    await mockApi(page);
    const learnPath = LEARN_PATHS[0].path;
    const operatorPath = NAV_ITEMS[1].to;

    await page.goto(learnPath);
    await expectOperatorLayout(page);

    await page.goto(operatorPath);
    await expectOperatorLayout(page);

    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`${learnPath}$`));
    await expectOperatorLayout(page);

    await page.goForward();
    await expect(page).toHaveURL(new RegExp(`${operatorPath}$`));
    await expectOperatorLayout(page);
  });

  test("deep links survive a reload", async ({ page }) => {
    await mockApi(page);
    for (const path of [
      NAV_ITEMS[NAV_ITEMS.length - 1].to,
      LEARN_PATHS[LEARN_PATHS.length - 1].path,
    ]) {
      await page.goto(path);
      await page.reload();
      await expectOperatorLayout(page);
    }
  });
});
