import styles from './OpportunitiesPage.module.scss';
import { useRef, useState } from 'react';
import { useOpportunities } from '../../hooks/useOpportunities';
import OpportunitiesList from '../../components/OpportunitiesList/OpportunitiesList';
import StatsGrid from '../../components/StatsGrid/StatsGrid';
import OpportunityCardSkeleton from '../../components/OpportunityCardSkeleton/OpportunityCardSkeleton';
import EmptyState from '../../components/EmptyState/EmptyState';
import FloatingRefreshButton from '../../components/FloatingRefreshButton/FloatingRefreshButton';
import { useNow } from '../../hooks/useNow';

export default function OpportunitiesPage() {
  const { data, error, loading, fetching, refetch } = useOpportunities();
  const [justChecked, setJustChecked] = useState(false);
  const prevUpdatedAt = useRef<string | null>(null);
  const now = useNow();

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
        </div>
      </div>

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
