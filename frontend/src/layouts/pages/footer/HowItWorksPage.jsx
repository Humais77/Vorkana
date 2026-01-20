import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { SeoWrapper } from '../../../components/SeoWrapper';
import { motion, AnimatePresence } from 'framer-motion';

const HowItWorksPage = () => {
  const [activeSection, setActiveSection] = useState('overview');

  const contentSections = {
    overview: {
      title: "Platform Overview",
      content: `Vorkanna operates as a sophisticated connection platform designed to bridge the gap between professional talent and discerning clients. Our system facilitates meaningful collaborations through a structured process that ensures quality matches and successful project outcomes.`,
      subsections: [
        {
          title: "Registration Framework",
          description: "The journey begins with comprehensive account creation, where users define their professional identity or business requirements. This foundation establishes credibility and enables intelligent matching algorithms to function effectively."
        },
        {
          title: "Project Ecosystem",
          description: "Clients articulate their needs through detailed project postings, while professionals showcase their expertise through service listings. This bidirectional system creates a marketplace of opportunities and capabilities."
        },
        {
          title: "Connection Protocol",
          description: "Our platform employs intelligent matching to connect compatible parties, followed by secure communication channels that facilitate detailed discussions and agreement finalization."
        }
      ]
    },
    clientJourney: {
      title: "Client Journey: Hiring Professional Talent",
      content: `Businesses and organizations utilize Vorkanna to identify and engage with specialized professionals for their project requirements. The process is designed to ensure precision in talent selection and seamless project execution.`,
      phases: [
        {
          title: "Account Establishment",
          steps: [
            "Complete business registration with verified contact information",
            "Define organizational profile including company size and industry focus",
            "Establish project management preferences and communication protocols",
            "Configure notification settings for project updates and applications"
          ]
        },
        {
          title: "Project Specification",
          steps: [
            "Create detailed project brief with comprehensive requirements",
            "Define project scope, deliverables, and success criteria",
            "Specify required skill sets and professional qualifications",
            "Establish project timeline with key milestones and deadlines",
            "Determine project visibility settings and application requirements"
          ],
          note: "Our professional services team contacts you within 24 hours to review your project specifications, provide strategic guidance, and initiate the talent matching process."
        },
        {
          title: "Talent Evaluation",
          steps: [
            "Review professionally curated proposals from qualified candidates",
            "Evaluate candidate portfolios, credentials, and professional history",
            "Analyze previous client feedback and performance metrics",
            "Conduct preliminary assessments through platform communication tools"
          ]
        },
        {
          title: "Candidate Engagement",
          steps: [
            "Initiate detailed discussions with shortlisted professionals",
            "Schedule structured interviews to assess technical capabilities",
            "Review project approach and methodology proposals",
            "Clarify expectations and establish working parameters"
          ]
        },
        {
          title: "Professional Selection",
          steps: [
            "Formalize engagement through platform confirmation system",
            "Document agreed-upon scope, deliverables, and timeline",
            "Establish communication cadence and progress reporting structure",
            "Define quality standards and review checkpoints"
          ]
        },
        {
          title: "Collaboration Management",
          steps: [
            "Utilize integrated project management tools for progress tracking",
            "Maintain secure document exchange and version control",
            "Conduct regular progress reviews and milestone evaluations",
            "Provide constructive feedback through structured review systems"
          ]
        }
      ]
    },
    professionalJourney: {
      title: "Professional Journey: Delivering Exceptional Services",
      content: `Skilled professionals utilize Vorkanna to establish their practice, connect with meaningful projects, and build a sustainable career delivering specialized services to discerning clients.`,
      phases: [
        {
          title: "Profile Development",
          steps: [
            "Create comprehensive professional profile with verified credentials",
            "Document educational background, certifications, and specialized training",
            "Develop portfolio showcasing previous work and project outcomes",
            "Define service offerings with clear scope and deliverables",
            "Establish professional availability and working parameters"
          ]
        },
        {
          title: "Service Definition",
          steps: [
            "Structure professional service packages with transparent deliverables",
            "Define service parameters including scope, timelines, and revisions",
            "Establish professional methodology and quality assurance processes",
            "Document client engagement and communication protocols"
          ],
          note: "Our professional development team contacts you within 24 hours to review your service offerings, provide market positioning guidance, and identify compatible project opportunities."
        },
        {
          title: "Opportunity Identification",
          steps: [
            "Access curated project listings matching professional expertise",
            "Utilize advanced filtering to identify compatible opportunities",
            "Research client history and previous collaboration patterns",
            "Analyze project requirements against professional capabilities"
          ]
        },
        {
          title: "Proposal Development",
          steps: [
            "Craft customized proposals addressing specific client requirements",
            "Document professional approach and methodology for each project",
            "Provide relevant case studies and portfolio samples",
            "Structure transparent timeline and milestone proposals"
          ]
        },
        {
          title: "Client Engagement",
          steps: [
            "Participate in structured client discovery discussions",
            "Present professional capabilities and previous success metrics",
            "Clarify project parameters and mutual expectations",
            "Establish professional rapport and communication protocols"
          ]
        },
        {
          title: "Service Delivery",
          steps: [
            "Implement professional service delivery methodology",
            "Maintain regular client communication and progress reporting",
            "Adhere to established quality standards and deliverables",
            "Incorporate client feedback through structured review cycles"
          ]
        },
        {
          title: "Professional Development",
          steps: [
            "Document completed projects for professional portfolio expansion",
            "Solicit structured client feedback for continuous improvement",
            "Update professional credentials and service offerings",
            "Develop long-term client relationships and referral networks"
          ]
        }
      ]
    },
    platformFeatures: {
      title: "Platform Architecture and Features",
      content: `Vorkanna is built upon a sophisticated technological foundation designed to facilitate professional connections while maintaining the highest standards of security and reliability.`,
      categories: [
        {
          title: "Intelligent Matching System",
          features: [
            "Advanced algorithm analyzing professional capabilities against project requirements",
            "Multi-factor compatibility scoring based on skills, experience, and performance history",
            "Dynamic recommendation engine adapting to user behavior and preferences",
            "Geographic and timezone optimization for practical collaboration"
          ]
        },
        {
          title: "Communication Infrastructure",
          features: [
            "Secure messaging platform with end-to-end encryption",
            "Structured discussion frameworks for project specification",
            "Document sharing with version control and access management",
            "Integrated video conferencing for detailed project discussions"
          ]
        },
        {
          title: "Project Management Framework",
          features: [
            "Milestone tracking with automated progress monitoring",
            "Deliverable submission and approval workflows",
            "Time tracking and productivity analytics",
            "Quality assurance checkpoints and review cycles"
          ]
        },
        {
          title: "Professional Development Tools",
          features: [
            "Portfolio management with analytics and presentation tools",
            "Performance tracking and professional reputation metrics",
            "Client feedback collection and analysis systems",
            "Continuing education and skill development resources"
          ]
        },
        {
          title: "Security and Compliance",
          features: [
            "Enterprise-grade data protection and privacy controls",
            "Identity verification and professional credential validation",
            "Compliance with international data protection regulations",
            "Regular security audits and vulnerability assessments"
          ]
        },
        {
          title: "Support and Guidance",
          features: [
            "Dedicated professional services team for strategic guidance",
            "Response protocol for new project and service listings",
            "Ongoing support throughout project lifecycles",
            "Conflict resolution and mediation services when required"
          ]
        }
      ]
    },
    serviceCategories: {
      title: "Professional Service Categories",
      content: `Vorkanna organizes professional services into structured categories to facilitate precise matching between client requirements and professional capabilities.`,
      categories: [
        {
          title: "Technology Development",
          subcategories: [
            "Frontend Development and User Interface Implementation",
            "Backend Systems Architecture and API Development",
            "Full-Stack Application Development and Integration",
            "E-commerce Platform Development and Optimization",
            "Content Management System Implementation and Customization"
          ]
        },
        {
          title: "Design and Creative Services",
          subcategories: [
            "User Experience Research and Interface Design",
            "Corporate Identity and Brand Development Systems",
            "Marketing Collateral and Promotional Material Design",
            "Technical Illustration and Information Design",
            "Motion Graphics and Interactive Media Production"
          ]
        },
        {
          title: "Content Strategy and Development",
          subcategories: [
            "Strategic Content Planning and Editorial Development",
            "Marketing Copywriting and Brand Messaging",
            "Technical Documentation and Knowledge Base Development",
            "Editorial Review and Content Quality Assurance",
            "Multilingual Translation and Localization Services"
          ]
        },
        {
          title: "Marketing and Communication",
          subcategories: [
            "Social Media Strategy and Community Management",
            "Search Engine Optimization and Digital Visibility",
            "Email Marketing Campaign Development and Analysis",
            "Content Strategy and Editorial Calendar Development",
            "Marketing Analytics and Performance Measurement"
          ]
        },
        {
          title: "Business Operations",
          subcategories: [
            "Virtual Executive Assistance and Administrative Support",
            "Data Management and Information Processing",
            "Market Research and Competitive Analysis",
            "Business Process Consulting and Optimization",
            "Administrative Systems Development and Management"
          ]
        },
        {
          title: "Consulting and Advisory Services",
          subcategories: [
            "Technology Strategy and Digital Transformation Advisory",
            "Business Development and Growth Strategy Consulting",
            "Process Improvement and Operational Efficiency Analysis",
            "Financial Modeling and Business Planning Advisory",
            "Regulatory Compliance and Risk Management Consulting"
          ]
        }
      ]
    }
  };

  const processSequence = [
    {
      phase: "Initial Registration Phase",
      description: "Complete account setup and profile development",
      details: "Users establish their professional identity or business profile, providing comprehensive information that forms the foundation for intelligent matching"
    },
    {
      phase: "Opportunity Definition Phase",
      description: "Create detailed project postings or service listings",
      details: "Clients articulate specific project requirements while professionals define their service offerings with clear parameters and deliverables"
    },
    {
      phase: "Professional Consultation Phase",
      description: "Strategic guidance from our professional services team",
      details: "Our dedicated team contacts users to provide expert consultation, review requirements, and initiate the matching process with compatible opportunities"
    },
    {
      phase: "Connection and Evaluation Phase",
      description: "Proposal development and preliminary discussions",
      details: "Professionals submit tailored proposals while clients evaluate candidates through our secure communication platform"
    },
    {
      phase: "Engagement Formalization Phase",
      description: "Professional selection and project initiation",
      details: "Formal agreements are established, project parameters are documented, and collaborative work commences using our integrated tools"
    },
    {
      phase: "Ongoing Collaboration Phase",
      description: "Professional service delivery and project management",
      details: "Continuous progress tracking, regular communication, and quality assurance throughout the project lifecycle"
    },
    {
      phase: "Completion and Growth Phase",
      description: "Project conclusion and professional development",
      details: "Final deliverables are submitted, feedback is exchanged, and professional relationships are developed for future collaborations"
    }
  ];

  const professionalStandards = [
    {
      standard: "Quality Assurance",
      description: "All professionals undergo comprehensive verification of credentials, portfolio review, and performance evaluation before being admitted to the platform."
    },
    {
      standard: "Transparent Communication",
      description: "Clear documentation of project requirements, deliverables, and expectations ensures mutual understanding and minimizes misunderstandings."
    },
    {
      standard: "Professional Development",
      description: "Continuous learning and skill enhancement are encouraged through access to professional resources and performance feedback systems."
    },
    {
      standard: "Ethical Collaboration",
      description: "All platform interactions adhere to established professional ethics, confidentiality standards, and mutual respect principles."
    },
    {
      standard: "Result Orientation",
      description: "Focus on measurable outcomes and tangible results ensures that collaborations produce meaningful value for all participants."
    },
    {
      standard: "Continuous Improvement",
      description: "Regular feedback mechanisms and performance analytics drive ongoing enhancement of both individual capabilities and platform functionality."
    }
  ];

  const navigationSections = [
    { id: 'overview', label: 'Platform Overview' },
    { id: 'clientJourney', label: 'Client Process' },
    { id: 'professionalJourney', label: 'Professional Process' },
    { id: 'platformFeatures', label: 'Platform Features' },
    { id: 'serviceCategories', label: 'Service Categories' }
  ];

  const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  const tabVariants = {
    active: { scale: 1.05, transition: { type: "spring", stiffness: 300 } },
    inactive: { scale: 1 }
  };

  const howItWorksStructuredData = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "How Vorkanna Works: Complete Guide",
    "description": "Learn how to use Vorkanna marketplace as a client or freelancer. Step-by-step guide to posting projects, finding talent, and managing collaborations.",
    "step": [
      {
        "@type": "HowToStep",
        "name": "Registration",
        "text": "Create your professional account with verified credentials"
      },
      {
        "@type": "HowToStep",
        "name": "Post Project or Service",
        "text": "Define your project requirements or list your professional services"
      },
      {
        "@type": "HowToStep",
        "name": "Find & Connect",
        "text": "Browse talent or projects and initiate communication"
      },
      {
        "@type": "HowToStep",
        "name": "Collaborate",
        "text": "Use platform tools to manage your project successfully"
      }
    ]
  };

  return (
    <SeoWrapper
      title="How Vorkanna Works - Complete Guide for Clients & Freelancers"
      description="Step-by-step guide to using Vorkanna marketplace. Learn how to post projects, find talent, list services, and manage successful collaborations."
      keywords="how Vorkanna works, freelance platform guide, hire freelancers, find freelance work, project management, collaboration tools"
      ogTitle="How Vorkanna Works: Complete Platform Guide"
      ogDescription="Learn how to post projects, find talent, list services, and collaborate successfully on Vorkanna's professional marketplace."
      ogImage={`${typeof window !== 'undefined' ? window.location.origin : 'https://vorkanna.com'}/images/og-how-it-works.jpg`}
      structuredData={howItWorksStructuredData}
      breadcrumb={[
        { name: "Home", url: "/" },
        { name: "How It Works", url: "/how-it-works" }
      ]}
    >
      <div className="min-h-screen bg-white text-black font-sans">
        <main className="max-w-7xl mx-auto px-6 py-20">
          
          {/* Header Section */}
          <div className="border-b border-black pb-16 mb-20">
            <span className="text-xs uppercase tracking-[0.3em] font-bold text-gray-500 block mb-4">
              Professional Connection Platform
            </span>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-8">
              How Vorkanna Works
            </h1>
            <p className="text-2xl md:text-3xl text-zinc-600 max-w-5xl leading-tight">
              A comprehensive guide to understanding our professional connection platform, 
              detailing the structured processes for clients seeking specialized talent 
              and professionals delivering exceptional services.
            </p>
          </div>

          {/* Navigation */}
          <div className="mb-20">
            <div className="flex flex-wrap gap-4 border-b border-gray-200 pb-6">
              {navigationSections.map((section) => (
                <motion.button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`px-6 py-3 text-sm font-medium uppercase tracking-wider transition-colors ${
                    activeSection === section.id
                      ? 'bg-black text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                  variants={tabVariants}
                  animate={activeSection === section.id ? "active" : "inactive"}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {section.label}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Main Content Section */}
          <AnimatePresence mode="wait">
            <motion.section
              key={activeSection}
              className="mb-32"
              variants={sectionVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-4xl font-bold mb-8">
                {contentSections[activeSection].title}
              </h2>
              
              <div className="mb-12">
                <p className="text-xl text-gray-700 leading-relaxed mb-10">
                  {contentSections[activeSection].content}
                </p>
              </div>

              {activeSection === 'overview' && (
                <motion.div 
                  className="grid grid-cols-1 md:grid-cols-3 gap-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {contentSections.overview.subsections.map((subsection, index) => (
                    <motion.div 
                      key={index} 
                      className="border border-gray-200 p-8 hover:border-gray-400 transition-colors"
                      whileHover={{ y: -5 }}
                    >
                      <h3 className="text-xl font-bold mb-4">{subsection.title}</h3>
                      <p className="text-gray-600 leading-relaxed">{subsection.description}</p>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {activeSection === 'clientJourney' && (
                <motion.div 
                  className="space-y-16"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {contentSections.clientJourney.phases.map((phase, index) => (
                    <motion.div 
                      key={index} 
                      className="border-l-4 border-black pl-8 py-2"
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="flex items-center mb-6">
                        <div className="w-12 h-12 bg-black text-white flex items-center justify-center text-lg font-bold mr-6">
                          {index + 1}
                        </div>
                        <h3 className="text-2xl font-bold">{phase.title}</h3>
                      </div>
                      
                      {phase.note && (
                        <motion.div 
                          className="mb-8 p-6 bg-gray-50 border-l-4 border-gray-400"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.3 }}
                        >
                          <p className="text-gray-700 font-medium">
                            {phase.note}
                          </p>
                        </motion.div>
                      )}
                      
                      <div className="ml-18">
                        <ul className="space-y-4">
                          {phase.steps.map((step, stepIndex) => (
                            <motion.li 
                              key={stepIndex} 
                              className="flex items-start"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.2 + (stepIndex * 0.05) }}
                            >
                              <span className="inline-block w-6 h-6 border-2 border-gray-300 rounded-full mr-4 mt-1"></span>
                              <span className="text-gray-700 leading-relaxed">{step}</span>
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {activeSection === 'professionalJourney' && (
                <motion.div 
                  className="space-y-16"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {contentSections.professionalJourney.phases.map((phase, index) => (
                    <motion.div 
                      key={index} 
                      className="border-l-4 border-gray-800 pl-8 py-2"
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="flex items-center mb-6">
                        <div className="w-12 h-12 bg-gray-800 text-white flex items-center justify-center text-lg font-bold mr-6">
                          {index + 1}
                        </div>
                        <h3 className="text-2xl font-bold">{phase.title}</h3>
                      </div>
                      
                      {phase.note && (
                        <motion.div 
                          className="mb-8 p-6 bg-gray-50 border-l-4 border-gray-600"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.3 }}
                        >
                          <p className="text-gray-700 font-medium">
                            {phase.note}
                          </p>
                        </motion.div>
                      )}
                      
                      <div className="ml-18">
                        <ul className="space-y-4">
                          {phase.steps.map((step, stepIndex) => (
                            <motion.li 
                              key={stepIndex} 
                              className="flex items-start"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.2 + (stepIndex * 0.05) }}
                            >
                              <span className="inline-block w-6 h-6 border-2 border-gray-400 rounded-full mr-4 mt-1"></span>
                              <span className="text-gray-700 leading-relaxed">{step}</span>
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {activeSection === 'platformFeatures' && (
                <motion.div 
                  className="grid grid-cols-1 md:grid-cols-2 gap-12"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {contentSections.platformFeatures.categories.map((category, index) => (
                    <motion.div 
                      key={index} 
                      className="border border-gray-200 p-8"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ y: -5 }}
                    >
                      <h3 className="text-xl font-bold mb-6 pb-4 border-b border-gray-200">{category.title}</h3>
                      <ul className="space-y-4">
                        {category.features.map((feature, featureIndex) => (
                          <motion.li 
                            key={featureIndex} 
                            className="flex items-start"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 + (featureIndex * 0.05) }}
                          >
                            <span className="inline-block w-2 h-2 bg-gray-400 rounded-full mr-4 mt-2"></span>
                            <span className="text-gray-700 leading-relaxed">{feature}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {activeSection === 'serviceCategories' && (
                <motion.div 
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {contentSections.serviceCategories.categories.map((category, index) => (
                    <motion.div 
                      key={index} 
                      className="border border-gray-200 p-8 hover:border-gray-400 transition-colors"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ y: -5 }}
                    >
                      <h3 className="text-xl font-bold mb-6">{category.title}</h3>
                      <ul className="space-y-3">
                        {category.subcategories.map((subcategory, subIndex) => (
                          <motion.li 
                            key={subIndex} 
                            className="text-gray-600 text-sm leading-relaxed"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 + (subIndex * 0.02) }}
                          >
                            {subcategory}
                          </motion.li>
                        ))}
                      </ul>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </motion.section>
          </AnimatePresence>

          {/* Process Sequence */}
          <section className="mb-32">
            <div className="border-b border-black pb-8 mb-12">
              <h2 className="text-4xl font-bold">Process Sequence</h2>
              <p className="text-xl text-gray-600 mt-4 max-w-4xl">
                A structured progression from initial contact through successful project completion, 
                illustrating the typical journey for platform participants.
              </p>
            </div>

            <div className="relative">
              <div className="hidden lg:block absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>
              
              <div className="space-y-12">
                {processSequence.map((step, index) => (
                  <motion.div 
                    key={index} 
                    className="relative"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center gap-8">
                      <div className="lg:w-1/4">
                        <div className="flex items-center">
                          <div className="w-16 h-16 bg-black text-white flex items-center justify-center text-lg font-bold">
                            {index + 1}
                          </div>
                          <div className="ml-6">
                            <div className="text-sm uppercase tracking-widest font-bold text-gray-500">
                              Phase {index + 1}
                            </div>
                            <h3 className="text-xl font-bold mt-2">{step.phase}</h3>
                          </div>
                        </div>
                      </div>
                      
                      <div className="lg:w-3/4">
                        <div className="border border-gray-200 p-8">
                          <p className="text-gray-700 leading-relaxed">{step.details}</p>
                          {index === 2 && (
                            <motion.div 
                              className="mt-6 p-6 bg-gray-50 border-l-4 border-gray-600"
                              initial={{ opacity: 0 }}
                              whileInView={{ opacity: 1 }}
                              viewport={{ once: true }}
                              transition={{ delay: 0.3 }}
                            >
                              <p className="text-gray-700 font-medium">
                                Professional consultation is initiated following project or service posting, 
                                ensuring strategic guidance and optimized matching from the earliest stages.
                              </p>
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Professional Standards */}
          <section className="mb-32">
            <div className="border-b border-black pb-8 mb-12">
              <h2 className="text-4xl font-bold">Professional Standards</h2>
              <p className="text-xl text-gray-600 mt-4 max-w-4xl">
                The foundational principles that govern all interactions and collaborations 
                within our professional ecosystem, ensuring consistent quality and integrity.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {professionalStandards.map((standard, index) => (
                <motion.div 
                  key={index} 
                  className="border border-gray-200 p-8"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -5 }}
                >
                  <h3 className="text-xl font-bold mb-4">{standard.standard}</h3>
                  <p className="text-gray-600 leading-relaxed">{standard.description}</p>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Professional Services Team */}
          <section className="mb-32">
            <motion.div 
              className="bg-gray-50 border border-gray-200 p-12"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold mb-8">Professional Services Team</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div>
                  <p className="text-xl text-gray-700 leading-relaxed mb-6">
                    Our dedicated professional services team provides strategic guidance 
                    throughout your platform experience. Upon posting your project requirements 
                    or professional service offerings, our team initiates contact to provide 
                    expert consultation and optimization guidance.
                  </p>
                  <p className="text-gray-600 leading-relaxed">
                    This initial consultation focuses on understanding your specific requirements, 
                    refining project or service parameters, and initiating the intelligent matching 
                    process with compatible professional talent or relevant project opportunities.
                  </p>
                </div>
                <div>
                  <ul className="space-y-6">
                    {[
                      "Response protocol for all new project and service listings",
                      "Strategic guidance on project scope definition and professional positioning",
                      "Intelligent matching with compatible professionals or relevant opportunities",
                      "Ongoing support throughout project lifecycles and professional engagements"
                    ].map((item, index) => (
                      <motion.li 
                        key={index}
                        className="flex items-start"
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <span className="inline-block w-6 h-6 border-2 border-black rounded-full mr-4 mt-1"></span>
                        <span className="text-gray-700">{item}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          </section>

          {/* Final Call to Action */}
          <section className="mb-20">
            <motion.div 
              className="bg-black text-white p-16 text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-8">
                Begin Your Professional Journey
              </h2>
              <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto">
                Join our community of professional talent and discerning clients. 
                Post your project requirements or professional service offerings, 
                and our team will contact you to discuss strategic opportunities 
                and compatible connections.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    to="/signup?role=client"
                    className="bg-white text-black px-12 py-4 font-bold uppercase text-sm tracking-widest hover:bg-gray-100 transition-colors inline-block"
                  >
                    Initiate Project Requirements
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    to="/signup?role=professional"
                    className="border-2 border-white text-white px-12 py-4 font-bold uppercase text-sm tracking-widest hover:bg-white hover:text-black transition-colors inline-block"
                  >
                    Register Professional Services
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </section>

          {/* Additional Resources */}
          <section>
            <div className="border-t border-gray-200 pt-16">
              <h3 className="text-2xl font-bold mb-8">Additional Information Resources</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  {
                    title: "Professional Guidelines",
                    description: "Detailed documentation on platform protocols, professional conduct standards, and best practices for successful collaborations.",
                    link: "/guidelines"
                  },
                  {
                    title: "Success Documentation",
                    description: "Case studies and documented outcomes from previous successful collaborations between clients and professional service providers.",
                    link: "/success-stories"
                  },
                  {
                    title: "Professional Consultation",
                    description: "Schedule a comprehensive consultation with our professional services team to discuss specific requirements and strategic opportunities.",
                    link: "/consultation"
                  }
                ].map((resource, index) => (
                  <motion.div 
                    key={index}
                    className="border border-gray-200 p-8"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ y: -5 }}
                  >
                    <h4 className="font-bold text-lg mb-4">{resource.title}</h4>
                    <p className="text-gray-600 mb-6">{resource.description}</p>
                    <Link 
                      to={resource.link} 
                      className="text-black font-medium hover:underline"
                    >
                      Access {resource.title} →
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    </SeoWrapper>
  );
};

export default HowItWorksPage;