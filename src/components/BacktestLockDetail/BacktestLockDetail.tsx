import styles from "./BacktestLockDetail.module.scss";
import { useBacktestLock } from "../../hooks/useBacktest";
import EmptyState from "../EmptyState/EmptyState";
import { formatDateTime, signColor } from "../../lib/format";
import { ShieldCheck, BarChart3 } from "lucide-react";

interface BacktestLockDetailProps {
  lockId: string | null;
}

const BacktestLockDetail = ({ lockId }: BacktestLockDetailProps) => {
  const { data, error, loading } = useBacktestLock(lockId);

  if (!lockId) {
    return (
      <EmptyState
        title="No lock selected"
        description="Pick a lock from the Locks List tab to see its details here."
      />
    );
  }

  if (loading) return <div>Loading lock details...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!data) return null;

  return (
    <div className={styles.panel}>
      <div className={styles.topRow}>
        <h2 className={styles.strategyId}>{data.strategy_id}</h2>
        <span
          className={`${styles.badge} ${data.gate_passed ? styles.passBadge : styles.failBadge}`}
        >
          {data.gate_passed ? "Gate Passed" : "Gate Failed"}
        </span>
      </div>
      <div className={styles.meta}>
        {data.lock_id} · {formatDateTime(data.created_at)}
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionLabel}>
          <ShieldCheck size={14} />
          Gate Thresholds
        </h3>
        <div className={styles.row}>
          <span>Strategy Profile</span>
          <span>{data.strategy_profile_id}</span>
        </div>
        <div className={styles.row}>
          <span>Schema Version</span>
          <span>{data.schema_version}</span>
        </div>
        <div className={styles.row}>
          <span>Min Win Rate</span>
          <span>{(data.min_win_rate * 100).toFixed(1)}%</span>
        </div>
        <div className={styles.row}>
          <span>Min Total PnL</span>
          <span>{data.min_total_pnl_bps.toFixed(1)} bps</span>
        </div>
        <div className={styles.row}>
          <span>Max Drawdown Limit</span>
          <span>{data.max_drawdown_bps.toFixed(1)} bps</span>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionLabel}>
          <BarChart3 size={14} />
          Achieved Metrics
        </h3>
        <div className={styles.row}>
          <span>Samples / Symbols</span>
          <span>
            {data.metrics.total_samples} / {data.metrics.symbols_covered}
          </span>
        </div>
        <div className={styles.row}>
          <span>Entries / Exits</span>
          <span>
            {data.metrics.entries} / {data.metrics.exits}
          </span>
        </div>
        <div className={styles.row}>
          <span>Closed Trades</span>
          <span>{data.metrics.closed_trades}</span>
        </div>
        <div className={styles.row}>
          <span>Win Rate</span>
          <span>{(data.metrics.win_rate * 100).toFixed(1)}%</span>
        </div>
        <div className={styles.row}>
          <span>Total PnL</span>
          <span className={styles[signColor(data.metrics.total_pnl_bps)]}>
            {data.metrics.total_pnl_bps.toFixed(1)} bps
          </span>
        </div>
        <div className={styles.row}>
          <span>Median Trade PnL</span>
          <span className={styles[signColor(data.metrics.median_trade_pnl_bps)]}>
            {data.metrics.median_trade_pnl_bps.toFixed(1)} bps
          </span>
        </div>
        <div className={styles.row}>
          <span>Max Drawdown (achieved)</span>
          <span>{data.metrics.max_drawdown_bps.toFixed(1)} bps</span>
        </div>
      </div>
    </div>
  );
};

export default BacktestLockDetail;
