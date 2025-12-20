import React from 'react';
import { Link } from 'react-router-dom';
import { buildUrl } from '../utils/urlBuilder';

const TrackedLink = ({ 
  to, 
  children, 
  source, 
  medium = 'website', 
  campaign,
  className = '',
  ...props 
}) => {
  const handleClick = () => {
    // Send click event to analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'link_click', {
        event_category: 'navigation',
        event_label: to,
        link_url: to,
        source: source,
        medium: medium,
        campaign: campaign
      });
    }
    
    // Also send to Google Analytics 4
    if (typeof window !== 'undefined' && window.dataLayer) {
      window.dataLayer.push({
        event: 'link_click',
        link_url: to,
        link_source: source,
        link_medium: medium,
        link_campaign: campaign
      });
    }
  };

  const urlWithParams = buildUrl(to, { 
    source: source || 'direct',
    medium: medium,
    campaign: campaign,
    utm_source: source || 'direct',
    utm_medium: medium,
    utm_campaign: campaign
  });

  return (
    <Link 
      to={urlWithParams} 
      onClick={handleClick} 
      className={className}
      {...props}
    >
      {children}
    </Link>
  );
};

export default TrackedLink;