import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle, Users, Shield, Target, Star } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative bg-gradient-to-br from-white via-blue-50 to-white text-gray-900 overflow-hidden -mt-10">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 lg:py-24">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16">
          {/* Left Content */}
          <div className="lg:w-1/2 text-center lg:text-left">
            {/* Simple Badge */}
            <div className="inline-flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full mb-6 border border-blue-100">
              <CheckCircle className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">No sign-up needed</span>
            </div>

            {/* Clean Main Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Find the Perfect
              <span className="block text-blue-600">Freelancer for Your Project</span>
            </h1>

            {/* Simple Subtitle */}
            <p className="text-lg text-gray-600 mb-8 max-w-2xl leading-relaxed">
              Post your project in minutes. Get quality proposals from verified freelancers. 
              Fast, secure, and completely hassle-free.
            </p>

            {/* Simple Features */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Secure & Verified</h3>
                  <p className="text-sm text-gray-600">Google-authenticated freelancers</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Target className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Quality Matches</h3>
                  <p className="text-sm text-gray-600">Tailored proposals to your needs</p>
                </div>
              </div>
            </div>

            {/* Clean CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Link
                to="/create-gig"
                className="group inline-flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-300"
              >
                <span>Create Your Gig — It's Free</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <Link
                to="/categories"
                className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-800 font-medium px-6 py-3 rounded-lg border border-gray-300 hover:border-gray-400 transition-all duration-300"
              >
                <Users className="w-4 h-4" />
                <span>Browse Freelancers</span>
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-blue-500 border-2 border-white"></div>
                  ))}
                </div>
                <div>
                  <div className="font-medium text-gray-900 text-sm">500+ Active Projects</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  ))}
                </div>
                <div>
                  <div className="font-medium text-gray-900 text-sm">4.9/5 Rating</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Stats Card */}
          <div className="lg:w-1/2">
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="text-center p-4">
                  <div className="text-3xl font-bold text-blue-600 mb-2">10K+</div>
                  <div className="text-sm text-gray-600 font-medium">Verified Freelancers</div>
                </div>
                <div className="text-center p-4">
                  <div className="text-3xl font-bold text-blue-600 mb-2">98%</div>
                  <div className="text-sm text-gray-600 font-medium">Success Rate</div>
                </div>
                <div className="text-center p-4">
                  <div className="text-3xl font-bold text-blue-600 mb-2">24h</div>
                  <div className="text-sm text-gray-600 font-medium">Avg. Response Time</div>
                </div>
                <div className="text-center p-4">
                  <div className="text-3xl font-bold text-blue-600 mb-2">$5M+</div>
                  <div className="text-sm text-gray-600 font-medium">Paid to Freelancers</div>
                </div>
              </div>

              {/* Testimonial */}
              <div className="bg-blue-50 rounded-lg p-5 border border-blue-100">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-blue-500"></div>
                  <div>
                    <div className="font-bold text-gray-900">Alex Thompson</div>
                    <div className="text-sm text-gray-600">Startup Founder</div>
                  </div>
                </div>
                <p className="text-gray-700 italic">
                  "Posted my project and received 5 qualified proposals within hours. The quality exceeded expectations!"
                </p>
                <div className="flex mt-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;