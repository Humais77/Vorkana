// src/pages/AllGigsPage.jsx
import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Search, MapPin, Clock, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { useGigs } from '../hooks/useGigs';
import CategoryFilter from '../components/CategoryFilter';

const AllGigsPage = () => {
  const navigate = useNavigate();
  
  // State for pagination and filters
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [searchQuery, setSearchQuery] = useState('');
 const [categoryFilter, setCategoryFilter] = useState(null); // null instead of empty string
const [urgencyFilter, setUrgencyFilter] = useState(null); // null instead of empty string
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showFilters, setShowFilters] = useState(false);
  

  // Use the useGigs hook with dynamic parameters
 const { data, isLoading, isError, error, refetch } = useGigs({
  search: searchQuery || undefined,
  projectCategory: categoryFilter || undefined, // undefined instead of empty string
  urgency: urgencyFilter || undefined, // undefined instead of empty string
  status: 'open',
  page: page,
  limit: limit,
  sort: sortBy,
  order: sortOrder,
  includeCategory: true,
  includeClient: true,
  includeSeller: true,
  populate: true,
});

  // Extract data from response
  const gigs = data?.data || [];
  const pagination = data?.pagination || {};
  const totalPages = pagination.totalPages || 1;
  const totalGigs = pagination.total || 0;

  // Handle gig click
  const handleGigClick = useCallback((gigId, gigSlug) => {
    navigate(`/gig/${gigSlug || gigId}`);
  }, [navigate]);

  // Handle search
  const handleSearch = useCallback((e) => {
    e.preventDefault();
    setPage(1); // Reset to first page on new search
    refetch();
  }, [refetch]);

  // Handle filter changes
  const handleCategoryChange = useCallback((categoryId) => {
  setCategoryFilter(categoryId || null); // Convert empty string to null
  setPage(1);
}, []);

  const handleUrgencyChange = useCallback((urgency) => {
  setUrgencyFilter(urgency || null); // Convert empty string to null
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
    setSearchQuery('');
    setCategoryFilter('');
    setUrgencyFilter('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPage(1);
  }, []);

  // Auto-refresh when filters change
  useEffect(() => {
    refetch();
  }, [page, limit, sortBy, sortOrder, categoryFilter, urgencyFilter, refetch]);

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                All Available Gigs
              </h1>
              <p className="text-gray-600 mt-2">
                Browse all active gigs from all categories
              </p>
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter className="w-4 h-4" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
          </div>

          {/* Search Bar */}
          <div className="mt-6">
            <form onSubmit={handleSearch} className="max-w-3xl">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search all gigs by title, description, or skills..."
                  className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                />
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <button
                  type="submit"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 px-4 py-1.5 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
                >
                  Search
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Category Filter */}
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <CategoryFilter
                  selectedCategory={categoryFilter}
                  onCategoryChange={handleCategoryChange}
                  showAllOption={true}
                />
              </div>

              {/* Urgency Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Urgency
                </label>
                <select
                  value={urgencyFilter}
                  onChange={(e) => handleUrgencyChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                >
                  <option value="">All Urgency</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              {/* Sort Options */}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                >
                  <option value="createdAt:desc">Newest First</option>
                  <option value="createdAt:asc">Oldest First</option>
                  <option value="budget:desc">Highest Budget</option>
                  <option value="budget:asc">Lowest Budget</option>
                  <option value="deadline:asc">Closest Deadline</option>
                </select>
              </div>

              {/* Results Per Page */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Per Page
                </label>
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                >
                  <option value={12}>12</option>
                  <option value={24}>24</option>
                  <option value={36}>36</option>
                  <option value={48}>48</option>
                </select>
              </div>

              {/* Reset Filters */}
              {(searchQuery || categoryFilter || urgencyFilter || sortBy !== 'createdAt' || sortOrder !== 'desc') && (
                <div className="self-end">
                  <button
                    onClick={resetFilters}
                    className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Reset Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="text-sm text-gray-600">
            Showing <span className="font-semibold">{gigs.length}</span> of{' '}
            <span className="font-semibold">{totalGigs}</span> active gigs
            {categoryFilter && ' in selected category'}
            {searchQuery && ` matching "${searchQuery}"`}
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Page {page} of {totalPages}</span>
          </div>
        </div>

        {/* Gig Listings */}
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
              {searchQuery || categoryFilter || urgencyFilter
                ? 'Try adjusting your filters or search terms'
                : 'There are currently no active gigs. Check back later!'}
            </p>
            {(searchQuery || categoryFilter || urgencyFilter) && (
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

// GigCard Component (reusing from your existing component)
const GigCard = ({ gig, onClick }) => {
  const getGigImage = () => {
    if (gig.attachments && gig.attachments.length > 0) {
      return gig.attachments[0];
    }
    if (gig.files && gig.files.length > 0) {
      return gig.files[0];
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

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group"
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
        {gig.urgency === 'high' && (
          <div className="absolute top-3 right-3">
            <span className="px-2 py-1 bg-red-500 text-white text-xs font-medium rounded">
              Urgent
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
      <div className="p-5">
        {/* Gig Title */}
        <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-green-600 transition-colors line-clamp-2">
          {gig.title}
        </h3>

        {/* Gig Description */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
          {gig.description || 'No description provided.'}
        </p>

        {/* Gig Info */}
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

          {/* Proposals Count */}
          {gig.proposals && (
            <div className="text-sm text-gray-500">
              {gig.proposals.length} proposal{gig.proposals.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Gig Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>{deliveryTime}</span>
            </div>
            
            {gig.country && (
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <MapPin className="w-4 h-4" />
                <span className="truncate max-w-[80px]">{gig.country}</span>
              </div>
            )}
          </div>
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors text-sm"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default AllGigsPage;