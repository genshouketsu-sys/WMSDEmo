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

function PcDashboard({ currentView, setCurrentView, scans, setScans, connectionStatus }) {
  const { t, language, setLanguage } = useTranslation();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState({ username: localStorage.getItem('wms_username') || 'Admin', displayName: '', avatarUrl: '' });
  const [showQr, setShowQr] = useState(false);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAdminSettings, setShowAdminSettings] = useState(false);
  const [predictions, setPredictions] = useState([]);
  const [showPredictionsModal, setShowPredictionsModal] = useState(false);
  const [latencyHistory, setLatencyHistory] = useState(new Array(20).fill(12));
  const [stats, setStats] = useState({ totalActiveSKUs: 0, scansToday: 0, lowStockAlerts: 0 });

  const handleViewChange = (view) => {
    setCurrentView(view);
    navigate({ dashboard: '/', catalog: '/catalog', inbound: '/inbound', outbound: '/outbound', finance: '/finance' }[view] || '/');
  };

  const fetchProfile = async () => {
    try { const r = await axios.get('/api/user/profile'); if (r.data) setUserProfile(r.data); } catch {}
  };

  React.useEffect(() => {
    fetchProfile();
    window.addEventListener('wms-profile-updated', fetchProfile);
    return () => window.removeEventListener('wms-profile-updated', fetchProfile);
  }, []);

  React.useEffect(() => {
    const f = async () => {
      try { const r = await axios.get('/api/dashboard/stats'); if (r.data) setStats({ totalActiveSKUs: Number(r.data.totalActiveSKUs)||0, scansToday: Number(r.data.scansToday)||0, lowStockAlerts: Number(r.data.lowStockAlerts)||0 }); } catch {}
    };
    f(); const iv = setInterval(f, 10000); return () => clearInterval(iv);
  }, []);

  React.useEffect(() => {
    let alive = true;
    const ping = async () => {
      try { const s = performance.now(); await fetch('/api/scan/ping', { cache: 'no-cache' }); const l = Math.round(performance.now() - s); if (alive) setLatencyHistory(p => [...p.slice(1), l]); }
      catch { if (alive) setLatencyHistory(p => [...p.slice(1), 999]); }
    };
    ping(); const iv = setInterval(ping, 1500); return () => { alive = false; clearInterval(iv); };
  }, []);

  React.useEffect(() => {
    const f = async () => { try { const r = await fetch('/api/predictions/restock'); if (r.ok) setPredictions(await r.json()); } catch {} };
    f(); const iv = setInterval(f, 30000); return () => clearInterval(iv);
  }, []);

  React.useEffect(() => {
    const h = (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleBatchStockIn(); };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [scans]);

  const generateLatencyPath = () => {
    const step = 100 / (latencyHistory.length - 1);
    return latencyHistory.map((l, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${100 - (Math.min(l, 300) / 300) * 60 - 20}`).join(' ');
  };

  const sortedScans = [...scans]
    .filter(s => statusFilter === 'All' || s.status === statusFilter)
    .sort((a, b) => { if (!sortColumn) return 0; return (sortDirection === 'asc' ? 1 : -1) * (a[sortColumn]||'').localeCompare(b[sortColumn]||''); });

  const handleDeleteScan = id => setScans && setScans(p => p.filter(s => s.id !== id));

  const handleStockIn = async (id) => {
    try { const r = await axios.post('/api/products/batch-inbound', [id]); if (r.data?.success) setScans && setScans(p => p.map(s => s.id === id ? {...s, status:'Stocked'} : s)); else alert(t('errorStockIn')||'入库失败'); }
    catch { alert(t('errorConnection')||'网络错误'); }
  };

  const handleBatchStockIn = async () => {
    const ids = scans.filter(s => s.status !== 'Stocked').map(s => s.id);
    if (!ids.length) return alert(t('noPendingScans')||'没有待处理的扫描');
    try { const r = await axios.post('/api/products/batch-inbound', ids); if (r.data?.success) setScans && setScans(p => p.map(s => ids.includes(s.id) ? {...s, status:'Stocked'} : s)); else alert(t('errorStockIn')||'批量入库失败'); }
    catch { alert(t('errorConnection')||'网络错误'); }
  };

  const handleClearScans = () => { if (window.confirm(t('confirmClearScans')||'确定要清空所有扫描记录吗？')) setScans && setScans([]); };

  const handleExecuteOrder = async (skuCode) => {
    try { alert(t('reorderCreated')); setPredictions(p => p.filter(x => x.skuCode !== skuCode)); } catch {}
  };

  const navItems = [
    { id: 'dashboard', icon: 'dashboard', label: t('dashboard') },
    { id: 'catalog', icon: 'inventory_2', label: t('productCatalog') },
    { id: 'inbound', icon: 'login', label: t('inboundLogistics') },
    { id: 'outbound', icon: 'logout', label: t('outboundLogistics') },
    { id: 'finance', icon: 'account_balance_wallet', label: t('financialLedger') },
  ];

  const viewLabel = navItems.find(n => n.id === currentView)?.label || t('dashboard');

  const renderContent = () => {
    if (currentView === 'catalog') return <ProductCatalog />;
    if (currentView === 'outbound') return <OutboundManagement />;
    if (currentView === 'finance') return <FinanceManagement />;
    if (currentView === 'inbound') return <InboundManagement />;

    return (
      <div className="dashboard-content">
        {/* Hero */}
        <div className="dashboard-hero flex justify-between items-end">
          <div className="flex flex-col justify-end pb-2">
            <span style={{ marginBottom: 12, color: 'var(--ref-muted, #8a918b)', fontSize: '0.65rem', letterSpacing: '0.14em', fontWeight: 700, textTransform: 'uppercase' }}>
              WORKSPACE / INVENTORY OVERVIEW
            </span>
            <h1 className="font-black" style={{ margin: 0, fontSize: 'clamp(2rem, 4vw, 3.5rem)', letterSpacing: '-0.09em', color: 'var(--ref-ink, #18231d)', lineHeight: 1 }}>
              {t('inventoryOverview')}
            </h1>
          </div>
          <div className="dashboard-hero-meta flex">
            <div className="dashboard-live-indicator flex items-center gap-3 px-5 py-3 rounded-xl">
              <span className={`material-symbols-outlined text-base ${connectionStatus==='ACTIVE'?'text-[#bcf540]':'text-zinc-400'}`}>wifi_tethering</span>
              <div>
                <p className="text-[0.65rem] font-bold tracking-[0.12em] uppercase text-zinc-400" style={{marginBottom:2}}>{t('liveSync')}</p>
                <span className="text-[0.65rem] font-bold tracking-[0.12em] uppercase">{connectionStatus}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Metric Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
          <div className="metric-card metric-card--sku">
            <div>
              <h3 className="text-[0.65rem] font-bold tracking-[0.12em] uppercase">{t('totalActiveSKUs')}</h3>
            </div>
            <div>
              <p>{stats.totalActiveSKUs.toLocaleString()}</p>
            </div>
          </div>
          <div className="metric-card metric-card--scans">
            <div>
              <h3 className="text-[0.65rem] font-bold tracking-[0.12em] uppercase">{t('scansToday')}</h3>
            </div>
            <div>
              <p>{stats.scansToday.toLocaleString()}</p>
            </div>
          </div>
          <div className="metric-card metric-card--alerts" onClick={() => predictions.length > 0 && setShowPredictionsModal(true)} style={{cursor: predictions.length > 0 ? 'pointer' : 'default'}}>
            <div>
              <h3 className="text-[0.65rem] font-bold tracking-[0.12em] uppercase">{t('lowStockAlerts')}</h3>
            </div>
            <div>
              <p>{stats.lowStockAlerts}</p>
            </div>
          </div>
        </section>

        {/* Lower panels */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6" style={{paddingTop: '28px'}}>
          {/* Activity Panel */}
          <div className="activity-panel xl:col-span-2 flex flex-col" style={{maxHeight:480}}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-[0.65rem] font-bold tracking-[0.12em] uppercase" style={{color:'var(--ref-muted,#8a918b)'}}>{t('recentScanningActivity')}</h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{background:'rgba(197,255,74,0.18)',color:'#3a5c00'}}>
                  {scans.filter(s=>s.status!=='Stocked').length} PENDING
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleClearScans} className="text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1 transition-colors hover:bg-black/5" style={{color:'var(--ref-muted, #8a918b)'}}>
                  <span className="material-symbols-outlined" style={{fontSize:14}}>delete</span> Clear
                </button>
                <button onClick={handleBatchStockIn} className="text-xs font-bold px-4 py-1.5 rounded-full flex items-center gap-1.5 transition-colors hover:bg-black/5" style={{border:'1px solid var(--ref-line, #e5e9e4)', color:'var(--ref-ink, #18231d)'}}>
                  <span className="material-symbols-outlined" style={{fontSize:14}}>inventory</span>
                  {t('batchStockIn')}
                </button>
                <button onClick={() => setStatusFilter(p => p==='All'?'Verified':'All')} className="text-xs p-1.5 rounded-full transition-colors hover:bg-black/5" style={{border:'1px solid var(--ref-line, #e5e9e4)', color:'var(--ref-ink, #18231d)'}}>
                  <span className="material-symbols-outlined" style={{fontSize:14}}>{statusFilter==='All'?'filter_list':'expand_more'}</span>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left" style={{minWidth:560}}>
                <thead><tr>
                  <th className="px-6 py-3.5 text-xs font-bold tracking-widest uppercase border-b border-[var(--ref-line,#e5e9e4)]">{t('productName')}</th>
                  <th className="px-6 py-3.5 text-xs font-bold tracking-widest uppercase border-b border-[var(--ref-line,#e5e9e4)]">{t('skuId')}</th>
                  <th className="px-6 py-3.5 text-xs font-bold tracking-widest uppercase border-b border-[var(--ref-line,#e5e9e4)]">{t('timestamp')}</th>
                  <th className="px-6 py-3.5 text-xs font-bold tracking-widest uppercase border-b border-[var(--ref-line,#e5e9e4)]">{t('relayStatus')}</th>
                  <th className="px-6 py-3.5 text-xs font-bold tracking-widest uppercase text-right border-b border-[var(--ref-line,#e5e9e4)]">ACTION</th>
                </tr></thead>
                <tbody>
                  {sortedScans.map((scan,i) => (
                    <tr key={i} className="group transition-colors">
                      <td className="px-6 py-3.5 text-sm font-semibold border-b border-[var(--ref-line,#e5e9e4)]">{scan.name||'—'}</td>
                      <td className="px-6 py-3.5 text-xs font-mono border-b border-[var(--ref-line,#e5e9e4)]" style={{color:'var(--ref-muted,#8a918b)'}}>{scan.id}</td>
                      <td className="px-6 py-3.5 text-xs font-mono border-b border-[var(--ref-line,#e5e9e4)]" style={{color:'var(--ref-muted,#8a918b)'}}>{scan.time}</td>
                      <td className="px-6 py-3.5 border-b border-[var(--ref-line,#e5e9e4)]">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase"
                          style={scan.status==='Verified'?{background:'rgba(197,255,74,0.18)',color:'#3a5c00'}:{background:'rgba(0,0,0,0.05)',color:'#77727c'}}>
                          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{background:scan.status==='Verified'?'#6aaa00':'#aaa'}}></span>
                          {scan.status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right border-b border-[var(--ref-line,#e5e9e4)]">
                        <div className="flex justify-end items-center gap-2">
                          {scan.status!=='Stocked' && (
                            <button onClick={()=>handleStockIn(scan.id)} className="text-[11px] font-bold tracking-wide uppercase px-3 py-1.5 rounded-full transition-colors hover:bg-black/5" style={{border:'1px solid var(--ref-line,#e5e9e4)', color:'var(--ref-ink,#18231d)'}}>
                              Stock In
                            </button>
                          )}
                          <button onClick={()=>handleDeleteScan(scan.id)} className="p-1 rounded-full flex items-center justify-center transition-colors hover:bg-red-50 hover:text-red-600 hover:border-red-200" style={{border:'1px solid var(--ref-line,#e5e9e4)', color:'var(--ref-muted,#8a918b)'}}>
                            <span className="material-symbols-outlined" style={{fontSize:14}}>close</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {sortedScans.length===0 && (
                    <tr><td colSpan="5" className="text-center py-16 text-sm">{t('noPendingScans')||'No records found'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-6">
            {/* Health Panel */}
            <div className="health-panel flex flex-col gap-4">
              <h3 className="text-[0.65rem] font-bold tracking-[0.12em] uppercase" style={{ color: 'rgba(255, 255, 255, 0.65)' }}>{t('systemHealth')}</h3>
              <div className="flex flex-col gap-2">
                {[
                  { label: 'Scanner Relay', sub: 'Node Active' },
                  { label: 'WSS Bridge', sub: 'Socket Connected' },
                  { label: 'Database', sub: 'Local Cache' },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center p-3 rounded-xl">
                    <div>
                      <p className="text-[0.65rem] font-bold tracking-[0.12em] uppercase" style={{ marginBottom:2, color: '#ffffff' }}>{item.label}</p>
                      <p className="text-[11px]" style={{ color: 'rgba(255, 255, 255, 0.65)' }}>{item.sub}</p>
                    </div>
                    <span className="text-xs font-bold tracking-widest px-2 py-0.5 rounded-full"
                      style={i<2 ? (connectionStatus==='ACTIVE'?{background:'rgba(197,255,74,0.18)',color:'#3a5c00'}:{background:'rgba(0,0,0,0.08)',color:'#77727c'}) : {background:'rgba(0,0,0,0.06)',color:'#77727c'}}>
                      {i<2 ? connectionStatus : 'SYNCED'}
                    </span>
                  </div>
                ))}
              </div>
              {/* Ping chart */}
              <div className="relative rounded-xl overflow-hidden mt-2" style={{height:68,background:'rgba(0,0,0,0.1)'}}>
                <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                  <path d={`${generateLatencyPath()} L 100 100 L 0 100 Z`} fill="rgba(197,255,74,0.15)"/>
                  <path d={generateLatencyPath()} fill="none" stroke="rgba(197,255,74,0.6)" strokeWidth="1.5"/>
                </svg>
                <article className="absolute top-3 left-4">
                  <p className="text-[0.65rem] font-bold tracking-[0.12em] uppercase" style={{fontSize:'0.55rem', marginBottom:2, color:'rgba(255, 255, 255, 0.65)'}}>{t('networkLatency')}</p>
                  <span className="text-sm font-mono" style={{ color: '#ffffff' }}>{latencyHistory[latencyHistory.length-1]}<span className="text-xs ml-0.5">ms</span></span>
                </article>
              </div>
            </div>

            {/* Restock Panel */}
            <div className="restock-panel relative rounded-3xl p-6 flex-1 cursor-pointer" onClick={() => setShowPredictionsModal(true)}>
              <div style={{position:'relative',zIndex:1}}>
                <h3 className="text-[0.65rem] font-bold tracking-[0.12em] uppercase" style={{ color: 'rgba(255, 255, 255, 0.65)' }}>{predictions.length > 0 ? `${predictions.length} ${t('itemsNeedReview')}` : t('predictiveRestock')}</h3>
                <p className="mt-2 text-sm" style={{ color: '#ffffff' }}>{t('predictiveDesc')}</p>
                <div className="flex items-center gap-1 mt-4 text-xs font-bold" style={{ color: '#bcf540' }}>
                  Review Engine <span className="material-symbols-outlined" style={{fontSize:14}}>arrow_forward</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  };

  return (
    <div className="dashboard-app">
      {/* Sidebar — CSS clinic theme handles styling */}
      <aside className="dashboard-sidebar">
        <div>
          <div className="brand-lockup">
            <div onClick={() => handleViewChange('dashboard')}>
              <div></div>
            </div>
            <div>
              <h2>SpeedWMS</h2>
              <p>{t('predictiveLogistics')}</p>
            </div>
          </div>

          <nav>
            {navItems.map(nav => (
              <button key={nav.id} onClick={() => handleViewChange(nav.id)} title={nav.label}
                className={currentView===nav.id ? 'bcf540' : ''}>
                <span className="material-symbols-outlined">{nav.icon}</span>
                <span>{nav.label}</span>
              </button>
            ))}
          </nav>
        </div>


      </aside>

      {/* Main Container */}
      <main>
        {/* Topbar */}
        <header className="dashboard-topbar flex items-center justify-between relative" style={{zIndex: 50}}>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-base" style={{color:'var(--muted)'}}>home</span>
            <span style={{color:'var(--muted)'}}>/</span>
            <span style={{fontWeight:600}}>{viewLabel}</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex rounded-xl overflow-hidden" style={{background:'var(--ref-surface-2, rgba(24,23,28,0.06))',padding:3}}>
              {['en','zh','ja'].map(lang => (
                <button key={lang} onClick={() => setLanguage(lang)}
                  className="text-xs font-bold uppercase px-3 py-1 rounded-lg transition-all"
                  style={language===lang ? {background:'var(--ink)',color:'var(--acid)'} : {color:'var(--muted)'}}>
                  {lang}
                </button>
              ))}
            </div>

            <div style={{width:1,height:20,background:'var(--line)'}}></div>

            <div className="relative" onMouseEnter={() => setShowUserMenu(true)} onMouseLeave={() => setShowUserMenu(false)}>
              <button className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{background:'transparent'}}>
                <div style={{width:28,height:28,borderRadius:'50%',background:'var(--ref-surface-2, rgba(24,23,28,0.1))',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
                  {userProfile.avatarUrl
                    ? <img src={userProfile.avatarUrl} alt="avatar" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                    : <span className="material-symbols-outlined" style={{fontSize:16,color:'var(--muted)'}}>person</span>}
                </div>
                <span className="text-sm font-semibold">{userProfile.displayName||userProfile.username}</span>
                <span className="material-symbols-outlined" style={{fontSize:16,color:'var(--muted)',transform:showUserMenu?'rotate(180deg)':'none',transition:'transform 0.2s'}}>expand_more</span>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-3 rounded-2xl py-1 z-50 overflow-hidden" style={{minWidth:220, width:'max-content', background:'var(--ref-surface-2, #ffffff)',border:'1px solid var(--ref-line, #e5e9e4)',boxShadow:'0 12px 40px rgba(0,0,0,0.08)'}}>
                  <div style={{padding:'12px 14px 10px',borderBottom:'1px solid var(--ref-line, #e5e9e4)',marginBottom:4}}>
                    <p style={{fontSize:'0.65rem',color:'var(--ref-muted, #8a918b)',fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase'}}>{t('userProfile')}</p>
                    <p style={{fontSize:'0.85rem',fontWeight:600,color:'var(--ref-ink, #18231d)',marginTop:2}}>{userProfile.username}</p>
                  </div>
                  {[
                    { icon:'barcode_scanner', label:t('openScanner')||'Scanner', action:()=>navigate('/scanner') },
                    { icon:'settings', label:t('editAdmin')||'Settings', action:()=>{setShowAdminSettings(true);setShowUserMenu(false);} },
                  ].map((item,i) => (
                    <button key={i} onClick={item.action} className="w-full flex items-center gap-3 text-sm font-medium text-left px-4 py-2.5 transition-colors" style={{color:'var(--ref-ink, #18231d)', whiteSpace:'nowrap'}} onMouseEnter={(e)=>e.currentTarget.style.background='rgba(0,0,0,0.04)'} onMouseLeave={(e)=>e.currentTarget.style.background='transparent'}>
                      <span className="material-symbols-outlined" style={{fontSize:16}}>{item.icon}</span> {item.label}
                    </button>
                  ))}
                  <div style={{height:1,background:'var(--ref-line, #e5e9e4)',margin:'4px 0'}}></div>
                  <button onClick={() => { localStorage.removeItem('wms_token'); localStorage.removeItem('wms_username'); navigate('/login'); }}
                    className="w-full flex items-center gap-3 text-sm font-medium text-left px-4 py-2.5 transition-colors" style={{color:'#d93025', whiteSpace:'nowrap'}} onMouseEnter={(e)=>e.currentTarget.style.background='rgba(217,48,37,0.06)'} onMouseLeave={(e)=>e.currentTarget.style.background='transparent'}>
                    <span className="material-symbols-outlined" style={{fontSize:16}}>logout</span> {t('logout')||'Sign Out'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content scrolls within main */}
        <div style={{flex:1, overflowY:'auto', overflowX:'hidden'}}>
          {renderContent()}
        </div>
      </main>

      <ScanQrModal isOpen={showQr} onClose={() => setShowQr(false)} />
      <AdminSettingsModal isOpen={showAdminSettings} onClose={() => setShowAdminSettings(false)} />

      {/* Predictions Modal */}
      {showPredictionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(18,17,23,0.62)',backdropFilter:'blur(8px)'}}>
          <div style={{background:'var(--paper-bright)',border:'1px solid var(--line)',borderRadius:24,padding:32,maxWidth:720,width:'100%',maxHeight:'85vh',display:'flex',flexDirection:'column',boxShadow:'0 30px 100px rgba(0,0,0,0.24)'}}>
            <div className="flex justify-between items-center pb-4 mb-4" style={{borderBottom:'1px solid var(--line)'}}>
              <h2 className="text-lg font-semibold">{t('predictiveRestock')}</h2>
              <button onClick={() => setShowPredictionsModal(false)} style={{background:'transparent',border:'none',cursor:'pointer',color:'var(--muted)'}}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {predictions.length===0
                ? <div className="text-center py-16" style={{color:'var(--muted)'}}><p className="text-sm">All stock levels are healthy.</p></div>
                : <div className="flex flex-col gap-3">
                  {predictions.map((p,i) => (
                    <div key={i} className="flex flex-col md:flex-row gap-4 justify-between" style={{background:'rgba(24,23,28,0.04)',borderRadius:16,padding:20,border:'1px solid var(--line)'}}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={p.urgency==='High'?{background:'rgba(255,121,85,0.15)',color:'#c0392b'}:p.urgency==='Medium'?{background:'rgba(255,193,7,0.15)',color:'#7a5c00'}:{background:'rgba(52,152,219,0.15)',color:'#1a5276'}}>
                            {p.urgency||'Low'}
                          </span>
                          <span className="text-xs font-mono" style={{color:'var(--muted)'}}>{p.skuCode}</span>
                          <h4 className="text-sm font-semibold">{p.name}</h4>
                        </div>
                        <p className="text-xs" style={{color:'var(--muted)'}}>{p.reason}</p>
                        <div className="flex gap-6 mt-3">
                          {[{l:t('current'),v:p.currentStock},{l:t('reorderPoint'),v:p.reorderPoint||p.safetyStock}].map((d,j)=>(
                            <div key={j}><p className="text-xs font-bold uppercase tracking-wider" style={{color:'var(--muted)',fontSize:'0.6rem'}}>{d.l}</p><span className="text-sm font-mono">{d.v}</span></div>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <div className="text-right">
                          <p className="text-xs font-bold uppercase tracking-wider" style={{color:'var(--muted)',fontSize:'0.6rem'}}>{t('suggestedQuantity')}</p>
                          <span className="text-2xl font-bold font-mono">{p.suggestedOrderQuantity}</span>
                          <span className="text-xs ml-1" style={{color:'var(--muted)'}}>{t('units')}</span>
                        </div>
                        <button onClick={() => handleExecuteOrder(p.skuCode)} className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full" style={{background:'var(--ink)',color:'var(--paper-bright)'}}>
                          <span className="material-symbols-outlined" style={{fontSize:14}}>shopping_cart_checkout</span>
                          {t('executeOrder')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              }
            </div>
          </div>
        </div>
      )}

      {/* Floating QR Scanner Button */}
      <button 
        onClick={() => setShowQr(true)} 
        title={t('newScan')}
        className="fixed bottom-10 right-10 w-[60px] h-[60px] rounded-full flex items-center justify-center shadow-[0_12px_40px_rgba(188,245,64,0.4)] hover:scale-105 active:scale-95 transition-all z-[100] border border-[rgba(0,0,0,0.05)]"
        style={{ background: 'var(--ref-lime, #bcf540)', color: 'var(--ref-green, #1a2e05)' }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 26 }}>qr_code_scanner</span>
      </button>
    </div>
  );
}

export default PcDashboard;
