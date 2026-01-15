import { useCallback, useRef } from 'react';
import {
  showGigUpdateSuccessToast,
  showSuccessToast,
  showErrorToast,
  showWarningToast,
  showLoadingToast,
  dismissToast,
  showInfoToast
} from '../components/Toaster';

export const useGigToast = () => {
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
  const showGigLoading = useCallback((message = 'Updating gig...') => {
    if (loadingToastIdRef.current) {
      dismissToast(loadingToastIdRef.current);
    }
    
    const safeMessage = ensureString(message);
    const toastId = showLoadingToast(safeMessage);
    loadingToastIdRef.current = toastId;
    return toastId;
  }, []);

  // Show success toast with redirect
  const showGigUpdateSuccess = useCallback((gigId, title = 'Success!', description = '') => {
    if (loadingToastIdRef.current) {
      dismissToast(loadingToastIdRef.current);
      loadingToastIdRef.current = null;
    }
    
    const safeTitle = ensureString(title);
    const safeDescription = ensureString(description);
    
    const toastId = showGigUpdateSuccessToast(gigId, safeTitle, safeDescription);
    
    return toastId;
  }, []);

  // Show simple success toast
  const showGigSuccess = useCallback((message, options = {}) => {
    if (loadingToastIdRef.current) {
      dismissToast(loadingToastIdRef.current);
      loadingToastIdRef.current = null;
    }
    
    const safeMessage = ensureString(message);
    return showSuccessToast(safeMessage, options);
  }, []);

  // Show warning toast
  const showGigWarning = useCallback((message, options = {}) => {
    if (loadingToastIdRef.current) {
      dismissToast(loadingToastIdRef.current);
      loadingToastIdRef.current = null;
    }
    
    const safeMessage = ensureString(message);
    return showWarningToast(safeMessage, options);
  }, []);

  // Show error toast
  const showGigError = useCallback((message, options = {}) => {
    if (loadingToastIdRef.current) {
      dismissToast(loadingToastIdRef.current);
      loadingToastIdRef.current = null;
    }
    
    const safeMessage = ensureString(message);
    return showErrorToast(safeMessage, options);
  }, []);

  // Show info toast
  const showGigInfo = useCallback((message, options = {}) => {
    const safeMessage = ensureString(message);
    return showInfoToast(safeMessage, options);
  }, []);

  // Dismiss current toast
  const dismissGigToast = useCallback(() => {
    if (loadingToastIdRef.current) {
      dismissToast(loadingToastIdRef.current);
      loadingToastIdRef.current = null;
    }
  }, []);

  return {
    showGigLoading,
    showGigUpdateSuccess,
    showGigSuccess,
    showGigWarning,
    showGigError,
    showGigInfo,
    dismissGigToast,
    loadingToastIdRef
  };
};