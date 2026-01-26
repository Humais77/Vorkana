// store/useAuthStore.js - PRODUCTION READY
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Production storage keys (versioned to avoid conflicts)
const PRODUCTION_STORAGE_KEYS = {
  USER_INFO: 'vorkanna_user_v1',
  AUTH_STATE: 'vorkanna_auth_state_v1',
  CSRF_TOKEN: 'vorkanna_csrf_v1',
  SESSION_ID: 'vorkanna_session_v1'
};

// Emergency cleanup utility
const emergencyCleanup = () => {
  try {
    // Clear ALL localStorage items related to auth
    const allKeys = Object.keys(localStorage);
    allKeys.forEach(key => {
      if (
        key.includes('auth') || 
        key.includes('token') || 
        key.includes('user') || 
        key.includes('csrf') || 
        key.includes('session') ||
        key.includes('vorkanna') ||
        key.includes('admin')
      ) {
        localStorage.removeItem(key);
      }
    });
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    // Clear cookies
    if (typeof document !== 'undefined') {
      document.cookie.split(';').forEach(cookie => {
        const [name] = cookie.trim().split('=');
        if (name) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/admin;`;
        }
      });
    }
    
    console.log('🧹 Emergency cleanup completed');
  } catch (error) {
    console.error('Emergency cleanup error:', error);
  }
};

// Production error boundary for actions
const productionErrorBoundary = (action) => {
  return (...args) => {
    try {
      return action(...args);
    } catch (error) {
      console.error('🚨 Production error in auth store action:', {
        action: action.name || 'anonymous',
        error: error.message,
        stack: error.stack
      });
      
      emergencyCleanup();
      
      // Force logout state
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          window.location.href = '/signin?error=auth_store&time=' + Date.now();
        }, 100);
      }
      
      throw error;
    }
  };
};

// Validate and sanitize user data for production
const validateAndSanitizeUser = (userData) => {
  try {
    // Basic validation
    if (!userData || typeof userData !== 'object') {
      console.warn('Invalid user data: not an object');
      return null;
    }
    
    // REQUIRED FIELDS validation
    const requiredFields = {
      _id: userData._id,
      email: userData.email,
      name: userData.name
    };
    
    for (const [field, value] of Object.entries(requiredFields)) {
      if (!value || typeof value !== 'string' || value.trim().length === 0) {
        console.warn(`Invalid user data: missing or invalid ${field}`);
        return null;
      }
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email.trim())) {
      console.warn('Invalid user data: invalid email format');
      return null;
    }
    
    // Return sanitized user object
    return {
      // Required fields (sanitized)
      _id: userData._id.toString().trim(),
      email: userData.email.toLowerCase().trim(),
      name: userData.name.trim(),
      role: userData.role === 'admin' ? 'admin' : 'user',
      
      // Optional fields with validation
      picture: typeof userData.picture === 'string' && 
                userData.picture.startsWith('http') ? 
                userData.picture : null,
      
      emailVerified: Boolean(userData.emailVerified),
      isOnline: Boolean(userData.isOnline),
      lastSeenAt: userData.lastSeenAt || new Date().toISOString(),
      accountType: ['basic', 'premium', 'business'].includes(userData.accountType) ? 
                   userData.accountType : 'basic',
      
      // Safely handled optional fields
      phoneNumber: typeof userData.phoneNumber === 'string' && 
                   userData.phoneNumber.length <= 20 ? 
                   userData.phoneNumber.trim() : null,
      
      country: typeof userData.country === 'string' && 
               userData.country.length <= 100 ? 
               userData.country.trim() : null,
      
      city: typeof userData.city === 'string' && 
            userData.city.length <= 100 ? 
            userData.city.trim() : null,
      
      bio: typeof userData.bio === 'string' && 
           userData.bio.length <= 500 ? 
           userData.bio.trim() : null,
      
      // Additional metadata
      createdAt: userData.createdAt || null,
      updatedAt: userData.updatedAt || null,
      
      // Prevent prototype pollution
      __proto__: undefined,
      constructor: undefined
    };
  } catch (error) {
    console.error('User validation error:', error);
    return null;
  }
};

// Get user from storage with production validation
const getValidUserFromStorage = () => {
  try {
    const userInfo = localStorage.getItem(PRODUCTION_STORAGE_KEYS.USER_INFO);
    
    if (!userInfo) return null;
    
    let parsed;
    try {
      parsed = JSON.parse(userInfo);
    } catch (parseError) {
      console.error('❌ Corrupted userInfo JSON:', parseError.message);
      localStorage.removeItem(PRODUCTION_STORAGE_KEYS.USER_INFO);
      return null;
    }
    
    const validatedUser = validateAndSanitizeUser(parsed);
    
    if (!validatedUser) {
      console.warn('🚨 Invalid user data found in storage, removing');
      localStorage.removeItem(PRODUCTION_STORAGE_KEYS.USER_INFO);
      return null;
    }
    
    return validatedUser;
  } catch (error) {
    console.error('Critical error in getValidUserFromStorage:', error);
    emergencyCleanup();
    return null;
  }
};

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: getValidUserFromStorage(),
      isAuthenticated: false,
      loading: false,
      error: null,
      lastActivity: Date.now(),
      
      // Actions with production error boundaries
      setLoading: productionErrorBoundary((loading) => {
        set({ loading });
      }),
      
      setError: productionErrorBoundary((error) => {
        set({ error });
      }),
      
      clearError: productionErrorBoundary(() => {
        set({ error: null });
      }),
      
      updateLastActivity: productionErrorBoundary(() => {
        set({ lastActivity: Date.now() });
      }),
      
      setAuth: productionErrorBoundary((user) => {
        const validatedUser = validateAndSanitizeUser(user);
        
        if (!validatedUser) {
          console.error('Invalid user data provided to setAuth');
          set({ error: 'Invalid user data' });
          return;
        }
        
        try {
          // Store in production storage
          localStorage.setItem(
            PRODUCTION_STORAGE_KEYS.USER_INFO, 
            JSON.stringify(validatedUser)
          );
          
          set({ 
            user: validatedUser,
            isAuthenticated: true,
            loading: false,
            error: null,
            lastActivity: Date.now()
          });
          
          console.log('✅ Auth state set for user:', validatedUser.email);
        } catch (storageError) {
          console.error('Storage error in setAuth:', storageError);
          emergencyCleanup();
          set({ error: 'Storage error. Please refresh.' });
        }
      }),
      
      setUser: productionErrorBoundary((userUpdates) => {
        const currentUser = get().user;
        if (!currentUser) return;
        
        const updatedUser = { 
          ...currentUser, 
          ...validateAndSanitizeUser(userUpdates) 
        };
        
        // Re-validate after merge
        const validatedUser = validateAndSanitizeUser(updatedUser);
        if (!validatedUser) {
          console.error('Invalid user data after update');
          return;
        }
        
        localStorage.setItem(
          PRODUCTION_STORAGE_KEYS.USER_INFO, 
          JSON.stringify(validatedUser)
        );
        
        set({ user: validatedUser });
      }),
      
      updateUserField: productionErrorBoundary((field, value) => {
        const currentUser = get().user;
        if (!currentUser) return;
        
        // Validate field update
        const updatedUser = { ...currentUser, [field]: value };
        const validatedUser = validateAndSanitizeUser(updatedUser);
        
        if (!validatedUser) {
          console.error(`Invalid value for field ${field}:`, value);
          return;
        }
        
        localStorage.setItem(
          PRODUCTION_STORAGE_KEYS.USER_INFO, 
          JSON.stringify(validatedUser)
        );
        
        set({ user: validatedUser });
      }),
      
      logout: productionErrorBoundary(async (isAdmin = false) => {
  set({ loading: true });
  
  try {
    // Call appropriate logout API
    if (isAdmin) {
      const { adminAPI } = await import('../api/admin');
      await adminAPI.adminLogout();
    } else {
      const authAPI = (await import('../api/auth')).authAPI;
      await authAPI.logout();
    }
  } catch (error) {
    console.error('Logout API error:', error);
    // Don't fail on API error
  }
  
  // ALWAYS clear local state regardless of API response
  localStorage.clear();
  sessionStorage.clear();
  
  // Clear all cookies client-side
  if (typeof document !== 'undefined') {
    document.cookie.split(';').forEach(cookie => {
      const [name] = cookie.trim().split('=');
      if (name) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/admin;`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/api;`;
      }
    });
  }
  
  // Clear state
  set({ 
    user: null,
    isAuthenticated: false,
    loading: false,
    error: null,
    lastActivity: 0
  });
  
  console.log('✅ Logout completed');
}),
      adminLogout: productionErrorBoundary(async () => {
        return get().logout(true);
      }),
      
      forceLogout: productionErrorBoundary(() => {
        console.log('🚨 Force logout triggered');
        emergencyCleanup();
        
        set({ 
          user: null,
          isAuthenticated: false,
          loading: false,
          error: 'Session terminated for security reasons'
        });
        
        if (typeof window !== 'undefined') {
          window.location.href = '/signin?force_logout=true&t=' + Date.now();
        }
      }),
      
      syncFromStorage: productionErrorBoundary(() => {
        const user = getValidUserFromStorage();
        set({ 
          user,
          isAuthenticated: !!user
        });
      }),
      
      checkSessionValidity: productionErrorBoundary(() => {
        const state = get();
        
        if (!state.user) {
          emergencyCleanup();
          return false;
        }
        
        // Check inactivity timeout
        const isAdmin = state.user?.role === 'admin';
        const INACTIVITY_TIMEOUT = isAdmin 
          ? 60 * 60 * 1000 // 1 hour for admins
          : 3 * 60 * 60 * 1000; // 3 hours for users
        
        const timeSinceLastActivity = Date.now() - state.lastActivity;
        
        if (timeSinceLastActivity > INACTIVITY_TIMEOUT) {
          console.log(`Session expired due to inactivity (${isAdmin ? 'admin' : 'user'})`);
          
          get().forceLogout();
          return false;
        }
        
        return true;
      }),
      
      // Computed getters
      isAdmin: () => {
        const user = get().user;
        return user?.role === 'admin';
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
      updateSessionData: productionErrorBoundary((data) => {
        const currentUser = get().user;
        if (!currentUser) return;
        
        const updatedUser = { 
          ...currentUser, 
          ...validateAndSanitizeUser(data),
          lastSeenAt: new Date().toISOString()
        };
        
        const validatedUser = validateAndSanitizeUser(updatedUser);
        if (!validatedUser) return;
        
        localStorage.setItem(
          PRODUCTION_STORAGE_KEYS.USER_INFO, 
          JSON.stringify(validatedUser)
        );
        
        set({ user: validatedUser, lastActivity: Date.now() });
      }),
      
      canAccessAdminPanel: () => {
        const user = get().user;
        if (!user) return false;
        
        if (user.role === 'admin') {
          const hasAdminPerms = user.permissions?.length > 0 || user.isSuperAdmin === true;
          return hasAdminPerms;
        }
        
        return false;
      },
      
      // Storage maintenance
      cleanupStorage: productionErrorBoundary(() => {
        try {
          const allKeys = Object.keys(localStorage);
          let cleaned = 0;
          
          allKeys.forEach(key => {
            // Remove non-production keys
            if (!key.startsWith('vorkanna_')) {
              try {
                localStorage.removeItem(key);
                cleaned++;
              } catch (e) {
                console.warn(`Failed to remove key ${key}:`, e);
              }
            }
          });
          
          if (cleaned > 0) {
            console.log(`🧹 Cleaned ${cleaned} non-production storage items`);
          }
          
          return cleaned;
        } catch (error) {
          console.error('Storage cleanup error:', error);
          return 0;
        }
      }),
      
      // Clear state (for testing/dev)
      clearAuthState: productionErrorBoundary(() => {
        emergencyCleanup();
        set({
          user: null,
          isAuthenticated: false,
          loading: false,
          error: null,
          lastActivity: Date.now()
        });
      })
    }),
    {
      name: PRODUCTION_STORAGE_KEYS.AUTH_STATE,
      version: 1, // Production version
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist minimal state
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        lastActivity: state.lastActivity,
      }),
      migrate: (persistedState, version) => {
        console.log(`🔧 Production migration from version ${version || 'none'} to 1`);
        
        // Clear all old data formats
        emergencyCleanup();
        
        // Return clean slate for production
        return {
          user: null,
          isAuthenticated: false,
          lastActivity: Date.now()
        };
      },
      onRehydrateStorage: () => {
        return (state) => {
          if (state) {
            // Production rehydration checks
            setTimeout(() => {
              // Validate stored user data
              if (state.user && !validateAndSanitizeUser(state.user)) {
                console.warn('Invalid user data after rehydration, clearing');
                state.user = null;
                state.isAuthenticated = false;
                localStorage.removeItem(PRODUCTION_STORAGE_KEYS.USER_INFO);
              }
              
              // Check session validity
              state.checkSessionValidity();
              
              // Run storage cleanup
              state.cleanupStorage?.();
            }, 500);
          }
        };
      },
    }
  )
);

// Production initialization
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
  
  // Listen for storage events (multi-tab sync)
  window.addEventListener('storage', (event) => {
    if (event.key === PRODUCTION_STORAGE_KEYS.USER_INFO || 
        event.key === PRODUCTION_STORAGE_KEYS.AUTH_STATE) {
      console.log('Production storage changed, syncing...');
      useAuthStore.getState().syncFromStorage();
    }
  });
  
  // Listen for logout events
  window.addEventListener('auth-logout-complete', () => {
    console.log('Production auth logout event received');
    useAuthStore.getState().forceLogout();
  });
  
  // Initial storage cleanup
  setTimeout(() => {
    useAuthStore.getState().cleanupStorage();
  }, 1000);
}

// Export helper functions
export const getCurrentUser = () => useAuthStore.getState().user;
export const isUserAuthenticated = () => useAuthStore.getState().isAuthenticated;
export const isUserAdmin = () => useAuthStore.getState().isAdmin();
export const isUserSuperAdmin = () => useAuthStore.getState().isSuperAdmin();
export const isUserEmailVerified = () => useAuthStore.getState().isEmailVerified();

// Export production utilities
export { emergencyCleanup, PRODUCTION_STORAGE_KEYS };