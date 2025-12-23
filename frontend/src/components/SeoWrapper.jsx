import React, { useEffect, useRef } from 'react';

export const SeoWrapper = ({
  children,
  title = 'Create Service | Vorkana',
  description = 'Create and publish your freelance service on Vorkana marketplace. Reach thousands of potential clients worldwide.',
  keywords = 'create service, freelance, gig, offer services, sell skills, freelancer, marketplace',
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
  const originalTitle = useRef(typeof document !== 'undefined' ? document.title : '');

  useEffect(() => {
    if (typeof document === 'undefined') return;

    // === 1. Title ===
    const fullTitle = title.includes('Vorkana') ? title : `${title} | Vorkana`;
    document.title = fullTitle;

    // === 2. Language ===
    document.documentElement.lang = lang;

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
      }

      if (contentAttr) el.setAttribute(contentAttr, attributes[contentAttr] || '');
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
    const finalOgTitle = ogTitle || title;
    const finalOgDescription = ogDescription || description;
    const baseUrl = window.location.origin;
    const finalOgImage = ogImage || `${baseUrl}/images/og-create-service.jpg`;
    const finalOgUrl = ogUrl || window.location.href;

    updateOrCreate('meta', { property: 'og:title', content: finalOgTitle });
    updateOrCreate('meta', { property: 'og:description', content: finalOgDescription });
    updateOrCreate('meta', { property: 'og:type', content: ogType });
    updateOrCreate('meta', { property: 'og:url', content: finalOgUrl });
    updateOrCreate('meta', { property: 'og:image', content: finalOgImage });

    // === 5. Twitter ===
    updateOrCreate('meta', { name: 'twitter:card', content: twitterCard });
    updateOrCreate('meta', { name: 'twitter:site', content: twitterSite });
    updateOrCreate('meta', { name: 'twitter:title', content: finalOgTitle });
    updateOrCreate('meta', { name: 'twitter:description', content: finalOgDescription });
    updateOrCreate('meta', { name: 'twitter:image', content: finalOgImage });

    // === 6. Canonical ===
    if (canonical) {
      updateOrCreate('link', { rel: 'canonical', href: canonical }, 'href');
    }

    // === 7. Alternate Languages ===
    alternateLanguages.forEach(({ href, hreflang }) => {
      if (href && hreflang) {
        updateOrCreate('link', { rel: 'alternate', hreflang, href }, 'href');
      }
    });

    // === 8. Breadcrumb (if provided) ===
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

      const scriptEl = document.createElement('script');
      scriptEl.type = 'application/ld+json';
      scriptEl.text = JSON.stringify(breadcrumbSchema);
      scriptEl.dataset.seo = 'breadcrumb';
      document.head.appendChild(scriptEl);
      createdElements.current.push(scriptEl);
    }

    // === 9. General Structured Data ===
    const dataToAdd = Array.isArray(structuredData) ? structuredData : structuredData ? [structuredData] : [];
    dataToAdd.forEach((data, index) => {
      if (!data) return;
      const scriptEl = document.createElement('script');
      scriptEl.type = 'application/ld+json';
      scriptEl.text = JSON.stringify(data);
      scriptEl.dataset.seo = `custom-${index}`;
      document.head.appendChild(scriptEl);
      createdElements.current.push(scriptEl);
    });

    // === Cleanup ===
    return () => {
      // Restore original title
      document.title = originalTitle.current || 'Vorkana';

      // Remove all elements we created
      createdElements.current.forEach((el) => {
        if (el?.parentNode) el.parentNode.removeChild(el);
      });
      createdElements.current = [];
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