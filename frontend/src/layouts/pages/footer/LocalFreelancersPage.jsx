// layouts/pages/LocalFreelancersPage.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const LocalFreelancersPage = () => {
  const [location, setLocation] = useState('');

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Local Freelancers</h1>
          <p className="text-gray-600 text-lg">
            Find freelancers in your area
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Find Local Talent</h2>
            
            <div className="max-w-md mx-auto mb-8">
              <div className="flex">
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Enter your city or zip code"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-l-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <button className="px-6 py-3 bg-blue-600 text-white font-medium rounded-r-lg hover:bg-blue-700 transition-colors duration-300">
                  Search
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {['New York', 'Los Angeles', 'Chicago'].map((city, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-6 text-center hover:shadow-md transition-shadow duration-300">
                  <div className="text-4xl mb-4">📍</div>
                  <h3 className="font-semibold text-lg mb-2">{city}</h3>
                  <p className="text-gray-600 mb-4">Find freelancers in {city}</p>
                  <button className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors duration-300">
                    Browse {city}
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          <div className="text-center">
            <Link
              to="/services"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Browse All Freelancers
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocalFreelancersPage;