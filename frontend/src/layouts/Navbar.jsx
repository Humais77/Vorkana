import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { useLogout } from "../hooks/useAuth";
import BurgerIcon from "../assets/icons/hamburger.svg";
import Logo from "../assets/logo.png";
import SideBar from "../layouts/SideBar";

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  
  // Get auth state from Zustand
  const { isAuthenticated, user, loading } = useAuthStore();
  const logoutMutation = useLogout();

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      setMenuOpen(false);
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Show loading state while checking authentication
  if (loading) {
    return (
      <nav className="w-full bg-[#0A1A3D] text-white sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between p-4">
          <div className="flex items-center mx-auto md:mx-0">
            <img
              src={Logo}
              alt="Vorkana Logo"
              className="h-10 md:h-12 object-contain"
            />
          </div>
          <div className="hidden md:flex space-x-4">
            <div className="animate-pulse h-6 w-20 bg-gray-700 rounded"></div>
            <div className="animate-pulse h-6 w-20 bg-gray-700 rounded"></div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="w-full bg-[#0A1A3D] text-white sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between p-4 relative">
        {/* Mobile Hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden absolute left-4 text-gray-200 hover:text-white transition"
          aria-label="Toggle menu"
          disabled={logoutMutation.isPending}
        >
          {menuOpen ? (
            <svg
              className="w-7 h-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <img src={BurgerIcon} alt="Burger Icon" className="w-7 h-7" />
          )}
        </button>

        {/* Logo */}
        <Link to="/" className="mx-auto md:mx-0 flex items-center">
          <img
            src={Logo}
            alt="Vorkana Logo"
            className="h-10 md:h-12 object-contain transition-transform duration-300 hover:scale-105"
          />
          <span className="ml-2 text-white font-extrabold text-xl md:text-3xl tracking-wide hidden md:inline">
            Vorkana
          </span>
        </Link>

        {/* Desktop Menu */}
        <ul className="hidden md:flex items-center space-x-10 text-lg">
          <li>
            <NavLink
              to="/"
              className={({ isActive }) =>
                `transition ${
                  isActive
                    ? "text-indigo-300 font-semibold"
                    : "text-gray-300 hover:text-indigo-300"
                }`
              }
            >
              Home
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/services"
              className={({ isActive }) =>
                `transition ${
                  isActive
                    ? "text-indigo-300 font-semibold"
                    : "text-gray-300 hover:text-indigo-300"
                }`
              }
            >
              Services
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/categories"
              className={({ isActive }) =>
                `transition ${
                  isActive
                    ? "text-indigo-300 font-semibold"
                    : "text-gray-300 hover:text-indigo-300"
                }`
              }
            >
              Categories
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/contact"
              className={({ isActive }) =>
                `transition ${
                  isActive
                    ? "text-indigo-300 font-semibold"
                    : "text-gray-300 hover:text-indigo-300"
                }`
              }
            >
              Contact
            </NavLink>
          </li>
          
          {/* Conditional Login/Logout */}
          {isAuthenticated ? (
            <li className="flex items-center space-x-4">
              <span className="text-gray-300">
                Welcome, {user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'User'}
              </span>
              <button
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {logoutMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Logging out...
                  </>
                ) : (
                  "Logout"
                )}
              </button>
            </li>
          ) : (
            <li>
              <NavLink
                to="/sign-in"
                className={({ isActive }) =>
                  `transition ${
                    isActive
                      ? "text-indigo-300 font-semibold"
                      : "text-gray-300 hover:text-indigo-300"
                  }`
                }
              >
                Login
              </NavLink>
            </li>
          )}
        </ul>
      </div>

      {/* Mobile SideBar Menu */}
      <div
        className={`md:hidden fixed top-0 left-0 h-full w-2/3 max-w-xs bg-[#0A1A3D] shadow-lg z-50 transform transition-transform duration-300 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 flex justify-end">
          <button
            onClick={() => setMenuOpen(false)}
            className="text-gray-200 hover:text-white"
            aria-label="Close menu"
          >
            <svg
              className="w-7 h-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto h-[calc(100%-56px)]">
          <SideBar />
          {/* Add logout button to mobile sidebar */}
          {isAuthenticated && (
            <div className="p-4 border-t border-gray-700">
              <div className="mb-4 px-2 text-gray-300">
                Welcome, {user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'User'}
              </div>
              <button
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                className="w-full bg-red-600 hover:bg-red-700 px-4 py-3 rounded-md transition-colors text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {logoutMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Logging out...
                  </>
                ) : (
                  "Logout"
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Overlay when menu is open */}
      {menuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMenuOpen(false)}
        />
      )}
    </nav>
  );
};

export default Navbar;