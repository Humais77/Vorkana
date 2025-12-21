// layouts/pages/TrendingPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const TrendingPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Trending Services</h1>
          <p className="text-gray-600 text-lg">
            Discover what's popular right now
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Currently Trending</h2>
            
            <div className="space-y-6">
              {[
                'AI Integration Services',
                'Mobile App Development',
                'E-commerce Solutions',
                'Social Media Marketing',
                'Brand Identity Design'
              ].map((service, index) => (
                <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-300">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                      <span className="text-blue-600 font-bold">{index + 1}</span>
                    </div>
                    <span className="font-medium text-gray-800">{service}</span>
                  </div>
                  <span className="text-green-600 font-semibold">↑ Trending</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="text-center">
            <Link
              to="/services"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Explore All Services
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrendingPage;