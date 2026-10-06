import { Suspense, useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { Bell, Menu } from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import { PageLoader } from '../components/ui/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import { useRealtime } from '../hooks/useRealtime';
import { subscribeNotifications } from '../services/notificationService';
import { logout } from '../services/authService';
import { getEcoLevel } from '../utils/impact';

export default function DashboardLayout() {
  const { profile, role } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: notifications } = useRealtime(
    (ok, fail) => subscribeNotifications(profile.uid, ok, fail),
    [profile.uid],
  );
  const unread = notifications.filter((n) => !n.read).length;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-2">
        Skip to content
      </a>
      <Sidebar role={role} open={open} onClose={() => setOpen(false)} onLogout={handleLogout} unreadCount={unread} />
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button
            className="rounded-lg p-2 hover:bg-slate-100 lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <div className="hidden text-sm text-slate-500 lg:block">
            Signed in as <span className="font-medium text-slate-700 capitalize">{role}</span>
          </div>
          <div className="flex items-center gap-3">
            {role === 'user' && (
              <Link
                to="/eco-points"
                className="hidden rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-800 sm:block"
              >
                {getEcoLevel(profile.ecoPoints).emoji} {profile.ecoPoints || 0} pts
              </Link>
            )}
            <Link
              to="/notifications"
              className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
              aria-label={`Notifications (${unread} unread)`}
            >
              <Bell size={22} />
              {unread > 0 && (
                <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unread}
                </span>
              )}
            </Link>
            <Link to="/profile" className="flex items-center gap-2" aria-label="Profile">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 font-semibold text-white">
                {profile.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
              <span className="hidden text-sm font-medium text-slate-700 md:block">{profile.name}</span>
            </Link>
          </div>
        </header>
        <main id="main" className="mx-auto max-w-7xl p-4 sm:p-6">
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
