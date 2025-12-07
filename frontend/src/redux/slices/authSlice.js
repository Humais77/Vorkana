import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

// Get user from localStorage if exists - check both possible keys
const getUserFromStorage = () => {
  try {
    // Check for userInfo (from traditional login/register)
    const userInfo = localStorage.getItem("userInfo");
    if (userInfo) {
      return JSON.parse(userInfo);
    }
    
    // Check for user (from OAuth)
    const user = localStorage.getItem("user");
    if (user) {
      const parsedUser = JSON.parse(user);
      // Also store in userInfo for consistency
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

const initialState = {
  user: getUserFromStorage(),
  token: getTokenFromStorage(),
  isAuthenticated: !!getTokenFromStorage(),
  loading: false,
  error: null,
};

// Login user
export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async (userData, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/auth/login`,
        userData
      );
      localStorage.setItem("userInfo", JSON.stringify(response.data.user));
      localStorage.setItem("userToken", response.data.token);
      return { user: response.data.user, token: response.data.token };
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: "Login failed" });
    }
  }
);

// Register user
export const registerUser = createAsyncThunk(
  "auth/registerUser",
  async (userData, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/auth/register`,
        userData
      );
      localStorage.setItem("userInfo", JSON.stringify(response.data.user));
      localStorage.setItem("userToken", response.data.token);
      return { user: response.data.user, token: response.data.token };
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: "Registration failed" });
    }
  }
);

// Sync OAuth data
export const syncOAuthData = createAsyncThunk(
  "auth/syncOAuthData",
  async (_, { rejectWithValue }) => {
    try {
      const token = getTokenFromStorage();
      const user = getUserFromStorage();
      
      if (!token || !user) {
        return rejectWithValue("No OAuth data found in storage");
      }
      
      return { user, token };
    } catch (error) {
      return rejectWithValue("Failed to sync OAuth data");
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem("userInfo");
      localStorage.removeItem("userToken");
      localStorage.removeItem("user"); // Also remove OAuth key
    },
    clearError: (state) => {
      state.error = null;
    },
    setAuthState: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = !!action.payload.token;
    },
    syncFromLocalStorage: (state) => {
      const token = getTokenFromStorage();
      const user = getUserFromStorage();
      state.user = user;
      state.token = token;
      state.isAuthenticated = !!token;
    }
  },
  extraReducers: (builder) => {
    builder
      // Login cases
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Login failed";
      })
      // Register cases
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Registration failed";
      })
      // Sync OAuth data
      .addCase(syncOAuthData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(syncOAuthData.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(syncOAuthData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { logout, clearError, setAuthState, syncFromLocalStorage } = authSlice.actions;
export default authSlice.reducer;