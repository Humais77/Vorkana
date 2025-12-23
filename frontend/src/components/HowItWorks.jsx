// components/home/HowItWorks.jsx
import React from 'react';
import { Search, MessageSquare, CheckCircle } from 'lucide-react';

const STEPS = [
  {
    id: 1,
    title: "Find Services",
    description: "Browse through thousands of professional services or post your project requirements for experts to bid on.",
    icon: Search,
    iconColor: "bg-blue-50 text-blue-600",
    borderColor: "border-blue-100"
  },
  {
    id: 2,
    title: "Connect with Experts",
    description: "Communicate directly with service providers, discuss project details, and agree on terms through our secure messaging.",
    icon: MessageSquare,
    iconColor: "bg-green-50 text-green-600",
    borderColor: "border-green-100"
  },
  {
    id: 3,
    title: "Complete Project",
    description: "Review deliverables, make secure payments upon satisfaction, and manage ongoing projects efficiently.",
    icon: CheckCircle,
    iconColor: "bg-purple-50 text-purple-600",
    borderColor: "border-purple-100"
  },
];

const HowItWorks = () => {
  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            How It Works
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            A streamlined process to connect you with skilled professionals and get your projects done efficiently.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <div 
                key={step.id} 
                className="relative bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-300"
              >
                <div className="flex items-start">
                  <div className={`flex-shrink-0 w-12 h-12 ${step.iconColor} rounded-lg flex items-center justify-center ${step.borderColor} border`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  
                  <div className="ml-4">
                    <div className="flex items-center mb-1">
                      <span className="text-sm font-medium text-gray-500 mr-2">Step {step.id}</span>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {step.title}
                    </h3>
                    <p className="text-gray-600">
                      {step.description}
                    </p>
                  </div>
                </div>
                
                {/* Number indicator */}
                <div className="absolute -top-3 -left-3 w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  {step.id}
                </div>
              </div>
            );
          })}
        </div>

        
      </div>
    </section>
  );
};

export default HowItWorks;