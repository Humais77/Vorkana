// CategoryEditModal.jsx - OPTIMIZED VERSION
import React, { useState, useEffect, useCallback, memo } from 'react';
import { FiX, FiFolder, FiInfo, FiAlertCircle, FiSave } from 'react-icons/fi';
import { useCategoriesForDropdown } from '../../hooks/useAdminDashboard';

// Validation rules
const validationRules = {
  name: (value) => {
    if (!value.trim()) return 'Category name is required';
    if (value.length < 2) return 'Category name must be at least 2 characters';
    if (value.length > 50) return 'Category name cannot exceed 50 characters';
    return null;
  },
  description: (value) => {
    if (value.length > 1000) return 'Description cannot exceed 1000 characters';
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
  }
};

// Initial form state
const initialFormData = {
  name: '',
  description: '',
  parentCategory: '',
  featured: false,
  popular: false,
  isActive: true,
  order: 0,
  metaTitle: '',
  metaDescription: '',
  slug: '',
  version: 1
};

const CategoryEditModal = memo(({ 
  category, 
  isOpen, 
  onClose, 
  onSubmit, 
  loading = false 
}) => {
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [originalSlug, setOriginalSlug] = useState('');

  const { data: categoriesData } = useCategoriesForDropdown();
  const categories = categoriesData?.data || [];

  // Initialize form with category data
  useEffect(() => {
    if (category) {
      const data = {
        name: category.name || '',
        description: category.description || '',
        parentCategory: category.parentCategory?._id || category.parentCategory || '',
        featured: Boolean(category.featured),
        popular: Boolean(category.popular),
        isActive: category.isActive !== false,
        order: category.order || 0,
        metaTitle: category.metaTitle || '',
        metaDescription: category.metaDescription || '',
        slug: category.slug || '',
        version: category.version || 1
      };
      
      setFormData(data);
      setOriginalSlug(category.slug || '');
      setErrors({});
    }
  }, [category]);

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
    
    // Special validation for circular reference
    if (formData.parentCategory === category?._id) {
      newErrors.parentCategory = 'Category cannot be its own parent';
    }
    
    return newErrors;
  }, [formData, category, validateField]);

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
        parentCategory: formData.parentCategory || null
      };
      
      await onSubmit(category._id, submitData);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  }, [formData, category, validateForm, onSubmit]);

  // Reset and close modal
  const handleClose = useCallback(() => {
    setFormData(initialFormData);
    setErrors({});
    setOriginalSlug('');
    onClose();
  }, [onClose]);

  // Don't render if not open or no category
  if (!isOpen || !category) return null;

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
                <h3 className="text-lg font-semibold text-gray-900">Edit Category</h3>
                <p className="text-sm text-gray-500">{category.name}</p>
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
                <span>Last updated: {new Date(category.updatedAt).toLocaleDateString()}</span>
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
                  Category Name *
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
                    {formData.description.length}/1000 characters
                  </p>
                </div>
              </div>

              {/* Parent Category and Order */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="parentCategory" className="block text-sm font-medium text-gray-700 mb-2">
                    Parent Category
                  </label>
                  <select
                    id="parentCategory"
                    name="parentCategory"
                    value={formData.parentCategory}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                      errors.parentCategory ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">None (Top Level)</option>
                    {categories
                      .filter(cat => cat._id !== category._id)
                      .map(category => (
                        <option key={category._id} value={category._id}>
                          {category.name}
                        </option>
                      ))}
                  </select>
                  {errors.parentCategory && (
                    <p className="mt-1.5 text-sm text-red-600 flex items-center">
                      <FiAlertCircle className="h-4 w-4 mr-1" />
                      {errors.parentCategory}
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

          {/* Features & Status */}
          <div className="mb-8">
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
              Features & Status
            </h4>
            
            <div className="space-y-4">
              {/* Featured */}
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
              
              {/* Popular */}
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
              
              {/* Active Status */}
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

CategoryEditModal.displayName = 'CategoryEditModal';

export default CategoryEditModal;