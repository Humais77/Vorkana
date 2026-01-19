import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Upload,
  User,
  DollarSign,
  Calendar,
  FileText,
  ChevronRight,
  Loader2,
  X,
  CheckCircle,
  Info,
  Shield,
  Target,
  Clock,
  FileCheck,
  Save,
  ChevronDown,
  ArrowLeft,
  Type,
  Layers,
  AlertCircle,
  RefreshCw,
  Eye,
  Trash2,
  Image as ImageIcon,
  Plus,
  Grid3x3,
  Edit,
  Briefcase,
  CheckSquare,
  HelpCircle,
  Tag,
  Zap,
  Award,
  TrendingUp,
  ShieldCheck,
  Timer,
  MessageCircle,
  ExternalLink,
  GitBranch,
  AlertTriangle,
  History as HistoryIcon // Renamed import to avoid conflict
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/useAuthStore';
import { useService, useUpdateService } from '../../../hooks/useServices';
import { useCategories, useParentCategories } from '../../../hooks/useCategories';
import { useSubcategoriesByCategory } from '../../../hooks/useSubcategories';
import { SeoWrapper } from '../../../components/SeoWrapper';
import { isProfileCompleteEnough } from '../../../utils/profileUtils';
import { useServiceToast } from '../../../hooks/useServiceToast';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

// Structured Data for Service Editing
const SERVICE_EDIT_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Edit Service on Vorkana",
  "description": "Update your service details on Vorkana. Edit service information, images, and features to attract more clients.",
  "url": typeof window !== 'undefined' ? `${window.location.origin}/edit-service` : '/edit-service',
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
        "name": "Edit Service",
        "item": typeof window !== 'undefined' ? `${window.location.origin}/edit-service` : '/edit-service'
      }
    ]
  },
  "potentialAction": {
    "@type": "UpdateAction",
    "name": "Update Service",
    "description": "Update an existing service",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": `${window.location.origin}/edit-service/{id}`,
      "actionPlatform": [
        "http://schema.org/DesktopWebPlatform",
        "http://schema.org/MobileWebPlatform"
      ]
    }
  }
};

// Static data
const QUICK_TIPS = [
  "Update clear and specific service details",
  "Keep images relevant and high-quality",
  "Refresh your service to keep it visible in searches",
];

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'AUD', label: 'AUD - Australian Dollar' },
  { value: 'INR', label: 'INR - Indian Rupee' },
  { value: 'PKR', label: 'PKR - Pakistani Rupee' }
];

const DELIVERY_TIME_UNITS = [
  { value: 'hours', label: 'Hours' },
  { value: 'days', label: 'Days' },
  { value: 'weeks', label: 'Weeks' }
];

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_THUMBNAIL_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active', desc: 'Visible to all clients' },
  { value: 'draft', label: 'Draft', desc: 'Only visible to you' },
  { value: 'paused', label: 'Paused', desc: 'Temporarily hidden' }
];

