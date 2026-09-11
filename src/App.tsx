import { BrowserRouter, Routes, Route } from "react-router-dom";
import OpportunitiesPage from "./pages/OpportunitiesPage/OpportunitiesPage";
import ConfigPage from "./pages/ConfigPage/ConfigPage";
import StatusPage from "./pages/StatusPage/StatusPage";
import BacktestPage from "./pages/BacktestPage/BacktestPage";
import ExecutionPage from "./pages/ExecutionPage/ExecutionPage";
import NotFoundPage from "./pages/NotFoundPage/NotFoundPage";
import Nav from "./components/Nav/Nav";
import RouteErrorBoundary from "./components/RouteErrorBoundary/RouteErrorBoundary";

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
          <Route path="/execution" element={<ExecutionPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </RouteErrorBoundary>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

export default App;
