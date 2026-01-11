// store/useAuthStore.js
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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
const AUTH_VERSION = 3;

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
      
      logout: () => {
        set({ 
          user: null,
          isAuthenticated: false,
          loading: false,
          error: null
        });
        
        // Clear all auth-related storage
        localStorage.removeItem('userInfo');
        
        // Clear session storage
        sessionStorage.clear();
        
        // Dispatch logout event for other components
        window.dispatchEvent(new Event('auth-logout'));
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
        
        // Check inactivity timeout (30 minutes)
        const INACTIVITY_TIMEOUT = 30 * 60 * 1000;
        const timeSinceLastActivity = Date.now() - state.lastActivity;
        
        if (timeSinceLastActivity > INACTIVITY_TIMEOUT) {
          console.log('Session expired due to inactivity');
          get().logout();
          return false;
        }
        
        return true;
      },
      
      // Computed getters
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
      
      // Feature flags
      canAccessFeature: (feature) => {
        const user = get().user;
        if (!user) return false;
        
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
        if (version === 1 || version === 2) {
          // Migration from version 1 or 2 to 3
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
    }
  )
);

// Export helper functions
export const getCurrentUser = () => useAuthStore.getState().user;
export const isUserAuthenticated = () => useAuthStore.getState().isAuthenticated;
export const isUserAdmin = () => useAuthStore.getState().isAdmin();
export const isUserEmailVerified = () => useAuthStore.getState().isEmailVerified();

// Activity tracker setup
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
  
  // Periodic session check
  setInterval(() => {
    useAuthStore.getState().checkSessionValidity();
  }, 60000); // Check every minute
}