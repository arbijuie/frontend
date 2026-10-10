import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mockApi } from "./fixtures/mockApi";

const PUBLIC_PAGES = [
  { path: "/product", name: "Product" },
  { path: "/how-it-works", name: "How it works" },
  { path: "/statistics", name: "Statistics" },
  { path: "/onboarding", name: "Onboarding" },
];

test.describe("Public layout", () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
  });

  for (const { path, name } of PUBLIC_PAGES) {
    test(`${name}: renders with public navigation and without the operator bar`, async ({
      page,
    }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Public" })).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Primary" })).toHaveCount(0);
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

      const ignoredLabels = results.incomplete.filter((item) => item.id === "aria-prohibited-attr");
      expect(ignoredLabels).toEqual([]);
    });
  }

  test("skip link is the first Tab stop on a public page", async ({ page }) => {
    await page.goto("/product");
    await expect(page.getByRole("heading", { level: 1, name: "Product" })).toBeVisible();

    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(page.getByRole("main")).toBeFocused();
  });

  test("operator pages keep the bottom navigation", async ({ page }) => {
    await page.goto("/status");
    await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Public" })).toHaveCount(0);
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

  test("public pages do not open the opportunities WebSocket", async ({ page }) => {
    const opened: string[] = [];
    await mockApi(page, { onWebSocket: (url) => opened.push(url) });

    await page.goto("/product");
    await expect(page.getByRole("heading", { level: 1, name: "Product" })).toBeVisible();
    await page.waitForLoadState("networkidle");

    expect(opened).toEqual([]);
  });

  test("moving from a public page to an operator page opens the WebSocket", async ({ page }) => {
    const opened: string[] = [];
    await mockApi(page, { onWebSocket: (url) => opened.push(url) });

    await page.goto("/product");
    await expect(page.getByRole("heading", { level: 1, name: "Product" })).toBeVisible();
    expect(opened).toEqual([]);

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
      .getByRole("link", { name: "Status", exact: true })
      .click();
    await expect(page.getByRole("heading", { level: 1, name: "Status" })).toBeVisible();

    expect(opened.length).toBe(afterFirstPage);
  });
});
