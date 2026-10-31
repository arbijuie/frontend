import { useState } from "react";
import styles from "./StatsGrid.module.scss";
import type { OpportunityItem } from "../../api/types";
import type { StatusFilter } from "../../lib/opportunitiesUrlState";

interface StatsGridProps {
  items: OpportunityItem[];
  statusFilter: StatusFilter;
  onStatusFilterChange: (filter: StatusFilter) => void;
}

const TILES: { key: StatusFilter; label: string; word: string }[] = [
  { key: "all", label: "All deals", word: "all" },
  { key: "ready", label: "Ready", word: "ready" },
  { key: "watching", label: "Watching", word: "watching" },
  { key: "blocked", label: "Blocked", word: "blocked" },
];

const StatsGrid = ({ items, statusFilter, onStatusFilterChange }: StatsGridProps) => {
  const [touched, setTouched] = useState(false);
  const total = items.length;
  const countOf = (key: StatusFilter) =>
    key === "all" ? total : items.filter((item) => item.status === key).length;

  return (
    <div className={styles.wrapper}>
      <div role="group" aria-label="Filter deals by status" className={styles.grid}>
        {TILES.map(({ key, label, word }) => {
          const count = countOf(key);
          const selected = statusFilter === key;
          const sub =
            key === "all" ? "Total tracked" : `${total ? ((count / total) * 100).toFixed(1) : 0}%`;
          return (
            <button
              key={key}
              type="button"
              className={`${styles.tile} ${selected ? styles.tileSelected : ""}`}
              aria-pressed={selected}
              aria-label={`Show ${word} deals (${count})`}
              onClick={() => {
                setTouched(true);
                onStatusFilterChange(key);
              }}
            >
              <span className={styles.label}>{label}</span>
              <span className={`${styles.value} ${styles[key]}`}>{count}</span>
              <span className={styles.sub}>{sub}</span>
            </button>
          );
        })}
      </div>
      {!touched && statusFilter === "all" && <p className={styles.hint}>Tap a card to filter</p>}
    </div>
  );
};

export default StatsGrid;
