import type { StatusResponse } from "../api/types";
import { healthSummary } from "./healthSummary";

type Route = NonNullable<StatusResponse["vooi_route"]>;

const NOW = Date.parse("2026-10-19T12:00:00Z");
const fresh = new Date(NOW - 10_000).toISOString();
const base = {
  active_exchanges: ["binance", "lighter"],
  exchange_last_ok: { binance: true, lighter: true },
  last_updated_at: fresh,
  execution_entries_stopped: false,
};

function route(overrides: Partial<Route>): Route {
  return {
    enabled: true,
    state: "ready",
    degraded_venues: [],
    message: "",
    recommended_action: "",
    reason_code: null,
    token_configured: true,
    venues: [],
    ...overrides,
  };
}

describe("healthSummary", () => {
  it("is green when every exchange answers and prices are fresh", () => {
    const s = healthSummary(base, NOW);
    expect(s.level).toBe("ok");
    expect(s.details[0]).toBe("All 2 exchanges answer and prices are fresh.");
  });

  it("is yellow when some exchanges do not answer, naming them", () => {
    const s = healthSummary({ ...base, exchange_last_ok: { binance: true, lighter: false } }, NOW);
    expect(s.level).toBe("warning");
    expect(s.details[0]).toContain("1 of 2 exchanges are not answering: Lighter");
  });

  it("is red when no exchange answers", () => {
    const s = healthSummary({ ...base, exchange_last_ok: { binance: false, lighter: null } }, NOW);
    expect(s.level).toBe("danger");
  });

  it("is yellow after 1 minute without new prices and red after 5 minutes", () => {
    expect(
      healthSummary({ ...base, last_updated_at: new Date(NOW - 2 * 60_000).toISOString() }, NOW)
        .level
    ).toBe("warning");
    expect(
      healthSummary({ ...base, last_updated_at: new Date(NOW - 6 * 60_000).toISOString() }, NOW)
        .level
    ).toBe("danger");
  });

  it("is red when the safety stop is on", () => {
    const s = healthSummary({ ...base, stop_trading: { state: "stopped" } as never }, NOW);
    expect(s.level).toBe("danger");
    expect(s.details[0]).toContain("stopped for safety");
  });

  it("is yellow when the order connection is failing, naming the exchanges", () => {
    const s = healthSummary(
      {
        ...base,
        vooi_route: route({ state: "degraded", degraded_venues: ["binance", "lighter"] }),
      },
      NOW
    );
    expect(s.level).toBe("warning");
    expect(s.details[0]).toContain("Deals on Binance, Lighter cannot be opened right now");
  });

  it("is yellow with a general text when no failing exchange is named", () => {
    const s = healthSummary({ ...base, vooi_route: route({ state: "degraded" }) }, NOW);
    expect(s.level).toBe("warning");
    expect(s.details[0]).toContain("Deals on some exchanges cannot be opened right now");
  });

  it("is yellow when the order connection is turned on but not set up", () => {
    const s = healthSummary({ ...base, vooi_route: route({ state: "not_configured" }) }, NOW);
    expect(s.level).toBe("warning");
    expect(s.details[0]).toContain("turned on but not set up");
  });

  it("stays green when the order connection is ready or turned off", () => {
    expect(healthSummary({ ...base, vooi_route: route({ state: "ready" }) }, NOW).level).toBe("ok");
    expect(
      healthSummary({ ...base, vooi_route: route({ enabled: false, state: "disabled" }) }, NOW)
        .level
    ).toBe("ok");
  });

  it("stays green when an older backend sends no order connection state", () => {
    expect(healthSummary({ ...base, vooi_route: undefined }, NOW).level).toBe("ok");
  });

  it("stays red when the safety stop is on, even if the order connection is failing", () => {
    const s = healthSummary(
      {
        ...base,
        stop_trading: { state: "stopped" } as never,
        vooi_route: route({ state: "degraded", degraded_venues: ["binance"] }),
      },
      NOW
    );
    expect(s.level).toBe("danger");
    expect(s.details.some((line) => line.includes("Binance"))).toBe(true);
  });
});
