import { Link, useNavigate } from 'react-router-dom';
import { useCallback, useRef } from 'react';

const PRELOADED_ROUTES = new Set();

const preloadRoute = (path) => {
  if (PRELOADED_ROUTES.has(path)) return;

  // Simple route to component mapping
  const routeMap = {
    '/signin': () => import('../layouts/pages/auth/Signin'),
    '/signup': () => import('../layouts/pages/auth/Signup'),
    '/dashboard': () => import('../layouts/pages/profile/Dashboard'),
    '/profile': () => import('../layouts/pages/profile/Profile'),
    '/gigs': () => import('../layouts/pages/gigs/GigListingPage'),
    '/services': () => import('../layouts/pages/services/ServiceListingPage'),
  };

  if (routeMap[path]) {
    PRELOADED_ROUTES.add(path);
    
    // Non-blocking preload
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        routeMap[path]().catch(() => PRELOADED_ROUTES.delete(path));
      }, { timeout: 500 });
    } else {
      setTimeout(() => {
        routeMap[path]().catch(() => PRELOADED_ROUTES.delete(path));
      }, 50);
    }
  }
};

const PreloadLink = ({ 
  to, 
  children, 
  className = '', 
  onClick,
  ...props 
}) => {
  const navigate = useNavigate();
  const hasPreloadedRef = useRef(false);
  
  const path = typeof to === 'string' ? to : to?.pathname || '';

  const handlePreload = useCallback(() => {
    if (!hasPreloadedRef.current && path) {
      hasPreloadedRef.current = true;
      preloadRoute(path);
    }
  }, [path]);

  const handleClick = useCallback((e) => {
    if (onClick) onClick(e);
    
    // Add minimal loading indicator
    const link = e.currentTarget;
    const originalContent = link.innerHTML;
    
    // Optional: Add loading state
    link.style.opacity = '0.9';
    
    // Navigate immediately
    navigate(to);
    
    // Restore opacity after navigation starts
    setTimeout(() => {
      link.style.opacity = '1';
    }, 100);
  }, [navigate, to, onClick]);

  // Preload on hover/touch
  const handleMouseEnter = useCallback(() => {
    handlePreload();
  }, [handlePreload]);

  const handleTouchStart = useCallback(() => {
    handlePreload();
  }, [handlePreload]);

  return (
    <Link
      to={to}
      className={className}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onTouchStart={handleTouchStart}
      {...props}
    >
      {children}
    </Link>
  );
};

PreloadLink.preloadRoute = preloadRoute;

export default PreloadLink;