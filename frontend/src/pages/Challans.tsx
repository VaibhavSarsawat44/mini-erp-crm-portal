import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Filter, 
  Eye, 
  ChevronLeft, 
  ChevronRight, 
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar
} from 'lucide-react';
interface CustomerSummary {
  id: string;
  name: string;
  businessName: string;
}

interface Challan {
  id: string;
  challanNumber: string;
  status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
  totalQuantity: number;
  createdAt: string;
  customer: CustomerSummary;
  createdBy: {
    id: string;
    name: string;
    role: string;
  };
}

export const Challans: React.FC = () => {
  const [challans, setChallans] = useState<Challan[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 8;

  // Filters
  const [statusFilter, setStatusFilter] = useState('');

  const fetchChallans = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/challans', {
        params: {
          status: statusFilter || undefined,
          page,
          limit,
        }
      });
      if (response.data.status === 'success') {
        setChallans(response.data.data.challans);
        setTotal(response.data.data.total);
        setTotalPages(response.data.data.totalPages);
      }
    } catch (err) {
      console.error('Failed to load challans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallans();
  }, [statusFilter, page]);

  const statusBadges = {
    DRAFT: {
      style: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      icon: Clock,
      label: 'Draft'
    },
    CONFIRMED: {
      style: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      icon: CheckCircle2,
      label: 'Confirmed'
    },
    CANCELLED: {
      style: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      icon: XCircle,
      label: 'Cancelled'
    }
  };

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Sales Challans</h1>
          <p className="text-sm text-slate-400">Generate dispatch challans, verify stock levels, and authorize shipments</p>
        </div>
        <Link
          to="/challans/new"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-600/15"
        >
          <Plus className="h-4 w-4" />
          Create Challan
        </Link>
      </div>

      {/* Filter panel */}
      <div className="p-4 glass-card rounded-2xl border border-slate-800/60 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Filter className="h-4 w-4 text-slate-500" />
          <span>Filter by status:</span>
        </div>
        <div className="flex items-center gap-2">
          {['', 'DRAFT', 'CONFIRMED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => { setStatusFilter(st); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 cursor-pointer ${
                statusFilter === st
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {st === '' ? 'All Challans' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Challan Listing Table */}
      <div className="glass-card rounded-2xl border border-slate-800/60 overflow-hidden flex-1 flex flex-col justify-between shadow-xl">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
            </div>
          ) : challans.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <FileText className="h-12 w-12 mx-auto text-slate-700 mb-3" />
              <p className="text-sm">No challans found matching filters.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/40 text-xs uppercase tracking-wider font-semibold text-slate-400">
                  <th className="py-4 px-6">Challan Number</th>
                  <th className="py-4 px-6">Customer / Business</th>
                  <th className="py-4 px-6 text-center">Dispatched Qty</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-sm text-slate-300">
                {challans.map((challan) => {
                  const Badge = statusBadges[challan.status];
                  const StatusIcon = Badge.icon;
                  return (
                    <tr key={challan.id} className="hover:bg-slate-900/25 transition-colors">
                      {/* Challan Serial */}
                      <td className="py-4.5 px-6">
                        <div className="flex items-center gap-2.5">
                          <FileText className="h-4.5 w-4.5 text-slate-500 shrink-0" />
                          <div>
                            <p className="font-bold text-slate-200">{challan.challanNumber}</p>
                            <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Calendar className="h-3 w-3" />
                              {new Date(challan.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </td>
                      {/* Customer Info */}
                      <td className="py-4.5 px-6">
                        <p className="font-semibold text-slate-300">{challan.customer.businessName}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{challan.customer.name}</p>
                      </td>
                      {/* Total Qty */}
                      <td className="py-4.5 px-6 text-center font-bold text-slate-300">
                        {challan.totalQuantity} pcs
                      </td>
                      {/* Status badge */}
                      <td className="py-4.5 px-6">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md border ${Badge.style}`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {Badge.label}
                        </span>
                      </td>
                      {/* Actions */}
                      <td className="py-4.5 px-6 text-center">
                        <Link
                          to={`/challans/${challan.id}`}
                          className="inline-flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-900 hover:bg-indigo-950/20 text-slate-400 hover:text-indigo-400 border border-slate-800 hover:border-indigo-900/30 transition-all duration-200 text-xs font-semibold"
                        >
                          <Eye className="h-4 w-4" />
                          View Details
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination footer */}
        {!loading && challans.length > 0 && (
          <div className="p-4 border-t border-slate-800 bg-slate-900/20 flex items-center justify-between text-xs text-slate-400">
            <p>Showing <span className="text-slate-300 font-semibold">{challans.length}</span> of <span className="text-slate-300 font-semibold">{total}</span> challans</p>
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
    </div>
  );
};
