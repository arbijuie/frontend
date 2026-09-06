import { useState } from "react";
import type { BacktestLockListItem } from "../../api/types";
import { useBacktestLock } from "../../hooks/useBacktest";
import { formatDateTime, signColor } from "../../lib/format";
import styles from "./BacktestLockCard.module.scss";

interface BacktestLockCardProps {
  lock: BacktestLockListItem;
}

const BacktestLockCard = ({ lock }: BacktestLockCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const { data: detail, loading, error } = useBacktestLock(expanded ? lock.lock_id : null);

  return (
    <div className={styles.card}>
      <div className={styles.topRow}>
        <span className={styles.strategyId}>{lock.strategy_id}</span>
        <span
          className={`${styles.badge} ${lock.gate_passed ? styles.passBadge : styles.failBadge}`}
        >
          {lock.gate_passed ? "Gate Passed" : "Gate Failed"}
        </span>
      </div>
      <div className={styles.meta}>
        {lock.lock_id} · {formatDateTime(lock.created_at)}
      </div>
      <div className={styles.metrics}>
        <div>
          <div className={styles.metricLabel}>Total PnL</div>
          <div className={`${styles.metricValue} ${styles[signColor(lock.total_pnl_bps)]}`}>
            {lock.total_pnl_bps.toFixed(1)} bps
          </div>
        </div>
        <div>
          <div className={styles.metricLabel}>Max Drawdown</div>
          <div className={styles.metricValue}>{lock.max_drawdown_bps.toFixed(1)} bps</div>
        </div>
      </div>
      <button className={styles.expandButton} onClick={() => setExpanded(!expanded)}>
        {expanded ? "Hide details" : "More details"}
      </button>
      {expanded && (
        <div className={styles.details}>
          {error && <div className={styles.detailRow}>Error: {error}</div>}
          {loading && <div className={styles.detailRow}>Loading...</div>}
          {detail && (
            <>
              <div className={styles.detailRow}>
                <span>Strategy Profile</span>
                <span>{detail.strategy_profile_id}</span>
              </div>
              <div className={styles.detailRow}>
                <span>Schema Version</span>
                <span>{detail.schema_version}</span>
              </div>
              <div className={styles.detailRow}>
                <span>Min Win Rate</span>
                <span>{(detail.min_win_rate * 100).toFixed(1)}%</span>
              </div>
              <div className={styles.detailRow}>
                <span>Min Total PnL</span>
                <span>{detail.min_total_pnl_bps.toFixed(1)} bps</span>
              </div>
              <div className={styles.detailRow}>
                <span>Samples / Symbols</span>
                <span>
                  {detail.metrics.total_samples} / {detail.metrics.symbols_covered}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default BacktestLockCard;
