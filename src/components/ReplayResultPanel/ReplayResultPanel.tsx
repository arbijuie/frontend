import styles from "./ReplayResultPanel.module.scss";
import type { BacktestMetrics } from "../../api/types";
import { signColor } from "../../lib/format";

interface ReplayResultPanelProps {
  metrics: BacktestMetrics;
  onCreateLock?: () => void;
  creatingLock?: boolean;
  lockCreated?: boolean;
}

const ReplayResultPanel = ({
  metrics,
  onCreateLock,
  creatingLock,
  lockCreated,
}: ReplayResultPanelProps) => {
  return (
    <div className={styles.panel}>
      <div className={styles.grid}>
        <div>
          <div className={styles.metricLabel}>Strategy ID</div>
          <div className={styles.metricValue}>{metrics.strategy_id}</div>
        </div>
        <div>
          <div className={styles.metricLabel}>Total Samples</div>
          <div className={styles.metricValue}>{metrics.total_samples}</div>
        </div>
        <div>
          <div className={styles.metricLabel}>Symbols Covered</div>
          <div className={styles.metricValue}>{metrics.symbols_covered}</div>
        </div>
        <div>
          <div className={styles.metricLabel}>Entries / Exits</div>
          <div className={styles.metricValue}>
            {metrics.entries} / {metrics.exits}
          </div>
        </div>
        <div>
          <div className={styles.metricLabel}>Closed Trades</div>
          <div className={styles.metricValue}>{metrics.closed_trades}</div>
        </div>
        <div>
          <div className={styles.metricLabel}>Win Rate</div>
          <div className={styles.metricValue}>{(metrics.win_rate * 100).toFixed(1)}%</div>
        </div>
        <div>
          <div className={styles.metricLabel}>Total PnL</div>
          <div className={`${styles.metricValue} ${styles[signColor(metrics.total_pnl_bps)]}`}>
            {metrics.total_pnl_bps.toFixed(1)} bps
          </div>
        </div>
        <div>
          <div className={styles.metricLabel}>Median Trade PnL</div>
          <div
            className={`${styles.metricValue} ${styles[signColor(metrics.median_trade_pnl_bps)]}`}
          >
            {metrics.median_trade_pnl_bps.toFixed(1)} bps
          </div>
        </div>
        <div>
          <div className={styles.metricLabel}>Max Drawdown</div>
          <div className={styles.metricValue}>{metrics.max_drawdown_bps.toFixed(1)} bps</div>
        </div>
      </div>

      {metrics.exit_reasons && Object.keys(metrics.exit_reasons).length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Exit Reasons</div>
          {Object.entries(metrics.exit_reasons).map(([reason, count]) => (
            <div key={reason} className={styles.row}>
              <span>{reason}</span>
              <span>{count}</span>
            </div>
          ))}
        </div>
      )}

      {onCreateLock && (
        <button
          className={styles.createLockButton}
          onClick={onCreateLock}
          disabled={creatingLock || lockCreated}
        >
          {creatingLock
            ? "Locking..."
            : lockCreated
              ? "Lock Created ✓"
              : "Create Strategy Lock from this Result"}
        </button>
      )}
    </div>
  );
};

export default ReplayResultPanel;
