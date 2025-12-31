import React, { useState } from 'react';
import Sidebar from '../../../components/admin/AdminSideBar.jsx';

const AdminLayout = ({ children }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile hamburger button - positioned absolutely */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 text-gray-600 hover:text-gray-900 p-3 rounded-lg hover:bg-gray-100 bg-white shadow-md"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      
      <div className="flex">
        {/* Sidebar */}
        <Sidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />
        
        {/* Main Content with padding for mobile hamburger */}
        <main className="flex-1 min-h-screen overflow-y-auto bg-gray-50 pt-16 lg:pt-0">
          <div className="p-4 lg:p-6 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;