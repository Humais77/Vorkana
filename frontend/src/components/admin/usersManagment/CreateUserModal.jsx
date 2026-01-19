// CreateUserModal.jsx
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../../../api/admin';
import { useUserToast } from '../../../hooks/useUserToast';
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
  FiAlertCircle
} from 'react-icons/fi';

const CreateUserModal = ({ onClose, onSuccess }) => {
  const queryClient = useQueryClient();
  const { showUserLoading, showUserSuccess, showUserError, dismissUserToast } = useUserToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
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
    
    // Clear error for this field
    setErrors(prev => ({ ...prev, [name]: undefined }));
    
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
    const validationErrors = {};

    if (!formData.name.trim()) validationErrors.name = 'Name is required';
    if (!formData.email.trim()) validationErrors.email = 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) validationErrors.email = 'Invalid email format';
    if (!formData.password) validationErrors.password = 'Password is required';
    
    // Password strength validation
    if (formData.password) {
      if (formData.password.length < 8) {
        validationErrors.password = 'Password must be at least 8 characters';
      } else if (!/[A-Z]/.test(formData.password)) {
        validationErrors.password = 'Must contain at least one uppercase letter';
      } else if (!/[a-z]/.test(formData.password)) {
        validationErrors.password = 'Must contain at least one lowercase letter';
      } else if (!/\d/.test(formData.password)) {
        validationErrors.password = 'Must contain at least one number';
      } else if (!/[@$!%*?&]/.test(formData.password)) {
        validationErrors.password = 'Must contain at least one special character (@$!%*?&)';
      }
    }

    // Phone validation
    if (formData.phoneNumber && formData.phoneNumber.trim() !== '') {
      if (!/^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}$/im.test(formData.phoneNumber)) {
        validationErrors.phoneNumber = 'Invalid phone number format';
      }
    }

    // Date of birth validation
    if (formData.dateOfBirth) {
      const dob = new Date(formData.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      if (age < 13 || age > 120) {
        validationErrors.dateOfBirth = 'Age must be between 13 and 120 years';
      }
    }

    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      Object.values(errors).forEach(error => showUserError(error));
      return;
    }

    setLoading(true);
    const loadingToastId = showUserLoading('Creating user...');
    
    try {
      const userData = {
        ...formData,
        phoneNumber: formData.phoneNumber || '',
        bio: formData.bio || '',
        gender: formData.gender || '',
        country: formData.country || '',
        city: formData.city || '',
        occupation: formData.occupation || '',
        education: formData.education || '',
        picture: formData.picture || null,
        languages: formData.languages.length > 0 ? formData.languages : [],
        emailVerified: true,
        isActive: true,
        createdByAdmin: true
      };

      const response = await adminAPI.createUser(userData);
      
      if (response.data.success) {
        dismissUserToast(loadingToastId);
        showUserSuccess('User created successfully!');
        queryClient.invalidateQueries(['admin', 'users']);
        queryClient.invalidateQueries(['admin', 'dashboard']);
        onSuccess?.();
        onClose();
      } else {
        dismissUserToast(loadingToastId);
        showUserError(response.data.message || 'Failed to create user');
      }
    } catch (error) {
      console.error('Create user error:', error);
      dismissUserToast(loadingToastId);
      
      // Show backend validation errors
      if (error.response?.data?.errors) {
        error.response.data.errors.forEach(err => {
          showUserError(err);
        });
      } else {
        const errorMessage = error.response?.data?.message || 
                            error.response?.data?.error || 
                            error.message || 
                            'Failed to create user';
        showUserError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const renderField = (label, name, type = 'text', placeholder = '', options = []) => {
    const hasError = errors[name];
    
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {type !== 'checkbox' && <span className="text-red-500">*</span>}
        </label>
        
        {type === 'select' ? (
          <select
            name={name}
            value={formData[name]}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
              hasError ? 'border-red-500 bg-red-50' : 'border-gray-300'
            }`}
          >
            {options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : type === 'textarea' ? (
          <textarea
            name={name}
            value={formData[name]}
            onChange={handleChange}
            rows={3}
            placeholder={placeholder}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
              hasError ? 'border-red-500 bg-red-50' : 'border-gray-300'
            }`}
          />
        ) : (
          <input
            type={type}
            name={name}
            value={formData[name]}
            onChange={handleChange}
            placeholder={placeholder}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
              hasError ? 'border-red-500 bg-red-50' : 'border-gray-300'
            }`}
          />
        )}
        
        {hasError && (
          <p className="mt-1 text-sm text-red-600 flex items-center">
            <FiAlertCircle className="h-4 w-4 mr-1" />
            {errors[name]}
          </p>
        )}
      </div>
    );
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
              {renderField('Full Name *', 'name', 'text', 'Enter full name')}
              {renderField('Email *', 'email', 'email', 'user@example.com')}
              {renderField('Password *', 'password', 'password', 'Minimum 8 characters')}
              {renderField('Phone Number', 'phoneNumber', 'tel', '+1234567890')}
              {renderField('Date of Birth', 'dateOfBirth', 'date')}
              {renderField('Gender', 'gender', 'select', '', [
                { value: '', label: 'Select Gender' },
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
                { value: 'other', label: 'Other' },
                { value: 'prefer-not-to-say', label: 'Prefer not to say' }
              ])}
            </div>
          </div>

          {/* Location Information */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
              <FiMapPin className="h-4 w-4 mr-2" />
              Location Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderField('Country', 'country', 'text', 'Enter country')}
              {renderField('City', 'city', 'text', 'Enter city')}
            </div>
          </div>

          {/* Professional Information */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
              <FiBriefcase className="h-4 w-4 mr-2" />
              Professional Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderField('Occupation', 'occupation', 'text', 'e.g., Software Engineer')}
              {renderField('Education', 'education', 'text', 'e.g., Bachelor\'s in Computer Science')}
            </div>
          </div>

          {/* Languages */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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

          {/* Profile Information */}
          <div>
            {renderField('Bio', 'bio', 'textarea', 'Tell us about yourself...')}
          </div>

          {/* Account Settings */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
              <FiGlobe className="h-4 w-4 mr-2" />
              Account Settings
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderField('Role *', 'role', 'select', '', [
                { value: 'user', label: 'User' },
                { value: 'admin', label: 'Admin' }
              ])}
              {renderField('Account Type', 'accountType', 'select', '', [
                { value: 'basic', label: 'Basic' },
                { value: 'premium', label: 'Premium' },
                { value: 'business', label: 'Business' }
              ])}
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