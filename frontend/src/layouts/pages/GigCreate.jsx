import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
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
  AlertCircle
} from "lucide-react";
import { createGig } from "../../redux/slices/gigSlice.js";
import { fetchCategories } from "../../redux/slices/categorySlice.js";
import { useAuthSync } from "../../redux/useAuthSync.js";

const GigCreate = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  useAuthSync();

  // Get state from Redux store
  const { loading: gigLoading, error: gigError } = useSelector((state) => state.gigs);
  const { categories, loading: categoryLoading } = useSelector((state) => state.categories);

  // Get current user from Redux store
  const { user: currentUser, isAuthenticated } = useSelector((state) => state.auth || {});

  // State matching your gig schema
  const [formData, setFormData] = useState({
    fullName: currentUser?.name || "",
    oauthEmail: currentUser?.email || "",
    country: "",
    phone: "",
    projectCategory: "",
    description: "",
    budget: "",
    timeline: "",
    communication: "Email",
  });

  const [attachments, setAttachments] = useState([]);
  const [errors, setErrors] = useState({});
  const [activeStep, setActiveStep] = useState(1);
  const [uploadProgress, setUploadProgress] = useState({});
  const [success, setSuccess] = useState(false);

  // API URL configuration
  const API_URL = import.meta.env.VITE_BACKEND_URL;

  // Fetch categories on component mount
  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  // Initialize form data with user info when authenticated
  useEffect(() => {
    if (currentUser) {
      setFormData(prev => ({
        ...prev,
        fullName: currentUser.name || "",
        oauthEmail: currentUser.email || ""
      }));
    }
  }, [currentUser]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    const validFiles = [];
    
    for (const file of files) {
      const isValidType = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf', 'application/zip']
        .includes(file.type);
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
      
      if (isValidType && isValidSize) {
        // Simulate upload progress
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
        
        // Simulate progress animation
        for (let i = 0; i <= 100; i += 20) {
          setTimeout(() => {
            setUploadProgress(prev => ({ ...prev, [file.name]: i }));
          }, i * 20);
        }
        
        validFiles.push(file);
        
        // Mark as uploaded after animation
        setTimeout(() => {
          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
        }, 1000);
      }
    }
    
    setAttachments(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const validateStep = (step) => {
    const newErrors = {};
    
    if (step === 1) {
      if (!formData.fullName || formData.fullName.trim().length < 3) {
        newErrors.fullName = "Full name must be at least 3 characters.";
      }
      
      // Check if user is authenticated (email comes from OAuth)
      if (!isAuthenticated || !formData.oauthEmail) {
        newErrors.oauthEmail = "Please sign in with Google to continue.";
      }
    }
    
    if (step === 2) {
      if (!formData.country || formData.country.trim().length < 2) {
        newErrors.country = "Country is required.";
      }
      
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!formData.phone || !phoneRegex.test(formData.phone.replace(/[^0-9+]/g, ''))) {
        newErrors.phone = "Valid phone number is required.";
      }
    }
    
    if (step === 3) {
      if (!formData.projectCategory) {
        newErrors.projectCategory = "Please select a project category.";
      }
      
      const budgetNum = Number(formData.budget);
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
  };

  const nextStep = () => {
    if (validateStep(activeStep)) {
      setActiveStep(prev => Math.min(prev + 1, 5));
    }
  };

  const prevStep = () => {
    setActiveStep(prev => Math.max(prev - 1, 1));
  };

  const handleGoogleSignIn = () => {
    window.location.href = `${API_URL}/api/auth/google`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if user is authenticated
    if (!isAuthenticated) {
      setErrors(prev => ({
        ...prev,
        form: "Please sign in with Google to create a gig."
      }));
      setActiveStep(1);
      return;
    }
    
    if (!validateStep(4)) {
      setActiveStep(4);
      return;
    }

    try {
      // Create FormData object
      const formDataObj = new FormData();
      
      // Append all form data
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== undefined) {
          formDataObj.append(key, formData[key]);
        }
      });

      // Append attachments
      attachments.forEach((file) => {
        formDataObj.append("attachments", file);
      });

      // Dispatch createGig action
      const resultAction = await dispatch(createGig(formDataObj));
      
      if (createGig.fulfilled.match(resultAction)) {
        // Gig created successfully
        setSuccess(true);
        setActiveStep(5);
        
        // Navigate to gig page after 2 seconds
        setTimeout(() => {
          navigate(`/gigs/${resultAction.payload._id}`);
        }, 2000);
      } else if (createGig.rejected.match(resultAction)) {
        // Handle API errors
        const error = resultAction.payload;
        setErrors(prev => ({
          ...prev,
          form: error?.message || "Failed to create gig"
        }));
      }
      
    } catch (error) {
      console.error("Error creating gig:", error);
      setErrors(prev => ({
        ...prev,
        form: error.message || "Something went wrong. Please try again."
      }));
    }
  };

  const steps = [
    { number: 1, title: "Sign In", icon: LogIn },
    { number: 2, title: "Contact Details", icon: Phone },
    { number: 3, title: "Project Scope", icon: DollarSign },
    { number: 4, title: "Project Details", icon: FileText },
    { number: 5, title: "Complete", icon: CheckCircle },
  ];

  // Information panels for each step
  const stepInformation = {
    1: {
      title: "Authentication Required",
      description: "Sign in with Google to create and manage your gigs securely.",
      tips: [
        {
          icon: Shield,
          title: "Secure & Verified",
          description: "Google authentication ensures your identity is verified and secure."
        },
        {
          icon: User,
          title: "Automatic Profile",
          description: "Your Google profile information helps freelancers know who they're working with."
        }
      ]
    },
    2: {
      title: "Contact Details",
      description: "This helps freelancers communicate effectively with you about the project.",
      tips: [
        {
          icon: Globe,
          title: "Time Zone Awareness",
          description: "Knowing your country helps freelancers align with your working hours."
        },
        {
          icon: Phone,
          title: "Direct Communication",
          description: "Phone numbers are only shared after you approve a freelancer's proposal."
        }
      ]
    },
    3: {
      title: "Project Scope",
      description: "Define your project's requirements to attract the right freelancers.",
      tips: [
        {
          icon: DollarSign,
          title: "Budget Guidance",
          description: "Setting a realistic budget helps filter freelancers who match your requirements."
        },
        {
          icon: Target,
          title: "Category Precision",
          description: "Accurate categorization ensures your gig reaches specialized professionals."
        }
      ]
    },
    4: {
      title: "Project Details",
      description: "Detailed information helps freelancers understand exactly what you need.",
      tips: [
        {
          icon: FileText,
          title: "Clear Requirements",
          description: "Detailed descriptions receive 3x more relevant proposals."
        },
        {
          icon: Clock,
          title: "Timeline Matters",
          description: "Realistic timelines help freelancers plan their work effectively."
        },
        {
          icon: FileCheck,
          title: "File Attachments",
          description: "Visual references improve understanding by 40% compared to text-only descriptions."
        }
      ]
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Create Your <span className="text-blue-600">Gig</span>
          </h1>
          <p className="text-gray-600 text-lg">
            Fill in your project details and find the perfect freelancer
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-10">
          <div className="flex justify-between items-center">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = activeStep >= step.number;
              const isCompleted = activeStep > step.number;
              
              return (
                <React.Fragment key={step.number}>
                  <div className="flex flex-col items-center relative z-10">
                    <div className={`
                      w-12 h-12 rounded-full flex items-center justify-center
                      ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}
                      ${isCompleted ? 'bg-green-500 text-white' : ''}
                      transition-all duration-300
                      shadow-lg
                    `}>
                      {isCompleted ? (
                        <CheckCircle size={20} />
                      ) : (
                        <Icon size={20} />
                      )}
                    </div>
                    <span className="mt-2 text-sm font-medium text-gray-700">
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="flex-1 h-1 bg-gray-200 mx-2 relative">
                      <div 
                        className={`absolute top-0 left-0 h-full bg-blue-600 transition-all duration-300 ${
                          isCompleted ? 'w-full' : 'w-0'
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
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Panel - Information */}
          <div className="lg:w-2/5">
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-2xl p-8 text-white h-full">
              <div className="mb-8">
                <div className="flex items-center mb-4">
                  <Info className="mr-3" size={24} />
                  <h2 className="text-2xl font-bold">
                    {stepInformation[activeStep]?.title || "Complete Your Gig"}
                  </h2>
                </div>
                <p className="text-blue-100">
                  {stepInformation[activeStep]?.description || "Your gig is ready to be published! Review your information before submitting."}
                </p>
              </div>

              {/* Current Step Info */}
              {activeStep < 5 && (
                <div className="space-y-6">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5">
                    <h3 className="font-bold text-lg mb-3 flex items-center">
                      <Lightbulb className="mr-2" size={20} />
                      What you'll need:
                    </h3>
                    <ul className="space-y-2">
                      {activeStep === 1 && (
                        <>
                          <li className="flex items-start">
                            <div className="w-2 h-2 bg-white rounded-full mt-2 mr-3"></div>
                            <span>Google account for authentication</span>
                          </li>
                          <li className="flex items-start">
                            <div className="w-2 h-2 bg-white rounded-full mt-2 mr-3"></div>
                            <span>Verified email from Google OAuth</span>
                          </li>
                        </>
                      )}
                      {activeStep === 2 && (
                        <>
                          <li className="flex items-start">
                            <div className="w-2 h-2 bg-white rounded-full mt-2 mr-3"></div>
                            <span>Country of residence</span>
                          </li>
                          <li className="flex items-start">
                            <div className="w-2 h-2 bg-white rounded-full mt-2 mr-3"></div>
                            <span>Active phone number for urgent communications</span>
                          </li>
                        </>
                      )}
                      {activeStep === 3 && (
                        <>
                          <li className="flex items-start">
                            <div className="w-2 h-2 bg-white rounded-full mt-2 mr-3"></div>
                            <span>Select the most relevant project category</span>
                          </li>
                          <li className="flex items-start">
                            <div className="w-2 h-2 bg-white rounded-full mt-2 mr-3"></div>
                            <span>Realistic budget range for your project</span>
                          </li>
                        </>
                      )}
                      {activeStep === 4 && (
                        <>
                          <li className="flex items-start">
                            <div className="w-2 h-2 bg-white rounded-full mt-2 mr-3"></div>
                            <span>Detailed project description</span>
                          </li>
                          <li className="flex items-start">
                            <div className="w-2 h-2 bg-white rounded-full mt-2 mr-3"></div>
                            <span>Project timeline expectation</span>
                          </li>
                          <li className="flex items-start">
                            <div className="w-2 h-2 bg-white rounded-full mt-2 mr-3"></div>
                            <span>Preferred communication method</span>
                          </li>
                        </>
                      )}
                    </ul>
                  </div>

                  {/* Tips Section */}
                  {stepInformation[activeStep]?.tips && (
                    <div>
                      <h3 className="font-bold text-lg mb-4">Why this matters:</h3>
                      <div className="space-y-4">
                        {stepInformation[activeStep].tips.map((tip, index) => (
                          <div key={index} className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                            <div className="flex items-start mb-2">
                              <tip.icon className="mr-3 flex-shrink-0" size={20} />
                              <h4 className="font-semibold">{tip.title}</h4>
                            </div>
                            <p className="text-sm text-blue-100">{tip.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Show entered data preview */}
                  {activeStep > 1 && (
                    <div className="mt-8 pt-6 border-t border-white/20">
                      <h3 className="font-bold text-lg mb-3">Information entered:</h3>
                      <div className="space-y-2 text-sm">
                        {activeStep >= 1 && currentUser && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-blue-100">Name:</span>
                              <span className="font-medium">{currentUser.name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-blue-100">Email:</span>
                              <span className="font-medium">{currentUser.email}</span>
                            </div>
                          </>
                        )}
                        {activeStep >= 2 && formData.country && (
                          <div className="flex justify-between">
                            <span className="text-blue-100">Country:</span>
                            <span className="font-medium">{formData.country}</span>
                          </div>
                        )}
                        {activeStep >= 3 && formData.budget && (
                          <div className="flex justify-between">
                            <span className="text-blue-100">Budget:</span>
                            <span className="font-medium">${formData.budget}</span>
                          </div>
                        )}
                        {activeStep >= 3 && formData.projectCategory && (
                          <div className="flex justify-between">
                            <span className="text-blue-100">Category:</span>
                            <span className="font-medium">
                              {categories.find(c => c._id === formData.projectCategory)?.name || "Selected"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Success Message */}
              {activeStep === 5 && (
                <div className="text-center py-8">
                  <CheckCircle className="w-16 h-16 mx-auto mb-6 text-green-300" />
                  <h3 className="text-2xl font-bold mb-4">Gig Created Successfully!</h3>
                  <p className="text-blue-100 mb-6">
                    Your project is now live and visible to thousands of qualified freelancers.
                  </p>
                  <div className="bg-white/10 rounded-xl p-4">
                    <h4 className="font-bold mb-2">What happens next?</h4>
                    <ul className="text-sm space-y-1">
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
                <div className="p-12 text-center">
                  <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-12 h-12 text-green-600" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    Gig Created Successfully!
                  </h2>
                  <p className="text-gray-600 text-lg mb-8">
                    Your project is now live. Redirecting to your gig page...
                  </p>
                  <div className="w-24 h-1 bg-blue-600 rounded-full mx-auto animate-pulse"></div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="p-8">
                  {/* Display API errors */}
                  {(errors.form || gigError) && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                      <p className="text-red-600 font-medium">{errors.form || gigError}</p>
                    </div>
                  )}

                  {/* Step 1: Authentication */}
                  {activeStep === 1 && (
                    <div className="space-y-6 animate-fadeIn">
                      <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                        <LogIn className="mr-3 text-blue-600" size={24} />
                        Sign In Required
                      </h2>
                      
                      {!isAuthenticated ? (
                        <div className="space-y-6">
                          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                            <div className="flex items-start">
                              <AlertCircle className="text-yellow-600 mr-3 flex-shrink-0 mt-0.5" size={20} />
                              <div>
                                <h3 className="font-semibold text-yellow-800 mb-2">Authentication Required</h3>
                                <p className="text-yellow-700">
                                  You need to sign in with Google to create a gig. This ensures secure communication and helps build trust with freelancers.
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                                Why Google Sign In?
                              </h3>
                              <div className="space-y-3">
                                <div className="flex items-start">
                                  <div className="bg-blue-100 p-2 rounded-lg mr-3">
                                    <Shield className="text-blue-600" size={18} />
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-gray-800">Secure & Verified</h4>
                                    <p className="text-sm text-gray-600">Google verifies your identity, preventing fake accounts</p>
                                  </div>
                                </div>
                                <div className="flex items-start">
                                  <div className="bg-green-100 p-2 rounded-lg mr-3">
                                    <Mail className="text-green-600" size={18} />
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-gray-800">Verified Email</h4>
                                    <p className="text-sm text-gray-600">Freelancers know they're communicating with a real person</p>
                                  </div>
                                </div>
                                <div className="flex items-start">
                                  <div className="bg-purple-100 p-2 rounded-lg mr-3">
                                    <User className="text-purple-600" size={18} />
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-gray-800">Instant Profile</h4>
                                    <p className="text-sm text-gray-600">Your Google profile automatically fills in your information</p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="pt-4">
                              <button
                                type="button"
                                onClick={handleGoogleSignIn}
                                className="w-full py-4 px-6 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200 flex items-center justify-center text-gray-800 font-semibold shadow-sm hover:shadow-md"
                              >
                                <img 
                                  src="https://www.google.com/favicon.ico" 
                                  alt="Google" 
                                  className="w-5 h-5 mr-3"
                                />
                                Sign in with Google
                              </button>
                              <p className="text-center text-sm text-gray-500 mt-3">
                                You'll be redirected to Google for authentication
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                            <div className="flex items-center">
                              <CheckCircle className="text-green-600 mr-3 flex-shrink-0" size={24} />
                              <div>
                                <h3 className="font-semibold text-green-800">Signed in Successfully!</h3>
                                <p className="text-green-700">
                                  Welcome back, {currentUser.name}! Your information has been automatically filled.
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-gray-50 rounded-xl p-5">
                              <div className="flex items-center mb-3">
                                <User className="text-gray-600 mr-2" size={18} />
                                <h4 className="font-semibold text-gray-800">Your Name</h4>
                              </div>
                              <input
                                type="text"
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleInputChange}
                                className="w-full p-3 border border-gray-300 rounded-lg bg-white"
                                placeholder="Full Name"
                              />
                              {errors.fullName && (
                                <p className="mt-2 text-sm text-red-600">{errors.fullName}</p>
                              )}
                            </div>

                            <div className="bg-gray-50 rounded-xl p-5">
                              <div className="flex items-center mb-3">
                                <Mail className="text-gray-600 mr-2" size={18} />
                                <h4 className="font-semibold text-gray-800">Your Email</h4>
                              </div>
                              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center">
                                  <div className="bg-white p-1 rounded mr-3">
                                    <img 
                                      src="https://www.google.com/favicon.ico" 
                                      alt="Google" 
                                      className="w-4 h-4"
                                    />
                                  </div>
                                  <span className="text-gray-700">{formData.oauthEmail}</span>
                                  <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                                    Verified
                                  </span>
                                </div>
                              </div>
                              <p className="mt-2 text-xs text-gray-500">
                                This email is from your Google account
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 2: Contact Details */}
                  {activeStep === 2 && (
                    <div className="space-y-6 animate-fadeIn">
                      <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                        <Phone className="mr-3 text-blue-600" size={24} />
                        Contact Details
                      </h2>
                      
                      {!isAuthenticated ? (
                        <div className="text-center py-12">
                          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                          <h3 className="text-xl font-semibold text-gray-800 mb-2">
                            Authentication Required
                          </h3>
                          <p className="text-gray-600 mb-6">
                            Please sign in to continue creating your gig.
                          </p>
                          <button
                            type="button"
                            onClick={handleGoogleSignIn}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Sign in with Google
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div>
                            <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                              <Globe className="mr-2" size={16} />
                              Country *
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                name="country"
                                value={formData.country}
                                onChange={handleInputChange}
                                className="w-full pl-10 p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                                placeholder="United States"
                                disabled={gigLoading}
                              />
                              <Globe className="absolute left-3 top-4 text-gray-400" size={20} />
                            </div>
                            <p className="mt-2 text-sm text-gray-500">
                              Helps freelancers understand your time zone
                            </p>
                            {errors.country && (
                              <p className="mt-2 text-sm text-red-600">{errors.country}</p>
                            )}
                          </div>

                          <div>
                            <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                              <Phone className="mr-2" size={16} />
                              Phone Number *
                            </label>
                            <div className="relative">
                              <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleInputChange}
                                className="w-full pl-10 p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                                placeholder="+1 234 567 8900"
                                disabled={gigLoading}
                              />
                              <Phone className="absolute left-3 top-4 text-gray-400" size={20} />
                            </div>
                            <p className="mt-2 text-sm text-gray-500">
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
                    <div className="space-y-6 animate-fadeIn">
                      <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                        <DollarSign className="mr-3 text-blue-600" size={24} />
                        Project Scope
                      </h2>
                      
                      {!isAuthenticated ? (
                        <div className="text-center py-12">
                          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                          <h3 className="text-xl font-semibold text-gray-800 mb-2">
                            Please Sign In First
                          </h3>
                          <button
                            type="button"
                            onClick={handleGoogleSignIn}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Sign in with Google to Continue
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Project Category *
                            </label>
                            <select
                              name="projectCategory"
                              value={formData.projectCategory}
                              onChange={handleInputChange}
                              className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white appearance-none transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                              disabled={categoryLoading || gigLoading}
                            >
                              <option value="">Select a category</option>
                              {categoryLoading ? (
                                <option value="" disabled>Loading categories...</option>
                              ) : (
                                Array.isArray(categories) && categories.length > 0 ? (
                                  categories.map((category) => (
                                    <option key={category._id} value={category._id}>
                                      {category.name}
                                    </option>
                                  ))
                                ) : (
                                  <option value="" disabled>No categories available</option>
                                )
                              )}
                            </select>
                            {categoryLoading && (
                              <p className="mt-2 text-sm text-gray-500">Loading categories...</p>
                            )}
                            {errors.projectCategory && (
                              <p className="mt-2 text-sm text-red-600">{errors.projectCategory}</p>
                            )}
                          </div>

                          <div>
                            <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                              <DollarSign className="mr-2" size={16} />
                              Budget (USD) *
                            </label>
                            <div className="relative">
                              <span className="absolute left-4 top-4 text-gray-500 font-semibold">$</span>
                              <input
                                type="number"
                                name="budget"
                                value={formData.budget}
                                onChange={handleInputChange}
                                className="w-full pl-10 p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
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
                                <span className="text-sm font-semibold text-blue-600">
                                  ${parseFloat(formData.budget).toLocaleString()}
                                </span>
                              )}
                            </div>
                            {errors.budget && (
                              <p className="mt-2 text-sm text-red-600">{errors.budget}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 4: Project Details */}
                  {activeStep === 4 && (
                    <div className="space-y-6 animate-fadeIn">
                      <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                        <FileText className="mr-3 text-blue-600" size={24} />
                        Project Details
                      </h2>
                      
                      {!isAuthenticated ? (
                        <div className="text-center py-12">
                          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                          <h3 className="text-xl font-semibold text-gray-800 mb-2">
                            Almost There!
                          </h3>
                          <p className="text-gray-600 mb-6">
                            Sign in to complete your gig creation.
                          </p>
                          <button
                            type="button"
                            onClick={handleGoogleSignIn}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Sign in with Google to Finish
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div>
                            <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                              <Calendar className="mr-2" size={16} />
                              Project Timeline *
                            </label>
                            <input
                              type="text"
                              name="timeline"
                              value={formData.timeline}
                              onChange={handleInputChange}
                              className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                              placeholder="e.g., 2 weeks, 1 month, ASAP"
                              disabled={gigLoading}
                            />
                            <p className="mt-2 text-sm text-gray-500">
                              Be specific about your deadline expectations
                            </p>
                            {errors.timeline && (
                              <p className="mt-2 text-sm text-red-600">{errors.timeline}</p>
                            )}
                          </div>

                          <div>
                            <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                              <MessageSquare className="mr-2" size={16} />
                              Communication Preference
                            </label>
                            <div className="flex flex-wrap gap-4">
                              {['Email', 'Phone', 'Video Call'].map((method) => (
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
                                    px-4 py-3 rounded-lg border-2 transition-all
                                    ${formData.communication === method 
                                      ? 'border-blue-500 bg-blue-50 text-blue-600' 
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

                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Project Description *
                            </label>
                            <textarea
                              name="description"
                              value={formData.description}
                              onChange={handleInputChange}
                              rows="6"
                              className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all resize-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                              placeholder="Describe your project in detail. Include:
• What you want to achieve
• Specific requirements
• Preferred technologies/tools
• Any examples or references"
                              disabled={gigLoading}
                            />
                            <div className="flex justify-between mt-2">
                              <div>
                                <p className="text-xs text-gray-500">
                                  Minimum 20 characters required
                                </p>
                                <p className="text-xs text-gray-500">
                                  Detailed descriptions receive better proposals
                                </p>
                              </div>
                              <span className={`text-sm font-medium ${
                                formData.description.length < 20 ? 'text-red-500' : 'text-green-500'
                              }`}>
                                {formData.description.length}/20
                              </span>
                            </div>
                            {errors.description && (
                              <p className="mt-2 text-sm text-red-600">{errors.description}</p>
                            )}
                          </div>

                          <div>
                            <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                              <Upload className="mr-2" size={16} />
                              Attachments (Optional)
                            </label>
                            <div className={`border-2 border-dashed border-gray-300 rounded-xl p-8 text-center transition-colors ${gigLoading ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-400'}`}>
                              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                              <p className="text-gray-600 mb-2">
                                Drag & drop files or click to browse
                              </p>
                              <p className="text-sm text-gray-500 mb-4">
                                JPG, PNG, PDF, ZIP (Max 10MB each)
                              </p>
                              <input
                                type="file"
                                multiple
                                onChange={handleFileChange}
                                accept=".jpg,.jpeg,.png,.pdf,.zip"
                                className="hidden"
                                id="file-upload"
                                disabled={gigLoading}
                              />
                              <label
                                htmlFor="file-upload"
                                className={`inline-block px-6 py-2 rounded-lg cursor-pointer transition-colors ${gigLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                              >
                                Browse Files
                              </label>
                            </div>
                            
                            {attachments.length > 0 && (
                              <div className="mt-4 space-y-3">
                                {attachments.map((file, index) => (
                                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center">
                                      <FileText className="text-gray-500 mr-3" size={20} />
                                      <div>
                                        <p className="font-medium text-gray-800">{file.name}</p>
                                        <p className="text-sm text-gray-500">
                                          {(file.size / 1024 / 1024).toFixed(2)} MB • {
                                            uploadProgress[file.name] === 100 ? 'Uploaded' : 'Uploading...'
                                          }
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                      {uploadProgress[file.name] < 100 && (
                                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                          <div 
                                            className="h-full bg-green-500 transition-all duration-300"
                                            style={{ width: `${uploadProgress[file.name] || 0}%` }}
                                          />
                                        </div>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => removeFile(index)}
                                        className="p-1 hover:bg-gray-200 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={gigLoading}
                                      >
                                        <X size={18} className="text-gray-500" />
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

                  {/* Navigation Buttons */}
                  <div className="flex justify-between pt-8 mt-8 border-t border-gray-200">
                    {activeStep > 1 && activeStep < 5 ? (
                      <button
                        type="button"
                        onClick={prevStep}
                        className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={gigLoading}
                      >
                        ← Previous
                      </button>
                    ) : (
                      <div></div>
                    )}
                    
                    {activeStep < 4 ? (
                      <button
                        type="button"
                        onClick={nextStep}
                        className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={gigLoading || (activeStep === 1 && !isAuthenticated)}
                      >
                        Next Step
                        <ChevronRight className="ml-2" size={20} />
                      </button>
                    ) : activeStep === 4 ? (
                      <button
                        type="submit"
                        disabled={gigLoading || categoryLoading || !isAuthenticated}
                        className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-medium flex items-center shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {gigLoading ? (
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