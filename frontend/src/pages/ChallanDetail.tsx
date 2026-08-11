import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle2, 
  Printer, 
  Edit, 
  Check, 
  X, 
  AlertCircle,
  User,
  Calendar,
  FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ChallanItem {
  id: string;
  productId: string;
  productNameSnapshot: string;
  skuSnapshot: string;
  priceSnapshot: number;
  quantity: number;
}

interface Customer {
  id: string;
  name: string;
  businessName: string;
  gstNumber: string | null;
  mobile: string;
  email: string;
  address: string;
}

interface Challan {
  id: string;
  challanNumber: string;
  status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
  totalQuantity: number;
  createdAt: string;
  customer: Customer;
  createdBy: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  items: ChallanItem[];
}

export const ChallanDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  
  const [challan, setChallan] = useState<Challan | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchChallan = async () => {
    try {
      const response = await axios.get(`/api/challans/${id}`);
      if (response.data.status === 'success') {
        setChallan(response.data.data.challan);
      }
    } catch (err) {
      console.error('Failed to load challan detail:', err);
      setError('Failed to retrieve challan record details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallan();
  }, [id]);

  const handleConfirm = async () => {
    if (!challan) return;
    setError(null);
    setSuccess(null);
    setActionLoading(true);
    try {
      const response = await axios.post(`/api/challans/${challan.id}/confirm`);
      if (response.data.status === 'success') {
        setSuccess('Challan confirmed successfully! Inventory levels updated.');
        fetchChallan();
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to authorize confirmation.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!challan) return;
    if (!window.confirm('Are you sure you want to cancel this challan? This will undo any stock deductions if it was confirmed.')) return;
    
    setError(null);
    setSuccess(null);
    setActionLoading(true);
    try {
      const response = await axios.post(`/api/challans/${challan.id}/cancel`);
      if (response.data.status === 'success') {
        setSuccess('Challan cancelled successfully.');
        fetchChallan();
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to execute cancellation.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!challan) {
    return (
      <div className="space-y-4">
        <Link to="/challans" className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition">
          <ArrowLeft className="h-4 w-4" />
          Back to Challans
        </Link>
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-center">
          <AlertCircle className="h-8 w-8 mx-auto text-rose-400 mb-2" />
          <p className="font-semibold">Challan record not found.</p>
        </div>
      </div>
    );
  }

  const statusColors = {
    DRAFT: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
    CONFIRMED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    CANCELLED: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
  };

  const invoiceTotal = challan.items.reduce(
    (sum, item) => sum + item.quantity * item.priceSnapshot,
    0
  );

  const canEdit = challan.status === 'DRAFT' && (user?.role === 'ADMIN' || user?.role === 'SALES');
  // Accounts cannot confirm or cancel challans
  const canConfirm = challan.status === 'DRAFT' && user?.role !== 'ACCOUNTS';
  const canCancel = (challan.status === 'DRAFT' || challan.status === 'CONFIRMED') && user?.role !== 'ACCOUNTS';

  return (
    <div className="space-y-6 flex-1 flex flex-col print:p-0 print:bg-white print:text-black">
      
      {/* Back button (hidden on print) */}
      <div className="flex items-center justify-between print:hidden">
        <Link 
          to="/challans" 
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Challans
        </Link>
        
        {/* Printable button */}
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold px-4.5 py-2.5 rounded-xl transition duration-150 cursor-pointer"
        >
          <Printer className="h-4 w-4" />
          Print Challan
        </button>
      </div>

      {/* Notifications banner (hidden on print) */}
      {(error || success) && (
        <div className="space-y-3.5 print:hidden">
          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl flex items-start gap-2.5 text-sm">
              <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl flex items-start gap-2.5 text-sm">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              <span>{success}</span>
            </div>
          )}
        </div>
      )}

      {/* Action Toolbar for Draft/Active challans (hidden on print) */}
      <div className="p-4 glass-panel rounded-2xl border border-slate-800/80 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-2.5 text-sm">
          <Clock className="h-4.5 w-4.5 text-slate-400" />
          <span className="text-slate-400">Current Status:</span>
          <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded border ${statusColors[challan.status]}`}>
            {challan.status}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {canEdit && (
            <Link
              to={`/challans/${challan.id}/edit`}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl text-xs font-semibold transition"
            >
              <Edit className="h-4 w-4" />
              Edit Draft
            </Link>
          )}

          {canCancel && (
            <button
              onClick={handleCancel}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-800 hover:border-rose-900/30 text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              Cancel Challan
            </button>
          )}

          {canConfirm && (
            <button
              onClick={handleConfirm}
              disabled={actionLoading}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-lg shadow-emerald-600/15 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              Confirm & Deduct Stock
            </button>
          )}
        </div>
      </div>

      {/* Challan Invoice Paper Layout */}
      <div className="bg-slate-900/35 border border-slate-800/80 rounded-2xl p-8 relative overflow-hidden shadow-2xl flex-1 flex flex-col justify-between print:border-none print:bg-white print:shadow-none print:p-0">
        <div className="space-y-8">
          {/* Top Invoice Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-slate-800/80 print:border-slate-300">
            <div>
              <div className="flex items-center gap-2 print:text-black">
                <FileText className="h-6 w-6 text-indigo-400 print:text-black" />
                <span className="text-xl font-bold tracking-wider text-slate-200 print:text-black">DISPATCH CHALLAN</span>
              </div>
              <p className="text-2xl font-black text-white mt-4 print:text-black">{challan.challanNumber}</p>
            </div>
            
            <div className="text-sm space-y-1.5 sm:text-right print:text-black">
              <div className="flex sm:justify-end items-center gap-1.5 text-slate-400 print:text-black">
                <Calendar className="h-4 w-4 text-slate-500" />
                <span>Issue Date: {new Date(challan.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'long', day: 'numeric'
                })}</span>
              </div>
              <div className="flex sm:justify-end items-center gap-1.5 text-slate-400 print:text-black">
                <User className="h-4 w-4 text-slate-500" />
                <span>Authorized by: {challan.createdBy.name} ({challan.createdBy.role})</span>
              </div>
            </div>
          </div>

          {/* Customer & Business columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:text-black">
            {/* Delivery address */}
            <div className="space-y-2.5">
              <p className="text-xs uppercase font-extrabold tracking-wider text-indigo-400 print:text-black">Deliver To:</p>
              <div className="space-y-1 text-sm text-slate-300 print:text-black">
                <p className="font-bold text-slate-100 text-base print:text-black">{challan.customer.businessName}</p>
                <p className="text-slate-400 print:text-black">Attn: {challan.customer.name}</p>
                <p className="leading-relaxed pt-1.5 text-slate-400 print:text-black">{challan.customer.address}</p>
              </div>
            </div>

            {/* Contact details */}
            <div className="space-y-2.5 md:text-right flex flex-col md:items-end">
              <p className="text-xs uppercase font-extrabold tracking-wider text-indigo-400 print:text-black">Contact Details:</p>
              <div className="space-y-1.5 text-sm text-slate-300 print:text-black">
                <p className="print:text-black"><span className="text-slate-500 font-medium">Email:</span> {challan.customer.email}</p>
                <p className="print:text-black"><span className="text-slate-500 font-medium">Mobile:</span> {challan.customer.mobile}</p>
                <p className="print:text-black"><span className="text-slate-500 font-medium">GST:</span> {challan.customer.gstNumber || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Line items table */}
          <div className="overflow-x-auto pt-4">
            <table className="w-full text-left border-collapse print:text-black">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/30 text-xs uppercase tracking-wider font-semibold text-slate-400 print:bg-slate-100 print:border-slate-300 print:text-black">
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Product Name (Snapshot)</th>
                  <th className="py-3 px-4">SKU Code</th>
                  <th className="py-3 px-4 text-center">Unit Price</th>
                  <th className="py-3 px-4 text-center">Quantity</th>
                  <th className="py-3 px-4 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-sm text-slate-300 print:divide-slate-200 print:text-black">
                {challan.items.map((item, index) => (
                  <tr key={item.id} className="print:text-black">
                    <td className="py-4.5 px-4 text-slate-500 print:text-black">{index + 1}</td>
                    <td className="py-4.5 px-4 font-semibold text-slate-200 print:text-black">{item.productNameSnapshot}</td>
                    <td className="py-4.5 px-4"><code className="text-indigo-300 bg-slate-950/40 px-1.5 py-0.5 rounded print:bg-none print:text-black">{item.skuSnapshot}</code></td>
                    <td className="py-4.5 px-4 text-center print:text-black">₹{item.priceSnapshot.toFixed(2)}</td>
                    <td className="py-4.5 px-4 text-center font-bold print:text-black">{item.quantity} pcs</td>
                    <td className="py-4.5 px-4 text-right font-semibold text-slate-200 print:text-black">
                      ₹{(item.quantity * item.priceSnapshot).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals Box */}
        <div className="mt-12 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-6 print:border-slate-300 print:text-black">
          <div className="text-xs text-slate-500 italic max-w-sm print:text-black">
            Note: The pricing and SKU details listed are snapshots frozen at the time of challan creation. Subsequent adjustments to catalog prices will not affect this document.
          </div>
          
          <div className="flex gap-8 text-sm shrink-0 justify-end w-full sm:w-auto print:text-black">
            <div className="text-right">
              <p className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Total Qty</p>
              <p className="text-xl font-bold text-slate-300 mt-1 print:text-black">{challan.totalQuantity} pcs</p>
            </div>
            <div className="text-right pl-8 border-l border-slate-800 print:border-slate-300">
              <p className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Grand Total</p>
              <p className="text-2xl font-black text-emerald-400 mt-1 print:text-black">₹{invoiceTotal.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
