// main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryProvider } from './providers/QueryProvider';
import { AppProvider } from './context/AppContext';
import './index.css';
import App from './App';

const addBaseMetaTags = () => {
  if (typeof document !== 'undefined') {
    // Viewport
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      viewport.content = 'width=device-width, initial-scale=1';
      document.head.appendChild(viewport);
    }

    // Charset
    let charset = document.querySelector('meta[charset]');
    if (!charset) {
      charset = document.createElement('meta');
      charset.charset = 'UTF-8';
      document.head.appendChild(charset);
    }

    // Theme color
    let themeColor = document.querySelector('meta[name="theme-color"]');
    if (!themeColor) {
      themeColor = document.createElement('meta');
      themeColor.name = 'theme-color';
      themeColor.content = '#10b981'; // Emerald color
      document.head.appendChild(themeColor);
    }

    // Add organization structured data
    const orgScript = document.createElement('script');
    orgScript.type = 'application/ld+json';
    orgScript.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Vorkanna",
      "url": typeof window !== 'undefined' ? window.location.origin : '/',
      "logo": `${window.location.origin}/logo.png`,
      "description": "Global marketplace connecting talent with businesses across 100+ service categories"
    });
    document.head.appendChild(orgScript);
  }
};

// Call the function to add meta tags
addBaseMetaTags();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryProvider>
      <AppProvider>
        <App />
      </AppProvider>
    </QueryProvider>
  </React.StrictMode>
);