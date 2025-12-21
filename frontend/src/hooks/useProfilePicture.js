// hooks/useProfilePicture.js - UPDATED
import { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { toast } from 'react-hot-toast';
import axios from 'axios';

export const useProfilePicture = () => {
  const [isUploading, setIsUploading] = useState(false);
  const { user, updateUser } = useAuthStore();

  const uploadProfilePicture = async (file) => {
    if (!file) {
      toast.error('Please select a file');
      return null;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB');
      return null;
    }

    // Validate file type
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
      
      console.log('Uploading profile picture to:', `${API_URL}/api/users/upload-profile-picture`);
      console.log('File details:', {
        name: file.name,
        type: file.type,
        size: file.size
      });
      
      // FIX: DO NOT set Content-Type header - axios will set it automatically with boundary
      const response = await axios.post(
        `${API_URL}/api/users/upload-profile-picture`, 
        formData, 
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            // REMOVED: 'Content-Type': 'multipart/form-data' - Let axios handle it!
          },
          withCredentials: true,
          timeout: 30000 // 30 second timeout
        }
      );
      
      console.log('Upload response:', response.data);
      
      if (response.data.success) {
        // Update local user state IMMEDIATELY
        if (updateUser && response.data.user) {
          // Ensure we're updating with complete user object
          updateUser({
            ...user,
            ...response.data.user,
            picture: response.data.picture || response.data.user?.picture
          });
        }
        
        toast.success('Profile picture updated successfully!');
        return response.data.picture || response.data.user?.picture;
      } else {
        throw new Error(response.data.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Profile picture upload error:', error);
      
      let errorMessage = 'Failed to upload profile picture';
      
      if (error.response) {
        // Server responded with error
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
        
        errorMessage = error.response.data?.message || errorMessage;
        
        if (error.response.status === 413) {
          errorMessage = 'File too large. Maximum size is 2MB.';
        } else if (error.response.status === 415) {
          errorMessage = 'Invalid Content-Type. Please try again.';
        } else if (error.response.status === 404) {
          errorMessage = 'Upload endpoint not found. Please check the server.';
        } else if (error.response.status === 400) {
          errorMessage = `Upload failed: ${error.response.data.message || 'Bad request'}`;
        }
      } else if (error.request) {
        // Request made but no response
        console.error('No response received:', error.request);
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        // Other errors
        console.error('Error setting up request:', error.message);
        errorMessage = error.message || errorMessage;
      }
      
      toast.error(errorMessage);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadProfilePicture, isUploading };
};