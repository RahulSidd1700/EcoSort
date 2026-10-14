
import { Suspense, useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { Bell, Menu, Home } from 'lucide-react';

import Sidebar from '../components/layout/Sidebar';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import { PageLoader } from '../components/ui/LoadingSpinner';

import { useAuth, homePathForRole } from '../hooks/useAuth';
import { useRealtime } from '../hooks/useRealtime';
import { subscribeNotifications } from '../services/notificationService';
import { logout } from '../services/authService';
import { getEcoLevel } from '../utils/impact';

export default function DashboardLayout() {
  const { user, profile, role, loading, profileError } = useAuth();

  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // Subscribe only when a valid profile UID exists.
  const { data: notifications = [] } = useRealtime(
    (ok, fail) => {
      if (!profile?.uid) {
        return () => {};
      }

      return subscribeNotifications(profile.uid, ok, fail);
    },
    [profile?.uid],
  );

  const unread = notifications.filter((n) => !n.read).length;

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Wait for authentication and profile loading.
  if (loading) {
    return <PageLoader label="Loading your EcoSort dashboard..." />;
  }

  // Do not render the layout without an authenticated user.
  if (!user) {
    navigate('/login', { replace: true });
    return <PageLoader />;
  }

  // Prevent null profile access and display a useful error.
  if (profileError || !profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-xl font-semibold">
          Unable to load your EcoSort profile
        </h1>

        <p className="max-w-md text-sm text-slate-500">
          {profileError ||
            'Your profile is not available. Please try again.'}
        </p>

        <div className="flex gap-2">
          <button
            className="rounded-lg bg-green-600 px-4 py-2 text-white"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>

          <button
            className="rounded-lg border px-4 py-2"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-2"
      >
        Skip to content
      </a>

      <Sidebar
        role={role}
        open={open}
        onClose={() => setOpen(false)}
        onLogout={handleLogout}
        unreadCount={unread}
      />

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>

            <Link
              to={homePathForRole(role)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-slate-700 transition-colors hover:bg-brand-50 hover:text-brand-700"
              title="Dashboard Home"
              aria-label="Go to Dashboard Home"
            >
              <Home size={20} className="shrink-0 text-brand-600" />
              <span className="text-sm font-semibold text-slate-800">
                Home
              </span>
            </Link>

            <div className="hidden text-sm text-slate-500 md:block">
              Signed in as{' '}
              <span className="font-medium capitalize text-slate-700">
                {role}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {role === 'user' && (
              <Link
                to="/eco-points"
                className="hidden rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-800 sm:block"
              >
                {getEcoLevel(profile.ecoPoints || 0).emoji}{' '}
                {profile.ecoPoints || 0} pts
              </Link>
            )}

            <Link
              to="/notifications"
              className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
              aria-label={`Notifications (${unread} unread)`}
            >
              <Bell size={22} />

              {unread > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unread}
                </span>
              )}
            </Link>

            <Link
              to="/profile"
              className="flex items-center gap-2"
              aria-label="Profile"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 font-semibold text-white">
                {profile.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>

              <span className="hidden text-sm font-medium text-slate-700 md:block">
                {profile.name || 'My Profile'}
              </span>
            </Link>
          </div>
        </header>

        <main
          id="main"
          className="mx-auto max-w-7xl p-4 sm:p-6"
        >
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
