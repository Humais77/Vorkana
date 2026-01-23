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
  ArrowLeft,
  User
} from 'lucide-react';
import { useGigs } from '../../../hooks/useGigs';
import { useCategories } from '../../../hooks/useServices';
import { toast } from 'react-hot-toast';
import { SeoWrapper } from '../../../components/SeoWrapper';
import { DEFAULT_IMAGES } from '../../../utils/defaultImages';
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
    
    if (page !== '1') params.set('page', page);
    if (debouncedSearchTerm.trim()) params.set('q', debouncedSearchTerm.trim());
    if (selectedCategory && selectedCategory !== 'All') params.set('category', selectedCategory);
    if (selectedStatus && selectedStatus !== 'open') params.set('status', selectedStatus);
    if (budgetRange[0] > 0) params.set('minBudget', budgetRange[0]);
    if (budgetRange[1] < 100000) params.set('maxBudget', budgetRange[1]);
    if (selectedUrgency) params.set('urgency', selectedUrgency);
    if (sortBy !== 'createdAt') params.set('sort', sortBy);
    
    setSearchParams(params, { replace: true });
  }, [selectedCategory, selectedStatus, budgetRange, selectedUrgency, sortBy, page, debouncedSearchTerm, setSearchParams, isInitialLoad]);

  // Handle search
  const handleSearch = useCallback((e) => {
    e?.preventDefault();
    const trimmedTerm = searchTerm.trim();
    
    if (trimmedTerm && trimmedTerm.length >= 2) {
      setDebouncedSearchTerm(trimmedTerm);
    } else if (!trimmedTerm) {
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

  // Get gig thumbnail - ONLY FROM DATABASE
  const getGigThumbnail = useCallback((gig) => {
    // Only return image if it exists in database
    if (gig.thumbnail?.url) {
      return gig.thumbnail.url;
    }
    
    if (gig.images && gig.images.length > 0 && gig.images[0]?.url) {
      return gig.images[0].url;
    }
    
    // NO FALLBACK IMAGE - return null or placeholder if needed
    return null;
  }, []);

  // Get client info - PURELY FROM DATABASE
  const getClientInfo = useCallback((gig) => {
    if (!gig) return null;
    
    // First check for createdBy object from populated data
    if (gig.createdBy && typeof gig.createdBy === 'object') {
      return {
        _id: gig.createdBy._id,
        username: gig.createdBy.username || '',
        name: gig.createdBy.name || '',
        email: gig.createdBy.email || '',
        picture: gig.createdBy.picture || '',
        emailVerified: gig.createdBy.emailVerified || false,
        accountType: gig.createdBy.accountType || '',
        rating: gig.createdBy.rating || 0
      };
    }
    
    // Then check for clientDetails
    if (gig.clientDetails && typeof gig.clientDetails === 'object') {
      return {
        _id: gig.clientDetails._id,
        username: gig.clientDetails.username || '',
        name: gig.clientDetails.name || '',
        email: gig.clientDetails.email || '',
        picture: gig.clientDetails.picture || '',
        emailVerified: gig.clientDetails.emailVerified || false,
        accountType: gig.clientDetails.accountType || '',
        rating: gig.clientDetails.rating || 0
      };
    }
    
    return null;
  }, []);

  // Get user initials for avatar
  const getUserInitials = useCallback((userInfo) => {
    if (!userInfo) return '?';
    
    if (userInfo.name && typeof userInfo.name === 'string' && userInfo.name.trim()) {
      const names = userInfo.name.trim().split(' ');
      if (names.length >= 2) {
        return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
      }
      return names[0].charAt(0).toUpperCase();
    }
    
    if (userInfo.username && typeof userInfo.username === 'string' && userInfo.username.trim()) {
      return userInfo.username.charAt(0).toUpperCase();
    }
    
    if (userInfo.email && typeof userInfo.email === 'string' && userInfo.email.trim()) {
      return userInfo.email.charAt(0).toUpperCase();
    }
    
    return '?';
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
    const baseTitle = "Find Freelance Gigs & Projects | Vorkanna Marketplace";
    
    if (debouncedSearchTerm && categoryName) {
      return `${debouncedSearchTerm} - ${categoryName} Gigs | Vorkanna`;
    } else if (debouncedSearchTerm) {
      return `Search: ${debouncedSearchTerm} | Freelance Gigs & Projects | Vorkanna`;
    } else if (categoryName) {
      return `${categoryName} Gigs - Find Freelance Projects | Vorkanna`;
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        {/* Hero Section with simple background */}
        <div className="relative bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white py-16 px-4">
          <div className="relative max-w-7xl mx-auto">
            <div className="text-center">
              <div className="flex items-center justify-center mb-6">
                <h1 className="text-4xl md:text-5xl font-bold mb-4">
                  Find Your Next Gig
                </h1>
              </div>
              <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
                Discover freelance projects that match your skills and get paid for your expertise
              </p>
              
              {/* Search Bar */}
              <div className="max-w-3xl mx-auto relative">
                <form onSubmit={handleSearch}>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search for gigs by skill or keyword (min. 2 characters)"
                      className="w-full pl-12 pr-24 py-3 rounded-lg text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-gray-800"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      aria-label="Search for gigs"
                      minLength={2}
                    />
                    <button 
                      type="submit"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white px-5 py-2 rounded-md hover:bg-black transition-colors flex items-center justify-center min-w-[80px]"
                      disabled={isLoadingGigs}
                    >
                      {isLoadingGigs ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Search'
                      )}
                    </button>
                  </div>
                </form>
                
                {/* Quick Categories */}
                {!isLoadingCategories && categories.length > 1 && (
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    {categories.slice(1, 7).map(category => (
                      <button
                        key={category._id}
                        onClick={() => handleCategoryChange(category._id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          selectedCategory === category._id
                            ? "bg-white text-gray-900"
                            : "bg-white/10 hover:bg-white/20 text-white"
                        }`}
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
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
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
                className="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors text-sm"
              >
                Retry
              </button>
            </div>
          )}

          {/* Filters and Sorting Bar */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  <Filter className="w-4 h-4" />
                  Filters
                  {showFilters && <X className="w-4 h-4" />}
                </button>
                
                <div className="hidden md:flex items-center gap-3">
                  <span className="text-gray-600 text-sm">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={handleSortChange}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-800 bg-white text-sm"
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
                <span className="text-gray-600 text-sm">
                  {totalGigs} {debouncedSearchTerm ? 'results' : 'gigs'} found
                </span>
                {(searchTerm || selectedCategory !== 'All' || budgetRange[0] > 0 || budgetRange[1] < 100000 || selectedUrgency || selectedStatus !== 'open' || sortBy !== 'createdAt') && (
                  <button
                    onClick={resetFilters}
                    className="px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors text-sm"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>

            {/* Expanded Filters */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Budget Range: ${budgetRange[0]} - ${budgetRange[1]}
                  </label>
                  <div className="space-y-3">
                    <input
                      type="range"
                      min="0"
                      max="100000"
                      step="100"
                      value={budgetRange[0]}
                      onChange={(e) => handleBudgetRangeChange(0, e.target.value)}
                      className="w-full h-1.5 bg-gray-200 rounded appearance-none cursor-pointer"
                    />
                    <input
                      type="range"
                      min="0"
                      max="100000"
                      step="100"
                      value={budgetRange[1]}
                      onChange={(e) => handleBudgetRangeChange(1, e.target.value)}
                      className="w-full h-1.5 bg-gray-200 rounded appearance-none cursor-pointer"
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>$0</span>
                    <span>$100,000</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categories
                  </label>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {categories.map(category => (
                      <button
                        key={category._id}
                        onClick={() => handleCategoryChange(category._id)}
                        className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
                          selectedCategory === category._id
                            ? "bg-gray-900 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
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
                        className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
                          selectedUrgency === option.value
                            ? "bg-gray-900 text-white"
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
                        className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
                          selectedStatus === option.value
                            ? "bg-gray-900 text-white"
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
                <Loader2 className="w-10 h-10 animate-spin text-gray-900 mx-auto mb-3" />
                <p className="text-gray-600">
                  {debouncedSearchTerm ? 'Searching gigs...' : 'Loading gigs...'}
                </p>
              </div>
            </div>
          )}

          {/* Gigs Grid */}
          {!isLoadingGigs && gigs.length > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
                {gigs.map((gig) => {
                  const clientInfo = getClientInfo(gig);
                  const thumbnailUrl = getGigThumbnail(gig);
                  const deliveryTime = gig.timeline ? `${gig.timeline} ${gig.timelineUnit || 'days'}` : 'Custom';
                  
                  return (
                    <article
                      key={gig._id}
                      className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer"
                      onClick={() => handleViewDetails(gig._id, gig.slug)}
                    >
                      {/* Gig Image */}
                      <div className="relative h-40 overflow-hidden bg-gray-100">
                        {thumbnailUrl ? (
                          <>
                            <img
                              src={thumbnailUrl}
                              alt={gig.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-400">
                             <img
                                                    src={DEFAULT_IMAGES.GENERIC}
                                                    alt="Service placeholder"
                                                    className="w-full h-full object-cover rounded-2xl"
                                                        />
                          </div>
                        )}
                        
                        {/* Favorite Button */}
                        <button
                          onClick={(e) => handleLike(gig._id, e)}
                          className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors"
                        >
                          <Heart
                            className={`w-4 h-4 transition-colors ${
                              favorites.includes(gig._id)
                                ? "fill-red-500 text-red-500"
                                : "text-gray-600 hover:text-red-500"
                            }`}
                          />
                        </button>
                        
                        {/* Urgency Badge */}
                        {gig.urgency === 'high' && (
                          <div className="absolute top-3 left-3 bg-gray-900 text-white px-2 py-1 rounded text-xs font-bold">
                            <Zap className="w-3 h-3 inline mr-1" />
                            URGENT
                          </div>
                        )}
                      </div>

                      {/* Gig Content */}
                      <div className="p-4">
                        {/* Client Info */}
                        <div className="flex items-center gap-2 mb-3">
                          <div className="relative">
                            {clientInfo?.picture ? (
                              <img
                                src={clientInfo.picture}
                                alt={clientInfo.name || clientInfo.username || 'Client'}
                                className="w-8 h-8 rounded-full object-cover border border-gray-300"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center">
                                <span className="text-xs font-medium text-gray-600">
                                  {getUserInitials(clientInfo)}
                                </span>
                              </div>
                            )}
                            {clientInfo?.emailVerified && (
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center border border-white">
                                <CheckCircle className="w-3 h-3 text-white" fill="white" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            {clientInfo ? (
                              <>
                                <div className="flex items-center gap-1">
                                  <h4 className="font-medium text-gray-900 text-sm truncate">
                                    {clientInfo.name || clientInfo.username || 'Client'}
                                  </h4>
                                  {clientInfo.emailVerified && (
                                    <CheckCircle className="w-3 h-3 text-green-500" />
                                  )}
                                </div>
                                {clientInfo.email ? (
                                  <p className="text-xs text-gray-500 truncate" title={clientInfo.email}>
                                    {clientInfo.email}
                                  </p>
                                ) : (
                                  <p className="text-xs text-gray-400 italic">
                                    No email available
                                  </p>
                                )}
                                {clientInfo.accountType && (
                                  <span className="text-xs text-gray-400 capitalize">
                                    {clientInfo.accountType}
                                  </span>
                                )}
                              </>
                            ) : (
                              <div className="text-xs text-gray-500 italic">
                                Client information not available
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Gig Title & Description */}
                        <h3 className="font-bold text-gray-900 mb-2 line-clamp-1">
                          {gig.title}
                        </h3>
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2 min-h-[40px]">
                          {gig.description || 'No description provided.'}
                        </p>

                        {/* Gig Details */}
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{deliveryTime}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            <span className="font-bold text-gray-900">${gig.budget || 'Negotiable'}</span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="mb-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            gig.status === 'open' ? 'bg-gray-100 text-gray-800' :
                            gig.status === 'in_progress' ? 'bg-blue-50 text-blue-800' :
                            gig.status === 'assigned' ? 'bg-purple-50 text-purple-800' :
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
                          className="w-full px-3 py-1.5 bg-gray-900 text-white font-medium rounded-md hover:bg-black transition-colors text-sm"
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
                <nav className="flex justify-center items-center gap-3 mb-8">
                  <button
                    onClick={() => handlePageChange(Math.max(1, parseInt(page) - 1))}
                    disabled={parseInt(page) === 1}
                    className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-sm ${
                      parseInt(page) === 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-900 text-white hover:bg-black'
                    }`}
                  >
                    <ChevronDown className="w-3 h-3 rotate-90" />
                    Previous
                  </button>
                  
                  <div className="flex items-center gap-1">
                    {[1, 2, 3].map(num => (
                      <button
                        key={num}
                        onClick={() => handlePageChange(num)}
                        className={`w-8 h-8 rounded-md text-sm ${
                          parseInt(page) === num
                            ? 'bg-gray-900 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                    {parseInt(page) > 3 && <span className="text-gray-400">...</span>}
                  </div>
                  
                  <button
                    onClick={() => handlePageChange(parseInt(page) + 1)}
                    disabled={gigs.length < 12}
                    className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-sm ${
                      gigs.length < 12
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-900 text-white hover:bg-black'
                    }`}
                  >
                    Next
                    <ChevronDown className="w-3 h-3 -rotate-90" />
                  </button>
                </nav>
              )}
            </>
          )}

          {/* No Results */}
          {!isLoadingGigs && gigs.length === 0 && (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Search className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
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
                  className="px-5 py-2.5 bg-gray-900 text-white rounded-md hover:bg-black transition-colors"
                >
                  Clear Search
                </button>
              )}
            </div>
          )}

          {/* CTA Section */}
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-lg p-6 text-center text-white mb-6">
            <h2 className="text-2xl font-bold mb-3">
              Ready to find your perfect gig?
            </h2>
            <p className="text-gray-300 mb-4 max-w-2xl mx-auto">
              Join thousands of freelancers who found their next project here
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button 
                onClick={() => navigate('/dashboard')}
                className="px-6 py-2.5 bg-white text-gray-900 font-bold rounded-md hover:bg-gray-100 transition-colors"
              >
                Post a Gig
              </button>
              <button 
                onClick={() => navigate('/services')}
                className="px-6 py-2.5 bg-transparent border border-white text-white font-bold rounded-md hover:bg-white/10 transition-colors"
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