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
    
    // Call the onSearch prop if provided
    if (onSearch) {
      onSearch(searchQuery);
    } else {
      // Default navigation behavior
      navigate(`/search/services?query=${encodeURIComponent(searchQuery.trim())}`);
    }
    
    setShowDropdown(false);
  }, [navigate, saveRecentSearch, onSearch]);
  
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
    <div ref={searchRef} className={`relative ${getContainerClass()} ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.length >= 2) {
              setShowDropdown(true);
            }
          }}
          onFocus={() => {
            if (query.length >= 2 || recentSearches.length > 0 || trendingSearches.length > 0) {
              setShowDropdown(true);
            }
          }}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={getInputClass()}
        />
        <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        
        {query && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-6 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        )}
        
        {isLoading && (
          <div className="absolute right-12 top-1/2 transform -translate-y-1/2">
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          </div>
        )}
      </form>
      
      {/* Dropdown */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50 max-h-[500px] overflow-y-auto"
          >
            {/* Suggestions Section */}
            {query.length >= 2 && suggestions.length > 0 && (
              <div className="py-2">
                <div className="px-6 pt-4 pb-3">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Top Suggestions
                  </div>
                </div>
                <div className="space-y-0.5">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={`${suggestion.type || 'item'}-${index}`}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full flex items-center gap-4 px-6 py-3 hover:bg-gray-50 text-left group transition-colors duration-150"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Search className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 group-hover:text-green-600 truncate">
                          {suggestion.title}
                        </div>
                        {suggestion.rating > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="w-4 h-4 text-yellow-400 fill-current" />
                            <span className="text-xs text-gray-500">
                              {suggestion.rating.toFixed(1)} ({suggestion.reviewsCount || 0} reviews)
                            </span>
                          </div>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Empty Query State */}
            {query.length < 2 && (
              <>
                {/* Popular Categories */}
                {popularCategories.length > 0 && (
                  <div className="py-4 border-t border-gray-100">
                    <div className="px-6 pb-3">
                      <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <TrendingUp className="w-4 h-4" />
                        Popular Categories
                      </div>
                    </div>
                    <div className="px-6 pb-4">
                      <div className="grid grid-cols-2 gap-3">
                        {popularCategories.map((category, index) => (
                          <button
                            key={index}
                            onClick={() => handleCategoryClick(category)}
                            className="p-3 text-sm bg-gray-50 hover:bg-green-50 hover:text-green-700 text-gray-700 rounded-xl transition-all duration-150 text-left group"
                          >
                            <div className="font-medium mb-1">{category.name}</div>
                            <div className="text-xs text-gray-500 group-hover:text-green-600">
                              {category.servicesCount || 0} services
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <div className="py-4 border-t border-gray-100">
                    <div className="px-6 pb-3">
                      <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <Clock className="w-4 h-4" />
                        Recent Searches
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      {recentSearches.map((search, index) => (
                        <button
                          key={index}
                          onClick={() => handleSearch(search.query)}
                          className="w-full flex items-center gap-4 px-6 py-3 hover:bg-gray-50 text-left transition-colors duration-150"
                        >
                          <Clock className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-700 truncate">{search.query}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Trending Searches */}
                <div className="py-4 border-t border-gray-100">
                  <div className="px-6 pb-3">
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <TrendingUp className="w-4 h-4" />
                      Trending Now
                    </div>
                  </div>
                  <div className="px-6 pb-4">
                    <div className="flex flex-wrap gap-2">
                      {trendingSearches.map((term, index) => (
                        <button
                          key={index}
                          onClick={() => handleSearch(term)}
                          className="px-4 py-2 text-sm bg-gradient-to-r from-green-50 to-blue-50 hover:from-green-100 hover:to-blue-100 text-gray-700 rounded-lg transition-all duration-150 hover:scale-105"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
            
            {/* No Results */}
            {query.length >= 2 && suggestions.length === 0 && !isLoading && (
              <div className="py-8 px-6 text-center">
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No results found for "{query}"</p>
                <p className="text-gray-400 text-xs mt-1">Try different keywords or check spelling</p>
              </div>
            )}
            
            {/* Search Action Button */}
            {query.length >= 2 && (
              <div className="border-t border-gray-100">
                <button
                  onClick={() => handleSearch(query)}
                  className="w-full flex items-center justify-center gap-3 p-4 text-green-600 font-medium hover:bg-gray-50 transition-colors duration-150 text-lg"
                >
                  <Search className="w-5 h-5" />
                  Search for "{query}"
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchComponent;