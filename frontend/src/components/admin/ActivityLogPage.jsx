import { useState, useEffect } from 'react';
import { adminAPI } from '../../api/admin.js';
import { useAdminStore } from '../../store/useAdminStore';
import { toast } from 'react-hot-toast';
import {
  FiActivity,
  FiUser,
  FiClock,
  FiSearch,
  FiFilter,
  FiCalendar,
  FiDownload,
  FiRefreshCw,
  FiEye,
  FiFileText,
  FiDatabase,
  FiServer,
  FiGlobe,
  FiChevronLeft,
  FiChevronRight,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle
} from 'react-icons/fi';

const ActivityLogPage = () => {
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    userType: '',
    actionType: '',
    dateRange: 'today',
    search: '',
    page: 1,
    limit: 20
  });
  const [stats, setStats] = useState({
    totalLogs: 0,
    userActions: 0,
    systemActions: 0,
    adminActions: 0
  });
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const { addActivityLog } = useAdminStore();

  const fetchActivityLogs = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getActivityLogs(filters);
      if (response.data.success) {
        setActivityLogs(response.data.data);
        setStats(response.data.stats || {
          totalLogs: response.data.data.length,
          userActions: response.data.data.filter(log => log.userType === 'user').length,
          systemActions: response.data.data.filter(log => log.userType === 'system').length,
          adminActions: response.data.data.filter(log => log.userType === 'admin').length
        });
      }
    } catch (error) {
      console.error('Failed to fetch activity logs:', error);
      toast.error('Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchActivityLogs();
    toast.success('Activity logs refreshed');
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const getActionIcon = (action) => {
    if (action.includes('CREATE')) return <FiFileText className="h-4 w-4 text-green-600" />;
    if (action.includes('UPDATE')) return <FiRefreshCw className="h-4 w-4 text-blue-600" />;
    if (action.includes('DELETE')) return <FiXCircle className="h-4 w-4 text-red-600" />;
    if (action.includes('LOGIN')) return <FiUser className="h-4 w-4 text-indigo-600" />;
    if (action.includes('ERROR')) return <FiAlertCircle className="h-4 w-4 text-yellow-600" />;
    return <FiActivity className="h-4 w-4 text-gray-600" />;
  };

  const getUserTypeColor = (userType) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-800',
      user: 'bg-blue-100 text-blue-800',
      system: 'bg-gray-100 text-gray-800'
    };
    return colors[userType] || colors.system;
  };

  const getActionTypeColor = (actionType) => {
    const colors = {
      create: 'bg-green-100 text-green-800',
      update: 'bg-blue-100 text-blue-800',
      delete: 'bg-red-100 text-red-800',
      read: 'bg-gray-100 text-gray-800',
      security: 'bg-yellow-100 text-yellow-800'
    };
    return colors[actionType] || colors.read;
  };

  useEffect(() => {
    fetchActivityLogs();
    // Refresh every 60 seconds
    const interval = setInterval(fetchActivityLogs, 60000);
    return () => clearInterval(interval);
  }, [filters]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>
          <p className="text-gray-600">View system logs and user activities</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
          >
            <FiRefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2">
            <FiDownload className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Logs</p>
              <p className="text-3xl font-bold mt-1">{stats.totalLogs}</p>
            </div>
            <div className="p-3 bg-indigo-100 rounded-lg">
              <FiDatabase className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            <span className="text-green-600 font-medium">↑ 12%</span> from yesterday
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">User Actions</p>
              <p className="text-3xl font-bold mt-1">{stats.userActions}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <FiUser className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            Most active: User #1234
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Admin Actions</p>
              <p className="text-3xl font-bold mt-1">{stats.adminActions}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <FiServer className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            Last admin: System Admin
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">System Actions</p>
              <p className="text-3xl font-bold mt-1">{stats.systemActions}</p>
            </div>
            <div className="p-3 bg-gray-100 rounded-lg">
              <FiActivity className="h-6 w-6 text-gray-600" />
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            Automated processes
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
          <div className="flex-1 md:mr-4">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search activity logs..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <select
              value={filters.userType}
              onChange={(e) => handleFilterChange('userType', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">All Users</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
              <option value="system">System</option>
            </select>
            
            <select
              value={filters.actionType}
              onChange={(e) => handleFilterChange('actionType', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="read">Read</option>
              <option value="security">Security</option>
            </select>
            
            <select
              value={filters.dateRange}
              onChange={(e) => handleFilterChange('dateRange', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
              <option value="all">All Time</option>
            </select>
            
            <button className="px-4 py-2 border border-gray-300 rounded-lg flex items-center space-x-2 hover:bg-gray-50 text-sm">
              <FiFilter className="h-4 w-4" />
              <span>Advanced</span>
            </button>
          </div>
        </div>
      </div>

      {/* Activity Logs Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  </td>
                </tr>
              ) : activityLogs.length > 0 ? (
                activityLogs.map((log, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                          {log.userType === 'admin' ? (
                            <FiServer className="h-4 w-4 text-purple-600" />
                          ) : log.userType === 'system' ? (
                            <FiActivity className="h-4 w-4 text-gray-600" />
                          ) : (
                            <FiUser className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{log.userName || log.userType}</p>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${getUserTypeColor(log.userType)}`}>
                            {log.userType}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getActionIcon(log.action)}
                        <div>
                          <p className="text-sm font-medium text-gray-900">{log.action}</p>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${getActionTypeColor(log.actionType)}`}>
                            {log.actionType}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        <p className="text-sm text-gray-900 truncate">{log.details}</p>
                        <p className="text-xs text-gray-500">Resource: {log.resource}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1">
                        <FiGlobe className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-mono text-gray-600">{log.ip || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <FiClock className="h-4 w-4" />
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(log.timestamp).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.status === 'success' ? (
                        <div className="flex items-center text-green-600">
                          <FiCheckCircle className="h-4 w-4 mr-1" />
                          <span className="text-sm">Success</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-red-600">
                          <FiXCircle className="h-4 w-4 mr-1" />
                          <span className="text-sm">Failed</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedLog(log);
                          setShowDetailsModal(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <FiEye className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center">
                    <FiActivity className="h-12 w-12 text-gray-400 mx-auto" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No activity logs</h3>
                    <p className="mt-2 text-gray-500">No activity recorded for the selected filters</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {activityLogs.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{(filters.page - 1) * filters.limit + 1}</span> to{' '}
                <span className="font-medium">{Math.min(filters.page * filters.limit, stats.totalLogs)}</span> of{' '}
                <span className="font-medium">{stats.totalLogs}</span> logs
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handlePageChange(filters.page - 1)}
                  disabled={filters.page === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-3 py-1 bg-indigo-600 text-white rounded-md">
                  {filters.page}
                </span>
                <button
                  onClick={() => handlePageChange(filters.page + 1)}
                  disabled={filters.page * filters.limit >= stats.totalLogs}
                  className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Log Details Modal */}
      {showDetailsModal && selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div className="flex items-center">
                {getActionIcon(selectedLog.action)}
                <h3 className="text-lg font-semibold text-gray-900 ml-2">Activity Details</h3>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <FiXCircle className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">User</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center ${
                      selectedLog.userType === 'admin' ? 'bg-purple-100 text-purple-600' :
                      selectedLog.userType === 'system' ? 'bg-gray-100 text-gray-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      {selectedLog.userType === 'admin' ? <FiServer className="h-3 w-3" /> :
                       selectedLog.userType === 'system' ? <FiActivity className="h-3 w-3" /> :
                       <FiUser className="h-3 w-3" />}
                    </div>
                    <p className="text-sm text-gray-900">{selectedLog.userName || selectedLog.userId}</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <div className="flex items-center mt-1">
                    {selectedLog.status === 'success' ? (
                      <>
                        <FiCheckCircle className="h-4 w-4 text-green-500 mr-1" />
                        <span className="text-sm text-green-600">Success</span>
                      </>
                    ) : (
                      <>
                        <FiXCircle className="h-4 w-4 text-red-500 mr-1" />
                        <span className="text-sm text-red-600">Failed</span>
                      </>
                    )}
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500">IP Address</p>
                  <p className="mt-1 text-sm font-mono text-gray-900">{selectedLog.ip || 'N/A'}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500">User Agent</p>
                  <p className="mt-1 text-xs text-gray-900 truncate">{selectedLog.userAgent || 'N/A'}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500">Action Type</p>
                  <p className="mt-1 text-sm text-gray-900">{selectedLog.actionType}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500">Resource</p>
                  <p className="mt-1 text-sm text-gray-900">{selectedLog.resource}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Action</p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-900">{selectedLog.action}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Details</p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-900">{selectedLog.details}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Metadata</p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="text-xs text-gray-900 whitespace-pre-wrap">
                    {JSON.stringify(selectedLog.metadata || {}, null, 2)}
                  </pre>
                </div>
              </div>
              
              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityLogPage;