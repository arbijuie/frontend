import styles from "./TransportIndicator.module.scss";
import type { TransportState } from "../../hooks/useOpportunitiesSocket";

function severityFromState(state: TransportState): "green" | "yellow" | "red" {
  if (state === "connected") return "green";
  if (state === "polling-fallback") return "red";
  return "yellow";
}

function labelFromState(state: TransportState, reconnectAttempt: number): string {
  if (state === "connected") return "live (WS)";
  if (state === "connecting") return "connecting...";
  if (state === "reconnecting") return `reconnecting (attempt ${reconnectAttempt})...`;
  return "polling fallback";
}

interface TransportIndicatorProps {
  state: TransportState;
  reconnectAttempt: number;
  onRetry: () => void;
}

const TransportIndicator = ({ state, reconnectAttempt, onRetry }: TransportIndicatorProps) => {
  const severity = severityFromState(state);
  const label = labelFromState(state, reconnectAttempt);

  return (
    <div className={styles.row} aria-live="polite">
      <span className={`${styles.dot} ${styles[severity]}`} aria-hidden="true" />
      <span>{label}</span>
      {state === "polling-fallback" && (
        <button className={styles.retryButton} onClick={onRetry} aria-label="Retry live connection">
          Retry
        </button>
      )}
    </div>
  );
};

export default TransportIndicator;
