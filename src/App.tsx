import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import OpportunitiesPage from "./pages/OpportunitiesPage/OpportunitiesPage";
import ConfigPage from "./pages/ConfigPage/ConfigPage";
import StatusPage from "./pages/StatusPage/StatusPage";
import BacktestPage from "./pages/BacktestPage/BacktestPage";
import ExecutionPreflightPage from "./pages/ExecutionPreflightPage/ExecutionPreflightPage";
import AutomationPage from "./pages/AutomationPage/AutomationPage";
import NotFoundPage from "./pages/NotFoundPage/NotFoundPage";
import Nav from "./components/Nav/Nav";
import RouteErrorBoundary from "./components/RouteErrorBoundary/RouteErrorBoundary";
import OpportunitiesSocketProvider from "./components/OpportunitiesSocketProvider/OpportunitiesSocketProvider";
import { API_TOKEN } from "./api/config";
import {
  bootstrapTelegramSession,
  formatTelegramBootstrapErrorForDisplay,
  hasTelegramWebAppContext,
  TelegramSessionBootstrapError,
} from "./api/telegram-session";

export function AppShell() {
  return (
    <>
      <Nav />
      <RouteErrorBoundary>
        <Routes>
          <Route path="/" element={<OpportunitiesPage />} />
          <Route path="/status" element={<StatusPage />} />
          <Route path="/config" element={<ConfigPage />} />
          <Route path="/backtest" element={<BacktestPage />} />
          <Route path="/execution/preflight" element={<ExecutionPreflightPage />} />
          <Route path="/automation" element={<AutomationPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </RouteErrorBoundary>
    </>
  );
}

function App() {
  const hasTelegramContext = hasTelegramWebAppContext();
  const [authReady, setAuthReady] = useState(Boolean(API_TOKEN));
  const [authError, setAuthError] = useState<string | null>(() => {
    if (API_TOKEN) {
      return null;
    }
    return hasTelegramContext ? null : "Open this app from Telegram to authenticate.";
  });
  const [bootstrapAttempt, setBootstrapAttempt] = useState(0);

  useEffect(() => {
    if (API_TOKEN) {
      return;
    }

    if (!hasTelegramContext) {
      return;
    }

    let cancelled = false;
    window.Telegram?.WebApp?.ready?.();
    window.Telegram?.WebApp?.expand?.();

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
          setAuthError(formatTelegramBootstrapErrorForDisplay(error));
          return;
        }
        setAuthError("Unable to bootstrap Telegram session.");
      });

    return () => {
      cancelled = true;
    };
  }, [bootstrapAttempt, hasTelegramContext]);

  const retryBootstrap = () => {
    setAuthError(null);
    setBootstrapAttempt((value) => value + 1);
  };

  if (authError) {
    return (
      <div role="alert">
        <p>{authError}</p>
        {hasTelegramContext ? <button onClick={retryBootstrap}>Retry</button> : null}
      </div>
    );
  }

  if (!authReady) {
    return <div>Authorizing Telegram session...</div>;
  }

  return (
    <BrowserRouter>
      <OpportunitiesSocketProvider>
        <AppShell />
      </OpportunitiesSocketProvider>
    </BrowserRouter>
  );
}

export default App;
