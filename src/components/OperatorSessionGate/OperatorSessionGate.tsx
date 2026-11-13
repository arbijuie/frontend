import { useEffect, useState, type ReactNode } from "react";
import styles from "./OperatorSessionGate.module.scss";
import {
  bootstrapTelegramSession,
  formatTelegramBootstrapErrorForDisplay,
  hasTelegramWebAppContext,
  TelegramSessionBootstrapError,
} from "../../api/telegram-session";

interface OperatorSessionGateProps {
  children: ReactNode;
}

const OperatorSessionGate = ({ children }: OperatorSessionGateProps) => {
  const hasTelegramContext = hasTelegramWebAppContext();
  // Mini App context must bootstrap a Telegram session before operator API/WS calls.
  const shouldBootstrapTelegramSession = hasTelegramContext;
  const [authReady, setAuthReady] = useState(!shouldBootstrapTelegramSession);
  const [authError, setAuthError] = useState<string | null>(null);
  const [bootstrapAttempt, setBootstrapAttempt] = useState(0);

  useEffect(() => {
    if (!shouldBootstrapTelegramSession) {
      return;
    }

    let cancelled = false;

    void bootstrapTelegramSession()
      .then(() => {
        if (!cancelled) {
          setAuthReady(true);
          setAuthError(null);
        }
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        // Every non-2xx session answer keeps the shell closed. A 404 is a missing or mis-routed
        // `/auth/telegram/session` (old backend, proxy gap, Telegram auth off), not a session:
        // mounting the shell then would only turn into opaque 401s on every operator call.
        if (error instanceof TelegramSessionBootstrapError) {
          setAuthError(formatTelegramBootstrapErrorForDisplay(error));
          return;
        }
        setAuthError("Unable to bootstrap Telegram session.");
      });

    return () => {
      cancelled = true;
    };
  }, [bootstrapAttempt, shouldBootstrapTelegramSession]);

  const retryBootstrap = () => {
    setAuthError(null);
    setBootstrapAttempt((value) => value + 1);
  };

  if (authError) {
    return (
      <div className={`${styles.panel} ${styles.error}`} role="alert">
        <p>{authError}</p>
        {shouldBootstrapTelegramSession ? (
          <button className={styles.retry} onClick={retryBootstrap}>
            Retry
          </button>
        ) : null}
      </div>
    );
  }

  if (!authReady) {
    return (
      <div className={styles.panel} role="status">
        Authorizing Telegram session...
      </div>
    );
  }

  return <>{children}</>;
};

export default OperatorSessionGate;
