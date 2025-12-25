// src/components/categories/CategoryGrid.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Code2, Palette, TrendingUp, FileText,
  Film, Cpu, Music, Briefcase,
  Users, Camera, Smartphone, Search, 
  Globe, Database, Layers, BarChart,
  Headphones, ShoppingBag, Gamepad2,
  BookOpen, Heart, Home, Zap
} from "lucide-react";
import { categoriesAPI } from "../../api/categories";

// Icon mapping based on category names
const getCategoryIcon = (categoryName) => {
  const name = categoryName.toLowerCase();
  
  if (name.includes('programming') || name.includes('tech') || name.includes('code')) {
    return <Code2 className="w-5 h-5" />;
  }
  if (name.includes('graphic') || name.includes('design') || name.includes('logo') || name.includes('brand') || name.includes('art') || name.includes('illustration')) {
    return <Palette className="w-5 h-5" />;
  }
  if (name.includes('digital') && name.includes('marketing')) {
    return <TrendingUp className="w-5 h-5" />;
  }
  if (name.includes('ai') || name.includes('artificial')) {
    return <Cpu className="w-5 h-5" />;
  }
  if (name.includes('business')) {
    return <Briefcase className="w-5 h-5" />;
  }
  if (name.includes('it') || name.includes('consulting')) {
    return <Users className="w-5 h-5" />;
  }
  if (name.includes('photo')) {
    return <Camera className="w-5 h-5" />;
  }
  if (name.includes('web') || name.includes('app')) {
    return <Globe className="w-5 h-5" />;
  }
  if (name.includes('writing') || name.includes('content')) {
    return <FileText className="w-5 h-5" />;
  }
  if (name.includes('video') || name.includes('film')) {
    return <Film className="w-5 h-5" />;
  }
  if (name.includes('music') || name.includes('audio')) {
    return <Music className="w-5 h-5" />;
  }
  if (name.includes('data') || name.includes('analytics')) {
    return <Database className="w-5 h-5" />;
  }
  if (name.includes('seo') || name.includes('search')) {
    return <Search className="w-5 h-5" />;
  }
  if (name.includes('mobile') || name.includes('phone')) {
    return <Smartphone className="w-5 h-5" />;
  }
  if (name.includes('social') || name.includes('media')) {
    return <Users className="w-5 h-5" />;
  }
  
  // Default icons for common categories
  const iconMap = {
    'finance': <BarChart className="w-5 h-5" />,
    'legal': <BookOpen className="w-5 h-5" />,
    'health': <Heart className="w-5 h-5" />,
    'lifestyle': <Home className="w-5 h-5" />,
    'energy': <Zap className="w-5 h-5" />,
    'gaming': <Gamepad2 className="w-5 h-5" />,
    'ecommerce': <ShoppingBag className="w-5 h-5" />,
    'support': <Headphones className="w-5 h-5" />,
  };
  
  for (const [key, icon] of Object.entries(iconMap)) {
    if (name.includes(key)) {
      return icon;
    }
  }
  
  // Default fallback
  return <Layers className="w-5 h-5" />;
};

