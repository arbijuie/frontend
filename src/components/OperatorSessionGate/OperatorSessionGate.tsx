import { useEffect, useState, type ReactNode } from "react";
import { API_TOKEN } from "../../api/config";
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
  const shouldBootstrapTelegramSession = !API_TOKEN && hasTelegramContext;
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
        if (error instanceof TelegramSessionBootstrapError) {
          if (error.status === 404) {
            setAuthReady(true);
            setAuthError(null);
            return;
          }
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
      <div role="alert">
        <p>{authError}</p>
        {shouldBootstrapTelegramSession ? <button onClick={retryBootstrap}>Retry</button> : null}
      </div>
    );
  }

  if (!authReady) {
    return <div role="status">Authorizing Telegram session...</div>;
  }

  return <>{children}</>;
};

export default OperatorSessionGate;
