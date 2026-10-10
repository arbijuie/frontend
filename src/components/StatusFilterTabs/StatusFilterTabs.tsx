import styles from "./StatusFilterTabs.module.scss";
import { STATUS_FILTER_OPTIONS, type StatusFilter } from "../../lib/opportunitiesUrlState";

export type { StatusFilter };

interface Props {
  value: StatusFilter;
  onChange: (v: StatusFilter) => void;
  counts: Record<StatusFilter, number>;
}

const StatusFilterTabs = ({ value, onChange, counts }: Props) => {
  return (
    <div className={styles.tabs} role="group" aria-label="Filter opportunities by status">
      {STATUS_FILTER_OPTIONS.map((f) => (
        <button
          key={f.key}
          type="button"
          aria-pressed={value === f.key}
          className={`${styles.tab} ${value === f.key ? styles.active : ""}`}
          onClick={() => onChange(f.key)}
        >
          {f.label} ({counts[f.key]})
        </button>
      ))}
    </div>
  );
};

export default StatusFilterTabs;
