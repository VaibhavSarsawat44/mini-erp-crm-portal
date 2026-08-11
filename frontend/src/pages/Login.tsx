import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Shield, Mail, Lock, AlertCircle, Loader2, Sun, Moon, Zap } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormInputs = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormInputs) => {
    setLoading(true);
    setApiError(null);
    try {
      await login(data.email, data.password);
      navigate('/');
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.message || 'Login failed. Please verify your credentials.';
      setApiError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (email: string) => {
    setValue('email', email);
    setValue('password', 'Password123');
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center grid-bg p-4 relative overflow-hidden">
      {/* Floating Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 z-20 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-indigo-400 cursor-pointer hover-lift flex items-center justify-center transition shadow-lg"
        title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
      >
        {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      {/* Decorative Glow Spots */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md glass-card rounded-3xl border border-slate-800/80 shadow-2xl p-8 relative z-10">
        
        {/* Branding header with Floating logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="logo-float bg-indigo-600 p-3.5 rounded-2xl shadow-xl shadow-indigo-600/25 flex items-center justify-center text-white mb-4">
            <Shield className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-100 bg-gradient-to-r from-indigo-500 via-indigo-400 to-indigo-600 bg-clip-text text-transparent">
            Vortex ERP Portal
          </h1>
          <p className="text-slate-500 text-xs mt-1">Sign in to manage customers, inventory and dispatches</p>
        </div>

        {apiError && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start gap-2.5">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
            <span>{apiError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Email input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400" htmlFor="email">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Mail className="h-4.5 w-4.5" />
              </span>
              <input
                id="email"
                type="email"
                placeholder="you@company.com"
                {...register('email')}
                className={`w-full bg-slate-900 border ${
                  errors.email ? 'border-rose-500 focus:ring-rose-500/20' : 'border-slate-850 focus:ring-indigo-500/20'
                } rounded-xl py-3 pl-11 pr-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:border-indigo-500/30 transition-all duration-200`}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-rose-400 mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* Password input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Lock className="h-4.5 w-4.5" />
              </span>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
                className={`w-full bg-slate-900 border ${
                  errors.password ? 'border-rose-500 focus:ring-rose-500/20' : 'border-slate-850 focus:ring-indigo-500/20'
                } rounded-xl py-3 pl-11 pr-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:border-indigo-500/30 transition-all duration-200`}
              />
            </div>
            {errors.password && (
              <p className="text-xs text-rose-400 mt-1">{errors.password.message}</p>
            )}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl hover-lift flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/35 disabled:opacity-50 mt-1"
          >
            {loading ? (
              <>
                <Loader2 className="h-4.5 w-4.5 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Clickable Quick Login Deck */}
        <div className="mt-8 pt-6 border-t border-slate-850 text-xs">
          <p className="font-bold text-slate-300 mb-3 flex items-center gap-1">
            <Zap className="h-3.5 w-3.5 text-indigo-400" />
            <span>Quick Login Profiles:</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { role: 'Admin', email: 'admin@company.com', style: 'border-rose-500/20 text-rose-400 hover:bg-rose-500/5' },
              { role: 'Sales', email: 'sales@company.com', style: 'border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/5' },
              { role: 'Warehouse', email: 'warehouse@company.com', style: 'border-amber-500/20 text-amber-400 hover:bg-amber-500/5' },
              { role: 'Accounts', email: 'accounts@company.com', style: 'border-sky-500/20 text-sky-400 hover:bg-sky-500/5' },
            ].map((d) => (
              <button
                key={d.role}
                type="button"
                onClick={() => handleQuickLogin(d.email)}
                className={`p-2.5 rounded-xl border text-left cursor-pointer transition hover-lift ${d.style}`}
              >
                <p className="font-bold text-[9px] uppercase tracking-wider">{d.role}</p>
                <p className="text-[9px] text-slate-500 mt-0.5 truncate">{d.email}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
