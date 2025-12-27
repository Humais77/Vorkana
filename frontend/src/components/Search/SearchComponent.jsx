// src/components/search/SearchComponent.jsx - Enhanced
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, Clock, ChevronRight, Loader2, TrendingUp, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

const SearchComponent = ({ 
  initialQuery = '',
  placeholder = "Find services...",
  variant = "navbar",
  className = "",
  autoFocus = false,
  onSearch
}) => {
  const navigate = useNavigate();
  const searchRef = useRef(null);
  
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [trendingSearches, setTrendingSearches] = useState([]);
  const [popularCategories, setPopularCategories] = useState([]);
  
  // Load recent searches and trending data
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved).slice(0, 5));
      } catch (err) {
        console.error('Error loading recent searches:', err);
      }
    }
    
    // Load trending searches
    loadTrendingData();
    
    // Load popular categories
    loadPopularCategories();
  }, []);
  
  const loadTrendingData = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/search/suggestions`, {
        params: { limit: 5 }
      });
      
      if (response.data.success && response.data.suggestions) {
        const trending = response.data.suggestions
          .filter(s => s.type === 'service')
          .slice(0, 5)
          .map(s => s.title);
        
        setTrendingSearches(trending.length > 0 ? trending : [
          'Logo Design',
          'Website Development',
          'Social Media Marketing',
          'SEO Services',
          'Content Writing'
        ]);
      }
    } catch (error) {
      console.error('Error loading trending data:', error);
      setTrendingSearches([
        'Logo Design',
        'Website Development',
        'Social Media Marketing',
        'SEO Services',
        'Content Writing'
      ]);
    }
  };
  
  const loadPopularCategories = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/categories/popular`);
      
      if (response.data.success && response.data.data) {
        setPopularCategories(response.data.data.slice(0, 6));
      }
    } catch (error) {
      console.error('Error loading popular categories:', error);
    }
  };
  
  // Fetch suggestions
  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(`${API_URL}/api/search/suggestions`, {
          params: {
            query,
            limit: 8
          }
        });
        
        if (response.data.success) {
          const processedSuggestions = response.data.suggestions.map(suggestion => ({
            ...suggestion,
            title: formatSuggestionTitle(suggestion.title || suggestion.text || suggestion),
            type: suggestion.type || 'service'
          }));
          setSuggestions(processedSuggestions);
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [query]);
  
  const saveRecentSearch = useCallback((searchQuery) => {
    if (!searchQuery.trim()) return;
    
    const newSearch = {
      query: searchQuery.trim(),
      timestamp: new Date().toISOString(),
      type: 'search'
    };
    
    const updated = [
      newSearch,
      ...recentSearches.filter(item => 
        item.query.toLowerCase() !== searchQuery.toLowerCase()
      )
    ].slice(0, 5);
    
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  }, [recentSearches]);
  
  const handleSearch = useCallback((searchQuery) => {
    if (!searchQuery.trim()) return;
    saveRecentSearch(searchQuery);
    if (onSearch) {
      onSearch(searchQuery);
    } else {
      navigate(`/search/services?query=${encodeURIComponent(searchQuery.trim())}`);
    }
    setShowDropdown(false);
  }, [navigate, onSearch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSearch(query);
  };
  
  const clearSearch = () => {
    setQuery('');
    setSuggestions([]);
  };
  
  const handleSuggestionClick = (suggestion) => {
    const searchTerm = suggestion.title || suggestion.text || suggestion;
    handleSearch(searchTerm);
  };
  
  const handleCategoryClick = (category) => {
    handleSearch(category.name);
  };
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format suggestion title - remove any trailing numbers/0
  const formatSuggestionTitle = (title) => {
    if (!title) return '';
    // Remove any trailing numbers, parentheses, or counts
    return title.replace(/\s*\(\d+\)\s*$/, '').replace(/\s*\d+\s*$/, '').trim();
  };

  // Variant styles
  const getContainerClass = () => {
    switch(variant) {
      case 'hero':
        return 'w-full max-w-4xl mx-auto';
      case 'navbar':
        return 'w-full max-w-xl';
      default:
        return 'w-full';
    }
  };

  const getInputClass = () => {
    switch(variant) {
      case 'hero':
        return 'w-full px-6 py-4 pl-14 text-lg border-2 border-gray-300 rounded-2xl focus:outline-none focus:ring-4 focus:ring-green-500/30 focus:border-green-500 transition-all duration-200 bg-white shadow-lg';
      case 'navbar':
        return 'w-full px-4 py-3 pl-12 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-white';
      default:
        return 'w-full px-4 py-3 pl-12 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-white';
    }
  };

  return (
  <div ref={searchRef} className={`relative ${className}`}>
    <form 
      onSubmit={handleSubmit} 
      className="flex items-stretch h-10 border border-gray-300 rounded-[4px] bg-white overflow-hidden"
    >
      <div className="relative flex-1">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.length >= 2) setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          // Matching the clean, smaller text and padding from the screenshot
          className="w-full h-full px-3 text-[15px] text-gray-800 placeholder-gray-500 focus:outline-none"
        />
        
        {/* Loading/Clear icons positioned absolutely to not move the text */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {isLoading && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
          {query && (
            <button type="button" onClick={() => setQuery('')} className="p-1 hover:bg-gray-100 rounded-full">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* The high-contrast dark search button (Matches Image 1 & 2) */}
      <button 
        type="submit"
        className="bg-[#222325] hover:bg-black transition-colors px-4 flex items-center justify-center"
      >
        <Search className="w-5 h-5 text-white" />
      </button>
    </form>
    
    {/* Dropdown - Matches the square theme */}
    <AnimatePresence>
      {showDropdown && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 5 }}
          className="absolute top-[calc(100%+4px)] w-full bg-white shadow-xl border border-gray-200 z-50 rounded-sm overflow-hidden"
        >
          {query.length >= 2 && suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => handleSearch(s.title)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left text-sm text-gray-700"
            >
              <Search className="w-3.5 h-3.5 text-gray-400" />
              <span>{s.title}</span>
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);
};

export default SearchComponent;