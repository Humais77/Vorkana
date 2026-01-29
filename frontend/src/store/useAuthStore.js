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
      
    setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
      
  setAuth: (user) => {
        const validatedUser = validateAndSanitizeUser(user);
        
        if (!validatedUser) {
          console.error('Invalid user data provided to setAuth');
          set({ error: 'Invalid user data' });
          return;
        }
        
        try {
          localStorage.setItem(
            PRODUCTION_STORAGE_KEYS.USER_INFO, 
            JSON.stringify(validatedUser)
          );
          
          set({ 
            user: validatedUser,
            isAuthenticated: true,
            loading: false,
            error: null
          });
        } catch (storageError) {
          console.error('Storage error in setAuth:', storageError);
          set({ error: 'Storage error. Please refresh.' });
        }
      },
      
      
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
      
     logout: () => {
        
        // 1. Clear state first
        set({
          user: null,
          isAuthenticated: false,
          loading: false,
          error: null
        });

        // 2. Clear localStorage
        localStorage.removeItem(PRODUCTION_STORAGE_KEYS.USER_INFO);
        
        // 3. Clear CSRF token storage
        localStorage.removeItem('csrfToken');
        localStorage.removeItem('csrfTokenExpiry');
        
      },
      
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
  
  const possibleKeys = [
    'vorkanna_user_v1',       // Primary key
    'userInfo',               // Old key
    'vorkanna_auth_state_v1'  // Zustand persisted key
  ];
  
  let foundUser = null;
  
  for (const key of possibleKeys) {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Check if it's user data or state object
        const userData = parsed.user || parsed.state?.user || parsed;
        
        if (userData && userData.email) {
          const validated = validateAndSanitizeUser(userData);
          if (validated) {
          
            foundUser = validated;
            break;
          }
        }
      }
    } catch (e) {
      // Skip invalid JSON
    }
  }
  
  set({ 
    user: foundUser,
    isAuthenticated: !!foundUser
  });
  
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
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist user data
        user: state.user,
        // DO NOT persist isAuthenticated - it should be computed from user
      }),
      onRehydrateStorage: () => {
        return (state) => {
          if (state) {
            // Compute isAuthenticated from user on rehydration
            state.isAuthenticated = !!state.user;
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

// Export production utilities
export { emergencyCleanup, PRODUCTION_STORAGE_KEYS };