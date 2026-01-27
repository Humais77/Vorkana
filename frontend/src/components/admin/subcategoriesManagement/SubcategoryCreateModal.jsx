// SubcategoryCreateModal.jsx - FIXED with correct allowSubcategories logic
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FiX, FiFolder, FiInfo, FiAlertCircle, FiPlus, FiChevronDown, FiRefreshCw } from 'react-icons/fi';
import { useCategoriesForDropdown } from '../../../hooks/useAdminDashboard';
import { useSubcategoryToast } from '../../../hooks/useSubcategoryToast';

const SubcategoryCreateModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  loading = false, 
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef(null);
  const nameInputRef = useRef(null);

  // Use hooks directly in the modal
  const { 
    data: categoriesData, 
    isLoading: categoriesLoading,
    refetch: refetchCategories 
  } = useCategoriesForDropdown(true);

  const {
    showSubcategoryLoading,
    showSubcategorySuccess,
    showSubcategoryError,
    showSubcategoryInfo,
    dismissSubcategoryToast
  } = useSubcategoryToast();

  // Get categories from hook response
  const categories = categoriesData?.data || [];
  console.log('[MODAL DEBUG] Categories loaded:', {
    count: categories.length,
    data: categories,
    firstCategory: categories[0]
  });

  // Filter categories to only show those that allow subcategories
  const filteredCategories = React.useMemo(() => {
    return categories.filter(category => {
      // Show categories that explicitly allow subcategories (true)
      // Also show categories where allowSubcategories is undefined/null (default behavior)
      return category.allowSubcategories !== false;
    });
  }, [categories]);

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

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
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
      setIsSubmitting(false);
      
      // Refresh categories when modal opens
      refetchCategories();
    }
  }, [isOpen, refetchCategories]);

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
    
    // Clear frontend errors for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  }, [errors, backendErrors]);

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
    
    if (isSubmitting) return;
    
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
    
    setIsSubmitting(true);
    const loadingToastId = showSubcategoryLoading('Creating subcategory...');
    
    try {
      // Ensure category is a valid ObjectId
      const submitData = {
        ...formData,
        category: formData.category.trim()
      };
      
      await onSubmit(submitData);
      
      dismissSubcategoryToast(loadingToastId);
      showSubcategorySuccess('Subcategory created successfully');
      
      // Don't close modal here - let parent handle it
    } catch (error) {
      console.error('Form submission error:', error);
      dismissSubcategoryToast(loadingToastId);
      
      // Error is already handled in useEffect via backendError prop
      setIsSubmitting(false);
    }
  }, [formData, validateForm, onSubmit, isSubmitting, showSubcategoryLoading, showSubcategorySuccess, dismissSubcategoryToast]);

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      onClose();
    }
  }, [onClose, isSubmitting]);

  const handleRefreshCategories = useCallback(() => {
    refetchCategories();
    showSubcategoryInfo('Refreshing categories...');
  }, [refetchCategories, showSubcategoryInfo]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        handleClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleClose, isSubmitting]);

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
              disabled={isSubmitting}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
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
                  disabled={isSubmitting}
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

              {/* Category Selection - FIXED LOGIC */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                    Parent Category *
                  </label>
                  <button
                    type="button"
                    onClick={handleRefreshCategories}
                    disabled={categoriesLoading || isSubmitting}
                    className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    title="Refresh categories list"
                  >
                    <FiRefreshCw className={`h-3 w-3 ${categoriesLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
                <div className="relative">
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    disabled={categoriesLoading || isSubmitting || filteredCategories.length === 0}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none transition-colors ${
                      errors.category || backendErrors.category ? 'border-red-300' : 'border-gray-300'
                    } ${categoriesLoading ? 'opacity-50' : ''}`}
                  >
                    <option value="">Select a category</option>
                    {categoriesLoading ? (
                      <option value="" disabled>Loading categories...</option>
                    ) : filteredCategories.length === 0 ? (
                      <option value="" disabled>No categories available for subcategories</option>
                    ) : (
                      filteredCategories.map(category => (
                        <option 
                          key={category._id} 
                          value={category._id}
                        >
                          {category.name} 
                          {category.subcategoriesCount ? ` (${category.subcategoriesCount} subcategories)` : ''}
                        </option>
                      ))
                    )}
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
                
                {/* Categories status info */}
                {!categoriesLoading && filteredCategories.length === 0 && categories.length > 0 && (
                  <p className="mt-1.5 text-sm text-amber-600 flex items-center">
                    <FiAlertCircle className="h-4 w-4 mr-1" />
                    All categories are set to not allow subcategories. Please edit a category to enable subcategories.
                  </p>
                )}
                {!categoriesLoading && categories.length === 0 && (
                  <p className="mt-1.5 text-sm text-amber-600 flex items-center">
                    <FiAlertCircle className="h-4 w-4 mr-1" />
                    No categories available. Please create a category first.
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
                  disabled={isSubmitting}
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
                      disabled={isSubmitting}
                      className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                        errors.icon || backendErrors.icon ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="📁, 🔧, ✨, etc."
                      autoComplete="off"
                    />
                    <div className="text-2xl flex-shrink-0 bg-gray-100 p-2 rounded-lg">
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
                    disabled={isSubmitting}
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
                  <p className="mt-1.5 text-xs text-gray-500">
                    Lower numbers appear first
                  </p>
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
                      onBlur={() => {
                        // Auto-generate slug if empty
                        if (generateSlug && !formData.slug && formData.name) {
                          const slug = formData.name
                            .toLowerCase()
                            .replace(/\s+/g, '-')
                            .replace(/[^a-z0-9-]/g, '');
                          setFormData(prev => ({ ...prev, slug }));
                        }
                      }}
                      disabled={isSubmitting}
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
                        disabled={isSubmitting}
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
              <label className={`flex items-start space-x-3 p-4 border border-gray-200 rounded-lg transition-colors cursor-pointer ${
                isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
              }`}>
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
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
                disabled={isSubmitting}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !formData.category || filteredCategories.length === 0}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
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