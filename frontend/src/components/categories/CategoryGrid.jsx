import React, { useRef } from "react";
import { Link } from "react-router-dom";
import {
  Code2, Palette, TrendingUp, FileText,
  Film, Cpu, Music, Briefcase,
  Users, Camera, Smartphone, Search,
  ChevronLeft, ChevronRight
} from "lucide-react";

const categories = [
  { id: 1, name: "Programming & Tech", icon: <Code2 className="w-7 h-7" /> },
  { id: 2, name: "Graphic & Design", icon: <Palette className="w-7 h-7" /> },
  { id: 3, name: "Digital Marketing", icon: <TrendingUp className="w-7 h-7" /> },
  { id: 4, name: "Writing & Translation", icon: <FileText className="w-7 h-7" /> },
  { id: 5, name: "Video & Animation", icon: <Film className="w-7 h-7" /> },
  { id: 6, name: "AI Services", icon: <Cpu className="w-7 h-7" /> },
  { id: 7, name: "Music & Audio", icon: <Music className="w-7 h-7" /> },
  { id: 8, name: "Business Services", icon: <Briefcase className="w-7 h-7" /> },
  { id: 9, name: "IT & Consulting", icon: <Users className="w-7 h-7" /> },
  { id: 10, name: "Photography", icon: <Camera className="w-7 h-7" /> },
  { id: 11, name: "Mobile Apps", icon: <Smartphone className="w-7 h-7" /> },
  { id: 12, name: "SEO & Analytics", icon: <Search className="w-7 h-7" /> },
];

const CategoryGrid = () => {
  const scrollContainerRef = useRef(null);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  return (
    <section className="relative py-12 px-4 bg-white">
      <div className="relative max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Browse <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Categories</span>
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Explore services across different professional domains
          </p>
        </div>

        {/* Scroll Container with Navigation Buttons */}
        <div className="relative">
          {/* Left Scroll Button */}
          <button
            onClick={scrollLeft}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center text-gray-700 hover:text-blue-600 hover:border-blue-300 hover:shadow-xl transition-all duration-300 group"
          >
            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
          </button>

          {/* Right Scroll Button */}
          <button
            onClick={scrollRight}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center text-gray-700 hover:text-blue-600 hover:border-blue-300 hover:shadow-xl transition-all duration-300 group"
          >
            <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* Categories Horizontal Scroll Container */}
          <div
            ref={scrollContainerRef}
            className="flex gap-6 overflow-x-auto scrollbar-hide py-4 px-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/categories/${cat.id}?name=${encodeURIComponent(cat.name)}&slug=${cat.name.toLowerCase().replace(/\s+/g, '-')}`}
                className="group flex-shrink-0 w-48 h-40 bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-blue-100 hover:scale-[1.02] relative overflow-hidden"
              >
                {/* Card Content */}
                <div className="relative p-6 h-full flex flex-col items-center justify-center text-center gap-4">
                  {/* Simple Icon */}
                  <div className="text-gray-700 group-hover:text-blue-600 transition-colors duration-300">
                    {cat.icon}
                  </div>

                  {/* Category Name */}
                  <h3 className="text-lg font-semibold text-gray-800 group-hover:text-gray-900 transition-colors duration-300 leading-tight">
                    {cat.name}
                  </h3>

                  {/* Subtle Hover Indicator */}
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-0.5 bg-blue-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-center"></div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Custom Scrollbar Style */}
        <style jsx>{`
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `}</style>
      </div>
    </section>
  );
};

export default CategoryGrid;