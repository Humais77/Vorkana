import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const initialState = {
    categories: [],
    loading: false,
    error: null,
};

// Fetch categories - FIXED
export const fetchCategories = createAsyncThunk("categories/fetchCategories", async (_, { rejectWithValue }) => {
    try {
        const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/categories`);
        
        // Check if response has success and categories
        if (res.data.success && res.data.categories) {
            return res.data.categories; // Return just the categories array
        } else {
            // Handle unexpected response format
            return rejectWithValue({ message: "Invalid response format from server" });
        }
    } catch (error) {
        // Handle different error structures
        const errorMessage = error.response?.data?.message || error.message || "Failed to fetch categories";
        return rejectWithValue({ message: errorMessage });
    }
});

const categorySlice = createSlice({
    name: "categories",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchCategories.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchCategories.fulfilled, (state, action) => {
                state.loading = false;
                state.categories = action.payload;
            })
            .addCase(fetchCategories.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload?.message || "Unknown error";
            });
    },
});

export default categorySlice.reducer;