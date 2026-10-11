import { describe, expect, it } from "vitest";
import { PublicApiError } from "../api/public";
import type { PublicStatusResponse } from "../api/types";
import {
  DEFAULT_RATE_LIMIT_WAIT_S,
  formatDuration,
  healthCheck,
  isBlocked,
  rateLimitRetryAt,
  stepHeadline,
  stepStatus,
  venueCheck,
  type OnboardingCheck,
} from "./onboarding";

const check = (outcome: OnboardingCheck["outcome"], blocking = false): OnboardingCheck => ({
  id: outcome,
  label: outcome,
  outcome,
  summary: `${outcome} summary`,
  blocking,
});

function status(exchanges: PublicStatusResponse["exchanges"]): PublicStatusResponse {
  return {
    started_at: "2026-10-10T09:00:00+00:00",
    uptime_s: 60,
    poll_count_total: 1,
    poll_count_success: 1,
    poll_count_failed: 0,
    active_exchanges: Object.keys(exchanges ?? {}),
    exchanges,
    screener_raw_candidates: 0,
    screener_post_cost_candidates: 0,
    screener_validated_candidates: 0,
    screener_ready_candidates: 0,
  };
}

describe("onboarding checks", () => {
  it("formats durations for uptime", () => {
    expect(formatDuration(42)).toBe("42 s");
    expect(formatDuration(600)).toBe("10 min");
    expect(formatDuration(3 * 3600)).toBe("3 h");
    expect(formatDuration(3 * 3600 + 120)).toBe("3 h 2 min");
    expect(formatDuration(2 * 86_400 + 5 * 3600)).toBe("2 d 5 h");
  });

  it("derives the step status with failures first and blocking only when flagged", () => {
    expect(stepStatus([check("passed"), check("warning")])).toBe("warning");
    expect(stepStatus([check("passed"), check("checking")])).toBe("checking");
    expect(stepStatus([check("failed"), check("checking")])).toBe("failed");
    expect(stepStatus([check("pending")])).toBe("checking");
    expect(stepStatus([check("passed"), check("pending")])).toBe("passed");
    expect(isBlocked([check("failed")])).toBe(false);
    expect(isBlocked([check("failed", true)])).toBe(true);
    expect(stepHeadline([check("warning"), check("failed")])).toBe("failed summary");
    expect(stepHeadline([check("passed")])).toBe("All checks passed.");
  });

  it("computes the retry time only for rate-limited reads", () => {
    expect(rateLimitRetryAt(null, 1000)).toBeNull();
    expect(rateLimitRetryAt(new PublicApiError("/public/status", 401), 1000)).toBeNull();
    expect(rateLimitRetryAt(new PublicApiError("/public/status", 429, 7), 1000)).toBe(8000);
    expect(rateLimitRetryAt(new PublicApiError("/public/status", 429), 1000)).toBe(
      1000 + DEFAULT_RATE_LIMIT_WAIT_S * 1000
    );
  });

  it("treats a 5xx health answer as blocking and an ok=false answer as a warning", () => {
    const failed = healthCheck(
      { data: null, error: new PublicApiError("/healthz", 502) },
      "http://api.test"
    );
    expect(failed).toMatchObject({ outcome: "failed", blocking: true });
    const degraded = healthCheck(
      { data: { ok: false, started_at: null, uptime_s: null }, error: null },
      "http://api.test"
    );
    expect(degraded.outcome).toBe("warning");
  });

  it("classifies venue connectivity", () => {
    const live = { last_poll_ok: true, ws_connected: true, ws_healthy: true };
    const down = { last_poll_ok: false, ws_connected: false, ws_healthy: false };

    expect(venueCheck(null).check.outcome).toBe("pending");
    expect(venueCheck(status({ a: live, b: down })).check).toMatchObject({
      outcome: "warning",
      summary: "1 of 2 venues not delivering data",
    });
    expect(venueCheck(status({ a: down, b: down })).check).toMatchObject({
      outcome: "failed",
      summary: "No venue is delivering market data",
    });
    expect(venueCheck(status({ a: down })).check.blocking).toBeFalsy();
  });
});
