import { FiX, FiMail, FiPhone, FiMapPin, FiCalendar, FiGlobe, FiBriefcase, FiFileText, FiUser, FiShield, FiClock, FiHash } from 'react-icons/fi';
import { format } from 'date-fns';

const UserDetailsModal = ({ user, onClose }) => {
  const getRoleColor = (role) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-800',
      seller: 'bg-blue-100 text-blue-800',
      buyer: 'bg-green-100 text-green-800',
      user: 'bg-gray-100 text-gray-800'
    };
    return colors[role] || colors.user;
  };

  const formatDate = (date) => {
    if (!date) return 'Never';
    return format(new Date(date), 'MMM d, yyyy HH:mm');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">User Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <FiX className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6 pb-6 border-b border-gray-200">
            <img
              className="h-24 w-24 rounded-full object-cover"
              src={user.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`}
              alt={user.name}
            />
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                      {user.role}
                    </span>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {user.accountType && user.accountType !== 'basic' && (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
                        {user.accountType}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-2 md:mt-0 text-sm text-gray-500">
                  <div className="flex items-center">
                    <FiHash className="h-3 w-3 mr-1" />
                    {user._id}
                  </div>
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <FiMail className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{user.email}</p>
                  </div>
                </div>
                {user.phoneNumber && (
                  <div className="flex items-center space-x-2">
                    <FiPhone className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-medium">{user.phoneNumber}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <FiShield className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Email Status</p>
                    <p className={`font-medium ${user.emailVerified ? 'text-green-600' : 'text-yellow-600'}`}>
                      {user.emailVerified ? 'Verified' : 'Not Verified'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="py-6 border-b border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-4">Account Statistics</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Member Since</p>
                <p className="font-medium">{formatDate(user.createdAt)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Last Login</p>
                <p className="font-medium">{formatDate(user.lastLoginAt)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Last Seen</p>
                <p className="font-medium">{formatDate(user.lastSeenAt)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Last Updated</p>
                <p className="font-medium">{formatDate(user.updatedAt)}</p>
              </div>
            </div>
          </div>

          {/* Profile Information */}
          <div className="py-6 border-b border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-4">Profile Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {user.bio && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Bio</p>
                  <p className="text-gray-800">{user.bio}</p>
                </div>
              )}
              
              {(user.country || user.city) && (
                <div className="flex items-start space-x-2">
                  <FiMapPin className="h-4 w-4 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600">Location</p>
                    <p className="font-medium">
                      {[user.city, user.country].filter(Boolean).join(', ')}
                    </p>
                  </div>
                </div>
              )}

              {user.occupation && (
                <div className="flex items-start space-x-2">
                  <FiBriefcase className="h-4 w-4 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600">Occupation</p>
                    <p className="font-medium">{user.occupation}</p>
                  </div>
                </div>
              )}

              {user.education && (
                <div className="flex items-start space-x-2">
                  <FiFileText className="h-4 w-4 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600">Education</p>
                    <p className="font-medium">{user.education}</p>
                  </div>
                </div>
              )}

              {user.dateOfBirth && (
                <div className="flex items-start space-x-2">
                  <FiCalendar className="h-4 w-4 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600">Date of Birth</p>
                    <p className="font-medium">{format(new Date(user.dateOfBirth), 'MMM d, yyyy')}</p>
                  </div>
                </div>
              )}

              {user.languages && user.languages.length > 0 && (
                <div className="flex items-start space-x-2">
                  <FiGlobe className="h-4 w-4 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600">Languages</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {user.languages.map((lang, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                        >
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Privacy Settings */}
          {user.privacySettings && (
            <div className="py-6">
              <h4 className="text-sm font-medium text-gray-900 mb-4">Privacy Settings</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Profile Visibility</p>
                  <p className="font-medium capitalize">{user.privacySettings.profileVisibility}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Show Email</p>
                    <p className={`font-medium ${user.privacySettings.showEmail ? 'text-green-600' : 'text-gray-600'}`}>
                      {user.privacySettings.showEmail ? 'Yes' : 'No'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Show Phone</p>
                    <p className={`font-medium ${user.privacySettings.showPhone ? 'text-green-600' : 'text-gray-600'}`}>
                      {user.privacySettings.showPhone ? 'Yes' : 'No'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Show Location</p>
                    <p className={`font-medium ${user.privacySettings.showLocation ? 'text-green-600' : 'text-gray-600'}`}>
                      {user.privacySettings.showLocation ? 'Yes' : 'No'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Show Last Seen</p>
                    <p className={`font-medium ${user.privacySettings.showLastSeen ? 'text-green-600' : 'text-gray-600'}`}>
                      {user.privacySettings.showLastSeen ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="pt-6 border-t border-gray-200 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
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