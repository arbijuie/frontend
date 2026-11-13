import { useEffect } from "react";
import { BrowserRouter, Navigate, Routes, Route, useLocation } from "react-router-dom";
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
import ProductPage from "./pages/ProductPage/ProductPage";
import StatisticsPage from "./pages/StatisticsPage/StatisticsPage";
import JournalPage from "./pages/JournalPage/JournalPage";
import OnboardingPage from "./pages/OnboardingPage/OnboardingPage";
import HowItWorksPage from "./pages/HowItWorksPage/HowItWorksPage";
import OperatorLayout from "./layouts/OperatorLayout";
import HistoryPositionProvider from "./components/HistoryPositionProvider/HistoryPositionProvider";
import TelegramBackButtonBridge from "./components/TelegramBackButtonBridge/TelegramBackButtonBridge";

// Former public addresses keep working for bookmarks and old links.
const LEGACY_REDIRECTS: ReadonlyArray<readonly [string, string]> = [
  ["/product", "/learn/about"],
  ["/how-it-works", "/learn/how-it-works"],
  ["/statistics", "/learn/statistics"],
  ["/journal", "/learn/journal"],
  ["/onboarding", "/learn/onboarding"],
];

function LegacyRedirect({ to }: { to: string }) {
  const { search, hash } = useLocation();
  return <Navigate to={{ pathname: to, search, hash }} replace />;
}

export function AppShell() {
  return (
    <HistoryPositionProvider>
      <TelegramBackButtonBridge />
      <Routes>
        {LEGACY_REDIRECTS.map(([from, to]) => (
          <Route key={from} path={from} element={<LegacyRedirect to={to} />} />
        ))}
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
          <Route path="/learn/how-it-works" element={<HowItWorksPage />} />
          <Route path="/learn/about" element={<ProductPage />} />
          <Route path="/learn/statistics" element={<StatisticsPage />} />
          <Route path="/learn/onboarding" element={<OnboardingPage />} />
          <Route path="/learn/journal" element={<JournalPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </HistoryPositionProvider>
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
