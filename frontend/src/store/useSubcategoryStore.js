// store/useSubcategoryStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSubcategoryStore = create(
  persist(
    (set, get) => ({
      // State
      subcategories: [],
      subcategoriesByCategory: {}, // { [categoryId]: subcategories[] }
      selectedSubcategory: null,
      lastFetched: null,
      
      // Actions
      setSubcategories: (subcategories) => set({ 
        subcategories,
        lastFetched: Date.now() 
      }),
      
      setSubcategoriesByCategory: (categoryId, subcategories) => 
        set((state) => ({
          subcategoriesByCategory: {
            ...state.subcategoriesByCategory,
            [categoryId]: subcategories
          }
        })),
      
      addSubcategory: (subcategory) => 
        set((state) => {
          // Add to main list
          const newSubcategories = [...state.subcategories];
          const existingIndex = newSubcategories.findIndex(sc => sc._id === subcategory._id);
          
          if (existingIndex >= 0) {
            newSubcategories[existingIndex] = subcategory;
          } else {
            newSubcategories.push(subcategory);
          }
          
          // Add to category-specific list
          const updatedByCategory = { ...state.subcategoriesByCategory };
          if (subcategory.category) {
            if (!updatedByCategory[subcategory.category]) {
              updatedByCategory[subcategory.category] = [];
            }
            const categoryIndex = updatedByCategory[subcategory.category]
              .findIndex(sc => sc._id === subcategory._id);
            
            if (categoryIndex >= 0) {
              updatedByCategory[subcategory.category][categoryIndex] = subcategory;
            } else {
              updatedByCategory[subcategory.category].push(subcategory);
            }
          }
          
          return {
            subcategories: newSubcategories,
            subcategoriesByCategory: updatedByCategory,
            lastFetched: Date.now()
          };
        }),
      
      updateSubcategory: (id, updates) => 
        set((state) => {
          // Update in main list
          const newSubcategories = state.subcategories.map(sc =>
            sc._id === id ? { ...sc, ...updates, updatedAt: new Date().toISOString() } : sc
          );
          
          // Update in category-specific lists
          const updatedByCategory = { ...state.subcategoriesByCategory };
          for (const categoryId in updatedByCategory) {
            updatedByCategory[categoryId] = updatedByCategory[categoryId].map(sc =>
              sc._id === id ? { ...sc, ...updates } : sc
            );
          }
          
          return {
            subcategories: newSubcategories,
            subcategoriesByCategory: updatedByCategory
          };
        }),
      
      removeSubcategory: (id) => 
        set((state) => {
          // Remove from main list
          const newSubcategories = state.subcategories.filter(sc => sc._id !== id);
          
          // Remove from category-specific lists
          const updatedByCategory = { ...state.subcategoriesByCategory };
          for (const categoryId in updatedByCategory) {
            updatedByCategory[categoryId] = updatedByCategory[categoryId].filter(sc => sc._id !== id);
          }
          
          // Clear selection if it's the selected one
          const newSelected = state.selectedSubcategory?._id === id ? null : state.selectedSubcategory;
          
          return {
            subcategories: newSubcategories,
            subcategoriesByCategory: updatedByCategory,
            selectedSubcategory: newSelected
          };
        }),
      
      setSelectedSubcategory: (subcategory) => set({ selectedSubcategory: subcategory }),
      
      clearSubcategories: () => set({ 
        subcategories: [], 
        subcategoriesByCategory: {},
        lastFetched: null 
      }),
      
      clearByCategory: (categoryId) => 
        set((state) => {
          const updatedByCategory = { ...state.subcategoriesByCategory };
          delete updatedByCategory[categoryId];
          
          // Also remove from main list
          const newSubcategories = state.subcategories.filter(
            sc => sc.category !== categoryId
          );
          
          return {
            subcategories: newSubcategories,
            subcategoriesByCategory: updatedByCategory
          };
        }),
      
      clearAll: () => set({
        subcategories: [],
        subcategoriesByCategory: {},
        selectedSubcategory: null,
        lastFetched: null,
      }),
      
      // Getters
      getSubcategoryById: (id) => {
        const { subcategories } = get();
        return subcategories.find(sc => sc._id === id);
      },
      
      getSubcategoriesByCategory: (categoryId) => {
        const { subcategoriesByCategory } = get();
        return {
          subcategories: subcategoriesByCategory[categoryId] || [],
          count: subcategoriesByCategory[categoryId]?.length || 0
        };
      },
      
      getSubcategoryByName: (name, categoryId = null) => {
        const { subcategories } = get();
        let filtered = subcategories;
        
        if (categoryId) {
          filtered = filtered.filter(sc => sc.category === categoryId);
        }
        
        return filtered.find(sc => sc.name.toLowerCase() === name.toLowerCase());
      },
      
      getSubcategoryBySlug: (slug, categoryId = null) => {
        const { subcategories } = get();
        let filtered = subcategories;
        
        if (categoryId) {
          filtered = filtered.filter(sc => sc.category === categoryId);
        }
        
        return filtered.find(sc => sc.slug === slug);
      },
      
      // Check if data needs refresh
      shouldRefresh: () => {
        const { lastFetched } = get();
        return !lastFetched || Date.now() - lastFetched > 10 * 60 * 1000;
      },
      
      shouldRefreshCategory: (categoryId) => {
        const { subcategoriesByCategory } = get();
        const categoryData = subcategoriesByCategory[categoryId];
        return !categoryData || categoryData.length === 0;
      },
    }),
    {
      name: 'subcategory-storage',
      partialize: (state) => ({
        subcategories: state.subcategories,
        subcategoriesByCategory: state.subcategoriesByCategory,
        lastFetched: state.lastFetched
      }),
      // Only persist in localStorage (not sessionStorage)
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          return str ? JSON.parse(str) : null;
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);