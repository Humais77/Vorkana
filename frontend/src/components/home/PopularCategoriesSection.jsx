import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePopularCategories } from '../../hooks/useCategories';
import LoadingSpinner from '../../layouts/LoadingSpinner';

const PopularCategoriesSection = () => {
  const { data: categories, isLoading, error } = usePopularCategories();
  const scrollContainerRef = useRef(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);

  // Calculate visible items based on screen size
  const [visibleItems, setVisibleItems] = useState(4);
  useEffect(() => {
    const updateVisibleItems = () => {
      const width = window.innerWidth;
      if (width < 640) setVisibleItems(1);
      else if (width < 768) setVisibleItems(2);
      else if (width < 1024) setVisibleItems(3);
      else setVisibleItems(4);
    };

    updateVisibleItems();
    window.addEventListener('resize', updateVisibleItems);
    return () => window.removeEventListener('resize', updateVisibleItems);
  }, []);

  const getCategoryImage = (categoryName) => {
    const lowerName = categoryName?.toLowerCase() || '';
    const cloudinaryIdMap = {
      'web': 'rnh7tzst2c3dn174ymlb',
      'video': 'k012iflvrjkqvkvhnqvb',
      'software': 'duoiabdtuud9ija5m5r4',
      'mobile': 'duoiabdtuud9ija5m5r4',
      'design': 'ce3j5h3kgt5umxymvkon',
      'data': 'k01xqmefzhmwyfceifqk',
      'business': 'duoiabdtuud9ija5m5r4',
      'marketing': 'k012iflvrjkqvkvhnqvb',
      'writing': 'rnh7tzst2c3dn174ymlb',
      'music': 'k012iflvrjkqvkvhnqvb',
      'ai': 'duoiabdtuud9ija5m5r4',
      'default': 'k01xqmefzhmwyfceifqk'
    };

    if (lowerName.includes('web') || lowerName.includes('website')) return cloudinaryIdMap.web;
    if (lowerName.includes('video')) return cloudinaryIdMap.video;
    if (lowerName.includes('software') || lowerName.includes('programming') || lowerName.includes('tech')) return cloudinaryIdMap.software;
    if (lowerName.includes('mobile') || lowerName.includes('app')) return cloudinaryIdMap.mobile;
    if (lowerName.includes('design') || lowerName.includes('graphic')) return cloudinaryIdMap.design;
    if (lowerName.includes('data') || lowerName.includes('analytics')) return cloudinaryIdMap.data;
    if (lowerName.includes('business') || lowerName.includes('marketing')) return cloudinaryIdMap.business;
    if (lowerName.includes('writing') || lowerName.includes('content')) return cloudinaryIdMap.writing;
    if (lowerName.includes('music') || lowerName.includes('audio')) return cloudinaryIdMap.music;
    if (lowerName.includes('ai') || lowerName.includes('artificial intelligence')) return cloudinaryIdMap.ai;
    
    return cloudinaryIdMap.default;
  };

  const generateCloudinaryUrl = (publicId, width = 600, height = 400) => {
    return `https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload/w_${width},h_${height},c_fill,q_auto,f_auto/${publicId}`;
  };

  // Debounced scroll handler to improve performance
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || isScrolling) return;
    
    const container = scrollContainerRef.current;
    const isAtStart = container.scrollLeft <= 10;
    const isAtEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 10;
    
    setShowLeftScroll(!isAtStart);
    setShowRightScroll(!isAtEnd);
  }, [isScrolling]);

  // Optimized scroll function with debouncing
  const scroll = useCallback((direction) => {
    if (!scrollContainerRef.current || !categories?.length || isScrolling) return;
    
    setIsScrolling(true);
    const container = scrollContainerRef.current;
    const cardWidth = 300; // Fixed width instead of querying DOM
    const gap = 16;
    const scrollAmount = (cardWidth + gap) * visibleItems * 0.8;
    
    const newScrollLeft = direction === 'left' 
      ? container.scrollLeft - scrollAmount
      : container.scrollLeft + scrollAmount;
    
    container.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    });

    // Update current index
    const maxIndex = Math.max(0, categories.length - visibleItems);
    const newIndex = direction === 'left' 
      ? Math.max(0, currentIndex - 1)
      : Math.min(maxIndex, currentIndex + 1);
    
    setCurrentIndex(newIndex);

    // Reset scrolling flag after animation
    setTimeout(() => {
      setIsScrolling(false);
      handleScroll();
    }, 300);
  }, [categories?.length, currentIndex, visibleItems, handleScroll, isScrolling]);

  const goToSlide = useCallback((index) => {
    if (!scrollContainerRef.current || !categories?.length || isScrolling) return;
    
    setIsScrolling(true);
    const container = scrollContainerRef.current;
    const cardWidth = 300;
    const gap = 16;
    const scrollPosition = index * (cardWidth + gap);
    
    container.scrollTo({
      left: scrollPosition,
      behavior: 'smooth'
    });
    setCurrentIndex(index);

    setTimeout(() => {
      setIsScrolling(false);
      handleScroll();
    }, 300);
  }, [categories?.length, handleScroll, isScrolling]);

  // Add scroll event listener with debouncing
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let scrollTimeout;
    const handleScrollWithDebounce = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        handleScroll();
      }, 50);
    };

    container.addEventListener('scroll', handleScrollWithDebounce);
    return () => {
      container.removeEventListener('scroll', handleScrollWithDebounce);
      clearTimeout(scrollTimeout);
    };
  }, [handleScroll]);

  if (isLoading) {
    return (
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <LoadingSpinner message="Loading popular categories..." />
        </div>
      </section>
    );
  }

  if (error || !categories?.length) {
    return (
      <section className="py-10 px-4 bg-white mb-16">
        <div className="max-w-7xl mx-auto text-center">
          <div className="text-left mb-6">
            <h2 className="text-4xl font-bold text-gray-900 mb-2">
              Popular Services
            </h2>
            <p className="text-gray-600 text-lg">
              Browse our most popular services
            </p>
          </div>
          
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-12">
            <div className="max-w-md mx-auto">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-gray-700 mb-2">
                No Services Available
              </h3>
              <p className="text-gray-500 mb-6">
                Check back soon for our popular services.
              </p>
              <Link
                to="/services"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                <span>Browse All Services</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-10 px-4 bg-white mb-16 relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-left mb-8">
          <h2 className="text-4xl font-bold text-gray-900 mb-2">
            Popular Services
          </h2>
          <p className="text-gray-600 text-lg">
            Browse our most popular services
          </p>
        </div>

        {/* Scrollable Container with Navigation */}
        <div className="relative">
          {/* Left Scroll Button - Simplified without AnimatePresence */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: showLeftScroll ? 1 : 0 }}
            transition={{ duration: 0.2 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => scroll('left')}
            disabled={!showLeftScroll || isScrolling}
            className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 bg-white rounded-full p-3 shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-200 hidden md:flex items-center justify-center ${
              !showLeftScroll ? 'pointer-events-none' : ''
            }`}
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </motion.button>

          {/* Scrollable Grid */}
          <div
            ref={scrollContainerRef}
            className="flex overflow-x-auto pb-4 gap-4 scroll-smooth snap-x snap-mandatory hide-scrollbar"
          >
            {categories.map((category, index) => {
              const cloudinaryId = getCategoryImage(category.name);
              const imageUrl = generateCloudinaryUrl(cloudinaryId);
              
              return (
                <div
                  key={category._id}
                  className="flex-shrink-0 w-[280px] sm:w-[300px] snap-start"
                >
                  <Link
                    to={`/popular-services/${category.slug}`}
                    className="block bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden h-full"
                  >
                    {/* Category Image */}
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={imageUrl}
                        alt={category.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          e.target.onerror = null;
                          const fallbackUrl = generateCloudinaryUrl('k01xqmefzhmwyfceifqk');
                          e.target.src = fallbackUrl;
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    </div>

                    {/* Category Content */}
                    <div className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-1 mb-1">
                        {category.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        View services
                      </p>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Right Scroll Button - Simplified without AnimatePresence */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: showRightScroll ? 1 : 0 }}
            transition={{ duration: 0.2 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => scroll('right')}
            disabled={!showRightScroll || isScrolling}
            className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 bg-white rounded-full p-3 shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-200 hidden md:flex items-center justify-center ${
              !showRightScroll ? 'pointer-events-none' : ''
            }`}
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5 text-gray-700" />
          </motion.button>

          {/* Scroll indicator dots */}
          <div className="flex justify-center gap-2 mt-6">
            {Array.from({ length: Math.max(1, categories.length - visibleItems + 1) }).map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                disabled={isScrolling}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentIndex 
                    ? 'bg-blue-600' 
                    : 'bg-gray-300 hover:bg-gray-400'
                } ${isScrolling ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                aria-label={`Go to slide ${index + 1}`}
                aria-current={index === currentIndex ? 'true' : 'false'}
              />
            ))}
          </div>
        </div>

      </div>

      {/* Hide scrollbar with Tailwind */}
      <style>{`
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
};

export default PopularCategoriesSection;