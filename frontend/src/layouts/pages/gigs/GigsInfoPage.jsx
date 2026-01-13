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
  ArrowRight,
  DollarSign,
  Calendar,
  Globe,
  Shield,
  TrendingUp,
  Star,
  Target,
  Zap
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

  const gigFeatures = [
    {
      title: 'Budget Flexibility',
      description: 'Set budgets from $5 to $100,000 with multiple currency options',
      icon: <DollarSign className="w-5 h-5" />,
      details: ['USD, EUR, GBP, CAD, AUD, INR, PKR', 'Clear pricing upfront', 'No hidden fees']
    },
    {
      title: 'Category System',
      description: 'Organized by categories and subcategories for easy discovery',
      icon: <Target className="w-5 h-5" />,
      details: ['Main categories & subcategories', 'Specialized project types', 'Better matching algorithm']
    },
    {
      title: 'Secure Platform',
      description: 'Built-in security measures and content sanitization',
      icon: <Shield className="w-5 h-5" />,
      details: ['XSS protection', 'Input validation', 'Secure file uploads']
    },
    {
      title: 'Global Reach',
      description: 'Connect with freelancers and clients worldwide',
      icon: <Globe className="w-5 h-5" />,
      details: ['International currency support', 'Multiple timezones', 'Cultural diversity']
    }
  ];

  const gigStatuses = [
    {
      status: 'Open',
      description: 'Project is available for freelancers to apply',
      color: 'bg-green-100 text-green-800'
    },
    {
      status: 'In Progress',
      description: 'Freelancer is working on the project',
      color: 'bg-blue-100 text-blue-800'
    },
    {
      status: 'Assigned',
      description: 'Freelancer has been selected and work is starting',
      color: 'bg-purple-100 text-purple-800'
    },
    {
      status: 'Completed',
      description: 'Project has been successfully delivered',
      color: 'bg-emerald-100 text-emerald-800'
    },
    {
      status: 'Cancelled',
      description: 'Project was cancelled before completion',
      color: 'bg-red-100 text-red-800'
    },
    {
      status: 'Closed',
      description: 'Project is no longer accepting applications',
      color: 'bg-gray-100 text-gray-800'
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
              Gigs are one-time projects where clients post specific needs and freelancers apply with detailed proposals.
              Connect, collaborate, and get work done efficiently.
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
            <FileText className="w-6 h-6 mr-2 text-gray-700" />
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
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                What is a Gig?
              </h3>
              <p className="text-gray-700 mb-4">
                A gig is a specific project posted by clients who need freelance talent. It includes detailed requirements, 
                budget, timeline, and deliverables. Freelancers browse gigs and submit proposals showcasing their skills 
                and approach.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">One-time project basis</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Clear deliverables and timeline</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Fixed or negotiated budget</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Skill-based matching</span>
                </div>
              </div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">For Clients:</h4>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start">
                      <ChevronRight className="w-5 h-5 mr-2 text-gray-500 flex-shrink-0 mt-0.5" />
                      <span>Post detailed project requirements</span>
                    </li>
                    <li className="flex items-start">
                      <ChevronRight className="w-5 h-5 mr-2 text-gray-500 flex-shrink-0 mt-0.5" />
                      <span>Set budget and timeline</span>
                    </li>
                    <li className="flex items-start">
                      <ChevronRight className="w-5 h-5 mr-2 text-gray-500 flex-shrink-0 mt-0.5" />
                      <span>Review freelancer proposals</span>
                    </li>
                    <li className="flex items-start">
                      <ChevronRight className="w-5 h-5 mr-2 text-gray-500 flex-shrink-0 mt-0.5" />
                      <span>Select the best match</span>
                    </li>
                    <li className="flex items-start">
                      <ChevronRight className="w-5 h-5 mr-2 text-gray-500 flex-shrink-0 mt-0.5" />
                      <span>Manage project milestones</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">For Freelancers:</h4>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start">
                      <ChevronRight className="w-5 h-5 mr-2 text-gray-500 flex-shrink-0 mt-0.5" />
                      <span>Browse available gigs</span>
                    </li>
                    <li className="flex items-start">
                      <ChevronRight className="w-5 h-5 mr-2 text-gray-500 flex-shrink-0 mt-0.5" />
                      <span>Submit tailored proposals</span>
                    </li>
                    <li className="flex items-start">
                      <ChevronRight className="w-5 h-5 mr-2 text-gray-500 flex-shrink-0 mt-0.5" />
                      <span>Showcase portfolio and skills</span>
                    </li>
                    <li className="flex items-start">
                      <ChevronRight className="w-5 h-5 mr-2 text-gray-500 flex-shrink-0 mt-0.5" />
                      <span>Communicate with clients</span>
                    </li>
                    <li className="flex items-start">
                      <ChevronRight className="w-5 h-5 mr-2 text-gray-500 flex-shrink-0 mt-0.5" />
                      <span>Deliver quality work</span>
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
            Key Features
          </motion.h2>
          
          <motion.div 
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {gigFeatures.map((feature, index) => (
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

        {/* Communication Types */}
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
            <MessageSquare className="w-6 h-6 mr-2 text-gray-700" />
            Communication Methods
          </motion.h2>
          
          <motion.p 
            variants={itemVariants}
            className="text-gray-700 mb-6"
          >
            Choose the communication method that works best for your project. All methods are securely integrated into our platform:
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

        {/* Gig Statuses */}
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
            Gig Status Guide
          </motion.h2>
          
          <motion.p 
            variants={itemVariants}
            className="text-gray-700 mb-6"
          >
            Understanding gig statuses helps you track your project progress and manage expectations:
          </motion.p>

          <motion.div 
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {gigStatuses.map((statusItem, index) => (
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
              <h3 className="text-lg font-semibold text-gray-900 mb-4">For Creating Gigs:</h3>
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
                    <span className="text-gray-700"> 20-5000 characters, detailed project requirements</span>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-sm mr-3 flex-shrink-0">
                    3
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Budget:</span>
                    <span className="text-gray-700"> $5 - $100,000 in supported currencies</span>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-sm mr-3 flex-shrink-0">
                    4
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Timeline:</span>
                    <span className="text-gray-700"> Specify duration in days, weeks, or months</span>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-sm mr-3 flex-shrink-0">
                    5
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Skills Required:</span>
                    <span className="text-gray-700"> List specific skills needed (max 50 chars each)</span>
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
                    <span className="text-gray-700"> Upload up to 10 images (Cloudinary integration)</span>
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
                    <span className="text-gray-700"> Main categories with subcategories for better organization</span>
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
            Getting Started with Gigs
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
                  description: 'Ensure your profile is complete with skills and portfolio',
                  icon: <Users className="w-8 h-8 text-gray-700" />
                },
                {
                  step: 2,
                  title: 'Define Project',
                  description: 'Create clear title, description, requirements, and deliverables',
                  icon: <FileText className="w-8 h-8 text-gray-700" />
                },
                {
                  step: 3,
                  title: 'Set Details',
                  description: 'Choose budget, timeline, category, and communication method',
                  icon: <DollarSign className="w-8 h-8 text-gray-700" />
                },
                {
                  step: 4,
                  title: 'Post & Review',
                  description: 'Publish your gig and review incoming proposals',
                  icon: <CheckCircle className="w-8 h-8 text-gray-700" />
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
              <h4 className="font-semibold text-gray-900 mb-3">Pro Tips:</h4>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700 text-sm">Be specific about deliverables and timeline</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700 text-sm">Use relevant skills tags for better matching</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700 text-sm">Include clear examples or references if possible</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700 text-sm">Set realistic budget based on scope and complexity</span>
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
              <h4 className="font-semibold text-gray-900 mb-2">How long does a gig stay active?</h4>
              <p className="text-gray-700">
                Gigs automatically expire after 30 days if they remain in 'open' status. You can extend, close, or update them at any time.
              </p>
            </motion.div>
            
            <motion.div 
              variants={itemVariants}
              whileHover={{ x: 5 }}
              className="p-4 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <h4 className="font-semibold text-gray-900 mb-2">Can I update my gig after posting?</h4>
              <p className="text-gray-700">
                Yes, you can update your gig details including title, description, budget, and images. The platform uses version control to track changes and prevent conflicts.
              </p>
            </motion.div>
            
            <motion.div 
              variants={itemVariants}
              whileHover={{ x: 5 }}
              className="p-4 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <h4 className="font-semibold text-gray-900 mb-2">What happens if my gig gets deleted?</h4>
              <p className="text-gray-700">
                Gigs use soft delete - they're marked as inactive but remain in the system. Only admins can perform permanent deletion. Category and subcategory counts are automatically adjusted.
              </p>
            </motion.div>
            
            <motion.div 
              variants={itemVariants}
              whileHover={{ x: 5 }}
              className="p-4 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <h4 className="font-semibold text-gray-900 mb-2">How are images handled?</h4>
              <p className="text-gray-700">
                Images are securely uploaded to Cloudinary with optimization. You can upload up to 10 images per gig, set thumbnails, and manage them through the platform.
              </p>
            </motion.div>
            
            <motion.div 
              variants={itemVariants}
              whileHover={{ x: 5 }}
              className="p-4 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <h4 className="font-semibold text-gray-900 mb-2">What's the difference between public and private gigs?</h4>
              <p className="text-gray-700">
                Public gigs are visible to all freelancers. Private gigs are invite-only. You can also set gigs to 'invite_only' for specific freelancers you want to work with.
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
          <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
            Join thousands of clients who have successfully completed projects through our gig platform. 
            Connect with skilled freelancers, manage your project efficiently, and get quality results.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/create-gig"
              className="inline-flex items-center px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-gray-100 transition-colors"
            >
              Create a Gig Now
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
            <Link
              to="/gigs"
              className="inline-flex items-center px-6 py-3 bg-transparent border border-white text-white font-medium rounded-lg hover:bg-white/10 transition-colors"
            >
              Browse Available Gigs
            </Link>
          </div>
          <p className="text-gray-400 text-sm mt-6">
            Need help? Check our comprehensive guide or contact support for assistance.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default GigsInfoPage;