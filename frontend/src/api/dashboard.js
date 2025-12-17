import api from './axios';

export const dashboardAPI = {
  // Get dashboard statistics
  getDashboardStats: async (timeRange = '7d') => {
    const response = await api.get(`/admin/dashboard/stats?range=${timeRange}`);
    return response.data;
  },

  // Get real-time metrics
  getRealTimeMetrics: async () => {
    const response = await api.get('/admin/dashboard/metrics/realtime');
    return response.data;
  },

  // Get chart data
  getChartData: async (chartType, timeRange) => {
    const response = await api.get(`/admin/dashboard/charts/${chartType}?range=${timeRange}`);
    return response.data;
  },

  // Get activity logs
  getRecentActivities: async (limit = 10) => {
    const response = await api.get(`/admin/dashboard/activities?limit=${limit}`);
    return response.data;
  },

  // Get system health
  getSystemHealth: async () => {
    const response = await api.get('/admin/dashboard/health');
    return response.data;
  }
};