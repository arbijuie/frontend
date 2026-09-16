import { useMemo, useState, type CSSProperties } from "react";
import type { StatusResponse } from "../../api/types";
import styles from "./DeepPipelineDiagnostics.module.scss";

interface DeepPipelineDiagnosticsProps {
  status: StatusResponse;
}

interface MetricItem {
  key: string;
  label: string;
  count: number;
}

interface SummaryItem {
  key: string;
  label: string;
  count: number;
  kind: "drop" | "reason" | "severity";
}

const DROP_METRICS: Array<{ key: string; label: string }> = [
  { key: "stale", label: "Stale data" },
  { key: "persistence", label: "Persistence gate" },
  { key: "min_volume", label: "Min volume" },
  { key: "min_open_interest", label: "Min open interest" },
  { key: "apr_cap", label: "APR cap" },
  { key: "non_positive_funding_edge", label: "Non-positive funding edge" },
  { key: "basis_gate", label: "Basis gate" },
  { key: "min_score", label: "Min score" },
  { key: "strict_depth", label: "Strict depth" },
  { key: "missing_real_depth", label: "Missing real depth" },
  { key: "missing_real_fee", label: "Missing real fee" },
  { key: "basis_bonus_capped", label: "Basis bonus capped" },
  { key: "adaptive_hold_applied", label: "Adaptive hold applied" },
  { key: "basis_divergence_penalty", label: "Basis divergence penalty" },
  { key: "l2_book_fetch_error_hyperliquid", label: "Hyperliquid L2 fetch errors" },
];

function safeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}

function humanizeReason(reasonCode: string): string {
  return reasonCode.replaceAll("_", " ");
}

function share(value: number, total: number): string {
  if (total <= 0) {
    return "0.0%";
  }
  return `${((value / total) * 100).toFixed(1)}%`;
}