const CategoryGrid = () => {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log('Fetching categories from API...');
        
        // Fetch parent categories (main categories only)
        const fetchedCategories = await categoriesAPI.getAll({
          parentCategory: null, // Only get top-level categories
          includeSubcategories: false,
          limit: 20, // Fetch up to 20 categories for lg display
          sortBy: 'name',
          order: 'asc'
        });
        
        console.log('Fetched categories:', fetchedCategories);
        
        // Transform API data to match your component's expected structure
        const transformedCategories = fetchedCategories.map(category => ({
          id: category._id || category.id,
          name: category.name || 'Unnamed Category',
          slug: category.slug || 
                (category.name ? category.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'category'),
          description: category.description || '',
          parentCategory: category.parentCategory || null,
          level: category.level || 0,
          isActive: category.isActive !== false,
          servicesCount: category.servicesCount || 0
        }));
        
        setCategories(transformedCategories);
        
        // If no categories from API, use fallback
        if (transformedCategories.length === 0) {
          console.warn('No categories returned from API, using fallback');
          useFallbackCategories();
        }
        
      } catch (err) {
        console.error('Error fetching categories:', err);
        setError(err.message);
        // Use fallback categories on error
        useFallbackCategories();
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCategories();
  }, []);

  // Fallback function if API fails
  const useFallbackCategories = () => {
    const fallbackCategories = [
      { 
        id: '1', 
        name: "Programming & Tech", 
        icon: <Code2 className="w-5 h-5" />,
        slug: 'programming-tech'
      },
      { 
        id: '2', 
        name: "Graphic & Design", 
        icon: <Palette className="w-5 h-5" />,
        slug: 'graphic-design'
      },
      { 
        id: '3', 
        name: "Digital Marketing", 
        icon: <TrendingUp className="w-5 h-5" />,
        slug: 'digital-marketing'
      },
      { 
        id: '4', 
        name: "AI Services", 
        icon: <Cpu className="w-5 h-5" />,
        slug: 'ai-services'
      },
      { 
        id: '5', 
        name: "Business Services", 
        icon: <Briefcase className="w-5 h-5" />,
        slug: 'business-services'
      },
      { 
        id: '6', 
        name: "IT & Consulting", 
        icon: <Users className="w-5 h-5" />,
        slug: 'it-consulting'
      },
      { 
        id: '7', 
        name: "Photography", 
        icon: <Camera className="w-5 h-5" />,
        slug: 'photography'
      },
      { 
        id: '8', 
        name: "Writing & Translation", 
        icon: <FileText className="w-5 h-5" />,
        slug: 'writing-translation'
      },
      { 
        id: '9', 
        name: "Video & Animation", 
        icon: <Film className="w-5 h-5" />,
        slug: 'video-animation'
      },
      { 
        id: '10', 
        name: "Music & Audio", 
        icon: <Music className="w-5 h-5" />,
        slug: 'music-audio'
      },
      { 
        id: '11', 
        name: "Web Development", 
        icon: <Globe className="w-5 h-5" />,
        slug: 'web-development'
      },
      { 
        id: '12', 
        name: "Mobile Development", 
        icon: <Smartphone className="w-5 h-5" />,
        slug: 'mobile-development'
      },
    ];
    setCategories(fallbackCategories);
  };

  // Loading state
  if (isLoading) {
    return (
      <section className="py-6 px-4 bg-white mt-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-left mb-6">
            <h2 className="text-4xl font-bold text-gray-900 mb-2">
              Browse Categories
            </h2>
            <p className="text-gray-600 text-sm md:text-base">
              Loading categories...
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3 md:gap-4">
            {[...Array(10)].map((_, index) => (
              <div
                key={index}
                className="flex flex-col items-center justify-center
                  w-24 h-20              
                  sm:w-28 sm:h-24      
                  md:w-32 md:h-28        
                  lg:w-28 lg:h-34       
                  bg-white rounded-lg shadow-sm
                  border border-gray-100 p-2 animate-pulse"
              >
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="h-4 w-20 bg-gray-200 mt-2 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Error state
  if (error) {
    return (
      <section className="py-6 px-4 bg-white mt-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-left mb-6">
            <h2 className="text-4xl font-bold text-gray-900 mb-2">
              Browse Categories
            </h2>
            <p className="text-red-600 text-sm md:text-base">
              Failed to load categories. Showing sample categories instead.
            </p>
          </div>
          <CategoryGridView categories={categories} />
        </div>
      </section>
    );
  }

  return (
    <CategoryGridView categories={categories} />
  );
};

// Separate view component
const CategoryGridView = ({ categories }) => {
  const [showAll, setShowAll] = useState(false);
  
  if (categories.length === 0) {
    return (
      <section className="py-6 px-4 bg-white mt-10">
        <div className="max-w-7xl mx-auto text-center py-8">
          <p className="text-gray-500">No categories available.</p>
        </div>
      </section>
    );
  }

  // For lg screens: show exactly 10 categories in one row
  // For md/sm screens: show 4 per row, and show "Show More" text button if more than 8
  const displayCategories = showAll ? categories : categories.slice(0, 8);
  const hasMoreCategories = categories.length > 8;
  
  return (
    <section className="py-6 px-4 bg-white mt-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-left mb-8">
          <h2 className="text-4xl font-bold text-gray-900 mb-3">
            Browse Categories
          </h2>
          <p className="text-gray-600 text-base md:text-lg">
            Explore services across different professional domains
          </p>
        </div>

        {/* Category Grid */}
        <div className="relative">
          {/* For lg screens: 10 categories in one row */}
          <div className="hidden lg:flex justify-center gap-5">
            {categories.slice(0, 10).map((cat) => (
              <Link
                key={cat.id}
                to={`/categories/${cat.id}?name=${encodeURIComponent(cat.name)}&slug=${cat.slug}`}
                className="flex flex-col items-center justify-center
                  w-28 h-34       
                  bg-white rounded-lg shadow-sm
                  hover:shadow-md transition-all duration-200
                  border border-gray-100 hover:border-blue-100
                  group p-3"
              >
                <div className="text-gray-700 group-hover:text-blue-600 transition-colors duration-200 mb-2">
                  {cat.icon}
                </div>
                <span className="text-sm font-medium text-gray-800 group-hover:text-gray-900 text-center leading-tight px-1">
                  {cat.name}
                </span>
                {cat.servicesCount > 0 && (
                  <span className="text-xs text-gray-500 mt-2">
                    {cat.servicesCount} services
                  </span>
                )}
              </Link>
            ))}
          </div>

          {/* For md/sm screens: 4 per row with show more text button */}
          <div className="lg:hidden">
            <div className="grid grid-cols-4 sm:grid-cols-4 gap-4">
              {displayCategories.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/categories/${cat.id}?name=${encodeURIComponent(cat.name)}&slug=${cat.slug}`}
                  className="flex flex-col items-center justify-center
                    bg-white rounded-lg shadow-sm
                    hover:shadow-md transition-all duration-200
                    border border-gray-100 hover:border-blue-100
                    group p-3 h-full min-h-[120px]"
                >
                  <div className="text-gray-700 group-hover:text-blue-600 transition-colors duration-200 mb-2">
                    {cat.icon}
                  </div>
                  <span className="text-xs font-medium text-gray-800 group-hover:text-gray-900 text-center leading-tight px-1">
                    {cat.name}
                  </span>
                  {cat.servicesCount > 0 && (
                    <span className="text-xs text-gray-500 mt-1">
                      {cat.servicesCount}
                    </span>
                  )}
                </Link>
              ))}
            </div>
            
            {/* Show More text button for md/sm when there are more than 8 categories */}
            {hasMoreCategories && !showAll && categories.length > 8 && (
              <div className="text-center mt-6">
                <button
                  onClick={() => setShowAll(true)}
                  className="px-6 py-2 text-sm font-medium text-blue-600 
                    hover:text-blue-700 transition-colors duration-200
                    hover:underline"
                >
                  Show More Categories
                </button>
              </div>
            )}
            
            {/* Show Less button when expanded */}
            {showAll && hasMoreCategories && (
              <div className="text-center mt-6">
                <button
                  onClick={() => setShowAll(false)}
                  className="px-6 py-2 text-sm font-medium text-blue-600 
                    hover:text-blue-700 transition-colors duration-200
                    hover:underline"
                >
                  Show Less
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CategoryGrid;