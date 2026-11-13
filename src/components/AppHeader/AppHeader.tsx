import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowLeftRight, ArrowRight } from "lucide-react";
import styles from "./AppHeader.module.scss";
import { APP_NAME, OPERATOR_HOME_PATH } from "../../lib/navigation";
import { useHistoryPosition } from "../../hooks/useHistoryPosition";

interface AppHeaderProps {
  /** The navigation, rendered next to the brand. */
  children: ReactNode;
}

type LocationReturnState = { from?: string };

/**
 * Shell header (issue #380).
 *
 * Back never uses `history.length` (unreliable in Telegram WebViews and can leave
 * the Mini App). Back walks the in-app history (pages and filter changes); with no earlier
 * entry it honors `location.state.from` or falls back to Deals, and it is unavailable on
 * Deals itself. Unavailable buttons use `aria-disabled` so they stay reachable with the
 * keyboard.
 */
const AppHeader = ({ children }: AppHeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { index, canGoForward } = useHistoryPosition();
  const isRoot = location.pathname === OPERATOR_HOME_PATH;
  const returnTo = (location.state as LocationReturnState | null)?.from;
  const canGoBack = !isRoot || index > 0;

  const handleGoBack = () => {
    if (!canGoBack) {
      return;
    }
    if (index > 0) {
      navigate(-1);
      return;
    }
    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      navigate(returnTo, { replace: true });
      return;
    }
    navigate(OPERATOR_HOME_PATH, { replace: true });
  };

  const handleGoForward = () => {
    if (canGoForward) {
      navigate(1);
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <button
          type="button"
          className={styles.historyButton}
          onClick={handleGoBack}
          aria-disabled={!canGoBack || undefined}
          aria-label="Go back"
          title="Back"
        >
          <ArrowLeft className={styles.historyIcon} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={styles.historyButton}
          onClick={handleGoForward}
          aria-disabled={!canGoForward || undefined}
          aria-label="Go forward"
          title="Forward"
        >
          <ArrowRight className={styles.historyIcon} aria-hidden="true" />
        </button>
        <Link to={OPERATOR_HOME_PATH} className={styles.brand} aria-label={`${APP_NAME} home`}>
          <span className={styles.mark} aria-hidden="true">
            <ArrowLeftRight className={styles.markIcon} />
          </span>
          <span className={styles.name}>{APP_NAME}</span>
        </Link>
        {children}
      </div>
    </header>
  );
};

export default AppHeader;
