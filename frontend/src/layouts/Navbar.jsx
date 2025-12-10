import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { useLogout } from "../hooks/useAuth";
import { useSwitchRole } from "../hooks/useUser";
import { Menu, X, Search, User, Briefcase, Globe, Store, ArrowRightLeft } from "lucide-react";
import Logo from "../assets/logo.png";

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const navigate = useNavigate();
  
  const { isAuthenticated, user, loading } = useAuthStore();
  const logoutMutation = useLogout();
  const switchRoleMutation = useSwitchRole();

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      setMenuOpen(false);
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleSwitchRole = async (newRole) => {
    try {
      await switchRoleMutation.mutateAsync(newRole);
      setRoleMenuOpen(false);
      
      // Navigate to home page after switching role
      navigate('/');
      
      // Reload the page to reflect role changes throughout the app
      window.location.reload();
    } catch (error) {
      console.error("Role switch failed:", error);
    }
  };

  const handleStartSelling = () => {
    if (user?.role === 'seller') {
      // Already a seller, navigate to seller dashboard
      navigate('/seller/dashboard');
    } else {
      // Show role switch modal
      setRoleMenuOpen(true);
    }
  };

  // Show loading state while checking authentication
  if (loading) {
    return (
      <nav className="w-full bg-gradient-to-r from-white to-gray-50 border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-10 w-32 bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg animate-pulse"></div>
            </div>
            <div className="hidden lg:flex space-x-4">
              <div className="animate-pulse h-8 w-20 bg-gray-100 rounded"></div>
              <div className="animate-pulse h-8 w-20 bg-gray-100 rounded"></div>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="w-full bg-gradient-to-r from-white to-gray-50 border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          {/* Left Section - Logo & Search */}
          <div className="flex items-center flex-1">
            {/* Logo */}
            <Link to="/" className="flex items-center group">
              <div className="relative">
                <img
                  src={Logo}
                  alt="Vorkana Logo"
                  className="h-9 w-auto object-contain transition-all duration-300 group-hover:scale-105"
                />
                <div className="absolute -inset-2 bg-gradient-to-r from-blue-400/10 to-purple-400/10 rounded-full blur-sm group-hover:blur-md transition-all duration-300"></div>
              </div>
              <span className="ml-3 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 font-bold text-xl tracking-tight">
                Vorkana
              </span>
            </Link>

            {/* Desktop Search */}
            <div className="hidden lg:block ml-8">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search for services, freelancers..."
                  className="w-64 px-4 py-2.5 pl-10 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Mobile Search Toggle */}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="lg:hidden ml-4 p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Center Section - Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
                  isActive
                    ? "text-blue-600 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 font-semibold"
                    : "text-gray-700 hover:text-blue-600 hover:bg-blue-50/50"
                }`
              }
            >
              <Briefcase className="w-4 h-4" />
              Find Work
            </NavLink>
            
            <NavLink
              to="/categories"
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
                  isActive
                    ? "text-purple-600 bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 font-semibold"
                    : "text-gray-700 hover:text-purple-600 hover:bg-purple-50/50"
                }`
              }
            >
              <Globe className="w-4 h-4" />
              Categories
            </NavLink>

            {/* Start Selling Button - For users who are not sellers */}
            {isAuthenticated && user?.role !== 'seller' && (
              <button
                onClick={handleStartSelling}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium hover:from-green-600 hover:to-emerald-700 transition-all shadow-sm hover:shadow"
              >
                <Store className="w-4 h-4" />
                Start Selling
              </button>
            )}
          </div>

          {/* Right Section - Actions */}
          <div className="flex items-center space-x-3">
            {isAuthenticated ? (
              <>
                {/* Desktop Actions */}
                <div className="hidden lg:flex items-center space-x-3">
                  {/* User Profile */}
                  <div className="relative group">
                    <button className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 border border-gray-200 transition-all">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        user?.role === 'seller' 
                          ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
                          : 'bg-gradient-to-r from-blue-500 to-purple-600'
                      }`}>
                        {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-medium text-gray-800">
                          {user?.name?.split(' ')[0] || 'User'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {user?.role === 'seller' ? 'Seller' : 'User'}
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {/* Profile Dropdown Menu */}
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <div className="p-4 border-b border-gray-100">
                        <div className="font-medium text-gray-800">{user?.name}</div>
                        <div className="text-sm text-gray-500">{user?.email}</div>
                        <div className="mt-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            user?.role === 'seller' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {user?.role === 'seller' ? 'Seller' : 'User'}
                          </span>
                        </div>
                      </div>
                      <div className="p-2">
                        <Link to="/profile" className="flex items-center gap-3 px-3 py-2.5 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg">
                          <User className="w-4 h-4" />
                          My Profile
                        </Link>
                        {user?.role === 'seller' && (
                          <>
                            <Link to="/seller/dashboard" className="flex items-center gap-3 px-3 py-2.5 text-gray-700 hover:bg-green-50 hover:text-green-600 rounded-lg">
                              <Store className="w-4 h-4" />
                              Seller Dashboard
                            </Link>
                            <Link to="/create-service" className="flex items-center gap-3 px-3 py-2.5 text-gray-700 hover:bg-green-50 hover:text-green-600 rounded-lg">
                              <Store className="w-4 h-4" />
                              Create Service
                            </Link>
                          </>
                        )}
                        {/* Switch Role Option - Only show if user can switch */}
                        {user?.role === 'user' && (
                          <button
                            onClick={() => handleSwitchRole('seller')}
                            disabled={switchRoleMutation.isPending}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                            {switchRoleMutation.isPending ? 'Switching...' : 'Switch to Seller'}
                          </button>
                        )}
                        {user?.role === 'seller' && (
                          <button
                            onClick={() => handleSwitchRole('user')}
                            disabled={switchRoleMutation.isPending}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                            {switchRoleMutation.isPending ? 'Switching...' : 'Switch to User'}
                          </button>
                        )}
                        <button
                          onClick={handleLogout}
                          disabled={logoutMutation.isPending}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {logoutMutation.isPending ? (
                            <>
                              <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                              Logging out...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                              </svg>
                              Logout
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile Menu Toggle */}
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="lg:hidden p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl"
                >
                  {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </>
            ) : (
              <>
                {/* Not Authenticated - Desktop */}
                <div className="hidden lg:flex items-center space-x-4">
                  <NavLink
                    to="/sign-in"
                    className="text-gray-700 hover:text-blue-600 font-medium px-4 py-2.5 rounded-xl hover:bg-blue-50 transition-all"
                  >
                    Sign In
                  </NavLink>
                  <Link
                    to="/sign-up"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium px-6 py-2.5 rounded-xl shadow-sm hover:shadow transition-all duration-300"
                  >
                    Join Free
                  </Link>
                </div>

                {/* Mobile Menu Toggle */}
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="lg:hidden p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl"
                >
                  {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Mobile Search Bar */}
        {searchOpen && (
          <div className="lg:hidden mt-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search for services, freelancers..."
                className="w-full px-4 py-3 pl-11 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <button
                onClick={() => setSearchOpen(false)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Menu */}
      <div
        className={`lg:hidden fixed inset-y-0 right-0 w-full max-w-sm bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
          menuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={Logo} alt="Vorkana" className="h-8 w-auto" />
                <span className="text-xl font-bold text-gray-800">Vorkana</span>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {isAuthenticated && (
              <div className="mt-6">
                <div className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                    user?.role === 'seller' 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
                      : 'bg-gradient-to-r from-blue-500 to-purple-600'
                  }`}>
                    {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800">{user?.name}</div>
                    <div className="text-sm text-gray-500">{user?.email}</div>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        user?.role === 'seller' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {user?.role === 'seller' ? 'Seller' : 'User'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Start Selling Button in Mobile */}
                {user?.role !== 'seller' && (
                  <button
                    onClick={handleStartSelling}
                    className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium hover:from-green-600 hover:to-emerald-700 transition-all"
                  >
                    <Store className="w-5 h-5" />
                    Start Selling
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Menu Items */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-2">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 font-medium"
                  >
                    <User className="w-5 h-5" />
                    My Profile
                  </Link>
                  
                  {user?.role === 'seller' && (
                    <>
                      <Link
                        to="/seller/dashboard"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-gradient-to-r from-green-50 to-green-100 text-green-700 font-medium"
                      >
                        <Store className="w-5 h-5" />
                        Seller Dashboard
                      </Link>
                      <Link
                        to="/create-service"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-gradient-to-r from-green-50 to-green-100 text-green-700 font-medium"
                      >
                        <Store className="w-5 h-5" />
                        Create Service
                      </Link>
                    </>
                  )}
                  
                  {/* Switch Role Options in Mobile Menu */}
                  {user?.role === 'user' && (
                    <button
                      onClick={() => {
                        handleSwitchRole('seller');
                        setMenuOpen(false);
                      }}
                      disabled={switchRoleMutation.isPending}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-gradient-to-r from-green-50 to-green-100 text-green-700 font-medium hover:from-green-100 hover:to-green-200 transition-all disabled:opacity-50"
                    >
                      <ArrowRightLeft className="w-5 h-5" />
                      {switchRoleMutation.isPending ? 'Switching...' : 'Switch to Seller'}
                    </button>
                  )}
                  {user?.role === 'seller' && (
                    <button
                      onClick={() => {
                        handleSwitchRole('user');
                        setMenuOpen(false);
                      }}
                      disabled={switchRoleMutation.isPending}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 font-medium hover:from-blue-100 hover:to-blue-200 transition-all disabled:opacity-50"
                    >
                      <ArrowRightLeft className="w-5 h-5" />
                      {switchRoleMutation.isPending ? 'Switching...' : 'Switch to User'}
                    </button>
                  )}
                  
                  <div className="space-y-1 mt-4">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">Navigation</div>
                    
                    {[
                      { to: "/", label: "Find Work", icon: Briefcase },
                      { to: "/categories", label: "Categories", icon: Globe },
                    ].map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                            isActive
                              ? "text-blue-600 bg-blue-50"
                              : "text-gray-700 hover:bg-gray-50"
                          }`
                        }
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className="w-5 h-5" />
                          <span>{item.label}</span>
                        </div>
                      </NavLink>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  {[
                    { to: "/", label: "Find Work", icon: Briefcase },
                    { to: "/categories", label: "Categories", icon: Globe },
                  ].map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${
                          isActive
                            ? "text-blue-600 bg-blue-50"
                            : "text-gray-700 hover:bg-gray-50"
                        }`
                      }
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                  
                  <div className="mt-6 pt-6 border-t border-gray-100 space-y-3">
                    <Link
                      to="/sign-in"
                      onClick={() => setMenuOpen(false)}
                      className="block py-3 text-center text-blue-600 font-medium border-2 border-blue-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all"
                    >
                      Sign In
                    </Link>
                    <Link
                      to="/sign-up"
                      onClick={() => setMenuOpen(false)}
                      className="block py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-xl text-center shadow-sm hover:shadow transition-all"
                    >
                      Join Free
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-100">
            {isAuthenticated ? (
              <button
                onClick={() => {
                  handleLogout();
                  setMenuOpen(false);
                }}
                disabled={logoutMutation.isPending}
                className="w-full flex items-center justify-center gap-3 py-3.5 text-red-600 hover:bg-red-50 font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {logoutMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                    Logging out...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </>
                )}
              </button>
            ) : (
              <div className="text-center text-sm text-gray-500">
                © 2024 Vorkana. Connecting talent with opportunity.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overlay */}
      {menuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Role Switch Modal for Mobile */}
      {roleMenuOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Switch to Seller Mode</h3>
                <button
                  onClick={() => setRoleMenuOpen(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-gray-600 mb-6">
                Switch to Seller Mode to start offering your services. As a seller, you can create service listings, manage orders, and earn money.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-green-50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                    <Store className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Seller Benefits</h4>
                    <ul className="mt-2 text-sm text-gray-600 space-y-1">
                      <li>• Create and manage service listings</li>
                      <li>• Receive service requests</li>
                      <li>• Set your own pricing</li>
                      <li>• Build your seller reputation</li>
                    </ul>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setRoleMenuOpen(false)}
                    className="flex-1 py-3 text-gray-700 font-medium border-2 border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSwitchRole('seller')}
                    disabled={switchRoleMutation.isPending}
                    className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50"
                  >
                    {switchRoleMutation.isPending ? 'Switching...' : 'Switch to Seller'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;