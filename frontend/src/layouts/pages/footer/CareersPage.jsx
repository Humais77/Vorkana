// layouts/pages/CareersPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const CareersPage = () => {
  const openPositions = [
    {
      title: 'Frontend Developer',
      department: 'Engineering',
      location: 'Remote',
      type: 'Full-time'
    },
    {
      title: 'UX Designer',
      department: 'Design',
      location: 'San Francisco',
      type: 'Full-time'
    },
    {
      title: 'Growth Marketer',
      department: 'Marketing',
      location: 'Remote',
      type: 'Full-time'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Careers at Vorkanna</h1>
          <p className="text-gray-600 text-lg">
            Join our mission to connect talent with opportunity
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Why Work With Us</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="p-6 bg-blue-50 rounded-lg">
                <div className="text-3xl mb-4">🚀</div>
                <h3 className="font-semibold text-lg mb-2">Mission-Driven</h3>
                <p className="text-gray-600">Help build the future of work</p>
              </div>
              <div className="p-6 bg-blue-50 rounded-lg">
                <div className="text-3xl mb-4">🏡</div>
                <h3 className="font-semibold text-lg mb-2">Flexible Work</h3>
                <p className="text-gray-600">Remote-first culture</p>
              </div>
              <div className="p-6 bg-blue-50 rounded-lg">
                <div className="text-3xl mb-4">📈</div>
                <h3 className="font-semibold text-lg mb-2">Growth Opportunities</h3>
                <p className="text-gray-600">Continuous learning and development</p>
              </div>
            </div>
          </div>
          
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Open Positions</h2>
            <div className="space-y-4">
              {openPositions.map((position, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50 transition-colors duration-300">
                  <div className="flex flex-col md:flex-row md:items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-800 mb-2">{position.title}</h3>
                      <div className="flex flex-wrap gap-3 mb-4 md:mb-0">
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">{position.department}</span>
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">{position.location}</span>
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">{position.type}</span>
                      </div>
                    </div>
                    <button className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-300">
                      Apply Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="text-center">
            <p className="text-gray-600 mb-6">
              Don't see a position that matches your skills? We're always looking for talented people.
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CareersPage;