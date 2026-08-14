import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import AddProductModal from './AddProductModal';
import EditProductModal from './EditProductModal';
import BarcodeLookupModal from './BarcodeLookupModal';
import { useTranslation } from './i18n/LanguageContext';

function ProductCatalog() {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedIds, setSelectedIds] = useState(new Set());
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState(null);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [highlightedBarcode, setHighlightedBarcode] = useState(null);
  const highlightRef = useRef(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/products');

      // 将后端返回的真实数据展示
      const data = response.data;
      const backendData = (Array.isArray(data) ? data : []).map(p => ({
        ...p,
        category: 'General',
        image: null
      }));

      setProducts([...backendData]);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch products:', err);
      setError('Failed to load products. Please ensure the backend server is running on http://localhost:8080.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (newProductData) => {
    try {
      const response = await axios.post('/api/products', newProductData);
      if (response.data.success || response.status === 200) {
        setIsAddModalOpen(false);
        // 重新获取列表
        await fetchProducts();
      }
    } catch (err) {
      console.error('Failed to add product:', err);
      alert('Failed to add product: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleBarcodeFound = (barcode) => {
    setSearchTerm(barcode);
    setHighlightedBarcode(barcode);
    setCurrentPage(1);
    setTimeout(() => {
      highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
    setTimeout(() => setHighlightedBarcode(null), 3000);
  };

  const handleEditClick = (product) => {
    setProductToEdit(product);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (updatedData) => {
    try {
      const response = await axios.put(`/api/products/${updatedData.id}`, updatedData);
      if (response.data.success || response.status === 200) {
        setIsEditModalOpen(false);
        await fetchProducts();
      }
    } catch (err) {
      console.error('Failed to update product:', err);
      alert('Failed to update product: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      const response = await axios.delete(`/api/products/${id}`);
      if (response.data.success || response.status === 200) {
        await fetchProducts();
      }
    } catch (err) {
      console.error('Failed to delete product:', err);
      alert('Failed to delete product: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'SKU', 'Name', 'Barcode', 'Stock', 'Create Time'];
    const csvContent = [
      headers.join(','),
      ...filteredProducts.map(p => 
        [p.id, p.skuCode, `"${p.name}"`, p.barcode, p.stock, formatDateTime(p.createTime)].join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'products_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(paginatedProducts.map(p => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleSelect = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Data transformation
  const filteredProducts = products.filter(p => {
    const matchesSearch = (p.skuCode && p.skuCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStock = stockFilter === 'all' ? true : (stockFilter === 'low' ? p.stock < 20 : true);
    return matchesSearch && matchesStock;
  });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1); // Reset to page 1 on filter/search change
  }, [searchTerm, stockFilter]);

  const formatDateTime = (timeInput) => {
    if (!timeInput) return '-';
    
    if (Array.isArray(timeInput)) {
      const [year, month, day, hour = 0, minute = 0] = timeInput;
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }

    const date = new Date(timeInput);
    if(isNaN(date.getTime())) return timeInput;
    
    return date.getFullYear() + '-' +
           String(date.getMonth() + 1).padStart(2, '0') + '-' +
           String(date.getDate()).padStart(2, '0') + ' ' +
           String(date.getHours()).padStart(2, '0') + ':' +
           String(date.getMinutes()).padStart(2, '0');
  };

  return (
    <div className="catalog-page bg-transparent text-[#e2e2e2] w-full font-['Space_Grotesk'] relative min-h-[calc(100vh-64px)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="catalog-header flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="font-h1 text-h1 text-primary">{t('productCatalog')}</h1>
            <p className="text-on-surface-variant font-body-lg mt-2">{t('catalogDescription')}</p>
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="h-[44px] px-8 rounded-sm bg-[#bcf540] text-black font-black text-xs uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-[0_0_30px_rgba(188,245,64,0.2)]"
          >
            {t('addNewProduct')}
          </button>
        </div>

        <div className="catalog-toolbar bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-4 mb-6 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-zinc-500 text-[20px]">search</span>
              </div>
              <input 
                className="block w-full pl-10 pr-3 h-[44px] border border-white/10 rounded-lg bg-zinc-950/50 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#c5ff4a] focus:border-transparent transition-shadow text-sm" 
                placeholder={t('searchPlaceholder')}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setIsScanModalOpen(true)}
                className="flex items-center gap-2 px-4 h-[44px] border border-[#c5ff4a]/40 rounded-lg text-sm font-medium text-[#c5ff4a] hover:bg-[#c5ff4a]/10 transition-colors w-full sm:w-auto justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">barcode_scanner</span>
                {t('scan')}
              </button>
              <button 
                onClick={() => setStockFilter(prev => prev === 'all' ? 'low' : 'all')}
                className={`flex items-center gap-2 px-4 h-[44px] border rounded-lg text-sm font-medium transition-colors w-full sm:w-auto justify-center ${stockFilter === 'low' ? 'border-[#c5ff4a] text-[#c5ff4a] bg-[#c5ff4a]/10' : 'border-white/10 text-white hover:bg-white/5'}`}
              >
                <span className="material-symbols-outlined text-[18px]">filter_list</span>
                {stockFilter === 'low' ? t('lowStockOnly') : t('allStock')}
              </button>
              <button 
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 h-[44px] border border-white/10 rounded-lg text-sm font-medium hover:bg-white/5 transition-colors w-full sm:w-auto justify-center text-white"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                {t('export')}
              </button>
            </div>
          </div>
        </div>

        <div className="catalog-table-panel bg-white/5 backdrop-blur-md rounded-xl border border-white/10 shadow-sm overflow-hidden">
          <div className="overflow-x-auto min-h-[680px]">
            <table className="min-w-full divide-y divide-white/5">
              <thead className="bg-[#0c0f0f]/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider w-16" scope="col">
                    <input 
                      className="rounded border-white/20 text-[#c5ff4a] focus:ring-[#c5ff4a] bg-transparent" 
                      type="checkbox"
                      checked={paginatedProducts.length > 0 && selectedIds.size === paginatedProducts.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider w-40" scope="col">{t('skuCode')}</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider" scope="col">{t('name')}</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider w-48" scope="col">{t('barcode')}</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wider w-32" scope="col">{t('currentStock')}</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider w-56" scope="col">{t('createTime')}</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider w-28" scope="col">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 bg-transparent">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-zinc-500">
                      <div className="flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined animate-spin">refresh</span>
                        {t('loading')}
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-red-500">
                      {error}
                    </td>
                  </tr>
                ) : paginatedProducts.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-zinc-500">
                      {t('noProducts')}
                    </td>
                  </tr>
                ) : (
                  paginatedProducts.map((product) => (
                    <tr
                      key={product.id}
                      ref={product.barcode === highlightedBarcode ? highlightRef : null}
                      className={`hover:bg-white/5 transition-colors group h-[72px] ${product.barcode === highlightedBarcode ? 'bg-[#c5ff4a]/10 ring-1 ring-[#c5ff4a]/40' : ''}`}
                    >
                      <td className="px-6 py-2 whitespace-nowrap">
                        <input 
                          className="rounded border-white/20 text-[#c5ff4a] focus:ring-[#c5ff4a] bg-transparent" 
                          type="checkbox"
                          checked={selectedIds.has(product.id)}
                          onChange={() => toggleSelect(product.id)}
                        />
                      </td>
                      <td className="px-6 py-2 whitespace-nowrap text-sm font-medium text-white">
                        {product.skuCode || '-'}
                      </td>
                      <td className="px-6 py-2">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 bg-[#0c0f0f]/50 rounded-md border border-white/10 flex items-center justify-center overflow-hidden">
                            {product.image ? (
                              <img alt="Product thumbnail" className="h-full w-full object-cover" src={product.image}/>
                            ) : (
                              <span className="material-symbols-outlined text-zinc-500 opacity-50">image</span>
                            )}
                          </div>
                          <div className="ml-4 max-w-[240px]">
                            <div className="text-sm font-medium text-white break-words whitespace-normal leading-tight line-clamp-2">{product.name || '-'}</div>
                            <div className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider">{product.category || t('generalCategory')}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-2 whitespace-nowrap text-sm text-zinc-400 font-mono">
                        {product.barcode || '-'}
                      </td>
                      <td className={`px-6 py-2 whitespace-nowrap text-sm text-right font-medium ${product.stock < 20 ? 'text-red-500' : 'text-white'}`}>
                        {product.stock || 0}
                      </td>
                      <td className="px-6 py-2 whitespace-nowrap text-sm text-zinc-400">
                        {formatDateTime(product.createTime)}
                      </td>
                      <td className="px-6 py-2 whitespace-nowrap text-left text-sm font-medium">
                        <div className="flex justify-start gap-2">
                          <button 
                            onClick={() => handleEditClick(product)}
                            className="text-zinc-500 hover:text-white transition-colors p-1"
                          >
                            <span className="material-symbols-outlined text-sm">edit</span>
                          </button>
                          <button 
                            onClick={() => handleDelete(product.id)}
                            className="text-zinc-500 hover:text-red-500 transition-colors p-1"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-[#0c0f0f]/30 px-6 h-[64px] border-t border-white/10 flex items-center justify-between">
            <div className="text-sm text-zinc-400">
              {t('showing')} <span className="font-medium text-white">{filteredProducts.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> {t('to')} <span className="font-medium text-white">{Math.min(currentPage * itemsPerPage, filteredProducts.length)}</span> {t('of')} <span className="font-medium text-white">{filteredProducts.length}</span> {t('results')}
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 h-[36px] border border-white/10 rounded-lg bg-white/5 text-sm font-medium disabled:opacity-30 text-white hover:bg-white/10 transition-colors flex items-center"
              >
                {t('previous')}
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages || totalPages === 0}
                className="px-4 h-[36px] border border-white/10 rounded-lg bg-white/5 text-sm font-medium hover:bg-white/10 transition-colors disabled:opacity-30 text-white flex items-center"
              >
                {t('next')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <AddProductModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onAdd={handleAddProduct} 
      />

      <EditProductModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onEdit={handleEditSubmit}
        initialData={productToEdit}
      />

      <BarcodeLookupModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        onBarcodeFound={(barcode) => {
          setIsScanModalOpen(false);
          handleBarcodeFound(barcode);
        }}
      />
    </div>
  );
}

export default ProductCatalog;
