import React from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  FileText, 
  LogOut, 
  User as UserIcon,
  Shield,
  Sun,
  Moon
} from 'lucide-react';

export const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Customers', path: '/customers', icon: Users },
    { name: 'Products', path: '/products', icon: Package },
    { name: 'Challans', path: '/challans', icon: FileText },
  ];

  const roleColors: Record<string, string> = {
    ADMIN: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    SALES: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    WAREHOUSE: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    ACCOUNTS: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 glass-panel border-r border-slate-800 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo Branding */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="bg-indigo-600 p-1.5 rounded-lg flex items-center justify-center text-white">
                <Shield className="h-5 w-5" />
              </div>
              <span className="text-lg font-bold tracking-wider bg-gradient-to-r from-slate-100 via-indigo-500 to-indigo-600 bg-clip-text text-transparent">
                VORTEX ERP
              </span>
            </div>
            
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-indigo-400 cursor-pointer hover-lift flex items-center justify-center transition"
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            >
              {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="mt-6 px-4 space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || 
                (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-200 border-l-4 border-indigo-500 pl-3 font-medium'
                      : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-100'
                  }`}
                >
                  <Icon className={`h-5 w-5 transition-transform duration-200 group-hover:scale-105 ${
                    isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'
                  }`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-800/60 bg-slate-950/30">
          <div className="flex items-center gap-3 px-2 py-3 rounded-xl mb-3">
            <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700/50 text-indigo-400">
              <UserIcon className="h-5 w-5" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-slate-200 truncate">{user?.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md border ${
                  user ? roleColors[user.role] : 'bg-slate-800'
                }`}>
                  {user?.role}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-slate-400 hover:text-rose-300 hover:bg-rose-950/20 border border-transparent hover:border-rose-900/30 transition-all duration-200 text-sm font-medium"
          >
            <LogOut className="h-4 w-4" />
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-950/50 overflow-y-auto">
        <div className="p-8 max-w-7xl w-full mx-auto flex-1 flex flex-col">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
