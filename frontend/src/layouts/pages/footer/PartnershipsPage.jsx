// layouts/pages/PartnershipsPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const PartnershipsPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Partnerships</h1>
          <p className="text-gray-600 text-lg">
            Strategic partnerships that drive mutual growth
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Our Partnership Areas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <div className="p-6 border border-gray-200 rounded-lg hover:shadow-md transition-shadow duration-300">
                <div className="text-3xl mb-4">🏢</div>
                <h3 className="font-semibold text-lg mb-2">Enterprise Solutions</h3>
                <p className="text-gray-600">Integrate our platform with your HR systems</p>
              </div>
              <div className="p-6 border border-gray-200 rounded-lg hover:shadow-md transition-shadow duration-300">
                <div className="text-3xl mb-4">🎓</div>
                <h3 className="font-semibold text-lg mb-2">Educational Partners</h3>
                <p className="text-gray-600">Connect students with real-world projects</p>
              </div>
              <div className="p-6 border border-gray-200 rounded-lg hover:shadow-md transition-shadow duration-300">
                <div className="text-3xl mb-4">🛠️</div>
                <h3 className="font-semibold text-lg mb-2">Technology Partners</h3>
                <p className="text-gray-600">Integrate with our API and platform</p>
              </div>
            </div>
          </div>
          
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Benefits of Partnering with Us</h2>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 text-green-500 mr-3">✓</div>
                <span className="text-gray-700">Access to our network of skilled professionals</span>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 text-green-500 mr-3">✓</div>
                <span className="text-gray-700">Revenue sharing opportunities</span>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 text-green-500 mr-3">✓</div>
                <span className="text-gray-700">Co-marketing and joint campaigns</span>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 text-green-500 mr-3">✓</div>
                <span className="text-gray-700">Technical integration support</span>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 text-green-500 mr-3">✓</div>
                <span className="text-gray-700">Dedicated partnership manager</span>
              </li>
            </ul>
          </div>
          
          <div className="text-center">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-lg p-8 mb-8">
              <h3 className="font-semibold text-xl text-blue-800 mb-4">Interested in Partnership?</h3>
              <p className="text-blue-700 mb-6">
                Let's discuss how we can work together to create value for both our organizations
              </p>
              <div className="space-x-4">
                <button className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-300">
                  Contact Partnerships Team
                </button>
                <Link
                  to="/contact"
                  className="inline-flex items-center px-8 py-3 border border-blue-600 text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors duration-300"
                >
                  General Inquiry
                </Link>
              </div>
            </div>
            
            <Link
              to="/"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartnershipsPage;