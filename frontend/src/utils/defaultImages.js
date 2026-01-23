// utils/defaultImages.js
import { buildImageUrl } from './cloudinaryFrontend';

// Your main generic image (with text)
const GENERIC_IMAGE_PUBLIC_ID = "m3idugsicoefjpep6s6s";

export const DEFAULT_IMAGES = {
  // PROFILE: Use a different image or keep as is
  PROFILE: buildImageUrl({
    publicId: "wzbsbwsonnqfxiuyadmp", // Keep same for now, but you might want a different one
    transformations: {
      width: 400,
      height: 400,
      crop: 'fill',
      gravity: 'face',
      radius: 'max' // Makes it circular for profile
    }
  }),
  
  // GENERIC: Your main image with text - for services, gigs, etc.
  GENERIC: buildImageUrl({
    publicId: GENERIC_IMAGE_PUBLIC_ID,
    transformations: {
      width: 800,
      height: 600,
      crop: 'fill'
    }
  }),
  
  // THUMBNAIL: Smaller version for thumbnails
  THUMBNAIL: buildImageUrl({
    publicId: GENERIC_IMAGE_PUBLIC_ID,
    transformations: {
      width: 300,
      height: 200,
      crop: 'fill'
    }
  }),
  
  // GALLERY: For gallery images
  GALLERY: buildImageUrl({
    publicId: GENERIC_IMAGE_PUBLIC_ID,
    transformations: {
      width: 1200,
      height: 800,
      crop: 'fill'
    }
  }),
  
  // For different aspect ratios
  SQUARE: buildImageUrl({
    publicId: GENERIC_IMAGE_PUBLIC_ID,
    transformations: {
      width: 400,
      height: 400,
      crop: 'fill'
    }
  }),
  
  RECTANGLE: buildImageUrl({
    publicId: GENERIC_IMAGE_PUBLIC_ID,
    transformations: {
      width: 800,
      height: 400,
      crop: 'fill'
    }
  })
};

// Helper function - simple and direct
export const getGenericImage = (width = 800, height = 600) => {
  return buildImageUrl({
    publicId: GENERIC_IMAGE_PUBLIC_ID,
    transformations: {
      width,
      height,
      crop: 'fill'
    }
  });
};

// For profile pictures specifically
export const getProfileFallback = () => {
  return DEFAULT_IMAGES.PROFILE;
};