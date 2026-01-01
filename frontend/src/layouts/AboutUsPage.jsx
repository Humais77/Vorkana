import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Globe, ShieldCheck, Zap, ArrowRight } from 'lucide-react';
import Footer from './Footer';

const AboutUsPage = () => {
  const location = useLocation();
  
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const source = queryParams.get('source');
    const medium = queryParams.get('medium');
    const campaign = queryParams.get('campaign');
    
    if (source && typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'page_view', {
        page_title: 'About Vorkanna',
        page_location: window.location.href,
        source: source,
        medium: medium || 'website',
        campaign: campaign || 'direct'
      });
    }
  }, [location.search]);

  return (
    <div className="min-h-screen bg-white text-black font-sans">
      <main className="max-w-6xl mx-auto px-6 py-20">
        
        {/* Hero Section */}
        <div className="border-b border-black pb-16 mb-20">
          <span className="text-xs uppercase tracking-[0.3em] font-bold text-gray-500 block mb-4">
            Established 2023
          </span>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-8 italic">
            Vorkanna.
          </h1>
          <p className="text-2xl md:text-3xl text-zinc-600 max-w-3xl leading-tight">
            The bridge between elite talent and global visionaries. 
            We define the future of distributed work.
          </p>
        </div>

        {/* Mission Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mb-32">
          <div>
            <h2 className="text-xs uppercase tracking-widest font-bold mb-6 text-zinc-400">Our Mission</h2>
            <p className="text-xl leading-relaxed text-zinc-800">
              At Vorkanna, we believe that excellence has no borders. We are architecting 
              a platform where the world’s most skilled professionals can connect 
              with companies that value quality over quantity.
            </p>
          </div>
          <div className="flex items-center">
            <p className="text-lg leading-relaxed text-zinc-500 border-l border-zinc-200 pl-8">
              We aren't just a marketplace; we are a standard. By democratizing access 
              to high-stakes projects, we empower freelancers to build sustainable, 
              prestigious careers from anywhere on Earth.
            </p>
          </div>
        </div>

        {/* Values Section - Monochrome Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-1 border-y border-black bg-black mb-32">
          <div className="bg-white p-10 hover:bg-zinc-50 transition-colors">
            <Globe className="w-8 h-8 mb-6" />
            <h3 className="text-xl font-bold mb-4 uppercase tracking-tight">Global Reach</h3>
            <p className="text-zinc-600 leading-relaxed">
              Breaking geographical barriers. We connect the world’s top 3% of talent 
              with projects that deserve their expertise.
            </p>
          </div>
          
          <div className="bg-white p-10 hover:bg-zinc-50 transition-colors">
            <ShieldCheck className="w-8 h-8 mb-6" />
            <h3 className="text-xl font-bold mb-4 uppercase tracking-tight">Trust & Safety</h3>
            <p className="text-zinc-600 leading-relaxed">
              Verified protocols and secure capital management. We ensure every 
              partnership is protected by industry-leading standards.
            </p>
          </div>
          
          <div className="bg-white p-10 hover:bg-zinc-50 transition-colors">
            <Zap className="w-8 h-8 mb-6" />
            <h3 className="text-xl font-bold mb-4 uppercase tracking-tight">Efficiency</h3>
            <p className="text-zinc-600 leading-relaxed">
              Time is the ultimate currency. Our streamlined vetting and matching 
              engine moves at the speed of your business.
            </p>
          </div>
        </div>

        {/* Story Section - Minimalist */}
        <div className="max-w-3xl mb-32">
          <h2 className="text-3xl font-bold mb-10">The Vorkanna Story</h2>
          <div className="space-y-6 text-lg text-zinc-700 leading-relaxed">
            <p>
              Vorkanna was born from a simple observation: the digital economy was 
              becoming a race to the bottom. In 2023, our founders set out to reverse 
              that trend.
            </p>
            <p>
              We built a workspace that prioritizes human connection and professional 
              integrity. By removing the "noise" found on traditional platforms, 
              we allow the work to speak for itself.
            </p>
          </div>
        </div>

        {/* CTA Section - High Contrast */}
        <div className="bg-black text-white p-12 md:p-20 text-center flex flex-col items-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-8 tracking-tighter">
            Ready to elevate your project?
          </h2>
          <div className="flex flex-col sm:flex-row gap-6">
            <Link
              to="/"
              className="group flex items-center gap-3 bg-white text-black px-10 py-4 font-bold uppercase text-sm tracking-widest hover:bg-zinc-200 transition-all"
            >
              Start Hiring
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/create-gig"
              className="px-10 py-4 border border-zinc-700 font-bold uppercase text-sm tracking-widest hover:border-white transition-all"
            >
              Join as Talent
            </Link>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default AboutUsPage;