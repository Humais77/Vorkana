// src/pages/GigListingsPage.jsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Star, Clock, CheckCircle, ArrowLeft, Loader2, Search } from 'lucide-react';
import { useSearchGigs } from '../../hooks/useGigs'; // Import your custom hook

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
    setSearchQuery(serviceParam); // Set search query to the service name
  }, [location.search]);

  // Use the search hook to fetch gigs
  const { data, isLoading, isError, error, refetch } = useSearchGigs({
    query: searchQuery,
    search: searchQuery,
    fields: 'title,slug,description,budget,price,images,createdBy,category,deliveryTime,features,seller,status,createdAt,updatedAt',
    populate: true,
    includeClient: true,
    includeCategory: true,
    status: 'active', // Only show active gigs
    page: 1,
    limit: 12
  });

  // Extract gigs from the response
  const gigs = data?.data || [];
  const totalGigs = data?.pagination?.total || 0;

  const handleGigClick = (gigId, gigSlug) => {
    // Navigate to gig detail page
    navigate(`/gig/${gigSlug || gigId}`);
  };

  const goBack = () => {
    navigate(-1);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    refetch(); // Refetch with new search query
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
            {service}
          </h1>
          <p className="text-gray-600 mb-6">
            Showing {totalGigs} services in <span className="font-semibold text-green-600">{category}</span>
          </p>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-2xl">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for specific gigs..."
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
            Found <span className="font-semibold">{totalGigs}</span> gigs matching "{service}"
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Sort by:</span>
            <select className="text-sm border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-500">
              <option value="relevance">Relevance</option>
              <option value="newest">Newest</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Highest Rating</option>
            </select>
          </div>
        </div>

        {gigs.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {gigs.map((gig) => (
                <GigCard key={gig._id} gig={gig} onClick={() => handleGigClick(gig._id, gig.slug)} />
              ))}
            </div>

            {/* Load More Button (if pagination) */}
            {data?.pagination?.hasNext && (
              <div className="text-center mt-8">
                <button
                  onClick={() => {
                    // Implement pagination logic here
                    console.log('Load more clicked');
                  }}
                  className="px-6 py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors"
                >
                  Load More Gigs
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No gigs found for "{service}"
            </h3>
            <p className="text-gray-600 mb-6">
              Try searching for something else or check back later.
            </p>
            <button
              onClick={goBack}
              className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              Browse Other Services
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Separate GigCard component for better organization
const GigCard = ({ gig, onClick }) => {
  // Helper function to get gig image
  const getGigImage = () => {
    if (gig.images && gig.images.length > 0) {
      // If images array exists and has items
      if (typeof gig.images[0] === 'string') {
        return gig.images[0];
      } else if (gig.images[0]?.url) {
        return gig.images[0].url;
      }
    }
    
    // Fallback images based on category or random
    const fallbackImages = [
      'https://images.unsplash.com/photo-1551650975-87deedd944c3?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
    ];
    
    return fallbackImages[Math.floor(Math.random() * fallbackImages.length)];
  };

  // Helper function to get gig price
  const getGigPrice = () => {
    if (gig.price) {
      return typeof gig.price === 'number' ? `$${gig.price}` : gig.price;
    }
    if (gig.budget) {
      return typeof gig.budget === 'number' ? `$${gig.budget}` : gig.budget;
    }
    return '$299'; // Default price
  };

  // Helper function to get seller info
  const getSellerInfo = () => {
    if (gig.createdBy && typeof gig.createdBy === 'object') {
      return {
        name: gig.createdBy.name || gig.createdBy.username || 'Seller',
        avatar: gig.createdBy.avatar || `https://ui-avatars.com/api/?name=${gig.createdBy.name || 'Seller'}&background=random`,
        rating: gig.createdBy.rating || 4.5,
        reviews: gig.createdBy.reviewCount || 0,
        verified: gig.createdBy.verified || false
      };
    }
    
    return {
      name: 'Seller',
      avatar: 'https://ui-avatars.com/api/?name=Seller&background=random',
      rating: 4.5,
      reviews: 0,
      verified: false
    };
  };

  const seller = getSellerInfo();
  const gigImage = getGigImage();
  const gigPrice = getGigPrice();
  const gigFeatures = gig.features || ['Responsive Design', 'SEO Friendly', 'Fast Delivery'];

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
        <div className="absolute top-3 right-3">
          {gig.featured && (
            <span className="px-2 py-1 bg-green-500 text-white text-xs font-medium rounded">
              Featured
            </span>
          )}
        </div>
        <div className="absolute top-3 left-3">
          {gig.category && typeof gig.category === 'object' && gig.category.name && (
            <span className="px-2 py-1 bg-black/70 text-white text-xs font-medium rounded">
              {gig.category.name}
            </span>
          )}
        </div>
      </div>

      {/* Gig Content */}
      <div className="p-5">
        {/* Seller Info */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
            <img
              src={seller.avatar}
              alt={seller.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src = `https://ui-avatars.com/api/?name=${seller.name}&background=random`;
              }}
            />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 truncate">{seller.name}</h4>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium">{seller.rating.toFixed(1)}</span>
              <span className="text-sm text-gray-500">({seller.reviews})</span>
            </div>
          </div>
          {seller.verified && (
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          )}
        </div>

        {/* Gig Title */}
        <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-green-600 transition-colors line-clamp-2">
          {gig.title}
        </h3>

        {/* Gig Description */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
          {gig.description || 'Professional service with high quality results.'}
        </p>

        {/* Gig Features */}
        <div className="flex flex-wrap gap-2 mb-4">
          {gigFeatures.slice(0, 3).map((feature, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
            >
              {feature}
            </span>
          ))}
          {gigFeatures.length > 3 && (
            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
              +{gigFeatures.length - 3} more
            </span>
          )}
        </div>

        {/* Gig Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div>
            <div className="flex items-center gap-1 text-sm text-gray-500 mb-1">
              <Clock className="w-4 h-4" />
              <span>{gig.deliveryTime || '7 days'}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {gigPrice}
            </div>
          </div>
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default GigListingsPage;