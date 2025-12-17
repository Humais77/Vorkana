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
    return null;
  }
};

const getTokenFromStorage = () => {
  try {
    return localStorage.getItem("userToken");
  } catch (error) {
    return null;
  }
};

const getRefreshTokenFromStorage = () => {
  try {
    return localStorage.getItem("refreshToken");
  } catch (error) {
    return null;
  }
};

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: getUserFromStorage(),
      token: getTokenFromStorage(),
      refreshToken: getRefreshTokenFromStorage(),
      isAuthenticated: !!getTokenFromStorage(),
      loading: false,
      error: null,
      
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
      
      setAuth: (user, token, refreshToken) => {
        set({ 
          user, 
          token, 
          refreshToken,
          isAuthenticated: !!token,
          loading: false,
          error: null 
        });
        
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
        set({ 
          user: { ...currentState.user, ...user },
          loading: false,
          error: null 
        });
        
        if (user) {
          const currentUser = currentState.user || {};
          const updatedUser = { ...currentUser, ...user };
          localStorage.setItem("userInfo", JSON.stringify(updatedUser));
        }
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
      isAdmin: () => {
    const state = get();
    return state.user?.role === 'admin' || state.user?.isAdmin === true;
  },
      
      logout: () => {
        set({ 
          user: null, 
          token: null, 
          refreshToken: null,
          isAuthenticated: false,
          loading: false,
          error: null 
        });
        
        localStorage.removeItem("userInfo");
        localStorage.removeItem("userToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
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
      
      isAdmin: () => {
        const user = get().user;
        return user?.role === 'admin';
      },
      
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