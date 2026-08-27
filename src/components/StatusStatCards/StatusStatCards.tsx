import type { StatusResponse } from '../../api/types';
import StatCard from '../StatCard/StatCard';
import { formatUptime } from '../../lib/format';
import styles from './StatusStatCards.module.scss';

interface StatusStatCardsProps {
  status: StatusResponse;
}

const StatusStatCards = ({ status }: StatusStatCardsProps) => {
  const hasPolls = status.poll_count_total > 0;
  const successRate = hasPolls
    ? ((status.poll_count_success / status.poll_count_total) * 100).toFixed(1)
    : null;

  return (
    <div className={styles.grid}>
      <StatCard label="Uptime" value={formatUptime(status.uptime_s)} />
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
