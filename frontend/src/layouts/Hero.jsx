import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle, Users, Shield, Target, Star, Sparkles } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 text-gray-900 overflow-hidden">
      {/* Enhanced blue background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-cyan-300/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/3 w-64 h-64 bg-blue-300/20 rounded-full blur-3xl"></div>
        
        {/* Geometric patterns */}
        <div className="absolute top-20 right-20 w-32 h-32 border-4 border-blue-300/30 rounded-3xl rotate-45"></div>
        <div className="absolute bottom-32 left-32 w-24 h-24 border-4 border-indigo-300/30 rounded-full"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-36 lg:py-48">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-16">
          {/* Left Content */}
          <div className="lg:w-1/2 text-center lg:text-left">
            {/* Premium Badge */}
            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 backdrop-blur-sm px-5 py-3 rounded-2xl mb-8 border border-blue-300/50 shadow-lg">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-semibold text-blue-800 bg-white/80 px-3 py-1 rounded-full">
                No sign-up needed
              </span>
              <span className="text-sm font-medium text-blue-700">• Quick & Easy</span>
            </div>

            {/* Main Heading with enhanced blue theme */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight mb-8">
              Find the Perfect <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">Freelancer</span>
              <br />
              <span className="text-4xl sm:text-5xl lg:text-6xl text-blue-800">for Your Project</span>
            </h1>

            {/* Subtitle with blue accents */}
            <p className="text-xl sm:text-2xl text-blue-700/80 mb-10 max-w-2xl leading-relaxed">
              Post your project in minutes. Get quality proposals from verified freelancers. 
              <span className="font-bold text-blue-800 ml-2">Fast, secure, and completely hassle-free.</span>
            </p>

            {/* Enhanced Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
              <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl p-6 shadow-xl border border-blue-200 hover:border-blue-300 transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-blue-900">Secure & Verified</h3>
                </div>
                <p className="text-sm text-blue-700/80">Google-authenticated freelancers ensure safe, professional collaboration</p>
              </div>
              
              <div className="bg-gradient-to-br from-white to-indigo-50 rounded-2xl p-6 shadow-xl border border-indigo-200 hover:border-indigo-300 transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-indigo-900">Quality Matches</h3>
                </div>
                <p className="text-sm text-indigo-700/80">Get tailored proposals from freelancers who perfectly match your needs</p>
              </div>
            </div>

            {/* Enhanced CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 mb-10">
              <Link
                to="/create-gig"
                className="group relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:via-blue-800 hover:to-indigo-800 text-white font-bold px-10 py-5 rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center gap-4 text-lg overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-white/10 to-blue-500/0 animate-shimmer"></div>
                <span className="relative">Create Your Gig — It's Free</span>
                <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform duration-300" />
              </Link>
              
              <Link
                to="/categories"
                className="group bg-gradient-to-br from-white to-blue-50 hover:from-blue-50 hover:to-indigo-50 text-blue-800 font-semibold px-10 py-5 rounded-2xl border-2 border-blue-300 hover:border-blue-400 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
              >
                <Users className="w-5 h-5" />
                <span>Browse Freelancers</span>
              </Link>
            </div>

            {/* Enhanced Trust Indicators */}
            <div className="flex flex-wrap items-center gap-10 text-sm">
              <div className="flex items-center gap-4 bg-white/80 backdrop-blur-sm px-6 py-4 rounded-xl shadow-md">
                <div className="relative">
                  <div className="flex -space-x-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 border-3 border-white shadow-lg"></div>
                    ))}
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                    <CheckCircle className="w-3 h-3 text-white" />
                  </div>
                </div>
                <div>
                  <div className="font-bold text-blue-900">500+ Active Projects</div>
                  <div className="text-xs text-blue-600">Live right now</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-6 py-4 rounded-xl shadow-md">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  ))}
                </div>
                <div>
                  <div className="font-bold text-blue-900">4.9/5 Rating</div>
                  <div className="text-xs text-blue-600">Average client satisfaction</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Visual Card */}
          <div className="lg:w-1/2 relative">
            {/* Decorative elements */}
            <div className="absolute -top-6 -left-6 w-32 h-32 bg-gradient-to-r from-blue-400/30 to-indigo-400/30 rounded-full blur-xl"></div>
            <div className="absolute -bottom-6 -right-6 w-40 h-40 bg-gradient-to-r from-cyan-400/30 to-blue-400/30 rounded-full blur-xl"></div>
            
            <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-3xl shadow-2xl p-10 text-white overflow-hidden transform hover:scale-[1.02] transition-transform duration-500">
              {/* Animated background */}
              <div className="absolute inset-0">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shine"></div>
                <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_30%_30%,_white_1px,_transparent_1px)] bg-[length:40px_40px]"></div>
              </div>
              
              <div className="relative">
                {/* Stats Section - Moved to top */}
                <div className="mb-12">
                  <h2 className="text-3xl font-bold mb-8 text-center">Why Choose Us</h2>
                  <div className="grid grid-cols-2 gap-8">
                    <div className="text-center">
                      <div className="text-5xl font-bold mb-3">10K+</div>
                      <div className="text-lg text-blue-200 font-medium">Verified Freelancers</div>
                      <div className="text-sm text-blue-300 mt-2">Skilled professionals ready to work</div>
                    </div>
                    <div className="text-center">
                      <div className="text-5xl font-bold mb-3">98%</div>
                      <div className="text-lg text-blue-200 font-medium">Success Rate</div>
                      <div className="text-sm text-blue-300 mt-2">Projects completed successfully</div>
                    </div>
                  </div>
                </div>

                {/* Additional Stats */}
                <div className="grid grid-cols-2 gap-6 mb-12">
                  <div className="text-center p-6 bg-white/10 backdrop-blur-sm rounded-2xl">
                    <div className="text-3xl font-bold mb-2">24h</div>
                    <div className="text-sm text-blue-200">Avg. Response Time</div>
                  </div>
                  <div className="text-center p-6 bg-white/10 backdrop-blur-sm rounded-2xl">
                    <div className="text-3xl font-bold mb-2">$5M+</div>
                    <div className="text-sm text-blue-200">Paid to Freelancers</div>
                  </div>
                </div>

                {/* Enhanced Testimonial */}
                <div className="bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 shadow-lg"></div>
                      <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <div>
                      <div className="font-bold text-xl">Alex Thompson</div>
                    
                    </div>
                  </div>
                  <p className="text-lg italic text-white/90 leading-relaxed">
                    "Posted my project and received 5 qualified proposals within hours. The quality exceeded expectations!"
                  </p>
                  <div className="flex mt-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Wave separator */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden">
        <svg 
          className="relative block w-full h-32"
          viewBox="0 0 1200 120" 
          preserveAspectRatio="none"
          style={{ transform: 'rotate(180deg)' }}
        >
          <path 
            d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" 
            opacity=".15" 
            className="fill-current text-blue-300"
          ></path>
          <path 
            d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z" 
            opacity=".3" 
            className="fill-current text-blue-400"
          ></path>
          <path 
            d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z" 
            className="fill-current text-white"
          ></path>
        </svg>
      </div>
    </section>
  );
};

export default Hero;