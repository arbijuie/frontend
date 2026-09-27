import styles from "./TransportIndicator.module.scss";
import type { AuthStatus, TransportState } from "../../hooks/useOpportunitiesSocket";

function severityFromState(state: TransportState): "green" | "yellow" | "red" {
  if (state === "connected") return "green";
  if (state === "polling-fallback") return "red";
  return "yellow";
}

function labelFromState(
  state: TransportState,
  reconnectAttempt: number,
  authStatus: AuthStatus,
  authRetryAttempt: number
): string {
  if (state === "connected") return "live (WS)";
  if (state === "connecting") return "connecting...";
  if (state === "reconnecting") {
    if (authStatus !== "ok") {
      return `reissuing auth ticket (attempt ${authRetryAttempt})...`;
    }
    return `reconnecting transport (attempt ${reconnectAttempt})...`;
  }
  return "polling fallback";
}

function authHint(
  authStatus: AuthStatus,
  authRetryAfterSeconds: number | null,
  authDetail: string | null
): string | null {
  if (authStatus === "rate-limited") {
    const retrySeconds = authRetryAfterSeconds != null ? Math.ceil(authRetryAfterSeconds) : null;
    const safeDefaultHint = authDetail ? ` (${authDetail})` : "";
    if (retrySeconds != null) {
      return `ticket request rate-limited, retry in ~${retrySeconds}s${safeDefaultHint}`;
    }
    return `ticket request rate-limited, retrying shortly${safeDefaultHint}`;
  }

  if (authStatus === "ticket-rejected") {
    return authDetail ?? "ticket rejected, requesting a new ticket";
  }

  if (authStatus === "auth-failed") {
    return authDetail ?? "WS auth failed, using polling fallback";
  }

  return null;
}

interface TransportIndicatorProps {
  state: TransportState;
  reconnectAttempt: number;
  authRetryAttempt: number;
  authStatus: AuthStatus;
  authRetryAfterSeconds: number | null;
  authDetail: string | null;
  onRetry: () => void;
}

const TransportIndicator = ({
  state,
  reconnectAttempt,
  authRetryAttempt,
  authStatus,
  authRetryAfterSeconds,
  authDetail,
  onRetry,
}: TransportIndicatorProps) => {
  const severity = severityFromState(state);
  const label = labelFromState(state, reconnectAttempt, authStatus, authRetryAttempt);
  const detail = authHint(authStatus, authRetryAfterSeconds, authDetail);

  return (
    <div className={styles.container} aria-live="polite">
      <div className={styles.row}>
        <span className={`${styles.dot} ${styles[severity]}`} aria-hidden="true" />
        <span>{label}</span>
        {state === "polling-fallback" && (
          <button className={styles.retryButton} onClick={onRetry} aria-label="Retry live connection">
            Retry
          </button>
        )}
      </div>
      {detail && <div className={styles.detail}>{detail}</div>}
    </div>
  );
};

export default TransportIndicator;
