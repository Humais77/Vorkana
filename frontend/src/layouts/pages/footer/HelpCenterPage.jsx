// layouts/pages/HelpCenterPage.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const HelpCenterPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const faqCategories = [
    {
      title: 'Getting Started',
      questions: [
        'How do I create an account?',
        'How do I verify my email?',
        'How do I set up my profile?'
      ]
    },
    {
      title: 'Account & Settings',
      questions: [
        'How do I change my password?',
        'How do I update my payment methods?',
        'How do I manage notifications?'
      ]
    },
    {
      title: 'Services & Orders',
      questions: [
        'How do I create a service?',
        'How do I place an order?',
        'How do I manage my orders?'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Help Center</h1>
          <p className="text-gray-600 text-lg">
            Find answers and get support
          </p>
        </div>
        
        <div className="max-w-3xl mx-auto mb-12">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for help articles..."
              className="w-full px-6 py-4 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 shadow-sm"
            />
            <button className="absolute right-3 top-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300">
              Search
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-8 mb-12">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Frequently Asked Questions</h2>
          
          <div className="space-y-8">
            {faqCategories.map((category, index) => (
              <div key={index}>
                <h3 className="font-semibold text-lg text-gray-800 mb-4">{category.title}</h3>
                <div className="space-y-3">
                  {category.questions.map((question, qIndex) => (
                    <div key={qIndex} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors duration-300">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">{question}</span>
                        <button className="text-blue-600 hover:text-blue-800">
                          View Answer →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-lg p-6">
            <div className="text-3xl mb-4">📞</div>
            <h3 className="font-semibold text-lg mb-2">Contact Support</h3>
            <p className="text-gray-600 mb-4">Get help from our support team</p>
            <Link
              to="/contact"
              className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
            >
              Contact Us →
            </Link>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-lg p-6">
            <div className="text-3xl mb-4">📚</div>
            <h3 className="font-semibold text-lg mb-2">Documentation</h3>
            <p className="text-gray-600 mb-4">Browse our detailed guides</p>
            <button className="inline-flex items-center text-green-600 hover:text-green-800 font-medium">
              View Guides →
            </button>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100 rounded-lg p-6">
            <div className="text-3xl mb-4">🎥</div>
            <h3 className="font-semibold text-lg mb-2">Video Tutorials</h3>
            <p className="text-gray-600 mb-4">Watch step-by-step tutorials</p>
            <button className="inline-flex items-center text-purple-600 hover:text-purple-800 font-medium">
              Watch Videos →
            </button>
          </div>
        </div>
        
        <div className="text-center">
          <Link
            to="/"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HelpCenterPage;