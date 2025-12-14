import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const getUserFromStorage = () => {
  try {
    const userInfo = localStorage.getItem("userInfo");
    if (userInfo) return JSON.parse(userInfo);
    
    const user = localStorage.getItem("user");
    if (user) {
      const parsedUser = JSON.parse(user);
      localStorage.setItem("userInfo", JSON.stringify(parsedUser));
      return parsedUser;
    }
    
    return null;
  } catch (error) {
    console.error("Error reading user from localStorage:", error);
    return null;
  }
};

const getTokenFromStorage = () => {
  try {
    return localStorage.getItem("userToken");
  } catch (error) {
    console.error("Error reading token from localStorage:", error);
    return null;
  }
};

const getRefreshTokenFromStorage = () => {
  try {
    return localStorage.getItem("refreshToken");
  } catch (error) {
    console.error("Error reading refresh token from localStorage:", error);
    return null;
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
      
      // Actions
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
      
      // Set authentication (with tokens)
      setAuth: (user, token, refreshToken) => {
        set({ 
          user, 
          token, 
          refreshToken,
          isAuthenticated: !!token,
          loading: false,
          error: null 
        });
        
        // Persist to localStorage
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
      
      // Set only user (useful for role updates)
      setUser: (user) => {
        const currentState = get();
        set({ 
          user: { ...currentState.user, ...user },
          loading: false,
          error: null 
        });
        
        // Update localStorage
        if (user) {
          const currentUser = currentState.user || {};
          const updatedUser = { ...currentUser, ...user };
          localStorage.setItem("userInfo", JSON.stringify(updatedUser));
        }
      },
      
      // Set only tokens
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
      
      // Logout with token blacklisting
      logout: () => {
        set({ 
          user: null, 
          token: null, 
          refreshToken: null,
          isAuthenticated: false,
          loading: false,
          error: null 
        });
        
        // Clear localStorage
        localStorage.removeItem("userInfo");
        localStorage.removeItem("userToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
      },
      
      // Sync from storage
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
      
      // Check if user is seller
      isSeller: () => {
        const user = get().user;
        return user?.role === 'seller';
      },
      
      // Check if user is admin
      isAdmin: () => {
        const user = get().user;
        return user?.role === 'admin';
      },
      
      // Check if email is verified
      isEmailVerified: () => {
        const user = get().user;
        return user?.emailVerified === true;
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);