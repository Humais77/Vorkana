import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight, Image as ImageIcon } from 'lucide-react';
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

  // Optimized scroll function
  const scroll = useCallback((direction) => {
    if (!scrollContainerRef.current || !categories?.length || isScrolling) return;
    
    setIsScrolling(true);
    const container = scrollContainerRef.current;
    const cardWidth = 280; // Adjusted width based on your CSS
    const gap = 16;
    const scrollAmount = (cardWidth + gap) * visibleItems * 0.8;
    
    const newScrollLeft = direction === 'left' 
      ? Math.max(0, container.scrollLeft - scrollAmount)
      : Math.min(container.scrollWidth - container.clientWidth, container.scrollLeft + scrollAmount);
    
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

    // Reset scrolling flag
    setTimeout(() => {
      setIsScrolling(false);
    }, 300);
  }, [categories?.length, currentIndex, visibleItems, isScrolling]);

  const goToSlide = useCallback((index) => {
    if (!scrollContainerRef.current || !categories?.length || isScrolling) return;
    
    setIsScrolling(true);
    const container = scrollContainerRef.current;
    const cardWidth = 280;
    const gap = 16;
    const scrollPosition = index * (cardWidth + gap);
    
    container.scrollTo({
      left: scrollPosition,
      behavior: 'smooth'
    });
    setCurrentIndex(index);

    setTimeout(() => {
      setIsScrolling(false);
    }, 300);
  }, [categories?.length, isScrolling]);

  // Handle scroll visibility
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !categories?.length) return;

    const updateScrollButtons = () => {
      const isAtStart = container.scrollLeft <= 10;
      const isAtEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 10;
      
      setShowLeftScroll(!isAtStart);
      setShowRightScroll(!isAtEnd);
    };

    let scrollTimeout;
    const handleScrollDebounced = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(updateScrollButtons, 50);
    };

    container.addEventListener('scroll', handleScrollDebounced);
    updateScrollButtons(); // Initial check

    return () => {
      container.removeEventListener('scroll', handleScrollDebounced);
      clearTimeout(scrollTimeout);
    };
  }, [categories?.length]);

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
          {/* Left Scroll Button */}
          {showLeftScroll && (
            <button
              onClick={() => scroll('left')}
              disabled={isScrolling}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 bg-white rounded-full p-3 shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-200 hidden md:flex items-center justify-center"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>
          )}

          {/* Scrollable Grid */}
          <div
            ref={scrollContainerRef}
            className="flex overflow-x-auto pb-4 gap-4 scroll-smooth snap-x snap-mandatory hide-scrollbar"
          >
            {categories.map((category) => (
              <div
                key={category._id}
                className="flex-shrink-0 w-[280px] sm:w-[300px] snap-start"
              >
                <Link
                  to={`/popular-services/${category.slug}`}
                  className="block bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden h-full group"
                >
                  {/* Category Image */}
                  <div className="relative h-48 overflow-hidden bg-gray-100">
                    {category.imageUrl ? (
                      <img
                        src={category.imageUrl}
                        alt={category.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                       
                      />
                    ) : null}
                    
                    {/* Fallback for missing or errored image */}
                    <div 
                      className={`w-full h-full ${category.imageUrl ? 'hidden' : 'flex'} items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200`}
                    >
                      <div className="text-center">
                        <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <span className="text-sm text-gray-500">No Image</span>
                      </div>
                    </div>
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>

                  {/* Category Content */}
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors line-clamp-1 mb-1">
                      {category.name || 'Unnamed Category'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {category.description || 'View services'}
                    </p>
                    {category.serviceCount !== undefined && (
                      <p className="text-xs text-gray-400 mt-1">
                        {category.serviceCount} service{category.serviceCount !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </Link>
              </div>
            ))}
          </div>

          {/* Right Scroll Button */}
          {showRightScroll && (
            <button
              onClick={() => scroll('right')}
              disabled={isScrolling}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 bg-white rounded-full p-3 shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-200 hidden md:flex items-center justify-center"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-5 h-5 text-gray-700" />
            </button>
          )}
        </div>

        {/* View All Button */}
        <div className="text-center mt-8">
          <Link
            to="/services"
            className="inline-flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-all duration-300 shadow-md hover:shadow-lg"
          >
            <span>View All Services</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      {/* Hide scrollbar */}
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