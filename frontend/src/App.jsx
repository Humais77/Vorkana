import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState, lazy, Suspense, useCallback, startTransition, useRef } from 'react';

// Providers / Hooks
import { SecurityProvider } from './context/SecurityContext';
import { useAuthSync } from './hooks/useAuthSync';
import { useCheckAuth } from './hooks/useAuth';
// Layouts
import PublicLayout from './layouts/PublicLayout';

// Components
import ScrollToTop from './components/ScrollToTop';
import VerificationWrapper from './components/VerificationWrapper';
import AuthProtectedRoute from './components/AuthProtectedRoute'; 
import ProtectedAdminRoute from './ProtectedAdminRoute';
import AdminLayout from './layouts/pages/admin/AdminLayout';
import AdminRoutes from './layouts/pages/admin/AdminRoutes';
import Toaster from './components/Toaster';

// Optimized PreloadLink
import PreloadLink from './PreloadLink';
import ErrorBoundary from './components/ErrorBoundary';

// Cache for instant loading
const COMPONENT_CACHE = new Map();

// Enhanced lazy loading with cache
const enhancedLazy = (importFunc, cacheKey) => {
  if (COMPONENT_CACHE.has(cacheKey)) {
    return COMPONENT_CACHE.get(cacheKey);
  }

  const LazyComponent = lazy(() => 
    importFunc().then(module => {
      COMPONENT_CACHE.set(cacheKey, module.default);
      return module;
    })
  );

  // Add preload method
  LazyComponent.preload = () => {
    if (!COMPONENT_CACHE.has(cacheKey)) {
      return importFunc().then(module => {
        COMPONENT_CACHE.set(cacheKey, module.default);
        return module.default;
      });
    }
    return Promise.resolve(COMPONENT_CACHE.get(cacheKey));
  };

  return LazyComponent;
};

// Pages with enhanced lazy loading
const Home = enhancedLazy(() => import('./layouts/pages/home/Home'), 'home');
const AboutUsPage = enhancedLazy(() => import('./layouts/pages/footer/AboutUsPage'), 'about-us');
const Signin = enhancedLazy(() => import('./layouts/pages/auth/Signin'), 'signin');
const Signup = enhancedLazy(() => import('./layouts/pages/auth/Signup'), 'signup');

const GigCreate = enhancedLazy(() => import('./layouts/pages/gigs/GigCreate'), 'gig-create');
const GigDetails = enhancedLazy(() => import('./layouts/pages/gigs/GigDetails'), 'gig-details');
const GigEdit = enhancedLazy(() => import('./layouts/pages/gigs/GigEdit'), 'gig-edit');
const GigListingsPage = enhancedLazy(() => import('./layouts/pages/gigs/GigListingPage'), 'gig-listings');
const GigsInfoPage = enhancedLazy(() => import('./layouts/pages/gigs/GigsInfoPage'), 'gigs-info');

const CategoryPage = enhancedLazy(() => import('./layouts/pages/category/CategoryPage'), 'category');
const SubcategoryDetailPage = enhancedLazy(() => import('./layouts/pages/category/SubcategoryDetailPage'), 'subcategory');

const Profile = enhancedLazy(() => import('./layouts/pages/profile/Profile'), 'profile');
const PublicProfile = enhancedLazy(() => import('./layouts/pages/profile/PublicProfile'), 'public-profile');
const Dashboard = enhancedLazy(() => import('./layouts/pages/profile/Dashboard'), 'dashboard');
const VerifyEmail = enhancedLazy(() => import('./layouts/pages/profile/VerifyEmail'), 'verify-email');
const VerifiedPage = enhancedLazy(() => import('./layouts/pages/profile/VerifiedPage'), 'verified');
const ForgotPassword = enhancedLazy(() => import('./layouts/pages/profile/ForgotPassword'), 'forgot-password');
const ResetPassword = enhancedLazy(() => import('./layouts/pages/profile/ResetPassword'), 'reset-password');
const AccountDeactivated = enhancedLazy(() => import('./layouts/pages/profile/AccountDeactivated'), 'account-deactivated');

const CreateService = enhancedLazy(() => import('./layouts/pages/services/CreateService'), 'create-service');
const EditService = enhancedLazy(() => import('./layouts/pages/services/EditService'), 'edit-service');
const ServiceDetails = enhancedLazy(() => import('./layouts/pages/services/ServiceDetails'), 'service-details');
const ServiceListingPage = enhancedLazy(() => import('./layouts/pages/services/ServiceListingPage'), 'service-listing');
const ServicesInfoPage = enhancedLazy(() => import('./layouts/pages/services/ServicesInfoPage'), 'services-info');
const PopularServicesPage = enhancedLazy(() => import('./components/services/PopularServicesPage'), 'popular-services');

const OAuthSuccess = enhancedLazy(() => import('./layouts/pages/OAuthSuccess'), 'oauth-success');
const SearchResults = enhancedLazy(() => import('./layouts/pages/SearchResults'), 'search-results');
const NotFound = enhancedLazy(() => import('./layouts/pages/NotFound'), 'not-found');
const HowItWorksPage = enhancedLazy(() => import('./layouts/pages/footer/HowItWorksPage'), 'how-it-works');
const HelpCenterPage = enhancedLazy(() => import('./layouts/pages/footer/HelpCenterPage'), 'help-center');
const ContactPage = enhancedLazy(() => import('./layouts/pages/footer/ContactPage'), 'contact');
const FaqPage = enhancedLazy(() => import('./layouts/pages/footer/FaqSection'), 'faq');

