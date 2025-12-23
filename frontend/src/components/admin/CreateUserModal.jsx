// CreateUserModal.jsx
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../../api/admin';
import { toast } from 'react-hot-toast';
import { 
  FiUser, 
  FiMail, 
  FiLock, 
  FiPhone, 
  FiCalendar, 
  FiMapPin, 
  FiBriefcase,
  FiGlobe,
  FiFileText,
  FiX,
  FiCheck,
  FiHash
} from 'react-icons/fi';

const CreateUserModal = ({ onClose, onSuccess }) => {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phoneNumber: '',
    dateOfBirth: '',
    gender: '',
    country: '',
    city: '',
    bio: '',
    role: 'user',
    accountType: 'basic',
    languages: [],
    occupation: '',
    education: '',
    picture: '',
    privacySettings: {
      profileVisibility: 'public',
      showEmail: false,
      showPhone: false,
      showLocation: true,
      showLastSeen: true
    }
  });
  const [newLanguage, setNewLanguage] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('privacySettings.')) {
      const settingName = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        privacySettings: {
          ...prev.privacySettings,
          [settingName]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleAddLanguage = () => {
    if (newLanguage.trim() && !formData.languages.includes(newLanguage.trim())) {
      setFormData(prev => ({
        ...prev,
        languages: [...prev.languages, newLanguage.trim()]
      }));
      setNewLanguage('');
    }
  };

  const handleRemoveLanguage = (index) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.filter((_, i) => i !== index)
    }));
  };

  const validateForm = () => {
    const errors = [];

    if (!formData.name.trim()) errors.push('Name is required');
    if (!formData.email.trim()) errors.push('Email is required');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.push('Invalid email format');
    if (!formData.password) errors.push('Password is required');
    if (formData.password.length < 8) errors.push('Password must be at least 8 characters');
    if (formData.phoneNumber && !/^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}$/im.test(formData.phoneNumber)) {
      errors.push('Invalid phone number format');
    }
    if (formData.dateOfBirth) {
      const dob = new Date(formData.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      if (age < 13 || age > 120) errors.push('Age must be between 13 and 120 years');
    }

    return errors;
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  
  const errors = validateForm();
  if (errors.length > 0) {
    errors.forEach(error => toast.error(error));
    return;
  }

  setLoading(true);
  try {
    // Prepare data for API
    const userData = {
      ...formData,
      // Ensure empty strings are converted to appropriate values
      phoneNumber: formData.phoneNumber || '',
      bio: formData.bio || '',
      gender: formData.gender || '',
      country: formData.country || '',
      city: formData.city || '',
      occupation: formData.occupation || '',
      education: formData.education || '',
      picture: formData.picture || null,
      languages: formData.languages.length > 0 ? formData.languages : [],
      // Set emailVerified to true for admin-created users
      emailVerified: true,
      isActive: true,
      // Add createdByAdmin field if needed by backend
      createdByAdmin: true
    };

    console.log('Submitting user data:', JSON.stringify(userData, null, 2));

    const response = await adminAPI.createUser(userData);
    
    if (response.data.success) {
      toast.success('User created successfully!');
      queryClient.invalidateQueries(['admin', 'users']);
      queryClient.invalidateQueries(['admin', 'dashboard']);
      onSuccess?.();
      onClose();
    } else {
      toast.error(response.data.message || 'Failed to create user');
    }
  } catch (error) {
    console.error('Create user error:', error);
    console.error('Create user error details:', error.response?.data);
    
    // Show more detailed error message
    const errorMessage = error.response?.data?.message || 
                        error.response?.data?.error || 
                        error.message || 
                        'Failed to create user';
    
    // If there are validation errors, show them
    if (error.response?.data?.errors) {
      error.response.data.errors.forEach(err => {
        toast.error(err);
      });
    } else {
      toast.error(errorMessage);
    }
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Create New User</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
            disabled={loading}
          >
            <FiX className="h-6 w-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
              <FiUser className="h-4 w-4 mr-2" />
              Basic Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter full name"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="user@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Minimum 8 characters"
                    minLength={8}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <FiPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="+1234567890"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth
                </label>
                <div className="relative">
                  <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
              </div>
            </div>
          </div>

          {/* Location Information */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
              <FiMapPin className="h-4 w-4 mr-2" />
              Location Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country
                </label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter country"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter city"
                />
              </div>
            </div>
          </div>

          {/* Professional Information */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
              <FiBriefcase className="h-4 w-4 mr-2" />
              Professional Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Occupation
                </label>
                <input
                  type="text"
                  name="occupation"
                  value={formData.occupation}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., Software Engineer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Education
                </label>
                <input
                  type="text"
                  name="education"
                  value={formData.education}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., Bachelor's in Computer Science"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Languages
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.languages.map((lang, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                    >
                      {lang}
                      <button
                        type="button"
                        onClick={() => handleRemoveLanguage(index)}
                        className="ml-1.5 text-indigo-600 hover:text-indigo-800"
                      >
                        <FiX className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newLanguage}
                    onChange={(e) => setNewLanguage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLanguage())}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Add a language"
                  />
                  <button
                    type="button"
                    onClick={handleAddLanguage}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Information */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
              <FiFileText className="h-4 w-4 mr-2" />
              Profile Information
            </h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bio
                </label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Tell us about yourself..."
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.bio.length}/500 characters
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Profile Picture URL
                  </label>
                  <input
                    type="url"
                    name="picture"
                    value={formData.picture}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="https://example.com/profile.jpg"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Account Settings */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
              <FiGlobe className="h-4 w-4 mr-2" />
              Account Settings
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                >
                  <option value="user">User</option>
                  <option value="seller">Seller</option>
                  <option value="buyer">Buyer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Type
                </label>
                <select
                  name="accountType"
                  value={formData.accountType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="basic">Basic</option>
                  <option value="premium">Premium</option>
                  <option value="business">Business</option>
                </select>
              </div>
            </div>

            {/* Privacy Settings */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h5 className="text-sm font-medium text-gray-900 mb-3">Privacy Settings</h5>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Profile Visibility
                  </label>
                  <select
                    name="privacySettings.profileVisibility"
                    value={formData.privacySettings.profileVisibility}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="public">Public</option>
                    <option value="registered">Registered Users Only</option>
                    <option value="private">Private</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="privacySettings.showEmail"
                      checked={formData.privacySettings.showEmail}
                      onChange={handleChange}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Show Email</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="privacySettings.showPhone"
                      checked={formData.privacySettings.showPhone}
                      onChange={handleChange}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Show Phone</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="privacySettings.showLocation"
                      checked={formData.privacySettings.showLocation}
                      onChange={handleChange}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Show Location</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="privacySettings.showLastSeen"
                      checked={formData.privacySettings.showLastSeen}
                      onChange={handleChange}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Show Last Seen</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <FiCheck className="h-4 w-4" />
                  <span>Create User</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateUserModal;