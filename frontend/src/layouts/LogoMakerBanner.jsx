import React from 'react';

const LogoMakerBanner = ({ onSignupClick }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="bg-[#FFF6F0] rounded-[2.5rem] p-8 md:p-16 flex flex-col md:flex-row items-center justify-between overflow-hidden relative min-h-[500px]">
        
        {/* Left Side: Content */}
        <div className="w-full md:w-1/2 space-y-6 z-20">
          <div className="flex items-center gap-1">
            <span className="font-bold text-3xl tracking-tighter text-gray-900">Vorkana</span>
            <span className="text-3xl text-gray-800 font-light">logo maker.</span>
          </div>
          
          <h2 className="text-5xl md:text-7xl font-bold text-slate-800 leading-[1.1] tracking-tight">
            Browse incredible <br />
            <span className="text-[#FF7A30]">existing logos</span>
          </h2>
          
          <p className="text-xl text-slate-600 font-medium max-w-md">
            Find the perfect look for your business by browsing thousands of professional, pre-designed logos.
          </p>
          
          <button 
            onClick={onSignupClick}
            className="bg-[#222325] text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-black transition-all shadow-lg active:scale-95"
          >
            Explore Vorkana Logos
          </button>
        </div>

        {/* Right Side: Visual Mockup Cluster */}
        <div className="w-full md:w-1/2 mt-16 md:mt-0 relative flex justify-center items-center h-[450px]">
          
          {/* Decorative Background Shape */}
          <div className="absolute right-0 w-[85%] h-full bg-[#FFDED0] rounded-[3rem] opacity-60 transform translate-x-10" />

          {/* 1. Phone Mockup (Simulating Browsing) */}
          <div className="absolute left-[-20px] top-12 z-30 transform -rotate-[12deg]">
            <img 
              src="https://images.unsplash.com/photo-1551650975-87deedd944c3?auto=format&fit=crop&q=80&w=400" 
              alt="Browse App Mockup"
              className="w-36 md:w-44 h-72 md:h-80 object-cover rounded-[2.5rem] border-[6px] border-white shadow-2xl"
            />
          </div>

          {/* 2. Floating Logo Card (Center) */}
          <div className="absolute top-0 left-[35%] z-40 bg-[#D1F2EB] p-4 rounded-3xl shadow-xl transform rotate-6 border-2 border-white">
            <img 
              src="https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&q=80&w=200" 
              alt="Logo Choice"
              className="w-24 h-32 object-cover rounded-xl"
            />
          </div>

          {/* 3. The Dual Product Mockups (Right side) */}
          <div className="relative z-20 flex -space-x-12 translate-x-12">
            <img 
              src="https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=400&auto=format&fit=crop" 
              alt="Branding Mockup 1"
              className="w-40 md:w-48 h-64 md:h-80 object-cover rounded-3xl shadow-2xl rotate-[12deg] border-4 border-white"
            />
            <img 
              src="https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&q=80&w=400" 
              alt="Branding Mockup 2"
              className="w-40 md:w-48 h-64 md:h-80 object-cover rounded-3xl shadow-2xl -rotate-[5deg] border-4 border-white translate-y-8"
            />
          </div>

          {/* 4. Selection UI (Floating 'a' boxes) */}
          <div className="absolute bottom-6 left-[25%] flex gap-3 z-50">
             <div className="bg-white p-3 rounded-2xl shadow-xl border border-gray-100 flex items-center justify-center w-12 h-12">
                <span className="font-black text-xl text-slate-900">a</span>
             </div>
             <div className="bg-white p-3 rounded-2xl shadow-xl border border-gray-100 flex items-center justify-center w-12 h-12">
                <span className="font-black text-xl text-orange-500">a</span>
             </div>
             <div className="bg-white p-3 rounded-2xl shadow-xl border border-gray-100 flex items-center justify-center w-12 h-12">
                <span className="font-black text-xl text-pink-400">a</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogoMakerBanner;