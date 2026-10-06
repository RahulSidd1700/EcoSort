import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { PageLoader } from './components/ui/LoadingSpinner';
import PublicLayout from './layouts/PublicLayout';
import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import FirebaseSetupNotice from './components/FirebaseSetupNotice';
import { isFirebaseConfigured } from './firebase/config';

// Public
import Landing from './pages/public/Landing';
import Login from './pages/public/Login';
import Register from './pages/public/Register';
import ForgotPassword from './pages/public/ForgotPassword';
import NotFound from './pages/public/NotFound';

// Shared (all roles)
import Marketplace from './pages/shared/Marketplace';
import ListingDetail from './pages/shared/ListingDetail';
import Notifications from './pages/shared/Notifications';
import Profile from './pages/shared/Profile';
import DisposalGuide from './pages/shared/DisposalGuide';

// User
import UserDashboard from './pages/user/UserDashboard';
import IdentifyWaste from './pages/user/IdentifyWaste';
import SellWaste from './pages/user/SellWaste';
import ListingForm from './pages/user/ListingForm';
import RequestPickup from './pages/user/RequestPickup';
import MyPickups from './pages/user/MyPickups';
import EcoPoints from './pages/user/EcoPoints';
import Impact from './pages/user/Impact';
import ReportProblem from './pages/user/ReportProblem';
import Partners from './pages/user/Partners';

// Collector and admin pages are loaded on demand, so normal users download less code.
const CollectorDashboard = lazy(() => import('./pages/collector/CollectorDashboard'));
const CollectorPickups = lazy(() => import('./pages/collector/CollectorPickups'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminWaste = lazy(() => import('./pages/admin/AdminWaste'));
const AdminMarketplace = lazy(() => import('./pages/admin/AdminMarketplace'));
const AdminPickups = lazy(() => import('./pages/admin/AdminPickups'));
const AdminCollectors = lazy(() => import('./pages/admin/AdminCollectors'));
const AdminComplaints = lazy(() => import('./pages/admin/AdminComplaints'));
const AdminPartners = lazy(() => import('./pages/admin/AdminPartners'));
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories'));
const AdminRewards = lazy(() => import('./pages/admin/AdminRewards'));
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));

export default function App() {
  if (!isFirebaseConfigured) return <FirebaseSetupNotice />;

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Route>

        {/* Any signed-in role */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/marketplace/:id" element={<ListingDetail />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/guide" element={<DisposalGuide />} />
          </Route>
        </Route>

        {/* USER */}
        <Route element={<ProtectedRoute roles={['user']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<UserDashboard />} />
            <Route path="/identify" element={<IdentifyWaste />} />
            <Route path="/sell" element={<SellWaste />} />
            <Route path="/sell/new" element={<ListingForm />} />
            <Route path="/sell/:id/edit" element={<ListingForm />} />
            <Route path="/pickups/new" element={<RequestPickup />} />
            <Route path="/pickups" element={<MyPickups />} />
            <Route path="/eco-points" element={<EcoPoints />} />
            <Route path="/impact" element={<Impact />} />
            <Route path="/report" element={<ReportProblem />} />
            <Route path="/partners" element={<Partners />} />
          </Route>
        </Route>

        {/* COLLECTOR / RECYCLER */}
        <Route element={<ProtectedRoute roles={['collector']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/collector" element={<CollectorDashboard />} />
            <Route path="/collector/assigned" element={<CollectorPickups mode="assigned" />} />
            <Route path="/collector/completed" element={<CollectorPickups mode="completed" />} />
          </Route>
        </Route>

        {/* ADMIN */}
        <Route element={<ProtectedRoute roles={['admin']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/waste" element={<AdminWaste />} />
            <Route path="/admin/marketplace" element={<AdminMarketplace />} />
            <Route path="/admin/pickups" element={<AdminPickups />} />
            <Route path="/admin/collectors" element={<AdminCollectors />} />
            <Route path="/admin/complaints" element={<AdminComplaints />} />
            <Route path="/admin/partners" element={<AdminPartners />} />
            <Route path="/admin/categories" element={<AdminCategories />} />
            <Route path="/admin/rewards" element={<AdminRewards />} />
            <Route path="/admin/analytics" element={<AdminAnalytics />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
