// CategoryCreateModal.jsx - OPTIMIZED
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiX, FiFolder, FiInfo, FiAlertCircle, FiPlus } from 'react-icons/fi';
import { useCategoriesForDropdown } from '../../hooks/useAdminDashboard';

const CategoryCreateModal = ({ isOpen, onClose, onSubmit, loading = false }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parentCategory: '',
    featured: false,
    popular: false,
    isActive: true,
    order: 0,
    metaTitle: '',
    metaDescription: '',
    slug: ''
  });

  const [errors, setErrors] = useState({});
  const [generateSlug, setGenerateSlug] = useState(true);
  const formRef = useRef(null);
  const nameInputRef = useRef(null);

  const { data: categoriesData } = useCategoriesForDropdown();
  const categories = categoriesData?.data || [];

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

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  }, [errors]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Category name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Category name must be at least 2 characters';
    } else if (formData.name.length > 50) {
      newErrors.name = 'Category name cannot exceed 50 characters';
    }
    
    if (formData.description.length > 1000) {
      newErrors.description = 'Description cannot exceed 1000 characters';
    }
    
    if (!formData.slug) {
      newErrors.slug = 'Slug is required';
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = 'Slug can only contain lowercase letters, numbers, and hyphens';
    }
    
    if (formData.order < 0 || formData.order > 1000) {
      newErrors.order = 'Order must be between 0 and 1000';
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      
      // Focus on first error field
      const firstError = Object.keys(validationErrors)[0];
      const errorElement = formRef.current?.querySelector(`[name="${firstError}"]`);
      if (errorElement) {
        errorElement.focus();
      }
      
      return;
    }
    
    try {
      const submitData = {
        ...formData,
        parentCategory: formData.parentCategory || null
      };
      
      await onSubmit(submitData);
      handleClose();
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleClose = useCallback(() => {
    setFormData({
      name: '',
      description: '',
      parentCategory: '',
      featured: false,
      popular: false,
      isActive: true,
      order: 0,
      metaTitle: '',
      metaDescription: '',
      slug: ''
    });
    setErrors({});
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
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <FiFolder className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Create New Category</h3>
                <p className="text-sm text-gray-500">Add a new category to organize content</p>
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

        <form ref={formRef} onSubmit={handleSubmit} className="p-6">
          {/* Basic Information */}
          <div className="mb-8">
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
              Basic Information
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Category Name */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category Name *
                </label>
                <input
                  ref={nameInputRef}
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Web Development"
                  autoComplete="off"
                  data-lpignore="true"
                />
                {errors.name && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center">
                    <FiAlertCircle className="h-4 w-4 mr-1" />
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                    errors.description ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Describe what this category is about..."
                  autoComplete="off"
                  data-lpignore="true"
                />
                <div className="flex justify-between mt-1.5">
                  {errors.description && (
                    <p className="text-sm text-red-600 flex items-center">
                      <FiAlertCircle className="h-4 w-4 mr-1" />
                      {errors.description}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 ml-auto">
                    {formData.description.length}/1000 characters
                  </p>
                </div>
              </div>

              {/* Parent Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parent Category
                </label>
                <select
                  name="parentCategory"
                  value={formData.parentCategory}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                >
                  <option value="">None (Top Level)</option>
                  {categories.map(category => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Order
                </label>
                <input
                  type="number"
                  name="order"
                  value={formData.order}
                  onChange={handleChange}
                  min="0"
                  max="1000"
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                    errors.order ? 'border-red-300' : 'border-gray-300'
                  }`}
                  autoComplete="off"
                  data-lpignore="true"
                />
                {errors.order && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center">
                    <FiAlertCircle className="h-4 w-4 mr-1" />
                    {errors.order}
                  </p>
                )}
              </div>

              {/* Slug */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL Slug *
                </label>
                <div className="flex space-x-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      name="slug"
                      value={formData.slug}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                        errors.slug ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="web-development"
                      autoComplete="off"
                      data-lpignore="true"
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
                      <span className="text-sm text-gray-600">Auto-generate</span>
                    </label>
                  </div>
                </div>
                {errors.slug && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center">
                    <FiAlertCircle className="h-4 w-4 mr-1" />
                    {errors.slug}
                  </p>
                )}
                <p className="mt-1.5 text-xs text-gray-500">
                  This will be used in URLs. Use lowercase letters, numbers, and hyphens only.
                </p>
              </div>
            </div>
          </div>

          {/* Features & Status */}
          <div className="mb-8">
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
              Features & Status
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <label className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    name="featured"
                    checked={formData.featured}
                    onChange={handleChange}
                    className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Featured</span>
                    <p className="text-sm text-gray-500 mt-1">Show in featured section</p>
                  </div>
                </label>
                
                <label className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    name="popular"
                    checked={formData.popular}
                    onChange={handleChange}
                    className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Popular</span>
                    <p className="text-sm text-gray-500 mt-1">Mark as popular category</p>
                  </div>
                </label>
              </div>
              
              <div className="md:col-span-2">
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
                      Active categories are visible to users. Inactive categories are hidden.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* SEO Information */}
          <div className="mb-8">
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
              SEO Information (Optional)
            </h4>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meta Title
                </label>
                <input
                  type="text"
                  name="metaTitle"
                  value={formData.metaTitle}
                  onChange={handleChange}
                  maxLength="60"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                  placeholder="Title for search engines (max 60 characters)"
                  autoComplete="off"
                  data-lpignore="true"
                />
                <p className="mt-1.5 text-xs text-gray-500">
                  {formData.metaTitle.length}/60 characters
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meta Description
                </label>
                <textarea
                  name="metaDescription"
                  value={formData.metaDescription}
                  onChange={handleChange}
                  rows={2}
                  maxLength="160"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                  placeholder="Description for search engines (max 160 characters)"
                  autoComplete="off"
                  data-lpignore="true"
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
                disabled={loading}
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
                    <span>Create Category</span>
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

export default React.memo(CategoryCreateModal);