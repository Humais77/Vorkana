// src/components/categories/CategoryGrid.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Code2, Palette, TrendingUp, FileText,
  Film, Cpu, Music, Briefcase,
  Users, Camera, Smartphone, Search, 
  Globe, Database, Layers, BarChart,
  Headphones, ShoppingBag, Gamepad2,
  BookOpen, Heart, Home, Zap,
  ChevronDown, ChevronRight
} from "lucide-react";
import { categoriesAPI } from "../../api/categories";
import { subcategoriesAPI } from "../../api/subcategories";

// Icon mapping based on category/subcategory names
const getCategoryIcon = (name) => {
  const lowerName = name.toLowerCase();
  
  if (lowerName.includes('programming') || lowerName.includes('tech') || lowerName.includes('code')) {
    return <Code2 className="w-5 h-5" />;
  }
  if (lowerName.includes('graphic') || lowerName.includes('design') || lowerName.includes('logo') || 
      lowerName.includes('brand') || lowerName.includes('art') || lowerName.includes('illustration')) {
    return <Palette className="w-5 h-5" />;
  }
  if (lowerName.includes('digital') && lowerName.includes('marketing')) {
    return <TrendingUp className="w-5 h-5" />;
  }
  if (lowerName.includes('ai') || lowerName.includes('artificial')) {
    return <Cpu className="w-5 h-5" />;
  }
  if (lowerName.includes('business')) {
    return <Briefcase className="w-5 h-5" />;
  }
  if (lowerName.includes('it') || lowerName.includes('consulting')) {
    return <Users className="w-5 h-5" />;
  }
  if (lowerName.includes('photo')) {
    return <Camera className="w-5 h-5" />;
  }
  if (lowerName.includes('web') || lowerName.includes('app')) {
    return <Globe className="w-5 h-5" />;
  }
  if (lowerName.includes('writing') || lowerName.includes('content')) {
    return <FileText className="w-5 h-5" />;
  }
  if (lowerName.includes('video') || lowerName.includes('film')) {
    return <Film className="w-5 h-5" />;
  }
  if (lowerName.includes('music') || lowerName.includes('audio')) {
    return <Music className="w-5 h-5" />;
  }
  if (lowerName.includes('data') || lowerName.includes('analytics')) {
    return <Database className="w-5 h-5" />;
  }
  if (lowerName.includes('seo') || lowerName.includes('search')) {
    return <Search className="w-5 h-5" />;
  }
  if (lowerName.includes('mobile') || lowerName.includes('phone')) {
    return <Smartphone className="w-5 h-5" />;
  }
  if (lowerName.includes('social') || lowerName.includes('media')) {
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
    if (lowerName.includes(key)) {
      return icon;
    }
  }
  
  // Default fallback
  return <Layers className="w-5 h-5" />;
};

const CategoryGrid = () => {
  const [categories, setCategories] = useState([]);
  const [subcategoriesMap, setSubcategoriesMap] = useState({});
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch categories and subcategories on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log('Fetching categories from API...');
        
        // Fetch parent categories (main categories only)
        const fetchedCategories = await categoriesAPI.getAll({
          parentCategory: null, // Only get top-level categories
          includeSubcategories: false,
          limit: 10,
          sortBy: 'name',
          order: 'asc'
        });
        
        console.log('Fetched categories:', fetchedCategories.length);
        
        // Transform API data
        const transformedCategories = fetchedCategories.map(category => ({
          id: category._id || category.id,
          name: category.name || 'Unnamed Category',
          slug: category.slug || 
                (category.name ? category.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'category'),
          description: category.description || '',
          parentCategory: category.parentCategory || null,
          level: category.level || 0,
          isActive: category.isActive !== false,
          servicesCount: category.servicesCount || 0,
          icon: getCategoryIcon(category.name || '')
        }));
        
        setCategories(transformedCategories);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Load subcategories for categories
  const loadSubcategories = async (categoriesList) => {
    try {
      const subcategoriesPromises = categoriesList.map(async (category) => {
        try {
          const result = await subcategoriesAPI.getByCategory(category.id);
          return {
            categoryId: category.id,
            subcategories: result.subcategories || []
          };
        } catch (error) {
          console.error(`Error loading subcategories for category ${category.id}:`, error);
          return {
            categoryId: category.id,
            subcategories: []
          };
        }
      });
      
      const results = await Promise.all(subcategoriesPromises);
      
      // Create map of categoryId -> subcategories
      const map = {};
      results.forEach(result => {
        map[result.categoryId] = result.subcategories.map(sub => ({
          id: sub._id || sub.id,
          name: sub.name || 'Unnamed Subcategory',
          slug: sub.slug || 
                (sub.name ? sub.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'subcategory'),
          category: sub.category || result.categoryId,
          servicesCount: sub.servicesCount || 0,
          icon: getCategoryIcon(sub.name || '')
        }));
      });
      
      setSubcategoriesMap(map);
    } catch (error) {
      console.error('Error loading subcategories:', error);
    }
  };

  // Toggle category expansion
  const toggleCategory = (categoryId) => {
    if (expandedCategory === categoryId) {
      setExpandedCategory(null);
    } else {
      setExpandedCategory(categoryId);
    }
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
         <div className="flex flex-wrap items-start gap-3 md:gap-4">
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
              Failed to load categories.
            </p>
          </div>
          <CategoryGridView 
            categories={categories} 
            subcategoriesMap={subcategoriesMap}
            expandedCategory={expandedCategory}
            toggleCategory={toggleCategory}
          />
        </div>
      </section>
    );
  }

  return (
    <CategoryGridView 
      categories={categories} 
      subcategoriesMap={subcategoriesMap}
      expandedCategory={expandedCategory}
      toggleCategory={toggleCategory}
    />
  );
};

