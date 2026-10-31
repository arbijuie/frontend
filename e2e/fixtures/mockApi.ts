import type { Page } from "@playwright/test";
import {
  backtestGate,
  backtestLocks,
  backtestSummary,
  makeLockDetail,
  opportunitiesSnapshot,
  replayMetrics,
} from "./a11yData";
import {
  healthz,
  publicCorrelation,
  publicJournal,
  publicOpportunities,
  publicStatus,
} from "./publicData";
import {
  backtestHistory,
  backtestSurvival,
  dailyPnl,
  executionAttempts,
  parityArtifacts,
  persistenceForecast,
  positions,
  riskGuardrails,
  snapshotContinuity,
} from "./operationsData";

const API = "http://127.0.0.1:8000";
const WS_URL = "ws://127.0.0.1:8000/ws/opportunities";

const STATUS_FIXTURE_PATH = "e2e/fixtures/status.json";
const CONFIG_FIXTURE_PATH = "e2e/fixtures/config.json";

const automationMode = (kind: "entry" | "exit") => ({
  kind,
  enabled: true,
  paused: false,
  paused_at: null,
  pause_reason: null,
  paused_by: null,
  state: "armed",
  blockers: [],
  last_run_at: "2026-10-16T09:00:00Z",
  actions_total: 0,
  failures_total: 0,
  last_action_at: null,
  last_action_symbol: null,
  last_action_outcome: null,
});

const automationOverview = {
  checked_at: "2026-10-16T09:05:00Z",
  entry: automationMode("entry"),
  exit: automationMode("exit"),
  posture: {
    exec_enabled: false,
    exec_dry_run: true,
    gate_passed: true,
    gate_reason: "",
    entries_stopped: false,
    consecutive_rollbacks: 0,
    guardrail_entry_blocks: [],
    guardrail_last_evaluated_at: null,
    open_positions: 0,
  },
  recent_entries: [],
  recent_exits: [],
  control_log: [],
};

const automationDecisions = () => ({
  count: 0,
  items: [],
});

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
    if (pathname === "/healthz") return json(healthz);
    if (pathname === "/public/status") return json(publicStatus);
    if (pathname === "/public/opportunities") return json(publicOpportunities);
    if (pathname === "/public/correlation") return json(publicCorrelation);
    if (pathname === "/public/journal") {
      const days = Number(new URL(route.request().url()).searchParams.get("days") ?? 14);
      return json(publicJournal(days));
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
    // Operator surfaces (issues #508 to #514). Preflight keeps execution disabled.
    if (pathname === "/execution/preflight") {
      return json({
        checked_at: "2026-10-16T09:05:00Z",
        ready: false,
        decision: "watching",
        mode: { exec_enabled: false, exec_dry_run: true, strategy_profile_id: "baseline-v1" },
        gate: { passed: true, reason: "execution_disabled", lock_id: null, posture: {} },
        runtime: {
          last_updated_at: "2026-10-16T09:05:00Z",
          poll_count_success: 1,
          exchange_last_ok: {},
          screener_ready_candidates: 0,
          correlation_concentration: {
            level: "ok",
            largest_cluster_size: 0,
            ready_count: 0,
            largest_cluster_ratio: 0,
          },
          trust_diagnostics: { confidence_distribution: {}, fallback_risk_counters: {} },
          consecutive_rollbacks: 0,
          entries_stopped: false,
        },
        blockers: [
          { code: "execution_disabled", severity: "watching", source: "gate", message: "off" },
        ],
        candidate: null,
        venues: [],
      });
    }
    if (pathname === "/execution/attempts") return json(executionAttempts);
    if (pathname === "/positions") return json(positions);
    if (pathname === "/positions/pnl/daily") return json(dailyPnl);
    if (pathname === "/risk/guardrails") return json(riskGuardrails);
    if (pathname === "/snapshots/continuity") return json(snapshotContinuity);
    if (pathname === "/migration/parity/artifacts") return json(parityArtifacts);
    if (pathname === "/migration/parity/report") {
      return json({ detail: { code: "parity_window_empty", message: "no artifacts" } }, 404);
    }
    if (pathname === "/backtest/history") return json(backtestHistory);
    if (pathname === "/backtest/survival") return json(backtestSurvival);
    if (pathname === "/backtest/survival/forecast") return json(persistenceForecast);
    if (pathname === "/automation") return json(automationOverview);
    if (pathname === "/automation/entry/decisions") return json(automationDecisions());
    if (pathname === "/automation/exit/decisions") return json(automationDecisions());
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
