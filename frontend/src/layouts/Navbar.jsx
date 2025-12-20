import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { useLogout } from "../hooks/useAuth";
import { Search, User, Globe, LogOut, Settings, Package, ChevronDown, Menu, X, Home, Briefcase, AlertCircle, Check, ArrowRight, Shield } from "lucide-react";
import Logo from "../assets/logo.png";
import Logo2 from "../assets/logo1.png";
import { motion, AnimatePresence } from "framer-motion";
import default_pp from '../assets/default_pp-modified.png'

const Navbar = ({ onSigninClick, onSignupClick }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const { isAuthenticated, user, loading } = useAuthStore();
  const logoutMutation = useLogout();

  const isHomePage = location.pathname === "/";

  // Check if user is admin
  const isAdminUser = isAuthenticated && (user?.role === 'admin' || user?.isAdmin === true);

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

      // Close profile and explore dropdowns when scrolling
      if (menuOpen || exploreOpen) {
        setMenuOpen(false);
        setExploreOpen(false);
      }
    };

    window.addEventListener("scroll", handleScroll);

    if (!isHomePage) {
      setShowSearch(false);
      setScrolled(false);
    }

    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHomePage, menuOpen, exploreOpen]);

  useEffect(() => {
    if (!isHomePage) {
      setShowSearch(true);
      setScrolled(true);
    } else {
      setShowSearch(false);
      setScrolled(false);
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

  const handleMobileMenuClick = () => {
    setMobileMenuOpen(!mobileMenuOpen);
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
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              <button
                onClick={handleMobileMenuClick}
                className="lg:hidden p-2 text-gray-600 hover:text-black transition-colors duration-200"
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

              <Link to="/" className="flex items-center shrink-0 gap-1">
                <img
                  src={Logo2}
                  alt="Vorkana Logo"
                  className="h-8 lg:h-10 w-auto"
                />
                <span className="text-xl lg:text-2xl font-black text-black">
                  Vorkana
                </span>
              </Link>

              {isHomePage ? (
                showSearch && (
                  <div className="hidden lg:block flex-1 max-w-2xl">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search for services, freelancers, or categories..."
                        className="w-full px-4 py-2.5 pl-12 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent transition-all duration-200"
                      />
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                )
              ) : (
                <div className="hidden lg:block flex-1 max-w-2xl">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search for services, freelancers, or categories..."
                      className="w-full px-4 py-2.5 pl-12 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent transition-all duration-200"
                    />
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  </div>
                </div>
              )}
            </div>

            <div className="hidden lg:block mx-6">
              <div className="relative">
                <button
                  onClick={() => setExploreOpen(!exploreOpen)}
                  className="flex items-center space-x-2 px-4 py-2.5 text-gray-700 hover:text-black rounded-lg hover:bg-gray-50 transition-all duration-200"
                >
                  <Globe className="w-5 h-5" />
                  <span className="font-medium">Explore</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${exploreOpen ? 'rotate-180' : ''}`} />
                </button>

                {exploreOpen && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                    <div className="p-4">
                      <div className="space-y-3">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Categories</h4>
                          <div className="space-y-1">
                            {['Web Development', 'Graphic Design', 'Digital Marketing', 'Writing & Translation', 'Video & Animation', 'Music & Audio', 'Business', 'Lifestyle'].map((category) => (
                              <Link
                                key={category}
                                to={`/categories/${category.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`}
                                onClick={() => setExploreOpen(false)}
                                className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-black rounded-md transition-all duration-200"
                              >
                                {category}
                              </Link>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Quick Links</h4>
                          <div className="space-y-1">
                            <Link
                              to="/all-gigs"
                              onClick={() => setExploreOpen(false)}
                              className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-black rounded-md transition-all duration-200"
                            >
                              Browse All Gigs
                            </Link>
                            <Link
                              to="/services/popular"
                              onClick={() => setExploreOpen(false)}
                              className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-black rounded-md transition-all duration-200"
                            >
                              Popular Services
                            </Link>
                            <Link
                              to="/services/new"
                              onClick={() => setExploreOpen(false)}
                              className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-black rounded-md transition-all duration-200"
                            >
                              New Services
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {isHomePage ? (
                showSearch && (
                  <div className="lg:hidden flex-1 max-w-xs">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search..."
                        className="w-full px-4 py-2 pl-10 pr-3 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent transition-all duration-200"
                      />
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                )
              ) : (
                <div className="lg:hidden flex-1 max-w-xs">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search..."
                      className="w-full px-4 py-2 pl-10 pr-3 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent transition-all duration-200"
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>
              )}

              {isAuthenticated ? (
                <div className="flex items-center space-x-3">
                  {/* ADMIN BUTTON - Only shown if user is admin */}
                  {isAdminUser && (
                    <Link
                      to="/admin"
                      className="md:inline bg-gradient-to-r from-red-600 to-red-700 text-white text-sm px-3 py-1 rounded-full  hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-sm"
                    >

                      <span>Admin</span>
                    </Link>
                  )}

                  <div className="relative">
                    <button
                      onClick={() => setMenuOpen(!menuOpen)}
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
                      <ChevronDown className={`w-4 h-4 text-gray-600 hidden lg:block transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`} />
                    </button>

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
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium${isAdminUser
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
                              onClick={() => setMenuOpen(false)}
                              className="flex items-center space-x-3 px-3 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
                            >
                              <User className="w-4 h-4" />
                              <span>Profile</span>
                            </Link>

                            <Link
                              to="/dashboard"
                              onClick={() => setMenuOpen(false)}
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
                <div className="hidden lg:flex items-center space-x-3">
                  <button
                    onClick={() => {
                      if (onSigninClick) onSigninClick();
                    }}
                    className="text-gray-700 hover:text-black font-medium px-3 py-2 transition-colors duration-200"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => {
                      if (onSignupClick) onSignupClick();
                    }}
                    className="px-4 py-2 bg-black text-white rounded-full hover:bg-gray-800 font-medium transition-all duration-200"
                  >
                    Join
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

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
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {isAuthenticated && (
                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-800 text-white font-bold text-lg">
                            {user?.name?.charAt(0) || 'U'}
                          </div>
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

                    <div className="mb-6">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
                        Explore
                      </div>

                      <div className="space-y-3">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2 px-3">Categories</h4>
                          <div className="space-y-1">
                            {['Web Development', 'Graphic Design', 'Digital Marketing', 'Writing & Translation'].map((category) => (
                              <Link
                                key={category}
                                to={`/categories/${category.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`}
                                onClick={() => setMobileMenuOpen(false)}
                                className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-black rounded-md transition-all duration-200"
                              >
                                {category}
                              </Link>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2 px-3">Quick Links</h4>
                          <div className="space-y-1">
                            <Link
                              to="/all-gigs"
                              onClick={() => setMobileMenuOpen(false)}
                              className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-black rounded-md transition-all duration-200"
                            >
                              Browse All Gigs
                            </Link>
                            <Link
                              to="/services/popular"
                              onClick={() => setMobileMenuOpen(false)}
                              className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-black rounded-md transition-all duration-200"
                            >
                              Popular Services
                            </Link>
                            <Link
                              to="/services/new"
                              onClick={() => setMobileMenuOpen(false)}
                              className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-black rounded-md transition-all duration-200"
                            >
                              New Services
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>

                    {!isAuthenticated ? (
                      <div className="space-y-3 mt-8 pt-6 border-t border-gray-100">
                        <Link
                          to="/sign-in"
                          onClick={() => setMobileMenuOpen(false)}
                          className="block py-3.5 text-center border-2 border-gray-200 text-gray-800 font-medium rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
                        >
                          Sign In
                        </Link>
                        <Link
                          to="/sign-up"
                          onClick={() => setMobileMenuOpen(false)}
                          className="block py-3.5 bg-black text-white font-medium rounded-xl text-center hover:bg-gray-800 transition-all duration-200 hover:shadow-lg"
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