import { useState, useEffect } from 'react';
import { FiShield, FiAlertCircle, FiCheckCircle, FiX } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

const SecurityMonitor = ({ onClose }) => {
  const [checks, setChecks] = useState([
    { id: 1, name: 'Authentication', status: 'pass', lastCheck: Date.now() },
    { id: 2, name: 'Authorization', status: 'pass', lastCheck: Date.now() },
    { id: 3, name: 'Input Validation', status: 'warn', lastCheck: Date.now() },
    { id: 4, name: 'Rate Limiting', status: 'pass', lastCheck: Date.now() },
    { id: 5, name: 'XSS Protection', status: 'pass', lastCheck: Date.now() },
    { id: 6, name: 'CSRF Protection', status: 'pass', lastCheck: Date.now() },
  ]);

  const runSecurityScan = () => {
    toast.success('Security scan initiated');
    // Simulate scan
    setTimeout(() => {
      setChecks(prev => prev.map(check => ({
        ...check,
        status: Math.random() > 0.2 ? 'pass' : Math.random() > 0.5 ? 'warn' : 'fail',
        lastCheck: Date.now()
      })));
      toast.success('Security scan completed');
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center">
            <FiShield className="h-6 w-6 text-indigo-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Security Monitor</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <FiX className="h-6 w-6" />
          </button>
        </div>
        
        <div className="px-6 py-4">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-md font-medium text-gray-900">Security Status</h4>
              <button
                onClick={runSecurityScan}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
              >
                Run Scan
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {checks.map((check) => (
                <div
                  key={check.id}
                  className={`p-4 rounded-lg border ${
                    check.status === 'pass' 
                      ? 'bg-green-50 border-green-200' 
                      : check.status === 'warn'
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {check.status === 'pass' ? (
                        <FiCheckCircle className="h-5 w-5 text-green-600 mr-2" />
                      ) : check.status === 'warn' ? (
                        <FiAlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                      ) : (
                        <FiAlertCircle className="h-5 w-5 text-red-600 mr-2" />
                      )}
                      <span className="font-medium text-gray-900">{check.name}</span>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      check.status === 'pass' 
                        ? 'bg-green-100 text-green-800' 
                        : check.status === 'warn'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {check.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Last checked: {new Date(check.lastCheck).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="text-md font-medium text-gray-900 mb-2">Recent Security Events</h4>
            <div className="space-y-2">
              {[
                { id: 1, event: 'Failed login attempt', time: '2 minutes ago', severity: 'low' },
                { id: 2, event: 'User role changed', time: '15 minutes ago', severity: 'medium' },
                { id: 3, event: 'Category bulk update', time: '30 minutes ago', severity: 'low' },
              ].map((event) => (
                <div key={event.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{event.event}</p>
                    <p className="text-xs text-gray-500">{event.time}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    event.severity === 'high' 
                      ? 'bg-red-100 text-red-800'
                      : event.severity === 'medium'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {event.severity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SecurityMonitor;