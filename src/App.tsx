import { useEffect, type ReactElement } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import OpportunitiesPage from "./pages/OpportunitiesPage/OpportunitiesPage";
import PositionsPage from "./pages/PositionsPage/PositionsPage";
import ConfigPage from "./pages/ConfigPage/ConfigPage";
import StatusPage from "./pages/StatusPage/StatusPage";
import BacktestPage from "./pages/BacktestPage/BacktestPage";
import ExecutionPreflightPage from "./pages/ExecutionPreflightPage/ExecutionPreflightPage";
import AutomationPage from "./pages/AutomationPage/AutomationPage";
import OperationsPage from "./pages/OperationsPage/OperationsPage";
import DealPage from "./pages/DealPage/DealPage";
import WelcomePage from "./pages/WelcomePage/WelcomePage";
import MorePage from "./pages/MorePage/MorePage";
import NotFoundPage from "./pages/NotFoundPage/NotFoundPage";
import PublicPlaceholderPage from "./pages/PublicPlaceholderPage/PublicPlaceholderPage";
import ProductPage from "./pages/ProductPage/ProductPage";
import StatisticsPage from "./pages/StatisticsPage/StatisticsPage";
import JournalPage from "./pages/JournalPage/JournalPage";
import OnboardingPage from "./pages/OnboardingPage/OnboardingPage";
import HowItWorksPage from "./pages/HowItWorksPage/HowItWorksPage";
import OperatorLayout from "./layouts/OperatorLayout";
import PublicLayout from "./layouts/PublicLayout";
import { PUBLIC_NAV_ITEMS } from "./lib/navigation";

// Public routes with a real page; the rest render the placeholder until they ship.
const PUBLIC_PAGES: Record<string, ReactElement> = {
  "/product": <ProductPage />,
  "/how-it-works": <HowItWorksPage />,
  "/statistics": <StatisticsPage />,
  "/journal": <JournalPage />,
  "/onboarding": <OnboardingPage />,
};

export function AppShell() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        {PUBLIC_NAV_ITEMS.map(({ to, label, description }) => (
          <Route
            key={to}
            path={to}
            element={
              PUBLIC_PAGES[to] ?? <PublicPlaceholderPage title={label} description={description} />
            }
          />
        ))}
      </Route>
      <Route element={<OperatorLayout />}>
        <Route path="/" element={<OpportunitiesPage />} />
        <Route path="/positions" element={<PositionsPage />} />
        <Route path="/status" element={<StatusPage />} />
        <Route path="/config" element={<ConfigPage />} />
        <Route path="/backtest" element={<BacktestPage />} />
        <Route path="/execution/preflight" element={<ExecutionPreflightPage />} />
        <Route path="/automation" element={<AutomationPage />} />
        <Route path="/operations" element={<OperationsPage />} />
        <Route path="/more" element={<MorePage />} />
        <Route path="/deals/:symbol/:long/:short" element={<DealPage />} />
        <Route path="/welcome" element={<WelcomePage />} />
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
