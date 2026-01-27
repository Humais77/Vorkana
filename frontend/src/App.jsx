import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { SecurityProvider } from './context/SecurityContext';
import { useAuthSync } from './hooks/useAuthSync';
import PublicLayout from './layouts/PublicLayout';
import ScrollToTop from './components/ScrollToTop';
import VerificationWrapper from './components/VerificationWrapper';
import AuthProtectedRoute from './components/AuthProtectedRoute';
import ProtectedAdminRoute from './ProtectedAdminRoute';
import AdminLayout from './layouts/pages/admin/AdminLayout';
import AdminRoutes from './layouts/pages/admin/AdminRoutes';
import Toaster from './components/Toaster';
import ErrorBoundary from './components/ErrorBoundary';
import AuthenticatedRouteGuard from './components/AuthenticatedRouteGuard';
import RoutePreloader from './components/RoutePreloader';

// Minimal loading fallback
const LoadingFallback = () => null;

// Lazy load components
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
const PopularServicesPage = lazy(() => import('./components/services/PopularServicesPage'));
const OAuthSuccess = lazy(() => import('./layouts/pages/OAuthSuccess'));
const SearchResults = lazy(() => import('./layouts/pages/SearchResults'));
const NotFound = lazy(() => import('./layouts/pages/NotFound'));
const HowItWorksPage = lazy(() => import('./layouts/pages/footer/HowItWorksPage'));
const HelpCenterPage = lazy(() => import('./layouts/pages/footer/HelpCenterPage'));
const ContactPage = lazy(() => import('./layouts/pages/footer/ContactPage'));
const FaqPage = lazy(() => import('./layouts/pages/footer/FaqSection'));
const VerificationRedirect = lazy(() => import('./layouts/pages/profile/VerificationRedirect'));
const ResetPasswordRedirect = lazy(() => import('./layouts/pages/profile/ResetPasswordRedirect'));
const EmailVerificationHandler = lazy(() => import('./layouts/pages/profile/EmailVerificationHandler'));
const VerificationStatus = lazy(() => import('./layouts/pages/profile/VerificationStatus'));

const App = () => {
  useAuthSync();

  return (
    <BrowserRouter>
      <SecurityProvider>
        <ErrorBoundary />
        <Toaster />
        <ScrollToTop />
        <RoutePreloader />
        
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/about-us" element={<AboutUsPage />} />
              
              {/* Auth routes - redirect if already logged in */}
              <Route path="/signin" element={
                <AuthenticatedRouteGuard>
                  <Signin />
                </AuthenticatedRouteGuard>
              } />
              <Route path="/signup" element={
                <AuthenticatedRouteGuard>
                  <Signup />
                </AuthenticatedRouteGuard>
              } />
              
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
              <Route path="/gigs" element={<GigListingsPage />} />
              <Route path="/what-are-gigs" element={<GigsInfoPage />} />
              <Route path="/categories/:categoryId" element={<CategoryPage />} />
              <Route path="/categories/:categoryId/:subcategorySlug" element={<SubcategoryDetailPage />} />
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
              <Route path="/edit-service/:id" element={
                <AuthProtectedRoute>
                  <EditService />
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
              <Route path="/verification/status" element={<VerificationStatus />} />
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