import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Check, 
  AlertCircle,
  User,
  Package,
  Layers
} from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  businessName: string;
  status: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  unitPrice: number;
  currentStock: number;
  minStockAlert: number;
}

interface LineItemInput {
  productId: string;
  quantity: number;
}

export const ChallanCreate: React.FC = () => {
  const { id } = useParams<{ id: string }>(); // Challan ID if editing
  const isEditMode = !!id;
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [customerId, setCustomerId] = useState('');
  const [lineItems, setLineItems] = useState<LineItemInput[]>([
    { productId: '', quantity: 1 }
  ]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [custRes, prodRes] = await Promise.all([
          axios.get('/api/customers?limit=100&status=ACTIVE'),
          axios.get('/api/products?limit=100'),
        ]);
        
        setCustomers(custRes.data.data.customers || []);
        setProducts(prodRes.data.data.products || []);

        if (isEditMode) {
          const challanRes = await axios.get(`/api/challans/${id}`);
          if (challanRes.data.status === 'success') {
            const challan = challanRes.data.data.challan;
            if (challan.status !== 'DRAFT') {
              setError('Only DRAFT challans can be edited.');
            } else {
              setCustomerId(challan.customerId);
              setLineItems(challan.items.map((item: any) => ({
                productId: item.productId,
                quantity: item.quantity
              })));
            }
          }
        }
      } catch (err) {
        console.error('Failed to load data for challan creation:', err);
        setError('Failed to fetch customers and products directories.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, isEditMode]);

  const handleAddRow = () => {
    setLineItems([...lineItems, { productId: '', quantity: 1 }]);
  };

  const handleRemoveRow = (index: number) => {
    if (lineItems.length === 1) return;
    const updated = lineItems.filter((_, i) => i !== index);
    setLineItems(updated);
  };

  const handleLineItemChange = (index: number, field: keyof LineItemInput, value: string | number) => {
    const updated = [...lineItems];
    if (field === 'productId') {
      updated[index]!.productId = value as string;
    } else if (field === 'quantity') {
      updated[index]!.quantity = Math.max(1, parseInt(value as string) || 1);
    }
    setLineItems(updated);
  };

  const calculateTotals = () => {
    let totalQty = 0;
    let totalPrice = 0;

    lineItems.forEach((item) => {
      totalQty += item.quantity;
      const product = products.find(p => p.id === item.productId);
      if (product) {
        totalPrice += item.quantity * product.unitPrice;
      }
    });

    return { totalQty, totalPrice };
  };

  const handleSaveChallan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      setError('Please select a customer.');
      return;
    }

    const invalidItems = lineItems.filter(item => !item.productId);
    if (invalidItems.length > 0) {
      setError('Please select a product for all line items.');
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      customerId,
      items: lineItems
    };

    try {
      if (isEditMode) {
        const response = await axios.put(`/api/challans/${id}`, payload);
        if (response.data.status === 'success') {
          navigate(`/challans/${id}`);
        }
      } else {
        const response = await axios.post('/api/challans', payload);
        if (response.data.status === 'success') {
          navigate(`/challans/${response.data.data.challan.id}`);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to save challan.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  const { totalQty, totalPrice } = calculateTotals();

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      {/* Header */}
      <div>
        <Link 
          to="/challans" 
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Challans
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-10 w-10 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 rounded-xl flex items-center justify-center">
          <Layers className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{isEditMode ? 'Edit Draft Challan' : 'Create New Challan'}</h1>
          <p className="text-xs text-slate-400">Generate dispatch slip, lock snapshots, and double-check stock levels</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl flex items-start gap-2.5 text-sm">
          <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Form Box */}
      <form onSubmit={handleSaveChallan} className="space-y-6 flex-1 flex flex-col justify-between">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Customer Selection Column */}
          <div className="lg:col-span-1 glass-card rounded-2xl border border-slate-800/60 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <User className="h-4.5 w-4.5 text-indigo-400" />
              <h2 className="text-sm font-semibold text-slate-200">Customer Selection</h2>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Select Customer (Active)</label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/30 transition cursor-pointer"
              >
                <option value="">-- Choose Client --</option>
                {customers.map((cust) => (
                  <option key={cust.id} value={cust.id}>
                    {cust.businessName} ({cust.name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Line Items List Column */}
          <div className="lg:col-span-2 glass-card rounded-2xl border border-slate-800/60 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4.5 w-4.5 text-indigo-400" />
                <h2 className="text-sm font-semibold text-slate-200">Challan Line Items</h2>
              </div>
              <button
                type="button"
                onClick={handleAddRow}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-indigo-400 hover:text-indigo-300 text-xs font-semibold hover:border-slate-700 transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Item
              </button>
            </div>

            <div className="space-y-4">
              {lineItems.map((item, index) => {
                const selectedProd = products.find(p => p.id === item.productId);
                const isOverStock = selectedProd ? item.quantity > selectedProd.currentStock : false;
                
                return (
                  <div 
                    key={index} 
                    className={`p-4 rounded-xl bg-slate-950/40 border transition-all ${
                      isOverStock ? 'border-rose-500/30 bg-rose-500/5' : 'border-slate-850'
                    }`}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                      
                      {/* Product Selector */}
                      <div className="md:col-span-6 space-y-1.5">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Product</label>
                        <select
                          value={item.productId}
                          onChange={(e) => handleLineItemChange(index, 'productId', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/30 transition cursor-pointer"
                        >
                          <option value="">-- Choose Product --</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} (SKU: {p.sku}) [Stock: {p.currentStock} pcs]
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity */}
                      <div className="md:col-span-3 space-y-1.5">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Quantity (pcs)</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/30 transition"
                        />
                      </div>

                      {/* Line subtotal */}
                      <div className="md:col-span-2 text-center md:text-right">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Subtotal</p>
                        <p className="text-sm font-semibold text-slate-300">
                          ₹{selectedProd ? (item.quantity * selectedProd.unitPrice).toFixed(2) : '0.00'}
                        </p>
                      </div>

                      {/* Delete Action */}
                      <div className="md:col-span-1 flex justify-center md:justify-end pt-3 md:pt-0">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(index)}
                          disabled={lineItems.length === 1}
                          className="p-2 bg-slate-900 border border-slate-800 text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 hover:border-rose-900/30 rounded-xl transition disabled:opacity-20 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Stock Alert Warning */}
                    {selectedProd && isOverStock && (
                      <div className="mt-3 text-xs text-rose-400 flex items-center gap-1.5">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>Warning: Insufficient stock. Warehouse only holds {selectedProd.currentStock} pcs of {selectedProd.name}. Confirmation will fail.</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Totals panel & Save footer */}
        <div className="p-6 glass-panel rounded-2xl border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex gap-6 text-sm">
            <div>
              <p className="text-slate-500 font-semibold uppercase tracking-wider text-xs">Total Quantity</p>
              <p className="text-2xl font-bold text-slate-200 mt-1">{totalQty} pcs</p>
            </div>
            <div className="pl-6 border-l border-slate-800">
              <p className="text-slate-500 font-semibold uppercase tracking-wider text-xs">Estimated Invoice Total</p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">₹{totalPrice.toFixed(2)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 justify-end">
            <Link
              to="/challans"
              className="px-5 py-3 rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850/50 text-sm font-medium transition cursor-pointer"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-xl transition cursor-pointer shadow-lg shadow-indigo-600/15 disabled:opacity-50"
            >
              <Check className="h-4.5 w-4.5" />
              {saving ? 'Saving...' : 'Save as Draft'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
