import styles from "./WsFeedReliabilityList.module.scss";
import type { StatusResponse } from "../../api/types";
import { formatDateTime } from "../../lib/format";

interface WsFeedReliabilityListProps {
  status: StatusResponse;
}

type MarketDataSource = NonNullable<StatusResponse["market_data_sources"]>[string];
type WsFeed = NonNullable<StatusResponse["ws_feed_diagnostics"]>[string];

const SOURCE_STATE_LABELS: Record<string, string> = {
  real_ws: "WS live",
  real_rest: "REST",
  unavailable: "unavailable",
};

const REASON_LABELS: Record<string, string> = {
  ws_healthy: "WS healthy",
  ws_not_configured: "no WS feed configured",
  ws_disconnected: "WS disconnected",
  ws_stale: "WS stale (no fresh updates)",
  ws_reconnect_storm: "WS reconnect storm",
  ws_parser_errors: "WS message errors",
  ws_reconnected: "WS reconnected",
  recovery_hysteresis_pending: "WS recovering (promotion pending)",
  rest_ok: "REST poll ok",
  rest_pending: "REST poll pending",
  rest_failed: "REST poll failed",
  rest_stale: "REST data stale",
};

function formatAgeSeconds(value: number | null | undefined): string {
  if (value == null) {
    return "-";
  }
  return `${value.toFixed(1)}s`;
}

function formatReason(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }
  return REASON_LABELS[value] ?? value;
}

function formatFeedHealth(feed: WsFeed): string {
  if (feed.healthy == null) {
    return "n/a";
  }
  if (feed.healthy) {
    return "healthy";
  }
  // A connected feed is unhealthy only when its last update is older than the stale timeout.
  return feed.connected ? "stale" : "degraded";
}

function formatSourceState(source: MarketDataSource): string {
  const label = SOURCE_STATE_LABELS[source.state] ?? source.state;
  if (source.state === "real_rest" && source.preferred_state === "real_ws") {
    return "REST fallback";
  }
  return label;
}

function formatIngestionMode(source: MarketDataSource | undefined, feed: WsFeed | undefined) {
  if (source) {
    return source.preferred_state === "real_ws" ? "WS-first, REST fallback" : "REST (no WS feed)";
  }
  return feed ? "WS-first, REST fallback" : "-";
}

function stateClassName(source: MarketDataSource | undefined): string {
  if (!source) {
    return styles.stateUnknown;
  }
  if (source.state === "unavailable") {
    return styles.stateDown;
  }
  return source.degraded ? styles.stateDegraded : styles.stateOk;
}

const Row = ({ label, value }: { label: string; value: string | number }) => (
  <div className={styles.row}>
    <span className={styles.label}>{label}</span>
    <span className={styles.value}>{value}</span>
  </div>
);

const WsFeedReliabilityList = ({ status }: WsFeedReliabilityListProps) => {
  // Both maps are optional: older backends omit `market_data_sources` during rollout.
  const sources = status.market_data_sources ?? {};
  const feeds = status.ws_feed_diagnostics ?? {};
  const venues = Array.from(new Set([...Object.keys(sources), ...Object.keys(feeds)])).sort(
    (a, b) => a.localeCompare(b)
  );

  if (venues.length === 0) {
    return <div className={styles.empty}>Market data source telemetry is not available yet.</div>;
  }

  return (
    <>
      <p className={styles.intro}>
        Venues ingest market data WS-first. When a venue&apos;s feed is disconnected, stale or
        unstable, the backend falls back to its REST refresh until the feed recovers.
      </p>
      <div className={styles.card}>
        {venues.map((venue) => {
          const source: MarketDataSource | undefined = sources[venue];
          const feed: WsFeed | undefined = feeds[venue];
          const degraded = source?.degraded === true || source?.state === "unavailable";
          return (
            <section
              key={venue}
              aria-label={`${venue} market data`}
              className={`${styles.feedBlock} ${degraded ? styles.feedBlockDegraded : ""}`}
            >
              <div className={styles.feedHeader}>
                <span className={styles.venue}>{venue}</span>
                <span className={`${styles.stateBadge} ${stateClassName(source)}`}>
                  {source ? formatSourceState(source) : "n/a"}
                </span>
              </div>
              <Row label="Ingestion" value={formatIngestionMode(source, feed)} />
              {source && (
                <>
                  <Row label="Source reason" value={formatReason(source.reason)} />
                  {source.degraded && source.preferred_state === "real_ws" && (
                    <Row label="Fallback reason" value={formatReason(source.ws_reason)} />
                  )}
                  {source.degraded && (
                    <Row label="Degraded for" value={formatAgeSeconds(source.degraded_for_s)} />
                  )}
                  {source.qualified === false && (
                    <Row label="Screener" value="excluded, new entries blocked" />
                  )}
                  <Row label="REST data age" value={formatAgeSeconds(source.rest_age_s)} />
                  <Row label="Source transitions" value={source.transitions_total} />
                  <Row label="Degraded episodes" value={source.degraded_episodes_total} />
                </>
              )}
              {feed && (
                <>
                  <Row
                    label="WS connection"
                    value={feed.connected == null ? "n/a" : feed.connected ? "up" : "down"}
                  />
                  <Row label="WS feed health" value={formatFeedHealth(feed)} />
                  <Row label="Last message age" value={formatAgeSeconds(feed.last_message_age_s)} />
                  <Row label="Reconnect attempt" value={feed.reconnect_attempt} />
                  <Row label="Reconnect total" value={feed.reconnect_total} />
                  <Row
                    label="Reconnects in window"
                    value={`${feed.reconnects_in_window} / ${feed.reconnect_window_s.toFixed(0)}s`}
                  />
                  <Row label="Storm level" value={feed.reconnect_storm_level} />
                  <Row
                    label="Last reconnect delay"
                    value={formatAgeSeconds(feed.last_reconnect_delay_s)}
                  />
                  <Row
                    label="Last reconnect at"
                    value={formatDateTime(feed.last_reconnect_at ?? null)}
                  />
                </>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
};

export default WsFeedReliabilityList;
