// ServiceDetails.jsx - Complete updated file
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Star,
  Clock,
  CheckCircle,
  DollarSign,
  Tag,
  MessageSquare,
  Calendar,
  Users,
  Eye,
  Share2,
  Heart,
  Loader2,
  ExternalLink,
  HelpCircle,
  Package as PackageIcon
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useService, useDeleteService } from '../../hooks/useServices';
import { toast } from 'react-hot-toast';

const ServiceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  const {
    data: service,
    isLoading,
    error,
    refetch
  } = useService(id);

  const deleteServiceMutation = useDeleteService();

  const [selectedPackage, setSelectedPackage] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (service && service._id) {
      console.log('Service loaded:', service);
    }
  }, [service]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this service? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(true);
      await deleteServiceMutation.mutateAsync({ id });
      toast.success('Service deleted successfully');
      navigate('/profile?tab=services');
    } catch (error) {
      console.error('Error deleting service:', error);
      toast.error(error.message || 'Failed to delete service');
    } finally {
      setDeleting(false);
    }
  };

  const handleEdit = () => {
    navigate(`/services/edit/${id}`);
  };

  const handleContactSeller = () => {
    if (!isAuthenticated) {
      toast.error('Please login to contact the seller');
      navigate('/login');
      return;
    }

    // Navigate to messaging page or open modal
    navigate(`/messages/new?service=${id}&seller=${service?.seller?._id || service?.seller}`);
  };

  const handleOrderNow = () => {
    if (!isAuthenticated) {
      toast.error('Please login to place an order');
      navigate('/login');
      return;
    }

    if (service?.packages && service.packages.length > 0) {
      const selectedPkg = service.packages[selectedPackage];
      navigate(`/checkout?service=${id}&package=${selectedPkg._id || selectedPackage}`);
    } else {
      navigate(`/checkout?service=${id}`);
    }
  };

  const handleShareService = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url)
      .then(() => toast.success('Link copied to clipboard!'))
      .catch(() => toast.error('Failed to copy link'));
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate total price including selected package
  const getTotalPrice = () => {
    if (service?.packages && service.packages.length > 0) {
      const selectedPkg = service.packages[selectedPackage];
      return selectedPkg.price || service.price;
    }
    return service?.price || 0;
  };

  // Check if current user is the owner
  const isOwner = user && service?.seller && (
    user._id === service.seller._id ||
    user._id === service.seller
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading service details...</p>
        </div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <button
            onClick={() => navigate('/profile?tab=services')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-8"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Services
          </button>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {error ? 'Error Loading Service' : 'Service Not Found'}
            </h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {error?.message || 'The service you are looking for does not exist or has been removed.'}
            </p>
            <button
              onClick={() => navigate('/profile?tab=services')}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Services
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/profile?tab=services')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Services
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{service.title}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${service.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : service.status === 'draft'
                      ? 'bg-yellow-100 text-yellow-800'
                      : service.status === 'pending'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-red-100 text-red-800'
                  }`}>
                  {service.status === 'active' && <CheckCircle className="w-4 h-4 mr-1" />}
                  {service.status === 'draft' && <Edit className="w-4 h-4 mr-1" />}
                  {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                </span>

                {service.category && (
                  <Link
                    to={`/services?category=${service.category}`}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                  >
                    {service.category?.name || 'Uncategorized'}
                  </Link>
                )}

                <div className="flex items-center text-gray-600">
                  <Eye className="w-4 h-4 mr-1" />
                  <span>{service.views || 0} views</span>
                </div>

                <div className="flex items-center text-gray-600">
                  <Users className="w-4 h-4 mr-1" />
                  <span>{service.ordersCount || 0} orders</span>
                </div>

                <div className="flex items-center text-gray-600">
                  <Calendar className="w-4 h-4 mr-1" />
                  <span>{formatDate(service.createdAt)}</span>
                </div>
              </div>
            </div>

            {isOwner && (
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleEdit}
                  className="inline-flex items-center px-5 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                >
                  <Edit className="w-5 h-5 mr-2" />
                  Edit Service
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting || deleteServiceMutation.isPending}
                  className="inline-flex items-center px-5 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting || deleteServiceMutation.isPending ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-5 h-5 mr-2" />
                  )}
                  {deleting || deleteServiceMutation.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Service Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Short Description */}
            {service.shortDescription && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <p className="text-lg text-gray-700">{service.shortDescription}</p>
              </div>
            )}

            {/* Description */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Service Description</h2>
              <div className="prose max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">{service.description}</p>
              </div>
            </div>

            {/* Features */}
            {service.features && service.features.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">What's Included</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {service.features.map((feature, index) => (
                    <div key={index} className="flex items-start p-3 bg-gray-50 rounded-lg">
                      {feature.included !== false ? (
                        <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      ) : (
                        <div className="w-5 h-5 border-2 border-gray-300 rounded-full mr-3 mt-0.5 flex-shrink-0"></div>
                      )}
                      <div>
                        <h4 className="font-medium text-gray-900">{feature.title}</h4>
                        {feature.description && (
                          <p className="text-gray-600 text-sm mt-1">{feature.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Packages */}
            {service.packages && service.packages.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                  <PackageIcon className="w-6 h-6 mr-2 text-amber-600" />
                  Service Packages
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {service.packages.map((pkg, index) => (
                    <div
                      key={index}
                      className={`border-2 rounded-xl p-5 cursor-pointer transition-all ${selectedPackage === index
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                        } ${pkg.popular ? 'relative' : ''}`}
                      onClick={() => setSelectedPackage(index)}
                    >
                      {pkg.popular && (
                        <span className="absolute -top-2 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-yellow-500 text-white text-xs font-medium rounded-full">
                          Most Popular
                        </span>
                      )}
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-lg text-gray-900">{pkg.name}</h3>
                        <div className="flex items-center">
                          <DollarSign className="w-4 h-4 text-gray-600 mr-1" />
                          <span className="font-bold text-xl">${pkg.price}</span>
                        </div>
                      </div>

                      {pkg.description && (
                        <p className="text-gray-600 text-sm mb-4">{pkg.description}</p>
                      )}

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Delivery Time:</span>
                          <span className="font-medium">{pkg.deliveryTime} days</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Revisions:</span>
                          <span className="font-medium">{pkg.revisions || 0}</span>
                        </div>
                      </div>

                      {pkg.features && pkg.features.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Includes:</h4>
                          <ul className="space-y-1">
                            {pkg.features.slice(0, 3).map((feature, featIndex) => (
                              <li key={featIndex} className="text-sm text-gray-600 flex items-center">
                                <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                                <span>{feature}</span>
                              </li>
                            ))}
                            {pkg.features.length > 3 && (
                              <li className="text-sm text-gray-500">
                                +{pkg.features.length - 3} more features
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FAQs */}
            {service.faqs && service.faqs.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
                <div className="space-y-6">
                  {service.faqs.map((faq, index) => (
                    <div key={index} className="pb-6 border-b border-gray-200 last:border-0 last:pb-0">
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                        <HelpCircle className="w-5 h-5 text-blue-500 mr-2" />
                        {faq.question}
                      </h4>
                      <p className="text-gray-600 pl-7">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Requirements */}
            {service.requirements && service.requirements.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Requirements</h2>
                <div className="space-y-4">
                  {service.requirements.map((req, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{req.question}</h4>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded ${req.type === 'file' ? 'bg-purple-100 text-purple-800' :
                              req.type === 'choice' ? 'bg-blue-100 text-blue-800' :
                                req.type === 'multiple' ? 'bg-green-100 text-green-800' :
                                  'bg-gray-100 text-gray-800'
                            }`}>
                            {req.type}
                          </span>
                          {req.required && (
                            <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded">
                              Required
                            </span>
                          )}
                        </div>
                      </div>
                      {req.options && req.options.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-600 mb-1">Options:</p>
                          <div className="flex flex-wrap gap-2">
                            {req.options.map((option, optIndex) => (
                              <span
                                key={optIndex}
                                className="text-xs px-3 py-1 bg-white border border-gray-300 rounded-full text-gray-700"
                              >
                                {option}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Order Panel */}
          <div className="space-y-6">
            {/* Pricing Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sticky top-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="flex items-center">
                    <DollarSign className="w-5 h-5 text-gray-600 mr-1" />
                    <span className="text-3xl font-bold text-gray-900">
                      ${getTotalPrice()}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mt-1">Starting price</p>
                </div>

                <div className="flex items-center">
                  <Star className="w-5 h-5 text-yellow-400 fill-yellow-400 mr-1" />
                  <span className="font-medium">{service.rating?.toFixed(1) || '0.0'}</span>
                  <span className="text-gray-500 text-sm ml-1">
                    ({service.reviewsCount || 0})
                  </span>
                </div>
              </div>

              {/* Delivery Info */}
              {(!service.packages || service.packages.length === 0) && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center text-gray-600">
                      <Clock className="w-5 h-5 mr-2" />
                      <span>Delivery Time</span>
                    </div>
                    <span className="font-medium">
                      {service.deliveryTime} {service.deliveryTimeUnit || 'days'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-gray-600">
                      <CheckCircle className="w-5 h-5 mr-2" />
                      <span>Revisions</span>
                    </div>
                    <span className="font-medium">{service.revisions || 0} included</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                {!isOwner ? (
                  <>
                    <button
                      onClick={handleOrderNow}
                      className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center"
                    >
                      <DollarSign className="w-5 h-5 mr-2" />
                      Order Now (${getTotalPrice()})
                    </button>
                    <button
                      onClick={handleContactSeller}
                      className="w-full py-3 border-2 border-blue-600 text-blue-600 font-medium rounded-xl hover:bg-blue-50 transition-colors flex items-center justify-center"
                    >
                      <MessageSquare className="w-5 h-5 mr-2" />
                      Contact Seller
                    </button>

                    <button
                      onClick={() => navigate(`/orders/create?service=${service._id}&package=${selectedPackage?._id}`)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Order Now
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => navigate(`/services/analytics/${id}`)}
                      className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center"
                    >
                      <ExternalLink className="w-5 h-5 mr-2" />
                      View Analytics
                    </button>
                    <button
                      onClick={handleShareService}
                      className="w-full py-3 border-2 border-gray-200 text-gray-700 font-medium rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-colors flex items-center justify-center"
                    >
                      <Share2 className="w-5 h-5 mr-2" />
                      Share Service
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Seller Info */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2 text-blue-500" />
                About the Seller
              </h3>

              {service.sellerDetails || service.seller ? (
                <>
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden flex-shrink-0">
                      {service.sellerDetails?.avatar || service.seller?.avatar ? (
                        <img
                          src={service.sellerDetails?.avatar || service.seller?.avatar}
                          alt={service.sellerDetails?.username || service.seller?.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white font-bold">
                          {(service.sellerDetails?.username || service.seller?.username || 'S')?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900">
                        {service.sellerDetails?.username || service.seller?.username || 'Unknown Seller'}
                      </h4>
                      <p className="text-gray-600 text-sm">
                        {service.sellerDetails?.fullName || service.seller?.fullName || 'Service Provider'}
                      </p>
                      <div className="flex items-center mt-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 mr-1" />
                        <span className="text-sm font-medium">
                          {service.sellerDetails?.rating?.toFixed(1) || service.seller?.rating?.toFixed(1) || '0.0'}
                        </span>
                        <span className="text-gray-500 text-sm ml-1">
                          ({service.sellerDetails?.totalSales || service.seller?.totalSales || 0} sales)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Response Time</span>
                      <span className="font-medium">
                        {service.sellerDetails?.responseTime || service.seller?.responseTime || 'Within 24 hours'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Member Since</span>
                      <span className="font-medium">
                        {formatDate(service.sellerDetails?.joinDate || service.seller?.joinDate)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Location</span>
                      <span className="font-medium">
                        {service.sellerDetails?.country || service.seller?.country || 'N/A'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleContactSeller}
                    className="w-full mt-6 py-2 border-2 border-blue-600 text-blue-600 font-medium rounded-xl hover:bg-blue-50 transition-colors flex items-center justify-center"
                  >
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Contact Seller
                  </button>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500">Seller information not available</p>
                </div>
              )}
            </div>

            {/* Tags */}
            {service.tags && service.tags.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                  <Tag className="w-5 h-5 mr-2 text-blue-500" />
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {service.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-sm hover:bg-gray-200 transition-colors"
                    >
                      <Tag className="w-3 h-3 mr-1.5" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Category */}
            {service.category && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                  <ExternalLink className="w-5 h-5 mr-2 text-blue-500" />
                  Category
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="font-medium text-blue-700">
                      {service.category?.name || 'Uncategorized'}
                    </span>
                    <Link
                      to={`/services?category=${service.category._id || service.category}`}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View all
                    </Link>
                  </div>
                  {service.subcategory && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium text-gray-700">
                        {service.subcategory?.name || 'Subcategory'}
                      </span>
                      <Link
                        to={`/services?subcategory=${service.subcategory._id || service.subcategory}`}
                        className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                      >
                        View all
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceDetails;