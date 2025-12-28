// components/admin/modals/ServiceCreateModal.jsx
import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { 
  FiX, FiPackage, FiInfo, FiAlertCircle, FiPlus, FiChevronDown, 
  FiDollarSign, FiClock, FiTag, FiImage, FiUpload
} from 'react-icons/fi';

// Validation rules
const validationRules = {
  title: (value) => {
    if (!value.trim()) return 'Service title is required';
    if (value.length < 5) return 'Title must be at least 5 characters';
    if (value.length > 100) return 'Title cannot exceed 100 characters';
    return null;
  },
  category: (value) => {
    if (!value) return 'Category is required';
    return null;
  },
  subcategory: (value) => {
    if (!value) return 'Subcategory is required';
    return null;
  },
  shortDescription: (value) => {
    if (!value.trim()) return 'Short description is required';
    if (value.length < 20) return 'Short description must be at least 20 characters';
    if (value.length > 250) return 'Short description cannot exceed 250 characters';
    return null;
  },
  description: (value) => {
    if (!value.trim()) return 'Description is required';
    if (value.length < 50) return 'Description must be at least 50 characters';
    return null;
  },
  price: (value) => {
    const price = parseFloat(value);
    if (isNaN(price)) return 'Price must be a valid number';
    if (price < 0) return 'Price cannot be negative';
    if (price > 100000) return 'Price cannot exceed $100,000';
    return null;
  },
  deliveryTime: (value) => {
    const time = parseInt(value);
    if (isNaN(time)) return 'Delivery time must be a valid number';
    if (time < 1) return 'Delivery time must be at least 1';
    if (time > 365) return 'Delivery time cannot exceed 365 days';
    return null;
  },
  revisions: (value) => {
    const revisions = parseInt(value);
    if (isNaN(revisions)) return 'Revisions must be a valid number';
    if (revisions < 0) return 'Revisions cannot be negative';
    if (revisions > 10) return 'Revisions cannot exceed 10';
    return null;
  }
};

// Initial form state
const initialFormData = {
  title: '',
  description: '',
  shortDescription: '',
  category: '',
  subcategory: '',
  price: 0,
  currency: 'USD',
  deliveryTime: 7,
  deliveryTimeUnit: 'days',
  revisions: 1,
  status: 'draft',
  isFeatured: false,
  isRecommended: false,
  isPopular: false,
  tags: [],
  features: [],
  faqs: [],
  packages: [],
  requirements: []
};

