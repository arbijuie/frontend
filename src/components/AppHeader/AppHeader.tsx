import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowLeftRight } from "lucide-react";
import styles from "./AppHeader.module.scss";
import { APP_NAME } from "../../lib/navigation";

interface AppHeaderProps {
  /** Which surface the header belongs to; sets the brand target. */
  surface: "operator" | "public";
  /** The surface navigation, rendered next to the brand. */
  children: ReactNode;
}

/**
 * Shell header shared by the operator and public layouts (issue #380).
 *
 * The operator brand is plain text so it does not create an extra tab stop.
 * The public brand links to the product overview.
 */
const AppHeader = ({ surface, children }: AppHeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const fallbackPath = surface === "public" ? "/product" : "/";
  const canGoBack = window.history.length > 1 || location.pathname !== fallbackPath;

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    if (location.pathname !== fallbackPath) {
      navigate(fallbackPath, { replace: true });
    }
  };

  const brandContent = (
    <>
      <span className={styles.mark} aria-hidden="true">
        <ArrowLeftRight className={styles.markIcon} />
      </span>
      <span className={styles.name}>{APP_NAME}</span>
    </>
  );

  return (
    <header className={`${styles.header} ${styles[surface]}`}>
      <div className={styles.inner}>
        <button
          type="button"
          className={styles.backButton}
          onClick={handleGoBack}
          disabled={!canGoBack}
          aria-label="Go back"
        >
          <ArrowLeft className={styles.backIcon} aria-hidden="true" />
          <span className={styles.backLabel}>Back</span>
        </button>
        {surface === "public" ? (
          <Link to="/product" className={styles.brand}>
            {brandContent}
          </Link>
        ) : (
          <span className={styles.brand}>{brandContent}</span>
        )}
        {children}
      </div>
    </header>
  );
};

export default AppHeader;
