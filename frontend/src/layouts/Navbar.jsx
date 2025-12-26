import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { useLogout } from "../hooks/useAuth";
import { Search, User, Globe, LogOut, Settings, Package, ChevronDown, Menu, X, Home, Briefcase, TrendingUp, Sparkles, FolderKanban, ShoppingBag, MessageSquare, BookOpen, Palette, Code, Megaphone, PenTool } from "lucide-react";
import Logo from "../assets/logo.png";
import Logo2 from "../assets/logo1.png";
import { motion, AnimatePresence } from "framer-motion";
import default_pp from '../assets/default_pp-modified.png'
import SearchComponent from "../components/Search/SearchComponent";

const Navbar = ({ onSigninClick, onSignupClick }) => {
  const [activeDropdown, setActiveDropdown] = useState(null); // 'profile', 'explore', or null
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const { isAuthenticated, user, loading } = useAuthStore();
  const logoutMutation = useLogout();

  const isHomePage = location.pathname === "/";

  // Refs for dropdowns
  const profileRef = useRef(null);
  const exploreRef = useRef(null);

  // Check if user is admin
  const isAdminUser = isAuthenticated && (user?.role === 'admin' || user?.isAdmin === true);

  // Categories with icons
  const categories = [
    { name: "Web Development", color: "text-blue-600" },
    { name: "Graphic Design", color: "text-purple-600" },
    { name: "Digital Marketing", color: "text-green-600" },
    { name: "Writing & Translation", color: "text-amber-600" },
    { name: "Video & Animation", color: "text-red-600" },
    { name: "Music & Audio", color: "text-pink-600" },
    { name: "Business", color: "text-indigo-600" },
    { name: "Lifestyle", color: "text-teal-600" }
  ];

  // Quick links with icons
  const quickLinks = [
    { name: "Browse All Gigs", icon: <ShoppingBag className="w-4 h-4" />, path: "/all-gigs" },
    { name: "Browse All Services", icon: <Briefcase className="w-4 h-4" />, path: "/services" },
  ];

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const handleScroll = () => {
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

      // Close dropdowns when scrolling
      if (activeDropdown) {
        setActiveDropdown(null);
      }
    };

    window.addEventListener("scroll", handleScroll);

    if (!isHomePage) {
      setShowSearch(false);
      setScrolled(false);
    }

    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHomePage, activeDropdown]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeDropdown === 'profile' && profileRef.current && !profileRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
      if (activeDropdown === 'explore' && exploreRef.current && !exploreRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeDropdown]);

  const toggleDropdown = (dropdown) => {
    if (activeDropdown === dropdown) {
      setActiveDropdown(null);
    } else {
      setActiveDropdown(dropdown);
    }
  };

  const closeAllDropdowns = () => {
    setActiveDropdown(null);
  };

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      closeAllDropdowns();
      setMobileMenuOpen(false);
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleMobileMenuClick = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    closeAllDropdowns();
  };

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

  // Search field animation
  const searchAnimation = {
    hidden: { opacity: 0, width: 0, x: -20 },
    visible: { 
      opacity: 1, 
      width: "auto", 
      x: 0,
      transition: { 
        duration: 0.3, 
        ease: "easeOut",
        when: "beforeChildren"
      }
    },
    exit: { 
      opacity: 0, 
      width: 0, 
      x: -20,
      transition: { 
        duration: 0.2, 
        ease: "easeIn" 
      }
    }
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
      <nav className="w-full bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between h-10 lg:h-12">
            {/* Left: Hamburger Menu (Mobile only) */}
            <div className="flex items-center lg:hidden">
              <button
                onClick={handleMobileMenuClick}
                className="p-2 text-gray-600 hover:text-black transition-colors duration-200"
                aria-label="Menu"
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
            </div>

            {/* Desktop: Logo (moved to left) */}
            <div className="hidden lg:flex items-center shrink-0">
              <Link to="/" className="flex items-center gap-1" onClick={closeAllDropdowns}>
                <img
                  src={Logo2}
                  alt="Vorkana Logo"
                  className="h-8 lg:h-10 w-auto"
                />
                <span className="text-xl lg:text-2xl font-black text-black">
                  Vorkana
                </span>
              </Link>
            </div>

            {/* Desktop: Search bar (moved to left after logo) */}
            <div className="hidden lg:flex items-center flex-1 ml-6">
              <AnimatePresence mode="wait">
                {showSearch ? (
                  <motion.div
                    key="search-field"
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={searchAnimation}
                    className="flex-1 max-w-2xl ml-6" 
                  >
                    <SearchComponent 
                      placeholder="Search for services, freelancers, or categories..."
                      variant="navbar"
                      className="w-full"
                      onFocus={closeAllDropdowns}
                    />
                  </motion.div>
                ) : (
                  // Static search placeholder when not scrolled
                  <motion.div 
                    className="w-full max-w-3xl"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="h-10 flex items-center">
                      {/* Empty space to maintain layout */}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Center: Logo (Mobile only) */}
            <div className="flex items-center justify-center lg:hidden">
              <Link to="/" className="flex items-center shrink-0 gap-1" onClick={closeAllDropdowns}>
                <img
                  src={Logo2}
                  alt="Vorkana Logo"
                  className="h-8 w-auto"
                />
                <span className="text-xl font-black text-black">
                  Vorkana
                </span>
              </Link>
            </div>

            {/* Right: Profile/Join Button (Mobile & Desktop) */}
            <div className="flex items-center lg:hidden">
              {isAuthenticated ? (
                <button
                  onClick={() => toggleDropdown('profile')}
                  className="p-1 rounded-full hover:bg-gray-100 transition-all duration-200"
                  aria-label="Profile menu"
                >
                  <img
                    src={user?.picture || default_pp}
                    alt="Profile"
                    className="w-9 h-9 rounded-full object-cover border-2 border-gray-200"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = default_pp;
                    }}
                  />
                </button>
              ) : (
                <button
                  onClick={() => {
                    closeAllDropdowns();
                    if (onSignupClick) onSignupClick();
                  }}
                  className="px-4 py-2 bg-black text-white rounded-full hover:bg-gray-800 font-medium transition-all duration-200 text-sm"
                >
                  Join
                </button>
              )}
            </div>

            {/* Desktop: Navigation Items (on the right) */}
            <div className="hidden lg:flex items-center space-x-4">
              <div className="relative" ref={exploreRef}>
                <button
                  onClick={() => toggleDropdown('explore')}
                  className="flex items-center space-x-2 px-4 py-2.5 text-gray-700 hover:text-black rounded-lg hover:bg-gray-50 transition-all duration-200"
                >
                  <Globe className="w-5 h-5" />
                  <span className="font-medium">Explore</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${activeDropdown === 'explore' ? 'rotate-180' : ''}`} />
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
                            {categories.map((category) => (
                              <Link
                                key={category.name}
                                to={`/categories/${category.name.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`}
                                onClick={closeAllDropdowns}
                                className="flex items-center space-x-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-black rounded-lg transition-all duration-200 group"
                              >
                                <span className="truncate">{category.name}</span>
                              </Link>
                            ))}
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
                                className="flex items-center space-x-3 px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-black rounded-lg transition-all duration-200"
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

              <Link
                to="/find-work"
                className="px-4 py-2.5 text-gray-700 hover:text-black font-medium hover:bg-gray-50 rounded-lg transition-all duration-200"
                onClick={closeAllDropdowns}
              >
                Find Work
              </Link>

              {isAuthenticated ? (
                <div className="flex items-center space-x-3">
                  {/* ADMIN BUTTON - Only shown if user is admin */}
                  {isAdminUser && (
                    <Link
                      to="/admin"
                      className="bg-gradient-to-r from-red-600 to-red-700 text-white text-sm px-4 py-1.5 rounded-full hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-sm"
                      onClick={closeAllDropdowns}
                    >
                      Admin
                    </Link>
                  )}

                  <div className="relative" ref={profileRef}>
                    <button
                      onClick={() => toggleDropdown('profile')}
                      className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100 transition-all duration-200"
                    >
                      <img
                        src={user?.picture || default_pp}
                        alt="Profile"
                        className="w-9 h-9 rounded-full object-cover border-2 border-gray-200"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = default_pp;
                        }}
                      />
                      <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${activeDropdown === 'profile' ? 'rotate-180' : ''}`} />
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
                              className="flex items-center space-x-3 px-3 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
                            >
                              <User className="w-4 h-4" />
                              <span>Profile</span>
                            </Link>

                            <Link
                              to="/dashboard"
                              onClick={closeAllDropdowns}
                              className="flex items-center space-x-3 px-3 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
                            >
                              <Package className="w-4 h-4" />
                              <span>Dashboard</span>
                            </Link>

                            <button
                              onClick={handleLogout}
                              className="w-full flex items-center space-x-3 px-3 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
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
                      if (onSigninClick) onSigninClick();
                    }}
                    className="text-gray-700 hover:text-black font-medium px-4 py-2.5 transition-colors duration-200"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => {
                      closeAllDropdowns();
                      if (onSignupClick) onSignupClick();
                    }}
                    className="px-6 py-2.5 bg-black text-white rounded-full hover:bg-gray-800 font-medium transition-all duration-200 shadow-sm hover:shadow-md"
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
                        <img src={Logo} alt="Vorkana" className="h-7 w-auto" />
                        <span className="text-2xl font-black text-black">Vorkana</span>
                      </div>
                      <button
                        onClick={() => setMobileMenuOpen(false)}
                        className="p-2 text-gray-500 hover:text-gray-700 transition-colors duration-200 hover:bg-gray-100 rounded-lg"
                        aria-label="Close menu"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Search in mobile menu */}
                    <div className="mb-6">
                      <SearchComponent 
                        placeholder="Search services..."
                        variant="full"
                        className="w-full"
                        onFocus={() => setMobileMenuOpen(false)}
                      />
                    </div>

                    {isAuthenticated && (
                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="flex items-center space-x-3">
                          <img
                            src={user?.picture || default_pp}
                            alt={user?.name}
                            className="w-10 h-10 rounded-full object-cover border border-gray-300"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = default_pp;
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
                        className="flex items-center space-x-3 px-3 py-3 rounded-lg hover:bg-gray-50 transition-all duration-200"
                      >
                        <Home className="w-5 h-5 text-gray-600" />
                        <span className="font-medium text-gray-800">Home</span>
                      </Link>

                      <Link
                        to="/find-work"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center space-x-3 px-3 py-3 rounded-lg hover:bg-gray-50 transition-all duration-200"
                      >
                        <Briefcase className="w-5 h-5 text-gray-600" />
                        <span className="font-medium text-gray-800">Find Work</span>
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
                            {categories.slice(0, 6).map((category) => (
                              <Link
                                key={category.name}
                                to={`/categories/${category.name.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`}
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center space-x-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-black rounded-lg transition-all duration-200"
                              >
                                <span className="truncate">{category.name}</span>
                              </Link>
                            ))}
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
                                className="flex items-center space-x-3 px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-black rounded-lg transition-all duration-200"
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
                            if (onSigninClick) onSigninClick();
                          }}
                          className="w-full py-3.5 text-center border-2 border-gray-200 text-gray-800 font-medium rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
                        >
                          Sign In
                        </button>
                        <button
                          onClick={() => {
                            setMobileMenuOpen(false);
                            if (onSignupClick) onSignupClick();
                          }}
                          className="w-full py-3.5 bg-black text-white font-medium rounded-xl text-center hover:bg-gray-800 transition-all duration-200 hover:shadow-lg"
                        >
                          Join Free
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1 mt-8 pt-6 border-t border-gray-100">
                        {/* Admin Link if user is admin */}
                        {isAdminUser && (
                          <Link
                            to="/admin"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center space-x-3 px-3 py-3.5 rounded-lg hover:bg-gray-50 transition-all duration-200 text-red-600 font-medium"
                          >
                            <span className="w-5 h-5 flex items-center justify-center">⚙️</span>
                            <span>Admin Panel</span>
                          </Link>
                        )}

                        <Link
                          to="/profile"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center space-x-3 px-3 py-3.5 rounded-lg hover:bg-gray-50 transition-all duration-200"
                        >
                          <User className="w-5 h-5 text-gray-600" />
                          <span className="font-medium text-gray-800">Profile</span>
                        </Link>

                        <Link
                          to="/dashboard"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center space-x-3 px-3 py-3.5 rounded-lg hover:bg-gray-50 transition-all duration-200"
                        >
                          <Package className="w-5 h-5 text-gray-600" />
                          <span className="font-medium text-gray-800">Dashboard</span>
                        </Link>

                        <Link
                          to="/settings"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center space-x-3 px-3 py-3.5 rounded-lg hover:bg-gray-50 transition-all duration-200"
                        >
                          <Settings className="w-5 h-5 text-gray-600" />
                          <span className="font-medium text-gray-800">Settings</span>
                        </Link>

                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center space-x-3 px-3 py-3.5 text-gray-800 hover:bg-gray-50 transition-all duration-200"
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

export default Navbar;