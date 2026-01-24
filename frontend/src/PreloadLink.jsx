import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useCallback } from 'react';

// Cache for preloaded routes
const PRELOADED_ROUTES = new Set();

// Route to component mapping for preloading
const ROUTE_PRELOAD_MAP = {
  '/signin': () => import('./layouts/pages/auth/Signin'),
  '/signup': () => import('./layouts/pages/auth/Signup'),
  '/profile': () => import('./layouts/pages/profile/Profile'),
  '/dashboard': () => import('./layouts/pages/profile/Dashboard'),
  '/gig/create': () => import('./layouts/pages/gigs/GigCreate'),
  '/gigs': () => import('./layouts/pages/gigs/GigListingPage'),
  '/services': () => import('./layouts/pages/services/ServiceListingPage'),
  '/verify-email': () => import('./layouts/pages/profile/VerifyEmail'),
  '/forgot-password': () => import('./layouts/pages/profile/ForgotPassword'),
  '/reset-password': () => import('./layouts/pages/profile/ResetPassword'),
  '/how-it-works': () => import('./layouts/pages/footer/HowItWorksPage'),
  '/help': () => import('./layouts/pages/footer/HelpCenterPage'),
  '/contact': () => import('./layouts/pages/footer/ContactPage'),
  '/faq': () => import('./layouts/pages/footer/FaqSection'),
  '/about-us': () => import('./layouts/pages/footer/AboutUsPage'),
  '/gig/:id': () => import('./layouts/pages/gigs/GigDetails'),
  '/services/:id': () => import('./layouts/pages/services/ServiceDetails'),
  '/profile/:userId': () => import('./layouts/pages/profile/PublicProfile'),
  '/categories/:categoryId': () => import('./layouts/pages/category/CategoryPage'),
  '/categories/:categoryId/:subcategorySlug': () => import('./layouts/pages/category/SubcategoryDetailPage'),
  '/edit-gig/:id': () => import('./layouts/pages/gigs/GigEdit'),
  '/edit-service/:id': () => import('./layouts/pages/services/EditService'),
  '/services/create': () => import('./layouts/pages/services/CreateService'),
  '/popular-services': () => import('./components/services/PopularServicesPage'),
  '/popular-services/:categorySlug': () => import('./components/services/PopularServicesPage'),
  '/what-are-gigs': () => import('./layouts/pages/gigs/GigsInfoPage'),
  '/what-are-services': () => import('./layouts/pages/services/ServicesInfoPage'),
  '/verification/redirect': () => import('./layouts/pages/profile/VerificationRedirect'),
  '/verification/status': () => import('./layouts/pages/profile/VerificationStatus'),
  '/reset/redirect/:token': () => import('./layouts/pages/profile/ResetPasswordRedirect'),
  '/verification/handler': () => import('./layouts/pages/profile/EmailVerificationHandler'),
  '/oauth-success': () => import('./layouts/pages/OAuthSuccess'),
  '/search': () => import('./layouts/pages/SearchResults'),
};

// Preload a route
const preloadRoute = (path) => {
  if (PRELOADED_ROUTES.has(path)) return;

  // Find matching route (including dynamic routes)
  const routeKey = Object.keys(ROUTE_PRELOAD_MAP).find(key => {
    if (key === path) return true;
    
    // Handle dynamic routes
    if (key.includes(':')) {
      const keyParts = key.split('/');
      const pathParts = path.split('/');
      
      if (keyParts.length !== pathParts.length) return false;
      
      return keyParts.every((part, index) => {
        return part.startsWith(':') || part === pathParts[index];
      });
    }
    
    return false;
  });

  if (routeKey && ROUTE_PRELOAD_MAP[routeKey]) {
    PRELOADED_ROUTES.add(path);
    
    // Use requestIdleCallback for low-priority preloading
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        ROUTE_PRELOAD_MAP[routeKey]().catch(() => {
          PRELOADED_ROUTES.delete(path); // Remove from cache on error
        });
      }, { timeout: 1000 });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        ROUTE_PRELOAD_MAP[routeKey]().catch(() => {
          PRELOADED_ROUTES.delete(path);
        });
      }, 100);
    }
  }
};

