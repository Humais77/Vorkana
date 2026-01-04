// components/ServicesInfoPage.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Package, 
  Target, 
  CheckCircle, 
  BarChart,
  Globe,
  Clock,
  Users,
  HelpCircle,
  ArrowRight,
  ChevronRight
} from 'lucide-react';

const ServicesInfoPage = () => {
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
              What are Services?
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Services are predefined offerings where freelancers showcase their skills for clients to purchase.
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
            Understanding Services
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
                <Package className="w-5 h-5 mr-2 text-gray-700" />
                What is a Service?
              </h3>
              <p className="text-gray-700">
                A service is a predefined offering created by a freelancer. It describes exactly what the freelancer will provide, 
                including deliverables, timeline, and what clients can expect.
              </p>
            </motion.div>

            <motion.div 
              variants={cardVariants}
              whileHover="hover"
              className="bg-gray-50 rounded-lg p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <Target className="w-5 h-5 mr-2 text-gray-700" />
                How Services Work
              </h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start">
                  <ChevronRight className="w-5 h-5 mr-2 text-gray-500 flex-shrink-0 mt-0.5" />
                  <span>Freelancer creates a detailed service description</span>
                </li>
                <li className="flex items-start">
                  <ChevronRight className="w-5 h-5 mr-2 text-gray-500 flex-shrink-0 mt-0.5" />
                  <span>Clients browse available services</span>
                </li>
                <li className="flex items-start">
                  <ChevronRight className="w-5 h-5 mr-2 text-gray-500 flex-shrink-0 mt-0.5" />
                  <span>Client selects and purchases the service</span>
                </li>
                <li className="flex items-start">
                  <ChevronRight className="w-5 h-5 mr-2 text-gray-500 flex-shrink-0 mt-0.5" />
                  <span>Freelancer delivers the promised work</span>
                </li>
              </ul>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Service Types */}
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
            Types of Services
          </motion.h2>
          
          <motion.div 
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <motion.div
              variants={cardVariants}
              whileHover="hover"
              className="border border-gray-200 rounded-lg p-5"
            >
              <div className="flex items-center mb-4">
                <div className="bg-gray-100 p-2 rounded mr-3">
                  <span className="font-bold text-gray-900">Basic</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Essential Package</h3>
              </div>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-gray-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Core deliverables only</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-gray-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Standard delivery time</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-gray-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Limited revisions</span>
                </li>
              </ul>
            </motion.div>

            <motion.div
              variants={cardVariants}
              whileHover="hover"
              className="border border-gray-200 rounded-lg p-5"
            >
              <div className="flex items-center mb-4">
                <div className="bg-gray-900 text-white p-2 rounded mr-3">
                  <span className="font-bold">Pro</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Professional Package</h3>
              </div>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-gray-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Enhanced deliverables</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-gray-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Priority delivery</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-gray-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">More revisions included</span>
                </li>
              </ul>
            </motion.div>
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
            Benefits of Offering Services
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
                  <BarChart className="w-5 h-5 text-gray-700" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Predictable Workflow</h4>
                  <p className="text-gray-700">Standardized offerings streamline your process</p>
                </div>
              </motion.div>

              <motion.div 
                variants={itemVariants}
                className="flex items-start"
              >
                <div className="bg-gray-100 p-2 rounded mr-3">
                  <Clock className="w-5 h-5 text-gray-700" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Time Efficiency</h4>
                  <p className="text-gray-700">No need for custom proposals for every client</p>
                </div>
              </motion.div>
            </motion.div>

            <motion.div variants={itemVariants} className="space-y-4">
              <motion.div 
                variants={itemVariants}
                className="flex items-start"
              >
                <div className="bg-gray-100 p-2 rounded mr-3">
                  <Globe className="w-5 h-5 text-gray-700" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Wider Reach</h4>
                  <p className="text-gray-700">Your services are visible to clients worldwide</p>
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
                  <h4 className="font-semibold text-gray-900 mb-1">Build Reputation</h4>
                  <p className="text-gray-700">Collect reviews and establish your expertise</p>
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
            Creating Your Service
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
                  title: 'Define Your Service',
                  description: 'Clearly describe what you offer and deliver'
                },
                {
                  step: 3,
                  title: 'Set Clear Deliverables',
                  description: 'Specify exactly what clients will receive'
                },
                {
                  step: 4,
                  title: 'Publish Your Service',
                  description: 'Make your offering available to clients'
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
              <h4 className="font-semibold text-gray-900 mb-2">How detailed should my service description be?</h4>
              <p className="text-gray-700">
                Be specific about what's included. Clear descriptions help clients understand exactly what they're getting.
              </p>
            </motion.div>
            
            <motion.div 
              variants={itemVariants}
              whileHover={{ x: 5 }}
              className="p-4 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <h4 className="font-semibold text-gray-900 mb-2">Can I offer different packages for the same service?</h4>
              <p className="text-gray-700">
                Yes, offering multiple packages (Basic, Standard, Premium) can attract different types of clients.
              </p>
            </motion.div>
            
            <motion.div 
              variants={itemVariants}
              whileHover={{ x: 5 }}
              className="p-4 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <h4 className="font-semibold text-gray-900 mb-2">How do I handle revisions or changes?</h4>
              <p className="text-gray-700">
                Clearly state your revision policy in your service description to manage client expectations.
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
          <h3 className="text-2xl font-bold mb-4">Ready to Offer Your Services?</h3>
          <p className="text-gray-300 mb-6">
            Start showcasing your skills to clients worldwide
          </p>
          <Link
            to="/services/create"
            className="inline-flex items-center px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-gray-100 transition-colors"
          >
            Create a Service
            <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default ServicesInfoPage;