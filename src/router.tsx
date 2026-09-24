import { lazy, Suspense } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { PublicLayout } from '@/components/layout/PublicLayout';

// Auth pages
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';

// Public
import VerifyCertificate from '@/pages/public/VerifyCertificate';
import PublicDiscover from '@/pages/public/PublicDiscover';
import OrganizerProfile from '@/pages/public/OrganizerProfile';
import StudentPortfolio from '@/pages/public/StudentPortfolio';
import Home from '@/pages/Home';
import NotFound from '@/pages/NotFound';

// Role-based pages (lazy loaded)
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'));
const OrganizerManagement = lazy(() => import('@/pages/admin/OrganizerManagement'));
const CategoryManagement = lazy(() => import('@/pages/admin/CategoryManagement'));
const AppSettingsPage = lazy(() => import('@/pages/admin/Settings'));
const AdminAnalytics = lazy(() => import('@/pages/admin/Analytics'));
const QuotaInbox = lazy(() => import('@/pages/admin/QuotaInbox'));

const OrganizerDashboard = lazy(() => import('@/pages/organizer/Dashboard'));
const WorkshopList = lazy(() => import('@/pages/organizer/WorkshopList'));
const WorkshopDetailOrganizer = lazy(() => import('@/pages/organizer/WorkshopDetail'));
const ResourceManagement = lazy(() => import('@/pages/organizer/ResourceManagement'));
const TaskManagement = lazy(() => import('@/pages/organizer/TaskManagement'));
const CommunityManagement = lazy(() => import('@/pages/organizer/CommunityManagement'));
const CertificateReview = lazy(() => import('@/pages/organizer/CertificateReview'));
const GatePassScanner = lazy(() => import('@/pages/organizer/GatePassScanner'));

const ParticipantDashboard = lazy(() => import('@/pages/participant/Dashboard'));
const DiscoverPage = lazy(() => import('@/pages/participant/Discover'));
const WorkshopDetailParticipant = lazy(() => import('@/pages/participant/WorkshopDetail'));
const SchedulePage = lazy(() => import('@/pages/participant/Schedule'));
const ProgressPage = lazy(() => import('@/pages/participant/Progress'));
const CertificatesPage = lazy(() => import('@/pages/participant/Certificates'));
const NotificationsPage = lazy(() => import('@/pages/participant/Notifications'));
const SettingsPage = lazy(() => import('@/pages/participant/Settings'));
const GatePass = lazy(() => import('@/pages/participant/GatePass'));

const Loading = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

const S = ({ children }: { children: React.ReactNode }) => <Suspense fallback={<Loading />}>{children}</Suspense>;

export const routers = [
  // Public routes share one header/footer shell, so the four pre-auth pages can
  // never drift apart the way their hand-rolled top bars had.
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/explore', element: <PublicDiscover /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/organizer/profile/:id', element: <OrganizerProfile /> },
      { path: '/p/:username', element: <StudentPortfolio /> },
    ],
  },
  // Standalone: a scanned certificate link should render nothing but the result.
  { path: '/verify/:certificateId', element: <VerifyCertificate /> },

  // Protected routes with layout
  {
    element: <ProtectedRoute><AppLayout /></ProtectedRoute>,
    children: [
      // Shared
      { path: '/dashboard', element: <S><RoleRouter /></S> },
      { path: '/notifications', element: <S><NotificationsPage /></S> },
      { path: '/settings', element: <S><SettingsPage /></S> },

      // Admin
      { path: '/admin/organizers', element: <ProtectedRoute roles={['admin']}><S><OrganizerManagement /></S></ProtectedRoute> },
      { path: '/admin/categories', element: <ProtectedRoute roles={['admin']}><S><CategoryManagement /></S></ProtectedRoute> },
      { path: '/admin/settings', element: <ProtectedRoute roles={['admin']}><S><AppSettingsPage /></S></ProtectedRoute> },
      { path: '/admin/analytics', element: <ProtectedRoute roles={['admin']}><S><AdminAnalytics /></S></ProtectedRoute> },
      { path: '/admin/quota-inbox', element: <ProtectedRoute roles={['admin']}><S><QuotaInbox /></S></ProtectedRoute> },

      // Organizer
      { path: '/organizer/workshops', element: <ProtectedRoute roles={['organizer', 'admin']}><S><WorkshopList /></S></ProtectedRoute> },
      { path: '/organizer/workshops/:id', element: <ProtectedRoute roles={['organizer', 'admin']}><S><WorkshopDetailOrganizer /></S></ProtectedRoute> },
      { path: '/organizer/workshops/:id/resources', element: <ProtectedRoute roles={['organizer', 'admin']}><S><ResourceManagement /></S></ProtectedRoute> },
      { path: '/organizer/workshops/:id/tasks', element: <ProtectedRoute roles={['organizer', 'admin']}><S><TaskManagement /></S></ProtectedRoute> },
      { path: '/organizer/workshops/:id/community', element: <ProtectedRoute roles={['organizer', 'admin']}><S><CommunityManagement /></S></ProtectedRoute> },
      { path: '/organizer/workshops/:id/certificates', element: <ProtectedRoute roles={['organizer', 'admin']}><S><CertificateReview /></S></ProtectedRoute> },
      { path: '/organizer/workshops/:id/gate-pass-scanner', element: <ProtectedRoute roles={['organizer', 'admin']}><S><GatePassScanner /></S></ProtectedRoute> },

      // Participant
      { path: '/discover', element: <ProtectedRoute roles={['participant']}><S><DiscoverPage /></S></ProtectedRoute> },
      { path: '/workshops/:id', element: <ProtectedRoute roles={['participant']}><S><WorkshopDetailParticipant /></S></ProtectedRoute> },
      { path: '/workshops/:id/gate-pass', element: <ProtectedRoute roles={['participant']}><S><GatePass /></S></ProtectedRoute> },
      { path: '/schedule', element: <ProtectedRoute roles={['participant']}><S><SchedulePage /></S></ProtectedRoute> },
      { path: '/progress', element: <ProtectedRoute roles={['participant']}><S><ProgressPage /></S></ProtectedRoute> },
      { path: '/certificates', element: <ProtectedRoute roles={['participant']}><S><CertificatesPage /></S></ProtectedRoute> },
    ],
  },

  // Catch-all
  { path: '*', element: <NotFound /> },
];

// Route dashboard by role
import { useAuth } from '@/lib/authContext';
import { Navigate } from 'react-router-dom';

function RoleRouter() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (user.role === 'admin') return <S><AdminDashboard /></S>;
  if (user.role === 'organizer') return <S><OrganizerDashboard /></S>;
  return <S><ParticipantDashboard /></S>;
}

declare global {
  interface Window {
    __routers__: typeof routers;
  }
}
window.__routers__ = routers;
