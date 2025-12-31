// src/layouts/pages/CategoryPage.jsx - UPDATED WITH COMPACT SUBCATEGORIES
import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ChevronRight, 
  Search, 
  ArrowRight,
  Globe,
  Smartphone,
  Code,
  Cpu,
  Palette,
  Briefcase,
  FileText,
  Users,
  Camera,
  Music,
  Film,
  Database,
  TrendingUp,
  ChevronLeft,
  Sparkles
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { SeoWrapper } from '../../components/SeoWrapper';
import { useCategory } from '../../hooks/useCategories';
import { useSubcategoriesByCategory } from '../../hooks/useSubcategories';

const CategoryPage = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  
  // Fetch category data
  const { 
    data: categoryData, 
    isLoading: categoryLoading, 
    error: categoryError 
  } = useCategory(categoryId, {
    enabled: !!categoryId,
  });

  // Fetch subcategories using the category ID
  const { 
    data: subcategoriesData, 
    isLoading: subcategoriesLoading
  } = useSubcategoriesByCategory(categoryData?._id, {
    enabled: !!categoryData?._id,
  });

  const isLoading = categoryLoading || subcategoriesLoading 

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading category...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (categoryError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Error loading category</h2>
          <p className="text-red-500 mb-4">{categoryError.message || 'Failed to load category'}</p>
          <Link to="/" className="text-blue-600 hover:underline">
            Return to homepage
          </Link>
        </div>
      </div>
    );
  }

  // Category not found
  if (!categoryData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Category not found</h2>
          <p className="text-gray-600 mb-4">The category you're looking for doesn't exist.</p>
          <Link to="/" className="text-blue-600 hover:underline">
            Return to homepage
          </Link>
        </div>
      </div>
    );
  }

  const category = categoryData;
  const subcategories = subcategoriesData?.subcategories || [];

  // Breadcrumbs
  const breadcrumbs = [
    { name: 'Home', href: '/' },
    { name: 'Categories', href: '/categories' },
    { name: category.name, href: `#` }
  ];

  // Get icon for category
  const getCategoryIcon = (name) => {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('web') || lowerName.includes('website')) return <Globe className="w-5 h-5" />;
    if (lowerName.includes('mobile') || lowerName.includes('app')) return <Smartphone className="w-5 h-5" />;
    if (lowerName.includes('software') || lowerName.includes('code')) return <Code className="w-5 h-5" />;
    if (lowerName.includes('ai') || lowerName.includes('artificial')) return <Cpu className="w-5 h-5" />;
    if (lowerName.includes('graphic') || lowerName.includes('design')) return <Palette className="w-5 h-5" />;
    if (lowerName.includes('business')) return <Briefcase className="w-5 h-5" />;
    if (lowerName.includes('writing') || lowerName.includes('content')) return <FileText className="w-5 h-5" />;
    if (lowerName.includes('digital') && lowerName.includes('marketing')) return <TrendingUp className="w-5 h-5" />;
    if (lowerName.includes('it') || lowerName.includes('consulting')) return <Users className="w-5 h-5" />;
    if (lowerName.includes('photo')) return <Camera className="w-5 h-5" />;
    if (lowerName.includes('music') || lowerName.includes('audio')) return <Music className="w-5 h-5" />;
    if (lowerName.includes('video') || lowerName.includes('film')) return <Film className="w-5 h-5" />;
    if (lowerName.includes('data') || lowerName.includes('analytics')) return <Database className="w-5 h-5" />;
    
    return <Code className="w-5 h-5" />;
  };

  // Generate sections from real subcategories
  const getCategorySections = () => {
    if (subcategories.length > 0) {
      return subcategories.map(subcat => ({
        title: subcat.name,
        icon: getCategoryIcon(subcat.name),
        description: subcat.description || '',
        subcategoryId: subcat._id,
        slug: subcat.slug
      }));
    }
    
    return []; // Return empty array if no subcategories
  };

  const displaySections = getCategorySections();

  // Handle service click in explore section
  const handleExploreServiceClick = (serviceName) => {
    navigate(`/search?query=${encodeURIComponent(serviceName)}&category=${encodeURIComponent(category.name)}`);
  };

  // Handle subcategory click
  const handleSubcategoryClick = (section) => {
    if (section.subcategoryId && section.slug) {
      navigate(`/categories/${categoryId}/${section.slug}`);
    } else {
      navigate(`/search?category=${encodeURIComponent(category.name)}&subcategory=${encodeURIComponent(section.title)}`);
    }
  };

  // Handle search
  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/search?query=${encodeURIComponent(searchQuery)}&category=${encodeURIComponent(category.name)}`);
    }
  };

  return (
    <SeoWrapper
      title={`${category.name} Services | Vorkana`}
      description={category.description || `Find professional ${category.name.toLowerCase()} services`}
      keywords={[category.name, 'services', 'freelance', 'professionals']}
      canonical={`/categories/${categoryId}`}
    >
      <div className="min-h-screen bg-gray-50">
        {/* Breadcrumbs */}
        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center space-x-4 py-3">
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.name} className="flex items-center">
                  {index > 0 && <ChevronRight className="h-4 w-4 text-gray-400 mx-2" />}
                  <Link
                    to={crumb.href}
                    className={`text-sm ${index === breadcrumbs.length - 1 ? 'text-gray-900 font-medium' : 'text-gray-600 hover:text-gray-900'}`}
                  >
                    {crumb.name}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </nav>

        {/* Category Hero */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-800 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-4">
                <div className="w-2 h-2 rounded-full bg-emerald-300"></div>
                <span className="text-sm font-medium text-white/90">A New Power Works</span>
              </div>
              
              <h1 className="text-4xl font-bold mb-4">{category.name}</h1>
              
              <p className="text-xl opacity-90 mb-6 max-w-3xl mx-auto">
                {category.description || `Professional ${category.name.toLowerCase()} services for all your needs`}
              </p>
              
              {/* Search Bar */}
              <div className="max-w-2xl mx-auto">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    placeholder={`Search ${category.name.toLowerCase()} services...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="w-full pl-12 pr-4 py-4 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-white focus:outline-none shadow-lg"
                  />
                  <button 
                    onClick={handleSearch}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    Search
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Explore Section - Using real subcategories */}
          <div className="mb-16">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Explore {category.name}
              </h2>
              <div className="w-20 h-1 bg-green-500 mx-auto"></div>
            </div>
            
            {displaySections.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {displaySections.map((section, index) => (
                  <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-green-50 rounded-lg text-green-600">
                        {section.icon}
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">{section.title}</h3>
                    </div>
                    
                    <div className="space-y-4">
                      {section.services && section.services.length > 0 ? (
                        section.services.map((service, serviceIndex) => (
                          <div 
                            key={serviceIndex} 
                            onClick={() => handleExploreServiceClick(service)}
                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group"
                          >
                            <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0"></div>
                            <span className="text-gray-700 group-hover:text-green-600 transition-colors">
                              {service}
                            </span>
                          </div>
                        ))
                      ) : (
                        <button
                          onClick={() => handleSubcategoryClick(section)}
                          className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors text-gray-600 hover:text-green-600 group"
                        >
                          <div className="flex items-center justify-between">
                            <span>Explore {section.title}</span>
                            <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <div className="text-gray-400 mb-4">
                  <Globe className="w-16 h-16 mx-auto" />
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No subcategories found</h3>
                <p className="text-gray-500">This category doesn't have any subcategories yet.</p>
              </div>
            )}
          </div>

          {/* Subcategories Section - COMPACT VERSION */}
          {displaySections.length > 0 && (
            <div className="mb-16">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    All {category.name} Subcategories
                  </h2>
                  <p className="text-gray-600">
                    Browse through all specialized services in {category.name.toLowerCase()}
                  </p>
                </div>
                <button
                  onClick={() => navigate('/categories')}
                  className="hidden md:flex items-center gap-2 text-green-600 hover:text-green-700 font-medium"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back to Categories
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {displaySections.map((section, index) => (
                  <div 
                    key={index}
                    onClick={() => handleSubcategoryClick(section)}
                    className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md hover:border-green-300 transition-all duration-200 cursor-pointer group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-green-50 rounded-md text-green-600 group-hover:bg-green-100 transition-colors">
                        {section.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 mb-1 truncate group-hover:text-green-600 transition-colors">
                          {section.title}
                        </h3>
                        {section.description && (
                          <p className="text-sm text-gray-500 line-clamp-2">
                            {section.description.length > 80 
                              ? `${section.description.substring(0, 80)}...` 
                              : section.description}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Stats/Features */}
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Sparkles className="w-3 h-3" />
                          <span>Popular</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-green-600 transition-colors" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Mobile Back Button */}
              <div className="mt-8 md:hidden text-center">
                <button
                  onClick={() => navigate('/categories')}
                  className="inline-flex items-center gap-2 px-4 py-2 text-green-600 hover:text-green-700 font-medium"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back to All Categories
                </button>
              </div>
            </div>
          )}

          {/* Featured Services Section */}
          {displaySections.length > 0 && (
            <div className="mb-16">
              <div className="text-center mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  Featured Services in {category.name}
                </h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Discover popular services handpicked by our community
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displaySections.slice(0, 3).map((section, index) => (
                  <div key={index} className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-white rounded-lg text-green-600 shadow-sm">
                        {section.icon}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{section.title}</h3>
                        <p className="text-sm text-green-600 font-medium">Top Rated</p>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-4">
                      {section.description?.substring(0, 100) || `Explore professional ${section.title.toLowerCase()} services`}
                    </p>
                    
                    <button
                      onClick={() => handleSubcategoryClick(section)}
                      className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      Browse Services
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Get Started CTA */}
          <div className="text-center bg-gradient-to-r from-green-600 to-emerald-700 rounded-2xl p-12 text-white">
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
              Find the perfect {category.name.toLowerCase()} expert for your project today
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate(`/services/create?category=${categoryId}`)}
                className="px-8 py-4 bg-white text-green-700 font-bold rounded-lg hover:bg-gray-100 transition-colors shadow-lg"
              >
                Offer a Service
              </button>
              <button
                onClick={() => navigate(`/gigs/create?category=${categoryId}`)}
                className="px-8 py-4 bg-transparent border-2 border-white text-white font-bold rounded-lg hover:bg-white/10 transition-colors"
              >
                Post a Project
              </button>
              <button
                onClick={() => navigate('/services')}
                className="px-8 py-4 bg-white/20 border-2 border-white text-white font-bold rounded-lg hover:bg-white/30 transition-colors"
              >
                Browse Services
              </button>
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="bg-white border-t border-gray-200 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                {
                  title: "Top Categories",
                  links: ["Web Development", "Mobile Apps", "AI Development", "UI/UX Design"]
                },
                {
                  title: "Popular Services",
                  links: ["Website Development", "App Development", "Software Consulting", "Technical Support"]
                },
                {
                  title: "How It Works",
                  links: ["Find Experts", "Post Projects", "Hire Professionals", "Manage Projects"]
                },
                {
                  title: "Resources",
                  links: ["Help Center", "Blog", "Community", "Contact Support"]
                }
              ].map((column, index) => (
                <div key={index}>
                  <h4 className="font-bold text-gray-900 mb-4">{column.title}</h4>
                  <ul className="space-y-2">
                    {column.links.map((link, linkIndex) => (
                      <li key={linkIndex}>
                        <a href="#" className="text-gray-600 hover:text-green-600 transition-colors">
                          {link}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SeoWrapper>
  );
};

export default CategoryPage;