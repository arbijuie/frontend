import styles from '../../pages/OpportunitiesPage/OpportunitiesPage.module.scss';
import { useRef, useState } from 'react';
import { useStatus } from '../../hooks/useStatus';
import StatusStatCards from '../../components/StatusStatCards/StatusStatCards';
import StatusDetailsList from '../../components/StatusDetailsList/StatusDetailsList';
import ExchangeHealthList from '../../components/ExchangeHealthList/ExchangeHealthList';
import FloatingRefreshButton from '../../components/FloatingRefreshButton/FloatingRefreshButton';
import { useNow } from '../../hooks/useNow';
import { getLiveUptimeSeconds } from '../../lib/format';

const StatusPage = () => {
  const { data, error, loading, fetching, refetch, fetchedAt } = useStatus();
  const now = useNow();
  const liveUptimeSeconds = data ? getLiveUptimeSeconds(data.uptime_s, fetchedAt, now) : undefined;

  const [justChecked, setJustChecked] = useState(false);
  const prevUpdatedAt = useRef<string | null>(null);

  const handleRefresh = async () => {
    prevUpdatedAt.current = data?.last_updated_at ?? null;
    const result = await refetch();
    const newUpdatedAt = result.data?.last_updated_at ?? null;
    if (newUpdatedAt && newUpdatedAt === prevUpdatedAt.current) {
      setJustChecked(true);
      setTimeout(() => setJustChecked(false), 2000);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Status</h1>
          <div className={styles.liveRow}>
            <span className={styles.liveDot} />
            live
            {data?.last_updated_at && (
              <span> · updated {new Date(data.last_updated_at).toLocaleTimeString()}</span>
            )}
          </div>
        </div>
      </div>

      {justChecked && <div className={styles.hint}>Already up to date</div>}

      {error && <div className={styles.errorBox}>Error: {error}</div>}
      {loading && !data && <div>Loading status...</div>}

      {data && (
        <>
          <StatusStatCards status={data} liveUptimeSeconds={liveUptimeSeconds} />
          <h2 className={styles.sectionTitle}>Details</h2>
          <StatusDetailsList status={data} />
          <h2 className={styles.sectionTitle}>Exchange Health</h2>
          <ExchangeHealthList exchangeStatus={data.exchange_last_ok} />
        </>
      )}

      <FloatingRefreshButton fetching={fetching} onClick={handleRefresh} />
    </div>
  );
};

export default StatusPage;
