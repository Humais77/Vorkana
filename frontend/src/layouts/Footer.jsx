import React from "react";
import { Link } from "react-router-dom";
import { IoLogoInstagram } from "react-icons/io";
import { RiTwitterXLine } from "react-icons/ri";
import { TbBrandMeta } from "react-icons/tb";
import { FiPhoneCall } from "react-icons/fi";

const Footer = () => {
  const footerSections = [
    {
      title: "Categories",
      links: [
        "Graphics & Design",
        "Digital Marketing",
        "Writing & Translation",
        "Video & Animation",
        "Music & Audio",
        "Programming & Tech",
        "AI Services",
        "Consulting",
        "Data",
        "Business",
        "Personal Growth & Hobbies",
        "Photography",
        "Finance",
        "End-to-End Projects",
        "Service Catalog",
        "For Clients"
      ]
    },
    {
      title: "How it Works",
      links: [
        "How Vorkana Works",
        "Customer Success Stories",
        "Quality Guide",
        "Vorkana Guides",
        "Vorkana Answers",
        "Browse Freelance By Skill"
      ]
    },
    {
      title: "For Freelancers",
      links: [
        "Become a Freelancer",
        "Become an Agency",
        "Freelancer Equity Program",
        "Community Hub",
        "Forum",
        "Events"
      ]
    },
    {
      title: "Business Solutions",
      links: [
        "Vorkana Pro",
        "Project Management Service",
        "Expert Sourcing Service",
        "ClearVoice - Content Marketing",
        "AutoDS - Dropshipping Tool",
        "AI store builder",
        "Vorkana Logo Maker",
        "Contact Sales"
      ]
    },
    {
      title: "Company",
      links: [
        "About Us",
        "Help Center",
        "Trust & Safety",
        "Social Impact",
        "Careers",
        "Terms of Service",
        "Privacy Policy",
        "Do not sell or share my personal information",
        "Partnerships",
        "Creator Network",
        "Affiliates",
        "Invite a Friend",
        "Press & News",
        "Investor Relations"
      ]
    }
  ];

  const socialLinks = [
    { icon: TbBrandMeta, url: "https://www.facebook.com", label: "Facebook" },
    { icon: IoLogoInstagram, url: "https://www.instagram.com", label: "Instagram" },
    { icon: RiTwitterXLine, url: "https://www.twitter.com", label: "Twitter" },
  ];

  return (
    <footer className="bg-gray-900 text-white pt-16 pb-10">
      <div className="max-w-7xl mx-auto px-6">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          {footerSections.map((section, index) => (
            <div key={index}>
              <h3 className="font-bold text-white mb-6 text-lg">
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <Link 
                      to="#" 
                      className="text-gray-400 hover:text-white transition-colors duration-200 text-sm"
                    >
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 my-8"></div>

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row justify-between items-center">
          {/* Logo and Copyright */}
          <div className="mb-6 md:mb-0">
            <div className="text-2xl font-bold text-white mb-2">Vorkana</div>
            <p className="text-gray-400 text-sm">
              &copy; 2025 Vorkana International Ltd. All rights reserved.
            </p>
          </div>

          {/* Social Links and Language/Currency */}
          <div className="flex flex-col items-center md:items-end space-y-4">
            {/* Social Links */}
            <div className="flex space-x-4">
              {socialLinks.map(({ icon: Icon, url, label }, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors duration-200"
                >
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>

            {/* Language and Currency Selector */}
            <div className="flex items-center space-x-6">
              {/* Language Selector */}
              <div className="flex items-center space-x-2">
                <span className="text-gray-400 text-sm">Language:</span>
                <select className="bg-gray-800 text-white border border-gray-700 rounded px-3 py-1 text-sm focus:outline-none focus:border-blue-500">
                  <option>English</option>
                  <option>Español</option>
                  <option>Français</option>
                  <option>Deutsch</option>
                </select>
              </div>

              {/* Currency Selector */}
              <div className="flex items-center space-x-2">
                <span className="text-gray-400 text-sm">Currency:</span>
                <select className="bg-gray-800 text-white border border-gray-700 rounded px-3 py-1 text-sm focus:outline-none focus:border-blue-500">
                  <option>USD ($)</option>
                  <option>EUR (€)</option>
                  <option>GBP (£)</option>
                  <option>PKR (₨)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;