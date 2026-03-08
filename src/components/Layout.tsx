import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  FileText,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();
  const { showToast } = useToast();

  const handleLogout = async () => {
    try {
      await signOut();
      showToast('Logged out successfully', 'success');
      navigate('/login');
    } catch (error) {
      showToast('Failed to logout', 'error');
    }
  };

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/members', icon: Users, label: 'Members' },
    { path: '/payments', icon: CreditCard, label: 'Payments' },
    { path: '/reports', icon: FileText, label: 'Reports' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-40 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Arla Vikas Committee</h1>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <aside
        className={`fixed top-0 left-0 bottom-0 w-64 bg-white border-r border-gray-200 z-50 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">Arla Vikas Committee</h1>
            <p className="text-sm text-gray-600 mt-1">Committee Management</p>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-200">
            <div className="mb-4 px-4 py-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
              <p className="text-xs text-gray-600 capitalize">{profile?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="lg:ml-64 pt-16 lg:pt-0">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
