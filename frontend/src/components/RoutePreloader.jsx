// components/RoutePreloader.jsx
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Critical pages that should be preloaded
const CRITICAL_PATHS = [
  '/dashboard',
  '/profile',
  '/gigs',
  '/services',
];

// Component preload cache
const PRELOAD_CACHE = new Set();

// Dynamically import components (matching your lazy imports)
const preloadComponent = (path) => {
  if (PRELOAD_CACHE.has(path)) return;

  let importFunc;
  
  switch(path) {
    case '/dashboard':
      importFunc = () => import('../layouts/pages/profile/Dashboard');
      break;
    case '/profile':
      importFunc = () => import('../layouts/pages/profile/Profile');
      break;
    case '/gigs':
      importFunc = () => import('../layouts/pages/gigs/GigListingPage');
      break;
    case '/services':
      importFunc = () => import('../layouts/pages/services/ServiceListingPage');
      break;
    default:
      return;
  }

  PRELOAD_CACHE.add(path);
  
  // Use requestIdleCallback for non-blocking preload
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      importFunc().catch(console.error);
    }, { timeout: 1000 });
  } else {
    setTimeout(() => {
      importFunc().catch(console.error);
    }, 100);
  }
};

const RoutePreloader = () => {
  const location = useLocation();
  
  useEffect(() => {
    // Preload critical pages based on current location
    const preloadCriticalPaths = () => {
      CRITICAL_PATHS.forEach(path => {
        // Only preload if not currently on that page
        if (location.pathname !== path) {
          preloadComponent(path);
        }
      });
    };

    // Use requestIdleCallback to preload during idle time
    if ('requestIdleCallback' in window) {
      requestIdleCallback(preloadCriticalPaths, { timeout: 2000 });
    } else {
      setTimeout(preloadCriticalPaths, 1000);
    }

    // Preload likely next pages based on current route
    const likelyNextPaths = {
      '/': ['/gigs', '/services', '/signin', '/signup'],
      '/gigs': ['/gig/create', '/profile'],
      '/services': ['/services/create', '/profile'],
      '/signin': ['/dashboard', '/profile', '/forgot-password'],
      '/signup': ['/verify-email', '/dashboard'],
    };

    const currentPaths = likelyNextPaths[location.pathname];
    if (currentPaths) {
      currentPaths.forEach(path => {
        if (location.pathname !== path) {
          preloadComponent(path);
        }
      });
    }
  }, [location.pathname]);

  return null;
};

export default RoutePreloader;