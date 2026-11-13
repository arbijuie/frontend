import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mockApi } from "./fixtures/mockApi";

test.describe("Informational cards lead somewhere", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mockApi(page);
  });

  test("Statistics: a card opens Deals with the status from the keyboard", async ({ page }) => {
    await page.goto("/learn/statistics");
    const card = page.getByRole("link", { name: /^Ready after validation/ });
    await expect(card).toBeVisible();

    await card.focus();
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/status=ready/);
    await expect(page.getByRole("heading", { level: 1, name: "Deals" })).toBeVisible();
  });

  test("Statistics: a venue opens Health", async ({ page }) => {
    await page.goto("/learn/statistics");
    await page.getByRole("list", { name: "Venue data sources" }).getByRole("link").first().click();

    await expect(page).toHaveURL(/\/status$/);
    await expect(page.getByRole("heading", { level: 1, name: "Health" })).toBeVisible();
  });

  test("How it works: a verdict opens Deals with that status", async ({ page }) => {
    await page.goto("/learn/how-it-works");
    await page.getByRole("link", { name: "BLOCKED: show blocked deals" }).click();

    await expect(page).toHaveURL(/status=blocked/);
    await expect(page.getByRole("heading", { level: 1, name: "Deals" })).toBeVisible();
  });

  for (const path of ["/learn/statistics", "/learn/how-it-works"]) {
    test(`${path}: linked cards have no serious or critical axe violations`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      const seriousOrCritical = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious"
      );
      expect(seriousOrCritical.map((v) => v.id)).toEqual([]);
    });
  }
});
