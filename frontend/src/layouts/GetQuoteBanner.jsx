// components/CompactQuoteBanner.jsx
import React from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";

const CompactQuoteBanner = ({ openAuthModal }) => {
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.token);

  const handleGetQuote = () => {
    if (!token) {
      navigate("/signin")
    } else {
      // User logged in → go to dashboard
      navigate("/dashboard");
    }
  };

  return (
    <section className="bg-gradient-to-r from-gray-900 to-black py-12 px-4">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Left Content */}
        <div className="text-center md:text-left">
        

          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Get matched with top freelancers
          </h2>

          <p className="text-gray-300 max-w-xl">
            Post your project once and receive offers from verified professionals —
            no spam, no commitment.
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={handleGetQuote}
          className="bg-white text-gray-900 font-semibold px-8 py-4 rounded-xl
                     hover:bg-gray-100 transition-all duration-200
                     flex items-center gap-2 shadow-lg"
        >
          Get Quote
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
};

export default CompactQuoteBanner;
