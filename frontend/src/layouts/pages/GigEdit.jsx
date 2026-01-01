import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  Save,
  ChevronDown,
  ArrowLeft,
  Type,
  Package,
  Layers,
  AlertCircle,
  RefreshCw,
  Eye,
  Trash2,
  Image as ImageIcon,
  Plus,
  Grid3x3,
  Edit
} from "lucide-react";
import { toast } from "react-hot-toast";

import { useAuthStore } from "../../store/useAuthStore";
import { useGigStore } from "../../store/useGigStore";
import { useCategoryStore } from "../../store/useCategoryStore";
import { useGig, useUpdateGig } from "../../hooks/useGigs";
import { useParentCategories } from '../../hooks/useCategories';
import { useSubcategoriesByCategory } from '../../hooks/useSubcategories';
import { SeoWrapper } from "../../components/SeoWrapper";
import { isProfileCompleteEnough } from '../../utils/profileUtils';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

// Static data
const GIG_EDIT_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Edit Gig on Vorkana",
  "description": "Update your gig details on Vorkana. Edit project information, images, and requirements to attract the best freelancers.",
  "url": typeof window !== 'undefined' ? `${window.location.origin}/edit-gig` : '/edit-gig',
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
        "name": "Edit Gig",
        "item": typeof window !== 'undefined' ? `${window.location.origin}/edit-gig` : '/edit-gig'
      }
    ]
  },
  "potentialAction": {
    "@type": "UpdateAction",
    "name": "Update Gig",
    "description": "Update an existing gig",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": `${window.location.origin}/edit-gig/{id}`,
      "actionPlatform": [
        "http://schema.org/DesktopWebPlatform",
        "http://schema.org/MobileWebPlatform"
      ]
    }
  }
};

const QUICK_TIPS = [
  "Update clear and specific requirements",
  "Keep images relevant and high-quality",
  "Refresh your gig to keep it visible in searches"
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
  { value: 'days', label: 'Days' },
  { value: 'weeks', label: 'Weeks' },
  { value: 'months', label: 'Months' }
];

const COMMUNICATION_OPTIONS = ['Email', 'Phone', 'Video Call', 'Any'];
const URGENCY_LEVELS = ['low', 'medium', 'high', 'urgent'];
const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public', desc: 'Visible to all' },
  { value: 'private', label: 'Private', desc: 'Only you' },
  { value: 'invite_only', label: 'Invite Only', desc: 'Selected users' }
];

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

const GigEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  // Zustand stores
  const { user: currentUser, isAuthenticated, error: authError } = useAuthStore();
  const { setGigDetails, clearGigDetails } = useGigStore();
  const { categories: storedCategories, setCategories } = useCategoryStore();

  // TanStack Query hooks
  const {
    data: gigData,
    isLoading: gigLoading,
    error: gigError,
    refetch: refetchGig
  } = useGig(id);

  const {
    data: categoriesData,
    isLoading: categoryLoading,
    error: categoryError,
    refetch: refetchCategories
  } = useParentCategories();

  const {
    mutate: updateGig,
    isPending: updateLoading,
    error: updateError,
    isSuccess: updateSuccess,
    data: updatedGigData
  } = useUpdateGig();

  // Initial form state
  const initialFormData = useMemo(() => ({
    title: "",
    fullName: "",
    oauthEmail: "",
    country: "",
    phone: "",
    projectCategory: "",
    subcategory: "",
    description: "",
    budget: "",
    currency: "USD",
    timeline: "",
    timelineUnit: "days",
    communication: "Email",
    urgency: "medium",
    visibility: "public",
    skillsRequired: [],
    deliverables: []
  }), []);

  // Local state
  const [formData, setFormData] = useState(initialFormData);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [existingThumbnail, setExistingThumbnail] = useState(null);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [skillsInput, setSkillsInput] = useState("");
  const [deliverableInput, setDeliverableInput] = useState("");
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [versionConflict, setVersionConflict] = useState(false);
  const [currentVersion, setCurrentVersion] = useState(1);
