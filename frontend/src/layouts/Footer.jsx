import React from "react";
import { Link } from "react-router-dom";
import { FaFacebook, FaInstagram, FaLinkedin, FaXTwitter} from 'react-icons/fa6';
import { } from "react-icons/fa6";
const Footer = () => {
  const footerLinks = {
    discover: {
      title: "Discover",
      links: [
        { label: "Browse Projects", path: "/projects" },
        { label: "Find Freelancers", path: "/talent" },
        { label: "Popular Skills", path: "/skills" },
        { label: "Top Rated", path: "/top-rated" },
        { label: "Trending Services", path: "/trending" },
        { label: "Local Freelancers", path: "/local" },
      ]
    },
    company: {
      title: "Company",
      links: [
        { label: "About Us", path: "/about" },
        { label: "Careers", path: "/careers" },
        { label: "Press & Media", path: "/press" },
        { label: "Blog", path: "/blog" },
        { label: "Affiliate Program", path: "/affiliates" },
        { label: "Partnerships", path: "/partnerships" },
      ]
    },
    support: {
      title: "Support",
      links: [
        { label: "Help Center", path: "/help" },
        { label: "Contact Support", path: "/contact" },
        { label: "Trust & Safety", path: "/trust" },
        { label: "Dispute Resolution", path: "/disputes" },
        { label: "Payment Protection", path: "/payment-protection" },
        { label: "FAQ", path: "/faq" },
      ]
    }
  };

  return (
    <footer className="bg-gradient-to-b from-slate-50 to-gray-100 text-gray-800 pt-16 pb-10 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Links */}
<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-8 mb-10">
          {Object.values(footerLinks).map((section, index) => (
            <div key={index} className="space-y-4">
              <h3 className="font-bold text-lg text-gray-900 mb-6 border-l-4 border-blue-500 pl-3">
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <Link 
                      to={link.path}
                      className="text-gray-600 hover:text-blue-600 transition-colors duration-200 text-sm block py-1"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-300 my-10"></div>

        {/* Newsletter & Contact */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-10">
          {/* Newsletter */}
          <div className="space-y-6">
            <div>
              <h3 className="font-bold text-xl text-gray-900 mb-2">Stay Updated</h3>
              <p className="text-gray-600 mb-6">Get the latest news, updates, and special offers</p>
            </div>
            <form className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  placeholder="Enter your email address"
                  className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 shadow-sm"
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-300 shadow-sm hover:shadow"
                >
                  Subscribe
                </button>
              </div>
              <p className="text-gray-500 text-xs">
                By subscribing, you agree to our Privacy Policy
              </p>
            </form>
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            <div>
              <h3 className="font-bold text-xl text-gray-900 mb-2">Contact Us</h3>
              <p className="text-gray-600 mb-6">We're here to help you succeed</p>
            </div>
            <div className="space-y-4">
              <div className="text-gray-700">
                <div className="font-medium mb-1">Email</div>
                <div className="text-gray-600">support@vorkana.com</div>
              </div>
              <div className="text-gray-700">
                <div className="font-medium mb-1">Phone</div>
                <div className="text-gray-600">+1 (555) 123-4567</div>
              </div>
              <div className="text-gray-700">
                <div className="font-medium mb-1">Address</div>
                <div className="text-gray-600">
                  123 Business Avenue<br />
                  Suite 100<br />
                  San Francisco, CA 94107
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-300 my-4"></div>

        {/* Bottom Section */}
        <div className="flex flex-col lg:flex-row justify-between items-center gap-8">
          {/* Logo & Copyright */}
          <div className="text-center lg:text-left">
            <div className="mb-4">
              <span className="text-2xl font-bold text-gray-900">
                Vorkana
              </span>
            </div>
            
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} Vorkana. All rights reserved.
            </p>
          </div>

          {/* Settings & Links */}
          <div className="flex flex-col items-center lg:items-end gap-6">
            {/* Social Links */}
            <div className="flex items-center gap-6">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-blue-600 transition-colors duration-200">
                <FaFacebook/>
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-blue-400 transition-colors duration-200">
                <FaXTwitter/>
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-pink-600 transition-colors duration-200">
                <FaInstagram/>
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-blue-700 transition-colors duration-200">
                <FaLinkedin/>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;