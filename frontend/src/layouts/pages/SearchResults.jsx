import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Search, Filter, Star, Clock, Check, Globe, Shield, 
  Crown, TrendingUp, Sparkles, Users, ChevronRight,
  ChevronDown, DollarSign, Truck, Award, BadgeCheck
} from 'lucide-react';
import axios from 'axios';
import SearchComponent from '../../components/Search/SearchComponent';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const query = searchParams.get('query') || 'service';
  const source = searchParams.get('source') || 'top-bar';
  const search_in = searchParams.get('search_in') || 'everywhere';
  
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedFilters, setSelectedFilters] = useState({
    category: null,
    budget: null,
    delivery_time: null,
    seller_details: null,
    sort: 'relevance'
  });
  
  // Fetch search results
  useEffect(() => {
    fetchSearchResults();
  }, [query, selectedFilters]);
  
  const fetchSearchResults = async () => {
    setLoading(true);
    try {
      // Clean filters - remove null/undefined values
      const cleanFilters = {};
      Object.keys(selectedFilters).forEach(key => {
        const value = selectedFilters[key];
        if (value && value !== 'null' && value !== 'undefined' && value !== '') {
          cleanFilters[key] = value;
        }
      });
      
      const params = new URLSearchParams({
        query,
        source,
        search_in,
        acmpl: 1,
        'search-autocomplete-original-term': 'ser',
        'search-autocomplete-available': true,
        'search-autocomplete-type': 'recent-gigs-suggest',
        'search-autocomplete-position': 0,
        ref_ctx_id: '4ccdf78e28d54f178f45bd5052c4c320',
        ...cleanFilters
      });
      
      const response = await axios.get(`${API_URL}/api/search/search?${params}`);
      
      if (response.data.success) {
        setResults(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching search results:', error);
      // Set empty results to prevent crash
      setResults({
        results: [],
        totalCount: 0,
        pagination: { page: 1, limit: 48, totalPages: 1, hasNext: false, hasPrev: false },
        meta: { query, totalResults: 0 },
        topFreelancers: [],
        relatedCategories: [],
        searchSuggestions: []
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleFilterChange = (filterType, value) => {
    setSelectedFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };
  
  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k+';
    }
    return num.toString();
  };
  
  const getDeliveryText = (days) => {
    if (days === 1) return '1 Day Delivery';
    if (days <= 3) return `${days} Days Delivery`;
    return `${days} Days Delivery`;
  };
  
  const getPriceText = (price) => {
    if (!price) return 'Starting at $5';
    return `From $${price}`;
  };
  
  const clearAllFilters = () => {
    setSelectedFilters({
      category: null,
      budget: null,
      delivery_time: null,
      seller_details: null,
      sort: 'relevance'
    });
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                <div className="h-96 bg-gray-200 rounded"></div>
              </div>
              <div className="lg:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[1,2,3,4,5,6].map(i => (
                    <div key={i} className="h-64 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* REMOVED: Search Header section entirely */}
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Results Header - Now includes a search bar instead of the navbar one */}
        <div className="mb-6">
          <div className="mb-4">
            <SearchComponent 
              initialQuery={query}
              variant="full"
              className="w-full"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Results for "{query}"
          </h1>
          <div className="flex items-center justify-between">
            <p className="text-gray-600">
              {results?.totalCount ? `${formatNumber(results.totalCount)}+ results` : 'No results found'}
            </p>
            <div className="flex items-center gap-2">
              <select 
                value={selectedFilters.sort}
                onChange={(e) => handleFilterChange('sort', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="relevance">Most Relevant</option>
                <option value="newest">Newest Arrivals</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
              </select>
            </div>
          </div>
        </div>
        {/* Top Filters Bar */}
        <div className="bg-white border rounded-lg mb-6">
          <div className="flex flex-wrap items-center gap-3 p-4">

            {/* Category */}
            <select
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="px-4 py-2 border rounded-full text-sm bg-white"
            >
              <option value="">Category</option>
              {results?.relatedCategories?.map(cat => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>


          

            {/* Budget */}
            <select
              onChange={(e) => handleFilterChange('budget', e.target.value)}
              className="px-4 py-2 border rounded-full text-sm bg-white"
            >
              <option value="">Budget</option>
              <option value="0-50">Under $50</option>
              <option value="50-100">$50 - $100</option>
              <option value="100-200">$100 - $200</option>
              <option value="200-500">$200 - $500</option>
              <option value="500-10000">$500+</option>
            </select>

            {/* Delivery Time */}
            <select
              onChange={(e) => handleFilterChange('delivery_time', e.target.value)}
              className="px-4 py-2 border rounded-full text-sm bg-white"
            >
              <option value="">Delivery time</option>
              <option value="1">24 Hours</option>
              <option value="3">3 Days</option>
              <option value="7">7 Days</option>
              <option value="14">14 Days</option>
              <option value="30">30 Days</option>
            </select>


          </div>
        </div>

        <div className="flex flex-col gap-8">

          {/* Results Grid */}
          <div className="flex-1">
            {/* Top Freelancers Section */}
            {results?.topFreelancers && results.topFreelancers.length > 0 && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">
                      Top freelancers for your first order
                    </h2>
                    <p className="text-gray-600 text-sm">
                      Discover sellers with a great track record in guiding new buyers.
                    </p>
                  </div>
                  <button className="text-green-600 font-medium text-sm hover:text-green-700">
                    See all
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {results.topFreelancers.slice(0, 3).map(freelancer => (
                    <div 
                      key={freelancer._id}
                      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => navigate(`/profile/${freelancer.username || freelancer._id}`)}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <img 
                          src={freelancer.picture || `https://ui-avatars.com/api/?name=${freelancer.name}&background=10b981&color=fff`}
                          alt={freelancer.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-1 mb-1">
                            <h3 className="font-medium text-gray-900">{freelancer.name}</h3>
                            {freelancer.isTopRated && (
                              <BadgeCheck className="w-4 h-4 text-green-600" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 line-clamp-2">
                            {freelancer.bio}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-400 fill-current" />
                            <span className="text-sm font-medium">{freelancer.rating}</span>
                          </div>
                          <span className="text-xs text-gray-500">({freelancer.completedOrders})</span>
                        </div>
                        {freelancer.isPro && (
                          <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                            Pro
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Search Results */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results?.results?.map(item => (
                <div 
                  key={item._id}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
                  onClick={() => navigate(`/services/${item.slug || item._id}`)}
                >
                  {/* Thumbnail */}
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={item.thumbnail || 'https://images.unsplash.com/photo-1551650975-87deedd944c3?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80'}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1551650975-87deedd944c3?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80';
                      }}
                    />
                    {item.isFeatured && (
                      <div className="absolute top-2 left-2">
                        <span className="px-2 py-1 text-xs font-medium bg-yellow-500 text-white rounded">
                          Featured
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <img 
                          src={item.seller.picture || `https://ui-avatars.com/api/?name=${item.seller.name}&background=10b981&color=fff`}
                          alt={item.seller.name}
                          className="w-8 h-8 rounded-full"
                        />
                        <div>
                          <h3 className="font-medium text-gray-900 text-sm">
                            {item.seller.name}
                          </h3>
                          {item.seller.isTopRated && (
                            <div className="flex items-center gap-1">
                              <BadgeCheck className="w-3 h-3 text-green-600" />
                              <span className="text-xs text-gray-500">Top Rated</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="text-sm font-medium">{item.rating}</span>
                        <span className="text-xs text-gray-500">({item.reviewsCount})</span>
                      </div>
                    </div>
                    
                    <h2 className="text-gray-900 font-medium mb-2 line-clamp-2 group-hover:text-green-600">
                      {item.title}
                    </h2>
                    
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {getDeliveryText(item.deliveryTime)}
                        </span>
                      </div>
                      <div className="font-bold text-gray-900">
                        {getPriceText(item.price)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* No Results */}
            {(!results?.results || results.results.length === 0) && !loading && (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No results found for "{query}"
                </h3>
                <p className="text-gray-600 mb-6">
                  Try different keywords or check your spelling.
                </p>
                <div className="flex flex-wrap gap-3 justify-center">
                  {results?.searchSuggestions?.slice(0, 6).map(suggestion => (
                    <button
                      key={suggestion.text}
                      onClick={() => navigate(`/search?query=${encodeURIComponent(suggestion.text)}`)}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                    >
                      {suggestion.text}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Pagination */}
            {results?.pagination && results.pagination.totalPages > 1 && (
              <div className="flex justify-center mt-8">
                <div className="flex items-center gap-2">
                  <button 
                    disabled={!results.pagination.hasPrev}
                    onClick={() => handleFilterChange('page', results.pagination.page - 1)}
                    className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  {Array.from({ length: Math.min(5, results.pagination.totalPages) }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => handleFilterChange('page', page)}
                      className={`px-4 py-2 border rounded-md ${
                        page === results.pagination.page
                          ? 'border-green-600 bg-green-50 text-green-600'
                          : 'border-gray-300'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  
                  <button 
                    disabled={!results.pagination.hasNext}
                    onClick={() => handleFilterChange('page', results.pagination.page + 1)}
                    className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchResults;