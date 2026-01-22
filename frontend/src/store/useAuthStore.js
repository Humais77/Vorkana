// store/useAuthStore.js
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Unified logout utility function
const comprehensiveLogout = async () => {
  try {
    // Array of logout endpoints to call
    const logoutEndpoints = [
      '/api/admin/logout',
      '/api/auth/logout'
    ];

    // Call all logout endpoints concurrently
    const logoutPromises = logoutEndpoints.map(endpoint => 
      fetch(endpoint, {
        method: 'POST',
        credentials: 'include', // Important for cookies
        headers: {
          'Content-Type': 'application/json',
        },
      }).catch(err => {
        console.error(`Logout failed for ${endpoint}:`, err);
        return null;
      })
    );

    await Promise.all(logoutPromises);

    return true;
  } catch (error) {
    console.error('Comprehensive logout error:', error);
    return false;
  }
};

// Clear all browser storage
const clearAllStorage = () => {
  // Clear localStorage
  const localStorageKeys = [
    'userInfo',
    'adminToken',
    'adminRefreshToken',
    'adminInfo',
    'token',
    'refreshToken',
    'auth-storage',
    'admin-storage'
  ];

  localStorageKeys.forEach(key => {
    localStorage.removeItem(key);
  });

  // Clear sessionStorage
  sessionStorage.clear();

  // Clear cookies (by setting expiration)
  if (typeof document !== 'undefined') {
    document.cookie.split(';').forEach(cookie => {
      const [name] = cookie.trim().split('=');
      if (name) {
        // Clear for all paths and domains
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/admin;`;
      }
    });
  }
};

const getUserFromStorage = () => {
  try {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      const parsed = JSON.parse(userInfo);
      
      // Validate required fields
      if (!parsed._id || !parsed.email || !parsed.name) {
        console.warn('Invalid user data in storage');
        return null;
      }
      
      return parsed;
    }
    return null;
  } catch (error) {
    console.error('Error parsing user from storage:', error);
    localStorage.removeItem('userInfo');
    return null;
  }
};

const AUTH_STORAGE_KEY = 'auth-storage';
const AUTH_VERSION = 4; // Increment version for logout changes

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: getUserFromStorage(),
      isAuthenticated: false,
      loading: false,
      error: null,
      lastActivity: Date.now(),
      
      // Actions
      setLoading: (loading) => set({ loading }),
      
      setError: (error) => set({ error }),
      
      clearError: () => set({ error: null }),
      
      updateLastActivity: () => set({ lastActivity: Date.now() }),
      
      setAuth: (user) => {
        if (!user || !user._id) {
          console.error('Invalid user data provided to setAuth');
          return;
        }
        
        const userInfo = {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role || 'user',
          picture: user.picture || null,
          emailVerified: user.emailVerified || false,
          isOnline: user.isOnline || true,
          lastSeenAt: user.lastSeenAt || new Date().toISOString(),
          accountType: user.accountType || 'basic',
          phoneNumber: user.phoneNumber || null,
          country: user.country || null,
          city: user.city || null,
          bio: user.bio || null,
        };
        
        set({ 
          user: userInfo,
          isAuthenticated: true,
          loading: false,
          error: null,
          lastActivity: Date.now()
        });
        
        localStorage.setItem('userInfo', JSON.stringify(userInfo));
      },
      
      setUser: (userUpdates) => {
        const currentUser = get().user;
        if (!currentUser) return;
        
        const updatedUser = { ...currentUser, ...userUpdates };
        set({ user: updatedUser });
        localStorage.setItem('userInfo', JSON.stringify(updatedUser));
      },
      
      updateUserField: (field, value) => {
        const currentUser = get().user;
        if (!currentUser) return;
        
        const updatedUser = { ...currentUser, [field]: value };
        set({ user: updatedUser });
        localStorage.setItem('userInfo', JSON.stringify(updatedUser));
      },
      
      logout: async (isAdmin = false) => {
        set({ loading: true });
        
        try {
          // Call appropriate logout endpoint
          const endpoint = isAdmin ? '/api/admin/logout' : '/api/auth/logout';
          
          await fetch(endpoint, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          }).catch(() => {
            // If main endpoint fails, try the other one
            const fallbackEndpoint = isAdmin ? '/api/auth/logout' : '/api/admin/logout';
            return fetch(fallbackEndpoint, {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
            });
          });
          
          // Clear all storage
          clearAllStorage();
          
          // Clear state
          set({ 
            user: null,
            isAuthenticated: false,
            loading: false,
            error: null,
            lastActivity: Date.now()
          });
          
          // Dispatch appropriate logout event
          const logoutEvent = new CustomEvent('auth-logout', { 
            detail: { isAdmin } 
          });
          window.dispatchEvent(logoutEvent);
          
          console.log(`${isAdmin ? 'Admin' : 'User'} logout successful`);
          
        } catch (error) {
          console.error('Logout error:', error);
          set({ error: error.message, loading: false });
          
          // Fallback: clear everything locally even if server logout fails
          clearAllStorage();
          set({ 
            user: null,
            isAuthenticated: false,
            loading: false
          });
        }
      },
      
      // Admin-specific logout
      adminLogout: async () => {
        return get().logout(true);
      },
      
      // Force logout (for security breaches, session timeout, etc.)
      forceLogout: () => {
        clearAllStorage();
        set({ 
          user: null,
          isAuthenticated: false,
          loading: false,
          error: 'Session terminated for security reasons'
        });
        
        window.dispatchEvent(new Event('force-logout'));
      },
      
      syncFromStorage: () => {
        const user = getUserFromStorage();
        set({ 
          user,
          isAuthenticated: !!user
        });
      },
      
      checkSessionValidity: () => {
        const state = get();
        
        // No user = no session
        if (!state.user) return false;
        
        // Check inactivity timeout (30 minutes for users, 1 hour for admins)
        const isAdmin = state.user?.role === 'admin';
        const INACTIVITY_TIMEOUT = isAdmin 
          ? 60 * 60 * 1000 // 1 hour for admins
          : 30 * 60 * 1000; // 30 minutes for regular users
        
        const timeSinceLastActivity = Date.now() - state.lastActivity;
        
        if (timeSinceLastActivity > INACTIVITY_TIMEOUT) {
          console.log(`Session expired due to inactivity (${isAdmin ? 'admin' : 'user'})`);
          
          // Auto-logout with appropriate message
          const message = isAdmin 
            ? 'Admin session timed out due to 1 hour of inactivity'
            : 'Session timed out due to 30 minutes of inactivity';
          
          set({ error: message });
          get().logout(isAdmin);
          
          return false;
        }
        
        return true;
      },
      
      // Computed getters
      isAdmin: () => {
        const user = get().user;
        return user?.role === 'admin' || user?.isAdmin === true;
      },
      
      isAdminUser: () => {
        const user = get().user;
        return user?.role === 'admin';
      },
      
      isSuperAdmin: () => {
        const user = get().user;
        return user?.role === 'admin' && user?.permissions?.includes('super_admin');
      },
      
      isEmailVerified: () => {
        const user = get().user;
        return user?.emailVerified === true;
      },
      
      isPremium: () => {
        const user = get().user;
        const accountType = user?.accountType || 'basic';
        return accountType === 'premium' || accountType === 'business';
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
      
      // Permission checks
      hasPermission: (permission) => {
        const user = get().user;
        if (!user) return false;
        
        // Admins have all permissions
        if (user.role === 'admin') return true;
        
        const permissions = {
          user: ['create_service', 'manage_orders', 'send_messages', 'write_reviews'],
          premium: ['create_service', 'manage_orders', 'send_messages', 'write_reviews', 'priority_support', 'advanced_analytics'],
          business: ['create_service', 'manage_orders', 'send_messages', 'write_reviews', 'priority_support', 'advanced_analytics', 'team_management', 'custom_branding'],
        };
        
        const accountType = user.accountType || 'basic';
        return permissions[accountType]?.includes(permission) || false;
      },
      
      hasAdminPermission: (permission) => {
        const user = get().user;
        if (!user || user.role !== 'admin') return false;
        
        const adminPermissions = user.permissions || ['manage_users', 'manage_content', 'view_analytics'];
        return adminPermissions.includes(permission) || user.isSuperAdmin === true;
      },
      
      // Feature flags
      canAccessFeature: (feature) => {
        const user = get().user;
        if (!user) return false;
        
        // Admins can access all features
        if (user.role === 'admin') return true;
        
        const features = {
          basic: ['basic_messaging', 'profile_view', 'service_creation', 'order_management'],
          premium: ['basic_messaging', 'profile_view', 'service_creation', 'order_management', 'priority_support', 'analytics_dashboard', 'advanced_search'],
          business: ['basic_messaging', 'profile_view', 'service_creation', 'order_management', 'priority_support', 'analytics_dashboard', 'advanced_search', 'team_collaboration', 'api_access'],
        };
        
        const accountType = user.accountType || 'basic';
        return features[accountType]?.includes(feature) || false;
      },
      
      // Session management
      updateSessionData: (data) => {
        const currentUser = get().user;
        if (!currentUser) return;
        
        const updatedUser = { 
          ...currentUser, 
          ...data,
          lastSeenAt: new Date().toISOString()
        };
        
        set({ user: updatedUser, lastActivity: Date.now() });
        localStorage.setItem('userInfo', JSON.stringify(updatedUser));
      },
      
      // Quick check for admin panel access
      canAccessAdminPanel: () => {
        const user = get().user;
        if (!user) return false;
        
        // Check if user is admin and has admin permissions
        if (user.role === 'admin') {
          const hasAdminPerms = user.permissions?.length > 0 || user.isSuperAdmin === true;
          return hasAdminPerms;
        }
        
        return false;
      },
      
      // Clear state without server call (for testing/dev)
      clearAuthState: () => {
        clearAllStorage();
        set({
          user: null,
          isAuthenticated: false,
          loading: false,
          error: null,
          lastActivity: Date.now()
        });
      }
    }),
    {
      name: AUTH_STORAGE_KEY,
      version: AUTH_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        lastActivity: state.lastActivity,
      }),
      migrate: (persistedState, version) => {
        if (version < 4) {
          // Migration to version 4
          const oldState = persistedState;
          return {
            user: oldState.user,
            isAuthenticated: !!oldState.user,
            lastActivity: Date.now(),
            loading: false,
            error: null,
          };
        }
        return persistedState;
      },
      onRehydrateStorage: () => {
        // Called after rehydration
        return (state, error) => {
          if (error) {
            console.error('Auth store rehydration error:', error);
          } else if (state) {
            // Check session validity on rehydration
            setTimeout(() => {
              state.checkSessionValidity();
            }, 1000);
          }
        };
      },
    }
  )
);

// Export helper functions
export const getCurrentUser = () => useAuthStore.getState().user;
export const isUserAuthenticated = () => useAuthStore.getState().isAuthenticated;
export const isUserAdmin = () => useAuthStore.getState().isAdmin();
export const isUserSuperAdmin = () => useAuthStore.getState().isSuperAdmin();
export const isUserEmailVerified = () => useAuthStore.getState().isEmailVerified();

// Export logout utilities
export { comprehensiveLogout, clearAllStorage };

// store/useAuthStore.js
if (typeof window !== 'undefined') {
  // Track user activity
  const trackActivity = () => {
    useAuthStore.getState().updateLastActivity();
  };
  
  // Add activity listeners
  const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
  activityEvents.forEach(event => {
    window.addEventListener(event, trackActivity, { passive: true });
  });
  
  // Optional: Keep session check but make it less frequent (30 minutes)
  // setInterval(() => {
  //   useAuthStore.getState().checkSessionValidity();
  // }, 30 * 60 * 1000); // Check every 30 minutes
  
  // Listen for storage events (for multi-tab sync)
  window.addEventListener('storage', (event) => {
    if (event.key === 'userInfo' || event.key === AUTH_STORAGE_KEY) {
      console.log('Auth storage changed, syncing...');
      useAuthStore.getState().syncFromStorage();
    }
  });
  
  // Listen for logout events
  window.addEventListener('auth-logout', () => {
    console.log('Auth logout event received');
    useAuthStore.getState().clearAuthState();
  });
  
  window.addEventListener('force-logout', () => {
    console.log('Force logout event received');
    useAuthStore.getState().clearAuthState();
  });
  
  window.addEventListener('admin-logout', () => {
    console.log('Admin logout event received');
    // Additional admin-specific cleanup if needed
  });
}