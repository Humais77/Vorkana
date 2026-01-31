import React from 'react';
import { Link } from 'react-router-dom';
import { Gavel, Scale, ShieldAlert, FileCheck, ArrowRight, Clock } from 'lucide-react';

const TermsPage = () => {
  return (
    <div className="min-h-screen bg-white text-black font-sans antialiased">
      <main className="max-w-5xl mx-auto px-8 py-24">
        
        {/* Header - High Contrast */}
        <section className="mb-20 border-b-4 border-black pb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-[3px] w-12 bg-black"></div>
            <span className="text-xs uppercase tracking-[0.3em] font-bold text-black">Legal Framework</span>
          </div>
          <h1 className="text-6xl font-extrabold tracking-tighter mb-6 uppercase">
            Terms of Service
          </h1>
          <div className="flex items-center gap-4 text-sm font-bold uppercase tracking-widest text-zinc-600">
            <Clock className="w-4 h-4" />
            <span>Last Modified: October 2024</span>
          </div>
        </section>

        <section className="space-y-24 mb-32">
          {/* 01. Agreement Overview */}
          <div className="flex flex-col md:flex-row gap-12 border-t-2 border-black pt-12">
            <div className="md:w-1/3">
              <h2 className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-3">
                <span className="text-4xl">01</span> Binding Agreement
              </h2>
            </div>
            <div className="md:w-2/3 space-y-6">
              <p className="text-lg font-bold leading-relaxed">
                By accessing the Vorkana platform, you enter a legally binding contract governed by these protocols. 
                If you do not agree to these terms, all access must be terminated immediately.
              </p>
              <div className="bg-zinc-900 text-white p-6 font-mono text-xs leading-relaxed">
                SYSTEM_NOTICE: UNRECONCILED ACCESS WITHOUT AGREEMENT CONSTITUTES A BREACH OF SECURITY PROTOCOL.
              </div>
            </div>
          </div>

          {/* 02. Professional Conduct */}
          <div className="flex flex-col md:flex-row gap-12 border-t-2 border-black pt-12">
            <div className="md:w-1/3">
              <h2 className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-3">
                <span className="text-4xl">02</span> Conduct Code
              </h2>
            </div>
            <div className="md:w-2/3">
              <ul className="space-y-8">
                <li className="flex gap-6">
                  <ShieldAlert className="w-10 h-10 shrink-0" />
                  <div>
                    <h4 className="font-black uppercase text-sm mb-2">Zero-Circumvention</h4>
                    <p className="text-sm font-medium text-zinc-700">Users are strictly prohibited from soliciting off-platform communications or work bypasses. All Gig logs must remain within Vorkana.</p>
                  </div>
                </li>
                <li className="flex gap-6">
                  <Scale className="w-10 h-10 shrink-0" />
                  <div>
                    <h4 className="font-black uppercase text-sm mb-2">Deliverable Integrity</h4>
                    <p className="text-sm font-medium text-zinc-700">Services must be rendered as described. Plagiarism or the use of unauthorized AI-generated assets without disclosure is grounds for deactivation.</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* 03. Account Termination */}
          <div className="flex flex-col md:flex-row gap-12 border-t-2 border-black pt-12">
            <div className="md:w-1/3">
              <h2 className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-3">
                <span className="text-4xl">03</span> Deactivation
              </h2>
            </div>
            <div className="md:w-2/3">
              <p className="text-lg font-bold mb-6">
                Vorkana reserves the right to suspend or permanently terminate access without prior notice for:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border-2 border-black p-4 text-xs font-black uppercase">Multiple Account Creation</div>
                <div className="border-2 border-black p-4 text-xs font-black uppercase">Fraudulent Identity Credentials</div>
                <div className="border-2 border-black p-4 text-xs font-black uppercase">Marketplace Manipulation</div>
                <div className="border-2 border-black p-4 text-xs font-black uppercase">Protocol Harassment</div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer Navigation */}
        <footer className="pt-20 border-t-4 border-black flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex gap-12">
            <Link to="/privacy" className="text-xs font-black uppercase tracking-widest hover:underline">Privacy Policy</Link>
            <Link to="/trust" className="text-xs font-black uppercase tracking-widest hover:underline">Integrity Protocol</Link>
          </div>
          <Link to="/signin" className="group flex items-center gap-4 bg-black text-white px-8 py-4 text-xs font-bold uppercase tracking-widest">
            Accept & Return <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
          </Link>
        </footer>
      </main>
    </div>
  );
};

export default TermsPage;