// hooks/useUserToast.js
import { useCallback, useRef } from 'react';
import {
  showSuccessToast,
  showErrorToast,
  showWarningToast,
  showLoadingToast,
  dismissToast,
  showInfoToast
} from '../components/Toaster';

export const useUserToast = () => {
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
  const showUserLoading = useCallback((message = 'Processing user...') => {
    if (loadingToastIdRef.current) {
      dismissToast(loadingToastIdRef.current);
    }
    
    const safeMessage = ensureString(message);
    const toastId = showLoadingToast(safeMessage);
    loadingToastIdRef.current = toastId;
    return toastId;
  }, []);

  // Show success toast
  const showUserSuccess = useCallback((message, options = {}) => {
    if (loadingToastIdRef.current) {
      dismissToast(loadingToastIdRef.current);
      loadingToastIdRef.current = null;
    }
    
    const safeMessage = ensureString(message);
    return showSuccessToast(safeMessage, options);
  }, []);

  // Show error toast with backend validation errors
  const showUserError = useCallback((error, options = {}) => {
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
  const showUserWarning = useCallback((message, options = {}) => {
    if (loadingToastIdRef.current) {
      dismissToast(loadingToastIdRef.current);
      loadingToastIdRef.current = null;
    }
    
    const safeMessage = ensureString(message);
    return showWarningToast(safeMessage, options);
  }, []);

  // Show info toast
  const showUserInfo = useCallback((message, options = {}) => {
    const safeMessage = ensureString(message);
    return showInfoToast(safeMessage, options);
  }, []);

  // Dismiss current toast
  const dismissUserToast = useCallback((toastId = null) => {
    if (toastId) {
      dismissToast(toastId);
    } else if (loadingToastIdRef.current) {
      dismissToast(loadingToastIdRef.current);
      loadingToastIdRef.current = null;
    }
  }, []);

  // Show multiple validation errors
  const showUserValidationErrors = useCallback((errors = []) => {
    if (loadingToastIdRef.current) {
      dismissToast(loadingToastIdRef.current);
      loadingToastIdRef.current = null;
    }
    
    if (errors.length === 1) {
      showUserError(errors[0]);
    } else if (errors.length > 1) {
      showUserError(`${errors[0]} (and ${errors.length - 1} more errors)`);
    }
  }, [showUserError]);

  return {
    showUserLoading,
    showUserSuccess,
    showUserError,
    showUserWarning,
    showUserInfo,
    showUserValidationErrors,
    dismissUserToast,
    loadingToastIdRef,
    extractValidationErrors
  };
};