
import React, { useState, useEffect, useCallback, useRef, useMemo,memo } from 'react';
import { Search, X, Clock, TrendingUp, Loader2, Sparkles, ChevronRight, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavbarSearch } from '../../hooks/useSearch';


const SuggestionItem = memo(({ item, index, isFocused, onClick }) => {
  const handleClick = useCallback(() => {
    onClick(item);
  }, [item, onClick]);
  
  return (
    <button
      onClick={handleClick}
      className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
        isFocused ? 'bg-gray-50' : 'hover:bg-gray-50'
      }`}
      role="option"
      aria-selected={isFocused}
    >
      <div className="flex items-center gap-3">
        {item.type === 'recent' ? (
          <History className="w-4 h-4 text-gray-400" />
        ) : item.type === 'popular' ? (
          <TrendingUp className="w-4 h-4 text-gray-400" />
        ) : (
          <Search className="w-4 h-4 text-gray-400" />
        )}
        <span className="text-gray-700 font-medium truncate">
          {item.title || item.query || item.text}
        </span>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400" />
    </button>
  );
});

SuggestionItem.displayName = 'SuggestionItem';

const SearchComponent = ({ 
  initialQuery = '',
  placeholder = "Find services, gigs, or categories...",
  variant = "navbar",
  className = "",
  autoFocus = false,
  onSearch,
  showSuggestions = true,
  size = "default"
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
    clearSearch: clearSearchHook,
    getRecentSearches
  } = useNavbarSearch();
  
  const [localQuery, setLocalQuery] = useState(initialQuery || searchQuery);
  const [showDropdown, setShowDropdown] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState([]);
  const [popularSearches, setPopularSearches] = useState([]);
  const [isComposing, setIsComposing] = useState(false);
  
  // Load recent and popular searches
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setRecentSearches(parsed.slice(0, 5));
      } catch (err) {
        console.error('Error loading recent searches:', err);
        setRecentSearches([]);
      }
    }
    
    // Default popular searches
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
  
  // Update recent searches periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const searches = getRecentSearches();
      setRecentSearches(searches.slice(0, 5));
    }, 30000);
    
    return () => clearInterval(interval);
  }, [getRecentSearches]);
  
  // Handle query change with debounce
  const handleQueryChange = useCallback((value) => {
    setLocalQuery(value);
    setSearchQuery(value);
    setFocusedIndex(-1);
    
    if (value.length >= 2 && showSuggestions) {
      setShowDropdown(true);
    } else if (value.length === 0) {
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  }, [setSearchQuery, showSuggestions]);
  
  // Handle search
  const handleSearch = useCallback((query = localQuery) => {
    const searchTerm = query.trim();
    if (!searchTerm) return;
    
    handleQuickSearch(searchTerm);
    setShowDropdown(false);
    setFocusedIndex(-1);
    
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
  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    handleSearch();
    if (inputRef.current) {
      inputRef.current.blur();
    }
  }, [handleSearch]);
  
  // Handle key down for keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (isComposing) return;
    
    if (!showDropdown) {
      if (e.key === 'Enter' && localQuery.trim()) {
        handleSubmit(e);
      }
      return;
    }
    
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
        
      case 'Tab':
        setShowDropdown(false);
        setFocusedIndex(-1);
        break;
    }
  }, [showDropdown, localQuery, isComposing, quickSearch.results, recentSearches, popularSearches, focusedIndex, handleSearch, handleSubmit]);
  
  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowDropdown(false);
        setFocusedIndex(-1);
      }
    };
    
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape' && showDropdown) {
        setShowDropdown(false);
        setFocusedIndex(-1);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [showDropdown]);
  
  // Clear search
  const clearSearch = useCallback(() => {
    setLocalQuery('');
    setSearchQuery('');
    clearSearchHook();
    setShowDropdown(true);
    setFocusedIndex(-1);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [clearSearchHook, setSearchQuery]);
  
  // Handle composition events for IME input
  const handleCompositionStart = useCallback(() => {
    setIsComposing(true);
  }, []);
  
  const handleCompositionEnd = useCallback(() => {
    setIsComposing(false);
  }, []);
  
  // Get container class based on variant and size
  const getContainerClass = useCallback(() => {
    const base = 'relative';
    switch(variant) {
      case 'hero':
        return `${base} w-full max-w-3xl mx-auto`;
      case 'navbar':
        return `${base} w-full max-w-2xl`;
      default:
        return `${base} w-full`;
    }
  }, [variant]);
  
  // Get input class based on variant and size
  const getInputClass = useCallback(() => {
    const base = 'w-full bg-white placeholder-gray-500 focus:outline-none';
    let sizeClass = '';
    
    switch(size) {
      case 'sm':
        sizeClass = 'px-3 py-2 text-sm';
        break;
      case 'lg':
        sizeClass = 'px-6 py-4 text-lg';
        break;
      default:
        sizeClass = variant === 'hero' ? 'px-6 py-4 text-lg' : 'px-3 text-[15px]';
    }
    
    return `${base} ${sizeClass}`;
  }, [variant, size]);
  
  // Get suggestions to display
  const displaySuggestions = useMemo(() => {
    if (localQuery.length >= 2) {
      return quickSearch.results || [];
    } else if (localQuery.length === 0 && showDropdown) {
      return [];
    }
    return [];
  }, [localQuery, showDropdown, quickSearch.results]);
  
  const showRecentPopular = localQuery.length === 0 && showDropdown;
  
  return (
    <div ref={searchRef} className={`${getContainerClass()} ${className}`}>
      <form 
        onSubmit={handleSubmit} 
        className={`relative flex items-stretch overflow-hidden border border-gray-300 rounded-[4px] bg-white transition-all hover:border-gray-400 focus-within:border-green-500 focus-within:ring-1 focus-within:ring-green-500 ${
          variant === 'hero' ? 'h-14' : size === 'sm' ? 'h-10' : 'h-10'
        }`}
        role="search"
        aria-label="Site search"
      >
        <div className="relative flex-1 flex items-center">
          {/* Input Field */}
          <input
            ref={inputRef}
            type="search"
            value={localQuery}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => setShowDropdown(true)}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            placeholder={placeholder}
            autoFocus={autoFocus}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            enterKeyHint="search"
            className={getInputClass()}
            aria-label="Search"
            aria-expanded={showDropdown}
            aria-controls="search-suggestions"
            aria-autocomplete="list"
            aria-haspopup="listbox"
          />
          
          {/* Action Icons */}
          <div className="flex items-center gap-1 px-2">
            {quickSearch.isLoading && localQuery.length >= 2 && (
              <Loader2 
                className="w-4 h-4 text-gray-400 animate-spin" 
                aria-label="Loading suggestions"
              />
            )}
            {localQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Clear search"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
        </div>

        {/* Search Button */}
        <button 
          type="submit"
          className="bg-[#222325] hover:bg-black transition-colors px-5 flex items-center justify-center border-l border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          aria-label="Submit search"
        >
          <Search 
            className={variant === 'hero' ? 'w-6 h-6' : 'w-5 h-5'} 
            style={{ color: 'white' }}
          />
        </button>
      </form>
      
      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            id="search-suggestions"
            role="listbox"
            aria-label="Search suggestions"
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
                    <SuggestionItem
                      key={`recent-${index}`}
                      item={{ ...item, type: 'recent' }}
                      index={index}
                      isFocused={focusedIndex === index}
                      onClick={(item) => handleSearch(item.query)}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* Popular Searches */}
            {showRecentPopular && (
              <div className="p-3 border-b border-gray-100">
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
            {localQuery.length >= 2 && displaySuggestions.map((item, index) => {
              const adjustedIndex = index + (showRecentPopular ? recentSearches.length : 0);
              return (
                <SuggestionItem
                  key={`suggestion-${index}`}
                  item={item}
                  index={adjustedIndex}
                  isFocused={focusedIndex === adjustedIndex}
                  onClick={(item) => handleSearch(item.title || item.text)}
                />
              );
            })}
            
            {/* No Results */}
            {localQuery.length >= 2 && !quickSearch.isLoading && displaySuggestions.length === 0 && (
              <div className="p-6 text-center">
                <p className="text-gray-600 text-sm">
                  No results found for "{localQuery}"
                </p>
              </div>
            )}
            
            {/* Loading State */}
            {quickSearch.isLoading && localQuery.length >= 2 && (
              <div className="p-4 text-center">
                <Loader2 className="w-5 h-5 text-gray-400 animate-spin mx-auto" />
                <p className="text-xs text-gray-500 mt-2">Finding suggestions...</p>
              </div>
            )}
            
            {/* Search Hint */}
            {localQuery.length === 1 && (
              <div className="p-3 border-t border-gray-100 bg-gray-50">
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

export default memo(SearchComponent);