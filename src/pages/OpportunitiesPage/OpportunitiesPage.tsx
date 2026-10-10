import styles from "./OpportunitiesPage.module.scss";
import { useRef } from "react";
import { useOpportunities } from "../../hooks/useOpportunities";
import { useOpportunitiesUrlState } from "../../hooks/useOpportunitiesUrlState";
import { OPPORTUNITY_STRATEGY_LABEL, OPPORTUNITY_STRATEGY_TYPES } from "../../api/opportunities";
import { useStatus } from "../../hooks/useStatus";
import { useConfig } from "../../hooks/useConfig";
import OpportunitiesList from "../../components/OpportunitiesList/OpportunitiesList";
import StatsGrid from "../../components/StatsGrid/StatsGrid";
import OpportunityCardSkeleton from "../../components/OpportunityCardSkeleton/OpportunityCardSkeleton";
import EmptyState from "../../components/EmptyState/EmptyState";
import FloatingRefreshButton from "../../components/FloatingRefreshButton/FloatingRefreshButton";
import RuntimeKnobsCard from "../../components/RuntimeKnobsCard/RuntimeKnobsCard";
import PipelineDiagnosticsHint from "../../components/PipelineDiagnosticsHint/PipelineDiagnosticsHint";
import { useNow } from "../../hooks/useNow";
import { useTransientFlag } from "../../hooks/useTransientFlag";
import { API_TOKEN, POLL_INTERVAL_MS } from "../../api/config";
import { hasTelegramWebAppContext } from "../../api/telegram-session";
import { usePageTitle } from "../../hooks/usePageTitle";
import TransportIndicator from "../../components/TransportIndicator/TransportIndicator";
import type { StrategyFilter } from "../../lib/opportunitiesUrlState";

