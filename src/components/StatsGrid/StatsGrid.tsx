import styles from './StatsGrid.module.scss';
import type { OpportunityItem } from '../../api/types';
import StatCard from '../StatCard/StatCard';

interface StatsGridProps {
  items: OpportunityItem[];
}

const StatsGrid = ({ items }: StatsGridProps) => {
  const ready = items.filter((i) => i.status === 'ready').length;
  const watching = items.filter((i) => i.status === 'watching').length;
  const blocked = items.filter((i) => i.status === 'blocked').length;

  return (
    <div className={styles.grid}>
      <StatCard label="Total tracked" value={items.length} />
      <StatCard
        label="Ready"
        value={ready}
        sub={`${items.length ? ((ready / items.length) * 100).toFixed(1) : 0}%`}
        color="green"
      />
      <StatCard
        label="Watching"
        value={watching}
        sub={`${items.length ? ((watching / items.length) * 100).toFixed(1) : 0}%`}
        color="yellow"
      />
      <StatCard
        label="Blocked"
        value={blocked}
        sub={`${items.length ? ((blocked / items.length) * 100).toFixed(1) : 0}%`}
        color="red"
      />
    </div>
  );
};

export default StatsGrid;