import styles from './OpportunitiesPage.module.scss';
import { useRef, useState } from 'react';
import { useOpportunities } from '../../hooks/useOpportunities';
import { useStatus } from '../../hooks/useStatus';
import { useConfig } from '../../hooks/useConfig';
import OpportunitiesList from '../../components/OpportunitiesList/OpportunitiesList';
import StatsGrid from '../../components/StatsGrid/StatsGrid';
import OpportunityCardSkeleton from '../../components/OpportunityCardSkeleton/OpportunityCardSkeleton';
import EmptyState from '../../components/EmptyState/EmptyState';
import FloatingRefreshButton from '../../components/FloatingRefreshButton/FloatingRefreshButton';
import RuntimeKnobsCard from '../../components/RuntimeKnobsCard/RuntimeKnobsCard';
import PipelineDiagnosticsHint from '../../components/PipelineDiagnosticsHint/PipelineDiagnosticsHint';
import { useNow } from '../../hooks/useNow';
import { POLL_INTERVAL_MS } from '../../api/config';

export default function OpportunitiesPage() {
  const { data, error, loading, fetching, refetch } = useOpportunities();
  const { data: status } = useStatus();
  const { data: config } = useConfig({
    staleTime: 0,
    refetchInterval: POLL_INTERVAL_MS,
  });
  const [justChecked, setJustChecked] = useState(false);
  const prevUpdatedAt = useRef<string | null>(null);
  const now = useNow();

  const rawCandidates = status?.screener_raw_candidates ?? null;
  const postCostCandidates = status?.screener_post_cost_candidates ?? null;

  const handleRefresh = async () => {
    prevUpdatedAt.current = data?.updated_at ?? null;
    const result = await refetch();
    const newUpdatedAt = result.data?.updated_at ?? null;
    if (newUpdatedAt && newUpdatedAt === prevUpdatedAt.current) {
      setJustChecked(true);
      setTimeout(() => setJustChecked(false), 2000);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Opportunities</h1>
          <div className={styles.liveRow}>
            <span className={styles.liveDot} />
            live
            {data?.updated_at && (
              <span>· updated {new Date(data.updated_at).toLocaleTimeString()}</span>
            )}
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryPill}>count: {data?.count ?? '—'}</span>
            <span className={styles.summaryPill}>ready: {data?.ready_count ?? '—'}</span>
            <span className={styles.summaryPill}>raw: {rawCandidates ?? '—'}</span>
            <span className={styles.summaryPill}>post-cost: {postCostCandidates ?? '—'}</span>
          </div>
        </div>
      </div>

      {config && <RuntimeKnobsCard config={config} />}

      {status && <PipelineDiagnosticsHint status={status} />}

      {justChecked && <div className={styles.hint}>Already up to date</div>}

      {error && (
        <div className={styles.errorBox}>
          Error: {error}{' '}
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
          <OpportunitiesList items={data.opportunities} updatedAt={data.updated_at} now={now} />
        </>
      )}

      <FloatingRefreshButton fetching={fetching} onClick={handleRefresh} />
    </div>
  );
}
