// SeoWrapper.jsx
import React, { useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

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
  const location = useLocation();
  const createdElements = useRef([]);
  const originalTitle = useRef(null);
  const isMounted = useRef(false);
  const previousPathname = useRef('');

  // Memoize the full title to prevent unnecessary recalculations
  const fullTitle = useMemo(() => {
    if (title.includes('Vorkana') || title.includes('|')) {
      return title;
    }
    return `${title} | Vorkana`;
  }, [title]);

  // Memoize other derived values
  const finalOgTitle = useMemo(() => ogTitle || fullTitle, [ogTitle, fullTitle]);
  const finalOgDescription = useMemo(() => ogDescription || description, [ogDescription, description]);
  const finalOgUrl = useMemo(() => ogUrl || window.location.href, [ogUrl]);
  const baseUrl = useMemo(() => window.location.origin, []);
  const defaultOgImage = useMemo(() => `${baseUrl}/images/og-default.jpg`, [baseUrl]);
  const finalOgImage = useMemo(() => ogImage || defaultOgImage, [ogImage, defaultOgImage]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    // Store original title on first mount
    if (originalTitle.current === null) {
      originalTitle.current = document.title;
    }

    // Skip if we're still on the same page (React re-render)
    const currentPath = window.location.pathname + window.location.search;
    if (isMounted.current && currentPath === previousPathname.current) {
      return;
    }

    previousPathname.current = currentPath;

    // Helper function to create or update meta/link elements
    const updateOrCreate = (tagName, attributes, contentAttr = 'content') => {
      let selector = '';
      if (tagName === 'meta') {
        if (attributes.property) {
          selector = `meta[property="${attributes.property}"]`;
        } else if (attributes.name) {
          selector = `meta[name="${attributes.name}"]`;
        }
      } else if (tagName === 'link') {
        selector = `link[rel="${attributes.rel}"]`;
        if (attributes.hreflang) {
          selector += `[hreflang="${attributes.hreflang}"]`;
        }
      }

      let el = selector ? document.querySelector(selector) : null;

      if (!el) {
        el = document.createElement(tagName);
        Object.keys(attributes).forEach(key => {
          el.setAttribute(key, attributes[key]);
        });
        document.head.appendChild(el);
        createdElements.current.push(el);
      } else {
        // Only update if the value has changed
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

    // === 1. Update Title (with microtask to prevent flicker) ===
    requestAnimationFrame(() => {
      if (document.title !== fullTitle) {
        document.title = fullTitle;
      }
    });

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
      { property: 'og:site_name', content: 'Vorkana' },
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
    document.querySelectorAll('script[data-seo]').forEach(script => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    });

    createdElements.current = createdElements.current.filter(el => el.tagName !== 'SCRIPT');

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
      createdElements.current.push(scriptEl);
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
      createdElements.current.push(scriptEl);
    });

    // === 11. Add Default Website Structured Data ===
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

    isMounted.current = true;

    // === Cleanup ===
    return () => {
      // Don't cleanup during SPA navigation, only on unmount
      // We'll rely on the next instance to update the title
    };

  }, [
    location.pathname, // Key dependency - only update on route change
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

  return <>{children}</>;
};