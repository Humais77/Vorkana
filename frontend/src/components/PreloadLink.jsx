// components/PreloadLink.jsx
import { useEffect } from 'react';
import { Link } from 'react-router-dom';

const PreloadLink = ({ to, children, className, onMouseEnter, onClick, ...props }) => {
  const preloadComponent = () => {
    // Map routes to their lazy components
    const preloadMap = {
      '/signin': () => import('./layouts/pages/auth/Signin'),
      '/signup': () => import('./layouts/pages/auth/Signup'),
      '/profile': () => import('./layouts/pages/profile/Profile'),
      // Add all your routes here
    };
    
    if (preloadMap[to]) {
      preloadMap[to]();
    }
  };

  return (
    <Link
      to={to}
      className={className}
      onMouseEnter={(e) => {
        preloadComponent();
        onMouseEnter?.(e);
      }}
      onClick={(e) => {
        preloadComponent();
        onClick?.(e);
      }}
      {...props}
    >
      {children}
    </Link>
  );
};

export default PreloadLink;