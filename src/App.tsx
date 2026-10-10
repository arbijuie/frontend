import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import OpportunitiesPage from "./pages/OpportunitiesPage/OpportunitiesPage";
import ConfigPage from "./pages/ConfigPage/ConfigPage";
import StatusPage from "./pages/StatusPage/StatusPage";
import BacktestPage from "./pages/BacktestPage/BacktestPage";
import ExecutionPreflightPage from "./pages/ExecutionPreflightPage/ExecutionPreflightPage";
import AutomationPage from "./pages/AutomationPage/AutomationPage";
import NotFoundPage from "./pages/NotFoundPage/NotFoundPage";
import PublicPlaceholderPage from "./pages/PublicPlaceholderPage/PublicPlaceholderPage";
import OperatorLayout from "./layouts/OperatorLayout";
import PublicLayout from "./layouts/PublicLayout";
import { PUBLIC_NAV_ITEMS } from "./lib/navigation";

export function AppShell() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        {PUBLIC_NAV_ITEMS.map(({ to, label, description }) => (
          <Route
            key={to}
            path={to}
            element={<PublicPlaceholderPage title={label} description={description} />}
          />
        ))}
      </Route>
      <Route element={<OperatorLayout />}>
        <Route path="/" element={<OpportunitiesPage />} />
        <Route path="/status" element={<StatusPage />} />
        <Route path="/config" element={<ConfigPage />} />
        <Route path="/backtest" element={<BacktestPage />} />
        <Route path="/execution/preflight" element={<ExecutionPreflightPage />} />
        <Route path="/automation" element={<AutomationPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

function App() {
  useEffect(() => {
    window.Telegram?.WebApp?.ready?.();
  }, []);

  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

export default App;
