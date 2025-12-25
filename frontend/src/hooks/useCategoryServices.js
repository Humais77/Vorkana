// hooks/useCategoryServices.js - COMPLETELY UPDATED VERSION
import { useQuery } from '@tanstack/react-query';
import { servicesAPI } from '../api/services.js';
import { gigsAPI } from '../api/gigs.js';

/**
 * Hook to fetch services for a specific category - REAL DATA ONLY
 */
export const useCategoryServices = (categoryIdentifier, options = {}) => {
  return useQuery({
    queryKey: ['categoryServices', categoryIdentifier],
    queryFn: async () => {
      try {
        console.log('Fetching REAL services for category:', categoryIdentifier);
        
        // Fetch services for this category - REAL DATA ONLY
        let services = [];
        
        // Try with category filter
        const categoryServices = await servicesAPI.getAll({
          category: categoryIdentifier,
          isActive: true,
          status: 'active',
          limit: 50, // Get more for grouping
          populate: true,
          sort: '-createdAt',
          order: 'desc'
        });

        services = Array.isArray(categoryServices) ? categoryServices : [];

        console.log('Real services fetched:', services.length);

        // If no services found, try alternative approach
        if (services.length === 0) {
          console.log('No services found for category, trying alternative...');
          
          // Try with category name or slug
          const allServices = await servicesAPI.getAll({
            isActive: true,
            status: 'active',
            limit: 100,
            populate: true
          });

          const allServicesArray = Array.isArray(allServices) ? allServices : [];
          
          // Filter by category name if available in populated category field
          if (categoryIdentifier) {
            services = allServicesArray.filter(service => 
              service.category && 
              (service.category._id === categoryIdentifier || 
               service.category.slug === categoryIdentifier ||
               (service.category.name && 
                service.category.name.toLowerCase().includes(categoryIdentifier.toLowerCase())))
            );
          }
        }

        console.log('Final services count:', services.length);
        
        return {
          services: services || [],
          totalServices: services.length || 0
        };
      } catch (error) {
        console.error('Error fetching category services:', error);
        
        // Return empty data on error - NO MOCK DATA
        return {
          services: [],
          totalServices: 0
        };
      }
    },
    enabled: !!categoryIdentifier && options.enabled !== false,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    ...options,
  });
};

/**
 * Transform real services for display - NO MOCK DATA
 */
export const transformServicesForDisplay = (services) => {
  if (!Array.isArray(services) || services.length === 0) {
    return []; // Return empty array - NO MOCK DATA
  }

  // Group services by their actual category or tags
  const groupedServices = services.reduce((acc, service, index) => {
    // Determine service type from actual data
    let serviceType = 'General';
    
    if (service.category && typeof service.category === 'object') {
      serviceType = service.category.name || 'General';
    } else if (service.tags && service.tags.length > 0) {
      // Use the first tag as service type
      serviceType = service.tags[0];
    } else if (service.serviceType) {
      serviceType = service.serviceType;
    }
    
    const groupKey = serviceType.toLowerCase().replace(/\s+/g, '-') + '-' + index;
    
    if (!acc[groupKey]) {
      acc[groupKey] = {
        id: service._id || groupKey,
        title: serviceType,
        image: getServiceImage(service),
        services: []
      };
    }
    
    // Add this specific service
    const serviceTitle = service.title || service.name || `Service ${index + 1}`;
    if (!acc[groupKey].services.includes(serviceTitle)) {
      acc[groupKey].services.push(serviceTitle);
    }
    
    // Limit services per group
    if (acc[groupKey].services.length > 5) {
      acc[groupKey].services = acc[groupKey].services.slice(0, 5);
    }
    
    return acc;
  }, {});

  // Convert to array and ensure uniqueness
  const result = Object.values(groupedServices);
  
  // Remove duplicate groups with same title
  const uniqueGroups = [];
  const seenTitles = new Set();
  
  result.forEach(group => {
    if (!seenTitles.has(group.title)) {
      seenTitles.add(group.title);
      uniqueGroups.push(group);
    }
  });

  return uniqueGroups.slice(0, 8); // Limit to 8 unique groups
};

/**
 * Get service image from real data - NO MOCK IMAGES
 */
const getServiceImage = (service) => {
  // Try to get image from actual service data
  if (service.images && service.images[0] && service.images[0].url) {
    return service.images[0].url;
  }
  
  if (service.image && service.image.url) {
    return service.image.url;
  }
  
  if (service.thumbnail && service.thumbnail.url) {
    return service.thumbnail.url;
  }
  
  if (service.gallery && service.gallery[0] && service.gallery[0].url) {
    return service.gallery[0].url;
  }
  
  // If no image in service, check category
  if (service.category && service.category.image) {
    return service.category.image;
  }
  
  // Return null if no image - Frontend should handle this
  return null;
};

/**
 * Transform popular services from real data
 */
