import React, { useState, useEffect, useCallback } from "react";
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

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

const GigCreate = () => {
  const navigate = useNavigate();

  // Zustand stores
  const { user: currentUser, isAuthenticated, error: authError } = useAuthStore();
  const { lastCreatedGigId, setLastCreatedGigId, clearLastCreatedGig } = useGigStore();
  const { categories: storedCategories, setCategories } = useCategoryStore();

  // TanStack Query hooks
  const {
    data: categoriesData,
    isLoading: categoryLoading,
    error: categoryError,
    refetch: refetchCategories
  } = useParentCategories();

  const {
    mutate: createGig,
    isPending: gigLoading,
    error: gigError,
    isSuccess: gigSuccess,
    data: createdGigData,
    reset: resetGigMutation
  } = useCreateGig();

  // Local state
  const [formData, setFormData] = useState({
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
  });

  const [completedFields, setCompletedFields] = useState({
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
  });

  const [attachments, setAttachments] = useState([]);
  const [files, setFiles] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [errors, setErrors] = useState({});
  const [activeStep, setActiveStep] = useState(1);
  const [uploadProgress, setUploadProgress] = useState({});
  const [success, setSuccess] = useState(false);
  const [createdGigId, setCreatedGigId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [skillsInput, setSkillsInput] = useState("");
  const [deliverableInput, setDeliverableInput] = useState("");
  const [showLoginMessage, setShowLoginMessage] = useState(true);
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: ""
  });
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [authMode, setAuthMode] = useState("login");

  // Initialize form data with user info when authenticated
  useEffect(() => {
    if (currentUser) {
      setFormData(prev => ({
        ...prev,
        fullName: currentUser.name || currentUser.fullName || "",
        oauthEmail: currentUser.email || "",
        title: prev.title || ""
      }));
      
      // Mark fields as completed if they have values
      setCompletedFields(prev => ({
        ...prev,
        fullName: !!(currentUser.name || currentUser.fullName),
        oauthEmail: !!currentUser.email
      }));
    }
  }, [currentUser]);

  useEffect(() => {
    console.log('DEBUG - Current categoriesData:', categoriesData);
    console.log('DEBUG - Current storedCategories:', storedCategories);
    console.log('DEBUG - Category loading:', categoryLoading);
    console.log('DEBUG - Category error:', categoryError);
  }, [categoriesData, storedCategories, categoryLoading, categoryError]);

  // Sync categories from query to store
  useEffect(() => {
    if (categoriesData && categoriesData.length > 0) {
      setCategories(categoriesData);
    }
  }, [categoriesData, setCategories]);

  // Update subcategories when category changes
  useEffect(() => {
    console.log('Category changed:', formData.projectCategory);
    console.log('Categories data available:', !!categoriesData);

    if (formData.projectCategory && categoriesData) {
      // Get the current category list (either from store or query)
      const categoryList = Array.isArray(storedCategories) && storedCategories.length > 0
        ? storedCategories
        : (Array.isArray(categoriesData) ? categoriesData : []);

      console.log('Category list:', categoryList);

      // Find the selected category
      const selectedCategory = categoryList.find(c => c._id === formData.projectCategory);
      console.log('Selected category:', selectedCategory);

      if (selectedCategory) {
        // Get subcategories - check multiple possible locations
        const subs = selectedCategory.children ||
          selectedCategory.subcategories ||
          [];

        console.log('Found subcategories:', subs);
        setSubcategories(subs);

        // Reset subcategory if parent category changes
        setFormData(prev => ({ 
          ...prev, 
          subcategory: "" 
        }));
        setCompletedFields(prev => ({
          ...prev,
          subcategory: false
        }));
      } else {
        console.log('No selected category found');
        setSubcategories([]);
        setFormData(prev => ({ 
          ...prev, 
          subcategory: "" 
        }));
        setCompletedFields(prev => ({
          ...prev,
          subcategory: false
        }));
      }
    } else {
      console.log('No project category selected or no categories data');
      setSubcategories([]);
      setFormData(prev => ({ 
        ...prev, 
        subcategory: "" 
      }));
      setCompletedFields(prev => ({
        ...prev,
        subcategory: false
      }));
    }
  }, [formData.projectCategory, categoriesData, storedCategories]);

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      clearLastCreatedGig();
      resetGigMutation();
    };
  }, [clearLastCreatedGig, resetGigMutation]);

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

      const timer = setTimeout(() => {
        navigate(`/gig/${lastCreatedGigId}`);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [lastCreatedGigId, success, navigate]);

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
  }, [errors]);

  const validateField = (fieldName, value) => {
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
        return !!value;
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
  };

  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginForm(prev => ({ ...prev, [name]: value }));
  };

  const handleRegisterChange = (e) => {
    const { name, value } = e.target;
    setRegisterForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = useCallback((e, fileType = 'attachments') => {
    const filesArray = Array.from(e.target.files);
    const validFiles = [];
    const newErrors = { ...errors };

    for (const file of filesArray) {
      const isValidType = [
        'image/jpeg', 'image/jpg', 'image/png',
        'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/zip', 'application/x-rar-compressed'
      ].includes(file.type);

      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB

      if (!isValidType) {
        newErrors[fileType] = `File ${file.name} has invalid type. Only JPG, PNG, PDF, DOC, ZIP, RAR are allowed.`;
        toast.error(`Invalid file type: ${file.name}`);
        continue;
      }

      if (!isValidSize) {
        newErrors[fileType] = `File ${file.name} is too large. Maximum size is 10MB.`;
        toast.error(`File too large: ${file.name}`);
        continue;
      }

      // Start upload simulation
      setUploadProgress(prev => ({ ...prev, [`${fileType}-${file.name}`]: 0 }));
      validFiles.push(file);

      // Simulate upload progress
      let progress = 0;
      const interval = setInterval(() => {
        progress += 20;
        setUploadProgress(prev => ({ ...prev, [`${fileType}-${file.name}`]: progress }));
        if (progress >= 100) {
          clearInterval(interval);
        }
      }, 100);
    }

    setErrors(newErrors);

    if (fileType === 'attachments') {
      setAttachments(prev => [...prev, ...validFiles]);
    } else if (fileType === 'files') {
      setFiles(prev => [...prev, ...validFiles]);
    }

    e.target.value = '';
  }, [errors]);

  const removeFile = useCallback((index, fileType = 'attachments') => {
    if (fileType === 'attachments') {
      const fileToRemove = attachments[index];
      setAttachments(prev => prev.filter((_, i) => i !== index));
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[`attachments-${fileToRemove.name}`];
        return newProgress;
      });
    } else if (fileType === 'files') {
      const fileToRemove = files[index];
      setFiles(prev => prev.filter((_, i) => i !== index));
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[`files-${fileToRemove.name}`];
        return newProgress;
      });
    }
  }, [attachments, files]);

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

  // Handle Google OAuth
  const handleGoogleSignIn = () => {
    window.location.href = `${API_URL}/api/auth/google`;
  };

  // Handle Email/Password Login
  const handleEmailLogin = async (e) => {
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

        // Update form with user data
        setFormData(prev => ({
          ...prev,
          fullName: data.user.name || data.user.fullName || "",
          oauthEmail: data.user.email || ""
        }));

        // Update completed fields
        setCompletedFields(prev => ({
          ...prev,
          fullName: !!(data.user.name || data.user.fullName),
          oauthEmail: !!data.user.email
        }));

        // If you're using Zustand, you might need to update the store
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
  };

  // Handle Registration
  const handleRegister = async (e) => {
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
  };

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

      // Check if subcategory is required (if there are subcategories available)
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

  const handleSubmit = useCallback(async (e) => {
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

      // Prepare data according to backend model
      const gigData = {
        title: formData.title.trim(),
        fullName: formData.fullName.trim(),
        oauthEmail: formData.oauthEmail.trim().toLowerCase(),
        country: formData.country.trim(),
        phone: formData.phone.trim(),
        projectCategory: formData.projectCategory,
        subcategory: formData.subcategory || undefined, // Send undefined if empty
        description: formData.description.trim(),
        budget: parseFloat(formData.budget),
        currency: formData.currency,
        timeline: formData.timeline.trim(),
        timelineUnit: formData.timelineUnit,
        communication: formData.communication,
        urgency: formData.urgency,
        visibility: formData.visibility,
      };

      // Log gig data for debugging
      console.log('=== GIG DATA TO BE SENT ===');
      console.log('Category:', gigData.projectCategory);
      console.log('Subcategory:', gigData.subcategory);
      console.log('Has subcategory?', !!gigData.subcategory);

      // Append all data to FormData
      Object.keys(gigData).forEach(key => {
        if (gigData[key] !== null && gigData[key] !== undefined && gigData[key] !== '') {
          if (typeof gigData[key] === 'object') {
            formDataObj.append(key, JSON.stringify(gigData[key]));
          } else {
            formDataObj.append(key, gigData[key]);
          }
        }
      });

      // Append skills array properly
      if (formData.skillsRequired && formData.skillsRequired.length > 0) {
        formData.skillsRequired.forEach((skill, index) => {
          formDataObj.append(`skillsRequired[${index}]`, skill);
        });
      }

      // Append deliverables array properly
      if (formData.deliverables && formData.deliverables.length > 0) {
        formData.deliverables.forEach((deliverable, index) => {
          formDataObj.append(`deliverables[${index}]`, deliverable);
        });
      }

      // Append attachments
      attachments.forEach((file) => {
        formDataObj.append("attachments", file);
      });

      // Append other files
      files.forEach((file) => {
        formDataObj.append("files", file);
      });

      // Log FormData entries for debugging
      console.log("=== FINAL FORM DATA BEING SENT ===");
      for (let [key, value] of formDataObj.entries()) {
        console.log(`${key}: ${value instanceof File ? `${value.name} (${value.type})` : value}`);
      }

      setErrors({});

      // Call create gig mutation
      createGig(formDataObj);

    } catch (error) {
      console.error("Error in handleSubmit:", error);
      toast.error("Failed to prepare gig data. Please try again.");
      setErrors(prev => ({
        ...prev,
        form: error.message || "Something went wrong. Please try again."
      }));
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, attachments, files, isAuthenticated, validateStep, createGig]);

  const handleRefreshCategories = useCallback(() => {
    refetchCategories();
    toast.success("Refreshing categories...");
  }, [refetchCategories]);

  const allErrors = {
    ...errors,
    form: errors.form || gigError?.message || authError || categoryError?.message
  };

  const steps = [
    { number: 1, title: "Sign In", icon: LogIn },
    { number: 2, title: "Contact Details", icon: Phone },
    { number: 3, title: "Project Scope", icon: DollarSign },
    { number: 4, title: "Project Details", icon: FileText },
    { number: 5, title: "Complete", icon: CheckCircle },
  ];

  const formatBudget = (budget) => {
    const num = parseFloat(budget);
    return isNaN(num) ? "0" : num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  };

  // Get category name for display
  const getCategoryName = () => {
    if (!formData.projectCategory) return "";
    const categoryList = Array.isArray(storedCategories) && storedCategories.length > 0
      ? storedCategories
      : (Array.isArray(categoriesData) ? categoriesData : []);
    const category = categoryList.find(c => c._id === formData.projectCategory);
    return category?.name || "";
  };

  // Get subcategory name for display
  const getSubcategoryName = () => {
    if (!formData.subcategory) return "";
    const subcategory = subcategories.find(s => s._id === formData.subcategory);
    return subcategory?.name || "";
  };

  // Handle Enter key press for skills and deliverables
  const handleKeyPress = (e, type) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (type === 'skill') addSkill();
      if (type === 'deliverable') addDeliverable();
    }
  };

  // Render upload progress for files
  const renderFileProgress = (fileName, progress) => {
    return (
      <div className="flex items-center space-x-2">
        {progress < 100 && (
          <div className="w-16 md:w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${progress || 0}%` }}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 py-8 md:py-12 px-4">
      {/* Top Info Section */}
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

              <div className="flex flex-wrap gap-4 md:gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <Users className="w-4 h-4 md:w-5 md:h-5 text-emerald-600" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-800 text-sm md:text-base">10K+ Freelancers</div>
                    <div className="text-xs md:text-sm text-gray-500">Ready to work</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <Star className="w-4 h-4 md:w-5 md:h-5 text-yellow-500 fill-yellow-500" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-800 text-sm md:text-base">4.9/5 Rating</div>
                    <div className="text-xs md:text-sm text-gray-500">Client satisfaction</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-800 text-sm md:text-base">No Fees</div>
                    <div className="text-xs md:text-sm text-gray-500">Posting is completely free</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:w-1/3 w-full">
              <div className="bg-white rounded-xl p-4 md:p-6 shadow-lg border border-gray-200">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-sm md:text-base">
                  <Info className="w-4 h-4 md:w-5 md:h-5 text-emerald-600" />
                  Quick Tips
                </h3>
                <ul className="space-y-2 md:space-y-3 text-xs md:text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span>Be specific about your requirements</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span>Set a realistic budget for better matches</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span>Add attachments for clarity</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span>Verification ensures secure collaboration</span>
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
                  {index < steps.length - 1 && (
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

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row gap-6 md:gap-8">
          {/* Left Panel - Information */}
          <div className="lg:w-2/5">
            <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl shadow-2xl p-6 md:p-8 text-white h-full">
              <div className="mb-6 md:mb-8">
                <div className="flex items-center mb-4">
                  <Info className="mr-3" size={20} />
                  <h2 className="text-xl md:text-2xl font-bold">
                    {activeStep < 5 ? `Step ${activeStep}: ${steps[activeStep - 1]?.title}` : "Complete Your Gig"}
                  </h2>
                </div>
                <p className="text-emerald-100 text-sm md:text-base">
                  {activeStep === 1 && "Sign in and provide your basic information to get started."}
                  {activeStep === 2 && "Share your contact details so freelancers can reach you."}
                  {activeStep === 3 && "Define your project scope with budget and category."}
                  {activeStep === 4 && "Add detailed project requirements and attachments."}
                  {activeStep === 5 && "Your gig is ready to be published! Review your information before submitting."}
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
                      {activeStep >= 4 && (attachments.length > 0 || files.length > 0) && (
                        <li className="flex justify-between">
                          <span className="text-emerald-100">Files:</span>
                          <span className="font-medium">{attachments.length + files.length} uploaded</span>
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              )}

              {/* Success Message */}
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

          {/* Right Panel - Form */}
          <div className="lg:w-3/5">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              {/* Success Screen */}
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
                <form onSubmit={handleSubmit} className="p-6 md:p-8">
                  {/* Display API errors */}
                  {allErrors.form && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                      <p className="text-red-600 font-medium">{allErrors.form}</p>
                    </div>
                  )}

                  {/* Step 1: Authentication & Basic Info */}
                  {activeStep === 1 && (
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
                            <nav className="-mb-px flex space-x-8">
                              <button
                                type="button"
                                onClick={() => setAuthMode("login")}
                                className={`py-2 px-1 border-b-2 font-medium text-sm ${authMode === "login"
                                  ? "border-emerald-500 text-emerald-600"
                                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                  }`}
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
                              >
                                Sign Up
                              </button>
                            </nav>
                          </div>

                          {/* Login Form */}
                          {authMode === "login" && (
                            <div className="space-y-4">
                              <form onSubmit={handleEmailLogin} className="space-y-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email Address
                                  </label>
                                  <input
                                    type="email"
                                    name="email"
                                    value={loginForm.email}
                                    onChange={handleLoginChange}
                                    placeholder="your@email.com"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Password
                                  </label>
                                  <input
                                    type="password"
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

                          {/* Register Form */}
                          {authMode === "register" && (
                            <div className="space-y-4">
                              <form onSubmit={handleRegister} className="space-y-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Full Name
                                  </label>
                                  <input
                                    type="text"
                                    name="name"
                                    value={registerForm.name}
                                    onChange={handleRegisterChange}
                                    placeholder="John Doe"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email Address
                                  </label>
                                  <input
                                    type="email"
                                    name="email"
                                    value={registerForm.email}
                                    onChange={handleRegisterChange}
                                    placeholder="your@email.com"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Password
                                  </label>
                                  <input
                                    type="password"
                                    name="password"
                                    value={registerForm.password}
                                    onChange={handleRegisterChange}
                                    placeholder="••••••••"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Confirm Password
                                  </label>
                                  <input
                                    type="password"
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

                          {/* OR Divider */}
                          <div className="relative py-4">
                            <div className="absolute inset-0 flex items-center">
                              <div className="w-full border-t border-gray-300"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                              <span className="px-2 bg-white text-gray-500">Or continue with</span>
                            </div>
                          </div>

                          {/* Google Sign In Button */}
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={handleGoogleSignIn}
                              className="w-full py-3 md:py-4 px-6 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200 flex items-center justify-center text-gray-800 font-semibold shadow-sm hover:shadow-md"
                              disabled={gigLoading}
                            >
                              <img
                                src="https://www.google.com/favicon.ico"
                                alt="Google"
                                className="w-4 h-4 md:w-5 md:h-5 mr-2"
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
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleInputChange}
                                className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-sm md:text-base"
                                placeholder="Full Name"
                                disabled={gigLoading}
                              />
                              {errors.fullName && (
                                <p className="mt-2 text-sm text-red-600">{errors.fullName}</p>
                              )}
                              <p className="mt-1 text-xs text-gray-500">Minimum 3 characters</p>
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
                  )}

                  {/* Step 2: Contact Details */}
                  {activeStep === 2 && (
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
                          {/* Country Field - Fixed with proper padding */}
                          <div>
                            <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                              <Globe className="mr-2" size={14} />
                              Country *
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                name="country"
                                value={formData.country}
                                onChange={handleInputChange}
                                className="w-full p-3 md:p-4 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all text-sm md:text-base pl-12 md:pl-14"
                                placeholder="United States"
                                disabled={gigLoading}
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

                          {/* Phone Field - Fixed with proper padding */}
                          <div>
                            <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                              <Phone className="mr-2" size={14} />
                              Phone Number *
                            </label>
                            <div className="relative">
                              <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleInputChange}
                                className="w-full p-3 md:p-4 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all text-sm md:text-base pl-12 md:pl-14"
                                placeholder="+1 234 567 8900"
                                disabled={gigLoading}
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
                  )}

                  {/* Step 3: Project Scope */}
                  {activeStep === 3 && (
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
                          {/* Project Title */}
                          <div>
                            <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                              <Type className="mr-2" size={14} />
                              Project Title *
                            </label>
                            <input
                              type="text"
                              name="title"
                              value={formData.title}
                              onChange={handleInputChange}
                              className="w-full p-3 md:p-4 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all text-sm md:text-base"
                              placeholder="e.g., Build a responsive e-commerce website"
                              disabled={gigLoading}
                            />
                            <p className="mt-2 text-xs md:text-sm text-gray-500">
                              Be specific and descriptive (5-200 characters)
                            </p>
                            {errors.title && (
                              <p className="mt-2 text-sm text-red-600">{errors.title}</p>
                            )}
                          </div>

                          {/* Project Category */}
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <label className="text-sm font-semibold text-gray-700">
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
                                name="projectCategory"
                                value={formData.projectCategory}
                                onChange={handleInputChange}
                                className="w-full p-3 md:p-4 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 bg-white appearance-none transition-all disabled:bg-gray-50 disabled:cursor-not-allowed pr-10 text-sm md:text-base"
                                disabled={categoryLoading || gigLoading}
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

                          {/* Subcategory - Now Mandatory */}
                          {subcategories.length > 0 && (
                            <div>
                              <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                                <Layers className="mr-2" size={14} />
                                Subcategory *
                              </label>
                              <div className="relative">
                                <select
                                  name="subcategory"
                                  value={formData.subcategory}
                                  onChange={handleInputChange}
                                  className="w-full p-3 md:p-4 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 bg-white appearance-none transition-all disabled:bg-gray-50 disabled:cursor-not-allowed pr-10 text-sm md:text-base"
                                  disabled={!formData.projectCategory || gigLoading}
                                  required={subcategories.length > 0}
                                >
                                  <option value="">Select a subcategory</option>
                                  {subcategories.map((subcategory) => (
                                    <option key={subcategory._id} value={subcategory._id}>
                                      {subcategory.name}
                                    </option>
                                  ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                  <ChevronDown className="h-4 w-4" />
                                </div>
                              </div>
                              <p className="mt-2 text-xs text-gray-500">
                                Please select a subcategory for better project matching
                              </p>
                              {errors.subcategory && (
                                <p className="mt-2 text-sm text-red-600">{errors.subcategory}</p>
                              )}
                            </div>
                          )}

                          {/* Budget */}
                          <div>
                            <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                              <DollarSign className="mr-2" size={14} />
                              Budget (USD) *
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold">$</span>
                              <input
                                type="number"
                                name="budget"
                                value={formData.budget}
                                onChange={handleInputChange}
                                className="w-full pl-10 p-3 md:p-4 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed text-sm md:text-base"
                                placeholder="Enter your budget"
                                min="5"
                                max="100000"
                                step="0.01"
                                disabled={gigLoading}
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

                          {/* Currency */}
                          <div>
                            <label className="text-sm font-semibold text-gray-700 mb-2">
                              Currency
                            </label>
                            <select
                              name="currency"
                              value={formData.currency}
                              onChange={handleInputChange}
                              className="w-full p-3 md:p-4 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 bg-white transition-all text-sm md:text-base"
                              disabled={gigLoading}
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
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 4: Project Details */}
                  {activeStep === 4 && (
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
                          {/* Timeline */}
                          <div>
                            <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                              <Calendar className="mr-2" size={14} />
                              Project Timeline *
                            </label>
                            <input
                              type="text"
                              name="timeline"
                              value={formData.timeline}
                              onChange={handleInputChange}
                              className="w-full p-3 md:p-4 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed text-sm md:text-base"
                              placeholder="e.g., 2 weeks, 1 month, ASAP"
                              disabled={gigLoading}
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
                                  <option value="days">Days</option>
                                  <option value="weeks">Weeks</option>
                                  <option value="months">Months</option>
                                </select>
                              </div>
                            </div>
                            {errors.timeline && (
                              <p className="mt-2 text-sm text-red-600">{errors.timeline}</p>
                            )}
                          </div>

                          {/* Communication Preference */}
                          <div>
                            <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                              <MessageSquare className="mr-2" size={14} />
                              Communication Preference
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                              {['Email', 'Phone', 'Video Call', 'Any'].map((method) => (
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
                          </div>

                          {/* Urgency Level */}
                          <div>
                            <label className="text-sm font-semibold text-gray-700 mb-2">
                              Urgency Level
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                              {['low', 'medium', 'high', 'urgent'].map((level) => (
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
                          </div>

                          {/* Visibility */}
                          <div>
                            <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                              <Shield className="mr-2" size={14} />
                              Gig Visibility
                            </label>
                            <div className="grid grid-cols-3 gap-2 md:gap-3">
                              {[
                                { value: 'public', label: 'Public', desc: 'Visible to all' },
                                { value: 'private', label: 'Private', desc: 'Only you' },
                                { value: 'invite_only', label: 'Invite Only', desc: 'Selected users' }
                              ].map((visibility) => (
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
                          </div>

                          {/* Description */}
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Project Description *
                            </label>
                            <textarea
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
                            />
                            <div className="flex flex-col md:flex-row justify-between mt-2 gap-2">
                              <div>
                                <p className="text-xs text-gray-500">
                                  Minimum 20 characters required
                                </p>
                                <p className="text-xs text-gray-500">
                                  Maximum 5000 characters allowed
                                </p>
                              </div>
                              <span className={`text-sm font-medium ${formData.description.length < 20 ? 'text-red-500' : 'text-emerald-500'
                                }`}>
                                {formData.description.length}/5000
                              </span>
                            </div>
                            {errors.description && (
                              <p className="mt-2 text-sm text-red-600">{errors.description}</p>
                            )}
                          </div>

                          {/* Skills Required */}
                          <div>
                            <label className="text-sm font-semibold text-gray-700 mb-2">
                              Required Skills (Optional)
                            </label>
                            <div className="flex flex-col md:flex-row gap-2 mb-3">
                              <input
                                type="text"
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

                          {/* Expected Deliverables */}
                          <div>
                            <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                              <Package className="mr-2" size={14} />
                              Expected Deliverables (Optional)
                            </label>
                            <div className="flex flex-col md:flex-row gap-2 mb-3">
                              <input
                                type="text"
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

                          {/* Attachments */}
                          <div>
                            <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                              <Upload className="mr-2" size={14} />
                              Attachments (Optional)
                            </label>
                            <div className={`border-2 border-dashed border-gray-300 rounded-xl p-4 md:p-8 text-center transition-colors ${gigLoading ? 'opacity-50 cursor-not-allowed' : 'hover:border-emerald-400'}`}>
                              <Upload className="w-8 h-8 md:w-12 md:h-12 text-gray-400 mx-auto mb-2 md:mb-4" />
                              <p className="text-gray-600 text-sm md:text-base mb-2">
                                Drag & drop files or click to browse
                              </p>
                              <p className="text-xs md:text-sm text-gray-500 mb-4">
                                JPG, PNG, PDF, DOC, ZIP, RAR (Max 10MB each)
                              </p>
                              <input
                                type="file"
                                multiple
                                onChange={(e) => handleFileChange(e, 'attachments')}
                                accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.zip,.rar"
                                className="hidden"
                                id="attachments-upload"
                                disabled={gigLoading}
                              />
                              <label
                                htmlFor="attachments-upload"
                                className={`inline-block px-4 md:px-6 py-2 rounded-lg cursor-pointer transition-colors ${gigLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
                              >
                                Browse Files
                              </label>
                            </div>

                            {attachments.length > 0 && (
                              <div className="mt-4 space-y-3">
                                {attachments.map((file, index) => (
                                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center min-w-0">
                                      <FileText className="text-gray-500 mr-3 flex-shrink-0" size={18} />
                                      <div className="min-w-0">
                                        <p className="font-medium text-gray-800 truncate text-sm">{file.name}</p>
                                        <p className="text-xs text-gray-500">
                                          {(file.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      {renderFileProgress(file.name, uploadProgress[`attachments-${file.name}`] || 0)}
                                      <button
                                        type="button"
                                        onClick={() => removeFile(index, 'attachments')}
                                        className="p-1 hover:bg-gray-200 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={gigLoading}
                                      >
                                        <X size={16} className="text-gray-500" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Additional Files */}
                          <div>
                            <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                              <FileCheck className="mr-2" size={14} />
                              Additional Files (Optional)
                            </label>
                            <div className={`border-2 border-dashed border-gray-300 rounded-xl p-4 md:p-8 text-center transition-colors ${gigLoading ? 'opacity-50 cursor-not-allowed' : 'hover:border-emerald-400'}`}>
                              <FileCheck className="w-8 h-8 md:w-12 md:h-12 text-gray-400 mx-auto mb-2 md:mb-4" />
                              <p className="text-gray-600 text-sm md:text-base mb-2">
                                Add additional supporting files
                              </p>
                              <p className="text-xs md:text-sm text-gray-500 mb-4">
                                JPG, PNG, PDF, DOC, ZIP, RAR (Max 10MB each)
                              </p>
                              <input
                                type="file"
                                multiple
                                onChange={(e) => handleFileChange(e, 'files')}
                                accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.zip,.rar"
                                className="hidden"
                                id="files-upload"
                                disabled={gigLoading}
                              />
                              <label
                                htmlFor="files-upload"
                                className={`inline-block px-4 md:px-6 py-2 rounded-lg cursor-pointer transition-colors ${gigLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
                              >
                                Browse Files
                              </label>
                            </div>

                            {files.length > 0 && (
                              <div className="mt-4 space-y-3">
                                {files.map((file, index) => (
                                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center min-w-0">
                                      <FileText className="text-gray-500 mr-3 flex-shrink-0" size={18} />
                                      <div className="min-w-0">
                                        <p className="font-medium text-gray-800 truncate text-sm">{file.name}</p>
                                        <p className="text-xs text-gray-500">
                                          {(file.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      {renderFileProgress(file.name, uploadProgress[`files-${file.name}`] || 0)}
                                      <button
                                        type="button"
                                        onClick={() => removeFile(index, 'files')}
                                        className="p-1 hover:bg-gray-200 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={gigLoading}
                                      >
                                        <X size={16} className="text-gray-500" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Navigation Buttons - Removed Back button, only Save & Continue */}
                  <div className="flex justify-end pt-6 md:pt-8 mt-6 md:mt-8 border-t border-gray-200">
                    {activeStep < 4 ? (
                      <button
                        type="button"
                        onClick={nextStep}
                        className="px-6 md:px-8 py-3 md:py-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium flex items-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                        disabled={gigLoading || isSubmitting || (activeStep === 1 && !isAuthenticated)}
                      >
                        <Save className="mr-2" size={20} />
                        Save & Continue
                        <ChevronRight className="ml-2" size={20} />
                      </button>
                    ) : activeStep === 4 ? (
                      <button
                        type="submit"
                        disabled={gigLoading || categoryLoading || !isAuthenticated || isSubmitting}
                        className="w-full md:w-auto px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all font-medium flex items-center justify-center shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {gigLoading || isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 animate-spin" size={20} />
                            Creating Project...
                          </>
                        ) : (
                          <>
                            Create Project
                            <ChevronRight className="ml-2" size={20} />
                          </>
                        )}
                      </button>
                    ) : null}
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GigCreate;