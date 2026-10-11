import { useId } from "react";
import styles from "./OnboardingPage.module.scss";
import { useNow } from "../../hooks/useNow";

interface RecheckButtonProps {
  /** Epoch ms until which a rate-limited channel must not be asked again, or null. */
  retryAt: number | null;
  fetching: boolean;
  onRecheck: () => void;
}

const label = (fetching: boolean) => (fetching ? "Checking…" : "Run checks again");

// `aria-disabled` instead of `disabled` keeps keyboard focus on the button while it waits.
const RateLimitedRecheck = ({
  retryAt,
  fetching,
  onRecheck,
}: RecheckButtonProps & {
  retryAt: number;
}) => {
  const now = useNow(1000);
  const hintId = useId();
  const remaining = Math.max(0, Math.ceil((retryAt - now.getTime()) / 1000));
  const waiting = remaining > 0;
  return (
    <>
      <button
        type="button"
        className={styles.secondaryButton}
        aria-disabled={waiting || undefined}
        aria-describedby={hintId}
        onClick={() => {
          if (!waiting) onRecheck();
        }}
      >
        {label(fetching)}
      </button>
      <span id={hintId} className={styles.countdown}>
        {waiting ? `Rate-limited: available in ${remaining} s` : "The wait is over; try again now."}
      </span>
    </>
  );
};

/** "Run checks again"; while a 429 wait runs, it stays locked and counts down. */
const RecheckButton = ({ retryAt, fetching, onRecheck }: RecheckButtonProps) => {
  if (retryAt !== null) {
    return <RateLimitedRecheck retryAt={retryAt} fetching={fetching} onRecheck={onRecheck} />;
  }
  return (
    <button type="button" className={styles.secondaryButton} onClick={onRecheck}>
      {label(fetching)}
    </button>
  );
};

export default RecheckButton;
