import React, { useState, useEffect, useCallback } from "react";
import {
  FaFacebook,
  FaInstagram,
  FaLinkedin,
  FaXTwitter,
  FaChevronDown,
  FaChevronUp,
} from 'react-icons/fa6';
import TrackedLink from '../../../components/TrackedLink';
import { useParentCategories } from "../../../hooks/useCategories";
import { useSubscribe, useSubscriptionStatus, useToggleSubscription } from "../../../hooks/useSubscribe";
import { toast } from 'react-hot-toast';

const Footer = () => {
  const [openDropdown, setOpenDropdown] = useState(null);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [localStatus, setLocalStatus] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const preferences = useState({
    frequency: "weekly",
    categories: ["tech", "design"]
  })[0];

  // Fetch categories from database
  const { data: categoriesData = [], isLoading: categoriesLoading } = useParentCategories();
  
  // Use subscription hook
  const { 
    mutateAsync: subscribe,
    isLoading: subscribeLoading,
    error: subscribeError,
    reset: resetSubscription
  } = useSubscribe();

  // Limit to 10 categories for initial display
  const initialCategories = categoriesData.slice(0, 10);
  const remainingCategories = categoriesData.slice(10);
  
  // Use subscription status query
  const { 
    data: statusData, 
    refetch: refetchStatus,
    isLoading: statusLoading
  } = useSubscriptionStatus(email);
  
  // Toggle subscription
  const { mutate: toggleSubscription, isLoading: toggleLoading } = useToggleSubscription();
  
  // Fix: Add proper validation when mapping categories
  const footerLinks = {
    categories: {
      title: "Categories",
      links: initialCategories
        .filter(category => category && category.name)
        .map(category => ({
          label: category.name,
          path: `/categories/${category.slug || category.name.toLowerCase().replace(/\s+/g, '-')}`,
          source: "footer",
          section: "categories"
        }))
    },
    discover: {
      title: "Discover",
      links: [
        { label: "Browse Services", path: "/services", source: "footer", section: "discover" },
        { label: "Popular Categories", path: "/categories", source: "footer", section: "discover" },
      ]
    },
    company: {
      title: "Company",
      links: [
        { label: "About Us", path: "/about-us", source: "footer", section: "company" },
        { label: "How It Works", path: "/how-it-works", source: "footer", section: "company" },
      ]
    },
    support: {
      title: "Support",
      links: [
        { label: "Help Center", path: "/help", source: "footer", section: "support" },
        { label: "Contact Us", path: "/contact", source: "footer", section: "support" },
        { label: "Trust & Safety", path: "/trust", source: "footer", section: "support" },
        { label: "FAQ", path: "/faq", source: "footer", section: "support" },
        { label: "Help", path: "/help", source: "footer", section: "support"}
      ]
    },
  };

  const toggleDropdown = (section) => {
    setOpenDropdown(openDropdown === section ? null : section);
  };

  // Validate email format
  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  // Check subscription status in real-time when user types
  const checkSubscriptionStatus = useCallback(async (emailToCheck) => {
    if (!emailToCheck || !validateEmail(emailToCheck)) {
      setLocalStatus(null);
      return;
    }

    setIsChecking(true);
    try {
      // Use the query hook's refetch instead of manual API call
      await refetchStatus();
    } catch (error) {
      console.error("Error checking subscription:", error);
    } finally {
      setIsChecking(false);
    }
  }, [refetchStatus]);

  // Handle email change with debouncing
  const handleEmailChange = (e) => {
    const value = e.target.value.trim();
    setEmail(value);
    
    // Clear previous timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    // Validate format
    if (value && !validateEmail(value)) {
      setEmailError("Please enter a valid email address");
      setLocalStatus(null);
      return;
    }
    
    setEmailError("");
    
    // Clear local status if email is empty
    if (!value) {
      setLocalStatus(null);
      return;
    }
    
    // Debounce subscription status check (500ms)
    const timeout = setTimeout(() => {
      checkSubscriptionStatus(value);
    }, 500);
    
    setTypingTimeout(timeout);
  };

  // Update local status when statusData changes
  useEffect(() => {
    if (statusData?.success && email) {
      if (statusData.data?.exists === false) {
        // Email not found in database
        setLocalStatus({
          email,
          isSubscribed: false,
          exists: false
        });
      } else {
        // Email found with subscription status
        setLocalStatus({
          email: statusData.data?.email || email,
          isSubscribed: statusData.data?.isSubscribed || false,
          exists: true
        });
      }
    } else {
      setLocalStatus(null);
    }
  }, [statusData, email]);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    };
  }, [typingTimeout]);

  // Handle subscription form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate email
    if (!email) {
      setEmailError("Email is required");
      return;
    }
    
    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }
    
    // Prevent duplicate subscription attempts
    if (localStatus?.isSubscribed) {
      toast.error("You're already subscribed!", {
        icon: "📧",
        duration: 3000
      });
      return;
    }
    
    // Show loading state
    const loadingToast = toast.loading("Processing subscription...");
    
    try {
      // Use the toggle subscription mutation
      toggleSubscription(email, {
        onSuccess: (data) => {
          if (data.success) {
            // Update local status
            setLocalStatus(data.data);
            
            // Show success message
            toast.success(data.message || "Successfully subscribed!", {
              id: loadingToast,
              duration: 3000
            });
            
            // Refresh status
            refetchStatus();
          } else {
            toast.error(data.message || "Subscription failed", {
              id: loadingToast,
              duration: 3000
            });
          }
        },
        onError: (error) => {
          console.error("Toggle subscription error:", error);
          toast.error("Failed to subscribe. Please try again.", {
            id: loadingToast,
            duration: 3000
          });
        }
      });
    } catch (error) {
      console.error("Subscription error:", error);
      toast.error("An unexpected error occurred", {
        id: loadingToast,
        duration: 3000
      });
    }
  };

  // Handle unsubscribe
  const handleUnsubscribe = () => {
    if (!email || !localStatus?.isSubscribed) return;
    
    const loadingToast = toast.loading("Processing unsubscribe...");
    
    toggleSubscription(email, {
      onSuccess: (data) => {
        if (data.success) {
          setLocalStatus(data.data);
          refetchStatus();
          
          toast.success(data.message || "Successfully unsubscribed!", {
            id: loadingToast,
            duration: 3000
          });
        } else {
          toast.error(data.message || "Unsubscribe failed", {
            id: loadingToast,
            duration: 3000
          });
        }
      },
      onError: (error) => {
        console.error("Unsubscribe error:", error);
        toast.error("Failed to unsubscribe. Please try again.", {
          id: loadingToast,
          duration: 3000
        });
      }
    });
  };

  // Check if we should show unsubscribe button
  const showUnsubscribe = localStatus?.isSubscribed && email === localStatus.email;

  // Determine button text and state
  const getButtonState = () => {
    if (toggleLoading || isChecking) {
      return {
        text: "Processing...",
        disabled: true,
        className: "bg-gray-400 cursor-not-allowed"
      };
    }
    
    if (showUnsubscribe) {
      return {
        text: "Unsubscribe",
        disabled: false,
        className: "bg-gray-600 hover:bg-gray-700"
      };
    }
    
    if (localStatus?.exists && !localStatus?.isSubscribed) {
      return {
        text: "Resubscribe",
        disabled: false,
        className: "bg-blue-600 hover:bg-blue-700"
      };
    }
    
    return {
      text: "Subscribe",
      disabled: false,
      className: "bg-black hover:bg-gray-900"
    };
  };

  const buttonState = getButtonState();

  return (
    <footer className="bg-white text-black border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        {/* Mobile Dropdowns (sm only) */}
        <div className="md:hidden mb-8">
          {Object.entries(footerLinks).map(([key, section]) => (
            <div key={key} className="mb-2 border-b border-gray-200">
              <button
                onClick={() => toggleDropdown(key)}
                className="w-full flex justify-between items-center py-4 px-2 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors duration-150"
              >
                <span className="font-bold text-black tracking-wide text-sm uppercase">
                  {section.title}
                </span>
                <span className={`text-gray-500 transition-transform duration-200 ${openDropdown === key ? 'rotate-180' : ''}`}>
                  <FaChevronDown />
                </span>
              </button>
              
              {openDropdown === key && (
                <div className="overflow-hidden">
                  <ul className="pb-4 px-2 space-y-2">
                    {section.links
                      .filter(link => link && link.label)
                      .map((link, linkIndex) => (
                      <li key={linkIndex}>
                        <TrackedLink 
                          to={link.path}
                          source={link.source}
                          medium="website"
                          campaign={link.campaign || `footer_${link.label.toLowerCase().replace(/\s+/g, '_')}`}
                          className="text-gray-600 hover:text-black transition-colors duration-150 text-sm block py-2 px-2 hover:bg-gray-50 rounded"
                          onClick={() => setOpenDropdown(null)}
                        >
                          {link.label}
                        </TrackedLink>
                      </li>
                    ))}
                    
                    {key === 'categories' && categoriesData.length > 10 && (
                      <li>
                        <button
                          onClick={() => {
                            setShowAllCategories(!showAllCategories);
                            setOpenDropdown(key);
                          }}
                          className="text-gray-600 hover:text-black transition-colors duration-150 text-sm block py-2 px-2 hover:bg-gray-50 rounded w-full text-left"
                        >
                          {showAllCategories ? "Show Less" : `View All Categories (${categoriesData.length})`}
                        </button>
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Desktop Grid Layout (md and above) */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12 mb-16">
          {Object.entries(footerLinks).map(([key, section]) => (
            <div key={key} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-black mb-6 tracking-wide text-sm uppercase">
                  {section.title}
                </h3>
              </div>
              
              <ul className="space-y-3">
                {(key === 'categories' && showAllCategories
                  ? categoriesData
                  : section.links
                ).filter(link => link && link.label)
                 .map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <TrackedLink 
                      to={link.path}
                      source={link.source}
                      medium="website"
                      campaign={link.campaign || `footer_${link.label.toLowerCase().replace(/\s+/g, '_')}`}
                      className="text-gray-600 hover:text-black transition-colors duration-200 text-sm block py-2 hover:font-medium"
                    >
                      {link.label}
                    </TrackedLink>
                  </li>
                ))}
                
                {/* View All Categories link */}
                {key === 'categories' && !showAllCategories && categoriesData.length > 10 && (
                  <li>
                    <button
                      onClick={() => setShowAllCategories(true)}
                      className="text-gray-500 hover:text-black transition-colors duration-200 text-sm block py-2 hover:font-medium w-full text-left"
                    >
                      View All {categoriesData.length} Categories →
                    </button>
                  </li>
                )}
                
                {/* Show Less link when all categories are shown */}
                {key === 'categories' && showAllCategories && categoriesData.length > 10 && (
                  <li>
                    <button
                      onClick={() => setShowAllCategories(false)}
                      className="text-gray-500 hover:text-black transition-colors duration-200 text-sm block py-2 hover:font-medium w-full text-left"
                    >
                      Show Less Categories
                    </button>
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 my-8 md:my-12"></div>

        {/* Newsletter & Contact */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 mb-12 md:mb-16">
          {/* Enhanced Newsletter Subscription */}
          <div className="space-y-4 md:space-y-6">
            <div>
              <h3 className="font-bold text-xl md:text-2xl text-black mb-2 md:mb-3">Stay Updated</h3>
              <p className="text-gray-600 mb-4 md:mb-6 max-w-md text-sm md:text-base">
                Get exclusive offers, industry insights, and platform updates delivered to your inbox
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <input
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    placeholder="Enter your email address"
                    className={`w-full px-4 py-3 bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 text-black placeholder-gray-500 transition-all ${
                      emailError 
                        ? "border-red-500 focus:border-red-500 focus:ring-red-200" 
                        : localStatus?.isSubscribed
                        ? "border-green-500 focus:border-green-500 focus:ring-green-200"
                        : "border-gray-300 focus:border-black focus:ring-gray-200"
                    }`}
                    disabled={toggleLoading}
                  />
                  {emailError && (
                    <p className="text-red-500 text-sm mt-1">{emailError}</p>
                  )}
                  
                  {/* Real-time subscription status */}
                  {!emailError && email && validateEmail(email) && (
                    <div className="mt-1">
                      {isChecking ? (
                        <p className="text-gray-500 text-sm">Checking subscription status...</p>
                      ) : localStatus?.exists === false ? (
                        <p className="text-blue-600 text-sm">✓ New email - ready to subscribe</p>
                      ) : localStatus?.isSubscribed ? (
                        <p className="text-green-600 text-sm">✓ Already subscribed to newsletter</p>
                      ) : localStatus?.exists === true && !localStatus?.isSubscribed ? (
                        <p className="text-yellow-600 text-sm">Previously unsubscribed - click to resubscribe</p>
                      ) : null}
                    </div>
                  )}
                </div>
                
                <button
                  type="submit"
                  disabled={toggleLoading || isChecking || !email || emailError || buttonState.disabled}
                  className={`px-6 py-3 text-white font-medium rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed ${buttonState.className}`}
                >
                  {toggleLoading || isChecking ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    buttonState.text
                  )}
                </button>
              </div>
              
              {/* Status Messages */}
              {localStatus?.isSubscribed && (
                <div className="p-3 border rounded-lg bg-green-50 border-green-200">
                  <p className="text-green-700 text-sm">
                    ✓ Subscribed to newsletter as {localStatus.email}
                  </p>
                  <button
                    onClick={handleUnsubscribe}
                    className="text-sm text-gray-600 hover:text-black mt-2 underline"
                    disabled={toggleLoading}
                  >
                    Click here to unsubscribe
                  </button>
                </div>
              )}
              
              {/* Privacy Notice */}
              <p className="text-gray-500 text-xs">
                By subscribing, you agree to our{" "}
                <a href="/privacy" className="text-gray-600 hover:text-black underline">
                  Privacy Policy
                </a>
                . One-click unsubscribe anytime.
              </p>
            </form>
            
            {/* Preference Toggle (Optional) */}
            <div className="pt-4 border-t border-gray-100">
              <details className="group">
                <summary className="flex items-center gap-2 text-sm text-gray-600 hover:text-black cursor-pointer">
                  <span>Email Preferences</span>
                  <FaChevronDown className="w-3 h-3 transition-transform group-open:rotate-180" />
                </summary>
                <div className="mt-3 space-y-3 text-sm text-gray-600">
                  <div>
                    <label className="block mb-2">Frequency:</label>
                    <select 
                      value={preferences.frequency}
                      onChange={(e) => {}}
                      className="w-full p-2 border border-gray-300 rounded bg-white"
                      disabled
                    >
                      <option value="weekly">Weekly</option>
                      <option value="bi-weekly">Bi-weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                </div>
              </details>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-4 md:space-y-6 mt-8 md:mt-0">
            <div>
              <h3 className="font-bold text-xl md:text-2xl text-black mb-2 md:mb-3">Contact Us</h3>
              <p className="text-gray-600 mb-4 md:mb-6 text-sm md:text-base">We're here to help you succeed</p>
            </div>
            <div className="space-y-4 md:space-y-6">
              <div className="hover:scale-[1.02] transition-transform duration-200">
                <div className="font-medium text-black mb-1 md:mb-2 text-base md:text-lg">Email</div>
                <div className="text-gray-700 text-base md:text-lg hover:text-black transition-colors">
                  support@Vorkanna.com
                </div>
              </div>
              <div className="hover:scale-[1.02] transition-transform duration-200">
                <div className="font-medium text-black mb-1 md:mb-2 text-base md:text-lg">Business Hours</div>
                <div className="text-gray-700 text-sm md:text-base">Monday - Friday, 9AM - 6PM EST</div>
              </div>
              <div className="hover:scale-[1.02] transition-transform duration-200">
                <div className="font-medium text-black mb-1 md:mb-2 text-base md:text-lg">Newsletter Support</div>
                <div className="text-gray-700 text-sm">Need help with your subscription? Email: newsletter@Vorkanna.com</div>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 my-6 md:my-8"></div>

        {/* Bottom Section */}
        <div className="flex flex-col lg:flex-row justify-between items-center gap-8 pt-6 md:pt-8">
          {/* Logo & Copyright */}
          <div className="text-center lg:text-left">
            <div className="mb-3 md:mb-4">
              <TrackedLink 
                to="/"
                className="text-3xl md:text-5xl font-black text-black transition-colors tracking-tighter"
              >
                Vorkanna
              </TrackedLink>
            </div>
            
            <p className="text-gray-500 text-xs md:text-sm">
              © {new Date().getFullYear()} Vorkanna. All rights reserved.
            </p>
          </div>

          {/* Social Links */}
          <div className="flex flex-col items-center lg:items-end gap-4 md:gap-6">
            <div className="flex items-center gap-6 md:gap-8">
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-black hover:text-gray-700 hover:scale-110 active:scale-95 transition-transform duration-200"
              >
                <FaFacebook size={20} className="md:size-6" />
              </a>
              <a 
                href="https://twitter.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-black hover:text-gray-700 hover:scale-110 active:scale-95 transition-transform duration-200"
              >
                <FaXTwitter size={20} className="md:size-6" />
              </a>
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-black hover:text-gray-700 hover:scale-110 active:scale-95 transition-transform duration-200"
              >
                <FaInstagram size={20} className="md:size-6" />
              </a>
              <a 
                href="https://linkedin.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-black hover:text-gray-700 hover:scale-110 active:scale-95 transition-transform duration-200"
              >
                <FaLinkedin size={20} className="md:size-6" />
              </a>
            </div>
            <p className="text-gray-500 text-xs text-center lg:text-right">
              Connect with us on social media
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;