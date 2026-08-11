import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  Package, 
  FileText, 
  AlertTriangle, 
  ArrowRight,
  TrendingUp,
  Activity
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardStats {
  totalCustomers: number;
  totalProducts: number;
  lowStockCount: number;
  draftChallans: number;
  totalChallans: number;
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    totalProducts: 0,
    lowStockCount: 0,
    draftChallans: 0,
    totalChallans: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [custRes, prodRes, chalRes] = await Promise.all([
          axios.get('/api/customers?limit=1'),
          axios.get('/api/products?limit=100'),
          axios.get('/api/challans?limit=100'),
        ]);

        const products = prodRes.data.data.products || [];
        const challans = chalRes.data.data.challans || [];

        const lowStock = products.filter(
          (p: any) => p.currentStock < p.minStockAlert
        ).length;

        const drafts = challans.filter(
          (c: any) => c.status === 'DRAFT'
        ).length;

        setStats({
          totalCustomers: custRes.data.data.total || 0,
          totalProducts: prodRes.data.data.total || 0,
          lowStockCount: lowStock,
          draftChallans: drafts,
          totalChallans: chalRes.data.data.total || 0
        });
      } catch (err) {
        console.error('Failed to load dashboard statistics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  const statCards = [
    {
      name: 'Total Customers',
      value: stats.totalCustomers,
      description: 'Active database leads & buyers',
      icon: Users,
      color: 'from-blue-600 to-indigo-600',
      shadow: 'shadow-blue-500/10',
      link: '/customers',
    },
    {
      name: 'Active Products',
      value: stats.totalProducts,
      description: 'Items in catalog',
      icon: Package,
      color: 'from-emerald-600 to-teal-600',
      shadow: 'shadow-emerald-500/10',
      link: '/products',
    },
    {
      name: 'Low Stock Alerts',
      value: stats.lowStockCount,
      description: 'Items below warning thresholds',
      icon: AlertTriangle,
      color: stats.lowStockCount > 0 ? 'from-rose-600 to-orange-600' : 'from-slate-700 to-slate-800',
      shadow: stats.lowStockCount > 0 ? 'shadow-rose-500/10' : 'shadow-slate-500/5',
      link: '/products',
      alert: stats.lowStockCount > 0
    },
    {
      name: 'Draft Challans',
      value: stats.draftChallans,
      description: 'Pending operational challans',
      icon: FileText,
      color: 'from-indigo-600 to-violet-600',
      shadow: 'shadow-indigo-500/10',
      link: '/challans',
    },
  ];

  return (
    <div className="space-y-8 flex-1 flex flex-col">
      {/* Welcome Card */}
      <div className="glass-panel p-8 rounded-2xl border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="space-y-2 relative z-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Welcome back, <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">{user?.name}</span>
          </h1>
          <p className="text-slate-400 max-w-xl">
            You are logged in as <span className="text-indigo-300 font-semibold">{user?.role}</span>. Here is the operational summary for your company's distribution portal today.
          </p>
        </div>
        <div className="flex gap-4 shrink-0 relative z-10">
          <Link
            to="/challans/new"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-3 rounded-xl hover-lift shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30"
          >
            Create Challan
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.name}
              to={card.link}
              className={`glass-card p-6 rounded-2xl border border-slate-800/60 shadow-xl ${card.shadow} hover:border-slate-700/80 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden`}
            >
              {/* Top Row */}
              <div className="flex justify-between items-start">
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {card.name}
                  </span>
                  <p className="text-3xl font-bold text-slate-100 group-hover:text-white transition-colors duration-200">
                    {card.value}
                  </p>
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-br ${card.color} text-white shadow-md`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>

              {/* Description */}
              <div className="mt-4 pt-4 border-t border-slate-800/50 flex items-center justify-between text-xs">
                <span className="text-slate-400 group-hover:text-slate-300 transition-colors duration-200">
                  {card.description}
                </span>
                <span className="text-slate-500 group-hover:text-indigo-400 transition-all duration-200 transform translate-x-0 group-hover:translate-x-1">
                  &rarr;
                </span>
              </div>

              {/* Alert pulsing background */}
              {card.alert && (
                <div className="absolute inset-0 border border-rose-500/20 rounded-2xl pointer-events-none low-stock-alert"></div>
              )}
            </Link>
          );
        })}
      </div>

      {/* Activity / Info Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* Main Section */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl border border-slate-800/60 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-slate-200">Operational Overview</h2>
            </div>
            <p className="text-sm text-slate-400">
              Challan workflow and stock movements are synchronized in real-time. Use the sidebar to inspect:
            </p>
            <ul className="mt-4 space-y-3.5 text-sm">
              <li className="flex items-start gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-2 shrink-0"></span>
                <span className="text-slate-300">
                  <strong>Customer CRM:</strong> Track customer status from Leads to Active clients, add detailed follow-up logs on their profiles.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-2 shrink-0"></span>
                <span className="text-slate-300">
                  <strong>Product Catalog:</strong> Review real-time warehouse inventory, verify locations, and adjust stock quantities.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-500 mt-2 shrink-0"></span>
                <span className="text-slate-300">
                  <strong>Sales Challans:</strong> Process drafts, edit line items, and run transaction checks to confirm orders and deduct stock automatically.
                </span>
              </li>
            </ul>
          </div>

          <div className="mt-8 p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-500 flex items-center gap-3">
            <Activity className="h-5 w-5 text-slate-400 shrink-0" />
            <span>ERP DB system online: connected to Local docker cluster public schema postgresql v15 container.</span>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800/60 space-y-6">
          <h2 className="text-lg font-bold text-slate-200">Role Guidelines</h2>
          <div className="space-y-4 text-xs text-slate-400">
            <div className="p-3 rounded-xl border border-rose-500/10 bg-rose-500/5">
              <p className="font-semibold text-rose-300 uppercase mb-1">ADMIN Role</p>
              Full operations oversight, database management, stock corrections, and order confirmation capability.
            </div>
            <div className="p-3 rounded-xl border border-emerald-500/10 bg-emerald-500/5">
              <p className="font-semibold text-emerald-300 uppercase mb-1">SALES Role</p>
              Create customer profiles, log meeting/call follow-up notes, generate draft challans, and modify orders.
            </div>
            <div className="p-3 rounded-xl border border-amber-500/10 bg-amber-500/5">
              <p className="font-semibold text-amber-300 uppercase mb-1">WAREHOUSE Role</p>
              Monitor inventory stock counts, confirm draft challans (deducting stock), log manually received supply.
            </div>
            <div className="p-3 rounded-xl border border-sky-500/10 bg-sky-500/5">
              <p className="font-semibold text-sky-300 uppercase mb-1">ACCOUNTS Role</p>
              Read-only operations to verify accounts, examine historical confirmed challan invoice totals.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
