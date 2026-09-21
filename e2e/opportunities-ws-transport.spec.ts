import { expect, test } from "@playwright/test";

const emptySnapshot = {
  count: 0,
  ready_count: 0,
  updated_at: "2026-01-01T00:00:00Z",
  opportunities: [],
};

async function mockOpportunitiesRest(page: import("@playwright/test").Page) {
  await page.route("http://127.0.0.1:8000/opportunities**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(emptySnapshot),
    });
  });
}

test.describe("Opportunities WS transport", () => {
  test("shows live (WS) once the socket connects and pushes a frame", async ({ page }) => {
    await mockOpportunitiesRest(page);

    await page.routeWebSocket("ws://127.0.0.1:8000/ws/opportunities", (ws) => {
      ws.send(JSON.stringify(emptySnapshot));
    });

    await page.goto("/");

    await expect(page.getByText("live (WS)")).toBeVisible();
  });

  test("shows reconnecting state when the socket closes", async ({ page }) => {
    await mockOpportunitiesRest(page);

    await page.routeWebSocket("ws://127.0.0.1:8000/ws/opportunities", (ws) => {
      ws.send(JSON.stringify(emptySnapshot));
      ws.close();
    });

    await page.goto("/");

    await expect(page.getByText(/reconnecting/i)).toBeVisible();
  });

  test("manual refresh still works while WS is connected", async ({ page }) => {
    await mockOpportunitiesRest(page);

    await page.routeWebSocket("ws://127.0.0.1:8000/ws/opportunities", (ws) => {
      ws.send(JSON.stringify(emptySnapshot));
    });

    await page.goto("/");

    await expect(page.getByText("live (WS)")).toBeVisible();

    await page.getByRole("button", { name: /refresh opportunities/i }).click();

    await expect(page.getByText("live (WS)")).toBeVisible();
  });

  test("eventually falls back to polling after repeated connection failures", async ({ page }) => {
    test.setTimeout(45_000);

    await mockOpportunitiesRest(page);

    await page.routeWebSocket("ws://127.0.0.1:8000/ws/opportunities", (ws) => {
      ws.close();
    });

    await page.goto("/");

    await expect(page.getByText(/polling fallback/i)).toBeVisible({
      timeout: 40_000,
    });
  });

  test("manual refresh triggers a REST call", async ({ page }) => {
    let restCallCount = 0;

    await page.route("http://127.0.0.1:8000/opportunities**", async (route) => {
      restCallCount += 1;

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(emptySnapshot),
      });
    });

    await page.routeWebSocket("ws://127.0.0.1:8000/ws/opportunities", (ws) => {
      ws.send(JSON.stringify(emptySnapshot));
    });

    await page.goto("/");

    await expect(page.getByText("live (WS)")).toBeVisible();

    const callsBefore = restCallCount;

    await page.getByRole("button", { name: /refresh opportunities/i }).click();

    await expect.poll(() => restCallCount).toBeGreaterThan(callsBefore);
  });
});
