import styles from "./HealthLight.module.scss";
import type { HealthSummary } from "../../lib/healthSummary";

const HealthLight = ({ summary }: { summary: HealthSummary }) => (
  <section
    className={`${styles.card} ${styles[summary.level]}`}
    aria-label="System health"
    data-level={summary.level}
  >
    <div className={styles.head}>
      <span className={styles.dot} aria-hidden="true" />
      <h2 className={styles.title}>{summary.title}</h2>
    </div>
    <ul className={styles.list}>
      {summary.details.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  </section>
);

export default HealthLight;
