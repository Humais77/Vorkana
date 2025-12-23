// components/admin/AdminViewService.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminAPI } from '../../api/admin';
import { toast } from 'react-hot-toast';
import {
  FiArrowLeft,
  FiPackage,
  FiDollarSign,
  FiClock,
  FiStar,
  FiCalendar,
  FiActivity,
  FiUsers,
  FiEye,
  FiEdit2,
  FiTrash2,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle
} from 'react-icons/fi';
import { format } from 'date-fns';

const AdminViewService = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [service, setService] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    fetchService();
  }, [id]);

  const fetchService = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getServiceById(id);
      
      if (response.data?.success) {
        setService(response.data.service || response.data);
      } else {
        toast.error('Failed to load service');
        navigate('/admin/services');
      }
    } catch (error) {
      console.error('Fetch service error:', error);
      toast.error('Failed to load service: ' + (error.response?.data?.message || error.message));
      navigate('/admin/services');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await adminAPI.deleteService(id);
      
      if (response.data?.success) {
        toast.success('Service deleted successfully');
        navigate('/admin/services');
      } else {
        toast.error(response.data?.message || 'Delete failed');
      }
    } catch (error) {
      console.error('Delete service error:', error);
      toast.error('Failed to delete service: ' + (error.response?.data?.message || error.message));
    } finally {
      setShowDeleteModal(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: 'bg-green-100 text-green-800 border border-green-200',
      draft: 'bg-gray-100 text-gray-800 border border-gray-200',
      pending: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      paused: 'bg-orange-100 text-orange-800 border border-orange-200',
      suspended: 'bg-red-100 text-red-800 border border-red-200'
    };
    return badges[status] || badges.draft;
  };

  const formatPrice = (price, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(price);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="text-center py-12">
        <FiAlertCircle className="h-16 w-16 text-gray-400 mx-auto" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">Service not found</h3>
        <p className="mt-2 text-gray-500">The service you're looking for doesn't exist.</p>
        <button
          onClick={() => navigate('/admin/services')}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Back to Services
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Details</h1>
          <p className="text-gray-600">View and manage service information</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => navigate('/admin/services')}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <FiArrowLeft className="h-4 w-4 mr-2" />
            Back to Services
          </button>
          <button
            onClick={() => navigate(`/admin/services/${id}/edit`)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <FiEdit2 className="h-4 w-4 mr-2" />
            Edit Service
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <FiTrash2 className="h-4 w-4 mr-2" />
            Delete
          </button>
        </div>
      </div>

      {/* Service Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-6">
          {service.thumbnail ? (
            <img
              src={service.thumbnail.url || service.thumbnail}
              alt={service.title}
              className="h-40 w-40 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className="h-40 w-40 flex-shrink-0 bg-gray-100 rounded-lg flex items-center justify-center">
              <FiPackage className="h-20 w-20 text-gray-400" />
            </div>
          )}
          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{service.title}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusBadge(service.status)}`}>
                    {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                  </span>
                  {service.isFeatured && (
                    <span className="px-3 py-1 text-sm font-semibold rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                      Featured
                    </span>
                  )}
                  {service.isRecommended && (
                    <span className="px-3 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                      Recommended
                    </span>
                  )}
                  {service.isPopular && (
                    <span className="px-3 py-1 text-sm font-semibold rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                      Popular
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-gray-900">
                  {formatPrice(service.price, service.currency)}
                </div>
                <div className="text-gray-600 mt-1">
                  <FiClock className="inline h-4 w-4 mr-1" />
                  {service.deliveryTime} {service.deliveryTimeUnit}
                </div>
              </div>
            </div>
            
            {/* Stats Grid */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center text-gray-600">
                  <FiStar className="h-4 w-4 mr-2" />
                  <span className="text-sm">Rating</span>
                </div>
                <div className="font-medium text-lg mt-1">
                  {service.rating?.toFixed(1) || '0.0'}
                  <span className="text-sm text-gray-500 ml-1">({service.reviewsCount || 0})</span>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center text-gray-600">
                  <FiActivity className="h-4 w-4 mr-2" />
                  <span className="text-sm">Orders</span>
                </div>
                <div className="font-medium text-lg mt-1">{service.ordersCount || 0}</div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center text-gray-600">
                  <FiEye className="h-4 w-4 mr-2" />
                  <span className="text-sm">Views</span>
                </div>
                <div className="font-medium text-lg mt-1">{service.views || 0}</div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center text-gray-600">
                  <FiCalendar className="h-4 w-4 mr-2" />
                  <span className="text-sm">Created</span>
                </div>
                <div className="font-medium text-lg mt-1">
                  {format(new Date(service.createdAt), 'MMM d, yyyy')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        {service.description && (
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Description</h3>
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-600 whitespace-pre-line">{service.description}</p>
            </div>
          </div>
        )}

        {/* Images */}
        {service.images && service.images.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Service Images</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {service.images.map((image, index) => (
                <img
                  key={index}
                  src={image.url || image}
                  alt={`Service image ${index + 1}`}
                  className="h-40 w-full object-cover rounded-lg"
                />
              ))}
            </div>
          </div>
        )}

        {/* Additional Info */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Creator Info */}
          {service.createdBy && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Created By</h3>
              <div className="flex items-center gap-3">
                {service.createdBy.picture ? (
                  <img
                    src={service.createdBy.picture}
                    alt={service.createdBy.name}
                    className="h-12 w-12 rounded-full"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                    <FiUsers className="h-6 w-6 text-gray-500" />
                  </div>
                )}
                <div>
                  <div className="font-medium">{service.createdBy.name}</div>
                  <div className="text-sm text-gray-500">{service.createdBy.email}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {service.createdBy.role.charAt(0).toUpperCase() + service.createdBy.role.slice(1)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Category Info */}
          {service.category && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Category</h3>
              <div className="flex items-center gap-3">
                {service.category.icon ? (
                  <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center">
                    <span className="text-2xl">{service.category.icon}</span>
                  </div>
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
                    <FiPackage className="h-6 w-6 text-gray-500" />
                  </div>
                )}
                <div>
                  <div className="font-medium">{service.category.name}</div>
                  {service.subcategory && (
                    <div className="text-sm text-gray-500">{service.subcategory.name}</div>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    Services: {service.category.servicesCount || 0}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Technical Info */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Technical Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-600">Service ID</div>
              <div className="font-mono text-sm break-all">{service._id}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Last Updated</div>
              <div className="font-medium">
                {format(new Date(service.updatedAt), 'MMM d, yyyy HH:mm')}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Revisions</div>
              <div className="font-medium">{service.revisions || 0}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Tags</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {service.tags?.map((tag, index) => (
                  <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <FiTrash2 className="h-6 w-6 text-red-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Confirm Delete</h3>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex">
                  <FiAlertCircle className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-yellow-800">Warning</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      This will permanently delete the service "{service.title}". This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
                >
                  <FiTrash2 className="h-4 w-4 mr-2" />
                  Delete Service
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminViewService;