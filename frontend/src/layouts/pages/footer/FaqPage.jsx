// layouts/pages/FaqPage.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const FaqPage = () => {
  const [openCategory, setOpenCategory] = useState(null);
  const [openQuestions, setOpenQuestions] = useState({});

  const faqData = [
    {
      category: 'Getting Started',
      questions: [
        {
          q: 'How do I create an account?',
          a: 'Click the "Sign Up" button in the top right corner and fill in your details. You can sign up with your email or use social login options.'
        },
        {
          q: 'Is there a fee to join?',
          a: 'No, creating an account is completely free. You only pay for services you purchase or pay a commission when you earn from your services.'
        },
        {
          q: 'How do I verify my account?',
          a: 'After signing up, check your email for a verification link. You can also verify your identity through your account settings for additional trust.'
        }
      ]
    },
    {
      category: 'Services & Orders',
      questions: [
        {
          q: 'How do I create a service?',
          a: 'Navigate to "Create Service" from your dashboard or the main menu. Fill in the service details, set your pricing, and publish your service.'
        },
        {
          q: 'How do I place an order?',
          a: 'Browse services, select one that fits your needs, click "Order Now", choose your package, and complete the payment process.'
        },
        {
          q: 'What payment methods are accepted?',
          a: 'We accept major credit cards, PayPal, and bank transfers. All payments are processed securely through our encrypted payment system.'
        }
      ]
    },
    {
      category: 'Payments & Pricing',
      questions: [
        {
          q: 'How are freelancers paid?',
          a: 'Freelancers are paid once the client approves the delivered work. Payments are processed weekly and can be withdrawn to your preferred method.'
        },
        {
          q: 'What is the service fee?',
          a: 'We charge a 10% service fee on each transaction. This helps us maintain and improve our platform and provide customer support.'
        },
        {
          q: 'When will I receive my payment?',
          a: 'Payments are typically processed within 3-5 business days after work approval. You can track payment status in your dashboard.'
        }
      ]
    }
  ];

  const toggleCategory = (index) => {
    setOpenCategory(openCategory === index ? null : index);
  };

  const toggleQuestion = (categoryIndex, questionIndex) => {
    setOpenQuestions(prev => ({
      ...prev,
      [`${categoryIndex}-${questionIndex}`]: !prev[`${categoryIndex}-${questionIndex}`]
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h1>
          <p className="text-gray-600 text-lg">
            Find answers to common questions
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          {/* Search Bar */}
          <div className="mb-12">
            <div className="relative">
              <input
                type="text"
                placeholder="Search for questions..."
                className="w-full px-6 py-4 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 shadow-sm"
              />
              <button className="absolute right-3 top-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300">
                Search
              </button>
            </div>
          </div>
          
          {/* FAQ Categories */}
          <div className="space-y-6 mb-12">
            {faqData.map((category, categoryIndex) => (
              <div key={categoryIndex} className="bg-white rounded-lg shadow-lg overflow-hidden">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(categoryIndex)}
                  className="w-full px-6 py-4 bg-gray-50 hover:bg-gray-100 transition-colors duration-300 flex justify-between items-center"
                >
                  <h3 className="font-semibold text-lg text-gray-800">{category.category}</h3>
                  <span className="text-gray-500 text-xl">
                    {openCategory === categoryIndex ? '−' : '+'}
                  </span>
                </button>
                
                {/* Questions (Collapsible) */}
                {openCategory === categoryIndex && (
                  <div className="px-6 py-4 space-y-4">
                    {category.questions.map((question, questionIndex) => (
                      <div key={questionIndex} className="border-b border-gray-200 last:border-b-0 pb-4 last:pb-0">
                        <button
                          onClick={() => toggleQuestion(categoryIndex, questionIndex)}
                          className="w-full text-left flex justify-between items-start"
                        >
                          <h4 className="font-medium text-gray-800 flex-1 mr-4">{question.q}</h4>
                          <span className="text-gray-500 text-lg flex-shrink-0">
                            {openQuestions[`${categoryIndex}-${questionIndex}`] ? '−' : '+'}
                          </span>
                        </button>
                        
                        {openQuestions[`${categoryIndex}-${questionIndex}`] && (
                          <div className="mt-3 pl-4">
                            <p className="text-gray-600">{question.a}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            <Link
              to="/help"
              className="block p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-lg hover:shadow-md transition-shadow duration-300"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-800">Visit Help Center</span>
                <span className="text-blue-600 text-xl">→</span>
              </div>
              <p className="text-gray-600 text-sm mt-2">Detailed guides and tutorials</p>
            </Link>
            
            <Link
              to="/contact"
              className="block p-6 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-lg hover:shadow-md transition-shadow duration-300"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-800">Contact Support</span>
                <span className="text-green-600 text-xl">→</span>
              </div>
              <p className="text-gray-600 text-sm mt-2">Get personalized help</p>
            </Link>
            
            <Link
              to="/blog"
              className="block p-6 bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100 rounded-lg hover:shadow-md transition-shadow duration-300"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-800">Read Our Blog</span>
                <span className="text-purple-600 text-xl">→</span>
              </div>
              <p className="text-gray-600 text-sm mt-2">Tips and best practices</p>
            </Link>
          </div>
          
          {/* Still Have Questions */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-8 text-center text-white mb-12">
            <h3 className="text-2xl font-bold mb-4">Still Have Questions?</h3>
            <p className="mb-6 opacity-90">
              Our support team is ready to help you with any questions not covered here.
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center px-8 py-3 bg-white text-blue-600 font-medium rounded-lg hover:bg-gray-100 transition-colors duration-300 shadow-lg"
            >
              Contact Support
            </Link>
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
    </div>
  );
};

export default FaqPage;