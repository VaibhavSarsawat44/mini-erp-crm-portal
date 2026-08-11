import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  ArrowUpRight, 
  ArrowDownLeft, 
  History, 
  TrendingUp, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Check, 
  AlertCircle,
  Package,
  MapPin,
  ClipboardList
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Product Form validation schema
const productFormSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().min(1, 'SKU is required'),
  category: z.string().min(1, 'Category is required'),
  unitPrice: z.number({ invalid_type_error: 'Unit price must be a number' }).positive('Unit price must be a positive number'),
  currentStock: z.number({ invalid_type_error: 'Current stock must be a number' }).int().nonnegative('Current stock must be a non-negative integer'),
  minStockAlert: z.number({ invalid_type_error: 'Min stock alert must be a number' }).int().nonnegative('Min stock alert must be a non-negative integer'),
  location: z.string().min(1, 'Location is required'),
});

type ProductFormInputs = z.infer<typeof productFormSchema>;

// Stock adjustment form schema
const stockAdjustmentSchema = z.object({
  quantity: z.number({ invalid_type_error: 'Quantity must be a number' }).int().positive('Quantity must be a positive integer'),
  type: z.enum(['IN', 'OUT']),
  reason: z.string().min(1, 'Reason for stock movement is required'),
});

type StockAdjustmentInputs = z.infer<typeof stockAdjustmentSchema>;

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  unitPrice: number;
  currentStock: number;
  minStockAlert: number;
  location: string;
  createdAt: string;
}

interface StockMovement {
  id: string;
  quantity: number;
  type: 'IN' | 'OUT';
  reason: string;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export const Products: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 8;

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState<string[]>(['Packaging', 'Raw Materials', 'Electronics', 'Tools']);

