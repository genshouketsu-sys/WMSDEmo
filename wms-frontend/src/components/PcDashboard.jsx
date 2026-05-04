import React, { useState } from 'react';
import ProductCatalog from '../ProductCatalog';
import OutboundManagement from '../pages/OutboundManagement';
import FinanceManagement from '../pages/FinanceManagement';
import InboundManagement from '../pages/InboundManagement';
import ScanQrModal from './ScanQrModal';
import AdminSettingsModal from './AdminSettingsModal';
import { useTranslation } from '../i18n/LanguageContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function PcDashboard({ 
  currentView, 
  setCurrentView, 
  scans, 
  setScans,
  connectionStatus
}) {
  const { t, language, setLanguage } = useTranslation();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState({
    username: localStorage.getItem('wms_username') || 'Admin',
    displayName: '',
    avatarUrl: ''
  });
  const [showQr, setShowQr] = useState(false);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAdminSettings, setShowAdminSettings] = useState(false);

  const fetchProfile = async () => {
    try {
      const response = await axios.get('/api/user/profile');
      if (response.data) {
        setUserProfile(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
    }
  };

  React.useEffect(() => {
    fetchProfile();
    window.addEventListener('wms-profile-updated', fetchProfile);
    return () => window.removeEventListener('wms-profile-updated', fetchProfile);
  }, []);

  
  // Predictive Restocking State
  const [predictions, setPredictions] = useState([]);
  const [showPredictionsModal, setShowPredictionsModal] = useState(false);
  
  // Latency state
  const [latencyHistory, setLatencyHistory] = useState(new Array(20).fill(12));

  const generateLatencyPath = () => {
    const maxLatency = 500;
    const width = 100;
    const height = 100;
    const step = width / (latencyHistory.length - 1);
    
    return latencyHistory.map((l, i) => {
      const x = i * step;
      const normalizedLatency = Math.min(l, maxLatency);
      const y = height - (normalizedLatency / maxLatency) * height * 0.8 - 10;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  // Dashboard Stats State
  const [stats, setStats] = useState({
    totalActiveSKUs: 0,
    scansToday: 0,
    lowStockAlerts: 0
  });

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/dashboard/stats');
      if (response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
    }
  };

  React.useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    let isMounted = true;
    const measureLatency = async () => {
      try {
        const start = performance.now();
        await fetch('/api/scan/ping', { method: 'GET', cache: 'no-cache' });
        const end = performance.now();
        const currentLatency = Math.round(end - start);
        if (isMounted) {
          setLatencyHistory(prev => [...prev.slice(1), currentLatency]);
        }
      } catch (e) {
        if (isMounted) setLatencyHistory(prev => [...prev.slice(1), 999]);
      }
    };
    
    measureLatency();
    const pingInterval = setInterval(measureLatency, 1500);
    return () => {
      isMounted = false;
      clearInterval(pingInterval);
    };
  }, []);

  React.useEffect(() => {
    // Fetch predictions on mount and interval
    const fetchPredictions = async () => {
      try {
        const response = await fetch('/api/predictions/restock');
        if (response.ok) {
          const data = await response.json();
          setPredictions(data);
        }
      } catch (error) {
        console.error("Failed to fetch predictions:", error);
      }
    };
    fetchPredictions();
    const interval = setInterval(fetchPredictions, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const onSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedScans = [...scans]
    .filter(scan => statusFilter === 'All' ? true : scan.status === statusFilter)
    .sort((a, b) => {
      if (!sortColumn) return 0;
      const valA = a[sortColumn] || '';
      const valB = b[sortColumn] || '';
      const cmp = valA.localeCompare(valB);
      return sortDirection === 'asc' ? cmp : -cmp;
    });

  const handleDeleteScan = (idToDelete) => {
    if (setScans) {
      setScans(prev => prev.filter(scan => scan.id !== idToDelete));
    }
  };

  const handleStockIn = async (scanId) => {
    try {
      const response = await axios.post('/api/products/batch-inbound', [scanId]);
      if (response.data && response.data.success) {
        if (setScans) {
          setScans(prev => prev.map(s => s.id === scanId ? { ...s, status: 'Stocked' } : s));
        }
      } else {
        alert(t('errorStockIn') || '入库失败 (Failed to stock in)');
      }
    } catch (e) {
      console.error(e);
      alert(t('errorConnection') || '网络错误 (Network error)');
    }
  };

  const handleBatchStockIn = async () => {
    const pendingBarcodes = scans
      .filter(s => s.status !== 'Stocked')
      .map(s => s.id);
    
    if (pendingBarcodes.length === 0) {
      alert(t('noPendingScans') || '没有待处理的扫描 (No pending scans)');
      return;
    }

    try {
      const response = await axios.post('/api/products/batch-inbound', pendingBarcodes);
      if (response.data && response.data.success) {
        if (setScans) {
          setScans(prev => prev.map(s => pendingBarcodes.includes(s.id) ? { ...s, status: 'Stocked' } : s));
        }
      } else {
        alert(t('errorStockIn') || '批量入库失败');
      }
    } catch (e) {
      console.error(e);
      alert(t('errorConnection') || '网络错误');
    }
  };

  const handleClearScans = () => {
    if (window.confirm(t('confirmClearScans') || '确定要清空所有扫描记录吗？')) {
      if (setScans) {
        setScans([]);
      }
    }
  };

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        handleBatchStockIn();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scans]);

  const handleExecuteOrder = async (skuCode, quantity) => {
    try {
      // In a real app, this would hit an order execution endpoint
      alert(`Predictive order of ${quantity} units for '${skuCode}' executed successfully!`);
      // Update UI optimistically or fetch again
      setPredictions(prev => prev.filter(p => p.skuCode !== skuCode));
    } catch (error) {
      console.error('Failed to execute order:', error);
      alert('Failed to execute predictive order.');
    }
  };

  const renderContent = () => {
    if (currentView === 'catalog') {
      return <ProductCatalog />;
    }

    if (currentView === 'outbound') {
      return <OutboundManagement />;
    }

    if (currentView === 'finance') {
      return <FinanceManagement />;
    }

    if (currentView === 'inbound') {
      return <InboundManagement />;
    }

    // Dashboard View
    return (
      <div className="p-margin max-w-7xl mx-auto space-y-lg">
        {/* Inventory Overview Header */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 mt-8">
          <div className="space-y-2">
            <h1 className="font-h1 text-h1 text-primary">{t('inventoryOverview')}</h1>
            <p className="text-on-surface-variant font-body-lg">{t('overviewDesc')}</p>
          </div>
          <div className="flex items-center gap-4 pb-2">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-md border border-white/10">
              <div className={`w-2 h-2 rounded-full ${connectionStatus === 'ACTIVE' ? 'bg-[#c5ff4a] animate-pulse' : 'bg-zinc-500'}`}></div>
              <span className={`text-xs uppercase tracking-widest ${connectionStatus === 'ACTIVE' ? 'text-[#c5ff4a]' : 'text-zinc-500'}`}>
                {t('liveSync')} {connectionStatus}
              </span>
            </div>
          </div>
        </section>

        {/* Metric Cards (Bento Style) */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          {/* Metric 1: Total SKUs */}
          <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl space-y-4 border border-white/10 hover:border-[#bcf540]/30 transition-all group shadow-sm">
            <div className="flex justify-between items-start">
              <span className="material-symbols-outlined text-zinc-500 group-hover:text-[#bcf540] transition-colors">category</span>
              <span className="text-[#bcf540] font-black text-[9px] bg-[#bcf540]/10 px-2 py-1 rounded tracking-widest uppercase">Live Database</span>
            </div>
            <div>
              <h3 className="font-label-sm text-zinc-500 uppercase tracking-[0.2em] mb-1">{t('totalActiveSKUs')}</h3>
              <p className="font-h2 text-h2 text-primary">{stats.totalActiveSKUs.toLocaleString()}</p>
            </div>
          </div>
          
          {/* Metric 2: Scans Today */}
          <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl space-y-4 border border-white/10 hover:border-[#bcf540]/30 transition-all group shadow-sm">
            <div className="flex justify-between items-start">
              <span className="material-symbols-outlined text-zinc-500 group-hover:text-[#bcf540] transition-colors">qr_code_scanner</span>
              <span className="text-zinc-500 font-black text-[9px] bg-white/5 px-2 py-1 rounded tracking-widest uppercase">Daily Metrics</span>
            </div>
            <div>
              <h3 className="font-label-sm text-zinc-500 uppercase tracking-[0.2em] mb-1">{t('scansToday')}</h3>
              <p className="font-h2 text-h2 text-primary">{stats.scansToday.toLocaleString()}</p>
            </div>
          </div>
          
          {/* Metric 3: Low Stock Alerts */}
          <div 
            onClick={() => predictions.length > 0 && setShowPredictionsModal(true)}
            className={`bg-white/5 backdrop-blur-md p-6 rounded-2xl space-y-4 border transition-all group shadow-sm ${stats.lowStockAlerts > 0 ? 'border-red-500/30 hover:border-red-500 cursor-pointer' : 'border-white/10'}`}
          >
            <div className="flex justify-between items-start">
              <span className={`material-symbols-outlined ${stats.lowStockAlerts > 0 ? 'text-red-500 animate-pulse' : 'text-zinc-500'}`}>warning</span>
              <span className={`font-black text-[9px] px-2 py-1 rounded uppercase tracking-widest ${stats.lowStockAlerts > 0 ? 'text-white bg-red-600' : 'text-zinc-500 bg-white/5'}`}>{stats.lowStockAlerts > 0 ? t('actionRequired') : t('systemNominal')}</span>
            </div>
            <div>
              <h3 className="font-label-sm text-zinc-500 uppercase tracking-[0.2em] mb-1">{t('lowStockAlerts')}</h3>
              <p className="font-h2 text-h2 text-white">{stats.lowStockAlerts}</p>
            </div>
          </div>
        </section>

        {/* System Health & Activity */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8 pb-12">
          {/* Activity Table (Left) */}
          <div className="lg:col-span-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-white/5 flex flex-row justify-between items-center gap-4 bg-[#0c0f0f]/50">
              <div className="flex items-center gap-3">
                <h3 className="text-white text-sm font-bold tracking-tight">{t('recentScanningActivity')}</h3>
                <span className="text-[#bcf540] text-[9px] font-black bg-[#bcf540]/10 px-2 py-0.5 rounded-full uppercase tracking-widest">{scans.filter(s => s.status !== 'Stocked').length} Pending</span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleClearScans}
                  className="flex items-center gap-1.5 h-[36px] px-3 rounded-lg text-[10px] font-bold uppercase tracking-widest text-red-400 hover:bg-red-500/10 transition-all border border-red-500/20"
                >
                  <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
                  {t('clearAll')}
                </button>
                <button 
                  onClick={handleBatchStockIn}
                  className="flex items-center gap-1.5 h-[36px] px-4 rounded-lg bg-[#bcf540] text-black hover:brightness-110 transition-all font-black text-[10px] uppercase tracking-widest shadow-lg"
                >
                  <span className="material-symbols-outlined text-[16px]">inventory</span>
                  {t('batchStockIn')}
                </button>
                <div className="h-6 w-[1px] bg-white/10 mx-1"></div>
                <button 
                  onClick={() => setStatusFilter(prev => prev === 'All' ? 'Verified' : 'All')}
                  className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all border ${statusFilter !== 'All' ? 'bg-[#bcf540] text-black border-[#bcf540]' : 'text-zinc-500 border-white/10 hover:border-white/20'}`}
                >
                  <span className="material-symbols-outlined text-[18px]">filter_list</span>
                </button>
              </div>
            </div>
            <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full text-left">
                <thead className="bg-[#0c0f0f]/50 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3 border-b border-white/5">{t('productName')}</th>
                    <th className="px-5 py-3 border-b border-white/5">{t('skuId')}</th>
                    <th className="px-5 py-3 border-b border-white/5">{t('timestamp')}</th>
                    <th className="px-5 py-3 border-b border-white/5">{t('relayStatus')}</th>
                    <th className="px-5 py-3 border-b border-white/5 text-left">{t('action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sortedScans.map((scan, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-all group h-[56px]">
                      <td className="px-5 py-3 font-bold text-white text-xs">{scan.name || '—'}</td>
                      <td className="px-5 py-3 text-zinc-500 text-[11px] font-mono tracking-tight">{scan.id}</td>
                      <td className="px-5 py-3 text-zinc-500 text-[10px] font-medium">{scan.time}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${scan.status === 'Verified' ? 'text-[#bcf540] bg-[#bcf540]/10' : 'text-zinc-500 bg-white/5'}`}>
                          <span className={`w-1 h-1 rounded-full ${scan.status === 'Verified' ? 'bg-[#bcf540]' : 'bg-zinc-500'}`}></span>
                          {scan.status}
                        </span>
                      </td>
                    <td className="px-5 py-3 text-left">
                      <div className="flex justify-start items-center gap-2">
                        {scan.status !== 'Stocked' && (
                          <button 
                            onClick={() => handleStockIn(scan.id)}
                            className="h-[30px] px-3 rounded-md bg-[#bcf540]/10 text-[#bcf540] hover:bg-[#bcf540] hover:text-black transition-all text-[9px] font-black uppercase tracking-widest border border-[#bcf540]/20"
                          >
                            {t('confirmStockIn')}
                          </button>
                        )}
                        <button 
                          onClick={() => handleDeleteScan(scan.id)}
                          className="w-8 h-8 flex items-center justify-center text-zinc-600 hover:text-red-500 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
          </div>

          {/* System Health (Right) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-xl space-y-6">
              <h3 className="text-white text-xl font-medium">{t('systemHealth')}</h3>
              <div className="space-y-4">
                {/* Relay Status */}
                <div className="p-4 rounded-lg bg-white/5 flex items-center justify-between border border-white/5">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#c5ff4a]">hub</span>
                    <span className="text-sm font-medium text-white">{t('scanningRelay')}</span>
                  </div>
                  <div className="px-2 py-1 rounded bg-[#c5ff4a]/10 text-[#c5ff4a] text-[10px] font-bold uppercase tracking-wider">{connectionStatus}</div>
                </div>
                {/* WebSocket Status */}
                <div className="p-4 rounded-lg bg-white/5 flex items-center justify-between border border-white/5">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#c5ff4a]">swap_calls</span>
                    <span className="text-sm font-medium text-white">{t('websocketBridge')}</span>
                  </div>
                  <div className="px-2 py-1 rounded bg-[#c5ff4a]/10 text-[#c5ff4a] text-[10px] font-bold uppercase tracking-wider">{connectionStatus}</div>
                </div>
                {/* Database Status */}
                <div className="p-4 rounded-lg bg-white/5 flex items-center justify-between border border-white/5">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-zinc-500">storage</span>
                    <span className="text-sm font-medium text-white">{t('localCache')}</span>
                  </div>
                  <div className="px-2 py-1 rounded bg-zinc-400/10 text-zinc-400 text-[10px] font-bold uppercase tracking-wider">{t('syncing')}</div>
                </div>
              </div>

              {/* Visualization Mockup */}
              <div className="mt-8 pt-6 border-t border-white/10">
                <div className="h-32 w-full relative overflow-hidden rounded-lg bg-[#0c0f0f]">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#c5ff4a]/20 to-transparent"></div>
                  <svg className="absolute bottom-0 left-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                    <path 
                      d={`${generateLatencyPath()} L 100 100 L 0 100 Z`} 
                      fill="rgba(197, 255, 74, 0.1)" 
                      className="transition-all duration-700 ease-in-out"
                    />
                    <path 
                      d={generateLatencyPath()} 
                      fill="none" 
                      stroke="#C5FF4A" 
                      strokeWidth="1.5"
                      className="transition-all duration-700 ease-in-out"
                    />
                  </svg>
                  <div className="absolute top-2 left-2 flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[#c5ff4a] uppercase tracking-widest">{t('networkLatency')}</span>
                    <span className={`text-[10px] ${latencyHistory[latencyHistory.length - 1] > 200 ? 'text-red-500 animate-pulse' : 'text-zinc-500'}`}>
                      {latencyHistory[latencyHistory.length - 1]}ms
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Action Card */}
            <div className="relative overflow-hidden group rounded-xl p-6 h-48 flex flex-col justify-end border border-white/10 cursor-pointer" onClick={() => setShowPredictionsModal(true)}>
              <img alt="abstract" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" src="https://lh3.googleusercontent.com/aida-public/AB6AXuClDYoSRWhGyXZjaJjKtIhvqZyErwAgSQSTuIrk4wjPnvQTjli7GupF7BddMfOW6nv1kAwb_ynWDONUDcac5Q3UKcWKYG4M9BpO7QXjdSfI9kojWYYp_tfxCLfA0s6hvN-V8A_gWsmUyhxJwPn3OVpTjooUTVK5viLcd-dKxKLjMlkmdnfUHbI6O00cVAn186iQdG7asgA95l6SHyVTy1OPyA3jzkPaDIj3oikbHUR_dV8Mq8MqO_Av6BFbX5aHBDB31oieDQDL42nP" />
              <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-[2px]"></div>
              <div className="relative z-10 space-y-2">
                <h4 className="text-white font-bold">{t('predictiveRestock')}</h4>
                <p className="text-xs text-zinc-300">
                  {predictions.length > 0 
                    ? `${predictions.length} items require your attention based on AI usage forecasting.` 
                    : t('predictiveDesc')}
                </p>
                <button 
                  className="mt-2 text-xs font-bold text-[#c5ff4a] uppercase tracking-wider flex items-center gap-1 group/btn hover:text-white transition-colors"
                >
                  {t('executeOrder')}
                  <span className="material-symbols-outlined text-sm group-hover/btn:translate-x-1 transition-transform">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  };

  return (
    <>
      {/* SideNavBar */}
      <aside className="fixed left-0 top-0 flex flex-col h-full z-40 bg-[#0c0f0f]/95 backdrop-blur-2xl w-64 border-r border-white/10 font-['Space_Grotesk'] antialiased">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-10 cursor-pointer" onClick={() => setCurrentView('dashboard')}>
            <div className="w-10 h-10 rounded-lg bg-[#bcf540] flex items-center justify-center shadow-[0_0_20px_rgba(188,245,64,0.2)]">
              <span className="material-symbols-outlined text-black font-variation-fill" style={{ fontVariationSettings: "'FILL' 1" }}>dataset</span>
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tighter leading-none">SpeedWMS</h2>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mt-1">{t('predictiveLogistics')}</p>
            </div>
          </div>
          <nav className="space-y-1.5">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`w-full h-[48px] flex items-center gap-3 px-4 rounded-xl transition-all duration-200 ${
                currentView === 'dashboard' 
                  ? 'bg-[#bcf540]/10 text-[#bcf540] border border-[#bcf540]/20' 
                  : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-200'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">dashboard</span>
              <span className="font-bold text-sm">{t('dashboard')}</span>
            </button>
            <button
              onClick={() => setCurrentView('catalog')}
              className={`w-full h-[48px] flex items-center gap-3 px-4 rounded-xl transition-all duration-200 ${
                currentView === 'catalog' 
                  ? 'bg-[#bcf540]/10 text-[#bcf540] border border-[#bcf540]/20' 
                  : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-200'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">inventory_2</span>
              <span className="font-bold text-sm">{t('productCatalog')}</span>
            </button>
            <button
              onClick={() => setCurrentView('inbound')}
              className={`w-full h-[48px] flex items-center gap-3 px-4 rounded-xl transition-all duration-200 ${
                currentView === 'inbound' 
                  ? 'bg-[#bcf540]/10 text-[#bcf540] border border-[#bcf540]/20' 
                  : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-200'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">login</span>
              <span className="font-bold text-sm">{t('inboundLogistics')}</span>
            </button>
            <button
              onClick={() => setCurrentView('outbound')}
              className={`w-full h-[48px] flex items-center gap-3 px-4 rounded-xl transition-all duration-200 ${
                currentView === 'outbound' 
                  ? 'bg-[#bcf540]/10 text-[#bcf540] border border-[#bcf540]/20' 
                  : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-200'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
              <span className="font-bold text-sm">{t('outboundLogistics')}</span>
            </button>
            <button
              onClick={() => setCurrentView('finance')}
              className={`w-full h-[48px] flex items-center gap-3 px-4 rounded-xl transition-all duration-200 ${
                currentView === 'finance' 
                  ? 'bg-[#bcf540]/10 text-[#bcf540] border border-[#bcf540]/20' 
                  : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-200'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
              <span className="font-bold text-sm">{t('financialLedger')}</span>
            </button>
          </nav>
        </div>
        <div className="mt-auto p-6">
          <button 
            onClick={() => setShowQr(true)}
            className="w-full h-[48px] bg-[#bcf540] text-black rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:brightness-110 shadow-[0_4px_15px_rgba(188,245,64,0.2)] active:scale-[0.98] transition-all"
          >
            <span className="material-symbols-outlined text-sm font-bold">add</span>
            {t('newScan')}
          </button>
        </div>
      </aside>

      {/* Content Wrapper */}
      <main className="flex-1 ml-64 min-h-screen bg-[#0a0a0a] relative font-['Space_Grotesk']">

        {/* Background Grid Pattern */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.4]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(188, 245, 64, 0.1) 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }}></div>

        {/* TopAppBar */}
        <header className="sticky top-0 z-30 flex justify-between items-center w-full px-8 h-[64px] bg-[#0c0f0f]/80 backdrop-blur-2xl border-b border-white/5">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">{currentView === 'dashboard' ? 'Overview' : 'Inventory Management'}</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex bg-white/5 rounded-lg border border-white/10 p-0.5">
              {['en', 'zh', 'ja'].map(lang => (
                <button 
                  key={lang}
                  onClick={() => setLanguage(lang)} 
                  className={`w-8 h-7 text-[10px] font-bold rounded transition-all ${language === lang ? 'bg-[#bcf540] text-black shadow-lg' : 'text-zinc-500 hover:text-white'}`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
            
            <div className="h-6 w-[1px] bg-white/10"></div>
            
            <div className="relative">
              <div 
                className="flex items-center gap-3 cursor-pointer hover:bg-white/5 px-3 h-10 rounded-xl transition-all border border-transparent hover:border-white/10"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <div className="w-7 h-7 rounded-full border border-[#bcf540]/30 overflow-hidden bg-zinc-900 flex items-center justify-center p-[2px]">
                  {userProfile.avatarUrl ? (
                    <img alt="User profile" className="w-full h-full rounded-full object-cover" src={userProfile.avatarUrl} />
                  ) : (
                    <span className="material-symbols-outlined text-[#bcf540] text-[14px]">person</span>
                  )}
                </div>
                <span className="text-zinc-300 font-bold text-xs tracking-tight">{userProfile.displayName || userProfile.username}</span>
                <span className="material-symbols-outlined text-zinc-500 text-[16px] transition-transform duration-300" style={{ transform: showUserMenu ? 'rotate(180deg)' : 'none' }}>expand_more</span>
              </div>
              
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-[#161818] border border-white/10 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-2 border-b border-white/5 mb-2">
                    <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">User Profile</p>
                    <p className="text-xs text-white font-bold truncate">{userProfile.username}</p>
                  </div>
                  <button 
                    onClick={() => navigate('/scanner')}
                    className="w-full text-left px-4 py-2.5 text-xs text-zinc-300 hover:bg-[#bcf540]/10 hover:text-[#bcf540] transition-all flex items-center gap-3 group"
                  >
                    <span className="material-symbols-outlined text-[18px] group-hover:scale-110 transition-transform">barcode_scanner</span>
                    {t('openScanner') || 'Mobile Terminal'}
                  </button>
                  <button 
                    onClick={() => { setShowAdminSettings(true); setShowUserMenu(false); }}
                    className="w-full text-left px-4 py-2.5 text-xs text-zinc-300 hover:bg-[#bcf540]/10 hover:text-[#bcf540] transition-all flex items-center gap-3 group"
                  >
                    <span className="material-symbols-outlined text-[18px] group-hover:scale-110 transition-transform">settings_suggest</span>
                    {t('editAdmin') || 'System Settings'}
                  </button>
                  <div className="h-px bg-white/10 my-2"></div>
                  <button 
                    onClick={() => {
                      localStorage.removeItem('wms_token');
                      localStorage.removeItem('wms_username');
                      navigate('/login');
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition-all flex items-center gap-3 group"
                  >
                    <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">logout</span>
                    {t('logout') || 'Terminate Session'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Rendered View Component */}
        {renderContent()}

      </main>

      {/* Floating Action Button - Only for Primary View */}
      {currentView === 'dashboard' && (
        <button 
          onClick={() => setShowQr(true)}
          className="fixed bottom-12 right-12 bg-[#c5ff4a] text-black w-14 h-14 rounded-full shadow-2xl shadow-[#c5ff4a]/20 flex items-center justify-center hover:scale-105 transition-transform z-50"
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>qr_code_scanner</span>
        </button>
      )}

      <ScanQrModal isOpen={showQr} onClose={() => setShowQr(false)} />
      <AdminSettingsModal isOpen={showAdminSettings} onClose={() => setShowAdminSettings(false)} />

      {/* Predictions Modal */}
      {showPredictionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#1e2020] border border-white/10 rounded-2xl p-6 max-w-4xl w-full max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[#c5ff4a]">auto_awesome</span>
                {t('predictiveRestock')}
              </h2>
              <button onClick={() => setShowPredictionsModal(false)} className="text-zinc-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-auto pr-2">
              {predictions.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                  <span className="material-symbols-outlined text-4xl mb-2">check_circle</span>
                  <p>All stock levels are healthy.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(Array.isArray(predictions) ? predictions : []).map((p, i) => (
                    <div key={i} className={`bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col md:flex-row gap-4 justify-between md:items-center relative overflow-hidden`}>
                      {/* Urgency Stripe */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${p.urgency === 'High' ? 'bg-red-500' : p.urgency === 'Medium' ? 'bg-orange-500' : 'bg-blue-500'}`}></div>
                      
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                            p.urgency === 'High' ? 'bg-red-500/20 text-red-400' : 
                            p.urgency === 'Medium' ? 'bg-orange-500/20 text-orange-400' : 
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            {p.urgency || 'Low'}
                          </span>
                          <span className="font-mono text-xs px-2 py-1 bg-white/10 rounded text-zinc-300">{p.skuCode}</span>
                          <h4 className="font-medium text-white">{p.name}</h4>
                        </div>
                        <p className="text-[10px] text-zinc-500 italic mt-1">{p.reason}</p>
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 text-[11px] text-zinc-400">
                          <div className="flex flex-col">
                            <span className="text-zinc-500 uppercase text-[9px] font-bold tracking-widest">Current</span>
                            <span className="text-white font-medium">{p.currentStock}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-zinc-500 uppercase text-[9px] font-bold tracking-widest">Threshold</span>
                            <span className="text-[#c5ff4a] font-medium">{p.reorderPoint || p.safetyStock}</span>
                          </div>
                          {p.daysUntilDepletion !== undefined && (
                            <div className="flex flex-col">
                              <span className="text-zinc-500 uppercase text-[9px] font-bold tracking-widest">Est. Depletion</span>
                              <span className={`font-bold ${p.daysUntilDepletion <= 3 ? 'text-red-400' : 'text-white'}`}>{p.daysUntilDepletion} days</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="text-[10px] text-zinc-400">Suggested: <span className="text-white font-bold text-base">{p.suggestedOrderQuantity}</span> units</div>
                        <button 
                          onClick={() => handleExecuteOrder(p.skuCode, p.suggestedOrderQuantity)}
                          className="bg-[#c5ff4a] text-black px-4 py-2 rounded-lg text-sm font-bold hover:brightness-110 transition-all flex items-center gap-1 active:scale-95"
                        >
                          <span className="material-symbols-outlined text-[18px]">shopping_cart_checkout</span>
                          {t('executeOrder')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default PcDashboard;