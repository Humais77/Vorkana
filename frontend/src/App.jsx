// App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { initializeSocket, isSocketConnected, reconnectSocket } from './socket/orderSocket';

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
import OrderCreate from './components/OrderCreate';
import OrderDetails from './components/OrderDetails';
import MyOrders from './components/MyOrders';
import AboutUsPage from './layouts/AboutUsPage';
// Admin
import ProtectedAdminRoute from './ProtectedAdminRoute';
import AdminLogin from './AdminLogin';
import AdminLayout from './layouts/pages/admin/AdminLayout';
import AdminRoutes from './layouts/pages/admin/AdminRoutes';

// Components
import SocketStatus from './components/SocketStatus';
import ScrollToTop from './components/ScrollToTop';

const App = () => {
  useAuthSync();
  const { isAuthenticated } = useAuthStore();

  const [socketStatus, setSocketStatus] = useState('disconnected');

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

  const initializeSocketConnection = useCallback(() => {
    if (!isAuthenticated) return;

    const socket = initializeSocket();
    if (!socket) return;

    socket.on('connect', () => setSocketStatus('connected'));
    socket.on('disconnect', () => setSocketStatus('disconnected'));
    socket.on('connect_error', () => setSocketStatus('error'));
  }, [isAuthenticated]);

  useEffect(() => {
    initializeSocketConnection();
  }, [initializeSocketConnection]);

  useEffect(() => {
    if (isAuthenticated && !isSocketConnected()) {
      initializeSocketConnection();
    }
  }, [isAuthenticated, initializeSocketConnection]);

  return (
    <SecurityProvider>
      <BrowserRouter>
        <ScrollToTop />

        {process.env.NODE_ENV === 'development' && (
          <div className="fixed bottom-4 right-4 z-50">
            <SocketStatus status={socketStatus} onReconnect={reconnectSocket} />
          </div>
        )}

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
            <Route path="/create-gig" element={<GigCreate />} />
            <Route path="/gig/:id" element={<GigDetails />} />
            <Route path="/categories/:categoryId" element={<CategoryPage />} />
            <Route path="/gigs" element={<GigListingsPage />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/services/create" element={<CreateService />} />
            <Route path="/services/:id" element={<ServiceDetails />} />
            <Route path="/services" element={<ServiceListingPage />} />
            <Route path="/all-gigs" element={<AllGigsPage />} />
            <Route path="/orders/create" element={<OrderCreate />} />
            <Route path="/orders/:id" element={<OrderDetails />} />
            <Route path="/my-orders" element={<MyOrders />} />
            <Route path="/oauth-success" element={<OAuthSuccess />} />
          </Route>
          
          <Route path="/admin/login" element={<AdminLogin />} />

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