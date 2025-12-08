import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const initialState = {
    categories: [],
    loading: false,
    error: null,
    lastFetched: null,
};

const api = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL,
    timeout: 10000, 
    headers: {
        'Content-Type': 'application/json',
    }
});

export const fetchCategories = createAsyncThunk(
    "categories/fetchCategories", 
    async (_, { rejectWithValue, getState }) => {
        try {
            const state = getState();
            const { lastFetched } = state.categories;
            
            if (lastFetched && Date.now() - lastFetched < 5 * 60 * 1000) {
                return state.categories.categories;
            }
            
            const response = await api.get('/api/categories');
            
            if (response.data) {
                if (Array.isArray(response.data)) {
                    return response.data; 
                } else if (response.data.categories && Array.isArray(response.data.categories)) {
                    return response.data.categories; 
                } else if (response.data.data && Array.isArray(response.data.data)) {
                    return response.data.data; 
                } else if (response.data.success && Array.isArray(response.data.data)) {
                    return response.data.data; 
                }
            }
            
            return [];
            
        } catch (error) {
            let errorMessage = "Failed to fetch categories";
            
            if (error.code === 'ECONNABORTED') {
                errorMessage = "Request timeout. Please check your connection.";
            } else if (error.response) {
                const { status, data } = error.response;
                
                switch (status) {
                    case 404:
                        errorMessage = "Categories endpoint not found";
                        break;
                    case 500:
                        errorMessage = "Server error. Please try again later.";
                        break;
                    case 401:
                        errorMessage = "Authentication required";
                        break;
                    case 403:
                        errorMessage = "Access forbidden";
                        break;
                    default:
                        errorMessage = data?.message || `Server error (${status})`;
                }
            } else if (error.request) {
                if (!navigator.onLine) {
                    errorMessage = "No internet connection";
                } else {
                    errorMessage = "No response from server. Please check if backend is running.";
                }
            } else {
                errorMessage = error.message || "Network error";
            }
            
            console.error('Category fetch error:', {
                message: error.message,
                code: error.code,
                response: error.response?.status,
                url: error.config?.url
            });
            
            return rejectWithValue({ 
                message: errorMessage,
                retry: error.response?.status !== 404
            });
        }
    }
);

const categorySlice = createSlice({
    name: "categories",
    initialState,
    reducers: {
        clearCategoryError: (state) => {
            state.error = null;
        },
        setCategories: (state, action) => {
            state.categories = action.payload;
            state.lastFetched = Date.now();
        },
        resetCategories: () => initialState,
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchCategories.pending, (state) => {
                state.loading = true;
                state.error = null; 
            })
            .addCase(fetchCategories.fulfilled, (state, action) => {
                state.loading = false;
                state.categories = action.payload;
                state.lastFetched = Date.now(); 
                state.error = null;
            })
            .addCase(fetchCategories.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload?.message || "Failed to fetch categories";
                
                if (state.categories.length === 0) {
                    state.categories = [];
                }
            });
    },
});

export const { clearCategoryError, setCategories, resetCategories } = categorySlice.actions;
export default categorySlice.reducer;