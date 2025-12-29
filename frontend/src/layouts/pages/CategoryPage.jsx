// src/layouts/pages/CategoryPage.jsx - UPDATED WITH IMPORTS
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
  TrendingUp
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query'; // ADD THIS IMPORT
import { SeoWrapper } from '../../components/SeoWrapper';
import { useCategory } from '../../hooks/useCategories'; // You can keep using this if you want
import { useSubcategoriesByCategory } from '../../hooks/useSubcategories';
import { useServicesByCategory } from '../../hooks/useServices';

const CategoryPage = () => {
  const { categoryId } = useParams(); // This could be ID or slug
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  
  // Determine if categoryId is an ObjectId or slug
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(categoryId);
  
  // OPTION 1: Use the existing useCategory hook (simpler)
  const { 
    data: categoryData, 
    isLoading: categoryLoading, 
    error: categoryError 
  } = useCategory(categoryId, {
    enabled: !!categoryId,
  });

  // OR OPTION 2: Use the custom query (if you want to handle slugs)
  // But since useCategory might already handle slugs, let's check if it works
  
  // Fetch subcategories using the category ID
  const { 
    data: subcategoriesData, 
    isLoading: subcategoriesLoading
  } = useSubcategoriesByCategory(categoryData?._id, {
    enabled: !!categoryData?._id,
  });

  // Fetch services using the category ID
  const { 
    data: servicesData,
    isLoading: servicesLoading
  } = useServicesByCategory(categoryData?._id, selectedSubcategory, {
    enabled: !!categoryData?._id,
  });

  // Loading state
  if (categoryLoading || subcategoriesLoading || servicesLoading) {
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
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Category not found</h2>
          <Link to="/" className="text-blue-600 hover:underline">
            Return to homepage
          </Link>
        </div>
      </div>
    );
  }

  const category = categoryData;
  const subcategories = subcategoriesData?.subcategories || [];
  const services = servicesData || [];

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

  // Sample data structure matching the image - FOR PROGRAMMING & TECH
  const programmingTechSections = [
    {
      title: "Websites",
      icon: <Globe className="w-5 h-5" />,
      services: [
        "Website Development",
        "Website Maintenance",
        "WordPress",
        "Shopify",
        "Custom Websites"
      ]
    },
    {
      title: "Application Development",
      icon: <Code className="w-5 h-5" />,
      services: [
        "Full Stack Web Apps",
        "Desktop Applications",
        "Game Development",
        "Chatbot Development",
        "Browser Extensions"
      ]
    },
    {
      title: "Software Development",
      icon: <Cpu className="w-5 h-5" />,
      services: [
        "Software Development",
        "AI Development",
        "APIs & Integrations",
        "Scripting",
        "Plugins Development"
      ]
    },
    {
      title: "Mobile Apps",
      icon: <Smartphone className="w-5 h-5" />,
      services: [
        "Mobile App Development",
        "Cross-platform Apps",
        "Android App Development",
        "iOS App Development",
        "Mobile App Maintenance"
      ]
    }
  ];

  // Graphic Design sections
  const graphicDesignSections = [
    {
      title: "Logo & Brand Identity",
      icon: <Palette className="w-5 h-5" />,
      services: [
        "Logo Design",
        "Brand Identity",
        "Business Cards",
        "Stationery Design",
        "Brand Guidelines"
      ]
    },
    {
      title: "Web & App Design",
      icon: <Globe className="w-5 h-5" />,
      services: [
        "Website Design",
        "Mobile App Design",
        "UI/UX Design",
        "Wireframing",
        "Prototyping"
      ]
    },
    {
      title: "Marketing Design",
      icon: <TrendingUp className="w-5 h-5" />,
      services: [
        "Social Media Graphics",
        "Banner Ads",
        "Email Templates",
        "Presentation Design",
        "Infographics"
      ]
    },
    {
      title: "Art & Illustration",
      icon: <Palette className="w-5 h-5" />,
      services: [
        "Illustrations",
        "Character Design",
        "Digital Art",
        "Vector Art",
        "Cartoons & Comics"
      ]
    }
  ];

  // Digital Marketing sections
  const digitalMarketingSections = [
    {
      title: "Social Media Marketing",
      icon: <Users className="w-5 h-5" />,
      services: [
        "Social Media Management",
        "Content Strategy",
        "Community Management",
        "Social Media Advertising",
        "Influencer Marketing"
      ]
    },
    {
      title: "SEO & Content",
      icon: <TrendingUp className="w-5 h-5" />,
      services: [
        "SEO Optimization",
        "Content Writing",
        "Blog Writing",
        "Keyword Research",
        "Link Building"
      ]
    },
    {
      title: "Advertising",
      icon: <Briefcase className="w-5 h-5" />,
      services: [
        "Google Ads",
        "Facebook Ads",
        "Instagram Ads",
        "PPC Management",
        "Ad Campaigns"
      ]
    },
    {
      title: "Analytics & Strategy",
      icon: <Database className="w-5 h-5" />,
      services: [
        "Marketing Strategy",
        "Analytics Setup",
        "Conversion Optimization",
        "Market Research",
        "Competitor Analysis"
      ]
    }
  ];

  // Get appropriate sections based on category
  const getCategorySections = () => {
    const categoryName = category.name.toLowerCase();
    
    if (categoryName.includes('programming') || categoryName.includes('tech')) {
      return programmingTechSections;
    }
    
    if (categoryName.includes('graphic') || categoryName.includes('design')) {
      return graphicDesignSections;
    }
    
    if (categoryName.includes('digital') && categoryName.includes('marketing')) {
      return digitalMarketingSections;
    }
    
    // Default: convert subcategories to sections
    if (subcategories.length > 0) {
      return subcategories.map(subcat => ({
        title: subcat.name,
        icon: getCategoryIcon(subcat.name),
        services: [],
        subcategoryId: subcat._id,
        slug: subcat.slug
      }));
    }
    
    // Fallback: use generic sections
    return [
      {
        title: "Popular Services",
        icon: <TrendingUp className="w-5 h-5" />,
        services: ["Service 1", "Service 2", "Service 3", "Service 4", "Service 5"]
      },
      {
        title: "Custom Solutions",
        icon: <Code className="w-5 h-5" />,
        services: ["Custom 1", "Custom 2", "Custom 3", "Custom 4", "Custom 5"]
      },
      {
        title: "Consultation",
        icon: <Users className="w-5 h-5" />,
        services: ["Consult 1", "Consult 2", "Consult 3", "Consult 4", "Consult 5"]
      },
      {
        title: "Support",
        icon: <Briefcase className="w-5 h-5" />,
        services: ["Support 1", "Support 2", "Support 3", "Support 4", "Support 5"]
      }
    ];
  };

  // Convert subcategories to explore sections format
  const subcategorySections = subcategories.map(subcat => ({
    title: subcat.name,
    icon: getCategoryIcon(subcat.name),
    services: [], // You can populate this if you have specific services data
    subcategoryId: subcat._id,
    slug: subcat.slug
  }));

  // Use appropriate sections
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
      // Navigate to search with section title
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
          {/* Explore Section - Matching the image */}
          <div className="mb-16">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Explore {category.name}
              </h2>
              <div className="w-20 h-1 bg-green-500 mx-auto"></div>
            </div>
            
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
                      // If no services, show placeholder or navigate to subcategory
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
                  
                  {/* View All Button */}
                  {(section.services && section.services.length > 0) && (
                    <button
                      onClick={() => handleSubcategoryClick(section)}
                      className="w-full mt-6 py-3 text-center text-green-600 font-medium border border-green-200 rounded-lg hover:bg-green-50 transition-colors"
                    >
                      View All {section.title} Services
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Popular Services Section */}
          {services.length > 0 && (
            <div className="mb-16">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">Popular Services</h2>
                  <p className="text-gray-600 mt-2">Most requested {category.name.toLowerCase()} services</p>
                </div>
                <Link 
                  to={`/services?category=${categoryId}`}
                  className="text-green-600 hover:text-green-700 font-medium flex items-center gap-2"
                >
                  View All
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.slice(0, 6).map((service) => (
                  <div
                    key={service._id}
                    onClick={() => navigate(`/services/${service._id}`)}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {service.title}
                        </h3>
                        <p className="text-gray-600 text-sm line-clamp-2">
                          {service.description}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
                          {service.seller?.avatar ? (
                            <img
                              src={service.seller.avatar}
                              alt={service.seller.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-green-100 text-green-600 font-bold">
                              {service.seller?.name?.charAt(0) || 'S'}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {service.seller?.name || 'Seller'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {service.rating || '4.8'} ★
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <span className="text-xl font-bold text-green-600">
                          ${service.price || service.startingPrice || '99'}
                        </span>
                        <p className="text-xs text-gray-500">starting price</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Why Choose Us Section */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 mb-16">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Why Choose {category.name} Experts on Vorkana
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Connect with top professionals who deliver exceptional results
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  title: "Verified Experts",
                  description: "All providers are verified and reviewed",
                  icon: "✓"
                },
                {
                  title: "Quality Results",
                  description: "Guaranteed satisfaction with every project",
                  icon: "★"
                },
                {
                  title: "Secure Payments",
                  description: "Your funds are protected until you approve",
                  icon: "🔒"
                },
                {
                  title: "24/7 Support",
                  description: "Round-the-clock customer service",
                  icon: "🕒"
                }
              ].map((feature, index) => (
                <div key={index} className="bg-white rounded-xl p-6 text-center">
                  <div className="text-3xl mb-4">{feature.icon}</div>
                  <h3 className="font-bold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>

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
                Post a Project
              </button>
              <button
                onClick={() => navigate('/services')}
                className="px-8 py-4 bg-transparent border-2 border-white text-white font-bold rounded-lg hover:bg-white/10 transition-colors"
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