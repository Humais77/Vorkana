// components/ImageUpload.jsx
import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { servicesAPI } from '../api/services';
import { toast } from 'react-hot-toast';

const ImageUpload = ({ 
  serviceId, 
  onImagesUploaded, 
  existingImages = [],
  maxImages = 10,
  thumbnailUrl = null,
  onThumbnailSet 
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedThumbnail, setSelectedThumbnail] = useState(null);
  
  const fileInputRef = useRef(null);
  const thumbnailInputRef = useRef(null);
  
  const remainingSlots = maxImages - existingImages.length - selectedFiles.length;
  
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length > remainingSlots) {
      toast.error(`You can only upload ${remainingSlots} more images`);
      return;
    }
    
    files.forEach(file => {
      try {
        servicesAPI.validateImageFile(file);
        setSelectedFiles(prev => [...prev, file]);
      } catch (error) {
        toast.error(`${file.name}: ${error.message}`);
      }
    });
    
    // Reset input
    e.target.value = null;
  };
  
  const handleThumbnailSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      servicesAPI.validateThumbnailFile(file);
      setSelectedThumbnail(file);
    } catch (error) {
      toast.error(error.message);
      e.target.value = null;
    }
  };
  
  const removeSelectedFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };
  
  const uploadImages = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select images to upload');
      return;
    }
    
    try {
      setUploading(true);
      
      // Create FormData
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('images', file);
      });
      
      // Upload images
      const response = await servicesAPI.uploadImages(serviceId, selectedFiles);
      
      if (response.success) {
        toast.success(`${response.images?.length || selectedFiles.length} images uploaded successfully!`);
        setSelectedFiles([]);
        
        if (onImagesUploaded) {
          onImagesUploaded(response.images || []);
        }
      }
      
    } catch (error) {
      toast.error(error.message || 'Failed to upload images');
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  };
  
  const uploadThumbnail = async () => {
    if (!selectedThumbnail) {
      toast.error('Please select a thumbnail image');
      return;
    }
    
    try {
      setUploading(true);
      
      const response = await servicesAPI.uploadThumbnail(serviceId, selectedThumbnail);
      
      if (response.success) {
        toast.success('Thumbnail uploaded successfully!');
        setSelectedThumbnail(null);
        
        if (onThumbnailSet) {
          onThumbnailSet(response.thumbnail);
        }
      }
      
    } catch (error) {
      toast.error(error.message || 'Failed to upload thumbnail');
    } finally {
      setUploading(false);
    }
  };
  
  const setAsThumbnail = async (imageUrl) => {
    try {
      const response = await servicesAPI.setThumbnail(serviceId, imageUrl);
      
      if (response.success) {
        toast.success('Thumbnail set successfully!');
        
        if (onThumbnailSet) {
          onThumbnailSet(imageUrl);
        }
      }
      
    } catch (error) {
      toast.error(error.message || 'Failed to set thumbnail');
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Image Upload Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Service Images</h3>
        
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">
              {existingImages.length} of {maxImages} images uploaded
            </p>
            <span className={`text-sm font-medium ${remainingSlots > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {remainingSlots} slots remaining
            </span>
          </div>
          
          {remainingSlots > 0 && (
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="w-4 h-4 mr-2" />
                Select Images
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/svg+xml"
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading}
              />
              
              <p className="text-sm text-gray-500">
                Maximum 5MB per file. Formats: JPEG, PNG, WebP, GIF, SVG
              </p>
            </div>
          )}
        </div>
        
        {/* Selected Files Preview */}
        {selectedFiles.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Images ({selectedFiles.length})</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {selectedFiles.map((file, index) => (
                <div key={index} className="relative border border-gray-200 rounded-lg p-2">
                  <div className="aspect-square overflow-hidden rounded bg-gray-100 mb-2">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-xs text-gray-600 truncate" title={file.name}>
                    {file.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {servicesAPI.formatFileSize(file.size)}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSelectedFile(index)}
                    disabled={uploading}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            
            <button
              type="button"
              onClick={uploadImages}
              disabled={uploading || selectedFiles.length === 0}
              className="mt-4 flex items-center px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 mr-2" />
                  Upload {selectedFiles.length} Images
                </>
              )}
            </button>
          </div>
        )}
      </div>
      
      {/* Thumbnail Upload Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Thumbnail</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Thumbnail Upload */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Upload New Thumbnail</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => thumbnailInputRef.current?.click()}
                  disabled={uploading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  Select Thumbnail
                </button>
                
                <input
                  ref={thumbnailInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleThumbnailSelect}
                  className="hidden"
                  disabled={uploading}
                />
                
                <p className="text-sm text-gray-500">
                  Maximum 2MB. Formats: JPEG, PNG, WebP
                </p>
              </div>
              
              {selectedThumbnail && (
                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 overflow-hidden rounded bg-gray-100 flex-shrink-0">
                      <img
                        src={URL.createObjectURL(selectedThumbnail)}
                        alt={selectedThumbnail.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {selectedThumbnail.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {servicesAPI.formatFileSize(selectedThumbnail.size)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedThumbnail(null)}
                      disabled={uploading}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <button
                    type="button"
                    onClick={uploadThumbnail}
                    disabled={uploading}
                    className="mt-3 w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    {uploading ? 'Uploading...' : 'Upload Thumbnail'}
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Current Thumbnail & Existing Images */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Set from Existing Images</h4>
            
            {existingImages.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {existingImages.slice(0, 6).map((imageUrl, index) => (
                  <div key={index} className="relative group">
                    <div className={`aspect-square overflow-hidden rounded-lg border-2 ${thumbnailUrl === imageUrl ? 'border-blue-500' : 'border-gray-200'} hover:border-blue-400 transition-colors`}>
                      <img
                        src={imageUrl}
                        alt={`Service image ${index + 1}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    
                    {thumbnailUrl === imageUrl ? (
                      <div className="absolute top-1 right-1 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center">
                        <CheckCircle className="w-3 h-3" />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAsThumbnail(imageUrl)}
                        disabled={uploading}
                        className="absolute top-1 right-1 w-6 h-6 bg-white text-gray-600 rounded-full opacity-0 group-hover:opacity-100 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 flex items-center justify-center shadow-sm"
                      >
                        <ImageIcon className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
                
                {existingImages.length > 6 && (
                  <div className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400">
                    +{existingImages.length - 6} more
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg">
                <div className="text-center">
                  <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No images uploaded yet</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageUpload;