import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Footer from './Footer';

const AboutUsPage = () => {
  const location = useLocation();
  
  // Get query parameters
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const source = queryParams.get('source');
    const medium = queryParams.get('medium');
    const campaign = queryParams.get('campaign');
    
    // Track page view with query parameters
    if (source) {
      console.log(`About Us page visited from: ${source}`);
      
      // Send to analytics
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'page_view', {
          page_title: 'About Us',
          page_location: window.location.href,
          source: source,
          medium: medium || 'website',
          campaign: campaign || 'direct'
        });
      }
    }
  }, [location.search]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      {/* Header/Navbar would go here */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            About Vorkana
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Connecting talented freelancers with visionary clients worldwide
          </p>
        </div>

        {/* Mission Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-12">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
            <p className="text-gray-700 text-lg leading-relaxed mb-6">
              At Vorkana, we believe that talent knows no boundaries. Our mission is to 
              democratize access to global opportunities by creating a platform where 
              freelancers can thrive and businesses can find the perfect talent for 
              their projects.
            </p>
            <p className="text-gray-700 text-lg leading-relaxed">
              We're building more than just a marketplace - we're creating a community 
              where creativity meets opportunity, and where every professional can 
              build the career they've always wanted.
            </p>
          </div>
        </div>

        {/* Values Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-xl shadow-sm border border-blue-100">
            <div className="text-blue-600 text-3xl mb-4">🌍</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Global Reach</h3>
            <p className="text-gray-600">
              Connecting professionals from every corner of the world, breaking down 
              geographical barriers to opportunity.
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-white p-6 rounded-xl shadow-sm border border-green-100">
            <div className="text-green-600 text-3xl mb-4">🤝</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Trust & Safety</h3>
            <p className="text-gray-600">
              Built-in protections, verified profiles, and secure payments to ensure 
              every transaction is safe and reliable.
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-white p-6 rounded-xl shadow-sm border border-purple-100">
            <div className="text-purple-600 text-3xl mb-4">⚡</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Speed & Efficiency</h3>
            <p className="text-gray-600">
              Streamlined processes that help you find talent or projects faster, 
              so you can focus on what matters most.
            </p>
          </div>
        </div>

        {/* Story Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Our Story</h2>
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
            <p className="text-gray-700 mb-4">
              Vorkana was founded in 2023 by a team of entrepreneurs and freelancers 
              who experienced firsthand the challenges of finding quality work and 
              reliable talent in the digital economy.
            </p>
            <p className="text-gray-700 mb-4">
              Frustrated by platforms that prioritized quantity over quality, we set 
              out to build a different kind of freelancing platform - one that values 
              human connection, supports professional growth, and makes the entire 
              process seamless and enjoyable.
            </p>
            <p className="text-gray-700">
              Today, Vorkana serves thousands of professionals and businesses 
              worldwide, helping them build meaningful partnerships and achieve 
              their goals together.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Join Our Community</h2>
          <p className="text-gray-600 text-lg mb-8 max-w-2xl mx-auto">
            Whether you're looking to hire exceptional talent or build your 
            freelance career, Vorkana is the place for you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/"
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-300 shadow-sm hover:shadow"
            >
              Start Hiring
            </Link>
            <Link
              to="/create-gig"
              className="px-8 py-3 bg-white hover:bg-gray-50 text-blue-600 font-medium rounded-lg border-2 border-blue-600 transition-colors duration-300 shadow-sm hover:shadow"
            >
              Start Freelancing
            </Link>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default AboutUsPage;