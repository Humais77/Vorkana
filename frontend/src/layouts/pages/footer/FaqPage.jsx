import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { SeoWrapper } from '../../../components/SeoWrapper';
import { Search, Plus, Minus, ArrowRight, ArrowUpRight, HelpCircle, ShieldCheck, Zap } from 'lucide-react';

const FaqPage = () => {
  const [openCategory, setOpenCategory] = useState(0);
  const [openQuestions, setOpenQuestions] = useState({});

  const faqData = [
    {
      category: 'Identity & Access',
      questions: [
        {
          q: 'How do I establish a professional profile?',
          a: 'Select "Sign Up" and provide your professional credentials. You may utilize Google OAuth for immediate synchronization or use a standard email-based registration.'
        },
        {
          q: 'What is the verification protocol?',
          a: 'Upon registration, a validation link is dispatched to your email. Completing this step is mandatory to unlock Gig creation and Service listing capabilities.'
        },
        {
          q: 'Can I manage multiple professional identities?',
          a: 'No. To maintain platform integrity, Vorkanna enforces a one-account-per-individual policy. Secondary accounts are subject to immediate deactivation.'
        }
      ]
    },
    {
      category: 'Project Workflows',
      questions: [
        {
          q: 'How do I list a new Service?',
          a: 'Access the "Create Service" module from your dashboard. Define your deliverables, technical requirements, and project scope before publishing to the marketplace.'
        },
        {
          q: 'What are Gig Milestones?',
          a: 'Milestones are specific phases within a project. Each phase must be logged and approved to ensure the project remains aligned with the initial scope.'
        },
        {
          q: 'How are project files protected?',
          a: 'All deliverables are managed through our secure infrastructure, ensuring that project assets are only accessible to the authorized parties involved in the Gig.'
        }
      ]
    },
    {
      category: 'Disputes & Resolution',
      questions: [
        {
          q: 'What happens if a deliverable is misaligned?',
          a: 'If a project outcome does not match the agreed-upon scope, you may initiate a resolution request via the Dispute Center for Admin mediation.'
        },
        {
          q: 'How does Admin mediation work?',
          a: 'Our team reviews the timestamped logs and communication history within the Gig to provide an objective resolution based on the project data.'
        }
      ]
    }
  ];

  const toggleCategory = (index) => {
    setOpenCategory(openCategory === index ? null : index);
  };

  const toggleQuestion = (categoryIndex, questionIndex) => {
    setOpenQuestions(prev => ({
      ...prev,
      [`${categoryIndex}-${questionIndex}`]: !prev[`${categoryIndex}-${questionIndex}`]
    }));
  };

  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How do I create a professional profile on Vorkanna?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Select 'Sign Up' and provide your professional credentials. You may utilize Google OAuth for immediate synchronization or use a standard email-based registration."
        }
      },
      {
        "@type": "Question",
        "name": "How do I list a new Service on Vorkanna?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Access the 'Create Service' module from your dashboard. Define your deliverables, technical requirements, and project scope before publishing to the marketplace."
        }
      },
      {
        "@type": "Question",
        "name": "What happens if a deliverable is misaligned?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "If a project outcome does not match the agreed-upon scope, you may initiate a resolution request via the Dispute Center for Admin mediation."
        }
      }
    ]
  };

  return (
    <SeoWrapper
      title="Vorkanna FAQ - Frequently Asked Questions"
      description="Find answers to common questions about Vorkanna platform. Learn about account setup, gig creation, payments, dispute resolution, and more."
      keywords="Vorkanna FAQ, frequently asked questions, platform help, account setup, gig creation, payments, dispute resolution"
      ogTitle="Vorkanna FAQ - Frequently Asked Questions"
      ogDescription="Get answers to common questions about using Vorkanna platform, account setup, gig creation, payments, and dispute resolution."
      ogImage={`${typeof window !== 'undefined' ? window.location.origin : 'https://vorkanna.com'}/images/og-faq.jpg`}
      structuredData={faqStructuredData}
      breadcrumb={[
        { name: "Home", url: "/" },
        { name: "FAQ", url: "/faq" }
      ]}
    >
      <div className="min-h-screen bg-white text-black font-sans antialiased">
        <main className="max-w-6xl mx-auto px-8 py-24">
          
          {/* Header - High Contrast */}
          <section className="mb-20 border-b-2 border-black pb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-[3px] w-12 bg-black"></div>
              <span className="text-xs uppercase tracking-[0.3em] font-bold">Information Desk</span>
            </div>
            <h1 className="text-5xl font-bold tracking-tighter mb-6 uppercase">
              Knowledge Base
            </h1>
            <p className="text-lg text-zinc-800 max-w-xl font-medium leading-relaxed">
              Standard operating procedures and frequently asked questions regarding 
              the Vorkanna marketplace infrastructure.
            </p>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
            
            {/* Left Column: Search & Categories */}
            <div className="lg:col-span-4 space-y-12">
              <div className="relative border-b-2 border-black pb-2">
                <Search className="absolute left-0 top-1 w-5 h-5" />
                <input 
                  type="text" 
                  placeholder="SEARCH PROTOCOLS..." 
                  className="w-full pl-8 bg-transparent outline-none text-xs font-bold uppercase tracking-widest placeholder:text-zinc-300"
                />
              </div>

              <nav className="space-y-4">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-400 mb-6">Directory</h2>
                {faqData.map((cat, idx) => (
                  <button
                    key={idx}
                    onClick={() => toggleCategory(idx)}
                    className={`block w-full text-left text-xs font-bold uppercase tracking-widest py-2 transition-all ${
                      openCategory === idx ? 'text-black border-l-4 border-black pl-4' : 'text-zinc-400 hover:text-black'
                    }`}
                  >
                    {cat.category}
                  </button>
                ))}
              </nav>
            </div>

            {/* Right Column: Accordion */}
            <div className="lg:col-span-8">
              {faqData[openCategory] && (
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold uppercase mb-10 tracking-tight">
                    {faqData[openCategory].category}
                  </h2>
                  {faqData[openCategory].questions.map((item, qIdx) => (
                    <div key={qIdx} className="border-b border-zinc-200">
                      <button
                        onClick={() => toggleQuestion(openCategory, qIdx)}
                        className="w-full flex justify-between items-center py-8 text-left group"
                      >
                        <span className="text-sm font-bold uppercase tracking-tight group-hover:translate-x-1 transition-transform">
                          {item.q}
                        </span>
                        {openQuestions[`${openCategory}-${qIdx}`] ? (
                          <Minus className="w-4 h-4" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                      </button>
                      {openQuestions[`${openCategory}-${qIdx}`] && (
                        <div className="pb-8 pr-12">
                          <p className="text-zinc-700 text-sm leading-relaxed font-medium">
                            {item.a}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Support Grid - High Contrast */}
          <section className="mt-32 grid grid-cols-1 md:grid-cols-3 border-2 border-black">
            <Link to="/help" className="p-10 border-b-2 md:border-b-0 md:border-r-2 border-black hover:bg-black hover:text-white transition-all group">
              <HelpCircle className="w-6 h-6 mb-6" />
              <h3 className="text-xs font-bold uppercase tracking-widest mb-2">Help Center</h3>
              <p className="text-xs font-medium opacity-70">Browse detailed technical documentation.</p>
              <ArrowUpRight className="w-4 h-4 mt-6 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
            
            <Link to="/contact" className="p-10 border-b-2 md:border-b-0 md:border-r-2 border-black hover:bg-black hover:text-white transition-all group">
              <Zap className="w-6 h-6 mb-6" />
              <h3 className="text-xs font-bold uppercase tracking-widest mb-2">Direct Support</h3>
              <p className="text-xs font-medium opacity-70">Open a ticket with our resolution team.</p>
              <ArrowUpRight className="w-4 h-4 mt-6 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>

            <Link to="/trust" className="p-10 hover:bg-black hover:text-white transition-all group">
              <ShieldCheck className="w-6 h-6 mb-6" />
              <h3 className="text-xs font-bold uppercase tracking-widest mb-2">Integrity Policy</h3>
              <p className="text-xs font-medium opacity-70">Review platform safety protocols.</p>
              <ArrowUpRight className="w-4 h-4 mt-6 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          </section>

          <div className="mt-24 text-center">
            <Link to="/" className="text-xs font-bold uppercase tracking-[0.4em] border-b-2 border-black pb-1 hover:text-zinc-600">
              Return to Home
            </Link>
          </div>
        </main>
      </div>
    </SeoWrapper>
  );
};

export default FaqPage;