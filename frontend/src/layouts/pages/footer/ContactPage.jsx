import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SeoWrapper } from '../../../components/SeoWrapper';
import { Mail, Phone, MapPin, ArrowRight, ArrowUpRight, Globe, AlertCircle } from 'lucide-react';
import { contactAPI } from '../../../api/contact';
import { validatePhoneNumber, countryCodes, phoneInputMask, getPhoneExamples } from '../../../utils/phoneValidation';

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [phoneValidation, setPhoneValidation] = useState({ 
    valid: false, 
    message: '',
    showError: false
  });
  const [showCountryCodes, setShowCountryCodes] = useState(false);
  const [phoneExamples] = useState(getPhoneExamples());
  
  // Track if form has been submitted at least once
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Validate phone number on change
  useEffect(() => {
    if (formData.phone) {
      const validation = validatePhoneNumber(formData.phone);
      setPhoneValidation({
        ...validation,
        showError: formSubmitted && !validation.valid // Only show error after form submission
      });
    } else {
      setPhoneValidation({ 
        valid: false, 
        message: 'Phone number is required',
        example: '+1234567890',
        showError: formSubmitted // Only show error after form submission
      });
    }
  }, [formData.phone, formSubmitted]);

  const validateForm = () => {
    setFormSubmitted(true); // Mark form as submitted
    setSubmitError('');
    
    let isValid = true;
    let errorMessage = '';
    
    // Check if required fields are filled
    if (!formData.name.trim()) {
      errorMessage = 'Name is required';
      isValid = false;
    } else if (!formData.email.trim()) {
      errorMessage = 'Email is required';
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errorMessage = 'Please enter a valid email address';
      isValid = false;
    } else if (!formData.phone || formData.phone.trim() === '' || formData.phone === '+') {
      errorMessage = 'Phone number is required';
      isValid = false;
    } else if (!phoneValidation.valid) {
      errorMessage = phoneValidation.message || 'Invalid phone number';
      isValid = false;
    } else if (!formData.message.trim()) {
      errorMessage = 'Message is required';
      isValid = false;
    }
    
    if (!isValid) {
      setSubmitError(errorMessage);
    }
    
    return isValid;
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value;
    // Apply input mask
    const maskedValue = phoneInputMask(value);
    setFormData(prev => ({
      ...prev,
      phone: maskedValue
    }));
    
    // Clear submit error when user starts typing
    if (submitError) setSubmitError('');
  };

  const handleSelectCountryCode = (code) => {
    if (!formData.phone.startsWith('+')) {
      setFormData(prev => ({
        ...prev,
        phone: code
      }));
    } else {
      // Replace existing country code
      setFormData(prev => ({
        ...prev,
        phone: code + prev.phone.replace(/^\+\d{1,4}/, '')
      }));
    }
    
    // Clear submit error when user selects country code
    if (submitError) setSubmitError('');
    
    setShowCountryCodes(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage('');
    setSubmitError('');
    setIsSuccess(false);

    try {
      // Format phone number before sending
      const submissionData = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        message: formData.message.trim()
      };

      // Submit the form
      const response = await contactAPI.submitContact(submissionData);

      if (response.success) {
        // Success
        setSubmitMessage(response.message || 'Thank you! Your message has been sent successfully.');
        setIsSuccess(true);
        
        // Reset form and submission state
        setFormData({ name: '', email: '', phone: '', message: '' });
        setFormSubmitted(false);
        setPhoneValidation({ 
          valid: false, 
          message: '',
          showError: false
        });
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          setSubmitMessage('');
          setIsSuccess(false);
        }, 5000);
      } else {
        // Server returned error
        setSubmitError(response.message || 'Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('Contact form error:', error);
      
      // Handle specific error types
      if (error.message && error.message.includes('Too many submissions')) {
        setSubmitError('Too many attempts. Please try again in an hour.');
      } else if (error.message && error.message.includes('Network error')) {
        setSubmitError('Network error. Please check your internet connection.');
      } else {
        setSubmitError(error.message || 'Failed to send message. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear submit error when user starts typing
    if (submitError) setSubmitError('');
  };

  // Helper function to check if field has error (only after submission)
  const getFieldError = (fieldName) => {
    if (!formSubmitted) return null;
    
    switch(fieldName) {
      case 'name':
        return !formData.name.trim() ? 'Name is required' : null;
      case 'email':
        if (!formData.email.trim()) return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return 'Please enter a valid email address';
        return null;
      case 'message':
        return !formData.message.trim() ? 'Message is required' : null;
      default:
        return null;
    }
  };

  // Check if field should show error styling
  const shouldShowFieldError = (fieldName) => {
    return formSubmitted && getFieldError(fieldName);
  };

  const contactStructuredData = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "name": "Contact Vorkanna Support",
    "description": "Get in touch with Vorkanna support team. Contact us for platform assistance, partnership inquiries, or general questions.",
    "contactPoint": [
      {
        "@type": "ContactPoint",
        "contactType": "customer service",
        "telephone": "+1-555-123-4567",
        "email": "support@vorkanna.com",
        "availableLanguage": ["English"],
        "hoursAvailable": {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          "opens": "09:00",
          "closes": "18:00",
          "timeZone": "America/New_York"
        }
      }
    ],
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "123 Business Avenue, Suite 100",
      "addressLocality": "San Francisco",
      "addressRegion": "CA",
      "postalCode": "94107",
      "addressCountry": "US"
    }
  };

  return (
    <SeoWrapper
      title="Contact Vorkanna Support - Get Help & Assistance"
      description="Contact Vorkanna support team for platform assistance, partnership inquiries, or general questions. We're here to help you succeed."
      keywords="contact Vorkanna, support contact, customer service, help desk, platform assistance, partnership inquiries"
      ogTitle="Contact Vorkanna Support Team"
      ogDescription="Get in touch with Vorkanna support for platform assistance, partnership inquiries, or general questions. We respond within 24 hours."
      ogImage={`${typeof window !== 'undefined' ? window.location.origin : 'https://vorkanna.com'}/images/og-contact.jpg`}
      structuredData={contactStructuredData}
      breadcrumb={[
        { name: "Home", url: "/" },
        { name: "Contact Us", url: "/contact" }
      ]}
    >
      <div className="min-h-screen bg-white text-black font-sans antialiased">
        <main className="max-w-6xl mx-auto px-4 sm:px-8 py-12 sm:py-24">
          
          {/* Header Section */}
          <section className="mb-12 sm:mb-20 border-b-2 border-black pb-8 sm:pb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-[3px] w-12 bg-black"></div>
              <span className="text-xs uppercase tracking-widest font-bold">Contact Us</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tighter mb-6 uppercase">
              Get in Touch
            </h1>
            <p className="text-lg text-zinc-800 max-w-xl font-medium leading-relaxed">
              Have questions? Fill out the form below and our team will respond within 24 hours.
            </p>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-20">
            
            {/* Left Side: Contact Form */}
            <div className="lg:col-span-7">
              <form onSubmit={handleSubmit} className="space-y-8 sm:space-y-12">
                {/* Required Field Indicator - ALWAYS VISIBLE */}
                <div className="text-xs text-red-600 mb-4">
                  * All fields are required
                </div>

                {/* Full Name */}
                <div className="space-y-1">
                  <div className={`border-b-2 py-2 transition-colors ${
                    shouldShowFieldError('name') 
                      ? 'border-red-500 focus-within:border-red-500' 
                      : 'border-zinc-300 focus-within:border-black'
                  }`}>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder="Your Name"
                      className={`w-full bg-transparent outline-none text-sm font-medium placeholder:text-zinc-400 ${
                        shouldShowFieldError('name') ? 'text-red-600' : ''
                      }`}
                      disabled={isSubmitting}
                    />
                  </div>
                  {getFieldError('name') && (
                    <div className="flex items-center gap-1 text-xs text-red-600 animate-fadeIn">
                      <AlertCircle className="w-3 h-3" />
                      {getFieldError('name')}
                    </div>
                  )}
                </div>

                {/* Email Address */}
                <div className="space-y-1">
                  <div className={`border-b-2 py-2 transition-colors ${
                    shouldShowFieldError('email') 
                      ? 'border-red-500 focus-within:border-red-500' 
                      : 'border-zinc-300 focus-within:border-black'
                  }`}>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="your.email@example.com"
                      className={`w-full bg-transparent outline-none text-sm font-medium placeholder:text-zinc-400 ${
                        shouldShowFieldError('email') ? 'text-red-600' : ''
                      }`}
                      disabled={isSubmitting}
                    />
                  </div>
                  {getFieldError('email') && (
                    <div className="flex items-center gap-1 text-xs text-red-600 animate-fadeIn">
                      <AlertCircle className="w-3 h-3" />
                      {getFieldError('email')}
                    </div>
                  )}
                </div>

                {/* Phone Number with Country Code Selector - REQUIRED */}
                <div className="space-y-2">
                  <div className={`border-b-2 py-2 transition-colors ${
                    phoneValidation.showError
                      ? 'border-red-500 focus-within:border-red-500' 
                      : 'border-zinc-300 focus-within:border-black'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold uppercase tracking-widest">
                        Phone Number *
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowCountryCodes(!showCountryCodes)}
                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <Globe className="w-3 h-3" />
                        {showCountryCodes ? 'Hide Codes' : 'Select Country Code'}
                      </button>
                    </div>
                    
                    {/* Country Code Selector */}
                    {showCountryCodes && (
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
                        <p className="text-xs text-gray-600 mb-2">Select your country code:</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                          {countryCodes.map((country) => (
                            <button
                              key={country.code}
                              type="button"
                              onClick={() => handleSelectCountryCode(country.code)}
                              className="text-xs p-2 hover:bg-gray-200 rounded border text-left transition-colors"
                            >
                              <div className="font-bold">{country.code}</div>
                              <div className="text-gray-600 truncate">{country.country}</div>
                              <div className="text-green-600 text-xs truncate">{country.example}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="relative">
                      <input
                        type="text"
                        name="phone"
                        value={formData.phone}
                        onChange={handlePhoneChange}
                        required
                        placeholder="+1234567890"
                        className={`w-full bg-transparent outline-none text-sm font-medium placeholder:text-zinc-400 ${
                          phoneValidation.showError ? 'text-red-600' : ''
                        }`}
                        disabled={isSubmitting}
                      />
                      {phoneValidation.valid && phoneValidation.formatted && (
                        <div className="absolute right-0 top-1/2 transform -translate-y-1/2 text-xs text-green-600 font-medium">
                          {phoneValidation.formatted}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Phone Validation Error Message - Only show after form submission */}
                  {phoneValidation.showError && (
                    <div className="flex items-center gap-1 text-xs text-red-600 animate-fadeIn">
                      <AlertCircle className="w-3 h-3" />
                      {phoneValidation.message}
                      {phoneValidation.example && (
                        <span className="text-gray-600 ml-1">Example: {phoneValidation.example}</span>
                      )}
                    </div>
                  )}
                  
                  {/* Phone Validation Success Message */}
                  {phoneValidation.valid && !phoneValidation.showError && (
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      ✓ {phoneValidation.message}
                    </div>
                  )}
                </div>

                {/* Message */}
                <div className="space-y-1">
                  <div className={`border-b-2 py-2 transition-colors ${
                    shouldShowFieldError('message') 
                      ? 'border-red-500 focus-within:border-red-500' 
                      : 'border-zinc-300 focus-within:border-black'
                  }`}>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2">
                      Your Message *
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={6}
                      placeholder="Tell us how we can help you..."
                      className={`w-full bg-transparent outline-none text-sm font-medium placeholder:text-zinc-400 resize-none ${
                        shouldShowFieldError('message') ? 'text-red-600' : ''
                      }`}
                      disabled={isSubmitting}
                    />
                  </div>
                  {getFieldError('message') && (
                    <div className="flex items-center gap-1 text-xs text-red-600 animate-fadeIn">
                      <AlertCircle className="w-3 h-3" />
                      {getFieldError('message')}
                    </div>
                  )}
                </div>

                {/* Form Submission Error Message */}
                {submitError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded animate-fadeIn">
                    <div className="flex items-center gap-2 text-red-700 font-medium">
                      <AlertCircle className="w-4 h-4" />
                      {submitError}
                    </div>
                  </div>
                )}

                {/* Success Message */}
                {submitMessage && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded animate-fadeIn">
                    <p className="text-green-700 font-medium">{submitMessage}</p>
                  </div>
                )}

                {/* Submit Button */}
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="group flex items-center justify-center gap-4 bg-black text-white w-full sm:w-auto px-8 sm:px-12 py-4 sm:py-5 text-xs font-bold uppercase tracking-[0.2em] hover:bg-zinc-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <span>Sending...</span>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      </>
                    ) : (
                      <>
                        Send Message
                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-2 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
                
                {/* Privacy Notice - ALWAYS VISIBLE */}
                <p className="text-xs text-zinc-500 pt-4">
                  By submitting this form, you agree to our{' '}
                  <Link to="/privacy" className="text-black hover:underline font-medium">
                    Privacy Policy
                  </Link>
                  . We'll never share your information with third parties.
                  <span className="block mt-1">
                    Your phone number is required for contact purposes only.
                  </span>
                </p>
              </form>
            </div>

            {/* Right Side: Contact Information - ALWAYS VISIBLE */}
            <div className="lg:col-span-5 space-y-12">
              
              <section className="space-y-8 sm:space-y-12">
                <h2 className="text-xs font-bold uppercase tracking-[0.3em] border-b-2 border-black pb-2">
                  Contact Information
                </h2>
                
                <div className="flex gap-4 sm:gap-6 items-start">
                  <Mail className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 text-black" />
                  <div>
                    <h3 className="text-sm font-bold uppercase mb-1">Email</h3>
                    <p className="text-sm text-zinc-800 font-bold mb-1">
                      support@vorkanna.com
                    </p>
                    <span className="text-xs text-black font-medium">
                      Response within 24 hours
                    </span>
                  </div>
                </div>

                <div className="flex gap-4 sm:gap-6 items-start">
                  <Phone className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 text-black" />
                  <div>
                    <h3 className="text-sm font-bold uppercase mb-1">Business Phone</h3>
                    <p className="text-sm text-zinc-800 font-bold mb-1">
                      +1 (555) 123-4567
                    </p>
                    <span className="text-xs text-black font-medium">
                      MON — FRI / 9AM — 6PM EST
                    </span>
                  </div>
                </div>

                <div className="flex gap-4 sm:gap-6 items-start">
                  <MapPin className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 text-black" />
                  <div>
                    <h3 className="text-sm font-bold uppercase mb-1">Location</h3>
                    <p className="text-sm text-zinc-800 font-medium leading-relaxed">
                      123 Business Avenue, Suite 100<br />
                      San Francisco, CA 94107<br />
                      United States
                    </p>
                  </div>
                </div>
              </section>

              {/* Why We Need Your Phone - ALWAYS VISIBLE */}
              <section className="p-4 border border-blue-200 rounded-lg">
                <h3 className="text-sm font-bold uppercase mb-2">
                  Why do we need your phone number?
                </h3>
                <ul className="text-sm space-y-1">
                  <li>• Faster response time for urgent matters</li>
                  <li>• Verification of your identity</li>
                  <li>• International support across time zones</li>
                  <li>• Backup contact method if email fails</li>
                </ul>
              </section>

              {/* Quick Links - ALWAYS VISIBLE */}
              <section className="pt-8 sm:pt-10 border-t-2 border-black space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-[0.3em] mb-4 sm:mb-6">
                  Quick Links
                </h2>
                <Link 
                  to="/help" 
                  className="flex items-center justify-between group py-3 border-b border-zinc-300 hover:border-black transition-all"
                >
                  <span className="text-xs font-bold uppercase">Help Center</span>
                  <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
                </Link>
                <Link 
                  to="/faq" 
                  className="flex items-center justify-between group py-3 border-b border-zinc-300 hover:border-black transition-all"
                >
                  <span className="text-xs font-bold uppercase">FAQ</span>
                  <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
                </Link>
                <Link 
                  to="/support" 
                  className="flex items-center justify-between group py-3 border-b border-zinc-300 hover:border-black transition-all"
                >
                  <span className="text-xs font-bold uppercase">Support</span>
                  <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
                </Link>
              </section>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-16 sm:mt-32 pt-8 sm:pt-10 border-t-2 border-black">
            <Link to="/" className="text-xs font-bold uppercase tracking-widest text-black hover:underline">
              [ Return to Home ]
            </Link>
          </div>
        </main>
      </div>
    </SeoWrapper>
  );
};

export default ContactPage;