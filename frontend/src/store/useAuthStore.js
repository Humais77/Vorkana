import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Storage utilities
const getUserFromStorage = () => {
  try {
    const userInfo = localStorage.getItem("userInfo");
    if (userInfo) return JSON.parse(userInfo);
    
    // Legacy support
    const user = localStorage.getItem("user");
    if (user) {
      const parsedUser = JSON.parse(user);
      localStorage.setItem("userInfo", JSON.stringify(parsedUser));
      localStorage.removeItem("user"); // Clean up legacy storage
      return parsedUser;
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing user from storage:', error);
    return null;
  }
};

const getTokenFromStorage = () => {
  try {
    return localStorage.getItem("userToken");
  } catch (error) {
    console.error('Error getting token from storage:', error);
    return null;
  }
};

const getRefreshTokenFromStorage = () => {
  try {
    return localStorage.getItem("refreshToken");
  } catch (error) {
    console.error('Error getting refresh token from storage:', error);
    return null;
  }
};

// Session storage for sensitive data (optional)
const getSessionData = (key) => {
  try {
    return sessionStorage.getItem(key);
  } catch (error) {
    return null;
  }
};

const setSessionData = (key, value) => {
  try {
    sessionStorage.setItem(key, value);
  } catch (error) {
    console.error('Error setting session storage:', error);
  }
};

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: getUserFromStorage(),
      token: getTokenFromStorage(),
      refreshToken: getRefreshTokenFromStorage(),
      isAuthenticated: !!getTokenFromStorage(),
      loading: false,
      error: null,
      lastActivity: Date.now(),
      requiresReauth: false,
      
      // Actions
      setLoading: (loading) => set({ loading }),
      
      setError: (error) => set({ error }),
      
      clearError: () => set({ error: null }),
      
      updateLastActivity: () => set({ lastActivity: Date.now() }),
      
      setRequiresReauth: (requires) => set({ requiresReauth: requires }),
      
      setAuth: (user, token, refreshToken) => {
        set({ 
          user, 
          token, 
          refreshToken,
          isAuthenticated: !!token,
          loading: false,
          error: null,
          lastActivity: Date.now(),
          requiresReauth: false
        });
        
        // Store in localStorage
        if (user) {
          localStorage.setItem("userInfo", JSON.stringify(user));
        }
        if (token) {
          localStorage.setItem("userToken", token);
        }
        if (refreshToken) {
          localStorage.setItem("refreshToken", refreshToken);
        }
      },
      
      setUser: (user) => {
        const currentState = get();
        const updatedUser = { ...currentState.user, ...user };
        
        set({ 
          user: updatedUser,
          loading: false,
          error: null 
        });
        
        localStorage.setItem("userInfo", JSON.stringify(updatedUser));
      },
      
      setTokens: (token, refreshToken) => {
        set({ 
          token, 
          refreshToken,
          isAuthenticated: !!token,
          loading: false,
          error: null 
        });
        
        if (token) {
          localStorage.setItem("userToken", token);
        }
        if (refreshToken) {
          localStorage.setItem("refreshToken", refreshToken);
        }
      },
      
      updateUserField: (field, value) => {
        const currentState = get();
        const updatedUser = { ...currentState.user, [field]: value };
        
        set({ user: updatedUser });
        localStorage.setItem("userInfo", JSON.stringify(updatedUser));
      },
      
      logout: () => {
        set({ 
          user: null, 
          token: null, 
          refreshToken: null,
          isAuthenticated: false,
          loading: false,
          error: null,
          requiresReauth: false
        });
        
        // Clear localStorage
        localStorage.removeItem("userInfo");
        localStorage.removeItem("userToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user"); // Legacy
        
        // Clear sessionStorage
        sessionStorage.clear();
        
        // Clear any service workers or indexedDB if needed
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(registrations => {
            registrations.forEach(registration => registration.unregister());
          });
        }
      },
      
      syncFromStorage: () => {
        const user = getUserFromStorage();
        const token = getTokenFromStorage();
        const refreshToken = getRefreshTokenFromStorage();
        
        set({ 
          user, 
          token, 
          refreshToken,
          isAuthenticated: !!token 
        });
      },
      
      // Computed properties
      isAdmin: () => {
        const user = get().user;
        return user?.role === 'admin';
      },
      
      isEmailVerified: () => {
        const user = get().user;
        return user?.emailVerified === true;
      },
      
      isPremium: () => {
        const user = get().user;
        return user?.accountType === 'premium' || user?.accountType === 'business';
      },
      
      getFullName: () => {
        const user = get().user;
        return user?.name || 'User';
      },
      
      getInitials: () => {
        const user = get().user;
        if (!user?.name) return 'U';
        
        return user.name
          .split(' ')
          .map(word => word[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);
      },
      
      getProfilePicture: () => {
        const user = get().user;
        return user?.picture || null;
      },
      
      // Security check - check if session is still valid
      checkSessionValidity: () => {
        const state = get();
        if (!state.token || !state.lastActivity) return false;
        
        // Session timeout: 30 minutes of inactivity
        const SESSION_TIMEOUT = 30 * 60 * 1000;
        const timeSinceLastActivity = Date.now() - state.lastActivity;
        
        if (timeSinceLastActivity > SESSION_TIMEOUT) {
          // Auto-logout on timeout
          get().logout();
          return false;
        }
        
        return true;
      },
      
      // Check if user needs to reauthenticate
      needsReauth: () => {
        return get().requiresReauth;
      },
      
      // Update user profile fields
      updateProfile: (updates) => {
        const currentState = get();
        const updatedUser = { ...currentState.user, ...updates };
        
        set({ user: updatedUser });
        localStorage.setItem("userInfo", JSON.stringify(updatedUser));
        
        return updatedUser;
      },
      
      // Check if user has specific permission
      hasPermission: (permission) => {
        const user = get().user;
        if (!user) return false;
        
        // Admin has all permissions
        if (user.role === 'admin') return true;
        
        // Check user-specific permissions (extend as needed)
        switch (permission) {
          case 'create_gig':
            return user.role === 'user' || user.role === 'admin';
          case 'manage_orders':
            return user.role === 'user' || user.role === 'admin';
          case 'view_analytics':
            return user.role === 'admin' || user.accountType === 'business';
          default:
            return false;
        }
      },
      
      // Check if user can access a feature based on account type
      canAccessFeature: (feature) => {
        const user = get().user;
        if (!user) return false;
        
        const accountType = user.accountType || 'basic';
        
        const featureAccess = {
          basic: ['create_gig', 'basic_messaging', 'profile_customization'],
          premium: ['create_gig', 'advanced_messaging', 'profile_customization', 'priority_support', 'analytics'],
          business: ['create_gig', 'enterprise_messaging', 'full_customization', 'priority_support', 'advanced_analytics', 'team_management']
        };
        
        return featureAccess[accountType]?.includes(feature) || false;
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        lastActivity: state.lastActivity,
      }),
      // Migration for old storage format
      migrate: (persistedState, version) => {
        if (version === 0) {
          // Migrate from old format if needed
          if (persistedState.user && !persistedState.userInfo) {
            persistedState.userInfo = persistedState.user;
          }
        }
        return persistedState;
      },
      version: 1,
    }
  )
);

// Export helper functions
export const getCurrentUser = () => useAuthStore.getState().user;
export const getAuthToken = () => useAuthStore.getState().token;
export const isUserAuthenticated = () => useAuthStore.getState().isAuthenticated;
export const isUserAdmin = () => useAuthStore.getState().isAdmin();
export const isUserEmailVerified = () => useAuthStore.getState().isEmailVerified();

// Activity tracker to update last activity
export const trackUserActivity = () => {
  const updateLastActivity = useAuthStore.getState().updateLastActivity;
  updateLastActivity();
};

// Set up activity listeners
if (typeof window !== 'undefined') {
  // Track user activity
  ['click', 'keypress', 'mousemove', 'scroll'].forEach(event => {
    window.addEventListener(event, trackUserActivity, { passive: true });
  });
  
  // Auto-check session validity every minute
  setInterval(() => {
    useAuthStore.getState().checkSessionValidity();
  }, 60000);
}