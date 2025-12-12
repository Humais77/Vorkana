// src/pages/GigListingsPage.jsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Star, Clock, CheckCircle, ArrowLeft, Loader2, Search, MapPin } from 'lucide-react';
import { useGigs } from '../../hooks/useGigs';

const GigListingsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [service, setService] = useState('');
  const [category, setCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Parse query parameters
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const serviceParam = queryParams.get('service') || '';
    const categoryParam = queryParams.get('category') || '';
    
    setService(serviceParam);
    setCategory(categoryParam);
    setSearchQuery(serviceParam);
  }, [location.search]);

  // Use the useGigs hook with proper query parameters
  const { data, isLoading, isError, error } = useGigs({
    search: searchQuery,
    status: 'open',
    page: 1,
    limit: 12,
    includeCategory: true,
    includeClient: true,
    includeSeller: true,
    populate: true,
  });

  // Extract data from response
  const gigs = data?.data || [];
  const totalGigs = data?.pagination?.total || 0;

  const handleGigClick = (gigId, gigSlug) => {
    navigate(`/gig/${gigSlug || gigId}`);
  };

  const goBack = () => {
    navigate(-1);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    // The useGigs hook will automatically refetch with new query
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-green-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading gigs...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Error loading gigs
          </h3>
          <p className="text-gray-600 mb-6">
            {error?.message || 'Something went wrong. Please try again.'}
          </p>
          <button
            onClick={() => window.location.reload()}
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
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={goBack}
              className="flex items-center gap-2 text-gray-600 hover:text-green-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {service || 'Available Gigs'}
          </h1>
          <p className="text-gray-600 mb-6">
            Showing {totalGigs} active gigs{gigs.length > 0 && category && ` in "${category}"`}
          </p>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-2xl">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for gigs..."
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

      {/* Gig Listings */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter Stats */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-sm text-gray-600">
            Found <span className="font-semibold">{totalGigs}</span> active gigs
            {searchQuery && ` matching "${searchQuery}"`}
          </div>
        </div>

        {gigs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gigs.map((gig) => (
              <GigCard 
                key={gig._id} 
                gig={gig} 
                onClick={() => handleGigClick(gig._id, gig.slug)} 
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No active gigs found
            </h3>
            <p className="text-gray-600 mb-6">
              Try searching for something else or check back later for new gigs.
            </p>
            <button
              onClick={goBack}
              className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              Browse Categories
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Updated GigCard component
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
      'Programming & Tech': 'https://images.unsplash.com/photo-1551650975-87deedd944c3?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
      'default': 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
    };
    
    const categoryName = gig.projectCategory?.name || 'default';
    return categoryImages[categoryName] || categoryImages['default'];
  };

  const getSellerInfo = () => {
    if (gig.createdBy) {
      return {
        name: gig.createdBy.fullName || gig.createdBy.username || 'Seller',
        avatar: gig.createdBy.avatar || `https://ui-avatars.com/api/?name=${gig.createdBy.fullName || 'Seller'}&background=random`,
        rating: gig.createdBy.rating || 4.5,
        verified: true
      };
    }
    
    return {
      name: gig.fullName || 'Seller',
      avatar: `https://ui-avatars.com/api/?name=${gig.fullName || 'Seller'}&background=random`,
      rating: 4.5,
      verified: false
    };
  };

  const seller = getSellerInfo();
  const gigImage = getGigImage();
  const gigPrice = gig.budget ? `$${gig.budget}` : 'Negotiable';
  const deliveryTime = gig.timeline ? `${gig.timeline} ${gig.timelineUnit || 'days'}` : 'Custom';

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
                <span>{gig.country}</span>
              </div>
            )}
          </div>
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
          >
            View
          </button>
        </div>
      </div>
    </div>
  );
};

export default GigListingsPage;