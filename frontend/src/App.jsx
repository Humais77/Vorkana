// App.jsx
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
import CreateService from './layouts/pages/CreateService';
import ServiceDetails from './layouts/pages/ServiceDetails';
import ServiceListingPage from './layouts/pages/ServiceListingPage';
import OAuthSuccess from './components/OAuthSuccess';
import AllGigsPage from './components/AllGigsPage';
import AboutUsPage from './layouts/AboutUsPage';
// Admin
import ProtectedAdminRoute from './ProtectedAdminRoute';
import AdminLayout from './layouts/pages/admin/AdminLayout';
import AdminRoutes from './layouts/pages/admin/AdminRoutes';
import VerifyEmail from './components/VerifyEmail';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import AccountDeactivated from './components/AccountDeactivated';

import ScrollToTop from './components/ScrollToTop';
import VerifiedPage from './components/VerifiedPage';

import ProjectsPage from './layouts/pages/footer/ProjectsPage';
import TalentPage from './layouts/pages/footer/TalentPage';
import SkillsPage from './layouts/pages/footer/SkillsPage';
import TopRatedPage from './layouts/pages/footer/TopRatedPage';
import TrendingPage from './layouts/pages/footer/TrendingPage';
import LocalFreelancersPage from './layouts/pages/footer/LocalFreelancersPage';
import CareersPage from './layouts/pages/footer/CareersPage';
import PressPage from './layouts/pages/footer/PressPage';
import BlogPage from './layouts/pages/footer/BlogPage';
import AffiliatesPage from './layouts/pages/footer/AffiliatesPage';
import PartnershipsPage from './layouts/pages/footer/PartnershipsPage';
import HelpCenterPage from './layouts/pages/footer/HelpCenterPage';
import ContactPage from './layouts/pages/footer/ContactPage';
import TrustSafetyPage from './layouts/pages/footer/TrustSafetyPage';
import DisputesPage from './layouts/pages/footer/DisputesPage';
import PaymentProtectionPage from './layouts/pages/footer/PaymentProtectionPage';
import FaqPage from './layouts/pages/footer/FaqPage';
import SearchResults from './layouts/pages/SearchResults';
import Signin from './layouts/pages/Signin';
import Signup from './layouts/pages/Signup';
import PublicProfile from './layouts/pages/PublicProfile';
import AllServicesPage from './components/AllServicesPage';

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
            <Route path="/sign-in" element={<Signin />} />
            <Route path="/sign-up" element={<Signup />} />
            
            <Route path="/create-gig" element={<GigCreate />} />
            <Route path="/gig/:id" element={<GigDetails />} />
            <Route path="/categories/:categoryId" element={<CategoryPage />} />
            <Route path="/gigs" element={<GigListingsPage />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:userId" element={<PublicProfile/>} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/services/create" element={<CreateService />} />
            <Route path="/services/:id" element={<ServiceDetails />} />
            <Route path="/services" element={<ServiceListingPage />} />
            <Route path="/all-gigs" element={<AllGigsPage />} />
            <Route path="/all-services" element={<AllServicesPage />} />
            <Route path="/oauth-success" element={<OAuthSuccess />} />
            <Route path="/verify-email" element={<VerifyEmail />} />

            <Route path="/verified" element={<VerifiedPage />} />
            <Route path="/verify-email/:token?" element={<VerifyEmail />} />
            <Route path="/verify-email/:token" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/account-deactivated" element={<AccountDeactivated />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/talent" element={<TalentPage />} />
            <Route path="/skills" element={<SkillsPage />} />
            <Route path="/top-rated" element={<TopRatedPage />} />
            <Route path="/trending" element={<TrendingPage />} />
            <Route path="/local" element={<LocalFreelancersPage />} />
            <Route path="/careers" element={<CareersPage />} />
            <Route path="/press" element={<PressPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/affiliates" element={<AffiliatesPage />} />
            <Route path="/partnerships" element={<PartnershipsPage />} />
            <Route path="/help" element={<HelpCenterPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/trust" element={<TrustSafetyPage />} />
            <Route path="/disputes" element={<DisputesPage />} />
            <Route path="/payment-protection" element={<PaymentProtectionPage />} />
            <Route path="/faq" element={<FaqPage />} />
            <Route path="/search" element={<SearchResults />} />
          </Route>

          <Route path="/admin/*" element={
            <ProtectedAdminRoute>
              <AdminLayout>
                <AdminRoutes />
              </AdminLayout>
            </ProtectedAdminRoute>
          } />
        </Routes>
      </BrowserRouter>
    </SecurityProvider>
  );
};

export default App;