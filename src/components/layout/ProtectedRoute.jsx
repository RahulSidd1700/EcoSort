import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, homePathForRole } from '../../hooks/useAuth';
import { PageLoader } from '../ui/LoadingSpinner';
import Button from '../ui/Button';
import { logout } from '../../services/authService';

/**
 * Guards routes in the browser. This is only for navigation/UX - real
 * protection comes from Firestore Security Rules and Cloud Functions.
 */
export default function ProtectedRoute({ roles }) {
  const { user, profile, role, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader label="Checking your account..." />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-xl font-semibold">We couldn't load your EcoSort profile.</h1>
        <p className="text-sm text-slate-500">
          If you just registered, wait a few seconds and refresh. Otherwise please log in again.
        </p>
        <div className="flex gap-2">
          <Button onClick={() => window.location.reload()}>Refresh</Button>
          <Button variant="secondary" onClick={logout}>
            Logout
          </Button>
        </div>
      </div>
    );
  }
  if (roles && !roles.includes(role)) return <Navigate to={homePathForRole(role)} replace />;
  return <Outlet />;
}
