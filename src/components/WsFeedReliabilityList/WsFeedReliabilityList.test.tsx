import { render, screen, within } from "@testing-library/react";
import WsFeedReliabilityList from "./WsFeedReliabilityList";
import type { StatusResponse } from "../../api/types";

type MarketDataSource = NonNullable<StatusResponse["market_data_sources"]>[string];
type WsFeed = NonNullable<StatusResponse["ws_feed_diagnostics"]>[string];

function makeSource(overrides: Partial<MarketDataSource> = {}): MarketDataSource {
  return {
    state: "real_ws",
    reason: "ws_healthy",
    ws_reason: "ws_healthy",
    rest_reason: "rest_ok",
    preferred_state: "real_ws",
    degraded: false,
    qualified: true,
    since: "2026-01-01T00:00:00Z",
    state_age_s: 120,
    transitions_total: 1,
    degraded_episodes_total: 0,
    degraded_seconds_total: 0,
    degraded_for_s: null,
    rest_age_s: 4.2,
    ws_reconnects_in_window: 0,
    ws_message_errors_in_window: 0,
    last_sampled_at: "2026-01-01T00:02:00Z",
    ...overrides,
  };
}

function makeFeed(overrides: Partial<WsFeed> = {}): WsFeed {
  return {
    connected: true,
    healthy: true,
    reconnect_attempt: 0,
    reconnect_total: 0,
    reconnect_window_s: 300,
    reconnects_in_window: 0,
    reconnect_storm_level: "ok",
    last_message_age_s: 0.4,
    last_reconnect_delay_s: null,
    last_reconnect_at: null,
    ...overrides,
  };
}

function makeStatus(overrides: Partial<StatusResponse> = {}): StatusResponse {
  return {
    uptime_s: 10,
    last_updated_at: "2026-01-01T00:00:10Z",
    exchange_last_ok: { binance: true },
    ...overrides,
  } as StatusResponse;
}

function venueBlock(venue: string): HTMLElement {
  return screen.getByRole("region", { name: `${venue} market data` });
}

describe("WsFeedReliabilityList", () => {
  it("renders a healthy WS-first venue with its source state", () => {
    render(
      <WsFeedReliabilityList
        status={makeStatus({
          market_data_sources: { binance: makeSource() },
          ws_feed_diagnostics: { binance: makeFeed() },
        })}
      />
    );

    const block = within(venueBlock("binance"));
    expect(screen.getByText(/Venues ingest market data WS-first/)).toBeTruthy();
    expect(block.getByText("WS live")).toBeTruthy();
    expect(block.getByText("WS-first, REST fallback")).toBeTruthy();
    expect(block.getByText("WS healthy")).toBeTruthy();
    expect(block.getByText("healthy")).toBeTruthy();
    expect(block.queryByText("Fallback reason")).toBeNull();
  });

  it("shows REST fallback with the WS fallback reason when a feed goes stale", () => {
    render(
      <WsFeedReliabilityList
        status={makeStatus({
          market_data_sources: {
            aster: makeSource({
              state: "real_rest",
              reason: "ws_stale",
              ws_reason: "ws_stale",
              degraded: true,
              degraded_for_s: 42,
              degraded_episodes_total: 2,
            }),
          },
          ws_feed_diagnostics: {
            aster: makeFeed({ connected: true, healthy: false, last_message_age_s: 95 }),
          },
        })}
      />
    );

    const block = within(venueBlock("aster"));
    expect(block.getByText("REST fallback")).toBeTruthy();
    expect(block.getByText("Fallback reason")).toBeTruthy();
    expect(block.getAllByText("WS stale (no fresh updates)")).toHaveLength(2);
    expect(block.getByText("42.0s")).toBeTruthy();
    expect(block.getByText("stale")).toBeTruthy();
    expect(block.getByText("95.0s")).toBeTruthy();
  });

  it("flags an unavailable venue as excluded from the screener", () => {
    render(
      <WsFeedReliabilityList
        status={makeStatus({
          market_data_sources: {
            dydx: makeSource({
              state: "unavailable",
              reason: "rest_failed",
              ws_reason: "ws_disconnected",
              rest_reason: "rest_failed",
              degraded: true,
              qualified: false,
              degraded_for_s: 12.5,
            }),
          },
          ws_feed_diagnostics: { dydx: makeFeed({ connected: false, healthy: false }) },
        })}
      />
    );

    const block = within(venueBlock("dydx"));
    expect(block.getByText("unavailable")).toBeTruthy();
    expect(block.getByText("REST poll failed")).toBeTruthy();
    expect(block.getByText("WS disconnected")).toBeTruthy();
    expect(block.getByText("excluded, new entries blocked")).toBeTruthy();
    expect(block.getByText("down")).toBeTruthy();
    expect(block.getByText("degraded")).toBeTruthy();
  });

  it("labels venues with the WS feed disabled as REST-sourced", () => {
    render(
      <WsFeedReliabilityList
        status={makeStatus({
          market_data_sources: {
            extended: makeSource({
              state: "real_rest",
              reason: "rest_ok",
              ws_reason: "ws_not_configured",
              preferred_state: "real_rest",
            }),
          },
          ws_feed_diagnostics: {},
        })}
      />
    );

    const block = within(venueBlock("extended"));
    expect(block.getByText("REST")).toBeTruthy();
    expect(block.getByText("REST (no WS feed)")).toBeTruthy();
    expect(block.queryByText("WS connection")).toBeNull();
  });

  it("falls back to WS feed telemetry when market_data_sources is absent", () => {
    render(
      <WsFeedReliabilityList
        status={makeStatus({
          market_data_sources: undefined,
          ws_feed_diagnostics: { hyperliquid: makeFeed(), lighter: makeFeed({ healthy: null }) },
        })}
      />
    );

    expect(within(venueBlock("hyperliquid")).getByText("healthy")).toBeTruthy();
    const lighter = within(venueBlock("lighter"));
    expect(lighter.getAllByText("n/a").length).toBeGreaterThan(0);
    expect(lighter.queryByText("Source reason")).toBeNull();
  });

  it("renders an empty state when both maps are missing", () => {
    render(
      <WsFeedReliabilityList
        status={makeStatus({ market_data_sources: undefined, ws_feed_diagnostics: undefined })}
      />
    );

    expect(screen.getByText("Market data source telemetry is not available yet.")).toBeTruthy();
  });
});
