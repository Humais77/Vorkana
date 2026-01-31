// PopularCategoriesSection.jsx
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePopularCategories } from '../../hooks/useCategories';
import LoadingSpinner from '../../layouts/LoadingSpinner';
import { getCategoryImage, getCategoryImageByName } from '../../utils/categoryImageMapping';

const PopularCategoriesSection = () => {
  const { data: categories, isLoading, error } = usePopularCategories();
  const scrollContainerRef = useRef(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [imageErrors, setImageErrors] = useState({});
  const [containerWidth, setContainerWidth] = useState(0);

  // Calculate visible items based on screen size
  const [visibleItems, setVisibleItems] = useState(4);
  useEffect(() => {
    const updateVisibleItems = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setVisibleItems(1);
      } else if (width < 768) {
        setVisibleItems(2);
      } else if (width < 1024) {
        setVisibleItems(3);
      } else {
        setVisibleItems(4);
      }
      
      // Update container width for overflow calculation
      if (scrollContainerRef.current) {
        setContainerWidth(scrollContainerRef.current.clientWidth);
      }
    };

    updateVisibleItems();
    window.addEventListener('resize', updateVisibleItems);
    
    // Initial container width measurement
    const timeoutId = setTimeout(() => {
      if (scrollContainerRef.current) {
        setContainerWidth(scrollContainerRef.current.clientWidth);
      }
    }, 100);
    
    return () => {
      window.removeEventListener('resize', updateVisibleItems);
      clearTimeout(timeoutId);
    };
  }, []);

  // Update container width when categories change
  useEffect(() => {
    const updateContainerWidth = () => {
      if (scrollContainerRef.current) {
        setContainerWidth(scrollContainerRef.current.clientWidth);
      }
    };
    
    updateContainerWidth();
    const resizeObserver = new ResizeObserver(updateContainerWidth);
    
    if (scrollContainerRef.current) {
      resizeObserver.observe(scrollContainerRef.current);
    }
    
    return () => {
      if (scrollContainerRef.current) {
        resizeObserver.unobserve(scrollContainerRef.current);
      }
    };
  }, [categories]);

  // Calculate if we have overflow (need scroll buttons)
  const hasOverflow = useCallback(() => {
    if (!scrollContainerRef.current || !categories?.length) return false;
    
    const container = scrollContainerRef.current;
    const cardWidth = 280; // Card width + margin/padding
    const totalWidth = categories.length * cardWidth;
    
    return totalWidth > container.clientWidth;
  }, [categories?.length]);

  // Optimized scroll function
  const scroll = useCallback((direction) => {
    if (!scrollContainerRef.current || !categories?.length || isScrolling) return;
    
    setIsScrolling(true);
    const container = scrollContainerRef.current;
    const cardWidth = 280;
    const gap = 16;
    const scrollAmount = (cardWidth + gap) * Math.min(visibleItems, 2); // Scroll by 2 items max
    
    const newScrollLeft = direction === 'left' 
      ? Math.max(0, container.scrollLeft - scrollAmount)
      : Math.min(container.scrollWidth - container.clientWidth, container.scrollLeft + scrollAmount);
    
    container.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    });

    // Update current index based on scroll position
    setTimeout(() => {
      const scrollPos = container.scrollLeft;
      const newIndex = Math.round(scrollPos / (cardWidth + gap));
      setCurrentIndex(Math.min(newIndex, Math.max(0, categories.length - visibleItems)));
      
      // Update scroll button visibility
      updateScrollButtonVisibility();
      setIsScrolling(false);
    }, 300);
  }, [categories?.length, visibleItems, isScrolling]);

  // Function to update scroll button visibility
  const updateScrollButtonVisibility = useCallback(() => {
    if (!scrollContainerRef.current || !categories?.length) return;
    
    const container = scrollContainerRef.current;
    const isAtStart = container.scrollLeft <= 10;
    const isAtEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 10;
    
    setShowLeftScroll(!isAtStart && hasOverflow());
    setShowRightScroll(!isAtEnd && hasOverflow());
  }, [categories?.length, hasOverflow]);

  // Handle scroll visibility
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !categories?.length) return;

    const handleScroll = () => {
      updateScrollButtonVisibility();
    };

    container.addEventListener('scroll', handleScroll);
    
    // Initial check for overflow
    setTimeout(() => {
      updateScrollButtonVisibility();
    }, 100);

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [categories?.length, updateScrollButtonVisibility]);

  // Update scroll buttons when container width or categories change
  useEffect(() => {
    if (categories?.length && scrollContainerRef.current) {
      // Wait for DOM to update
      setTimeout(() => {
        updateScrollButtonVisibility();
      }, 50);
    }
  }, [categories, containerWidth, updateScrollButtonVisibility]);

  // Function to get category image URL
  const getImageUrl = useCallback((category) => {
    if (category.slug) {
      return getCategoryImage(category.slug, {
        width: 400,
        height: 300,
        format: 'webp',
        quality: 85,
        crop: 'fill'
      });
    }
    
    if (category.name) {
      return getCategoryImageByName(category.name, {
        width: 400,
        height: 300,
        format: 'webp',
        quality: 85,
        crop: 'fill'
      });
    }
    
    return null;
  }, []);

  // Handle image error
  const handleImageError = useCallback((categoryId) => {
    setImageErrors(prev => ({
      ...prev,
      [categoryId]: true
    }));
  }, []);

  // Loading, error, and empty states remain the same...
  if (isLoading) {
    return (
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <LoadingSpinner message="Loading popular categories..." />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-10 px-4 bg-white mb-16">
        <div className="max-w-7xl mx-auto">
          <div className="text-left mb-6">
            <h2 className="text-4xl font-bold text-gray-900 mb-2">
              Popular Services
            </h2>
            <p className="text-gray-600 text-lg">
              Browse our most popular services
            </p>
          </div>
          
          <div className="text-center p-8">
            <div className="text-red-600 bg-red-50 border border-red-200 rounded-lg p-4 inline-block">
              <p className="font-medium">Failed to load popular categories. Please try again later.</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!categories?.length) {
    return (
      <section className="py-10 px-4 bg-white mb-16">
        <div className="max-w-7xl mx-auto">
          <div className="text-left mb-6">
            <h2 className="text-4xl font-bold text-gray-900 mb-2">
              Popular Services
            </h2>
            <p className="text-gray-600 text-lg">
              Browse our most popular services
            </p>
          </div>
          
          <div className="text-center p-8">
            <div className="text-red-600 bg-red-50 border border-red-200 rounded-lg p-4 inline-block">
              <p className="font-medium">No popular categories found.</p>
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

        <div className="relative">
          {/* Left Scroll Button - Show on all devices when needed */}
          {showLeftScroll && (
            <button
              onClick={() => scroll('left')}
              disabled={isScrolling}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 md:-translate-x-4 z-20 
                bg-white rounded-full p-2 md:p-3 shadow-lg border border-gray-200 
                hover:shadow-xl transition-all duration-200 flex items-center justify-center
                hover:scale-105 active:scale-95"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4 md:w-5 md:h-5 text-gray-700" />
            </button>
          )}

          {/* Scrollable Grid */}
          <div
            ref={scrollContainerRef}
            className="flex overflow-x-auto pb-4 gap-4 scroll-smooth hide-scrollbar px-1"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {categories.map((category) => {
              const imageUrl = getImageUrl(category);
              const hasImageError = imageErrors[category._id];
              const shouldShowImage = imageUrl && !hasImageError;
              
              return (
                <motion.div
                  key={category._id}
                  className="flex-shrink-0 w-[280px] sm:w-[300px]"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Link
                    to={`/popular-services/${category.slug}`}
                    className="block bg-white rounded-lg shadow-md hover:shadow-xl 
                      transition-all duration-300 border border-gray-100 
                      overflow-hidden h-full group hover:-translate-y-1"
                  >
                    {/* Category Image */}
                    <div className="relative h-48 overflow-hidden bg-gray-100">
                      {shouldShowImage ? (
                        <img
                          src={imageUrl}
                          alt={category.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          onError={() => handleImageError(category._id)}
                        />
                      ) : null}
                      
                      {/* Fallback for missing or errored image */}
                      <div 
                        className={`w-full h-full ${shouldShowImage ? 'hidden' : 'flex'} 
                          items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200`}
                      >
                        <div className="text-center p-4">
                          <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                          <span className="text-sm text-gray-500">
                            {category.name || 'Service'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent 
                        opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      {/* Category badge */}
                      <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm 
                        px-2 py-1 rounded-full text-xs font-medium text-gray-700">
                        Popular
                      </div>
                    </div>

                    {/* Category Content */}
                    <div className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-emerald-600 
                        transition-colors line-clamp-1 mb-1">
                        {category.name || 'Unnamed Category'}
                      </h3>
                      <p className="text-sm text-gray-500 line-clamp-2">
                        {category.description || 'View services in this category'}
                      </p>
                      {category.serviceCount !== undefined && (
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-gray-400">
                            {category.serviceCount} service{category.serviceCount !== 1 ? 's' : ''}
                          </p>
                          <span className="text-xs text-emerald-600 font-medium">
                            Explore →
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {/* Right Scroll Button - Show on all devices when needed */}
          {showRightScroll && (
            <button
              onClick={() => scroll('right')}
              disabled={isScrolling}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 md:translate-x-4 z-20 
                bg-white rounded-full p-2 md:p-3 shadow-lg border border-gray-200 
                hover:shadow-xl transition-all duration-200 flex items-center justify-center
                hover:scale-105 active:scale-95"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-gray-700" />
            </button>
          )}
          
          {/* Mobile-only scroll indicators (dots) */}
          {hasOverflow() && (
            <div className="flex justify-center mt-4 space-x-2 md:hidden">
              {Array.from({ length: Math.ceil(categories.length / visibleItems) }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    const container = scrollContainerRef.current;
                    const cardWidth = 280;
                    const gap = 16;
                    const scrollPosition = index * (cardWidth + gap) * visibleItems;
                    container.scrollTo({
                      left: scrollPosition,
                      behavior: 'smooth'
                    });
                    setCurrentIndex(index);
                  }}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    currentIndex === index 
                      ? 'bg-emerald-600 w-4' 
                      : 'bg-gray-300'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* View All Button */}
        <div className="text-center mt-8">
          <Link
            to="/services"
            className="inline-flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white 
              font-medium rounded-lg hover:bg-emerald-700 transition-all duration-300 
              shadow-md hover:shadow-lg hover:-translate-y-0.5 group"
          >
            <span>View All Services</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default PopularCategoriesSection;