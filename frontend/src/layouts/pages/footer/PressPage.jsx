// layouts/pages/PressPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const PressPage = () => {
  const pressReleases = [
    {
      title: 'Vorkanna Launches New Platform',
      date: 'December 15, 2023',
      summary: 'Announcing the launch of our revamped freelancing platform'
    },
    {
      title: 'Partnership with Tech Giants',
      date: 'November 30, 2023',
      summary: 'New partnerships to enhance our service offerings'
    },
    {
      title: 'Series A Funding Round',
      date: 'October 20, 2023',
      summary: 'Secured $10M in Series A funding to expand operations'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Press & Media</h1>
          <p className="text-gray-600 text-lg">
            Latest news and media resources
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Media Inquiries</h2>
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-lg text-blue-800 mb-2">Contact Our Press Team</h3>
              <p className="text-blue-700 mb-4">
                For media inquiries, interviews, or press information, please contact:
              </p>
              <div className="space-y-2">
                <p className="text-blue-800"><strong>Email:</strong> press@Vorkanna.com</p>
                <p className="text-blue-800"><strong>Phone:</strong> +1 (555) 123-4567 ext. 101</p>
              </div>
            </div>
          </div>
          
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Latest Press Releases</h2>
            <div className="space-y-6">
              {pressReleases.map((release, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50 transition-colors duration-300">
                  <div className="text-sm text-gray-500 mb-2">{release.date}</div>
                  <h3 className="font-semibold text-lg text-gray-800 mb-2">{release.title}</h3>
                  <p className="text-gray-600 mb-4">{release.summary}</p>
                  <button className="text-blue-600 hover:text-blue-800 font-medium">
                    Read More →
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Media Resources</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="border border-gray-200 rounded-lg p-6 text-center">
                <div className="text-3xl mb-4">📱</div>
                <h3 className="font-semibold text-lg mb-2">Brand Assets</h3>
                <p className="text-gray-600 mb-4">Download logos and brand guidelines</p>
                <button className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors duration-300">
                  Download
                </button>
              </div>
              <div className="border border-gray-200 rounded-lg p-6 text-center">
                <div className="text-3xl mb-4">📊</div>
                <h3 className="font-semibold text-lg mb-2">Company Facts</h3>
                <p className="text-gray-600 mb-4">Key statistics and company information</p>
                <button className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors duration-300">
                  View Facts
                </button>
              </div>
              <div className="border border-gray-200 rounded-lg p-6 text-center">
                <div className="text-3xl mb-4">👥</div>
                <h3 className="font-semibold text-lg mb-2">Team Bios</h3>
                <p className="text-gray-600 mb-4">Meet our leadership team</p>
                <button className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors duration-300">
                  View Team
                </button>
              </div>
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
    </div>
  );
};

export default PressPage;