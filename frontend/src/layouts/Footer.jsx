import React from "react";
import { FaFacebook, FaInstagram, FaLinkedin, FaXTwitter } from 'react-icons/fa6';
import TrackedLink from '../components/TrackedLink';

const Footer = () => {
  const footerLinks = {
   
    company: {
      title: "Company",
      links: [
        { label: "About Us", path: "/about-us", source: "footer", section: "company", campaign: "about_us_footer" },
        { label: "Careers", path: "/careers", source: "footer", section: "company", campaign: "careers_footer" },
        { label: "Press & Media", path: "/press", source: "footer", section: "company", campaign: "press_footer" },
        { label: "Blog", path: "/blog", source: "footer", section: "company", campaign: "blog_footer" },
        { label: "Affiliate Program", path: "/affiliates", source: "footer", section: "company", campaign: "affiliates_footer" },
        { label: "Partnerships", path: "/partnerships", source: "footer", section: "company", campaign: "partnerships_footer" },
      ]
    },
    support: {
      title: "Support",
      links: [
        { label: "Help Center", path: "/help", source: "footer", section: "support", campaign: "help_footer" },
        { label: "Contact Support", path: "/contact", source: "footer", section: "support", campaign: "contact_footer" },
        { label: "Trust & Safety", path: "/trust", source: "footer", section: "support", campaign: "trust_footer" },
        { label: "Dispute Resolution", path: "/disputes", source: "footer", section: "support", campaign: "disputes_footer" },
        { label: "Payment Protection", path: "/payment-protection", source: "footer", section: "support", campaign: "payment_footer" },
        { label: "FAQ", path: "/faq", source: "footer", section: "support", campaign: "faq_footer" },
      ]
    }
  };

  return (
    <footer className="bg-gradient-to-b from-slate-50 to-gray-100 text-gray-800 pt-16 pb-10 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
              <TrackedLink 
                to="/"
                source="footer"
                medium="website"
                campaign="logo_footer"
                className="text-2xl font-bold text-gray-900 hover:text-blue-600 transition-colors duration-200"
              >
                Vorkana
              </TrackedLink>
            </div>
            
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} Vorkana. All rights reserved.
            </p>
          </div>

          {/* Social Links */}
          <div className="flex flex-col items-center lg:items-end gap-6">
            <div className="flex items-center gap-6">
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-gray-600 hover:text-blue-600 transition-colors duration-200"
                onClick={() => {
                  if (typeof window !== 'undefined' && window.gtag) {
                    window.gtag('event', 'social_click', {
                      event_category: 'social',
                      event_label: 'facebook',
                      source: 'footer'
                    });
                  }
                }}
              >
                <FaFacebook/>
              </a>
              <a 
                href="https://twitter.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-gray-600 hover:text-blue-400 transition-colors duration-200"
                onClick={() => {
                  if (typeof window !== 'undefined' && window.gtag) {
                    window.gtag('event', 'social_click', {
                      event_category: 'social',
                      event_label: 'twitter',
                      source: 'footer'
                    });
                  }
                }}
              >
                <FaXTwitter/>
              </a>
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-gray-600 hover:text-pink-600 transition-colors duration-200"
                onClick={() => {
                  if (typeof window !== 'undefined' && window.gtag) {
                    window.gtag('event', 'social_click', {
                      event_category: 'social',
                      event_label: 'instagram',
                      source: 'footer'
                    });
                  }
                }}
              >
                <FaInstagram/>
              </a>
              <a 
                href="https://linkedin.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-gray-600 hover:text-blue-700 transition-colors duration-200"
                onClick={() => {
                  if (typeof window !== 'undefined' && window.gtag) {
                    window.gtag('event', 'social_click', {
                      event_category: 'social',
                      event_label: 'linkedin',
                      source: 'footer'
                    });
                  }
                }}
              >
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