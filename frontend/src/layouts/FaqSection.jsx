// src/components/home/FAQSection.jsx
import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    {
      question: 'How do I hire a freelancer?',
      answer: 'Simply post your project with details about what you need. Freelancers will send you proposals. Review their profiles, portfolios, and ratings, then choose the best fit for your project.'
    },
    {
      question: 'How much does it cost to post a project?',
      answer: 'Posting a project is completely free. You only pay when you accept a freelancer\'s proposal and the work begins.'
    },
    {
      question: 'What if I\'m not satisfied with the work?',
      answer: 'We offer a money-back guarantee. If you\'re not satisfied with the delivered work, we\'ll mediate the issue and ensure you get a fair resolution.'
    },
    {
      question: 'How do payments work?',
      answer: 'We use secure payment processing. Payments are held in escrow until you approve the work. This protects both clients and freelancers.'
    },
    {
      question: 'Can I hire freelancers from any country?',
      answer: 'Yes, we have freelancers from over 120 countries. You can filter by location, language, and timezone to find the perfect match.'
    },
    {
      question: 'What types of projects can I post?',
      answer: 'You can post any type of professional service project including web development, design, marketing, writing, video editing, consulting, and more.'
    },
  ];

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Frequently Asked <span className="text-blue-600">Questions</span>
          </h2>
          <p className="text-lg text-gray-600">
            Get answers to common questions about our platform
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-gray-900">{faq.question}</span>
                <ChevronDown
                  className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${
                    openIndex === index ? 'transform rotate-180' : ''
                  }`}
                />
              </button>
              
              <div
                className={`px-6 overflow-hidden transition-all duration-300 ${
                  openIndex === index ? 'max-h-48 pb-6' : 'max-h-0'
                }`}
              >
                <p className="text-gray-600 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;