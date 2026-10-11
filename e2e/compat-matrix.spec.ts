import { expect, test, type Page } from "@playwright/test";
import { mockApi } from "./fixtures/mockApi";
import { NAV_ITEMS, PUBLIC_NAV_ITEMS } from "../src/lib/navigation";

// Dual-surface compatibility matrix (issue #308). Routes come from the navigation registry,
// so a new operator or public page is covered without editing this file.
const API = "http://127.0.0.1:8000";

// Read-only allowlist for the public surface: the redacted projections and liveness.
const PUBLIC_API_ALLOWLIST =
  /^GET (\/public\/(status|opportunities|correlation|journal)|\/healthz)$/;

function recordApiCalls(page: Page): string[] {
  const calls: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin === API) calls.push(`${request.method()} ${url.pathname}`);
  });
  // Only sockets to the API; the dev server's own hot-reload socket is not app traffic.
  page.on("websocket", (socket) => {
    const url = new URL(socket.url());
    if (url.host === new URL(API).host) calls.push(`WS ${url.pathname}`);
  });
  return calls;
}

async function expectSurface(page: Page, surface: "operator" | "public") {
  const own = surface === "operator" ? "Primary" : "Public";
  const other = surface === "operator" ? "Public" : "Primary";
  await expect(page.getByRole("navigation", { name: own })).toBeVisible();
  await expect(page.getByRole("navigation", { name: other })).toHaveCount(0);
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
}

test.describe("Compatibility matrix: operator surface", () => {
  for (const { to, label } of NAV_ITEMS) {
    test(`${to} renders in the operator layout and never calls public projections`, async ({
      page,
    }) => {
      const calls = recordApiCalls(page);
      await mockApi(page);
      await page.goto(to);

      await expectSurface(page, "operator");
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
      await expectSurface(page, "operator");
    }
  });
});

test.describe("Compatibility matrix: public surface", () => {
  for (const { to, label } of PUBLIC_NAV_ITEMS) {
    test(`${to} renders in the public layout and stays on the read-only allowlist`, async ({
      page,
    }) => {
      const calls = recordApiCalls(page);
      await mockApi(page);
      await page.goto(to);

      await expectSurface(page, "public");
      await expect(page.getByRole("heading", { level: 1, name: label })).toBeVisible();
      const link = page
        .getByRole("navigation", { name: "Public" })
        .getByRole("link", { name: label, exact: true });
      await expect(link).toHaveAttribute("aria-current", "page");

      await page.waitForLoadState("networkidle");
      expect(calls.filter((call) => !PUBLIC_API_ALLOWLIST.test(call))).toEqual([]);
    });
  }
});

test.describe("Compatibility matrix: moving between surfaces", () => {
  test("history navigation restores the right layout on each side", async ({ page }) => {
    await mockApi(page);
    const operatorPath = NAV_ITEMS[1].to;
    const publicPath = PUBLIC_NAV_ITEMS[0].to;

    await page.goto(publicPath);
    await expectSurface(page, "public");

    await page.goto(operatorPath);
    await expectSurface(page, "operator");

    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`${publicPath}$`));
    await expectSurface(page, "public");

    await page.goForward();
    await expect(page).toHaveURL(new RegExp(`${operatorPath}$`));
    await expectSurface(page, "operator");
  });

  test("deep links survive a reload on both surfaces", async ({ page }) => {
    await mockApi(page);
    for (const [path, surface] of [
      [NAV_ITEMS[NAV_ITEMS.length - 1].to, "operator"],
      [PUBLIC_NAV_ITEMS[PUBLIC_NAV_ITEMS.length - 1].to, "public"],
    ] as const) {
      await page.goto(path);
      await page.reload();
      await expectSurface(page, surface);
    }
  });
});
