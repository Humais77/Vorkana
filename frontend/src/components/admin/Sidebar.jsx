import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  FiHome,
  FiUsers,
  FiFolder,
  FiBriefcase,
  FiGrid,
  FiShield,
  FiActivity,
  FiSettings,
  FiBarChart2,
  FiLogOut,
  FiMenu,
  FiX
} from 'react-icons/fi';

const Sidebar = ({ isMobileOpen, setIsMobileOpen }) => {
  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: <FiHome className="h-5 w-5" /> },
    { name: 'Users', path: '/admin/users', icon: <FiUsers className="h-5 w-5" /> },
    { name: 'Categories', path: '/admin/categories', icon: <FiFolder className="h-5 w-5" /> },
    { name: 'Services', path: '/admin/services', icon: <FiBriefcase className="h-5 w-5" /> },
    { name: 'Gigs', path: '/admin/gigs', icon: <FiGrid className="h-5 w-5" /> },
    { separator: true },
    { name: 'Analytics', path: '/admin/analytics', icon: <FiBarChart2 className="h-5 w-5" /> },
    { name: 'Security', path: '/admin/security', icon: <FiShield className="h-5 w-5" /> },
    { name: 'Activity Log', path: '/admin/activity', icon: <FiActivity className="h-5 w-5" /> },
    { name: 'Settings', path: '/admin/settings', icon: <FiSettings className="h-5 w-5" /> },
  ];

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminRefreshToken');
    window.location.href = '/';
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-gray-900 bg-opacity-50 z-20"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30
        w-64 bg-white border-r border-gray-200
        transform ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} 
        lg:translate-x-0 transition-transform duration-300 ease-in-out
        flex flex-col h-full shadow-lg lg:shadow-none
      `}>
        {/* Logo & Toggle */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg"></div>
            <div>
              <h1 className="font-bold text-lg text-gray-900">Admin Panel</h1>
              <p className="text-xs text-gray-500">Vorkana</p>
            </div>
          </div>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <FiX className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            {navItems.map((item, index) => {
              if (item.separator) {
                return (
                  <li key={`separator-${index}`} className="my-4">
                    <div className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      System
                    </div>
                  </li>
                );
              }
              
              return (
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
                      ${item.path === '/admin/services' && 'text-purple-600'}
                      ${item.path === '/admin/gigs' && 'text-orange-600'}
                    `}>
                      {item.icon}
                    </span>
                    <span className="font-medium">{item.name}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Logout & User */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 mb-4">
            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">Admin User</p>
              <p className="text-xs text-gray-500">Administrator</p>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors duration-200"
          >
            <FiLogOut className="h-5 w-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;