import { useEffect, useState } from 'react';
import { API_URL, authHeaders } from '../../api/config';

const OpportunitiesPage = () => {
  const [status, setStatus] = useState('checking...');

  useEffect(() => {
    fetch(`${API_URL}/status`, { headers: authHeaders() })
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json();
      })
      .then((data) => {
        console.log('backend /status response:', data);
        setStatus('CONNECTED — see console for /status response');
      })
      .catch((err) => {
        console.error('backend connection failed:', err);
        setStatus(`FAILED: ${err.message}`);
      });
  }, []);

  return (
    <div>
      <div>Opportunities page</div>
      <div>{status}</div>
    </div>
  );
};

export default OpportunitiesPage;
