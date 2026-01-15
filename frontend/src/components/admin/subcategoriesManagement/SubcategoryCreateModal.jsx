// SubcategoryCreateModal.jsx - UPDATED
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FiX, FiFolder, FiInfo, FiAlertCircle, FiPlus, FiChevronDown } from 'react-icons/fi';

const SubcategoryCreateModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  loading = false, 
  categories = [],
  error: backendError
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    order: 0,
    isActive: true,
    metaTitle: '',
    metaDescription: '',
    slug: '',
    icon: '📁'
  });

  const [errors, setErrors] = useState({});
  const [backendErrors, setBackendErrors] = useState({});
  const [generateSlug, setGenerateSlug] = useState(true);
  const formRef = useRef(null);
  const nameInputRef = useRef(null);

  // Handle backend errors
  useEffect(() => {
    if (backendError) {
      if (backendError.response?.data?.errors) {
        // Handle validation errors from backend
        const validationErrors = backendError.response.data.errors.reduce((acc, error) => {
          const fieldMatch = error.match(/`([^`]+)`/);
          if (fieldMatch) {
            const field = fieldMatch[1].toLowerCase();
            acc[field] = error;
          } else {
            acc.general = error;
          }
          return acc;
        }, {});
        setBackendErrors(validationErrors);
      } else if (backendError.response?.data?.message) {
        // Handle general error message
        setBackendErrors({ general: backendError.response.data.message });
      } else {
        setBackendErrors({ general: 'Failed to create subcategory' });
      }
    } else {
      setBackendErrors({});
    }
  }, [backendError]);

  // Auto-focus on name input when modal opens
  useEffect(() => {
    if (isOpen && nameInputRef.current) {
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Debounced slug generation
  useEffect(() => {
    if (generateSlug && formData.name) {
      const timer = setTimeout(() => {
        const slug = formData.name
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '');
        setFormData(prev => ({ ...prev, slug }));
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [formData.name, generateSlug]);

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

  const validateField = useCallback((name, value) => {
    const validator = validationRules[name];
    return validator ? validator(value) : null;
  }, []);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));
    
    // Clear backend errors for this field
    if (backendErrors[name]) {
      setBackendErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    
    // Validate field if it has validation rules
    if (validationRules[name]) {
      const error = validateField(name, newValue);
      setErrors(prev => ({
        ...prev,
        [name]: error
      }));
    }
  }, [validateField, backendErrors]);

  const validateForm = useCallback(() => {
    const newErrors = {};
    
    // Validate each field with rules
    Object.keys(validationRules).forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) newErrors[field] = error;
    });
    
    return newErrors;
  }, [formData, validateField]);

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
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
      // Error handling is done in the useEffect above
    }
  }, [formData, validateForm, onSubmit]);

  const handleClose = useCallback(() => {
    setFormData({
      name: '',
      description: '',
      category: '',
      order: 0,
      isActive: true,
      metaTitle: '',
      metaDescription: '',
      slug: '',
      icon: '📁'
    });
    setErrors({});
    setBackendErrors({});
    onClose();
  }, [onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div 
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <FiFolder className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Create New Subcategory</h3>
                <p className="text-sm text-gray-500">Add a new subcategory to organize content</p>
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

        {/* Backend Error Alert */}
        {backendErrors.general && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <FiAlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">{backendErrors.general}</p>
                {Object.keys(backendErrors).filter(k => k !== 'general').map(key => (
                  <p key={key} className="text-sm text-red-700 mt-1">
                    {backendErrors[key]}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        <form ref={formRef} onSubmit={handleSubmit} className="p-6">
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
                  ref={nameInputRef}
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                    errors.name || backendErrors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Frontend Development"
                  autoComplete="off"
                />
                {errors.name && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center">
                    <FiAlertCircle className="h-4 w-4 mr-1" />
                    {errors.name}
                  </p>
                )}
                {backendErrors.name && !errors.name && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center">
                    <FiAlertCircle className="h-4 w-4 mr-1" />
                    {backendErrors.name}
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
                      errors.category || backendErrors.category ? 'border-red-300' : 'border-gray-300'
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
                {backendErrors.category && !errors.category && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center">
                    <FiAlertCircle className="h-4 w-4 mr-1" />
                    {backendErrors.category}
                  </p>
                )}
                {formData.category && categories.find(c => c._id === formData.category)?.subcategories?.length > 0 && (
                  <p className="mt-1.5 text-xs text-blue-600">
                    This category already has {categories.find(c => c._id === formData.category)?.subcategories?.length} subcategories
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
                    errors.description || backendErrors.description ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Describe what this subcategory is about..."
                  autoComplete="off"
                />
                <div className="flex justify-between mt-1.5">
                  {errors.description && (
                    <p className="text-sm text-red-600 flex items-center">
                      <FiAlertCircle className="h-4 w-4 mr-1" />
                      {errors.description}
                    </p>
                  )}
                  {backendErrors.description && !errors.description && (
                    <p className="text-sm text-red-600 flex items-center">
                      <FiAlertCircle className="h-4 w-4 mr-1" />
                      {backendErrors.description}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 ml-auto">
                    {formData.description.length}/500 characters
                  </p>
                </div>
              </div>

              {/* Icon and Order */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="icon" className="block text-sm font-medium text-gray-700 mb-2">
                    Icon (Optional)
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      id="icon"
                      name="icon"
                      type="text"
                      value={formData.icon}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                        errors.icon || backendErrors.icon ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="📁, 🔧, ✨, etc."
                      autoComplete="off"
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
                  {backendErrors.icon && !errors.icon && (
                    <p className="mt-1.5 text-sm text-red-600 flex items-center">
                      <FiAlertCircle className="h-4 w-4 mr-1" />
                      {backendErrors.icon}
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
                      errors.order || backendErrors.order ? 'border-red-300' : 'border-gray-300'
                    }`}
                    autoComplete="off"
                  />
                  {errors.order && (
                    <p className="mt-1.5 text-sm text-red-600 flex items-center">
                      <FiAlertCircle className="h-4 w-4 mr-1" />
                      {errors.order}
                    </p>
                  )}
                  {backendErrors.order && !errors.order && (
                    <p className="mt-1.5 text-sm text-red-600 flex items-center">
                      <FiAlertCircle className="h-4 w-4 mr-1" />
                      {backendErrors.order}
                    </p>
                  )}
                </div>
              </div>

              {/* Slug */}
              <div>
                <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-2">
                  URL Slug *
                </label>
                <div className="flex space-x-3">
                  <div className="flex-1">
                    <input
                      id="slug"
                      name="slug"
                      type="text"
                      value={formData.slug}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                        errors.slug || backendErrors.slug ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="frontend-development"
                      autoComplete="off"
                    />
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={generateSlug}
                        onChange={(e) => setGenerateSlug(e.target.checked)}
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-600">Auto</span>
                    </label>
                  </div>
                </div>
                {errors.slug && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center">
                    <FiAlertCircle className="h-4 w-4 mr-1" />
                    {errors.slug}
                  </p>
                )}
                {backendErrors.slug && !errors.slug && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center">
                    <FiAlertCircle className="h-4 w-4 mr-1" />
                    {backendErrors.slug}
                  </p>
                )}
                <p className="mt-1.5 text-xs text-gray-500">
                  This will be used in URLs. Use lowercase letters, numbers, and hyphens only.
                </p>
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
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                    backendErrors.metaTitle ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Title for search engines (max 60 characters)"
                  autoComplete="off"
                />
                {backendErrors.metaTitle && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center">
                    <FiAlertCircle className="h-4 w-4 mr-1" />
                    {backendErrors.metaTitle}
                  </p>
                )}
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
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                    backendErrors.metaDescription ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Description for search engines (max 160 characters)"
                  autoComplete="off"
                />
                {backendErrors.metaDescription && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center">
                    <FiAlertCircle className="h-4 w-4 mr-1" />
                    {backendErrors.metaDescription}
                  </p>
                )}
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
                disabled={loading}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
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
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <FiPlus className="h-4 w-4" />
                    <span>Create Subcategory</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default React.memo(SubcategoryCreateModal);