// components/home/PopularCategoriesSection.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Globe, Camera, Code, Palette, Smartphone, 
  BarChart, ArrowRight
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
    
    if (lowerName.includes('web') || lowerName.includes('website')) return <Globe className="w-8 h-8" />;
    if (lowerName.includes('video')) return <Camera className="w-8 h-8" />;
    if (lowerName.includes('software') || lowerName.includes('programming') || lowerName.includes('tech')) return <Code className="w-8 h-8" />;
    if (lowerName.includes('mobile') || lowerName.includes('app')) return <Smartphone className="w-8 h-8" />;
    if (lowerName.includes('design') || lowerName.includes('graphic')) return <Palette className="w-8 h-8" />;
    if (lowerName.includes('data') || lowerName.includes('analytics')) return <BarChart className="w-8 h-8" />;
    
    return <Globe className="w-8 h-8" />;
  };

  const getCategoryImage = (categoryName) => {
    const lowerName = categoryName?.toLowerCase() || '';
    
    // Cloudinary public ID mapping
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

  return (
    <section className="py-6 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Header - Left Aligned */}
        <div className="text-left mb-6">
          <h2 className="text-4xl font-bold text-gray-900 mb-2">
            Popular Categories
          </h2>
          <p className="text-gray-600 text-lg">
            Browse our most popular categories
          </p>
        </div>

        {/* Categories Grid - Reduced spacing */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {categories.slice(0, 8).map((category) => {
            const cloudinaryId = getCategoryImage(category.name);
            const imageUrl = generateCloudinaryUrl(cloudinaryId);
            
            return (
              <div key={category._id}>
                <Link
                  to={`/popular-services/${category.slug}`}
                  className="block bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 border border-gray-100 overflow-hidden group h-full"
                >
                  {/* Category Image - Reduced height */}
                  <div className="relative h-50 overflow-hidden">
                    <img
                      src={imageUrl}
                      alt={category.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      onError={(e) => {
                        e.target.onerror = null;
                        const fallbackUrl = generateCloudinaryUrl('k01xqmefzhmwyfceifqk');
                        e.target.src = fallbackUrl;
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    
                  </div>

                  {/* Category Content - Reduced padding and height */}
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1 mb-1">
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

        {/* View All Button - Reduced size and spacing */}
        {categories.length > 8 && (
          <div className="mt-8">
            <Link
              to="/popular-services"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 hover:shadow-md"
            >
              <span>View All Categories</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};

export default PopularCategoriesSection;