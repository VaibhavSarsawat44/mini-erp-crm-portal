import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  MessageSquare, 
  Send, 
  AlertCircle, 
  Building2, 
  FileText,
  Phone,
  Mail,
  MapPin,
  Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NoteCreator {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface CustomerNote {
  id: string;
  note: string;
  createdAt: string;
  createdBy: NoteCreator;
}

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
  notes: CustomerNote[];
}

export const CustomerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomerDetails = async () => {
    try {
      const response = await axios.get(`/api/customers/${id}`);
      if (response.data.status === 'success') {
        setCustomer(response.data.data.customer);
      }
    } catch (err) {
      console.error('Failed to load customer details:', err);
      setError('Failed to retrieve customer record.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerDetails();
  }, [id]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    setAddingNote(true);
    setError(null);

    try {
      const response = await axios.post(`/api/customers/${id}/notes`, {
        note: noteText.trim()
      });
      
      if (response.data.status === 'success') {
        setNoteText('');
        // Insert newly added note at top of notes list locally
        if (customer) {
          setCustomer({
            ...customer,
            notes: [response.data.data.note, ...customer.notes]
          });
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to create follow-up note.');
    } finally {
      setAddingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="space-y-4">
        <Link to="/customers" className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition">
          <ArrowLeft className="h-4 w-4" />
          Back to Customers
        </Link>
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-center">
          <AlertCircle className="h-8 w-8 mx-auto text-rose-400 mb-2" />
          <p className="font-semibold">Customer record not found.</p>
        </div>
      </div>
    );
  }

  const roleColors: Record<string, string> = {
    ADMIN: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
    SALES: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    WAREHOUSE: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    ACCOUNTS: 'bg-sky-500/15 text-sky-400 border-sky-500/20',
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

  const isSalesOrAdmin = user?.role === 'ADMIN' || user?.role === 'SALES';

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      {/* Header Back Button */}
      <div>
        <Link 
          to="/customers" 
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Customers
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 items-start">
        {/* Profile Card */}
        <div className="lg:col-span-1 glass-card rounded-2xl border border-slate-800/60 p-6 space-y-6">
          {/* Main ID info */}
          <div className="space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">{customer.businessName}</h2>
              <p className="text-sm text-slate-400 mt-0.5">Primary: {customer.name}</p>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${typeColors[customer.type]}`}>
                {customer.type}
              </span>
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${statusColors[customer.status]}`}>
                {customer.status}
              </span>
            </div>
          </div>

          {/* Details list */}
          <div className="pt-4 border-t border-slate-800/60 space-y-4 text-sm">
            {/* Email */}
            <div className="flex gap-3">
              <Mail className="h-4.5 w-4.5 text-slate-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Email Address</p>
                <p className="text-slate-300 mt-0.5">{customer.email}</p>
              </div>
            </div>

            {/* Phone */}
            <div className="flex gap-3">
              <Phone className="h-4.5 w-4.5 text-slate-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Mobile Number</p>
                <p className="text-slate-300 mt-0.5">{customer.mobile}</p>
              </div>
            </div>

            {/* GST */}
            <div className="flex gap-3">
              <FileText className="h-4.5 w-4.5 text-slate-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">GST Registration</p>
                <p className="text-slate-300 mt-0.5">{customer.gstNumber || 'N/A'}</p>
              </div>
            </div>

            {/* Follow up date */}
            <div className="flex gap-3">
              <Calendar className="h-4.5 w-4.5 text-slate-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Next Follow Up</p>
                <p className="text-slate-300 mt-0.5">
                  {customer.followUpDate ? new Date(customer.followUpDate).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric'
                  }) : 'No follow-up scheduled'}
                </p>
              </div>
            </div>

            {/* Address */}
            <div className="flex gap-3">
              <MapPin className="h-4.5 w-4.5 text-slate-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Billing Address</p>
                <p className="text-slate-300 mt-0.5 leading-relaxed">{customer.address}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Notes & Timeline */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Note Input */}
          {isSalesOrAdmin && (
            <div className="glass-card rounded-2xl border border-slate-800/60 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-indigo-400" />
                <h3 className="text-sm font-semibold text-slate-200">Log Follow Up Activity Note</h3>
              </div>

              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="h-4.5 w-4.5 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleAddNote} className="relative">
                <textarea
                  rows={2}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Record call discussion notes, follow-up resolutions, client feedback..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-4 pr-14 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/30 transition resize-none"
                />
                <button
                  type="submit"
                  disabled={addingNote || !noteText.trim()}
                  className="absolute right-3 bottom-3 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition disabled:opacity-30 disabled:hover:bg-indigo-600 flex items-center justify-center cursor-pointer shadow-lg shadow-indigo-600/10"
                >
                  <Send className="h-4.5 w-4.5" />
                </button>
              </form>
            </div>
          )}

          {/* Timeline */}
          <div className="glass-card rounded-2xl border border-slate-800/60 p-6 space-y-6 flex-1">
            <h3 className="text-base font-bold text-slate-200">Follow-up Log Timeline</h3>

            {customer.notes.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Clock className="h-10 w-10 mx-auto text-slate-700 mb-2" />
                <p className="text-sm">No recorded follow-up activity logs for this client.</p>
              </div>
            ) : (
              <div className="relative pl-6 border-l-2 border-slate-800 space-y-6">
                {customer.notes.map((note) => (
                  <div key={note.id} className="relative group">
                    {/* Circle Node indicator */}
                    <span className="absolute -left-[31px] top-1.5 h-4.5 w-4.5 rounded-full bg-slate-950 border-2 border-indigo-500 flex items-center justify-center group-hover:scale-110 transition duration-150">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                    </span>

                    {/* Note Box */}
                    <div className="p-4 bg-slate-900/40 rounded-xl border border-slate-850 space-y-3 shadow">
                      {/* Note meta */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 text-slate-300">
                          <User className="h-4 w-4 text-slate-500" />
                          <span className="font-semibold">{note.createdBy.name}</span>
                          <span className={`text-[8px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border ${roleColors[note.createdBy.role]}`}>
                            {note.createdBy.role}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Clock className="h-3.5 w-3.5" />
                          <span>
                            {new Date(note.createdAt).toLocaleString('en-US', {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Note Text */}
                      <p className="text-sm text-slate-300 leading-relaxed font-sans">{note.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
