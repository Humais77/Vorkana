import React from 'react';
import { FiRotateCcw, FiX, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';

const RestoreServiceModal = ({ 
  service, 
  isOpen, 
  onClose, 
  onRestore, 
  loading = false 
}) => {
  if (!isOpen || !service) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center mb-4">
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
              <FiRotateCcw className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Restore Service</h3>
              <p className="text-sm text-gray-500">{service.title}</p>
            </div>
          </div>

          {/* Warning Message */}
          <div className="mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex">
                <FiCheckCircle className="h-5 w-5 text-green-400 mr-2 flex-shrink-0" />
                <div>
                  <p className="text-sm text-green-800 font-medium">
                    Restore this service?
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    The service will be made active and visible to users again.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Service Details</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Current Status:</span>
                  <span className="font-medium">{service.status}</span>
                </div>
                <div className="flex justify-between">
                  <span>Active Status:</span>
                  <span className="font-medium">{service.isActive ? 'Active' : 'Inactive'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Price:</span>
                  <span className="font-medium">${service.price || '0.00'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onRestore(service)}
              disabled={loading}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Restoring...</span>
                </>
              ) : (
                <>
                  <FiRotateCcw className="h-4 w-4" />
                  <span>Restore Service</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestoreServiceModal;