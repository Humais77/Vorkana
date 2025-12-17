import { useState, useEffect } from 'react';
import { adminAPI } from '../../api/admin.js';
import { useAdminStore } from '../../store/useAdminStore';
import { toast } from 'react-hot-toast';
import {
  FiShield,
  FiAlertCircle,
  FiCheckCircle,
  FiActivity,
  FiEye,
  FiEyeOff,
  FiLock,
  FiUnlock,
  FiRefreshCw,
  FiFilter,
  FiCalendar,
  FiUser,
  FiGlobe,
  FiClock,
  FiXCircle,
  FiSearch,
  FiDownload
} from 'react-icons/fi';

const SecurityPage = () => {
  const [securityLogs, setSecurityLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    severity: '',
    action: '',
    dateRange: 'today',
    search: ''
  });
  const [stats, setStats] = useState({
    totalAlerts: 0,
    highSeverity: 0,
    mediumSeverity: 0,
    lowSeverity: 0
  });
  const [showThreatModal, setShowThreatModal] = useState(false);
  const [selectedThreat, setSelectedThreat] = useState(null);

  const { addSecurityAlert } = useAdminStore();

  const fetchSecurityLogs = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getSecurityLogs(filters);
      if (response.data.success) {
        setSecurityLogs(response.data.data);
        setStats(response.data.stats || {
          totalAlerts: response.data.data.length,
          highSeverity: response.data.data.filter(log => log.severity === 'high').length,
          mediumSeverity: response.data.data.filter(log => log.severity === 'medium').length,
          lowSeverity: response.data.data.filter(log => log.severity === 'low').length
        });
      }
    } catch (error) {
      console.error('Failed to fetch security logs:', error);
      toast.error('Failed to load security logs');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchSecurityLogs();
    toast.success('Security logs refreshed');
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const simulateAttack = (type) => {
    const attacks = {
      bruteForce: {
        ip: '192.168.1.' + Math.floor(Math.random() * 255),
        action: 'BRUTE_FORCE_ATTEMPT',
        severity: 'high',
        details: 'Multiple failed login attempts detected',
        timestamp: new Date()
      },
      xss: {
        ip: '10.0.0.' + Math.floor(Math.random() * 255),
        action: 'XSS_ATTEMPT',
        severity: 'medium',
        details: 'Cross-site scripting attempt detected',
        timestamp: new Date()
      },
      sql: {
        ip: '172.16.0.' + Math.floor(Math.random() * 255),
        action: 'SQL_INJECTION_ATTEMPT',
        severity: 'high',
        details: 'SQL injection attempt detected',
        timestamp: new Date()
      }
    };

    const attack = attacks[type];
    addSecurityAlert(attack);
    toast.error(`Security alert: ${attack.details}`);
  };

  const getSeverityColor = (severity) => {
    const colors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-blue-100 text-blue-800',
      info: 'bg-gray-100 text-gray-800'
    };
    return colors[severity] || colors.info;
  };

  const getActionIcon = (action) => {
    if (action.includes('LOGIN')) return <FiUser className="h-4 w-4" />;
    if (action.includes('PASSWORD')) return <FiLock className="h-4 w-4" />;
    if (action.includes('ATTEMPT')) return <FiAlertCircle className="h-4 w-4" />;
    return <FiActivity className="h-4 w-4" />;
  };

  useEffect(() => {
    fetchSecurityLogs();
    // Refresh every 30 seconds
    const interval = setInterval(fetchSecurityLogs, 30000);
    return () => clearInterval(interval);
  }, [filters]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Security Dashboard</h1>
          <p className="text-gray-600">Monitor security events and configure protection</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
          >
            <FiRefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
          <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
            <FiLock className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Security Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-red-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">High Severity</p>
              <p className="text-3xl font-bold mt-1">{stats.highSeverity}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <FiAlertCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-red-500" 
                style={{ width: `${(stats.highSeverity / stats.totalAlerts) * 100 || 0}%` }}
              ></div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-yellow-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Medium Severity</p>
              <p className="text-3xl font-bold mt-1">{stats.mediumSeverity}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <FiAlertCircle className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-yellow-500" 
                style={{ width: `${(stats.mediumSeverity / stats.totalAlerts) * 100 || 0}%` }}
              ></div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-blue-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Low Severity</p>
              <p className="text-3xl font-bold mt-1">{stats.lowSeverity}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <FiActivity className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500" 
                style={{ width: `${(stats.lowSeverity / stats.totalAlerts) * 100 || 0}%` }}
              ></div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-green-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Alerts</p>
              <p className="text-3xl font-bold mt-1">{stats.totalAlerts}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <FiShield className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500" 
                style={{ width: '100%' }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Security Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Controls</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <FiLock className="h-5 w-5 text-indigo-600" />
              <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">
                Active
              </span>
            </div>
            <h4 className="font-medium text-gray-900">Rate Limiting</h4>
            <p className="text-sm text-gray-600 mt-1">Prevent brute force attacks</p>
            <button className="mt-4 w-full px-3 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700">
              Configure
            </button>
          </div>
          
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <FiGlobe className="h-5 w-5 text-blue-600" />
              <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">
                Active
              </span>
            </div>
            <h4 className="font-medium text-gray-900">IP Blocking</h4>
            <p className="text-sm text-gray-600 mt-1">Block suspicious IP addresses</p>
            <button className="mt-4 w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
              Manage IPs
            </button>
          </div>
          
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <FiShield className="h-5 w-5 text-purple-600" />
              <span className="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full">
                Monitoring
              </span>
            </div>
            <h4 className="font-medium text-gray-900">Web Application Firewall</h4>
            <p className="text-sm text-gray-600 mt-1">Protect against web attacks</p>
            <button className="mt-4 w-full px-3 py-2 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700">
              View Rules
            </button>
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
                placeholder="Search security logs..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          
          <div className="flex space-x-3">
            <select
              value={filters.severity}
              onChange={(e) => handleFilterChange('severity', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">All Severity</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            
            <select
              value={filters.dateRange}
              onChange={(e) => handleFilterChange('dateRange', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
            
            <button className="px-4 py-2 border border-gray-300 rounded-lg flex items-center space-x-2 hover:bg-gray-50">
              <FiFilter className="h-4 w-4" />
              <span>More Filters</span>
            </button>
          </div>
        </div>
      </div>

      {/* Security Logs Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Severity
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
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  </td>
                </tr>
              ) : securityLogs.length > 0 ? (
                securityLogs.map((log, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(log.severity)}`}>
                        {log.severity.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getActionIcon(log.action)}
                        <span className="font-medium text-gray-900">{log.action}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        <p className="text-sm text-gray-900 truncate">{log.details}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1">
                        <FiGlobe className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-mono text-gray-600">{log.ip}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <FiClock className="h-4 w-4" />
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedThreat(log);
                          setShowThreatModal(true);
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
                  <td colSpan="6" className="px-6 py-8 text-center">
                    <FiCheckCircle className="h-12 w-12 text-green-400 mx-auto" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No security alerts</h3>
                    <p className="mt-2 text-gray-500">All systems are secure!</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Threat Details Modal */}
      {showThreatModal && selectedThreat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div className="flex items-center">
                <FiAlertCircle className={`h-6 w-6 mr-2 ${
                  selectedThreat.severity === 'high' ? 'text-red-600' :
                  selectedThreat.severity === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                }`} />
                <h3 className="text-lg font-semibold text-gray-900">Threat Details</h3>
              </div>
              <button
                onClick={() => setShowThreatModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <FiXCircle className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Severity</p>
                  <p className={`mt-1 px-2 py-1 inline-flex text-sm font-semibold rounded-full ${getSeverityColor(selectedThreat.severity)}`}>
                    {selectedThreat.severity.toUpperCase()}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500">Action</p>
                  <p className="mt-1 text-sm text-gray-900">{selectedThreat.action}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500">IP Address</p>
                  <p className="mt-1 text-sm text-gray-900 font-mono">{selectedThreat.ip}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500">Timestamp</p>
                  <p className="mt-1 text-sm text-gray-900">{new Date(selectedThreat.timestamp).toLocaleString()}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Details</p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-900">{selectedThreat.details}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Recommended Actions</p>
                <div className="space-y-2">
                  <button className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm">
                    Block IP Address
                  </button>
                  <button className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm">
                    Add to Monitoring List
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityPage;