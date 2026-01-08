// useAdminStore.js - Add setServices function
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAdminStore = create(
  persist(
    (set, get) => ({
      // Simplified Dashboard State
      dashboardStats: {
        totalUsers: 0,
        totalCategories: 0,
        totalSubcategories: 0,
        totalServices: 0,
        totalGigs: 0,
        activeUsers: 0,
        activeCategories: 0,
        activeSubcategories: 0, 
        activeServices: 0,
        activeGigs: 0,
        lastUpdated: null
      },
      systemHealth: {
        status: 'unknown',
        timestamp: null,
        uptime: 0,
        database: 'unknown',
        responseTime: '0ms'
      },
       categoryStats: null,
      subcategoryStats: null,
      serviceStats: null,
      gigStats: null,
      
      // Users State
      users: [],
      usersPagination: null,
      usersLastFetched: null,
      usersFilters: {},
      
      // Categories State
      categories: [],
      categoriesPagination: null,
      categoriesLastFetched: null,
      categoriesFilters: {},
      // Subcategories State
      subcategories: [],
      subcategoriesPagination: null,
      subcategoriesLastFetched: null,
      subcategoriesFilters: {},
      
      selectedSubcategory: null,
      // Services State - ADD THIS SECTION
      services: [],
      servicesPagination: null,
      servicesLastFetched: null,
      servicesFilters: {},
      
      // UI State
      selectedUser: null,
      selectedCategory: null,
      selectedService: null, // Add this
      selectedTab: 'dashboard',
      sidebarOpen: true,
      theme: 'light',
      
      // Notifications
      notifications: [],
      
      // Actions
      setDashboardStats: (stats) => set({ 
        dashboardStats: {
          ...get().dashboardStats,
          ...stats,
          lastUpdated: new Date().toISOString()
        }
      }),
      
      setUsers: (data) => {
        const users = Array.isArray(data) ? data : data?.data || [];
        const pagination = data?.pagination || null;
        set({ 
          users, 
          usersPagination: pagination,
          usersLastFetched: Date.now() 
        });
      },
      
      setCategories: (data) => {
        const categories = Array.isArray(data) ? data : data?.data || [];
        const pagination = data?.pagination || null;
        set({ 
          categories, 
          categoriesPagination: pagination,
          categoriesLastFetched: Date.now() 
        });
      },
      setServices: (data) => {
  const services = Array.isArray(data) ? data : data?.data || [];
  const pagination = data?.pagination || null;
  set({ 
    services, 
    servicesPagination: pagination,
    servicesLastFetched: Date.now() 
  });
},
      
      setSelectedUser: (user) => set({ selectedUser: user }),
      setSelectedCategory: (category) => set({ selectedCategory: category }),
      setSelectedService: (service) => set({ selectedService: service }), // Add this
      setSelectedTab: (tab) => set({ selectedTab: tab }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setTheme: (theme) => set({ theme }),
      
      setUsersFilters: (filters) => set({ 
        usersFilters: { ...get().usersFilters, ...filters }
      }),
      
      setCategoriesFilters: (filters) => set({ 
        categoriesFilters: { ...get().categoriesFilters, ...filters }
      }),
      
      // Add services filters
      setServicesFilters: (filters) => set({ 
        servicesFilters: { ...get().servicesFilters, ...filters }
      }),
      
      // Notifications
      addNotification: (notification) => {
        const notifications = get().notifications;
        set({
          notifications: [
            {
              id: Date.now(),
              title: notification.title || 'Notification',
              message: notification.message || '',
              type: notification.type || 'info',
              read: false,
              time: new Date().toLocaleTimeString()
            },
            ...notifications.slice(0, 49)
          ]
        });
      },
      
      markNotificationRead: (id) => {
        const notifications = get().notifications;
        set({
          notifications: notifications.map(notif =>
            notif.id === id ? { ...notif, read: true } : notif
          )
        });
      },
      
      clearNotifications: () => set({ notifications: [] }),
      
      // Helper methods
      getUserById: (id) => {
        const users = get().users;
        return users.find(user => user._id === id);
      },
      
      getCategoryById: (id) => {
        const categories = get().categories;
        return categories.find(category => category._id === id);
      },
      
      getServiceById: (id) => { // Add this
        const services = get().services;
        return services.find(service => service._id === id);
      },
      
      shouldRefreshDashboard: () => {
        const { dashboardStats } = get();
        return !dashboardStats.lastUpdated || 
               Date.now() - new Date(dashboardStats.lastUpdated).getTime() > 60000;
      },
      
      shouldRefreshUsers: () => {
        const { usersLastFetched } = get();
        return !usersLastFetched || Date.now() - usersLastFetched > 120000;
      },
      
      shouldRefreshCategories: () => {
        const { categoriesLastFetched } = get();
        return !categoriesLastFetched || Date.now() - categoriesLastFetched > 120000;
      },
      
      shouldRefreshServices: () => { // Add this
        const { servicesLastFetched } = get();
        return !servicesLastFetched || Date.now() - servicesLastFetched > 120000;
      },
       // Subcategory Actions
      setSubcategories: (data) => {
        const subcategories = Array.isArray(data) ? data : data?.data || [];
        const pagination = data?.pagination || null;
        set({ 
          subcategories, 
          subcategoriesPagination: pagination,
          subcategoriesLastFetched: Date.now() 
        });
      },
      
      setSelectedSubcategory: (subcategory) => set({ selectedSubcategory: subcategory }),
      
      setSubcategoriesFilters: (filters) => set({ 
        subcategoriesFilters: { ...get().subcategoriesFilters, ...filters }
      }),
      setGigs: (data) => {
        const gigs = Array.isArray(data) ? data : data?.data || [];
        const pagination = data?.pagination || null;
        set({ 
          gigs, 
          gigsPagination: pagination,
          gigsLastFetched: Date.now() 
        });
      },
      setSelectedGig: (gig) => set({ selectedGig: gig }),
      
      setGigsFilters: (filters) => set({ 
        gigsFilters: { ...get().gigsFilters, ...filters }
      }),
      
      
      setSelectedService: (service) => set({ selectedService: service }),
      
      setServicesFilters: (filters) => set({ 
        servicesFilters: { ...get().servicesFilters, ...filters }
      }),
       
      setSystemHealth: (health) => set({ systemHealth: health }),
      
      setCategoryStats: (stats) => set({ categoryStats: stats }),
      
      setSubcategoryStats: (stats) => set({ subcategoryStats: stats }),
      
      setServiceStats: (stats) => set({ serviceStats: stats }),
      
      setGigStats: (stats) => set({ gigStats: stats }),
      
      getSubcategoryById: (id) => {
        const subcategories = get().subcategories;
        return subcategories.find(subcategory => subcategory._id === id);
      },
      
      shouldRefreshSubcategories: () => {
        const { subcategoriesLastFetched } = get();
        return !subcategoriesLastFetched || Date.now() - subcategoriesLastFetched > 120000;
      },
      
      // Clear methods
      clearSelected: () => set({ 
        selectedUser: null, 
        selectedCategory: null,
        selectedService: null
      }),
      
      clearAll: () => set({
        dashboardStats: {
          totalUsers: 0,
          totalCategories: 0,
          totalSubcategories: 0,
          totalServices: 0,
          totalGigs: 0,
          activeUsers: 0,
          activeCategories: 0,
          activeSubcategories: 0,
          activeServices: 0,
          activeGigs: 0,
          lastUpdated: null
        },
        users: [],
        usersPagination: null,
        usersLastFetched: null,
        usersFilters: {},
        categories: [],
        categoriesPagination: null,
        categoriesLastFetched: null,
        categoriesFilters: {},
        subcategories: [],
        subcategoriesPagination: null,
        subcategoriesLastFetched: null,
        subcategoriesFilters: {},
        gigs: [],
        gigsPagination: null,
        gigsLastFetched: null,
        gigsFilters: {},
        services: [],
        servicesPagination: null,
        servicesLastFetched: null,
        servicesFilters: {},
        systemHealth: {
          status: 'unknown',
          timestamp: null,
          uptime: 0,
          database: 'unknown',
          responseTime: '0ms'
        },
        categoryStats: null,
        subcategoryStats: null,
        serviceStats: null,
        gigStats: null,
        selectedUser: null,
        selectedCategory: null,
        selectedSubcategory: null,
        selectedService: null,
        selectedGig: null,
        selectedTab: 'dashboard',
        sidebarOpen: true,
        theme: 'light',
        notifications: []
      })
    }),
    {
      name: 'admin-store',
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        selectedTab: state.selectedTab,
        theme: state.theme
      }),
    }
  )
);