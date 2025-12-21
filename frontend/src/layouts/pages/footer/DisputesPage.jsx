// layouts/pages/DisputesPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const DisputesPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Dispute Resolution</h1>
          <p className="text-gray-600 text-lg">
            Fair and transparent resolution process
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-8 mb-12">
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Our Dispute Resolution Process</h2>
            
            <div className="space-y-8">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                  <span className="text-blue-600 font-bold text-lg">1</span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Direct Resolution</h3>
                  <p className="text-gray-600">
                    We encourage both parties to communicate directly to resolve issues before escalating.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                  <span className="text-blue-600 font-bold text-lg">2</span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Mediation</h3>
                  <p className="text-gray-600">
                    If direct resolution fails, our support team will mediate between both parties.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                  <span className="text-blue-600 font-bold text-lg">3</span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Arbitration</h3>
                  <p className="text-gray-600">
                    As a last resort, our arbitration team will make a final decision based on evidence.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Tips for Avoiding Disputes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-lg text-green-800 mb-2">Clear Communication</h3>
                <p className="text-green-700">
                  Ensure project requirements, deadlines, and expectations are clearly documented and agreed upon.
                </p>
              </div>
              
              <div className="p-6 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-lg text-green-800 mb-2">Use Milestones</h3>
                <p className="text-green-700">
                  For larger projects, break them into smaller milestones with clear deliverables.
                </p>
              </div>
              
              <div className="p-6 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-lg text-green-800 mb-2">Regular Updates</h3>
                <p className="text-green-700">
                  Provide regular progress updates to ensure both parties are aligned.
                </p>
              </div>
              
              <div className="p-6 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-lg text-green-800 mb-2">Document Everything</h3>
                <p className="text-green-700">
                  Keep all communication and agreements within our platform for reference.
                </p>
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-8 mb-8">
              <h3 className="font-semibold text-xl text-blue-800 mb-4">Need Help with a Dispute?</h3>
              <p className="text-blue-700 mb-6">
                Our support team is here to help resolve issues fairly and efficiently.
              </p>
              <div className="space-x-4">
                <Link
                  to="/help"
                  className="inline-flex items-center px-6 py-3 border border-blue-600 text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors duration-300"
                >
                  Read Dispute FAQ
                </Link>
                <Link
                  to="/contact"
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-300"
                >
                  File a Dispute
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

export default DisputesPage;