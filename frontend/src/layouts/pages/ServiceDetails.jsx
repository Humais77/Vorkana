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
  Package as PackageIcon,
  Image as ImageIcon,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Download
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
const [selectedImageIndex, setSelectedImageIndex] = useState(null);
const [showImageModal, setShowImageModal] = useState(false);

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
  const isOwner = user && service?.createdBy && (
  user._id === service.createdBy._id ||
  user._id === service.createdBy
);
const openImageModal = (index) => {
  setSelectedImageIndex(index);
  setShowImageModal(true);
};

const closeImageModal = () => {
  setShowImageModal(false);
  setSelectedImageIndex(null);
};

const nextImage = () => {
  if (service?.images && service.images.length > 0) {
    setSelectedImageIndex((prev) => 
      prev === null || prev === service.images.length - 1 ? 0 : prev + 1
    );
  }
};

const prevImage = () => {
  if (service?.images && service.images.length > 0) {
    setSelectedImageIndex((prev) => 
      prev === null || prev === 0 ? service.images.length - 1 : prev - 1
    );
  }
};
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
            {service.images && service.images.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <ImageIcon className="w-6 h-6 mr-2 text-blue-600" />
                Service Images
              </h2>
              
              {/* Thumbnail Preview */}
              {service.thumbnail && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Thumbnail</h3>
                  <div className="relative">
                    <img
                      src={service.thumbnail.url}
                      alt={`${service.title} thumbnail`}
                      className="w-full h-64 object-cover rounded-lg shadow-lg"
                    />
                    <button
                      onClick={() => {
                        const thumbIndex = service.images.findIndex(img => 
                          img.public_id === service.thumbnail?.public_id
                        );
                        if (thumbIndex !== -1) openImageModal(thumbIndex);
                      }}
                      className="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-colors"
                    >
                      <Maximize2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

              {/* All Images Grid */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  All Images ({service.images.length})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {service.images.map((image, index) => (
                    <div
                      key={image.public_id || index}
                      className="relative group cursor-pointer"
                      onClick={() => openImageModal(index)}
                    >
                      <img
                        src={image.url}
                        alt={`${service.title} - Image ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg group-hover:opacity-90 transition-opacity"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 rounded-lg flex items-center justify-center">
                        <Maximize2 className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      {service.thumbnail?.public_id === image.public_id && (
                        <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                          Thumbnail
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Image Info */}
              {service.images.length > 0 && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    Click on any image to view it in full size. 
                    {service.thumbnail && ' The thumbnail is highlighted in blue.'}
                  </p>
                </div>
              )}
            </div>
          )}
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

        </div>
      </div>
      {showImageModal && service?.images && service.images.length > 0 && (
      <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
        <div className="relative max-w-4xl max-h-[90vh]">
          {/* Close Button */}
          <button
            onClick={closeImageModal}
            className="absolute -top-12 right-0 text-white hover:text-gray-300 z-10"
          >
            <X className="w-8 h-8" />
          </button>

          {/* Image */}
          <div className="relative">
            <img
              src={service.images[selectedImageIndex].url}
              alt={`${service.title} - Image ${selectedImageIndex + 1}`}
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
            />
            
            {/* Navigation Buttons */}
            {service.images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-colors"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            {/* Download Button */}
            <a
              href={service.images[selectedImageIndex].url}
              download={`${service.title}-image-${selectedImageIndex + 1}.${service.images[selectedImageIndex].format || 'jpg'}`}
              className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded-lg hover:bg-opacity-70 transition-colors flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              Download
            </a>
          </div>

          {/* Image Info */}
          <div className="mt-4 text-white">
            <p className="text-sm">
              Image {selectedImageIndex + 1} of {service.images.length}
              {service.thumbnail?.public_id === service.images[selectedImageIndex].public_id && 
                ' • Thumbnail'}
            </p>
            {service.images[selectedImageIndex].width && service.images[selectedImageIndex].height && (
              <p className="text-xs text-gray-300 mt-1">
                {service.images[selectedImageIndex].width} × {service.images[selectedImageIndex].height} pixels
              </p>
            )}
          </div>
        </div>
      </div>
    )}
    </div>
  );
};

export default ServiceDetails;