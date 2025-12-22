// hooks/useProfilePicture.js - UPDATED
import { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { toast } from 'react-hot-toast';
import axios from 'axios';

export const useProfilePicture = () => {
  const [isUploading, setIsUploading] = useState(false);
  const { setUser } = useAuthStore();

  const uploadProfilePicture = async (file) => {
    if (!file) {
      toast.error('Please select a file');
      return null;
    }

    // Validate file
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB');
      return null;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only image files (JPEG, JPG, PNG, WebP) are allowed');
      return null;
    }

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('profilePicture', file);
      
      const token = localStorage.getItem('userToken');
      const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
      
      console.log('🚀 Uploading profile picture to:', `${API_URL}/api/users/upload-profile-picture`);
      
      const response = await axios.post(
        `${API_URL}/api/users/upload-profile-picture`, 
        formData, 
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            // DO NOT set Content-Type header here - let axios handle it
          },
          withCredentials: true,
          timeout: 30000
        }
      );
      
      console.log('✅ Upload response:', {
        success: response.data.success,
        hasPicture: !!response.data.picture,
        pictureUrl: response.data.picture,
        pictureType: typeof response.data.picture,
        pictureFirst100: response.data.picture?.substring(0, 100)
      });
      
      if (response.data.success && response.data.picture) {
        const pictureUrl = response.data.picture;
        
        // Check if it's a proper URL or base64
        if (pictureUrl.startsWith('data:')) {
          console.error('❌ Received base64 instead of URL:', pictureUrl.substring(0, 100) + '...');
          throw new Error('Server returned base64 data instead of URL');
        }
        
        if (!pictureUrl.startsWith('http')) {
          console.error('❌ Invalid URL format:', pictureUrl);
          throw new Error('Invalid URL format received from server');
        }
        
        // Add cache busting parameter
        const cacheBustedUrl = `${pictureUrl}?t=${Date.now()}`;
        
        // Update Zustand store with the complete user object from response
        if (response.data.user) {
          // Ensure we have the cache-busted URL in user object
          const updatedUser = {
            ...response.data.user,
            picture: cacheBustedUrl
          };
          
          setUser(updatedUser);
          console.log('✅ Updated Zustand store with user:', updatedUser);
          
          // Update localStorage
          localStorage.setItem('userInfo', JSON.stringify(updatedUser));
          console.log('✅ Updated localStorage');
        } else {
          console.warn('⚠️ No user object in response');
        }
        
        toast.success('Profile picture updated successfully!');
        return cacheBustedUrl;
        
      } else {
        console.error('❌ Upload failed:', response.data.message);
        throw new Error(response.data.message || 'Upload failed');
      }
    } catch (error) {
      console.error('❌ Profile picture upload error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      let errorMessage = 'Failed to upload profile picture';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadProfilePicture, isUploading };
};