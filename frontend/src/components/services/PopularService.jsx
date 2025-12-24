import React, { useRef, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  ChevronLeft, ChevronRight, 
  Globe, Camera, Code, Palette,
  Smartphone, BarChart, AlertCircle
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
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPopularServices = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('http://localhost:3000/api/services/popular/category');
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to fetch popular services'}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.data) {
          // Validate each service has required fields
          const validatedServices = result.data.map((service, index) => {
            // Ensure service has required properties
            if (!service.id) {
              console.warn(`Service at index ${index} missing id, using fallback`);
              service.id = `fallback-${index}-${Date.now()}`;
            }
            
            if (!service.name || typeof service.name !== 'string') {
              console.warn(`Service ${service.id} missing valid name`);
              service.name = service.title || 'Unnamed Service';
            }
            
            if (!service.category || !iconMap[service.category]) {
              console.warn(`Service ${service.id} has invalid category: ${service.category}`);
              service.category = 'web'; // Default category
            }
            
            if (!service.imageUrl || typeof service.imageUrl !== 'string') {
              console.warn(`Service ${service.id} missing imageUrl`);
              service.imageUrl = `https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=512&h=384&fit=crop&q=80&auto=format`;
            }
            
            if (!service.searchQuery || typeof service.searchQuery !== 'string') {
              console.warn(`Service ${service.id} missing searchQuery`);
              service.searchQuery = service.name.toLowerCase().replace(/\s+/g, '-');
            }
            
            return service;
          });
          
          setServices(validatedServices);
        } else {
          throw new Error(result.message || 'Invalid response format');
        }
      } catch (err) {
        console.error('Failed to load popular services:', err);
        setError(err.message || 'An unknown error occurred');
        
        // Fallback to mock data if API fails
        setServices(getFallbackServices());
      } finally {
        setLoading(false);
      }
    };

    fetchPopularServices();
  }, []);

  const getFallbackServices = () => {
    const fallbackServices = [
      {
        id: 'fallback-1',
        name: 'Website Development',
        description: 'Professional custom website development',
        searchQuery: 'website-development',
        category: 'web',
        imageUrl: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=512&h=384&fit=crop&q=80&auto=format'
      },
      {
        id: 'fallback-2',
        name: 'Video Editing',
        description: 'Professional video editing services',
        searchQuery: 'video-editing',
        category: 'video',
        imageUrl: 'https://images.unsplash.com/photo-1568664556541-4f4301c8d7b2?w=512&h=384&fit=crop&q=80&auto=format'
      },
      {
        id: 'fallback-3',
        name: 'Software Development',
        description: 'Custom software solutions',
        searchQuery: 'software-development',
        category: 'software',
        imageUrl: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=512&h=384&fit=crop&q=80&auto=format'
      },
      {
        id: 'fallback-4',
        name: 'Mobile App Development',
        description: 'Native and cross-platform apps',
        searchQuery: 'mobile-app',
        category: 'mobile',
        imageUrl: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=512&h=384&fit=crop&q=80&auto=format'
      },
      {
        id: 'fallback-5',
        name: 'Graphic Design',
        description: 'Visual design services',
        searchQuery: 'graphic-design',
        category: 'design',
        imageUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=512&h=384&fit=crop&q=80&auto=format'
      },
      {
        id: 'fallback-6',
        name: 'Data Analysis',
        description: 'Data analytics services',
        searchQuery: 'data-analysis',
        category: 'data',
        imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=512&h=384&fit=crop&q=80&auto=format'
      }
    ];
    
    return fallbackServices;
  };

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

  const handleServiceClick = (searchQuery) => {
    // Sanitize the search query for URL
    const sanitizedQuery = encodeURIComponent(searchQuery.trim());
    navigate(`/services/popular-services?q=${sanitizedQuery}`);
  };

  // Check if services are available (not loading, no error, and services array has items)
  const hasServices = !loading && services.length > 0;
  
  // Check if we should show the "View All Services" link in header
  const showViewAllLink = hasServices;

  return (
    <section className="relative py-16 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex justify-between items-center mb-6">
            <div className="text-left">
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-4xl md:text-5xl font-bold text-gray-900"
              >
                Popular Services
              </motion.h2>
              <p className="text-gray-600 mt-2">
                Browse services by category and find what you need
              </p>
            </div>
            {/* Only show "View All Services" link if services are available */}
            {showViewAllLink && (
              <Link 
                to="/services"
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                View All Services
                <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-3 text-red-800">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="font-medium">Error loading popular services</p>
                <p className="text-sm mt-1 text-red-600">{error}</p>
                <p className="text-xs mt-2 text-red-500">
                  Showing fallback services. The page will refresh automatically in 30 seconds.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="relative mb-16">
          {hasServices && (
            <>
              <motion.button
                onClick={scrollLeft}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-6 z-10 w-12 h-12 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center text-gray-700 hover:text-blue-600 transition-all duration-200 hover:scale-105"
                aria-label="Scroll left"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ChevronLeft className="w-6 h-6" />
              </motion.button>

              <motion.button
                onClick={scrollRight}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-6 z-10 w-12 h-12 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center text-gray-700 hover:text-blue-600 transition-all duration-200 hover:scale-105"
                aria-label="Scroll right"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ChevronRight className="w-6 h-6" />
              </motion.button>
            </>
          )}

          <div
            ref={scrollContainerRef}
            className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-hide py-4 px-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            aria-label="Popular services carousel"
          >
            {loading ? (
              // Skeleton loading state
              [...Array(6)].map((_, i) => (
                <div 
                  key={i} 
                  className="flex-shrink-0 w-48 md:w-64"
                  role="status"
                  aria-label="Loading service"
                >
                  <div className="bg-white rounded-xl shadow-md border border-gray-200 h-full animate-pulse">
                    <div className="h-32 md:h-48 bg-gray-200 rounded-t-xl" />
                    <div className="p-5">
                      <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
                      <div className="h-4 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))
            ) : !hasServices ? (
              // No services state
              <div className="w-full text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <AlertCircle className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  No services available
                </h3>
                <p className="text-gray-500 mb-6">
                  No popular services found at the moment.
                </p>
        
              </div>
            ) : (
              // Services display
              services.map((service) => (
                <motion.div
                  key={service.id}
                  className="flex-shrink-0 w-48 md:w-64"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  whileHover={{ y: -5 }}
                >
                  <div
                    onClick={() => handleServiceClick(service.searchQuery)}
                    className="group bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-200 block cursor-pointer"
                    role="button"
                    tabIndex={0}
                    aria-label={`View ${service.name} services`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleServiceClick(service.searchQuery);
                      }
                    }}
                  >
                    <div className="relative h-full">
                      <div className="relative h-32 md:h-48 overflow-hidden rounded-t-xl">
                        <img
                          src={service.imageUrl}
                          alt={service.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            // Fallback image if original fails to load
                            e.target.onerror = null;
                            e.target.src = `https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=512&h=384&fit=crop&q=80&auto=format`;
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                      <div className="p-4 md:p-5">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="text-blue-600">
                            {iconMap[service.category] || iconMap.web}
                          </div>
                          <h3 className="text-sm md:text-lg font-bold text-gray-900 truncate">
                            {service.name}
                          </h3>
                        </div>
                        {service.description && (
                          <p className="text-gray-600 text-sm line-clamp-2">
                            {service.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Only show action buttons section if services are available */}
        {hasServices && (
          <div className="text-center">
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Can't find what you're looking for? Search for specific services or request a custom service.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/services"
                className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors duration-200 hover:scale-105 active:scale-95"
              >
                Browse All Services
              </Link>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors duration-200 hover:scale-105 active:scale-95"
              >
                Refresh Services
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default PopularServices;