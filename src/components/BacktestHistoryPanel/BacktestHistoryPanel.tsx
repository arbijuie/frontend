import pageStyles from "../../styles/Page.module.scss";
import styles from "./BacktestHistoryPanel.module.scss";
import EmptyState from "../EmptyState/EmptyState";
import { useBacktestHistory } from "../../hooks/useBacktest";
import { formatDateTime } from "../../lib/format";

/** Per-pair replay history behind the history gate (issue #514, `GET /backtest/history`). */
const BacktestHistoryPanel = () => {
  const { data, error, loading } = useBacktestHistory();

  if (loading && !data) return <div role="status">Loading pair history...</div>;
  if (error) {
    return (
      <div className={pageStyles.errorBox} role="alert">
        Error: {error}
      </div>
    );
  }
  if (!data) return null;
  const items = data.items ?? [];

  return (
    <div>
      <p className={pageStyles.hint}>
        History gate {data.gate_enabled ? "on" : "off"}: a pair needs at least{" "}
        {data.min_closed_trades} closed trades and a win rate of{" "}
        {(data.min_win_rate * 100).toFixed(0)}% over the last {data.lookback_days} days to stay
        eligible. Refreshed {formatDateTime(data.refreshed_at)}.
      </p>
      {items.length === 0 ? (
        <EmptyState
          title="No pair history yet"
          description="Replay history appears once captured snapshots produce closed trades."
        />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table} aria-label="Pair history">
            <thead>
              <tr>
                <th>Pair</th>
                <th>Samples</th>
                <th>Closed</th>
                <th>Win rate</th>
                <th>PnL (bps)</th>
                <th>Window</th>
                <th>Gate</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={`${item.symbol}-${item.long_exchange}-${item.short_exchange}`}>
                  <td>
                    {item.symbol} {item.long_exchange}/{item.short_exchange}
                  </td>
                  <td>{item.samples}</td>
                  <td>
                    {item.closed_trades} ({item.wins} wins)
                  </td>
                  <td>{(item.win_rate * 100).toFixed(1)}%</td>
                  <td>{item.total_pnl_bps.toFixed(2)}</td>
                  <td>
                    {formatDateTime(item.window_start)} to {formatDateTime(item.window_end)}
                  </td>
                  <td>
                    <span
                      className={
                        !item.gate_eligible
                          ? styles.badgeNeutral
                          : item.gate_passed
                            ? styles.badgeSuccess
                            : styles.badgeDanger
                      }
                    >
                      {!item.gate_eligible
                        ? "too few trades"
                        : item.gate_passed
                          ? "passed"
                          : "blocked"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default BacktestHistoryPanel;
