// UserDetailsModal.jsx
import { useEffect, useState } from 'react';
import { FiX, FiMail, FiPhone, FiMapPin, FiUser, FiCalendar, FiBriefcase, FiGlobe, FiEye, FiEyeOff } from 'react-icons/fi';
import { format } from 'date-fns';

const UserDetailsModal = ({ user, onClose }) => {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    if (user) {
      console.log('[USER DETAILS MODAL] User data:', user);
      
      // Always show all data for admin, ignore privacy settings
      const enhancedUser = {
        ...user,
        // Force show all contact info
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
      return format(new Date(date), 'PPPpp');
    } catch {
      return 'Invalid date';
    }
  };

  if (!userData) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">User Details</h3>
            <p className="text-sm text-gray-500">Admin View - All information visible</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <FiX className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Admin Warning Banner */}
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <FiEye className="h-5 w-5 text-blue-600 mr-2" />
              <div>
                <h4 className="text-sm font-medium text-blue-800">Admin Privacy Override</h4>
                <p className="text-xs text-blue-600 mt-1">
                  You are viewing all user information regardless of their privacy settings.
                </p>
              </div>
            </div>
          </div>

          {/* User Profile */}
          <div className="mb-6">
            <div className="flex items-center space-x-4">
              <div className="h-20 w-20">
                <img
                  className="h-20 w-20 rounded-full object-cover"
                  src={userData.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || 'User')}&background=random`}
                  alt={userData.name || 'User'}
                />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{userData.name || 'No name'}</h2>
                <p className="text-gray-600">{userData.email || 'No email'}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    userData.role === 'admin' 
                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                      : 'bg-gray-100 text-gray-800 border border-gray-200'
                  }`}>
                    {userData.role || 'user'}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    userData.isActive
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : 'bg-red-100 text-red-800 border border-red-200'
                  }`}>
                    {userData.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    userData.emailVerified
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                  }`}>
                    {userData.emailVerified ? 'Email Verified' : 'Email Not Verified'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information - ALWAYS VISIBLE FOR ADMIN */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-4">Contact Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <FiMail className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Email Address</p>
                  <p className="text-sm font-medium text-gray-900">{userData.email || 'Not provided'}</p>
                  {userData.privacySettings?.showEmail === false && (
                    <p className="text-xs text-yellow-600 mt-1">User has hidden this from public view</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <FiPhone className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Phone Number</p>
                  <p className="text-sm font-medium text-gray-900">{userData.phoneNumber || 'Not provided'}</p>
                  {userData.privacySettings?.showPhone === false && (
                    <p className="text-xs text-yellow-600 mt-1">User has hidden this from public view</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <FiMapPin className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Location</p>
                  <p className="text-sm font-medium text-gray-900">
                    {userData.city && userData.country 
                      ? `${userData.city}, ${userData.country}`
                      : 'Not provided'
                    }
                  </p>
                  {userData.privacySettings?.showLocation === false && (
                    <p className="text-xs text-yellow-600 mt-1">User has hidden this from public view</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <FiCalendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Date of Birth</p>
                  <p className="text-sm font-medium text-gray-900">
                    {userData.dateOfBirth 
                      ? format(new Date(userData.dateOfBirth), 'PPP')
                      : 'Not provided'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-4">Additional Information</h4>
            <div className="space-y-4">
              {userData.bio && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Bio</p>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{userData.bio}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                {userData.occupation && (
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <FiBriefcase className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Occupation</p>
                      <p className="text-sm font-medium text-gray-900">{userData.occupation}</p>
                    </div>
                  </div>
                )}
                
                {userData.education && (
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <FiGlobe className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Education</p>
                      <p className="text-sm font-medium text-gray-900">{userData.education}</p>
                    </div>
                  </div>
                )}
              </div>
              
              {userData.languages && userData.languages.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Languages</p>
                  <div className="flex flex-wrap gap-2">
                    {userData.languages.map((lang, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-indigo-100 text-indigo-800 text-sm rounded-full"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Activity Information */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-4">Activity Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Last Login</p>
                <p className="text-sm font-medium text-gray-900">{formatDate(userData.lastLoginAt)}</p>
                {userData.privacySettings?.showLastSeen === false && (
                  <p className="text-xs text-yellow-600 mt-1">User has hidden this from public view</p>
                )}
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Account Created</p>
                <p className="text-sm font-medium text-gray-900">{formatDate(userData.createdAt)}</p>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Last Updated</p>
                <p className="text-sm font-medium text-gray-900">{formatDate(userData.updatedAt)}</p>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Account Status</p>
                <p className="text-sm font-medium text-gray-900">
                  {userData.registrationStatus || 'verified'}
                </p>
              </div>
            </div>
          </div>

          {/* Privacy Settings Display */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-4">Privacy Settings</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-2">Profile Visibility</p>
                <p className="text-sm font-medium text-gray-900 capitalize">
                  {userData.privacySettings?.profileVisibility || 'public'}
                </p>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-2">Show Email to Public</p>
                <div className="flex items-center space-x-2">
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
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-2">Show Phone to Public</p>
                <div className="flex items-center space-x-2">
                  {userData.privacySettings?.showPhone ? (
                    <>
                      <FiEye className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-700">Visible</span>
                    </>
                  ) : (
                    <>
                      <FiEyeOff className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm text-yellow-500">Hidden</span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-2">Show Location to Public</p>
                <div className="flex items-center space-x-2">
                  {userData.privacySettings?.showLocation ? (
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

          {/* Stats */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-4">Statistics</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Rating</p>
                <p className="text-lg font-bold text-gray-900">{userData.rating || 0}/5</p>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Response Rate</p>
                <p className="text-lg font-bold text-gray-900">{userData.responseRate || 0}%</p>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Response Time</p>
                <p className="text-lg font-bold text-gray-900">{userData.responseTime || 0} hours</p>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Completed Orders</p>
                <p className="text-lg font-bold text-gray-900">{userData.completedOrders || 0}</p>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetailsModal;