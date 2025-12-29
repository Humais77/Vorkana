import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Shield, 
  Search, 
  Lock, 
  Scale, 
  UserCheck, 
  ArrowRight, 
  Zap,
  ShieldCheck,
  FileText
} from 'lucide-react';

const TrustSafetyPage = () => {
  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans antialiased">
      <main className="max-w-5xl mx-auto px-8 py-24">
        
        {/* Header Section */}
        <section className="mb-24">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-[2px] w-10 bg-zinc-900"></div>
            <span className="text-xs uppercase tracking-widest font-bold">Platform Governance</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-8 text-black">
            The Vorkana Integrity Protocol
          </h1>
          <p className="text-lg text-zinc-500 max-w-2xl leading-relaxed">
            Our marketplace is governed by strict protocols designed to protect 
            intellectual property, project milestones, and professional identities.
          </p>
        </section>

        {/* Pillars of Trust */}
        <section className="space-y-24 mb-32">
          
          {/* 1. Identity & Verification (Referencing VerifyEmail / OAuthSuccess) */}
          <div className="flex flex-col md:flex-row gap-12 border-t border-zinc-100 pt-12">
            <div className="md:w-1/3">
              <h2 className="text-xs uppercase tracking-widest font-bold mb-4 flex items-center gap-2 text-black">
                <UserCheck className="w-4 h-4 text-zinc-400" /> 
                Profile Authentication
              </h2>
            </div>
            <div className="md:w-2/3">
              <p className="text-lg text-zinc-700 mb-6 font-medium leading-relaxed">
                Verification is mandatory. We ensure that every Service provider and 
                Client maintains a verified professional identity.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm text-zinc-500">
                <div>
                  <span className="block font-bold text-black mb-1">Email Validation</span>
                  Required for all accounts to ensure active and legitimate domain ownership.
                </div>
                <div>
                  <span className="block font-bold text-black mb-1">OAuth Integrity</span>
                  Secure third-party synchronization to confirm professional credentials.
                </div>
              </div>
            </div>
          </div>

          {/* 2. Service & Gig Standards */}
          <div className="flex flex-col md:flex-row gap-12 border-t border-zinc-100 pt-12">
            <div className="md:w-1/3">
              <h2 className="text-xs uppercase tracking-widest font-bold mb-4 flex items-center gap-2 text-black">
                <FileText className="w-4 h-4 text-zinc-400" /> 
                Asset Protection
              </h2>
            </div>
            <div className="md:w-2/3">
              <p className="text-lg text-zinc-700 mb-6 font-medium leading-relaxed">
                Every Gig deliverable is logged within our secure environment to 
                protect the ownership and rights of the parties involved.
              </p>
              <ul className="space-y-4 text-sm text-zinc-500">
                <li className="flex items-start gap-2 italic">/ Timestamped logging for every Service phase.</li>
                <li className="flex items-start gap-2 italic">/ Restricted access to project-sensitive files.</li>
              </ul>
            </div>
          </div>

          {/* 3. Dispute Mediation (Referencing DisputesPage) */}
          <div className="flex flex-col md:flex-row gap-12 border-t border-zinc-100 pt-12">
            <div className="md:w-1/3">
              <h2 className="text-xs uppercase tracking-widest font-bold mb-4 flex items-center gap-2 text-black">
                <Scale className="w-4 h-4 text-zinc-400" /> 
                Resolution Protocol
              </h2>
            </div>
            <div className="md:w-2/3">
              <p className="text-lg text-zinc-700 mb-6 font-medium leading-relaxed">
                In the event of a deliverable misalignment, our mediation team 
                reviews the Gig history to provide an objective resolution.
              </p>
              <Link 
                to="/disputes" 
                className="inline-flex items-center gap-2 text-sm font-bold border-b border-zinc-900 pb-1 hover:text-zinc-500 transition-all"
              >
                Dispute Guidelines <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </section>

        {/* Core Principles Grid */}
        <section className="mb-32 grid grid-cols-1 md:grid-cols-3 gap-12 border-t border-zinc-100 pt-16">
          <div className="space-y-4">
            <ShieldCheck className="w-5 h-5" />
            <h4 className="font-bold text-sm uppercase">Zero Tolerance</h4>
            <p className="text-sm text-zinc-500">Immediate account deactivation for users violating our professional code of conduct.</p>
          </div>
          <div className="space-y-4">
            <Lock className="w-5 h-5" />
            <h4 className="font-bold text-sm uppercase">Data Privacy</h4>
            <p className="text-sm text-zinc-500">Advanced encryption protocols for all private communications and project assets.</p>
          </div>
          <div className="space-y-4">
            <Search className="w-5 h-5" />
            <h4 className="font-bold text-sm uppercase">Manual Audits</h4>
            <p className="text-sm text-zinc-500">Regular vetting of trending Services to maintain high marketplace standards.</p>
          </div>
        </section>

        {/* Footer Navigation */}
        <footer className="pt-20 border-t border-zinc-900">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
            <div className="space-y-3">
              <span className="block text-[10px] font-bold uppercase text-zinc-400">Resources</span>
              <Link to="/help" className="block text-sm font-medium hover:underline">Help Center</Link>
              <Link to="/faq" className="block text-sm font-medium hover:underline">General FAQ</Link>
            </div>
            <div className="space-y-3">
              <span className="block text-[10px] font-bold uppercase text-zinc-400">Support</span>
              <Link to="/contact" className="block text-sm font-medium hover:underline">Contact Us</Link>
              <Link to="/disputes" className="block text-sm font-medium hover:underline">Dispute Center</Link>
            </div>
            <div className="space-y-3">
              <span className="block text-[10px] font-bold uppercase text-zinc-400">Platform</span>
              <Link to="/about-us" className="block text-sm font-medium hover:underline">About Us</Link>
              <Link to="/careers" className="block text-sm font-medium hover:underline">Careers</Link>
            </div>
          </div>
          <div className="flex justify-between items-center pt-10 border-t border-zinc-100">
             <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.2em]">Vorkana International © 2024</p>
             <Link to="/" className="text-xs font-bold uppercase tracking-widest border-b border-black pb-1">Home</Link>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default TrustSafetyPage;