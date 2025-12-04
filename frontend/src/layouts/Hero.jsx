import React from "react";
import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <section className="relative bg-[#0A1A3D] text-white">
      {/* Hero overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A1A3D]/90 to-[#0A1A3D]/80"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 md:py-40 flex flex-col items-center text-center">
        {/* Heading */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight mb-6">
          Get quality work done — <span className="text-indigo-400">Fast, Fair, and hassle-Free.</span>
        </h1>

        {/* Paragraph */}
        <p className="text-lg sm:text-xl md:text-2xl text-gray-200 mb-8 max-w-2xl">
          Tell us what you need. We'll send you a quote + the freelance options.
        </p>

        {/* Button */}
        <Link
          to="/create-gig"
          className="bg-indigo-500 hover:bg-indigo-600 transition text-white font-semibold px-6 py-3 rounded-lg shadow-lg mb-4 sm:mb-6"
        >
          Get a Free Quote
        </Link>

        {/* Subtext */}
        <span className="text-gray-300 text-sm sm:text-base">
          Take 30 seconds. No sign-up needed.
        </span>
      </div>

      {/* Optional: subtle background pattern / shape */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#0A1A3D] to-transparent"></div>
    </section>
  );
};

export default Hero;
