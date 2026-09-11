import { BrowserRouter, Routes, Route } from "react-router-dom";
import OpportunitiesPage from "./pages/OpportunitiesPage/OpportunitiesPage";
import ConfigPage from "./pages/ConfigPage/ConfigPage";
import StatusPage from "./pages/StatusPage/StatusPage";
import BacktestPage from "./pages/BacktestPage/BacktestPage";
import Nav from "./components/Nav/Nav";

function App() {
  return (
    <BrowserRouter>
      <Nav />
      <Routes>
        <Route path="/" element={<OpportunitiesPage />} />
        <Route path="/config" element={<ConfigPage />} />
        <Route path="/status" element={<StatusPage />} />
        <Route path="/backtest" element={<BacktestPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
