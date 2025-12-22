// utils/seoStructuredData.js
export const generateGigListingStructuredData = (gigs = [], searchQuery = '', totalGigs = 0) => {
  const websiteUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Vorkana Gigs - Find & Post Freelance Projects",
    "description": "Browse thousands of active freelance gigs and projects. Find work opportunities across 100+ categories including Programming, Design, Writing, Marketing and more.",
    "url": currentUrl,
    "numberOfItems": totalGigs,
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
      "logo": `${websiteUrl}/logo.png`
    }
  };
};