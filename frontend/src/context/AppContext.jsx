import React, { createContext, useContext, useState, useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');
  const [notifications, setNotifications] = useState([]);
  const syncFromStorage = useAuthStore((state) => state.syncFromStorage);
  
  // Sync auth on mount
  React.useEffect(() => {
    syncFromStorage();
    
    // Listen for storage changes (for OAuth redirects)
    const handleStorageChange = () => {
      syncFromStorage();
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [syncFromStorage]);
  
  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);
  
  const addNotification = useCallback((notification) => {
    setNotifications((prev) => [...prev, notification]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setNotifications((prev) => 
        prev.filter((n) => n.id !== notification.id)
      );
    }, 5000);
  }, []);
  
  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);
  
  const value = {
    theme,
    toggleTheme,
    notifications,
    addNotification,
    removeNotification,
  };
  
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};