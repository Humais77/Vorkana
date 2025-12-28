import React, { useState } from 'react';
import { FiMenu } from 'react-icons/fi';
import AdminSideBar from '../../../components/admin/AdminSideBar';

const AdminLayout = ({ children }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Only show hamburger button without the full header */}
      <div className="fixed top-4 left-4 z-50 lg:hidden">
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 bg-white shadow-sm"
        >
          <FiMenu className="h-6 w-6" />
        </button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <AdminSideBar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />
        
        {/* Main Content - Added margin/padding to prevent overlap */}
        <main className="flex-1 min-h-screen overflow-y-auto bg-gray-50 lg:ml-0">
          {/* Padding top for mobile hamburger button, left margin for desktop sidebar */}
          <div className="p-4 lg:p-6 pt-16 lg:pt-6 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;