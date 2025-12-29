// components/home/PopularCategoriesSection.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Globe, Camera, Code, Palette, Smartphone, 
  BarChart, TrendingUp, ArrowRight, Star, Sparkles,
  Brush, PenTool, MessageSquare, Music, ShoppingBag,
  Target, Zap, Users, Rocket
} from 'lucide-react';
import { usePopularCategories } from '../hooks/useCategories';
import LoadingSpinner from './LoadingSpinner';

const PopularCategoriesSection = () => {
  const { data: categories, isLoading, error } = usePopularCategories();
  
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
    console.warn('No popular categories found or error:', error);
    return null;
  }

  const getCategoryIcon = (categoryName) => {
    const lowerName = categoryName?.toLowerCase() || '';
    
    const iconMap = {
      'web': <Globe className="w-8 h-8" />,
      'website': <Globe className="w-8 h-8" />,
      'development': <Code className="w-8 h-8" />,
      'video': <Camera className="w-8 h-8" />,
      'video editing': <Camera className="w-8 h-8" />,
      'software': <Code className="w-8 h-8" />,
      'programming': <Code className="w-8 h-8" />,
      'tech': <Code className="w-8 h-8" />,
      'mobile': <Smartphone className="w-8 h-8" />,
      'app': <Smartphone className="w-8 h-8" />,
      'design': <Palette className="w-8 h-8" />,
      'graphic': <Palette className="w-8 h-8" />,
      'ui/ux': <PenTool className="w-8 h-8" />,
      'logo': <Brush className="w-8 h-8" />,
      'data': <BarChart className="w-8 h-8" />,
      'analytics': <BarChart className="w-8 h-8" />,
      'business': <ShoppingBag className="w-8 h-8" />,
      'marketing': <Target className="w-8 h-8" />,
      'digital marketing': <Target className="w-8 h-8" />,
      'writing': <PenTool className="w-8 h-8" />,
      'content': <PenTool className="w-8 h-8" />,
      'translation': <Globe className="w-8 h-8" />,
      'music': <Music className="w-8 h-8" />,
      'audio': <Music className="w-8 h-8" />,
      'lifestyle': <Users className="w-8 h-8" />,
      'ai': <Sparkles className="w-8 h-8" />,
      'chatbot': <MessageSquare className="w-8 h-8" />,
      'automation': <Zap className="w-8 h-8" />,
      'consulting': <Users className="w-8 h-8" />,
      'coaching': <Rocket className="w-8 h-8" />
    };

    // Check for specific keywords
    if (lowerName.includes('web') || lowerName.includes('website')) return iconMap.web;
    if (lowerName.includes('video')) return iconMap.video;
    if (lowerName.includes('software') || lowerName.includes('programming') || lowerName.includes('tech')) return iconMap.software;
    if (lowerName.includes('mobile') || lowerName.includes('app')) return iconMap.mobile;
    if (lowerName.includes('design') || lowerName.includes('graphic') || lowerName.includes('ui/ux') || lowerName.includes('logo')) return iconMap.design;
    if (lowerName.includes('data') || lowerName.includes('analytics')) return iconMap.data;
    if (lowerName.includes('business') || lowerName.includes('marketing')) return iconMap.business;
    if (lowerName.includes('writing') || lowerName.includes('content') || lowerName.includes('translation')) return iconMap.writing;
    if (lowerName.includes('music') || lowerName.includes('audio')) return iconMap.music;
    if (lowerName.includes('lifestyle')) return iconMap.lifestyle;
    if (lowerName.includes('ai') || lowerName.includes('chatbot') || lowerName.includes('automation')) return iconMap.ai;
    
    return <Globe className="w-8 h-8" />;
  };

  const getCategoryImage = (categoryName) => {
    const lowerName = categoryName?.toLowerCase() || '';
    
    const imageMap = {
      'web': 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=600&h=400&fit=crop&q=80',
      'video': 'https://images.unsplash.com/photo-1568664556541-4f4301c8d7b2?w=600&h=400&fit=crop&q=80',
      'software': 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=600&h=400&fit=crop&q=80',
      'mobile': 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=600&h=400&fit=crop&q=80',
      'design': 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&h=400&fit=crop&q=80',
      'graphic design': 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&h=400&fit=crop&q=80',
      'data': 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop&q=80',
      'business': 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=600&h=400&fit=crop&q=80',
      'marketing': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop&q=80',
      'writing': 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=600&h=400&fit=crop&q=80',
      'music': 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=400&fit=crop&q=80',
      'ai': 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=400&fit=crop&q=80',
      'default': 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop&q=80'
    };

    if (lowerName.includes('web') || lowerName.includes('website')) return imageMap.web;
    if (lowerName.includes('video')) return imageMap.video;
    if (lowerName.includes('software') || lowerName.includes('programming') || lowerName.includes('tech')) return imageMap.software;
    if (lowerName.includes('mobile') || lowerName.includes('app')) return imageMap.mobile;
    if (lowerName.includes('design') || lowerName.includes('graphic')) return imageMap.design;
    if (lowerName.includes('data')) return imageMap.data;
    if (lowerName.includes('business') || lowerName.includes('marketing')) return imageMap.business;
    if (lowerName.includes('writing') || lowerName.includes('content')) return imageMap.writing;
    if (lowerName.includes('music') || lowerName.includes('audio')) return imageMap.music;
    if (lowerName.includes('ai')) return imageMap.ai;
    
    return imageMap.default;
  };

  return (
    <section className="py-6 px-4 bg-white mt-10">
      <div className="max-w-7xl mx-auto">
        {/* Header - Left Aligned */}
        <div className="text-left mb-8">
          <motion.h2 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-gray-900 mb-4"
          >
            Popular Categories
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-gray-600 text-lg max-w-3xl"
          >
            Browse our most popular categories. Each category features top-rated services.
          </motion.p>
        </div>

        {/* Categories Grid - Left Aligned Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {categories.slice(0, 8).map((category, index) => (
            <motion.div
              key={category._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              whileHover={{ y: -4, scale: 1.02 }}
            >
              <Link
                to={`/popular-services/${category.slug}`}
                className="block bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-200 overflow-hidden group h-full"
              >
                {/* Category Image */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={getCategoryImage(category.name)}
                    alt={category.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    loading="lazy"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop&q=80';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  
                  {/* Category Icon Overlay */}
                  <div className="absolute top-4 left-4 p-3 bg-white/90 backdrop-blur-sm rounded-lg shadow-md">
                    {getCategoryIcon(category.name)}
                  </div>
                  
                  {/* Popular Badge */}
                  <div className="absolute top-4 right-4 px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
                    Popular
                  </div>
                </div>

                {/* Category Content */}
                <div className="p-5 flex flex-col h-[180px]">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-1">
                    {category.name}
                  </h3>
                  
                  <p className="text-gray-600 text-sm line-clamp-2 mb-4 flex-grow">
                    {category.description || 'Explore top-rated services in this category'}
                  </p>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span>Top Rated</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-blue-600 font-medium group-hover:gap-3 transition-all">
                      <span className="text-sm">View</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* View All Button - Left Aligned */}
        {categories.length > 8 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-12"
          >
            <Link
              to="/popular-services"
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
            >
              <span>View All Popular Categories</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default PopularCategoriesSection;