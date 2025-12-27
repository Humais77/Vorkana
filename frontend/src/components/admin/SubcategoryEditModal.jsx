// components/admin/modals/SubcategoryEditModal.jsx
import React, { useState, useEffect, useCallback, memo } from 'react';
import { FiX, FiFolder, FiInfo, FiAlertCircle, FiSave, FiChevronDown } from 'react-icons/fi';

// Validation rules
const validationRules = {
  name: (value) => {
    if (!value.trim()) return 'Subcategory name is required';
    if (value.length < 2) return 'Subcategory name must be at least 2 characters';
    if (value.length > 50) return 'Subcategory name cannot exceed 50 characters';
    return null;
  },
  category: (value) => {
    if (!value) return 'Parent category is required';
    return null;
  },
  description: (value) => {
    if (value.length > 500) return 'Description cannot exceed 500 characters';
    return null;
  },
  slug: (value) => {
    if (!value) return 'Slug is required';
    if (!/^[a-z0-9-]+$/.test(value)) {
      return 'Slug can only contain lowercase letters, numbers, and hyphens';
    }
    return null;
  },
  order: (value) => {
    const num = parseInt(value, 10);
    if (num < 0 || num > 1000) return 'Order must be between 0 and 1000';
    return null;
  },
  icon: (value) => {
    if (value && value.length > 50) return 'Icon text is too long';
    return null;
  }
};

// Initial form state
const initialFormData = {
  name: '',
  description: '',
  category: '',
  order: 0,
  isActive: true,
  metaTitle: '',
  metaDescription: '',
  slug: '',
  icon: '📁',
  version: 1
};

