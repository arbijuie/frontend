import styles from "./ReplayResultPanel.module.scss";
import type { BacktestMetrics, BacktestReplayRequest } from "../../api/types";
import { signColor } from "../../lib/format";

interface ReplayResultPanelProps {
  metrics: BacktestMetrics;
  usedRequest?: BacktestReplayRequest | null;
  onCreateLock?: () => void;
  creatingLock?: boolean;
  lockCreated?: boolean;
}

const ReplayResultPanel = ({
  metrics,
  usedRequest,
  onCreateLock,
  creatingLock,
  lockCreated,
}: ReplayResultPanelProps) => {
  const entriesByStrategy = Object.entries(metrics.entries_by_strategy_type ?? {});
  const exitsByStrategy = Object.entries(metrics.exits_by_strategy_type ?? {});
  const lockButtonBusy = Boolean(creatingLock || lockCreated);

  return (
    <section className={styles.panel} aria-label="Replay result">
      {usedRequest && (
        <div className={styles.usedParams}>
          Symbols: {usedRequest.symbols?.length ? usedRequest.symbols.join(", ") : "All"}
          {usedRequest.start && ` · from ${new Date(usedRequest.start).toLocaleDateString()}`}
          {usedRequest.end && ` · to ${new Date(usedRequest.end).toLocaleDateString()}`}
        </div>
      )}
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
        {metrics.wins != null && (
          <div>
            <div className={styles.metricLabel}>Wins</div>
            <div className={styles.metricValue}>{metrics.wins}</div>
          </div>
        )}
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

      <div className={styles.section}>
        <div className={styles.sectionLabel}>PnL Diagnostics</div>
        <div className={styles.row}>
          <span>Funding Carry</span>
          <span className={styles[signColor(metrics.funding_carry_pnl_bps)]}>
            {metrics.funding_carry_pnl_bps.toFixed(1)} bps
          </span>
        </div>
        <div className={styles.row}>
          <span>Basis Carry</span>
          <span className={styles[signColor(metrics.basis_carry_pnl_bps)]}>
            {metrics.basis_carry_pnl_bps.toFixed(1)} bps
          </span>
        </div>
        <div className={styles.row}>
          <span>Entry Costs</span>
          <span className={styles.negative}>-{metrics.entry_cost_bps.toFixed(1)} bps</span>
        </div>
      </div>

      {(entriesByStrategy.length > 0 || exitsByStrategy.length > 0) && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Strategy Type Breakdown</div>
          {entriesByStrategy.map(([strategyType, count]) => (
            <div key={`entries-${strategyType}`} className={styles.row}>
              <span>{strategyType} entries</span>
              <span>{count}</span>
            </div>
          ))}
          {exitsByStrategy.map(([strategyType, count]) => (
            <div key={`exits-${strategyType}`} className={styles.row}>
              <span>{strategyType} exits</span>
              <span>{count}</span>
            </div>
          ))}
        </div>
      )}

      {onCreateLock && (
        <button
          className={styles.createLockButton}
          onClick={() => {
            if (!lockButtonBusy) onCreateLock();
          }}
          aria-disabled={lockButtonBusy}
        >
          {creatingLock
            ? "Locking..."
            : lockCreated
              ? "Lock Created ✓"
              : "Create Strategy Lock from this Result"}
        </button>
      )}
    </section>
  );
};

export default ReplayResultPanel;
