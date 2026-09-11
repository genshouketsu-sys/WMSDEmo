import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from '../i18n/LanguageContext';

function OutboundManagement() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newOrder, setNewOrder] = useState({ orderNum: '', outType: 'Sale', customerName: '', remark: '' });

  const fetchOrders = async () => {
    try {
      const response = await axios.get('/api/outbound/list');
      setOrders(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch outbound orders:", error);
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('confirmDelete') || "Are you sure you want to delete this order?")) return;
    try {
      await axios.delete(`/api/outbound/${id}`);
      fetchOrders();
    } catch (error) {
      alert("Failed to delete order");
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/outbound/create', { ...newOrder, createUser: 'admin' });
      setShowModal(false);
      setNewOrder({ orderNum: '', outType: 'Sale', customerName: '', remark: '' });
      fetchOrders();
    } catch (error) {
      alert("Failed to create order: " + (error.response?.data?.message || error.message));
    }
  };

  const handleAudit = async (id) => {
    try {
      await axios.post(`/api/outbound/audit/${id}`);
      fetchOrders();
    } catch (error) {
      alert("Failed to audit order");
    }
  };

  return (
    <div className="management-page outbound-page p-8 max-w-7xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500 font-['Space_Grotesk']">
      <section className="management-header flex flex-col md:flex-row md:items-end justify-between gap-4 mt-8">
        <div className="space-y-2">
          <h1 className="font-h1 text-h1 text-primary">{t('outboundLogistics')}</h1>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#bcf540] rounded-full animate-pulse"></div>
            <p className="text-on-surface-variant font-body-lg">{t('outboundDesc')}</p>
          </div>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="h-[44px] px-8 rounded-sm bg-[#bcf540] text-black font-black text-xs uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-[0_0_30px_rgba(188,245,64,0.2)]"
        >
          {t('initializeDispatch')}
        </button>
      </section>

      <div className="management-table-panel bg-white/5 backdrop-blur-md rounded-xl border border-white/10 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left border-collapse">
            <thead className="bg-[#0c0f0f]/50 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-8 py-5 text-left">{t('dispatchId')}</th>
                <th className="px-8 py-5 text-left">{t('targetClass')}</th>
                <th className="px-8 py-5 text-left">{t('customerEntity')}</th>
                <th className="px-8 py-5 text-left">{t('auditStatus')}</th>
                <th className="px-8 py-5 text-left">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(Array.isArray(orders) ? orders : []).map((order) => (
                <tr key={order.id} className="hover:bg-white/5 transition-colors group h-[72px]">
                  <td className="px-8 py-5 font-black text-white text-sm tracking-tighter uppercase group-hover:text-[#bcf540] transition-colors">{order.orderNum}</td>
                  <td className="px-8 py-5">
                    <span className="text-[10px] font-bold text-zinc-500 border border-white/10 px-2 py-0.5 rounded-full">{order.outType === 'Sale' ? t('sale') : order.outType === 'Sample' ? t('sample') : order.outType === 'RMA' ? t('rma') : order.outType}</span>
                  </td>
                  <td className="px-8 py-5 text-zinc-300 text-sm font-medium">{order.customerName}</td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${order.status === 'Audited' ? 'bg-[#bcf540]' : 'bg-zinc-700'}`}></div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${
                        order.status === 'Audited' ? 'text-[#bcf540]' : 'text-zinc-500'
                        }`}>
                        {order.status === 'Audited' ? t('approved') : order.status === 'Pending' ? t('pending') : order.status}
                        </span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      {order.status === 'Pending' ? (
                        <button 
                          onClick={() => handleAudit(order.id)}
                          className="text-[10px] font-black text-[#bcf540] hover:underline uppercase tracking-widest border border-[#bcf540]/30 px-3 py-1 rounded-sm hover:bg-[#bcf540]/10 transition-all"
                        >
                          {t('authorize')}
                        </button>
                      ) : (
                          <span className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest">{t('completed')}</span>
                      )}
                      <button 
                        onClick={() => handleDelete(order.id)}
                        className="text-zinc-600 hover:text-red-500 transition-colors p-1"
                        title={t('delete')}
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && !loading && (
                <tr><td colSpan="5" className="px-8 py-20 text-center text-zinc-700 uppercase tracking-[0.5em] text-[10px] font-black">{t('noDispatches')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="management-modal fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
          <div className="w-full max-w-lg bg-[#121414] border border-[#bcf540]/30 p-10 rounded-sm shadow-[0_0_100px_rgba(0,0,0,0.5)]">
            <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-8 flex items-center gap-3">
                <span className="w-2 h-8 bg-[#bcf540]"></span>
                {t('initializeDispatch')}
            </h2>
            <form onSubmit={handleCreate} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{t('dispatchId')}</label>
                <input 
                  required
                  className="w-full bg-white/5 border-0 border-b-2 border-white/10 p-4 text-white focus:border-[#bcf540] outline-none transition-all font-mono"
                  placeholder="SO-XXXXX"
                  value={newOrder.orderNum}
                  onChange={(e) => setNewOrder({...newOrder, orderNum: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{t('targetClass')}</label>
                    <select 
                        className="w-full bg-white/5 border-0 border-b-2 border-white/10 p-4 text-white focus:border-[#bcf540] outline-none transition-all"
                        value={newOrder.outType}
                        onChange={(e) => setNewOrder({...newOrder, outType: e.target.value})}
                    >
                        <option value="Sale" className="bg-[#121414]">{t('sale')}</option>
                        <option value="Sample" className="bg-[#121414]">{t('sample')}</option>
                        <option value="RMA" className="bg-[#121414]">{t('rma')}</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{t('customerEntity')}</label>
                    <input 
                        required
                        className="w-full bg-white/5 border-0 border-b-2 border-white/10 p-4 text-white focus:border-[#bcf540] outline-none transition-all"
                        placeholder="Customer Name"
                        value={newOrder.customerName}
                        onChange={(e) => setNewOrder({...newOrder, customerName: e.target.value})}
                    />
                </div>
              </div>
              <div className="pt-6 flex gap-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 text-zinc-500 font-black uppercase text-xs tracking-widest hover:text-white transition-colors">{t('abort')}</button>
                <button type="submit" className="flex-1 py-4 bg-[#bcf540] text-black font-black uppercase text-xs tracking-widest hover:brightness-110 active:scale-95 transition-all">{t('initialize')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default OutboundManagement;
