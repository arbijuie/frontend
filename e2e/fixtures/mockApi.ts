import type { Page } from "@playwright/test";
import {
  backtestGate,
  backtestLocks,
  backtestSummary,
  makeLockDetail,
  opportunitiesSnapshot,
  replayMetrics,
} from "./a11yData";

const API = "http://127.0.0.1:8000";
const WS_URL = "ws://127.0.0.1:8000/ws/opportunities";

const STATUS_FIXTURE_PATH = "e2e/fixtures/status.json";
const CONFIG_FIXTURE_PATH = "e2e/fixtures/config.json";

interface MockApiOptions {
  onWebSocket?: (url: string) => void;
}

export async function mockApi(page: Page, options: MockApiOptions = {}) {
  await page.route(`${API}/**`, async (route) => {
    const { pathname } = new URL(route.request().url());
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

    if (pathname === "/opportunities") return json(opportunitiesSnapshot);
    if (pathname === "/status") {
      return route.fulfill({ path: STATUS_FIXTURE_PATH, contentType: "application/json" });
    }
    if (pathname === "/config") {
      return route.fulfill({ path: CONFIG_FIXTURE_PATH, contentType: "application/json" });
    }
    if (pathname === "/backtest/summary") return json(backtestSummary);
    if (pathname === "/backtest/gate") return json(backtestGate);
    if (pathname === "/backtest/locks") return json({ items: backtestLocks });
    if (pathname === "/backtest/replay") return json({ metrics: replayMetrics });
    if (pathname === "/backtest/lock") return json(makeLockDetail("lock-new-003", true));

    const lockMatch = pathname.match(/^\/backtest\/locks\/(.+)$/);
    if (lockMatch) {
      const lockId = decodeURIComponent(lockMatch[1]);
      return json(makeLockDetail(lockId, lockId.includes("pass")));
    }
    return json({ detail: `not mocked in e2e: ${pathname}` }, 404);
  });

  await page.routeWebSocket(WS_URL, (ws) => {
    options.onWebSocket?.(ws.url());
    ws.send(JSON.stringify(opportunitiesSnapshot));
  });
}

export async function mockBackendUnavailable(page: Page) {
  await page.route(`${API}/**`, (route) => route.abort("connectionrefused"));
  await page.routeWebSocket(WS_URL, (ws) => {
    ws.close();
  });
}
