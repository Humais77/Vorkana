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
  Lock
} from "lucide-react";
import { toast } from "react-hot-toast";

import { useAuthStore } from "../../store/useAuthStore";
import { useGigStore } from "../../store/useGigStore";
import { useCategoryStore } from "../../store/useCategoryStore";
import { useCreateGig } from "../../hooks/useGigs";
import { useParentCategories } from '../../hooks/useCategories';
import { useSubcategoriesByCategory } from '../../hooks/useSubcategories';
import { SeoWrapper } from "../../components/SeoWrapper";
import { isProfileCompleteEnough } from '../../utils/profileUtils';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

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
  { number: 1, title: "Sign In", icon: LogIn },
  { number: 2, title: "Contact Details", icon: Phone },
  { number: 3, title: "Project Scope", icon: DollarSign },
  { number: 4, title: "Project Details", icon: FileText },
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
  const { user: currentUser, isAuthenticated, error: authError } = useAuthStore();
  const { lastCreatedGigId, setLastCreatedGigId, clearLastCreatedGig } = useGigStore();
  const { categories: storedCategories, setCategories } = useCategoryStore();

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

  const initialCompletedFields = useMemo(() => ({
    fullName: false,
    oauthEmail: false,
    country: false,
    phone: false,
    title: false,
    projectCategory: false,
    subcategory: false,
    budget: false,
    description: false,
    timeline: false
  }), []);

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
  const [showLoginMessage, setShowLoginMessage] = useState(true);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [authMode, setAuthMode] = useState("login");
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

  // Refs
  const imageUploadRef = useRef(null);
  const thumbnailUploadRef = useRef(null);
  const topContainerRef = useRef(null); // Add ref for scroll to top

  // TanStack Query hooks - declared BEFORE useEffect that uses them
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
    form: errors.form || gigError?.message || authError || categoryError?.message
  }), [errors, gigError, authError, categoryError]);

  // Get category name for display - memoized
  const getCategoryName = useCallback(() => {
    if (!formData.projectCategory) return "";
    const categoryList = Array.isArray(storedCategories) && storedCategories.length > 0
      ? storedCategories
      : (Array.isArray(categoriesData) ? categoriesData : []);
    const category = categoryList.find(c => c._id === formData.projectCategory);
    return category?.name || "";
  }, [formData.projectCategory, storedCategories, categoriesData]);

  // Get subcategory name for display - memoized
  const getSubcategoryName = useCallback(() => {
    if (!formData.subcategory) return "";
    const subcategory = subcategories.find(s => s._id === formData.subcategory);
    return subcategory?.name || "";
  }, [formData.subcategory, subcategories]);

  // Initialize form data with user info when authenticated
  useEffect(() => {
    if (currentUser) {
      setFormData(prev => ({
        ...prev,
        fullName: currentUser.name || currentUser.fullName || "",
        oauthEmail: currentUser.email || "",
        title: prev.title || ""
      }));
      
      setCompletedFields(prev => ({
        ...prev,
        fullName: !!(currentUser.name || currentUser.fullName),
        oauthEmail: !!currentUser.email
      }));
    }
  }, [currentUser]);

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

        // Scroll to top when success is shown
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

      // Scroll to top when success is shown
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
      
      // Clean up object URLs
      uploadedImages.forEach(img => URL.revokeObjectURL(img.preview));
      if (thumbnailFile) {
        URL.revokeObjectURL(thumbnailFile.preview);
      }
    };
  }, [clearLastCreatedGig, resetGigMutation, uploadedImages, thumbnailFile]);

  // Reset form when user logs out
  useEffect(() => {
    if (!isAuthenticated && activeStep > 1) {
      setActiveStep(1);
      setErrors({});
      setShowLoginMessage(true);
      toast("Please sign in to continue creating your gig", {
        icon: '🔐',
      });
    }
  }, [isAuthenticated, activeStep]);

  // Profile completion check
  useEffect(() => {
    if (!isProfileCompleteEnough(currentUser, 70)) {
      toast.error('Please complete your profile before creating a service');
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  // Memoized handlers
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    
    // Update form data
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Update completed status based on validation
    const isValid = validateField(name, value);
    setCompletedFields(prev => ({
      ...prev,
      [name]: isValid
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
    
    // If category changes, trigger subcategories fetch
    if (name === 'projectCategory' && value) {
      refetchSubcategories();
    }
  }, [errors, refetchSubcategories]);

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

  const handleLoginChange = useCallback((e) => {
    const { name, value } = e.target;
    setLoginForm(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleRegisterChange = useCallback((e) => {
    const { name, value } = e.target;
    setRegisterForm(prev => ({ ...prev, [name]: value }));
  }, []);

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

  const handleGoogleSignIn = useCallback(() => {
    window.location.href = `${API_URL}/api/auth/google`;
  }, []);

  const handleEmailLogin = useCallback(async (e) => {
    e.preventDefault();

    if (!loginForm.email || !loginForm.password) {
      toast.error("Please enter email and password");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: loginForm.email,
          password: loginForm.password
        })
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        toast.success("Login successful!");

        setFormData(prev => ({
          ...prev,
          fullName: data.user.name || data.user.fullName || "",
          oauthEmail: data.user.email || ""
        }));

        setCompletedFields(prev => ({
          ...prev,
          fullName: !!(data.user.name || data.user.fullName),
          oauthEmail: !!data.user.email
        }));

        useAuthStore.getState().setUser(data.user);

      } else {
        toast.error(data.message || "Login failed");
        setErrors(prev => ({ ...prev, auth: data.message }));
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error("Login failed. Please try again.");
      setErrors(prev => ({ ...prev, auth: "Network error" }));
    }
  }, [loginForm.email, loginForm.password]);

  const handleRegister = useCallback(async (e) => {
    e.preventDefault();

    if (registerForm.password !== registerForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (registerForm.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: registerForm.name,
          email: registerForm.email,
          password: registerForm.password
        })
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        toast.success("Registration successful!");
        setAuthMode("login");
      } else {
        toast.error(data.message || "Registration failed");
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error("Registration failed. Please try again.");
    }
  }, [registerForm]);

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

      if (!isAuthenticated) {
        newErrors.auth = "Please sign in to continue.";
      }
    }

    if (step === 2) {
      if (!formData.country || formData.country.trim().length < 2) {
        newErrors.country = "Country is required.";
      }

      if (!formData.phone || formData.phone.trim().length < 5) {
        newErrors.phone = "Phone number is required.";
      }
    }

    if (step === 3) {
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

    if (step === 4) {
      if (!formData.description || formData.description.trim().length < 20) {
        newErrors.description = "Description must be at least 20 characters.";
      } else if (formData.description.trim().length > 5000) {
        newErrors.description = "Description cannot exceed 5000 characters.";
      }

      if (!formData.timeline || formData.timeline.trim().length < 3) {
        newErrors.timeline = "Timeline is required.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, isAuthenticated, subcategories]);

  const nextStep = useCallback(() => {
    if (validateStep(activeStep)) {
      setActiveStep(prev => Math.min(prev + 1, 5));
      setShowLoginMessage(false);
    }
  }, [activeStep, validateStep]);

  const handleSubmit = useCallback(async (e, status = 'draft') => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!isAuthenticated) {
      setErrors(prev => ({
        ...prev,
        form: "Please sign in to create a gig."
      }));
      setActiveStep(1);
      toast.error("Please sign in first");
      setIsSubmitting(false);
      return;
    }

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
        visibility: formData.visibility,
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
        setActiveStep(3);
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
  }, [formData, thumbnailFile, uploadedImages, isAuthenticated, validateStep, createGig, subcategories]);

  const handleRefreshCategories = useCallback(() => {
    refetchCategories();
    toast.success("Refreshing categories...");
  }, [refetchCategories]);

  const formatBudget = useCallback((budget) => {
    const num = parseFloat(budget);
    return isNaN(num) ? "0" : num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }, []);

  const handleKeyPress = useCallback((e, type) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (type === 'skill') addSkill();
      if (type === 'deliverable') addDeliverable();
    }
  }, [addSkill, addDeliverable]);

  // Memoized render functions
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

  const renderLeftPanel = useMemo(() => {
    const stepTitles = {
      1: "Sign in and provide your basic information to get started.",
      2: "Share your contact details so freelancers can reach you.",
      3: "Define your project scope with budget and category.",
      4: "Add detailed project requirements.",
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
                  {activeStep >= 2 && completedFields.country && (
                    <li className="flex justify-between">
                      <span className="text-emerald-100">Country:</span>
                      <span className="font-medium truncate max-w-[120px]">{formData.country}</span>
                    </li>
                  )}
                  {activeStep >= 2 && completedFields.phone && (
                    <li className="flex justify-between">
                      <span className="text-emerald-100">Phone:</span>
                      <span className="font-medium truncate max-w-[120px]">{formData.phone}</span>
                    </li>
                  )}
                  {activeStep >= 3 && completedFields.title && (
                    <li className="flex justify-between">
                      <span className="text-emerald-100">Project Title:</span>
                      <span className="font-medium truncate max-w-[120px]">
                        {formData.title}
                      </span>
                    </li>
                  )}
                  {activeStep >= 3 && completedFields.projectCategory && (
                    <li className="flex justify-between">
                      <span className="text-emerald-100">Category:</span>
                      <span className="font-medium truncate max-w-[120px]">
                        {getCategoryName()}
                      </span>
                    </li>
                  )}
                  {activeStep >= 3 && completedFields.subcategory && (
                    <li className="flex justify-between">
                      <span className="text-emerald-100">Subcategory:</span>
                      <span className="font-medium truncate max-w-[120px]">
                        {getSubcategoryName()}
                      </span>
                    </li>
                  )}
                  {activeStep >= 3 && completedFields.budget && (
                    <li className="flex justify-between">
                      <span className="text-emerald-100">Budget:</span>
                      <span className="font-medium">${formatBudget(formData.budget)}</span>
                    </li>
                  )}
                  {activeStep >= 4 && completedFields.description && (
                    <li className="flex justify-between">
                      <span className="text-emerald-100">Description:</span>
                      <span className="font-medium">{formData.description.length} chars</span>
                    </li>
                  )}
                  {activeStep >= 4 && completedFields.timeline && (
                    <li className="flex justify-between">
                      <span className="text-emerald-100">Timeline:</span>
                      <span className="font-medium">{formData.timeline}</span>
                    </li>
                  )}
                  {activeStep >= 4 && formData.skillsRequired.length > 0 && (
                    <li className="flex justify-between">
                      <span className="text-emerald-100">Skills:</span>
                      <span className="font-medium">{formData.skillsRequired.length} added</span>
                    </li>
                  )}
                  {activeStep >= 4 && formData.deliverables.length > 0 && (
                    <li className="flex justify-between">
                      <span className="text-emerald-100">Deliverables:</span>
                      <span className="font-medium">{formData.deliverables.length} added</span>
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
    createdGigId
  ]);

  const renderStepContent = useMemo(() => {
    switch (activeStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center">
              <LogIn className="mr-3 text-emerald-600" size={20} />
              Sign In & Basic Information
            </h2>

            {!isAuthenticated ? (
              <div className="space-y-6">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 md:p-6">
                  <div className="flex items-start">
                    <AlertCircle className="text-amber-600 mr-3 flex-shrink-0 mt-0.5" size={18} />
                    <div>
                      <h3 className="font-semibold text-amber-800 mb-2">Authentication Required</h3>
                      <p className="text-amber-700 text-sm md:text-base">
                        You need to sign in to create a gig. This ensures secure communication and helps build trust with freelancers.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Auth Tabs */}
                <div className="border-b border-gray-200">
                  <nav className="-mb-px flex space-x-8" role="tablist">
                    <button
                      type="button"
                      onClick={() => setAuthMode("login")}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${authMode === "login"
                        ? "border-emerald-500 text-emerald-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                      role="tab"
                      aria-selected={authMode === "login"}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode("register")}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${authMode === "register"
                        ? "border-emerald-500 text-emerald-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                      role="tab"
                      aria-selected={authMode === "register"}
                    >
                      Sign Up
                    </button>
                  </nav>
                </div>

                {authMode === "login" && (
                  <div className="space-y-4" role="tabpanel">
                    <form onSubmit={handleEmailLogin} className="space-y-4">
                      <div>
                        <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          id="login-email"
                          name="email"
                          value={loginForm.email}
                          onChange={handleLoginChange}
                          placeholder="your@email.com"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1">
                          Password
                        </label>
                        <input
                          type="password"
                          id="login-password"
                          name="password"
                          value={loginForm.password}
                          onChange={handleLoginChange}
                          placeholder="••••••••"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium flex items-center justify-center"
                      >
                        <Lock className="w-4 h-4 mr-2" />
                        Sign In
                      </button>
                    </form>
                  </div>
                )}

                {authMode === "register" && (
                  <div className="space-y-4" role="tabpanel">
                    <form onSubmit={handleRegister} className="space-y-4">
                      <div>
                        <label htmlFor="register-name" className="block text-sm font-medium text-gray-700 mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          id="register-name"
                          name="name"
                          value={registerForm.name}
                          onChange={handleRegisterChange}
                          placeholder="John Doe"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="register-email" className="block text-sm font-medium text-gray-700 mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          id="register-email"
                          name="email"
                          value={registerForm.email}
                          onChange={handleRegisterChange}
                          placeholder="your@email.com"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="register-password" className="block text-sm font-medium text-gray-700 mb-1">
                          Password
                        </label>
                        <input
                          type="password"
                          id="register-password"
                          name="password"
                          value={registerForm.password}
                          onChange={handleRegisterChange}
                          placeholder="••••••••"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="register-confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                          Confirm Password
                        </label>
                        <input
                          type="password"
                          id="register-confirm-password"
                          name="confirmPassword"
                          value={registerForm.confirmPassword}
                          onChange={handleRegisterChange}
                          placeholder="••••••••"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium flex items-center justify-center"
                      >
                        <User className="w-4 h-4 mr-2" />
                        Create Account
                      </button>
                    </form>
                  </div>
                )}

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or continue with</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="w-full py-3 md:py-4 px-6 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200 flex items-center justify-center text-gray-800 font-semibold shadow-sm hover:shadow-md"
                    disabled={gigLoading}
                  >
                    <img
                      src="https://www.google.com/favicon.ico"
                      alt="Google logo"
                      className="w-4 h-4 md:w-5 md:h-5 mr-2"
                      loading="lazy"
                    />
                    Sign in with Google
                  </button>
                  <p className="text-center text-xs md:text-sm text-gray-500 mt-2">
                    You'll be redirected to Google for authentication
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 md:p-6">
                  <div className="flex items-center">
                    <CheckCircle className="text-emerald-600 mr-3 flex-shrink-0" size={20} />
                    <div>
                      <h3 className="font-semibold text-emerald-800">Signed in Successfully!</h3>
                      <p className="text-emerald-700">
                        Welcome back, {currentUser?.name || 'User'}! Your information has been automatically filled.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="bg-gray-50 rounded-xl p-4 md:p-5">
                    <div className="flex items-center mb-3">
                      <User className="text-gray-600 mr-2" size={16} />
                      <h4 className="font-semibold text-gray-800 text-sm md:text-base">Your Name *</h4>
                    </div>
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-sm md:text-base"
                      placeholder="Full Name"
                      disabled={gigLoading}
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500">Minimum 3 characters</p>
                    {errors.fullName && (
                      <p className="mt-2 text-sm text-red-600">{errors.fullName}</p>
                    )}
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 md:p-5">
                    <div className="flex items-center mb-3">
                      <Mail className="text-gray-600 mr-2" size={16} />
                      <h4 className="font-semibold text-gray-800 text-sm md:text-base">Your Email *</h4>
                    </div>
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <div className="flex items-center">
                        <div className="bg-white p-1 rounded mr-2">
                          <img
                            src="https://www.google.com/favicon.ico"
                            alt="Google"
                            className="w-3 h-3 md:w-4 md:h-4"
                            loading="lazy"
                          />
                        </div>
                        <span className="text-gray-700 text-sm md:text-base truncate">
                          {formData.oauthEmail || currentUser?.email}
                        </span>
                        <span className="ml-2 bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded-full whitespace-nowrap">
                          Verified
                        </span>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      This email is from your Google account
                    </p>
                    {errors.oauthEmail && (
                      <p className="mt-2 text-sm text-red-600">{errors.oauthEmail}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center">
              <Phone className="mr-3 text-emerald-600" size={20} />
              Contact Details
            </h2>

            {!isAuthenticated ? (
              <div className="text-center py-8 md:py-12">
                <AlertCircle className="w-12 h-12 md:w-16 md:h-16 text-amber-500 mx-auto mb-4" />
                <h3 className="text-lg md:text-xl font-semibold text-gray-800 mb-2">
                  Authentication Required
                </h3>
                <p className="text-gray-600 mb-6">
                  Please sign in to continue creating your gig.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveStep(1)}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Go Back to Sign In
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label htmlFor="country" className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                    <Globe className="mr-2" size={14} />
                    Country *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="country"
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      className="w-full p-3 md:p-4 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all text-sm md:text-base pl-12 md:pl-14"
                      placeholder="United States"
                      disabled={gigLoading}
                      required
                    />
                    <Globe className="absolute left-3 md:left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  </div>
                  <p className="mt-2 text-xs md:text-sm text-gray-500">
                    Helps freelancers understand your time zone
                  </p>
                  {errors.country && (
                    <p className="mt-2 text-sm text-red-600">{errors.country}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="phone" className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                    <Phone className="mr-2" size={14} />
                    Phone Number *
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full p-3 md:p-4 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all text-sm md:text-base pl-12 md:pl-14"
                      placeholder="+1 234 567 8900"
                      disabled={gigLoading}
                      required
                    />
                    <Phone className="absolute left-3 md:left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  </div>
                  <p className="mt-2 text-xs md:text-sm text-gray-500">
                    Only shared with freelancers you hire
                  </p>
                  {errors.phone && (
                    <p className="mt-2 text-sm text-red-600">{errors.phone}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center">
              <DollarSign className="mr-3 text-emerald-600" size={20} />
              Project Scope
            </h2>

            {!isAuthenticated ? (
              <div className="text-center py-8 md:py-12">
                <AlertCircle className="w-12 h-12 md:w-16 md:h-16 text-amber-500 mx-auto mb-4" />
                <h3 className="text-lg md:text-xl font-semibold text-gray-800 mb-2">
                  Please Sign In First
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveStep(1)}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Go Back to Sign In
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label htmlFor="title" className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                    <Type className="mr-2" size={14} />
                    Project Title *
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full p-3 md:p-4 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all text-sm md:text-base"
                    placeholder="e.g., Build a responsive e-commerce website"
                    disabled={gigLoading}
                    required
                  />
                  <p className="mt-2 text-xs md:text-sm text-gray-500">
                    Be specific and descriptive (5-200 characters)
                  </p>
                  {errors.title && (
                    <p className="mt-2 text-sm text-red-600">{errors.title}</p>
                  )}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label htmlFor="projectCategory" className="text-sm font-semibold text-gray-700">
                      Project Category *
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
                      value={formData.projectCategory}
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
                  {categoryLoading && (
                    <div className="flex items-center mt-2 text-sm text-gray-500">
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      Loading categories...
                    </div>
                  )}
                  {categoryError && !categoryLoading && (
                    <p className="mt-2 text-sm text-red-600">
                      Failed to load categories. Please try refreshing.
                    </p>
                  )}
                  {errors.projectCategory && (
                    <p className="mt-2 text-sm text-red-600">{errors.projectCategory}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="subcategory" className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                    <Layers className="mr-2" size={14} />
                    Subcategory {subcategories.length > 0 && '*'}
                  </label>
                  <div className="relative">
                    <select
                      id="subcategory"
                      name="subcategory"
                      value={formData.subcategory}
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
                  <div className="flex justify-between mt-2">
                    <p className="text-xs text-gray-500">
                      {subcategories.length > 0 
                        ? 'Please select a subcategory for better project matching'
                        : 'No subcategories available for this category'}
                    </p>
                    {subcategoryLoading && (
                      <span className="text-xs text-gray-500 flex items-center">
                        <Loader2 className="h-2 w-2 animate-spin mr-1" />
                        Loading...
                      </span>
                    )}
                  </div>
                  {errors.subcategory && (
                    <p className="mt-2 text-sm text-red-600">{errors.subcategory}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="budget" className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                    <DollarSign className="mr-2" size={14} />
                    Budget (USD) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold">$</span>
                    <input
                      type="number"
                      id="budget"
                      name="budget"
                      value={formData.budget}
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
                      💡 A clear budget helps freelancers provide accurate quotes
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

                <div>
                  <label htmlFor="currency" className="text-sm font-semibold text-gray-700 mb-2">
                    Currency
                  </label>
                  <select
                    id="currency"
                    name="currency"
                    value={formData.currency}
                    onChange={handleInputChange}
                    className="w-full p-3 md:p-4 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 bg-white transition-all text-sm md:text-base"
                    disabled={gigLoading}
                  >
                    {CURRENCY_OPTIONS.map(currency => (
                      <option key={currency.value} value={currency.value}>
                        {currency.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center">
              <FileText className="mr-3 text-emerald-600" size={20} />
              Project Details
            </h2>

            {!isAuthenticated ? (
              <div className="text-center py-8 md:py-12">
                <AlertCircle className="w-12 h-12 md:w-16 md:h-16 text-amber-500 mx-auto mb-4" />
                <h3 className="text-lg md:text-xl font-semibold text-gray-800 mb-2">
                  Almost There!
                </h3>
                <p className="text-gray-600 mb-6">
                  Sign in to complete your project creation.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveStep(1)}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Go Back to Sign In
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label htmlFor="timeline" className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                    <Calendar className="mr-2" size={14} />
                    Project Timeline *
                  </label>
                  <input
                    type="text"
                    id="timeline"
                    name="timeline"
                    value={formData.timeline}
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
                        value={formData.timelineUnit}
                        onChange={handleInputChange}
                        className="text-sm border border-gray-300 rounded-lg p-2"
                        disabled={gigLoading}
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

                <div>
                  <fieldset>
                    <legend className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <MessageSquare className="mr-2" size={14} />
                      Communication Preference
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

                <div>
                  <fieldset>
                    <legend className="text-sm font-semibold text-gray-700 mb-2">
                      Urgency Level
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

                <div>
                  <fieldset>
                    <legend className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <Shield className="mr-2" size={14} />
                      Gig Visibility
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

                <div>
                  <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-2">
                    Project Description *
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
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
                        Characters remaining: {5000 - formData.description.length}
                      </p>
                    </div>
                    <span className={`text-sm font-medium ${
                      formData.description.length < 20 ? 'text-red-500' : 
                      formData.description.length >= 5000 ? 'text-red-500' : 'text-emerald-500'
                    }`}>
                      {formData.description.length}/5000
                    </span>
                  </div>
                  {errors.description && (
                    <p className="mt-2 text-sm text-red-600">{errors.description}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="skillsInput" className="text-sm font-semibold text-gray-700 mb-2">
                    Required Skills (Optional)
                  </label>
                  <div className="flex flex-col md:flex-row gap-2 mb-3">
                    <input
                      type="text"
                      id="skillsInput"
                      value={skillsInput}
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
                    Add relevant skills to attract the right freelancers (max 10)
                  </p>
                </div>

                <div>
                  <label htmlFor="deliverableInput" className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                    <Package className="mr-2" size={14} />
                    Expected Deliverables (Optional)
                  </label>
                  <div className="flex flex-col md:flex-row gap-2 mb-3">
                    <input
                      type="text"
                      id="deliverableInput"
                      value={deliverableInput}
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
                    List specific items you expect to receive from the freelancer (max 10)
                  </p>
                </div>

                {/* Image Upload Section */}
                <div className="space-y-6">
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center">
                    <Upload className="mr-3 text-emerald-600" size={20} />
                    Project Images
                  </h2>

                  <div className="space-y-8">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Project Images</h3>
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

                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Thumbnail</h3>
                      <div className="space-y-4">
                        <p className="text-gray-600 text-sm">
                          The thumbnail is the main image displayed in gig listings. 
                          It should be eye-catching and representative of your project.
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
                                {(thumbnailFile.size / 1024 / 1024).toFixed(2)} MB • {thumbnailFile.type}
                              </p>
                              <p className="text-gray-500 text-sm mt-2">
                                This image will be used as the gig thumbnail.
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
                            />
                            <label htmlFor="thumbnail-upload" className="cursor-pointer">
                              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                              <h4 className="text-lg font-medium text-gray-900 mb-1">
                                Upload Thumbnail
                              </h4>
                              <p className="text-gray-600 text-sm mb-2">
                                Recommended: 800×600 pixels, max 5MB
                              </p>
                              <p className="text-gray-500 text-xs">
                                Click to browse or drag & drop
                              </p>
                            </label>
                          </div>
                        )}

                        {uploadedImages.length > 0 && !thumbnailFile && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <p className="text-sm text-blue-700">
                              <strong>Tip:</strong> You can also select a thumbnail from your uploaded images 
                              after creating the gig.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  }, [
    activeStep,
    isAuthenticated,
    authMode,
    currentUser,
    formData,
    errors,
    categoryLoading,
    categoryError,
    categoriesData,
    subcategoryLoading,
    subcategories,
    gigLoading,
    loginForm,
    registerForm,
    skillsInput,
    deliverableInput,
    uploadedImages,
    thumbnailFile,
    uploadingImages,
    uploadingThumbnail,
    handleInputChange,
    handleLoginChange,
    handleRegisterChange,
    handleEmailLogin,
    handleRegister,
    handleGoogleSignIn,
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

  const renderNavigationButtons = useMemo(() => {
    if (activeStep === 5) return null;

    return (
      <div className="flex justify-end pt-6 md:pt-8 mt-6 md:mt-8 border-t border-gray-200">
        {activeStep < 4 ? (
          <button
            type="button"
            onClick={nextStep}
            className="px-6 md:px-8 py-3 md:py-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium flex items-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            disabled={gigLoading || isSubmitting || subcategoryLoading || (activeStep === 1 && !isAuthenticated)}
          >
            <Save className="mr-2" size={20} />
            Save & Continue
            <ChevronRight className="ml-2" size={20} />
          </button>
        ) : activeStep === 4 ? (
          <button
            type="submit"
            disabled={gigLoading || categoryLoading || subcategoryLoading || !isAuthenticated || isSubmitting}
            className="w-full md:w-auto px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all font-medium flex items-center justify-center shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={(e) => handleSubmit(e, 'active')}
          >
            {gigLoading || isSubmitting ? (
              <>
                <Loader2 className="mr-2 animate-spin" size={20} />
                Creating Gig...
              </>
            ) : (
              <>
                Create Gig
                <ChevronRight className="ml-2" size={20} />
              </>
            )}
          </button>
        ) : null}
      </div>
    );
  }, [
    activeStep,
    gigLoading,
    isSubmitting,
    subcategoryLoading,
    isAuthenticated,
    categoryLoading,
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
      {/* Add ref to the top container for scroll to top */}
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
                  <form onSubmit={(e) => handleSubmit(e, 'draft')} className="p-6 md:p-8">
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