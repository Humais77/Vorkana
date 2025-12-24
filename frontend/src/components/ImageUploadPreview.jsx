import React, { useState, useCallback } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

const ImageUploadPreview = ({ 
  uploadedImages = [], 
  thumbnailFile, 
  onImageUpload, 
  onThumbnailUpload, 
  onRemoveImage, 
  onRemoveThumbnail, 
  onClearAllImages,
  isUploading = false,
  isPending = false 
}) => {
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onImageUpload(files);
    }
  }, [onImageUpload]);

  return (
    <div className="space-y-8">
      {/* Image Upload */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Service Images</h3>
        <div className="space-y-4">
          {/* Upload Area */}
          <div 
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragOver 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-blue-500'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="image-upload"
              multiple
              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
              onChange={(e) => onImageUpload(e.target.files)}
              className="hidden"
              disabled={isUploading || isPending}
            />
            <label htmlFor="image-upload" className="cursor-pointer block">
              <Upload className={`w-12 h-12 mx-auto mb-4 ${dragOver ? 'text-blue-500' : 'text-gray-400'}`} />
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                Upload Service Images
              </h4>
              <p className="text-gray-600 mb-4">
                Drag & drop images or click to browse
              </p>
              <p className="text-sm text-gray-500">
                Supports JPEG, PNG, WebP, GIF • Max 5MB each • Up to 10 images
              </p>
              {dragOver && (
                <div className="mt-4 p-2 bg-blue-100 text-blue-700 rounded-lg text-sm">
                  Drop images here
                </div>
              )}
            </label>
          </div>

          {/* Image Preview Grid */}
          {uploadedImages.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-medium text-gray-900">
                  Selected Images ({uploadedImages.length}/10)
                </h4>
                <button
                  type="button"
                  onClick={onClearAllImages}
                  className="text-sm text-red-600 hover:text-red-700"
                  disabled={isPending}
                >
                  Remove All
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {uploadedImages.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={image.preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                      loading="lazy"
                    />
                    <button
                      type="button"
                      onClick={() => onRemoveImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      disabled={isPending}
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b-lg truncate">
                      {image.name.substring(0, 20)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Thumbnail Upload */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Thumbnail</h3>
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">
            The thumbnail is the main image displayed in service listings. 
            It should be eye-catching and representative of your service.
          </p>

          {thumbnailFile ? (
            <div className="flex items-start gap-4">
              <div className="relative">
                <img
                  src={thumbnailFile.preview}
                  alt="Thumbnail preview"
                  className="w-32 h-32 object-cover rounded-lg"
                  loading="lazy"
                />
                <button
                  type="button"
                  onClick={onRemoveThumbnail}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                  disabled={isPending}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">{thumbnailFile.name}</h4>
                <p className="text-gray-500 text-sm">
                  {(thumbnailFile.size / 1024 / 1024).toFixed(2)} MB • {thumbnailFile.type}
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  This image will be used as the service thumbnail.
                </p>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-500 transition-colors">
              <input
                type="file"
                id="thumbnail-upload"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={(e) => onThumbnailUpload(e.target.files[0])}
                className="hidden"
                disabled={isUploading || isPending}
              />
              <label htmlFor="thumbnail-upload" className="cursor-pointer block">
                <ImageIcon className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <h4 className="text-lg font-medium text-gray-900 mb-1">
                  Upload Thumbnail
                </h4>
                <p className="text-gray-600 text-sm mb-2">
                  Recommended: 800×600 pixels, max 2MB
                </p>
                <p className="text-gray-500 text-xs">
                  Click to browse or drag & drop
                </p>
              </label>
            </div>
          )}

          {/* Tip */}
          {uploadedImages.length > 0 && !thumbnailFile && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-700">
                <strong>Tip:</strong> You can also select a thumbnail from your uploaded images 
                after creating the service.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(ImageUploadPreview);