  // Modal control states
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);

  const isWarehouseOrAdmin = user?.role === 'ADMIN' || user?.role === 'WAREHOUSE';
  const isSalesOrAdmin = user?.role === 'ADMIN' || user?.role === 'SALES' || user?.role === 'WAREHOUSE';

  // React hook forms
  const { register: productReg, handleSubmit: productSubmit, reset: productReset, setValue: productSetValue, formState: { errors: productErrors } } = useForm<ProductFormInputs>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: '',
      sku: '',
      category: 'Packaging',
      unitPrice: 0,
      currentStock: 0,
      minStockAlert: 0,
      location: '',
    }
  });

  const { register: adjustReg, handleSubmit: adjustSubmit, reset: adjustReset, formState: { errors: adjustErrors } } = useForm<StockAdjustmentInputs>({
    resolver: zodResolver(stockAdjustmentSchema),
    defaultValues: {
      quantity: 1,
      type: 'IN',
      reason: '',
    }
  });

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/products', {
        params: {
          q: search,
          category: categoryFilter || undefined,
          page,
          limit,
        }
      });
      if (response.data.status === 'success') {
        setProducts(response.data.data.products);
        setTotal(response.data.data.total);
        setTotalPages(response.data.data.totalPages);
        
        // Dynamically collect categories if any new ones have been added
        const loadedCats = response.data.data.products.map((p: Product) => p.category);
        setCategories(prev => Array.from(new Set([...prev, ...loadedCats])));
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchProducts();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [search, categoryFilter, page]);

  const handleOpenProductAddModal = () => {
    setEditingProduct(null);
    productReset({
      name: '',
      sku: '',
      category: 'Packaging',
      unitPrice: 0.0,
      currentStock: 0,
      minStockAlert: 5,
      location: '',
    });
    setFormError(null);
    setIsProductModalOpen(true);
  };

  const handleOpenProductEditModal = (product: Product) => {
    setEditingProduct(product);
    productSetValue('name', product.name);
    productSetValue('sku', product.sku);
    productSetValue('category', product.category);
    productSetValue('unitPrice', product.unitPrice);
    productSetValue('currentStock', product.currentStock);
    productSetValue('minStockAlert', product.minStockAlert);
    productSetValue('location', product.location);
    setFormError(null);
    setIsProductModalOpen(true);
  };

  const handleOpenAdjustModal = (product: Product) => {
    setAdjustingProduct(product);
    adjustReset({
      quantity: 10,
      type: 'IN',
      reason: 'Manual Restock Supply',
    });
    setFormError(null);
    setIsAdjustModalOpen(true);
  };

  const handleOpenHistoryModal = async (product: Product) => {
    setHistoryProduct(product);
    setHistoryLoading(true);
    setIsHistoryModalOpen(true);
    setMovements([]);
    try {
      const response = await axios.get(`/api/products/${product.id}/stock-movements`);
      if (response.data.status === 'success') {
        setMovements(response.data.data.movements);
      }
    } catch (err) {
      console.error('Failed to load stock movements:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const onProductSubmit = async (data: ProductFormInputs) => {
    setFormError(null);
    try {
      if (editingProduct) {
        // Update Product (Direct edits block changing stock to ensure movements consistency)
        const response = await axios.put(`/api/products/${editingProduct.id}`, data);
        if (response.data.status === 'success') {
          setIsProductModalOpen(false);
          fetchProducts();
        }
      } else {
        // Create Product
        const response = await axios.post('/api/products', data);
        if (response.data.status === 'success') {
          setIsProductModalOpen(false);
          fetchProducts();
        }
      }
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.message || 'Action failed. Please verify inputs.';
      setFormError(errMsg);
    }
  };

  const onAdjustSubmit = async (data: StockAdjustmentInputs) => {
    if (!adjustingProduct) return;
    setFormError(null);
    try {
      const response = await axios.post(`/api/products/${adjustingProduct.id}/stock-movements`, data);
      if (response.data.status === 'success') {
        setIsAdjustModalOpen(false);
        fetchProducts();
      }
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.message || 'Adjustment failed.';
      setFormError(errMsg);
    }
  };

  const roleColors: Record<string, string> = {
    ADMIN: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
    SALES: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    WAREHOUSE: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    ACCOUNTS: 'bg-sky-500/15 text-sky-400 border-sky-500/20',
  };

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Product Catalog</h1>
          <p className="text-sm text-slate-400">Monitor warehouse inventory items, locations, and stock alerts</p>
        </div>
        {isSalesOrAdmin && (
          <button
            onClick={handleOpenProductAddModal}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2.5 rounded-xl transition-all duration-200 cursor-pointer shadow-lg shadow-indigo-600/15"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </button>
        )}
      </div>

      {/* Search & Filter */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 glass-card rounded-2xl border border-slate-800/60">
        {/* Search */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search by SKU, product name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/30 transition-all"
          />
        </div>

        {/* Category Filter */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
            <Filter className="h-4 w-4" />
          </span>
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/30 transition-all cursor-pointer"
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Container */}
      <div className="glass-card rounded-2xl border border-slate-800/60 overflow-hidden flex-1 flex flex-col justify-between shadow-xl">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <Package className="h-12 w-12 mx-auto text-slate-700 mb-3" />
              <p className="text-sm">No products found matching filters.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/40 text-xs uppercase tracking-wider font-semibold text-slate-400">
                  <th className="py-4 px-6">Product Details</th>
                  <th className="py-4 px-6 text-center">Unit Price</th>
                  <th className="py-4 px-6 text-center">Stock Level</th>
                  <th className="py-4 px-6">Location</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-sm text-slate-300">
                {products.map((product) => {
                  const isLowStock = product.currentStock < product.minStockAlert;
                  return (
                    <tr 
                      key={product.id} 
                      className={`hover:bg-slate-900/25 transition-colors ${
                        isLowStock ? 'bg-rose-500/5 hover:bg-rose-500/10' : ''
                      }`}
                    >
                      {/* Name & SKU */}
                      <td className="py-4.5 px-6">
                        <p className="font-bold text-slate-200">{product.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">SKU: <code className="text-indigo-300 bg-slate-900/40 px-1 py-0.5 rounded">{product.sku}</code> | {product.category}</p>
                      </td>
                      {/* Price */}
                      <td className="py-4.5 px-6 text-center font-semibold text-slate-300">
                        ₹{product.unitPrice.toFixed(2)}
                      </td>
                      {/* Stock Level */}
                      <td className="py-4.5 px-6 text-center">
                        <div className="flex flex-col items-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            isLowStock 
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}>
                            {product.currentStock} pcs
                          </span>
                          <span className="text-[10px] text-slate-500 mt-1">Min Alert: {product.minStockAlert}</span>
                        </div>
                      </td>
                      {/* Location */}
                      <td className="py-4.5 px-6">
                        <div className="flex items-center gap-1 text-slate-300">
                          <MapPin className="h-3.5 w-3.5 text-slate-500" />
                          <span>{product.location}</span>
                        </div>
                      </td>
                      {/* Actions */}
                      <td className="py-4.5 px-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* Stock History */}
                          <button
                            onClick={() => handleOpenHistoryModal(product)}
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-indigo-950/20 text-slate-400 hover:text-indigo-400 border border-slate-800 hover:border-indigo-900/30 transition-all duration-200 cursor-pointer"
                            title="Stock movement logs"
                          >
                            <History className="h-4 w-4" />
                          </button>
                          
                          {/* Adjust Stock (Restricted to Warehouse / Admin) */}
                          {isWarehouseOrAdmin && (
                            <button
                              onClick={() => handleOpenAdjustModal(product)}
                              className="p-1.5 rounded-lg bg-slate-900 hover:bg-amber-950/20 text-slate-400 hover:text-amber-400 border border-slate-800 hover:border-amber-900/30 transition-all duration-200 cursor-pointer"
                              title="Manual stock adjustment"
                            >
                              <TrendingUp className="h-4 w-4" />
                            </button>
                          )}

                          {/* Edit Product (Restricted to Sales / Admin) */}
                          {isSalesOrAdmin && (
                            <button
                              onClick={() => handleOpenProductEditModal(product)}
                              className="p-1.5 rounded-lg bg-slate-900 hover:bg-emerald-950/20 text-slate-400 hover:text-emerald-400 border border-slate-800 hover:border-emerald-900/30 transition-all duration-200 cursor-pointer"
                              title="Edit product parameters"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination footer */}
        {!loading && products.length > 0 && (
          <div className="p-4 border-t border-slate-800 bg-slate-900/20 flex items-center justify-between text-xs text-slate-400">
            <p>Showing <span className="text-slate-300 font-semibold">{products.length}</span> of <span className="text-slate-300 font-semibold">{total}</span> products</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 disabled:opacity-30 disabled:pointer-events-none hover:text-slate-200 transition-colors duration-200"
              >
                <ChevronLeft className="h-4.5 w-4.5" />
              </button>
              <span>Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 disabled:opacity-30 disabled:pointer-events-none hover:text-slate-200 transition-colors duration-200"
              >
                <ChevronRight className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4.5 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">
                {editingProduct ? 'Edit Product Catalog details' : 'Register New Product'}
              </h2>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="m-6 mb-0 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl flex items-start gap-2.5 text-xs">
                <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={productSubmit(onProductSubmit)} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Product Name</label>
                  <input
                    type="text"
                    placeholder="Bubble Wrap Roll 100m"
                    {...productReg('name')}
                    className={`w-full bg-slate-950 border ${productErrors.name ? 'border-rose-500 focus:ring-rose-500/20' : 'border-slate-800 focus:ring-indigo-500/20'} rounded-xl py-2.5 px-4 text-slate-100 text-sm focus:outline-none focus:ring-4 transition`}
                  />
                  {productErrors.name && <p className="text-xs text-rose-400">{productErrors.name.message}</p>}
                </div>

                {/* SKU */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">SKU Code</label>
                  <input
                    type="text"
                    placeholder="PKG-BBL-100"
                    {...productReg('sku')}
                    className={`w-full bg-slate-950 border ${productErrors.sku ? 'border-rose-500 focus:ring-rose-500/20' : 'border-slate-800 focus:ring-indigo-500/20'} rounded-xl py-2.5 px-4 text-slate-100 text-sm focus:outline-none focus:ring-4 transition`}
                  />
                  {productErrors.sku && <p className="text-xs text-rose-400">{productErrors.sku.message}</p>}
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Category</label>
                  <input
                    type="text"
                    placeholder="Packaging"
                    {...productReg('category')}
                    className={`w-full bg-slate-950 border ${productErrors.category ? 'border-rose-500 focus:ring-rose-500/20' : 'border-slate-800 focus:ring-indigo-500/20'} rounded-xl py-2.5 px-4 text-slate-100 text-sm focus:outline-none focus:ring-4 transition`}
                  />
                  {productErrors.category && <p className="text-xs text-rose-400">{productErrors.category.message}</p>}
                </div>

                {/* Unit Price */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Unit Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="125.00"
                    {...productReg('unitPrice', { valueAsNumber: true })}
                    className={`w-full bg-slate-950 border ${productErrors.unitPrice ? 'border-rose-500 focus:ring-rose-500/20' : 'border-slate-800 focus:ring-indigo-500/20'} rounded-xl py-2.5 px-4 text-slate-100 text-sm focus:outline-none focus:ring-4 transition`}
                  />
                  {productErrors.unitPrice && <p className="text-xs text-rose-400">{productErrors.unitPrice.message}</p>}
                </div>

                {/* Warehouse Location */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Warehouse Location</label>
                  <input
                    type="text"
                    placeholder="Aisle A3"
                    {...productReg('location')}
                    className={`w-full bg-slate-950 border ${productErrors.location ? 'border-rose-500 focus:ring-rose-500/20' : 'border-slate-800 focus:ring-indigo-500/20'} rounded-xl py-2.5 px-4 text-slate-100 text-sm focus:outline-none focus:ring-4 transition`}
                  />
                  {productErrors.location && <p className="text-xs text-rose-400">{productErrors.location.message}</p>}
                </div>

                {/* Min Stock Alert */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Min Alert Threshold</label>
                  <input
                    type="number"
                    placeholder="10"
                    {...productReg('minStockAlert', { valueAsNumber: true })}
                    className={`w-full bg-slate-950 border ${productErrors.minStockAlert ? 'border-rose-500 focus:ring-rose-500/20' : 'border-slate-800 focus:ring-indigo-500/20'} rounded-xl py-2.5 px-4 text-slate-100 text-sm focus:outline-none focus:ring-4 transition`}
                  />
                  {productErrors.minStockAlert && <p className="text-xs text-rose-400">{productErrors.minStockAlert.message}</p>}
                </div>

                {/* Initial Stock (Only enabled for creation) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Current Stock
                  </label>
                  <input
                    type="number"
                    placeholder="100"
                    disabled={!!editingProduct}
                    {...productReg('currentStock', { valueAsNumber: true })}
                    className="w-full bg-slate-950 border border-slate-800 disabled:opacity-40 disabled:bg-slate-900 rounded-xl py-2.5 px-4 text-slate-100 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500/30 transition"
                  />
                  {editingProduct && (
                    <p className="text-[10px] text-slate-500 mt-1">Modify stock levels using the Adjustment (&uarr;&darr;) action.</p>
                  )}
                  {productErrors.currentStock && <p className="text-xs text-rose-400">{productErrors.currentStock.message}</p>}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3.5">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 text-sm font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2.5 rounded-xl transition cursor-pointer shadow-lg shadow-indigo-600/15"
                >
                  <Check className="h-4 w-4" />
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Stock Adjustment Modal */}
      {isAdjustModalOpen && adjustingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4.5 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Adjust Stock Level</h2>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="m-6 mb-0 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl flex items-start gap-2.5 text-xs">
                <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={adjustSubmit(onAdjustSubmit)} className="p-6 space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-850 flex items-center justify-between text-sm">
                <div>
                  <p className="font-bold text-slate-200">{adjustingProduct.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">SKU: {adjustingProduct.sku}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 text-right">Current Stock</p>
                  <p className="text-lg font-extrabold text-slate-200 mt-0.5 text-right">{adjustingProduct.currentStock} pcs</p>
                </div>
              </div>

              {/* Adjustment Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Adjustment Type</label>
                <div className="grid grid-cols-2 gap-3.5">
                  <label className="flex items-center justify-center gap-2 py-2.5 border border-slate-800 rounded-xl bg-slate-950 text-sm cursor-pointer hover:border-indigo-500/40 text-slate-300">
                    <input type="radio" value="IN" {...adjustReg('type')} className="text-indigo-600 focus:ring-0" />
                    <span className="flex items-center gap-1 text-emerald-400"><ArrowDownLeft className="h-4 w-4" /> Stock IN</span>
                  </label>
                  <label className="flex items-center justify-center gap-2 py-2.5 border border-slate-800 rounded-xl bg-slate-950 text-sm cursor-pointer hover:border-indigo-500/40 text-slate-300">
                    <input type="radio" value="OUT" {...adjustReg('type')} className="text-indigo-600 focus:ring-0" />
                    <span className="flex items-center gap-1 text-rose-400"><ArrowUpRight className="h-4 w-4" /> Stock OUT</span>
                  </label>
                </div>
              </div>

              {/* Quantity */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Quantity (pcs)</label>
                <input
                  type="number"
                  placeholder="50"
                  {...adjustReg('quantity', { valueAsNumber: true })}
                  className={`w-full bg-slate-950 border ${adjustErrors.quantity ? 'border-rose-500 focus:ring-rose-500/20' : 'border-slate-800 focus:ring-indigo-500/20'} rounded-xl py-2.5 px-4 text-slate-100 text-sm focus:outline-none focus:ring-4 transition`}
                />
                {adjustErrors.quantity && <p className="text-xs text-rose-400">{adjustErrors.quantity.message}</p>}
              </div>

              {/* Reason */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Reason / Description</label>
                <textarea
                  rows={2}
                  placeholder="Manual count discrepancy audit correction..."
                  {...adjustReg('reason')}
                  className={`w-full bg-slate-950 border ${adjustErrors.reason ? 'border-rose-500 focus:ring-rose-500/20' : 'border-slate-800 focus:ring-indigo-500/20'} rounded-xl py-2.5 px-4 text-slate-100 text-sm focus:outline-none focus:ring-4 transition resize-none`}
                />
                {adjustErrors.reason && <p className="text-xs text-rose-400">{adjustErrors.reason.message}</p>}
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 text-sm font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2.5 rounded-xl transition cursor-pointer shadow-lg shadow-indigo-600/15"
                >
                  <Check className="h-4 w-4" />
                  Apply Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Movement History Modal */}
      {isHistoryModalOpen && historyProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="px-6 py-4.5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Stock Movement Log History</h2>
                <p className="text-xs text-slate-400 mt-0.5">{historyProduct.name} (SKU: {historyProduct.sku})</p>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-6 flex-1">
              {historyLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
                </div>
              ) : movements.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <ClipboardList className="h-10 w-10 mx-auto text-slate-700 mb-2" />
                  <p className="text-sm">No recorded stock movements found for this product.</p>
                </div>
              ) : (
                <div className="relative pl-6 border-l-2 border-slate-800 space-y-6">
                  {movements.map((movement) => {
                    const isIN = movement.type === 'IN';
                    return (
                      <div key={movement.id} className="relative group">
                        {/* Node circle */}
                        <span className={`absolute -left-[32px] top-1 h-5 w-5 rounded-full bg-slate-950 border-2 ${
                          isIN ? 'border-emerald-500' : 'border-rose-500'
                        } flex items-center justify-center`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            isIN ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}></span>
                        </span>

                        {/* Card */}
                        <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                                isIN ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                              }`}>
                                {isIN ? 'Stock IN (+)' : 'Stock OUT (-)'}
                              </span>
                              <span className="text-sm font-bold text-slate-200">{movement.quantity} pcs</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-2 font-sans">{movement.reason}</p>
                          </div>
                          
                          {/* Meta */}
                          <div className="sm:text-right text-xs shrink-0 space-y-1">
                            <div className="flex sm:justify-end items-center gap-1.5 text-slate-400">
                              <span className="font-semibold">{movement.createdBy.name}</span>
                              <span className={`text-[8px] uppercase tracking-wider font-bold px-1.5 py-0.2 rounded border ${roleColors[movement.createdBy.role]}`}>
                                {movement.createdBy.role}
                              </span>
                            </div>
                            <p className="text-slate-500">
                              {new Date(movement.createdAt).toLocaleString('en-US', {
                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4.5 border-t border-slate-800 flex items-center justify-end bg-slate-900/10">
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-5 py-2 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 rounded-xl text-sm font-medium transition cursor-pointer"
              >
                Close Logs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
