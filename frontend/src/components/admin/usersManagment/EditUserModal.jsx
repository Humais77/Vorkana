import { useState, useEffect } from 'react';
import { FiX, FiCheck, FiAlertCircle, FiEye, FiEyeOff, FiPlus, FiTrash2 } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

// Reusable Form Field Components
const FormInput = ({ label, name, type = 'text', placeholder = '', value, onChange, onBlur, error, touched, required = false, options = [], disabled = false }) => {
  const [showPassword, setShowPassword] = useState(false);
  const hasError = error && touched;

  const renderInput = () => {
    switch (type) {
      case 'select':
        return (
          <select
            name={name}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            disabled={disabled}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
              hasError ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
            } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          >
            {options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'textarea':
        return (
          <textarea
            name={name}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            rows={3}
            placeholder={placeholder}
            disabled={disabled}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
              hasError ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
            } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
        );

      case 'checkbox':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              name={name}
              checked={value}
              onChange={onChange}
              disabled={disabled}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded transition-colors disabled:opacity-50"
            />
            <span className="ml-2 text-sm text-gray-700">Yes</span>
          </div>
        );

      case 'password':
        return (
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              name={name}
              value={value}
              onChange={onChange}
              onBlur={onBlur}
              placeholder={placeholder}
              disabled={disabled}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors pr-10 ${
                hasError ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
              } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
              disabled={disabled}
            >
              {showPassword ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>
        );

      case 'range':
        return (
          <div className="space-y-2">
            <input
              type="range"
              name={name}
              value={value}
              onChange={onChange}
              onBlur={onBlur}
              disabled={disabled}
              className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer ${
                disabled ? 'cursor-not-allowed opacity-50' : ''
              }`}
            />
            <div className="text-center text-sm font-medium text-gray-600">
              {value}
            </div>
          </div>
        );

      default:
        return (
          <input
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            placeholder={placeholder}
            disabled={disabled}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
              hasError ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
            } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
        );
    }
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && type !== 'checkbox' && <span className="text-red-500">*</span>}
      </label>
      
      {renderInput()}
      
      {hasError && (
        <p className="mt-1 text-sm text-red-600 flex items-center animate-pulse">
          <FiAlertCircle className="h-4 w-4 mr-1" />
          {error}
        </p>
      )}
    </div>
  );
};

// Section Component
const FormSection = ({ title, description, children, className = '' }) => (
  <div className={`mb-6 ${className}`}>
    <h4 className="text-sm font-medium text-gray-900 mb-4">
      {title}
      {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
    </h4>
    {children}
  </div>
);

// Language Input Component
const LanguageInput = ({ languages, onAddLanguage, onRemoveLanguage, newLanguage, setNewLanguage }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      Languages
    </label>
    
    {languages.length > 0 && (
      <div className="flex flex-wrap gap-2 mb-3">
        {languages.map((lang, index) => (
          <div
            key={index}
            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-indigo-100 text-indigo-800 border border-indigo-200 hover:bg-indigo-50 transition-colors"
          >
            <span>{lang}</span>
            <button
              type="button"
              onClick={() => onRemoveLanguage(index)}
              className="ml-2 text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <FiX className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    )}
    
    <div className="flex gap-2">
      <input
        type="text"
        value={newLanguage}
        onChange={(e) => setNewLanguage(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), onAddLanguage())}
        placeholder="Add a language (press Enter)"
        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
      <button
        type="button"
        onClick={onAddLanguage}
        disabled={!newLanguage.trim()}
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
      >
        <FiPlus className="h-4 w-4 mr-1" />
        Add
      </button>
    </div>
  </div>
);

// Privacy Settings Component
const PrivacySettings = ({ settings, onChange }) => (
  <div className="space-y-3">
    <div>
      <label className="block text-xs text-gray-700 mb-1">Profile Visibility</label>
      <select
        name="privacySettings.profileVisibility"
        value={settings.profileVisibility || 'public'}
        onChange={onChange}
        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded bg-white hover:border-gray-400 transition-colors"
      >
        <option value="public">Public</option>
        <option value="registered">Registered Users Only</option>
        <option value="private">Private</option>
      </select>
    </div>
    
    <div className="space-y-2">
      <label className="flex items-center cursor-pointer">
        <input
          type="checkbox"
          name="privacySettings.showEmail"
          checked={settings.showEmail || false}
          onChange={onChange}
          className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
        />
        <span className="ml-2 text-sm text-gray-700">Show Email</span>
      </label>
      
      <label className="flex items-center cursor-pointer">
        <input
          type="checkbox"
          name="privacySettings.showPhone"
          checked={settings.showPhone || false}
          onChange={onChange}
          className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
        />
        <span className="ml-2 text-sm text-gray-700">Show Phone</span>
      </label>
    </div>
  </div>
);

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
  const [showPreviewUrl, setPreviewUrl] = useState('');
  const [initialData, setInitialData] = useState(null);

  useEffect(() => {
    if (user) {
      console.log('[EDIT USER MODAL] Initializing with user:', user);
      
      const userData = {
        // Basic info
        name: user.name || '',
        email: user.email || '',
        role: user.role || 'user',
        
        // Account status
        isActive: user.isActive ?? true,
        emailVerified: user.emailVerified ?? false,
        
        // Contact info - ALWAYS SHOW FOR ADMIN
        phoneNumber: user.phoneNumber || '',
        country: user.country || '',
        city: user.city || '',
        
        // Personal info
        bio: user.bio || '',
        gender: user.gender || '',
        dateOfBirth: user.dateOfBirth ? 
          (typeof user.dateOfBirth === 'string' ? 
            user.dateOfBirth.split('T')[0] : 
            new Date(user.dateOfBirth).toISOString().split('T')[0]) : '',
        
        // Professional info
        occupation: user.occupation || '',
        education: user.education || '',
        languages: Array.isArray(user.languages) ? user.languages : 
                  (user.languages ? [user.languages] : []),
        
        // Account settings
        accountType: user.accountType || 'basic',
        picture: user.picture || '',
        
        // Stats
        rating: user.rating || 0,
        responseRate: user.responseRate || 0,
        responseTime: user.responseTime || 0,
        completedOrders: user.completedOrders || 0,
        
        // Privacy settings
        privacySettings: user.privacySettings || {
          profileVisibility: 'public',
          showEmail: true,
          showPhone: true,
          showLocation: true,
          showLastSeen: true
        }
      };

      console.log('[EDIT USER MODAL] Prepared user data:', userData);
      setFormData(userData);
      setInitialData(userData);
      
      // Set preview URL
      if (user.picture && /^https?:\/\/.+/.test(user.picture)) {
        setPreviewUrl(user.picture);
      } else {
        setPreviewUrl('');
      }
    }
  }, [user]);

  // Check if form has changes
  const hasChanges = () => {
    if (!initialData) return false;
    
    // Deep comparison (simplified version)
    return JSON.stringify(formData) !== JSON.stringify(initialData);
  };

  // SIMPLIFIED VALIDATION - only validate required fields
  const validateEmail = (email) => {
    if (!email || email.trim() === '') {
      return 'Email is required';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return 'Invalid email format';
    }
    return '';
  };

  // SIMPLIFIED PHONE VALIDATION - accept more formats
  const validatePhone = (phone) => {
    if (!phone || phone.trim() === '') {
      return ''; // Phone is optional
    }
    
    // More permissive phone validation
    const phoneStr = phone.trim();
    const phoneRegex = /^[\+]?[0-9\s\-\(\)\.]{8,16}$/;
    
    if (!phoneRegex.test(phoneStr)) {
      return 'Phone number should be 8-16 digits and may include +, spaces, dashes, parentheses';
    }
    
    return '';
  };

  // SIMPLIFIED HANDLERS
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Clear error for this field when user starts typing
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[name];
      return newErrors;
    });
    
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
                type === 'number' ? (value === '' ? '' : parseFloat(value) || 0) :
                type === 'date' ? value :
                value
      }));
    }
    
    // Mark field as touched
    setTouched(prev => ({ ...prev, [name]: true }));
  };

  const handleBlur = (field, value) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    
    // Only validate if field is touched and has value
    let error = '';
    
    switch (field) {
      case 'email':
        error = validateEmail(value || formData.email);
        break;
      case 'phoneNumber':
        error = validatePhone(value || formData.phoneNumber);
        break;
      case 'dateOfBirth':
        if (value || formData.dateOfBirth) {
          const dob = new Date(value || formData.dateOfBirth);
          if (isNaN(dob.getTime())) {
            error = 'Invalid date';
          } else {
            const today = new Date();
            const age = today.getFullYear() - dob.getFullYear();
            if (age < 13 || age > 120) {
              error = 'Age must be between 13 and 120 years';
            }
          }
        }
        break;
    }
    
    if (error) {
      setErrors(prev => ({ ...prev, [field]: error }));
    } else {
      // Clear error if validation passes
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
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
    const newLanguages = [...formData.languages];
    newLanguages.splice(index, 1);
    setFormData(prev => ({
      ...prev,
      languages: newLanguages
    }));
  };

  // SIMPLIFIED FORM VALIDATION
  const validateForm = () => {
    const validationErrors = {};
    
    // Email validation (required)
    const emailError = validateEmail(formData.email);
    if (emailError) validationErrors.email = emailError;
    
    // Phone validation (optional)
    if (formData.phoneNumber && formData.phoneNumber.trim() !== '') {
      const phoneError = validatePhone(formData.phoneNumber);
      if (phoneError) validationErrors.phoneNumber = phoneError;
    }
    
    // Date of birth validation (optional)
    if (formData.dateOfBirth && formData.dateOfBirth.trim() !== '') {
      const dob = new Date(formData.dateOfBirth);
      if (isNaN(dob.getTime())) {
        validationErrors.dateOfBirth = 'Invalid date';
      } else {
        const today = new Date();
        const age = today.getFullYear() - dob.getFullYear();
        if (age < 13 || age > 120) {
          validationErrors.dateOfBirth = 'Age must be between 13 and 120 years';
        }
      }
    }
    
    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix validation errors');
      return;
    }
    
    // Check if there are any changes
    if (!hasChanges()) {
      toast.info('No changes detected');
      onClose();
      return;
    }
    
    setLoading(true);
    try {
      // Clean up data before sending
      const cleanData = { ...formData };
      
      // Remove empty strings for optional fields
      const optionalFields = ['phoneNumber', 'bio', 'country', 'city', 'occupation', 'education', 'picture', 'gender'];
      optionalFields.forEach(field => {
        if (cleanData[field] === '') {
          cleanData[field] = undefined;
        }
      });
      
      // Remove empty date
      if (cleanData.dateOfBirth === '') {
        cleanData.dateOfBirth = null;
      }
      
      await onSave(cleanData);
      toast.success('User updated successfully!');
      onClose();
    } catch (error) {
      console.error('[EDIT USER MODAL] Error:', error);
      
      // Show backend validation errors
      if (error.response?.data?.errors) {
        error.response.data.errors.forEach(err => {
          toast.error(err);
        });
      } else {
        const errorMessage = error.response?.data?.message || 
                            error.response?.data?.error || 
                            error.message || 
                            'Failed to update user';
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Check if save button should be enabled
  const canSave = !loading && 
                  Object.keys(errors).length === 0 && 
                  hasChanges() && 
                  formData.name.trim() !== '' && 
                  formData.email.trim() !== '';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Edit User</h3>
            <p className="text-sm text-gray-500">Editing: {user?.name || user?.email}</p>
            {!hasChanges() && (
              <p className="text-xs text-yellow-600 mt-1">No changes made yet</p>
            )}
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
          {/* Basic Information Section */}
          <FormSection title="Basic Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Full Name *"
                name="name"
                type="text"
                placeholder="Enter full name"
                value={formData.name}
                onChange={handleChange}
                onBlur={() => handleBlur('name')}
                error={errors.name}
                touched={touched.name}
                required={true}
              />
              
              <FormInput
                label="Email *"
                name="email"
                type="email"
                placeholder="user@example.com"
                value={formData.email}
                onChange={handleChange}
                onBlur={(e) => handleBlur('email', e.target.value)}
                error={errors.email}
                touched={touched.email}
                required={true}
              />
              
              <FormInput
                label="Role"
                name="role"
                type="select"
                value={formData.role}
                onChange={handleChange}
                options={[
                  { value: 'user', label: 'User' },
                  { value: 'seller', label: 'Seller' },
                  { value: 'buyer', label: 'Buyer' },
                  { value: 'admin', label: 'Admin' }
                ]}
              />
              
              <FormInput
                label="Account Type"
                name="accountType"
                type="select"
                value={formData.accountType}
                onChange={handleChange}
                options={[
                  { value: 'basic', label: 'Basic' },
                  { value: 'premium', label: 'Premium' },
                  { value: 'business', label: 'Business' }
                ]}
              />
              
              <FormInput
                label="Phone Number"
                name="phoneNumber"
                type="tel"
                placeholder="+1 234 567 8900"
                value={formData.phoneNumber}
                onChange={handleChange}
                onBlur={(e) => handleBlur('phoneNumber', e.target.value)}
                error={errors.phoneNumber}
                touched={touched.phoneNumber}
              />
              
              <FormInput
                label="Date of Birth"
                name="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={handleChange}
                onBlur={(e) => handleBlur('dateOfBirth', e.target.value)}
                error={errors.dateOfBirth}
                touched={touched.dateOfBirth}
              />
              
              <FormInput
                label="Country"
                name="country"
                type="text"
                placeholder="Country"
                value={formData.country}
                onChange={handleChange}
              />
              
              <FormInput
                label="City"
                name="city"
                type="text"
                placeholder="City"
                value={formData.city}
                onChange={handleChange}
              />
              
              <FormInput
                label="Gender"
                name="gender"
                type="select"
                value={formData.gender}
                onChange={handleChange}
                options={[
                  { value: '', label: 'Select Gender' },
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                  { value: 'other', label: 'Other' },
                  { value: 'prefer-not-to-say', label: 'Prefer not to say' }
                ]}
              />
              
              <FormInput
                label="Occupation"
                name="occupation"
                type="text"
                placeholder="Occupation"
                value={formData.occupation}
                onChange={handleChange}
              />
              
              <FormInput
                label="Education"
                name="education"
                type="text"
                placeholder="Education"
                value={formData.education}
                onChange={handleChange}
              />
            </div>
          </FormSection>

          {/* Bio Section */}
          <FormSection title="Bio" description="Tell us about yourself...">
            <FormInput
              label=""
              name="bio"
              type="textarea"
              placeholder="Tell us about yourself..."
              value={formData.bio}
              onChange={handleChange}
              error={errors.bio}
              touched={touched.bio}
            />
          </FormSection>

          {/* Languages Section */}
          <FormSection title="Languages">
            <LanguageInput
              languages={formData.languages}
              onAddLanguage={handleAddLanguage}
              onRemoveLanguage={handleRemoveLanguage}
              newLanguage={newLanguage}
              setNewLanguage={setNewLanguage}
            />
          </FormSection>

          {/* Status & Privacy Section */}
          <FormSection title="Account Settings">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h5 className="text-sm font-medium text-gray-900 mb-4">Account Status</h5>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-gray-700">Active Account</span>
                      <p className="text-xs text-gray-500">User can login if active</p>
                    </div>
                    <FormInput
                      label=""
                      name="isActive"
                      type="checkbox"
                      value={formData.isActive}
                      onChange={handleChange}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-gray-700">Email Verified</span>
                      <p className="text-xs text-gray-500">Mark email as verified</p>
                    </div>
                    <FormInput
                      label=""
                      name="emailVerified"
                      type="checkbox"
                      value={formData.emailVerified}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h5 className="text-sm font-medium text-gray-900 mb-4">Privacy Settings</h5>
                <PrivacySettings
                  settings={formData.privacySettings}
                  onChange={handleChange}
                />
              </div>
            </div>
          </FormSection>

          {/* Stats Section */}
          <FormSection title="User Statistics">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rating ({formData.rating}/5)
                </label>
                <FormInput
                  label=""
                  name="rating"
                  type="range"
                  min="0"
                  max="5"
                  step="0.5"
                  value={formData.rating}
                  onChange={handleChange}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Response Rate ({formData.responseRate}%)
                </label>
                <FormInput
                  label=""
                  name="responseRate"
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={formData.responseRate}
                  onChange={handleChange}
                />
              </div>
              
              <FormInput
                label="Response Time (hours)"
                name="responseTime"
                type="number"
                value={formData.responseTime}
                onChange={handleChange}
                min="0"
                step="0.5"
              />
              
              <FormInput
                label="Completed Orders"
                name="completedOrders"
                type="number"
                value={formData.completedOrders}
                onChange={handleChange}
                min="0"
              />
            </div>
          </FormSection>

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
              disabled={!canSave}
              className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
                canSave 
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
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
          
          {/* Debug info (remove in production) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 bg-gray-100 rounded text-xs">
              <div>Errors: {JSON.stringify(errors)}</div>
              <div>Has Changes: {hasChanges() ? 'Yes' : 'No'}</div>
              <div>Can Save: {canSave ? 'Yes' : 'No'}</div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
export default EditUserModal;