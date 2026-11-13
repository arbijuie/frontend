import styles from "../OperationsPage.module.scss";
import StatCard from "../../../components/StatCard/StatCard";
import FloatingRefreshButton from "../../../components/FloatingRefreshButton/FloatingRefreshButton";
import { useSnapshotContinuity } from "../../../hooks/useOperations";
import { describeApiError } from "../../../lib/api-errors";
import { formatDateTime, formatUptime } from "../../../lib/format";
import { continuityHealth, type ContinuityHealth } from "../../../lib/operations";

const HEALTH_TEXT: Record<ContinuityHealth, string> = {
  healthy: "Capture is continuous: no gap larger than the expected interval.",
  gaps: "Capture has gaps: replay and calibration windows that include them are weaker evidence.",
  write_failures: "Snapshot writes are failing: check disk space and the collector logs.",
  empty: "No snapshots are stored yet. Enable capture and wait for the first screener pass.",
};

const ContinuityPanel = () => {
  const continuity = useSnapshotContinuity();
  const data = continuity.data;
  const health = data ? continuityHealth(data) : null;

  return (
    <>
      {continuity.error && (
        <div className={styles.errorBox} role="alert">
          {describeApiError(continuity.errorObject)}
        </div>
      )}
      {continuity.loading && !data && <div role="status">Loading snapshot continuity...</div>}
      {data && health && (
        <>
          <div className={health === "healthy" ? styles.okNote : styles.dangerNote} role="status">
            {HEALTH_TEXT[health]} Generated {formatDateTime(data.generated_at)}.
          </div>
          <div className={styles.stats}>
            <StatCard label="Rows stored" value={data.rows_total} />
            <StatCard
              label="Symbols / venues"
              value={`${data.symbols_covered} / ${data.exchanges_covered}`}
            />
            <StatCard label="Distinct timestamps" value={data.distinct_timestamps} />
            <StatCard
              label="Gaps"
              value={data.gap_count}
              sub={`largest ${formatUptime(data.largest_gap_s)}`}
              color={data.gap_count > 0 ? "yellow" : "green"}
            />
            <StatCard
              label="Write failures"
              value={data.write_failures}
              color={data.write_failures > 0 ? "red" : "green"}
            />
            <StatCard label="Expected interval" value={formatUptime(data.expected_interval_s)} />
          </div>

          <h2 className={styles.sectionTitle}>Capture window</h2>
          <div
            className={styles.tableWrap}
            role="region"
            aria-label="Capture window table"
            tabIndex={0}
          >
            <table className={styles.table} aria-label="Capture window">
              <tbody>
                <tr>
                  <th scope="row">Window start</th>
                  <td>{formatDateTime(data.window_start_at)}</td>
                </tr>
                <tr>
                  <th scope="row">Window end</th>
                  <td>{formatDateTime(data.window_end_at)}</td>
                </tr>
                <tr>
                  <th scope="row">Oldest retained</th>
                  <td>
                    {formatDateTime(data.oldest_retained_at)} (retention {data.retention_days} days)
                  </td>
                </tr>
                <tr>
                  <th scope="row">Last write</th>
                  <td>
                    {formatDateTime(data.last_write_at)}
                    {data.last_write_error ? (
                      <>
                        {" "}
                        <span className={styles.badgeDanger}>{data.last_write_error}</span>
                      </>
                    ) : null}
                  </td>
                </tr>
                <tr>
                  <th scope="row">Last prune</th>
                  <td>
                    {formatDateTime(data.last_pruned_at)} ({data.last_pruned_rows} rows,{" "}
                    {data.pruned_rows_total} total)
                  </td>
                </tr>
                <tr>
                  <th scope="row">Startup recovery</th>
                  <td>
                    {data.recovery_result}
                    {data.recovery_attempted
                      ? ` (${data.recovered_rows} rows, ${data.recovered_symbols} symbols, ${
                          data.last_recovery_duration_ms != null
                            ? `${Math.round(data.last_recovery_duration_ms)} ms`
                            : "-"
                        })`
                      : ""}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className={styles.hint}>
            A gap is a distance between consecutive capture timestamps above the expected interval.
            The largest gap and its count come from the durable snapshot store; per-gap timestamps
            are in the collector logs (`snapshot_continuity`).
          </p>
        </>
      )}
      <FloatingRefreshButton
        fetching={continuity.fetching}
        onClick={() => void continuity.refetch()}
        label="Refresh continuity"
      />
    </>
  );
};

export default ContinuityPanel;
