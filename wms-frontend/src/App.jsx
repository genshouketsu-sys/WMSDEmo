import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import PcDashboard from './components/PcDashboard';
import MobileScanner from './components/MobileScanner';
import LoginPage from './pages/LoginPage';
import OutboundManagement from './pages/OutboundManagement';
import FinanceManagement from './pages/FinanceManagement';
import InboundManagement from './pages/InboundManagement';
import ProtectedRoute from './components/ProtectedRoute';

// Configure Axios Interceptors
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('wms_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      localStorage.removeItem('wms_token');
      localStorage.removeItem('wms_username');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [scans, setScans] = useState([
    { id: 'PRD-X92-BLA', name: 'Black T-Shirt', time: '14:02:11', status: 'Verified' },
    { id: 'SKU-441-MET', name: 'Metal Water Bottle', time: '14:01:58', status: 'Verified' },
    { id: 'LOG-772-GRN', name: 'Green Notebook', time: '14:01:45', status: 'Secondary' },
  ]);

  const [connectionStatus, setConnectionStatus] = useState('OFFLINE');
  const wsRef = useRef(null);
  const productsCache = useRef([]);

  // Fetch products for name lookup
  useEffect(() => {
    const token = localStorage.getItem('wms_token');
    if (token) {
      axios.get('/api/products')
        .then(res => { productsCache.current = res.data; })
        .catch(() => {});
    }
  }, []);

  // WebSocket for receiving scans (Dashboard logic)
  useEffect(() => {
    const token = localStorage.getItem('wms_token');
    if (!token) return;

    const username = localStorage.getItem('wms_username') || '1';
    const clientId = `pc_${username}`;
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/scan?clientId=${clientId}`;

    let cancelled = false;
    let reconnectTimer = null;
    let reconnectAttempt = 0;

    const connect = () => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Connected to WebSocket server');
        reconnectAttempt = 0;
        setConnectionStatus('ACTIVE');
      };

      ws.onmessage = (event) => {
        const rawData = event.data;
        console.log(`[Global WS] Received raw: ${rawData}`);

        if (rawData === "UNDO_LAST_ACTION") {
          setScans(prev => prev.slice(1));
          return;
        }

        let barcode, resolvedName;
        try {
          const data = JSON.parse(rawData);
          barcode = data.barcode;
          resolvedName = data.name;
        } catch (e) {
          barcode = rawData;
          const product = productsCache.current.find(p => p.barcode === barcode || p.skuCode === barcode);
          resolvedName = product ? product.name : 'Unknown Product';
        }

        const now = new Date();
        const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

        setScans(prev => [
          { id: barcode, name: resolvedName, time: timeString, status: 'Verified' },
          ...prev.slice(0, 9)
        ]);

        window.dispatchEvent(new CustomEvent('wms-new-scan', { detail: { barcode } }));
      };

      ws.onclose = () => {
        console.log('Disconnected from WebSocket server');
        setConnectionStatus('OFFLINE');
        if (cancelled) return;
        // Reconnect with capped exponential backoff so a dropped Wi-Fi link
        // between phone and PC doesn't silently kill the live scan relay.
        const delay = Math.min(1000 * 2 ** reconnectAttempt, 15000);
        reconnectAttempt += 1;
        reconnectTimer = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  return (
    <Router>
      <Routes>
        {/* Public Login Route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Dashboard Route */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <PcDashboard 
                currentView={currentView}
                setCurrentView={setCurrentView}
                scans={scans}
                setScans={setScans}
                connectionStatus={connectionStatus}
                setIsMobileMode={() => {}} // Not used in router mode
              />
            </ProtectedRoute>
          } 
        />

        {/* Product Catalog Route */}
        <Route 
          path="/catalog" 
          element={
            <ProtectedRoute>
              <PcDashboard 
                currentView="catalog"
                setCurrentView={setCurrentView}
                scans={[]}
                setScans={() => {}}
                connectionStatus="ACTIVE"
              />
            </ProtectedRoute>
          } 
        />

        {/* Mobile Scanner Route (Can be accessed directly or protected) */}
        <Route 
          path="/scanner" 
          element={<MobileScanner onClose={() => window.location.href = '/'} />} 
        />

        {/* Outbound Management Route */}
        <Route 
          path="/outbound" 
          element={
            <ProtectedRoute>
              <PcDashboard 
                currentView="outbound"
                setCurrentView={setCurrentView}
                scans={[]}
                setScans={() => {}}
                connectionStatus="ACTIVE"
              />
            </ProtectedRoute>
          } 
        />

        {/* Finance Management Route */}
        <Route 
          path="/finance" 
          element={
            <ProtectedRoute>
              <PcDashboard 
                currentView="finance"
                setCurrentView={setCurrentView}
                scans={[]}
                setScans={() => {}}
                connectionStatus="ACTIVE"
              />
            </ProtectedRoute>
          } 
        />

        {/* Inbound Management Route */}
        <Route 
          path="/inbound" 
          element={
            <ProtectedRoute>
              <PcDashboard 
                currentView="inbound"
                setCurrentView={setCurrentView}
                scans={[]}
                setScans={() => {}}
                connectionStatus="ACTIVE"
              />
            </ProtectedRoute>
          } 
        />

        {/* Fallback to Dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