const PreloadLink = ({ 
  to, 
  children, 
  className = '', 
  preloadOn = ['hover', 'touch', 'viewport'],
  preloadPriority = 'high',
  onClick,
  onMouseEnter,
  onTouchStart,
  ...props 
}) => {
  const navigate = useNavigate();
  const linkRef = useRef(null);
  const hasPreloadedRef = useRef(false);
  
  // Extract path from 'to' prop
  const path = typeof to === 'string' ? to : to?.pathname || '';

  // Preload route function
  const handlePreload = useCallback(() => {
    if (!hasPreloadedRef.current && path) {
      hasPreloadedRef.current = true;
      
      if (preloadPriority === 'high') {
        // High priority: preload immediately
        preloadRoute(path);
      } else if (preloadPriority === 'medium' && 'requestIdleCallback' in window) {
        // Medium priority: preload when idle
        requestIdleCallback(() => preloadRoute(path), { timeout: 500 });
      } else {
        // Low priority: preload with delay
        setTimeout(() => preloadRoute(path), 300);
      }
    }
  }, [path, preloadPriority]);

  // Set up Intersection Observer for viewport preloading
  useEffect(() => {
    if (preloadOn.includes('viewport') && linkRef.current) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              handlePreload();
              observer.unobserve(entry.target);
            }
          });
        },
        { 
          rootMargin: '200px', // Start preloading when link is 200px from viewport
          threshold: 0.1 
        }
      );

      observer.observe(linkRef.current);
      return () => observer.disconnect();
    }
  }, [handlePreload, preloadOn]);

  // Handle click with instant navigation feedback
  const handleClick = useCallback((e) => {
    e.preventDefault();
    
    // Force preload immediately
    handlePreload();
    
    // Add instant visual feedback
    document.body.classList.add('page-transition');
    
    // Navigate on next tick to allow preloading to start
    requestAnimationFrame(() => {
      navigate(to);
      
      // Remove transition class after navigation
      setTimeout(() => {
        document.body.classList.remove('page-transition');
      }, 300);
      
      if (onClick) onClick(e);
    });
  }, [navigate, to, onClick, handlePreload]);

  // Handle mouse enter for preloading
  const handleMouseEnter = useCallback((e) => {
    if (preloadOn.includes('hover')) {
      handlePreload();
    }
    if (onMouseEnter) onMouseEnter(e);
  }, [handlePreload, preloadOn, onMouseEnter]);

  // Handle touch start for mobile preloading
  const handleTouchStart = useCallback((e) => {
    if (preloadOn.includes('touch')) {
      handlePreload();
    }
    if (onTouchStart) onTouchStart(e);
  }, [handlePreload, preloadOn, onTouchStart]);

  // Preload on mount for critical links
  useEffect(() => {
    if (preloadPriority === 'critical' && path) {
      handlePreload();
    }
  }, [path, preloadPriority, handlePreload]);

  // Add critical CSS for instant feedback
  useEffect(() => {
    // Inject critical CSS once
    if (!document.querySelector('#preload-link-styles')) {
      const style = document.createElement('style');
      style.id = 'preload-link-styles';
      style.textContent = `
        .page-transition {
          pointer-events: none;
          cursor: wait;
        }
        
        .page-transition * {
          transition: opacity 0.15s ease-out !important;
        }
        
        .preload-link {
          position: relative;
          overflow: hidden;
        }
        
        .preload-link::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 5px;
          height: 5px;
          background: rgba(59, 130, 246, 0.5);
          border-radius: 50%;
          opacity: 0;
          transform: translate(-50%, -50%) scale(1);
        }
        
        .preload-link.loading::after {
          animation: preload-pulse 0.6s ease-out;
        }
        
        @keyframes preload-pulse {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(20);
          }
        }
        
        .instant-loading {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 3px;
          background: linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899);
          z-index: 9999;
          transform: translateX(-100%);
          animation: instant-loading 1s ease-out;
        }
        
        @keyframes instant-loading {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0%); }
          100% { transform: translateX(100%); }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Add loading animation on click
  const handleClickWithAnimation = useCallback((e) => {
    const link = e.currentTarget;
    link.classList.add('loading');
    
    // Remove loading class after animation
    setTimeout(() => {
      link.classList.remove('loading');
    }, 600);
    
    handleClick(e);
  }, [handleClick]);

  return (
    <Link
      ref={linkRef}
      to={to}
      className={`preload-link ${className}`}
      onClick={handleClickWithAnimation}
      onMouseEnter={handleMouseEnter}
      onTouchStart={handleTouchStart}
      aria-label={typeof children === 'string' ? children : undefined}
      {...props}
    >
      {children}
    </Link>
  );
};

// Export helper function for manual preloading
PreloadLink.preloadRoute = preloadRoute;
PreloadLink.preloadMultiple = (paths) => {
  paths.forEach(path => preloadRoute(path));
};

export default PreloadLink;