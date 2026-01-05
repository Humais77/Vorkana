// EditUserModal.jsx - Enhanced with instant updates
import { useState, useEffect, useCallback } from 'react';
import { FiX, FiCheck, FiAlertCircle, FiEye, FiEyeOff } from 'react-icons/fi';
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
  const [previewUrl, setPreviewUrl] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Initialize form data
  useEffect(() => {
    if (user) {
      console.log('[EDIT USER MODAL] Initializing with user:', user);
      
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
      setPreviewUrl(user.picture || '');
    }
  }, [user]);

  // Update preview when picture changes
  useEffect(() => {
    if (formData.picture && /^https?:\/\/.+/.test(formData.picture)) {
      setPreviewUrl(formData.picture);
    } else {
      setPreviewUrl('');
    }
  }, [formData.picture]);

  // Handle input changes with instant feedback
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
    }
    
    // Mark field as touched
    setTouched(prev => ({ ...prev, [name]: true }));
  };

  // Handle blur with validation
  const handleBlur = useCallback((field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field, formData[field]);
  }, [formData]);

  // Validate a specific field
  const validateField = useCallback((field, value) => {
    let error = '';
    
    switch (field) {
      case 'name':
        if (!value.trim()) {
          error = 'Name is required';
        } else if (value.trim().length < 2) {
          error = 'Name must be at least 2 characters';
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
            error = 'Invalid phone number format';
          }
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
    }
    
    if (error) {
      setErrors(prev => ({ ...prev, [field]: error }));
    }
    
    return !error;
  }, []);

  // Add language with instant feedback
  const handleAddLanguage = () => {
    if (newLanguage.trim() && !formData.languages.includes(newLanguage.trim())) {
      setFormData(prev => ({
        ...prev,
        languages: [...prev.languages, newLanguage.trim()]
      }));
      setNewLanguage('');
      setErrors(prev => ({ ...prev, languages: undefined }));
    }
  };

  // Remove language with instant feedback
  const handleRemoveLanguage = (index) => {
    const newLanguages = [...formData.languages];
    newLanguages.splice(index, 1);
    setFormData(prev => ({
      ...prev,
      languages: newLanguages
    }));
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all fields
    const validationErrors = {};
    Object.keys(formData).forEach(key => {
      const error = validateField(key, formData[key]);
      if (error) validationErrors[key] = error;
    });
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error('Please fix validation errors');
      return;
    }
    
    setLoading(true);
    try {
      await onSave(formData);
      toast.success('User updated successfully!');
      onClose();
    } catch (error) {
      console.error('[EDIT USER MODAL] Error:', error);
      toast.error(error.message || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  // Render form field with instant validation
  const renderField = (label, name, type = 'text', placeholder = '', options = []) => {
    const hasError = errors[name] && touched[name];
    const value = formData[name];
    
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {type !== 'checkbox' && <span className="text-red-500">*</span>}
        </label>
        
        {type === 'select' ? (
          <select
            name={name}
            value={value}
            onChange={handleChange}
            onBlur={() => handleBlur(name)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
              hasError ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
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
            value={value}
            onChange={handleChange}
            onBlur={() => handleBlur(name)}
            rows={3}
            placeholder={placeholder}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
              hasError ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
            }`}
          />
        ) : type === 'checkbox' ? (
          <div className="flex items-center">
            <input
              type="checkbox"
              name={name}
              checked={value}
              onChange={handleChange}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded transition-colors"
            />
            <span className="ml-2 text-sm text-gray-700">Yes</span>
          </div>
        ) : type === 'date' ? (
          <input
            type={type}
            name={name}
            value={value}
            onChange={handleChange}
            onBlur={() => handleBlur(name)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
              hasError ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
            }`}
          />
        ) : (
          <input
            type={type}
            name={name}
            value={value}
            onChange={handleChange}
            onBlur={() => handleBlur(name)}
            placeholder={placeholder}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
              hasError ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
            }`}
          />
        )}
        
        {hasError && (
          <p className="mt-1 text-sm text-red-600 flex items-center animate-pulse">
            <FiAlertCircle className="h-4 w-4 mr-1" />
            {errors[name]}
          </p>
        )}
      </div>
    );
  };

  // Character counter for bio
  const bioCount = formData.bio.length;

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
            className="text-gray-400 hover:text-gray-500 transition-colors"
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
            
            {/* Profile Picture with Preview */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profile Picture URL
              </label>
              <div className="flex space-x-3">
                <div className="flex-1">
                  <input
                    type="url"
                    name="picture"
                    value={formData.picture}
                    onChange={handleChange}
                    onBlur={() => handleBlur('picture')}
                    placeholder="https://example.com/profile.jpg"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                      errors.picture ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                </div>
                {previewUrl && (
                  <div className="h-10 w-10 rounded-full overflow-hidden border border-gray-300">
                    <img 
                      src={previewUrl} 
                      alt="Preview" 
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/40';
                        setErrors(prev => ({ ...prev, picture: 'Invalid image URL' }));
                      }}
                    />
                  </div>
                )}
              </div>
              {errors.picture && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <FiAlertCircle className="h-4 w-4 mr-1" />
                  {errors.picture}
                </p>
              )}
            </div>
          </div>

          {/* Bio with character counter */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bio {formData.bio && (
                <span className={`text-xs font-medium ml-2 ${
                  bioCount > 500 ? 'text-red-600' : 'text-gray-500'
                }`}>
                  {bioCount}/500 characters
                </span>
              )}
            </label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              onBlur={() => handleBlur('bio')}
              rows={3}
              placeholder="Tell us about yourself..."
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                errors.bio || bioCount > 500 ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {(errors.bio || bioCount > 500) && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <FiAlertCircle className="h-4 w-4 mr-1" />
                {errors.bio || 'Bio cannot exceed 500 characters'}
              </p>
            )}
          </div>

          {/* Languages */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Languages {formData.languages.length > 0 && (
                <span className="text-xs text-gray-500 ml-2">
                  ({formData.languages.length} added)
                </span>
              )}
            </label>
            
            {/* Current Languages */}
            {formData.languages.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.languages.map((lang, index) => (
                  <div
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-indigo-100 text-indigo-800 border border-indigo-200"
                  >
                    <span>{lang}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveLanguage(index)}
                      className="ml-2 text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      <FiX className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Add Language Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newLanguage}
                onChange={(e) => setNewLanguage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLanguage())}
                placeholder="Add a language (press Enter)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={handleAddLanguage}
                disabled={!newLanguage.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rating ({formData.rating}/5)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="range"
                  name="rating"
                  min="0"
                  max="5"
                  step="0.5"
                  value={formData.rating}
                  onChange={handleChange}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm font-medium w-8">{formData.rating}</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Response Rate ({formData.responseRate}%)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="range"
                  name="responseRate"
                  min="0"
                  max="100"
                  step="1"
                  value={formData.responseRate}
                  onChange={handleChange}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm font-medium w-12">{formData.responseRate}%</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Response Time
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  name="responseTime"
                  value={formData.responseTime}
                  onChange={handleChange}
                  min="0"
                  step="0.5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <span className="text-sm text-gray-500">hrs</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Completed Orders
              </label>
              <input
                type="number"
                name="completedOrders"
                value={formData.completedOrders}
                onChange={handleChange}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          {/* Status Toggles */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="text-sm font-medium text-gray-900">Account Status</span>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.isActive ? 'Active - User can log in' : 'Inactive - User cannot log in'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.isActive ? 'bg-green-600' : 'bg-gray-200'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.isActive ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="text-sm font-medium text-gray-900">Email Verified</span>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.emailVerified ? 'Email is verified' : 'Email needs verification'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, emailVerified: !prev.emailVerified }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.emailVerified ? 'bg-green-600' : 'bg-gray-200'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.emailVerified ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>

            {/* Privacy Settings */}
            <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900">Privacy Settings</h4>
              
              <div>
                <label className="block text-xs text-gray-700 mb-1">Profile Visibility</label>
                <select
                  name="privacySettings.profileVisibility"
                  value={formData.privacySettings?.profileVisibility || 'public'}
                  onChange={handleChange}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded bg-white"
                >
                  <option value="public">Public</option>
                  <option value="registered">Registered Users Only</option>
                  <option value="private">Private</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="privacySettings.showEmail"
                    checked={formData.privacySettings?.showEmail || false}
                    onChange={handleChange}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Show Email</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="privacySettings.showPhone"
                    checked={formData.privacySettings?.showPhone || false}
                    onChange={handleChange}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Show Phone</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="privacySettings.showLocation"
                    checked={formData.privacySettings?.showLocation ?? true}
                    onChange={handleChange}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Show Location</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="privacySettings.showLastSeen"
                    checked={formData.privacySettings?.showLastSeen ?? true}
                    onChange={handleChange}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Show Last Seen</span>
                </label>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || Object.keys(errors).length > 0}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center space-x-2 transition-colors"
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