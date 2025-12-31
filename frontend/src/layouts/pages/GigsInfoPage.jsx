// components/GigsInfoPage.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  Users, 
  CheckCircle, 
  Clock,
  MessageSquare,
  Phone,
  Video,
  Mail,
  HelpCircle,
  ChevronRight,
  ArrowRight
} from 'lucide-react';

const GigsInfoPage = () => {
  const communicationTypes = [
    {
      type: 'Email',
      icon: <Mail className="w-5 h-5" />,
      benefits: [
        'Detailed written communication',
        'Permanent record of discussions',
        'Time to craft thoughtful responses',
        'Easy to share files and documents',
        'Accessible at any time'
      ],
      bestFor: 'Complex projects requiring detailed specifications and documentation'
    },
    {
      type: 'Phone',
      icon: <Phone className="w-5 h-5" />,
      benefits: [
        'Immediate clarification of questions',
        'Personal connection with freelancer',
        'Faster decision making',
        'Natural conversation flow',
        'Clear tone and emphasis'
      ],
      bestFor: 'Quick discussions, urgent clarifications, or when tone is important'
    },
    {
      type: 'Video Call',
      icon: <Video className="w-5 h-5" />,
      benefits: [
        'Face-to-face interaction',
        'Screen sharing capabilities',
        'Non-verbal communication cues',
        'Better relationship building',
        'Visual demonstrations possible'
      ],
      bestFor: 'Design reviews, complex explanations, or building strong working relationships'
    },
    {
      type: 'Any',
      icon: <MessageSquare className="w-5 h-5" />,
      benefits: [
        'Maximum flexibility',
        'Adapt to freelancer preference',
        'Multiple communication channels',
        'Balanced approach',
        'All the above benefits'
      ],
      bestFor: 'Projects where different phases may require different communication styles'
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4
      }
    },
    hover: {
      y: -5,
      transition: {
        duration: 0.2
      }
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              What are Gigs?
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Gigs are one-time projects where clients post their needs and freelancers apply with proposals.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Basic Information */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="mb-16"
        >
          <motion.h2 
            variants={itemVariants}
            className="text-2xl font-bold text-gray-900 mb-8 border-b border-gray-200 pb-4"
          >
            Understanding Gigs
          </motion.h2>
          
          <motion.div 
            variants={itemVariants}
            className="space-y-6"
          >
            <motion.div 
              variants={cardVariants}
              whileHover="hover"
              className="bg-gray-50 rounded-lg p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-gray-700" />
                What is a Gig?
              </h3>
              <p className="text-gray-700">
                A gig is a project posted by a client looking for a freelancer to complete specific work. 
                Clients describe what they need, set a budget and timeline, and freelancers submit proposals.
              </p>
            </motion.div>

            <motion.div 
              variants={cardVariants}
              whileHover="hover"
              className="bg-gray-50 rounded-lg p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <Users className="w-5 h-5 mr-2 text-gray-700" />
                How Gigs Work
              </h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start">
                  <ChevronRight className="w-5 h-5 mr-2 text-gray-500 flex-shrink-0 mt-0.5" />
                  <span>Client posts project details and requirements</span>
                </li>
                <li className="flex items-start">
                  <ChevronRight className="w-5 h-5 mr-2 text-gray-500 flex-shrink-0 mt-0.5" />
                  <span>Freelancers review and submit proposals</span>
                </li>
                <li className="flex items-start">
                  <ChevronRight className="w-5 h-5 mr-2 text-gray-500 flex-shrink-0 mt-0.5" />
                  <span>Client reviews proposals and selects freelancer</span>
                </li>
                <li className="flex items-start">
                  <ChevronRight className="w-5 h-5 mr-2 text-gray-500 flex-shrink-0 mt-0.5" />
                  <span>Work is completed and delivered</span>
                </li>
              </ul>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Communication Types */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="mb-16"
        >
          <motion.h2 
            variants={itemVariants}
            className="text-2xl font-bold text-gray-900 mb-8 border-b border-gray-200 pb-4"
          >
            Communication Methods
          </motion.h2>
          
          <motion.p 
            variants={itemVariants}
            className="text-gray-700 mb-6"
          >
            Choose the communication method that works best for your project. Different methods offer different benefits:
          </motion.p>

          <motion.div 
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {communicationTypes.map((method, index) => (
              <motion.div
                key={index}
                variants={cardVariants}
                whileHover="hover"
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                <div className="bg-gray-900 text-white p-4 flex items-center">
                  <div className="p-2 bg-white/10 rounded mr-3">
                    {method.icon}
                  </div>
                  <h3 className="text-lg font-semibold">{method.type}</h3>
                </div>
                <div className="p-5">
                  <h4 className="font-semibold text-gray-900 mb-3">Benefits:</h4>
                  <ul className="space-y-2 mb-4">
                    {method.benefits.map((benefit, idx) => (
                      <li key={idx} className="flex items-start">
                        <CheckCircle className="w-4 h-4 text-gray-600 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Best for:</span> {method.bestFor}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Benefits */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="mb-16"
        >
          <motion.h2 
            variants={itemVariants}
            className="text-2xl font-bold text-gray-900 mb-8 border-b border-gray-200 pb-4"
          >
            Benefits of Using Gigs
          </motion.h2>
          
          <motion.div 
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <motion.div variants={itemVariants} className="space-y-4">
              <motion.div 
                variants={itemVariants}
                className="flex items-start"
              >
                <div className="bg-gray-100 p-2 rounded mr-3">
                  <Clock className="w-5 h-5 text-gray-700" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Flexible Timeline</h4>
                  <p className="text-gray-700">Set deadlines that work with your schedule</p>
                </div>
              </motion.div>

              <motion.div 
                variants={itemVariants}
                className="flex items-start"
              >
                <div className="bg-gray-100 p-2 rounded mr-3">
                  <Users className="w-5 h-5 text-gray-700" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Access to Talent</h4>
                  <p className="text-gray-700">Connect with skilled professionals worldwide</p>
                </div>
              </motion.div>
            </motion.div>

            <motion.div variants={itemVariants} className="space-y-4">
              <motion.div 
                variants={itemVariants}
                className="flex items-start"
              >
                <div className="bg-gray-100 p-2 rounded mr-3">
                  <FileText className="w-5 h-5 text-gray-700" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Clear Requirements</h4>
                  <p className="text-gray-700">Define exactly what you need in your project description</p>
                </div>
              </motion.div>

              <motion.div 
                variants={itemVariants}
                className="flex items-start"
              >
                <div className="bg-gray-100 p-2 rounded mr-3">
                  <CheckCircle className="w-5 h-5 text-gray-700" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Quality Results</h4>
                  <p className="text-gray-700">Review freelancer profiles and previous work before hiring</p>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Getting Started */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="mb-16"
        >
          <motion.h2 
            variants={itemVariants}
            className="text-2xl font-bold text-gray-900 mb-8 border-b border-gray-200 pb-4"
          >
            Getting Started
          </motion.h2>
          
          <motion.div 
            variants={cardVariants}
            whileHover="hover"
            className="bg-gray-50 rounded-lg p-6"
          >
            <ol className="space-y-4">
              {[
                {
                  step: 1,
                  title: 'Complete Your Profile',
                  description: 'Ensure your profile is at least 70% complete'
                },
                {
                  step: 2,
                  title: 'Define Your Project',
                  description: 'Clearly describe what you need to be done'
                },
                {
                  step: 3,
                  title: 'Choose Communication',
                  description: 'Select your preferred communication method'
                },
                {
                  step: 4,
                  title: 'Post Your Gig',
                  description: 'Make your project visible to freelancers'
                }
              ].map((item, index) => (
                <motion.li 
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start"
                >
                  <div className="bg-black text-white w-6 h-6 rounded-full flex items-center justify-center text-sm mr-3 flex-shrink-0 mt-0.5">
                    {item.step}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{item.title}</h4>
                    <p className="text-gray-700">{item.description}</p>
                  </div>
                </motion.li>
              ))}
            </ol>
          </motion.div>
        </motion.div>

        {/* FAQ */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="mb-16"
        >
          <motion.h2 
            variants={itemVariants}
            className="text-2xl font-bold text-gray-900 mb-8 border-b border-gray-200 pb-4 flex items-center"
          >
            <HelpCircle className="w-6 h-6 mr-2 text-gray-700" />
            Frequently Asked Questions
          </motion.h2>
          
          <motion.div 
            variants={containerVariants}
            className="space-y-6"
          >
            <motion.div 
              variants={itemVariants}
              whileHover={{ x: 5 }}
              className="p-4 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <h4 className="font-semibold text-gray-900 mb-2">What's the difference between a gig and a service?</h4>
              <p className="text-gray-700">
                Gigs are projects posted by clients looking for freelancers. Services are offerings created by freelancers for clients to purchase directly.
              </p>
            </motion.div>
            
            <motion.div 
              variants={itemVariants}
              whileHover={{ x: 5 }}
              className="p-4 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <h4 className="font-semibold text-gray-900 mb-2">How do I choose the right freelancer?</h4>
              <p className="text-gray-700">
                Review their portfolio, experience, and previous client reviews. Consider conducting interviews with top candidates.
              </p>
            </motion.div>
            
            <motion.div 
              variants={itemVariants}
              whileHover={{ x: 5 }}
              className="p-4 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <h4 className="font-semibold text-gray-900 mb-2">Can I change my communication method after posting?</h4>
              <p className="text-gray-700">
                Yes, you can update your gig details at any time, including your preferred communication method.
              </p>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          whileHover={{ scale: 1.02 }}
          className="bg-black text-white rounded-lg p-8 text-center"
        >
          <h3 className="text-2xl font-bold mb-4">Ready to Post Your Project?</h3>
          <p className="text-gray-300 mb-6">
            Start your project and connect with talented freelancers
          </p>
          <Link
            to="/create-gig"
            className="inline-flex items-center px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-gray-100 transition-colors"
          >
            Create a Gig
            <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default GigsInfoPage;