const [isRefreshing, setIsRefreshing] = useState(false);
  // Refs
  const imageUploadRef = useRef(null);
  const thumbnailUploadRef = useRef(null);
  const topContainerRef = useRef(null);

  // Memoized values
  const subcategoriesData = useSubcategoriesByCategory(formData.projectCategory, {
    enabled: !!formData.projectCategory
  });

  const subcategories = useMemo(() => {
    if (!subcategoriesData.data) return [];
    return subcategoriesData.data?.subcategories || subcategoriesData.data || [];
  }, [subcategoriesData.data]);

  const allErrors = useMemo(() => ({
    ...errors,
    form: errors.form || gigError?.message || authError || categoryError?.message || updateError?.message
  }), [errors, gigError, authError, categoryError, updateError]);

  // Initialize form with gig data
  useEffect(() => {
    if (gigData?.gig || gigData) {
      const gig = gigData.gig || gigData;
      
      // Check if user is owner
      if (currentUser && gig.createdBy?._id !== currentUser._id && currentUser.role !== 'admin') {
        toast.error('You can only edit your own gigs');
        navigate(`/gig/${id}`);
        return;
      }

      // Set current version
      setCurrentVersion(gig.version || 1);

      // Populate form
      setFormData({
        title: gig.title || "",
        fullName: gig.fullName || "",
        oauthEmail: gig.oauthEmail || "",
        country: gig.country || "",
        phone: gig.phone || "",
        projectCategory: gig.projectCategory?._id || gig.projectCategory || "",
        subcategory: gig.subcategory?._id || gig.subcategory || "",
        description: gig.description || "",
        budget: gig.budget?.toString() || "",
        currency: gig.currency || "USD",
        timeline: gig.timeline || "",
        timelineUnit: gig.timelineUnit || "days",
        communication: gig.communication || "Email",
        urgency: gig.urgency || "medium",
        visibility: gig.visibility || "public",
        skillsRequired: gig.skillsRequired || [],
        deliverables: gig.deliverables || []
      });

      // Set existing images
      if (gig.images && Array.isArray(gig.images)) {
        setExistingImages(gig.images);
      }

      // Set existing thumbnail
      if (gig.thumbnail) {
        setExistingThumbnail(gig.thumbnail);
      }

      // Set gig details in store
      setGigDetails(gig);
    }
  }, [gigData, currentUser, id, navigate, setGigDetails]);

  // Sync categories from query to store
  useEffect(() => {
    if (categoriesData && categoriesData.length > 0) {
      setCategories(categoriesData);
    }
  }, [categoriesData, setCategories]);

  // Handle successful update
  useEffect(() => {
    if (updateSuccess && updatedGigData) {
      setSuccess(true);
      toast.success(updatedGigData.message || "Gig updated successfully!");

      // Refresh gig data
      refetchGig();

      // Navigate back after delay
      setTimeout(() => {
        navigate(`/gig/${id}`);
      }, 2000);
    }
  }, [updateSuccess, updatedGigData, navigate, id, refetchGig]);

  // Handle update errors
  useEffect(() => {
    if (updateError) {
      if (updateError.code === 'VERSION_CONFLICT') {
        setVersionConflict(true);
        toast.error('This gig was modified by another user. Please refresh and try again.');
      } else if (updateError.code === 'SUBCATEGORY_REQUIRED') {
        setErrors(prev => ({ ...prev, subcategory: 'Please select a subcategory' }));
        toast.error('Subcategory is required');
      } else {
        toast.error(updateError.message || 'Failed to update gig');
      }
    }
  }, [updateError]);

  // Cleanup
  useEffect(() => {
    return () => {
      clearGigDetails();
      uploadedImages.forEach(img => URL.revokeObjectURL(img.preview));
      if (thumbnailFile) {
        URL.revokeObjectURL(thumbnailFile.preview);
      }
    };
  }, [clearGigDetails, uploadedImages, thumbnailFile]);

  // Profile completion check
  useEffect(() => {
    if (!isProfileCompleteEnough(currentUser, 70)) {
      toast.error('Please complete your profile before editing gigs');
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  // Get category name for display
  const getCategoryName = useCallback(() => {
    if (!formData.projectCategory) return "";
    const categoryList = Array.isArray(storedCategories) && storedCategories.length > 0
      ? storedCategories
      : (Array.isArray(categoriesData) ? categoriesData : []);
    const category = categoryList.find(c => c._id === formData.projectCategory);
    return category?.name || "";
  }, [formData.projectCategory, storedCategories, categoriesData]);

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
    if (name === 'projectCategory' && value !== formData.projectCategory) {
      setFormData(prev => ({ ...prev, subcategory: "" }));
      subcategoriesData.refetch();
    }
  }, [errors, formData.projectCategory, subcategoriesData]);

  const validateField = useCallback((fieldName, value) => {
    switch (fieldName) {
      case 'fullName':
        return value.trim().length >= 3;
      case 'oauthEmail':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value);
      case 'country':
        return value.trim().length >= 2;
      case 'phone':
        return value.trim().length >= 5;
      case 'title':
        return value.trim().length >= 5;
      case 'projectCategory':
        return !!value;
      case 'subcategory':
        if (subcategories.length > 0) {
          return !!value;
        }
        return true;
      case 'budget':
        const budgetNum = parseFloat(value);
        return !isNaN(budgetNum) && budgetNum >= 5 && budgetNum <= 100000;
      case 'description':
        return value.trim().length >= 20;
      case 'timeline':
        return value.trim().length >= 3;
      default:
        return !!value;
    }
  }, [subcategories]);

  const handleImageUpload = useCallback(async (files) => {
    if (uploadingImages) return;
    
    const newFiles = Array.from(files);
    
    // Validate total image count
    const totalImages = existingImages.length + uploadedImages.length + newFiles.length;
    if (totalImages > 10) {
      toast.error('Maximum 10 images allowed');
      return;
    }
    
    // Validate each file
    for (const file of newFiles) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 5MB limit`);
        return;
      }
      
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
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
        type: file.type,
        isNew: true
      }));
      
      setUploadedImages(prev => [...prev, ...previewImages]);
      toast.success(`${newFiles.length} image(s) added successfully`);
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error('Failed to add images');
    } finally {
      setUploadingImages(false);
    }
  }, [uploadingImages, existingImages, uploadedImages]);

  const handleThumbnailUpload = useCallback((file) => {
    if (uploadingThumbnail) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Thumbnail exceeds 5MB limit');
      return;
    }
    
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Invalid image type for thumbnail');
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
    
    toast.success('Thumbnail selected');
  }, [uploadingThumbnail]);

  const removeExistingImage = useCallback((index) => {
    const imageToRemove = existingImages[index];
    setExistingImages(prev => prev.filter((_, i) => i !== index));
    
    // If this was the thumbnail, clear it
    if (existingThumbnail && existingThumbnail.public_id === imageToRemove.public_id) {
      setExistingThumbnail(null);
    }
    
    toast.success('Image removed');
  }, [existingImages, existingThumbnail]);

  const removeUploadedImage = useCallback((index) => {
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
    } else if (existingThumbnail) {
      setExistingThumbnail(null);
      toast.success('Thumbnail removed');
    }
  }, [thumbnailFile, existingThumbnail]);

  const addSkill = useCallback(() => {
    if (skillsInput.trim() && formData.skillsRequired.length < 10) {
      const skill = skillsInput.trim().substring(0, 50);
      setFormData(prev => ({
        ...prev,
        skillsRequired: [...prev.skillsRequired, skill]
      }));
      setSkillsInput("");
    }
  }, [skillsInput, formData.skillsRequired]);

  const removeSkill = useCallback((index) => {
    setFormData(prev => ({
      ...prev,
      skillsRequired: prev.skillsRequired.filter((_, i) => i !== index)
    }));
  }, []);

  const addDeliverable = useCallback(() => {
    if (deliverableInput.trim() && formData.deliverables.length < 10) {
      const deliverable = deliverableInput.trim().substring(0, 200);
      setFormData(prev => ({
        ...prev,
        deliverables: [...prev.deliverables, deliverable]
      }));
      setDeliverableInput("");
    }
  }, [deliverableInput, formData.deliverables]);

  const removeDeliverable = useCallback((index) => {
    setFormData(prev => ({
      ...prev,
      deliverables: prev.deliverables.filter((_, i) => i !== index)
    }));
  }, []);

  const handleKeyPress = useCallback((e, type) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (type === 'skill') addSkill();
      if (type === 'deliverable') addDeliverable();
    }
  }, [addSkill, addDeliverable]);

  const validateForm = useCallback(() => {
    const newErrors = {};

    // Basic validation
    if (!formData.title || formData.title.trim().length < 5) {
      newErrors.title = "Title must be at least 5 characters.";
    }

    if (!formData.projectCategory) {
      newErrors.projectCategory = "Please select a project category.";
    }

    if (subcategories.length > 0 && !formData.subcategory) {
      newErrors.subcategory = "Please select a subcategory.";
    }

    const budgetNum = parseFloat(formData.budget);
    if (!formData.budget || isNaN(budgetNum) || budgetNum < 5 || budgetNum > 100000) {
      newErrors.budget = "Budget must be between $5 and $100,000.";
    }

    if (!formData.description || formData.description.trim().length < 20) {
      newErrors.description = "Description must be at least 20 characters.";
    } else if (formData.description.trim().length > 5000) {
      newErrors.description = "Description cannot exceed 5000 characters.";
    }

    if (!formData.timeline || formData.timeline.trim().length < 3) {
      newErrors.timeline = "Timeline is required.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, subcategories]);

  const handleSubmit = useCallback(async (e) => {
  e.preventDefault();
  setIsSubmitting(true);
  setVersionConflict(false);
 if (gigData?.gig?.version && gigData.gig.version > currentVersion) {
    setVersionConflict(true);
    toast.error('Gig data is outdated. Please refresh.');
    setIsSubmitting(false);
    return;
  }

  if (!isAuthenticated) {
    toast.error("Please sign in to update gigs");
    setIsSubmitting(false);
    return;
  }

  if (!validateForm()) {
    setIsSubmitting(false);
    return;
  }

  try {
    const formDataObj = new FormData();

    // Create update data object
    const gigUpdateData = {
      title: formData.title.trim(),
      fullName: formData.fullName.trim(),
      oauthEmail: formData.oauthEmail.trim().toLowerCase(),
      country: formData.country.trim(),
      phone: formData.phone.trim(),
      projectCategory: formData.projectCategory,
      subcategory: formData.subcategory || undefined,
      description: formData.description.trim(),
      budget: parseFloat(formData.budget),
      currency: formData.currency,
      timeline: formData.timeline.trim(),
      timelineUnit: formData.timelineUnit,
      communication: formData.communication,
      urgency: formData.urgency,
      visibility: formData.visibility
    };

    // Validate subcategory
    if (subcategories.length > 0 && !gigUpdateData.subcategory) {
      throw new Error('Subcategory is required for this category');
    }

    // Append basic data
    Object.keys(gigUpdateData).forEach(key => {
      if (gigUpdateData[key] !== null && gigUpdateData[key] !== undefined && gigUpdateData[key] !== '') {
        if (typeof gigUpdateData[key] === 'object') {
          formDataObj.append(key, JSON.stringify(gigUpdateData[key]));
        } else {
          formDataObj.append(key, gigUpdateData[key]);
        }
      }
    });

    // ✅ CRITICAL FIX: Append version separately
    formDataObj.append('version', currentVersion);

    // Append skills
    if (formData.skillsRequired && formData.skillsRequired.length > 0) {
      formData.skillsRequired.forEach((skill, index) => {
        formDataObj.append(`skillsRequired[${index}]`, skill);
      });
    }

    // Append deliverables
    if (formData.deliverables && formData.deliverables.length > 0) {
      formData.deliverables.forEach((deliverable, index) => {
        formDataObj.append(`deliverables[${index}]`, deliverable);
      });
    }

    // Append thumbnail if new
    if (thumbnailFile) {
      formDataObj.append('thumbnail', thumbnailFile.file);
    }

    // Append new images
    uploadedImages.forEach((image) => {
      formDataObj.append('images', image.file);
    });

    setErrors({});
    
    // Call update mutation
    updateGig({
      id: id,
      data: formDataObj
    });

  } catch (error) {
    console.error("Error in handleSubmit:", error);
  
  if (error.message?.includes('version') || error.code === 'VERSION_CONFLICT') {
    setVersionConflict(true);
    toast.error('This gig was modified by another user. Please refresh and try again.');
  } else {
    toast.error(error.message || "Failed to update gig. Please try again.");
  }
  
  setErrors(prev => ({
    ...prev,
    form: error.message || "Something went wrong. Please try again."
  }));
  setIsSubmitting(false);
  }
}, [formData, currentVersion, subcategories, isAuthenticated, id, thumbnailFile, uploadedImages, validateForm, updateGig]);
  const handleRefreshGig = useCallback(async () => {
  setIsRefreshing(true);
  try {
    await refetchGig();
    setVersionConflict(false);
    toast.success('Gig data refreshed successfully!');
  } catch (error) {
    toast.error('Failed to refresh gig data');
  } finally {
    setIsRefreshing(false);
  }
}, [refetchGig]);
useEffect(() => {
  // Refresh gig data when component mounts to ensure fresh version
  if (id && !gigLoading) {
    refetchGig().then(() => {
      console.log('Gig data refreshed on mount');
    });
  }
}, [id]);
  const formatBudget = useCallback((budget) => {
    const num = parseFloat(budget);
    return isNaN(num) ? "0" : num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }, []);

  // Loading state
  if (gigLoading || categoryLoading) {
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
  if (gigError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 py-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Gig</h2>
          <p className="text-gray-600 mb-8">{gigError.message}</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleRefreshGig}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/gigs')}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Browse Gigs
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 py-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="bg-white rounded-2xl p-12 shadow-xl">
            <CheckCircle className="h-20 w-20 text-emerald-500 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Gig Updated Successfully!</h2>
            <p className="text-gray-600 text-lg mb-8">
              Your gig has been updated. Redirecting to gig page...
            </p>
            <div className="w-24 h-1 bg-emerald-500 rounded-full mx-auto animate-pulse"></div>
            <div className="mt-8">
              <button
                onClick={() => navigate(`/gig/${id}`)}
                className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
              >
                View Updated Gig
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SeoWrapper
      title={`Edit ${formData.title} | Vorkana`}
      description="Update your gig details to attract the best freelancers"
      keywords="edit gig, update project, modify gig, freelance project editing"
      canonical={`${window.location.origin}/edit-gig/${id}`}
      structuredData={GIG_EDIT_STRUCTURED_DATA}
    >
      <div ref={topContainerRef} className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 py-8 md:py-12 px-4">
        {/* Header */}
        <div className="max-w-6xl mx-auto mb-8">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 md:p-8 shadow-lg border border-blue-100">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="md:w-2/3">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                    <Edit className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-4xl font-bold text-gray-900">
                      Edit Gig
                    </h1>
                    <p className="text-blue-700 font-medium text-sm md:text-base">
                      Update your project details
                    </p>
                  </div>
                </div>
                <p className="text-gray-600 text-sm md:text-base">
                  Make changes to your gig to keep it relevant and attractive to freelancers.
                </p>
              </div>
              <div className="md:w-1/3 w-full">
                <div className="bg-white rounded-xl p-4 md:p-6 shadow-lg border border-gray-200">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-sm md:text-base">
                    <Info className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                    Quick Tips
                  </h3>
                  <ul className="space-y-2 text-xs md:text-sm text-gray-600">
                    {QUICK_TIPS.map((tip, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-blue-500 mt-0.5 flex-shrink-0" />
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
                  {/* Error Messages */}
                  {allErrors.form && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl" role="alert">
                      <p className="text-red-600 font-medium">{allErrors.form}</p>
                    </div>
                  )}

                {versionConflict && (
  <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl">
    <div className="flex items-start">
      <AlertCircle className="text-orange-600 mr-3 flex-shrink-0 mt-0.5" size={18} />
      <div>
        <h3 className="font-semibold text-orange-800 mb-2">Version Conflict</h3>
        <p className="text-orange-700 mb-3">
          This gig was modified by another user. Please refresh to get the latest version.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleRefreshGig}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium flex items-center gap-2"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh Gig Data
          </button>
          <button
            onClick={() => {
              setVersionConflict(false);
              toast('Continuing with current data', {
                icon: '⚠️',
                style: {
                  background: '#f59e0b',
                  color: 'white',
                },
              });
            }}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium"
          >
            Continue Anyway
          </button>
        </div>
      </div>
    </div>
  </div>
)}

                  <form onSubmit={handleSubmit}>
                    {/* Basic Information */}
                    <div className="mb-8">
                      <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        Basic Information
                      </h2>
                      <div className="space-y-6">
                        <div>
                          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                            Project Title *
                          </label>
                          <input
                            type="text"
                            id="title"
                            name="title"
                            value={formData.title}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="e.g., Build a responsive e-commerce website"
                            required
                          />
                          {errors.title && (
                            <p className="mt-2 text-sm text-red-600">{errors.title}</p>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label htmlFor="projectCategory" className="block text-sm font-medium text-gray-700 mb-2">
                              Project Category *
                            </label>
                            <select
                              id="projectCategory"
                              name="projectCategory"
                              value={formData.projectCategory}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              required
                            >
                              <option value="">Select a category</option>
                              {(Array.isArray(categoriesData) ? categoriesData : []).map((category) => (
                                <option key={category._id} value={category._id}>
                                  {category.name}
                                </option>
                              ))}
                            </select>
                            {errors.projectCategory && (
                              <p className="mt-2 text-sm text-red-600">{errors.projectCategory}</p>
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
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              disabled={!formData.projectCategory || subcategoriesData.isLoading}
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
                          <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-2">
                            Budget (USD) *
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                            <input
                              type="number"
                              id="budget"
                              name="budget"
                              value={formData.budget}
                              onChange={handleInputChange}
                              className="w-full pl-10 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Enter your budget"
                              min="5"
                              max="100000"
                              step="0.01"
                              required
                            />
                          </div>
                          <div className="flex justify-between mt-2">
                            <p className="text-xs text-gray-500">Minimum $5, maximum $100,000</p>
                            {formData.budget && (
                              <span className="text-sm font-semibold text-blue-600">
                                ${formatBudget(formData.budget)}
                              </span>
                            )}
                          </div>
                          {errors.budget && (
                            <p className="mt-2 text-sm text-red-600">{errors.budget}</p>
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
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            {CURRENCY_OPTIONS.map(currency => (
                              <option key={currency.value} value={currency.value}>
                                {currency.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="mb-8">
                      <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <User className="h-5 w-5 text-blue-600" />
                        Contact Information
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                            Full Name *
                          </label>
                          <input
                            type="text"
                            id="fullName"
                            name="fullName"
                            value={formData.fullName}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>

                        <div>
                          <label htmlFor="oauthEmail" className="block text-sm font-medium text-gray-700 mb-2">
                            Email *
                          </label>
                          <input
                            type="email"
                            id="oauthEmail"
                            name="oauthEmail"
                            value={formData.oauthEmail}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>

                        <div>
                          <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                            Country *
                          </label>
                          <input
                            type="text"
                            id="country"
                            name="country"
                            value={formData.country}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>

                        <div>
                          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                            Phone *
                          </label>
                          <input
                            type="tel"
                            id="phone"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Project Details */}
                    <div className="mb-8">
                      <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        Project Details
                      </h2>
                      <div className="space-y-6">
                        <div>
                          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                            Description *
                          </label>
                          <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            rows="6"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Describe your project in detail..."
                            required
                          />
                          <div className="flex justify-between mt-2">
                            <p className="text-xs text-gray-500">Minimum 20 characters</p>
                            <span className="text-xs text-gray-500">
                              {formData.description.length}/5000 characters
                            </span>
                          </div>
                          {errors.description && (
                            <p className="mt-2 text-sm text-red-600">{errors.description}</p>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label htmlFor="timeline" className="block text-sm font-medium text-gray-700 mb-2">
                              Timeline *
                            </label>
                            <input
                              type="text"
                              id="timeline"
                              name="timeline"
                              value={formData.timeline}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="e.g., 2 weeks"
                              required
                            />
                            {errors.timeline && (
                              <p className="mt-2 text-sm text-red-600">{errors.timeline}</p>
                            )}
                          </div>

                          <div>
                            <label htmlFor="timelineUnit" className="block text-sm font-medium text-gray-700 mb-2">
                              Time Unit
                            </label>
                            <select
                              id="timelineUnit"
                              name="timelineUnit"
                              value={formData.timelineUnit}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              {DELIVERY_TIME_UNITS.map(unit => (
                                <option key={unit.value} value={unit.value}>
                                  {unit.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Communication Preference
                          </label>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {COMMUNICATION_OPTIONS.map((method) => (
                              <label key={method} className="flex items-center">
                                <input
                                  type="radio"
                                  name="communication"
                                  value={method}
                                  checked={formData.communication === method}
                                  onChange={handleInputChange}
                                  className="sr-only"
                                />
                                <div className={`
                                  w-full px-3 py-2 text-center border rounded-lg cursor-pointer
                                  ${formData.communication === method
                                    ? 'border-blue-500 bg-blue-50 text-blue-600'
                                    : 'border-gray-300 hover:border-gray-400'
                                  }
                                `}>
                                  {method}
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Urgency Level
                          </label>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {URGENCY_LEVELS.map((level) => (
                              <label key={level} className="flex items-center">
                                <input
                                  type="radio"
                                  name="urgency"
                                  value={level}
                                  checked={formData.urgency === level}
                                  onChange={handleInputChange}
                                  className="sr-only"
                                />
                                <div className={`
                                  w-full px-3 py-2 text-center border rounded-lg cursor-pointer capitalize
                                  ${formData.urgency === level
                                    ? level === 'urgent' ? 'border-red-500 bg-red-50 text-red-600'
                                      : level === 'high' ? 'border-orange-500 bg-orange-50 text-orange-600'
                                        : level === 'medium' ? 'border-yellow-500 bg-yellow-50 text-yellow-600'
                                          : 'border-green-500 bg-green-50 text-green-600'
                                    : 'border-gray-300 hover:border-gray-400'
                                  }
                                `}>
                                  {level}
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Visibility
                          </label>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            {VISIBILITY_OPTIONS.map((visibility) => (
                              <label key={visibility.value} className="flex items-center">
                                <input
                                  type="radio"
                                  name="visibility"
                                  value={visibility.value}
                                  checked={formData.visibility === visibility.value}
                                  onChange={handleInputChange}
                                  className="sr-only"
                                />
                                <div className={`
                                  w-full px-3 py-3 text-center border rounded-lg cursor-pointer
                                  ${formData.visibility === visibility.value
                                    ? 'border-blue-500 bg-blue-50 text-blue-600'
                                    : 'border-gray-300 hover:border-gray-400'
                                  }
                                `}>
                                  <div className="font-medium">{visibility.label}</div>
                                  <div className="text-xs text-gray-500 mt-1">{visibility.desc}</div>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Skills & Deliverables */}
                    <div className="mb-8">
                      <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <Target className="h-5 w-5 text-blue-600" />
                        Skills & Deliverables
                      </h2>
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Required Skills
                          </label>
                          <div className="flex gap-2 mb-3">
                            <input
                              type="text"
                              value={skillsInput}
                              onChange={(e) => setSkillsInput(e.target.value)}
                              onKeyPress={(e) => handleKeyPress(e, 'skill')}
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                              placeholder="e.g., React, Node.js"
                            />
                            <button
                              type="button"
                              onClick={addSkill}
                              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                              disabled={!skillsInput.trim()}
                            >
                              Add
                            </button>
                          </div>
                          {formData.skillsRequired.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2">
                              {formData.skillsRequired.map((skill, index) => (
                                <div key={index} className="flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                                  {skill}
                                  <button
                                    type="button"
                                    onClick={() => removeSkill(index)}
                                    className="ml-2 text-blue-600 hover:text-blue-800"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Expected Deliverables
                          </label>
                          <div className="flex gap-2 mb-3">
                            <input
                              type="text"
                              value={deliverableInput}
                              onChange={(e) => setDeliverableInput(e.target.value)}
                              onKeyPress={(e) => handleKeyPress(e, 'deliverable')}
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                              placeholder="e.g., Website design, Source code"
                            />
                            <button
                              type="button"
                              onClick={addDeliverable}
                              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                              disabled={!deliverableInput.trim()}
                            >
                              Add
                            </button>
                          </div>
                          {formData.deliverables.length > 0 && (
                            <div className="space-y-2">
                              {formData.deliverables.map((deliverable, index) => (
                                <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                                  <span className="text-gray-700">{deliverable}</span>
                                  <button
                                    type="button"
                                    onClick={() => removeDeliverable(index)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Images Section */}
                    <div className="mb-8">
                      <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <ImageIcon className="h-5 w-5 text-blue-600" />
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
                                  alt={`Project image ${index + 1}`}
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
                                  <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
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
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 transition-colors">
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
                          The thumbnail is the main image displayed in gig listings.
                        </p>

                        {existingThumbnail && !thumbnailFile && (
                          <div className="mb-4">
                            <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
                              <img
                                src={existingThumbnail.url}
                                alt="Current thumbnail"
                                className="w-20 h-20 object-cover rounded"
                              />
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900">Current Thumbnail</h4>
                                <p className="text-sm text-gray-600">
                                  This image is currently set as your gig thumbnail
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
                          <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-500 transition-colors">
                            <input
                              type="file"
                              id="thumbnail-upload"
                              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
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
                                Recommended: 800×600 pixels, max 5MB
                              </p>
                            </label>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => navigate(`/gig/${id}`)}
                        className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium flex items-center justify-center gap-2"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting || updateLoading}
                        className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isSubmitting || updateLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Updating Gig...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Update Gig
                          </>
                        )}
                      </button>
                      <button
  onClick={handleRefreshGig}
  disabled={isRefreshing}
  className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium flex items-center justify-center gap-2 disabled:opacity-50"
>
  {isRefreshing ? (
    <>
      <Loader2 className="h-4 w-4 animate-spin" />
      Refreshing...
    </>
  ) : (
    <>
      <RefreshCw className="h-4 w-4" />
      Refresh
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
              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-2xl p-6 md:p-8 text-white h-full">
                <div className="mb-6">
                  <div className="flex items-center mb-4">
                    <Eye className="mr-3" size={20} />
                    <h2 className="text-xl font-bold">Gig Preview</h2>
                  </div>
                  <p className="text-blue-100 text-sm">
                    Review your changes before updating. This preview shows how your gig will appear to others.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <h3 className="font-bold text-lg mb-3">Current Information</h3>
                    <ul className="space-y-2 text-sm">
                      <li className="flex justify-between">
                        <span className="text-blue-100">Title:</span>
                        <span className="font-medium truncate max-w-[150px]">
                          {formData.title || 'Not set'}
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-blue-100">Category:</span>
                        <span className="font-medium truncate max-w-[120px]">
                          {getCategoryName() || 'Not selected'}
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-blue-100">Subcategory:</span>
                        <span className="font-medium truncate max-w-[120px]">
                          {getSubcategoryName() || 'Not selected'}
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-blue-100">Budget:</span>
                        <span className="font-medium">
                          ${formatBudget(formData.budget)}
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-blue-100">Timeline:</span>
                        <span className="font-medium">{formData.timeline || 'Not set'}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-blue-100">Urgency:</span>
                        <span className="font-medium capitalize">{formData.urgency}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-blue-100">Visibility:</span>
                        <span className="font-medium capitalize">{formData.visibility}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-blue-100">Skills:</span>
                        <span className="font-medium">{formData.skillsRequired.length} added</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-blue-100">Deliverables:</span>
                        <span className="font-medium">{formData.deliverables.length} added</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-blue-100">Total Images:</span>
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
                        <span className="text-blue-100">Form Fields Updated:</span>
                        <span className="font-medium">Multiple</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-blue-100">New Images:</span>
                        <span className="font-medium">{uploadedImages.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-blue-100">New Thumbnail:</span>
                        <span className="font-medium">{thumbnailFile ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-blue-100">Current Version:</span>
                        <span className="font-medium">{currentVersion}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <h3 className="font-bold text-lg mb-3">Update Tips</h3>
                    <ul className="space-y-2 text-sm text-blue-100">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>Update at least once a month to stay relevant</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>Clear requirements attract better proposals</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>High-quality images increase engagement</span>
                      </li>
                    </ul>
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

export default GigEdit;