import React, { useState } from "react";
import {
  FaFacebook,
  FaInstagram,
  FaLinkedin,
  FaXTwitter,
  FaChevronDown,
  FaChevronUp,
  FaCheck,
  FaCircleExclamation  // Correct warning icon
} from 'react-icons/fa6';
import TrackedLink from '../components/TrackedLink';
import { motion, AnimatePresence } from "framer-motion";
import { useParentCategories } from "../hooks/useCategories";
import { useSubscribe } from "../hooks/useSubscribe";

const Footer = () => {
  const [openDropdown, setOpenDropdown] = useState(null);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [email, setEmail] = useState("");
  const [preferences, setPreferences] = useState({
    frequency: "weekly",
    categories: ["tech", "design"]
  });

  // Fetch categories from database
  const { data: categoriesData = [], isLoading: categoriesLoading } = useParentCategories();
  
  // Use subscription hook
  const { 
    mutateAsync: subscribe, // Changed from subscribe to mutateAsync
    isLoading: subscribeLoading, 
    isSuccess: subscribeSuccess,
    error: subscribeError,
    reset: resetSubscription
  } = useSubscribe();

  // Limit to 10 categories for initial display
  const initialCategories = categoriesData.slice(0, 10);
  const remainingCategories = categoriesData.slice(10);

  const footerLinks = {
    categories: {
      title: "Categories",
      links: initialCategories.map(category => ({
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
      ]
    },
  };

  const toggleDropdown = (section) => {
    setOpenDropdown(openDropdown === section ? null : section);
  };

  // Handle subscription
  const handleSubscribe = async (e) => {
    e.preventDefault();
    
    if (!email || !validateEmail(email)) {
      return;
    }
    
    try {
      // Use mutateAsync if your hook returns it
      await subscribe({ 
        email, 
        preferences,
        source: "footer" 
      });
      
      // Reset form on success
      if (subscribeSuccess) {
        setTimeout(() => {
          setEmail("");
          resetSubscription();
        }, 3000);
      }
    } catch (error) {
      console.error("Subscription error:", error);
    }
  };

  // Validate email
  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  // Animation variants
  const dropdownVariants = {
    collapsed: { height: 0, opacity: 0 },
    expanded: { height: "auto", opacity: 1 }
  };

  const chevronVariants = {
    up: { rotate: 0 },
    down: { rotate: 180 }
  };

  const listItemVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.05 }
    })
  };

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
                <motion.span
                  variants={chevronVariants}
                  animate={openDropdown === key ? "down" : "up"}
                  initial="up"
                  className="text-gray-500"
                >
                  <FaChevronDown />
                </motion.span>
              </button>
              
              <AnimatePresence>
                {openDropdown === key && (
                  <motion.div
                    initial="collapsed"
                    animate="expanded"
                    exit="collapsed"
                    variants={dropdownVariants}
                    className="overflow-hidden"
                  >
                    <ul className="pb-4 px-2 space-y-2">
                      {section.links.map((link, linkIndex) => (
                        <motion.li
                          key={linkIndex}
                          custom={linkIndex}
                          initial="hidden"
                          animate="visible"
                          exit="hidden"
                          variants={listItemVariants}
                        >
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
                        </motion.li>
                      ))}
                      
                      {key === 'categories' && categoriesData.length > 10 && (
                        <motion.li
                          custom={section.links.length}
                          initial="hidden"
                          animate="visible"
                          exit="hidden"
                          variants={listItemVariants}
                        >
                          <button
                            onClick={() => {
                              setShowAllCategories(!showAllCategories);
                              setOpenDropdown(key);
                            }}
                            className="text-gray-600 hover:text-black transition-colors duration-150 text-sm block py-2 px-2 hover:bg-gray-50 rounded w-full text-left"
                          >
                            {showAllCategories ? "Show Less" : `View All Categories (${categoriesData.length})`}
                          </button>
                        </motion.li>
                      )}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* Desktop Grid Layout (md and above) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="hidden md:grid md:grid-cols-2 lg:grid-cols-5 gap-8 mb-16"
        >
          {Object.entries(footerLinks).map(([key, section], index) => (
            <motion.div 
              key={key} 
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-black mb-6 tracking-wide text-sm uppercase">
                  {section.title}
                </h3>
                {key === 'categories' && categoriesData.length > 10 && (
                  <button
                    onClick={() => setShowAllCategories(!showAllCategories)}
                    className="text-xs text-gray-500 hover:text-black mb-6 flex items-center gap-1 transition-colors"
                  >
                    {showAllCategories ? (
                      <>
                        <FaChevronUp className="w-3 h-3" />
                        Show Less
                      </>
                    ) : (
                      <>
                        View All
                        <FaChevronDown className="w-3 h-3" />
                      </>
                    )}
                  </button>
                )}
              </div>
              
              <ul className="space-y-3">
                {(key === 'categories' && showAllCategories
                  ? categoriesData
                  : section.links
                ).map((link, linkIndex) => (
                  <motion.li 
                    key={linkIndex}
                    whileHover={{ x: 4 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <TrackedLink 
                      to={link.path}
                      source={link.source}
                      medium="website"
                      campaign={link.campaign || `footer_${link.label.toLowerCase().replace(/\s+/g, '_')}`}
                      className="text-gray-600 hover:text-black transition-colors duration-200 text-sm block py-2 hover:font-medium"
                    >
                      {link.label}
                    </TrackedLink>
                  </motion.li>
                ))}
                
                {key === 'categories' && !showAllCategories && categoriesData.length > 10 && (
                  <motion.li
                    whileHover={{ x: 4 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <button
                      onClick={() => setShowAllCategories(true)}
                      className="text-gray-500 hover:text-black transition-colors duration-200 text-sm block py-2 hover:font-medium w-full text-left"
                    >
                      View All {categoriesData.length} Categories →
                    </button>
                  </motion.li>
                )}
              </ul>
            </motion.div>
          ))}
        </motion.div>

        {/* Divider */}
        <motion.div 
          className="border-t border-gray-200 my-8 md:my-12"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        ></motion.div>

        {/* Newsletter & Contact */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 mb-12 md:mb-16">
          {/* Enhanced Newsletter Subscription */}
          <motion.div 
            className="space-y-4 md:space-y-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <div>
              <h3 className="font-bold text-xl md:text-2xl text-black mb-2 md:mb-3">Stay Updated</h3>
              <p className="text-gray-600 mb-4 md:mb-6 max-w-md text-sm md:text-base">
                Get exclusive offers, industry insights, and platform updates delivered to your inbox
              </p>
            </div>
            
            <form onSubmit={handleSubscribe} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 max-w-lg">
                <div className="flex-1 relative">
                  <motion.input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      resetSubscription();
                    }}
                    placeholder="Enter your email address"
                    className={`w-full px-4 md:px-5 py-3 md:py-3.5 bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 text-black placeholder-gray-500 text-sm md:text-base transition-all duration-200 ${
                      subscribeError 
                        ? "border-red-500 focus:border-red-500 focus:ring-red-200" 
                        : "border-gray-300 focus:border-black focus:ring-gray-200"
                    }`}
                    disabled={subscribeLoading || subscribeSuccess}
                    whileFocus={{ scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    required
                  />
                  
                  {subscribeSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    >
                      <FaCheck className="w-5 h-5 text-green-500" />
                    </motion.div>
                  )}
                  
                  {subscribeError && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    >
                      <FaCircleExclamation className="w-5 h-5 text-red-500" />
                    </motion.div>
                  )}
                </div>
                
                <motion.button
                  type="submit"
                  disabled={subscribeLoading || subscribeSuccess || !validateEmail(email)}
                  className={`px-6 md:px-8 py-3 md:py-3.5 text-white font-medium rounded-lg transition-all duration-200 text-sm md:text-base ${
                    subscribeLoading 
                      ? "bg-gray-400 cursor-not-allowed" 
                      : subscribeSuccess 
                        ? "bg-green-600 hover:bg-green-700" 
                        : "bg-black hover:bg-gray-900"
                  }`}
                  whileHover={!subscribeLoading && !subscribeSuccess ? { scale: 1.05 } : {}}
                  whileTap={!subscribeLoading && !subscribeSuccess ? { scale: 0.95 } : {}}
                >
                  {subscribeLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Subscribing...
                    </span>
                  ) : subscribeSuccess ? (
                    <span className="flex items-center justify-center gap-2">
                      <FaCheck className="w-4 h-4" />
                      Subscribed!
                    </span>
                  ) : (
                    "Subscribe"
                  )}
                </motion.button>
              </div>
              
              {/* Status Messages */}
              {subscribeSuccess && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="p-3 bg-green-50 border border-green-200 rounded-lg"
                >
                  <p className="text-sm text-green-700">
                    ✅ Please check your email to verify your subscription!
                  </p>
                </motion.div>
              )}
              
              {subscribeError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="p-3 bg-red-50 border border-red-200 rounded-lg"
                >
                  <p className="text-sm text-red-700">
                    ❌ {subscribeError.message || "Failed to subscribe. Please try again."}
                  </p>
                </motion.div>
              )}
              
              <p className="text-gray-500 text-xs">
                By subscribing, you agree to our{" "}
                <TrackedLink 
                  to="/privacy" 
                  source="footer" 
                  medium="website" 
                  campaign="privacy_footer"
                  className="text-gray-600 hover:text-black underline"
                >
                  Privacy Policy
                </TrackedLink>
                {" "}and understand you can unsubscribe at any time.
              </p>
            </form>
            
            {/* Preference Toggle (Optional) */}
            <div className="pt-4 border-t border-gray-100">
              <details className="group">
                <summary className="flex items-center gap-2 text-sm text-gray-600 hover:text-black cursor-pointer">
                  <span>Email Preferences</span>
                  <FaChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="mt-3 space-y-3 text-sm text-gray-600">
                  <div>
                    <label className="block mb-2">Frequency:</label>
                    <select 
                      value={preferences.frequency}
                      onChange={(e) => setPreferences({...preferences, frequency: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded bg-white"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="bi-weekly">Bi-weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                </div>
              </details>
            </div>
          </motion.div>

          {/* Contact Info */}
          <motion.div 
            className="space-y-4 md:space-y-6 mt-8 md:mt-0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <div>
              <h3 className="font-bold text-xl md:text-2xl text-black mb-2 md:mb-3">Contact Us</h3>
              <p className="text-gray-600 mb-4 md:mb-6 text-sm md:text-base">We're here to help you succeed</p>
            </div>
            <div className="space-y-4 md:space-y-6">
              <motion.div
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="font-medium text-black mb-1 md:mb-2 text-base md:text-lg">Email</div>
                <div className="text-gray-700 text-base md:text-lg hover:text-black transition-colors">
                  support@vorkana.com
                </div>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="font-medium text-black mb-1 md:mb-2 text-base md:text-lg">Business Hours</div>
                <div className="text-gray-700 text-sm md:text-base">Monday - Friday, 9AM - 6PM EST</div>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="font-medium text-black mb-1 md:mb-2 text-base md:text-lg">Newsletter Support</div>
                <div className="text-gray-700 text-sm">Need help with your subscription? Email: newsletter@vorkana.com</div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Divider */}
        <motion.div 
          className="border-t border-gray-200 my-6 md:my-8"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        ></motion.div>

        {/* Bottom Section */}
        <div className="flex flex-col lg:flex-row justify-between items-center gap-8 pt-6 md:pt-8">
          {/* Logo & Copyright */}
          <motion.div 
            className="text-center lg:text-left"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <div className="mb-3 md:mb-4">
              <TrackedLink 
                to="/"
                source="footer"
                medium="website"
                campaign="logo_footer"
                className="text-3xl md:text-5xl font-black text-black hover:text-gray-800 transition-colors duration-200 tracking-tighter"
              >
                VORKANA
              </TrackedLink>
            </div>
            
            <p className="text-gray-500 text-xs md:text-sm">
              © {new Date().getFullYear()} Vorkana. All rights reserved.
            </p>
            <p className="text-gray-400 text-xs mt-1">
              <TrackedLink 
                to="/newsletter/unsubscribe" 
                source="footer" 
                medium="website" 
                campaign="unsubscribe_footer"
                className="hover:text-gray-600"
              >
                Unsubscribe from newsletter
              </TrackedLink>
            </p>
          </motion.div>

          {/* Social Links */}
          <motion.div 
            className="flex flex-col items-center lg:items-end gap-4 md:gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.6 }}
          >
            <div className="flex items-center gap-6 md:gap-8">
              <motion.a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-black hover:text-gray-700"
                whileHover={{ scale: 1.2, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
              >
                <FaFacebook size={20} className="md:size-6" />
              </motion.a>
              <motion.a 
                href="https://twitter.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-black hover:text-gray-700"
                whileHover={{ scale: 1.2, rotate: -5 }}
                whileTap={{ scale: 0.9 }}
              >
                <FaXTwitter size={20} className="md:size-6" />
              </motion.a>
              <motion.a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-black hover:text-gray-700"
                whileHover={{ scale: 1.2, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
              >
                <FaInstagram size={20} className="md:size-6" />
              </motion.a>
              <motion.a 
                href="https://linkedin.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-black hover:text-gray-700"
                whileHover={{ scale: 1.2, rotate: -5 }}
                whileTap={{ scale: 0.9 }}
              >
                <FaLinkedin size={20} className="md:size-6" />
              </motion.a>
            </div>
            <p className="text-gray-500 text-xs text-center lg:text-right">
              Connect with us on social media
            </p>
          </motion.div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;