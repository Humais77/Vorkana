import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowRight, Mail, Globe, UserPlus, Zap, FileText, Lock } from 'lucide-react';

const HelpCenterPage = () => {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="min-h-screen bg-white text-black font-sans antialiased">
      <main className="max-w-5xl mx-auto px-8 py-24">
        
        {/* Header Section */}
        <header className="mb-32">
          <div className="flex items-center gap-3 mb-6 text-zinc-400">
            <span className="text-[10px] uppercase tracking-[0.4em] font-black">Help System 1.0</span>
            <div className="h-[1px] flex-grow bg-zinc-100"></div>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase mb-8">
            Platform <span className="font-light italic text-zinc-500">Procedures</span>.
          </h1>
          <div className="relative max-w-xl">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search guides (e.g., 'Auth', 'Gig Creation')"
              className="w-full bg-transparent border-b-2 border-black py-4 outline-none text-sm font-bold tracking-widest uppercase placeholder:text-zinc-300"
            />
          </div>
        </header>

        {/* Phase 1: Authentication */}
        <section className="mb-40">
          <div className="flex items-center gap-4 mb-16">
            <span className="text-5xl font-black text-zinc-100">01</span>
            <h2 className="text-2xl font-bold tracking-tight uppercase">Identity & Authentication</h2>
          </div>

          <div className="space-y-24">
            {/* Auth Modal Explanation */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              <div className="md:col-span-4 py-2 border-l-2 border-black pl-6">
                <h3 className="font-black text-sm uppercase tracking-widest mb-2">The Auth Modal</h3>
                <p className="text-xs text-zinc-500 leading-relaxed uppercase">Accessing the Vorkana ecosystem.</p>
              </div>
              <div className="md:col-span-8 text-zinc-600 leading-relaxed italic">
                To begin, select "Login" or "Join" from the navigation. A secure 
                <span className="text-black font-bold not-italic"> Auth Modal </span> 
                will appear, centralizing all entry points into the platform.
              </div>
            </div>

            {/* Login Methods */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 ml-6 md:ml-0">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-black">
                  <Globe className="w-4 h-4" />
                  <h4 className="text-xs font-black uppercase tracking-widest">Single Sign-On (Google)</h4>
                </div>
                <p className="text-sm text-zinc-500">
                  Instant account synchronization. Select the "Continue with Google" 
                  option within the modal for rapid, passwordless entry.
                </p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-black">
                  <Mail className="w-4 h-4" />
                  <h4 className="text-xs font-black uppercase tracking-widest">Standard Credentials</h4>
                </div>
                <p className="text-sm text-zinc-500">
                  Enter a valid business email and a high-entropy password. 
                  A verification link will be dispatched to ensure domain ownership.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Phase 2: Operations */}
        <section className="mb-40">
          <div className="flex items-center gap-4 mb-16">
            <span className="text-5xl font-black text-zinc-100">02</span>
            <h2 className="text-2xl font-bold tracking-tight uppercase">Gigs & Services</h2>
          </div>

          <div className="space-y-24">
            {/* The Login Requirement */}
            <div className="bg-zinc-50 p-12 border-l-4 border-black">
              <div className="flex items-center gap-3 mb-4">
                <Lock className="w-5 h-5" />
                <h3 className="font-black text-sm uppercase tracking-widest">Prerequisite: Authorization</h3>
              </div>
              <p className="text-lg text-zinc-800 font-medium">
                Creating Gigs or listing Services requires an active, verified session. 
                If you are not logged in, the platform will automatically trigger the 
                <span className="underline decoration-1 underline-offset-4"> Auth Modal </span> 
                when you attempt to "Create" or "Post."
              </p>
            </div>

            {/* Execution Steps */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="border-t border-zinc-200 pt-8">
                <div className="flex items-center gap-3 mb-6">
                  <Zap className="w-4 h-4" />
                  <h4 className="font-bold uppercase text-xs tracking-[0.2em]">How to Create a Gig</h4>
                </div>
                <ul className="space-y-4 text-sm text-zinc-600">
                  <li className="flex gap-4"><span>01</span> <span>Access your User Dashboard.</span></li>
                  <li className="flex gap-4"><span>02</span> <span>Select "Create New Gig" from the active tasks.</span></li>
                  <li className="flex gap-4"><span>03</span> <span>Define scope, pricing milestones, and timelines.</span></li>
                </ul>
              </div>

              <div className="border-t border-zinc-200 pt-8">
                <div className="flex items-center gap-3 mb-6">
                  <FileText className="w-4 h-4" />
                  <h4 className="font-bold uppercase text-xs tracking-[0.2em]">Posting a Service</h4>
                </div>
                <ul className="space-y-4 text-sm text-zinc-600">
                  <li className="flex gap-4"><span>01</span> <span>Navigate to your Professional Profile.</span></li>
                  <li className="flex gap-4"><span>02</span> <span>Click "Add New Service" to list your expertise.</span></li>
                  <li className="flex gap-4"><span>03</span> <span>Upload portfolio assets and set your package tiers.</span></li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Support CTA */}
        <footer className="border-t border-black pt-16 flex flex-col md:flex-row justify-between items-start gap-12">
          <div className="max-w-md">
            <h3 className="text-2xl font-bold mb-4 italic tracking-tighter">Facing Auth Issues?</h3>
            <p className="text-zinc-500 text-sm">
              If the Auth Modal fails to initialize or your credentials are 
              unrecognized, contact our system administrators immediately.
            </p>
          </div>
          <Link 
            to="/contact" 
            className="group flex items-center gap-4 bg-black text-white px-10 py-5 font-bold uppercase text-xs tracking-[0.2em] hover:bg-zinc-800 transition-all"
          >
            Direct Inquiry
            <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
          </Link>
        </footer>
      </main>
    </div>
  );
};

export default HelpCenterPage;