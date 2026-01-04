// EditUserModal.jsx - Enhanced with comprehensive validation
import { useState, useEffect } from 'react';
import { FiX, FiCheck, FiAlertCircle } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

const EditUserModal = ({ user, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'user',
    isActive: true,
    emailVerified: false,
    phoneNumber: '',
    bio: '',
    gender: '',
    country: '',
    city: '',
    occupation: '',
    education: '',
    languages: [],
    accountType: 'basic',
    privacySettings: {
      profileVisibility: 'public',
      showEmail: false,
      showPhone: false,
      showLocation: true,
      showLastSeen: true
    },
    picture: '',
    dateOfBirth: '',
    rating: 0,
    responseRate: 0,
    responseTime: 0,
    completedOrders: 0
  });

  const [loading, setLoading] = useState(false);
  const [newLanguage, setNewLanguage] = useState('');
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  useEffect(() => {
    if (user) {
      console.log('[EDIT USER MODAL] Initial user data:', user);
      
      // Map user data to form fields
      const userData = {
        name: user.name || '',
        email: user.email || '',
        role: user.role || 'user',
        isActive: user.isActive ?? true,
        emailVerified: user.emailVerified ?? false,
        phoneNumber: user.phoneNumber || '',
        bio: user.bio || '',
        gender: user.gender || '',
        country: user.country || '',
        city: user.city || '',
        occupation: user.occupation || '',
        education: user.education || '',
        languages: Array.isArray(user.languages) ? user.languages : 
                  (user.languages ? [user.languages] : []),
        accountType: user.accountType || 'basic',
        privacySettings: user.privacySettings || {
          profileVisibility: 'public',
          showEmail: false,
          showPhone: false,
          showLocation: true,
          showLastSeen: true
        },
        picture: user.picture || '',
        dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '',
        rating: user.rating || 0,
        responseRate: user.responseRate || 0,
        responseTime: user.responseTime || 0,
        completedOrders: user.completedOrders || 0
      };

      setFormData(userData);
    }
  }, [user]);

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field, formData[field]);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    console.log('[EDIT USER MODAL] Field change:', { name, value, type, checked });
    
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
        [name]: type === 'checkbox' ? checked : 
                type === 'number' ? parseFloat(value) || 0 :
                type === 'date' ? value :
                value
      }));
      
      // Validate on change for specific fields
      if (['name', 'email', 'phoneNumber'].includes(name)) {
        validateField(name, value);
      }
    }
  };

  const validateField = (field, value) => {
    let error = '';
    
    switch (field) {
      case 'name':
        if (!value.trim()) {
          error = 'Name is required';
        } else if (value.trim().length < 2) {
          error = 'Name must be at least 2 characters';
        } else if (value.trim().length > 50) {
          error = 'Name cannot exceed 50 characters';
        }
        break;
        
      case 'email':
        if (!value.trim()) {
          error = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          error = 'Invalid email format';
        }
        break;
        
      case 'phoneNumber':
        if (value && value.trim() !== '') {
          const phoneRegex = /^\+[\d\s\-\(\)\.]+$/;
          const cleanPhone = value.replace(/[\s\-\(\)\.]/g, '');
          if (!phoneRegex.test(value) || cleanPhone.length < 8 || cleanPhone.length > 16) {
            error = 'Phone number should start with + and have 7-15 digits (e.g., +15551234567)';
          }
        }
        break;
        
      case 'dateOfBirth':
        if (value) {
          const dob = new Date(value);
          const today = new Date();
          const age = today.getFullYear() - dob.getFullYear();
          const monthDiff = today.getMonth() - dob.getMonth();
          const adjustedAge = (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) ? age - 1 : age;
          
          if (adjustedAge < 13 || adjustedAge > 120) {
            error = 'Age must be between 13 and 120 years';
          }
        }
        break;
        
      case 'bio':
        if (value && value.length > 500) {
          error = 'Bio cannot exceed 500 characters';
        }
        break;
        
      case 'rating':
        if (value < 0 || value > 5) {
          error = 'Rating must be between 0 and 5';
        }
        break;
        
      case 'responseRate':
        if (value < 0 || value > 100) {
          error = 'Response rate must be between 0 and 100';
        }
        break;
        
      case 'responseTime':
        if (value < 0) {
          error = 'Response time cannot be negative';
        }
        break;
        
      case 'completedOrders':
        if (value < 0) {
          error = 'Completed orders cannot be negative';
        }
        break;
    }
    
    if (error) {
      setErrors(prev => ({ ...prev, [field]: error }));
    }
    
    return !error;
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Validate required fields
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    // Validate phone number
    if (formData.phoneNumber && formData.phoneNumber.trim() !== '') {
      const phoneRegex = /^\+[\d\s\-\(\)\.]+$/;
      const cleanPhone = formData.phoneNumber.replace(/[\s\-\(\)\.]/g, '');
      if (!phoneRegex.test(formData.phoneNumber) || cleanPhone.length < 8 || cleanPhone.length > 16) {
        newErrors.phoneNumber = 'Invalid phone number format. Use format: +1234567890';
      }
    }
    
    // Validate date of birth
    if (formData.dateOfBirth) {
      const dob = new Date(formData.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      const adjustedAge = (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) ? age - 1 : age;
      
      if (adjustedAge < 13 || adjustedAge > 120) {
        newErrors.dateOfBirth = 'Age must be between 13 and 120 years';
      }
    }
    
    // Validate numeric fields
    if (formData.rating < 0 || formData.rating > 5) {
      newErrors.rating = 'Rating must be between 0 and 5';
    }
    
    if (formData.responseRate < 0 || formData.responseRate > 100) {
      newErrors.responseRate = 'Response rate must be between 0 and 100';
    }
    
    if (formData.responseTime < 0) {
      newErrors.responseTime = 'Response time cannot be negative';
    }
    
    if (formData.completedOrders < 0) {
      newErrors.completedOrders = 'Completed orders cannot be negative';
    }
    
    // Validate URL fields
    if (formData.picture && !/^https?:\/\/.+/.test(formData.picture)) {
      newErrors.picture = 'Please enter a valid URL starting with http:// or https://';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddLanguage = () => {
    if (newLanguage.trim() && !formData.languages.includes(newLanguage.trim())) {
      if (newLanguage.trim().length > 50) {
        toast.error('Language name cannot exceed 50 characters');
        return;
      }
      
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Mark all fields as touched
    const allFields = Object.keys(formData);
    const touchedFields = {};
    allFields.forEach(field => {
      touchedFields[field] = true;
    });
    setTouched(touchedFields);
    
    if (!validateForm()) {
      toast.error('Please fix validation errors');
      return;
    }
    
    setLoading(true);
    try {
      // Prepare data for submission according to user model
      const submitData = { 
        ...formData,
        // Ensure empty strings are converted appropriately
        phoneNumber: formData.phoneNumber?.trim() || '',
        bio: formData.bio?.trim() || '',
        gender: formData.gender || '',
        country: formData.country?.trim() || '',
        city: formData.city?.trim() || '',
        occupation: formData.occupation?.trim() || '',
        education: formData.education?.trim() || '',
        picture: formData.picture?.trim() || null,
        languages: formData.languages.length > 0 ? formData.languages : [],
        // Convert date format
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth) : null,
        // Ensure numeric values
        rating: parseFloat(formData.rating) || 0,
        responseRate: parseFloat(formData.responseRate) || 0,
        responseTime: parseFloat(formData.responseTime) || 0,
        completedOrders: parseInt(formData.completedOrders) || 0
      };
      
      console.log('[EDIT USER MODAL] Submitting data:', submitData);
      await onSave(submitData);
    } catch (error) {
      console.error('[EDIT USER MODAL] Error in handleSubmit:', error);
      
      // Handle validation errors from backend
      if (error.response?.data?.errors) {
        const backendErrors = {};
        error.response.data.errors.forEach(err => {
          // Extract field name from error message
          const fieldMatch = err.match(/`(.+?)`/);
          if (fieldMatch) {
            backendErrors[fieldMatch[1]] = err;
          }
        });
        setErrors(backendErrors);
        toast.error('Please fix validation errors');
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to save changes');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderField = (label, name, type = 'text', placeholder = '', options = []) => {
    const hasError = errors[name] && touched[name];
    
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
            onBlur={() => handleBlur(name)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
              hasError ? 'border-red-500' : 'border-gray-300'
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
            onBlur={() => handleBlur(name)}
            rows={3}
            placeholder={placeholder}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
              hasError ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        ) : type === 'checkbox' ? (
          <div className="flex items-center">
            <input
              type="checkbox"
              name={name}
              checked={formData[name]}
              onChange={handleChange}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Yes</span>
          </div>
        ) : type === 'date' ? (
          <input
            type={type}
            name={name}
            value={formData[name]}
            onChange={handleChange}
            onBlur={() => handleBlur(name)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
              hasError ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        ) : (
          <input
            type={type}
            name={name}
            value={formData[name]}
            onChange={handleChange}
            onBlur={() => handleBlur(name)}
            placeholder={placeholder}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
              hasError ? 'border-red-500' : 'border-gray-300'
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
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Edit User</h3>
            <p className="text-sm text-gray-500">Editing: {user?.name || user?.email}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
            disabled={loading}
          >
            <FiX className="h-6 w-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {renderField('Full Name *', 'name', 'text', 'Enter full name')}
            {renderField('Email *', 'email', 'email', 'user@example.com')}
            
            {renderField('Role *', 'role', 'select', '', [
              { value: 'user', label: 'User' },
              { value: 'seller', label: 'Seller' },
              { value: 'buyer', label: 'Buyer' },
              { value: 'admin', label: 'Admin' }
            ])}
            
            {renderField('Account Type', 'accountType', 'select', '', [
              { value: 'basic', label: 'Basic' },
              { value: 'premium', label: 'Premium' },
              { value: 'business', label: 'Business' }
            ])}
            
            {renderField('Phone Number', 'phoneNumber', 'tel', '+1234567890')}
            {renderField('Date of Birth', 'dateOfBirth', 'date')}
            {renderField('Country', 'country', 'text', 'Country')}
            {renderField('City', 'city', 'text', 'City')}
            {renderField('Gender', 'gender', 'select', '', [
              { value: '', label: 'Select Gender' },
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
              { value: 'other', label: 'Other' },
              { value: 'prefer-not-to-say', label: 'Prefer not to say' }
            ])}
            {renderField('Occupation', 'occupation', 'text', 'Occupation')}
            {renderField('Education', 'education', 'text', 'Education')}
            {renderField('Profile Picture URL', 'picture', 'url', 'https://example.com/profile.jpg')}
          </div>

          {/* Bio */}
          <div className="mb-6">
            {renderField('Bio', 'bio', 'textarea', 'Tell us about yourself...')}
            <p className="text-xs text-gray-500 mt-1">
              {formData.bio.length}/500 characters
            </p>
          </div>

          {/* Languages */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Languages
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {Array.isArray(formData.languages) && formData.languages.map((lang, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                >
                  {lang}
                  <button
                    type="button"
                    onClick={() => handleRemoveLanguage(index)}
                    className="ml-1.5 text-indigo-600 hover:text-indigo-800"
                    disabled={loading}
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
                disabled={loading}
              />
              <button
                type="button"
                onClick={handleAddLanguage}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                disabled={loading}
              >
                Add
              </button>
            </div>
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {renderField('Rating (0-5)', 'rating', 'number', '0')}
            {renderField('Response Rate %', 'responseRate', 'number', '0')}
            {renderField('Response Time (hours)', 'responseTime', 'number', '0')}
            {renderField('Completed Orders', 'completedOrders', 'number', '0')}
          </div>

          {/* Status Checkboxes */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Status
              </label>
              <div className="space-y-2">
                {renderField('Active Account', 'isActive', 'checkbox')}
                {renderField('Email Verified', 'emailVerified', 'checkbox')}
              </div>
            </div>

            {/* Privacy Settings */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Privacy Settings
              </label>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Profile Visibility</label>
                  <select
                    name="privacySettings.profileVisibility"
                    value={formData.privacySettings?.profileVisibility || 'public'}
                    onChange={handleChange}
                    className="w-full px-3 py-1 text-sm border border-gray-300 rounded"
                  >
                    <option value="public">Public</option>
                    <option value="registered">Registered Users Only</option>
                    <option value="private">Private</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {renderField('Show Email', 'privacySettings.showEmail', 'checkbox')}
                  {renderField('Show Phone', 'privacySettings.showPhone', 'checkbox')}
                  {renderField('Show Location', 'privacySettings.showLocation', 'checkbox')}
                  {renderField('Show Last Seen', 'privacySettings.showLastSeen', 'checkbox')}
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
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <FiCheck className="h-4 w-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUserModal;