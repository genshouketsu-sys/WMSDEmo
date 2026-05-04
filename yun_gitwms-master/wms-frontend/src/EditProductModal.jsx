import React, { useState, useEffect } from 'react';
import { useTranslation } from './i18n/LanguageContext';

function EditProductModal({ isOpen, onClose, onEdit, initialData }) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    id: null,
    skuCode: '',
    name: '',
    barcode: '',
    stock: 0,
    dailyUsage: 0.0,
    leadTimeDays: 7,
    safetyStock: 10
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData.id,
        skuCode: initialData.skuCode || '',
        name: initialData.name || '',
        barcode: initialData.barcode || '',
        stock: initialData.stock || 0,
        dailyUsage: initialData.dailyUsage || 0.0,
        leadTimeDays: initialData.leadTimeDays || 7,
        safetyStock: initialData.safetyStock || 10
      });
    }
  }, [initialData]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'stock' || name === 'leadTimeDays' || name === 'safetyStock' 
        ? parseInt(value) || 0 
        : name === 'dailyUsage' 
          ? parseFloat(value) || 0.0 
          : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onEdit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#121414] rounded-2xl border border-white/10 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-300 font-['Space_Grotesk']">
        <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-[#0c0f0f]/50">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span className="material-symbols-outlined text-[#bcf540]">edit_note</span>
            {t('editProduct')}
          </h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/5 text-zinc-500 hover:text-white transition-all"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="skuCode" className="block text-[10px] font-black uppercase tracking-widest text-zinc-500">{t('skuCode')} <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                id="skuCode" 
                name="skuCode" 
                required
                value={formData.skuCode}
                onChange={handleChange}
                className="w-full h-[44px] px-4 bg-zinc-950/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#bcf540]/50 focus:border-[#bcf540] transition-all placeholder:text-zinc-700 text-sm font-medium"
                placeholder="e.g. SKU-10049"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="barcode" className="block text-[10px] font-black uppercase tracking-widest text-zinc-500">{t('barcode')} <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                id="barcode" 
                name="barcode" 
                required
                value={formData.barcode}
                onChange={handleChange}
                className="w-full h-[44px] px-4 bg-zinc-950/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#bcf540]/50 focus:border-[#bcf540] transition-all placeholder:text-zinc-700 text-sm font-mono"
                placeholder="e.g. 4500000000000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="name" className="block text-[10px] font-black uppercase tracking-widest text-zinc-500">{t('productName')} <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              id="name" 
              name="name" 
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full h-[44px] px-4 bg-zinc-950/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#bcf540]/50 focus:border-[#bcf540] transition-all placeholder:text-zinc-700 text-sm font-medium"
              placeholder="e.g. Mechanical Keyboard"
            />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label htmlFor="stock" className="block text-[10px] font-black uppercase tracking-widest text-zinc-500">{t('initialStock')}</label>
              <input 
                type="number" 
                id="stock" 
                name="stock" 
                min="0"
                value={formData.stock}
                onChange={handleChange}
                className="w-full h-[44px] px-4 bg-zinc-950/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#bcf540]/50 focus:border-[#bcf540] transition-all text-sm font-bold"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="dailyUsage" className="block text-[10px] font-black uppercase tracking-widest text-zinc-500">Usage/Day</label>
              <input 
                type="number" 
                id="dailyUsage" 
                name="dailyUsage" 
                step="0.1"
                min="0"
                value={formData.dailyUsage}
                onChange={handleChange}
                className="w-full h-[44px] px-4 bg-zinc-950/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#bcf540]/50 focus:border-[#bcf540] transition-all text-sm font-bold"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="leadTimeDays" className="block text-[10px] font-black uppercase tracking-widest text-zinc-500">Lead(d)</label>
              <input 
                type="number" 
                id="leadTimeDays" 
                name="leadTimeDays" 
                min="0"
                value={formData.leadTimeDays}
                onChange={handleChange}
                className="w-full h-[44px] px-4 bg-zinc-950/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#bcf540]/50 focus:border-[#bcf540] transition-all text-sm font-bold"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="safetyStock" className="block text-[10px] font-black uppercase tracking-widest text-zinc-500">Safety</label>
              <input 
                type="number" 
                id="safetyStock" 
                name="safetyStock" 
                min="0"
                value={formData.safetyStock}
                onChange={handleChange}
                className="w-full h-[44px] px-4 bg-zinc-950/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#bcf540]/50 focus:border-[#bcf540] transition-all text-sm font-bold"
              />
            </div>
          </div>
          
          <div className="pt-6 flex gap-4 justify-end">
            <button 
              type="button" 
              onClick={onClose}
              className="h-[44px] px-6 border border-white/10 rounded-xl text-zinc-400 font-bold text-xs uppercase tracking-widest hover:bg-white/5 hover:text-white transition-all"
            >
              {t('cancel')}
            </button>
            <button 
              type="submit" 
              className="h-[44px] px-8 bg-[#bcf540] text-black rounded-xl font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-[#bcf540]/10 flex items-center gap-2 active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[18px]">save</span>
              {t('updateProduct')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditProductModal;