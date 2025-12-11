// CreateService.jsx - Complete updated file
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Eye,
  Upload,
  Plus,
  Trash2,
  DollarSign,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Star,
  Tag,
  Package,
  HelpCircle,
  CheckSquare,
  X,
  Zap,
  Loader2,
  ChevronDown,
  Shield,
  Target,
  Users,
  Briefcase,
  FileText,
  Type,
  Layers,
  Sparkles
} from 'lucide-react';
import { useCreateService } from '../../hooks/useServices.js';
import { useCategories } from '../../hooks/useCategories';
import { toast } from 'react-hot-toast';

const CreateService = () => {
  const navigate = useNavigate();
  const createServiceMutation = useCreateService();
  
  // Use the categories hook
  const { 
    data: categoriesData, 
    isLoading: categoryLoading, 
    error: categoryError,
    refetch: refetchCategories 
  } = useCategories();

  // Form state with all fields from service model
  const [formData, setFormData] = useState({
    // Basic Information
    title: '',
    description: '',
    shortDescription: '',
    category: '',
    subcategory: '',

    // Pricing & Delivery
    price: '',
    currency: 'USD',
    deliveryTime: '',
    deliveryTimeUnit: 'days',
    revisions: 1,

    // Arrays
    tags: [],
    features: [],
    requirements: [],
    faqs: [],
    packages: [],
    searchKeywords: [],

    // Metadata
    metaTitle: '',
    metaDescription: '',
    gigType: 'basic',

    // Status
    status: 'draft',

    // Optional fields with defaults
    sellerLevel: 'new',
    isFeatured: false,
    isRecommended: false,
    isPopular: false,
  });

  // Component states
  const [subcategories, setSubcategories] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [newFeature, setNewFeature] = useState({
    title: '',
    description: '',
    included: true
  });
  const [newRequirement, setNewRequirement] = useState({
    question: '',
    type: 'text',
    required: false,
    options: []
  });
  const [newFAQ, setNewFAQ] = useState({
    question: '',
    answer: ''
  });
  const [newPackage, setNewPackage] = useState({
    name: '',
    description: '',
    price: '',
    deliveryTime: '',
    revisions: 0,
    features: [],
    popular: false
  });
  const [newRequirementOption, setNewRequirementOption] = useState('');
  const [newPackageFeature, setNewPackageFeature] = useState('');

  // Update subcategories when category changes
  useEffect(() => {
    if (formData.category && categoriesData && Array.isArray(categoriesData)) {
      // Find the selected category
      const selectedCategory = categoriesData.find(cat => cat._id === formData.category);
      
      if (selectedCategory) {
        // If categories have subcategories field
        const subs = selectedCategory.children || selectedCategory.subcategories || [];
        setSubcategories(subs);
        
        // Reset subcategory if parent category changes and subcategory is not valid
        if (formData.subcategory && !subs.find(s => s._id === formData.subcategory)) {
          setFormData(prev => ({ ...prev, subcategory: '' }));
        }
      } else {
        setSubcategories([]);
        setFormData(prev => ({ ...prev, subcategory: '' }));
      }
    } else {
      setSubcategories([]);
      setFormData(prev => ({ ...prev, subcategory: '' }));
    }
  }, [formData.category, categoriesData]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Tag Management
  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim()) && formData.tags.length < 20) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
      toast.success('Tag added');
    } else if (formData.tags.length >= 20) {
      toast.error('Maximum 20 tags allowed');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
    toast.success('Tag removed');
  };

  // Search Keywords Management
  const handleAddKeyword = () => {
    if (newKeyword.trim() && !formData.searchKeywords.includes(newKeyword.trim()) && formData.searchKeywords.length < 20) {
      setFormData(prev => ({
        ...prev,
        searchKeywords: [...prev.searchKeywords, newKeyword.trim()]
      }));
      setNewKeyword('');
      toast.success('Keyword added');
    } else if (formData.searchKeywords.length >= 20) {
      toast.error('Maximum 20 keywords allowed');
    }
  };

  const handleRemoveKeyword = (keywordToRemove) => {
    setFormData(prev => ({
      ...prev,
      searchKeywords: prev.searchKeywords.filter(keyword => keyword !== keywordToRemove)
    }));
    toast.success('Keyword removed');
  };

  // Features Management
  const handleAddFeature = () => {
    if (newFeature.title.trim()) {
      setFormData(prev => ({
        ...prev,
        features: [...prev.features, { ...newFeature }]
      }));
      setNewFeature({ title: '', description: '', included: true });
      toast.success('Feature added');
    }
  };

  const handleRemoveFeature = (index) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
    toast.success('Feature removed');
  };

  // Requirements Management
  const handleAddRequirementOption = () => {
    if (newRequirementOption.trim() && newRequirement.options.length < 20) {
      setNewRequirement(prev => ({
        ...prev,
        options: [...prev.options, newRequirementOption.trim()]
      }));
      setNewRequirementOption('');
      toast.success('Option added');
    }
  };

  const handleRemoveRequirementOption = (optionToRemove) => {
    setNewRequirement(prev => ({
      ...prev,
      options: prev.options.filter(option => option !== optionToRemove)
    }));
    toast.success('Option removed');
  };

  const handleAddRequirement = () => {
    if (newRequirement.question.trim()) {
      setFormData(prev => ({
        ...prev,
        requirements: [...prev.requirements, { ...newRequirement }]
      }));
      setNewRequirement({
        question: '',
        type: 'text',
        required: false,
        options: []
      });
      toast.success('Requirement added');
    }
  };

  const handleRemoveRequirement = (index) => {
    setFormData(prev => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index)
    }));
    toast.success('Requirement removed');
  };

  // FAQs Management
  const handleAddFAQ = () => {
    if (newFAQ.question.trim() && newFAQ.answer.trim()) {
      setFormData(prev => ({
        ...prev,
        faqs: [...prev.faqs, { ...newFAQ }]
      }));
      setNewFAQ({ question: '', answer: '' });
      toast.success('FAQ added');
    }
  };

  const handleRemoveFAQ = (index) => {
    setFormData(prev => ({
      ...prev,
      faqs: prev.faqs.filter((_, i) => i !== index)
    }));
    toast.success('FAQ removed');
  };

  // Packages Management
  const handleAddPackageFeature = () => {
    if (newPackageFeature.trim() && newPackage.features.length < 20) {
      setNewPackage(prev => ({
        ...prev,
        features: [...prev.features, newPackageFeature.trim()]
      }));
      setNewPackageFeature('');
      toast.success('Package feature added');
    }
  };

  const handleRemovePackageFeature = (featureToRemove) => {
    setNewPackage(prev => ({
      ...prev,
      features: prev.features.filter(feature => feature !== featureToRemove)
    }));
    toast.success('Package feature removed');
  };

  const handleAddPackage = () => {
    if (newPackage.name.trim() && newPackage.price && newPackage.deliveryTime) {
      setFormData(prev => ({
        ...prev,
        packages: [...prev.packages, {
          ...newPackage,
          price: parseFloat(newPackage.price) || 0,
          deliveryTime: parseInt(newPackage.deliveryTime) || 1
        }]
      }));
      setNewPackage({
        name: '',
        description: '',
        price: '',
        deliveryTime: '',
        revisions: 0,
        features: [],
        popular: false
      });
      toast.success('Package added');
    }
  };

  const handleRemovePackage = (index) => {
    setFormData(prev => ({
      ...prev,
      packages: prev.packages.filter((_, i) => i !== index)
    }));
    toast.success('Package removed');
  };

  // Validation
  const validateForm = () => {
    const errors = [];

    console.group('=== FORM VALIDATION ===');

    // Title validation
    if (!formData.title.trim()) {
      errors.push('Service title is required');
    } else if (formData.title.trim().length < 5) {
      errors.push('Title must be at least 5 characters');
    }

    // Description validation
    if (!formData.description.trim()) {
      errors.push('Description is required');
    } else if (formData.description.trim().length < 50) {
      errors.push('Description must be at least 50 characters');
    }

    // Category validation
    console.log('Category validation:');
    console.log('Selected category:', formData.category);
    console.log('Available categories:', categoriesData);
    
    if (!formData.category) {
      errors.push('Category is required');
    } else if (categoriesData && Array.isArray(categoriesData)) {
      // Verify the category exists in fetched data
      const categoryExists = categoriesData.some(cat => cat._id === formData.category);
      if (!categoryExists) {
        errors.push('Invalid category selected. Please refresh and try again.');
      }
    }

    // Price validation
    const priceNum = parseFloat(formData.price);
    if (!formData.price || formData.price === '') {
      errors.push('Price is required');
    } else if (isNaN(priceNum)) {
      errors.push('Price must be a valid number');
    } else if (priceNum < 1) {
      errors.push('Price must be at least $1');
    } else if (priceNum > 100000) {
      errors.push('Price cannot exceed $100,000');
    }

    // Delivery time validation
    const deliveryNum = parseInt(formData.deliveryTime);
    if (!formData.deliveryTime || formData.deliveryTime === '') {
      errors.push('Delivery time is required');
    } else if (isNaN(deliveryNum)) {
      errors.push('Delivery time must be a valid number');
    } else if (deliveryNum < 1) {
      errors.push('Delivery time must be at least 1');
    } else if (deliveryNum > 365) {
      errors.push('Delivery time cannot exceed 365 days');
    }

    console.groupEnd();
    console.log('Total validation errors:', errors.length);

    return errors;
  };

  // Submit Handler
  const handleSubmit = async (e, status = 'draft') => {
    e.preventDefault();

    console.log('=== FORM SUBMISSION STARTED ===');
    console.log('Status:', status);
    console.log('Form data state:', formData);

    // Check if user is logged in
    const token = localStorage.getItem('token') || localStorage.getItem('userToken');
    console.log('Auth token exists:', !!token);

    if (!token) {
      toast.error('Please login to create a service');
      navigate('/login');
      return;
    }

    // Check categories are loaded
    if (categoryLoading) {
      toast.error('Categories are still loading. Please wait...');
      return;
    }

    if (categoryError) {
      toast.error('Failed to load categories. Please refresh the page.');
      return;
    }

    // Client-side validation
    const validationErrors = validateForm();
    console.log('Validation errors:', validationErrors);

    if (validationErrors.length > 0) {
      validationErrors.forEach(error => {
        toast.error(error);
      });
      
      if (validationErrors.length > 1) {
        toast.error(`Please fix ${validationErrors.length} errors before submitting`);
      }
      return;
    }

    console.log('Validation passed');

    // Prepare data with proper type conversion
    const serviceData = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      category: formData.category,
      price: parseFloat(formData.price),
      currency: formData.currency,
      deliveryTime: parseInt(formData.deliveryTime),
      deliveryTimeUnit: formData.deliveryTimeUnit,
      revisions: parseInt(formData.revisions) || 1,
      gigType: formData.gigType,
      status: status,
      sellerLevel: formData.sellerLevel,
      isFeatured: formData.isFeatured,
      isRecommended: formData.isRecommended,
      isPopular: formData.isPopular,
    };

    // Add optional fields only if they have values
    if (formData.shortDescription.trim()) {
      serviceData.shortDescription = formData.shortDescription.trim();
    }

    if (formData.subcategory) {
      serviceData.subcategory = formData.subcategory;
    }

    if (formData.metaTitle.trim()) {
      serviceData.metaTitle = formData.metaTitle.trim();
    }

    if (formData.metaDescription.trim()) {
      serviceData.metaDescription = formData.metaDescription.trim();
    }

    // Add arrays only if they have items
    if (formData.tags.length > 0) {
      serviceData.tags = formData.tags.filter(tag => tag.trim() !== '');
    }

    if (formData.searchKeywords.length > 0) {
      serviceData.searchKeywords = formData.searchKeywords.filter(keyword => keyword.trim() !== '');
    }

    if (formData.features.length > 0) {
      serviceData.features = formData.features;
    }

    if (formData.requirements.length > 0) {
      serviceData.requirements = formData.requirements;
    }

    if (formData.faqs.length > 0) {
      serviceData.faqs = formData.faqs;
    }

    if (formData.packages.length > 0) {
      serviceData.packages = formData.packages;
    }

    console.log('Final service data to submit:', JSON.stringify(serviceData, null, 2));
    console.log('Selected category ID:', formData.category);

    try {
      console.log('Calling mutateAsync...');
      await createServiceMutation.mutateAsync({
        serviceData,
        files: null
      });
      
      // Navigation is handled in the mutation's onSuccess callback
      // No need to navigate here
      
    } catch (error) {
      console.error('=== CREATE SERVICE ERROR ===');
      console.error('Full error:', error);
      
      // Handle specific error messages
      if (error.message.includes('Category not found') || error.message.includes('Invalid category')) {
        toast.error('Invalid category selected. Please refresh the page and select a valid category.');
        await refetchCategories();
      } else if (error.message.includes('Network Error')) {
        toast.error('Network error. Please check your connection.');
      } else {
        toast.error(error.message || 'Failed to create service');
      }
    }
  };

  // Get category name for display
  const getCategoryName = () => {
    if (!formData.category || !categoriesData || !Array.isArray(categoriesData)) return "";
    const category = categoriesData.find(c => c._id === formData.category);
    return category?.name || "";
  };

  // Get subcategory name for display
  const getSubcategoryName = () => {
    if (!formData.subcategory) return "";
    const subcategory = subcategories.find(s => s._id === formData.subcategory);
    return subcategory?.name || "";
  };

  // Helper function to handle Enter key press
  const handleKeyPress = (e, type) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      switch(type) {
        case 'tag': handleAddTag(); break;
        case 'keyword': handleAddKeyword(); break;
        case 'feature': handleAddFeature(); break;
        case 'requirement': handleAddRequirement(); break;
        case 'requirementOption': handleAddRequirementOption(); break;
        case 'faq': handleAddFAQ(); break;
        case 'packageFeature': handleAddPackageFeature(); break;
        case 'package': handleAddPackage(); break;
      }
    }
  };

  // Fill test data (for development only)
  const fillTestData = () => {
    if (process.env.NODE_ENV !== 'development') return;
    
    // Check if we have categories loaded
    if (!categoriesData || categoriesData.length === 0) {
      toast.error('Please wait for categories to load first');
      return;
    }
    
    setFormData({
      title: "Professional Web Development Service",
      description: "I will create a responsive, modern website using React.js, Node.js, and MongoDB. This includes complete frontend and backend development, database design, API integration, and deployment. I ensure clean code, proper documentation, and SEO optimization. I've built over 50 websites for clients worldwide and specialize in e-commerce, SaaS applications, and custom web solutions.",
      shortDescription: "Professional website development with modern technologies",
      category: categoriesData[0]._id,
      subcategory: '',
      price: "499",
      currency: "USD",
      deliveryTime: "14",
      deliveryTimeUnit: "days",
      revisions: 3,
      tags: ["web-development", "react", "nodejs", "mongodb", "fullstack"],
      searchKeywords: ["website", "web app", "responsive design", "ecommerce"],
      features: [
        {
          title: "Responsive Design",
          description: "Works perfectly on all devices (mobile, tablet, desktop)",
          included: true
        },
        {
          title: "SEO Optimization",
          description: "Search engine friendly with meta tags and sitemap",
          included: true
        },
        {
          title: "Fast Loading",
          description: "Optimized for speed and performance",
          included: true
        }
      ],
      requirements: [
        {
          question: "What is your project about?",
          type: "text",
          required: true,
          options: []
        }
      ],
      faqs: [
        {
          question: "What technologies do you use?",
          answer: "I use modern technologies including React.js, Node.js, MongoDB, and various CSS frameworks."
        },
        {
          question: "Do you provide maintenance after delivery?",
          answer: "Yes, I offer 30 days of free support and maintenance after project delivery."
        }
      ],
      packages: [
        {
          name: "Basic",
          description: "Simple website with basic features",
          price: 299,
          deliveryTime: 7,
          revisions: 2,
          features: ["Responsive Design", "Contact Form", "Basic SEO"],
          popular: false
        },
        {
          name: "Premium",
          description: "Advanced website with all features",
          price: 799,
          deliveryTime: 21,
          revisions: 5,
          features: ["Everything in Basic", "E-commerce", "Admin Panel", "API Integration"],
          popular: true
        }
      ],
      metaTitle: "Professional Web Development - React & Node.js Expert",
      metaDescription: "Hire me for professional web development using modern technologies. Get a responsive, fast, and SEO-friendly website.",
      gigType: "premium",
      status: "draft",
      sellerLevel: "level2",
      isFeatured: false,
      isRecommended: false,
      isPopular: false
    });
    
    toast.success("Test data filled. Please review and submit.");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <button
                onClick={() => navigate('/profile')}
                className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Profile
              </button>
              <h1 className="text-3xl font-bold text-gray-900">Create New Service</h1>
              <p className="text-gray-600 mt-2">Fill in the details to create your service listing</p>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <button
                type="button"
                onClick={fillTestData}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
              >
                Fill Test Data
              </button>
            )}
          </div>

          {/* Quick Stats */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-8 border border-blue-100">
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <Target className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Required Fields</p>
                  <p className="font-semibold text-gray-900">5</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Completion</p>
                  <p className="font-semibold text-gray-900">
                    {(() => {
                      const fields = ['title', 'description', 'category', 'price', 'deliveryTime'];
                      const completed = fields.filter(f => {
                        if (f === 'price' || f === 'deliveryTime') {
                          return formData[f] && !isNaN(parseFloat(formData[f])) && parseFloat(formData[f]) > 0;
                        }
                        return formData[f] && formData[f].toString().trim().length > 0;
                      }).length;
                      return `${Math.round((completed / fields.length) * 100)}%`;
                    })()}
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center mr-3">
                  <Shield className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Security</p>
                  <p className="font-semibold text-gray-900">Verified</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={(e) => handleSubmit(e, 'draft')} className="space-y-8">
          {/* Section 1: Basic Information */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <Briefcase className="w-6 h-6 mr-2 text-blue-600" />
              Basic Information
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Professional Web Development"
                  required
                />
                <div className="flex justify-between mt-2">
                  <p className="text-xs text-gray-500">
                    Minimum 5 characters required
                  </p>
                  <span className={`text-xs ${formData.title.length >= 5 ? 'text-green-600' : 'text-red-600'}`}>
                    {formData.title.length}/200
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none pr-10"
                      required
                      disabled={categoryLoading || createServiceMutation.isPending}
                    >
                      <option value="">Select a category</option>
                      {categoryLoading ? (
                        <option value="" disabled>Loading categories...</option>
                      ) : categoryError ? (
                        <option value="" disabled>Failed to load categories</option>
                      ) : categoriesData && Array.isArray(categoriesData) && categoriesData.length > 0 ? (
                        categoriesData.map(category => (
                          <option key={category._id} value={category._id}>
                            {category.name}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>No categories available</option>
                      )}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </div>
                  {categoryLoading && (
                    <div className="flex items-center mt-2 text-sm text-gray-500">
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      Loading categories...
                    </div>
                  )}
                  {categoryError && !categoryLoading && (
                    <div className="mt-2">
                      <p className="text-sm text-red-600">Failed to load categories</p>
                      <button
                        type="button"
                        onClick={refetchCategories}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium mt-1"
                      >
                        Try again
                      </button>
                    </div>
                  )}
                  {formData.category && (
                    <p className="text-xs text-green-600 mt-2">
                      Selected: <span className="font-medium">{getCategoryName()}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subcategory
                  </label>
                  <div className="relative">
                    <select
                      name="subcategory"
                      value={formData.subcategory}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none pr-10"
                      disabled={!formData.category || subcategories.length === 0 || createServiceMutation.isPending}
                    >
                      <option value="">Select a subcategory (optional)</option>
                      {subcategories.map(subcategory => (
                        <option key={subcategory._id} value={subcategory._id}>
                          {subcategory.name}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </div>
                  {formData.subcategory && (
                    <p className="text-xs text-green-600 mt-2">
                      Selected: <span className="font-medium">{getSubcategoryName()}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gig Type
                  </label>
                  <select
                    name="gigType"
                    value={formData.gigType}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={createServiceMutation.isPending}
                  >
                    <option value="basic">Basic</option>
                    <option value="standard">Standard</option>
                    <option value="premium">Premium</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seller Level
                  </label>
                  <select
                    name="sellerLevel"
                    value={formData.sellerLevel}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={createServiceMutation.isPending}
                  >
                    <option value="new">New Seller</option>
                    <option value="level1">Level 1</option>
                    <option value="level2">Level 2</option>
                    <option value="toprated">Top Rated</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Short Description
                </label>
                <textarea
                  name="shortDescription"
                  value={formData.shortDescription}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows="3"
                  placeholder="Brief description of your service (appears in listings)"
                  maxLength="250"
                  disabled={createServiceMutation.isPending}
                />
                <div className="flex justify-between mt-2">
                  <p className="text-xs text-gray-500">
                    Optional - appears in search results
                  </p>
                  <span className="text-xs text-gray-500">
                    {formData.shortDescription.length}/250
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows="6"
                  placeholder="Detailed description of your service. Include what clients will get, your process, and any important details. Minimum 50 characters."
                  required
                  disabled={createServiceMutation.isPending}
                />
                <div className="flex justify-between mt-2">
                  <div>
                    <p className="text-xs text-gray-500">
                      Minimum 50 characters required
                    </p>
                    <p className="text-xs text-gray-500">
                      Maximum 5000 characters allowed
                    </p>
                  </div>
                  <span className={`text-xs font-medium ${formData.description.length < 50 ? 'text-red-600' : 'text-green-600'}`}>
                    {formData.description.length}/5000
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Pricing & Delivery */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <DollarSign className="w-6 h-6 mr-2 text-green-600" />
              Pricing & Delivery
            </h2>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                      required
                      min="1"
                      max="100000"
                      step="0.01"
                      disabled={createServiceMutation.isPending}
                    />
                  </div>
                  <div className="flex justify-between mt-2">
                    <p className="text-xs text-gray-500">Minimum $1, maximum $100,000</p>
                    {formData.price && (
                      <span className="text-xs text-green-600">
                        ${parseFloat(formData.price).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Currency
                  </label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={createServiceMutation.isPending}
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CAD">CAD (C$)</option>
                    <option value="AUD">AUD (A$)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="PKR">PKR (₨)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Delivery Time <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="number"
                      name="deliveryTime"
                      value={formData.deliveryTime}
                      onChange={handleInputChange}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., 7"
                      required
                      min="1"
                      max="365"
                      disabled={createServiceMutation.isPending}
                    />
                    <select
                      name="deliveryTimeUnit"
                      value={formData.deliveryTimeUnit}
                      onChange={handleInputChange}
                      className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={createServiceMutation.isPending}
                    >
                      <option value="days">Days</option>
                      <option value="hours">Hours</option>
                      <option value="weeks">Weeks</option>
                    </select>
                  </div>
                  <div className="flex justify-between mt-2">
                    <p className="text-xs text-gray-500">Minimum 1 day, maximum 365 days</p>
                    {formData.deliveryTime && (
                      <span className="text-xs text-green-600">
                        {formData.deliveryTime} {formData.deliveryTimeUnit}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Revisions Included
                  </label>
                  <input
                    type="number"
                    name="revisions"
                    value={formData.revisions}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Number of revisions"
                    min="0"
                    max="99"
                    disabled={createServiceMutation.isPending}
                  />
                  <p className="text-xs text-gray-500 mt-2">0-99 revisions included</p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Tags & Keywords */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <Tag className="w-6 h-6 mr-2 text-purple-600" />
              Tags & Keywords
            </h2>

            <div className="space-y-8">
              {/* Tags */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <Tag className="w-5 h-5 mr-2" />
                  Service Tags
                </h3>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => handleKeyPress(e, 'tag')}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Add a tag (e.g., web development, design)"
                      maxLength="30"
                      disabled={createServiceMutation.isPending}
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      disabled={createServiceMutation.isPending}
                      className="px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Tags help customers find your service. Maximum 20 tags.
                  </p>

                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1.5 rounded-full bg-purple-100 text-purple-800 text-sm"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            disabled={createServiceMutation.isPending}
                            className="ml-2 text-purple-600 hover:text-purple-800 disabled:opacity-50"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Search Keywords */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <Eye className="w-5 h-5 mr-2" />
                  Search Keywords
                </h3>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      onKeyPress={(e) => handleKeyPress(e, 'keyword')}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Add search keyword (e.g., web design, logo design)"
                      maxLength="30"
                      disabled={createServiceMutation.isPending}
                    />
                    <button
                      type="button"
                      onClick={handleAddKeyword}
                      disabled={createServiceMutation.isPending}
                      className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Keywords improve search visibility. Maximum 20 keywords.
                  </p>

                  {formData.searchKeywords.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.searchKeywords.map((keyword, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1.5 rounded-full bg-blue-100 text-blue-800 text-sm"
                        >
                          {keyword}
                          <button
                            type="button"
                            onClick={() => handleRemoveKeyword(keyword)}
                            disabled={createServiceMutation.isPending}
                            className="ml-2 text-blue-600 hover:text-blue-800 disabled:opacity-50"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Features */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <CheckSquare className="w-6 h-6 mr-2 text-green-600" />
              Service Features
            </h2>

            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Feature Title
                    </label>
                    <input
                      type="text"
                      value={newFeature.title}
                      onChange={(e) => setNewFeature(prev => ({ ...prev, title: e.target.value }))}
                      onKeyPress={(e) => handleKeyPress(e, 'feature')}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="e.g., Responsive Design"
                      maxLength="100"
                      disabled={createServiceMutation.isPending}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <input
                      type="text"
                      value={newFeature.description}
                      onChange={(e) => setNewFeature(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="Brief description"
                      maxLength="200"
                      disabled={createServiceMutation.isPending}
                    />
                  </div>

                  <div className="flex items-end">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newFeature.included}
                        onChange={(e) => setNewFeature(prev => ({ ...prev, included: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 rounded"
                        disabled={createServiceMutation.isPending}
                      />
                      <span className="ml-2 text-sm text-gray-700">Included in service</span>
                    </label>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddFeature}
                  disabled={createServiceMutation.isPending}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Feature
                </button>
              </div>

              {formData.features.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-800">Added Features</h3>
                  {formData.features.map((feature, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                      <div className="flex items-center">
                        <CheckCircle className={`w-5 h-5 mr-3 ${feature.included ? 'text-green-500' : 'text-gray-400'}`} />
                        <div>
                          <h4 className="font-medium text-gray-900">{feature.title}</h4>
                          {feature.description && (
                            <p className="text-sm text-gray-600">{feature.description}</p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFeature(index)}
                        disabled={createServiceMutation.isPending}
                        className="text-red-500 hover:text-red-700 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 5: Requirements */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <FileText className="w-6 h-6 mr-2 text-orange-600" />
              Client Requirements
            </h2>

            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Question *
                    </label>
                    <input
                      type="text"
                      value={newRequirement.question}
                      onChange={(e) => setNewRequirement(prev => ({ ...prev, question: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="What information do you need from the client?"
                      maxLength="200"
                      disabled={createServiceMutation.isPending}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Input Type
                      </label>
                      <select
                        value={newRequirement.type}
                        onChange={(e) => setNewRequirement(prev => ({ ...prev, type: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        disabled={createServiceMutation.isPending}
                      >
                        <option value="text">Text</option>
                        <option value="file">File Upload</option>
                        <option value="choice">Single Choice</option>
                        <option value="multiple">Multiple Choice</option>
                      </select>
                    </div>

                    <div className="flex items-end">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={newRequirement.required}
                          onChange={(e) => setNewRequirement(prev => ({ ...prev, required: e.target.checked }))}
                          className="h-4 w-4 text-blue-600 rounded"
                          disabled={createServiceMutation.isPending}
                        />
                        <span className="ml-2 text-sm text-gray-700">Required field</span>
                      </label>
                    </div>
                  </div>

                  {(newRequirement.type === 'choice' || newRequirement.type === 'multiple') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Options
                      </label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={newRequirementOption}
                          onChange={(e) => setNewRequirementOption(e.target.value)}
                          onKeyPress={(e) => handleKeyPress(e, 'requirementOption')}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                          placeholder="Add an option"
                          disabled={createServiceMutation.isPending}
                        />
                        <button
                          type="button"
                          onClick={handleAddRequirementOption}
                          disabled={createServiceMutation.isPending}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Add
                        </button>
                      </div>

                      {newRequirement.options.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {newRequirement.options.map((option, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm"
                            >
                              {option}
                              <button
                                type="button"
                                onClick={() => handleRemoveRequirementOption(option)}
                                disabled={createServiceMutation.isPending}
                                className="ml-2 text-blue-600 hover:text-blue-800 disabled:opacity-50"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleAddRequirement}
                    disabled={createServiceMutation.isPending}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Requirement
                  </button>
                </div>
              </div>

              {formData.requirements.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-800">Added Requirements</h3>
                  {formData.requirements.map((req, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg border">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium text-gray-900">{req.question}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs px-2 py-1 bg-gray-200 rounded">
                              {req.type}
                            </span>
                            {req.required && (
                              <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded">
                                Required
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveRequirement(index)}
                          disabled={createServiceMutation.isPending}
                          className="text-red-500 hover:text-red-700 disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {req.options.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-600 mb-1">Options:</p>
                          <div className="flex flex-wrap gap-1">
                            {req.options.map((option, optIndex) => (
                              <span
                                key={optIndex}
                                className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded"
                              >
                                {option}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 6: FAQs */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <HelpCircle className="w-6 h-6 mr-2 text-indigo-600" />
              Frequently Asked Questions
            </h2>

            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Question *
                    </label>
                    <input
                      type="text"
                      value={newFAQ.question}
                      onChange={(e) => setNewFAQ(prev => ({ ...prev, question: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="Common question from clients"
                      maxLength="200"
                      disabled={createServiceMutation.isPending}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Answer *
                    </label>
                    <textarea
                      value={newFAQ.answer}
                      onChange={(e) => setNewFAQ(prev => ({ ...prev, answer: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      rows="3"
                      placeholder="Your answer to the question"
                      maxLength="500"
                      disabled={createServiceMutation.isPending}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddFAQ}
                    disabled={createServiceMutation.isPending}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add FAQ
                  </button>
                </div>
              </div>

              {formData.faqs.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-800">Added FAQs</h3>
                  {formData.faqs.map((faq, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg border">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900">{faq.question}</h4>
                        <button
                          type="button"
                          onClick={() => handleRemoveFAQ(index)}
                          disabled={createServiceMutation.isPending}
                          className="text-red-500 hover:text-red-700 disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-gray-600">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 7: Packages */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <Package className="w-6 h-6 mr-2 text-amber-600" />
              Service Packages
            </h2>

            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Package Name *
                      </label>
                      <input
                        type="text"
                        value={newPackage.name}
                        onChange={(e) => setNewPackage(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="e.g., Basic, Standard, Premium"
                        maxLength="50"
                        disabled={createServiceMutation.isPending}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <input
                        type="text"
                        value={newPackage.description}
                        onChange={(e) => setNewPackage(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="Brief package description"
                        maxLength="500"
                        disabled={createServiceMutation.isPending}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Price *
                      </label>
                      <input
                        type="number"
                        value={newPackage.price}
                        onChange={(e) => setNewPackage(prev => ({ ...prev, price: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="0.00"
                        min="1"
                        step="0.01"
                        disabled={createServiceMutation.isPending}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Delivery Time *
                      </label>
                      <input
                        type="number"
                        value={newPackage.deliveryTime}
                        onChange={(e) => setNewPackage(prev => ({ ...prev, deliveryTime: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="Days"
                        min="1"
                        disabled={createServiceMutation.isPending}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Revisions
                      </label>
                      <input
                        type="number"
                        value={newPackage.revisions}
                        onChange={(e) => setNewPackage(prev => ({ ...prev, revisions: parseInt(e.target.value) || 0 }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="0"
                        min="0"
                        disabled={createServiceMutation.isPending}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Package Features
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={newPackageFeature}
                        onChange={(e) => setNewPackageFeature(e.target.value)}
                        onKeyPress={(e) => handleKeyPress(e, 'packageFeature')}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="Add a feature"
                        maxLength="100"
                        disabled={createServiceMutation.isPending}
                      />
                      <button
                        type="button"
                        onClick={handleAddPackageFeature}
                        disabled={createServiceMutation.isPending}
                        className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Add
                      </button>
                    </div>

                    {newPackage.features.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {newPackage.features.map((feature, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-sm"
                          >
                            {feature}
                            <button
                              type="button"
                              onClick={() => handleRemovePackageFeature(feature)}
                              disabled={createServiceMutation.isPending}
                              className="ml-2 text-amber-600 hover:text-amber-800 disabled:opacity-50"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newPackage.popular}
                        onChange={(e) => setNewPackage(prev => ({ ...prev, popular: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 rounded"
                        disabled={createServiceMutation.isPending}
                      />
                      <span className="ml-2 text-sm text-gray-700">Mark as Popular Package</span>
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddPackage}
                    disabled={createServiceMutation.isPending}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Package
                  </button>
                </div>
              </div>

              {formData.packages.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800">Added Packages</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {formData.packages.map((pkg, index) => (
                      <div key={index} className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-bold text-lg text-gray-900">{pkg.name}</h4>
                            {pkg.popular && (
                              <span className="inline-block px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded mt-1">
                                Most Popular
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemovePackage(index)}
                            disabled={createServiceMutation.isPending}
                            className="text-red-500 hover:text-red-700 disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {pkg.description && (
                          <p className="text-gray-600 text-sm mb-3">{pkg.description}</p>
                        )}

                        <div className="space-y-2 mb-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Price:</span>
                            <span className="font-semibold">${pkg.price}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Delivery:</span>
                            <span>{pkg.deliveryTime} days</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Revisions:</span>
                            <span>{pkg.revisions}</span>
                          </div>
                        </div>

                        {pkg.features && pkg.features.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-700 mb-1">Features:</h5>
                            <ul className="space-y-1">
                              {pkg.features.slice(0, 3).map((feature, featIndex) => (
                                <li key={featIndex} className="text-xs text-gray-600 flex items-center">
                                  <CheckCircle className="w-3 h-3 text-green-500 mr-1" />
                                  {feature}
                                </li>
                              ))}
                              {pkg.features.length > 3 && (
                                <li className="text-xs text-gray-500">
                                  +{pkg.features.length - 3} more features
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 8: SEO & Metadata */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <Eye className="w-6 h-6 mr-2 text-teal-600" />
              SEO & Metadata
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meta Title
                </label>
                <input
                  type="text"
                  name="metaTitle"
                  value={formData.metaTitle}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="SEO title for search engines"
                  maxLength="60"
                  disabled={createServiceMutation.isPending}
                />
                <div className="flex justify-between mt-2">
                  <p className="text-xs text-gray-500">
                    Recommended: 50-60 characters
                  </p>
                  <span className="text-xs text-gray-500">
                    {formData.metaTitle.length}/60
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meta Description
                </label>
                <textarea
                  name="metaDescription"
                  value={formData.metaDescription}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows="3"
                  placeholder="SEO description for search engines"
                  maxLength="160"
                  disabled={createServiceMutation.isPending}
                />
                <div className="flex justify-between mt-2">
                  <p className="text-xs text-gray-500">
                    Recommended: 150-160 characters
                  </p>
                  <span className="text-xs text-gray-500">
                    {formData.metaDescription.length}/160
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center p-3 bg-gray-50 rounded-lg border">
                  <input
                    type="checkbox"
                    id="isFeatured"
                    name="isFeatured"
                    checked={formData.isFeatured}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 rounded"
                    disabled={createServiceMutation.isPending}
                  />
                  <label htmlFor="isFeatured" className="ml-2 text-sm text-gray-700">
                    Featured Service
                  </label>
                </div>

                <div className="flex items-center p-3 bg-gray-50 rounded-lg border">
                  <input
                    type="checkbox"
                    id="isRecommended"
                    name="isRecommended"
                    checked={formData.isRecommended}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 rounded"
                    disabled={createServiceMutation.isPending}
                  />
                  <label htmlFor="isRecommended" className="ml-2 text-sm text-gray-700">
                    Recommended Service
                  </label>
                </div>

                <div className="flex items-center p-3 bg-gray-50 rounded-lg border">
                  <input
                    type="checkbox"
                    id="isPopular"
                    name="isPopular"
                    checked={formData.isPopular}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 rounded"
                    disabled={createServiceMutation.isPending}
                  />
                  <label htmlFor="isPopular" className="ml-2 text-sm text-gray-700">
                    Popular Service
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Validation Summary */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-yellow-800 mb-4 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              Before You Submit
            </h3>
            
            <div className="space-y-2">
              <div className="flex items-center">
                {formData.title.length >= 5 ? (
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                )}
                <span className={`text-sm ${formData.title.length >= 5 ? 'text-green-600' : 'text-red-600'}`}>
                  Title: {formData.title.length >= 5 ? '✓ Valid' : `Needs ${5 - formData.title.length} more characters`}
                </span>
              </div>
              
              <div className="flex items-center">
                {formData.description.length >= 50 ? (
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                )}
                <span className={`text-sm ${formData.description.length >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                  Description: {formData.description.length >= 50 ? '✓ Valid' : `Needs ${50 - formData.description.length} more characters`}
                </span>
              </div>
              
              <div className="flex items-center">
                {formData.category ? (
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                )}
                <span className={`text-sm ${formData.category ? 'text-green-600' : 'text-red-600'}`}>
                  Category: {formData.category ? '✓ Selected' : 'Required'}
                </span>
              </div>
              
              <div className="flex items-center">
                {formData.price && parseFloat(formData.price) >= 1 ? (
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                )}
                <span className={`text-sm ${formData.price && parseFloat(formData.price) >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                  Price: {formData.price && parseFloat(formData.price) >= 1 ? '✓ Valid' : 'Required ($1 minimum)'}
                </span>
              </div>
              
              <div className="flex items-center">
                {formData.deliveryTime && parseInt(formData.deliveryTime) >= 1 ? (
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                )}
                <span className={`text-sm ${formData.deliveryTime && parseInt(formData.deliveryTime) >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                  Delivery Time: {formData.deliveryTime && parseInt(formData.deliveryTime) >= 1 ? '✓ Valid' : 'Required (1 day minimum)'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-8">
            <button
              type="button"
              onClick={() => navigate('/profile')}
              disabled={createServiceMutation.isPending}
              className="px-8 py-4 text-gray-700 font-medium border-2 border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>

            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <button
                type="submit"
                disabled={createServiceMutation.isPending || categoryLoading}
                className="flex-1 px-8 py-4 bg-gray-600 text-white font-medium rounded-xl hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {createServiceMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-2" />
                    Save as Draft
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={(e) => handleSubmit(e, 'active')}
                disabled={createServiceMutation.isPending || categoryLoading}
                className="flex-1 px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {createServiceMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 mr-2" />
                    Publish Service
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

export default CreateService;