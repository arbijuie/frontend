import styles from './StatusFilterTabs.module.scss';
import type { OpportunityStatus } from '../../api/types';

export type StatusFilter = OpportunityStatus | 'all';

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'ready', label: 'Ready' },
  { key: 'watching', label: 'Watching' },
  { key: 'blocked', label: 'Blocked' },
];

interface Props {
  value: StatusFilter;
  onChange: (v: StatusFilter) => void;
  counts: Record<StatusFilter, number>;
}

const StatusFilterTabs = ({ value, onChange, counts }: Props) => {
  return (
    <div className={styles.tabs}>
      {FILTERS.map((f) => (
        <button
          key={f.key}
          className={`${styles.tab} ${value === f.key ? styles.active : ''}`}
          onClick={() => onChange(f.key)}
        >
          {f.label} ({counts[f.key]})
        </button>
      ))}
    </div>
  );
};

export default StatusFilterTabs;
