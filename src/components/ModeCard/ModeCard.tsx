import { useId } from "react";
import styles from "./ModeCard.module.scss";
import { RISK_LABEL, type ProductMode, type ThresholdFact } from "../../lib/productModes";

interface ModeCardProps {
  mode: ProductMode;
  /** Live thresholds of the mode's preset; omitted on the public product page. */
  thresholds?: ThresholdFact[];
  /** Operator controls; omitted on the public product page. */
  action?: {
    isActive: boolean;
    isApplying: boolean;
    isDisabled: boolean;
    onApply: () => void;
  };
  headingLevel?: 2 | 3;
}

/** One product mode: what it is for, what it trades off, and the preset it applies. */
const ModeCard = ({ mode, thresholds, action, headingLevel = 3 }: ModeCardProps) => {
  const titleId = useId();
  const Heading = headingLevel === 2 ? "h2" : "h3";

  return (
    <article
      className={`${styles.card} ${action?.isActive ? styles.active : ""}`}
      aria-labelledby={titleId}
    >
      <div className={styles.topRow}>
        <Heading id={titleId} className={styles.name}>
          {mode.label}
        </Heading>
        <span className={`${styles.risk} ${styles[mode.risk]}`}>{RISK_LABEL[mode.risk]}</span>
      </div>
      <p className={styles.preset}>
        Runtime preset <code>{mode.preset}</code>
      </p>
      <p className={styles.summary}>{mode.summary}</p>

      <dl className={styles.tradeoffs}>
        <div>
          <dt>Best for</dt>
          <dd>{mode.bestFor}</dd>
        </div>
        <div>
          <dt>You gain</dt>
          <dd>{mode.gains}</dd>
        </div>
        <div>
          <dt>You give up</dt>
          <dd>{mode.costs}</dd>
        </div>
      </dl>

      {thresholds && thresholds.length > 0 && (
        <dl className={styles.thresholds} aria-label={`${mode.label} thresholds`}>
          {thresholds.map(({ label, value }) => (
            <div key={label} className={styles.thresholdRow}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {action &&
        (action.isActive ? (
          <p className={styles.activeNote} role="status">
            Currently active
          </p>
        ) : (
          <button
            type="button"
            className={styles.applyButton}
            onClick={action.onApply}
            disabled={action.isDisabled}
            aria-busy={action.isApplying}
          >
            {action.isApplying ? "Applying..." : `Apply ${mode.label} mode`}
          </button>
        ))}
    </article>
  );
};

export default ModeCard;
