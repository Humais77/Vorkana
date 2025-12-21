// layouts/pages/PaymentProtectionPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const PaymentProtectionPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Payment Protection</h1>
          <p className="text-gray-600 text-lg">
            Secure transactions with guaranteed protection
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-8 mb-12">
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">How Payment Protection Works</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="p-6 border border-gray-200 rounded-lg hover:shadow-md transition-shadow duration-300">
                <div className="text-3xl mb-4">💳</div>
                <h3 className="font-semibold text-lg mb-2">Secure Escrow</h3>
                <p className="text-gray-600">Funds are held securely until work is completed</p>
              </div>
              
              <div className="p-6 border border-gray-200 rounded-lg hover:shadow-md transition-shadow duration-300">
                <div className="text-3xl mb-4">✅</div>
                <h3 className="font-semibold text-lg mb-2">Milestone Approval</h3>
                <p className="text-gray-600">Release payments only when you're satisfied</p>
              </div>
              
              <div className="p-6 border border-gray-200 rounded-lg hover:shadow-md transition-shadow duration-300">
                <div className="text-3xl mb-4">🛡️</div>
                <h3 className="font-semibold text-lg mb-2">Dispute Resolution</h3>
                <p className="text-gray-600">Fair mediation if issues arise</p>
              </div>
            </div>
          </div>
          
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">For Clients</h2>
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-lg text-blue-800 mb-3">Your Funds Are Protected</h3>
              <ul className="space-y-2 text-blue-700">
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Payments only released when you approve the work</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Full refund if work is not delivered as agreed</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>24/7 fraud monitoring and protection</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Secure payment processing with encryption</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">For Freelancers</h2>
            <div className="bg-green-50 border border-green-100 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-lg text-green-800 mb-3">Get Paid for Your Work</h3>
              <ul className="space-y-2 text-green-700">
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Guaranteed payment for approved work</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Secure escrow ensures funds are available</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Protection against fraudulent chargebacks</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Timely payments with multiple withdrawal options</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="text-center">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-lg p-8 mb-8">
              <h3 className="font-semibold text-xl text-blue-800 mb-4">Have Questions About Payment Protection?</h3>
              <p className="text-blue-700 mb-6">
                Our support team is available to answer any questions about our payment protection system.
              </p>
              <div className="space-x-4">
                <Link
                  to="/help"
                  className="inline-flex items-center px-6 py-3 border border-blue-600 text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors duration-300"
                >
                  Payment FAQ
                </Link>
                <Link
                  to="/contact"
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-300"
                >
                  Contact Support
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

export default PaymentProtectionPage;