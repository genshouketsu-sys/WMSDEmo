import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from '../i18n/LanguageContext';

function FinanceManagement() {
  const { t } = useTranslation();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newBill, setNewBill] = useState({ billNum: '', billType: 'Payable', amount: '', relatedOrder: '', remark: '' });

  const fetchBills = async () => {
    try {
      const response = await axios.get('/api/finance/bills');
      setBills(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch bills:", error);
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('confirmDelete') || "Delete this transaction?")) return;
    try {
      await axios.delete(`/api/finance/${id}`);
      fetchBills();
    } catch (error) {
      alert("Failed to delete transaction");
    }
  };

  useEffect(() => {
    fetchBills();
    const interval = setInterval(fetchBills, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/finance/create', newBill);
      setShowModal(false);
      setNewBill({ billNum: '', billType: 'Payable', amount: '', relatedOrder: '', remark: '' });
      fetchBills();
    } catch (error) {
      alert("Failed to record transaction: " + (error.response?.data?.message || error.message));
    }
  };

  const totals = bills.reduce((acc, bill) => {
    if (bill.billType === 'Payable') acc.payable += bill.amount;
    else acc.receivable += bill.amount;
    return acc;
  }, { payable: 0, receivable: 0 });

  return (
    <div className="management-page finance-page p-8 max-w-7xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500 font-['Space_Grotesk']">
      <section className="management-header flex flex-col md:flex-row md:items-end justify-between gap-4 mt-8">
        <div className="space-y-2">
          <h1 className="font-h1 text-h1 text-primary">{t('financialLedger')}</h1>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#bcf540] rounded-full animate-pulse"></div>
            <p className="text-on-surface-variant font-body-lg">{t('financeDesc')}</p>
          </div>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="h-[44px] px-8 rounded-sm bg-[#bcf540] text-black font-black text-xs uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-[0_0_30px_rgba(188,245,64,0.2)]"
        >
          {t('addTransaction')}
        </button>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="finance-stat-card bg-surface-container-high border border-white/5 p-8 rounded-xl shadow-sm">
          <p className="font-label-sm text-zinc-500 uppercase mb-4">{t('totalLiquidity')}</p>
          <h3 className="font-h2 text-h2 text-primary">¥ {(totals.receivable - totals.payable).toLocaleString()}</h3>
          <div className="mt-4 h-1 w-full bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-[#bcf540]" style={{width: '65%'}}></div></div>
        </div>
        <div className="finance-stat-card bg-surface-container-high border border-white/5 p-8 rounded-xl shadow-sm">
          <p className="font-label-sm text-zinc-500 uppercase mb-4">{t('accountReceivables')}</p>
          <h3 className="font-h2 text-h2 text-[#bcf540]">¥ {totals.receivable.toLocaleString()}</h3>
          <p className="text-[10px] text-zinc-600 mt-2 font-bold uppercase tracking-widest">{t('awaitingUpdate')}</p>
        </div>
        <div className="finance-stat-card bg-surface-container-high border border-white/5 p-8 rounded-xl shadow-sm">
          <p className="font-label-sm text-zinc-500 uppercase mb-4">{t('accountPayables')}</p>
          <h3 className="font-h2 text-h2 text-red-500">¥ {totals.payable.toLocaleString()}</h3>
          <p className="text-[10px] text-zinc-600 mt-2 font-bold uppercase tracking-widest">{t('outstandingPayables')}</p>
        </div>
      </div>

      <div className="management-table-panel bg-white/5 backdrop-blur-md rounded-xl border border-white/10 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left border-collapse">
            <thead className="bg-[#0c0f0f]/50 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-8 py-5 text-left">{t('txIdentifier')}</th>
                <th className="px-8 py-5 text-left">{t('category')}</th>
                <th className="px-8 py-5 text-left">{t('protocolRef')}</th>
                <th className="px-8 py-5 text-left">{t('netValue')}</th>
                <th className="px-8 py-5 text-left">{t('state')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(Array.isArray(bills) ? bills : []).map((bill) => (
                <tr key={bill.id} className="hover:bg-white/5 transition-colors group h-[72px]">
                  <td className="px-8 py-5 font-black text-white text-sm tracking-tighter uppercase group-hover:text-[#bcf540] transition-colors">{bill.billNum}</td>
                  <td className="px-8 py-5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      bill.billType === 'Payable' ? 'text-red-500 border border-red-500/20' : 'text-[#bcf540] border border-[#bcf540]/20'
                    }`}>
                      {bill.billType === 'Payable' ? t('payable') : bill.billType === 'Receivable' ? t('receivable') : bill.billType}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-zinc-400 text-sm font-mono uppercase">{bill.relatedOrder || t('notAvailable')}</td>
                  <td className={`px-8 py-5 font-black text-sm ${bill.billType === 'Payable' ? 'text-red-500' : 'text-[#bcf540]'}`}>
                    {bill.billType === 'Payable' ? '-' : '+'} ¥ {bill.amount.toLocaleString()}
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 border border-white/10 px-2 py-1 rounded-sm">
                          {bill.status === 'Pending' ? t('pending') : bill.status === 'Completed' ? t('completed') : bill.status}
                      </span>
                      <button 
                        onClick={() => handleDelete(bill.id)}
                        className="text-zinc-600 hover:text-red-500 transition-colors p-1"
                        title={t('delete')}
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {bills.length === 0 && !loading && (
                <tr><td colSpan="5" className="px-8 py-20 text-center text-zinc-700 uppercase tracking-[0.5em] text-[10px] font-black">{t('noTransactions')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="management-modal fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
          <div className="w-full max-w-lg bg-[#121414] border border-[#bcf540]/30 p-10 rounded-sm shadow-[0_0_100px_rgba(0,0,0,0.5)]">
            <h2 className="font-h3 text-h3 text-white uppercase mb-8 flex items-center gap-3">
                <span className="w-2 h-8 bg-[#bcf540]"></span>
                {t('recordTxn')}
            </h2>
            <form onSubmit={handleCreate} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{t('txIdentifier')}</label>
                <input 
                  required
                  className="w-full bg-white/5 border-0 border-b-2 border-white/10 p-4 text-white focus:border-[#bcf540] outline-none transition-all font-mono"
                  placeholder="TXN-XXXXX"
                  value={newBill.billNum}
                  onChange={(e) => setNewBill({...newBill, billNum: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{t('category')}</label>
                    <select 
                        className="w-full bg-white/5 border-0 border-b-2 border-white/10 p-4 text-white focus:border-[#bcf540] outline-none transition-all"
                        value={newBill.billType}
                        onChange={(e) => setNewBill({...newBill, billType: e.target.value})}
                    >
                        <option value="Payable" className="bg-[#121414]">{t('payable')}</option>
                        <option value="Receivable" className="bg-[#121414]">{t('receivable')}</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{t('amount')} (¥)</label>
                    <input 
                        required
                        type="number"
                        className="w-full bg-white/5 border-0 border-b-2 border-white/10 p-4 text-white focus:border-[#bcf540] outline-none transition-all"
                        placeholder="0.00"
                        value={newBill.amount}
                        onChange={(e) => setNewBill({...newBill, amount: e.target.value})}
                    />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{t('protocolRef')}</label>
                <input 
                  className="w-full bg-white/5 border-0 border-b-2 border-white/10 p-4 text-white focus:border-[#bcf540] outline-none transition-all font-mono"
                  placeholder={t('relatedOrderPlaceholder')}
                  value={newBill.relatedOrder}
                  onChange={(e) => setNewBill({...newBill, relatedOrder: e.target.value})}
                />
              </div>
              <div className="pt-6 flex gap-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 text-zinc-500 font-black uppercase text-xs tracking-widest hover:text-white transition-colors">{t('abort')}</button>
                <button type="submit" className="flex-1 py-4 bg-[#bcf540] text-black font-black uppercase text-xs tracking-widest hover:brightness-110 active:scale-95 transition-all">{t('recordTxn')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default FinanceManagement;
