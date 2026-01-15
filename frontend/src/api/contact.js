import axios from 'axios';
import { validatePhoneNumber } from '../utils/phoneValidation';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
});

export const contactAPI = {
  // Submit contact form
  submitContact: async (formData) => {
    try {
      // Pre-validate phone on frontend
      if (formData.phone && formData.phone.trim() !== '') {
        const phoneValidation = validatePhoneNumber(formData.phone);
        if (!phoneValidation.valid) {
          throw { 
            success: false, 
            message: phoneValidation.message 
          };
        }
        
        // Format phone before sending
        formData.phone = formData.phone.trim();
      }
      
      const response = await axiosInstance.post('/api/contact', formData);
      return response.data;
    } catch (error) {
      if (error.response) {
        throw error.response.data || { 
          success: false, 
          message: 'Failed to submit contact form' 
        };
      } else if (error.request) {
        throw { 
          success: false, 
          message: 'Network error. Please check your connection.' 
        };
      } else {
        // This is our frontend validation error
        throw error;
      }
    }
  },
  
  // Validate phone number via API (optional)
  validatePhone: async (phone) => {
    try {
      const response = await axiosInstance.get(`/api/contact/validate-phone?phone=${encodeURIComponent(phone)}`);
      return response.data;
    } catch (error) {
      return { valid: false, message: 'Validation service unavailable' };
    }
  }
};