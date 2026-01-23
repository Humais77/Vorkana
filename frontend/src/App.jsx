// App.jsx – Updated with global auth handling
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState, lazy, Suspense, useCallback } from 'react';

// Providers / Hooks
import { SecurityProvider } from './context/SecurityContext';
import { useAuthSync } from './hooks/useAuthSync';
import { useCheckAuth } from './hooks/useAuth';
import { useAuthStore } from './store/useAuthStore';
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
import Toaster from './components/Toaster';

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
const HowItWorksPage = lazy(() => import('./layouts/pages/footer/HowItWorksPage'));
const HelpCenterPage = lazy(() => import('./layouts/pages/footer/HelpCenterPage'));
const ContactPage = lazy(() => import('./layouts/pages/footer/ContactPage'));
const FaqPage = lazy(()=> import('./layouts/pages/footer/FaqSection'))

// Auth Protected Route Component
const AuthProtectedRoute = ({ children, requireProfileCompletion = false, redirectTo = '/signin' }) => {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        // Store the intended destination
        sessionStorage.setItem('redirectAfterLogin', location.pathname);
        navigate(redirectTo, { state: { from: location.pathname } });
      } else if (requireProfileCompletion && user) {
        // Check profile completion (you'll need to implement this)
        const profileComplete = calculateProfileCompletion(user) >= 70;
        if (!profileComplete) {
          navigate('/profile', { 
            state: { 
              from: location.pathname,
              requireCompletion: true 
            } 
          });
        }
      }
    }
  }, [isAuthenticated, isLoading, navigate, location, requireProfileCompletion, user, redirectTo]);

  if (isLoading) {
    return <LoadingFallback />;
  }

  return isAuthenticated ? children : null;
};

// Helper function for profile completion (you need to implement this)
const calculateProfileCompletion = (user) => {
  // Implement your profile completion logic here
  if (!user) return 0;
  
  let score = 0;
  if (user.name) score += 20;
  if (user.email) score += 20;
  if (user.profilePicture) score += 15;
  if (user.bio) score += 15;
  if (user.skills && user.skills.length > 0) score += 15;
  if (user.country) score += 15;
  
  return Math.min(score, 100);
};

// Loading fallback
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

// Cookie/Auth Checker Component
const AuthChecker = () => {
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
    // Clean up old tokens on app start
    localStorage.removeItem('userToken');
    localStorage.removeItem('refreshToken');
    
    const cleanup = () => localStorage.removeItem('resetToken');
    cleanup();
    window.addEventListener('beforeunload', cleanup);
    return () => window.removeEventListener('beforeunload', cleanup);
  }, []);

  const openSigninModal = useCallback(() => {
    setActiveTab('signin');
    setShowAuthModal(true);
  }, []);

  const openSignupModal = useCallback(() => {
    setActiveTab('signup');
    setShowAuthModal(true);
  }, []);

  return (
    <BrowserRouter>
      <SecurityProvider>
        <Toaster/>
        <ScrollToTop />
        <AuthChecker />
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

              {/* Protected Routes */}
              <Route path="/gig/create" element={
  <AuthProtectedRoute>
    <GigCreate />
  </AuthProtectedRoute>
} />

              <Route path="/gig/:id" element={<GigDetails />} />
              <Route path="/edit-gig/:id" element={
                <AuthProtectedRoute>
                  <GigEdit />
                </AuthProtectedRoute>
              } />

              <Route path="/categories/:categoryId" element={<CategoryPage />} />
              <Route path="/categories/:categoryId/:subcategorySlug" element={<SubcategoryDetailPage />} />

              <Route path="/gigs" element={<GigListingsPage />} />
              <Route path="/what-are-gigs" element={<GigsInfoPage />} />

              <Route path="/profile" element={
                <AuthProtectedRoute>
                  <Profile />
                </AuthProtectedRoute>
              } />
              <Route path="/profile/:userId" element={<PublicProfile />} />
              <Route path="/dashboard" element={
                <AuthProtectedRoute>
                  <Dashboard />
                </AuthProtectedRoute>
              } />

              <Route path="/services/create" element={
                <AuthProtectedRoute requireProfileCompletion={true}>
                  <CreateService />
                </AuthProtectedRoute>
              } />
              <Route path="/services/create" element={
  <AuthProtectedRoute>
    <CreateService />
  </AuthProtectedRoute>
} />
              <Route path="/services/:id" element={<ServiceDetails />} />
              <Route path="/services" element={<ServiceListingPage />} />
              <Route path="/what-are-services" element={<ServicesInfoPage />} />

              <Route path="/popular-services" element={<PopularServicesPage />} />
              <Route path="/popular-services/:categorySlug" element={<PopularServicesPage />} />
              <Route path="/how-it-works" element={<HowItWorksPage />} />
              <Route path="/help" element={<HelpCenterPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/faq" element={<FaqPage />} />

              {/* Auth Routes */}
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