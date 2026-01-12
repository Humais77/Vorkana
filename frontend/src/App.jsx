// App.jsx – Updated version
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect, useState, lazy, Suspense } from 'react';

// Providers / Hooks
import { SecurityProvider } from './context/SecurityContext';
import { useAuthSync } from './hooks/useAuthSync';
import { useCheckAuth } from './hooks/useAuth';
// Layouts
import PublicLayout from './layouts/PublicLayout';

// Utils
import ScrollToTop from './components/ScrollToTop';
import VerificationWrapper from './components/VerificationWrapper';

// Admin
import ProtectedAdminRoute from './ProtectedAdminRoute';
import AdminLayout from './layouts/pages/admin/AdminLayout';
import AdminRoutes from './layouts/pages/admin/AdminRoutes';
import VerificationRedirect from './layouts/pages/profile/VerificationRedirect';
import ResetPasswordRedirect from './layouts/pages/profile/ResetPasswordRedirect';
import EmailVerificationHandler from './layouts/pages/profile/EmailVerificationHandler';
import VerificationStatus from './layouts/pages/profile/VerificationStatus';
import SessionMonitor from './components/SessionMonitor';

// =======================
// LAZY LOADED PAGES
// =======================
const Home = lazy(() => import('./layouts/pages/home/Home'));
const AboutUsPage = lazy(() => import('./layouts/pages/footer/AboutUsPage'));
const Signin = lazy(() => import('./layouts/pages/auth/Signin'));
const Signup = lazy(() => import('./layouts/pages/auth/Signup'));

const GigCreate = lazy(() => import('./layouts/pages/gigs/GigCreate'));
const GigDetails = lazy(() => import('./layouts/pages/gigs/GigDetails'));
const GigEdit = lazy(() => import('./layouts/pages/gigs/GigEdit'));
const GigListingsPage = lazy(() => import('./layouts/pages/gigs/GigListingPage'));
const GigsInfoPage = lazy(() => import('./layouts/pages/gigs/GigsInfoPage'));

const CategoryPage = lazy(() => import('./layouts/pages/category/CategoryPage'));
const SubcategoryDetailPage = lazy(() => import('./layouts/pages/category/SubcategoryDetailPage'));

const Profile = lazy(() => import('./layouts/pages/profile/Profile'));
const PublicProfile = lazy(() => import('./layouts/pages/profile/PublicProfile'));
const Dashboard = lazy(() => import('./layouts/pages/profile/Dashboard'));
const VerifyEmail = lazy(() => import('./layouts/pages/profile/VerifyEmail'));
const VerifiedPage = lazy(() => import('./layouts/pages/profile/VerifiedPage'));
const ForgotPassword = lazy(() => import('./layouts/pages/profile/ForgotPassword'));
const ResetPassword = lazy(() => import('./layouts/pages/profile/ResetPassword'));
const AccountDeactivated = lazy(() => import('./layouts/pages/profile/AccountDeactivated'));

const CreateService = lazy(() => import('./layouts/pages/services/CreateService'));
const EditService = lazy(() => import('./layouts/pages/services/EditService'));
const ServiceDetails = lazy(() => import('./layouts/pages/services/ServiceDetails'));
const ServiceListingPage = lazy(() => import('./layouts/pages/services/ServiceListingPage'));
const ServicesInfoPage = lazy(() => import('./layouts/pages/services/ServicesInfoPage'));
const PopularServicesPage = lazy(() => import('./components/services/PopularService'));

const OAuthSuccess = lazy(() => import('./layouts/pages/OAuthSuccess'));
const SearchResults = lazy(() => import('./layouts/pages/SearchResults'));
const NotFound = lazy(() => import('./layouts/pages/NotFound'));

// Loading fallback
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);
const CookieChecker = () => {
  useAuthSync();
  const { data: authCheck, isLoading } = useCheckAuth();
  
  useEffect(() => {
    if (!isLoading && authCheck) {
      console.log('Auth check result:', authCheck);
    }
  }, [authCheck, isLoading]);
  
  return null;
};
const App = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeTab, setActiveTab] = useState('signin');

useEffect(() => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('refreshToken');
    
    const cleanup = () => localStorage.removeItem('resetToken');
    cleanup();
    window.addEventListener('beforeunload', cleanup);
    return () => window.removeEventListener('beforeunload', cleanup);
  }, []);
  const openSigninModal = () => {
    setActiveTab('signin');
    setShowAuthModal(true);
  };

  const openSignupModal = () => {
    setActiveTab('signup');
    setShowAuthModal(true);
  };

  return (
    <BrowserRouter>
      <SecurityProvider>
        <ScrollToTop />
         <CookieChecker />
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route
              element={
                <PublicLayout
                  showAuthModal={showAuthModal}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  setShowAuthModal={setShowAuthModal}
                  openSigninModal={openSigninModal}
                  openSignupModal={openSignupModal}
                />
              }
            >
              <Route path="/" element={<Home />} />
              <Route path="/about-us" element={<AboutUsPage />} />
              <Route path="/signin" element={<Signin />} />
              <Route path="/signup" element={<Signup />} />

              <Route path="/create-gig" element={<GigCreate />} />
              <Route path="/gig/:id" element={<GigDetails />} />
              <Route path="/edit-gig/:id" element={<GigEdit />} />

              <Route path="/categories/:categoryId" element={<CategoryPage />} />
              <Route path="/categories/:categoryId/:subcategorySlug" element={<SubcategoryDetailPage />} />

              <Route path="/gigs" element={<GigListingsPage />} />
              <Route path="/what-are-gigs" element={<GigsInfoPage />} />

              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/:userId" element={<PublicProfile />} />
              <Route path="/dashboard" element={<Dashboard />} />

              <Route path="/services/create" element={<CreateService />} />
              <Route path="/edit-service/:id" element={<EditService />} />
              <Route path="/services/:id" element={<ServiceDetails />} />
              <Route path="/services" element={<ServiceListingPage />} />
              <Route path="/what-are-services" element={<ServicesInfoPage />} />

              <Route path="/popular-services" element={<PopularServicesPage />} />
              <Route path="/popular-services/:categorySlug" element={<PopularServicesPage />} />

              <Route path="/verify-email/:token?" element={
                <VerificationWrapper>
                  <VerifyEmail />
                </VerificationWrapper>
              } />

              <Route path="/verified" element={<VerifiedPage />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/account-deactivated" element={<AccountDeactivated />} />
              <Route path="/verification/redirect" element={<VerificationRedirect />} />
              <Route path="/verification/status" element={<VerificationStatus/>} />
              <Route path="/reset/redirect/:token" element={<ResetPasswordRedirect />} />
              <Route path="/verification/handler" element={<EmailVerificationHandler />} />
              <Route path="/oauth-success" element={<OAuthSuccess />} />
              <Route path="/search" element={<SearchResults />} />
              <Route path='/session-monitor' element={<SessionMonitor/>}/>
              <Route path="*" element={<NotFound />} />
            </Route>

            <Route path="/admin/*" element={
              <ProtectedAdminRoute>
                <AdminLayout>
                  <AdminRoutes />
                </AdminLayout>
              </ProtectedAdminRoute>
            } />
          </Routes>
        </Suspense>
      </SecurityProvider>
    </BrowserRouter>
  );
};


export default App;