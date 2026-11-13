import { Link } from "react-router-dom";
import pageStyles from "../../styles/Page.module.scss";
import styles from "./HowItWorksPage.module.scss";
import PageHeader from "../../components/PageHeader/PageHeader";
import { usePageTitle } from "../../hooks/usePageTitle";
import { COST_ITEMS, PIPELINE_STEPS, VERDICTS } from "../../lib/howItWorks";

/** Public explanation of the screener pipeline (issue #515); static, no API calls. */
const HowItWorksPage = () => {
  usePageTitle("How it works");

  return (
    <div className={pageStyles.page}>
      <PageHeader
        title="How it works"
        subtitle="From venue feeds to a ranked, explained list of funding-rate routes."
      />

      <h2 className={pageStyles.sectionTitle}>The pipeline</h2>
      <ol className={styles.steps} aria-label="Screener pipeline">
        {PIPELINE_STEPS.map(({ title, text }, index) => (
          <li key={title} className={styles.step}>
            <span className={styles.stepIndex} aria-hidden="true">
              {index + 1}
            </span>
            <div>
              <h3 className={styles.stepTitle}>{title}</h3>
              <p className={styles.stepText}>{text}</p>
            </div>
          </li>
        ))}
      </ol>

      <h2 className={pageStyles.sectionTitle}>What the verdicts mean</h2>
      <ul className={styles.verdicts} aria-label="Route verdicts">
        {VERDICTS.map(({ key, label, text }) => (
          <li key={key} className={`${styles.verdict} ${styles[key]}`}>
            <h3 className={styles.verdictLabel}>
              <Link
                to={`/?status=${key}`}
                className={styles.verdictLink}
                aria-label={`${label}: show ${key} deals`}
              >
                {label}
              </Link>
            </h3>
            <p className={styles.stepText}>{text}</p>
          </li>
        ))}
      </ul>

      <h2 className={pageStyles.sectionTitle}>What comes off the edge</h2>
      <ul className={styles.costs} aria-label="Costs deducted from the edge">
        {COST_ITEMS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h2 className={pageStyles.sectionTitle}>What it does not do</h2>
      <p className={styles.lead}>
        The screener is read-only by default. It never places orders, moves funds, or needs exchange
        keys to run. Execution exists as a separate, gated operator mode that stays off until replay
        evidence, a signed acceptance record, and explicit switches allow it; the public pages never
        reach those controls.
      </p>
    </div>
  );
};

export default HowItWorksPage;
