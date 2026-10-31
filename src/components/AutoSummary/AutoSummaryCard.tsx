import styles from "../HealthLight/HealthLight.module.scss";
import type { AutoSummary } from "../../lib/autoSummary";

const AutoSummaryCard = ({ summary }: { summary: AutoSummary }) => (
  <section className={`${styles.card} ${styles[summary.level]}`} aria-label="Auto-trading summary">
    <div className={styles.head}>
      <span className={styles.dot} aria-hidden="true" />
      <h2 className={styles.title}>{summary.title}</h2>
    </div>
    <p className={styles.list}>{summary.text}</p>
  </section>
);

export default AutoSummaryCard;
