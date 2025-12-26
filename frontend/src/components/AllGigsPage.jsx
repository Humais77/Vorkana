// src/pages/AllGigsPage.jsx
import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Filter, ChevronLeft, ChevronRight, Clock, MapPin, DollarSign } from 'lucide-react';
import { useGigs } from '../hooks/useGigs';
import CategoryFilter from '../components/CategoryFilter';

const AllGigsPage = () => {
  const navigate = useNavigate();
  
  // State for pagination and filters
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [budgetFilter, setBudgetFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [hasAttachmentsFilter, setHasAttachmentsFilter] = useState('');
  const [hasMilestonesFilter, setHasMilestonesFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showFilters, setShowFilters] = useState(false);

  // Build filter object for the API
  const buildFilters = () => {
    const filters = {
      status: 'open', // Default to open gigs
      deletedAt: null
    };

    if (categoryFilter) filters.projectCategory = categoryFilter;
    if (urgencyFilter) filters.urgency = urgencyFilter;
    if (statusFilter) filters.status = statusFilter;
    if (budgetFilter === 'small') {
      filters.minBudget = 1;
      filters.maxBudget = 500;
    } else if (budgetFilter === 'medium') {
      filters.minBudget = 501;
      filters.maxBudget = 5000;
    } else if (budgetFilter === 'large') {
      filters.minBudget = 5001;
    }
    if (hasAttachmentsFilter === 'true') filters.hasAttachments = true;
    if (hasMilestonesFilter === 'true') filters.hasMilestones = true;

    return filters;
  };

  // Use the useGigs hook with dynamic parameters
  const { data: responseData, isLoading, isError, error, refetch } = useGigs({
    ...buildFilters(),
    page: page,
    limit: limit,
    sort: sortBy,
    order: sortOrder,
    includeCategory: true,
    includeClient: true,
    includeSeller: true,
    populate: true,
  });

  // Extract data from response - handle different response formats
  let gigs = [];
  let pagination = {};
  let totalPages = 1;
  let totalGigs = 0;

  if (responseData) {
    // Handle different response formats
    if (Array.isArray(responseData)) {
      // Direct array response
      gigs = responseData;
      totalGigs = responseData.length;
    } else if (responseData.data && Array.isArray(responseData.data)) {
      // Format: { data: [...], pagination: {...} }
      gigs = responseData.data;
      pagination = responseData.pagination || {};
      totalPages = pagination.totalPages || 1;
      totalGigs = pagination.total || gigs.length;
    } else if (responseData.gigs && Array.isArray(responseData.gigs)) {
      // Format: { gigs: [...], ... }
      gigs = responseData.gigs;
      pagination = responseData.pagination || {};
      totalPages = pagination.totalPages || 1;
      totalGigs = pagination.total || gigs.length;
    } else if (responseData.success && responseData.data && Array.isArray(responseData.data)) {
      // Format: { success: true, data: [...], pagination: {...} }
      gigs = responseData.data;
      pagination = responseData.pagination || {};
      totalPages = pagination.totalPages || 1;
      totalGigs = pagination.total || gigs.length;
    }
  }

  // Handle gig click
  const handleGigClick = useCallback((gigId, gigSlug) => {
    navigate(`/gig/${gigSlug || gigId}`);
  }, [navigate]);

  // Handle filter changes
  const handleCategoryChange = useCallback((categoryId) => {
    setCategoryFilter(categoryId || null);
    setPage(1);
  }, []);

  const handleUrgencyChange = useCallback((urgency) => {
    setUrgencyFilter(urgency || '');
    setPage(1);
  }, []);

  const handleBudgetChange = useCallback((budgetRange) => {
    setBudgetFilter(budgetRange || '');
    setPage(1);
  }, []);

  const handleStatusChange = useCallback((status) => {
    setStatusFilter(status || '');
    setPage(1);
  }, []);

  const handleAttachmentsChange = useCallback((hasAttachments) => {
    setHasAttachmentsFilter(hasAttachments || '');
    setPage(1);
  }, []);

  const handleMilestonesChange = useCallback((hasMilestones) => {
    setHasMilestonesFilter(hasMilestones || '');
    setPage(1);
  }, []);

  const handleSortChange = useCallback((sortField, order = 'desc') => {
    setSortBy(sortField);
    setSortOrder(order);
    setPage(1);
  }, []);

  // Handle pagination
  const goToPage = useCallback((pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setPage(pageNumber);
    }
  }, [totalPages]);

  // Reset all filters
  const resetFilters = useCallback(() => {
    setCategoryFilter(null);
    setUrgencyFilter('');
    setBudgetFilter('');
    setStatusFilter('');
    setHasAttachmentsFilter('');
    setHasMilestonesFilter('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPage(1);
  }, []);

  // Auto-refresh when filters change
  useEffect(() => {
    refetch();
  }, [page, limit, sortBy, sortOrder, categoryFilter, urgencyFilter, budgetFilter, statusFilter, hasAttachmentsFilter, hasMilestonesFilter, refetch]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-green-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading all gigs...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">😞</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Error loading gigs
          </h3>
          <p className="text-gray-600 mb-6">
            {error?.message || 'Something went wrong. Please try again.'}
          </p>
          <button
            onClick={() => refetch()}
            className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                All Available Gigs
              </h1>
              <p className="text-gray-600 mt-2">
                Browse and filter through our collection of professional gigs
              </p>
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              <Filter className="w-5 h-5" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
          </div>

        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <div className="space-y-2">
                  <CategoryFilter
                    selectedCategory={categoryFilter}
                    onCategoryChange={handleCategoryChange}
                    showAllOption={true}
                  />
                </div>
              </div>

              {/* Budget Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Budget Range
                </label>
                <div className="space-y-2">
                  {[
                    { id: '', label: 'All Budgets' },
                    { id: 'small', label: 'Small ($1 - $500)', desc: 'Small projects' },
                    { id: 'medium', label: 'Medium ($501 - $5,000)', desc: 'Mid-size projects' },
                    { id: 'large', label: 'Large ($5,001+)', desc: 'Large projects' }
                  ].map((budget) => (
                    <button
                      key={budget.id}
                      onClick={() => handleBudgetChange(budget.id)}
                      className={`w-full px-4 py-3 text-left rounded-lg transition-colors ${
                        budgetFilter === budget.id 
                          ? 'bg-green-100 text-green-700 border border-green-300' 
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        <span className="font-medium">{budget.label}</span>
                      </div>
                      {budget.desc && (
                        <div className="text-xs text-gray-500 mt-1">{budget.desc}</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Urgency Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Urgency Level
                </label>
                <div className="space-y-2">
                  {[
                    { id: '', label: 'All Urgency' },
                    { id: 'low', label: 'Low Urgency', color: 'bg-green-100 text-green-800' },
                    { id: 'medium', label: 'Medium Urgency', color: 'bg-yellow-100 text-yellow-800' },
                    { id: 'high', label: 'High Urgency', color: 'bg-orange-100 text-orange-800' },
                    { id: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' }
                  ].map((urgency) => (
                    <button
                      key={urgency.id}
                      onClick={() => handleUrgencyChange(urgency.id)}
                      className={`w-full px-4 py-3 text-left rounded-lg transition-colors ${
                        urgencyFilter === urgency.id 
                          ? 'bg-green-100 text-green-700 border border-green-300' 
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      <div className="font-medium">{urgency.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gig Status
                </label>
                <div className="space-y-2">
                  {[
                    { id: '', label: 'All Status' },
                    { id: 'open', label: 'Open'},
                    { id: 'assigned', label: 'Assigned', desc: 'Freelancer assigned' },
                    { id: 'in_progress', label: 'In Progress', desc: 'Work ongoing' },
                    { id: 'completed', label: 'Completed', desc: 'Work finished' }
                  ].map((status) => (
                    <button
                      key={status.id}
                      onClick={() => handleStatusChange(status.id)}
                      className={`w-full px-4 py-3 text-left rounded-lg transition-colors ${
                        statusFilter === status.id 
                          ? 'bg-green-100 text-green-700 border border-green-300' 
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      <div className="font-medium">{status.label}</div>
                      {status.desc && (
                        <div className="text-xs text-gray-500 mt-1">{status.desc}</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Additional Filters */}
              <div className="col-span-1 md:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Has Attachments Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Has Attachments
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAttachmentsChange('')}
                        className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                          hasAttachmentsFilter === '' 
                            ? 'bg-green-100 text-green-700 border border-green-300' 
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                      >
                        Any
                      </button>
                      <button
                        onClick={() => handleAttachmentsChange('true')}
                        className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                          hasAttachmentsFilter === 'true' 
                            ? 'bg-green-100 text-green-700 border border-green-300' 
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                      >
                        With Attachments
                      </button>
                    </div>
                  </div>

                  {/* Has Milestones Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Has Milestones
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleMilestonesChange('')}
                        className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                          hasMilestonesFilter === '' 
                            ? 'bg-green-100 text-green-700 border border-green-300' 
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                      >
                        Any
                      </button>
                      <button
                        onClick={() => handleMilestonesChange('true')}
                        className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                          hasMilestonesFilter === 'true' 
                            ? 'bg-green-100 text-green-700 border border-green-300' 
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                      >
                        With Milestones
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sort and Results Controls */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sort By
                    </label>
                    <select
                      value={`${sortBy}:${sortOrder}`}
                      onChange={(e) => {
                        const [field, order] = e.target.value.split(':');
                        handleSortChange(field, order);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    >
                      <option value="createdAt:desc">Newest First</option>
                      <option value="createdAt:asc">Oldest First</option>
                      <option value="budget:asc">Budget: Low to High</option>
                      <option value="budget:desc">Budget: High to Low</option>
                      <option value="urgency:desc">Most Urgent First</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Results Per Page
                    </label>
                    <select
                      value={limit}
                      onChange={(e) => setLimit(Number(e.target.value))}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    >
                      <option value={12}>12</option>
                      <option value={24}>24</option>
                      <option value={36}>36</option>
                      <option value={48}>48</option>
                    </select>
                  </div>
                </div>

                {/* Reset Filters */}
                {(categoryFilter || urgencyFilter || budgetFilter || statusFilter || 
                  hasAttachmentsFilter || hasMilestonesFilter || sortBy !== 'createdAt' || sortOrder !== 'desc') && (
                  <div>
                    <button
                      onClick={resetFilters}
                      className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                      Reset All Filters
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Results Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="text-gray-600">
            <span className="font-semibold text-gray-900">{gigs.length}</span> of{' '}
            <span className="font-semibold text-gray-900">{totalGigs}</span> gigs
            {categoryFilter && (
              <> in <span className="font-semibold text-green-600">selected category</span></>
            )}
            {urgencyFilter && (
              <> · <span className="font-semibold text-green-600 capitalize">{urgencyFilter}</span> urgency</>
            )}
            {budgetFilter && (
              <> · <span className="font-semibold text-green-600 capitalize">{budgetFilter}</span> budget</>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Page {page} of {totalPages}</span>
          </div>
        </div>

        {/* Gigs Grid */}
        {gigs.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {gigs.map((gig) => (
                <GigCard 
                  key={gig._id} 
                  gig={gig} 
                  onClick={() => handleGigClick(gig._id, gig.slug)} 
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-12 flex justify-center">
                <nav className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(page - 1)}
                    disabled={page === 1}
                    className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  {/* Page Numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        className={`w-10 h-10 rounded-lg border ${
                          page === pageNum
                            ? 'bg-green-600 text-white border-green-600'
                            : 'border-gray-300 hover:bg-gray-50'
                        } transition-colors`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => goToPage(page + 1)}
                    disabled={page === totalPages}
                    className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </nav>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No gigs found
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {categoryFilter || urgencyFilter || budgetFilter || statusFilter
                ? 'Try adjusting your filters to find more gigs'
                : 'There are currently no active gigs. Check back later!'}
            </p>
            {(categoryFilter || urgencyFilter || budgetFilter || statusFilter) && (
              <button
                onClick={resetFilters}
                className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                Reset Filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// GigCard Component (updated to match service card style)
const GigCard = ({ gig, onClick }) => {
  const getGigImage = () => {
    if (gig.thumbnail?.url) {
      return gig.thumbnail.url;
    }
    if (gig.images && gig.images.length > 0 && gig.images[0].url) {
      return gig.images[0].url;
    }
    
    // Fallback images based on category
    const categoryImages = {
      'End-to-End Projects': 'https://images.unsplash.com/photo-1551650975-87deedd944c3?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
      'Mobile Apps': 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
      'Programming & Tech': 'https://images.unsplash.com/photo-1551650975-87deedd944c3?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
      'Graphic & Design': 'https://images.unsplash.com/photo-1561070791-2526d30994b5?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
      'Digital Marketing': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
      'default': 'https://images.unsplash.com/photo-1551650975-87deedd944c3?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
    };
    
    const categoryName = gig.projectCategory?.name || 'default';
    return categoryImages[categoryName] || categoryImages['default'];
  };

  const gigImage = getGigImage();
  const gigPrice = gig.budget ? `$${gig.budget} ${gig.currency || 'USD'}` : 'Negotiable';
  const deliveryTime = gig.timeline ? `${gig.timeline} ${gig.timelineUnit || 'days'}` : 'Custom';
  const categoryName = gig.projectCategory?.name || 'Uncategorized';

  // Urgency color mapping
  const urgencyColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800'
  };

  const urgencyClass = urgencyColors[gig.urgency] || 'bg-gray-100 text-gray-800';

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group h-full flex flex-col"
    >
      {/* Gig Image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={gigImage}
          alt={gig.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1551650975-87deedd944c3?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80';
          }}
        />
        
        {/* Price Badge */}
        <div className="absolute bottom-3 right-3">
          <span className="px-3 py-2 bg-white/90 backdrop-blur-sm text-gray-900 font-bold rounded-lg shadow-sm">
            {gigPrice}
          </span>
        </div>
        
        {/* Urgency Badge */}
        {gig.urgency && (
          <div className="absolute top-3 right-3">
            <span className={`px-2 py-1 text-xs font-medium rounded ${urgencyClass}`}>
              {gig.urgency.charAt(0).toUpperCase() + gig.urgency.slice(1)}
            </span>
          </div>
        )}
        
        {/* Category Badge */}
        <div className="absolute top-3 left-3">
          <span className="px-2 py-1 bg-black/60 backdrop-blur-sm text-white text-xs font-medium rounded">
            {categoryName}
          </span>
        </div>
      </div>

      {/* Gig Content */}
      <div className="p-5 flex-1 flex flex-col">
        {/* Gig Title */}
        <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-green-600 transition-colors line-clamp-2">
          {gig.title}
        </h3>

        {/* Gig Description */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-3 flex-1">
          {gig.description || 'No description provided.'}
        </p>

        {/* Gig Stats */}
        <div className="space-y-3 mb-4">
          {/* Skills */}
          {gig.skillsRequired && gig.skillsRequired.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {gig.skillsRequired.slice(0, 3).map((skill, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                >
                  {skill}
                </span>
              ))}
              {gig.skillsRequired.length > 3 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded">
                  +{gig.skillsRequired.length - 3} more
                </span>
              )}
            </div>
          )}


          {/* Delivery Time */}
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            <span>{deliveryTime}</span>
          </div>
        </div>

        {/* Client Info */}
        {gig.createdBy && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200">
                {gig.createdBy.picture ? (
                  <img 
                    src={gig.createdBy.picture} 
                    alt={gig.createdBy.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-800 font-medium">
                    {gig.createdBy.name?.charAt(0) || 'C'}
                  </div>
                )}
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {gig.createdBy.name || 'Client'}
                </div>
                {gig.country && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <MapPin className="w-3 h-3" />
                    <span>{gig.country}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* View Details Button */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="mt-6 px-4 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors text-sm w-full"
        >
          View Gig Details
        </button>
      </div>
    </div>
  );
};

export default AllGigsPage;