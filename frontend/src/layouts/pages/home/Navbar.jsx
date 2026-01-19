import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../../store/useAuthStore";
import { useLogout } from "../../../hooks/useAuth";
import { Search, User, Globe, LogOut, Settings, Package, ChevronDown, Menu, X, Home, Briefcase, ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SearchComponent from "../../../components/search/SearchComponent";
import { useParentCategories } from "../../../hooks/useCategories"; 
import { buildImageUrl } from "../../../utils/cloudinaryFrontend";
import { useSessionWatcher } from '../../../hooks/useAuth';
const Logo_URL = buildImageUrl({
  publicId: "gpepaqvupkzg17xso4b7",
  width: 220
});
const Default_pp_URL = buildImageUrl({
  publicId: "wzbsbwsonnqfxiuyadmp",
  width: 220
});

const Navbar = ({ onSigninClick, onSignupClick }) => {
   useSessionWatcher();
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const { isAuthenticated, user, loading } = useAuthStore();
  const logoutMutation = useLogout();

  const isHomePage = location.pathname === "/";
  const isAdminUser = isAuthenticated && (user?.role === 'admin' || user?.isAdmin === true);

  // Fetch real categories from database
  const { 
    data: categoriesData = [], 
    isLoading: categoriesLoading,
    error: categoriesError 
  } = useParentCategories();

  // Refs for dropdowns
  const profileRef = useRef(null);
  const exploreRef = useRef(null);
  const mobileProfileRef = useRef(null);

  // Memoized categories from database
  const categories = useMemo(() => {
    if (!categoriesData || !Array.isArray(categoriesData)) {
      return [];
    }
    
    return categoriesData.map(category => ({
      _id: category._id,
      name: category.name,
      description: category.description || '',
      slug: category.slug || category.name.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-'),
      parentCategory: category.parentCategory,
      children: category.children || [],
      level: category.level || 0,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt
    }));
  }, [categoriesData]);

  // Memoized quick links
  const quickLinks = useMemo(() => [
    { name: "Browse All Gigs", icon: <ShoppingBag className="w-4 h-4" />, path: "/gigs" },
    { name: "Browse All Services", icon: <Briefcase className="w-4 h-4" />, path: "/services" },
  ], []);

  // Handle scroll
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (!isHomePage) return;
          const scrolled = window.scrollY > 100;
          setShowSearch(scrolled);
          setScrolled(scrolled);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHomePage]);

  // Handle mobile menu overflow
  useEffect(() => {
    if (mobileMenuOpen || mobileProfileOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = 'unset';
      document.body.style.paddingRight = '';
    }

    return () => {
      document.body.style.overflow = 'unset';
      document.body.style.paddingRight = '';
    };
  }, [mobileMenuOpen, mobileProfileOpen]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeDropdown === 'profile' && profileRef.current && !profileRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
      if (activeDropdown === 'explore' && exploreRef.current && !exploreRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
      if (mobileProfileOpen && mobileProfileRef.current && !mobileProfileRef.current.contains(event.target)) {
        setMobileProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeDropdown, mobileProfileOpen]);

  const toggleDropdown = useCallback((dropdown) => {
    setActiveDropdown(prev => prev === dropdown ? null : dropdown);
  }, []);

  const toggleMobileProfile = useCallback(() => {
    setMobileProfileOpen(prev => !prev);
  }, []);

  const closeAllDropdowns = useCallback(() => {
    setActiveDropdown(null);
    setMobileProfileOpen(false);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
      closeAllDropdowns();
      setMobileMenuOpen(false);
      setMobileProfileOpen(false);
      navigate("/");
    } catch (error) {
      throw error("Logout failed:", error);
    }
  }, [logoutMutation, closeAllDropdowns, navigate]);

  const handleMobileMenuClick = useCallback(() => {
    setMobileMenuOpen(prev => !prev);
    closeAllDropdowns();
  }, [closeAllDropdowns]);

  // Animations - memoized
  const dropdownAnimation = useMemo(() => ({
    hidden: { opacity: 0, y: -5 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.1, ease: "easeOut" } },
    exit: { opacity: 0, y: -5, transition: { duration: 0.1, ease: "easeIn" } }
  }), []);

  const mobileMenuAnimation = useMemo(() => ({
    hidden: { x: "-100%" },
    visible: { x: 0, transition: { duration: 0.2, ease: "easeOut" } },
    exit: { x: "-100%", transition: { duration: 0.2, ease: "easeIn" } }
  }), []);

  const mobileProfileAnimation = useMemo(() => ({
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.15, ease: "easeOut" } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15, ease: "easeIn" } }
  }), []);

  const overlayAnimation = useMemo(() => ({
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.2 } }
  }), []);

  return (
    <>
      <nav className="w-full bg-white border-b sticky top-0 z-50 h-16 lg:h-20">

        <div className="max-w-7xl mx-auto px-4 h-full">

          <div className="flex items-center justify-between h-full">

            {/* Left: Hamburger Menu (Mobile only) */}
            <div className="flex items-center lg:hidden">
              <button
                onClick={handleMobileMenuClick}
                className="p-2 text-gray-600 hover:text-black transition-colors duration-150"
                aria-label="Menu"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>

            {/* Desktop: Logo */}
            <div className="hidden lg:flex items-center shrink-0 mr-8 mb-2">
              <Link
                to="/"
                className="flex items-center gap-1"
                onClick={closeAllDropdowns}
                draggable="true"
              >
                <img
  src={Logo_URL}
  alt="Vorkanna"
  className="h-10 lg:h-10 w-auto object-contain"
 />

              </Link>
            </div>

            {/* Desktop: Search */}
            <div className="hidden lg:flex items-center ml-6 mr-auto min-w-[520px] h-full">

              <div>
                <SearchComponent 
                  placeholder="What service are you looking for today?"
                  className="w-[520px] xl:w-[500px] 2xl:w-[720px]" 
                />
              </div>
            </div>

            {/* Center: Logo (Mobile only) */}
            <div className="flex items-center justify-center lg:hidden">
              <Link
                to="/"
                className="flex items-center shrink-0 gap-1"
                onClick={closeAllDropdowns}
                draggable="true"
              >
                <img
                  src={Logo_URL}
                  alt="Vorkanna"
                  className="h-10 w-auto pointer-events-none"
                  loading="eager"
                  draggable="false"
                />
              </Link>
            </div>

            {/* Right: Profile/Join Button (Mobile) */}
            <div className="flex items-center lg:hidden relative" ref={mobileProfileRef}>
              {isAuthenticated ? (
                <>
                  <button
                    onClick={toggleMobileProfile}
                    className="p-1 rounded-full hover:bg-gray-100 transition-all duration-150"
                    aria-label="Profile menu"
                  >
                    <img
                      src={user?.picture || Default_pp_URL}
                      className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full object-cover"
                      loading="lazy"
                      alt="Profile"
                    />
                  </button>

                  {/* Mobile Profile Dropdown */}
                  <AnimatePresence>
                    {mobileProfileOpen && (
                      <>
                        <motion.div
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          variants={mobileProfileAnimation}
                          className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 z-50"
                        >
                          <div className="p-4 border-b border-gray-100">
                            <div className="flex items-center space-x-3">
                              <img
                                src={user?.picture ||Default_pp_URL}
                                alt={user?.name}
                                className="w-10 h-10 rounded-full object-cover"
                                loading="lazy"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-gray-900 truncate">{user?.name}</div>
                                <div className="text-sm text-gray-500 truncate">{user?.email}</div>
                                <div className="mt-1">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${isAdminUser
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-green-100 text-green-700'
                                      }`}
                                  >
                                    {isAdminUser ? 'Admin' : 'User'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="p-2">
                            {isAdminUser && (
                              <Link
                                to="/admin"
                                onClick={() => {
                                  setMobileProfileOpen(false);
                                  setMobileMenuOpen(false);
                                }}
                                className="flex items-center space-x-3 px-3 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-150"
                              >
                                <Settings className="w-4 h-4" />
                                <span>Admin Panel</span>
                              </Link>
                            )}

                            <Link
                              to="/profile"
                              onClick={() => {
                                setMobileProfileOpen(false);
                                setMobileMenuOpen(false);
                              }}
                              className="flex items-center space-x-3 px-3 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-150"
                            >
                              <User className="w-4 h-4" />
                              <span>Profile</span>
                            </Link>

                            <Link
                              to="/dashboard"
                              onClick={() => {
                                setMobileProfileOpen(false);
                                setMobileMenuOpen(false);
                              }}
                              className="flex items-center space-x-3 px-3 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-150"
                            >
                              <Package className="w-4 h-4" />
                              <span>Dashboard</span>
                            </Link>

                            <Link
                              to="/settings"
                              onClick={() => {
                                setMobileProfileOpen(false);
                                setMobileMenuOpen(false);
                              }}
                              className="flex items-center space-x-3 px-3 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-150"
                            >
                              <Settings className="w-4 h-4" />
                              <span>Settings</span>
                            </Link>

                            <button
                              onClick={handleLogout}
                              className="w-full flex items-center space-x-3 px-3 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-150"
                            >
                              <LogOut className="w-4 h-4" />
                              <span>Logout</span>
                            </button>
                          </div>
                        </motion.div>
                        
                        {/* Mobile Profile Dropdown Overlay */}
                        <motion.div
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          variants={overlayAnimation}
                          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
                          onClick={() => setMobileProfileOpen(false)}
                        />
                      </>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <button
                  onClick={() => {
                    closeAllDropdowns();
                    onSignupClick?.();
                  }}
                  className="px-4 py-2 bg-black text-white rounded-full hover:bg-gray-800 font-medium transition-all duration-150 text-sm"
                >
                  Join
                </button>
              )}
            </div>

            {/* Desktop: Navigation Items */}
            <div className="hidden lg:flex items-center space-x-4">
              <div className="relative" ref={exploreRef}>
                <button
                  onClick={() => toggleDropdown('explore')}
                  className="flex items-center space-x-2 px-4 py-2.5 text-gray-700 hover:text-black rounded-lg hover:bg-gray-50 transition-all duration-150"
                  disabled={categoriesLoading}
                >
                  <Globe className="w-5 h-5" />
                  <span className="font-medium">Explore</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-150 ${activeDropdown === 'explore' ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {activeDropdown === 'explore' && (
                    <motion.div
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      variants={dropdownAnimation}
                      className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 z-50"
                    >
                      <div className="p-4">
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-3 px-2">Browse Categories</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {categoriesLoading ? (
                              <div className="col-span-2 space-y-2 px-2">
                                {[...Array(6)].map((_, i) => (
                                  <div
                                    key={i}
                                    className="h-8 bg-gray-100 animate-pulse rounded-lg"
                                  />
                                ))}
                              </div>
                            ) : categories.length > 0 ? (
                              categories.slice(0, 8).map((category) => (
                                <Link
                                  key={category._id}
                                  to={`/categories/${category.slug}`}
                                  onClick={closeAllDropdowns}
                                  className="flex items-center px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-black rounded-lg transition"
                                >
                                  <span className="truncate">{category.name}</span>
                                </Link>
                              ))
                            ) : (
                              <div className="col-span-2 px-3 py-2.5 text-sm text-gray-500">
                                No categories found
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="pt-4 border-t border-gray-100">
                          <h4 className="text-sm font-semibold text-gray-900 mb-3 px-2">Quick Links</h4>
                          <div className="space-y-1">
                            {quickLinks.map((link) => (
                              <Link
                                key={link.name}
                                to={link.path}
                                onClick={closeAllDropdowns}
                                className="flex items-center space-x-3 px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-black rounded-lg transition-all duration-150"
                              >
                                {link.icon}
                                <span>{link.name}</span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {isAuthenticated ? (
                <div className="flex items-center space-x-3">
                  {isAdminUser && (
                    <Link
                      to="/admin"
                      className="bg-gradient-to-r from-red-600 to-red-700 text-white text-sm px-4 py-1.5 rounded-full hover:from-red-700 hover:to-red-800 transition-all duration-150 shadow-sm"
                      onClick={closeAllDropdowns}
                    >
                      Admin
                    </Link>
                  )}

                  <div className="relative" ref={profileRef}>
                    <button
                      onClick={() => toggleDropdown('profile')}
                      className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100 transition-all duration-150"
                    >
                      <img
                        src={user?.picture ||Default_pp_URL}
                        className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full object-cover"
                        loading="lazy"
                        alt="Profile"
                      />
                      <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform duration-150 ${activeDropdown === 'profile' ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {activeDropdown === 'profile' && (
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
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${isAdminUser
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-green-100 text-green-700'
                                  }`}
                              >
                                {isAdminUser ? 'Admin' : 'User'}
                              </span>
                            </div>
                          </div>

                          <div className="p-2">
                            <Link
                              to="/profile"
                              onClick={closeAllDropdowns}
                              className="flex items-center space-x-3 px-3 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-150"
                            >
                              <User className="w-4 h-4" />
                              <span>Profile</span>
                            </Link>

                            <Link
                              to="/dashboard"
                              onClick={closeAllDropdowns}
                              className="flex items-center space-x-3 px-3 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-150"
                            >
                              <Package className="w-4 h-4" />
                              <span>Dashboard</span>
                            </Link>

                            <button
                              onClick={handleLogout}
                              className="w-full flex items-center space-x-3 px-3 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-150"
                            >
                              <LogOut className="w-4 h-4" />
                              <span>Logout</span>
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => {
                      closeAllDropdowns();
                      onSigninClick?.();
                    }}
                    className="text-gray-700 hover:text-black font-medium px-4 py-2.5 transition-colors duration-150"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => {
                      closeAllDropdowns();
                      onSignupClick?.();
                    }}
                    className="px-6 py-2.5 bg-black text-white rounded-full hover:bg-gray-800 font-medium transition-all duration-150 shadow-sm hover:shadow-md"
                  >
                    Join Free
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
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
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-1">
                        <img src={Logo_URL} alt="Vorkanna" className="h-10 w-auto" loading="eager" />
                      </div>
                      <button
                        onClick={() => setMobileMenuOpen(false)}
                        className="p-2 text-gray-500 hover:text-gray-700 transition-colors duration-150 hover:bg-gray-100 rounded-lg"
                        aria-label="Close menu"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Search in mobile menu */}
                    <div className="mb-6">
                      <SearchComponent
                        placeholder="What service are you looking for?"
                        variant="full"
                        className="w-full"
                        onFocus={() => setMobileMenuOpen(false)}
                      />
                    </div>

                    {isAuthenticated && (
                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="flex items-center space-x-3">
                          <img
                            src={user?.picture ||Default_pp_URL}
                            alt={user?.name}
                            className="w-10 h-10 rounded-full object-cover border border-gray-300"
                            loading="lazy"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = Default_pp_URL;
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-800 truncate">{user?.name}</div>
                            <div className="text-sm text-gray-500 truncate">{user?.email}</div>
                            <div className="mt-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {isAdminUser ? 'Admin' : 'User'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto px-6 py-4">
                    {/* Main Navigation */}
                    <div className="space-y-1 mb-6">
                      <Link
                        to="/"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center space-x-3 px-3 py-3 rounded-lg hover:bg-gray-50 transition-all duration-150"
                      >
                        <Home className="w-5 h-5 text-gray-600" />
                        <span className="font-medium text-gray-800">Home</span>
                      </Link>
                    </div>

                    {/* Explore Section */}
                    <div className="mb-6">
                      <div className="flex items-center space-x-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
                        <Globe className="w-4 h-4" />
                        <span>Explore</span>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-2 px-3">Categories</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {categoriesLoading ? (
                              <div className="col-span-2 space-y-2 px-3">
                                {[...Array(4)].map((_, i) => (
                                  <div
                                    key={i}
                                    className="h-8 bg-gray-100 animate-pulse rounded-lg"
                                  />
                                ))}
                              </div>
                            ) : categories.length > 0 ? (
                              categories.slice(0, 6).map((category) => (
                                <Link
                                  key={category._id}
                                  to={`/categories/${category.slug}`}
                                  onClick={() => setMobileMenuOpen(false)}
                                  className="flex items-center space-x-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-black rounded-lg transition-all duration-150"
                                >
                                  <span className="truncate">{category.name}</span>
                                </Link>
                              ))
                            ) : (
                              <div className="col-span-2 px-3 py-2.5 text-sm text-gray-500">
                                No categories available
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-2 px-3">Quick Links</h4>
                          <div className="space-y-1">
                            {quickLinks.map((link) => (
                              <Link
                                key={link.name}
                                to={link.path}
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center space-x-3 px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-black rounded-lg transition-all duration-150"
                              >
                                {link.icon}
                                <span>{link.name}</span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Authentication Links */}
                    {!isAuthenticated ? (
                      <div className="space-y-3 mt-8 pt-6 border-t border-gray-100">
                        <button
                          onClick={() => {
                            setMobileMenuOpen(false);
                            onSigninClick?.();
                          }}
                          className="w-full py-3.5 text-center border-2 border-gray-200 text-gray-800 font-medium rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all duration-150"
                        >
                          Sign In
                        </button>
                        <button
                          onClick={() => {
                            setMobileMenuOpen(false);
                            onSignupClick?.();
                          }}
                          className="w-full py-3.5 bg-black text-white font-medium rounded-xl text-center hover:bg-gray-800 transition-all duration-150 hover:shadow-lg"
                        >
                          Join Free
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1 mt-8 pt-6 border-t border-gray-100">
                        {isAdminUser && (
                          <Link
                            to="/admin"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center space-x-3 px-3 py-3.5 rounded-lg hover:bg-gray-50 transition-all duration-150 text-red-600 font-medium"
                          >
                            <span className="w-5 h-5 flex items-center justify-center">⚙️</span>
                            <span>Admin Panel</span>
                          </Link>
                        )}

                        <Link
                          to="/profile"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center space-x-3 px-3 py-3.5 rounded-lg hover:bg-gray-50 transition-all duration-150"
                        >
                          <User className="w-5 h-5 text-gray-600" />
                          <span className="font-medium text-gray-800">Profile</span>
                        </Link>

                        <Link
                          to="/dashboard"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center space-x-3 px-3 py-3.5 rounded-lg hover:bg-gray-50 transition-all duration-150"
                        >
                          <Package className="w-5 h-5 text-gray-600" />
                          <span className="font-medium text-gray-800">Dashboard</span>
                        </Link>

                        <Link
                          to="/settings"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center space-x-3 px-3 py-3.5 rounded-lg hover:bg-gray-50 transition-all duration-150"
                        >
                          <Settings className="w-5 h-5 text-gray-600" />
                          <span className="font-medium text-gray-800">Settings</span>
                        </Link>

                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center space-x-3 px-3 py-3.5 text-gray-800 hover:bg-gray-50 transition-all duration-150"
                        >
                          <LogOut className="w-5 h-5" />
                          <span className="font-medium">Logout</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>

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
    </>
  );
};

export default React.memo(Navbar);