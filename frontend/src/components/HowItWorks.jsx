// components/home/HowItWorks.jsx
import React from 'react';
import { Search, MessageSquare, CheckCircle } from 'lucide-react';

const HowItWorks = () => {
  const steps = [
    {
      title: "Find Gigs",
      desc: "Browse professional gigs or post your project.",
      icon: Search,
      color: "blue"
    },
    {
      title: "Connect & Discuss",
      desc: "Message providers and agree on terms.",
      icon: MessageSquare,
      color: "green"
    },
    {
      title: "Complete Project",
      desc: "Review work and manage your projects.",
      icon: CheckCircle,
      color: "purple"
    },
  ];

  return (
    <section className="py-12 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">How It Works</h2>
          <p className="text-gray-600">Simple steps to get your projects done</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const colors = {
              blue: "bg-blue-100 text-blue-600",
              green: "bg-green-100 text-green-600",
              purple: "bg-purple-100 text-purple-600"
            };

            return (
              <div key={index} className="text-center p-6">
                <div className={`w-16 h-16 ${colors[step.color]} rounded-full flex items-center justify-center mx-auto mb-4`}>
                  <Icon className="w-8 h-8" />
                </div>
                <div className="text-lg font-semibold text-gray-900 mb-2">
                  {step.title}
                </div>
                <p className="text-gray-600">
                  {step.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;