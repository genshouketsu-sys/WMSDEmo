import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from '../i18n/LanguageContext';

function InboundManagement() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newOrder, setNewOrder] = useState({ orderNum: '', inType: 'Purchase', supplierName: '', remark: '' });

  const fetchOrders = async () => {
    try {
      const response = await axios.get('/api/inbound/list');
      setOrders(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch inbound orders:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/inbound/create', { ...newOrder, createUser: 'admin' });
      setShowModal(false);
      setNewOrder({ orderNum: '', inType: 'Purchase', supplierName: '', remark: '' });
      fetchOrders();
    } catch (error) {
      alert("Failed to create order: " + (error.response?.data?.message || error.message));
    }
  };

  const handleAudit = async (id) => {
    try {
      await axios.post(`/api/inbound/audit/${id}`);
      fetchOrders();
    } catch (error) {
      alert("Failed to audit order");
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500 font-['Space_Grotesk']">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 mt-8">
        <div className="space-y-2">
          <h1 className="font-h1 text-h1 text-primary">{t('inboundLogistics')}</h1>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#bcf540] rounded-full animate-pulse"></div>
            <p className="text-on-surface-variant font-body-lg">{t('inboundDesc')}</p>
          </div>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="h-[44px] px-8 rounded-sm bg-[#bcf540] text-black font-black text-xs uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-[0_0_30px_rgba(188,245,64,0.2)]"
        >
          {t('createInbound')}
        </button>
      </section>

      <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#0c0f0f]/50 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-8 py-5 text-left">{t('protocolId')}</th>
                <th className="px-8 py-5 text-left">{t('sourceType')}</th>
                <th className="px-8 py-5 text-left">{t('supplierEntity')}</th>
                <th className="px-8 py-5 text-left">{t('syncStatus')}</th>
                <th className="px-8 py-5 text-left">{t('execution')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(Array.isArray(orders) ? orders : []).map((order) => (
                <tr key={order.id} className="hover:bg-white/5 transition-colors group h-[72px]">
                  <td className="px-8 py-5 font-black text-white text-sm tracking-tighter uppercase group-hover:text-[#bcf540] transition-colors">{order.orderNum}</td>
                  <td className="px-8 py-5">
                    <span className="text-[10px] font-bold text-zinc-500 border border-white/10 px-2 py-0.5 rounded-full">{order.inType}</span>
                  </td>
                  <td className="px-8 py-5 text-zinc-300 text-sm font-medium">{order.supplierName}</td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${order.status === 'Audited' ? 'bg-[#bcf540]' : 'bg-zinc-700'}`}></div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${
                        order.status === 'Audited' ? 'text-[#bcf540]' : 'text-zinc-500'
                        }`}>
                        {order.status}
                        </span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    {order.status === 'Pending' ? (
                      <button 
                        onClick={() => handleAudit(order.id)}
                        className="text-[10px] font-black text-[#bcf540] hover:underline uppercase tracking-widest border border-[#bcf540]/30 px-3 py-1 rounded-sm hover:bg-[#bcf540]/10 transition-all"
                      >
                        {t('authorize')}
                      </button>
                    ) : (
                        <span className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest">LOCKED</span>
                    )}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && !loading && (
                <tr><td colSpan="5" className="px-8 py-20 text-center text-zinc-700 uppercase tracking-[0.5em] text-[10px] font-black">No Active Protocols</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
          <div className="w-full max-w-lg bg-[#121414] border border-[#bcf540]/30 p-10 rounded-sm shadow-[0_0_100px_rgba(0,0,0,0.5)]">
            <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-8 flex items-center gap-3">
                <span className="w-2 h-8 bg-[#bcf540]"></span>
                {t('createInbound')}
            </h2>
            <form onSubmit={handleCreate} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{t('protocolId')}</label>
                <input 
                  required
                  className="w-full bg-white/5 border-0 border-b-2 border-white/10 p-4 text-white focus:border-[#bcf540] outline-none transition-all font-mono"
                  placeholder="PO-XXXXX"
                  value={newOrder.orderNum}
                  onChange={(e) => setNewOrder({...newOrder, orderNum: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{t('sourceType')}</label>
                    <select 
                        className="w-full bg-white/5 border-0 border-b-2 border-white/10 p-4 text-white focus:border-[#bcf540] outline-none transition-all"
                        value={newOrder.inType}
                        onChange={(e) => setNewOrder({...newOrder, inType: e.target.value})}
                    >
                        <option value="Purchase" className="bg-[#121414]">Purchase</option>
                        <option value="Return" className="bg-[#121414]">Return</option>
                        <option value="Internal" className="bg-[#121414]">Internal</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{t('supplierEntity')}</label>
                    <input 
                        required
                        className="w-full bg-white/5 border-0 border-b-2 border-white/10 p-4 text-white focus:border-[#bcf540] outline-none transition-all"
                        placeholder="Supplier Name"
                        value={newOrder.supplierName}
                        onChange={(e) => setNewOrder({...newOrder, supplierName: e.target.value})}
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

export default InboundManagement;
