import { BrowserRouter, Routes, Route } from "react-router-dom";
import OpportunitiesPage from "./pages/OpportunitiesPage/OpportunitiesPage";
import ConfigPage from "./pages/ConfigPage/ConfigPage";
import StatusPage from "./pages/StatusPage/StatusPage";
import BacktestPage from "./pages/BacktestPage/BacktestPage";
import ExecutionPreflightPage from "./pages/ExecutionPreflightPage/ExecutionPreflightPage";
import NotFoundPage from "./pages/NotFoundPage/NotFoundPage";
import Nav from "./components/Nav/Nav";
import RouteErrorBoundary from "./components/RouteErrorBoundary/RouteErrorBoundary";
import OpportunitiesSocketProvider from "./components/OpportunitiesSocketProvider/OpportunitiesSocketProvider";

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
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </RouteErrorBoundary>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <OpportunitiesSocketProvider>
        <AppShell />
      </OpportunitiesSocketProvider>
    </BrowserRouter>
  );
}

export default App;
