import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { initializeSocket, isSocketConnected, reconnectSocket } from './socket/orderSocket.js';

// Layouts
import Footer from './layouts/Footer';
import Navbar from './layouts/Navbar';

// Pages
import Home from './layouts/Home';
import GigCreate from './layouts/pages/GigCreate';
import GigDetails from './layouts/pages/GigDetails';

// Components
import OAuthSuccess from './components/OAuthSuccess';
import AuthModal from './components/AuthModal';
import SocketStatus from './components/SocketStatus.jsx'; // Add this component

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
import OrderCreate from './components/OrderCreate';
// import SellerDashboard from './components/SellerDashboard';
import OrderDetails from './components/OrderDetails';
import MyOrders from './components/MyOrders.jsx';
import { SecurityProvider } from './context/SecurityContext.jsx';
import { useAuthStore } from './store/useAuthStore.js';

const App = () => {
  // Sync auth state when app loads (using Zustand)
  useAuthSync();
  const { isAuthenticated } = useAuthStore();
  const [socketStatus, setSocketStatus] = useState('disconnected');

  const initializeSocketConnection = useCallback(() => {
    if (isAuthenticated) {
      const socket = initializeSocket();
      
      if (socket) {
        // Listen for connection status changes
        socket.on('connect', () => {
          console.log('Socket connected in App');
          setSocketStatus('connected');
        });
        
        socket.on('disconnect', () => {
          console.log('Socket disconnected in App');
          setSocketStatus('disconnected');
        });
        
        socket.on('connect_error', () => {
          setSocketStatus('error');
        });
      }
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // Initialize socket when authenticated
    initializeSocketConnection();
    
    // Cleanup on unmount
    return () => {
      // Socket cleanup will be handled by socket module
    };
  }, [initializeSocketConnection]);

  // Reconnect socket when auth state changes
  useEffect(() => {
    if (isAuthenticated && !isSocketConnected()) {
      console.log('Reconnecting socket due to auth change');
      initializeSocketConnection();
    }
  }, [isAuthenticated, initializeSocketConnection]);

  // Single modal state
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

  return (
    <SecurityProvider>
      <BrowserRouter>
        <ScrollToTop />
        
        {/* Socket Status Indicator (optional) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed bottom-4 right-4 z-50">
            <SocketStatus 
              status={socketStatus} 
              onReconnect={reconnectSocket}
            />
          </div>
        )}
        
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
          <Route path='/' element={<Home onSigninClick={openSigninModal}
            onSignupClick={openSignupModal} />} />
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
          <Route path="/orders/create" element={<OrderCreate />} />
          {/* <Route path="/seller/dashboard" element={<SellerDashboard />} /> */}
          <Route path="/orders/:id" element={<OrderDetails />} />
          <Route path="/my-orders" element={<MyOrders />} />
          {/* <Route path="/seller/orders" element={<SellerDashboard />} />
          <Route path="/seller/orders/pending" element={<SellerDashboard />} /> */}
        </Routes>
        <Footer />
      </BrowserRouter>
    </SecurityProvider>
  );
};

export default App;