// layouts/pages/BlogPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const BlogPage = () => {
  const blogPosts = [
    {
      title: 'How to Succeed as a Freelancer in 2024',
      excerpt: 'Learn the essential skills and strategies for freelance success...',
      date: 'January 15, 2024',
      category: 'Freelancing Tips',
      readTime: '5 min read'
    },
    {
      title: 'Building a Strong Online Portfolio',
      excerpt: 'Tips for creating a portfolio that attracts clients...',
      date: 'January 10, 2024',
      category: 'Career Growth',
      readTime: '4 min read'
    },
    {
      title: 'Remote Work Best Practices',
      excerpt: 'How to stay productive and balanced while working remotely...',
      date: 'January 5, 2024',
      category: 'Remote Work',
      readTime: '6 min read'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Blog</h1>
          <p className="text-gray-600 text-lg">
            Insights, tips, and stories from the world of freelancing
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {blogPosts.map((post, index) => (
            <div key={index} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
              <div className="h-48 bg-gradient-to-r from-blue-100 to-indigo-100"></div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">{post.category}</span>
                  <span className="text-gray-500 text-sm">{post.readTime}</span>
                </div>
                <h3 className="font-semibold text-xl text-gray-800 mb-3">{post.title}</h3>
                <p className="text-gray-600 mb-4">{post.excerpt}</p>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-sm">{post.date}</span>
                  <button className="text-blue-600 hover:text-blue-800 font-medium">
                    Read Article →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="text-center">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Subscribe to Our Newsletter</h2>
            <p className="text-gray-600 mb-6">
              Get the latest articles, tips, and updates delivered to your inbox
            </p>
            <div className="max-w-md mx-auto">
              <div className="flex">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-l-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <button className="px-6 py-3 bg-blue-600 text-white font-medium rounded-r-lg hover:bg-blue-700 transition-colors duration-300">
                  Subscribe
                </button>
              </div>
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
  );
};

export default BlogPage;