// layouts/pages/SkillsPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const SkillsPage = () => {
  const popularSkills = [
    'Web Development',
    'Mobile App Development',
    'UI/UX Design',
    'Graphic Design',
    'Content Writing',
    'Digital Marketing',
    'Video Editing',
    'SEO',
    'Data Analysis',
    'Project Management'
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Popular Skills</h1>
          <p className="text-gray-600 text-lg">
            Explore the most in-demand skills on our platform
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            {popularSkills.map((skill, index) => (
              <div
                key={index}
                className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-center hover:bg-blue-100 transition-colors duration-300"
              >
                <span className="text-blue-800 font-medium">{skill}</span>
              </div>
            ))}
          </div>
          
          <div className="text-center">
            <Link
              to="/services"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Browse Services by Skill
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkillsPage;