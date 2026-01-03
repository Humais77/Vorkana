// App.jsx - UPDATED VERSION
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';

// Providers / Hooks
import { SecurityProvider } from './context/SecurityContext';
import { useAuthSync } from './hooks/useAuthSync';
import { useAuthStore } from './store/useAuthStore';

// Layouts
import PublicLayout from './layouts/PublicLayout';

// Pages
import Home from './layouts/Home';
import GigCreate from './layouts/pages/GigCreate';
import GigDetails from './layouts/pages/GigDetails';
import CategoryPage from './layouts/pages/CategoryPage';
import GigListingsPage from './layouts/pages/GigListingPage';
import Profile from './layouts/pages/Profile';
import Dashboard from './layouts/pages/Dashboard';
import CreateService from './layouts/pages/services/CreateService';
import ServiceDetails from './layouts/pages/ServiceDetails';
import ServiceListingPage from './layouts/pages/ServiceListingPage';
import OAuthSuccess from './layouts/pages/OAuthSuccess';
import AboutUsPage from './layouts/AboutUsPage';
// Admin
import ProtectedAdminRoute from './ProtectedAdminRoute';
import AdminLayout from './layouts/pages/admin/AdminLayout';
import AdminRoutes from './layouts/pages/admin/AdminRoutes';
import VerifyEmail from './layouts/pages/profile/VerifyEmail';
import ForgotPassword from './layouts/pages/profile/ForgotPassword';
import ResetPassword from './layouts/pages/profile/ResetPassword';
import AccountDeactivated from './layouts/pages/profile/AccountDeactivated';

import ScrollToTop from './components/ScrollToTop';
import VerifiedPage from './layouts/pages/profile/VerifiedPage';

import CareersPage from './layouts/pages/footer/CareersPage';
import HelpCenterPage from './layouts/pages/footer/HelpCenterPage';
import ContactPage from './layouts/pages/footer/ContactPage';
import TrustSafetyPage from './layouts/pages/footer/TrustSafetyPage';
import FaqPage from './layouts/pages/footer/FaqPage';
import SearchResults from './layouts/pages/SearchResults';
import Signin from './layouts/pages/Signin';
import Signup from './layouts/pages/Signup';
import PublicProfile from './layouts/pages/PublicProfile';
import PopularServices from './components/services/PopularService';
import SubcategoryDetailPage from './layouts/pages/SubcategoryDetailPage';
import PopularServicesPage from './components/services/PopularService';
import NotFound from './layouts/pages/NotFound';
import AdminNotFound from "./layouts/pages/AdminNotFound";
import GigsInfoPage from './layouts/pages/GigsInfoPage';
import ServicesInfoPage from './layouts/pages/ServicesInfoPage';

// Import the VerificationWrapper
import VerificationWrapper from './components/VerificationWrapper';
import GigEdit from './layouts/pages/GigEdit';
import EditService from './layouts/pages/EditService';

const App = () => {
  useAuthSync();
  const { isAuthenticated } = useAuthStore();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeTab, setActiveTab] = useState('signin');

  const openSigninModal = () => {
    setActiveTab('signin');
    setShowAuthModal(true);
  };

  const openSignupModal = () => {
    setActiveTab('signup');
    setShowAuthModal(true);
  };

  useEffect(() => {
    const cleanupResetToken = () => {
      if (localStorage.getItem('resetToken')) {
        localStorage.removeItem('resetToken');
      }
    };

    cleanupResetToken();

    // Also clean up on page unload
    window.addEventListener('beforeunload', cleanupResetToken);

    return () => {
      window.removeEventListener('beforeunload', cleanupResetToken);
    };
  }, []);

  return (
    <SecurityProvider>
      <BrowserRouter>
        <ScrollToTop />

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
            <Route path="/" element={<Home onSigninClick={openSigninModal} onSignupClick={openSignupModal} />} />
            <Route path="/about-us" element={<AboutUsPage />} />
            <Route path="/signin" element={<Signin />} />
            <Route path="/signup" element={<Signup />} />
            
            <Route path="/create-gig" element={<GigCreate />} />
            <Route path="/gig/:id" element={<GigDetails />} />
            <Route path="/edit-gig/:id" element={<GigEdit />} />
            <Route path="/edit-service/:id/" element={<EditService/>} />
            <Route path="/categories/:categoryId" element={<CategoryPage />} />
            <Route path="/categories/:categoryId/:subcategorySlug" element={<SubcategoryDetailPage />} />
            <Route path="/popular-services" element={<PopularServices />} />
            <Route path="/gigs" element={<GigListingsPage />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:userId" element={<PublicProfile/>} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/services/create" element={<CreateService />} />
            <Route path="/services/:id" element={<ServiceDetails />} />
            <Route path="/services" element={<ServiceListingPage />} />
            <Route path="/popular-services" element={<PopularServicesPage />} />
            <Route path="/popular-services/:categorySlug" element={<PopularServicesPage />} />
            <Route path="/oauth-success" element={<OAuthSuccess />} />
            
            {/* Wrap VerifyEmail with VerificationWrapper */}
            <Route path="/verify-email" element={
              <VerificationWrapper>
                <VerifyEmail />
              </VerificationWrapper>
            } />
            
            <Route path="/what-are-gigs" element={<GigsInfoPage />} />
            <Route path="/what-are-services" element={<ServicesInfoPage />} />
            <Route path="/verified" element={<VerifiedPage />} />
            
            {/* Also wrap the token-based verify email routes */}
            <Route path="/verify-email/:token?" element={
              <VerificationWrapper>
                <VerifyEmail />
              </VerificationWrapper>
            } />
            <Route path="/verify-email/:token" element={
              <VerificationWrapper>
                <VerifyEmail />
              </VerificationWrapper>
            } />
            
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/account-deactivated" element={<AccountDeactivated />} />
            <Route path="/careers" element={<CareersPage />} />
            <Route path="/help" element={<HelpCenterPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/trust" element={<TrustSafetyPage />} />
            <Route path="/faq" element={<FaqPage />} />
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
          <Route path="*" element={<AdminNotFound />} />
        </Routes>
      </BrowserRouter>
    </SecurityProvider>
  );
};

export default App;