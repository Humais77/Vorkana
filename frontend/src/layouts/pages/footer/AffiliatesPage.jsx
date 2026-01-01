// layouts/pages/AffiliatesPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const AffiliatesPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Affiliate Program</h1>
          <p className="text-gray-600 text-lg">
            Earn commissions by referring clients and freelancers
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Join Our Affiliate Program</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg text-center">
                <div className="text-3xl mb-4">💰</div>
                <h3 className="font-semibold text-lg mb-2">Generous Commissions</h3>
                <p className="text-gray-600">Earn up to 20% on every referral</p>
              </div>
              <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg text-center">
                <div className="text-3xl mb-4">🔄</div>
                <h3 className="font-semibold text-lg mb-2">Recurring Revenue</h3>
                <p className="text-gray-600">Earn on ongoing subscriptions</p>
              </div>
              <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg text-center">
                <div className="text-3xl mb-4">📊</div>
                <h3 className="font-semibold text-lg mb-2">Real-time Tracking</h3>
                <p className="text-gray-600">Monitor your earnings dashboard</p>
              </div>
            </div>
          </div>
          
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">How It Works</h2>
            <div className="space-y-8">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                  <span className="text-blue-600 font-bold text-lg">1</span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Sign Up</h3>
                  <p className="text-gray-600">Register for our affiliate program and get your unique referral link</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                  <span className="text-blue-600 font-bold text-lg">2</span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Share Your Link</h3>
                  <p className="text-gray-600">Share your referral link with your audience through your website, social media, or email</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                  <span className="text-blue-600 font-bold text-lg">3</span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Earn Commissions</h3>
                  <p className="text-gray-600">Get paid when someone signs up or makes a purchase through your link</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-8 mb-8">
              <h3 className="font-semibold text-xl text-blue-800 mb-4">Ready to Start Earning?</h3>
              <p className="text-blue-700 mb-6">
                Join thousands of affiliates who are already earning with Vorkanna
              </p>
              <button className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-300 shadow-lg hover:shadow-xl">
                Apply Now
              </button>
            </div>
            
            <Link
              to="/"
              className="inline-flex items-center px-6 py-3 border border-blue-600 text-base font-medium rounded-md shadow-sm text-blue-600 hover:bg-blue-50"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AffiliatesPage;