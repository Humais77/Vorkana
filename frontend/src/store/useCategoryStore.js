// store/useCategoryStore.js
import { create } from 'zustand';

export const useCategoryStore = create((set, get) => ({
  // State
  categories: [],
  popularCategories: [],
  categoriesWithStats: [],
  lastFetched: null,
  popularLastFetched: null,
  statsLastFetched: null,
  selectedCategory: null,
  
  // Actions
  setCategories: (categories) => set({ 
    categories,
    lastFetched: Date.now() 
  }),
  
  setPopularCategories: (popularCategories) => set({ 
    popularCategories,
    popularLastFetched: Date.now() 
  }),
  
  setCategoriesWithStats: (categoriesWithStats) => set({ 
    categoriesWithStats,
    statsLastFetched: Date.now() 
  }),
  
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  
  clearCategories: () => set({ 
    categories: [], 
    lastFetched: null,
    selectedCategory: null 
  }),
  
  clearPopularCategories: () => set({ 
    popularCategories: [], 
    popularLastFetched: null 
  }),
  
  clearAll: () => set({
    categories: [],
    popularCategories: [],
    categoriesWithStats: [],
    lastFetched: null,
    popularLastFetched: null,
    statsLastFetched: null,
    selectedCategory: null,
  }),
  
  // Getters
  getCategoryById: (id) => {
    const { categories } = get();
    return categories.find(cat => cat._id === id);
  },
  
  getCategoryByName: (name) => {
    const { categories } = get();
    return categories.find(cat => cat.name.toLowerCase() === name.toLowerCase());
  },
  
  getCategoryBySlug: (slug) => {
    const { categories } = get();
    return categories.find(cat => cat.slug === slug);
  },
  
  // Check if categories need refresh
  shouldRefresh: () => {
    const { lastFetched } = get();
    return !lastFetched || Date.now() - lastFetched > 5 * 60 * 1000;
  },
  
  shouldRefreshPopular: () => {
    const { popularLastFetched } = get();
    return !popularLastFetched || Date.now() - popularLastFetched > 10 * 60 * 1000;
  },
  
  shouldRefreshStats: () => {
    const { statsLastFetched } = get();
    return !statsLastFetched || Date.now() - statsLastFetched > 30 * 60 * 1000;
  },
}));