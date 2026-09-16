import styles from "./WsFeedReliabilityList.module.scss";
import type { StatusResponse } from "../../api/types";
import { formatDateTime } from "../../lib/format";

interface WsFeedReliabilityListProps {
  status: StatusResponse;
}

function formatAgeSeconds(value: number | null | undefined): string {
  if (value == null) {
    return "-";
  }
  return `${value.toFixed(1)}s`;
}

function formatHealth(value: boolean | null | undefined): string {
  if (value == null) {
    return "n/a";
  }
  return value ? "healthy" : "degraded";
}

const WsFeedReliabilityList = ({ status }: WsFeedReliabilityListProps) => {
  const items = Object.entries(status.ws_feed_diagnostics ?? {}).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  if (items.length === 0) {
    return <div className={styles.empty}>WS telemetry is not available yet.</div>;
  }

  return (
    <div className={styles.card}>
      {items.map(([exchange, feed]) => (
        <div key={exchange} className={styles.feedBlock}>
          <div className={styles.feedHeader}>{exchange}</div>
          <div className={styles.row}>
            <span className={styles.label}>Connection</span>
            <span className={styles.value}>{feed.connected == null ? "n/a" : feed.connected ? "up" : "down"}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Feed health</span>
            <span className={styles.value}>{formatHealth(feed.healthy)}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Reconnect attempt</span>
            <span className={styles.value}>{feed.reconnect_attempt}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Reconnect total</span>
            <span className={styles.value}>{feed.reconnect_total}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Reconnects in window</span>
            <span className={styles.value}>
              {feed.reconnects_in_window} / {feed.reconnect_window_s.toFixed(0)}s
            </span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Storm level</span>
            <span className={styles.value}>{feed.reconnect_storm_level}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Last reconnect delay</span>
            <span className={styles.value}>{formatAgeSeconds(feed.last_reconnect_delay_s)}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Last message age</span>
            <span className={styles.value}>{formatAgeSeconds(feed.last_message_age_s)}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Last reconnect at</span>
            <span className={styles.value}>{formatDateTime(feed.last_reconnect_at ?? null)}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default WsFeedReliabilityList;
