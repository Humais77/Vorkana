import { configureStore } from "@reduxjs/toolkit";
import gigReducer from "./slices/gigSlice.js";
import categoryReducer from "./slices/categorySlice.js";
import AuthSlice from "./slices/authSlice.js";

const store = configureStore({
    reducer:{
        auth:AuthSlice,
        gigs: gigReducer,
        categories: categoryReducer,
    },
    devTools:true,
});
export default store;