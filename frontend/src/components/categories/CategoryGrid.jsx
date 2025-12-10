import React from "react";
import { Link } from "react-router-dom";
import {
  Code2, Palette, TrendingUp, FileText,
  Film, Cpu, Music, Briefcase,
  Users, Camera, Smartphone, Search
} from "lucide-react";

const categories = [
  { id: 1, name: "Programming & Tech", icon: <Code2 className="w-5 h-5" /> },
  { id: 2, name: "Graphic & Design", icon: <Palette className="w-5 h-5" /> },
  { id: 3, name: "Digital Marketing", icon: <TrendingUp className="w-5 h-5" /> },
  { id: 4, name: "Writing & Translation", icon: <FileText className="w-5 h-5" /> },
  { id: 5, name: "Video & Animation", icon: <Film className="w-5 h-5" /> },
  { id: 6, name: "AI Services", icon: <Cpu className="w-5 h-5" /> },
  { id: 7, name: "Music & Audio", icon: <Music className="w-5 h-5" /> },
  { id: 8, name: "Business Services", icon: <Briefcase className="w-5 h-5" /> },
  { id: 9, name: "IT & Consulting", icon: <Users className="w-5 h-5" /> },
  { id: 10, name: "Photography", icon: <Camera className="w-5 h-5" /> },
];

const CategoryGrid = () => {
  return (
    <section className="py-6 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          {/* <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Browse <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Categories</span>
          </h2> */}
          {/* <p className="text-gray-600 text-sm md:text-base">
            Explore services across different professional domains
          </p> */}
        </div>

        {/* Category Grid */}
        <div className="flex flex-wrap justify-center gap-3 md:gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/categories/${cat.id}?name=${encodeURIComponent(cat.name)}&slug=${cat.name.toLowerCase().replace(/\s+/g, '-')}`}
              className="flex flex-col items-center justify-center
        w-24 h-20              
        sm:w-28 sm:h-24      
        md:w-32 md:h-28        
        lg:w-28 lg:h-34       
        bg-white rounded-lg shadow-sm
        hover:shadow-md transition-all duration-200
        border border-gray-100 hover:border-blue-100
        group p-2"
            >
              <div className="text-gray-700 group-hover:text-blue-600 transition-colors duration-200">
                {cat.icon}
              </div>
              <span className="mt-1 text-sm font-medium text-gray-800 group-hover:text-gray-900 text-center leading-tight">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoryGrid;
