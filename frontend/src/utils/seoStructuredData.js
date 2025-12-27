// utils/seoStructuredData.js
export const generateCreateServiceStructuredData = (categories = [], currentStep = 'basic') => {
  const websiteUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  // Generate category options for HowTo schema
  const categoryOptions = categories.map(category => ({
    "@type": "HowToDirection",
    "text": `Select "${category.name}" from the category dropdown`
  }));

  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "How to Create a Service on Vorkana",
    "description": "Step-by-step guide to create and publish your freelance service on Vorkana marketplace",
    "totalTime": "PT15M",
    "estimatedCost": {
      "@type": "MonetaryAmount",
      "currency": "USD",
      "value": "0"
    },
    "supply": [
      {
        "@type": "HowToSupply",
        "name": "Completed Profile",
        "required": true
      },
      {
        "@type": "HowToSupply",
        "name": "Service Description",
        "required": true
      },
      {
        "@type": "HowToSupply",
        "name": "Service Images",
        "required": false
      }
    ],
    "tool": [
      {
        "@type": "HowToTool",
        "name": "Vorkana Platform"
      }
    ],
    "step": [
      {
        "@type": "HowToStep",
        "name": "Fill Basic Information",
        "text": "Enter your service title, description, and select a category",
        "url": `${currentUrl}#basic-info`,
        "position": 1
      },
      {
        "@type": "HowToStep",
        "name": "Set Pricing & Delivery",
        "text": "Set your service price, delivery time, and revisions",
        "url": `${currentUrl}#pricing-delivery`,
        "position": 2
      },
      {
        "@type": "HowToStep",
        "name": "Add Tags & Keywords",
        "text": "Add relevant tags and keywords to improve visibility",
        "url": `${currentUrl}#tags-keywords`,
        "position": 3
      },
      {
        "@type": "HowToStep",
        "name": "Define Service Features",
        "text": "List what clients will get with your service",
        "url": `${currentUrl}#service-features`,
        "position": 4
      },
      {
        "@type": "HowToStep",
        "name": "Set Client Requirements",
        "text": "Define what information you need from clients",
        "url": `${currentUrl}#client-requirements`,
        "position": 5
      },
      {
        "@type": "HowToStep",
        "name": "Add FAQ Section",
        "text": "Answer common questions clients might have",
        "url": `${currentUrl}#faq-section`,
        "position": 6
      },
      {
        "@type": "HowToStep",
        "name": "Create Service Packages",
        "text": "Set up different pricing tiers for your service",
        "url": `${currentUrl}#service-packages`,
        "position": 7
      },
      {
        "@type": "HowToStep",
        "name": "Review & Publish",
        "text": "Review all information and publish your service",
        "url": `${currentUrl}#review-publish`,
        "position": 8
      }
    ],
    "about": {
      "@type": "Thing",
      "name": "Freelance Services"
    }
  };
};

export const generateGigListingStructuredData = (gigs = [], searchQuery = '', totalGigs = 0) => {
  const websiteUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": searchQuery ? `Vorkana Gigs - ${searchQuery}` : "Vorkana Gigs - Find & Post Freelance Projects",
    "description": "Browse thousands of active freelance gigs and projects. Find work opportunities across 100+ categories including Programming, Design, Writing, Marketing and more.",
    "url": currentUrl,
    "numberOfItems": totalGigs,
    "itemListOrder": "http://schema.org/ItemListOrderDescending",
    "itemListElement": gigs.slice(0, 10).map((gig, index) => ({
      "@type": "Service",
      "position": index + 1,
      "url": `${websiteUrl}/gig/${gig.slug || gig._id}`,
      "name": gig.title,
      "description": gig.description?.substring(0, 200) || 'Find freelance gig opportunities',
      "offeredBy": {
        "@type": "Person",
        "name": gig.seller?.name || "Freelancer"
      },
      "priceSpecification": {
        "@type": "PriceSpecification",
        "price": gig.budget || 0,
        "priceCurrency": "USD",
        "eligibleRegion": {
          "@type": "Country",
          "name": gig.country || "Global"
        }
      },
      "availableAtOrFrom": {
        "@type": "Place",
        "name": gig.location || "Remote"
      }
    })),
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
          "name": "Gigs",
          "item": `${websiteUrl}/gigs`
        }
      ]
    },
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${websiteUrl}/gigs?search={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };
};

