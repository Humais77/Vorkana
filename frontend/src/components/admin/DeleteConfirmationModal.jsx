import { useState } from 'react';
import { FiTrash2, FiX, FiAlertTriangle, FiInfo ,FiAlertCircle} from 'react-icons/fi';

const DeleteConfirmationModal = ({ userToDelete, onClose, onConfirm }) => {
  const isBulk = userToDelete?.type === 'bulk';
  const [deleteType, setDeleteType] = useState('soft'); // 'soft' or 'permanent'
  const [confirmText, setConfirmText] = useState('');
  
  const handleConfirm = () => {
    if (deleteType === 'permanent' && confirmText !== 'DELETE PERMANENTLY') {
      toast.error('Please type "DELETE PERMANENTLY" to confirm permanent deletion');
      return;
    }
    onConfirm({ ...userToDelete, permanent: deleteType === 'permanent' });
  };
  
  const isSingleUser = isBulk ? false : userToDelete?.id;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center mb-4">
            <div className={`h-12 w-12 rounded-full flex items-center justify-center mr-4 ${
              deleteType === 'permanent' ? 'bg-red-100' : 'bg-yellow-100'
            }`}>
              {deleteType === 'permanent' ? (
                <FiAlertTriangle className="h-6 w-6 text-red-600" />
              ) : (
                <FiAlertCircle className="h-6 w-6 text-yellow-600" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {deleteType === 'permanent' ? 'Permanent Deletion' : 'Deactivate Account'}
              </h3>
              <p className="text-sm text-gray-500">
                {isBulk 
                  ? `${userToDelete.ids.length} users selected` 
                  : 'This action will affect the user account'}
              </p>
            </div>
          </div>
          
          {/* Delete Type Selection */}
          <div className="mb-6">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => setDeleteType('soft')}
                className={`px-4 py-3 rounded-lg border ${
                  deleteType === 'soft'
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center">
                  <FiAlertCircle className={`h-5 w-5 mr-2 ${
                    deleteType === 'soft' ? 'text-yellow-600' : 'text-gray-400'
                  }`} />
                  <div className="text-left">
                    <p className="font-medium">Deactivate</p>
                    <p className="text-xs text-gray-500 mt-1">
                      User cannot login<br />
                      Data preserved<br />
                      Reversible
                    </p>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => setDeleteType('permanent')}
                className={`px-4 py-3 rounded-lg border ${
                  deleteType === 'permanent'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center">
                  <FiAlertTriangle className={`h-5 w-5 mr-2 ${
                    deleteType === 'permanent' ? 'text-red-600' : 'text-gray-400'
                  }`} />
                  <div className="text-left">
                    <p className="font-medium">Delete Permanently</p>
                    <p className="text-xs text-gray-500 mt-1">
                      All data deleted<br />
                      Cannot be undone<br />
                      Irreversible
                    </p>
                  </div>
                </div>
              </button>
            </div>
            
            {/* Permanent Delete Confirmation */}
            {deleteType === 'permanent' && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-800 mb-2">
                  ⚠️ Permanent Deletion Warning
                </p>
                <p className="text-sm text-red-700 mb-3">
                  This will permanently delete {isBulk ? 'all selected users' : 'this user'} 
                  and all associated data. This action cannot be undone.
                </p>
                <div>
                  <label className="block text-sm font-medium text-red-700 mb-1">
                    Type <span className="font-bold">DELETE PERMANENTLY</span> to confirm:
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    className="w-full px-3 py-2 border border-red-300 rounded-md text-sm"
                    placeholder="DELETE PERMANENTLY"
                  />
                </div>
              </div>
            )}
            
            {/* Soft Delete Info */}
            {deleteType === 'soft' && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm font-medium text-yellow-800 mb-2">
                  ℹ️ Deactivation Information
                </p>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• User will be unable to login</li>
                  <li>• All user data will be preserved</li>
                  <li>• Account can be reactivated at any time</li>
                  <li>• Active sessions will be terminated</li>
                </ul>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={deleteType === 'permanent' && confirmText !== 'DELETE PERMANENTLY'}
              className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
                deleteType === 'permanent'
                  ? 'bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
                  : 'bg-yellow-600 hover:bg-yellow-700 text-white'
              }`}
            >
              <FiTrash2 className="h-4 w-4" />
              <span>
                {deleteType === 'permanent'
                  ? isBulk 
                    ? `Delete ${userToDelete.ids.length} Users Permanently`
                    : 'Delete Permanently'
                  : isBulk
                    ? `Deactivate ${userToDelete.ids.length} Users`
                    : 'Deactivate Account'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;