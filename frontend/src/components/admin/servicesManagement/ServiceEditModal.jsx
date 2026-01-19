import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { 
  FiX, FiPackage, FiInfo, FiAlertCircle, FiSave, FiChevronDown, 
  FiDollarSign, FiClock, FiTag, FiImage, FiCheck, FiUpload, FiEye, 
  FiStar, FiPlus, FiTrash2, FiHash, FiLoader, FiCopy, FiRefreshCw,
  FiChevronUp, FiChevronRight, FiGrid, FiLayers
} from 'react-icons/fi';
import { 
  useSubcategoriesByCategory
} from '../../../hooks/useAdminDashboard';
import {useUpdateService} from '../../../hooks/useServices'
import { useServiceToast } from '../../../hooks/useServiceToast';
import { toast } from 'react-hot-toast';
import { adminAPI } from '../../../api/admin';

// Validation rules
const validationRules = {
  title: (value) => {
    if (!value?.trim()) return 'Service title is required';
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
    if (!value?.trim()) return 'Short description is required';
    if (value.length < 20) return 'Short description must be at least 20 characters';
    if (value.length > 250) return 'Short description cannot exceed 250 characters';
    return null;
  },
  description: (value) => {
    if (!value?.trim()) return 'Description is required';
    if (value.length < 50) return 'Description must be at least 50 characters';
    if (value.length > 10000) return 'Description cannot exceed 10000 characters';
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
  },
  tags: (value) => {
    if (value && value.length > 20) return 'Maximum 20 tags allowed';
    return null;
  },
  features: (value) => {
    if (value && value.length > 15) return 'Maximum 15 features allowed';
    return null;
  }
};

// Helper function to safely parse service data
const parseServiceData = (service) => {
  if (!service) return null;
  
  // Helper function to safely parse array data
  const parseArrayField = (field, defaultValue = []) => {
    if (!field) return defaultValue;
    if (Array.isArray(field)) return field;
    if (typeof field === 'string') {
      try {
        const parsed = JSON.parse(field);
        return Array.isArray(parsed) ? parsed : defaultValue;
      } catch {
        return defaultValue;
      }
    }
    return defaultValue;
  };
  
  // Get category and subcategory IDs
  const categoryId = service.category?._id || service.category;
  const subcategoryId = service.subcategory?._id || service.subcategory;
  
  // Parse features to ensure proper structure
  const rawFeatures = parseArrayField(service.features);
  const parsedFeatures = rawFeatures.map(feature => {
    if (typeof feature === 'string') {
      return { title: feature, description: '', included: true };
    }
    return {
      title: feature.title || '',
      description: feature.description || '',
      included: feature.included !== undefined ? feature.included : true
    };
  });
  
  // Parse FAQs to ensure proper structure
  const rawFaqs = parseArrayField(service.faqs);
  const parsedFaqs = rawFaqs.map(faq => {
    if (typeof faq === 'string') {
      return { question: faq, answer: '' };
    }
    return {
      question: faq.question || '',
      answer: faq.answer || ''
    };
  });
  
  return {
    title: service.title || '',
    description: service.description || '',
    shortDescription: service.shortDescription || '',
    category: categoryId || '',
    subcategory: subcategoryId || '',
    price: service.price || 0,
    currency: service.currency || 'USD',
    deliveryTime: service.deliveryTime || 7,
    deliveryTimeUnit: service.deliveryTimeUnit || 'days',
    revisions: service.revisions || 1,
    status: service.status || 'draft',
    isFeatured: Boolean(service.isFeatured),
    isRecommended: Boolean(service.isRecommended),
    isPopular: Boolean(service.isPopular),
    tags: parseArrayField(service.tags),
    features: parsedFeatures,
    faqs: parsedFaqs,
    packages: parseArrayField(service.packages),
    requirements: parseArrayField(service.requirements),
    images: parseArrayField(service.images),
    searchKeywords: parseArrayField(service.searchKeywords),
    metaTitle: service.metaTitle || '',
    metaDescription: service.metaDescription || '',
    slug: service.slug || ''
  };
};
const fetchSubcategoriesForCategory = async (categoryId) => {
  if (!categoryId) return [];
  
  try {
    console.log('Fetching subcategories for category:', categoryId);
    
    // Option 1: Use the existing subcategories dropdown endpoint
    const response = await adminAPI.getSubcategoriesForDropdown(categoryId);
    
    if (response.data && response.data.success) {
      return response.data.data || [];
    }
    return [];
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    
    // Fallback: Try the regular subcategories endpoint with filter
    try {
      const fallbackResponse = await adminAPI.getSubcategories({
        category: categoryId,
        active: true,
        limit: 100
      });
      
      if (fallbackResponse.data && fallbackResponse.data.success) {
        return fallbackResponse.data.data || [];
      }
      return [];
    } catch (fallbackError) {
      console.error('Fallback subcategories fetch error:', fallbackError);
      toast.error('Failed to load subcategories');
      return [];
    }
  }
};

