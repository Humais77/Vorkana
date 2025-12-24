import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Package, 
  MapPin, 
  Briefcase, 
  TrendingUp, 
  Activity, 
  Award, 
  Languages, 
  MessageCircle,
  ShieldCheck,
  ThumbsUp,
  Timer,
  CheckCircle,
  DollarSign as DollarSignIcon,
  Clock,
  Layers,
  Tag
} from 'lucide-react';

const ServiceStatsSidebar = memo(({
  service,
  viewCount,
  timeAgo,
  renderStars,
  getStatusColor,
  formatPrice,
  renderRequiredIndicator,
  serviceUser,
  isOnline,
  setShowMessaging
}) => {
  return (
    <>
      {/* Service Quick Stats */}
      <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Service Stats</h3>
        <div className="space-y-5">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">Status</span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(service.status)}`}>
              {service.status?.toUpperCase() || 'ACTIVE'}
            </span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">Rating</span>
            {renderStars(service.rating || 0)}
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">Views</span>
            <span className="font-semibold text-blue-600">{viewCount}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">Likes</span>
            <span className="font-semibold text-pink-600">{service.likes || 0}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">Posted</span>
            <span className="font-semibold text-gray-900">{timeAgo}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">Delivery Time</span>
            <span className="font-semibold text-gray-900">
              {service.deliveryTime} {service.deliveryTimeUnit}
            </span>
          </div>
          {service.revisions !== undefined && (
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Revisions</span>
              <span className="font-semibold text-gray-900">{service.revisions}</span>
            </div>
          )}
          {service.images && (
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Images</span>
              <span className="font-semibold text-purple-600">
                {service.images.length + (service.thumbnail?.url ? 1 : 0)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Price & Delivery Card */}
      <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Price & Delivery</h3>
        
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold text-emerald-900">Starting Price</h4>
              <span className="text-2xl font-bold text-emerald-600">
                {formatPrice(service.price, service.currency)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Currency: {service.currency}</span>
            </div>
            <div className="mt-2">
              {renderRequiredIndicator('price', service.price)}
            </div>
          </div>
          
          {service.packages && service.packages.length > 0 ? (
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-gray-600 mb-2">
                <Package className="inline h-4 w-4 mr-1" />
                {service.packages.length} packages available
              </p>
              <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                View Packages
              </button>
            </div>
          ) : (
            <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-600">No packages available</p>
            </div>
          )}
        </div>
        
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Delivery Time</span>
              <span className="font-semibold">{service.deliveryTime} {service.deliveryTimeUnit}</span>
            </div>
            {renderRequiredIndicator('deliveryTime', service.deliveryTime)}
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Revisions</span>
              <span className="font-semibold">{service.revisions || 0} included</span>
            </div>
            
            {renderRequiredIndicator('revisions', service.revisions)}
            
            {service.deliveryTime && (
              <div className="text-xs text-gray-500 mt-2">
                Estimated completion time based on average delivery
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Category & Tags */}
      <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Category & Tags</h3>
        <div className="space-y-4">
          {service.category && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-600">Main Category</h4>
                <span className="text-xs text-emerald-600 font-medium">Required</span>
              </div>
              <div className="flex items-center p-3 bg-emerald-50 rounded-lg">
                <Package className="h-5 w-5 text-emerald-600 mr-3" />
                <div>
                  <span className="font-semibold text-gray-900 block">{service.categoryDetails?.name || service.category}</span>
                  {renderRequiredIndicator('category', service.category)}
                  {service.categoryDetails?.description && (
                    <p className="text-xs text-gray-500 mt-1">{service.categoryDetails.description}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {service.subcategory && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-600">Subcategory</h4>
                <span className="text-xs text-emerald-600 font-medium">Required</span>
              </div>
              <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                <Layers className="h-5 w-5 text-blue-600 mr-3" />
                <div>
                  <span className="font-semibold text-gray-900">{service.subcategoryDetails?.name || service.subcategory}</span>
                  {renderRequiredIndicator('subcategory', service.subcategory)}
                </div>
              </div>
            </div>
          )}

          {service.tags && service.tags.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">Service Tags</h4>
              <div className="flex flex-wrap gap-2">
                {service.tags.slice(0, 6).map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {service.searchKeywords && service.searchKeywords.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">Search Keywords</h4>
              <div className="flex flex-wrap gap-2">
                {service.searchKeywords.slice(0, 5).map((keyword, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced User Information Card */}
      {serviceUser && (
        <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Provider Profile</h3>
          <div className="space-y-4">
            <Link 
              to={`/profile/${serviceUser._id}`}
              className="flex items-center space-x-3 group cursor-pointer p-3 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <div className="relative">
                <img
                  src={serviceUser.picture || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80'}
                  alt={serviceUser.name}
                  className="w-12 h-12 rounded-full border-2 border-white group-hover:border-emerald-100 transition-colors"
                  loading="lazy"
                />
                {isOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border border-white"></div>
                )}
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">
                  {serviceUser.name}
                </h4>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  View Profile
                  <ExternalLink className="h-3 w-3" />
                </p>
              </div>
            </Link>

            {/* User Details Grid */}
            <div className="grid grid-cols-2 gap-3">
              {serviceUser.country && (
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <MapPin className="h-4 w-4 text-gray-600 mr-2" />
                  <div className="truncate">
                    <h4 className="text-xs text-gray-500">Location</h4>
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {serviceUser.country}
                    </p>
                  </div>
                </div>
              )}

              {serviceUser.occupation && (
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <Briefcase className="h-4 w-4 text-gray-600 mr-2" />
                  <div className="truncate">
                    <h4 className="text-xs text-gray-500">Occupation</h4>
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {serviceUser.occupation}
                    </p>
                  </div>
                </div>
              )}

              {serviceUser.rating && (
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-gray-600 mr-2" />
                  <div>
                    <h4 className="text-xs text-gray-500">Rating</h4>
                    <div className="flex items-center">
                      <div className="text-yellow-400">★</div>
                      <span className="text-sm font-medium text-gray-900 ml-1">
                        {serviceUser.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {serviceUser.completedOrders !== undefined && (
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <Activity className="h-4 w-4 text-gray-600 mr-2" />
                  <div>
                    <h4 className="text-xs text-gray-500">Completed</h4>
                    <p className="text-sm font-medium text-gray-900">
                      {serviceUser.completedOrders}
                    </p>
                  </div>
                </div>
              )}

              {serviceUser.accountType && (
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <Award className="h-4 w-4 text-gray-600 mr-2" />
                  <div>
                    <h4 className="text-xs text-gray-500">Account Type</h4>
                    <p className="text-sm font-medium text-gray-900 capitalize">
                      {serviceUser.accountType}
                    </p>
                  </div>
                </div>
              )}

              {serviceUser.languages && serviceUser.languages.length > 0 && (
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <Languages className="h-4 w-4 text-gray-600 mr-2" />
                  <div>
                    <h4 className="text-xs text-gray-500">Languages</h4>
                    <p className="text-sm font-medium text-gray-900">
                      {serviceUser.languages.length}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Contact Provider Button */}
            <button
              onClick={() => setShowMessaging(true)}
              className="w-full px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              Contact Provider
            </button>
          </div>
        </div>
      )}

      {/* Safety & Trust */}
      <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-emerald-600" />
          Safety & Trust
        </h3>
        <div className="space-y-4">
          <div className="flex items-start p-3 bg-gray-50 rounded-lg">
            <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center mr-3">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 text-sm">Secure Payments</h4>
              <p className="text-xs text-gray-600">Your payment is protected</p>
            </div>
          </div>
          <div className="flex items-start p-3 bg-gray-50 rounded-lg">
            <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center mr-3">
              <ThumbsUp className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 text-sm">Satisfaction Guarantee</h4>
              <p className="text-xs text-gray-600">{service.revisions || 0} revisions included</p>
            </div>
          </div>
          <div className="flex items-start p-3 bg-gray-50 rounded-lg">
            <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center mr-3">
              <Timer className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 text-sm">On-time Delivery</h4>
              <p className="text-xs text-gray-600">{service.deliveryTime}-day delivery guarantee</p>
            </div>
          </div>
          <div className="flex items-start p-3 bg-gray-50 rounded-lg">
            <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center mr-3">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 text-sm">Verified Provider</h4>
              <p className="text-xs text-gray-600">Identity verified</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

ServiceStatsSidebar.displayName = 'ServiceStatsSidebar';

export default ServiceStatsSidebar;