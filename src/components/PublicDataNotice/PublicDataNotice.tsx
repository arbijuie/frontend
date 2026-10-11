import styles from "./PublicDataNotice.module.scss";
import type { PublicApiError } from "../../api/public";
import { describePublicError } from "../../lib/publicStats";

interface PublicDataNoticeProps {
  /** What failed to load, for the heading ("Statistics", "Journal", ...). */
  subject: string;
  error: PublicApiError;
  onRetry?: () => void;
}

/** Plain-language state for a failed public read; never shows raw error text. */
const PublicDataNotice = ({ subject, error, onRetry }: PublicDataNoticeProps) => {
  const { title, detail } = describePublicError(error);
  return (
    <div className={styles.notice} role="alert">
      <p className={styles.title}>
        {subject}: {title}
      </p>
      <p className={styles.detail}>{detail}</p>
      {onRetry && (
        <button type="button" className={styles.retry} onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
};

export default PublicDataNotice;
