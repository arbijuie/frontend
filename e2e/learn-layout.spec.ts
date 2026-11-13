import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mockApi } from "./fixtures/mockApi";

const LEARN_PAGES = [
  { path: "/learn/about", name: "Product" },
  { path: "/learn/how-it-works", name: "How it works" },
  { path: "/learn/statistics", name: "Statistics" },
  { path: "/learn/journal", name: "Journal" },
  { path: "/learn/onboarding", name: "Onboarding" },
];

const REDIRECTS = [
  { from: "/product", to: "/learn/about", name: "Product" },
  { from: "/how-it-works", to: "/learn/how-it-works", name: "How it works" },
  { from: "/statistics", to: "/learn/statistics", name: "Statistics" },
  { from: "/journal", to: "/learn/journal", name: "Journal" },
  { from: "/onboarding", to: "/learn/onboarding", name: "Onboarding" },
];

test.describe("Learn pages under the operator layout", () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
  });

  for (const { path, name } of LEARN_PAGES) {
    test(`${name}: renders with the bottom menu and More highlighted`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
      const nav = page.getByRole("navigation", { name: "Primary" });
      await expect(nav).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Public" })).toHaveCount(0);
      await expect(nav.getByRole("link", { name: "More", exact: true })).toHaveAttribute(
        "aria-current",
        "page"
      );
      await expect(page.getByRole("main")).toHaveCount(1);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    });

    test(`${name}: has no critical or serious accessibility violations`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();

      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      const seriousOrCritical = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious"
      );
      expect(seriousOrCritical.map((v) => v.id)).toEqual([]);
    });
  }

  for (const { from, to, name } of REDIRECTS) {
    test(`${from} redirects to ${to}`, async ({ page }) => {
      await page.goto(from);
      await expect(page).toHaveURL(new RegExp(`${to}$`));
      await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
    });
  }

  test("a redirect keeps the query and hash", async ({ page }) => {
    await page.goto("/statistics?x=y#venues");
    await expect(page).toHaveURL(/\/learn\/statistics\?x=y#venues$/);
    await expect(page.getByRole("heading", { level: 1, name: "Statistics" })).toBeVisible();
  });

  test("skip link is the first Tab stop on a learn page", async ({ page }) => {
    await page.goto("/learn/about");
    await expect(page.getByRole("heading", { level: 1, name: "Product" })).toBeVisible();

    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(page.getByRole("main")).toBeFocused();
  });

  test("More opens Onboarding from the menu", async ({ page }) => {
    await page.goto("/more");
    await page.getByRole("link", { name: /^Onboarding/ }).click();

    await expect(page).toHaveURL(/\/learn\/onboarding$/);
    await expect(page.getByRole("heading", { level: 1, name: "Onboarding" })).toBeVisible();
  });
});

test.describe("Opportunities WebSocket scope", () => {
  test("operator pages open the opportunities WebSocket", async ({ page }) => {
    const opened: string[] = [];
    await mockApi(page, { onWebSocket: (url) => opened.push(url) });

    await page.goto("/");

    await expect(page.getByText("live (WS)")).toBeVisible();
    expect(opened.length).toBeGreaterThan(0);
  });

  test("moving between operator pages keeps a single WebSocket", async ({ page }) => {
    const opened: string[] = [];
    await mockApi(page, { onWebSocket: (url) => opened.push(url) });

    await page.goto("/");
    await expect(page.getByText("live (WS)")).toBeVisible();
    const afterFirstPage = opened.length;

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Health", exact: true })
      .click();
    await expect(page.getByRole("heading", { level: 1, name: "Health" })).toBeVisible();

    expect(opened.length).toBe(afterFirstPage);
  });
});