const EditService = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  // Zustand stores
  const { user: currentUser, isAuthenticated, error: authError } = useAuthStore();
  const queryClient = useQueryClient();
  
  // Service Toast hook
  const {
    showServiceLoading,
    showServiceUpdateSuccess,
    showServiceError,
    showServiceInfo,
    dismissServiceToast
  } = useServiceToast();
  
  // TanStack Query hooks
  const {
    data: serviceData,
    isLoading: serviceLoading,
    error: serviceError,
    refetch: refetchService
  } = useService(id);

  const {
    data: categoriesData,
    isLoading: categoryLoading,
    error: categoryError
  } = useParentCategories();

  const {
    mutate: updateService,
    isPending: updateLoading,
    error: updateError,
    isSuccess: updateSuccess,
    data: updatedServiceData
  } = useUpdateService();

  // Initial form state matching service model
  const initialFormData = useMemo(() => ({
    title: "",
    description: "",
    shortDescription: "",
    category: "",
    subcategory: "",
    price: "",
    currency: "USD",
    deliveryTime: "",
    deliveryTimeUnit: "days",
    revisions: "1",
    tags: [],
    searchKeywords: [],
    features: [],
    requirements: [],
    faqs: [],
    metaTitle: "",
    metaDescription: "",
    status: "active",
    version: 1 // Add version field
  }), []);

  // Local state
  const [formData, setFormData] = useState(initialFormData);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [existingThumbnail, setExistingThumbnail] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [newKeyword, setNewKeyword] = useState("");
  const [newFeature, setNewFeature] = useState({
    title: "",
    description: "",
    included: true
  });
  const [newFAQ, setNewFAQ] = useState({
    question: "",
    answer: ""
  });
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [versionConflict, setVersionConflict] = useState(false);
  const [conflictResolution, setConflictResolution] = useState({
    show: false,
    serverVersion: 1,
    serverData: null
  });

  // Refs
  const imageUploadRef = useRef(null);
  const thumbnailUploadRef = useRef(null);
  const topContainerRef = useRef(null);
  const hasPopulatedRef = useRef(false);
  const hasProcessedSuccessRef = useRef(false);

  // Memoized values
  const subcategoriesData = useSubcategoriesByCategory(formData.category, {
    enabled: !!formData.category
  });

  const subcategories = useMemo(() => {
    if (!subcategoriesData.data) return [];
    return subcategoriesData.data?.subcategories || subcategoriesData.data || [];
  }, [subcategoriesData.data]);

  const allErrors = useMemo(() => ({
    ...errors,
    form: errors.form || serviceError?.message || authError || categoryError?.message || updateError?.message
  }), [errors, serviceError, authError, categoryError, updateError]);

  const currentService = useMemo(() => {
    if (!serviceData) return null;
    return serviceData.service || serviceData.data || serviceData;
  }, [serviceData]);

  // Get current version
  const currentVersion = useMemo(() => {
    return currentService?.version || formData.version || 1;
  }, [currentService, formData.version]);

  // Populate form when service data loads
  useEffect(() => {
    if (currentService && !hasPopulatedRef.current) {
      hasPopulatedRef.current = true;
      
      // Check if user is owner
      if (currentUser && currentService.createdBy?._id !== currentUser._id && currentUser.role !== 'admin') {
        showServiceError('You can only edit your own services');
        navigate(`/services/${id}`);
        return;
      }

      // Populate form
      setFormData({
        title: currentService.title || "",
        description: currentService.description || "",
        shortDescription: currentService.shortDescription || "",
        category: currentService.category?._id || currentService.category || "",
        subcategory: currentService.subcategory?._id || currentService.subcategory || "",
        price: currentService.price?.toString() || "",
        currency: currentService.currency || "USD",
        deliveryTime: currentService.deliveryTime?.toString() || "",
        deliveryTimeUnit: currentService.deliveryTimeUnit || "days",
        revisions: currentService.revisions?.toString() || "1",
        tags: currentService.tags || [],
        searchKeywords: currentService.searchKeywords || [],
        features: currentService.features || [],
        requirements: currentService.requirements || [],
        faqs: currentService.faqs || [],
        metaTitle: currentService.metaTitle || "",
        metaDescription: currentService.metaDescription || "",
        status: currentService.status || "active",
        version: currentService.version || 1
      });

      // Set existing images
      if (currentService.images && Array.isArray(currentService.images)) {
        setExistingImages(currentService.images);
      }

      // Set existing thumbnail
      if (currentService.thumbnail) {
        setExistingThumbnail(currentService.thumbnail);
      }
    }
  }, [currentService, currentUser, id, navigate, showServiceError]);

  useEffect(() => {
  if (updateSuccess && updatedServiceData && isSubmitting && !hasProcessedSuccessRef.current) {
    hasProcessedSuccessRef.current = true;
    
    setIsSubmitting(false);
    
    // Show success toast with 5-second timer and description
    showServiceUpdateSuccess(
      id,
      'Service Updated Successfully!',
      'Your changes are being processed and will be visible across the platform shortly.'
    );

    // Invalidate queries
    queryClient.invalidateQueries({
      queryKey: ['service', id]
    });
    
    queryClient.invalidateQueries({
      queryKey: ['services']
    });

    // Reset form state
    setVersionConflict(false);
    setConflictResolution({ show: false, serverVersion: 1, serverData: null });
    hasPopulatedRef.current = false;
  }
  
  // Reset success flag when submission starts
  return () => {
    if (isSubmitting) {
      hasProcessedSuccessRef.current = false;
    }
  };
}, [updateSuccess, updatedServiceData, id, queryClient, isSubmitting, showServiceUpdateSuccess]);

  // Handle update errors
  useEffect(() => {
    if (updateError) {
      setIsSubmitting(false);
      hasProcessedSuccessRef.current = false;
      
      // Handle version conflict
      if (updateError.code === 'VERSION_CONFLICT') {
        setVersionConflict(true);
        setConflictResolution({
          show: true,
          serverVersion: updateError.currentVersion || (currentVersion + 1),
          serverData: null
        });
        
        showServiceError(updateError.message || 'Service was modified by another user. Please refresh.');
        
        // Force refresh to get latest data
        setTimeout(() => {
          handleRefreshService();
        }, 1500);
      }
      // Handle subcategory errors
      else if (updateError.message?.includes('SUBCATEGORY')) {
        setErrors(prev => ({ ...prev, subcategory: 'Please select a valid subcategory' }));
        showServiceError('Subcategory validation failed');
      } else {
        showServiceError(updateError.message || 'Failed to update service');
      }
    }
  }, [updateError, currentVersion, showServiceError]);

  // Cleanup
  useEffect(() => {
    return () => {
      uploadedImages.forEach(img => URL.revokeObjectURL(img.preview));
      if (thumbnailFile) {
        URL.revokeObjectURL(thumbnailFile.preview);
      }
    };
  }, [uploadedImages, thumbnailFile]);

  // Profile completion check
  useEffect(() => {
    if (currentUser && !isProfileCompleteEnough(currentUser, 70)) {
      showServiceError('Please complete your profile before editing services');
      navigate('/dashboard');
    }
  }, [currentUser, navigate, showServiceError]);

  // Get category name for display
  const getCategoryName = useCallback(() => {
    if (!formData.category) return "";
    const categoryList = Array.isArray(categoriesData) ? categoriesData : [];
    const category = categoryList.find(c => c._id === formData.category);
    return category?.name || "";
  }, [formData.category, categoriesData]);

  // Get subcategory name for display
  const getSubcategoryName = useCallback(() => {
    if (!formData.subcategory) return "";
    const subcategory = subcategories.find(s => s._id === formData.subcategory);
    return subcategory?.name || "";
  }, [formData.subcategory, subcategories]);

  // Memoized handlers
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    
    // Update form data
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
    
    // If category changes, clear subcategory
    if (name === 'category' && value !== formData.category) {
      setFormData(prev => ({ ...prev, subcategory: "" }));
      subcategoriesData.refetch();
    }
  }, [errors, formData.category, subcategoriesData]);

  // Tag Management
  const handleAddTag = useCallback(() => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim()) && formData.tags.length < 20) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag("");
      showServiceInfo('Tag added');
    } else if (formData.tags.length >= 20) {
      showServiceError('Maximum 20 tags allowed');
    }
  }, [newTag, formData.tags, showServiceInfo, showServiceError]);

  const handleRemoveTag = useCallback((tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
    showServiceInfo('Tag removed');
  }, [showServiceInfo]);

  // Search Keywords Management
  const handleAddKeyword = useCallback(() => {
    if (newKeyword.trim() && !formData.searchKeywords.includes(newKeyword.trim()) && formData.searchKeywords.length < 20) {
      setFormData(prev => ({
        ...prev,
        searchKeywords: [...prev.searchKeywords, newKeyword.trim()]
      }));
      setNewKeyword("");
      showServiceInfo('Keyword added');
    } else if (formData.searchKeywords.length >= 20) {
      showServiceError('Maximum 20 keywords allowed');
    }
  }, [newKeyword, formData.searchKeywords, showServiceInfo, showServiceError]);

  const handleRemoveKeyword = useCallback((keywordToRemove) => {
    setFormData(prev => ({
      ...prev,
      searchKeywords: prev.searchKeywords.filter(keyword => keyword !== keywordToRemove)
    }));
    showServiceInfo('Keyword removed');
  }, [showServiceInfo]);

  // Features Management
  const handleAddFeature = useCallback(() => {
    if (newFeature.title.trim()) {
      setFormData(prev => ({
        ...prev,
        features: [...prev.features, { ...newFeature }]
      }));
      setNewFeature({ title: "", description: "", included: true });
      showServiceInfo('Feature added');
    }
  }, [newFeature, showServiceInfo]);

  const handleRemoveFeature = useCallback((index) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
    showServiceInfo('Feature removed');
  }, [showServiceInfo]);

  // FAQs Management
  const handleAddFAQ = useCallback(() => {
    if (newFAQ.question.trim() && newFAQ.answer.trim()) {
      setFormData(prev => ({
        ...prev,
        faqs: [...prev.faqs, { ...newFAQ }]
      }));
      setNewFAQ({ question: "", answer: "" });
      showServiceInfo('FAQ added');
    }
  }, [newFAQ, showServiceInfo]);

  const handleRemoveFAQ = useCallback((index) => {
    setFormData(prev => ({
      ...prev,
      faqs: prev.faqs.filter((_, i) => i !== index)
    }));
    showServiceInfo('FAQ removed');
  }, [showServiceInfo]);

  // Create a utility function to optimize images before upload
  const optimizeImageBeforeUpload = (file, maxWidth = 1200, maxHeight = 1200, quality = 0.8) => {
    return new Promise((resolve) => {
      if (file.size < 500 * 1024) { // If already small (<500KB)
        resolve(file);
        return;
      }

      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions
        if (width > maxWidth) {
          height = Math.round(height * (maxWidth / width));
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round(width * (maxHeight / height));
          height = maxHeight;
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            const optimizedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(optimizedFile);
          },
          'image/jpeg',
          quality
        );
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  // Image upload handler
  const handleImageUpload = useCallback(async (files) => {
    if (uploadingImages) return;
    
    const newFiles = Array.from(files);
    
    // Validate total image count
    const totalImages = existingImages.length + uploadedImages.length + newFiles.length;
    if (totalImages > 10) {
      showServiceError('Maximum 10 images allowed');
      return;
    }
    
    setUploadingImages(true);
    
    try {
      const optimizedFiles = await Promise.all(
        newFiles.map(async (file) => {
          // Skip optimization for already small files
          if (file.size < 500 * 1024) {
            return file;
          }
          
          try {
            return await optimizeImageBeforeUpload(file);
          } catch (error) {
            console.warn('Failed to optimize image, using original:', error);
            return file;
          }
        })
      );
      
      // Validate optimized files
      for (const file of optimizedFiles) {
        if (file.size > 2 * 1024 * 1024) { // Max 2MB after optimization
          showServiceError(`${file.name} is too large after optimization`);
          setUploadingImages(false);
          return;
        }
      }
      
      const previewImages = optimizedFiles.map(file => ({
        file,
        preview: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
        type: file.type,
        isNew: true
      }));
      
      setUploadedImages(prev => [...prev, ...previewImages]);
      showServiceInfo(`${newFiles.length} image(s) added successfully`);
    } catch (error) {
      console.error('Error uploading images:', error);
      showServiceError('Failed to add images');
    } finally {
      setUploadingImages(false);
    }
  }, [uploadingImages, existingImages, uploadedImages, showServiceError, showServiceInfo]);

  const handleThumbnailUpload = useCallback((file) => {
    if (uploadingThumbnail) return;
    
    if (file.size > 2 * 1024 * 1024) {
      showServiceError('Thumbnail exceeds 2MB limit');
      return;
    }
    
    if (!ALLOWED_THUMBNAIL_TYPES.includes(file.type)) {
      showServiceError('Invalid image type for thumbnail');
      return;
    }
    
    setThumbnailFile({
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
      type: file.type,
      isNew: true
    });
    
    showServiceInfo('Thumbnail selected');
  }, [uploadingThumbnail, showServiceError, showServiceInfo]);

  const removeExistingImage = useCallback((index) => {
    const imageToRemove = existingImages[index];
    setExistingImages(prev => prev.filter((_, i) => i !== index));
    
    // If this was the thumbnail, clear it
    if (existingThumbnail && existingThumbnail.public_id === imageToRemove.public_id) {
      setExistingThumbnail(null);
    }
    
    showServiceInfo('Image removed');
  }, [existingImages, existingThumbnail, showServiceInfo]);

  const removeUploadedImage = useCallback((index) => {
    const image = uploadedImages[index];
    URL.revokeObjectURL(image.preview);
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
    showServiceInfo('Image removed');
  }, [uploadedImages, showServiceInfo]);

  const removeThumbnail = useCallback(() => {
    if (thumbnailFile) {
      URL.revokeObjectURL(thumbnailFile.preview);
      setThumbnailFile(null);
      showServiceInfo('Thumbnail removed');
    } else if (existingThumbnail) {
      setExistingThumbnail(null);
      showServiceInfo('Thumbnail removed');
    }
  }, [thumbnailFile, existingThumbnail, showServiceInfo]);

  // Helper function to handle Enter key press
  const handleKeyPress = useCallback((e, type) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      switch(type) {
        case 'tag': handleAddTag(); break;
        case 'keyword': handleAddKeyword(); break;
        case 'feature': handleAddFeature(); break;
        case 'faq': handleAddFAQ(); break;
      }
    }
  }, [handleAddTag, handleAddKeyword, handleAddFeature, handleAddFAQ]);

  const validateForm = useCallback(() => {
    const newErrors = {};

    // Basic validation
    if (!formData.title || formData.title.trim().length < 5) {
      newErrors.title = "Service title must be at least 5 characters.";
    }

    if (!formData.category) {
      newErrors.category = "Please select a category.";
    }

    if (subcategories.length > 0 && !formData.subcategory) {
      newErrors.subcategory = "Please select a subcategory.";
    }

    if (!formData.shortDescription || formData.shortDescription.trim().length < 20) {
      newErrors.shortDescription = "Short description must be at least 20 characters.";
    }

    if (!formData.description || formData.description.trim().length < 50) {
      newErrors.description = "Description must be at least 50 characters.";
    }

    const priceNum = parseFloat(formData.price);
    if (!formData.price || isNaN(priceNum) || priceNum < 1 || priceNum > 100000) {
      newErrors.price = "Price must be between $1 and $100,000.";
    }

    const deliveryNum = parseInt(formData.deliveryTime);
    if (!formData.deliveryTime || isNaN(deliveryNum) || deliveryNum < 1 || deliveryNum > 365) {
      newErrors.deliveryTime = "Delivery time must be between 1 and 365 days.";
    }

    // Thumbnail validation
    if (!thumbnailFile && !existingThumbnail) {
      newErrors.thumbnail = "Thumbnail is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, subcategories, thumbnailFile, existingThumbnail]);

  const handleRefreshService = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Invalidate and refetch
      await queryClient.invalidateQueries({ queryKey: ['service', id] });
      const result = await refetchService();
      
      // Reset populated flag to allow re-population
      hasPopulatedRef.current = false;
      
      // Clear version conflict if it exists
      setVersionConflict(false);
      setConflictResolution({ show: false, serverVersion: 1, serverData: null });
      
      showServiceInfo('Service data refreshed successfully!');
      
      return result;
    } catch (error) {
      showServiceError('Failed to refresh service data');
      throw error;
    } finally {
      setIsRefreshing(false);
    }
  }, [id, refetchService, queryClient, showServiceInfo, showServiceError]);

  const handleResolveConflict = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetchService();
      
      // Get fresh data
      const freshData = await queryClient.fetchQuery({
        queryKey: ['service', id]
      });
      
      const freshService = freshData.service || freshData.data || freshData;
      
      if (freshService) {
        // Update conflict resolution with fresh data
        setConflictResolution({
          show: true,
          serverVersion: freshService.version || 1,
          serverData: freshService
        });
        
        // Show comparison options
        showServiceInfo('Latest version loaded. Please review changes.');
      }
    } catch (error) {
      showServiceError('Failed to resolve conflict');
    } finally {
      setIsRefreshing(false);
    }
  }, [id, refetchService, queryClient, showServiceInfo, showServiceError]);

  // Add this function to handle manual conflict resolution
  const handleManualResolve = useCallback((action) => {
    switch(action) {
      case 'keep_my_changes':
        // Keep user's changes, force update with server version + 1
        setFormData(prev => ({
          ...prev,
          version: conflictResolution.serverVersion
        }));
        setVersionConflict(false);
        showServiceInfo('Your changes will be applied on top of latest version');
        break;
        
      case 'use_server_changes':
        // Discard user's changes, use server version
        if (conflictResolution.serverData) {
          const serverService = conflictResolution.serverData;
          
          setFormData({
            title: serverService.title || "",
            description: serverService.description || "",
            shortDescription: serverService.shortDescription || "",
            category: serverService.category?._id || serverService.category || "",
            subcategory: serverService.subcategory?._id || serverService.subcategory || "",
            price: serverService.price?.toString() || "",
            currency: serverService.currency || "USD",
            deliveryTime: serverService.deliveryTime?.toString() || "",
            deliveryTimeUnit: serverService.deliveryTimeUnit || "days",
            revisions: serverService.revisions?.toString() || "1",
            tags: serverService.tags || [],
            searchKeywords: serverService.searchKeywords || [],
            features: serverService.features || [],
            requirements: serverService.requirements || [],
            faqs: serverService.faqs || [],
            metaTitle: serverService.metaTitle || "",
            metaDescription: serverService.metaDescription || "",
            status: serverService.status || "active",
            version: serverService.version || 1
          });
          
          if (serverService.images && Array.isArray(serverService.images)) {
            setExistingImages(serverService.images);
          }
          
          if (serverService.thumbnail) {
            setExistingThumbnail(serverService.thumbnail);
          }
        }
        
        setVersionConflict(false);
        setConflictResolution({ show: false, serverVersion: 1, serverData: null });
        hasPopulatedRef.current = false; // Allow re-population
        showServiceInfo('Loaded latest version from server');
        break;
        
      case 'merge_changes':
        // Show merge interface (simplified version)
        showServiceInfo('Manual merge required. Please refresh and edit again.');
        handleRefreshService();
        break;
    }
  }, [conflictResolution, handleRefreshService, showServiceInfo]);

  // Update the handleSubmit function to include version
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    setVersionConflict(false);
    
    if (!isAuthenticated) {
      showServiceError("Please sign in to update services");
      setIsSubmitting(false);
      return;
    }

    if (!validateForm()) {
      setIsSubmitting(false);
      return;
    }

    try {
      // Prepare update data
      const updateData = {
        title: (formData.title || '').trim(),
        description: (formData.description || '').trim(),
        shortDescription: formData.shortDescription?.trim() || 
          (formData.description ? formData.description.substring(0, 150) + '...' : ''),
        category: formData.category,
        subcategory: formData.subcategory || null,
        price: parseFloat(formData.price || 0),
        currency: formData.currency || "USD",
        deliveryTime: parseInt(formData.deliveryTime || 1),
        deliveryTimeUnit: formData.deliveryTimeUnit || "days",
        revisions: parseInt(formData.revisions || 1),
        status: formData.status || "active",
        tags: formData.tags || [],
        searchKeywords: formData.searchKeywords || [],
        features: formData.features || [],
        requirements: formData.requirements || [],
        faqs: formData.faqs || [],
        metaTitle: formData.metaTitle?.trim() || '',
        metaDescription: formData.metaDescription?.trim() || '',
        version: formData.version || currentVersion
      };

      // Show loading toast
      showServiceLoading('Updating service...');

      // Create FormData
      const formDataToSend = new FormData();
      
      // Add JSON data with version
      formDataToSend.append('data', JSON.stringify(updateData));
      
      // Add thumbnail if new one is uploaded
      if (thumbnailFile && thumbnailFile.file) {
        formDataToSend.append('thumbnail', thumbnailFile.file);
      }
      
      // Add new images
      if (uploadedImages.length > 0) {
        uploadedImages.forEach((img, index) => {
          if (img.file) {
            formDataToSend.append('images', img.file);
          }
        });
      }

      // Call updateService with version
      await updateService({
        id: id,
        data: formDataToSend,
        version: updateData.version,
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

    } catch (error) {
      console.error("Error in handleSubmit:", error);
      dismissServiceToast();
      
      // Handle specific errors
      if (error.code === 'VERSION_CONFLICT') {
        // This is handled in the useEffect above
        return;
      } else if (error.message?.includes('SUBCATEGORY')) {
        setErrors(prev => ({ ...prev, subcategory: 'Invalid subcategory selection' }));
        showServiceError('Please select a valid subcategory');
      } else if (error.message?.includes('Category not found')) {
        showServiceError('Selected category no longer exists. Please refresh and select again.');
      } else if (error.message?.includes('Validation failed')) {
        showServiceError('Please check your input and try again.');
      } else {
        showServiceError(error.message || 'Failed to update service. Please try again.');
      }
      
      setIsSubmitting(false);
    }
  }, [formData, id, thumbnailFile, uploadedImages, validateForm, updateService, isAuthenticated, currentVersion, isSubmitting, showServiceLoading, showServiceError, dismissServiceToast]);

  useEffect(() => {
    // Refresh service data when component mounts
    if (id && !serviceLoading) {
      refetchService().then(() => {
        console.log('Service data refreshed on mount');
      });
    }
  }, [id, serviceLoading, refetchService]);

  const formatPrice = useCallback((price) => {
    const num = parseFloat(price);
    return isNaN(num) ? "0" : num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }, []);

  // Version Conflict Resolution Component
  const VersionConflictResolution = () => {
    if (!versionConflict && !conflictResolution.show) return null;

    return (
      <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl">
        <div className="flex items-start">
          <AlertTriangle className="text-orange-600 mr-3 flex-shrink-0 mt-0.5" size={18} />
          <div className="flex-1">
            <h3 className="font-semibold text-orange-800 mb-2">Version Conflict Detected</h3>
            <p className="text-orange-700 mb-3">
              This service was modified by another user or in another tab. Your version: {formData.version}, Server version: {conflictResolution.serverVersion}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleResolveConflict}
                disabled={isRefreshing}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium flex items-center gap-2"
              >
                <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh & Resolve'}
              </button>
              
              {conflictResolution.serverData && (
                <>
                  <button
                    onClick={() => handleManualResolve('keep_my_changes')}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
                  >
                    Keep My Changes
                  </button>
                  <button
                    onClick={() => handleManualResolve('use_server_changes')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                  >
                    Use Server Version
                  </button>
                </>
              )}
            </div>
            
            {conflictResolution.serverData && (
              <div className="mt-4 p-3 bg-orange-100 rounded-lg">
                <h4 className="font-medium text-orange-800 mb-2">Server Changes:</h4>
                <ul className="text-sm text-orange-700 space-y-1">
                  <li>• Updated at: {new Date(conflictResolution.serverData.updatedAt).toLocaleString()}</li>
                  {conflictResolution.serverData.lastUpdatedBy && (
                    <li>• Updated by: {conflictResolution.serverData.lastUpdatedBy.name || 'Another user'}</li>
                  )}
                  <li>• Version: {conflictResolution.serverData.version}</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Loading state
  if (serviceLoading || categoryLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="bg-gray-200 rounded-2xl h-96 mb-6"></div>
                <div className="space-y-4">
                  <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                </div>
              </div>
              <div className="lg:col-span-1">
                <div className="bg-gray-200 rounded-2xl h-96"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (serviceError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 py-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Service</h2>
          <p className="text-gray-600 mb-8">{serviceError.message}</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleRefreshService}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/services')}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Browse Services
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SeoWrapper
      title={`Edit ${formData.title} | Vorkana`}
      description="Update your service details to attract more clients"
      keywords="edit service, update service, modify service, freelance service editing"
      canonical={`${window.location.origin}/edit-service/${id}`}
      structuredData={SERVICE_EDIT_STRUCTURED_DATA}
    >
      <div ref={topContainerRef} className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 py-8 md:py-12 px-4">
        {/* Header */}
        <div className="max-w-6xl mx-auto mb-8">
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-6 md:p-8 shadow-lg border border-emerald-100">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="md:w-2/3">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
                    <Edit className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-4xl font-bold text-gray-900">
                      Edit Service
                    </h1>
                    <p className="text-emerald-700 font-medium text-sm md:text-base">
                      Update your service details
                    </p>
                  </div>
                </div>
                <p className="text-gray-600 text-sm md:text-base">
                  Make changes to your service to keep it relevant and attractive to clients.
                </p>
              </div>
              <div className="md:w-1/3 w-full">
                <div className="bg-white rounded-xl p-4 md:p-6 shadow-lg border border-gray-200">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-sm md:text-base">
                    <Info className="w-4 h-4 md:w-5 md:h-5 text-emerald-600" />
                    Quick Tips
                  </h3>
                  <ul className="space-y-2 text-xs md:text-sm text-gray-600">
                    {QUICK_TIPS.map((tip, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Panel - Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="p-6 md:p-8">
                  <VersionConflictResolution />
                  
                  {/* Error Messages */}
                  {allErrors.form && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl" role="alert">
                      <p className="text-red-600 font-medium">{allErrors.form}</p>
                    </div>
                  )}

                  <form onSubmit={handleSubmit}>
                    {/* Basic Information */}
                    <input type="hidden" name="version" value={formData.version} />
                    <div className="mb-8">
                      <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-emerald-600" />
                        Basic Information
                      </h2>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <HistoryIcon className="w-4 h-4" />
                        <span>Version: {formData.version}</span>
                        <span className="mx-1">•</span>
                        <span>Last saved: {currentService?.updatedAt ? new Date(currentService.updatedAt).toLocaleString() : 'Never'}</span>
                      </div>
                      <div className="space-y-6">
                        <div>
                          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                            Service Title *
                          </label>
                          <input
                            type="text"
                            id="title"
                            name="title"
                            value={formData.title}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            placeholder="e.g., Professional Web Development Service"
                            required
                          />
                          {errors.title && (
                            <p className="mt-2 text-sm text-red-600">{errors.title}</p>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                              Category *
                            </label>
                            <select
                              id="category"
                              name="category"
                              value={formData.category}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                              required
                            >
                              <option value="">Select a category</option>
                              {(Array.isArray(categoriesData) ? categoriesData : []).map((category) => (
                                <option key={category._id} value={category._id}>
                                  {category.name}
                                </option>
                              ))}
                            </select>
                            {errors.category && (
                              <p className="mt-2 text-sm text-red-600">{errors.category}</p>
                            )}
                          </div>

                          <div>
                            <label htmlFor="subcategory" className="block text-sm font-medium text-gray-700 mb-2">
                              Subcategory {subcategories.length > 0 && '*'}
                            </label>
                            <select
                              id="subcategory"
                              name="subcategory"
                              value={formData.subcategory}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                              disabled={!formData.category || subcategoriesData.isLoading}
                              required={subcategories.length > 0}
                            >
                              <option value="">
                                {subcategoriesData.isLoading ? 'Loading...' : 
                                 subcategories.length > 0 ? 'Select a subcategory' : 'No subcategories'}
                              </option>
                              {subcategories.map((subcategory) => (
                                <option key={subcategory._id} value={subcategory._id}>
                                  {subcategory.name}
                                </option>
                              ))}
                            </select>
                            {errors.subcategory && (
                              <p className="mt-2 text-sm text-red-600">{errors.subcategory}</p>
                            )}
                          </div>
                        </div>

                        <div>
                          <label htmlFor="shortDescription" className="block text-sm font-medium text-gray-700 mb-2">
                            Short Description *
                          </label>
                          <textarea
                            id="shortDescription"
                            name="shortDescription"
                            value={formData.shortDescription}
                            onChange={handleInputChange}
                            rows="3"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            placeholder="Brief description of your service (appears in listings)"
                            required
                            maxLength={250}
                          />
                          <div className="flex justify-between mt-2">
                            <p className="text-xs text-gray-500">Minimum 20 characters, maximum 250</p>
                            <span className="text-xs text-gray-500">
                              {formData.shortDescription.length}/250 characters
                            </span>
                          </div>
                          {errors.shortDescription && (
                            <p className="mt-2 text-sm text-red-600">{errors.shortDescription}</p>
                          )}
                        </div>

                        <div>
                          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                            Full Description *
                          </label>
                          <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            rows="6"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            placeholder="Detailed description of your service..."
                            required
                            maxLength={5000}
                          />
                          <div className="flex justify-between mt-2">
                            <p className="text-xs text-gray-500">Minimum 50 characters, maximum 5000</p>
                            <span className="text-xs text-gray-500">
                              {formData.description.length}/5000 characters
                            </span>
                          </div>
                          {errors.description && (
                            <p className="mt-2 text-sm text-red-600">{errors.description}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Pricing & Delivery */}
                    <div className="mb-8">
                      <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-emerald-600" />
                        Pricing & Delivery
                      </h2>
                      <div className="space-y-6">
                        <div>
                          <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                            Price *
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                            <input
                              type="number"
                              id="price"
                              name="price"
                              value={formData.price}
                              onChange={handleInputChange}
                              className="w-full pl-10 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                              placeholder="Enter your price"
                              min="1"
                              max="100000"
                              step="0.01"
                              required
                            />
                          </div>
                          <div className="flex justify-between mt-2">
                            <p className="text-xs text-gray-500">Minimum $1, maximum $100,000</p>
                            {formData.price && (
                              <span className="text-sm font-semibold text-emerald-600">
                                ${formatPrice(formData.price)}
                              </span>
                            )}
                          </div>
                          {errors.price && (
                            <p className="mt-2 text-sm text-red-600">{errors.price}</p>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-2">
                              Currency
                            </label>
                            <select
                              id="currency"
                              name="currency"
                              value={formData.currency}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            >
                              {CURRENCY_OPTIONS.map(currency => (
                                <option key={currency.value} value={currency.value}>
                                  {currency.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label htmlFor="revisions" className="block text-sm font-medium text-gray-700 mb-2">
                              Revisions Included
                            </label>
                            <input
                              type="number"
                              id="revisions"
                              name="revisions"
                              value={formData.revisions}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                              placeholder="Number of revisions"
                              min="0"
                              max="99"
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="deliveryTime" className="block text-sm font-medium text-gray-700 mb-2">
                            Delivery Time *
                          </label>
                          <div className="flex gap-4">
                            <div className="flex-1">
                              <input
                                type="number"
                                id="deliveryTime"
                                name="deliveryTime"
                                value={formData.deliveryTime}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                placeholder="e.g., 7"
                                min="1"
                                max="365"
                                required
                              />
                            </div>
                            <div className="w-32">
                              <select
                                id="deliveryTimeUnit"
                                name="deliveryTimeUnit"
                                value={formData.deliveryTimeUnit}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                              >
                                {DELIVERY_TIME_UNITS.map(unit => (
                                  <option key={unit.value} value={unit.value}>
                                    {unit.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="flex justify-between mt-2">
                            <p className="text-xs text-gray-500">Minimum 1, maximum 365</p>
                            {formData.deliveryTime && (
                              <span className="text-sm font-semibold text-emerald-600">
                                {formData.deliveryTime} {formData.deliveryTimeUnit}
                              </span>
                            )}
                          </div>
                          {errors.deliveryTime && (
                            <p className="mt-2 text-sm text-red-600">{errors.deliveryTime}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Tags & Keywords */}
                    <div className="mb-8">
                      <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <Tag className="h-5 w-5 text-emerald-600" />
                        Tags & Keywords
                      </h2>
                      <div className="space-y-6">
                        {/* Tags */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Service Tags
                          </label>
                          <div className="flex gap-2 mb-3">
                            <input
                              type="text"
                              value={newTag}
                              onChange={(e) => setNewTag(e.target.value)}
                              onKeyPress={(e) => handleKeyPress(e, 'tag')}
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                              placeholder="Add a tag (e.g., web development)"
                              maxLength="30"
                            />
                            <button
                              type="button"
                              onClick={handleAddTag}
                              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                              disabled={!newTag.trim()}
                            >
                              Add
                            </button>
                          </div>
                          {formData.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2">
                              {formData.tags.map((tag, index) => (
                                <div key={index} className="flex items-center bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">
                                  {tag}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveTag(tag)}
                                    className="ml-2 text-emerald-600 hover:text-emerald-800"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          <p className="text-xs text-gray-500">Maximum 20 tags</p>
                        </div>

                        {/* Search Keywords */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Search Keywords
                          </label>
                          <div className="flex gap-2 mb-3">
                            <input
                              type="text"
                              value={newKeyword}
                              onChange={(e) => setNewKeyword(e.target.value)}
                              onKeyPress={(e) => handleKeyPress(e, 'keyword')}
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                              placeholder="Add search keyword"
                              maxLength="30"
                            />
                            <button
                              type="button"
                              onClick={handleAddKeyword}
                              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                              disabled={!newKeyword.trim()}
                            >
                              Add
                            </button>
                          </div>
                          {formData.searchKeywords.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2">
                              {formData.searchKeywords.map((keyword, index) => (
                                <div key={index} className="flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                                  {keyword}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveKeyword(keyword)}
                                    className="ml-2 text-blue-600 hover:text-blue-800"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          <p className="text-xs text-gray-500">Maximum 20 keywords</p>
                        </div>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="mb-8">
                      <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <CheckSquare className="h-5 w-5 text-emerald-600" />
                        Service Features
                      </h2>
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
                                className="h-4 w-4 text-emerald-600 rounded"
                              />
                              <span className="ml-2 text-sm text-gray-700">Included in service</span>
                            </label>
                            <button
                              type="button"
                              onClick={handleAddFeature}
                              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
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
                                  <CheckCircle className={`w-5 h-5 mr-3 ${feature.included ? 'text-emerald-500' : 'text-gray-400'}`} />
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

                    {/* Images Section */}
                    <div className="mb-8">
                      <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <ImageIcon className="h-5 w-5 text-emerald-600" />
                        Images
                      </h2>

                      {/* Existing Images */}
                      {existingImages.length > 0 && (
                        <div className="mb-6">
                          <h3 className="font-semibold text-gray-900 mb-4">Current Images ({existingImages.length}/10)</h3>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {existingImages.map((image, index) => (
                              <div key={index} className="relative group">
                                <img
                                  src={image.url}
                                  alt={`Service image ${index + 1}`}
                                  className="w-full h-32 object-cover rounded-lg"
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                                  <button
                                    type="button"
                                    onClick={() => removeExistingImage(index)}
                                    className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                                {existingThumbnail?.public_id === image.public_id && (
                                  <div className="absolute top-2 left-2 bg-emerald-500 text-white text-xs px-2 py-1 rounded">
                                    Thumbnail
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* New Images Upload */}
                      <div className="mb-6">
                        <h3 className="font-semibold text-gray-900 mb-4">Add New Images</h3>
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-emerald-500 transition-colors">
                          <input
                            type="file"
                            id="image-upload"
                            multiple
                            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                            onChange={(e) => handleImageUpload(e.target.files)}
                            className="hidden"
                            disabled={uploadingImages || existingImages.length + uploadedImages.length >= 10}
                          />
                          <label htmlFor="image-upload" className="cursor-pointer">
                            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <h4 className="text-lg font-medium text-gray-900 mb-2">
                              Upload New Images
                            </h4>
                            <p className="text-gray-600 mb-4">
                              {existingImages.length + uploadedImages.length}/10 images uploaded
                            </p>
                            <p className="text-sm text-gray-500">
                              Max 5MB each • JPEG, PNG, WebP, GIF
                            </p>
                          </label>
                        </div>

                        {uploadedImages.length > 0 && (
                          <div className="mt-4">
                            <div className="flex justify-between items-center mb-4">
                              <h4 className="font-medium text-gray-900">
                                New Images ({uploadedImages.length})
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
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                              {uploadedImages.map((image, index) => (
                                <div key={index} className="relative">
                                  <img
                                    src={image.preview}
                                    alt={`New image ${index + 1}`}
                                    className="w-full h-32 object-cover rounded-lg"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeUploadedImage(index)}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Thumbnail */}
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-4">Thumbnail</h3>
                        <p className="text-gray-600 text-sm mb-4">
                          The thumbnail is the main image displayed in service listings.
                        </p>

                        {existingThumbnail && !thumbnailFile && (
                          <div className="mb-4">
                            <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-lg">
                              <img
                                src={existingThumbnail.url}
                                alt="Current thumbnail"
                                className="w-20 h-20 object-cover rounded"
                              />
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900">Current Thumbnail</h4>
                                <p className="text-sm text-gray-600">
                                  This image is currently set as your service thumbnail
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={removeThumbnail}
                                className="px-3 py-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        )}

                        {thumbnailFile ? (
                          <div className="flex items-start gap-4 p-4 bg-emerald-50 rounded-lg">
                            <img
                              src={thumbnailFile.preview}
                              alt="New thumbnail"
                              className="w-20 h-20 object-cover rounded"
                            />
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">New Thumbnail</h4>
                              <p className="text-sm text-gray-600">{thumbnailFile.name}</p>
                            </div>
                            <button
                              type="button"
                              onClick={removeThumbnail}
                              className="px-3 py-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-emerald-500 transition-colors">
                            <input
                              type="file"
                              id="thumbnail-upload"
                              accept="image/jpeg,image/jpg,image/png,image/webp"
                              onChange={(e) => handleThumbnailUpload(e.target.files[0])}
                              className="hidden"
                              disabled={uploadingThumbnail}
                            />
                            <label htmlFor="thumbnail-upload" className="cursor-pointer">
                              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                              <h4 className="text-lg font-medium text-gray-900 mb-1">
                                {existingThumbnail ? 'Change Thumbnail' : 'Set Thumbnail'}
                              </h4>
                              <p className="text-gray-600 text-sm">
                                Recommended: 800×600 pixels, max 2MB
                              </p>
                            </label>
                          </div>
                        )}
                        {errors.thumbnail && (
                          <p className="mt-2 text-sm text-red-600">{errors.thumbnail}</p>
                        )}
                      </div>
                    </div>

                    {/* FAQs */}
                    <div className="mb-8">
                      <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <HelpCircle className="h-5 w-5 text-emerald-600" />
                        Frequently Asked Questions
                      </h2>
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
                                onKeyPress={(e) => handleKeyPress(e, 'faq')}
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
                              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
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

                    {/* Status & Metadata */}
                    <div className="mb-8">
                      <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <Shield className="h-5 w-5 text-emerald-600" />
                        Status & Metadata
                      </h2>
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Service Status
                          </label>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            {STATUS_OPTIONS.map((status) => (
                              <label key={status.value} className="flex items-center">
                                <input
                                  type="radio"
                                  name="status"
                                  value={status.value}
                                  checked={formData.status === status.value}
                                  onChange={handleInputChange}
                                  className="sr-only"
                                />
                                <div className={`
                                  w-full px-4 py-3 text-center border rounded-lg cursor-pointer
                                  ${formData.status === status.value
                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                                    : 'border-gray-300 hover:border-gray-400'
                                  }
                                `}>
                                  <div className="font-medium">{status.label}</div>
                                  <div className="text-xs text-gray-500 mt-1">{status.desc}</div>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label htmlFor="metaTitle" className="block text-sm font-medium text-gray-700 mb-2">
                              Meta Title (Optional)
                            </label>
                            <input
                              type="text"
                              id="metaTitle"
                              name="metaTitle"
                              value={formData.metaTitle}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                              placeholder="SEO title"
                              maxLength="60"
                            />
                          </div>

                          <div>
                            <label htmlFor="metaDescription" className="block text-sm font-medium text-gray-700 mb-2">
                              Meta Description (Optional)
                            </label>
                            <textarea
                              id="metaDescription"
                              name="metaDescription"
                              value={formData.metaDescription}
                              onChange={handleInputChange}
                              rows="3"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                              placeholder="SEO description"
                              maxLength="160"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => navigate(`/services/${id}`)}
                        className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium flex items-center justify-center gap-2"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting || updateLoading}
                        className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                       {isSubmitting || updateLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Updating Service...
                          </>
                        ) : versionConflict ? (
                          <>
                            <AlertTriangle className="h-4 w-4" />
                            Version Conflict - Refresh Required
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Update Service (v{formData.version})
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleRefreshService}
                        disabled={isRefreshing}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isRefreshing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Refreshing...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4" />
                            Refresh & Check
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* Right Panel - Preview & Info */}
            <div className="lg:col-span-1">
              <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl shadow-2xl p-6 md:p-8 text-white h-full">
                <div className="mb-6">
                  <div className="flex items-center mb-4">
                    <Eye className="mr-3" size={20} />
                    <h2 className="text-xl font-bold">Service Preview</h2>
                  </div>
                  <div className="px-2 py-1 bg-emerald-800 text-emerald-100 text-xs rounded-full">
                      v{currentVersion}
                    </div>
                  <p className="text-emerald-100 text-sm">
                    Review your changes before updating. This preview shows how your service will appear to clients.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <h3 className="font-bold text-lg mb-3">Current Information</h3>
                    <ul className="space-y-2 text-sm">
                      <li className="flex justify-between">
                        <span className="text-emerald-100">Title:</span>
                        <span className="font-medium truncate max-w-[150px]">
                          {formData.title || 'Not set'}
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-emerald-100">Category:</span>
                        <span className="font-medium truncate max-w-[120px]">
                          {getCategoryName() || 'Not selected'}
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-emerald-100">Subcategory:</span>
                        <span className="font-medium truncate max-w-[120px]">
                          {getSubcategoryName() || 'Not selected'}
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-emerald-100">Price:</span>
                        <span className="font-medium">
                          ${formatPrice(formData.price)}
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-emerald-100">Delivery Time:</span>
                        <span className="font-medium">{formData.deliveryTime || 'Not set'} {formData.deliveryTimeUnit}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-emerald-100">Status:</span>
                        <span className="font-medium capitalize">{formData.status}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-emerald-100">Tags:</span>
                        <span className="font-medium">{formData.tags.length} added</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-emerald-100">Features:</span>
                        <span className="font-medium">{formData.features.length} added</span>
                      </li>
                      
                      <li className="flex justify-between">
                        <span className="text-emerald-100">Total Images:</span>
                        <span className="font-medium">
                          {existingImages.length + uploadedImages.length}/10
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <h3 className="font-bold text-lg mb-3">Changes Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-100">Form Fields Updated:</span>
                        <span className="font-medium">Multiple</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-100">New Images:</span>
                        <span className="font-medium">{uploadedImages.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-100">New Thumbnail:</span>
                        <span className="font-medium">{thumbnailFile ? 'Yes' : 'No'}</span>
                      </div>
                      
                    </div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <h3 className="font-bold text-lg mb-3">Update Tips</h3>
                    <ul className="space-y-2 text-sm text-emerald-100">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>Update at least once a month to stay relevant</span>
                      </li>
                     
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>High-quality images increase engagement</span>
                      </li>
                    </ul>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                      <GitBranch className="h-5 w-5" />
                      Version Information
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-100">Current Version:</span>
                        <span className="font-medium">{formData.version}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-100">Status:</span>
                        <span className="font-medium capitalize">{formData.status}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-100">Last Edited:</span>
                        <span className="font-medium">
                          {currentService?.updatedAt ? 
                            new Date(currentService.updatedAt).toLocaleDateString() : 
                            'Never'
                          }
                        </span>
                      </div>
                      {versionConflict && (
                        <div className="mt-3 p-2 bg-orange-500/20 rounded border border-orange-500/30">
                          <p className="text-orange-200 text-xs">
                            <AlertTriangle className="inline w-3 h-3 mr-1" />
                            Version conflict detected. Please resolve before saving.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SeoWrapper>
  );
};

export default EditService;