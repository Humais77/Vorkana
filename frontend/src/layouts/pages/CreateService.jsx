import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  Globe,
  Phone,
  Mail,
  User,
  DollarSign,
  Calendar,
  FileText,
  MessageSquare,
  ChevronRight,
  Loader2,
  X,
  CheckCircle,
  Info,
  Shield,
  Lightbulb,
  Target,
  Clock,
  FileCheck,
  LogIn,
  AlertCircle,
  Sparkles,
  Briefcase,
  Users,
  Star,
  Save,
  ChevronDown,
  ArrowRight,
  Type,
  Package,
  Layers,
  Lock,
  Tag,
  CheckSquare,
  HelpCircle,
  Zap,
  Plus,
  Trash2,
  ArrowLeft,
  Eye,
  Layers as LayersIcon
} from 'lucide-react';
import { useCreateService } from '../../hooks/useServices.js';
import { useCategories } from '../../hooks/useCategories';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../../store/useAuthStore';
import { isProfileCompleteEnough } from '../../utils/profileUtils';
import { SeoWrapper } from '../../components/SeoWrapper';

// Structured Data for Service Creation
const serviceCreationStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Create a Service on Vorkana",
  "description": "List your freelance services and start earning on Vorkana. Create a detailed service listing with our step-by-step form to attract clients worldwide.",
  "url": typeof window !== 'undefined' ? `${window.location.origin}/create-service` : '/create-service',
  "breadcrumb": {
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": typeof window !== 'undefined' ? window.location.origin : '/'
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Create Service",
        "item": typeof window !== 'undefined' ? `${window.location.origin}/create-service` : '/create-service'
      }
    ]
  },
  "potentialAction": {
    "@type": "CreateAction",
    "name": "Create Freelance Service",
    "description": "Create a new freelance service listing to attract clients",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": `${window.location.origin}/create-service`,
      "actionPlatform": [
        "http://schema.org/DesktopWebPlatform",
        "http://schema.org/MobileWebPlatform"
      ]
    }
  }
};

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
  
  const { user: currentUser, isAuthenticated } = useAuthStore();
  
  // Form state with all fields from service model
  const [formData, setFormData] = useState({
    // Basic Information
    title: '',
    description: '',
    shortDescription: '',
    category: '',
    subcategory: '',
    userLevel: 'new',

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
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [createdServiceId, setCreatedServiceId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoginMessage, setShowLoginMessage] = useState(true);
  const [completedFields, setCompletedFields] = useState({
    title: false,
    category: false,
    subcategory: false,
    price: false,
    deliveryTime: false,
    description: false,
    shortDescription: false
  });

  // Steps definition
  const steps = [
    { number: 1, title: "Service Basics", icon: Briefcase },
    { number: 2, title: "Pricing & Delivery", icon: DollarSign },
    { number: 3, title: "Details & Features", icon: FileText },
    { number: 4, title: "Images & FAQ", icon: Upload },
    { number: 5, title: "Complete", icon: CheckCircle },
  ];

  useEffect(() => {
    if (!isProfileCompleteEnough(currentUser, 70)) {
      toast.error('Please complete your profile before creating a service');
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  // Update subcategories when category changes
  useEffect(() => {
    if (formData.category && categoriesData && Array.isArray(categoriesData)) {
      const category = categoriesData.find(cat => cat._id === formData.category);
      
      if (category) {
        const subs = category.children || category.subcategories || [];
        setSubcategories(subs);
        
        if (formData.subcategory && !subs.find(s => s._id === formData.subcategory)) {
          setFormData(prev => ({ ...prev, subcategory: '' }));
          setCompletedFields(prev => ({ ...prev, subcategory: false }));
        }
      } else {
        setSubcategories([]);
        setFormData(prev => ({ ...prev, subcategory: '' }));
        setCompletedFields(prev => ({ ...prev, subcategory: false }));
      }
    } else {
      setSubcategories([]);
      setFormData(prev => ({ ...prev, subcategory: '' }));
      setCompletedFields(prev => ({ ...prev, subcategory: false }));
    }
  }, [formData.category, categoriesData]);

  // Handle successful service creation
  useEffect(() => {
    if (createServiceMutation.isSuccess && createServiceMutation.data) {
      const serviceId = createServiceMutation.data.data?._id || createServiceMutation.data.service?._id || createServiceMutation.data._id;

      if (serviceId) {
        setCreatedServiceId(serviceId);
        setSuccess(true);
        setActiveStep(5);

        toast.success(createServiceMutation.data.message || "Service created successfully!");

        const timer = setTimeout(() => {
          navigate(`/service/${serviceId}`);
        }, 3000);

        return () => clearTimeout(timer);
      }
    }
  }, [createServiceMutation.isSuccess, createServiceMutation.data, navigate]);

  const handleInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Update completed status based on validation
    const isValid = validateField(name, type === 'checkbox' ? checked : value);
    setCompletedFields(prev => ({
      ...prev,
      [name]: isValid
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  }, [errors]);

  const validateField = (fieldName, value) => {
    switch (fieldName) {
      case 'title':
        return value && value.trim().length >= 5;
      case 'description':
        return value && value.trim().length >= 50;
      case 'shortDescription':
        return value && value.trim().length >= 20;
      case 'category':
        return !!value;
      case 'subcategory':
        return !!value;
      case 'price':
        const priceNum = parseFloat(value);
        return !isNaN(priceNum) && priceNum >= 1 && priceNum <= 100000;
      case 'deliveryTime':
        const deliveryNum = parseInt(value);
        return !isNaN(deliveryNum) && deliveryNum >= 1 && deliveryNum <= 365;
      default:
        return !!value;
    }
  };

  // Tag Management
  const handleAddTag = useCallback(() => {
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
  }, [newTag, formData.tags]);

  const handleRemoveTag = useCallback((tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
    toast.success('Tag removed');
  }, []);

  // Search Keywords Management
  const handleAddKeyword = useCallback(() => {
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
  }, [newKeyword, formData.searchKeywords]);

  const handleRemoveKeyword = useCallback((keywordToRemove) => {
    setFormData(prev => ({
      ...prev,
      searchKeywords: prev.searchKeywords.filter(keyword => keyword !== keywordToRemove)
    }));
    toast.success('Keyword removed');
  }, []);

  // Features Management
  const handleAddFeature = useCallback(() => {
    if (newFeature.title.trim()) {
      setFormData(prev => ({
        ...prev,
        features: [...prev.features, { ...newFeature }]
      }));
      setNewFeature({ title: '', description: '', included: true });
      toast.success('Feature added');
    }
  }, [newFeature]);

  const handleRemoveFeature = useCallback((index) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
    toast.success('Feature removed');
  }, []);

  // Requirements Management
  const handleAddRequirementOption = useCallback(() => {
    if (newRequirementOption.trim() && newRequirement.options.length < 20) {
      setNewRequirement(prev => ({
        ...prev,
        options: [...prev.options, newRequirementOption.trim()]
      }));
      setNewRequirementOption('');
      toast.success('Option added');
    }
  }, [newRequirementOption, newRequirement.options]);

  const handleRemoveRequirementOption = useCallback((optionToRemove) => {
    setNewRequirement(prev => ({
      ...prev,
      options: prev.options.filter(option => option !== optionToRemove)
    }));
    toast.success('Option removed');
  }, []);

  const handleAddRequirement = useCallback(() => {
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
  }, [newRequirement]);

  const handleRemoveRequirement = useCallback((index) => {
    setFormData(prev => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index)
    }));
    toast.success('Requirement removed');
  }, []);

  // FAQs Management
  const handleAddFAQ = useCallback(() => {
    if (newFAQ.question.trim() && newFAQ.answer.trim()) {
      setFormData(prev => ({
        ...prev,
        faqs: [...prev.faqs, { ...newFAQ }]
      }));
      setNewFAQ({ question: '', answer: '' });
      toast.success('FAQ added');
    }
  }, [newFAQ]);

  const handleRemoveFAQ = useCallback((index) => {
    setFormData(prev => ({
      ...prev,
      faqs: prev.faqs.filter((_, i) => i !== index)
    }));
    toast.success('FAQ removed');
  }, []);

  // Packages Management
  const handleAddPackageFeature = useCallback(() => {
    if (newPackageFeature.trim() && newPackage.features.length < 20) {
      setNewPackage(prev => ({
        ...prev,
        features: [...prev.features, newPackageFeature.trim()]
      }));
      setNewPackageFeature('');
      toast.success('Package feature added');
    }
  }, [newPackageFeature, newPackage.features]);

  const handleRemovePackageFeature = useCallback((featureToRemove) => {
    setNewPackage(prev => ({
      ...prev,
      features: prev.features.filter(feature => feature !== featureToRemove)
    }));
    toast.success('Package feature removed');
  }, []);

  const handleAddPackage = useCallback(() => {
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
  }, [newPackage]);

  const handleRemovePackage = useCallback((index) => {
    setFormData(prev => ({
      ...prev,
      packages: prev.packages.filter((_, i) => i !== index)
    }));
    toast.success('Package removed');
  }, []);

  const handleImageUpload = useCallback(async (files) => {
    if (uploadingImages) return;
    
    const newFiles = Array.from(files);
    
    // Validate file count
    if (uploadedImages.length + newFiles.length > 10) {
      toast.error('Maximum 10 images allowed');
      return;
    }
    
    // Validate each file
    for (const file of newFiles) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 5MB limit`);
        return;
      }
      
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        toast.error(`${file.name} is not a valid image type`);
        return;
      }
    }
    
    setUploadingImages(true);
    
    try {
      const previewImages = newFiles.map(file => ({
        file,
        preview: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
        type: file.type
      }));
      
      setUploadedImages(prev => [...prev, ...previewImages]);
      toast.success(`${newFiles.length} image(s) added successfully`);
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error('Failed to add images');
    } finally {
      setUploadingImages(false);
    }
  }, [uploadingImages, uploadedImages]);

  const handleThumbnailUpload = useCallback((file) => {
    if (uploadingThumbnail) return;
    
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Thumbnail exceeds 2MB limit');
      return;
    }
    
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid image type for thumbnail');
      return;
    }
    
    setThumbnailFile({
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
      type: file.type
    });
    
    toast.success('Thumbnail selected');
  }, [uploadingThumbnail]);

  const removeImage = useCallback((index) => {
    const image = uploadedImages[index];
    URL.revokeObjectURL(image.preview);
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
    toast.success('Image removed');
  }, [uploadedImages]);

  const removeThumbnail = useCallback(() => {
    if (thumbnailFile) {
      URL.revokeObjectURL(thumbnailFile.preview);
      setThumbnailFile(null);
      toast.success('Thumbnail removed');
    }
  }, [thumbnailFile]);

  // Helper function to handle Enter key press
  const handleKeyPress = useCallback((e, type) => {
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
  }, [
    handleAddTag, 
    handleAddKeyword, 
    handleAddFeature, 
    handleAddRequirement, 
    handleAddRequirementOption, 
    handleAddFAQ, 
    handleAddPackageFeature, 
    handleAddPackage
  ]);

  const validateStep = useCallback((step) => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.title || formData.title.trim().length < 5) {
        newErrors.title = "Service title must be at least 5 characters.";
      }

      if (!formData.category) {
        newErrors.category = "Please select a category.";
      }

      if (!formData.subcategory) {
        newErrors.subcategory = "Please select a subcategory.";
      }

      if (!formData.shortDescription || formData.shortDescription.trim().length < 20) {
        newErrors.shortDescription = "Short description must be at least 20 characters.";
      }

      if (!formData.description || formData.description.trim().length < 50) {
        newErrors.description = "Description must be at least 50 characters.";
      }
    }

    if (step === 2) {
      const priceNum = parseFloat(formData.price);
      if (!formData.price || isNaN(priceNum) || priceNum < 1 || priceNum > 100000) {
        newErrors.price = "Price must be between $1 and $100,000.";
      }

      const deliveryNum = parseInt(formData.deliveryTime);
      if (!formData.deliveryTime || isNaN(deliveryNum) || deliveryNum < 1 || deliveryNum > 365) {
        newErrors.deliveryTime = "Delivery time must be between 1 and 365 days.";
      }
    }

    if (step === 3) {
      // Additional validations can be added here
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const nextStep = useCallback(() => {
    if (validateStep(activeStep)) {
      setActiveStep(prev => Math.min(prev + 1, 5));
    }
  }, [activeStep, validateStep]);

  const prevStep = useCallback(() => {
    setActiveStep(prev => Math.max(prev - 1, 1));
  }, []);

  const handleSubmit = useCallback(async (e, status = 'draft') => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validate all steps
    let hasError = false;
    for (let step = 1; step <= 4; step++) {
      if (!validateStep(step)) {
        setActiveStep(step);
        hasError = true;
        break;
      }
    }

    if (hasError) {
      setIsSubmitting(false);
      return;
    }

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('userToken');

      if (!token) {
        toast.error('Please login to create a service');
        navigate('/login');
        setIsSubmitting(false);
        return;
      }

      if (categoryLoading) {
        toast.error('Categories are still loading. Please wait...');
        setIsSubmitting(false);
        return;
      }

      if (categoryError) {
        toast.error('Failed to load categories. Please refresh the page.');
        setIsSubmitting(false);
        return;
      }

      const serviceData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        shortDescription: formData.shortDescription.trim(),
        category: formData.category,
        subcategory: formData.subcategory,
        price: parseFloat(formData.price),
        currency: formData.currency,
        deliveryTime: parseInt(formData.deliveryTime),
        deliveryTimeUnit: formData.deliveryTimeUnit,
        revisions: parseInt(formData.revisions) || 1,
        gigType: formData.gigType,
        status: status,
        userLevel: formData.userLevel,
        isFeatured: formData.isFeatured,
        isRecommended: formData.isRecommended,
        isPopular: formData.isPopular,
      };

      const submitFormData = new FormData();

      // Append required fields
      submitFormData.append('title', serviceData.title);
      submitFormData.append('description', serviceData.description);
      submitFormData.append('shortDescription', serviceData.shortDescription);
      submitFormData.append('category', serviceData.category);
      submitFormData.append('subcategory', serviceData.subcategory);
      submitFormData.append('price', serviceData.price);
      submitFormData.append('currency', serviceData.currency);
      submitFormData.append('deliveryTime', serviceData.deliveryTime);
      submitFormData.append('deliveryTimeUnit', serviceData.deliveryTimeUnit);
      submitFormData.append('revisions', serviceData.revisions);
      submitFormData.append('gigType', serviceData.gigType);
      submitFormData.append('status', status);
      submitFormData.append('userLevel', serviceData.userLevel);

      // Append optional fields
      if (formData.metaTitle) submitFormData.append('metaTitle', formData.metaTitle);
      if (formData.metaDescription) submitFormData.append('metaDescription', formData.metaDescription);

      // Arrays
      if (formData.tags?.length > 0) submitFormData.append('tags', JSON.stringify(formData.tags));
      if (formData.searchKeywords?.length > 0) submitFormData.append('searchKeywords', JSON.stringify(formData.searchKeywords));
      if (formData.features?.length > 0) submitFormData.append('features', JSON.stringify(formData.features));
      if (formData.requirements?.length > 0) submitFormData.append('requirements', JSON.stringify(formData.requirements));
      if (formData.faqs?.length > 0) submitFormData.append('faqs', JSON.stringify(formData.faqs));
      if (formData.packages?.length > 0) submitFormData.append('packages', JSON.stringify(formData.packages));

      // Booleans
      submitFormData.append('isFeatured', serviceData.isFeatured);
      submitFormData.append('isRecommended', serviceData.isRecommended);
      submitFormData.append('isPopular', serviceData.isPopular);

      // Images
      if (thumbnailFile) {
        submitFormData.append('thumbnail', thumbnailFile.file);
      }
      
      uploadedImages.forEach((img) => {
        submitFormData.append('images', img.file);
      });

      await createServiceMutation.mutateAsync({
        serviceData: serviceData,
        files: submitFormData
      });
      
    } catch (error) {
      if (error.message.includes('Category not found') || error.message.includes('Invalid category')) {
        toast.error('Invalid category selected. Please refresh the page and select a valid category.');
        await refetchCategories();
      } else if (error.message.includes('Network Error')) {
        toast.error('Network error. Please check your connection.');
      } else {
        toast.error(error.message || 'Failed to create service');
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [
    formData, 
    validateStep, 
    categoryLoading, 
    categoryError, 
    navigate, 
    createServiceMutation, 
    thumbnailFile, 
    uploadedImages, 
    refetchCategories
  ]);

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

  const formatPrice = (price) => {
    const num = parseFloat(price);
    return isNaN(num) ? "0" : num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  return (
    <SeoWrapper
      title="Create a Service on Vorkana | List Your Freelance Skills"
      description="List your freelance services and start earning on Vorkana. Create a detailed service listing with our step-by-step form to attract clients worldwide."
      keywords="create freelance service, list services, sell skills online, freelance marketplace, service creation, gig setup, service listing"
      canonical={`${window.location.origin}/create-service`}
      structuredData={serviceCreationStructuredData}
    >
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 py-8 md:py-12 px-4">
        {/* Top Info Section */}
        <div className="max-w-6xl mx-auto mb-8 md:mb-12">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 md:p-8 shadow-lg border border-blue-100">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
              <div className="md:w-2/3">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                    <Briefcase className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-4xl font-bold text-gray-900">
                      Create Your Service
                    </h1>
                    <p className="text-blue-700 font-medium text-sm md:text-base">
                      Start earning with your skills
                    </p>
                  </div>
                </div>

                <p className="text-gray-600 mb-6 text-sm md:text-base">
                  Fill out this form to list your service. Our platform will showcase your skills to clients
                  worldwide. The more details you provide, the better your chances of getting hired.
                </p>

                <div className="flex flex-wrap gap-4 md:gap-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                      <Users className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-bold text-gray-800 text-sm md:text-base">50K+ Clients</div>
                      <div className="text-xs md:text-sm text-gray-500">Looking for services</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                      <Star className="w-4 h-4 md:w-5 md:h-5 text-yellow-500 fill-yellow-500" />
                    </div>
                    <div>
                      <div className="font-bold text-gray-800 text-sm md:text-base">4.8/5 Rating</div>
                      <div className="text-xs md:text-sm text-gray-500">Service provider satisfaction</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                      <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-purple-600" />
                    </div>
                    <div>
                      <div className="font-bold text-gray-800 text-sm md:text-base">No Fees</div>
                      <div className="text-xs md:text-sm text-gray-500">Listing is completely free</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:w-1/3 w-full">
                <div className="bg-white rounded-xl p-4 md:p-6 shadow-lg border border-gray-200">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-sm md:text-base">
                    <Info className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                    Quick Tips
                  </h3>
                  <ul className="space-y-2 md:space-y-3 text-xs md:text-sm text-gray-600">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span>Be specific about your service offerings</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span>Set competitive pricing for better visibility</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span>Add high-quality images for better appeal</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span>Detailed descriptions increase conversions</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto">
          {/* Progress Steps */}
          <div className="mb-8 md:mb-10 px-2">
            <div className="flex justify-between items-center">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = activeStep >= step.number;
                const isCompleted = activeStep > step.number;

                return (
                  <React.Fragment key={step.number}>
                    <div className="flex flex-col items-center relative z-10">
                      <div className={`
                        w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center
                        ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}
                        ${isCompleted ? 'bg-green-500 text-white' : ''}
                        transition-all duration-300
                        shadow-lg
                      `}>
                        {isCompleted ? (
                          <CheckCircle size={18} />
                        ) : (
                          <Icon size={18} />
                        )}
                      </div>
                      <span className="mt-2 text-xs md:text-sm font-medium text-gray-700 text-center max-w-[80px]">
                        {step.title}
                      </span>
                    </div>
                    {index < steps.length - 1 && (
                      <div className="flex-1 h-1 bg-gray-200 mx-1 md:mx-2 relative">
                        <div
                          className={`absolute top-0 left-0 h-full bg-blue-600 transition-all duration-300 ${isCompleted ? 'w-full' : 'w-0'
                            }`}
                        />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex flex-col lg:flex-row gap-6 md:gap-8">
            {/* Left Panel - Information */}
            <div className="lg:w-2/5">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-2xl p-6 md:p-8 text-white h-full">
                <div className="mb-6 md:mb-8">
                  <div className="flex items-center mb-4">
                    <Info className="mr-3" size={20} />
                    <h2 className="text-xl md:text-2xl font-bold">
                      {activeStep < 5 ? `Step ${activeStep}: ${steps[activeStep - 1]?.title}` : "Complete Your Service"}
                    </h2>
                  </div>
                  <p className="text-blue-100 text-sm md:text-base">
                    {activeStep === 1 && "Define your service basics including title, category, and description."}
                    {activeStep === 2 && "Set your pricing, delivery time, and service packages."}
                    {activeStep === 3 && "Add features, requirements, and additional details."}
                    {activeStep === 4 && "Upload images and add frequently asked questions."}
                    {activeStep === 5 && "Your service is ready to be published! Review your information before submitting."}
                  </p>
                </div>

                {/* Current Step Info */}
                {activeStep < 5 && (
                  <div className="space-y-4 md:space-y-6">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 md:p-5">
                      <h3 className="font-bold text-lg mb-3 flex items-center">
                        <Lightbulb className="mr-2" size={18} />
                        Information entered:
                      </h3>
                      <ul className="space-y-2 text-sm">
                        {activeStep >= 1 && completedFields.title && (
                          <li className="flex justify-between">
                            <span className="text-blue-100">Title:</span>
                            <span className="font-medium truncate max-w-[150px]">
                              {formData.title}
                            </span>
                          </li>
                        )}
                        {activeStep >= 1 && completedFields.category && (
                          <li className="flex justify-between">
                            <span className="text-blue-100">Category:</span>
                            <span className="font-medium truncate max-w-[120px]">
                              {getCategoryName()}
                            </span>
                          </li>
                        )}
                        {activeStep >= 1 && completedFields.subcategory && (
                          <li className="flex justify-between">
                            <span className="text-blue-100">Subcategory:</span>
                            <span className="font-medium truncate max-w-[120px]">
                              {getSubcategoryName()}
                            </span>
                          </li>
                        )}
                        {activeStep >= 2 && completedFields.price && (
                          <li className="flex justify-between">
                            <span className="text-blue-100">Price:</span>
                            <span className="font-medium">${formatPrice(formData.price)}</span>
                          </li>
                        )}
                        {activeStep >= 2 && completedFields.deliveryTime && (
                          <li className="flex justify-between">
                            <span className="text-blue-100">Delivery Time:</span>
                            <span className="font-medium">{formData.deliveryTime} {formData.deliveryTimeUnit}</span>
                          </li>
                        )}
                        {activeStep >= 1 && completedFields.shortDescription && (
                          <li className="flex justify-between">
                            <span className="text-blue-100">Short Desc:</span>
                            <span className="font-medium">{formData.shortDescription.length} chars</span>
                          </li>
                        )}
                        {activeStep >= 1 && completedFields.description && (
                          <li className="flex justify-between">
                            <span className="text-blue-100">Description:</span>
                            <span className="font-medium">{formData.description.length} chars</span>
                          </li>
                        )}
                        {activeStep >= 3 && formData.tags.length > 0 && (
                          <li className="flex justify-between">
                            <span className="text-blue-100">Tags:</span>
                            <span className="font-medium">{formData.tags.length} added</span>
                          </li>
                        )}
                        {activeStep >= 3 && formData.features.length > 0 && (
                          <li className="flex justify-between">
                            <span className="text-blue-100">Features:</span>
                            <span className="font-medium">{formData.features.length} added</span>
                          </li>
                        )}
                        {activeStep >= 4 && uploadedImages.length > 0 && (
                          <li className="flex justify-between">
                            <span className="text-blue-100">Images:</span>
                            <span className="font-medium">{uploadedImages.length} uploaded</span>
                          </li>
                        )}
                        {activeStep >= 4 && thumbnailFile && (
                          <li className="flex justify-between">
                            <span className="text-blue-100">Thumbnail:</span>
                            <span className="font-medium">Uploaded</span>
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Success Message */}
                {activeStep === 5 && (
                  <div className="text-center py-6 md:py-8">
                    <CheckCircle className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 md:mb-6 text-blue-300" />
                    <h3 className="text-xl md:text-2xl font-bold mb-4">Service Created Successfully!</h3>
                    <div className="text-blue-100 mb-6 text-sm md:text-base">
                      Your service is now live and visible to thousands of potential clients.
                      {createdServiceId && (
                        <div className="mt-4 text-xs md:text-sm bg-white/10 rounded-lg p-2">
                          Service ID: <span className="font-mono">{createdServiceId}</span>
                        </div>
                      )}
                    </div>
                    <div className="bg-white/10 rounded-xl p-4">
                      <h4 className="font-bold mb-2">What happens next?</h4>
                      <ul className="text-sm space-y-1 text-left pl-4">
                        <li>• Clients will start discovering your service</li>
                        <li>• You'll receive notifications for new orders</li>
                        <li>• Manage your services from your dashboard</li>
                        <li>• Build your reputation with client reviews</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel - Form */}
            <div className="lg:w-3/5">
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                {/* Success Screen */}
                {activeStep === 5 ? (
                  <div className="p-8 md:p-12 text-center">
                    <div className="w-20 h-20 md:w-24 md:h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle className="w-10 h-10 md:w-12 md:h-12 text-blue-600" />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                      Service Created Successfully!
                    </h2>
                    <p className="text-gray-600 text-base md:text-lg mb-8">
                      Your service is now live. Redirecting to your service page...
                    </p>
                    <div className="w-20 h-1 bg-blue-600 rounded-full mx-auto animate-pulse"></div>
                    <div className="mt-8">
                      <button
                        onClick={() => navigate(`/service/${createdServiceId}`)}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        aria-label="View your newly created service"
                      >
                        Go to Service Now
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={(e) => handleSubmit(e, 'draft')} className="p-6 md:p-8" aria-label="Service creation form">
                    {/* Display API errors */}
                    {createServiceMutation.error && (
                      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl" role="alert">
                        <p className="text-red-600 font-medium">{createServiceMutation.error.message}</p>
                      </div>
                    )}

                    {/* Step 1: Service Basics */}
                    {activeStep === 1 && (
                      <div className="space-y-6">
                        <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center">
                          <Briefcase className="mr-3 text-blue-600" size={20} />
                          Service Basics
                        </h2>

                        <div className="space-y-6">
                          {/* Service Title */}
                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                              <Type className="mr-2" size={14} />
                              Service Title <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              name="title"
                              value={formData.title}
                              onChange={handleInputChange}
                              className="w-full p-3 md:p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm md:text-base"
                              placeholder="e.g., Professional Web Development Service"
                              required
                              aria-required="true"
                              aria-describedby="title-help"
                            />
                            <div className="flex justify-between mt-2">
                              <p id="title-help" className="text-xs text-gray-500">
                                Minimum 5 characters required
                              </p>
                              <span className={`text-xs ${formData.title.length >= 5 ? 'text-green-600' : 'text-red-600'}`}>
                                {formData.title.length}/200
                              </span>
                            </div>
                            {errors.title && (
                              <p className="mt-2 text-sm text-red-600" role="alert">{errors.title}</p>
                            )}
                          </div>

                          {/* Category Selection */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                                <LayersIcon className="mr-2" size={14} />
                                Category <span className="text-red-500">*</span>
                              </label>
                              <div className="relative">
                                <select
                                  name="category"
                                  value={formData.category}
                                  onChange={handleInputChange}
                                  className="w-full p-3 md:p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white appearance-none transition-all disabled:bg-gray-50 disabled:cursor-not-allowed pr-10 text-sm md:text-base"
                                  required
                                  aria-required="true"
                                  disabled={categoryLoading || createServiceMutation.isPending}
                                >
                                  <option value="">Select a category</option>
                                  {categoryLoading ? (
                                    <option value="" disabled>Loading categories...</option>
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
                              {errors.category && (
                                <p className="mt-2 text-sm text-red-600" role="alert">{errors.category}</p>
                              )}
                            </div>

                            <div>
                              <label className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                                <Layers className="mr-2" size={14} />
                                Subcategory <span className="text-red-500">*</span>
                              </label>
                              <div className="relative">
                                <select
                                  name="subcategory"
                                  value={formData.subcategory}
                                  onChange={handleInputChange}
                                  className="w-full p-3 md:p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white appearance-none transition-all disabled:bg-gray-50 disabled:cursor-not-allowed pr-10 text-sm md:text-base"
                                  required
                                  aria-required="true"
                                  disabled={!formData.category || subcategories.length === 0 || createServiceMutation.isPending}
                                >
                                  <option value="">Select a subcategory</option>
                                  {!formData.category ? (
                                    <option value="" disabled>Select a category first</option>
                                  ) : subcategories.length === 0 ? (
                                    <option value="" disabled>No subcategories available</option>
                                  ) : (
                                    subcategories.map(subcategory => (
                                      <option key={subcategory._id} value={subcategory._id}>
                                        {subcategory.name}
                                      </option>
                                    ))
                                  )}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                  <ChevronDown className="h-4 w-4" />
                                </div>
                              </div>
                              {errors.subcategory && (
                                <p className="mt-2 text-sm text-red-600" role="alert">{errors.subcategory}</p>
                              )}
                            </div>
                          </div>

                          {/* Short Description */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Short Description <span className="text-red-500">*</span>
                            </label>
                            <textarea
                              name="shortDescription"
                              value={formData.shortDescription}
                              onChange={handleInputChange}
                              className="w-full p-3 md:p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm md:text-base"
                              rows="3"
                              placeholder="Brief description of your service (appears in listings). Minimum 20 characters."
                              required
                              aria-required="true"
                              aria-describedby="short-desc-help"
                            />
                            <div className="flex justify-between mt-2">
                              <p id="short-desc-help" className="text-xs text-gray-500">
                                Required - Minimum 20 characters
                              </p>
                              <span className={`text-xs font-medium ${formData.shortDescription.length < 20 ? 'text-red-600' : 'text-green-600'}`}>
                                {formData.shortDescription.length}/250
                              </span>
                            </div>
                            {errors.shortDescription && (
                              <p className="mt-2 text-sm text-red-600" role="alert">{errors.shortDescription}</p>
                            )}
                          </div>

                          {/* Full Description */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Full Description <span className="text-red-500">*</span>
                            </label>
                            <textarea
                              name="description"
                              value={formData.description}
                              onChange={handleInputChange}
                              className="w-full p-3 md:p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm md:text-base"
                              rows="6"
                              placeholder="Detailed description of your service. Include what clients will get, your process, and any important details. Minimum 50 characters."
                              required
                              aria-required="true"
                              aria-describedby="desc-help"
                            />
                            <div className="flex justify-between mt-2">
                              <div>
                                <p id="desc-help" className="text-xs text-gray-500">
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
                            {errors.description && (
                              <p className="mt-2 text-sm text-red-600" role="alert">{errors.description}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 2: Pricing & Delivery */}
                    {activeStep === 2 && (
                      <div className="space-y-6">
                        <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center">
                          <DollarSign className="mr-3 text-blue-600" size={20} />
                          Pricing & Delivery
                        </h2>

                        <div className="space-y-6">
                          {/* Price */}
                          <div>
                            <label className=" text-sm font-medium text-gray-700 mb-2 flex items-center">
                              <DollarSign className="mr-2" size={14} />
                              Price (USD) <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold">$</span>
                              <input
                                type="number"
                                name="price"
                                value={formData.price}
                                onChange={handleInputChange}
                                className="w-full pl-10 p-3 md:p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed text-sm md:text-base"
                                placeholder="Enter your price"
                                min="1"
                                max="100000"
                                step="0.01"
                                required
                                aria-required="true"
                                aria-describedby="price-help"
                              />
                            </div>
                            <div className="flex justify-between mt-2">
                              <p id="price-help" className="text-xs text-gray-500">
                                Minimum $1, maximum $100,000
                              </p>
                              {formData.price && (
                                <span className="text-sm font-semibold text-blue-600">
                                  ${formatPrice(formData.price)}
                                </span>
                              )}
                            </div>
                            {errors.price && (
                              <p className="mt-2 text-sm text-red-600" role="alert">{errors.price}</p>
                            )}
                          </div>

                          {/* Currency */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Currency
                            </label>
                            <select
                              name="currency"
                              value={formData.currency}
                              onChange={handleInputChange}
                              className="w-full p-3 md:p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white transition-all text-sm md:text-base"
                              aria-label="Select currency"
                            >
                              <option value="USD">USD - US Dollar</option>
                              <option value="EUR">EUR - Euro</option>
                              <option value="GBP">GBP - British Pound</option>
                              <option value="CAD">CAD - Canadian Dollar</option>
                              <option value="AUD">AUD - Australian Dollar</option>
                              <option value="INR">INR - Indian Rupee</option>
                              <option value="PKR">PKR - Pakistani Rupee</option>
                            </select>
                          </div>

                          {/* Delivery Time */}
                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                              <Calendar className="mr-2" size={14} />
                              Delivery Time <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-3">
                              <input
                                type="number"
                                name="deliveryTime"
                                value={formData.deliveryTime}
                                onChange={handleInputChange}
                                className="flex-1 p-3 md:p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed text-sm md:text-base"
                                placeholder="e.g., 7"
                                required
                                min="1"
                                max="365"
                                aria-required="true"
                                aria-describedby="delivery-help"
                              />
                              <select
                                name="deliveryTimeUnit"
                                value={formData.deliveryTimeUnit}
                                onChange={handleInputChange}
                                className="p-3 md:p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white transition-all text-sm md:text-base"
                                aria-label="Select delivery time unit"
                              >
                                <option value="days">Days</option>
                                <option value="weeks">Weeks</option>
                                <option value="hours">Hours</option>
                              </select>
                            </div>
                            <div className="flex justify-between mt-2">
                              <p id="delivery-help" className="text-xs text-gray-500">
                                Minimum 1 day, maximum 365 days
                              </p>
                              {formData.deliveryTime && (
                                <span className="text-sm font-semibold text-blue-600">
                                  {formData.deliveryTime} {formData.deliveryTimeUnit}
                                </span>
                              )}
                            </div>
                            {errors.deliveryTime && (
                              <p className="mt-2 text-sm text-red-600" role="alert">{errors.deliveryTime}</p>
                            )}
                          </div>

                          {/* Revisions */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Revisions Included
                            </label>
                            <input
                              type="number"
                              name="revisions"
                              value={formData.revisions}
                              onChange={handleInputChange}
                              className="w-full p-3 md:p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm md:text-base"
                              placeholder="Number of revisions"
                              min="0"
                              max="99"
                            />
                            <p className="text-xs text-gray-500 mt-2">0-99 revisions included</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Details & Features */}
                    {activeStep === 3 && (
                      <div className="space-y-6">
                        <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center">
                          <FileText className="mr-3 text-blue-600" size={20} />
                          Details & Features
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
                                  className="flex-1 p-3 border border-gray-300 rounded-lg text-sm"
                                  placeholder="Add a tag (e.g., web development, design)"
                                  maxLength="30"
                                />
                                <button
                                  type="button"
                                  onClick={handleAddTag}
                                  className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                >
                                  <Plus className="w-4 h-4" />
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
                                      className="inline-flex items-center px-3 py-1.5 rounded-full bg-blue-100 text-blue-800 text-sm"
                                    >
                                      {tag}
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveTag(tag)}
                                        className="ml-2 text-blue-600 hover:text-blue-800"
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
                                  className="flex-1 p-3 border border-gray-300 rounded-lg text-sm"
                                  placeholder="Add search keyword"
                                  maxLength="30"
                                />
                                <button
                                  type="button"
                                  onClick={handleAddKeyword}
                                  className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                >
                                  <Plus className="w-4 h-4" />
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
                                        className="ml-2 text-blue-600 hover:text-blue-800"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Features */}
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                              <CheckSquare className="w-5 h-5 mr-2" />
                              Service Features
                            </h3>
                            <div className="space-y-4">
                              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      Feature Title
                                    </label>
                                    <input
                                      type="text"
                                      value={newFeature.title}
                                      onChange={(e) => setNewFeature(prev => ({ ...prev, title: e.target.value }))}
                                      onKeyPress={(e) => handleKeyPress(e, 'feature')}
                                      className="w-full p-3 border border-gray-300 rounded-lg"
                                      placeholder="e.g., Responsive Design"
                                      maxLength="100"
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
                                      className="w-full p-3 border border-gray-300 rounded-lg"
                                      placeholder="Brief description"
                                      maxLength="200"
                                    />
                                  </div>
                                </div>
                                <div className="flex items-center justify-between">
                                  <label className="flex items-center">
                                    <input
                                      type="checkbox"
                                      checked={newFeature.included}
                                      onChange={(e) => setNewFeature(prev => ({ ...prev, included: e.target.checked }))}
                                      className="h-4 w-4 text-blue-600 rounded"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">Included in service</span>
                                  </label>
                                  <button
                                    type="button"
                                    onClick={handleAddFeature}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                  >
                                    Add Feature
                                  </button>
                                </div>
                              </div>

                              {formData.features.length > 0 && (
                                <div className="space-y-3">
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
                                        className="text-red-500 hover:text-red-700"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 4: Images & FAQ */}
                    {activeStep === 4 && (
                      <div className="space-y-6">
                        <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center">
                          <Upload className="mr-3 text-blue-600" size={20} />
                          Images & FAQ
                        </h2>

                        <div className="space-y-8">
                          {/* Image Upload */}
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Service Images</h3>
                            <div className="space-y-4">
                              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 transition-colors">
                                <input
                                  type="file"
                                  id="image-upload"
                                  multiple
                                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                                  onChange={(e) => handleImageUpload(e.target.files)}
                                  className="hidden"
                                  disabled={uploadingImages || createServiceMutation.isPending}
                                />
                                <label htmlFor="image-upload" className="cursor-pointer">
                                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                                    Upload Service Images
                                  </h4>
                                  <p className="text-gray-600 mb-4">
                                    Drag & drop images or click to browse
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    Supports JPEG, PNG, WebP, GIF • Max 5MB each • Up to 10 images
                                  </p>
                                </label>
                              </div>

                              {uploadedImages.length > 0 && (
                                <div>
                                  <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-medium text-gray-900">
                                      Selected Images ({uploadedImages.length}/10)
                                    </h4>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        uploadedImages.forEach(img => URL.revokeObjectURL(img.preview));
                                        setUploadedImages([]);
                                      }}
                                      className="text-sm text-red-600 hover:text-red-700"
                                    >
                                      Remove All
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {uploadedImages.map((image, index) => (
                                      <div key={index} className="relative group">
                                        <img
                                          src={image.preview}
                                          alt={`Service image preview ${index + 1}`}
                                          className="w-full h-32 object-cover rounded-lg"
                                          loading="lazy"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => removeImage(index)}
                                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          <X className="w-4 h-4" />
                                        </button>
                                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b-lg">
                                          {image.name.substring(0, 20)}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Thumbnail Upload */}
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Thumbnail</h3>
                            <div className="space-y-4">
                              <p className="text-gray-600 text-sm">
                                The thumbnail is the main image displayed in service listings.
                              </p>

                              {thumbnailFile ? (
                                <div className="flex items-start gap-4">
                                  <div className="relative">
                                    <img
                                      src={thumbnailFile.preview}
                                      alt="Service thumbnail preview"
                                      className="w-32 h-32 object-cover rounded-lg"
                                      loading="lazy"
                                    />
                                    <button
                                      type="button"
                                      onClick={removeThumbnail}
                                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-gray-900">{thumbnailFile.name}</h4>
                                    <p className="text-gray-500 text-sm">
                                      {(thumbnailFile.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-500 transition-colors">
                                  <input
                                    type="file"
                                    id="thumbnail-upload"
                                    accept="image/jpeg,image/jpg,image/png,image/webp"
                                    onChange={(e) => handleThumbnailUpload(e.target.files[0])}
                                    className="hidden"
                                    disabled={uploadingThumbnail || createServiceMutation.isPending}
                                  />
                                  <label htmlFor="thumbnail-upload" className="cursor-pointer">
                                    <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                                    <h4 className="text-lg font-medium text-gray-900 mb-1">
                                      Upload Thumbnail
                                    </h4>
                                    <p className="text-gray-600 text-sm mb-2">
                                      Recommended: 800×600 pixels, max 2MB
                                    </p>
                                  </label>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* FAQs */}
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                              <HelpCircle className="w-5 h-5 mr-2" />
                              Frequently Asked Questions
                            </h3>
                            <div className="space-y-4">
                              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <div className="space-y-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      Question
                                    </label>
                                    <input
                                      type="text"
                                      value={newFAQ.question}
                                      onChange={(e) => setNewFAQ(prev => ({ ...prev, question: e.target.value }))}
                                      className="w-full p-3 border border-gray-300 rounded-lg"
                                      placeholder="Common question from clients"
                                      maxLength="200"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      Answer
                                    </label>
                                    <textarea
                                      value={newFAQ.answer}
                                      onChange={(e) => setNewFAQ(prev => ({ ...prev, answer: e.target.value }))}
                                      className="w-full p-3 border border-gray-300 rounded-lg"
                                      rows="3"
                                      placeholder="Your answer to the question"
                                      maxLength="500"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={handleAddFAQ}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                  >
                                    Add FAQ
                                  </button>
                                </div>
                              </div>

                              {formData.faqs.length > 0 && (
                                <div className="space-y-3">
                                  {formData.faqs.map((faq, index) => (
                                    <div key={index} className="p-4 bg-gray-50 rounded-lg border">
                                      <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-medium text-gray-900">{faq.question}</h4>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveFAQ(index)}
                                          className="text-red-500 hover:text-red-700"
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
                        </div>
                      </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex justify-between pt-6 md:pt-8 mt-6 md:mt-8 border-t border-gray-200">
                      {activeStep > 1 && activeStep < 5 && (
                        <button
                          type="button"
                          onClick={prevStep}
                          className="px-6 md:px-8 py-3 md:py-4 text-gray-700 border-2 border-gray-300 rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-colors font-medium flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={createServiceMutation.isPending}
                          aria-label="Go back to previous step"
                        >
                          <ArrowLeft className="mr-2" size={20} />
                          Back
                        </button>
                      )}

                      {activeStep < 4 ? (
                        <button
                          type="button"
                          onClick={nextStep}
                          className={`px-6 md:px-8 py-3 md:py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium flex items-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl ${activeStep > 1 ? 'ml-auto' : ''}`}
                          disabled={createServiceMutation.isPending}
                          aria-label="Continue to next step"
                        >
                          Save & Continue
                          <ChevronRight className="ml-2" size={20} />
                        </button>
                      ) : activeStep === 4 ? (
                        <div className="flex flex-col sm:flex-row gap-4 w-full">
                          <button
                            type="submit"
                            disabled={createServiceMutation.isPending || categoryLoading || isSubmitting}
                            className="flex-1 px-6 md:px-8 py-3 md:py-4 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors font-medium flex items-center justify-center shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Save service as draft"
                          >
                            {createServiceMutation.isPending || isSubmitting ? (
                              <>
                                <Loader2 className="mr-2 animate-spin" size={20} />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="mr-2" size={20} />
                                Save as Draft
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleSubmit(e, 'active')}
                            disabled={createServiceMutation.isPending || categoryLoading || isSubmitting}
                            className="flex-1 px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:opacity-90 transition-opacity font-medium flex items-center justify-center shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Publish service"
                          >
                            {createServiceMutation.isPending || isSubmitting ? (
                              <>
                                <Loader2 className="mr-2 animate-spin" size={20} />
                                Publishing...
                              </>
                            ) : (
                              <>
                                <Zap className="mr-2" size={20} />
                                Publish Service
                              </>
                            )}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SeoWrapper>
  );
};

export default CreateService;