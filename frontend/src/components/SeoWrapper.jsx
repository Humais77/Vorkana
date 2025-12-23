import React, { useEffect } from 'react';

export const SeoWrapper = ({ 
  children, 
  title = 'Create Service | Vorkana',
  description = 'Create and publish your freelance service on Vorkana marketplace. Reach thousands of potential clients worldwide.',
  keywords = 'create service, freelance, gig, offer services, sell skills, freelancer, marketplace',
  canonical,
  structuredData,
  ogTitle,
  ogDescription,
  ogImage,
  ogType = 'website',
  twitterCard = 'summary_large_image',
  twitterSite = '@vorkana',
  robots = 'index, follow',
  lang = 'en',
  alternateLanguages = [],
  breadcrumb = [],
  schemaType = 'WebPage'
}) => {
  useEffect(() => {
    // Store original title to reset on unmount
    const previousTitle = document.title;

    // Update document title
    if (title) {
      document.title = title.includes('Vorkana') ? title : `${title} | Vorkana`;
    }

    // Set language
    if (lang) {
      document.documentElement.lang = lang;
    }

    const updateOrCreateMeta = (name, content, property = null) => {
      let metaTag;
      if (property) {
        metaTag = document.querySelector(`meta[property="${property}"]`);
        if (!metaTag) {
          metaTag = document.createElement('meta');
          metaTag.setAttribute('property', property);
          document.head.appendChild(metaTag);
        }
      } else {
        metaTag = document.querySelector(`meta[name="${name}"]`);
        if (!metaTag) {
          metaTag = document.createElement('meta');
          metaTag.setAttribute('name', name);
          document.head.appendChild(metaTag);
        }
      }
      metaTag.setAttribute('content', content);
    };

    // Logic to update tags
    if (description) {
      updateOrCreateMeta('description', description);
      updateOrCreateMeta(null, ogDescription || description, 'og:description');
      updateOrCreateMeta(null, ogDescription || description, 'twitter:description');
    }
    if (keywords) updateOrCreateMeta('keywords', keywords);
    if (robots) updateOrCreateMeta('robots', robots);

    // Canonical
    if (canonical && typeof window !== 'undefined') {
      let canonicalLink = document.querySelector('link[rel="canonical"]');
      if (!canonicalLink) {
        canonicalLink = document.createElement('link');
        canonicalLink.rel = 'canonical';
        document.head.appendChild(canonicalLink);
      }
      canonicalLink.href = canonical;
    }

    // OG/Twitter Image
    const websiteUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const imgUrl = ogImage || `${websiteUrl}/images/og-create-service.jpg`;
    updateOrCreateMeta(null, imgUrl, 'og:image');
    updateOrCreateMeta(null, imgUrl, 'twitter:image');

    // Breadcrumb
    if (breadcrumb.length > 0) {
      const breadcrumbSchema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": breadcrumb.map((item, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "name": item.name,
          "item": item.url
        }))
      };
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.text = JSON.stringify(breadcrumbSchema);
      script.id = 'breadcrumb-schema';
      document.head.appendChild(script);
    }

    // --- CLEANUP FUNCTION ---
    return () => {
      // 1. Reset Title
      document.title = "Vorkana"; // Or use previousTitle

      // 2. Remove specific tags that shouldn't persist
      const tagsToRemove = [
        'meta[name="description"]',
        'meta[property="og:description"]',
        'meta[property="twitter:description"]',
        'meta[name="keywords"]',
        'meta[property="og:title"]',
        'link[rel="canonical"]',
        'script#breadcrumb-schema'
      ];

      tagsToRemove.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) element.remove();
      });

      // 3. Clean up alternates
      alternateLanguages.forEach(({ lang }) => {
        const link = document.querySelector(`link[rel="alternate"][hreflang="${lang}"]`);
        if (link) link.remove();
      });
    };
  }, [title, description, keywords, canonical, structuredData, ogTitle, ogDescription, ogImage, ogType, twitterCard, twitterSite, robots, lang, alternateLanguages, breadcrumb]);

  return <>{children}</>;
};