import styles from './StatusBadge.module.scss';
import type { OpportunityStatus } from '../../api/types';

const STATUS_LABELS: Record<OpportunityStatus, string> = {
  ready: 'Ready',
  watching: 'Watching',
  blocked: 'Blocked',
};

const StatusBadge = ({ status }: { status: OpportunityStatus }) => {
  return <span className={`${styles.badge} ${styles[status]}`}>{STATUS_LABELS[status]}</span>;
};

export default StatusBadge;
