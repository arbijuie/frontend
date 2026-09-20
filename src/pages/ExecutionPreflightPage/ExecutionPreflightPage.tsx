import styles from "../../pages/OpportunitiesPage/OpportunitiesPage.module.scss";
import PageHeader from "../../components/PageHeader/PageHeader";
import EmptyState from "../../components/EmptyState/EmptyState";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useExecutionPreflight } from "../../hooks/useExecutionPreflight";
import { useCorrelation } from "../../hooks/useCorrelation";
import FloatingRefreshButton from "../../components/FloatingRefreshButton/FloatingRefreshButton";

const decisionLabel: Record<"ready" | "watching" | "blocked", string> = {
  ready: "READY",
  watching: "WATCHING",
  blocked: "BLOCKED",
};

const formatScore = (value: number | null | undefined): string => {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : "-";
};

const ExecutionPreflightPage = () => {
  usePageTitle("Execution preflight");
  const {
    data: preflight,
    error: preflightError,
    loading: preflightLoading,
    fetching: preflightFetching,
    refetch: refetchPreflight,
  } = useExecutionPreflight();
  const {
    data: correlation,
    error: correlationError,
    loading: correlationLoading,
    fetching: correlationFetching,
    refetch: refetchCorrelation,
  } = useCorrelation();

  const handleRefresh = async () => {
    await Promise.all([refetchPreflight(), refetchCorrelation()]);
  };

  const concentration = preflight?.runtime?.correlation_concentration;
  const aboveThreshold = correlation?.pairs?.filter((pair) => pair.above_threshold).length ?? 0;
  const blockers = preflight?.blockers ?? [];
  const candidateReasons = preflight?.candidate?.reasons ?? [];
  const candidateLongVenue =
    preflight?.candidate?.legs?.find((leg) => leg.side === "long")?.venue ??
    preflight?.candidate?.long_exchange;
  const candidateShortVenue =
    preflight?.candidate?.legs?.find((leg) => leg.side === "short")?.venue ??
    preflight?.candidate?.short_exchange;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Execution Preflight"
        subtitle="Readiness, preflight checks, and execution state"
      />

      <div className={styles.summaryRow}>
        <span className={styles.summaryPill}>Decision priority: blocked &gt; watching &gt; ready</span>
        {preflight?.checked_at && (
          <span className={styles.summaryPill}>
            checked: {new Date(preflight.checked_at).toLocaleTimeString()}
          </span>
        )}
      </div>

      {preflightError && <div className={styles.errorBox}>Preflight error: {preflightError}</div>}
      {correlationError && <div className={styles.errorBox}>Correlation error: {correlationError}</div>}

      {preflightLoading && !preflight && <div>Loading execution preflight...</div>}

      {!preflightLoading && !preflight && !preflightError && (
        <EmptyState
          title="No preflight data"
          description="Preflight endpoint returned no data yet. Wait for the runtime to warm up."
        />
      )}

      {preflight && (
        <>
          <div className={styles.summaryRow}>
            <span className={styles.summaryPill}>
              final decision: {decisionLabel[preflight.decision]}
            </span>
            <span className={styles.summaryPill}>ready: {String(preflight.ready)}</span>
            <span className={styles.summaryPill}>
              runtime ready candidates: {preflight.runtime.screener_ready_candidates}
            </span>
          </div>

          <h2 className={styles.sectionTitle}>Mode</h2>
          <ul>
            <li>exec_enabled: {String(preflight.mode.exec_enabled)}</li>
            <li>exec_dry_run: {String(preflight.mode.exec_dry_run)}</li>
            <li>strategy_profile_id: {preflight.mode.strategy_profile_id}</li>
          </ul>

          <h2 className={styles.sectionTitle}>Gate</h2>
          <ul>
            <li>passed: {String(preflight.gate.passed)}</li>
            <li>reason: {preflight.gate.reason ?? "-"}</li>
            <li>strategy_id: {preflight.gate.strategy_id ?? "-"}</li>
            <li>lock_id: {preflight.gate.lock_id ?? "-"}</li>
          </ul>

          <h2 className={styles.sectionTitle}>Runtime</h2>
          <ul>
            <li>last_updated_at: {preflight.runtime.last_updated_at ?? "-"}</li>
            <li>poll_count_success: {preflight.runtime.poll_count_success}</li>
            <li>consecutive_rollbacks: {preflight.runtime.consecutive_rollbacks}</li>
            <li>entries_stopped: {String(preflight.runtime.entries_stopped)}</li>
            <li>
              correlation_concentration: {concentration?.level ?? "ok"} (largest cluster{" "}
              {concentration?.largest_cluster_size ?? 0}/{concentration?.ready_count ?? 0}, ratio{" "}
              {(concentration?.largest_cluster_ratio ?? 0).toFixed(2)})
            </li>
          </ul>

          <h2 className={styles.sectionTitle}>Blockers</h2>
          {blockers.length === 0 ? (
            <div>No blockers.</div>
          ) : (
            <ul>
              {blockers.map((item) => (
                <li key={`${item.source}-${item.code}-${item.message}`}>
                  [{item.severity}] {item.source}::{item.code} - {item.message}
                </li>
              ))}
            </ul>
          )}

          <h2 className={styles.sectionTitle}>Candidate</h2>
          {!preflight.candidate ? (
            <div>No candidate selected.</div>
          ) : (
            <ul>
              <li>symbol: {preflight.candidate.symbol}</li>
              <li>route: {candidateLongVenue ?? "-"} / {candidateShortVenue ?? "-"}</li>
              <li>signal_score_bps: {formatScore(preflight.candidate.signal_score_bps)}</li>
              <li>
                execution_adjusted_score_bps: {formatScore(preflight.candidate.execution_adjusted_score_bps)}
              </li>
              <li>combined_score: {formatScore(preflight.candidate.combined_score)}</li>
              <li>status: {preflight.candidate.status}</li>
              <li>
                correlated_ready_count: {preflight.candidate.correlated_ready_count ?? 0}
              </li>
              <li>
                reasons: {candidateReasons.length === 0 ? "none" : candidateReasons.map((reason) => reason.code).join(", ")}
              </li>
            </ul>
          )}

          <h2 className={styles.sectionTitle}>Correlation</h2>
          {correlationLoading && !correlation ? (
            <div>Loading correlation...</div>
          ) : !correlation ? (
            <div>Correlation data unavailable.</div>
          ) : (
            <ul>
              <li>symbols: {(correlation.symbols ?? []).length}</li>
              <li>pairs: {correlation.count}</li>
              <li>pairs above threshold: {aboveThreshold}</li>
              <li>threshold: {correlation.threshold}</li>
              <li>window_hours: {correlation.window_hours}</li>
            </ul>
          )}
        </>
      )}

      <FloatingRefreshButton
        fetching={preflightFetching || correlationFetching}
        onClick={handleRefresh}
        label="Refresh execution readiness"
      />
    </div>
  );
};

export default ExecutionPreflightPage;
