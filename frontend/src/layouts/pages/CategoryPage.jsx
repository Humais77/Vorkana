// src/pages/CategoryPage.jsx - UPDATED VERSION
import React from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import CategoryHero from '../../components/categories/CategoryHero';
import PopularSlider from '../../components/categories/PopularSlider';
import CategoryFAQs from '../../components/categories/CategoryFAQs';
import { SeoWrapper } from '../../components/SeoWrapper';
import { useCategory } from '../../hooks/useCategories';
import { useCategoryServices, useTransformedCategoryData } from '../../hooks/useCategoryServices';

const CategoryPage = () => {
  const { categoryId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const queryParams = new URLSearchParams(location.search);
  const categoryName = queryParams.get('name') || '';
  
  // Use category ID for fetching
  const identifier = categoryId;
  
  // Fetch REAL category data
  const { 
    data: categoryData, 
    isLoading: categoryLoading, 
    error: categoryError 
  } = useCategory(identifier, {
    enabled: !!identifier,
  });
  
  // Fetch REAL services for this category
  const { 
    data: servicesData,
    isLoading: servicesLoading
  } = useCategoryServices(identifier, {
    enabled: !!identifier && !!categoryData,
  });
  
  // Transform REAL data for display
  const category = useTransformedCategoryData(categoryData, servicesData);
  
  const loading = categoryLoading || servicesLoading;

  // Handle service click
  const handleServiceClick = (serviceName) => {
    const serviceSlug = serviceName.toLowerCase().replace(/\s+/g, '-');
    navigate(`/gigs?service=${encodeURIComponent(serviceName)}&category=${encodeURIComponent(category.name)}&slug=${serviceSlug}`);
  };

  // Generate SEO data from REAL data
  const generateCategoryStructuredData = () => {
    if (!categoryData) return null;

    const websiteUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const currentUrl = `${websiteUrl}/categories/${categoryData.slug || categoryData._id}`;

    return {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": `${categoryData.name} Services | Vorkana`,
      "description": categoryData.description,
      "url": currentUrl,
      "about": {
        "@type": "Thing",
        "name": categoryData.name,
        "description": categoryData.description
      },
      "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": websiteUrl
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Categories",
            "item": `${websiteUrl}/categories`
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": categoryData.name,
            "item": currentUrl
          }
        ]
      }
    };
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading {categoryName || 'category'}...</p>
        </div>
      </div>
    );
  }

  // Error or category not found
  if (categoryError || !categoryData) {
    return (
      <SeoWrapper
        title="Category Not Found | Vorkana"
        description="The requested category could not be found."
        canonical="/categories"
        robots="noindex, follow"
      >
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md mx-4">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Category Not Found
            </h2>
            <p className="text-gray-600 mb-6">
              The category you're looking for doesn't exist or is currently unavailable.
            </p>
            <button
              onClick={() => navigate('/categories')}
              className="px-6 py-3 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition-colors shadow-sm"
            >
              Browse All Categories
            </button>
          </div>
        </div>
      </SeoWrapper>
    );
  }

  // Render the page with REAL data
  return (
    <SeoWrapper
      title={`${category.name} Services | Vorkana`}
      description={category.description || `Professional ${category.name} services`}
      canonical={`/categories/${identifier}`}
      structuredData={generateCategoryStructuredData()}
    >
      <div className="min-h-screen bg-gray-50">
        {/* Category Hero */}
        <CategoryHero
          category={category.name} 
          description={category.description}
          icon={category.icon}
          stats={{
            services: category.totalServices,
            providers: 0 // You'll need to fetch this from your API
          }}
        />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Popular Services - Only show if we have data */}
          {category.popularServices && category.popularServices.length > 0 && (
            <div className="mb-12">
              <PopularSlider 
                category={category.name}
                services={category.popularServices}
              />
            </div>
          )}
          
          {/* Explore Section */}
          <div className="mb-16 bg-white rounded-xl shadow-sm p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">
                  Explore {category.name}
                </h2>
                {category.totalServices > 0 && (
                  <p className="text-gray-600 mt-2">
                    {category.totalServices} service{category.totalServices !== 1 ? 's' : ''} available
                  </p>
                )}
              </div>
              
              {category.totalServices === 0 && (
                <div className="mt-4 sm:mt-0">
                  <button
                    onClick={() => navigate('/categories')}
                    className="px-4 py-2 text-sm font-medium text-green-600 hover:text-green-700 border border-green-200 rounded-lg hover:bg-green-50 transition-colors"
                  >
                    Browse Other Categories
                  </button>
                </div>
              )}
            </div>
            
            {/* Services Grid - Show only if we have services */}
            {category.services && category.services.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {category.services.map((service) => (
                  <div key={service.id} className="group">
                    {/* Service Image */}
                    <div className="rounded-lg overflow-hidden h-48 bg-gray-100 mb-4">
                      {service.image ? (
                        <img
                          src={service.image}
                          alt={service.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          onError={(e) => {
                            // Fallback to a generic category image if service image fails
                            e.target.src = `https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80`;
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                          <span className="text-gray-400 text-sm font-medium">
                            {service.title}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Service Details */}
                    <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        {service.title}
                      </h3>
                      
                      <div className="space-y-2">
                        {service.services && service.services.length > 0 ? (
                          service.services.map((item, index) => (
                            <div 
                              key={index} 
                              className="flex items-center cursor-pointer group/item"
                              onClick={() => handleServiceClick(item)}
                            >
                              <div className="w-2 h-2 rounded-full bg-green-400 mr-3 flex-shrink-0"></div>
                              <span className="text-gray-700 hover:text-green-600 transition-colors text-sm truncate">
                                {item}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-500 text-sm italic">
                            No specific services listed
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Empty state when no services
              <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                <div className="text-5xl mb-4">🎤</div>
                <h3 className="text-xl font-medium text-gray-700 mb-2">
                  No {category.name.toLowerCase()} services available yet
                </h3>
                <p className="text-gray-500 max-w-md mx-auto mb-6">
                  There are currently no services listed in this category. Check back soon or explore other categories.
                </p>
                <button
                  onClick={() => navigate('/categories')}
                  className="inline-flex items-center px-5 py-2.5 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition-colors"
                >
                  Explore Categories
                </button>
              </div>
            )}
          </div>
          
          {/* FAQs Section - Only show if we have FAQs */}
          {category.faqs && category.faqs.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <CategoryFAQs
                category={category.name}
                faqs={category.faqs}
              />
            </div>
          )}
        </div>
      </div>
    </SeoWrapper>
  );
};

export default CategoryPage;