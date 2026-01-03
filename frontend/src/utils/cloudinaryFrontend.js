// utils/cloudinaryFrontend.js
export const buildImageUrl = ({ publicId, width, height, format='auto', quality='auto' }) => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  let url = `https://res.cloudinary.com/${cloudName}/image/upload/f_${format},q_${quality}`;
  if (width) url += `,w_${width}`;
  if (height) url += `,h_${height}`;
  url += `/${publicId}`;
  return url;
};
