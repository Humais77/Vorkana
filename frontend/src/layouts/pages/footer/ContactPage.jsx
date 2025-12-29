import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, ArrowRight, ArrowUpRight } from 'lucide-react';

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    alert('Transmission Successful. Our team will review your inquiry.');
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-white text-black font-sans antialiased">
      <main className="max-w-6xl mx-auto px-8 py-24">
        
        {/* Header - High Contrast */}
        <section className="mb-20 border-b-2 border-black pb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-[3px] w-12 bg-black"></div>
            <span className="text-xs uppercase tracking-widest font-bold">Inquiry Portal</span>
          </div>
          <h1 className="text-5xl font-bold tracking-tighter mb-6 uppercase">
            Connect & Resolve
          </h1>
          <p className="text-lg text-zinc-800 max-w-xl font-medium leading-relaxed">
            Our support desk operates on a priority-response protocol. 
            Direct your inquiry to the appropriate department below.
          </p>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-20">
          
          {/* Left Side: Form with Strong Borders */}
          <div className="lg:col-span-7">
            <form onSubmit={handleSubmit} className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="border-b-2 border-zinc-800 focus-within:border-black py-2">
                  <label className="block text-xs font-bold uppercase tracking-widest mb-2">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="ALEXANDER VORK"
                    className="w-full bg-transparent outline-none text-sm font-bold placeholder:text-zinc-400 uppercase"
                  />
                </div>
                <div className="border-b-2 border-zinc-800 focus-within:border-black py-2">
                  <label className="block text-xs font-bold uppercase tracking-widest mb-2">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="OFFICE@DOMAIN.COM"
                    className="w-full bg-transparent outline-none text-sm font-bold placeholder:text-zinc-400 uppercase"
                  />
                </div>
              </div>

              <div className="border-b-2 border-zinc-800 focus-within:border-black py-2">
                <label className="block text-xs font-bold uppercase tracking-widest mb-2">Subject Matter</label>
                <select
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="w-full bg-transparent outline-none text-sm font-bold uppercase appearance-none cursor-pointer"
                >
                  <option value="">Select Department</option>
                  <option value="auth">Auth & Access Issues</option>
                  <option value="technical">Gig & Service Technicals</option>
                  <option value="integrity">Platform Trust & Safety</option>
                  <option value="partnership">Global Partnerships</option>
                  <option value="general">General Correspondence</option>
                </select>
              </div>

              <div className="border-b-2 border-zinc-800 focus-within:border-black py-2">
                <label className="block text-xs font-bold uppercase tracking-widest mb-2">Inquiry Details</label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={4}
                  placeholder="DETAILS REGARDING YOUR GIG OR ACCOUNT..."
                  className="w-full bg-transparent outline-none text-sm font-bold placeholder:text-zinc-400 uppercase resize-none"
                />
              </div>

              <button
                type="submit"
                className="group flex items-center gap-6 bg-black text-white px-12 py-5 text-xs font-bold uppercase tracking-[0.3em] hover:bg-zinc-800 transition-all"
              >
                Submit Inquiry
                <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
              </button>
            </form>
          </div>

          {/* Right Side: Bold Information */}
          <div className="lg:col-span-5 space-y-16">
            
            <section className="space-y-12">
              <h2 className="text-xs font-bold uppercase tracking-[0.3em] border-b-2 border-black pb-2">Channels</h2>
              
              <div className="flex gap-6 items-start">
                <Mail className="w-6 h-6 shrink-0 text-black" />
                <div>
                  <h3 className="text-sm font-bold uppercase mb-1">Electronic Mail</h3>
                  <p className="text-sm text-zinc-800 font-bold mb-1">support@vorkana.com</p>
                  <span className="text-[10px] text-black font-bold uppercase tracking-tighter">Response within 24 hours</span>
                </div>
              </div>

              <div className="flex gap-6 items-start">
                <Phone className="w-6 h-6 shrink-0 text-black" />
                <div>
                  <h3 className="text-sm font-bold uppercase mb-1">Direct Line</h3>
                  <p className="text-sm text-zinc-800 font-bold mb-1">+1 (555) 123 4567</p>
                  <span className="text-[10px] text-black font-bold uppercase tracking-tighter">MON — FRI / 09:00 — 18:00 EST</span>
                </div>
              </div>

              <div className="flex gap-6 items-start">
                <MapPin className="w-6 h-6 shrink-0 text-black" />
                <div>
                  <h3 className="text-sm font-bold uppercase mb-1">Office</h3>
                  <p className="text-sm text-zinc-800 leading-relaxed font-bold uppercase tracking-tight">
                    123 Business Avenue / Suite 100<br />San Francisco / CA 94107 / USA
                  </p>
                </div>
              </div>
            </section>

            {/* Quick Actions with Strong Borders */}
            <section className="pt-10 border-t-2 border-black space-y-4">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] mb-6">Quick Actions</h2>
              <Link to="/help" className="flex items-center justify-between group py-3 border-b border-zinc-300 hover:border-black transition-all">
                <span className="text-xs font-bold uppercase">Help Center</span>
                <ArrowUpRight className="w-5 h-5 text-black" />
              </Link>
              <Link to="/trust" className="flex items-center justify-between group py-3 border-b border-zinc-300 hover:border-black transition-all">
                <span className="text-xs font-bold uppercase">Platform Integrity</span>
                <ArrowUpRight className="w-5 h-5 text-black" />
              </Link>
            </section>

          </div>
        </div>

        {/* Footer */}
        <div className="mt-32 pt-10 border-t-2 border-black">
          <Link to="/" className="text-xs font-bold uppercase tracking-widest text-black hover:underline">
            [ Return to Home ]
          </Link>
        </div>
      </main>
    </div>
  );
};

export default ContactPage;