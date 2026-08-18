import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import OpportunitiesPage from './pages/OpportunitiesPage/OpportunitiesPage';
import ConfigPage from './pages/ConfigPage/ConfigPage';
import StatusPage from './pages/StatusPage/StatusPage';

function App() {
  return (
    <BrowserRouter>
      <nav>
        <Link to="/">Opportunities</Link> | <Link to="/config">Config</Link> |{' '}
        <Link to="/status">Status</Link>
      </nav>
      <Routes>
        <Route path="/" element={<OpportunitiesPage />} />
        <Route path="/config" element={<ConfigPage />} />
        <Route path="/status" element={<StatusPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
