// SearchComponent.jsx - Updated
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, Clock, ChevronRight, Loader2, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

const SearchComponent = ({ 
  initialQuery = '',
  placeholder = "Find services...",
  variant = "navbar",
  className = "",
  autoFocus = false
}) => {
  const navigate = useNavigate();
  const searchRef = useRef(null);
  
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [trendingSearches, setTrendingSearches] = useState([]);
  
  // Load recent searches
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
    setTrendingSearches([
      'Logo Design',
      'Website Development',
      'Social Media Marketing',
      'SEO Services',
      'Content Writing'
    ]);
  }, []);
  
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
          setSuggestions(response.data.suggestions);
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
    navigate(`/search?query=${encodeURIComponent(searchQuery.trim())}`);
    setShowDropdown(false);
  }, [navigate, saveRecentSearch]);
  
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

  return (
    <div ref={searchRef} className={`relative ${className}`}>
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
          onFocus={() => query.length >= 2 && setShowDropdown(true)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={`
            w-full px-4 py-3 pl-12 text-sm border border-gray-300 
            focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent 
            transition-all duration-200 bg-white
            ${variant === 'navbar' ? 'rounded-full' : 'rounded-lg'}
          `}
        />
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        
        {query && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
        
        {isLoading && (
          <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
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
            className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50"
          >
            {/* Suggestions Section */}
            {query.length >= 2 && suggestions.length > 0 && (
              <div className="py-2">
                <div className="px-4 pt-3 pb-2">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                    Suggestions
                  </div>
                </div>
                <div className="space-y-0.5">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={`${suggestion.type || 'item'}-${index}`}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left group transition-colors duration-150"
                    >
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Search className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 group-hover:text-green-600 truncate">
                          {formatSuggestionTitle(suggestion.title || suggestion.text)}
                        </div>
                        {suggestion.rating > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="w-3 h-3 text-yellow-400 fill-current" />
                            <span className="text-xs text-gray-500">
                              {suggestion.rating.toFixed(1)} ({suggestion.reviewsCount || 0} reviews)
                            </span>
                          </div>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Empty Query State */}
            {query.length < 2 && (
              <>
                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <div className="py-2 border-t border-gray-100">
                    <div className="px-4 pt-3 pb-2">
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
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left transition-colors duration-150"
                        >
                          <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-700 truncate">{search.query}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Trending Searches */}
                <div className="py-2 border-t border-gray-100">
                  <div className="px-4 pt-3 pb-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <TrendingUp className="w-4 h-4" />
                      Trending Searches
                    </div>
                  </div>
                  <div className="px-4 pb-3">
                    <div className="flex flex-wrap gap-2">
                      {trendingSearches.map((term, index) => (
                        <button
                          key={index}
                          onClick={() => handleSearch(term)}
                          className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-150"
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
              <div className="py-6 px-4 text-center">
                <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No results found for "{query}"</p>
              </div>
            )}
            
            {/* Search Action Button */}
            {query.length >= 2 && (
              <div className="border-t border-gray-100">
                <button
                  onClick={() => handleSearch(query)}
                  className="w-full flex items-center justify-center gap-2 p-3 text-green-600 font-medium hover:bg-gray-50 transition-colors duration-150"
                >
                  <Search className="w-4 h-4" />
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

// Star component for ratings
const Star = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

export default SearchComponent;