const ServiceEditModal = memo(({ 
  service, 
  isOpen, 
  onClose, 
  categories = [],
  users = []
}) => {
  const { 
    showServiceLoading, 
    showServiceSuccess, 
    showServiceError, 
    showServiceWarning,
    dismissServiceToast 
  } = useServiceToast();
  // Use the update service hook
  const updateServiceMutation = useUpdateService();
  
  const [formData, setFormData] = useState({
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
    requirements: [],
    images: [],
    searchKeywords: [],
    metaTitle: '',
    metaDescription: '',
    slug: ''
  });
  
  const [errors, setErrors] = useState({});
  const [newTag, setNewTag] = useState('');
  const [activeTab, setActiveTab] = useState('basic');
  const [imagePreviews, setImagePreviews] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [imagesToRemove, setImagesToRemove] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [subcategories, setSubcategories] = useState([]);
  const [isLoadingSubcategories, setIsLoadingSubcategories] = useState(false);
  const [originalSubcategoryId, setOriginalSubcategoryId] = useState('');
  const formRef = useRef(null);

  // Initialize form with service data
  useEffect(() => {
    if (service && isOpen) {
      const parsedData = parseServiceData(service);
      if (parsedData) {
        console.log('Parsed service data:', {
          category: parsedData.category,
          subcategory: parsedData.subcategory,
          originalCategory: service.category,
          originalSubcategory: service.subcategory
        });
        
        setFormData(parsedData);
        setOriginalSubcategoryId(parsedData.subcategory);
        setErrors({});
        setNewTag('');
        
        // Initialize image previews
        const initialImagePreviews = parsedData.images.map(img => ({
          url: typeof img === 'string' ? img : img.url || '',
          name: typeof img === 'string' ? 'Existing Image' : img.name || 'Existing Image',
          isExisting: true,
          id: typeof img === 'string' ? img : img._id || img.id || img.url,
          public_id: img.public_id
        }));
        setImagePreviews(initialImagePreviews);
        setImagesToRemove([]);
        setNewImages([]);
        
        // Fetch subcategories for the current category
        if (parsedData.category) {
          loadSubcategories(parsedData.category);
        }
      }
    }
  }, [service, isOpen]);

  // Load subcategories when category changes
  const loadSubcategories = useCallback(async (categoryId) => {
    if (!categoryId) {
      setSubcategories([]);
      return;
    }
    
    setIsLoadingSubcategories(true);
    try {
      const subs = await fetchSubcategoriesForCategory(categoryId);
      setSubcategories(subs);
      console.log('Loaded subcategories:', subs.map(s => ({ id: s._id, name: s.name })));
    } catch (error) {
      console.error('Error loading subcategories:', error);
      toast.error('Failed to load subcategories');
      setSubcategories([]);
    } finally {
      setIsLoadingSubcategories(false);
    }
  }, []);

  // Handle category change
  const handleCategoryChange = useCallback(async (e) => {
    const { value } = e.target;
    
    console.log('Category changed to:', value, 'Previous subcategory:', formData.subcategory);
    
    setFormData(prev => ({
      ...prev,
      category: value,
      // Clear subcategory if category changes, unless we're reverting to original category
      subcategory: value === prev.category ? prev.subcategory : ''
    }));
    
    // Load subcategories for the new category
    if (value) {
      await loadSubcategories(value);
    } else {
      setSubcategories([]);
    }
    
    // Validate category
    const error = validationRules.category(value);
    setErrors(prev => ({
      ...prev,
      category: error,
      subcategory: value ? prev.subcategory : 'Please select a category first'
    }));
  }, [formData.subcategory, loadSubcategories]);

  // Handle subcategory change
  const handleSubcategoryChange = useCallback((e) => {
    const { value } = e.target;
    
    console.log('Subcategory selected:', value);
    
    setFormData(prev => ({
      ...prev,
      subcategory: value
    }));
    
    // Validate subcategory
    const error = validationRules.subcategory(value);
    setErrors(prev => ({
      ...prev,
      subcategory: error
    }));
  }, []);

  // When subcategories are loaded, try to restore the original subcategory
  useEffect(() => {
    if (subcategories.length > 0 && originalSubcategoryId && !formData.subcategory) {
      const originalSubcategoryExists = subcategories.some(
        sub => sub._id === originalSubcategoryId
      );
      
      if (originalSubcategoryExists) {
        console.log('Restoring original subcategory:', originalSubcategoryId);
        setFormData(prev => ({
          ...prev,
          subcategory: originalSubcategoryId
        }));
      }
    }
  }, [subcategories, originalSubcategoryId, formData.subcategory]);

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
    
    // Validate file size (max 5MB per image)
    const oversizedFiles = files.filter(file => file.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast.error('Some images exceed 5MB limit');
      return;
    }
    
    const newPreviews = files.map(file => ({
      url: URL.createObjectURL(file),
      name: file.name,
      file: file,
      isExisting: false,
      id: `new-${Date.now()}-${Math.random()}`
    }));
    
    // Limit to 10 images total
    const totalImages = imagePreviews.filter(img => !imagesToRemove.includes(img.id)).length + newPreviews.length;
    if (totalImages > 10) {
      toast.error('Maximum 10 images allowed');
      newPreviews.forEach(preview => URL.revokeObjectURL(preview.url));
      return;
    }
    
    setImagePreviews(prev => [...prev, ...newPreviews]);
    setNewImages(prev => [...prev, ...files]);
  }, [imagePreviews, imagesToRemove]);

  const handleRemoveImage = useCallback((index) => {
    const imageToRemove = imagePreviews[index];
    
    if (imageToRemove.isExisting) {
      // Mark existing image for removal
      setImagesToRemove(prev => [...prev, imageToRemove.public_id || imageToRemove.id]);
    } else {
      // Remove new image from previews and newImages list
      URL.revokeObjectURL(imageToRemove.url);
      setNewImages(prev => prev.filter((_, i) => i !== index - imagePreviews.filter(img => img.isExisting).length));
    }
    
    // Remove from previews
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  }, [imagePreviews]);

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

  // Prepare form data for submission
  const prepareFormData = useCallback(() => {
    const formDataToSubmit = new FormData();
    
    // Helper function to safely stringify arrays
    const safeStringify = (data) => {
      try {
        if (Array.isArray(data)) {
          return JSON.stringify(data);
        }
        return '[]';
      } catch (error) {
        console.error('Stringify error:', error);
        return '[]';
      }
    };
    
    // Append basic fields
    const basicFields = [
      'title', 'description', 'shortDescription', 'category', 'subcategory',
      'price', 'currency', 'deliveryTime', 'deliveryTimeUnit', 'revisions',
      'status', 'metaTitle', 'metaDescription', 'slug'
    ];
    
    basicFields.forEach(key => {
      if (formData[key] !== undefined && formData[key] !== null) {
        formDataToSubmit.append(key, String(formData[key]));
      }
    });
    
    // Append boolean fields
    const booleanFields = ['isFeatured', 'isRecommended', 'isPopular'];
    booleanFields.forEach(key => {
      if (formData[key] !== undefined) {
        formDataToSubmit.append(key, String(Boolean(formData[key])));
      }
    });
    
    // Append array fields as JSON strings
    const arrayFields = ['tags', 'features', 'faqs', 'packages', 'requirements', 'searchKeywords'];
    arrayFields.forEach(key => {
      if (formData[key] && formData[key].length > 0) {
        formDataToSubmit.append(key, safeStringify(formData[key]));
      } else {
        formDataToSubmit.append(key, '[]');
      }
    });
    
    // Append images to remove
    if (imagesToRemove.length > 0) {
      formDataToSubmit.append('imagesToRemove', JSON.stringify(imagesToRemove));
    }
    
    // Append new images
    newImages.forEach((file, index) => {
      formDataToSubmit.append(`newImages`, file);
    });
    
    // Log what we're submitting
    console.log('Submitting form data:', {
      category: formData.category,
      subcategory: formData.subcategory,
      imagesToRemove,
      newImagesCount: newImages.length
    });
    
    return formDataToSubmit;
  }, [formData, imagesToRemove, newImages, service]);

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
      
      showServiceError('Please fix the errors in the form');
      return;
    }
    
    if (!service?._id) {
      showServiceError('Service ID is required');
      return;
    }
    
    setIsLoading(true);
    const loadingToastId = showServiceLoading('Updating service...');
    
    try {
      const formDataToSubmit = prepareFormData();
      
      // Use the mutation hook
      await updateServiceMutation.mutateAsync({
        id: service._id,
        data: formDataToSubmit
      }, {
        onSuccess: (response) => {
          console.log('Update successful:', response.data);
          dismissServiceToast(loadingToastId);
          showServiceSuccess('Service updated successfully');
          onClose();
        },
        onError: (error) => {
          console.error('Update error:', error);
          dismissServiceToast(loadingToastId);
          showServiceError(error.response?.data?.message || 'Failed to update service');
        }
      });
    } catch (error) {
      console.error('Form submission error:', error);
      dismissServiceToast(loadingToastId);
      showServiceError(error.message || 'Failed to update service');
    } finally {
      setIsLoading(false);
    }
  }, [formData, validateForm, prepareFormData, service, updateServiceMutation, onClose, showServiceLoading, showServiceSuccess, showServiceError, dismissServiceToast]);

  // Reset and close modal
  const handleClose = useCallback(() => {
    // Clean up object URLs
    imagePreviews.forEach(preview => {
      if (!preview.isExisting && preview.url) {
        URL.revokeObjectURL(preview.url);
      }
    });
    
    setFormData({
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
      requirements: [],
      images: [],
      searchKeywords: [],
      metaTitle: '',
      metaDescription: '',
      slug: ''
    });
    setErrors({});
    setNewTag('');
    setImagePreviews([]);
    setNewImages([]);
    setImagesToRemove([]);
    setActiveTab('basic');
    setSubcategories([]);
    setOriginalSubcategoryId('');
    setIsLoading(false);
    setIsLoadingSubcategories(false);
    onClose();
  }, [imagePreviews, onClose]);

  // Handle Enter key for tags
  const handleTagKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  }, [handleAddTag]);

  // Don't render if not open or no service
  if (!isOpen || !service) return null;

  const loading = isLoading || updateServiceMutation.isLoading;
  const totalLoading = loading || isLoadingSubcategories;

  // Debug info
  console.log('Current form state:', {
    category: formData.category,
    subcategory: formData.subcategory,
    subcategoriesCount: subcategories.length,
    originalSubcategoryId,
    isLoadingSubcategories
  });

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
                <h3 className="text-lg font-semibold text-gray-900">Edit Service</h3>
                <p className="text-sm text-gray-500">{service.title}</p>
                <p className="text-xs text-gray-400">ID: {service._id}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close modal"
              disabled={loading}
            >
              <FiX className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Stats Info */}
        <div className="px-6 pt-6">
          <div className="flex flex-wrap gap-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center text-sm text-gray-600">
              <FiEye className="h-4 w-4 mr-2 text-gray-400" />
              <span className="font-medium">{service.views || 0} views</span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <FiStar className="h-4 w-4 mr-2 text-yellow-500" />
              <span className="font-medium">{service.rating?.toFixed(1) || '0.0'} rating</span>
            </div>
            
            <div className="flex items-center text-sm text-gray-600">
              <FiGrid className="h-4 w-4 mr-2 text-blue-400" />
              <span className="font-medium">
                Category: {service.category?.name || 'Unknown'}
              </span>
            </div>
            
            <div className="flex items-center text-sm text-gray-600">
              <FiLayers className="h-4 w-4 mr-2 text-green-400" />
              <span className="font-medium">
                Subcategory: {service.subcategory?.name || 'None'}
              </span>
            </div>
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
              disabled={loading}
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
              disabled={loading}
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
              disabled={loading}
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
              disabled={loading}
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
              disabled={loading}
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
                  id="title"
                  name="title"
                  type="text"
                  value={formData.title}
                  onChange={handleChange}
                  disabled={loading}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                    errors.title ? 'border-red-300' : 'border-gray-300'
                  } ${loading ? 'bg-gray-50 cursor-not-allowed' : ''}`}
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
                      onChange={handleCategoryChange}
                      disabled={loading || categories.length === 0}
                      className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none transition-colors ${
                        errors.category ? 'border-red-300' : 'border-gray-300'
                      } ${loading || categories.length === 0 ? 'bg-gray-50 cursor-not-allowed' : ''}`}
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
    {formData.category && !isLoadingSubcategories && (
      <span className="ml-2 text-xs text-gray-500">
        ({subcategories.length} available)
      </span>
    )}
  </label>
  <div className="relative">
    <select
      id="subcategory"
      name="subcategory"
      value={formData.subcategory}
      onChange={handleSubcategoryChange}
      disabled={loading || !formData.category || isLoadingSubcategories}
      className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none transition-colors ${
        errors.subcategory ? 'border-red-300' : 'border-gray-300'
      } ${loading || !formData.category || isLoadingSubcategories ? 'bg-gray-50 cursor-not-allowed' : ''}`}
    >
      <option value="">
        {!formData.category 
          ? 'Select a category first'
          : isLoadingSubcategories
            ? 'Loading subcategories...'
            : 'Select a subcategory'
        }
      </option>
      
      {/* Always show subcategories if they exist */}
      {!isLoadingSubcategories && subcategories.length > 0 && (
        subcategories.map(subcategory => (
          <option 
            key={subcategory._id} 
            value={subcategory._id}
          >
            {subcategory.name}

          </option>
        ))
      )}
      
      {/* Show message if no subcategories */}
      {!isLoadingSubcategories && formData.category && subcategories.length === 0 && (
        <option value="" disabled>
          No subcategories available for this category
        </option>
      )}
    </select>
    
    {isLoadingSubcategories && formData.category ? (
      <FiLoader className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-500 h-5 w-5 animate-spin" />
    ) : (
      <FiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 pointer-events-none" />
    )}
  </div>
  
  {/* Status Messages */}
  {isLoadingSubcategories && formData.category && (
    <div className="mt-1.5 text-sm text-blue-600 flex items-center">
      <FiLoader className="h-4 w-4 mr-1 animate-spin" />
      Loading subcategories...
    </div>
  )}
  
  {errors.subcategory && (
    <p className="mt-1.5 text-sm text-red-600 flex items-center">
      <FiAlertCircle className="h-4 w-4 mr-1" />
      {errors.subcategory}
    </p>
  )}
  
  {!isLoadingSubcategories && formData.category && subcategories.length === 0 && (
    <p className="mt-1.5 text-sm text-yellow-600 flex items-center">
      <FiAlertCircle className="h-4 w-4 mr-1" />
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
                  disabled={loading}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                    errors.shortDescription ? 'border-red-300' : 'border-gray-300'
                  } ${loading ? 'bg-gray-50 cursor-not-allowed' : ''}`}
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
                      disabled={loading}
                      className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                        errors.price ? 'border-red-300' : 'border-gray-300'
                      } ${loading ? 'bg-gray-50 cursor-not-allowed' : ''}`}
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
                    disabled={loading}
                    className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                      loading ? 'bg-gray-50 cursor-not-allowed' : ''
                    }`}
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
                      disabled={loading}
                      className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                        errors.deliveryTime ? 'border-red-300' : 'border-gray-300'
                      } ${loading ? 'bg-gray-50 cursor-not-allowed' : ''}`}
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
                    disabled={loading}
                    className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                      loading ? 'bg-gray-50 cursor-not-allowed' : ''
                    }`}
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
                    disabled={loading}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                      errors.revisions ? 'border-red-300' : 'border-gray-300'
                    } ${loading ? 'bg-gray-50 cursor-not-allowed' : ''}`}
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
                  disabled={loading}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                    errors.description ? 'border-red-300' : 'border-gray-300'
                  } ${loading ? 'bg-gray-50 cursor-not-allowed' : ''}`}
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
                      onKeyPress={handleTagKeyPress}
                      placeholder="Add a tag (press Enter)"
                      disabled={loading}
                      className={`flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                        loading ? 'bg-gray-50 cursor-not-allowed' : ''
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      disabled={loading}
                      className="px-4 py-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
                            disabled={loading}
                            className="ml-2 text-indigo-600 hover:text-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    Features
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    disabled={loading}
                    className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
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
                            disabled={loading}
                            className="h-4 w-4 text-indigo-600 border-gray-300 rounded disabled:opacity-50"
                          />
                          <h5 className="font-medium text-gray-900">Feature {index + 1}</h5>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFeature(index)}
                          disabled={loading}
                          className="text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <FiTrash2 className="h-4 w-4" />
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
                            disabled={loading}
                            className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${
                              loading ? 'bg-gray-50 cursor-not-allowed' : ''
                            }`}
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
                            disabled={loading}
                            className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${
                              loading ? 'bg-gray-50 cursor-not-allowed' : ''
                            }`}
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
                      <div key={image.id} className="relative group">
                        <img
                          src={image.url}
                          alt={`Service ${index + 1}`}
                          className="h-32 w-full object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          disabled={loading}
                          className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <FiX className="h-4 w-4" />
                        </button>
                        <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                          {image.isExisting ? 'Existing' : 'New'}
                        </div>
                        {imagesToRemove.includes(image.public_id || image.id) && (
                          <div className="absolute inset-0 bg-red-500 bg-opacity-20 flex items-center justify-center rounded-lg">
                            <span className="text-xs font-semibold text-white bg-red-600 px-2 py-1 rounded">
                              To be removed
                            </span>
                          </div>
                        )}
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
                    Upload service images (max 10 images total, 5MB each)
                  </p>
                  <input
                    type="file"
                    id="service-new-images"
                    multiple
                    accept="image/*"
                    onChange={handleImageSelect}
                    disabled={loading}
                    className="hidden"
                  />
                  <label
                    htmlFor="service-new-images"
                    className={`inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer ${
                      loading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <FiUpload className="h-5 w-5 mr-2" />
                    Select New Images
                  </label>
                  <p className="text-xs text-gray-500 mt-4">
                    {imagePreviews.filter(img => !img.isExisting).length} new images selected
                    {imagesToRemove.length > 0 && ` • ${imagesToRemove.length} images to remove`}
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
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  disabled={loading}
                  className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                    loading ? 'bg-gray-50 cursor-not-allowed' : ''
                  }`}
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending Review</option>
                  <option value="paused">Paused</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              
              <div className="space-y-4">
                <label className={`flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}>
                  <input
                    type="checkbox"
                    name="isFeatured"
                    checked={formData.isFeatured}
                    onChange={handleChange}
                    disabled={loading}
                    className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 mt-0.5 disabled:opacity-50"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Featured Service</span>
                    <p className="text-sm text-gray-500 mt-1">
                      Featured services appear in highlighted sections on the homepage.
                    </p>
                  </div>
                </label>
                
                <label className={`flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}>
                  <input
                    type="checkbox"
                    name="isRecommended"
                    checked={formData.isRecommended}
                    onChange={handleChange}
                    disabled={loading}
                    className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 mt-0.5 disabled:opacity-50"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Recommended Service</span>
                    <p className="text-sm text-gray-500 mt-1">
                      Recommended services appear in personalized recommendations.
                    </p>
                  </div>
                </label>
                
                <label className={`flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}>
                  <input
                    type="checkbox"
                    name="isPopular"
                    checked={formData.isPopular}
                    onChange={handleChange}
                    disabled={loading}
                    className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 mt-0.5 disabled:opacity-50"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Popular Service</span>
                    <p className="text-sm text-gray-500 mt-1">
                      Popular services appear in popular listings.
                    </p>
                  </div>
                </label>
              </div>
              
              {/* Meta Information */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  SEO Settings
                </h4>
                
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
                    disabled={loading}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50"
                    placeholder="Title for search engines (optional)"
                  />
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
                    rows={3}
                    disabled={loading}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50"
                    placeholder="Description for search engines (optional)"
                  />
                </div>
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
                disabled={loading}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={totalLoading}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {totalLoading ? (
                  <>
                    <FiLoader className="h-4 w-4 animate-spin" />
                    <span>Saving Changes...</span>
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

ServiceEditModal.displayName = 'ServiceEditModal';

export default ServiceEditModal;