function sortByCountDesc<T extends { count: number; key: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

const DeepPipelineDiagnostics = ({ status }: DeepPipelineDiagnosticsProps) => {
  const [showAllReasons, setShowAllReasons] = useState(false);

  const dropCounts = status.screener_drop_counters;
  const dropMetrics = useMemo<MetricItem[]>(() => {
    return DROP_METRICS.map(({ key, label }) => ({
      key,
      label,
      count: safeNumber((dropCounts as Record<string, unknown> | undefined)?.[key]),
    }));
  }, [dropCounts]);

  const sortedDropMetrics = useMemo(() => sortByCountDesc(dropMetrics), [dropMetrics]);
  const maxDropCount = useMemo(
    () => Math.max(1, ...sortedDropMetrics.map((item) => item.count)),
    [sortedDropMetrics]
  );
  const totalDrops = useMemo(
    () => sortedDropMetrics.reduce((sum, item) => sum + item.count, 0),
    [sortedDropMetrics]
  );

  const reasonMetrics = useMemo<MetricItem[]>(() => {
    const raw = status.screener_reason_code_counts ?? {};
    return sortByCountDesc(
      Object.entries(raw).map(([key, count]) => ({
        key,
        label: humanizeReason(key),
        count: safeNumber(count),
      }))
    );
  }, [status.screener_reason_code_counts]);

  const reasonTotal = useMemo(
    () => reasonMetrics.reduce((sum, item) => sum + item.count, 0),
    [reasonMetrics]
  );
  const visibleReasons = showAllReasons ? reasonMetrics : reasonMetrics.slice(0, 8);

  const severityMetrics = useMemo<MetricItem[]>(() => {
    const severity = status.screener_reason_severity_counts;
    return [
      {
        key: "blocked",
        label: "blocked",
        count: safeNumber(severity?.blocked),
      },
      {
        key: "watching",
        label: "watching",
        count: safeNumber(severity?.watching),
      },
    ];
  }, [status.screener_reason_severity_counts]);

  const severityTotal = useMemo(
    () => severityMetrics.reduce((sum, item) => sum + item.count, 0),
    [severityMetrics]
  );

  const exchangeRows = useMemo(() => {
    const diagnostics = status.exchange_diagnostics ?? {};
    return Object.entries(diagnostics)
      .map(([exchange, metrics]) => {
        const missingDepth = safeNumber(metrics?.missing_real_depth);
        const strictDepth = safeNumber(metrics?.strict_depth);
        const missingFee = safeNumber(metrics?.missing_real_fee);
        const bookFetchError = safeNumber(metrics?.book_fetch_error);
        return {
          exchange,
          missingDepth,
          strictDepth,
          missingFee,
          bookFetchError,
          total: missingDepth + strictDepth + missingFee + bookFetchError,
        };
      })
      .sort((a, b) => b.total - a.total || a.exchange.localeCompare(b.exchange));
  }, [status.exchange_diagnostics]);

  const summaryTop3 = useMemo(() => {
    const summaryItems: SummaryItem[] = [];
    for (const item of sortedDropMetrics) {
      if (item.count > 0) {
        summaryItems.push({
          key: `drop:${item.key}`,
          label: item.label,
          count: item.count,
          kind: "drop",
        });
      }
    }
    for (const item of reasonMetrics) {
      if (item.count > 0) {
        summaryItems.push({
          key: `reason:${item.key}`,
          label: item.label,
          count: item.count,
          kind: "reason",
        });
      }
    }
    for (const item of severityMetrics) {
      if (item.count > 0) {
        summaryItems.push({
          key: `severity:${item.key}`,
          label: `${item.label} reasons`,
          count: item.count,
          kind: "severity",
        });
      }
    }
    return sortByCountDesc(summaryItems).slice(0, 3);
  }, [reasonMetrics, severityMetrics, sortedDropMetrics]);

  const totalSignals = totalDrops + reasonTotal + severityTotal;
  const diagnosticsState =
    totalSignals === 0 ? "empty" : totalSignals < 10 ? "low" : totalSignals > 120 ? "high" : "normal";

  return (
    <section className={styles.panel} aria-label="Deep pipeline diagnostics">
      <div className={styles.stateBar} data-level={diagnosticsState}>
        {diagnosticsState === "empty" && (
          <span>No drop or reason events in the latest cycle. Keep monitoring live updates.</span>
        )}
        {diagnosticsState === "low" && (
          <span>Low-volume cycle: counts are small, so prefer absolute counts over percentages.</span>
        )}
        {diagnosticsState === "normal" && (
          <span>Diagnostics stable: use top blockers and exchange split to triage bottlenecks.</span>
        )}
        {diagnosticsState === "high" && (
          <span>
            High-volume cycle detected. Reason list is compacted to Top 8 by default for scanability.
          </span>
        )}
      </div>

      <div className={styles.grid}>
        <section className={styles.card}>
          <h3 className={styles.title}>Top Blockers</h3>
          {summaryTop3.length === 0 ? (
            <p className={styles.empty}>No dominant blockers in this cycle.</p>
          ) : (
            <ol className={styles.list}>
              {summaryTop3.map((item) => (
                <li key={item.key} className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>{item.label}</span>
                  <span className={styles.summaryMeta}>
                    {item.count} ({item.kind})
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className={styles.card}>
          <h3 className={styles.title}>Reason Severity</h3>
          <ul className={styles.list}>
            {severityMetrics.map((item) => (
              <li key={item.key} className={styles.row}>
                <span className={styles.label}>{item.label}</span>
                <span className={styles.value}>
                  {item.count} ({share(item.count, severityTotal)})
                </span>
              </li>
            ))}
          </ul>
          <p className={styles.legend}>Severity share uses reason count denominator in the current cycle.</p>
        </section>
      </div>

      <section className={styles.card}>
        <h3 className={styles.title}>Drop Heatmap</h3>
        <div className={styles.heatmap}>
          {sortedDropMetrics.map((item) => {
            const intensity = item.count / maxDropCount;
            const style = {
              "--heat-intensity": String(intensity),
              backgroundColor: `rgba(56, 189, 248, ${(0.07 + intensity * 0.33).toFixed(3)})`,
            } as CSSProperties;
            return (
              <div key={item.key} className={styles.heatRow} style={style}>
                <span className={styles.heatLabel}>{item.label}</span>
                <span className={styles.heatValue}>{item.count}</span>
              </div>
            );
          })}
        </div>
        <p className={styles.legend}>
          Heat intensity is relative to the largest drop count in this cycle (not cross-cycle normalized).
        </p>
      </section>

      <section className={styles.card}>
        <div className={styles.titleRow}>
          <h3 className={styles.title}>Reason Code Distribution</h3>
          {reasonMetrics.length > 8 && (
            <button
              type="button"
              className={styles.toggleButton}
              onClick={() => setShowAllReasons((prev) => !prev)}
            >
              {showAllReasons ? "Show top 8" : "Show all"}
            </button>
          )}
        </div>
        {reasonMetrics.length === 0 ? (
          <p className={styles.empty}>No reason-code events recorded.</p>
        ) : (
          <ul className={styles.list}>
            {visibleReasons.map((item) => (
              <li key={item.key} className={styles.row}>
                <span className={styles.label}>{item.label}</span>
                <span className={styles.value}>
                  {item.count} ({share(item.count, reasonTotal)})
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className={styles.legend}>
          Share denominator: total reason events in this cycle ({reasonTotal}).
        </p>
      </section>

      <section className={styles.card}>
        <h3 className={styles.title}>Exchange Split</h3>
        {exchangeRows.length === 0 ? (
          <p className={styles.empty}>No exchange diagnostics are available.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Exchange</th>
                  <th>Missing depth</th>
                  <th>Strict depth</th>
                  <th>Missing fee</th>
                  <th>Book errors</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {exchangeRows.map((row) => (
                  <tr key={row.exchange}>
                    <td>{row.exchange}</td>
                    <td>{row.missingDepth}</td>
                    <td>{row.strictDepth}</td>
                    <td>{row.missingFee}</td>
                    <td>{row.bookFetchError}</td>
                    <td>{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
};

export default DeepPipelineDiagnostics;