export const generateProfileStructuredData = (user) => {
  const websiteUrl = typeof window !== 'undefined' ? window.location.origin : '';
  
  if (!user) return null;

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": user.name,
    "url": `${websiteUrl}/profile`,
    "image": user.picture || `${websiteUrl}/default-avatar.png`,
    "description": user.bio?.substring(0, 200) || `${user.name}'s profile on Vorkana`,
    "email": user.email,
    "jobTitle": user.occupation || "Freelancer",
    "knowsAbout": user.languages?.join(', ') || '',
    "alumniOf": user.education ? {
      "@type": "EducationalOrganization",
      "name": user.education
    } : undefined,
    "address": (user.city || user.country) ? {
      "@type": "PostalAddress",
      "addressLocality": user.city,
      "addressCountry": user.country
    } : undefined,
    "sameAs": [
      ...(user.linkedin ? [user.linkedin] : []),
      ...(user.github ? [user.github] : []),
      ...(user.website ? [user.website] : [])
    ]
  };
};
export const generateServiceListingStructuredData = (services = [], searchQuery = '', totalServices = 0) => {
  const websiteUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  return {
    "@context": "https://schema.org", // KEEP THIS
    "@type": "ItemList",
    "name": searchQuery ? `Services - ${searchQuery}` : "Browse Freelance Services",
    "description": "Find professional freelance services across 100+ categories",
    "url": currentUrl,
    "numberOfItems": totalServices,
    "itemListElement": services.slice(0, 10).map((service, index) => ({
      "@type": "Service",
      "position": index + 1,
      "url": `${websiteUrl}/services/${service.slug || service._id}`,
      "name": service.title,
      "description": service.shortDescription?.substring(0, 150) || service.description?.substring(0, 150),
      "offers": {
        "@type": "Offer",
        "price": service.price || 0,
        "priceCurrency": service.currency || "USD"
      }
    }))
  };
};
export const generateWebsiteStructuredData = () => {
  const websiteUrl = typeof window !== 'undefined' ? window.location.origin : '';

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Vorkana",
    "url": websiteUrl,
    "description": "Global marketplace connecting freelancers with clients. Find gigs, hire talent, and grow your freelance career.",
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${websiteUrl}/gigs?search={search_term_string}`,
      "query-input": "required name=search_term_string"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Vorkana",
      "logo": `${websiteUrl}/logo.png`,
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "customer support",
        "email": "support@vorkana.com",
        "url": `${websiteUrl}/contact`
      }
    }
  };
};

export const generateServiceCreationStructuredData = (formData = {}, categories = []) => {
  const websiteUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  
  const selectedCategory = categories.find(cat => cat._id === formData.category);
  const selectedSubcategory = selectedCategory?.subcategories?.find(sub => sub._id === formData.subcategory);

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Create Service | Vorkana",
    "url": currentUrl,
    "description": "Create and publish your freelance service on Vorkana. Reach clients worldwide with your skills.",
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
          "name": "Profile",
          "item": `${websiteUrl}/profile`
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Create Service",
          "item": currentUrl
        }
      ]
    },
    "mainEntity": {
      "@type": "Service",
      "serviceType": formData.category ? selectedCategory?.name : "Freelance Service",
      "provider": {
        "@type": "Person",
        "name": "You"
      },
      "areaServed": {
        "@type": "Country",
        "name": "Worldwide"
      },
      "offers": {
        "@type": "Offer",
        "priceCurrency": formData.currency || "USD",
        "price": formData.price || "0"
      }
    },
    "speakable": {
      "@type": "SpeakableSpecification",
      "cssSelector": [".bg-white", "h1", "h2", ".text-lg", ".font-bold"]
    }
  };
};

// Add this function to your utils/seoStructuredData.js file
export const generateServiceStructuredData = (service, serviceUser, websiteUrl) => {
  if (!service || !websiteUrl) return null;

  const serviceUrl = `${websiteUrl}/services/${service._id}`;
  const provider = serviceUser || service.createdBy || service.creatorDetails;
  
  // Format price for structured data
  const formatStructuredPrice = (price, currency) => {
    return {
      "@type": "PriceSpecification",
      "price": parseFloat(price) || 0,
      "priceCurrency": currency || "USD"
    };
  };

  // Generate offers array
  const offers = [];
  
  // Add base service offer
  offers.push({
    "@type": "Offer",
    ...formatStructuredPrice(service.price, service.currency),
    "availability": service.status === 'active' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    "itemOffered": {
      "@type": "Service",
      "name": service.title,
      "description": service.shortDescription || service.description?.substring(0, 200),
      "serviceType": service.category || "Freelance Service",
      "provider": provider ? {
        "@type": "Person",
        "name": provider.name,
        "url": `${websiteUrl}/profile/${provider._id}`,
        "image": provider.picture
      } : undefined,
      "areaServed": {
        "@type": "Country",
        "name": "Worldwide"
      }
    },
    "priceValidUntil": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  // Add package offers if available
  if (service.packages && service.packages.length > 0) {
    service.packages.forEach((pkg, index) => {
      offers.push({
        "@type": "Offer",
        ...formatStructuredPrice(pkg.price, service.currency),
        "name": pkg.name,
        "description": pkg.description || `Package: ${pkg.name}`,
        "availability": service.status === 'active' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        "priceValidUntil": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
    });
  }

  // Main service structured data
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": service.title,
    "description":(service.description || service.shortDescription || '').substring(0, 300),
    "url": serviceUrl,
    "image": service.thumbnail?.url || service.images?.[0]?.url || `${baseUrl}/default-service.jpg`,
    "offers": offers,
    "provider": provider ? {
      "@type": provider.role === 'business' ? "Organization" : "Person",
      "name": provider.name,
      "description": provider.bio?.substring(0, 200),
      "url": `${websiteUrl}/profile/${provider._id}`,
      "image": provider.picture,
      "telephone": provider.phone,
      "email": provider.email,
      "address": {
        "@type": "PostalAddress",
        "addressCountry": provider.country,
        "addressLocality": provider.city
      },
      "aggregateRating": provider.rating ? {
        "@type": "AggregateRating",
        "ratingValue": provider.rating,
        "ratingCount": provider.totalReviews || 0,
        "bestRating": 5,
        "worstRating": 1
      } : undefined
    } : undefined,
    "aggregateRating": service.rating ? {
      "@type": "AggregateRating",
      "ratingValue": service.rating,
      "ratingCount": service.reviewsCount || 0,
      "bestRating": 5,
      "worstRating": 1
    } : undefined,
    "areaServed": {
      "@type": "Country",
      "name": "Worldwide"
    },
    "serviceType": service.category,
    "category": service.category,
    "keywords": service.tags?.join(', '),
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": serviceUrl
    },
    "additionalProperty": [
      {
        "@type": "PropertyValue",
        "name": "deliveryTime",
        "value": `${service.deliveryTime} ${service.deliveryTimeUnit}`
      },
      {
        "@type": "PropertyValue",
        "name": "revisions",
        "value": service.revisions || 0
      },
      {
        "@type": "PropertyValue",
        "name": "status",
        "value": service.status || 'active'
      }
    ]
  };
};

export const generateBreadcrumbStructuredData = (breadcrumbItems = [], websiteUrl) => {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbItems.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url.startsWith('http') ? item.url : `${websiteUrl}${item.url}`
    }))
  };
};