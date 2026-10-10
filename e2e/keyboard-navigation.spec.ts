import { expect, test } from "@playwright/test";
import { mockApi } from "./fixtures/mockApi";

const PAGES = [
  { path: "/", name: "Opportunities" },
  { path: "/status", name: "Status" },
  { path: "/config", name: "Config" },
  { path: "/backtest", name: "Backtest" },
];

test.describe("Keyboard-only navigation", () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
  });

  for (const { path, name } of PAGES) {
    test(`${name}: has one main landmark and one level-1 heading`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("main")).toHaveCount(1);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    });
  }

  test("skip link is the first stop and moves focus into the page content", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(page.getByRole("main")).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Filter opportunities by strategy")).toBeFocused();
  });

  test("moves through all four pages with the keyboard and announces each change", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const nav = page.getByRole("navigation", { name: "Primary" });

    for (const target of ["Status", "Config", "Backtest"]) {
      const link = nav.getByRole("link", { name: target, exact: true });
      await link.focus();
      await page.keyboard.press("Enter");

      await expect(page).toHaveTitle(new RegExp(target));
      await expect(page.getByTestId("route-announcer")).toHaveText(new RegExp(target));
      await expect(link).toBeFocused();
    }
  });

  test("Opportunities: every status filter is reachable with Tab and reports its state", async ({
    page,
  }) => {
    await page.goto("/");
    const group = page.getByRole("group", { name: "Filter opportunities by status" });
    const allButton = group.getByRole("button", { name: /^All/ });
    const readyButton = group.getByRole("button", { name: /^Ready/ });
    await expect(allButton).toHaveAttribute("aria-pressed", "true");

    await allButton.focus();
    await page.keyboard.press("Tab");
    await expect(readyButton).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(readyButton).toHaveAttribute("aria-pressed", "true");
    await expect(allButton).toHaveAttribute("aria-pressed", "false");
    await expect(page).toHaveURL(/status=ready/);
  });

  test("Opportunities: card details and help tooltip are operable from the keyboard", async ({
    page,
  }) => {
    await page.goto("/");

    await page
      .getByRole("button", { name: "More details for AERO, hyperliquid to lighter" })
      .focus();
    await page.keyboard.press("Enter");

    const hideButton = page.getByRole("button", {
      name: "Hide details for AERO, hyperliquid to lighter",
    });
    await expect(hideButton).toHaveAttribute("aria-expanded", "true");

    await page.getByRole("button", { name: "Help: Liquidity tier" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("tooltip")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("tooltip")).toBeHidden();
  });

  test("Opportunities: repeated symbols get distinct button names", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("button", { name: /^More details for AERO,/ })).toHaveCount(2);
    await expect(
      page.getByRole("button", { name: "More details for AERO, hyperliquid to lighter" })
    ).toHaveCount(1);
    await expect(
      page.getByRole("button", { name: "More details for AERO, hyperliquid to binance" })
    ).toHaveCount(1);
  });

  test("Config: preview dialog takes focus, Escape closes it and focus returns", async ({
    page,
  }) => {
    await page.goto("/config");

    await page.getByLabel("Min Score (bps)", { exact: true }).fill("9");
    const previewButton = page.getByRole("button", { name: /preview changes/i });
    await previewButton.focus();
    await page.keyboard.press("Enter");

    const dialog = page.getByRole("dialog", { name: /preview config changes/i });
    await expect(dialog).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Cancel" })).toBeFocused();

    await dialog.focus();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(previewButton).toBeFocused();
  });

  test("Backtest: every tab is reachable with Tab, arrows also move and wrap", async ({ page }) => {
    await page.goto("/backtest");

    const summaryTab = page.getByRole("tab", { name: /^summary/i });
    const replayTab = page.getByRole("tab", { name: /^replay/i });
    await expect(summaryTab).toBeVisible();
    await summaryTab.focus();

    await page.keyboard.press("Tab");
    await expect(replayTab).toBeFocused();
    await expect(replayTab).toHaveAttribute("aria-selected", "false");

    await page.keyboard.press("Enter");
    await expect(replayTab).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel", { name: /replay/i })).toBeVisible();

    await page.keyboard.press("ArrowLeft");
    await expect(summaryTab).toBeFocused();

    await page.keyboard.press("ArrowLeft");
    await expect(page.getByRole("tab").last()).toBeFocused();
  });

  test("Status: the scrollable exchange table can be focused from the keyboard", async ({
    page,
  }) => {
    await page.goto("/status");

    const region = page.getByRole("region", { name: "Exchange split table" });
    await expect(region).toBeVisible();
    await region.focus();
    await expect(region).toBeFocused();
  });

  test("Status: refresh button keeps keyboard focus while the request runs", async ({ page }) => {
    await page.goto("/status");
    const refresh = page.getByRole("button", { name: "Refresh status" });
    await expect(refresh).toBeVisible();

    await page.route("http://127.0.0.1:8000/status**", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 400));
      await route.fulfill({ path: "e2e/fixtures/status.json", contentType: "application/json" });
    });

    await refresh.focus();
    await page.keyboard.press("Enter");

    await expect(refresh).toHaveAttribute("aria-disabled", "true");
    await expect(refresh).toBeFocused();
    await expect(refresh).toHaveAttribute("aria-disabled", "false");
  });

  test("keyboard focus is visible on the menu and on the search box", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("AERO").first()).toBeVisible();
    const menu = page.getByRole("navigation", { name: "Primary" });
    await expect(menu).toBeVisible();

    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    const firstMenuItem = menu.getByRole("link").first();
    await expect(firstMenuItem).toBeFocused();
    await expect(firstMenuItem).toHaveCSS("outline-style", "solid");

    const search = page.getByLabel("Search by symbol");
    await search.focus();
    await expect(search).toHaveCSS("outline-style", "solid");
  });

  test("Backtest: creating a lock keeps keyboard focus on the button", async ({ page }) => {
    await page.goto("/backtest");
    await page.getByRole("tab", { name: /^replay/i }).click();
    await page.getByRole("button", { name: "Run Replay" }).click();

    const createLock = page.getByRole("button", { name: /create strategy lock/i });
    await createLock.focus();
    await page.keyboard.press("Enter");

    await expect(page.getByText(/lock lock-new-003 created/i)).toBeVisible();
    const lockedButton = page.getByRole("button", { name: /lock created/i });
    await expect(lockedButton).toBeFocused();
    await expect(lockedButton).toHaveAttribute("aria-disabled", "true");
  });
});