const SubcategoryEditModal = memo(({ 
  subcategory, 
  isOpen, 
  onClose, 
  onSubmit, 
  loading = false,
  categories = []
}) => {
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [originalSlug, setOriginalSlug] = useState('');

  // Initialize form with subcategory data
  useEffect(() => {
    if (subcategory) {
      const data = {
        name: subcategory.name || '',
        description: subcategory.description || '',
        category: subcategory.category?._id || subcategory.category || '',
        order: subcategory.order || 0,
        isActive: subcategory.isActive !== false,
        metaTitle: subcategory.metaTitle || '',
        metaDescription: subcategory.metaDescription || '',
        slug: subcategory.slug || '',
        icon: subcategory.icon || '📁',
        version: subcategory.version || 1
      };
      
      setFormData(data);
      setOriginalSlug(subcategory.slug || '');
      setErrors({});
    }
  }, [subcategory]);

  // Validate a single field
  const validateField = useCallback((name, value) => {
    const validator = validationRules[name];
    return validator ? validator(value) : null;
  }, []);

  // Handle form field changes
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));
    
    // Validate field if it has validation rules
    if (validationRules[name]) {
      const error = validateField(name, newValue);
      setErrors(prev => ({
        ...prev,
        [name]: error
      }));
    }
  }, [validateField]);

  // Validate entire form
  const validateForm = useCallback(() => {
    const newErrors = {};
    
    // Validate each field with rules
    Object.keys(validationRules).forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) newErrors[field] = error;
    });
    
    return newErrors;
  }, [formData, validateField]);

  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      
      // Scroll to first error
      const firstError = Object.keys(validationErrors)[0];
      const element = document.querySelector(`[name="${firstError}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.focus();
      }
      
      return;
    }
    
    try {
      const submitData = {
        ...formData,
      };
      
   await onSubmit(submitData);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  }, [formData, subcategory, validateForm, onSubmit]);

  // Reset and close modal
  const handleClose = useCallback(() => {
    setFormData(initialFormData);
    setErrors({});
    setOriginalSlug('');
    onClose();
  }, [onClose]);

  // Don't render if not open or no subcategory
  if (!isOpen || !subcategory) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <FiFolder className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Edit Subcategory</h3>
                <p className="text-sm text-gray-500">{subcategory.name}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <FiX className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Version Info */}
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center text-sm text-blue-800">
              <FiInfo className="h-4 w-4 mr-2 flex-shrink-0" />
              <div>
                <span className="font-medium">Version {formData.version}</span>
                <span className="mx-2">•</span>
                <span>Last updated: {new Date(subcategory.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="mb-8">
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
              Basic Information
            </h4>
            
            <div className="space-y-6">
              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Subcategory Name *
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.name && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center">
                    <FiAlertCircle className="h-4 w-4 mr-1" />
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Category Selection */}
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                  Parent Category *
                </label>
                <div className="relative">
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none transition-colors ${
                      errors.category ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select a category</option>
                    {categories.map(category => (
                      <option key={category._id} value={category._id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <FiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 pointer-events-none" />
                </div>
                {errors.category && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center">
                    <FiAlertCircle className="h-4 w-4 mr-1" />
                    {errors.category}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                    errors.description ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                <div className="flex justify-between mt-1.5">
                  {errors.description ? (
                    <p className="text-sm text-red-600 flex items-center">
                      <FiAlertCircle className="h-4 w-4 mr-1" />
                      {errors.description}
                    </p>
                  ) : (
                    <div></div>
                  )}
                  <p className="text-sm text-gray-500">
                    {formData.description.length}/500 characters
                  </p>
                </div>
              </div>

              {/* Icon and Order */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="icon" className="block text-sm font-medium text-gray-700 mb-2">
                    Icon
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      id="icon"
                      name="icon"
                      type="text"
                      value={formData.icon}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                        errors.icon ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    <div className="text-2xl flex-shrink-0">
                      {formData.icon || '📁'}
                    </div>
                  </div>
                  {errors.icon && (
                    <p className="mt-1.5 text-sm text-red-600 flex items-center">
                      <FiAlertCircle className="h-4 w-4 mr-1" />
                      {errors.icon}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="order" className="block text-sm font-medium text-gray-700 mb-2">
                    Display Order
                  </label>
                  <input
                    id="order"
                    name="order"
                    type="number"
                    value={formData.order}
                    onChange={handleChange}
                    min="0"
                    max="1000"
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                      errors.order ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.order && (
                    <p className="mt-1.5 text-sm text-red-600 flex items-center">
                      <FiAlertCircle className="h-4 w-4 mr-1" />
                      {errors.order}
                    </p>
                  )}
                </div>
              </div>

              {/* Slug */}
              <div>
                <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-2">
                  URL Slug *
                </label>
                <input
                  id="slug"
                  name="slug"
                  type="text"
                  value={formData.slug}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                    errors.slug ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.slug && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center">
                    <FiAlertCircle className="h-4 w-4 mr-1" />
                    {errors.slug}
                  </p>
                )}
                {originalSlug !== formData.slug && (
                  <p className="mt-1.5 text-xs text-amber-600">
                    Warning: Changing the slug may affect existing links.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="mb-8">
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
              Status
            </h4>
            
            <div className="space-y-4">
              <label className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 mt-0.5"
                />
                <div>
                  <span className="font-medium text-gray-900">Active</span>
                  <p className="text-sm text-gray-500 mt-1">
                    Active subcategories are visible to users. Inactive subcategories are hidden.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* SEO Information */}
          <div className="mb-8">
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
              SEO Information (Optional)
            </h4>
            
            <div className="space-y-6">
              <div>
                <label htmlFor="metaTitle" className="block text-sm font-medium text-gray-700 mb-2">
                  Meta Title
                </label>
                <input
                  id="metaTitle"
                  name="metaTitle"
                  type="text"
                  value={formData.metaTitle}
                  onChange={handleChange}
                  maxLength="60"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <p className="mt-1.5 text-xs text-gray-500">
                  {formData.metaTitle.length}/60 characters
                </p>
              </div>
              
              <div>
                <label htmlFor="metaDescription" className="block text-sm font-medium text-gray-700 mb-2">
                  Meta Description
                </label>
                <textarea
                  id="metaDescription"
                  name="metaDescription"
                  value={formData.metaDescription}
                  onChange={handleChange}
                  rows={2}
                  maxLength="160"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <p className="mt-1.5 text-xs text-gray-500">
                  {formData.metaDescription.length}/160 characters
                </p>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <FiInfo className="h-4 w-4" />
              <span>Fields marked with * are required</span>
            </div>
            
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <FiSave className="h-4 w-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
});

SubcategoryEditModal.displayName = 'SubcategoryEditModal';

export default SubcategoryEditModal;