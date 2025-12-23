// components/admin/AdminEditService.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminAPI } from '../../api/admin';
import { toast } from 'react-hot-toast';
import {
  FiSave,
  FiArrowLeft,
  FiPackage,
  FiUpload,
  FiImage,
  FiX,
  FiTrash2,
  FiPlus,
  FiEye
} from 'react-icons/fi';
import { useCategoriesForDropdown } from '../../hooks/useAdminDashboard';

const AdminEditService = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    shortDescription: '',
    category: '',
    subcategory: '',
    price: 0,
    currency: 'USD',
    deliveryTime: 1,
    deliveryTimeUnit: 'days',
    revisions: 1,
    status: 'draft',
    isFeatured: false,
    isRecommended: false,
    isPopular: false,
    tags: []
  });
  
  const [images, setImages] = useState([]);
  const [thumbnail, setThumbnail] = useState(null);
  const [newTag, setNewTag] = useState('');
  
  const { data: categoriesData } = useCategoriesForDropdown();
  const categories = categoriesData?.data || [];

  useEffect(() => {
    fetchService();
  }, [id]);

  const fetchService = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getServiceById(id);
      
      if (response.data?.success) {
        const service = response.data.service || response.data;
        console.log('Fetched service:', service);
        
        setFormData({
          title: service.title || '',
          description: service.description || '',
          shortDescription: service.shortDescription || '',
          category: service.category?._id || service.category || '',
          subcategory: service.subcategory?._id || service.subcategory || '',
          price: service.price || 0,
          currency: service.currency || 'USD',
          deliveryTime: service.deliveryTime || 1,
          deliveryTimeUnit: service.deliveryTimeUnit || 'days',
          revisions: service.revisions || 1,
          status: service.status || 'draft',
          isFeatured: service.isFeatured || false,
          isRecommended: service.isRecommended || false,
          isPopular: service.isPopular || false,
          tags: service.tags || []
        });
        
        if (service.images) {
          setImages(service.images);
        }
        
        if (service.thumbnail) {
          setThumbnail(service.thumbnail);
        }
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

 // In AdminEditService.jsx - Update the handleSubmit function
const handleSubmit = async (e) => {
  e.preventDefault();
  setSaving(true);

  try {
    // Validate required fields
    if (!formData.title || !formData.description || !formData.category) {
      toast.error('Title, description, and category are required');
      setSaving(false);
      return;
    }

    // Validate subcategory - if category is selected but subcategory is empty
    if (formData.category && !formData.subcategory) {
      toast.error('Please select a subcategory');
      setSaving(false);
      return;
    }

    // Prepare data for submission
    const submissionData = {
      ...formData,
      // If subcategory is empty string, remove it from the data
      subcategory: formData.subcategory || undefined,
      // Ensure category is valid
      category: formData.category || undefined
    };

    console.log('Submitting form data:', submissionData);
    
    const response = await adminAPI.updateService(id, submissionData);
    
    if (response.data?.success) {
      toast.success('Service updated successfully');
      navigate('/admin/services');
    } else {
      toast.error(response.data?.message || 'Update failed');
    }
  } catch (error) {
    console.error('Update service error:', error);
    toast.error('Failed to update service: ' + (error.response?.data?.message || error.message));
  } finally {
    setSaving(false);
  }
};

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Service</h1>
          <p className="text-gray-600">Update service details</p>
        </div>
        <button
          onClick={() => navigate('/admin/services')}
          className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <FiArrowLeft className="h-4 w-4 mr-2" />
          Back to Services
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        {/* Basic Information */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Service title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
        </div>

        {/* Category */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Category</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Main Category *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Subcategory *
  </label>
  <select
    required
    value={formData.subcategory}
    onChange={(e) => setFormData({...formData, subcategory: e.target.value})}
    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    disabled={!formData.category}
  >
    <option value="">Select Subcategory</option>
    {formData.category && categories
      .filter(cat => cat.parentCategory === formData.category || cat._id === formData.category)
      .map(subcat => (
        <option key={subcat._id} value={subcat._id}>
          {subcat.name}
        </option>
      ))}
  </select>
  {!formData.category && (
    <p className="text-xs text-gray-500 mt-1">Select a category first</p>
  )}
  {formData.category && !formData.subcategory && (
    <p className="text-xs text-red-500 mt-1">Please select a subcategory</p>
  )}
</div>
          </div>
        </div>

        {/* Pricing and Delivery */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Pricing & Delivery</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price *
              </label>
              <div className="flex">
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({...formData, currency: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-l-lg bg-gray-50"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Time *
              </label>
              <div className="flex">
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.deliveryTime}
                  onChange={(e) => setFormData({...formData, deliveryTime: parseInt(e.target.value)})}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={formData.deliveryTimeUnit}
                  onChange={(e) => setFormData({...formData, deliveryTimeUnit: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-r-lg bg-gray-50"
                >
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Revisions
              </label>
              <input
                type="number"
                min="0"
                max="99"
                value={formData.revisions}
                onChange={(e) => setFormData({...formData, revisions: parseInt(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description *
          </label>
          <textarea
            required
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows="6"
            placeholder="Detailed service description..."
          />
        </div>

        {/* Short Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Short Description *
          </label>
          <textarea
            required
            value={formData.shortDescription}
            onChange={(e) => setFormData({...formData, shortDescription: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows="3"
            placeholder="Brief description (max 200 characters)"
            maxLength="200"
          />
          <p className="text-xs text-gray-500 mt-1">
            {formData.shortDescription.length}/200 characters
          </p>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tags
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Add tag"
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.tags.map((tag, index) => (
              <div key={index} className="flex items-center bg-gray-100 px-3 py-1 rounded-full">
                <span className="text-sm">{tag}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-2 text-gray-500 hover:text-gray-700"
                >
                  <FiX className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Options */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Options</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isFeatured}
                onChange={(e) => setFormData({...formData, isFeatured: e.target.checked})}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Featured Service</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isRecommended}
                onChange={(e) => setFormData({...formData, isRecommended: e.target.checked})}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Recommended</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isPopular}
                onChange={(e) => setFormData({...formData, isPopular: e.target.checked})}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Popular</span>
            </label>
          </div>
        </div>

        {/* Current Images Preview */}
        {images.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Current Images</h3>
            <div className="grid grid-cols-4 gap-4">
              {images.map((image, index) => (
                <div key={index} className="relative">
                  <img
                    src={image.url || image}
                    alt={`Service image ${index + 1}`}
                    className="h-24 w-full object-cover rounded-lg"
                  />
                  {thumbnail?.url === image.url && (
                    <span className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                      Thumbnail
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/admin/services')}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <FiSave className="h-4 w-4 mr-2" />
                Update Service
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminEditService;