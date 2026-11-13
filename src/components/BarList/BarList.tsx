import { Link } from "react-router-dom";
import styles from "./BarList.module.scss";

export type BarTone = "accent" | "success" | "warning" | "danger" | "neutral";

export interface BarListItem {
  label: string;
  value: number;
  /** Status tones are reserved for ready / watching / blocked style states. */
  tone?: BarTone;
  /** Optional text after the value, e.g. a share ("38%"). */
  note?: string;
  /** Optional destination; the whole row becomes a link. */
  to?: string;
  /** Says where the link leads, e.g. "Show ready deals". */
  toLabel?: string;
}

interface BarListProps {
  /** Accessible name of the list, e.g. "Screening funnel". */
  label: string;
  items: BarListItem[];
  /** Scale maximum; defaults to the largest value so the longest bar spans the track. */
  max?: number;
  formatValue?: (value: number) => string;
}

const defaultFormat = (value: number) => value.toLocaleString("en-US");

/**
 * Labeled horizontal bars sharing one left baseline. Every row prints its label and value as
 * text, so the bars only reinforce numbers that are already readable (no hover needed).
 */
const BarList = ({ label, items, max, formatValue = defaultFormat }: BarListProps) => {
  const scaleMax = Math.max(max ?? 0, ...items.map((item) => item.value), 0);

  return (
    <ul className={styles.list} aria-label={label}>
      {items.map((item) => {
        const share = scaleMax > 0 ? Math.min(1, Math.max(0, item.value / scaleMax)) : 0;
        const content = (
          <>
            <span className={styles.label}>{item.label}</span>
            <span className={styles.track} aria-hidden="true">
              <span
                className={`${styles.bar} ${styles[item.tone ?? "accent"]}`}
                style={{ width: `${(share * 100).toFixed(1)}%` }}
                data-testid="bar"
              />
            </span>
            <span className={styles.value}>
              {formatValue(item.value)}
              {item.note && <span className={styles.note}> {item.note}</span>}
            </span>
          </>
        );
        return (
          <li key={item.label}>
            {item.to ? (
              <Link
                to={item.to}
                className={`${styles.row} ${styles.rowLink}`}
                aria-label={
                  item.toLabel
                    ? `${item.label}, ${formatValue(item.value)}. ${item.toLabel}`
                    : undefined
                }
              >
                {content}
              </Link>
            ) : (
              <div className={styles.row}>{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
};

export default BarList;
