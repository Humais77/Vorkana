import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
  ArrowLeft,
  Zap
} from "lucide-react";
import { toast } from "react-hot-toast";

import { useAuthStore } from "../../../store/useAuthStore";
import { useGigStore } from "../../../store/useGigStore";
import { useCategoryStore } from "../../../store/useCategoryStore";
import { useCreateGig } from "../../../hooks/useGigs";
import { useParentCategories } from '../../../hooks/useCategories';
import { useSubcategoriesByCategory } from '../../../hooks/useSubcategories';
import { SeoWrapper } from "../../../components/SeoWrapper";
import { isProfileCompleteEnough ,calculateProfileCompletion} from '../../../utils/profileUtils';

// Static data outside component
const GIG_CREATION_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Create a Gig on Vorkana",
  "description": "Post your project and find qualified freelancers on Vorkana. Create a detailed gig with our step-by-step form to get matched with top talent.",
  "url": typeof window !== 'undefined' ? `${window.location.origin}/create-gig` : '/create-gig',
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
        "name": "Create Gig",
        "item": typeof window !== 'undefined' ? `${window.location.origin}/create-gig` : '/create-gig'
      }
    ]
  },
  "potentialAction": {
    "@type": "CreateAction",
    "name": "Create Project Gig",
    "description": "Create a new project gig to find freelancers",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": `${window.location.origin}/create-gig`,
      "actionPlatform": [
        "http://schema.org/DesktopWebPlatform",
        "http://schema.org/MobileWebPlatform"
      ]
    }
  }
};

const STEPS = [
  { number: 1, title: "Contact Details", icon: Phone },
  { number: 2, title: "Project Scope", icon: DollarSign },
  { number: 3, title: "Project Details", icon: FileText },
  { number: 4, title: "Images", icon: Upload },
  { number: 5, title: "Complete", icon: CheckCircle },
];