const ServiceCreateModal = memo(({ 
  isOpen, 
  onClose, 
  onSubmit, 
  loading = false,
  categories = []
}) => {
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [subcategories, setSubcategories] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [activeTab, setActiveTab] = useState('basic');
  const [imagePreviews, setImagePreviews] = useState([]);
  const formRef = useRef(null);
  const titleInputRef = useRef(null);

  // Auto-focus on title input when modal opens
  useEffect(() => {
    if (isOpen && titleInputRef.current) {
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData(initialFormData);
      setErrors({});
      setSubcategories([]);
      setNewTag('');
      setImagePreviews([]);
      setActiveTab('basic');
    }
  }, [isOpen]);

  // Load subcategories when category changes
  useEffect(() => {
    if (formData.category) {
      const category = categories.find(cat => cat._id === formData.category);
      if (category?.subcategories) {
        setSubcategories(category.subcategories);
      } else {
        setSubcategories([]);
      }
    } else {
      setSubcategories([]);
    }
  }, [formData.category, categories]);

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

  // Handle description change
  const handleDescriptionChange = useCallback((content) => {
    setFormData(prev => ({
      ...prev,
      description: content
    }));
    
    const error = validateField('description', content);
    setErrors(prev => ({
      ...prev,
      description: error
    }));
  }, [validateField]);

  // Handle tag management
  const handleAddTag = useCallback(() => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  }, [newTag, formData.tags]);

  const handleRemoveTag = useCallback((tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  }, []);

  // Handle feature management
  const handleAddFeature = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      features: [...prev.features, { title: '', description: '', included: true }]
    }));
  }, []);

  const handleUpdateFeature = useCallback((index, field, value) => {
    const updatedFeatures = [...formData.features];
    updatedFeatures[index][field] = value;
    setFormData(prev => ({
      ...prev,
      features: updatedFeatures
    }));
  }, [formData.features]);

  const handleRemoveFeature = useCallback((index) => {
    const updatedFeatures = formData.features.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      features: updatedFeatures
    }));
  }, [formData.features]);

  // Handle image selection
  const handleImageSelect = useCallback((e) => {
    const files = Array.from(e.target.files);
    const newPreviews = files.map(file => ({
      url: URL.createObjectURL(file),
      name: file.name,
      file: file,
      isExisting: false
    }));
    
    // Limit to 10 images total
    if (imagePreviews.length + newPreviews.length > 10) {
      alert('Maximum 10 images allowed');
      return;
    }
    
    setImagePreviews(prev => [...prev, ...newPreviews]);
  }, [imagePreviews]);

  const handleRemoveImage = useCallback((index) => {
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  }, []);

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
        images: imagePreviews.map(img => img.file)
      };
      
      await onSubmit(submitData);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  }, [formData, imagePreviews, validateForm, onSubmit]);

  // Reset and close modal
  const handleClose = useCallback(() => {
    setFormData(initialFormData);
    setErrors({});
    setSubcategories([]);
    setNewTag('');
    setImagePreviews([]);
    setActiveTab('basic');
    onClose();
  }, [onClose]);

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div 
        ref={formRef}
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <FiPackage className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Create New Service</h3>
                <p className="text-sm text-gray-500">Add a new service to your offerings</p>
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

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6 pt-6">
          <nav className="flex space-x-4 overflow-x-auto" aria-label="Tabs">
            <button
              type="button"
              onClick={() => setActiveTab('basic')}
              className={`px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap ${
                activeTab === 'basic'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Basic Info
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pricing')}
              className={`px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap ${
                activeTab === 'pricing'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Pricing
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('content')}
              className={`px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap ${
                activeTab === 'content'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Content
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('media')}
              className={`px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap ${
                activeTab === 'media'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Media
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('status')}
              className={`px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap ${
                activeTab === 'status'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Status
            </button>
          </nav>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Basic Information Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Service Title *
                </label>
                <input
                  ref={titleInputRef}
                  id="title"
                  name="title"
                  type="text"
                  value={formData.title}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                    errors.title ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Professional Website Development"
                />
                {errors.title && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center">
                    <FiAlertCircle className="h-4 w-4 mr-1" />
                    {errors.title}
                  </p>
                )}
              </div>

              {/* Category and Subcategory */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
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

                <div>
                  <label htmlFor="subcategory" className="block text-sm font-medium text-gray-700 mb-2">
                    Subcategory *
                  </label>
                  <div className="relative">
                    <select
                      id="subcategory"
                      name="subcategory"
                      value={formData.subcategory}
                      onChange={handleChange}
                      disabled={!formData.category}
                      className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none transition-colors ${
                        errors.subcategory ? 'border-red-300' : 'border-gray-300'
                      } ${!formData.category ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    >
                      <option value="">Select a subcategory</option>
                      {subcategories.map(subcategory => (
                        <option key={subcategory._id} value={subcategory._id}>
                          {subcategory.name}
                        </option>
                      ))}
                    </select>
                    <FiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 pointer-events-none" />
                  </div>
                  {errors.subcategory && (
                    <p className="mt-1.5 text-sm text-red-600 flex items-center">
                      <FiAlertCircle className="h-4 w-4 mr-1" />
                      {errors.subcategory}
                    </p>
                  )}
                  {formData.category && subcategories.length === 0 && (
                    <p className="mt-1.5 text-xs text-gray-500">
                      No subcategories available for this category
                    </p>
                  )}
                </div>
              </div>

              {/* Short Description */}
              <div>
                <label htmlFor="shortDescription" className="block text-sm font-medium text-gray-700 mb-2">
                  Short Description *
                </label>
                <textarea
                  id="shortDescription"
                  name="shortDescription"
                  value={formData.shortDescription}
                  onChange={handleChange}
                  rows={3}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                    errors.shortDescription ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Brief description of your service (displayed in listings)"
                />
                <div className="flex justify-between mt-1.5">
                  {errors.shortDescription ? (
                    <p className="text-sm text-red-600 flex items-center">
                      <FiAlertCircle className="h-4 w-4 mr-1" />
                      {errors.shortDescription}
                    </p>
                  ) : (
                    <div></div>
                  )}
                  <p className="text-sm text-gray-500">
                    {formData.shortDescription.length}/250 characters
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Pricing Tab */}
          {activeTab === 'pricing' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                    Price *
                  </label>
                  <div className="relative">
                    <FiDollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                      id="price"
                      name="price"
                      type="number"
                      value={formData.price}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                        errors.price ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  {errors.price && (
                    <p className="mt-1.5 text-sm text-red-600 flex items-center">
                      <FiAlertCircle className="h-4 w-4 mr-1" />
                      {errors.price}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-2">
                    Currency
                  </label>
                  <select
                    id="currency"
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CAD">CAD ($)</option>
                    <option value="AUD">AUD ($)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="deliveryTime" className="block text-sm font-medium text-gray-700 mb-2">
                    Delivery Time *
                  </label>
                  <div className="relative">
                    <FiClock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                      id="deliveryTime"
                      name="deliveryTime"
                      type="number"
                      value={formData.deliveryTime}
                      onChange={handleChange}
                      min="1"
                      max="365"
                      className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                        errors.deliveryTime ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  {errors.deliveryTime && (
                    <p className="mt-1.5 text-sm text-red-600 flex items-center">
                      <FiAlertCircle className="h-4 w-4 mr-1" />
                      {errors.deliveryTime}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="deliveryTimeUnit" className="block text-sm font-medium text-gray-700 mb-2">
                    Delivery Unit
                  </label>
                  <select
                    id="deliveryTimeUnit"
                    name="deliveryTimeUnit"
                    value={formData.deliveryTimeUnit}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="revisions" className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Revisions
                  </label>
                  <input
                    id="revisions"
                    name="revisions"
                    type="number"
                    value={formData.revisions}
                    onChange={handleChange}
                    min="0"
                    max="10"
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                      errors.revisions ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.revisions && (
                    <p className="mt-1.5 text-sm text-red-600 flex items-center">
                      <FiAlertCircle className="h-4 w-4 mr-1" />
                      {errors.revisions}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Content Tab */}
          {activeTab === 'content' && (
            <div className="space-y-8">
              {/* Full Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={(e) => handleDescriptionChange(e.target.value)}
                  rows={8}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                    errors.description ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Detailed description of your service, including what clients will get, your process, etc."
                />
                {errors.description && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center">
                    <FiAlertCircle className="h-4 w-4 mr-1" />
                    {errors.description}
                  </p>
                )}
              </div>

              {/* Tags */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
                  Tags
                </h4>
                
                <div className="space-y-4">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Add a tag (press Enter)"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-4 py-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200"
                    >
                      <FiTag className="h-5 w-5" />
                    </button>
                  </div>
                  
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-indigo-100 text-indigo-800"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-2 text-indigo-600 hover:text-indigo-800"
                          >
                            <FiX className="h-4 w-4" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Features */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                    Features (Optional)
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center"
                  >
                    <FiPlus className="h-4 w-4 mr-1" />
                    Add Feature
                  </button>
                </div>
                
                <div className="space-y-4">
                  {formData.features.map((feature, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={feature.included}
                            onChange={(e) => handleUpdateFeature(index, 'included', e.target.checked)}
                            className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                          />
                          <h5 className="font-medium text-gray-900">Feature {index + 1}</h5>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFeature(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <FiX className="h-4 w-4" />
                        </button>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Title
                          </label>
                          <input
                            type="text"
                            value={feature.title}
                            onChange={(e) => handleUpdateFeature(index, 'title', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            placeholder="e.g., Responsive Design"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                          </label>
                          <textarea
                            value={feature.description}
                            onChange={(e) => handleUpdateFeature(index, 'description', e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            placeholder="Describe this feature..."
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {formData.features.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                      <FiPackage className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No features added yet</p>
                      <p className="text-sm text-gray-500 mt-2">Add features to showcase what your service includes</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Media Tab */}
          {activeTab === 'media' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
                  Service Images
                </h4>
                
                {imagePreviews.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {imagePreviews.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={image.url}
                          alt={`Service ${index + 1}`}
                          className="h-32 w-full object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <FiX className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <FiImage className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No images uploaded yet</p>
                  </div>
                )}
              </div>

              {/* Upload New Images */}
              <div>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <FiImage className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">
                    Upload service images (max 10 images, 5MB each)
                  </p>
                  <input
                    type="file"
                    id="service-new-images"
                    multiple
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <label
                    htmlFor="service-new-images"
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer"
                  >
                    <FiUpload className="h-5 w-5 mr-2" />
                    Select Images
                  </label>
                  <p className="text-xs text-gray-500 mt-4">
                    {imagePreviews.length} images selected
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Status Tab */}
          {activeTab === 'status' && (
            <div className="space-y-6">
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                  Initial Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="draft">Draft (Save for later)</option>
                  <option value="active">Active (Publish now)</option>
                  <option value="pending">Pending Review</option>
                </select>
              </div>
              
              <div className="space-y-4">
                <label className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    name="isFeatured"
                    checked={formData.isFeatured}
                    onChange={handleChange}
                    className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 mt-0.5"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Featured Service</span>
                    <p className="text-sm text-gray-500 mt-1">
                      Featured services appear in highlighted sections on the homepage.
                    </p>
                  </div>
                </label>
                
                <label className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    name="isRecommended"
                    checked={formData.isRecommended}
                    onChange={handleChange}
                    className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 mt-0.5"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Recommended Service</span>
                    <p className="text-sm text-gray-500 mt-1">
                      Recommended services appear in personalized recommendations.
                    </p>
                  </div>
                </label>
                
                <label className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    name="isPopular"
                    checked={formData.isPopular}
                    onChange={handleChange}
                    className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 mt-0.5"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Popular Service</span>
                    <p className="text-sm text-gray-500 mt-1">
                      Popular services appear in popular listings.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200 mt-6">
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
                    <span>Create Service</span>
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

ServiceCreateModal.displayName = 'ServiceCreateModal';

export default ServiceCreateModal;