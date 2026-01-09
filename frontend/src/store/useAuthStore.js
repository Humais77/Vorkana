// useAuthStore.js - Simplified for cookie-based auth
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const getUserFromStorage = () => {
  try {
    const userInfo = localStorage.getItem("userInfo");
    if (userInfo) return JSON.parse(userInfo);
    return null;
  } catch (error) {
    console.error('Error parsing user from storage:', error);
    return null;
  }
};

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: getUserFromStorage(),
      isAuthenticated: false, // We'll check with server
      loading: false,
      error: null,
      lastActivity: Date.now(),
      
      // Actions
      setLoading: (loading) => set({ loading }),
      
      setError: (error) => set({ error }),
      
      clearError: () => set({ error: null }),
      
      updateLastActivity: () => set({ lastActivity: Date.now() }),
      
      setAuth: (user) => {
        set({ 
          user, 
          isAuthenticated: !!user,
          loading: false,
          error: null,
          lastActivity: Date.now()
        });
        
        if (user) {
          localStorage.setItem("userInfo", JSON.stringify(user));
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
      
      updateUserField: (field, value) => {
        const currentState = get();
        const updatedUser = { ...currentState.user, [field]: value };
        
        set({ user: updatedUser });
        localStorage.setItem("userInfo", JSON.stringify(updatedUser));
      },
      
      logout: () => {
        set({ 
          user: null, 
          isAuthenticated: false,
          loading: false,
          error: null
        });
        
        // Clear localStorage
        localStorage.removeItem("userInfo");
        localStorage.removeItem("user"); // Legacy
        
        // Clear sessionStorage
        sessionStorage.clear();
      },
      
      syncFromStorage: () => {
        const user = getUserFromStorage();
        
        set({ 
          user,
          isAuthenticated: !!user
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
      
      checkSessionValidity: () => {
        const state = get();
        if (!state.lastActivity) return false;
        
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
      
      updateProfile: (updates) => {
        const currentState = get();
        const updatedUser = { ...currentState.user, ...updates };
        
        set({ user: updatedUser });
        localStorage.setItem("userInfo", JSON.stringify(updatedUser));
        
        return updatedUser;
      },
      
      hasPermission: (permission) => {
        const user = get().user;
        if (!user) return false;
        
        if (user.role === 'admin') return true;
        
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
        isAuthenticated: state.isAuthenticated,
        lastActivity: state.lastActivity,
      }),
      version: 2,
    }
  )
);

// Export helper functions
export const getCurrentUser = () => useAuthStore.getState().user;
export const isUserAuthenticated = () => useAuthStore.getState().isAuthenticated;
export const isUserAdmin = () => useAuthStore.getState().isAdmin();
export const isUserEmailVerified = () => useAuthStore.getState().isEmailVerified();

// Activity tracker
export const trackUserActivity = () => {
  const updateLastActivity = useAuthStore.getState().updateLastActivity;
  updateLastActivity();
};

// Set up activity listeners
if (typeof window !== 'undefined') {
  ['click', 'keypress', 'mousemove', 'scroll'].forEach(event => {
    window.addEventListener(event, trackUserActivity, { passive: true });
  });
  
  setInterval(() => {
    useAuthStore.getState().checkSessionValidity();
  }, 60000);
}