import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState } from 'react';

// Layouts
import Footer from './layouts/Footer';
import Navbar from './layouts/Navbar';

// Pages
import Home from './layouts/Home';
import GigCreate from './layouts/pages/GigCreate';
import GigDetails from './layouts/pages/GigDetails';

// Components
import OAuthSuccess from './components/OAuthSuccess';
import AuthModal from './components/AuthModal'; // Single modal component

// Hooks
import { useAuthSync } from "./hooks/useAuthSync";
import CategoryPage from './layouts/pages/CategoryPage';
import GigListingsPage from './layouts/pages/GigListingPage';
import Profile from './layouts/pages/Profile';
import CreateService from './layouts/pages/CreateService';
import ServiceDetails from './layouts/pages/ServiceDetails';
import ScrollToTop from './components/ScrollToTop';
import ServiceListingPage from './layouts/pages/ServiceListingPage';
import AllGigsPage from './components/AllGigsPage';

const App = () => {
  // Sync auth state when app loads (using Zustand)
  useAuthSync();
  
  // Single modal state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeTab, setActiveTab] = useState('signin'); // 'signin' or 'signup'

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
      <ScrollToTop />
      {/* Pass the modal trigger functions to Navbar */}
      <Navbar 
        onSigninClick={openSigninModal}
        onSignupClick={openSignupModal}
      />
      
      {/* Single Auth Modal with tabs */}
      {showAuthModal && (
        <AuthModal 
          activeTab={activeTab}
          onSwitchTab={setActiveTab}
          onClose={() => setShowAuthModal(false)}
        />
      )}
      
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/create-gig' element={<GigCreate />} />
        <Route path='/gig/:id' element={<GigDetails />} />
        <Route path='/oauth-success' element={<OAuthSuccess />} />
        <Route path='/categories/:categoryId' element={<CategoryPage />} />
        <Route path="/gigs" element={<GigListingsPage />} />
        <Route path='/profile' element={<Profile />} />
        <Route path="/services/create" element={<CreateService />} />
        <Route path='/profile/services' element={<Profile />} />
        <Route path="/services/:id" element={<ServiceDetails />} />
        <Route path="/services/" element={<ServiceListingPage />} />
        <Route path="/all-gigs" element={<AllGigsPage />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
};

export default App;