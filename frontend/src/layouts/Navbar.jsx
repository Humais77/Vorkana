import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom"; // Added useLocation
import { useAuthStore } from "../store/useAuthStore";
import { useLogout } from "../hooks/useAuth";
import { useSwitchRole } from "../hooks/useUser";
import { Search, User, Globe, LogOut, Settings, Package, ChevronDown, Store, Menu, X, Home, Briefcase, AlertCircle, Check, ArrowRight } from "lucide-react";
import Logo from "../assets/logo.png";
import Logo2 from "../assets/logo1.png";
import { motion, AnimatePresence } from "framer-motion";

const Navbar = ({ onSigninClick, onSignupClick }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [switchDialogOpen, setSwitchDialogOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation(); // Get current route

  const { isAuthenticated, user, loading } = useAuthStore();
  const logoutMutation = useLogout();
  const switchRoleMutation = useSwitchRole();

  // Check if current page is home page
  const isHomePage = location.pathname === "/";

  // Disable scrolling when mobile menu or dialog is open
  useEffect(() => {
    if (mobileMenuOpen || switchDialogOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen, switchDialogOpen]);

  // Handle scroll to show/hide search - ONLY ON HOME PAGE
  useEffect(() => {
    const handleScroll = () => {
      // Only apply scroll behavior on home page
      if (!isHomePage) {
        setShowSearch(false);
        setScrolled(window.scrollY > 100);
        return;
      }

      if (window.scrollY > 100) {
        setShowSearch(true);
        setScrolled(true);
      } else {
        setShowSearch(false);
        setScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);

    // Reset scroll state when leaving home page
    if (!isHomePage) {
      setShowSearch(false);
      setScrolled(false);
    }

    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHomePage]); // Re-run when route changes

  // Show search bar by default on non-home pages (or adjust as needed)
  useEffect(() => {
    if (!isHomePage) {
      // You can choose to always show search on non-home pages
      // Or keep it hidden - adjust based on your preference
      setShowSearch(true); // Always show on other pages
      setScrolled(true); // Treat as scrolled on other pages
    } else {
      setShowSearch(false); // Hide initially on home
      setScrolled(false); // Not scrolled initially
    }
  }, [isHomePage]);

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      setMenuOpen(false);
      setMobileMenuOpen(false);
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleSwitchToSelling = async () => {
    try {
      await switchRoleMutation.mutateAsync('seller');
      setSwitchDialogOpen(false);
      setMenuOpen(false);
      setMobileMenuOpen(false);
      navigate('/seller/dashboard');
    } catch (error) {
      console.error("Role switch failed:", error);
    }
  };

  const handleMobileMenuClick = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const openSwitchDialog = () => {
    setSwitchDialogOpen(true);
  };

  // Animation variants for hamburger and profile dropdown only
  const iconRotate = {
    open: { rotate: 180 },
    closed: { rotate: 0 }
  };

  const mobileMenuAnimation = {
    hidden: { x: "-100%" },
    visible: { x: 0, transition: { duration: 0.3, ease: "easeOut" } },
    exit: { x: "-100%", transition: { duration: 0.3, ease: "easeIn" } }
  };

  const overlayAnimation = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3 } },
    exit: { opacity: 0, transition: { duration: 0.3 } }
  };

  const dropdownAnimation = {
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.15, ease: "easeIn" } }
  };

  const modalAnimation = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: "easeOut" } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15, ease: "easeIn" } }
  };

  if (loading) {
    return (
      <nav className="w-full bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="h-6 bg-gray-200 animate-pulse rounded"></div>
        </div>
      </nav>
    );
  }

  return (
    <>
      {/* Main Navbar */}
      <nav className="w-full bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left Section: Logo + Search (Desktop) */}
            <div className="flex items-center space-x-6 flex-1">
              {/* Mobile Hamburger Menu with animation */}
              <button
                onClick={handleMobileMenuClick}
                className="lg:hidden p-2 text-gray-600 hover:text-blue-600 transition-colors duration-200"
              >
                <motion.div
                  animate={mobileMenuOpen ? "open" : "closed"}
                  variants={iconRotate}
                  transition={{ duration: 0.3 }}
                >
                  {mobileMenuOpen ? (
                    <X className="w-6 h-6" />
                  ) : (
                    <Menu className="w-6 h-6" />
                  )}
                </motion.div>
              </button>

              {/* Logo */}
              <Link to="/" className="flex items-center shrink-0 gap-2">
                <img
                  src={Logo2}
                  alt="Vorkana Logo"
                  className="h-7 lg:h-8 w-auto"
                />
                <span className="text-lg lg:text-xl font-bold text-gray-800">
                  Vorkana
                </span>
              </Link>

              {/* Search Bar - Desktop */}
              {/* Show search differently based on page */}
              {isHomePage ? (
                // Home page: show only when scrolled
                showSearch && (
                  <div className="hidden lg:block flex-1 max-w-2xl">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search for services, freelancers, or categories..."
                        className="w-full px-4 py-2.5 pl-12 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      />
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                )
              ) : (
                // Other pages: always show search (or you can adjust this)
                <div className="hidden lg:block flex-1 max-w-2xl">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search for services, freelancers, or categories..."
                      className="w-full px-4 py-2.5 pl-12 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    />
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  </div>
                </div>
              )}
            </div>

            {/* Middle Section: Explore Dropdown (Desktop only) */}
            <div className="hidden lg:block mx-6">
              <div className="relative">
                <button
                  onClick={() => setExploreOpen(!exploreOpen)}
                  className="flex items-center space-x-2 px-4 py-2.5 text-gray-700 hover:text-blue-600 rounded-lg hover:bg-gray-50 transition-all duration-200"
                >
                  <Globe className="w-5 h-5" />
                  <span className="font-medium">Explore</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${exploreOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Explore Dropdown Menu */}
                {exploreOpen && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                    <div className="p-4">
                      {/* Categories Heading with Link */}
                      <Link
                        to="/categories"
                        onClick={() => setExploreOpen(false)}
                        className="block mb-3 text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors duration-200"
                      >
                        Categories
                      </Link>
                      <Link
                        to="/all-gigs"
                        className="px-4 py-2 text-gray-700 hover:text-green-600 transition-colors"
                      >
                        Browse All Gigs
                      </Link>
                      <div className="space-y-1 mb-4">
                        {['Web Development', 'Graphic Design', 'Digital Marketing', 'Writing & Translation', 'Video & Animation'].map((category) => (
                          <Link
                            key={category}
                            to={`/categories/${category.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`}
                            onClick={() => setExploreOpen(false)}
                            className="block px-3 py-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-md text-sm transition-all duration-200"
                          >
                            {category}
                          </Link>
                        ))}
                      </div>

                      {/* Services Heading with Link */}
                      <Link
                        to="/services"
                        onClick={() => setExploreOpen(false)}
                        className="block mb-3 text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors duration-200"
                      >
                        Services
                      </Link>
                      <div className="space-y-1">
                        <Link
                          to="/services/popular"
                          onClick={() => setExploreOpen(false)}
                          className="block px-3 py-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-md text-sm transition-all duration-200"
                        >
                          Popular Services
                        </Link>
                        <Link
                          to="/services/new"
                          onClick={() => setExploreOpen(false)}
                          className="block px-3 py-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-md text-sm transition-all duration-200"
                        >
                          New Services
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Section: Actions & Profile */}
            <div className="flex items-center space-x-4">
              {/* Mobile/Tablet Search */}
              {/* Same logic for mobile: show based on page */}
              {isHomePage ? (
                // Home page: show only when scrolled
                showSearch && (
                  <div className="lg:hidden flex-1 max-w-xs">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search..."
                        className="w-full px-4 py-2 pl-10 pr-3 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      />
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                )
              ) : (
                // Other pages: always show search
                <div className="lg:hidden flex-1 max-w-xs">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search..."
                      className="w-full px-4 py-2 pl-10 pr-3 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>
              )}

              {/* Switch to Selling Button - Only for users (not sellers) */}
              {isAuthenticated && user?.role === 'user' && (
                <button
                  onClick={openSwitchDialog}
                  className="hidden lg:flex items-center space-x-2 px-4 py-2.5 bg-green-600 text-white rounded-full hover:bg-green-700 transition-all duration-200"
                >
                  <Store className="w-5 h-5" />
                  <span className="font-medium">Switch to Selling</span>
                </button>
              )}

              {/* Already a Seller */}
              {isAuthenticated && user?.role === 'seller' && (
                <Link
                  to="/seller/dashboard"
                  className="hidden lg:flex items-center space-x-2 px-4 py-2.5 bg-green-600 text-white rounded-full hover:bg-green-700 transition-all duration-200"
                >
                  <Store className="w-5 h-5" />
                  <span className="font-medium">Seller Dashboard</span>
                </Link>
              )}

              {isAuthenticated ? (
                <div className="relative">
                  {/* Profile Dropdown Trigger */}
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100 transition-all duration-200"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg ${user?.role === 'seller'
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                      : 'bg-gradient-to-r from-blue-500 to-purple-600'
                      }`}>
                      {user?.name?.charAt(0) || 'U'}
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-600 hidden lg:block transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu with animation */}
                  <AnimatePresence>
                    {menuOpen && (
                      <motion.div
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        variants={dropdownAnimation}
                        className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-50"
                      >
                        <div className="p-4 border-b border-gray-100">
                          <div className="font-medium text-gray-900">{user?.name}</div>
                          <div className="text-sm text-gray-500">{user?.email}</div>
                          <div className="mt-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${user?.role === 'seller'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                              }`}>
                              {user?.role === 'seller' ? 'Seller' : 'User'}
                            </span>
                          </div>
                        </div>

                        <div className="p-2">
                          <Link
                            to="/profile"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center space-x-3 px-3 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
                          >
                            <User className="w-4 h-4" />
                            <span>Profile</span>
                          </Link>

                          <Link
                            to="/my-services"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center space-x-3 px-3 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
                          >
                            <Package className="w-4 h-4" />
                            <span>My Services</span>
                          </Link>

                          <Link
                            to="/settings"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center space-x-3 px-3 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
                          >
                            <Settings className="w-4 h-4" />
                            <span>Settings</span>
                          </Link>

                          {/* Switch Role Option - Only show for users (not sellers) */}
                          {user?.role === 'user' && (
                            <button
                              onClick={openSwitchDialog}
                              className="w-full flex items-center space-x-3 px-3 py-2.5 text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
                            >
                              <Store className="w-4 h-4" />
                              <span>Switch to Selling</span>
                            </button>
                          )}

                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center space-x-3 px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>Logout</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="hidden lg:flex items-center space-x-3">
                  <button
                    onClick={() => {
                      // This should be passed as a prop from App.jsx
                      if (onSigninClick) onSigninClick();
                    }}
                    className="text-gray-700 hover:text-blue-600 font-medium px-3 py-2 transition-colors duration-200"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => {
                      // This should trigger signup modal
                      if (onSignupClick) onSignupClick();
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 font-medium transition-all duration-200"
                  >
                    Join
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Menu Slide-in with animations */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              <motion.div
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={mobileMenuAnimation}
                className="lg:hidden fixed inset-y-0 left-0 w-full max-w-sm bg-white shadow-2xl z-50"
              >
                <div className="h-full flex flex-col overflow-hidden">
                  {/* Mobile Menu Header */}
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-3">
                        <img src={Logo} alt="Vorkana" className="h-8 w-auto" />
                        <span className="text-xl font-bold text-gray-800">Vorkana</span>
                      </div>
                      <button
                        onClick={() => setMobileMenuOpen(false)}
                        className="p-2 text-gray-500 hover:text-gray-700 transition-colors duration-200 hover:bg-gray-100 rounded-lg"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* User Info in Mobile Menu */}
                    {isAuthenticated && (
                      <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
                        <div className="flex items-center space-x-3">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${user?.role === 'seller'
                            ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                            : 'bg-gradient-to-r from-blue-500 to-purple-600'
                            }`}>
                            {user?.name?.charAt(0) || 'U'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-800 truncate">{user?.name}</div>
                            <div className="text-sm text-gray-500 truncate">{user?.email}</div>
                            <div className="mt-1">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${user?.role === 'seller'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-blue-100 text-blue-800'
                                }`}>
                                {user?.role === 'seller' ? 'Seller' : 'User'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Mobile Menu Content with scroll */}
                  <div className="flex-1 overflow-y-auto px-6 py-4">
                    {/* Quick Links */}
                    <div className="space-y-1 mb-6">
                      <Link
                        to="/"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center space-x-3 px-3 py-3 rounded-lg hover:bg-gray-50 transition-all duration-200"
                      >
                        <Home className="w-5 h-5 text-blue-600" />
                        <span className="font-medium text-gray-800">Home</span>
                      </Link>

                      <Link
                        to="/find-work"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center space-x-3 px-3 py-3 rounded-lg hover:bg-gray-50 transition-all duration-200"
                      >
                        <Briefcase className="w-5 h-5 text-purple-600" />
                        <span className="font-medium text-gray-800">Find Work</span>
                      </Link>
                    </div>

                    {/* Explore Section */}
                    <div className="mb-6">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
                        Explore
                      </div>

                      {/* Categories Link */}
                      <div className="mb-4">
                        <Link
                          to="/categories"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center justify-between px-3 py-3 rounded-lg hover:bg-blue-50 transition-all duration-200 group"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors duration-200">
                              <Globe className="w-4 h-4 text-blue-600" />
                            </div>
                            <span className="font-medium text-gray-800 group-hover:text-blue-600 transition-colors duration-200">Categories</span>
                          </div>
                          <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors duration-200" />
                        </Link>
                      </div>

                      {/* Services Link */}
                      <div>
                        <Link
                          to="/services"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center justify-between px-3 py-3 rounded-lg hover:bg-green-50 transition-all duration-200 group"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors duration-200">
                              <Package className="w-4 h-4 text-green-600" />
                            </div>
                            <span className="font-medium text-gray-800 group-hover:text-green-600 transition-colors duration-200">Services</span>
                          </div>
                          <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-green-600 transition-colors duration-200" />
                        </Link>
                      </div>
                    </div>

                    {/* Authentication Links */}
                    {!isAuthenticated ? (
                      <div className="space-y-3 mt-8 pt-6 border-t border-gray-100">
                        <Link
                          to="/sign-in"
                          onClick={() => setMobileMenuOpen(false)}
                          className="block py-3.5 text-center border-2 border-blue-200 text-blue-600 font-medium rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
                        >
                          Sign In
                        </Link>
                        <Link
                          to="/sign-up"
                          onClick={() => setMobileMenuOpen(false)}
                          className="block py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-xl text-center hover:from-blue-700 hover:to-purple-700 transition-all duration-200 hover:shadow-lg"
                        >
                          Join Free
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-1 mt-8 pt-6 border-t border-gray-100">
                        <Link
                          to="/profile"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center space-x-3 px-3 py-3.5 rounded-lg hover:bg-gray-50 transition-all duration-200"
                        >
                          <User className="w-5 h-5 text-gray-600" />
                          <span className="font-medium text-gray-800">Profile</span>
                        </Link>

                        <Link
                          to="/my-services"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center space-x-3 px-3 py-3.5 rounded-lg hover:bg-gray-50 transition-all duration-200"
                        >
                          <Package className="w-5 h-5 text-gray-600" />
                          <span className="font-medium text-gray-800">My Services</span>
                        </Link>

                        <Link
                          to="/settings"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center space-x-3 px-3 py-3.5 rounded-lg hover:bg-gray-50 transition-all duration-200"
                        >
                          <Settings className="w-5 h-5 text-gray-600" />
                          <span className="font-medium text-gray-800">Settings</span>
                        </Link>

                        {/* Switch to Selling - Only for users (not sellers) */}
                        {user?.role === 'user' && (
                          <button
                            onClick={() => {
                              setMobileMenuOpen(false);
                              setSwitchDialogOpen(true);
                            }}
                            className="w-full flex items-center space-x-3 px-3 py-3.5 rounded-lg hover:bg-green-50 transition-all duration-200"
                          >
                            <Store className="w-5 h-5 text-green-600" />
                            <span className="font-medium text-gray-800">Switch to Selling</span>
                          </button>
                        )}

                        {/* Seller Dashboard - Only for sellers */}
                        {user?.role === 'seller' && (
                          <Link
                            to="/seller/dashboard"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center space-x-3 px-3 py-3.5 rounded-lg hover:bg-green-50 transition-all duration-200"
                          >
                            <Store className="w-5 h-5 text-green-600" />
                            <span className="font-medium text-gray-800">Seller Dashboard</span>
                          </Link>
                        )}

                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center space-x-3 px-3 py-3.5 rounded-lg hover:bg-red-50 transition-all duration-200"
                        >
                          <LogOut className="w-5 h-5 text-red-600" />
                          <span className="font-medium text-gray-800">Logout</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Overlay for mobile menu with fade animation */}
              <motion.div
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={overlayAnimation}
                className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                onClick={() => setMobileMenuOpen(false)}
              />
            </>
          )}
        </AnimatePresence>
      </nav>

      {/* Switch to Seller Confirmation Dialog */}
      <AnimatePresence>
        {switchDialogOpen && (
          <>
            <motion.div
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={overlayAnimation}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            >
              <motion.div
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={modalAnimation}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900">Switch to Seller Account</h3>
                    <button
                      onClick={() => setSwitchDialogOpen(false)}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Warning Alert */}
                    <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-100 rounded-xl">
                      <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-yellow-800 font-medium">
                          Important: This action cannot be undone
                        </p>
                        <p className="text-xs text-yellow-600 mt-1">
                          Once you switch to a seller account, you cannot switch back to a user account.
                        </p>
                      </div>
                    </div>

                    {/* Benefits */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900">Seller Benefits:</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-gray-700">Create and sell services</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-gray-700">Earn money from your skills</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-gray-700">Build your professional portfolio</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-gray-700">Access seller tools and analytics</span>
                        </div>
                      </div>
                    </div>

                    {/* Limitations */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900">Please Note:</h4>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <div className="w-4 h-4 text-red-500 mt-0.5">•</div>
                          <span className="text-sm text-gray-700">You cannot switch back to user account</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-4 h-4 text-red-500 mt-0.5">•</div>
                          <span className="text-sm text-gray-700">All existing user features will be replaced with seller features</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-4 h-4 text-red-500 mt-0.5">•</div>
                          <span className="text-sm text-gray-700">You'll need to set up your seller profile</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => setSwitchDialogOpen(false)}
                        className="flex-1 py-3 text-gray-700 font-medium border-2 border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSwitchToSelling}
                        disabled={switchRoleMutation.isPending}
                        className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {switchRoleMutation.isPending ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Switching...
                          </>
                        ) : (
                          <>
                            <ArrowRight className="w-4 h-4" />
                            Switch to Seller
                          </>
                        )}
                      </button>
                    </div>

                    {/* Final Warning */}
                    <p className="text-xs text-gray-500 text-center pt-2">
                      By proceeding, you confirm that you understand this change is permanent.
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Overlay for other dropdowns */}
      {(menuOpen || exploreOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setMenuOpen(false);
            setExploreOpen(false);
          }}
        />
      )}
    </>
  );
};

export default Navbar;