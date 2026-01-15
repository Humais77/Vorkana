import React from 'react';

const HowItWorksPage = () => {
  const steps = [
    {
      number: "01",
      title: "Post Your Project",
      description: "Describe what you need done. Be specific about requirements, timeline, and budget.",
      icon: "📝"
    },
    {
      number: "02",
      title: "Receive Proposals",
      description: "Get bids from qualified freelancers within hours. Review profiles, ratings, and portfolios.",
      icon: "💼"
    },
    {
      number: "03",
      title: "Choose the Right Freelancer",
      description: "Compare proposals, interview candidates, and select the best fit for your project.",
      icon: "⭐"
    },
    {
      number: "04",
      title: "Collaborate Securely",
      description: "Use our platform to communicate, share files, and make payments safely.",
      icon: "🤝"
    },
    {
      number: "05",
      title: "Complete & Review",
      description: "Approve the work, release payment, and leave a review to help others.",
      icon: "✅"
    }
  ];

  return (
    <div className="min-h-screen bg-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-black mb-6">
            How Vorkanna Works
          </h1>
          <p className="text-gray-600 text-lg max-w-3xl mx-auto">
            Connecting businesses with top freelance talent. Simple, secure, and efficient.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-12 mb-16">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {/* Connecting Line (except last) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute left-8 top-16 w-0.5 h-24 bg-gray-200 ml-4"></div>
              )}
              
              <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-full bg-black text-white flex items-center justify-center text-2xl font-bold">
                    {step.number}
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-3xl">{step.icon}</span>
                    <h3 className="text-2xl font-bold text-black">{step.title}</h3>
                  </div>
                  <p className="text-gray-600 text-lg">{step.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-black to-gray-900 rounded-2xl p-8 md:p-12 text-white">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-gray-300 text-lg mb-8">
              Join thousands of businesses and freelancers who trust Vorkanna for their projects.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/signup"
                className="bg-white text-black px-8 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors"
              >
                Start Hiring
              </a>
              <a
                href="/create-gig"
                className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-lg font-medium hover:bg-white/10 transition-colors"
              >
                Offer Services
              </a>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <div className="text-center">
            <div className="text-4xl font-bold text-black mb-2">50,000+</div>
            <div className="text-gray-600">Active Freelancers</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-black mb-2">10,000+</div>
            <div className="text-gray-600">Completed Projects</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-black mb-2">98%</div>
            <div className="text-gray-600">Client Satisfaction</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowItWorksPage;