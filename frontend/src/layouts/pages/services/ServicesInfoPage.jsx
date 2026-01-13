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
  ChevronRight,
  DollarSign,
  Calendar,
  Shield,
  TrendingUp,
  Star,
  FileText,
  Image,
  Tag,
  Zap,
  Award,
  Eye,
  Heart,
  Layers
} from 'lucide-react';

const ServicesInfoPage = () => {
  const serviceFeatures = [
    {
      title: 'Category System',
      description: 'Organized by main categories and subcategories',
      icon: <Layers className="w-5 h-5" />,
      details: ['Main categories & subcategories', 'Better organization', 'Easy discovery']
    },
    {
      title: 'Image Management',
      description: 'Upload up to 10 images with thumbnail support',
      icon: <Image className="w-5 h-5" />,
      details: ['Cloudinary integration', 'Optimized thumbnails', 'Secure uploads']
    },
    {
      title: 'Multiple Currencies',
      description: 'Support for global pricing with multiple currency options',
      icon: <DollarSign className="w-5 h-5" />,
      details: ['USD, EUR, GBP, CAD, AUD, INR, PKR', 'Global reach', 'Flexible pricing']
    },
    {
      title: 'Security Features',
      description: 'Built-in security measures and content sanitization',
      icon: <Shield className="w-5 h-5" />,
      details: ['XSS protection', 'Input validation', 'Secure file uploads']
    }
  ];

  const serviceStatuses = [
    {
      status: 'Draft',
      description: 'Service is being created and not visible to clients',
      color: 'bg-yellow-100 text-yellow-800'
    },
    {
      status: 'Pending',
      description: 'Waiting for admin approval before going live',
      color: 'bg-blue-100 text-blue-800'
    },
    {
      status: 'Active',
      description: 'Service is live and available for purchase',
      color: 'bg-green-100 text-green-800'
    },
    {
      status: 'Paused',
      description: 'Temporarily unavailable for purchase',
      color: 'bg-gray-100 text-gray-800'
    },
    {
      status: 'Suspended',
      description: 'Service has been deactivated',
      color: 'bg-red-100 text-red-800'
    }
  ];

  const deliveryUnits = [
    {
      unit: 'Hours',
      description: 'Fast delivery for urgent projects',
      bestFor: 'Quick fixes, urgent tasks, small projects'
    },
    {
      unit: 'Days',
      description: 'Standard delivery time',
      bestFor: 'Most regular projects, standard services'
    },
    {
      unit: 'Weeks',
      description: 'Extended delivery for complex projects',
      bestFor: 'Large projects, complex work, multi-phase deliverables'
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
              What are Services?
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Services are predefined offerings where freelancers showcase their skills with fixed pricing, 
              clear deliverables, and specific timelines for clients to purchase directly.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Basic Information */}
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
            <Package className="w-6 h-6 mr-2 text-gray-700" />
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
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                What is a Service?
              </h3>
              <p className="text-gray-700 mb-4">
                A service is a pre-packaged offering created by freelancers that clearly defines what they will deliver, 
                at what price, and within what timeframe. Clients can browse, compare, and purchase services directly 
                without negotiation.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Fixed pricing structure</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Clear deliverables and timeline</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Standardized packages</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Direct purchase option</span>
                </div>
              </div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">For Freelancers:</h4>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start">
                      <ChevronRight className="w-5 h-5 mr-2 text-gray-500 flex-shrink-0 mt-0.5" />
                      <span>Create detailed service packages</span>
                    </li>
                    <li className="flex items-start">
                      <ChevronRight className="w-5 h-5 mr-2 text-gray-500 flex-shrink-0 mt-0.5" />
                      <span>Set clear pricing and delivery time</span>
                    </li>
                    <li className="flex items-start">
                      <ChevronRight className="w-5 h-5 mr-2 text-gray-500 flex-shrink-0 mt-0.5" />
                      <span>Showcase portfolio and expertise</span>
                    </li>
                    <li className="flex items-start">
                      <ChevronRight className="w-5 h-5 mr-2 text-gray-500 flex-shrink-0 mt-0.5" />
                      <span>Receive direct orders from clients</span>
                    </li>
                    <li className="flex items-start">
                      <ChevronRight className="w-5 h-5 mr-2 text-gray-500 flex-shrink-0 mt-0.5" />
                      <span>Build reputation through reviews</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">For Clients:</h4>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start">
                      <ChevronRight className="w-5 h-5 mr-2 text-gray-500 flex-shrink-0 mt-0.5" />
                      <span>Browse available service offerings</span>
                    </li>
                    <li className="flex items-start">
                      <ChevronRight className="w-5 h-5 mr-2 text-gray-500 flex-shrink-0 mt-0.5" />
                      <span>Compare prices and features</span>
                    </li>
                    <li className="flex items-start">
                      <ChevronRight className="w-5 h-5 mr-2 text-gray-500 flex-shrink-0 mt-0.5" />
                      <span>Purchase services directly</span>
                    </li>
                    <li className="flex items-start">
                      <ChevronRight className="w-5 h-5 mr-2 text-gray-500 flex-shrink-0 mt-0.5" />
                      <span>Receive quality work on schedule</span>
                    </li>
                    <li className="flex items-start">
                      <ChevronRight className="w-5 h-5 mr-2 text-gray-500 flex-shrink-0 mt-0.5" />
                      <span>Leave reviews for freelancers</span>
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Key Features */}
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
            <Star className="w-6 h-6 mr-2 text-gray-700" />
            Platform Features
          </motion.h2>
          
          <motion.div 
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {serviceFeatures.map((feature, index) => (
              <motion.div
                key={index}
                variants={cardVariants}
                whileHover="hover"
                className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-gray-100 rounded-lg mr-3">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
                </div>
                <p className="text-gray-700 mb-4">{feature.description}</p>
                <ul className="space-y-2">
                  {feature.details.map((detail, idx) => (
                    <li key={idx} className="flex items-start text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Service Statuses */}
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
            <TrendingUp className="w-6 h-6 mr-2 text-gray-700" />
            Service Status Guide
          </motion.h2>
          
          <motion.p 
            variants={itemVariants}
            className="text-gray-700 mb-6"
          >
            Understanding service statuses helps you manage your offerings effectively:
          </motion.p>

          <motion.div 
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {serviceStatuses.map((statusItem, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusItem.color}`}>
                    {statusItem.status}
                  </span>
                </div>
                <p className="text-gray-700">{statusItem.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Delivery Options */}
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
            <Clock className="w-6 h-6 mr-2 text-gray-700" />
            Delivery Options
          </motion.h2>
          
          <motion.div 
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {deliveryUnits.map((unit, index) => (
              <motion.div
                key={index}
                variants={cardVariants}
                whileHover="hover"
                className="border border-gray-200 rounded-lg p-5"
              >
                <div className="flex items-center mb-4">
                  <div className="bg-gray-900 text-white p-2 rounded mr-3">
                    <span className="font-bold">{unit.unit}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{unit.unit} Delivery</h3>
                </div>
                <p className="text-gray-700 mb-4">{unit.description}</p>
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Best for:</span> {unit.bestFor}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Requirements & Guidelines */}
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
            <Zap className="w-6 h-6 mr-2 text-gray-700" />
            Requirements & Guidelines
          </motion.h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <motion.div 
              variants={cardVariants}
              whileHover="hover"
              className="bg-gray-50 rounded-lg p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">For Creating Services:</h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <div className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-sm mr-3 flex-shrink-0">
                    1
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Title:</span>
                    <span className="text-gray-700"> 5-200 characters, descriptive and clear</span>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-sm mr-3 flex-shrink-0">
                    2
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Description:</span>
                    <span className="text-gray-700"> 50-5000 characters, detailed service description</span>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-sm mr-3 flex-shrink-0">
                    3
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Price:</span>
                    <span className="text-gray-700"> $1 - $100,000 in supported currencies</span>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-sm mr-3 flex-shrink-0">
                    4
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Delivery Time:</span>
                    <span className="text-gray-700"> 1-365 days in hours, days, or weeks</span>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-sm mr-3 flex-shrink-0">
                    5
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Revisions:</span>
                    <span className="text-gray-700"> 0-99 revisions included</span>
                  </div>
                </li>
              </ul>
            </motion.div>

            <motion.div 
              variants={cardVariants}
              whileHover="hover"
              className="bg-gray-50 rounded-lg p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Features:</h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-gray-900">Image Support:</span>
                    <span className="text-gray-700"> Upload up to 10 images with thumbnail (Cloudinary)</span>
                  </div>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-gray-900">Automatic Slug Generation:</span>
                    <span className="text-gray-700"> URL-friendly titles created automatically</span>
                  </div>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-gray-900">Category System:</span>
                    <span className="text-gray-700"> Main categories with subcategories for organization</span>
                  </div>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-gray-900">Security Features:</span>
                    <span className="text-gray-700"> XSS protection, input validation, secure uploads</span>
                  </div>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-gray-900">Version Control:</span>
                    <span className="text-gray-700"> Track changes and prevent conflicts</span>
                  </div>
                </li>
              </ul>
            </motion.div>
          </div>
        </motion.div>

        {/* Service Elements */}
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
            <FileText className="w-6 h-6 mr-2 text-gray-700" />
            Service Elements
          </motion.h2>
          
          <motion.div 
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <motion.div
              variants={cardVariants}
              whileHover="hover"
              className="border border-gray-200 rounded-lg p-5"
            >
              <div className="flex items-center mb-4">
                <div className="p-2 bg-gray-100 rounded mr-3">
                  <Tag className="w-5 h-5 text-gray-700" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Tags</h3>
              </div>
              <p className="text-gray-700 mb-3">Keywords to help clients find your service</p>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Format:</span> Up to 30 characters each
              </div>
            </motion.div>

            <motion.div
              variants={cardVariants}
              whileHover="hover"
              className="border border-gray-200 rounded-lg p-5"
            >
              <div className="flex items-center mb-4">
                <div className="p-2 bg-gray-100 rounded mr-3">
                  <Award className="w-5 h-5 text-gray-700" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Features</h3>
              </div>
              <p className="text-gray-700 mb-3">Detailed breakdown of what's included</p>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Includes:</span> Title, description, included status
              </div>
            </motion.div>

            <motion.div
              variants={cardVariants}
              whileHover="hover"
              className="border border-gray-200 rounded-lg p-5"
            >
              <div className="flex items-center mb-4">
                <div className="p-2 bg-gray-100 rounded mr-3">
                  <HelpCircle className="w-5 h-5 text-gray-700" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">FAQs</h3>
              </div>
              <p className="text-gray-700 mb-3">Common questions and answers</p>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Limits:</span> 200 chars question, 500 chars answer
              </div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Analytics & Visibility */}
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
            <BarChart className="w-6 h-6 mr-2 text-gray-700" />
            Analytics & Visibility
          </motion.h2>
          
          <motion.div 
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {[
              {
                metric: 'Views',
                description: 'Track how many times your service is viewed',
                icon: <Eye className="w-5 h-5" />,
                color: 'text-blue-600'
              },
              {
                metric: 'Likes',
                description: 'See how many users liked your service',
                icon: <Heart className="w-5 h-5" />,
                color: 'text-red-600'
              },
              {
                metric: 'Rating',
                description: 'Average rating from client reviews',
                icon: <Star className="w-5 h-5" />,
                color: 'text-yellow-600'
              },
              {
                metric: 'Featured',
                description: 'Get highlighted as a featured service',
                icon: <Award className="w-5 h-5" />,
                color: 'text-purple-600'
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="border border-gray-200 rounded-lg p-5"
              >
                <div className="flex items-center mb-3">
                  <div className={`p-2 bg-gray-100 rounded mr-3 ${item.color}`}>
                    {item.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{item.metric}</h3>
                </div>
                <p className="text-gray-700 text-sm">{item.description}</p>
              </motion.div>
            ))}
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
            className="text-2xl font-bold text-gray-900 mb-8 border-b border-gray-200 pb-4 flex items-center"
          >
            <ArrowRight className="w-6 h-6 mr-2 text-gray-700" />
            Creating Your First Service
          </motion.h2>
          
          <motion.div 
            variants={cardVariants}
            whileHover="hover"
            className="bg-gray-50 rounded-lg p-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  step: 1,
                  title: 'Complete Profile',
                  description: 'Ensure your profile showcases your skills and experience',
                  icon: <Users className="w-8 h-8 text-gray-700" />
                },
                {
                  step: 2,
                  title: 'Define Service',
                  description: 'Create clear title, description, and deliverables',
                  icon: <FileText className="w-8 h-8 text-gray-700" />
                },
                {
                  step: 3,
                  title: 'Set Details',
                  description: 'Choose price, delivery time, revisions, and category',
                  icon: <DollarSign className="w-8 h-8 text-gray-700" />
                },
                {
                  step: 4,
                  title: 'Add Media',
                  description: 'Upload images and set thumbnail to showcase your work',
                  icon: <Image className="w-8 h-8 text-gray-700" />
                }
              ].map((item, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="text-center"
                >
                  <div className="relative mb-4">
                    <div className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto">
                      {item.step}
                    </div>
                    <div className="absolute -top-2 -right-2 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      {item.icon}
                    </div>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">{item.title}</h4>
                  <p className="text-gray-700 text-sm">{item.description}</p>
                </motion.div>
              ))}
            </div>
            
            <div className="mt-8 p-4 bg-white rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-3">Pro Tips for Success:</h4>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700 text-sm">Use high-quality images to showcase your work</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700 text-sm">Be specific about deliverables and timelines</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700 text-sm">Use relevant tags for better discoverability</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700 text-sm">Set competitive pricing based on market research</span>
                </li>
              </ul>
            </div>
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
              <h4 className="font-semibold text-gray-900 mb-2">How do I price my service?</h4>
              <p className="text-gray-700">
                Consider your experience, market rates, project complexity, and delivery time. 
                Services can be priced from $1 to $100,000 in multiple currencies.
              </p>
            </motion.div>
            
            <motion.div 
              variants={itemVariants}
              whileHover={{ x: 5 }}
              className="p-4 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <h4 className="font-semibold text-gray-900 mb-2">What's the difference between a service and a gig?</h4>
              <p className="text-gray-700">
                Services are pre-defined offerings with fixed pricing. Gigs are custom projects posted by clients 
                where freelancers submit proposals. Services offer faster purchasing for clients.
              </p>
            </motion.div>
            
            <motion.div 
              variants={itemVariants}
              whileHover={{ x: 5 }}
              className="p-4 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <h4 className="font-semibold text-gray-900 mb-2">How many images can I upload?</h4>
              <p className="text-gray-700">
                You can upload up to 10 images per service. The first image is used as the thumbnail. 
                All images are securely stored on Cloudinary with optimization.
              </p>
            </motion.div>
            
            <motion.div 
              variants={itemVariants}
              whileHover={{ x: 5 }}
              className="p-4 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <h4 className="font-semibold text-gray-900 mb-2">Can I update my service after publishing?</h4>
              <p className="text-gray-700">
                Yes, you can update your service details including title, description, price, and images. 
                The platform uses version control to track changes and prevent conflicts.
              </p>
            </motion.div>
            
            <motion.div 
              variants={itemVariants}
              whileHover={{ x: 5 }}
              className="p-4 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <h4 className="font-semibold text-gray-900 mb-2">How are categories and subcategories used?</h4>
              <p className="text-gray-700">
                Categories help organize services for better discovery. Subcategories provide more specific 
                classification. Choose the most relevant category and subcategory for your service.
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
          <h3 className="text-2xl font-bold mb-4">Ready to Showcase Your Skills?</h3>
          <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
            Join thousands of freelancers who have successfully monetized their skills through our services platform. 
            Create your service, reach global clients, and grow your freelance business.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/services/create"
              className="inline-flex items-center px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-gray-100 transition-colors"
            >
              Create Your Service
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
            <Link
              to="/services"
              className="inline-flex items-center px-6 py-3 bg-transparent border border-white text-white font-medium rounded-lg hover:bg-white/10 transition-colors"
            >
              Browse Services
            </Link>
          </div>
          <p className="text-gray-400 text-sm mt-6">
            Need guidance? Check our comprehensive guides or contact support for assistance.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default ServicesInfoPage;