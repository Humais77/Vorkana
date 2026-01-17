// SubcategoryEditModal.jsx - FINAL with immediate updates
import React, { useState, useEffect, useCallback, memo } from 'react';
import { 
  FiX, 
  FiFolder, 
  FiInfo, 
  FiAlertCircle, 
  FiSave,
  FiRefreshCw,
  FiLoader,
  FiAlertTriangle,
  FiChevronDown
} from 'react-icons/fi';
import { useCategoriesForDropdown } from '../../../hooks/useAdminDashboard';
import { useSubcategoryToast } from '../../../hooks/useSubcategoryToast';

// Validation rules
const validationRules = {
  name: (value) => {
    if (!value.trim()) return 'Subcategory name is required';
    if (value.length < 2) return 'Subcategory name must be at least 2 characters';
    if (value.length > 100) return 'Subcategory name cannot exceed 100 characters';
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
    if (value.length < 2) return 'Slug must be at least 2 characters';
    if (value.length > 100) return 'Slug cannot exceed 100 characters';
    return null;
  },
  order: (value) => {
    const num = parseInt(value, 10);
    if (num < 0 || num > 1000) return 'Order must be between 0 and 1000';
    return null;
  },
  metaTitle: (value) => {
    if (value.length > 60) return 'Meta title cannot exceed 60 characters';
    return null;
  },
  metaDescription: (value) => {
    if (value.length > 160) return 'Meta description cannot exceed 160 characters';
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
  error = null
}) => {
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [backendErrors, setBackendErrors] = useState({});
  const [originalSlug, setOriginalSlug] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [showUnsavedChanges, setShowUnsavedChanges] = useState(false);

  const { data: categoriesData, refetch: refetchCategories } = useCategoriesForDropdown();
  const categories = categoriesData?.data || [];

  // Use custom toast hook
  const {
    showSubcategorySuccess,
    showSubcategoryError,
    showSubcategoryInfo,
    dismissSubcategoryToast
  } = useSubcategoryToast();

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
      setBackendErrors({});
      setHasChanges(false);
      setShowUnsavedChanges(false);
    }
  }, [subcategory]);

  // Handle backend errors
  useEffect(() => {
    if (error) {
      const errorData = error.response?.data;
      if (errorData) {
        const fieldErrors = {};
        
        // Handle version conflict
        if (errorData.code === 'UPDATE_CONFLICT' || errorData.message?.includes('version')) {
          fieldErrors.version = 'This subcategory was modified by another user. Please refresh and try again.';
          showSubcategoryError('Version conflict detected. Please refresh the data.');
        }
        
        if (errorData.code === 'DUPLICATE_SUBCATEGORY') {
          fieldErrors.name = 'Subcategory with this name already exists in this category';
        }
        
        if (errorData.code === 'DUPLICATE_IN_NEW_CATEGORY') {
          fieldErrors.name = 'Subcategory with this name already exists in the new category';
        }
        
        if (errorData.code === 'DUPLICATE_SLUG') {
          fieldErrors.slug = 'Subcategory with this slug already exists';
        }
        
        if (errorData.code === 'PARENT_CATEGORY_NOT_FOUND') {
          fieldErrors.category = 'Parent category not found or inactive';
        }
        
        if (errorData.code === 'PARENT_CATEGORY_INACTIVE') {
          fieldErrors.category = 'Parent category is inactive or deleted';
        }
        
        if (errorData.code === 'VALIDATION_ERROR' && errorData.errors) {
          errorData.errors.forEach(err => {
            if (err.includes('name')) fieldErrors.name = err;
            else if (err.includes('slug')) fieldErrors.slug = err;
            else if (err.includes('description')) fieldErrors.description = err;
            else if (err.includes('order')) fieldErrors.order = err;
            else if (err.includes('category')) fieldErrors.category = err;
            else if (err.includes('metaTitle')) fieldErrors.metaTitle = err;
            else if (err.includes('metaDescription')) fieldErrors.metaDescription = err;
          });
        }
        
        if (errorData.message && !fieldErrors.version) {
          fieldErrors.general = errorData.message;
          showSubcategoryError(errorData.message);
        }
        
        setBackendErrors(fieldErrors);
        
        // Focus on first error field
        const firstError = Object.keys(fieldErrors)[0];
        if (firstError && firstError !== 'general' && firstError !== 'version') {
          const element = document.querySelector(`[name="${firstError}"]`);
          if (element) {
            setTimeout(() => {
              element.focus();
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
          }
        }
      }
    }
  }, [error, showSubcategoryError]);

  // Check for changes
  useEffect(() => {
    if (subcategory) {
      const hasFormChanges = 
        formData.name !== subcategory.name ||
        formData.description !== (subcategory.description || '') ||
        formData.category !== (subcategory.category?._id || subcategory.category || '') ||
        formData.isActive !== (subcategory.isActive !== false) ||
        formData.order !== (subcategory.order || 0) ||
        formData.metaTitle !== (subcategory.metaTitle || '') ||
        formData.metaDescription !== (subcategory.metaDescription || '') ||
        formData.slug !== (subcategory.slug || '') ||
        formData.icon !== (subcategory.icon || '📁');
      
      setHasChanges(hasFormChanges);
    }
  }, [formData, subcategory]);

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
    
    // Clear errors for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
    if (backendErrors[name]) {
      setBackendErrors(prev => ({ ...prev, [name]: null }));
    }
  }, [errors, backendErrors]);

  const handleRefreshCategories = useCallback(() => {
    refetchCategories();
    showSubcategorySuccess('Categories list refreshed');
  }, [refetchCategories, showSubcategorySuccess]);

  const handleRefreshData = useCallback(() => {
    if (subcategory) {
      // Reset form to original subcategory data
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
      setErrors({});
      setBackendErrors({});
      setHasChanges(false);
      showSubcategorySuccess('Form data refreshed from server');
    }
  }, [subcategory, showSubcategorySuccess]);

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

  // Handle form submission - UPDATED for immediate updates
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!hasChanges) {
      showSubcategorySuccess('No changes to save');
      return;
    }
    
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
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
        // Ensure category is properly formatted
        category: formData.category || null,
      };
      
      // Remove version to avoid conflict
      delete submitData.version;
      
      await onSubmit(submitData);
      
      // Immediately close modal on success
      // The parent component will handle the optimistic update
      onClose();
    } catch (err) {
      // Error handled in useEffect - don't close modal
      console.error('Update failed:', err);
    }
  }, [formData, subcategory, hasChanges, validateForm, onSubmit, onClose, showSubcategorySuccess]);

  // Reset and close modal with confirmation
  const handleClose = useCallback(() => {
    if (hasChanges && !showUnsavedChanges) {
      setShowUnsavedChanges(true);
      return;
    }
    
    if (showUnsavedChanges) {
      setShowUnsavedChanges(false);
    }
    
    setFormData(initialFormData);
    setErrors({});
    setBackendErrors({});
    setOriginalSlug('');
    setHasChanges(false);
    onClose();
  }, [onClose, hasChanges, showUnsavedChanges]);

  // Don't render if not open or no subcategory
  if (!isOpen || !subcategory) return null;

  const getError = (fieldName) => {
    return backendErrors[fieldName] || errors[fieldName];
  };

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
            <div className="flex items-center space-x-2">
              <button
                onClick={handleRefreshData}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Refresh data"
                title="Refresh form data"
              >
                <FiRefreshCw className="h-5 w-5 text-gray-500" />
              </button>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <FiX className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Unsaved Changes Warning */}
        {showUnsavedChanges && (
          <div className="mx-6 mt-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex">
                <FiAlertTriangle className="h-5 w-5 text-amber-400 mr-2 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800">You have unsaved changes</p>
                  <p className="text-sm text-amber-700 mt-1">Are you sure you want to discard your changes?</p>
                  <div className="flex space-x-3 mt-3">
                    <button
                      onClick={() => setShowUnsavedChanges(false)}
                      className="px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-md"
                    >
                      Continue Editing
                    </button>
                    <button
                      onClick={() => {
                        setShowUnsavedChanges(false);
                        setTimeout(() => handleClose(), 100);
                      }}
                      className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                    >
                      Discard Changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Version Conflict Error */}
        {backendErrors.version && (
          <div className="mx-6 mt-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <FiAlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-800">{backendErrors.version}</p>
                  <button
                    onClick={handleRefreshData}
                    className="mt-2 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-md flex items-center space-x-1"
                  >
                    <FiRefreshCw className="h-3 w-3" />
                    <span>Refresh Data</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* General Backend Error */}
        {backendErrors.general && !backendErrors.version && (
          <div className="mx-6 mt-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <FiAlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-800">{backendErrors.general}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Version and Changes Indicator */}
          <div className="mb-6">
            <div className={`p-4 border rounded-lg ${
              hasChanges ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                    hasChanges ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <span className={`text-sm font-medium ${
                      hasChanges ? 'text-blue-600' : 'text-gray-600'
                    }`}>
                      v{formData.version}
                    </span>
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${
                      hasChanges ? 'text-blue-800' : 'text-gray-800'
                    }`}>
                      {hasChanges ? 'You have unsaved changes' : 'No changes made'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Last updated: {new Date(subcategory.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {hasChanges && (
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                    Unsaved
                  </span>
                )}
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
                    getError('name') ? 'border-red-300' : 'border-gray-300'
                  }`}
                  disabled={loading}
                />
                {getError('name') && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center">
                    <FiAlertCircle className="h-4 w-4 mr-1" />
                    {getError('name')}
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
                      getError('category') ? 'border-red-300' : 'border-gray-300'
                    }`}
                    disabled={loading}
                  >
                    <option value="">Select a category</option>
                    {categories
                      .filter(cat => cat.isActive !== false)
                      .map(category => (
                        <option key={category._id} value={category._id}>
                          {category.name}
                        </option>
                      ))}
                  </select>
                  <FiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 pointer-events-none" />
                </div>
                {getError('category') && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center">
                    <FiAlertCircle className="h-4 w-4 mr-1" />
                    {getError('category')}
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
                    getError('description') ? 'border-red-300' : 'border-gray-300'
                  }`}
                  disabled={loading}
                />
                <div className="flex justify-between mt-1.5">
                  {getError('description') ? (
                    <p className="text-sm text-red-600 flex items-center">
                      <FiAlertCircle className="h-4 w-4 mr-1" />
                      {getError('description')}
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
                        getError('icon') ? 'border-red-300' : 'border-gray-300'
                      }`}
                      disabled={loading}
                      placeholder="📁, 🔧, ✨, etc."
                    />
                    <div className="text-2xl flex-shrink-0">
                      {formData.icon || '📁'}
                    </div>
                  </div>
                  {getError('icon') && (
                    <p className="mt-1.5 text-sm text-red-600 flex items-center">
                      <FiAlertCircle className="h-4 w-4 mr-1" />
                      {getError('icon')}
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
                      getError('order') ? 'border-red-300' : 'border-gray-300'
                    }`}
                    disabled={loading}
                  />
                  {getError('order') && (
                    <p className="mt-1.5 text-sm text-red-600 flex items-center">
                      <FiAlertCircle className="h-4 w-4 mr-1" />
                      {getError('order')}
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
                    getError('slug') ? 'border-red-300' : 'border-gray-300'
                  }`}
                  disabled={loading}
                />
                {getError('slug') && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center">
                    <FiAlertCircle className="h-4 w-4 mr-1" />
                    {getError('slug')}
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
              <label className={`flex items-start space-x-3 p-4 border rounded-lg transition-colors cursor-pointer ${
                loading ? 'opacity-50 cursor-not-allowed' : 'border-gray-200 hover:bg-gray-50'
              }`}>
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 mt-0.5"
                  disabled={loading}
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
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                    getError('metaTitle') ? 'border-red-300' : 'border-gray-300'
                  }`}
                  disabled={loading}
                />
                <div className="flex justify-between mt-1.5">
                  {getError('metaTitle') && (
                    <p className="text-sm text-red-600 flex items-center">
                      <FiAlertCircle className="h-4 w-4 mr-1" />
                      {getError('metaTitle')}
                    </p>
                  )}
                  <p className="text-sm text-gray-500">
                    {formData.metaTitle.length}/60 characters
                  </p>
                </div>
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
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                    getError('metaDescription') ? 'border-red-300' : 'border-gray-300'
                  }`}
                  disabled={loading}
                />
                <div className="flex justify-between mt-1.5">
                  {getError('metaDescription') && (
                    <p className="text-sm text-red-600 flex items-center">
                      <FiAlertCircle className="h-4 w-4 mr-1" />
                      {getError('metaDescription')}
                    </p>
                  )}
                  <p className="text-sm text-gray-500">
                    {formData.metaDescription.length}/160 characters
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <button
                type="button"
                onClick={handleRefreshCategories}
                className="p-1.5 hover:bg-gray-100 rounded-md"
                title="Refresh categories list"
              >
                <FiRefreshCw className="h-4 w-4" />
              </button>
              <FiInfo className="h-4 w-4" />
              <span>Fields marked with * are required</span>
            </div>
            
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !hasChanges}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <>
                    <FiLoader className="h-4 w-4 animate-spin" />
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