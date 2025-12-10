import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const getUserFromStorage = () => {
  try {
    const userInfo = localStorage.getItem("userInfo");
    if (userInfo) return JSON.parse(userInfo);
    
    const user = localStorage.getItem("user");
    if (user) {
      const parsedUser = JSON.parse(user);
      localStorage.setItem("userInfo", user);
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

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: getUserFromStorage(),
      token: getTokenFromStorage(),
      isAuthenticated: !!getTokenFromStorage(),
      loading: false,
      error: null,
      
      // Actions
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
      
      // Set both user and token
      setAuth: (user, token) => {
        set({ 
          user, 
          token, 
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
      },
      
      // NEW: Set only user (useful for role updates)
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
      
      // NEW: Set only token
      setToken: (token) => {
        set({ 
          token, 
          isAuthenticated: !!token,
          loading: false,
          error: null 
        });
        
        if (token) {
          localStorage.setItem("userToken", token);
        }
      },
      
      logout: () => {
        set({ 
          user: null, 
          token: null, 
          isAuthenticated: false,
          loading: false,
          error: null 
        });
        
        // Clear localStorage
        localStorage.removeItem("userInfo");
        localStorage.removeItem("userToken");
        localStorage.removeItem("user");
      },
      
      syncFromStorage: () => {
        const user = getUserFromStorage();
        const token = getTokenFromStorage();
        set({ 
          user, 
          token, 
          isAuthenticated: !!token 
        });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);