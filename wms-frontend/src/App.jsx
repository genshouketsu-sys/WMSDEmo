import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import ProtectedRoute from './components/ProtectedRoute';
const PcDashboard = lazy(() => import('./components/PcDashboard'));
const MobileScanner = lazy(() => import('./components/MobileScanner'));
const LoginPage = lazy(() => import('./pages/LoginPage'));

axios.interceptors.request.use(config => {
  const token = localStorage.getItem('wms_token');
  if (token && !config.headers['X-Scan-Token'] && !config.url?.startsWith('/api/auth/')) config.headers.Authorization = 'Bearer ' + token;
  return config;
});
axios.interceptors.response.use(response => response, error => {
  const currentToken = localStorage.getItem('wms_token');
  const requestToken = error.config?.headers?.Authorization;
  if (error.response?.status === 401 && currentToken && requestToken === `Bearer ${currentToken}`
    && !error.config?.url?.startsWith('/api/auth/') && !error.config?.headers?.['X-Scan-Token']) {
    localStorage.removeItem('wms_token'); localStorage.removeItem('wms_username');
    if (window.location.pathname !== '/login') window.location.assign('/login');
  }
  return Promise.reject(error);
});

function ScanApp() {
  useLocation();
  const token = localStorage.getItem('wms_token');
  const [currentView, setCurrentView] = useState('dashboard');
  const [scans, setScans] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('OFFLINE');
  useEffect(() => {
    if (!token) return;
    let cancelled=false, socket, timer;
    let catalog = new Map();
    let catalogFetchedAt = 0;
    const refresh = async () => {
      try {
        const response=await axios.get('/api/scan/logs');
        if (response.data.some(row => !row.name && !row.NAME && !row.productName) && Date.now() - catalogFetchedAt > 60000) {
          catalogFetchedAt = Date.now();
          try {
            const products = await axios.get('/api/products');
            catalog = new Map(products.data.filter(product => product.barcode)
              .map(product => [String(product.barcode), product]));
          } catch (error) { console.error('Could not load scan product names', error); }
        }
        if (!cancelled) setScans(response.data.map(row => {
          const barcode = String(row.barcode ?? row.BARCODE ?? '');
          const product = catalog.get(barcode);
          return {
            scanId: row.scanId ?? row.SCANID ?? row.scan_id ?? row.id ?? row.ID,
            barcode,
            skuCode: row.skuCode ?? row.SKUCODE ?? row.sku_code ?? row.SKU_CODE ?? product?.skuCode ?? '',
            name: row.name || row.NAME || row.productName || row.PRODUCTNAME || product?.name || barcode || '—',
            time: row.time ?? row.TIME ?? row.scanTime ?? row.scan_time ?? row.SCAN_TIME ?? null,
            status: row.status ?? row.STATUS ?? 'History',
          };
        }));
      }
      catch (error) { console.error('Could not load scan queue', error); }
    };
    const connect = async () => {
      try {
        const response=await axios.get('/api/scan/pairing');
        if (cancelled) return;
        const protocol=window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        socket=new WebSocket(protocol+'//'+window.location.host+'/ws/scan?token='+encodeURIComponent(response.data.token));
        socket.onopen=() => { if (!cancelled) { setConnectionStatus('ACTIVE'); refresh(); } };
        socket.onmessage=() => { refresh(); window.dispatchEvent(new Event('wms-new-scan')); };
        socket.onclose=() => { if (!cancelled) { setConnectionStatus('OFFLINE'); timer=setTimeout(connect, 3000); } };
        socket.onerror=() => socket.close();
      } catch (error) { if (!cancelled) { console.error('Scanner connection unavailable', error); timer=setTimeout(connect,5000); } }
    };
    refresh();connect();
    const interval=setInterval(refresh,15000);
    window.addEventListener('wms-scans-changed',refresh);
    return () => { cancelled=true; clearInterval(interval);clearTimeout(timer);socket?.close();window.removeEventListener('wms-scans-changed',refresh); };
  },[token]);


  return (
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
                scans={scans}
                setScans={setScans}
                connectionStatus={connectionStatus}
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
                scans={scans}
                setScans={setScans}
                connectionStatus={connectionStatus}
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
                scans={scans}
                setScans={setScans}
                connectionStatus={connectionStatus}
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
                scans={scans}
                setScans={setScans}
                connectionStatus={connectionStatus}
              />
            </ProtectedRoute>
          } 
        />

        {/* Fallback to Dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
  );
}

function App() {
  return (
    <Router>
      <Suspense fallback={<div role="status" style={{padding:32}}>Loading…</div>}>
      <ScanApp />
    </Suspense>
    </Router>
  );
}

export default App;