// Separate view component
const CategoryGridView = ({ 
  categories, 
  subcategoriesMap, 
  expandedCategory, 
  toggleCategory 
}) => {
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
          <div className="hidden lg:flex items-start gap-5">

  {categories.slice(0, 10).map((cat) => {
    const subcategories = subcategoriesMap[cat.id] || [];
    const hasSubcategories = subcategories.length > 0;
    const isExpanded = expandedCategory === cat.id;
    
    return (
      <div 
        key={cat.id}
        className="flex flex-col items-start relative"
      >
        {/* Main Category Card - FIXED SIZE */}
        <div
          className="flex flex-col items-center justify-start
            w-28 h-34       
            bg-white rounded-lg shadow-sm
            hover:shadow-md transition-all duration-200
            border border-gray-100 hover:border-blue-100
            group relative z-10"
        >
          {/* Clickable area for category link */}
          <Link
            to={`/categories/${cat.slug || cat.id}`}
            className="flex flex-col items-center justify-start flex-1 w-full p-3"
          >
            <div className="text-gray-700 group-hover:text-blue-600 transition-colors duration-200 mb-2">
              {cat.icon}
            </div>
            
            <div className="h-[40px] flex items-center justify-center">
  <span className="line-clamp-2 leading-snug break-words text-center">
    {cat.name}
  </span>
</div>

            
            {cat.servicesCount > 0 && (
              <span className="text-xs text-gray-500 mt-auto pt-2">
                {cat.servicesCount} services
              </span>
            )}
          </Link>
          
          {/* Expand indicator - separate from link */}
          {hasSubcategories && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleCategory(cat.id);
              }}
              className="absolute top-2 right-2 text-gray-400 hover:text-blue-600 transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
        
        {/* Subcategories Dropdown */}
        {hasSubcategories && isExpanded && (
          <div className="absolute top-full left-0 right-0 mt-1 z-20">
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-2 max-h-60 overflow-y-auto">
              {subcategories.slice(0, 8).map((subcat) => (
                <Link
                  key={subcat.id}
                  to={`/categories/${cat.slug || cat.id}/${subcat.slug || subcat.id}`}
                  className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded transition-colors"
                >
                  <div className="text-gray-600">
                    {subcat.icon}
                  </div>
                  <div className="flex-1">
                    <span className="text-sm text-gray-800">{subcat.name}</span>
                    {subcat.servicesCount > 0 && (
                      <span className="text-xs text-gray-500 ml-2">
                        ({subcat.servicesCount})
                      </span>
                    )}
                  </div>
                </Link>
              ))}
              
              {subcategories.length > 8 && (
                <Link
                  to={`/categories/${cat.slug || cat.id}`}
                  className="text-center text-sm text-blue-600 hover:text-blue-700 p-2 block border-t border-gray-100"
                >
                  View all {subcategories.length} subcategories →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    );
  })}
</div>

          {/* For md/sm screens: 4 per row with show more text button */}
          <div className="lg:hidden">
   <div className="grid grid-cols-4 sm:grid-cols-4 gap-4 items-start">
    {displayCategories.map((cat) => {
      const subcategories = subcategoriesMap[cat.id] || [];
      const hasSubcategories = subcategories.length > 0;
      const isExpanded = expandedCategory === cat.id;
      
      return (
        <div 
          key={cat.id}
          className="relative"
        >
          {/* Main Category Card - FIXED SIZE */}
          <div
            className="flex flex-col items-center justify-start
              bg-white rounded-lg shadow-sm
              hover:shadow-md transition-all duration-200
              border border-gray-100 hover:border-blue-100
              group h-[120px] relative"
          >
            {/* Clickable area for category link */}
            <Link
              to={`/categories/${cat.slug || cat.id}`}
              className="flex flex-col items-center justify-start flex-1 w-full p-3"
            >
              <div className="text-gray-700 group-hover:text-blue-600 transition-colors duration-200 mb-2">
                {cat.icon}
              </div>
              
              {/* Fixed height container for text */}
              <div className="h-10 flex items-center justify-center w-full">
                <span className="text-xs font-medium text-gray-800 group-hover:text-gray-900 text-center leading-tight px-1 line-clamp-2 break-words">
                  {cat.name}
                </span>
              </div>
              
              {cat.servicesCount > 0 && (
                <span className="text-xs text-gray-500 mt-auto pt-1">
                  {cat.servicesCount}
                </span>
              )}
            </Link>
            
            {/* Expand indicator for mobile - separate from link */}
            {hasSubcategories && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleCategory(cat.id);
                }}
                className="absolute top-1 right-1 text-gray-400 hover:text-blue-600 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </button>
            )}
          </div>
          
          {/* Subcategories for mobile (appears below) */}
          {hasSubcategories && isExpanded && (
            <div className="absolute top-full left-0 right-0 mt-1 z-10">
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-2 max-h-48 overflow-y-auto">
                {subcategories.slice(0, 5).map((subcat) => (
                  <Link
                    key={subcat.id}
                    to={`/categories/${cat.slug || cat.id}/${subcat.slug || subcat.id}`}
                    className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded transition-colors text-sm"
                  >
                    <div className="text-gray-600 flex-shrink-0">
                      {subcat.icon}
                    </div>
                    <span className="text-gray-800 truncate">{subcat.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    })}
  </div>
</div>
        </div>
      </div>
    </section>
  );
};

export default CategoryGrid;