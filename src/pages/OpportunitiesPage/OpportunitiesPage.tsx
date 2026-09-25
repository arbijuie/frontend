import styles from "./OpportunitiesPage.module.scss";
import { useRef, useState } from "react";
import { useOpportunities } from "../../hooks/useOpportunities";
import {
  OPPORTUNITY_STRATEGY_LABEL,
  OPPORTUNITY_STRATEGY_TYPES,
  type OpportunityStrategyType,
} from "../../api/opportunities";
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
import { POLL_INTERVAL_MS } from "../../api/config";
import { usePageTitle } from "../../hooks/usePageTitle";
import TransportIndicator from "../../components/TransportIndicator/TransportIndicator";

export default function OpportunitiesPage() {
  usePageTitle("Opportunities");
  const [strategyFilter, setStrategyFilter] = useState<"all" | OpportunityStrategyType>("all");
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
              onChange={(event) =>
                setStrategyFilter(event.target.value as "all" | OpportunityStrategyType)
              }
              aria-label="Filter opportunities by strategy"
            >
              <option value="all">All strategies</option>
              {OPPORTUNITY_STRATEGY_TYPES.map((strategyType) => (
                <option key={strategyType} value={strategyType}>
                  {OPPORTUNITY_STRATEGY_LABEL[strategyType]}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.liveRow}>
            {usesLiveTransport ? (
              <TransportIndicator
                state={transportState}
                reconnectAttempt={reconnectAttempt}
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
            <span className={styles.summaryPill}>raw: {rawCandidates ?? "—"}</span>
            <span className={styles.summaryPill}>post-cost: {postCostCandidates ?? "—"}</span>
          </div>
        </div>
      </div>

      {config && <RuntimeKnobsCard config={config} />}

      {status && <PipelineDiagnosticsHint status={status} />}

      {justChecked && <div className={styles.hint}>Already up to date</div>}

      {error && (
        <div className={styles.errorBox}>
          Error: {error}{" "}
          <button onClick={() => refetch()} aria-label="Retry loading opportunities">
            Retry
          </button>
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
          description="The screener is running but nothing currently meets the configured thresholds."
        />
      )}

      {data && data.opportunities.length > 0 && (
        <>
          <StatsGrid items={data.opportunities} />
          <OpportunitiesList
            items={data.opportunities}
            updatedAt={data.updated_at ?? null}
            now={now}
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
