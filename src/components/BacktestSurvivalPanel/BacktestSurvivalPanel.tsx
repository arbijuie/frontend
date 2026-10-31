import { useState } from "react";
import pageStyles from "../../styles/Page.module.scss";
import styles from "../BacktestHistoryPanel/BacktestHistoryPanel.module.scss";
import EmptyState from "../EmptyState/EmptyState";
import StatCard from "../StatCard/StatCard";
import { useBacktestSurvival, usePersistenceForecast } from "../../hooks/useBacktest";
import { formatDateTime } from "../../lib/format";
import { formatProbability, formatSeconds } from "../../lib/operations";

const LOOKBACK_OPTIONS = [
  { value: 0, label: "runtime default" },
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
] as const;

/**
 * READY-episode survival analysis and the per-route persistence forecast (issue #514,
 * `GET /backtest/survival` and `GET /backtest/survival/forecast`).
 */
const BacktestSurvivalPanel = () => {
  const [lookback, setLookback] = useState<number>(0);
  const survival = useBacktestSurvival(lookback || null);
  const forecast = usePersistenceForecast();
  const groups = survival.data?.groups ?? {};
  const endReasons = survival.data?.end_reasons ?? {};
  const forecastItems = forecast.data?.items ?? [];

  return (
    <div>
      <div className={styles.assumptions} role="note">
        Survival counts how long a route stays READY (an episode) before it drops out (an event).
        Episodes still READY at the window end are censored, not failures. Probabilities are
        empirical from captured snapshots, so a route group with few episodes is weak evidence.
      </div>

      <div className={styles.controls}>
        <label className={styles.label} htmlFor="survival-lookback">
          Lookback
        </label>
        <select
          id="survival-lookback"
          className={styles.select}
          value={lookback}
          onChange={(event) => setLookback(Number(event.target.value))}
        >
          {LOOKBACK_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <h2 className={pageStyles.sectionTitle}>Survival by group</h2>
      {survival.error && (
        <div className={pageStyles.errorBox} role="alert">
          Survival error: {survival.error}
        </div>
      )}
      {survival.loading && !survival.data && <div role="status">Loading survival...</div>}
      {survival.data && (
        <>
          <div className={styles.stats}>
            <StatCard label="Episodes" value={survival.data.episodes_total} />
            <StatCard label="Ended" value={survival.data.events_total} />
            <StatCard label="Censored" value={survival.data.censored_total} />
            <StatCard
              label="Window"
              value={`${survival.data.lookback_days} d`}
              sub={`${formatDateTime(survival.data.window_start)} to ${formatDateTime(survival.data.window_end)}`}
            />
          </div>
          {Object.keys(groups).length === 0 ? (
            <EmptyState
              title="No READY episodes in the window"
              description="Survival needs captured snapshots with routes that reached READY."
            />
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table} aria-label="Survival groups">
                <thead>
                  <tr>
                    <th>Group</th>
                    <th>Episodes</th>
                    <th>Ended / censored</th>
                    <th>Median READY time</th>
                    <th>Mean (restricted)</th>
                    <th>Longest observed</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(groups).map((group) => (
                    <tr key={group.group}>
                      <td>{group.group}</td>
                      <td>{group.episodes}</td>
                      <td>
                        {group.events} / {group.censored}
                      </td>
                      <td>{formatSeconds(group.median_s)}</td>
                      <td>
                        {formatSeconds(group.restricted_mean_s)} (to{" "}
                        {formatSeconds(group.restricted_horizon_s)})
                      </td>
                      <td>{formatSeconds(group.max_observed_s)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {Object.keys(endReasons).length > 0 && (
            <p className={pageStyles.hint}>
              Episode end reasons:{" "}
              {Object.entries(endReasons)
                .map(([reason, count]) => `${reason} ${count}`)
                .join(", ")}
              .
            </p>
          )}
        </>
      )}

      <h2 className={pageStyles.sectionTitle}>Persistence forecast for current READY routes</h2>
      {forecast.error && (
        <div className={pageStyles.errorBox} role="alert">
          Forecast error: {forecast.error}
        </div>
      )}
      {forecast.loading && !forecast.data && <div role="status">Loading forecast...</div>}
      {forecast.data && forecastItems.length === 0 && (
        <EmptyState
          title="No READY route to forecast"
          description="The forecast lists routes that are READY now with their survival outlook."
        />
      )}
      {forecast.data && forecastItems.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table} aria-label="Persistence forecast">
            <thead>
              <tr>
                <th>Route</th>
                <th>Score (bps)</th>
                <th>READY for</th>
                <th>Group (episodes)</th>
                <th>Survival at this age</th>
                <th>Median remaining</th>
                <th>Survive next</th>
              </tr>
            </thead>
            <tbody>
              {forecastItems.map((item) => (
                <tr key={`${item.symbol}-${item.long_exchange}-${item.short_exchange}`}>
                  <td>
                    {item.symbol} {item.long_exchange}/{item.short_exchange}
                  </td>
                  <td>{item.score_bps.toFixed(2)}</td>
                  <td>{formatSeconds(item.age_s)}</td>
                  <td>
                    {item.group ?? "-"} ({item.episodes})
                  </td>
                  <td>{formatProbability(item.survival_at_age)}</td>
                  <td>{formatSeconds(item.median_remaining_s)}</td>
                  <td>
                    {Object.entries(item.survive_probability ?? {})
                      .map(
                        ([horizon, probability]) => `${horizon}: ${formatProbability(probability)}`
                      )
                      .join(", ") || "-"}
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

export default BacktestSurvivalPanel;