export default function OpportunitiesPage() {
  usePageTitle("Opportunities");
  const {
    sortKey,
    setSortKey,
    statusFilter,
    setStatusFilter,
    strategyFilter,
    setStrategyFilter,
    search,
    setSearch,
    isDefault,
    resetToDefaults,
  } = useOpportunitiesUrlState();

  const usesLiveTransport = strategyFilter === "all";
  const strategyTypes = strategyFilter === "all" ? undefined : [strategyFilter];
  const {
    data,
    error,
    loading,
    fetching,
    refetch,
    transportState,
    reconnectAttempt,
    authRetryAttempt,
    authStatus,
    authRetryAfterSeconds,
    authDetail,
    retryConnection,
  } = useOpportunities({ strategyTypes });
  const { data: status } = useStatus();
  const { data: config } = useConfig({
    staleTime: 0,
    refetchInterval: POLL_INTERVAL_MS,
  });
  const { flag: justChecked, trigger: showJustChecked } = useTransientFlag();
  const prevUpdatedAt = useRef<string | null>(null);
  const now = useNow();

  const rawCandidates = status?.screener_raw_candidates ?? null;
  const postCostCandidates = status?.screener_post_cost_candidates ?? null;
  const runtimeStrategyTypes = OPPORTUNITY_STRATEGY_TYPES.filter(
    (strategyType) => status?.screener_drop_counters_by_strategy?.[strategyType] !== undefined
  );
  const selectedStrategyInactive =
    strategyFilter !== "all" &&
    runtimeStrategyTypes.length > 0 &&
    !runtimeStrategyTypes.includes(strategyFilter);
  const runtimeStrategiesLabel =
    runtimeStrategyTypes.length > 0
      ? runtimeStrategyTypes.map((strategyType) => OPPORTUNITY_STRATEGY_LABEL[strategyType]).join(", ")
      : "initializing";
  const emptyDescription = selectedStrategyInactive
    ? `Selected strategy ${OPPORTUNITY_STRATEGY_LABEL[strategyFilter]} is not active in runtime. Active strategies: ${runtimeStrategiesLabel}.`
    : "The screener is running but nothing currently meets the configured thresholds.";
  const showTelegramLaunchHint =
    Boolean(error && error.includes("401")) &&
    !(API_TOKEN && API_TOKEN.trim()) &&
    !hasTelegramWebAppContext();

  const handleRefresh = async () => {
    prevUpdatedAt.current = data?.updated_at ?? null;
    const result = await refetch();
    const newUpdatedAt = result.data?.updated_at ?? null;
    if (newUpdatedAt && newUpdatedAt === prevUpdatedAt.current) {
      showJustChecked();
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Opportunities</h1>
          <div className={styles.filterRow}>
            <label htmlFor="opportunities-strategy-filter" className={styles.filterLabel}>
              Strategy
            </label>
            <select
              id="opportunities-strategy-filter"
              className={styles.filterSelect}
              value={strategyFilter}
              onChange={(event) => setStrategyFilter(event.target.value as StrategyFilter)}
              aria-label="Filter opportunities by strategy"
            >
              <option value="all">All strategies</option>
              {OPPORTUNITY_STRATEGY_TYPES.map((strategyType) => (
                <option key={strategyType} value={strategyType}>
                  {OPPORTUNITY_STRATEGY_LABEL[strategyType]}
                </option>
              ))}
            </select>
            {!isDefault && (
              <button
                type="button"
                className={styles.resetButton}
                onClick={resetToDefaults}
                aria-label="Reset filters to defaults"
              >
                Reset filters
              </button>
            )}
          </div>
          <div className={styles.liveRow}>
            {usesLiveTransport ? (
              <TransportIndicator
                state={transportState}
                reconnectAttempt={reconnectAttempt}
                authRetryAttempt={authRetryAttempt}
                authStatus={authStatus}
                authRetryAfterSeconds={authRetryAfterSeconds}
                authDetail={authDetail}
                onRetry={retryConnection}
              />
            ) : (
              <div className={styles.hint}>HTTP polling (strategy filter active)</div>
            )}
            {data?.updated_at && (
              <div className={styles.hint}>
                updated {new Date(data.updated_at).toLocaleTimeString()}
              </div>
            )}
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryPill}>count: {data?.count ?? "—"}</span>
            <span className={styles.summaryPill}>ready: {data?.ready_count ?? "—"}</span>
            <span className={styles.summaryPill}>strategy: {strategyFilter}</span>
            <span className={styles.summaryPill}>runtime strategies: {runtimeStrategiesLabel}</span>
            <span className={styles.summaryPill}>raw: {rawCandidates ?? "—"}</span>
            <span className={styles.summaryPill}>post-cost: {postCostCandidates ?? "—"}</span>
          </div>
          {selectedStrategyInactive && (
            <div className={styles.strategyWarning} role="status">
              Selected strategy is not active in runtime. Switch to an active strategy or restart
              runtime with the desired strategy set.
            </div>
          )}
        </div>
      </div>

      {config && <RuntimeKnobsCard config={config} />}

      {status && <PipelineDiagnosticsHint status={status} />}

      <div className={styles.hint} role="status">
        {justChecked ? "Already up to date" : ""}
      </div>

      {error && (
        <div className={styles.errorBox} role="alert">
          Error: {error}{" "}
          <button onClick={() => refetch()} aria-label="Retry loading opportunities">
            Retry
          </button>
          {showTelegramLaunchHint && (
            <p>
              This operator page requires Telegram session auth. Open it from the bot Mini App.
            </p>
          )}
        </div>
      )}

      {loading && !data && (
        <>
          <OpportunityCardSkeleton />
          <OpportunityCardSkeleton />
          <OpportunityCardSkeleton />
        </>
      )}

      {data && data.opportunities.length === 0 && (
        <EmptyState
          title="No opportunities right now"
          description={emptyDescription}
        />
      )}

      {data && data.opportunities.length > 0 && (
        <>
          <StatsGrid items={data.opportunities} />
          <OpportunitiesList
            items={data.opportunities}
            updatedAt={data.updated_at ?? null}
            now={now}
            sortKey={sortKey}
            onSortKeyChange={setSortKey}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            search={search}
            onSearchChange={setSearch}
          />
        </>
      )}

      <FloatingRefreshButton
        fetching={fetching}
        onClick={handleRefresh}
        label="Refresh opportunities"
      />
    </div>
  );
}
