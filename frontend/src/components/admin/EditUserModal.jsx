import { useState, useEffect } from 'react';
import { FiX, FiCheck } from 'react-icons/fi';

// Updated EditUserModal.jsx - Form submission and data handling
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
    picture: ''
  });

  const [loading, setLoading] = useState(false);
  const [newLanguage, setNewLanguage] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (user) {
      console.log('[EDIT USER MODAL] Initial user data:', user);
      
      setFormData({
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
        picture: user.picture || ''
      });
    }
  }, [user]);

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
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    // Phone validation (optional)
    if (formData.phoneNumber && !/^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}$/im.test(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Invalid phone number format';
    }
    
    // Date of birth validation
    if (formData.dateOfBirth) {
      const dob = new Date(formData.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      if (age < 13 || age > 120) {
        newErrors.dateOfBirth = 'Age must be between 13 and 120 years';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('[EDIT USER MODAL] Submitting form data:', JSON.stringify(formData, null, 2));
    
    if (!validateForm()) {
      toast.error('Please fix validation errors');
      return;
    }
    
    setLoading(true);
    try {
      // Prepare data for submission
      const submitData = { ...formData };
      
      // Convert languages array to string if backend expects it
      if (Array.isArray(submitData.languages)) {
        submitData.languages = submitData.languages.join(', ');
      }
      
      // Convert privacySettings to JSON string if needed
      if (typeof submitData.privacySettings === 'object') {
        submitData.privacySettings = JSON.stringify(submitData.privacySettings);
      }
      
      console.log('[EDIT USER MODAL] Submitting to onSave:', submitData);
      await onSave(submitData);
    } catch (error) {
      console.error('[EDIT USER MODAL] Error in handleSubmit:', error);
      toast.error('Failed to save changes');
    } finally {
      setLoading(false);
    }
  };

  // Render form fields with error messages
  const renderField = (label, name, type = 'text', placeholder = '', options = []) => {
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {errors[name] && <span className="text-red-500">*</span>}
        </label>
        {type === 'select' ? (
          <select
            name={name}
            value={formData[name]}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
              errors[name] ? 'border-red-500' : 'border-gray-300'
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
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
              errors[name] ? 'border-red-500' : 'border-gray-300'
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
        ) : (
          <input
            type={type}
            name={name}
            value={formData[name]}
            onChange={handleChange}
            placeholder={placeholder}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
              errors[name] ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        )}
        {errors[name] && (
          <p className="mt-1 text-sm text-red-600">{errors[name]}</p>
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
            {renderField('Country', 'country', 'text', 'Country')}
            {renderField('City', 'city', 'text', 'City')}
            {renderField('Occupation', 'occupation', 'text', 'Occupation')}
            {renderField('Education', 'education', 'text', 'Education')}
          </div>

          {/* Bio */}
          <div className="mb-6">
            {renderField('Bio', 'bio', 'textarea', 'Tell us about yourself...')}
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
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
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