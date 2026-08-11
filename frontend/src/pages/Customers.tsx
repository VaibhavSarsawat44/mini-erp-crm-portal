import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Eye, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Check, 
  AlertCircle,
  Users 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const customerFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  mobile: z.string().min(1, 'Mobile number is required'),
  email: z.string().email('Invalid email address'),
  businessName: z.string().min(1, 'Business name is required'),
  gstNumber: z.string().optional().nullable().transform(val => val === '' ? null : val),
  type: z.enum(['RETAIL', 'WHOLESALE', 'DISTRIBUTOR']),
  address: z.string().min(1, 'Address is required'),
  status: z.enum(['LEAD', 'ACTIVE', 'INACTIVE']),
  followUpDate: z.string().optional().nullable().transform(val => val === '' ? null : val),
});

type CustomerFormInputs = z.infer<typeof customerFormSchema>;

interface Customer {
  id: string;
  name: string;
  mobile: string;
  email: string;
  businessName: string;
  gstNumber: string | null;
  type: 'RETAIL' | 'WHOLESALE' | 'DISTRIBUTOR';
  address: string;
  status: 'LEAD' | 'ACTIVE' | 'INACTIVE';
  followUpDate: string | null;
  createdAt: string;
}

export const Customers: React.FC = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 8;

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const isSalesOrAdmin = user?.role === 'ADMIN' || user?.role === 'SALES';

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<CustomerFormInputs>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: '',
      mobile: '',
      email: '',
      businessName: '',
      gstNumber: '',
      type: 'WHOLESALE',
      address: '',
      status: 'LEAD',
      followUpDate: '',
    }
  });

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/customers', {
        params: {
          q: search,
          status: statusFilter || undefined,
          type: typeFilter || undefined,
          page,
          limit,
        }
      });
      if (response.data.status === 'success') {
        setCustomers(response.data.data.customers);
        setTotal(response.data.data.total);
        setTotalPages(response.data.data.totalPages);
      }
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchCustomers();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [search, statusFilter, typeFilter, page]);

  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    reset({
      name: '',
      mobile: '',
      email: '',
      businessName: '',
      gstNumber: '',
      type: 'WHOLESALE',
      address: '',
      status: 'LEAD',
      followUpDate: '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setValue('name', customer.name);
    setValue('mobile', customer.mobile);
    setValue('email', customer.email);
    setValue('businessName', customer.businessName);
    setValue('gstNumber', customer.gstNumber || '');
    setValue('type', customer.type);
    setValue('address', customer.address);
    setValue('status', customer.status);
    setValue('followUpDate', customer.followUpDate ? customer.followUpDate.split('T')[0] : '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const onSubmit = async (data: CustomerFormInputs) => {
    setFormError(null);
    try {
      if (editingCustomer) {
        // Update Customer
        const response = await axios.put(`/api/customers/${editingCustomer.id}`, data);
        if (response.data.status === 'success') {
          setIsModalOpen(false);
          fetchCustomers();
        }
      } else {
        // Create Customer
        const response = await axios.post('/api/customers', data);
        if (response.data.status === 'success') {
          setIsModalOpen(false);
          fetchCustomers();
        }
      }
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.message || 'Action failed. Please verify inputs.';
      setFormError(errMsg);
    }
  };

  const statusColors = {
    LEAD: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    ACTIVE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    INACTIVE: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  };

  const typeColors = {
    RETAIL: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    WHOLESALE: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    DISTRIBUTOR: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  };

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Customers</h1>
          <p className="text-sm text-slate-400">Manage client details, types, leads, and timelines</p>
        </div>
        {isSalesOrAdmin && (
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2.5 rounded-xl transition-all duration-200 cursor-pointer shadow-lg shadow-indigo-600/15"
          >
            <Plus className="h-4 w-4" />
            Add Customer
          </button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 glass-card rounded-2xl border border-slate-800/60">
        {/* Search */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search by name, email, business..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/30 transition-all"
          />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
            <Filter className="h-4 w-4" />
          </span>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/30 transition-all cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="LEAD">Lead</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        {/* Type Filter */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
            <Filter className="h-4 w-4" />
          </span>
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/30 transition-all cursor-pointer"
          >
            <option value="">All Types</option>
            <option value="RETAIL">Retail</option>
            <option value="WHOLESALE">Wholesale</option>
            <option value="DISTRIBUTOR">Distributor</option>
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
          ) : customers.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <Users className="h-12 w-12 mx-auto text-slate-700 mb-3" />
              <p className="text-sm">No customers found matching the search filters.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/40 text-xs uppercase tracking-wider font-semibold text-slate-400">
                  <th className="py-4 px-6">Business / Client Name</th>
                  <th className="py-4 px-6">Contact Detail</th>
                  <th className="py-4 px-6">Type</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-sm text-slate-300">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-900/25 transition-colors group">
                    <td className="py-4.5 px-6">
                      <p className="font-bold text-slate-200">{customer.businessName}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{customer.name}</p>
                    </td>
                    <td className="py-4.5 px-6">
                      <p className="text-slate-300">{customer.email}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{customer.mobile}</p>
                    </td>
                    <td className="py-4.5 px-6">
                      <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md border ${typeColors[customer.type]}`}>
                        {customer.type}
                      </span>
                    </td>
                    <td className="py-4.5 px-6">
                      <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md border ${statusColors[customer.status]}`}>
                        {customer.status}
                      </span>
                    </td>
                    <td className="py-4.5 px-6 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <Link
                          to={`/customers/${customer.id}`}
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-indigo-950/20 text-slate-400 hover:text-indigo-400 border border-slate-800 hover:border-indigo-900/30 transition-all duration-200"
                          title="View timeline notes"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        {isSalesOrAdmin && (
                          <button
                            onClick={() => handleOpenEditModal(customer)}
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-emerald-950/20 text-slate-400 hover:text-emerald-400 border border-slate-800 hover:border-emerald-900/30 transition-all duration-200 cursor-pointer"
                            title="Edit customer details"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination footer */}
        {!loading && customers.length > 0 && (
          <div className="p-4 border-t border-slate-800 bg-slate-900/20 flex items-center justify-between text-xs text-slate-400">
            <p>Showing <span className="text-slate-300 font-semibold">{customers.length}</span> of <span className="text-slate-300 font-semibold">{total}</span> customers</p>
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

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal header */}
            <div className="px-6 py-4.5 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">
                {editingCustomer ? 'Edit Customer Details' : 'Add New Customer'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Error Banner */}
            {formError && (
              <div className="m-6 mb-0 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl flex items-start gap-2.5 text-xs">
                <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto p-6 space-y-4 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Business Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Business Name</label>
                  <input
                    type="text"
                    placeholder="Acme Distributors Ltd"
                    {...register('businessName')}
                    className={`w-full bg-slate-950 border ${errors.businessName ? 'border-rose-500 focus:ring-rose-500/20' : 'border-slate-800 focus:ring-indigo-500/20'} rounded-xl py-2.5 px-4 text-slate-100 text-sm focus:outline-none focus:ring-4 transition`}
                  />
                  {errors.businessName && <p className="text-xs text-rose-400">{errors.businessName.message}</p>}
                </div>

                {/* Primary Contact Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Contact Name</label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    {...register('name')}
                    className={`w-full bg-slate-950 border ${errors.name ? 'border-rose-500 focus:ring-rose-500/20' : 'border-slate-800 focus:ring-indigo-500/20'} rounded-xl py-2.5 px-4 text-slate-100 text-sm focus:outline-none focus:ring-4 transition`}
                  />
                  {errors.name && <p className="text-xs text-rose-400">{errors.name.message}</p>}
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Email Address</label>
                  <input
                    type="email"
                    placeholder="john@acme.com"
                    {...register('email')}
                    className={`w-full bg-slate-950 border ${errors.email ? 'border-rose-500 focus:ring-rose-500/20' : 'border-slate-800 focus:ring-indigo-500/20'} rounded-xl py-2.5 px-4 text-slate-100 text-sm focus:outline-none focus:ring-4 transition`}
                  />
                  {errors.email && <p className="text-xs text-rose-400">{errors.email.message}</p>}
                </div>

                {/* Mobile */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Mobile Number</label>
                  <input
                    type="text"
                    placeholder="9876543210"
                    {...register('mobile')}
                    className={`w-full bg-slate-950 border ${errors.mobile ? 'border-rose-500 focus:ring-rose-500/20' : 'border-slate-800 focus:ring-indigo-500/20'} rounded-xl py-2.5 px-4 text-slate-100 text-sm focus:outline-none focus:ring-4 transition`}
                  />
                  {errors.mobile && <p className="text-xs text-rose-400">{errors.mobile.message}</p>}
                </div>

                {/* GST Number */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">GST Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="27AAAAA1111A1Z1"
                    {...register('gstNumber')}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-100 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500/30 transition"
                  />
                </div>

                {/* Customer Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Customer Type</label>
                  <select
                    {...register('type')}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-100 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500/30 transition cursor-pointer"
                  >
                    <option value="RETAIL">Retail</option>
                    <option value="WHOLESALE">Wholesale</option>
                    <option value="DISTRIBUTOR">Distributor</option>
                  </select>
                </div>

                {/* Customer Status */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Status</label>
                  <select
                    {...register('status')}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-100 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500/30 transition cursor-pointer"
                  >
                    <option value="LEAD">Lead</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>

                {/* Follow Up Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Follow Up Date (Optional)</label>
                  <input
                    type="date"
                    {...register('followUpDate')}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-100 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500/30 transition"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Address</label>
                <textarea
                  rows={3}
                  placeholder="Street, District, State, Postal Code"
                  {...register('address')}
                  className={`w-full bg-slate-950 border ${errors.address ? 'border-rose-500 focus:ring-rose-500/20' : 'border-slate-800 focus:ring-indigo-500/20'} rounded-xl py-2.5 px-4 text-slate-100 text-sm focus:outline-none focus:ring-4 transition resize-none`}
                />
                {errors.address && <p className="text-xs text-rose-400">{errors.address.message}</p>}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 text-sm font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2.5 rounded-xl transition cursor-pointer shadow-lg shadow-indigo-600/15"
                >
                  <Check className="h-4 w-4" />
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
