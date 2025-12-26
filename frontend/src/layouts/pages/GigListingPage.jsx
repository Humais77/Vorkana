// src/pages/GigListingsPage.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  Star,
  Clock,
  DollarSign,
  CheckCircle,
  TrendingUp,
  ChevronDown,
  X,
  Sparkles,
  Heart,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  MapPin,
  Calendar,
  Zap,
  Users,
  ArrowLeft
} from 'lucide-react';
import { useGigs } from '../../hooks/useGigs';
import { useCategories } from '../../hooks/useServices';
import { toast } from 'react-hot-toast';
import { SeoWrapper } from '../../components/SeoWrapper';

const GigListingsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Get query parameters from URL
  const searchQuery = searchParams.get('q') || searchParams.get('query') || searchParams.get('search') || '';
  const categoryId = searchParams.get('category') || '';
  const minBudget = searchParams.get('minBudget') || '';
  const maxBudget = searchParams.get('maxBudget') || '';
  const urgency = searchParams.get('urgency') || '';
  const status = searchParams.get('status') || 'open';
  const sort = searchParams.get('sort') || 'createdAt';
  const page = searchParams.get('page') || '1';
  
  // Local state
  const [searchTerm, setSearchTerm] = useState(searchQuery);
  const [selectedCategory, setSelectedCategory] = useState(categoryId || 'All');
  const [budgetRange, setBudgetRange] = useState([
    minBudget ? parseInt(minBudget) : 0, 
    maxBudget ? parseInt(maxBudget) : 100000
  ]);
  const [selectedUrgency, setSelectedUrgency] = useState(urgency);
  const [selectedStatus, setSelectedStatus] = useState(status);
  const [sortBy, setSortBy] = useState(sort);
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchQuery);
  const [apiError, setApiError] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Helper function to clean query parameters
  const cleanQueryParams = useCallback((params) => {
    const cleaned = {};
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== '' && params[key] !== null) {
        cleaned[key] = params[key];
      }
    });
    return cleaned;
  }, []);

  // API Hooks with cleaned parameters
  const { 
    data: gigsData, 
    isLoading: isLoadingGigs,
    error: gigsError,
    refetch: refetchGigs
  } = useGigs(
    cleanQueryParams({
      page: parseInt(page),
      limit: 12,
      sort: sortBy,
      search: debouncedSearchTerm && debouncedSearchTerm.trim().length >= 2 ? debouncedSearchTerm.trim() : undefined,
      status: selectedStatus !== 'open' ? selectedStatus : undefined,
      category: selectedCategory !== 'All' ? selectedCategory : undefined,
      minBudget: budgetRange[0] > 0 ? budgetRange[0] : undefined,
      maxBudget: budgetRange[1] < 100000 ? budgetRange[1] : undefined,
      urgency: selectedUrgency ? selectedUrgency : undefined,
      includeCategory: true,
      includeClient: true,
      includeSeller: true,
      populate: true
    })
  );

  const { 
    data: categoriesData = [], 
    isLoading: isLoadingCategories 
  } = useCategories();

  // Handle API errors
  useEffect(() => {
    if (gigsError) {
      setApiError(gigsError);
      toast.error(gigsError.message || 'Failed to load gigs');
    } else {
      setApiError(null);
    }
  }, [gigsError]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      // Reset to page 1 when search changes
      if (searchTerm !== searchQuery) {
        setSearchParams(prev => {
          if (searchTerm.trim()) {
            prev.set('q', searchTerm.trim());
          } else {
            prev.delete('q');
          }
          prev.set('page', '1');
          return prev;
        });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, searchQuery, setSearchParams]);

  // Update URL when filters change
  useEffect(() => {
    if (isInitialLoad) {
      setIsInitialLoad(false);
      return;
    }

    const params = new URLSearchParams();
    
    // Always set page first
    if (page !== '1') params.set('page', page);
    
    // Set search term if present
    if (debouncedSearchTerm.trim()) params.set('q', debouncedSearchTerm.trim());
    
    // Set other filters
    if (selectedCategory && selectedCategory !== 'All') params.set('category', selectedCategory);
    if (selectedStatus && selectedStatus !== 'open') params.set('status', selectedStatus);
    if (budgetRange[0] > 0) params.set('minBudget', budgetRange[0]);
    if (budgetRange[1] < 100000) params.set('maxBudget', budgetRange[1]);
    if (selectedUrgency) params.set('urgency', selectedUrgency);
    if (sortBy !== 'createdAt') params.set('sort', sortBy);
    
    // Update URL
    setSearchParams(params, { replace: true });
  }, [selectedCategory, selectedStatus, budgetRange, selectedUrgency, sortBy, page, debouncedSearchTerm, setSearchParams, isInitialLoad]);

  // Handle search
  const handleSearch = useCallback((e) => {
    e?.preventDefault();
    const trimmedTerm = searchTerm.trim();
    
    if (trimmedTerm && trimmedTerm.length >= 2) {
      setDebouncedSearchTerm(trimmedTerm);
    } else if (!trimmedTerm) {
      // Clear search
      setDebouncedSearchTerm('');
      setSearchTerm('');
      setSearchParams(prev => {
        prev.delete('q');
        prev.set('page', '1');
        return prev;
      });
    }
  }, [searchTerm, setSearchParams]);

  // Handle category change
  const handleCategoryChange = useCallback((categoryId) => {
    setSelectedCategory(categoryId);
    setSearchParams(prev => {
      if (categoryId !== 'All') {
        prev.set('category', categoryId);
      } else {
        prev.delete('category');
      }
      prev.set('page', '1');
      return prev;
    });
  }, [setSearchParams]);

  // Handle budget range change
  const handleBudgetRangeChange = useCallback((index, value) => {
    const newRange = [...budgetRange];
    newRange[index] = parseInt(value) || 0;
    setBudgetRange(newRange);
    
    setSearchParams(prev => {
      if (newRange[0] > 0) {
        prev.set('minBudget', newRange[0]);
      } else {
        prev.delete('minBudget');
      }
      if (newRange[1] < 100000) {
        prev.set('maxBudget', newRange[1]);
      } else {
        prev.delete('maxBudget');
      }
      prev.set('page', '1');
      return prev;
    });
  }, [budgetRange, setSearchParams]);

  // Handle urgency change
  const handleUrgencyChange = useCallback((urgencyValue) => {
    setSelectedUrgency(urgencyValue);
    setSearchParams(prev => {
      if (urgencyValue) {
        prev.set('urgency', urgencyValue);
      } else {
        prev.delete('urgency');
      }
      prev.set('page', '1');
      return prev;
    });
  }, [setSearchParams]);

  // Handle status change
  const handleStatusChange = useCallback((statusValue) => {
    setSelectedStatus(statusValue);
    setSearchParams(prev => {
      if (statusValue !== 'open') {
        prev.set('status', statusValue);
      } else {
        prev.delete('status');
      }
      prev.set('page', '1');
      return prev;
    });
  }, [setSearchParams]);

  // Handle sort change
  const handleSortChange = useCallback((e) => {
    setSortBy(e.target.value);
    setSearchParams(prev => {
      if (e.target.value !== 'createdAt') {
        prev.set('sort', e.target.value);
      } else {
        prev.delete('sort');
      }
      prev.set('page', '1');
      return prev;
    });
  }, [setSearchParams]);

  // Handle like (favorite)
  const handleLike = useCallback(async (gigId, e) => {
    e.stopPropagation();
    try {
      // This would be your actual like API call
      setFavorites(prev => 
        prev.includes(gigId) 
          ? prev.filter(id => id !== gigId)
          : [...prev, gigId]
      );
      toast.success(favorites.includes(gigId) ? 'Removed from favorites' : 'Added to favorites');
    } catch (error) {
      toast.error('Failed to update favorites');
    }
  }, [favorites]);

  // Handle view gig details
  const handleViewDetails = useCallback((gigId, slug) => {
    navigate(`/gig/${slug || gigId}`);
  }, [navigate]);

  // Reset filters
  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setSelectedCategory('All');
    setSelectedStatus('open');
    setSelectedUrgency('');
    setBudgetRange([0, 100000]);
    setSortBy('createdAt');
    setSearchParams({ page: '1' });
    setApiError(null);
    setIsInitialLoad(true);
  }, [setSearchParams]);

  // Extract gigs from response
  const gigs = useMemo(() => {
    return gigsData?.data || gigsData?.gigs || [];
  }, [gigsData]);

  const totalGigs = useMemo(() => {
    return gigsData?.pagination?.total || gigs.length || 0;
  }, [gigsData, gigs]);

  // Extract categories from API response
  const categories = useMemo(() => [
    { _id: 'All', name: 'All Categories', icon: '📦' },
    ...(categoriesData?.map(cat => ({ 
      _id: cat._id, 
      name: cat.name,
      icon: cat.icon || '📁'
    })) || [])
  ], [categoriesData]);

  // Sort options
  const sortOptions = useMemo(() => [
    { value: 'createdAt', label: 'Newest First' },
    { value: 'budget_desc', label: 'Budget: High to Low' },
    { value: 'budget_asc', label: 'Budget: Low to High' },
    { value: 'urgent', label: 'Most Urgent' }
  ], []);

  // Urgency options
  const urgencyOptions = useMemo(() => [
    { value: '', label: 'All Urgency' },
    { value: 'high', label: 'High Urgency' },
    { value: 'medium', label: 'Medium Urgency' },
    { value: 'low', label: 'Low Urgency' }
  ], []);

  // Status options
  const statusOptions = useMemo(() => [
    { value: 'open', label: 'Open Gigs' },
    { value: 'assigned', label: 'Assigned Gigs' },
    { value: 'in_progress', label: 'In Progress' }
  ], []);

  // Get gig thumbnail
  const getGigThumbnail = useCallback((gig) => {
    // First priority: Gig thumbnail
    if (gig.thumbnail?.url) {
      return gig.thumbnail.url;
    }
    
    // Second priority: First image from images array
    if (gig.images && gig.images.length > 0 && gig.images[0]?.url) {
      return gig.images[0].url;
    }
    
    // Third priority: Attachments
    if (gig.attachments && gig.attachments.length > 0) {
      return gig.attachments[0];
    }
    
    // Fourth priority: Category-specific default images
    const categoryName = gig.projectCategory?.name?.toLowerCase() || '';
    if (categoryName.includes('design') || categoryName.includes('art')) {
      return 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
    } else if (categoryName.includes('development') || categoryName.includes('programming')) {
      return 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
    } else if (categoryName.includes('writing') || categoryName.includes('content')) {
      return 'https://images.unsplash.com/photo-1455390582262-044cdead277a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
    } else {
      // Default generic gig image
      return 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
    }
  }, []);

  // Get client information
  const getClientInfo = useCallback((gig) => {
    if (gig.createdBy && typeof gig.createdBy === 'object') {
      return {
        username: gig.createdBy.name || 'Client',
        avatar: gig.createdBy.picture || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80',
        verified: gig.createdBy.emailVerified || false
      };
    }
    
    // Fallback
    return {
      username: 'Client',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80',
      verified: false
    };
  }, []);

  // Get current category name for SEO
  const getCurrentCategoryName = useCallback(() => {
    if (selectedCategory === 'All' || !selectedCategory) return null;
    const category = categories.find(cat => cat._id === selectedCategory);
    return category?.name || null;
  }, [selectedCategory, categories]);

  // Memoized SEO functions
  const seoTitle = useMemo(() => {
    const categoryName = getCurrentCategoryName();
    const baseTitle = "Find Freelance Gigs & Projects | Vorkana Marketplace";
    
    if (debouncedSearchTerm && categoryName) {
      return `${debouncedSearchTerm} - ${categoryName} Gigs | Vorkana`;
    } else if (debouncedSearchTerm) {
      return `Search: ${debouncedSearchTerm} | Freelance Gigs & Projects | Vorkana`;
    } else if (categoryName) {
      return `${categoryName} Gigs - Find Freelance Projects | Vorkana`;
    }
    
    return baseTitle;
  }, [debouncedSearchTerm, getCurrentCategoryName]);

  const seoDescription = useMemo(() => {
    const categoryName = getCurrentCategoryName();
    const baseDesc = "Discover thousands of freelance gigs and projects. Find work in design, development, writing, marketing, and more. Start earning today.";
    
    if (debouncedSearchTerm && categoryName) {
      return `Find the best ${categoryName.toLowerCase()} gigs for "${debouncedSearchTerm}". Browse ${totalGigs} freelance projects with budgets, deadlines, and client ratings.`;
    } else if (debouncedSearchTerm) {
      return `Search results for "${debouncedSearchTerm}". Browse ${totalGigs} freelance gigs across all categories. Find projects that match your skills.`;
    } else if (categoryName) {
      return `Browse ${totalGigs} ${categoryName.toLowerCase()} gigs from verified clients. Get paid for your skills with competitive budgets and clear requirements.`;
    }
    
    return baseDesc;
  }, [debouncedSearchTerm, getCurrentCategoryName, totalGigs]);

  // Pagination functions
  const handlePageChange = useCallback((newPage) => {
    setSearchParams(prev => {
      prev.set('page', newPage.toString());
      return prev;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [setSearchParams]);

  // Go back
  const goBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  return (
    <SeoWrapper
      title={seoTitle}
      description={seoDescription}
      keywords={["freelance gigs", "find projects", "freelance work", "online jobs", "remote gigs"]}
      canonical={`/gigs${window.location.search}`}
      ogTitle={seoTitle}
      ogDescription={seoDescription}
      ogImage="https://images.unsplash.com/photo-1519389950473-47ba0277781c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"
      ogType="website"
    >
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16 px-4">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative max-w-7xl mx-auto">
            <div className="text-center">
              <div className="flex items-center justify-center mb-6">
                <button
                  onClick={goBack}
                  className="flex items-center gap-2 text-white/80 hover:text-white transition-colors mr-4"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Back
                </button>
                <h1 className="text-5xl md:text-6xl font-bold mb-4">
                  Find Your Next Gig
                </h1>
              </div>
              <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto">
                Discover freelance projects that match your skills and get paid for your expertise
              </p>
              
              {/* Search Bar */}
              <div className="max-w-3xl mx-auto relative">
                <form onSubmit={handleSearch}>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-6 h-6" />
                    <input
                      type="text"
                      placeholder="Search for gigs by skill or keyword (min. 2 characters)"
                      className="w-full pl-12 pr-24 py-4 rounded-xl text-gray-900 text-lg focus:outline-none focus:ring-4 focus:ring-blue-300 shadow-lg"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      aria-label="Search for gigs"
                      minLength={2}
                    />
                    <button 
                      type="submit"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center min-w-[80px]"
                      disabled={isLoadingGigs}
                      aria-label="Search button"
                    >
                      {isLoadingGigs ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        'Search'
                      )}
                    </button>
                  </div>
                </form>
                
                {/* Quick Categories */}
                {!isLoadingCategories && categories.length > 1 && (
                  <div className="flex flex-wrap justify-center gap-3 mt-6" role="navigation" aria-label="Quick categories">
                    {categories.slice(1, 7).map(category => (
                      <button
                        key={category._id}
                        onClick={() => handleCategoryChange(category._id)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          selectedCategory === category._id
                            ? "bg-white text-blue-600"
                            : "bg-white/20 hover:bg-white/30 text-white"
                        }`}
                        aria-label={`Browse ${category.name} gigs`}
                      >
                        {category.icon} {category.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Error Display */}
          {apiError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6" role="alert">
              <div className="flex items-center text-red-800">
                <AlertCircle className="w-5 h-5 mr-2" />
                <span className="font-medium">Error loading gigs</span>
              </div>
              <p className="text-red-600 text-sm mt-1">
                {apiError.message || 'Please try again or refresh the page'}
              </p>
              <button
                onClick={() => {
                  setApiError(null);
                  refetchGigs();
                }}
                className="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
              >
                Retry
              </button>
            </div>
          )}

          {/* Filters and Sorting Bar */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  aria-expanded={showFilters}
                  aria-controls="filters-section"
                >
                  <Filter className="w-5 h-5" />
                  Filters
                  {showFilters && <X className="w-4 h-4" />}
                </button>
                
                <div className="hidden md:flex items-center gap-4">
                  <span className="text-gray-600">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={handleSortChange}
                    className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    aria-label="Sort gigs by"
                  >
                    {sortOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <span className="text-gray-600">
                  {totalGigs} {debouncedSearchTerm ? 'results' : 'gigs'} found
                </span>
                {(searchTerm || selectedCategory !== 'All' || budgetRange[0] > 0 || budgetRange[1] < 100000 || selectedUrgency || selectedStatus !== 'open' || sortBy !== 'createdAt') && (
                  <button
                    onClick={resetFilters}
                    className="px-4 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>

            {/* Expanded Filters */}
            {showFilters && (
              <div id="filters-section" className="mt-6 pt-6 border-t grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Budget Range: ${budgetRange[0]} - ${budgetRange[1]}
                  </label>
                  <div className="space-y-4">
                    <div className="relative">
                      <input
                        type="range"
                        min="0"
                        max="100000"
                        step="100"
                        value={budgetRange[0]}
                        onChange={(e) => handleBudgetRangeChange(0, e.target.value)}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        aria-label="Minimum budget filter"
                      />
                    </div>
                    <div className="relative">
                      <input
                        type="range"
                        min="0"
                        max="100000"
                        step="100"
                        value={budgetRange[1]}
                        onChange={(e) => handleBudgetRangeChange(1, e.target.value)}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        aria-label="Maximum budget filter"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500 mt-2">
                    <span>$0</span>
                    <span>$100,000</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categories
                  </label>
                  <div className="max-h-48 overflow-y-auto space-y-1" role="listbox">
                    {categories.map(category => (
                      <button
                        key={category._id}
                        onClick={() => handleCategoryChange(category._id)}
                        className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                          selectedCategory === category._id
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                        role="option"
                        aria-selected={selectedCategory === category._id}
                      >
                        <span className="mr-2">{category.icon}</span>
                        {category.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Urgency
                  </label>
                  <div className="space-y-1">
                    {urgencyOptions.map(option => (
                      <button
                        key={option.value}
                        onClick={() => handleUrgencyChange(option.value)}
                        className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                          selectedUrgency === option.value
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <div className="space-y-1">
                    {statusOptions.map(option => (
                      <button
                        key={option.value}
                        onClick={() => handleStatusChange(option.value)}
                        className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                          selectedStatus === option.value
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Loading State */}
          {isLoadingGigs && (
            <div className="flex justify-center items-center py-20">
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">
                  {debouncedSearchTerm ? 'Searching gigs...' : 'Loading gigs...'}
                </p>
              </div>
            </div>
          )}

          {/* Gigs Grid */}
          {!isLoadingGigs && gigs.length > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
                {gigs.map((gig) => {
                  const clientInfo = getClientInfo(gig);
                  const thumbnailUrl = getGigThumbnail(gig);
                  const deliveryTime = gig.timeline ? `${gig.timeline} ${gig.timelineUnit || 'days'}` : 'Custom';
                  
                  return (
                    <article
                      key={gig._id}
                      className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-200 hover:border-blue-300 group cursor-pointer"
                      onClick={() => handleViewDetails(gig._id, gig.slug)}
                    >
                      {/* Gig Image */}
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={thumbnailUrl}
                          alt={gig.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          onError={(e) => {
                            e.target.src = 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                        
                        {/* Favorite Button */}
                        <button
                          onClick={(e) => handleLike(gig._id, e)}
                          className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors z-10"
                          aria-label={`Add ${gig.title} to favorites`}
                        >
                          <Heart
                            className={`w-5 h-5 transition-colors ${
                              favorites.includes(gig._id)
                                ? "fill-red-500 text-red-500"
                                : "text-gray-600 hover:text-red-500"
                            }`}
                          />
                        </button>
                        
                        {/* Urgency Badge */}
                        {gig.urgency === 'high' && (
                          <div className="absolute top-4 left-4 bg-gradient-to-r from-red-500 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                            <Zap className="w-3 h-3 inline mr-1" />
                            URGENT
                          </div>
                        )}
                        
                        {/* Budget Badge */}
                        <div className="absolute bottom-4 left-4">
                          <span className="px-3 py-2 bg-white/90 backdrop-blur-sm text-gray-900 font-bold rounded-lg shadow-sm">
                            ${gig.budget || 'Negotiable'}
                          </span>
                        </div>
                        
                        {/* No Image Indicator */}
                        {!gig.thumbnail?.url && !gig.images?.[0]?.url && !gig.attachments?.[0] && (
                          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                            <div className="text-center">
                              <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                              <span className="text-gray-500 text-sm">No Image</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Gig Content */}
                      <div className="p-5">
                        {/* Client Info */}
                        <div className="flex items-center gap-3 mb-4">
                          <img
                            src={clientInfo.avatar}
                            alt={clientInfo.username}
                            className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-gray-900 text-sm">
                                {clientInfo.username}
                              </h4>
                              {clientInfo.verified && (
                                <CheckCircle className="w-4 h-4 text-blue-500" aria-label="Verified client" />
                              )}
                            </div>
                            <span className="text-xs text-gray-500">Client</span>
                          </div>
                        </div>

                        {/* Gig Title & Description */}
                        <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2 min-h-[56px]">
                          {gig.title}
                        </h3>
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2 min-h-[40px]">
                          {gig.description || 'No description provided.'}
                        </p>

                        {/* Skills Required */}
                        {gig.skillsRequired && gig.skillsRequired.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-4">
                            {gig.skillsRequired.slice(0, 3).map((skill, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded"
                              >
                                {skill}
                              </span>
                            ))}
                            {gig.skillsRequired.length > 3 && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                +{gig.skillsRequired.length - 3} more
                              </span>
                            )}
                          </div>
                        )}

                        {/* Gig Details */}
                        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{deliveryTime}</span>
                          </div>
                          {gig.country && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              <span>{gig.country}</span>
                            </div>
                          )}
                        </div>

                        {/* Status Badge */}
                        <div className="mb-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            gig.status === 'open' ? 'bg-green-100 text-green-800' :
                            gig.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            gig.status === 'assigned' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {gig.status?.replace('_', ' ').toUpperCase() || 'OPEN'}
                          </span>
                        </div>

                        {/* CTA Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(gig._id, gig.slug);
                          }}
                          className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all hover:shadow-lg text-sm"
                          aria-label={`View details for ${gig.title}`}
                        >
                          View Gig Details
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalGigs > 12 && (
                <nav className="flex justify-center items-center gap-4 mb-12" aria-label="Gigs pagination">
                  <button
                    onClick={() => handlePageChange(Math.max(1, parseInt(page) - 1))}
                    disabled={parseInt(page) === 1}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                      parseInt(page) === 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                    aria-label="Go to previous page"
                  >
                    <ChevronDown className="w-4 h-4 rotate-90" />
                    Previous
                  </button>
                  
                  <div className="flex items-center gap-2">
                    {[1, 2, 3].map(num => (
                      <button
                        key={num}
                        onClick={() => handlePageChange(num)}
                        className={`w-10 h-10 rounded-lg ${
                          parseInt(page) === num
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        aria-label={`Go to page ${num}`}
                        aria-current={parseInt(page) === num ? 'page' : undefined}
                      >
                        {num}
                      </button>
                    ))}
                    {parseInt(page) > 3 && <span className="text-gray-400">...</span>}
                  </div>
                  
                  <button
                    onClick={() => handlePageChange(parseInt(page) + 1)}
                    disabled={gigs.length < 12}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                      gigs.length < 12
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                    aria-label="Go to next page"
                  >
                    Next
                    <ChevronDown className="w-4 h-4 -rotate-90" />
                  </button>
                </nav>
              )}
            </>
          )}

          {/* No Results */}
          {!isLoadingGigs && gigs.length === 0 && (
            <div className="text-center py-16">
              <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <Search className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {debouncedSearchTerm ? 'No gigs found' : 'No gigs available'}
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                {debouncedSearchTerm
                  ? `No gigs found for "${debouncedSearchTerm}". Try adjusting your search or filter criteria.`
                  : 'There are currently no gigs available. Check back soon!'}
              </p>
              {debouncedSearchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setDebouncedSearchTerm('');
                    setSearchParams({ page: '1' });
                  }}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Clear Search
                </button>
              )}
            </div>
          )}

          {/* CTA Section */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-center text-white mb-8">
            <h2 className="text-3xl font-bold mb-4">
              Ready to find your perfect gig?
            </h2>
            <p className="text-blue-100 text-lg mb-6 max-w-2xl mx-auto">
              Join thousands of freelancers who found their next project here
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => navigate('/gigs/create')}
                className="px-8 py-3 bg-white text-blue-600 font-bold rounded-lg hover:bg-gray-100 transition-colors"
              >
                Post a Gig
              </button>
              <button 
                onClick={() => navigate('/services')}
                className="px-8 py-3 bg-transparent border-2 border-white text-white font-bold rounded-lg hover:bg-white/10 transition-colors"
              >
                Browse Services Instead
              </button>
            </div>
          </div>
        </div>
      </div>
    </SeoWrapper>
  );
};

export default GigListingsPage;