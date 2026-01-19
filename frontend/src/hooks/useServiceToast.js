import { useCallback, useRef } from 'react';
import {
  showSuccessToast,
  showErrorToast,
  showWarningToast,
  showLoadingToast,
  dismissToast,
  showInfoToast
} from '../components/Toaster';

export const useServiceToast = () => {
  const loadingToastIdRef = useRef(null);

  // Helper to ensure message is string
  const ensureString = (message) => {
    if (typeof message === 'string') return message;
    if (typeof message === 'object' && message !== null) {
      if (message.message) return String(message.message);
      if (message.toString) return String(message);
      return JSON.stringify(message);
    }
    return String(message);
  };

  // Extract validation errors from backend response
  const extractValidationErrors = (error) => {
    if (!error) return [];
    
    // Handle various error response formats
    if (error.response?.data?.errors) {
      return Array.isArray(error.response.data.errors) 
        ? error.response.data.errors 
        : [error.response.data.errors];
    }
    
    if (error.response?.data?.message) {
      return [ensureString(error.response.data.message)];
    }
    
    if (error.message) {
      return [ensureString(error.message)];
    }
    
    return ['An unexpected error occurred'];
  };

  // Show loading toast
  const showServiceLoading = useCallback((message = 'Processing...') => {
    if (loadingToastIdRef.current) {
      dismissToast(loadingToastIdRef.current);
    }
    
    const safeMessage = ensureString(message);
    const toastId = showLoadingToast(safeMessage);
    loadingToastIdRef.current = toastId;
    return toastId;
  }, []);

  // Show success toast with redirect option - UPDATED to match gig pattern
  const showServiceUpdateSuccess = useCallback((serviceId, title = 'Success!', description = '') => {
    if (loadingToastIdRef.current) {
      dismissToast(loadingToastIdRef.current);
      loadingToastIdRef.current = null;
    }
    
    const safeTitle = ensureString(title);
    const safeDescription = ensureString(description);
    
    const toastOptions = {
      autoClose: 5000,
      onClose: () => {
        setTimeout(() => {
          window.location.href = `/services/${serviceId}`;
        }, 300);
      }
    };
    
    // Combine title and description for the toast content
    let toastContent = safeTitle;
    if (safeDescription) {
      toastContent = `${safeTitle}\n${safeDescription}`;
    }
    
    const toastId = showSuccessToast(toastContent, toastOptions);
    
    return toastId;
  }, []);

  // Show simple success toast
  const showServiceSuccess = useCallback((message, options = {}) => {
    if (loadingToastIdRef.current) {
      dismissToast(loadingToastIdRef.current);
      loadingToastIdRef.current = null;
    }
    
    const safeMessage = ensureString(message);
    return showSuccessToast(safeMessage, options);
  }, []);

  // Show error toast with backend validation errors
  const showServiceError = useCallback((error, options = {}) => {
    if (loadingToastIdRef.current) {
      dismissToast(loadingToastIdRef.current);
      loadingToastIdRef.current = null;
    }
    
    const errors = extractValidationErrors(error);
    
    // Show first error from validation errors
    if (errors.length > 0) {
      return showErrorToast(errors[0], options);
    }
    
    // Fallback to string error
    const safeMessage = ensureString(error);
    return showErrorToast(safeMessage, options);
  }, []);

  // Show warning toast
  const showServiceWarning = useCallback((message, options = {}) => {
    if (loadingToastIdRef.current) {
      dismissToast(loadingToastIdRef.current);
      loadingToastIdRef.current = null;
    }
    
    const safeMessage = ensureString(message);
    return showWarningToast(safeMessage, options);
  }, []);

  // Show info toast
  const showServiceInfo = useCallback((message, options = {}) => {
    const safeMessage = ensureString(message);
    return showInfoToast(safeMessage, options);
  }, []);

  // Dismiss current toast
  const dismissServiceToast = useCallback(() => {
    if (loadingToastIdRef.current) {
      dismissToast(loadingToastIdRef.current);
      loadingToastIdRef.current = null;
    }
  }, []);

  // Show multiple validation errors
  const showServiceValidationErrors = useCallback((errors = []) => {
    if (loadingToastIdRef.current) {
      dismissToast(loadingToastIdRef.current);
      loadingToastIdRef.current = null;
    }
    
    if (errors.length === 1) {
      showServiceError(errors[0]);
    } else if (errors.length > 1) {
      // Show first error and mention there are more
      showServiceError(`${errors[0]} (and ${errors.length - 1} more errors)`);
    }
  }, [showServiceError]);

  return {
    showServiceLoading,
    showServiceUpdateSuccess,
    showServiceSuccess,
    showServiceError,
    showServiceWarning,
    showServiceInfo,
    showServiceValidationErrors,
    dismissServiceToast,
    loadingToastIdRef,
    extractValidationErrors
  };
};