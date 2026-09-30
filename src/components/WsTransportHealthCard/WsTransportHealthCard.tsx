import styles from "./WsTransportHealthCard.module.scss";
import StatCard from "../StatCard/StatCard";
import { useOpportunitiesTransport } from "../../hooks/useOpportunitiesTransport";
import { useNow } from "../../hooks/useNow";
import { POLL_INTERVAL_MS } from "../../api/config";
import {
  formatMessageAge,
  operatorHint,
  transportHealthFromState,
  transportStateLabel,
} from "../../lib/transportHealth";

const HEALTH_COLOR = { connected: "green", reconnecting: "yellow", degraded: "red" } as const;

const WsTransportHealthCard = () => {
  const {
    transportState,
    reconnectAttempt,
    authRetryAttempt,
    authStatus,
    authDetail,
    lastMessageAtMs,
    transitions,
    retryNow,
  } = useOpportunitiesTransport();
  const now = useNow();

  const health = transportHealthFromState(transportState);
  const pollSeconds = Math.round(POLL_INTERVAL_MS / 1000);
  const hint = operatorHint(health, pollSeconds);
  const recentTransitions = [...transitions].reverse();

  return (
    <div className={styles.container}>
      <p className={styles.caption}>
        Your browser&apos;s live connection to the backend (not the backend&apos;s exchange feeds).
      </p>

      {hint && (
        <div className={`${styles.banner} ${styles[health]}`} role="status" aria-live="polite">
          <span className={styles.badge}>
            {health === "degraded" ? "DEGRADED" : "RECONNECTING"}
          </span>
          <span>{hint}</span>
          {authStatus !== "ok" && authDetail && <span className={styles.detail}>{authDetail}</span>}
          {health === "degraded" && (
            <button
              className={styles.retryButton}
              onClick={retryNow}
              aria-label="Retry live connection"
            >
              Retry
            </button>
          )}
        </div>
      )}

      <div className={styles.grid}>
        <StatCard label="WS connection" value={health} color={HEALTH_COLOR[health]} />
        <StatCard
          label="Last WS message"
          value={formatMessageAge(lastMessageAtMs, now.getTime())}
        />
        <StatCard
          label="REST fallback polling"
          value={
            health === "connected" ? "standby" : `Opportunities page polls every ${pollSeconds}s`
          }
        />
        <StatCard
          label="Attempts"
          value={`transport ${reconnectAttempt} · auth ${authRetryAttempt}`}
        />
      </div>

      {recentTransitions.length > 0 && (
        <div className={styles.card}>
          <div className={styles.cardTitle}>Recent transitions</div>
          <ol className={styles.list} aria-label="Recent transport transitions">
            {recentTransitions.map((transition) => (
              <li key={`${transition.atMs}-${transition.state}`} className={styles.item}>
                <span>{new Date(transition.atMs).toLocaleTimeString()}</span>
                <span>{transportStateLabel(transition.state)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
};

export default WsTransportHealthCard;
