// src/components/category/CategoryHero.jsx
import React from 'react';
import { 
  Code2, Palette, TrendingUp, FileText, 
  Film, Cpu, Music, Briefcase, 
  Users, Camera, Smartphone, Search
} from 'lucide-react';

const CategoryHero = ({ 
  category = "Programming & Tech", 
  description = "From concept to deployment, our expert developers bring your ideas to life with cutting-edge technology solutions."
}) => {
  // Icon mapping
  const iconComponents = {
    Code2: Code2,
    Palette: Palette,
    TrendingUp: TrendingUp,
    FileText: FileText,
    Film: Film,
    Cpu: Cpu,
    Music: Music,
    Briefcase: Briefcase,
    Users: Users,
    Camera: Camera,
    Smartphone: Smartphone,
    Search: Search
  };

  const iconName = category.split(' ')[0] || 'Code2';
  const IconComponent = iconComponents[iconName] || Code2;

  return (
    <div className="pt-6 pb-8"> {/* Further reduced padding */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="relative rounded-xl shadow-lg overflow-hidden"> {/* Changed to rounded-xl */}
          {/* Green Background */}
          <div className="absolute inset-0 bg-green-700">
            <div className="absolute inset-0 bg-gradient-to-br from-green-600 via-green-700 to-emerald-800 opacity-95"></div>
          </div>
          
          {/* Content */}
          <div className="relative px-5 sm:px-8 py-8 md:py-10"> {/* Reduced padding */}
            <div className="text-center max-w-2xl mx-auto">
              
              {/* Compact Badge */}
              <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-emerald-300 to-green-300"></div>
                <span className="text-xs font-medium text-white/90">A New Power Works</span>
              </div>
              
              {/* Main Heading - Single line */}
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3">
                {category}
              </h1>
              
              
              
              {/* Tagline - Compact */}
              <p className="text-base md:text-lg text-white/90 font-normal mb-4">
                You think it. A programmer develops it.
              </p>
              
              
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryHero;