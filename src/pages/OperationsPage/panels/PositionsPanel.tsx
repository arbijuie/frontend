import { useState } from "react";
import styles from "../OperationsPage.module.scss";
import EmptyState from "../../../components/EmptyState/EmptyState";
import StatCard from "../../../components/StatCard/StatCard";
import FloatingRefreshButton from "../../../components/FloatingRefreshButton/FloatingRefreshButton";
import { useDailyPnl, usePositions } from "../../../hooks/useOperations";
import { describeApiError } from "../../../lib/api-errors";
import { formatDateTime } from "../../../lib/format";
import { formatUsd } from "../../../lib/operations";

const DAY_OPTIONS = [7, 14, 30] as const;

function pnlColor(value: number): "green" | "red" | undefined {
  if (value > 0) return "green";
  if (value < 0) return "red";
  return undefined;
}

const PositionsPanel = () => {
  const positions = usePositions();
  const [days, setDays] = useState<number>(7);
  const pnl = useDailyPnl(days);
  const data = positions.data;
  const accounts = data?.accounts ?? {};
  const openPositions = data?.positions ?? [];
  const pnlDays = pnl.data?.days ?? [];

  return (
    <>
      {positions.error && (
        <div className={styles.errorBox} role="alert">
          {describeApiError(positions.errorObject)}
        </div>
      )}
      {positions.loading && !data && <div role="status">Loading positions...</div>}
      {data && (
        <>
          <div className={styles.stats}>
            <StatCard label="Open pairs" value={data.count} />
            <StatCard label="Notional" value={formatUsd(data.notional_usd)} />
            <StatCard
              label="Unrealized PnL"
              value={formatUsd(data.unrealized_pnl_usd)}
              color={pnlColor(data.unrealized_pnl_usd)}
            />
            <StatCard
              label="Realized PnL"
              value={formatUsd(data.realized_pnl_usd)}
              color={pnlColor(data.realized_pnl_usd)}
            />
            <StatCard label="Funding accrued" value={formatUsd(data.funding_accrued_usd)} />
            <StatCard
              label="Net PnL"
              value={formatUsd(data.net_pnl_usd)}
              color={pnlColor(data.net_pnl_usd)}
              sub={data.updated_at ? `as of ${formatDateTime(data.updated_at)}` : undefined}
            />
          </div>

          <h2 className={styles.sectionTitle}>Venue accounts</h2>
          {Object.keys(accounts).length === 0 ? (
            <p className={styles.hint}>No venue account is configured for margin reads.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table} aria-label="Venue accounts">
                <thead>
                  <tr>
                    <th>Venue</th>
                    <th>Equity</th>
                    <th>Available</th>
                    <th>Free margin</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(accounts).map(([venue, account]) => (
                    <tr key={venue}>
                      <td>{venue}</td>
                      <td>{account.equity ?? "-"}</td>
                      <td>{account.available ?? "-"}</td>
                      <td>
                        {account.free_margin_pct != null
                          ? `${account.free_margin_pct.toFixed(1)}%`
                          : "-"}
                      </td>
                      <td className={styles.wrap}>
                        {account.error ? (
                          <span className={styles.badgeDanger}>{account.error}</span>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h2 className={styles.sectionTitle}>Open positions</h2>
          {openPositions.length === 0 ? (
            <EmptyState title="No open positions" description="Pairs appear here while open." />
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table} aria-label="Open positions">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Pair</th>
                    <th>Status</th>
                    <th>Opened</th>
                    <th>Notional</th>
                    <th>Net funding APR</th>
                    <th>Unrealized</th>
                    <th>Funding</th>
                    <th>Net</th>
                    <th>Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {openPositions.map((position) => (
                    <tr key={position.attempt_id}>
                      <td>{position.symbol}</td>
                      <td>
                        {position.long_exchange}/{position.short_exchange}
                      </td>
                      <td>
                        <span className={styles.badge}>{position.status}</span>
                      </td>
                      <td>{formatDateTime(position.opened_at)}</td>
                      <td>{formatUsd(position.notional_usd)}</td>
                      <td>
                        {position.net_funding_apr != null
                          ? `${position.net_funding_apr.toFixed(2)}%`
                          : "-"}
                      </td>
                      <td>{formatUsd(position.unrealized_pnl_usd)}</td>
                      <td>{formatUsd(position.funding_accrued_usd)}</td>
                      <td>{formatUsd(position.net_pnl_usd)}</td>
                      <td className={styles.wrap}>
                        {(position.health_flags ?? []).length === 0
                          ? "-"
                          : (position.health_flags ?? []).map((flag) => (
                              <span key={flag} className={styles.badgeWarning}>
                                {flag}
                              </span>
                            ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <h2 className={styles.sectionTitle}>Daily PnL</h2>
      <div className={styles.toolbar}>
        <label className={styles.toolbarLabel} htmlFor="positions-pnl-days">
          Window
        </label>
        <select
          id="positions-pnl-days"
          className={styles.select}
          value={days}
          onChange={(event) => setDays(Number(event.target.value))}
        >
          {DAY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option} days
            </option>
          ))}
        </select>
      </div>
      {pnl.error && (
        <div className={styles.errorBox} role="alert">
          {describeApiError(pnl.errorObject)}
        </div>
      )}
      {pnl.loading && !pnl.data && <div role="status">Loading daily PnL...</div>}
      {pnl.data && (
        <>
          <div className={styles.stats}>
            <StatCard
              label={`Realized (${days}d)`}
              value={formatUsd(pnl.data.realized_pnl_usd ?? 0)}
              color={pnlColor(pnl.data.realized_pnl_usd ?? 0)}
            />
            <StatCard
              label={`Funding (${days}d)`}
              value={formatUsd(pnl.data.funding_pnl_usd ?? 0)}
            />
            <StatCard
              label={`Total (${days}d)`}
              value={formatUsd(pnl.data.total_pnl_usd ?? 0)}
              color={pnlColor(pnl.data.total_pnl_usd ?? 0)}
            />
          </div>
          {pnlDays.length === 0 ? (
            <EmptyState title="No ledger days yet" />
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table} aria-label="Daily PnL">
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>Realized</th>
                    <th>Funding</th>
                    <th>Unrealized</th>
                    <th>Unrealized change</th>
                    <th>Total</th>
                    <th>Opened</th>
                    <th>Closed</th>
                  </tr>
                </thead>
                <tbody>
                  {pnlDays.map((day) => (
                    <tr key={day.day}>
                      <td>{day.day}</td>
                      <td>{formatUsd(day.realized_pnl_usd)}</td>
                      <td>{formatUsd(day.funding_pnl_usd)}</td>
                      <td>{formatUsd(day.unrealized_pnl_usd)}</td>
                      <td>{formatUsd(day.unrealized_change_usd)}</td>
                      <td>{formatUsd(day.total_pnl_usd)}</td>
                      <td>{day.positions_open}</td>
                      <td>{day.positions_closed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      <FloatingRefreshButton
        fetching={positions.fetching || pnl.fetching}
        onClick={() => void Promise.all([positions.refetch(), pnl.refetch()])}
        label="Refresh positions"
      />
    </>
  );
};

export default PositionsPanel;
