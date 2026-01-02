import React, { useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

export const SeoWrapper = ({
  children,
  title = 'Vorkanna Marketplace',
  description = 'Global marketplace connecting freelancers with clients. Find gigs, hire talent, and grow your freelance career.',
  keywords = 'freelance, marketplace, gigs, services, freelancers, clients',
  canonical,
  structuredData, // array of JSON-LD objects or single object
  ogTitle,
  ogDescription,
  ogImage,
  ogType = 'website',
  ogUrl,
  twitterCard = 'summary_large_image',
  twitterSite = '@Vorkanna',
  robots = 'index, follow',
  lang = 'en',
  alternateLanguages = [], // [{ href: string, hreflang: string }]
  breadcrumb = [], // [{ name: string, url: string }]
}) => {
  const location = useLocation();
  const createdElements = useRef(new Set());
  const isMounted = useRef(false);
  const previousPathname = useRef('');
  
  // Track if we're in the middle of a navigation
  const isNavigating = useRef(false);
  const navigationTimeout = useRef(null);

  // Memoize the full title to prevent unnecessary recalculations
  const fullTitle = useMemo(() => {
    if (title.includes('Vorkanna') || title.includes('|')) {
      return title;
    }
    return `${title} | Vorkanna`;
  }, [title]);

  // Memoize other derived values
  const finalOgTitle = useMemo(() => ogTitle || fullTitle, [ogTitle, fullTitle]);
  const finalOgDescription = useMemo(() => ogDescription || description, [ogDescription, description]);
  const finalOgUrl = useMemo(() => ogUrl || window.location.href, [ogUrl]);
  const baseUrl = useMemo(() => window.location.origin, []);
  const defaultOgImage = useMemo(() => `${baseUrl}/images/og-default.jpg`, [baseUrl]);
  const finalOgImage = useMemo(() => ogImage || defaultOgImage, [ogImage, defaultOgImage]);

  // Get current pathname including search params
  const currentPath = useMemo(() => location.pathname + location.search, [location.pathname, location.search]);

  // Cleanup function - only removes meta/link elements, NOT title
  const cleanupCreatedElements = () => {
    // Clear any pending navigation timeout
    if (navigationTimeout.current) {
      clearTimeout(navigationTimeout.current);
      navigationTimeout.current = null;
    }

    // Remove only the meta/link/script elements we created
    createdElements.current.forEach(el => {
      try {
        if (el && el.parentNode && el.parentNode === document.head) {
          el.parentNode.removeChild(el);
        }
      } catch (error) {
        console.error('Error removing SEO element:', error);
      }
    });
    createdElements.current.clear();
  };

  useEffect(() => {
    if (typeof document === 'undefined') return;

    // Skip if we're still on the same page (React re-render with same path)
    if (isMounted.current && currentPath === previousPathname.current) {
      return;
    }

    // Mark that we're starting a navigation
    isNavigating.current = true;
    previousPathname.current = currentPath;

    // Helper function to create or update meta/link elements
    const updateOrCreate = (tagName, attributes) => {
      let selector = '';
      let identifier = '';
      
      if (tagName === 'meta') {
        if (attributes.property) {
          selector = `meta[property="${attributes.property}"]`;
          identifier = `meta[property="${attributes.property}"]`;
        } else if (attributes.name) {
          selector = `meta[name="${attributes.name}"]`;
          identifier = `meta[name="${attributes.name}"]`;
        }
      } else if (tagName === 'link') {
        selector = `link[rel="${attributes.rel}"]`;
        identifier = `link[rel="${attributes.rel}"]`;
        if (attributes.hreflang) {
          selector += `[hreflang="${attributes.hreflang}"]`;
          identifier += `[hreflang="${attributes.hreflang}"]`;
        }
      }

      // Check if we already created this element
      let el = Array.from(createdElements.current).find(e => 
        e.tagName.toLowerCase() === tagName && 
        Object.keys(attributes).every(key => e.getAttribute(key) === attributes[key])
      );

      if (!el) {
        // Look for existing element in the DOM
        el = document.querySelector(selector);
        
        if (!el) {
          el = document.createElement(tagName);
          Object.keys(attributes).forEach(key => {
            el.setAttribute(key, attributes[key] || '');
          });
          document.head.appendChild(el);
          createdElements.current.add(el);
        } else {
          // Element exists but wasn't created by us - update it
          Object.keys(attributes).forEach(key => {
            const currentValue = el.getAttribute(key);
            const newValue = attributes[key];
            if (currentValue !== newValue) {
              el.setAttribute(key, newValue || '');
            }
          });
          createdElements.current.add(el);
        }
      } else {
        // Update existing element if values changed
        Object.keys(attributes).forEach(key => {
          const currentValue = el.getAttribute(key);
          const newValue = attributes[key];
          if (currentValue !== newValue) {
            el.setAttribute(key, newValue || '');
          }
        });
      }

      return el;
    };

    // === 1. Update Title (IMMEDIATELY to prevent flicker) ===
    // Update title synchronously to prevent any visible glitch
    if (document.title !== fullTitle) {
      document.title = fullTitle;
    }

    // === 2. Set Document Language ===
    if (document.documentElement.lang !== lang) {
      document.documentElement.lang = lang;
    }

    // === 3. Basic Meta Tags ===
    updateOrCreate('meta', { name: 'description', content: description });
    updateOrCreate('meta', { name: 'keywords', content: keywords });
    updateOrCreate('meta', { name: 'robots', content: robots });

    // === 4. Open Graph Tags ===
    const ogTags = [
      { property: 'og:title', content: finalOgTitle },
      { property: 'og:description', content: finalOgDescription },
      { property: 'og:type', content: ogType },
      { property: 'og:url', content: finalOgUrl },
      { property: 'og:image', content: finalOgImage },
      { property: 'og:site_name', content: 'Vorkanna' },
    ];

    ogTags.forEach(tag => updateOrCreate('meta', tag));

    // === 5. Twitter Tags ===
    const twitterTags = [
      { name: 'twitter:card', content: twitterCard },
      { name: 'twitter:site', content: twitterSite },
      { name: 'twitter:title', content: finalOgTitle },
      { name: 'twitter:description', content: finalOgDescription },
      { name: 'twitter:image', content: finalOgImage },
    ];

    twitterTags.forEach(tag => updateOrCreate('meta', tag));

    // === 6. Canonical URL ===
    if (canonical) {
      const fullCanonical = canonical.startsWith('http') ? canonical : `${baseUrl}${canonical}`;
      updateOrCreate('link', { rel: 'canonical', href: fullCanonical });
    } else {
      // Self-referencing canonical
      updateOrCreate('link', { rel: 'canonical', href: finalOgUrl });
    }

    // === 7. Alternate Languages ===
    alternateLanguages.forEach(({ href, hreflang }) => {
      if (href && hreflang) {
        updateOrCreate('link', { rel: 'alternate', hreflang, href });
      }
    });

    // === 8. Remove previous structured data scripts ===
    // Find and remove script elements with data-seo attribute
    document.querySelectorAll('script[data-seo]').forEach(script => {
      if (script.parentNode) {
        // Only remove if we created it or if it's from a previous navigation
        if (createdElements.current.has(script) || 
            !Array.from(createdElements.current).some(el => el.tagName === 'SCRIPT')) {
          script.parentNode.removeChild(script);
        }
      }
    });

    // Remove script elements from our tracking set
    Array.from(createdElements.current).forEach(el => {
      if (el.tagName === 'SCRIPT') {
        createdElements.current.delete(el);
      }
    });

    // === 9. Add Breadcrumb Structured Data ===
    if (breadcrumb.length > 0) {
      const breadcrumbSchema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": breadcrumb.map((item, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "name": item.name,
          "item": item.url.startsWith('http') ? item.url : `${baseUrl}${item.url}`
        }))
      };

      const scriptEl = document.createElement('script');
      scriptEl.type = 'application/ld+json';
      scriptEl.text = JSON.stringify(breadcrumbSchema);
      scriptEl.dataset.seo = 'breadcrumb';
      document.head.appendChild(scriptEl);
      createdElements.current.add(scriptEl);
    }

    // === 10. Add Custom Structured Data ===
    const dataToAdd = Array.isArray(structuredData) ? structuredData : (structuredData ? [structuredData] : []);
    dataToAdd.forEach((data, index) => {
      if (!data) return;
      
      const sanitizedData = { ...data };
      if (sanitizedData["@context"] !== "https://schema.org") {
        sanitizedData["@context"] = "https://schema.org";
      }

      const scriptEl = document.createElement('script');
      scriptEl.type = 'application/ld+json';
      scriptEl.text = JSON.stringify(sanitizedData);
      scriptEl.dataset.seo = `custom-${index}`;
      document.head.appendChild(scriptEl);
      createdElements.current.add(scriptEl);
    });

    // === 11. Add Default Website Structured Data ===
    const websiteSchema = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "Vorkanna",
      "url": baseUrl,
      "description": "Global marketplace connecting freelancers with clients",
      "potentialAction": {
        "@type": "SearchAction",
        "target": `${baseUrl}/search?q={search_term_string}`,
        "query-input": "required name=search_term_string"
      }
    };

    const websiteScript = document.createElement('script');
    websiteScript.type = 'application/ld+json';
    websiteScript.text = JSON.stringify(websiteSchema);
    websiteScript.dataset.seo = 'website';
    document.head.appendChild(websiteScript);
    createdElements.current.add(websiteScript);

    // Mark navigation as complete
    navigationTimeout.current = setTimeout(() => {
      isNavigating.current = false;
      navigationTimeout.current = null;
    }, 100);

    isMounted.current = true;

    // === Cleanup ===
    return () => {
      // Clear navigation timeout
      if (navigationTimeout.current) {
        clearTimeout(navigationTimeout.current);
        navigationTimeout.current = null;
      }

      // Only cleanup if we're actually unmounting (not just re-rendering)
      // We check if the path has changed since the last render
      const currentPathOnCleanup = window.location.pathname + window.location.search;
      
      if (currentPathOnCleanup !== currentPath) {
        // We're navigating away - cleanup meta/link elements but NOT title
        cleanupCreatedElements();
      }
    };

  }, [
    currentPath, // Only update on route change
    fullTitle,
    description,
    keywords,
    canonical,
    structuredData,
    finalOgTitle,
    finalOgDescription,
    finalOgImage,
    ogType,
    finalOgUrl,
    twitterCard,
    twitterSite,
    robots,
    lang,
    alternateLanguages,
    breadcrumb,
    baseUrl,
  ]);

  // Effect to handle window blur/focus events for additional title stability
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // When tab becomes visible, ensure title is correct
        if (document.title !== fullTitle) {
          document.title = fullTitle;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fullTitle]);

  return <>{children}</>;
};