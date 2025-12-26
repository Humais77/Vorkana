// store/useCategoryStore.js (Updated)
import { create } from 'zustand';

export const useCategoryStore = create((set, get) => ({
  // State
  categories: [],
  popularCategories: [],
  categoriesWithStats: [],
  categoriesWithSubcategories: [], // NEW: For dropdowns
  lastFetched: null,
  popularLastFetched: null,
  statsLastFetched: null,
  withSubcategoriesLastFetched: null,
  selectedCategory: null,
  
  // Actions
  setCategories: (categories) => set({ 
    categories,
    lastFetched: Date.now() 
  }),
  
  setCategoriesWithSubcategories: (categoriesWithSubcategories) => set({ 
    categoriesWithSubcategories,
    withSubcategoriesLastFetched: Date.now() 
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
  
  clearAll: () => set({
    categories: [],
    popularCategories: [],
    categoriesWithStats: [],
    categoriesWithSubcategories: [],
    lastFetched: null,
    popularLastFetched: null,
    statsLastFetched: null,
    withSubcategoriesLastFetched: null,
    selectedCategory: null,
  }),
  
  // Getters
  getCategoryById: (id) => {
    const { categories } = get();
    return categories.find(cat => cat._id === id);
  },
  
  getCategoryWithSubcategories: (id) => {
    const { categoriesWithSubcategories } = get();
    return categoriesWithSubcategories.find(cat => cat._id === id);
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
  
  shouldRefreshWithSubcategories: () => {
    const { withSubcategoriesLastFetched } = get();
    return !withSubcategoriesLastFetched || Date.now() - withSubcategoriesLastFetched > 15 * 60 * 1000;
  },
}));