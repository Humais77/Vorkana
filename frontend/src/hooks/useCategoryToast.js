// hooks/useCategoryToast.js - Custom hook for category toasts
import { useCallback, useRef } from 'react';
import {
  showSuccessToast,
  showErrorToast,
  showWarningToast,
  showLoadingToast,
  dismissToast,
  showInfoToast
} from '../components/Toaster';

export const useCategoryToast = () => {
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

  // Show loading toast
  const showCategoryLoading = useCallback((message = 'Processing category...') => {
    if (loadingToastIdRef.current) {
      dismissToast(loadingToastIdRef.current);
    }
    
    const safeMessage = ensureString(message);
    const toastId = showLoadingToast(safeMessage);
    loadingToastIdRef.current = toastId;
    return toastId;
  }, []);

  // Show success toast
  const showCategorySuccess = useCallback((message, options = {}) => {
    if (loadingToastIdRef.current) {
      dismissToast(loadingToastIdRef.current);
      loadingToastIdRef.current = null;
    }
    
    const safeMessage = ensureString(message);
    return showSuccessToast(safeMessage, options);
  }, []);

  // Show warning toast
  const showCategoryWarning = useCallback((message, options = {}) => {
    if (loadingToastIdRef.current) {
      dismissToast(loadingToastIdRef.current);
      loadingToastIdRef.current = null;
    }
    
    const safeMessage = ensureString(message);
    return showWarningToast(safeMessage, options);
  }, []);

  // Show error toast
  const showCategoryError = useCallback((message, options = {}) => {
    if (loadingToastIdRef.current) {
      dismissToast(loadingToastIdRef.current);
      loadingToastIdRef.current = null;
    }
    
    const safeMessage = ensureString(message);
    return showErrorToast(safeMessage, options);
  }, []);

  // Show info toast
  const showCategoryInfo = useCallback((message, options = {}) => {
    const safeMessage = ensureString(message);
    return showInfoToast(safeMessage, options);
  }, []);

  // Dismiss current toast
  const dismissCategoryToast = useCallback((toastId = null) => {
    if (toastId) {
      dismissToast(toastId);
    } else if (loadingToastIdRef.current) {
      dismissToast(loadingToastIdRef.current);
      loadingToastIdRef.current = null;
    }
  }, []);

  return {
    showCategoryLoading,
    showCategorySuccess,
    showCategoryWarning,
    showCategoryError,
    showCategoryInfo,
    dismissCategoryToast,
    loadingToastIdRef
  };
};