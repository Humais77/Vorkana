// layouts/pages/TrustSafetyPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const TrustSafetyPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Trust & Safety</h1>
          <p className="text-gray-600 text-lg">
            Your security is our top priority
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-8 mb-12">
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Our Security Measures</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-6 border border-gray-200 rounded-lg hover:shadow-md transition-shadow duration-300">
                <div className="text-3xl mb-4">🔒</div>
                <h3 className="font-semibold text-lg mb-2">Secure Payments</h3>
                <p className="text-gray-600">All transactions are encrypted and secure</p>
              </div>
              <div className="p-6 border border-gray-200 rounded-lg hover:shadow-md transition-shadow duration-300">
                <div className="text-3xl mb-4">✅</div>
                <h3 className="font-semibold text-lg mb-2">Identity Verification</h3>
                <p className="text-gray-600">Comprehensive verification processes</p>
              </div>
              <div className="p-6 border border-gray-200 rounded-lg hover:shadow-md transition-shadow duration-300">
                <div className="text-3xl mb-4">👁️</div>
                <h3 className="font-semibold text-lg mb-2">Fraud Detection</h3>
                <p className="text-gray-600">Advanced systems to detect and prevent fraud</p>
              </div>
            </div>
          </div>
          
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Safety Guidelines</h2>
            <div className="space-y-6">
              <div className="p-6 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-lg text-blue-800 mb-2">For Clients</h3>
                <ul className="space-y-2 text-blue-700">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Check freelancer profiles and reviews before hiring</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Use our secure payment system for all transactions</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Communicate through our platform for protection</span>
                  </li>
                </ul>
              </div>
              
              <div className="p-6 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-lg text-green-800 mb-2">For Freelancers</h3>
                <ul className="space-y-2 text-green-700">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Never share personal contact information prematurely</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Use milestones for large projects</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Report any suspicious activity immediately</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <Link
              to="/help"
              className="inline-flex items-center px-6 py-3 border border-blue-600 text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors duration-300 mr-4"
            >
              Visit Help Center
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-300"
            >
              Report an Issue
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrustSafetyPage;