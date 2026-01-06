// useAuthStore.js - Updated with missing function and migration
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Storage utilities
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
      // State - only store user info, not tokens
      user: getUserFromStorage(),
      isAuthenticated: false,
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
      
      // Set auth with user info only (tokens in cookies)
      setAuth: (user) => {
        set({ 
          user, 
          isAuthenticated: !!user,
          loading: false,
          error: null,
          lastActivity: Date.now(),
          requiresReauth: false
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
      
      // ADD THIS MISSING FUNCTION
      syncFromStorage: () => {
        try {
          const user = getUserFromStorage();
          set({ 
            user,
            isAuthenticated: !!user
          });
          return user;
        } catch (error) {
          console.error('Error syncing from storage:', error);
          return null;
        }
      },
      
      logout: () => {
        set({ 
          user: null, 
          isAuthenticated: false,
          loading: false,
          error: null,
          requiresReauth: false
        });
        
        // Clear localStorage
        localStorage.removeItem('userInfo');
        localStorage.removeItem('csrfToken');
        
        // Clear sessionStorage
        sessionStorage.clear();
      },
      
      // Session validity check
      checkSessionValidity: () => {
        const state = get();
        if (!state.isAuthenticated || !state.lastActivity) return false;
        
        const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
        const timeSinceLastActivity = Date.now() - state.lastActivity;
        
        if (timeSinceLastActivity > SESSION_TIMEOUT) {
          get().logout();
          return false;
        }
        
        return true;
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
      
      getFullName: () => {
        const user = get().user;
        return user?.name || 'User';
      },
      
      getProfilePicture: () => {
        const user = get().user;
        return user?.picture || null;
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        lastActivity: state.lastActivity,
      }),
      // ADD MIGRATION FUNCTION TO FIX ZUSTAND ERROR
      migrate: (persistedState, version) => {
        console.log('Migrating auth store from version:', version);
        
        // Handle migration from older versions
        if (version === 0) {
          // Migrate from v0 to v1
          const oldState = persistedState;
          return {
            ...oldState,
            // Ensure user structure is correct
            user: oldState.user || null,
            isAuthenticated: !!oldState.user,
          };
        }
        
        if (version === 1) {
          // Migrate from v1 to v2 (cookie-based auth)
          const oldState = persistedState;
          return {
            ...oldState,
            // Remove token fields if they exist
            token: undefined,
            refreshToken: undefined,
          };
        }
        
        return persistedState;
      },
      version: 2, // Increment version for cookie-based auth
    }
  )
);

// Export helper functions
export const getCurrentUser = () => useAuthStore.getState().user;
export const isUserAuthenticated = () => useAuthStore.getState().isAuthenticated;
export const isUserAdmin = () => useAuthStore.getState().isAdmin();
export const isUserEmailVerified = () => useAuthStore.getState().isEmailVerified();