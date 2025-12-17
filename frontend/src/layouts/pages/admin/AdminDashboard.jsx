import { useState, useEffect } from 'react';
import { useAdminDashboard } from '../../../hooks/useAdminDashboard';
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
  FiGlobe
} from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';

const AdminDashboard = () => {
  const { data: dashboardData, isLoading, refetch } = useAdminDashboard();
  const { dashboardStats } = useAdminStore();
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState('');

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

  const stats = [
    {
      title: 'Total Users',
      value: dashboardStats.totalUsers,
      active: dashboardStats.activeUsers,
      icon: <FiUsers className="h-7 w-7" />,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-100',
      change: '+12%',
      changePositive: true,
      link: '/admin/users'
    },
    {
      title: 'Categories',
      value: dashboardStats.totalCategories,
      active: dashboardStats.activeCategories,
      icon: <FiFolder className="h-7 w-7" />,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-100',
      change: '+5%',
      changePositive: true,
      link: '/admin/categories'
    },
    {
      title: 'Services',
      value: dashboardStats.totalServices,
      active: dashboardStats.activeServices,
      icon: <FiBriefcase className="h-7 w-7" />,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-100',
      change: '+8%',
      changePositive: true,
      link: '/admin/services'
    },
    {
      title: 'Gigs',
      value: dashboardStats.totalGigs,
      active: dashboardStats.activeGigs,
      icon: <FiGrid className="h-7 w-7" />,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-100',
      change: '+15%',
      changePositive: true,
      link: '/admin/gigs'
    }
  ];

  // Get recent users from dashboard data if available
  const recentUsers = dashboardData?.recentActivity || [];

  const platformHealth = [
    { label: 'API Response', value: '98ms', status: 'good', icon: <FiActivity className="h-4 w-4" /> },
    { label: 'Database', value: 'Connected', status: 'good', icon: <FiDatabase className="h-4 w-4" /> },
    { label: 'Server Uptime', value: '99.9%', status: 'good', icon: <FiServer className="h-4 w-4" /> },
    { label: 'Memory Usage', value: '64%', status: 'warning', icon: <FiBarChart2 className="h-4 w-4" /> },
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's what's happening with your platform.</p>
        </div>
        <div className="flex items-center space-x-3">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Link
            key={index}
            to={stat.link}
            className={`${stat.bgColor} border ${stat.borderColor} rounded-xl p-6 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 group`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                <div className="flex items-baseline space-x-2">
                  <p className="text-3xl font-bold text-gray-900">{stat.value.toLocaleString()}</p>
                  <span className={`text-sm font-medium ${stat.changePositive ? 'text-green-600' : 'text-red-600'}`}>
                    {stat.changePositive ? <FiArrowUpRight className="inline h-4 w-4" /> : <FiArrowDownRight className="inline h-4 w-4" />}
                    {stat.change}
                  </span>
                </div>
              </div>
              <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} text-white shadow-md`}>
                {stat.icon}
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`bg-gradient-to-r ${stat.color} h-2 rounded-full transition-all duration-500`}
                    style={{ width: `${stat.value > 0 ? Math.round((stat.active / stat.value) * 100) : 0}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-700 min-w-[40px]">
                  {stat.active} active
                </span>
              </div>
              <span className="text-sm text-gray-500 font-medium">
                {stat.value > 0 ? Math.round((stat.active / stat.value) * 100) : 0}%
              </span>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 border-opacity-50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">View details</span>
                <FiArrowUpRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Activity & Platform Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
                <p className="text-sm text-gray-600 mt-1">Latest user registrations and updates</p>
              </div>
              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                  <FiMoreVertical className="h-5 w-5" />
                </button>
              </div>
            </div>

            {recentUsers.length > 0 ? (
              <div className="space-y-4">
                {recentUsers.slice(0, 5).map((user, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center group-hover:from-gray-200 group-hover:to-gray-300 transition-all">
                          {user.picture ? (
                            <img
                              src={user.picture}
                              alt={user.name}
                              className="h-12 w-12 rounded-xl object-cover"
                            />
                          ) : (
                            <FiUsers className="h-6 w-6 text-gray-400" />
                          )}
                        </div>
                        {user.isActive && (
                          <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                            user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                            user.role === 'seller' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {user.role}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">{user.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <FiCalendar className="h-3 w-3" />
                        <span>{new Date(user.joined).toLocaleDateString()}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {user.lastLoginAt ? 'Active recently' : 'Never logged in'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <FiUsers className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No recent activity</h3>
                <p className="text-gray-600">User activity will appear here</p>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Showing {recentUsers.length > 5 ? '5' : recentUsers.length} of {recentUsers.length} activities
                </div>
                <Link
                  to="/admin/users"
                  className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                  View all users
                  <FiArrowUpRight className="ml-1 h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Platform Health */}
        <div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Platform Health</h2>
                <p className="text-sm text-gray-600 mt-1">System status and performance</p>
              </div>
              <div className={`h-2 w-2 rounded-full ${platformHealth.every(p => p.status === 'good') ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
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

            <div className="mt-8 pt-6 border-t border-gray-100">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <Link
                  to="/admin/security"
                  className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-center transition-colors"
                >
                  <FiShield className="h-5 w-5 text-gray-600 mx-auto mb-2" />
                  <span className="text-sm font-medium text-gray-900">Security</span>
                </Link>
                <Link
                  to="/admin/activity"
                  className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-center transition-colors"
                >
                  <FiActivity className="h-5 w-5 text-gray-600 mx-auto mb-2" />
                  <span className="text-sm font-medium text-gray-900">Activity Log</span>
                </Link>
              </div>
            </div>

            <div className="mt-6 p-4 bg-gradient-to-r from-gray-900 to-gray-800 rounded-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-300">System Uptime</p>
                  <p className="text-2xl font-bold mt-1">30 days</p>
                </div>
                <FiServer className="h-8 w-8 text-gray-400" />
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">Reliability</span>
                  <span className="font-medium">99.9%</span>
                </div>
                <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: '99.9%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent System Events */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Recent System Events</h2>
            <p className="text-sm text-gray-600 mt-1">Platform notifications and updates</p>
          </div>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium">
            View All Events
          </button>
        </div>

        <div className="space-y-3">
          {[
            { type: 'info', message: 'Database backup completed successfully', time: '2 hours ago', icon: <FiDatabase /> },
            { type: 'success', message: 'New user registration processed', time: '4 hours ago', icon: <FiUserCheck /> },
            { type: 'warning', message: 'Memory usage above 70% threshold', time: '1 day ago', icon: <FiBarChart2 /> },
            { type: 'info', message: 'Security scan completed - no threats found', time: '2 days ago', icon: <FiShield /> },
          ].map((event, index) => (
            <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${
                  event.type === 'info' ? 'bg-blue-100 text-blue-600' :
                  event.type === 'success' ? 'bg-green-100 text-green-600' :
                  event.type === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {event.icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{event.message}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{event.time}</p>
                </div>
              </div>
              <button className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <FiEye className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;