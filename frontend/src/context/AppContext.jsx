// AppContext.jsx - Simplified version
import React, { createContext, useContext, useState, useCallback } from 'react';

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
  
  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);
  
  const addNotification = useCallback((notification) => {
    const id = Math.random().toString(36).substr(2, 9);
    const notificationWithId = { ...notification, id };
    
    setNotifications((prev) => [...prev, notificationWithId]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setNotifications((prev) => 
        prev.filter((n) => n.id !== notificationWithId.id)
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