// hooks/useProfilePicture.js - COMPREHENSIVE FIX
import { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { toast } from 'react-hot-toast';
import axios from 'axios';

// Create a global event emitter for picture updates
const profilePictureUpdateEvents = {
  listeners: new Set(),
  
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  },
  
  emit(newPictureUrl, userData) {
    this.listeners.forEach(callback => callback(newPictureUrl, userData));
  }
};

export const useProfilePicture = () => {
  const [isUploading, setIsUploading] = useState(false);
  const { user, setUser } = useAuthStore();

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
      
      // Get tokens
      const csrfToken = localStorage.getItem('csrfToken');
      const userToken = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
      
      console.log('🚀 Uploading profile picture...');
      
      const response = await axios.post(
        `${API_URL}/api/users/upload-profile-picture`, 
        formData, 
        {
          headers: {
            'Authorization': userToken ? `Bearer ${userToken}` : undefined,
            'X-CSRF-Token': csrfToken,
          },
          withCredentials: true,
          timeout: 30000
        }
      );
      
      console.log('✅ Upload successful');
      
      if (response.data.success && response.data.picture) {
        const pictureUrl = response.data.picture;
        
        // Check if valid URL
        if (pictureUrl.startsWith('data:')) {
          throw new Error('Invalid image URL format');
        }
        
        if (!pictureUrl.startsWith('http')) {
          throw new Error('Invalid URL format');
        }
        
        // IMPORTANT: Create a cache-busted URL
        const cacheBustedUrl = `${pictureUrl}${pictureUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
        
        // Update Zustand store - FORCE UPDATE
        const updatedUser = response.data.user || user;
        const finalUserData = {
          ...updatedUser,
          picture: cacheBustedUrl
        };
        
        // CRITICAL: Update Zustand store
        setUser(finalUserData);
        console.log('✅ Zustand store updated');
        
        // Update localStorage with FRESH data
        try {
          // Get current user info from localStorage
          const currentUserInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
          
          // Merge with new data
          const newUserInfo = {
            ...currentUserInfo,
            ...finalUserData,
            picture: cacheBustedUrl,
            // Ensure we have all fields from response
            ...(response.data.user || {})
          };
          
          localStorage.setItem('userInfo', JSON.stringify(newUserInfo));
          console.log('✅ localStorage updated');
          
          // Also update the Zustand persist storage
          const authStore = JSON.parse(localStorage.getItem('vorkanna_user_v1') || '{}');
          if (authStore.state) {
            authStore.state.user = newUserInfo;
            localStorage.setItem('vorkanna_user_v1', JSON.stringify(authStore));
          }
        } catch (e) {
          console.error('LocalStorage update error:', e);
        }
        
        // EMIT GLOBAL EVENT - Notify all components
        profilePictureUpdateEvents.emit(cacheBustedUrl, finalUserData);
        
        // Force a storage event to trigger updates in other tabs/windows
        localStorage.setItem('profile_picture_last_updated', Date.now().toString());
        window.dispatchEvent(new Event('storage'));
        
        toast.success('Profile picture updated!');
        return cacheBustedUrl;
        
      } else {
        throw new Error(response.data.message || 'Upload failed');
      }
    } catch (error) {
      console.error('❌ Upload error:', error);
      
      let errorMessage = 'Failed to upload profile picture';
      
      if (error.response?.status === 401) {
        errorMessage = 'Session expired. Please sign in again.';
        localStorage.clear();
        window.location.href = '/signin';
      } else if (error.response?.status === 403 && error.response?.data?.code === 'CSRF_TOKEN_INVALID') {
        errorMessage = 'Security validation failed. Please refresh the page.';
      } else if (error.response?.data?.message) {
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

  // Export the event emitter for other components to subscribe
  return { 
    uploadProfilePicture, 
    isUploading,
    subscribeToUpdates: profilePictureUpdateEvents.subscribe.bind(profilePictureUpdateEvents)
  };
};