const QUICK_TIPS = [
  "Be specific about your requirements",
  "Set a realistic budget for better matches",
  "Verification ensures secure collaboration"
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

const GigCreate = () => {
  const navigate = useNavigate();

  // Zustand stores
  const { user: currentUser, isAuthenticated } = useAuthStore();
  const { lastCreatedGigId, setLastCreatedGigId, clearLastCreatedGig } = useGigStore();
  const { categories: storedCategories, setCategories } = useCategoryStore();

  // Initial form state - Ensure all values are strings, not undefined
  const initialFormData = useMemo(() => ({
    title: "",
    fullName: currentUser?.name || currentUser?.fullName || "",
    oauthEmail: currentUser?.email || "",
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
  }), [currentUser]);

  const initialCompletedFields = useMemo(() => ({
    fullName: !!(currentUser?.name || currentUser?.fullName),
    oauthEmail: !!currentUser?.email,
    country: false,
    phone: false,
    title: false,
    projectCategory: false,
    subcategory: false,
    budget: false,
    description: false,
    timeline: false
  }), [currentUser]);

  // Local state
  const [formData, setFormData] = useState(initialFormData);
  const [completedFields, setCompletedFields] = useState(initialCompletedFields);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [activeStep, setActiveStep] = useState(1);
  const [success, setSuccess] = useState(false);
  const [createdGigId, setCreatedGigId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [skillsInput, setSkillsInput] = useState("");
  const [deliverableInput, setDeliverableInput] = useState("");
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

  // Refs
  const imageUploadRef = useRef(null);
  const thumbnailUploadRef = useRef(null);
  const topContainerRef = useRef(null);

  // TanStack Query hooks
  const {
    data: categoriesData,
    isLoading: categoryLoading,
    error: categoryError,
    refetch: refetchCategories
  } = useParentCategories();

  const {
    data: subcategoriesData,
    isLoading: subcategoryLoading,
    error: subcategoryError,
    refetch: refetchSubcategories
  } = useSubcategoriesByCategory(formData.projectCategory, {
    enabled: !!formData.projectCategory
  });

  const {
    mutate: createGig,
    isPending: gigLoading,
    error: gigError,
    isSuccess: gigSuccess,
    data: createdGigData,
    reset: resetGigMutation
  } = useCreateGig();

  // Memoized values
  const subcategories = useMemo(() => {
    if (!subcategoriesData) return [];
    return subcategoriesData?.subcategories || subcategoriesData || [];
  }, [subcategoriesData]);

  const allErrors = useMemo(() => ({
    ...errors,
    form: errors.form || gigError?.message || categoryError?.message
  }), [errors, gigError, categoryError]);

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

  // Sync categories from query to store
  useEffect(() => {
    if (categoriesData && categoriesData.length > 0) {
      setCategories(categoriesData);
    }
  }, [categoriesData, setCategories]);

  // Reset subcategory when category changes
  useEffect(() => {
    if (formData.projectCategory) {
      setFormData(prev => ({ 
        ...prev, 
        subcategory: '' 
      }));
      setCompletedFields(prev => ({ 
        ...prev, 
        subcategory: false 
      }));
    }
  }, [formData.projectCategory]);

  // Handle successful gig creation
  useEffect(() => {
    if (gigSuccess && createdGigData) {
      const gigId = createdGigData.data?._id || createdGigData.gig?._id || createdGigData._id;

      if (gigId) {
        setCreatedGigId(gigId);
        setSuccess(true);
        setActiveStep(5);
        setLastCreatedGigId(gigId);

        toast.success(createdGigData.message || "Gig created successfully!");

        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          if (topContainerRef.current) {
            topContainerRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);

        const timer = setTimeout(() => {
          navigate(`/gig/${gigId}`);
        }, 3000);

        return () => clearTimeout(timer);
      }
    }
  }, [gigSuccess, createdGigData, navigate, setLastCreatedGigId]);

  // Check for existing last created gig ID
  useEffect(() => {
    if (lastCreatedGigId && !success) {
      setCreatedGigId(lastCreatedGigId);
      setSuccess(true);
      setActiveStep(5);

      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (topContainerRef.current) {
          topContainerRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);

      const timer = setTimeout(() => {
        navigate(`/gig/${lastCreatedGigId}`);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [lastCreatedGigId, success, navigate]);

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      clearLastCreatedGig();
      resetGigMutation();
      
      uploadedImages.forEach(img => URL.revokeObjectURL(img.preview));
      if (thumbnailFile) {
        URL.revokeObjectURL(thumbnailFile.preview);
      }
    };
  }, [clearLastCreatedGig, resetGigMutation, uploadedImages, thumbnailFile]);

  // Check profile completion
  useEffect(() => {
    if (currentUser) {
      if (!isProfileCompleteEnough(currentUser, 70)) {
        toast.error(
          <div>
            <div className="font-semibold mb-1">Profile Incomplete</div>
            <div className="text-sm mb-2">
              Your profile is {calculateProfileCompletion(currentUser)}% complete. 
              You need at least 70% completion to publish gigs.
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/profile')}
                className="flex-1 bg-gray-900 text-white py-1.5 rounded text-xs font-medium hover:bg-black transition-colors"
              >
                Complete Profile
              </button>
              <button
                onClick={() => toast.dismiss()}
                className="flex-1 bg-gray-200 text-gray-800 py-1.5 rounded text-xs font-medium hover:bg-gray-300 transition-colors"
              >
                Continue Anyway
              </button>
            </div>
          </div>,
          {
            duration: 8000,
            id: 'profile-incomplete-warning',
          }
        );
      }
    }
  }, [currentUser, navigate]);

  // Handle input change - Fixed to ensure no undefined values
  const handleInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    
    let newValue;
    
    if (type === 'checkbox') {
      newValue = checked;
    } else if (type === 'number') {
      newValue = value === '' ? '' : value;
    } else if (type === 'select-one') {
      newValue = value || '';
    } else {
      newValue = value || '';
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));
    
    const isValid = validateField(name, newValue);
    setCompletedFields(prev => ({
      ...prev,
      [name]: isValid
    }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
    
    if (name === 'projectCategory' && value) {
      refetchSubcategories();
    }
  }, [errors, refetchSubcategories]);

  // Validate field
  const validateField = useCallback((fieldName, value) => {
    const stringValue = String(value || '');
    const trimmedValue = stringValue.trim();
    
    switch (fieldName) {
      case 'fullName':
        return trimmedValue.length >= 3;
      case 'oauthEmail':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(trimmedValue);
      case 'country':
        return trimmedValue.length >= 2;
      case 'phone':
        return trimmedValue.length >= 5;
      case 'title':
        return trimmedValue.length >= 5;
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
        return trimmedValue.length >= 20;
      case 'timeline':
        return trimmedValue.length >= 3;
      default:
        return !!trimmedValue;
    }
  }, [subcategories]);

  // Image Upload
  const handleImageUpload = useCallback(async (files) => {
    if (uploadingImages) return;
    
    const newFiles = Array.from(files || []);
    
    if (uploadedImages.length + newFiles.length > 10) {
      toast.error('Maximum 10 images allowed');
      return;
    }
    
    const validFiles = [];
    
    for (const file of newFiles) {
      if (!file || !file.type) {
        console.warn('Invalid file:', file);
        continue;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name || 'File'} exceeds 5MB limit`);
        return;
      }
      
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        toast.error(`${file.name || 'File'} is not a valid image type`);
        return;
      }
      
      validFiles.push(file);
    }
    
    if (validFiles.length === 0) {
      toast.error('No valid images to upload');
      return;
    }
    
    setUploadingImages(true);
    
    try {
      const previewImages = validFiles.map(file => ({
        file,
        preview: URL.createObjectURL(file),
        name: file.name || 'image',
        size: file.size || 0,
        type: file.type
      }));
      
      setUploadedImages(prev => [...prev, ...previewImages]);
      toast.success(`${validFiles.length} image(s) added successfully`);
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error('Failed to add images');
    } finally {
      setUploadingImages(false);
    }
  }, [uploadingImages, uploadedImages]);

  // Thumbnail Upload
  const handleThumbnailUpload = useCallback((file) => {
    if (uploadingThumbnail) return;
    
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Thumbnail exceeds 5MB limit');
      return;
    }
    
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Invalid image type for thumbnail');
      return;
    }
    
    const newThumbnail = {
      file,
      preview: URL.createObjectURL(file),
      name: file.name || 'thumbnail',
      size: file.size || 0,
      type: file.type
    };
    
    setThumbnailFile(newThumbnail);
    
    toast.success('Thumbnail selected');
  }, [uploadingThumbnail]);

  // Remove image
  const removeImage = useCallback((index) => {
    const image = uploadedImages[index];
    if (image?.preview) {
      URL.revokeObjectURL(image.preview);
    }
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
    toast.success('Image removed');
  }, [uploadedImages]);

  // Remove thumbnail
  const removeThumbnail = useCallback(() => {
    if (thumbnailFile?.preview) {
      URL.revokeObjectURL(thumbnailFile.preview);
    }
    setThumbnailFile(null);
    toast.success('Thumbnail removed');
  }, [thumbnailFile]);

  // Add skill
  const addSkill = useCallback(() => {
    if (skillsInput.trim()) {
      const skill = skillsInput.trim().substring(0, 50);
      setFormData(prev => ({
        ...prev,
        skillsRequired: [...prev.skillsRequired, skill]
      }));
      setSkillsInput("");
    }
  }, [skillsInput]);

  // Remove skill
  const removeSkill = useCallback((index) => {
    setFormData(prev => ({
      ...prev,
      skillsRequired: prev.skillsRequired.filter((_, i) => i !== index)
    }));
  }, []);

  // Add deliverable
  const addDeliverable = useCallback(() => {
    if (deliverableInput.trim()) {
      const deliverable = deliverableInput.trim().substring(0, 200);
      setFormData(prev => ({
        ...prev,
        deliverables: [...prev.deliverables, deliverable]
      }));
      setDeliverableInput("");
    }
  }, [deliverableInput]);

  // Remove deliverable
  const removeDeliverable = useCallback((index) => {
    setFormData(prev => ({
      ...prev,
      deliverables: prev.deliverables.filter((_, i) => i !== index)
    }));
  }, []);

  // Validate step
  const validateStep = useCallback((step) => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.fullName || formData.fullName.trim().length < 3) {
        newErrors.fullName = "Full name must be at least 3 characters.";
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!formData.oauthEmail || !emailRegex.test(formData.oauthEmail)) {
        newErrors.oauthEmail = "Please enter a valid email address.";
      }

      if (!formData.country || formData.country.trim().length < 2) {
        newErrors.country = "Country is required.";
      }

      if (!formData.phone || formData.phone.trim().length < 5) {
        newErrors.phone = "Phone number is required.";
      }
    }

    if (step === 2) {
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
    }

    if (step === 3) {
      if (!formData.description || formData.description.trim().length < 20) {
        newErrors.description = "Description must be at least 20 characters.";
      } else if (formData.description.trim().length > 5000) {
        newErrors.description = "Description cannot exceed 5000 characters.";
      }

      if (!formData.timeline || formData.timeline.trim().length < 3) {
        newErrors.timeline = "Timeline is required.";
      }
    }

    if (step === 4) {
      if (!thumbnailFile) {
        newErrors.thumbnail = "Thumbnail is required.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, subcategories, thumbnailFile]);

  // Next step
  const nextStep = useCallback(() => {
    if (validateStep(activeStep)) {
      setActiveStep(prev => Math.min(prev + 1, 5));
    }
  }, [activeStep, validateStep]);

  // Previous step
  const prevStep = useCallback(() => {
    setActiveStep(prev => Math.max(prev - 1, 1));
  }, []);

  // Handle form submission
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
      const formDataObj = new FormData();

      const gigData = {
        title: (formData.title || '').trim(),
        fullName: (formData.fullName || '').trim(),
        oauthEmail: (formData.oauthEmail || '').trim().toLowerCase(),
        country: (formData.country || '').trim(),
        phone: (formData.phone || '').trim(),
        projectCategory: formData.projectCategory || '',
        subcategory: formData.subcategory || undefined,
        description: (formData.description || '').trim(),
        budget: parseFloat(formData.budget || 0),
        currency: formData.currency || 'USD',
        timeline: (formData.timeline || '').trim(),
        timelineUnit: formData.timelineUnit || 'days',
        communication: formData.communication || 'Email',
        urgency: formData.urgency || 'medium',
        visibility: formData.visibility || 'public',
        status: status
      };

      if (subcategories.length > 0 && !gigData.subcategory) {
        throw new Error('Subcategory is required for this category');
      }

      Object.keys(gigData).forEach(key => {
        if (gigData[key] !== null && gigData[key] !== undefined && gigData[key] !== '') {
          if (typeof gigData[key] === 'object') {
            formDataObj.append(key, JSON.stringify(gigData[key]));
          } else {
            formDataObj.append(key, gigData[key]);
          }
        }
      });

      if (formData.skillsRequired && formData.skillsRequired.length > 0) {
        formData.skillsRequired.forEach((skill, index) => {
          formDataObj.append(`skillsRequired[${index}]`, skill);
        });
      }

      if (formData.deliverables && formData.deliverables.length > 0) {
        formData.deliverables.forEach((deliverable, index) => {
          formDataObj.append(`deliverables[${index}]`, deliverable);
        });
      }

      if (thumbnailFile) {
        formDataObj.append('thumbnail', thumbnailFile.file);
      }
      
      uploadedImages.forEach((image) => {
        formDataObj.append('images', image.file);
      });

      setErrors({});
      createGig(formDataObj);

    } catch (error) {
      if (error.message.includes('subcategory') || error.message.includes('Subcategory')) {
        setErrors(prev => ({
          ...prev,
          subcategory: error.message
        }));
        setActiveStep(2);
      }
      console.error("Error in handleSubmit:", error);
      toast.error("Failed to prepare gig data. Please try again.");
      setErrors(prev => ({
        ...prev,
        form: error.message || "Something went wrong. Please try again."
      }));
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, thumbnailFile, uploadedImages, validateStep, createGig, subcategories]);

  // Handle refresh categories
  const handleRefreshCategories = useCallback(() => {
    refetchCategories();
    toast.success("Refreshing categories...");
  }, [refetchCategories]);

  // Format budget
  const formatBudget = useCallback((budget) => {
    const num = parseFloat(budget);
    return isNaN(num) ? "0" : num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }, []);

  // Handle key press
  const handleKeyPress = useCallback((e, type) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (type === 'skill') addSkill();
      if (type === 'deliverable') addDeliverable();
    }
  }, [addSkill, addDeliverable]);

  // Render progress steps
  const renderProgressSteps = useMemo(() => (
    <div className="mb-8 md:mb-10 px-2">
      <div className="flex justify-between items-center">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isActive = activeStep >= step.number;
          const isCompleted = activeStep > step.number;

          return (
            <React.Fragment key={step.number}>
              <div className="flex flex-col items-center relative z-10">
                <div className={`
                  w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center
                  ${isActive ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-400'}
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
              {index < STEPS.length - 1 && (
                <div className="flex-1 h-1 bg-gray-200 mx-1 md:mx-2 relative">
                  <div
                    className={`absolute top-0 left-0 h-full bg-emerald-600 transition-all duration-300 ${isCompleted ? 'w-full' : 'w-0'
                      }`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  ), [activeStep]);

  // Render top info
  const renderTopInfo = useMemo(() => (
    <div className="max-w-6xl mx-auto mb-8 md:mb-12">
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-6 md:p-8 shadow-lg border border-emerald-100">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
          <div className="md:w-2/3">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
                <Briefcase className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-4xl font-bold text-gray-900">
                  Create Your Gig
                </h1>
                <p className="text-emerald-700 font-medium text-sm md:text-base">
                  Get matched with top freelancers
                </p>
              </div>
            </div>

            <p className="text-gray-600 mb-6 text-sm md:text-base">
              Fill out this form to post your gig. Our platform will match you with qualified freelancers
              who have the skills you need. The more details you provide, the better matches you'll get.
            </p>
          </div>

          <div className="md:w-1/3 w-full">
            <div className="bg-white rounded-xl p-4 md:p-6 shadow-lg border border-gray-200">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-sm md:text-base">
                <Info className="w-4 h-4 md:w-5 md:h-5 text-emerald-600" />
                Quick Tips
              </h3>
              <ul className="space-y-2 md:space-y-3 text-xs md:text-sm text-gray-600">
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
  ), []);

  // Render left panel
  const renderLeftPanel = useMemo(() => {
    const stepTitles = {
      1: "Share your contact details so freelancers can reach you.",
      2: "Define your project scope with budget and category.",
      3: "Add detailed project requirements.",
      4: "Upload project images and thumbnail.",
      5: "Your gig is ready to be published! Review your information before submitting."
    };

    return (
      <div className="lg:w-2/5">
        <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl shadow-2xl p-6 md:p-8 text-white h-full">
          <div className="mb-6 md:mb-8">
            <div className="flex items-center mb-4">
              <Info className="mr-3" size={20} />
              <h2 className="text-xl md:text-2xl font-bold">
                {activeStep < 5 ? `Step ${activeStep}: ${STEPS[activeStep - 1]?.title}` : "Complete Your Gig"}
              </h2>
            </div>
            <p className="text-emerald-100 text-sm md:text-base">
              {stepTitles[activeStep] || ""}
            </p>
          </div>

          {activeStep < 5 && (
            <div className="space-y-4 md:space-y-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 md:p-5">
                <h3 className="font-bold text-lg mb-3 flex items-center">
                  <Lightbulb className="mr-2" size={18} />
                  Information entered:
                </h3>
                <ul className="space-y-2 text-sm">
                  {activeStep >= 1 && completedFields.fullName && (
                    <li className="flex justify-between">
                      <span className="text-emerald-100">Name:</span>
                      <span className="font-medium truncate max-w-[150px]">
                        {formData.fullName}
                      </span>
                    </li>
                  )}
                  {activeStep >= 1 && completedFields.oauthEmail && (
                    <li className="flex justify-between">
                      <span className="text-emerald-100">Email:</span>
                      <span className="font-medium truncate max-w-[150px]">
                        {formData.oauthEmail}
                      </span>
                    </li>
                  )}
                  {activeStep >= 1 && completedFields.country && (
                    <li className="flex justify-between">
                      <span className="text-emerald-100">Country:</span>
                      <span className="font-medium truncate max-w-[120px]">{formData.country}</span>
                    </li>
                  )}
                  {activeStep >= 1 && completedFields.phone && (
                    <li className="flex justify-between">
                      <span className="text-emerald-100">Phone:</span>
                      <span className="font-medium truncate max-w-[120px]">{formData.phone}</span>
                    </li>
                  )}
                  {activeStep >= 2 && completedFields.title && (
                    <li className="flex justify-between">
                      <span className="text-emerald-100">Project Title:</span>
                      <span className="font-medium truncate max-w-[120px]">
                        {formData.title}
                      </span>
                    </li>
                  )}
                  {activeStep >= 2 && completedFields.projectCategory && (
                    <li className="flex justify-between">
                      <span className="text-emerald-100">Category:</span>
                      <span className="font-medium truncate max-w-[120px]">
                        {getCategoryName()}
                      </span>
                    </li>
                  )}
                  {activeStep >= 2 && completedFields.subcategory && (
                    <li className="flex justify-between">
                      <span className="text-emerald-100">Subcategory:</span>
                      <span className="font-medium truncate max-w-[120px]">
                        {getSubcategoryName()}
                      </span>
                    </li>
                  )}
                  {activeStep >= 2 && completedFields.budget && (
                    <li className="flex justify-between">
                      <span className="text-emerald-100">Budget:</span>
                      <span className="font-medium">${formatBudget(formData.budget)}</span>
                    </li>
                  )}
                  {activeStep >= 3 && completedFields.description && (
                    <li className="flex justify-between">
                      <span className="text-emerald-100">Description:</span>
                      <span className="font-medium">{formData.description.length} chars</span>
                    </li>
                  )}
                  {activeStep >= 3 && completedFields.timeline && (
                    <li className="flex justify-between">
                      <span className="text-emerald-100">Timeline:</span>
                      <span className="font-medium">{formData.timeline}</span>
                    </li>
                  )}
                  {activeStep >= 3 && formData.skillsRequired.length > 0 && (
                    <li className="flex justify-between">
                      <span className="text-emerald-100">Skills:</span>
                      <span className="font-medium">{formData.skillsRequired.length} added</span>
                    </li>
                  )}
                  {activeStep >= 3 && formData.deliverables.length > 0 && (
                    <li className="flex justify-between">
                      <span className="text-emerald-100">Deliverables:</span>
                      <span className="font-medium">{formData.deliverables.length} added</span>
                    </li>
                  )}
                  {activeStep >= 4 && uploadedImages.length > 0 && (
                    <li className="flex justify-between">
                      <span className="text-emerald-100">Images:</span>
                      <span className="font-medium">{uploadedImages.length} uploaded</span>
                    </li>
                  )}
                  {activeStep >= 4 && (
                    <li className="flex justify-between">
                      <span className="text-emerald-100">Thumbnail:</span>
                      <span className="font-medium">
                        {thumbnailFile ? 'Uploaded' : 'Required'}
                      </span>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {activeStep === 5 && (
            <div className="text-center py-6 md:py-8">
              <CheckCircle className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 md:mb-6 text-emerald-300" />
              <h3 className="text-xl md:text-2xl font-bold mb-4">Gig Created Successfully!</h3>
              <div className="text-emerald-100 mb-6 text-sm md:text-base">
                Your gig is now live and visible to thousands of qualified freelancers.
                {createdGigId && (
                  <div className="mt-4 text-xs md:text-sm bg-white/10 rounded-lg p-2">
                    Gig ID: <span className="font-mono">{createdGigId}</span>
                  </div>
                )}
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <h4 className="font-bold mb-2">What happens next?</h4>
                <ul className="text-sm space-y-1 text-left pl-4">
                  <li>• Freelancers will start submitting proposals</li>
                  <li>• You'll receive email notifications for new proposals</li>
                  <li>• Review and compare freelancer profiles</li>
                  <li>• Start conversations with your top choices</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }, [
    activeStep,
    completedFields,
    formData,
    getCategoryName,
    getSubcategoryName,
    formatBudget,
    uploadedImages.length,
    thumbnailFile,
    createdGigId
  ]);

  // Render step content
  const renderStepContent = useMemo(() => {
    switch (activeStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center">
              <Phone className="mr-3 text-emerald-600" size={20} />
              Contact Details
            </h2>

            <div className="space-y-6">
              {/* Full Name */}
              <div>
                <label htmlFor="fullName" className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <User className="mr-2" size={14} />
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName || ''}
                  onChange={handleInputChange}
                  className="w-full p-3 md:p-4 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all text-sm md:text-base"
                  placeholder="John Doe"
                  disabled={gigLoading}
                  required
                />
                <p className="mt-2 text-xs text-gray-500">
                  Minimum 3 characters
                </p>
                {errors.fullName && (
                  <p className="mt-2 text-sm text-red-600">{errors.fullName}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="oauthEmail" className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Mail className="mr-2" size={14} />
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="oauthEmail"
                  name="oauthEmail"
                  value={formData.oauthEmail || ''}
                  onChange={handleInputChange}
                  className="w-full p-3 md:p-4 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all text-sm md:text-base"
                  placeholder="your@email.com"
                  disabled={gigLoading}
                  required
                />
                {errors.oauthEmail && (
                  <p className="mt-2 text-sm text-red-600">{errors.oauthEmail}</p>
                )}
              </div>

              {/* Country */}
              <div>
                <label htmlFor="country" className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Globe className="mr-2" size={14} />
                  Country <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="country"
                  name="country"
                  value={formData.country || ''}
                  onChange={handleInputChange}
                  className="w-full p-3 md:p-4 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all text-sm md:text-base"
                  placeholder="United States"
                  disabled={gigLoading}
                  required
                />
                <p className="mt-2 text-xs text-gray-500">
                  Helps freelancers understand your time zone
                </p>
                {errors.country && (
                  <p className="mt-2 text-sm text-red-600">{errors.country}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Phone className="mr-2" size={14} />
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone || ''}
                  onChange={handleInputChange}
                  className="w-full p-3 md:p-4 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all text-sm md:text-base"
                  placeholder="+1 234 567 8900"
                  disabled={gigLoading}
                  required
                />
                <p className="mt-2 text-xs text-gray-500">
                  Only shared with freelancers you hire
                </p>
                {errors.phone && (
                  <p className="mt-2 text-sm text-red-600">{errors.phone}</p>
                )}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center">
              <DollarSign className="mr-3 text-emerald-600" size={20} />
              Project Scope
            </h2>

            <div className="space-y-6">
              {/* Project Title */}
              <div>
                <label htmlFor="title" className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Type className="mr-2" size={14} />
                  Project Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title || ''}
                  onChange={handleInputChange}
                  className="w-full p-3 md:p-4 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all text-sm md:text-base"
                  placeholder="e.g., Build a responsive e-commerce website"
                  disabled={gigLoading}
                  required
                />
                <p className="mt-2 text-xs text-gray-500">
                  Be specific and descriptive (5-200 characters)
                </p>
                {errors.title && (
                  <p className="mt-2 text-sm text-red-600">{errors.title}</p>
                )}
              </div>

              {/* Category */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="projectCategory" className="text-sm font-medium text-gray-700">
                    Project Category <span className="text-red-500">*</span>
                  </label>
                  {categoryError && (
                    <button
                      type="button"
                      onClick={handleRefreshCategories}
                      className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      Refresh Categories
                    </button>
                  )}
                </div>
                <div className="relative">
                  <select
                    id="projectCategory"
                    name="projectCategory"
                    value={formData.projectCategory || ''}
                    onChange={handleInputChange}
                    className="w-full p-3 md:p-4 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 bg-white appearance-none transition-all disabled:bg-gray-50 disabled:cursor-not-allowed pr-10 text-sm md:text-base"
                    disabled={categoryLoading || gigLoading}
                    required
                  >
                    <option value="">Select a category</option>
                    {categoryLoading ? (
                      <option value="" disabled>Loading categories...</option>
                    ) : (
                      (Array.isArray(categoriesData) ? categoriesData : []).map((category) => (
                        <option key={category._id} value={category._id}>
                          {category.name}
                        </option>
                      ))
                    )}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
                {errors.projectCategory && (
                  <p className="mt-2 text-sm text-red-600">{errors.projectCategory}</p>
                )}
              </div>

              {/* Subcategory */}
              <div>
                <label htmlFor="subcategory" className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Layers className="mr-2" size={14} />
                  Subcategory {subcategories.length > 0 && <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  <select
                    id="subcategory"
                    name="subcategory"
                    value={formData.subcategory || ''}
                    onChange={handleInputChange}
                    className="w-full p-3 md:p-4 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 bg-white appearance-none transition-all disabled:bg-gray-50 disabled:cursor-not-allowed pr-10 text-sm md:text-base"
                    disabled={!formData.projectCategory || subcategoryLoading || gigLoading}
                    required={subcategories.length > 0}
                  >
                    <option value="">
                      {subcategoryLoading ? 'Loading subcategories...' : 
                       subcategories.length > 0 ? 'Select a subcategory' : 'No subcategories available'}
                    </option>
                    {!subcategoryLoading && subcategories.map((subcategory) => (
                      <option key={subcategory._id} value={subcategory._id}>
                        {subcategory.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
                {errors.subcategory && (
                  <p className="mt-2 text-sm text-red-600">{errors.subcategory}</p>
                )}
              </div>

              {/* Budget */}
              <div>
                <label htmlFor="budget" className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <DollarSign className="mr-2" size={14} />
                  Budget (USD) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold">$</span>
                  <input
                    type="number"
                    id="budget"
                    name="budget"
                    value={formData.budget || ''}
                    onChange={handleInputChange}
                    className="w-full pl-10 p-3 md:p-4 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed text-sm md:text-base"
                    placeholder="Enter your budget"
                    min="5"
                    max="100000"
                    step="0.01"
                    disabled={gigLoading}
                    required
                  />
                </div>
                <div className="flex justify-between mt-2">
                  <p className="text-xs text-gray-500">
                    Minimum $5, maximum $100,000
                  </p>
                  {formData.budget && (
                    <span className="text-sm font-semibold text-emerald-600">
                      ${formatBudget(formData.budget)}
                    </span>
                  )}
                </div>
                {errors.budget && (
                  <p className="mt-2 text-sm text-red-600">{errors.budget}</p>
                )}
              </div>

              {/* Currency */}
              <div>
                <label htmlFor="currency" className="text-sm font-medium text-gray-700 mb-2">
                  Currency <span className="text-red-500">*</span>
                </label>
                <select
                  id="currency"
                  name="currency"
                  value={formData.currency || 'USD'}
                  onChange={handleInputChange}
                  className="w-full p-3 md:p-4 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 bg-white transition-all text-sm md:text-base"
                  disabled={gigLoading}
                  required
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
        );

      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center">
              <FileText className="mr-3 text-emerald-600" size={20} />
              Project Details
            </h2>

            <div className="space-y-6">
              {/* Timeline */}
              <div>
                <label htmlFor="timeline" className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Calendar className="mr-2" size={14} />
                  Project Timeline <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="timeline"
                  name="timeline"
                  value={formData.timeline || ''}
                  onChange={handleInputChange}
                  className="w-full p-3 md:p-4 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed text-sm md:text-base"
                  placeholder="e.g., 2 weeks, 1 month, ASAP"
                  disabled={gigLoading}
                  required
                />
                <div className="mt-2 flex flex-col md:flex-row md:items-center gap-2">
                  <p className="text-xs md:text-sm text-gray-500">
                    Be specific about your deadline expectations
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">Time unit:</span>
                    <select
                      name="timelineUnit"
                      value={formData.timelineUnit || 'days'}
                      onChange={handleInputChange}
                      className="text-sm border border-gray-300 rounded-lg p-2"
                      disabled={gigLoading}
                      required
                    >
                      {DELIVERY_TIME_UNITS.map(unit => (
                        <option key={unit.value} value={unit.value}>
                          {unit.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {errors.timeline && (
                  <p className="mt-2 text-sm text-red-600">{errors.timeline}</p>
                )}
              </div>

              {/* Communication Preference */}
              <div>
                <fieldset>
                  <legend className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <MessageSquare className="mr-2" size={14} />
                    Communication Preference <span className="text-red-500">*</span>
                  </legend>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3" role="radiogroup">
                    {COMMUNICATION_OPTIONS.map((method) => (
                      <label key={method} className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="communication"
                          value={method}
                          checked={formData.communication === method}
                          onChange={handleInputChange}
                          className="sr-only disabled:cursor-not-allowed"
                          disabled={gigLoading}
                          required
                        />
                        <div className={`
                          w-full px-3 py-2 md:px-4 md:py-3 rounded-lg border-2 transition-all text-sm md:text-base text-center
                          ${formData.communication === method
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                            : 'border-gray-200 hover:border-gray-300'
                          }
                          ${gigLoading ? 'opacity-50 cursor-not-allowed' : ''}
                        `}>
                          {method}
                        </div>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>

              {/* Urgency Level */}
              <div>
                <fieldset>
                  <legend className="text-sm font-medium text-gray-700 mb-2">
                    Urgency Level <span className="text-red-500">*</span>
                  </legend>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3" role="radiogroup">
                    {URGENCY_LEVELS.map((level) => (
                      <label key={level} className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="urgency"
                          value={level}
                          checked={formData.urgency === level}
                          onChange={handleInputChange}
                          className="sr-only disabled:cursor-not-allowed"
                          disabled={gigLoading}
                          required
                        />
                        <div className={`
                          w-full px-3 py-2 md:px-4 md:py-3 rounded-lg border-2 transition-all text-sm md:text-base text-center capitalize
                          ${formData.urgency === level
                            ? level === 'urgent' ? 'border-red-500 bg-red-50 text-red-600'
                              : level === 'high' ? 'border-orange-500 bg-orange-50 text-orange-600'
                                : level === 'medium' ? 'border-yellow-500 bg-yellow-50 text-yellow-600'
                                  : 'border-emerald-500 bg-emerald-50 text-emerald-600'
                            : 'border-gray-200 hover:border-gray-300'
                          }
                          ${gigLoading ? 'opacity-50 cursor-not-allowed' : ''}
                        `}>
                          {level}
                        </div>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>

              {/* Gig Visibility */}
              <div>
                <fieldset>
                  <legend className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <Shield className="mr-2" size={14} />
                    Gig Visibility <span className="text-red-500">*</span>
                  </legend>
                  <div className="grid grid-cols-3 gap-2 md:gap-3" role="radiogroup">
                    {VISIBILITY_OPTIONS.map((visibility) => (
                      <label key={visibility.value} className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="visibility"
                          value={visibility.value}
                          checked={formData.visibility === visibility.value}
                          onChange={handleInputChange}
                          className="sr-only disabled:cursor-not-allowed"
                          disabled={gigLoading}
                          required
                        />
                        <div className={`
                          w-full px-3 py-2 md:px-4 md:py-3 rounded-lg border-2 transition-all text-sm text-center
                          ${formData.visibility === visibility.value
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                            : 'border-gray-200 hover:border-gray-300'
                          }
                          ${gigLoading ? 'opacity-50 cursor-not-allowed' : ''}
                        `}>
                          <div className="font-medium">{visibility.label}</div>
                          <div className="text-xs text-gray-500 mt-1">{visibility.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>

              {/* Project Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Project Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description || ''}
                  onChange={handleInputChange}
                  rows="5"
                  className="w-full p-3 md:p-4 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all resize-none disabled:bg-gray-50 disabled:cursor-not-allowed text-sm md:text-base"
                  placeholder="Describe your project in detail. Include:
• What you want to achieve
• Specific requirements
• Preferred technologies/tools
• Any examples or references"
                  disabled={gigLoading}
                  required
                  maxLength="5000"
                />
                <div className="flex flex-col md:flex-row justify-between mt-2 gap-2">
                  <div>
                    <p className="text-xs text-gray-500">
                      Minimum 20 characters, maximum 5000 characters
                    </p>
                    <p className="text-xs text-gray-500">
                      Characters remaining: {5000 - (formData.description || '').length}
                    </p>
                  </div>
                  <span className={`text-sm font-medium ${
                    (formData.description || '').length < 20 ? 'text-red-500' : 
                    (formData.description || '').length >= 5000 ? 'text-red-500' : 'text-emerald-500'
                  }`}>
                    {(formData.description || '').length}/5000
                  </span>
                </div>
                {errors.description && (
                  <p className="mt-2 text-sm text-red-600">{errors.description}</p>
                )}
              </div>

              {/* Required Skills */}
              <div>
                <label htmlFor="skillsInput" className="text-sm font-medium text-gray-700 mb-2">
                  Required Skills <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-col md:flex-row gap-2 mb-3">
                  <input
                    type="text"
                    id="skillsInput"
                    value={skillsInput || ''}
                    onChange={(e) => setSkillsInput(e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, 'skill')}
                    className="flex-1 p-3 border border-gray-300 rounded-lg text-sm"
                    placeholder="e.g., React, Node.js, MongoDB"
                    disabled={gigLoading}
                  />
                  <button
                    type="button"
                    onClick={addSkill}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm whitespace-nowrap"
                    disabled={gigLoading || !skillsInput.trim()}
                  >
                    Add Skill
                  </button>
                </div>
                {formData.skillsRequired.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.skillsRequired.map((skill, index) => (
                      <div key={index} className="flex items-center bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm">
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(index)}
                          className="ml-2 text-emerald-600 hover:text-emerald-800"
                          disabled={gigLoading}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  Add relevant skills to attract the right freelancers (at least 1 skill required)
                </p>
              </div>

              {/* Expected Deliverables */}
              <div>
                <label htmlFor="deliverableInput" className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Package className="mr-2" size={14} />
                  Expected Deliverables <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-col md:flex-row gap-2 mb-3">
                  <input
                    type="text"
                    id="deliverableInput"
                    value={deliverableInput || ''}
                    onChange={(e) => setDeliverableInput(e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, 'deliverable')}
                    className="flex-1 p-3 border border-gray-300 rounded-lg text-sm"
                    placeholder="e.g., Website design mockups, Source code, Documentation"
                    disabled={gigLoading}
                  />
                  <button
                    type="button"
                    onClick={addDeliverable}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm whitespace-nowrap"
                    disabled={gigLoading || !deliverableInput.trim()}
                  >
                    Add Deliverable
                  </button>
                </div>
                {formData.deliverables.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.deliverables.map((deliverable, index) => (
                      <div key={index} className="flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                        {deliverable}
                        <button
                          type="button"
                          onClick={() => removeDeliverable(index)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                          disabled={gigLoading}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  List specific items you expect to receive from the freelancer (at least 1 deliverable required)
                </p>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center">
              <Upload className="mr-3 text-emerald-600" size={20} />
              Project Images
            </h2>

            <div className="space-y-8">
              {/* Project Images */}
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">Project Images</h3>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-emerald-500 transition-colors">
                    <input
                      type="file"
                      id="image-upload"
                      multiple
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                      onChange={(e) => handleImageUpload(e.target.files)}
                      className="hidden"
                      disabled={uploadingImages || gigLoading}
                    />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-gray-900 mb-2">
                        Upload Project Images
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
                              alt={`Project image preview ${index + 1}`}
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

              {/* Thumbnail */}
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">Thumbnail <span className="text-red-500">*</span></h3>
                <div className="space-y-4">
                  <p className="text-gray-600 text-sm">
                    The thumbnail is required and will be displayed as the main image in gig listings.
                  </p>

                  {thumbnailFile ? (
                    <div className="flex items-start gap-4">
                      <div className="relative">
                        <img
                          src={thumbnailFile.preview}
                          alt="Gig thumbnail preview"
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
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-emerald-500 transition-colors">
                      <input
                        type="file"
                        id="thumbnail-upload"
                        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                        onChange={(e) => handleThumbnailUpload(e.target.files[0])}
                        className="hidden"
                        disabled={uploadingThumbnail || gigLoading}
                        required
                      />
                      <label htmlFor="thumbnail-upload" className="cursor-pointer">
                        <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                        <h4 className="text-lg font-medium text-gray-900 mb-1">
                          Upload Thumbnail (Required)
                        </h4>
                        <p className="text-gray-600 text-sm mb-2">
                          Recommended: 800×600 pixels, max 5MB
                        </p>
                      </label>
                    </div>
                  )}
                  {errors.thumbnail && (
                    <p className="mt-2 text-sm text-red-600">{errors.thumbnail}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  }, [
    activeStep,
    formData,
    errors,
    categoryLoading,
    categoryError,
    categoriesData,
    subcategoryLoading,
    subcategories,
    gigLoading,
    skillsInput,
    deliverableInput,
    uploadedImages,
    thumbnailFile,
    uploadingImages,
    uploadingThumbnail,
    handleInputChange,
    handleRefreshCategories,
    handleImageUpload,
    handleThumbnailUpload,
    handleKeyPress,
    addSkill,
    removeSkill,
    addDeliverable,
    removeDeliverable,
    removeImage,
    removeThumbnail,
    formatBudget
  ]);

  // Render navigation buttons
  const renderNavigationButtons = useMemo(() => {
    if (activeStep === 5) return null;

    const isProcessing = gigLoading || isSubmitting || categoryLoading || subcategoryLoading;

    return (
      <div className="flex justify-between pt-6 md:pt-8 mt-6 md:mt-8 border-t border-gray-200">
        {activeStep > 1 && (
          <button
            type="button"
            onClick={prevStep}
            className="px-6 md:px-8 py-3 md:py-4 text-gray-700 border-2 border-gray-300 rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-colors font-medium flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isProcessing}
          >
            <ArrowLeft className="mr-2" size={20} />
            Back
          </button>
        )}

        {activeStep < 4 ? (
          <button
            type="button"
            onClick={nextStep}
            className={`px-6 md:px-8 py-3 md:py-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium flex items-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl ${activeStep > 1 ? 'ml-auto' : ''}`}
            disabled={isProcessing}
          >
            Save & Continue
            <ChevronRight className="ml-2" size={20} />
          </button>
        ) : activeStep === 4 ? (
          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <button
              type="button"
              onClick={(e) => handleSubmit(e, 'draft')}
              disabled={isProcessing}
              className="flex-1 px-6 md:px-8 py-3 md:py-4 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors font-medium flex items-center justify-center shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
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
              disabled={isProcessing}
              className="flex-1 px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all font-medium flex items-center justify-center shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 animate-spin" size={20} />
                  {gigLoading ? 'Creating...' : 'Processing...'}
                </>
              ) : (
                <>
                  <Zap className="mr-2" size={20} />
                  Publish Gig
                </>
              )}
            </button>
          </div>
        ) : null}
      </div>
    );
  }, [
    activeStep,
    gigLoading,
    isSubmitting,
    categoryLoading,
    subcategoryLoading,
    prevStep,
    nextStep,
    handleSubmit
  ]);

  return (
    <SeoWrapper
      title="Create a Gig on Vorkana | Find Freelancers for Your Project"
      description="Post your project and find qualified freelancers on Vorkana. Create a detailed gig with our step-by-step form to get matched with top talent. Free to post, pay only when you hire."
      keywords="create gig, post project, find freelancers, hire freelancers, freelance work, project posting, gig creation, online marketplace"
      canonical={`${window.location.origin}/create-gig`}
      structuredData={GIG_CREATION_STRUCTURED_DATA}
    >
      <div ref={topContainerRef} className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 py-8 md:py-12 px-4">
        {renderTopInfo}

        <div className="max-w-6xl mx-auto">
          {renderProgressSteps}

          {/* Main Content */}
          <div className="flex flex-col lg:flex-row gap-6 md:gap-8">
            {renderLeftPanel}

            {/* Right Panel - Form */}
            <div className="lg:w-3/5">
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                {activeStep === 5 ? (
                  <div className="p-8 md:p-12 text-center">
                    <div className="w-20 h-20 md:w-24 md:h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle className="w-10 h-10 md:w-12 md:h-12 text-emerald-600" />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                      Gig Created Successfully!
                    </h2>
                    <p className="text-gray-600 text-base md:text-lg mb-8">
                      Your gig is now live. Redirecting to your gig page...
                    </p>
                    <div className="w-20 h-1 bg-emerald-600 rounded-full mx-auto animate-pulse"></div>
                    <div className="mt-8">
                      <button
                        onClick={() => navigate(`/gig/${createdGigId}`)}
                        className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                      >
                        Go to Gig Now
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={(e) => e.preventDefault()} className="p-6 md:p-8">
                    {allErrors.form && (
                      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl" role="alert">
                        <p className="text-red-600 font-medium">{allErrors.form}</p>
                      </div>
                    )}

                    {subcategoryError && (
                      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl" role="alert">
                        <p className="text-red-600 font-medium">Failed to load subcategories. Please try again.</p>
                        <button
                          type="button"
                          onClick={() => refetchSubcategories()}
                          className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                        >
                          Retry
                        </button>
                      </div>
                    )}

                    {renderStepContent}
                    {renderNavigationButtons}
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

export default React.memo(GigCreate);