// AdminLayout.jsx or create a new AdminRouteWrapper
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const AdminLayoutWrapper = ({ children }) => {
  const location = useLocation();
  
  useEffect(() => {
    // Set simple title for all admin pages
    document.title = 'Vorkanna | Freelance services marketplace | Find top global talent';
    
    // Add noindex meta tag
    let metaRobots = document.querySelector('meta[name="robots"]');
    if (!metaRobots) {
      metaRobots = document.createElement('meta');
      metaRobots.name = 'robots';
      document.head.appendChild(metaRobots);
    }
    metaRobots.content = 'noindex, nofollow';
    
    // Remove any existing structured data
    document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    });
    
    // Remove canonical links
    document.querySelectorAll('link[rel="canonical"]').forEach(link => {
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
    });
  }, [location.pathname]);
  
  return <>{children}</>;
};

export default AdminLayoutWrapper;