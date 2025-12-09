// src/components/category/PopularSlider.jsx
import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

const PopularSlider = ({ category, services }) => {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Most Popular in <span className="text-green-600">{category}</span>
          </h2>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => scroll('left')}
              className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:border-green-300 hover:shadow-sm transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:border-green-300 hover:shadow-sm transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="relative">
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-3"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {services.map((service) => (
            <div
              key={service.id}
              className="flex-shrink-0 w-64 bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 group relative"
            >
              <div className="p-4">
                {/* Arrow icon at top right corner */}
                <div className="absolute top-3 right-3">
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-green-500 group-hover:translate-x-1 transition-all" />
                </div>
                
                <h3 className="text-base font-semibold text-gray-900 pr-8 group-hover:text-green-600 transition-colors">
                  {service.title}
                </h3>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default PopularSlider;