import styles from './StatusStatCards.module.scss';
import type { StatusResponse } from '../../api/types';
import StatCard from '../StatCard/StatCard';
import { formatUptime } from '../../lib/format';

interface StatusStatCardsProps {
  status: StatusResponse;
  liveUptimeSeconds?: number;
}

const StatusStatCards = ({ status, liveUptimeSeconds }: StatusStatCardsProps) => {
  const uptimeSeconds = liveUptimeSeconds ?? status.uptime_s;
  const hasPolls = status.poll_count_total > 0;
  const successRate = hasPolls
    ? ((status.poll_count_success / status.poll_count_total) * 100).toFixed(1)
    : null;

  return (
    <div className={styles.grid}>
      <StatCard label="Uptime" value={formatUptime(uptimeSeconds)} />
      <StatCard
        label="Poll Success Rate"
        value={successRate != null ? `${successRate}%` : '—'}
        color={status.poll_count_failed === 0 ? 'green' : 'yellow'}
      />
      <StatCard
        label="Last Poll Duration"
        value={
          status.last_poll_duration_ms != null
            ? `${Math.round(status.last_poll_duration_ms)} ms`
            : '—'
        }
      />
      <StatCard label="Total Polls" value={status.poll_count_total} />
      <StatCard label="Raw Candidates" value={status.screener_raw_candidates} />
      <StatCard label="After Cost" value={status.screener_post_cost_candidates} />
      <StatCard label="Validated" value={status.screener_validated_candidates} />
      <StatCard
        label="Ready"
        value={status.screener_ready_candidates}
        color={status.screener_ready_candidates > 0 ? 'green' : 'yellow'}
      />
      <div className={styles.fullWidth}>
        <StatCard
          label="Failed Polls"
          value={status.poll_count_failed}
          color={status.poll_count_failed > 0 ? 'red' : 'green'}
        />
      </div>
    </div>
  );
};

export default StatusStatCards;