export const transformPopularServices = (services) => {
  if (!Array.isArray(services) || services.length === 0) {
    return []; // Return empty array - NO MOCK DATA
  }

  // Sort by actual popularity metrics (rating, views, orders)
  return services
    .sort((a, b) => {
      // Sort by rating first, then by views, then by orders
      const ratingDiff = (b.rating || 0) - (a.rating || 0);
      if (ratingDiff !== 0) return ratingDiff;
      
      const viewsDiff = (b.views || 0) - (a.views || 0);
      if (viewsDiff !== 0) return viewsDiff;
      
      return (b.ordersCount || 0) - (a.ordersCount || 0);
    })
    .slice(0, 6)
    .map(service => ({
      id: service._id || service.id,
      title: service.title || service.name
    }));
};

/**
 * Get category icon from actual category data
 */
export const getCategoryIcon = (categoryData) => {
  if (!categoryData) return 'Folder';
  
  // Check if category has icon data
  if (categoryData.icon) {
    return categoryData.icon;
  }
  
  // Map category names to icons
  const categoryName = categoryData.name || '';
  const iconMap = {
    'Programming': 'Code2',
    'Graphic': 'Palette',
    'Design': 'Palette',
    'Logo': 'Palette',
    'Web': 'Code2',
    'Art': 'Palette',
    'Digital': 'TrendingUp',
    'Marketing': 'TrendingUp',
    'Writing': 'PenTool',
    'Video': 'Video',
    'Music': 'Music',
    'Business': 'Briefcase',
    'Lifestyle': 'Heart',
    'Voice': 'Mic', // Added for Voice Over
    'Audio': 'Mic',
    'Sound': 'Mic'
  };

  for (const [key, icon] of Object.entries(iconMap)) {
    if (categoryName.includes(key)) return icon;
  }

  return 'Folder';
};

/**
 * Hook to get transformed category data - REAL DATA ONLY
 */
export const useTransformedCategoryData = (categoryData, servicesData) => {
  if (!categoryData) {
    return {
      name: '',
      description: '',
      icon: 'Folder',
      totalServices: 0,
      services: [],
      popularServices: [],
      faqs: []
    };
  }

  const services = servicesData?.services || [];
  
  return {
    name: categoryData.name || '',
    description: categoryData.description || '',
    icon: getCategoryIcon(categoryData),
    totalServices: services.length,
    services: transformServicesForDisplay(services),
    popularServices: transformPopularServices(services),
    faqs: generateCategoryFAQs(categoryData.name || '', services)
  };
};

/**
 * Generate FAQs based on actual category and services
 */
export const generateCategoryFAQs = (categoryName, services = []) => {
  if (!categoryName || services.length === 0) {
    // Return minimal FAQs if no data
    return [
      {
        question: 'How do I hire a freelancer for this category?',
        answer: 'Browse through the available services, review provider profiles and ratings, then select a service that matches your requirements.'
      },
      {
        question: 'What payment methods are accepted?',
        answer: 'We accept credit/debit cards, PayPal, and other secure payment methods. All transactions are protected.'
      }
    ];
  }

  // Generate FAQs based on actual category and service data
  const categoryFAQs = {
    'Voice Over': [
      {
        question: 'What types of voice over services are available?',
        answer: services.length > 0 
          ? `We offer ${services.length} different voice over services including ${services.slice(0, 3).map(s => s.title || s.name).join(', ')} and more.`
          : 'Professional voice over services for commercials, narration, animation, and more.'
      },
      {
        question: 'What file formats do you deliver?',
        answer: 'We deliver in professional audio formats including WAV, MP3, AIFF, and FLAC with high-quality production standards.'
      }
    ],
    'Programming & Tech': [
      {
        question: 'What programming languages are available?',
        answer: 'Our developers specialize in JavaScript, Python, Java, C#, PHP, Ruby, and other modern technologies.'
      }
    ],
    'Graphic & Design': [
      {
        question: 'What design formats do you provide?',
        answer: 'We deliver designs in AI, EPS, PDF, PNG, JPG, and SVG formats with complete source files.'
      }
    ]
  };

  const specificFAQs = categoryFAQs[categoryName] || [
    {
      question: `What ${categoryName.toLowerCase()} services are available?`,
      answer: `We offer ${services.length} professional ${categoryName.toLowerCase()} services with verified providers.`
    }
  ];

  // Always include these general FAQs
  const generalFAQs = [
    {
      question: 'How do I place an order?',
      answer: 'Click on any service that interests you, review the details and packages, then click "Order Now" to proceed.'
    },
    {
      question: 'Can I request revisions?',
      answer: 'Yes, most services include revision rounds. Check the specific service package for details.'
    },
    {
      question: 'How is quality ensured?',
      answer: 'All providers are verified, and we have a rating/review system to help you choose the best service.'
    }
  ];

  return [...specificFAQs, ...generalFAQs].slice(0, 6);
};