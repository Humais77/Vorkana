import React, { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  ChevronLeft, ChevronRight, 
  Globe, Camera, Code, Palette,
  Smartphone, BarChart
} from "lucide-react";
import { motion } from "framer-motion";

const iconMap = {
  web: <Globe className="w-6 h-6" />,
  video: <Camera className="w-6 h-6" />,
  software: <Code className="w-6 h-6" />,
  mobile: <Smartphone className="w-6 h-6" />,
  design: <Palette className="w-6 h-6" />,
  data: <BarChart className="w-6 h-6" />
};

const PopularServices = () => {
  const scrollContainerRef = useRef(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  fetch('http://localhost:3000/api/popular-services')  // Replace 5000 with your actual backend port
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(result => {
      if (result.success) {
        setServices(result.data);
      }
      setLoading(false);
    })
    .catch(err => {
      console.error('Failed to load popular services:', err);
      setLoading(false);
    });
}, []);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -250, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 250, behavior: 'smooth' });
    }
  };

  return (
    <section className="relative py-16 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex justify-between items-center mb-6">
            <div className="text-left">
              <motion.h2 className="text-4xl md:text-5xl font-bold text-gray-900">
                Popular Services
              </motion.h2>
              <p className="text-gray-600 mt-2">
                Browse services by category and find what you need
              </p>
            </div>
            <Link 
              to="/services"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              View All Services
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <div className="relative mb-16">
          <motion.button
            onClick={scrollLeft}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-6 z-10 w-12 h-12 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center text-gray-700 hover:text-blue-600 transition-all duration-200"
          >
            <ChevronLeft className="w-6 h-6" />
          </motion.button>

          <motion.button
            onClick={scrollRight}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-6 z-10 w-12 h-12 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center text-gray-700 hover:text-blue-600 transition-all duration-200"
          >
            <ChevronRight className="w-6 h-6" />
          </motion.button>

          <div
            ref={scrollContainerRef}
            className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-hide py-4 px-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {loading
              ? // Skeleton loading state
                [...Array(6)].map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-48 md:w-64">
                    <div className="bg-white rounded-xl shadow-md border border-gray-200 h-full animate-pulse">
                      <div className="h-32 md:h-48 bg-gray-200 rounded-t-xl" />
                      <div className="p-5">
                        <div className="h-6 bg-gray-200 rounded w-3/4" />
                      </div>
                    </div>
                  </div>
                ))
              : services.map((service) => (
                  <motion.div
                    key={service.id}
                    className="flex-shrink-0 w-48 md:w-64"
                  >
                    <Link
                      to={`/services/popular-services?q=${encodeURIComponent(service.searchQuery)}`}
                      className="group bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 border border-gray-200 block"
                    >
                      <div className="relative h-full">
                        <div className="relative h-32 md:h-48 overflow-hidden rounded-t-xl">
                          <img
  src={service.imageUrl}
  alt={service.name}
  className="w-full h-full object-cover"
  loading="lazy"
  decoding="async"
/>
                          <motion.div
                            className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-300"
                          />
                        </div>
                        <div className="p-4 md:p-5">
                          <div className="flex items-center gap-3 mb-2">
                            {iconMap[service.category]}
                            <h3 className="text-sm md:text-lg font-bold text-gray-900 truncate">
                              {service.name}
                            </h3>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
          </div>
        </div>

        <div className="text-center">
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Can't find what you're looking for? Search for specific services or request a custom service.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/services"
              className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              Browse All Services
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PopularServices;