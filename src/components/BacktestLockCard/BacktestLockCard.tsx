import type { BacktestLockListItem } from "../../api/types";
import { formatDateTime, signColor } from "../../lib/format";
import styles from "./BacktestLockCard.module.scss";

interface BacktestLockCardProps {
  lock: BacktestLockListItem;
  onSelect: (lockId: string) => void;
}

const BacktestLockCard = ({ lock, onSelect }: BacktestLockCardProps) => {
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
          <div className={styles.metricLabel}>Max Drawdown (achieved)</div>
          <div className={styles.metricValue}>{lock.max_drawdown_bps.toFixed(1)} bps</div>
        </div>
      </div>
      <button className={styles.viewButton} onClick={() => onSelect(lock.lock_id)}>
        View details
      </button>
    </div>
  );
};

export default BacktestLockCard;