const VerificationRedirect = enhancedLazy(() => import('./layouts/pages/profile/VerificationRedirect'), 'verification-redirect');
const ResetPasswordRedirect = enhancedLazy(() => import('./layouts/pages/profile/ResetPasswordRedirect'), 'reset-redirect');
const EmailVerificationHandler = enhancedLazy(() => import('./layouts/pages/profile/EmailVerificationHandler'), 'email-handler');
const VerificationStatus = enhancedLazy(() => import('./layouts/pages/profile/VerificationStatus'), 'verification-status');

// Instant loading fallback with skeleton
const LoadingFallback = () => (
  <div className="min-h-screen bg-white">
    {/* Skeleton loader that matches your layout */}
    <div className="animate-pulse">
      <div className="h-16 bg-gray-200"></div>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// Navigation Progress Component
const NavigationProgress = () => {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      // Show progress bar on navigation
      setVisible(true);
      setProgress(0);
      
      // Animate progress
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 10;
        });
      }, 50);

      // Hide after page loads
      const timer = setTimeout(() => {
        setProgress(100);
        setTimeout(() => setVisible(false), 300);
        clearInterval(interval);
      }, 500);

      prevPathRef.current = location.pathname;

      return () => {
        clearInterval(interval);
        clearTimeout(timer);
      };
    }
  }, [location.pathname]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 w-full h-1 z-50 overflow-hidden">
      <div 
        className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .shimmer-effect::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          animation: shimmer 1.5s infinite;
        }
      `}</style>
      <div className="shimmer-effect absolute top-0 left-0 w-full h-full"></div>
    </div>
  );
};

// Auto Preloader Component
const AutoPreloader = () => {
  const location = useLocation();
  const observerRef = useRef(null);

  // Route preload mapping
  const preloadMap = {
    '/signin': Signin,
    '/signup': Signup,
    '/profile': Profile,
    '/dashboard': Dashboard,
    '/gig/create': GigCreate,
    '/gigs': GigListingsPage,
    '/services': ServiceListingPage,
    '/verify-email': VerifyEmail,
    '/forgot-password': ForgotPassword,
    '/how-it-works': HowItWorksPage,
  };

  // Predict next routes based on current location
  const routePredictions = {
    '/': ['/signin', '/signup', '/gigs', '/services'],
    '/signin': ['/dashboard', '/profile'],
    '/signup': ['/verify-email', '/profile'],
    '/gigs': ['/gig/create'],
    '/services': ['/services/create'],
  };

  useEffect(() => {
    // Preload likely next routes
    const predictions = routePredictions[location.pathname] || [];
    predictions.forEach(route => {
      if (preloadMap[route]) {
        preloadMap[route].preload?.();
      }
    });

    // Set up Intersection Observer for link preloading
    if (!observerRef.current && typeof IntersectionObserver !== 'undefined') {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const link = entry.target;
              const href = link.getAttribute('href');
              if (href && preloadMap[href]) {
                preloadMap[href].preload?.();
              }
            }
          });
        },
        { rootMargin: '100px' }
      );

      // Observe all internal links
      document.querySelectorAll('a[href^="/"]').forEach(link => {
        observerRef.current.observe(link);
      });
    }

    // Preload on mouseover (desktop)
    const handleMouseOver = (e) => {
      const link = e.target.closest('a[href^="/"]');
      if (link) {
        const href = link.getAttribute('href');
        if (preloadMap[href]) {
          preloadMap[href].preload?.();
        }
      }
    };

    // Preload on touchstart (mobile)
    const handleTouchStart = (e) => {
      const link = e.target.closest('a[href^="/"]');
      if (link) {
        const href = link.getAttribute('href');
        if (preloadMap[href]) {
          preloadMap[href].preload?.();
        }
      }
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('touchstart', handleTouchStart, { passive: true });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('touchstart', handleTouchStart);
    };
  }, [location.pathname]);

  return null;
};

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
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('refreshToken');
    
    // Preload critical components on mount
    setTimeout(() => {
      Signin.preload?.();
      Signup.preload?.();
      Home.preload?.();
    }, 1000);
    
    const cleanup = () => localStorage.removeItem('resetToken');
    cleanup();
    window.addEventListener('beforeunload', cleanup);
    return () => window.removeEventListener('beforeunload', cleanup);
  }, []);

  const openSigninModal = useCallback(() => {
    startTransition(() => {
      Signin.preload?.();
      setActiveTab('signin');
      setShowAuthModal(true);
    });
  }, []);

  const openSignupModal = useCallback(() => {
    startTransition(() => {
      Signup.preload?.();
      setActiveTab('signup');
      setShowAuthModal(true);
    });
  }, []);

  // Enhanced navigation handler
  const handleNavigation = useCallback(() => {
    setIsNavigating(true);
    setTimeout(() => setIsNavigating(false), 300);
  }, []);

  return (
    <BrowserRouter>
      <SecurityProvider>
        <ErrorBoundary/>
        <Toaster/>
        <ScrollToTop />
        <NavigationProgress />
        <AutoPreloader />
        <AuthChecker />
        
        {/* Instant navigation feedback */}
        {isNavigating && (
          <div className="fixed inset-0 bg-black/5 z-40 pointer-events-none"></div>
        )}
        
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