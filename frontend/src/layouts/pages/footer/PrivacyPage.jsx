import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, Eye, Server, Database, ArrowRight, ShieldCheck } from 'lucide-react';

const PrivacyPage = () => {
  return (
    <div className="min-h-screen bg-white text-black font-sans antialiased">
      <main className="max-w-5xl mx-auto px-8 py-24">
        
        {/* Header */}
        <section className="mb-20 border-b-4 border-black pb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-[3px] w-12 bg-black"></div>
            <span className="text-xs uppercase tracking-[0.3em] font-bold text-black">Data Governance</span>
          </div>
          <h1 className="text-6xl font-extrabold tracking-tighter mb-6 uppercase">
            Privacy Policy
          </h1>
          <p className="text-xl text-zinc-800 max-w-2xl font-bold leading-tight">
            Our data protocols are designed to ensure complete transparency regarding 
            how your professional identity is utilized and protected.
          </p>
        </section>

        <section className="space-y-32 mb-32">
          {/* Data Collection */}
          <div className="flex flex-col md:flex-row gap-12 border-t-2 border-black pt-12">
            <div className="md:w-1/3">
              <h2 className="text-xs font-black uppercase tracking-[0.4em] mb-4 text-zinc-400">Section 01</h2>
              <h3 className="text-2xl font-black uppercase tracking-tighter">Information Harvest</h3>
            </div>
            <div className="md:w-2/3 grid grid-cols-1 gap-8">
              <div className="flex gap-6 items-start">
                <Database className="w-8 h-8 shrink-0" />
                <div>
                  <h4 className="font-black uppercase text-sm mb-2">Auth Metadata</h4>
                  <p className="text-sm font-medium text-zinc-700">We store email addresses, OAuth tokens, and professional credentials provided during the Sign-In process to maintain secure session state.</p>
                </div>
              </div>
              <div className="flex gap-6 items-start">
                <Server className="w-8 h-8 shrink-0" />
                <div>
                  <h4 className="font-black uppercase text-sm mb-2">Activity Logs</h4>
                  <p className="text-sm font-medium text-zinc-700">Technical data including IP addresses, device identifiers, and marketplace navigation patterns are logged to detect and prevent security breaches.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Security Protocols */}
          <div className="flex flex-col md:flex-row gap-12 border-t-2 border-black pt-12">
            <div className="md:w-1/3">
              <h2 className="text-xs font-black uppercase tracking-[0.4em] mb-4 text-zinc-400">Section 02</h2>
              <h3 className="text-2xl font-black uppercase tracking-tighter">Security Standards</h3>
            </div>
            <div className="md:w-2/3">
              <p className="text-lg font-bold mb-8 italic">
                "Data integrity is our baseline. We utilize industry-standard encryption for all 
                at-rest and in-transit information assets."
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-6 border-2 border-black bg-zinc-50">
                  <Lock className="w-6 h-6 mb-4" />
                  <h5 className="font-black uppercase text-xs mb-2">AES-256 Encryption</h5>
                  <p className="text-xs font-medium text-zinc-600">All sensitive identifiers are encrypted before being committed to our primary datastore.</p>
                </div>
                <div className="p-6 border-2 border-black bg-zinc-50">
                  <Eye className="w-6 h-6 mb-4" />
                  <h5 className="font-black uppercase text-xs mb-2">Restricted Access</h5>
                  <p className="text-xs font-medium text-zinc-600">Internal data access is limited to authorized Admin personnel via secure tunneling.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Action Call */}
        <section className="bg-black text-white p-12 flex flex-col md:flex-row justify-between items-center gap-8">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">Your Privacy Rights</h2>
            <p className="text-zinc-400 text-sm font-medium">Request data export or account deactivation at any time.</p>
          </div>
          <Link to="/contact" className="px-10 py-4 border-2 border-white text-xs font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all">
            Contact Data Office
          </Link>
        </section>

        <div className="mt-24 flex justify-between items-center border-t-2 border-black pt-8">
          <p className="text-[10px] font-black uppercase tracking-[0.3em]">Vorkana International © 2024</p>
          <Link to="/" className="text-xs font-black uppercase border-b-2 border-black pb-1">Return Home</Link>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPage;