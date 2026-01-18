import { useState, useEffect } from 'react';
import { useAdminDashboard, useSystemHealth, useRecentActivities } from '../../../hooks/useAdminDashboard';
import { useAdminStore } from '../../../store/useAdminStore';
import { Link } from 'react-router-dom';
import {
  FiUsers,
  FiFolder,
  FiBriefcase,
  FiGrid,
  FiRefreshCw,
  FiActivity,
  FiTrendingUp,
  FiShield,
  FiUserCheck,
  FiClock,
  FiCalendar,
  FiBarChart2,
  FiPackage,
  FiDollarSign,
  FiArrowUpRight,
  FiArrowDownRight,
  FiEye,
  FiMoreVertical,
  FiDatabase,
  FiServer,
  FiGlobe,
  FiLayers,
  FiCheckCircle,
  FiAlertCircle,
  FiStar,
  FiTrendingDown,
  FiTrendingUp as FiTrendingUpIcon,
  FiZap
} from 'react-icons/fi';
import { formatDistanceToNow, format } from 'date-fns';

const AdminDashboard = () => {
  const { data: dashboardData, isLoading, refetch } = useAdminDashboard();
  const { dashboardStats, systemHealth } = useAdminStore();
  const { data: systemHealthData } = useSystemHealth();
  const { data: recentActivitiesData } = useRecentActivities(5);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState('');
  const [timeRange, setTimeRange] = useState('today');

  useEffect(() => {
    if (dashboardStats.lastUpdated) {
      setLastUpdate(formatDistanceToNow(new Date(dashboardStats.lastUpdated), { addSuffix: true }));
    }
  }, [dashboardStats.lastUpdated]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Calculate growth percentages
  const calculateGrowth = (current, previous) => {
    if (!previous || previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  // Get stats for display
  const stats = [
    {
      title: 'Total Users',
      value: dashboardStats.totalUsers || 0,
      active: dashboardStats.activeUsers || 0,
      growth: calculateGrowth(dashboardStats.totalUsers, dashboardStats.totalUsers - dashboardStats.newLast7d),
      icon: <FiUsers className="h-7 w-7" />,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-100',
      link: '/admin/users',
      details: {
        verified: dashboardStats.verifiedUsers || 0,
        pending: dashboardStats.pendingUsers || 0,
        new: dashboardStats.newLast7d || 0
      }
    },
    {
      title: 'Categories',
      value: dashboardStats.totalCategories || 0,
      active: dashboardStats.activeCategories || 0,
      growth: 0, // Would need historical data
      icon: <FiFolder className="h-7 w-7" />,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-100',
      link: '/admin/categories',
      details: {
        featured: dashboardStats.featuredCategories || 0,
        popular: dashboardStats.popularCategories || 0
      }
    },
    {
      title: 'Subcategories',
      value: dashboardStats.totalSubcategories || 0,
      active: dashboardStats.activeSubcategories || 0,
      growth: 0, // Would need historical data
      icon: <FiLayers className="h-7 w-7" />,
      color: 'from-teal-500 to-teal-600',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-100',
      link: '/admin/subcategories',
      details: {
        activePercentage: dashboardStats.totalSubcategories > 0 
          ? Math.round((dashboardStats.activeSubcategories / dashboardStats.totalSubcategories) * 100)
          : 0
      }
    },
    {
      title: 'Services',
      value: dashboardStats.totalServices || 0,
      active: dashboardStats.activeServices || 0,
      growth: 0, // Would need historical data
      icon: <FiBriefcase className="h-7 w-7" />,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-100',
      link: '/admin/services',
      details: {
        featured: dashboardStats.featuredServices || 0,
        recommended: dashboardStats.recommendedServices || 0,
        draft: dashboardStats.draftServices || 0,
        suspended: dashboardStats.suspendedServices || 0
      }
    },
    {
      title: 'Gigs',
      value: dashboardStats.totalGigs || 0,
      active: dashboardStats.openGigs || 0, // Using open gigs as "active"
      growth: 0, // Would need historical data
      icon: <FiGrid className="h-7 w-7" />,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-100',
      link: '/admin/gigs',
      details: {
        inProgress: dashboardStats.inProgressGigs || 0,
        completed: dashboardStats.completedGigs || 0,
        assigned: dashboardStats.assignedGigs || 0
      }
    }
  ];

  // Get recent users from activities
  const recentUsers = recentActivitiesData?.data || [];
  
  // Get system health status
  const systemStatus = systemHealthData?.data?.status || systemHealth.status || 'unknown';
  
  const platformHealth = [
    { 
      label: 'API Response', 
      value: systemHealthData?.data?.responseTime || systemHealth.responseTime || '0ms', 
      status: systemStatus === 'healthy' ? 'good' : systemStatus === 'unhealthy' ? 'error' : 'warning', 
      icon: <FiActivity className="h-4 w-4" /> 
    },
    { 
      label: 'Database', 
      value: systemHealthData?.data?.database === 'connected' ? 'Connected' : systemHealth.database === 'connected' ? 'Connected' : 'Disconnected', 
      status: (systemHealthData?.data?.database === 'connected' || systemHealth.database === 'connected') ? 'good' : 'error', 
      icon: <FiDatabase className="h-4 w-4" /> 
    },
    { 
      label: 'Server Uptime', 
      value: systemHealthData?.data?.uptime ? `${Math.floor(systemHealthData.data.uptime / 3600)}h` : systemHealth.uptime ? `${Math.floor(systemHealth.uptime / 3600)}h` : '0h', 
      status: 'good', 
      icon: <FiServer className="h-4 w-4" /> 
    },
    { 
      label: 'Memory Usage', 
      value: systemHealthData?.data?.memory?.heapUsed || systemHealth.memory?.heapUsed || '0 MB', 
      status: 'good', 
      icon: <FiBarChart2 className="h-4 w-4" /> 
    },
  ];

  // Performance metrics
  const performanceMetrics = [
    {
      label: 'Service Rating',
      value: dashboardStats.avgServiceRatingPlatform ? `${dashboardStats.avgServiceRatingPlatform.toFixed(1)}/5` : '0/5',
      icon: <FiStar className="h-4 w-4 text-yellow-500" />,
      change: 'Stable'
    },
    {
      label: 'Conversion Rate',
      value: `${dashboardStats.conversionRate || 0}%`,
      icon: <FiTrendingUpIcon className="h-4 w-4 text-green-500" />,
      change: dashboardStats.conversionRate > 50 ? 'Good' : 'Needs improvement'
    },
    {
      label: 'Active Users',
      value: `${dashboardStats.activeUsers30d || 0} (30d)`,
      icon: <FiUserCheck className="h-4 w-4 text-blue-500" />,
      change: 'Growing'
    },
    {
      label: 'Response Time',
      value: systemHealth.responseTime || '0ms',
      icon: <FiZap className="h-4 w-4 text-purple-500" />,
      change: 'Fast'
    }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's what's happening with your platform.</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="hidden md:flex items-center space-x-2">
            <div className={`h-2 w-2 rounded-full ${
              systemStatus === 'healthy' ? 'bg-green-500' : 
              systemStatus === 'unhealthy' ? 'bg-red-500' : 
              'bg-yellow-500'
            }`}></div>
            <span className="text-sm text-gray-500">
              System: {systemStatus}
            </span>
          </div>
          <div className="text-sm text-gray-500 hidden md:block">
            Last updated {lastUpdate}
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 shadow-sm"
          >
            <FiRefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
  {stats.map((stat, index) => (
    <Link
      key={index}
      to={stat.link}
      className={`${stat.bgColor} border ${stat.borderColor} rounded-xl p-5 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 group flex flex-col h-full`}
    >
      {/* Card Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-600 mb-1 truncate">{stat.title}</p>
          <div className="flex items-baseline space-x-2">
            <p className="text-2xl font-bold text-gray-900 truncate">{stat.value.toLocaleString()}</p>
            {stat.growth !== 0 && (
              <span className={`text-sm font-medium whitespace-nowrap ${stat.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stat.growth > 0 ? <FiArrowUpRight className="inline h-4 w-4" /> : <FiArrowDownRight className="inline h-4 w-4" />}
                {Math.abs(stat.growth)}%
              </span>
            )}
          </div>
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} text-white shadow-md flex-shrink-0 ml-3`}>
          {stat.icon}
        </div>
      </div>
      
      {/* Active/Total Bar - Fixed Alignment */}
      <div className="mt-4 mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">
            {stat.active} active
          </span>
          <span className="text-sm text-gray-500 font-medium">
            {stat.value > 0 ? Math.round((stat.active / stat.value) * 100) : 0}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`bg-gradient-to-r ${stat.color} h-2 rounded-full transition-all duration-500`}
            style={{ width: `${stat.value > 0 ? Math.round((stat.active / stat.value) * 100) : 0}%` }}
          ></div>
        </div>
      </div>
      
      {/* Additional Details - Improved Grid Layout */}
      {stat.details && (
        <div className="mt-3 pt-3 border-t border-gray-200 border-opacity-50 flex-1">
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(stat.details).map(([key, value]) => (
              <div key={key} className="text-xs truncate">
                <span className="text-gray-500 capitalize truncate block">{key}: </span>
                <span className="font-medium text-gray-700 truncate block">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* View Details Link - Aligned to bottom */}
      <div className="mt-4 pt-4 border-t border-gray-200 border-opacity-50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 truncate">View details</span>
          <FiArrowUpRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-transform flex-shrink-0" />
        </div>
      </div>
    </Link>
  ))}
</div>

      {/* Recent Activity & Platform Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
                <p className="text-sm text-gray-600 mt-1">Latest platform activities</p>
              </div>
              <div className="flex items-center space-x-2">
                <Link
                  to="/admin/activity"
                  className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  View All
                </Link>
              </div>
            </div>

            {recentUsers.length > 0 ? (
              <div className="space-y-4">
                {recentUsers.slice(0, 5).map((activity, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                          activity.type === 'USER' ? 'bg-blue-100 text-blue-600' :
                          activity.type === 'SERVICE' ? 'bg-purple-100 text-purple-600' :
                          activity.type === 'GIG' ? 'bg-orange-100 text-orange-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {activity.type === 'USER' && <FiUsers className="h-6 w-6" />}
                          {activity.type === 'SERVICE' && <FiBriefcase className="h-6 w-6" />}
                          {activity.type === 'GIG' && <FiGrid className="h-6 w-6" />}
                        </div>
                        {activity.status === 'active' && (
                          <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-gray-900">{activity.title}</p>
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                            activity.type === 'USER' ? 'bg-blue-100 text-blue-800' :
                            activity.type === 'SERVICE' ? 'bg-purple-100 text-purple-800' :
                            'bg-orange-100 text-orange-800'
                          }`}>
                            {activity.type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">{activity.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">
                        {activity.timestamp ? formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true }) : 'Recently'}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {activity.isoTimestamp ? format(new Date(activity.isoTimestamp), 'MMM d, h:mm a') : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <FiActivity className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No recent activity</h3>
                <p className="text-gray-600">Activity will appear here as users interact with the platform</p>
              </div>
            )}

            <div className="mt-6 pt-5 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Showing {Math.min(5, recentUsers.length)} of {recentUsers.length} activities
                </div>
                <Link
                  to="/admin/activity"
                  className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                  View activity log
                  <FiArrowUpRight className="ml-1 h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Platform Health & Performance */}
        <div className="space-y-6">
          {/* Platform Health */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Platform Health</h2>
                <p className="text-sm text-gray-600 mt-1">System status and performance</p>
              </div>
              <div className={`h-2 w-2 rounded-full ${systemStatus === 'healthy' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
            </div>

            <div className="space-y-4">
              {platformHealth.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      item.status === 'good' ? 'bg-green-100 text-green-600' :
                      item.status === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.label}</p>
                      <p className={`text-xs ${
                        item.status === 'good' ? 'text-green-600' :
                        item.status === 'warning' ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {item.status === 'good' ? 'Optimal' : item.status === 'warning' ? 'Warning' : 'Critical'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{item.value}</p>
                    <p className="text-xs text-gray-400">Current</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Performance</h2>
                <p className="text-sm text-gray-600 mt-1">Key platform metrics</p>
              </div>
              <FiBarChart2 className="h-5 w-5 text-gray-400" />
            </div>

            <div className="space-y-4">
              {performanceMetrics.map((metric, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-gray-100">
                      {metric.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{metric.label}</p>
                      <p className="text-xs text-gray-500">{metric.change}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{metric.value}</p>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Additional Stats */}
            <div className="mt-6 pt-5 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Content Distribution</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                    <span className="text-sm text-gray-600">Users</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {dashboardStats.totalUsers || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="h-3 w-3 rounded-full bg-green-500"></div>
                    <span className="text-sm text-gray-600">Categories</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {dashboardStats.totalCategories || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="h-3 w-3 rounded-full bg-teal-500"></div>
                    <span className="text-sm text-gray-600">Subcategories</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {dashboardStats.totalSubcategories || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;