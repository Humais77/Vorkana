import React, { memo } from 'react';
import { ImageIcon, Grid3x3, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';

const ImageGallerySection = memo(({
  service,
  thumbnailImage,
  galleryImages,
  imageViewMode,
  setImageViewMode,
  activeImage,
  setActiveImage,
  onImageNavigation
}) => {
  return (
    <div className="mb-8">
      {/* View Mode Toggle */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ImageIcon className="h-6 w-6 text-emerald-600" />
          Service Images
        </h2>
        {galleryImages.length > 0 && (
          <div className="flex space-x-2">
            <button
              onClick={() => setImageViewMode('thumbnail')}
              className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium ${
                imageViewMode === 'thumbnail'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <ImageIcon className="h-4 w-4" />
              Thumbnail
            </button>
            <button
              onClick={() => setImageViewMode('gallery')}
              className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium ${
                imageViewMode === 'gallery'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Grid3x3 className="h-4 w-4" />
              Gallery ({galleryImages.length})
            </button>
          </div>
        )}
      </div>

      {/* Thumbnail Section */}
      {imageViewMode === 'thumbnail' && (
        <div className="mb-8">
          <div className="relative h-96 rounded-2xl overflow-hidden mb-4">
            <img
              src={thumbnailImage.url}
              alt={service.title}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                e.target.src = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
              }}
            />
            <div className="absolute top-4 left-4">
              <span className="px-3 py-1 bg-emerald-600 text-white text-xs rounded-full">
                <CheckCircle className="inline h-3 w-3 mr-1" />
                Thumbnail
              </span>
            </div>
            {thumbnailImage.width && thumbnailImage.height && (
              <div className="absolute bottom-4 left-4 bg-black/70 text-white text-xs px-2 py-1 rounded">
                {thumbnailImage.width} × {thumbnailImage.height}
                {thumbnailImage.size && ` • ${Math.round(thumbnailImage.size / 1024)}KB`}
                {thumbnailImage.format && ` • ${thumbnailImage.format.toUpperCase()}`}
              </div>
            )}
          </div>
          
          {/* Thumbnail Info */}
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-emerald-900">Featured Thumbnail</h4>
                <p className="text-sm text-emerald-700">
                  This image is prominently displayed as the service thumbnail
                </p>
              </div>
              <div className="text-sm text-gray-600">
                {thumbnailImage.uploadedAt && (
                  <span>Uploaded: {new Date(thumbnailImage.uploadedAt).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gallery Images Section */}
      {imageViewMode === 'gallery' && galleryImages.length > 0 && (
        <div className="mb-8">
          {/* Gallery Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-gray-900">Service Gallery</h4>
                <p className="text-sm text-gray-600">
                  {galleryImages.length} additional image{galleryImages.length !== 1 ? 's' : ''} showcasing this service
                </p>
              </div>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                <Grid3x3 className="inline h-4 w-4 mr-1" />
                {galleryImages.length} images
              </span>
            </div>
          </div>

          {/* Gallery Navigation */}
          {galleryImages.length > 1 && (
            <div className="flex justify-between items-center mb-4">
              <button
                onClick={() => onImageNavigation('prev')}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <span className="text-sm text-gray-600">
                {activeImage + 1} of {galleryImages.length}
              </span>
              <button
                onClick={() => onImageNavigation('next')}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Gallery Image Display */}
          {galleryImages.length > 0 && (
            <>
              <div className="relative h-96 rounded-2xl overflow-hidden mb-6">
                <img
                  src={galleryImages[activeImage]?.url}
                  alt={`${service.title} - Gallery Image ${activeImage + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
                  }}
                />
                {galleryImages[activeImage]?.width && galleryImages[activeImage]?.height && (
                  <div className="absolute bottom-4 left-4 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    {galleryImages[activeImage].width} × {galleryImages[activeImage].height}
                    {galleryImages[activeImage].size && ` • ${Math.round(galleryImages[activeImage].size / 1024)}KB`}
                    {galleryImages[activeImage].format && ` • ${galleryImages[activeImage].format.toUpperCase()}`}
                  </div>
                )}
              </div>

              {/* Gallery Thumbnails */}
              <div className="flex space-x-3 overflow-x-auto pb-3">
                {galleryImages.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveImage(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                      activeImage === index
                        ? 'border-emerald-500'
                        : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    <img
                      src={image.url}
                      alt={`Gallery ${index + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80';
                      }}
                    />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* No Gallery Images Message */}
      {imageViewMode === 'gallery' && galleryImages.length === 0 && (
        <div className="text-center p-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
          <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Gallery Images</h3>
          <p className="text-gray-600 mb-4">
            This service doesn't have additional gallery images yet.
          </p>
          <button
            onClick={() => setImageViewMode('thumbnail')}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            View Thumbnail
          </button>
        </div>
      )}
    </div>
  );
});

ImageGallerySection.displayName = 'ImageGallerySection';

export default ImageGallerySection;