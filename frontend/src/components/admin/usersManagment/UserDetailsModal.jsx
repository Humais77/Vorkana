// UserDetailsModal.jsx - UPDATED with consistent design
import { useEffect, useState } from 'react';
import { FiX,FiClock, FiMail, FiPhone, FiMapPin, FiUser, FiCalendar, FiBriefcase, FiGlobe, FiEye, FiEyeOff, FiEdit2, FiTrash2, FiCopy, FiExternalLink, FiShield, FiCheckCircle, FiXCircle, FiHash, FiLock, FiUnlock, FiActivity, FiBarChart2 } from 'react-icons/fi';
import { format } from 'date-fns';

const UserDetailsModal = ({ user, onClose, onEdit, onDelete }) => {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    if (user) {
      const enhancedUser = {
        ...user,
        _showEmail: true,
        _showPhone: true,
        _showLocation: true,
        _showLastSeen: true,
        _isAdminView: true
      };
      setUserData(enhancedUser);
    }
  }, [user]);

  const formatDate = (date) => {
    if (!date) return 'Not available';
    try {
      return format(new Date(date), 'PPpp');
    } catch {
      return 'Invalid date';
    }
  };

  if (!userData) return null;

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // You can add toast notification here
  };

  const getStatusColor = (status) => {
    return status 
      ? 'bg-green-100 text-green-800 border border-green-200' 
      : 'bg-red-100 text-red-800 border border-red-200';
  };

  const getRoleColor = (role) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-800 border border-purple-200',
      user: 'bg-gray-100 text-gray-800 border border-gray-200',
      seller: 'bg-blue-100 text-blue-800 border border-blue-200',
      buyer: 'bg-green-100 text-green-800 border border-green-200'
    };
    return colors[role] || colors.user;
  };

  const handleEdit = () => {
    if (onEdit) onEdit(userData);
    onClose();
  };

  const handleDelete = () => {
    if (onDelete) onDelete(userData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex items-center space-x-3">
            <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <FiUser className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">User Details</h3>
              <p className="text-sm text-gray-500">Admin View • ID: {userData._id}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => copyToClipboard(userData._id)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-1"
              title="Copy ID"
            >
              <FiCopy className="h-4 w-4" />
              <span>Copy ID</span>
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 p-1"
            >
              <FiX className="h-6 w-6" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-4 mb-3">
                    <div className="h-20 w-20">
                      <img
                        className="h-20 w-20 rounded-full object-cover border-4 border-white shadow-sm"
                        src={userData.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || 'User')}&background=random`}
                        alt={userData.name || 'User'}
                      />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{userData.name || 'No name'}</h2>
                      <p className="text-gray-600">{userData.email || 'No email'}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getRoleColor(userData.role)}`}>
                      {userData.role || 'user'}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(userData.isActive)}`}>
                      {userData.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${
                      userData.emailVerified 
                        ? 'bg-green-100 text-green-800 border-green-200' 
                        : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                    }`}>
                      {userData.emailVerified ? 'Email Verified' : 'Email Not Verified'}
                    </span>
                    {userData.accountType && userData.accountType !== 'basic' && (
                      <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-semibold border border-amber-200">
                        {userData.accountType}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  {userData.role !== 'admin' && (
                    <button
                      onClick={() => {/* Make admin action */}}
                      className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 flex items-center space-x-2 border border-purple-200"
                    >
                      <FiShield className="h-4 w-4" />
                      <span>Make Admin</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-gray-600">Rating</p>
                    <p className="text-xl font-bold text-gray-900">{userData.rating || 0}/5</p>
                  </div>
                  <FiActivity className="h-6 w-6 text-indigo-500" />
                </div>
                <p className="text-xs text-gray-500">Average rating</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-gray-600">Response Rate</p>
                    <p className="text-xl font-bold text-gray-900">{userData.responseRate || 0}%</p>
                  </div>
                  <FiBarChart2 className="h-6 w-6 text-green-500" />
                </div>
                <p className="text-xs text-gray-500">Message response rate</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-gray-600">Response Time</p>
                    <p className="text-xl font-bold text-gray-900">{userData.responseTime || 0}h</p>
                  </div>
                  <FiClock className="h-6 w-6 text-blue-500" />
                </div>
                <p className="text-xs text-gray-500">Average response time</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-gray-600">Orders</p>
                    <p className="text-xl font-bold text-gray-900">{userData.completedOrders || 0}</p>
                  </div>
                  <FiCheckCircle className="h-6 w-6 text-teal-500" />
                </div>
                <p className="text-xs text-gray-500">Completed orders</p>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Contact Information */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <FiMail className="h-5 w-5 mr-2 text-gray-500" />
                    Contact Information
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <div className="flex items-center space-x-3">
                        <FiMail className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Email Address</p>
                          <p className="text-xs text-gray-500">Always visible to admin</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700">{userData.email || 'Not provided'}</p>
                    </div>
                    
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <div className="flex items-center space-x-3">
                        <FiPhone className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Phone Number</p>
                          <p className="text-xs text-gray-500">Admin view only</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700">{userData.phoneNumber || 'Not provided'}</p>
                    </div>
                    
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center space-x-3">
                        <FiMapPin className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Location</p>
                          <p className="text-xs text-gray-500">Admin view only</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700">
                        {userData.city && userData.country 
                          ? `${userData.city}, ${userData.country}`
                          : 'Not provided'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                {userData.bio && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                      <FiBriefcase className="h-5 w-5 mr-2 text-gray-500" />
                      Bio
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-700 whitespace-pre-line">{userData.bio}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Account Information */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <FiUser className="h-5 w-5 mr-2 text-gray-500" />
                    Account Information
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">Account Created</span>
                      <span className="font-medium">{formatDate(userData.createdAt)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">Last Login</span>
                      <span className="font-medium">{formatDate(userData.lastLoginAt)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">Last Updated</span>
                      <span className="font-medium">{formatDate(userData.updatedAt)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-600">Account Status</span>
                      <span className={`font-medium ${userData.isActive ? 'text-green-600' : 'text-red-600'}`}>
                        {userData.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Privacy Settings */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <FiLock className="h-5 w-5 mr-2 text-gray-500" />
                    Privacy Settings
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">Profile Visibility</span>
                      <span className="font-medium capitalize">
                        {userData.privacySettings?.profileVisibility || 'public'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">Show Email</span>
                      <div className="flex items-center space-x-1">
                        {userData.privacySettings?.showEmail ? (
                          <>
                            <FiEye className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-green-700">Visible</span>
                          </>
                        ) : (
                          <>
                            <FiEyeOff className="h-4 w-4 text-yellow-500" />
                            <span className="text-sm text-yellow-700">Hidden</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">Show Phone</span>
                      <div className="flex items-center space-x-1">
                        {userData.privacySettings?.showPhone ? (
                          <>
                            <FiEye className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-green-700">Visible</span>
                          </>
                        ) : (
                          <>
                            <FiEyeOff className="h-4 w-4 text-yellow-500" />
                            <span className="text-sm text-yellow-700">Hidden</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-600">Show Last Seen</span>
                      <div className="flex items-center space-x-1">
                        {userData.privacySettings?.showLastSeen ? (
                          <>
                            <FiEye className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-green-700">Visible</span>
                          </>
                        ) : (
                          <>
                            <FiEyeOff className="h-4 w-4 text-yellow-500" />
                            <span className="text-sm text-yellow-700">Hidden</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Languages & Skills */}
            {(userData.languages?.length > 0 || userData.skills?.length > 0) && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {userData.languages?.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                        <FiGlobe className="h-5 w-5 mr-2 text-gray-500" />
                        Languages
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {userData.languages.map((lang, index) => (
                          <span
                            key={index}
                            className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 font-medium"
                          >
                            {lang}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {userData.skills?.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                        <FiBriefcase className="h-5 w-5 mr-2 text-gray-500" />
                        Skills
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {userData.skills.map((skill, index) => (
                          <span
                            key={index}
                            className="px-3 py-2 bg-gray-50 text-gray-700 rounded-lg border border-gray-200 font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Admin Note */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <FiShield className="h-5 w-5 text-blue-600 mr-2" />
                <div>
                  <h4 className="text-sm font-medium text-blue-800">Admin Privacy Override</h4>
                  <p className="text-xs text-blue-600 mt-1">
                    You are viewing all user information regardless of their privacy settings.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            User ID: {userData._id} • Member since: {format(new Date(userData.createdAt), 'MMM d, yyyy')}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleEdit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center space-x-2 transition-colors"
            >
              <FiEdit2 className="h-4 w-4" />
              <span>Edit</span>
            </button>
            
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center space-x-2 transition-colors"
            >
              <FiTrash2 className="h-4 w-4" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetailsModal;