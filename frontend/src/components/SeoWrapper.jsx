import React, { useEffect, useRef } from 'react';

export const SeoWrapper = ({
  children,
  title = 'Vorkana Marketplace',
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
  twitterSite = '@vorkana',
  robots = 'index, follow',
  lang = 'en',
  alternateLanguages = [], // [{ href: string, hreflang: string }]
  breadcrumb = [], // [{ name: string, url: string }]
}) => {
  const createdElements = useRef([]); // Track elements we create
  const originalTitle = useRef(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    // Store original title on first mount
    if (originalTitle.current === null) {
      originalTitle.current = document.title;
    }

    // === 1. Title ===
    const fullTitle = title.includes('Vorkana') || title.includes('|') ? title : `${title} | Vorkana`;
    
    // Only update title if it's different to prevent flickering
    if (document.title !== fullTitle) {
      document.title = fullTitle;
    }

    // === 2. Language ===
    if (document.documentElement.lang !== lang) {
      document.documentElement.lang = lang;
    }

    // === Helper to create or update meta/link/script ===
    const updateOrCreate = (tagName, attributes, contentAttr = 'content') => {
      let selector = '';
      if (tagName === 'meta') {
        if (attributes.property) selector = `meta[property="${attributes.property}"]`;
        else if (attributes.name) selector = `meta[name="${attributes.name}"]`;
      } else if (tagName === 'link') {
        selector = `link[rel="${attributes.rel}"]${attributes.hreflang ? `[hreflang="${attributes.hreflang}"]` : ''}`;
      }

      let el = selector ? document.querySelector(selector) : null;

      if (!el) {
        el = document.createElement(tagName);
        Object.keys(attributes).forEach((key) => el.setAttribute(key, attributes[key]));
        document.head.appendChild(el);
        createdElements.current.push(el);
      } else {
        // Update existing element
        Object.keys(attributes).forEach((key) => {
          if (key !== contentAttr || attributes[key] !== el.getAttribute(key)) {
            el.setAttribute(key, attributes[key] || '');
          }
        });
      }

      return el;
    };

    // === 3. Basic Meta ===
    if (description) {
      updateOrCreate('meta', { name: 'description', content: description });
    }
    if (keywords) {
      updateOrCreate('meta', { name: 'keywords', content: keywords });
    }
    updateOrCreate('meta', { name: 'robots', content: robots });

    // === 4. Open Graph ===
    const finalOgTitle = ogTitle || fullTitle;
    const finalOgDescription = ogDescription || description;
    const baseUrl = window.location.origin;
    const defaultOgImage = `${baseUrl}/images/og-default.jpg`;
    const finalOgImage = ogImage || defaultOgImage;
    const finalOgUrl = ogUrl || window.location.href;

    const ogTags = [
      { property: 'og:title', content: finalOgTitle },
      { property: 'og:description', content: finalOgDescription },
      { property: 'og:type', content: ogType },
      { property: 'og:url', content: finalOgUrl },
      { property: 'og:image', content: finalOgImage },
      { property: 'og:site_name', content: 'Vorkana' },
    ];

    ogTags.forEach(tag => {
      updateOrCreate('meta', tag);
    });

    // === 5. Twitter ===
    const twitterTags = [
      { name: 'twitter:card', content: twitterCard },
      { name: 'twitter:site', content: twitterSite },
      { name: 'twitter:title', content: finalOgTitle },
      { name: 'twitter:description', content: finalOgDescription },
      { name: 'twitter:image', content: finalOgImage },
      { name: 'twitter:creator', content: twitterSite },
    ];

    twitterTags.forEach(tag => {
      updateOrCreate('meta', tag);
    });

    // === 6. Canonical ===
    if (canonical) {
      const fullCanonical = canonical.startsWith('http') ? canonical : `${baseUrl}${canonical}`;
      updateOrCreate('link', { rel: 'canonical', href: fullCanonical }, 'href');
    } else {
      // Add self-referencing canonical by default
      updateOrCreate('link', { rel: 'canonical', href: window.location.href }, 'href');
    }

    // === 7. Alternate Languages ===
    alternateLanguages.forEach(({ href, hreflang }) => {
      if (href && hreflang) {
        updateOrCreate('link', { rel: 'alternate', hreflang, href }, 'href');
      }
    });

    // === 8. Remove old structured data scripts ===
    // Remove all existing scripts created by this component
    document.querySelectorAll('script[data-seo]').forEach(script => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    });

    // Filter out any previously created script elements
    createdElements.current = createdElements.current.filter(el => el.tagName !== 'SCRIPT');

    // === 9. Breadcrumb Structured Data ===
    if (breadcrumb.length > 0) {
      const breadcrumbSchema = {
        "@context": "https://schema.org", // KEEP THIS AS schema.org
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
      createdElements.current.push(scriptEl);
    }

    // === 10. General Structured Data ===
    const dataToAdd = Array.isArray(structuredData) ? structuredData : structuredData ? [structuredData] : [];
    dataToAdd.forEach((data, index) => {
      if (!data) return;
      
      // Ensure context is always schema.org
      const sanitizedData = { ...data };
      if (sanitizedData["@context"] !== "https://schema.org") {
        sanitizedData["@context"] = "https://schema.org";
      }

      const scriptEl = document.createElement('script');
      scriptEl.type = 'application/ld+json';
      scriptEl.text = JSON.stringify(sanitizedData);
      scriptEl.dataset.seo = `custom-${index}`;
      document.head.appendChild(scriptEl);
      createdElements.current.push(scriptEl);
    });

    // Add website structured data by default
    const websiteSchema = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "Vorkana",
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
    createdElements.current.push(websiteScript);

    isInitialMount.current = false;

    // === Cleanup ===
    return () => {
      if (!isInitialMount.current) {
        // Only restore title if we're unmounting (not during navigation)
        const isNavigating = performance.getEntriesByType("navigation")[0]?.type === "navigate";
        
        if (!isNavigating && originalTitle.current) {
          document.title = originalTitle.current;
        }

        // Remove only elements we created (except on unmount during SPA navigation)
        createdElements.current.forEach((el) => {
          if (el?.parentNode) {
            // Keep canonical and OG tags during SPA navigation
            if (el.tagName === 'LINK' && el.getAttribute('rel') === 'canonical') {
              return; // Keep canonical
            }
            if (el.tagName === 'META' && el.getAttribute('property')?.startsWith('og:')) {
              return; // Keep OG tags
            }
            if (el.tagName === 'META' && el.getAttribute('name')?.startsWith('twitter:')) {
              return; // Keep Twitter tags
            }
            
            el.parentNode.removeChild(el);
          }
        });
        
        // Reset array but keep track of what was removed
        createdElements.current = createdElements.current.filter(el => 
          el?.parentNode && 
          el.tagName !== 'LINK' && 
          !(el.tagName === 'META' && el.getAttribute('property')?.startsWith('og:')) &&
          !(el.tagName === 'META' && el.getAttribute('name')?.startsWith('twitter:'))
        );
      }
    };
  }, [
    title,
    description,
    keywords,
    canonical,
    structuredData,
    ogTitle,
    ogDescription,
    ogImage,
    ogType,
    ogUrl,
    twitterCard,
    twitterSite,
    robots,
    lang,
    alternateLanguages,
    breadcrumb,
  ]);

  return <>{children}</>;
};