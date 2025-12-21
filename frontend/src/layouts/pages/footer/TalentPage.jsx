// layouts/pages/TalentPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const TalentPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Find Freelancers</h1>
          <p className="text-gray-600 text-lg">
            Discover talented professionals for your projects
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Talent Directory Coming Soon</h2>
          <p className="text-gray-600 mb-6">
            Our freelancer directory is currently being developed. Soon you'll be able to search and connect with skilled professionals across various categories.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div className="text-center p-6 border border-gray-200 rounded-lg">
              <div className="text-3xl mb-4">👨‍💻</div>
              <h3 className="font-semibold text-lg mb-2">Developers</h3>
              <p className="text-gray-600">Web, mobile, and software developers</p>
            </div>
            <div className="text-center p-6 border border-gray-200 rounded-lg">
              <div className="text-3xl mb-4">🎨</div>
              <h3 className="font-semibold text-lg mb-2">Designers</h3>
              <p className="text-gray-600">UI/UX, graphic, and product designers</p>
            </div>
            <div className="text-center p-6 border border-gray-200 rounded-lg">
              <div className="text-3xl mb-4">📝</div>
              <h3 className="font-semibold text-lg mb-2">Writers</h3>
              <p className="text-gray-600">Content, copy, and technical writers</p>
            </div>
          </div>
          
          <div className="text-center">
            <Link
              to="/services"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Browse Available Services
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TalentPage;