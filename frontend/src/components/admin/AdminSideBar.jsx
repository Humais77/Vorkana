// AdminSidebar.jsx - Fixed with proper admin logout
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast'; // Add toast import
import {
  FiHome,
  FiUsers,
  FiFolder,
  FiBriefcase,
  FiGrid,
  FiLogOut,
  FiX,
  FiFolderMinus
} from 'react-icons/fi';
import { useAuthStore } from '../../store/useAuthStore';

const Sidebar = ({ isMobileOpen, setIsMobileOpen }) => {
  const navigate = useNavigate();
  const adminLogout = useAuthStore((state) => state.adminLogout); // Use adminLogout
  const clearAuthData = useAuthStore((state) => state.clearAuthState); // Optional: for cleanup

  const handleLogout = async () => {
    try {
      // Clear cookies manually first
      const clearAllCookies = () => {
        document.cookie.split(';').forEach(cookie => {
          const [name] = cookie.trim().split('=');
          if (name) {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/admin;`;
          }
        });
      };
      
      // Clear cookies before API call
      clearAllCookies();
      
      // Clear local storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Call admin logout
      await adminLogout();
      
      // Show success message
      toast.success('Admin logged out successfully');
      
      // Force redirect and reload to clear all state
      setTimeout(() => {
        window.location.href = '/';
        window.location.reload(); // Force reload to clear React state
      }, 500);
      
    } catch (error) {
      console.error('Admin logout error:', error);
      toast.error('Admin logout failed');
      
      // Force cleanup anyway
      localStorage.clear();
      sessionStorage.clear();
      
      setTimeout(() => {
        window.location.href = '/';
      }, 300);
    } finally {
      // Close mobile sidebar
      setIsMobileOpen(false);
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: <FiHome className="h-5 w-5" /> },
    { name: 'Users', path: '/admin/users', icon: <FiUsers className="h-5 w-5" /> },
    { name: 'Categories', path: '/admin/categories', icon: <FiFolder className="h-5 w-5" /> },
    { name: 'Subcategories', path: '/admin/subcategories', icon: <FiFolderMinus className="h-5 w-5" /> },
    { name: 'Services', path: '/admin/services', icon: <FiBriefcase className="h-5 w-5" /> },
    { name: 'Gigs', path: '/admin/gigs', icon: <FiGrid className="h-5 w-5" /> },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-gray-900 bg-opacity-50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:relative inset-y-0 left-0
        w-64 bg-white border-r border-gray-200
        transform ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} 
        lg:translate-x-0 transition-transform duration-300 ease-in-out
        flex flex-col h-full shadow-lg lg:shadow-none
        z-50
      `}>
        {/* Logo & Close button for mobile */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg"></div>
            <div>
              <h1 className="font-bold text-lg text-gray-900">Admin Panel</h1>
              <p className="text-xs text-gray-500">Vorkanna</p>
            </div>
          </div>
          {/* Close button for mobile sidebar */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100"
          >
            <FiX className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.name}>
                <NavLink
                  to={item.path}
                  end={item.path === '/admin'}
                  className={({ isActive }) => `
                    flex items-center space-x-3 px-4 py-3 rounded-xl
                    transition-all duration-200
                    ${isActive 
                      ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border border-indigo-100' 
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                  onClick={() => setIsMobileOpen(false)}
                >
                  <span className={`
                    ${item.path === '/admin' && 'text-indigo-600'}
                    ${item.path === '/admin/users' && 'text-blue-600'}
                    ${item.path === '/admin/categories' && 'text-green-600'}
                    ${item.path === '/admin/subcategories' && 'text-green-600'}
                    ${item.path === '/admin/services' && 'text-purple-600'}
                    ${item.path === '/admin/gigs' && 'text-orange-600'}
                  `}>
                    {item.icon}
                  </span>
                  <span className="font-medium">{item.name}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Logout - Updated to use async function */}
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors duration-200"
          >
            <FiLogOut className="h-5 w-5" />
            <span className="font-medium">Admin Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;