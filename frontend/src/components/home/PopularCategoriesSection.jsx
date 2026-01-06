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
  const [imageErrors, setImageErrors] = useState({});

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

  // Predefined image URLs for different categories
  const getCategoryImageUrl = useCallback((categoryName) => {
    const lowerName = categoryName?.toLowerCase() || '';
    
    // Use Unsplash for reliable images
    const unsplashImages = {
      'web': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      'website': 'https://images.unsplash.com/photo-1527689361190-bcf06e6c8b6d?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      'video': 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      'software': 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      'mobile': 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      'app': 'https://images.unsplash.com/photo-1551650975-87deedd944c3?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      'design': 'https://images.unsplash.com/photo-1561070791-2526d30994b5?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      'graphic': 'https://images.unsplash.com/photo-1545235617-9465d2a55698?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      'data': 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      'analytics': 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      'business': 'https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      'marketing': 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      'writing': 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      'content': 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      'music': 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      'audio': 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      'ai': 'https://images.unsplash.com/photo-1677442136019-21780ecad995?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      'default': 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'
    };

    // Check for keywords in category name
    for (const [keyword, url] of Object.entries(unsplashImages)) {
      if (lowerName.includes(keyword)) {
        return url;
      }
    }

    // Default image
    return unsplashImages.default;
  }, []);

  // Handle image error
  const handleImageError = useCallback((categoryId) => {
    setImageErrors(prev => ({ ...prev, [categoryId]: true }));
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
                <ImageIcon className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-xl font-medium text-gray-700 mb-2">
                No Services Available
              </h3>
              <p className="text-gray-500 mb-6">
                Check back soon for our popular services.
              </p>
              <Link
                to="/services"
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors duration-200"
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
            {categories.map((category) => {
              const imageUrl = getCategoryImageUrl(category.name);
              const hasError = imageErrors[category._id];
              
              return (
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
                      {!hasError ? (
                        <img
                          src={imageUrl}
                          alt={category.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          onError={() => handleImageError(category._id)}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                          <div className="text-center">
                            <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                            <span className="text-sm text-gray-500">{category.name}</span>
                          </div>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>

                    {/* Category Content */}
                    <div className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors line-clamp-1 mb-1">
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