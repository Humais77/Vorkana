import store  from './store.js'; 
import { fetchCategories } from './slices/categorySlice.js';

export const fetchCategoriesWithRetry = async (maxRetries = 3) => {
    let retries = 0;
    
    while (retries < maxRetries) {
        try {
            const result = await store.dispatch(fetchCategories());
            
            if (fetchCategories.fulfilled.match(result)) {
                return result.payload;
            } else if (fetchCategories.rejected.match(result)) {
                const error = result.payload;
                
                // Don't retry for certain errors
                if (error?.retry === false || retries >= maxRetries - 1) {
                    throw new Error(error?.message || 'Failed to fetch categories');
                }
                
                // Exponential backoff
                const delay = Math.pow(2, retries) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
                retries++;
            }
        } catch (error) {
            if (retries >= maxRetries - 1) throw error;
            retries++;
        }
    }
    
    throw new Error('Max retries reached');
};