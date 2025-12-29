// SearchComponent.jsx - Updated with new API integration
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, Clock, TrendingUp, Loader2, Sparkles, ChevronRight, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavbarSearch } from '../../hooks/useSearch';

const SearchComponent = ({ 
  initialQuery = '',
  placeholder = "Find services, gigs, or categories...",
  variant = "navbar",
  className = "",
  autoFocus = false,
  onSearch,
  showSuggestions = true
}) => {
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const inputRef = useRef(null);
  
  const {
    searchQuery,
    setSearchQuery,
    debouncedQuery,
    quickSearch,
    handleQuickSearch,
    clearSearch: clearSearchHook
  } = useNavbarSearch();
  
  const [localQuery, setLocalQuery] = useState(initialQuery || searchQuery);
  const [showDropdown, setShowDropdown] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [popularSearches, setPopularSearches] = useState([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  
  // Load recent and popular searches
  useEffect(() => {
    // Load recent searches from localStorage
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setRecentSearches(parsed.slice(0, 5));
      } catch (err) {
        console.error('Error loading recent searches:', err);
      }
    }
    
    // Set default popular searches
    setPopularSearches([
      'Logo Design',
      'Website Development',
      'Social Media Marketing',
      'Content Writing',
      'Video Editing',
      'SEO Services'
    ]);
  }, []);
  
  // Sync local query with hook query
  useEffect(() => {
    if (searchQuery !== localQuery) {
      setLocalQuery(searchQuery);
    }
  }, [searchQuery]);
  
  // Handle query change
  const handleQueryChange = (value) => {
    setLocalQuery(value);
    setSearchQuery(value);
    setFocusedIndex(-1);
    
    if (value.length >= 2 && showSuggestions) {
      setShowDropdown(true);
    } else if (value.length === 0) {
      setShowDropdown(true); // Show recent/popular when empty
    } else {
      setShowDropdown(false);
    }
  };
  
  // Handle search
  const handleSearch = useCallback((query = localQuery) => {
    const searchTerm = query.trim();
    if (!searchTerm) return;
    
    handleQuickSearch(searchTerm);
    setShowDropdown(false);
    
    if (onSearch) {
      onSearch(searchTerm);
    } else {
      navigate(`/search?query=${encodeURIComponent(searchTerm)}&type=services`);
    }
    
    // Save to recent searches
    const recent = JSON.parse(localStorage.getItem('recentSearches') || '[]');
    const updated = [
      { query: searchTerm, timestamp: new Date().toISOString(), type: 'search' },
      ...recent.filter(item => item.query.toLowerCase() !== searchTerm.toLowerCase())
    ].slice(0, 10);
    
    localStorage.setItem('recentSearches', JSON.stringify(updated));
    setRecentSearches(updated.slice(0, 5));
  }, [localQuery, navigate, onSearch, handleQuickSearch]);
  
  // Handle form submit
  const handleSubmit = (e) => {
    e.preventDefault();
    handleSearch();
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };
  
  // Handle key down for keyboard navigation
  const handleKeyDown = (e) => {
    if (!showDropdown) return;
    
    const allSuggestions = [
      ...(localQuery.length >= 2 ? (quickSearch.results || []) : []),
      ...(localQuery.length === 0 ? recentSearches.map(s => ({ ...s, type: 'recent' })) : []),
      ...(localQuery.length === 0 ? popularSearches.map(p => ({ title: p, type: 'popular' })) : [])
    ];
    
    switch(e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev < allSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev > 0 ? prev - 1 : allSuggestions.length - 1
        );
        break;
        
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && allSuggestions[focusedIndex]) {
          const item = allSuggestions[focusedIndex];
          handleSearch(item.title || item.query || item.text);
        } else {
          handleSearch();
        }
        break;
        
      case 'Escape':
        setShowDropdown(false);
        setFocusedIndex(-1);
        break;
    }
  };
  
  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowDropdown(false);
        setFocusedIndex(-1);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Clear search
  const clearSearch = () => {
    setLocalQuery('');
    setSearchQuery('');
    clearSearchHook();
    setShowDropdown(true);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };
  
  // Format suggestion title
  const formatSuggestionTitle = (title) => {
    if (!title) return '';
    return title.replace(/\s*\(\d+\)\s*$/, '').replace(/\s*\d+\s*$/, '').trim();
  };
  
  // Get container class based on variant
  const getContainerClass = () => {
    const base = 'relative';
    switch(variant) {
      case 'hero':
        return `${base} w-full max-w-3xl mx-auto`;
      case 'navbar':
        return `${base} w-full max-w-2xl`;
      default:
        return `${base} w-full`;
    }
  };
  
  // Get input class based on variant
  const getInputClass = () => {
  const base = 'w-full bg-white placeholder-gray-500 focus:outline-none';
  switch(variant) {
    case 'hero':
      // Keeps hero larger but matches the new sharp style
      return `${base} px-6 py-4 text-lg`;
    case 'navbar':
    default:
      // Slimmer, clean text for the navbar
      return `${base} px-3 text-[15px]`;
  }
};

  // Get suggestions to display
  const getDisplaySuggestions = () => {
    if (localQuery.length >= 2) {
      return quickSearch.results || [];
    } else if (localQuery.length === 0 && showDropdown) {
      return [];
    }
    return [];
  };
  
  const displaySuggestions = getDisplaySuggestions();
  const showRecentPopular = localQuery.length === 0 && showDropdown;

  return (
  <div ref={searchRef} className={`${getContainerClass()} ${className}`}>
    <form 
      onSubmit={handleSubmit} 
      className={`relative flex items-stretch overflow-hidden border border-gray-300 rounded-[4px] bg-white transition-colors hover:border-gray-400 ${
        variant === 'hero' ? 'h-14' : 'h-10'
      }`}
    >
      <div className="relative flex-1 flex items-center">
        {/* Input Field */}
        <input
          ref={inputRef}
          type="text"
          value={localQuery}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={getInputClass()}
          aria-label="Search"
          aria-expanded={showDropdown}
          aria-controls="search-suggestions"
        />
        
        {/* Action Icons (Loading/Clear) */}
        <div className="flex items-center gap-1 px-2">
          {quickSearch.isLoading && (
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          )}
          {localQuery && (
            <button
              type="button"
              onClick={clearSearch}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* High-Contrast Search Button (The "Fiverr" look) */}
      <button 
        type="submit"
        className="bg-[#222325] hover:bg-black transition-colors px-5 flex items-center justify-center border-l border-gray-300"
      >
        <Search className={`${variant === 'hero' ? 'w-6 h-6' : 'w-5 h-5'} text-white`} />
      </button>
    </form>
    
    {/* Suggestions Dropdown (Styled to match the sharp edges) */}
    <AnimatePresence>
      {showDropdown && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.15 }}
          id="search-suggestions"
          role="listbox"
          className="absolute top-[calc(100%+4px)] w-full bg-white rounded-sm shadow-2xl border border-gray-200 z-50 max-h-96 overflow-y-auto"
        >
            {/* Recent Searches */}
            {showRecentPopular && recentSearches.length > 0 && (
              <div className="p-3 border-b border-gray-100">
                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-2">
                  <History className="w-4 h-4" />
                  <span>Recent Searches</span>
                </div>
                <div className="space-y-1">
                  {recentSearches.map((item, index) => (
                    <button
                      key={`recent-${index}`}
                      onClick={() => handleSearch(item.query)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded hover:bg-gray-50 text-left text-sm text-gray-700 ${focusedIndex === index ? 'bg-gray-50' : ''}`}
                      role="option"
                      aria-selected={focusedIndex === index}
                    >
                      <div className="flex items-center gap-3">
                        <History className="w-4 h-4 text-gray-400" />
                        <span>{item.query}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Popular Searches */}
            {showRecentPopular && (
              <div className="p-3">
                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-2">
                  <TrendingUp className="w-4 h-4" />
                  <span>Popular Searches</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {popularSearches.map((search, index) => (
                    <button
                      key={`popular-${index}`}
                      onClick={() => handleSearch(search)}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-full transition-colors"
                      role="option"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Quick Search Results */}
           {localQuery.length >= 2 && displaySuggestions.map((item, index) => (
            <button
              key={`suggestion-${index}`}
              onClick={() => handleSearch(item.title || item.text)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left text-sm border-b border-gray-50 last:border-0 ${
                focusedIndex === index ? 'bg-gray-50' : ''
              }`}
            >
              <Search className="w-4 h-4 text-gray-400" />
              <span className="text-gray-700 font-medium">{item.title || item.text}</span>
            </button>
          ))}
            {/* No Results */}
            {localQuery.length >= 2 && !quickSearch.isLoading && displaySuggestions.length === 0 && (
              <div className="p-6 text-center">
                <div className="text-3xl mb-2">🔍</div>
                <p className="text-gray-600 text-sm">
                  No results found for "{localQuery}"
                </p>
              </div>
            )}
            
            {/* Loading State */}
            {quickSearch.isLoading && localQuery.length >= 2 && (
              <div className="p-4 text-center">
                <Loader2 className="w-5 h-5 text-gray-400 animate-spin mx-auto" />
              </div>
            )}
            
            {/* Search Hint */}
            {localQuery.length === 1 && (
              <div className="p-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 text-center">
                  Type at least 2 characters to see suggestions
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchComponent;