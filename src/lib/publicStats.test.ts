import { describe, expect, it } from "vitest";
import { PublicApiError } from "../api/public";
import type { PublicOpportunityItem, PublicStatusResponse } from "../api/types";
import {
  REASON_LABEL,
  countBy,
  dataFreshness,
  describePublicError,
  formatAge,
  formatVenue,
  reasonLabel,
  strategyLabel,
  topReasons,
  venueRows,
  venueSourceState,
} from "./publicStats";

describe("venueSourceState", () => {
  it("prefers the live stream, then REST fallback, then unavailable", () => {
    expect(venueSourceState({ last_poll_ok: true, ws_connected: true, ws_healthy: true })).toBe(
      "live"
    );
    expect(venueSourceState({ last_poll_ok: true, ws_connected: true, ws_healthy: false })).toBe(
      "rest_fallback"
    );
    expect(venueSourceState({ last_poll_ok: true, ws_healthy: null })).toBe("rest_fallback");
    expect(venueSourceState({ last_poll_ok: false, ws_healthy: false })).toBe("down");
    expect(venueSourceState({})).toBe("unknown");
    expect(venueSourceState(undefined)).toBe("unknown");
  });

  it("lists active and reported venues once, sorted", () => {
    const status = {
      active_exchanges: ["lighter", "hyperliquid"],
      exchanges: { hyperliquid: { ws_healthy: true }, bybit: { last_poll_ok: false } },
    } as unknown as PublicStatusResponse;
    expect(venueRows(status)).toEqual([
      { venue: "bybit", state: "down" },
      { venue: "hyperliquid", state: "live" },
      { venue: "lighter", state: "unknown" },
    ]);
  });
});

describe("dataFreshness", () => {
  const now = Date.parse("2026-10-10T12:00:00Z");

  it("is fresh within the budget and stale after it", () => {
    expect(dataFreshness("2026-10-10T11:59:00Z", now)).toEqual({ state: "fresh", ageSeconds: 60 });
    expect(dataFreshness("2026-10-10T11:50:00Z", now)).toEqual({ state: "stale", ageSeconds: 600 });
  });

  it("is unknown without a parseable timestamp", () => {
    expect(dataFreshness(null, now).state).toBe("unknown");
    expect(dataFreshness("not a date", now).state).toBe("unknown");
  });

  it("formats ages in plain units", () => {
    expect(formatAge(null)).toBe("unknown");
    expect(formatAge(42)).toBe("42s ago");
    expect(formatAge(600)).toBe("10 min ago");
    expect(formatAge(7200)).toBe("2 h ago");
    expect(formatAge(172_800)).toBe("2 d ago");
  });
});

describe("topReasons", () => {
  const item = (reasons: PublicOpportunityItem["reasons"]) =>
    ({ reasons }) as unknown as PublicOpportunityItem;

  it("counts (code, severity) pairs, most frequent first", () => {
    const result = topReasons(
      [
        item([{ code: "stale_data", severity: "blocked" }]),
        item([
          { code: "stale_data", severity: "blocked" },
          { code: "persistence_insufficient", severity: "watching" },
        ]),
        item([]),
      ],
      5
    );
    expect(result).toEqual([
      { code: "stale_data", severity: "blocked", count: 2 },
      { code: "persistence_insufficient", severity: "watching", count: 1 },
    ]);
  });

  it("respects the limit", () => {
    const many = item([
      { code: "stale_data", severity: "blocked" },
      { code: "adl_limit", severity: "blocked" },
      { code: "funding_flips", severity: "watching" },
    ]);
    expect(topReasons([many], 2)).toHaveLength(2);
  });
});

describe("labels", () => {
  it("has a plain-language label for every reason code", () => {
    for (const label of Object.values(REASON_LABEL)) {
      expect(label).not.toMatch(/_/);
    }
    expect(reasonLabel("stale_data")).toBe("Market data is stale");
    expect(reasonLabel("some_new_code")).toBe("some new code");
  });

  it("names strategies and venues", () => {
    expect(strategyLabel("cash_and_carry")).toBe("Cash and carry");
    expect(strategyLabel("new_strategy")).toBe("new strategy");
    expect(formatVenue("dydx")).toBe("dYdX");
    expect(formatVenue("hyperliquid")).toBe("Hyperliquid");
  });

  it("counts values", () => {
    expect(countBy(["a", "b", "a"])).toEqual({ a: 2, b: 1 });
  });
});

describe("describePublicError", () => {
  it.each([
    [null, /cannot be reached/],
    [401, /not open on this deployment/],
    [403, /not open on this deployment/],
    [404, /not available on this server version/],
    [429, /Too many requests/],
    [503, /could not answer/],
  ])("explains status %s", (status, title) => {
    expect(describePublicError(new PublicApiError("/public/status", status)).title).toMatch(title);
  });

  it("includes the retry-after wait for rate limits", () => {
    const { detail } = describePublicError(new PublicApiError("/public/status", 429, 12));
    expect(detail).toContain("Try again in 12 s.");
  });
});
