import React, { useState, useEffect } from 'react';
import { FiXCircle, FiTrash2, FiAlertTriangle, FiInfo, FiDatabase, FiHardDrive, FiLoader, FiAlertCircle } from 'react-icons/fi';

const GigDeleteModal = ({ gig, isOpen, onClose, onDelete, loading, error, permanent = false }) => {
  const [deleteType, setDeleteType] = useState(permanent ? 'permanent' : 'soft');
  const [forceDelete, setForceDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (error) {
      const message = error.response?.data?.message || error.message || 'Failed to delete gig';
      setErrorMessage(message);
    } else {
      setErrorMessage('');
    }
  }, [error]);

  useEffect(() => {
    if (loading) {
      setDeleting(true);
    } else {
      setDeleting(false);
    }
  }, [loading]);

  const handleDelete = async () => {
    setDeleting(true);
    setErrorMessage('');
    
    try {
      const gigId = gig._id.toString();
      
      await onDelete({
        id: gigId,
        permanent: deleteType === 'permanent',
        force: forceDelete
      });
      
      onClose();
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to delete gig';
      setErrorMessage(message);
    } finally {
      setDeleting(false);
    }
  };

  const getDependencyCounts = () => {
    return {
      bids: gig.bids?.length || 0,
      messages: 0,
      reviews: 0,
      files: gig.attachments?.length || 0
    };
  };

  const dependencies = getDependencyCounts();
  const hasDependencies = Object.values(dependencies).some(count => count > 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center mb-4">
            <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
              <FiTrash2 className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Gig</h3>
              <p className="text-sm text-gray-500">{gig.title}</p>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <FiAlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-red-800 font-medium">Error</p>
                    <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Warning Message */}
          <div className="mb-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex">
                <FiAlertTriangle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
                <div>
                  <p className="text-sm text-red-800 font-medium">
                    This action cannot be undone
                  </p>
                  <p className="text-sm text-red-700 mt-1">
                    {deleteType === 'permanent' 
                      ? 'All gig data will be permanently removed from the database.'
                      : 'The gig will be marked as deleted but can be restored later.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Delete Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Delete Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDeleteType('soft')}
                disabled={deleting}
                className={`p-4 border rounded-lg text-left transition-colors ${
                  deleteType === 'soft'
                    ? 'border-red-300 bg-red-50 ring-2 ring-red-200'
                    : 'border-gray-300 hover:border-red-200 hover:bg-red-50'
                } disabled:opacity-50`}
              >
                <div className="flex items-center mb-2">
                  <div className={`h-5 w-5 rounded-full border-2 mr-2 flex items-center justify-center ${
                    deleteType === 'soft' 
                      ? 'border-red-600 bg-red-600' 
                      : 'border-gray-400'
                  }`}>
                    {deleteType === 'soft' && (
                      <div className="h-2 w-2 bg-white rounded-full"></div>
                    )}
                  </div>
                  <span className="font-medium">Soft Delete</span>
                </div>
                <p className="text-sm text-gray-600">
                  Mark as deleted, but keep data in database for recovery
                </p>
              </button>
              
              <button
                type="button"
                onClick={() => setDeleteType('permanent')}
                disabled={deleting}
                className={`p-4 border rounded-lg text-left transition-colors ${
                  deleteType === 'permanent'
                    ? 'border-red-300 bg-red-50 ring-2 ring-red-200'
                    : 'border-gray-300 hover:border-red-200 hover:bg-red-50'
                } disabled:opacity-50`}
              >
                <div className="flex items-center mb-2">
                  <div className={`h-5 w-5 rounded-full border-2 mr-2 flex items-center justify-center ${
                    deleteType === 'permanent' 
                      ? 'border-red-600 bg-red-600' 
                      : 'border-gray-400'
                  }`}>
                    {deleteType === 'permanent' && (
                      <div className="h-2 w-2 bg-white rounded-full"></div>
                    )}
                  </div>
                  <span className="font-medium">Permanent Delete</span>
                </div>
                <p className="text-sm text-gray-600">
                  Remove all data permanently from database
                </p>
              </button>
            </div>
          </div>

          {/* Dependencies Warning */}
          {hasDependencies && deleteType === 'permanent' && (
            <div className="mb-6">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start">
                  <FiInfo className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 mb-2">
                      This gig has dependencies that will also be deleted:
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {dependencies.bids > 0 && (
                        <div className="flex items-center text-amber-700">
                          <FiDatabase className="h-4 w-4 mr-2" />
                          <span>{dependencies.bids} bid(s)</span>
                        </div>
                      )}
                      {dependencies.files > 0 && (
                        <div className="flex items-center text-amber-700">
                          <FiHardDrive className="h-4 w-4 mr-2" />
                          <span>{dependencies.files} file(s)</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="mt-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={forceDelete}
                      onChange={(e) => setForceDelete(e.target.checked)}
                      disabled={deleting}
                      className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500 disabled:opacity-50"
                    />
                    <span className="ml-2 text-sm text-amber-700 font-medium">
                      Force delete despite dependencies
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={deleting}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className={`px-6 py-3 rounded-lg font-medium flex items-center space-x-2 transition-colors ${
                deleteType === 'permanent'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-orange-600 text-white hover:bg-orange-700'
              } disabled:opacity-50`}
            >
              {deleting ? (
                <>
                  <FiLoader className="h-4 w-4 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <FiTrash2 className="h-4 w-4" />
                  <span>
                    {deleteType === 'permanent' ? 'Delete Permanently' : 'Soft Delete'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GigDeleteModal;