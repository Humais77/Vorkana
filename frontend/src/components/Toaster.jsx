import React from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Loader2,
  Clock
} from 'lucide-react';

// Toast types
export const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
  LOADING: 'loading',
  CUSTOM: 'custom'
};

// Toast positions
export const TOAST_POSITIONS = {
  TOP_RIGHT: 'top-right',
  TOP_CENTER: 'top-center',
  TOP_LEFT: 'top-left',
  BOTTOM_RIGHT: 'bottom-right',
  BOTTOM_CENTER: 'bottom-center',
  BOTTOM_LEFT: 'bottom-left'
};

// Toast icons mapping
const ToastIcons = {
  [TOAST_TYPES.SUCCESS]: CheckCircle,
  [TOAST_TYPES.ERROR]: XCircle,
  [TOAST_TYPES.WARNING]: AlertCircle,
  [TOAST_TYPES.INFO]: Info,
  [TOAST_TYPES.LOADING]: Loader2
};

// Reusable toast configuration
const defaultToastConfig = {
  position: TOAST_POSITIONS.BOTTOM_RIGHT,
  autoClose: 5000,
  hideProgressBar: false,
  closeOnClick: false, // Disable close on click
  pauseOnHover: false, // Disable pause on hover
  draggable: false, // Disable dragging
  theme: 'colored',
};

// Helper function to ensure message is a string
const getSafeMessage = (message) => {
  if (typeof message === 'string') return message;
  if (typeof message === 'object' && message !== null) {
    if (message.message) return String(message.message);
    if (message.toString) return String(message);
    return JSON.stringify(message);
  }
  return String(message);
};

// Generic toast function
export const showToast = (type, title, description = '', options = {}) => {
  const Icon = ToastIcons[type];
  
  // Ensure title is a string
  const safeTitle = getSafeMessage(title);
  const safeDescription = description ? getSafeMessage(description) : '';
  
  const toastContent = (
    <div className="flex items-start gap-3">
      {Icon && (
        <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
          type === TOAST_TYPES.SUCCESS ? 'text-green-500' :
          type === TOAST_TYPES.ERROR ? 'text-red-500' :
          type === TOAST_TYPES.WARNING ? 'text-orange-500' :
          type === TOAST_TYPES.INFO ? 'text-blue-500' :
          'text-gray-500'
        }`} />
      )}
      <div className="flex-1">
        <p className="font-medium text-gray-900">{safeTitle}</p>
        {safeDescription && (
          <p className="text-sm text-gray-600 mt-1">{safeDescription}</p>
        )}
      </div>
    </div>
  );
  
  const config = {
    ...defaultToastConfig,
    ...options,
    autoClose: options.autoClose || defaultToastConfig.autoClose,
    type: type === TOAST_TYPES.LOADING ? TOAST_TYPES.INFO : type
  };
  
  if (type === TOAST_TYPES.LOADING) {
    return toast.loading(toastContent, {
      ...config,
      autoClose: false
    });
  }
  
  return toast[type](toastContent, config);
};

// Specific toast functions
export const showSuccessToast = (message, options = {}) => {
  const safeMessage = getSafeMessage(message);
  
  const successOptions = {
    ...defaultToastConfig,
    ...options,
    autoClose: options.autoClose || 5000,
  };
  
  return toast.success(safeMessage, successOptions);
};

export const showErrorToast = (message, options = {}) => {
  const safeMessage = getSafeMessage(message);
  
  const errorOptions = {
    ...defaultToastConfig,
    ...options,
    autoClose: options.autoClose || 5000,
  };
  
  return toast.error(safeMessage, errorOptions);
};

export const showWarningToast = (message, options = {}) => {
  const safeMessage = getSafeMessage(message);
  
  const warningOptions = {
    ...defaultToastConfig,
    ...options,
    autoClose: options.autoClose || 5000,
  };
  
  return toast.warning(safeMessage, warningOptions);
};

export const showInfoToast = (message, options = {}) => {
  const safeMessage = getSafeMessage(message);
  
  const infoOptions = {
    ...defaultToastConfig,
    ...options,
    autoClose: options.autoClose || 5000,
  };
  
  return toast.info(safeMessage, infoOptions);
};

export const showLoadingToast = (message, options = {}) => {
  const safeMessage = getSafeMessage(message);
  
  const loadingOptions = {
    ...defaultToastConfig,
    ...options,
    autoClose: false, // Loading toasts shouldn't auto-close
  };
  
  return toast.loading(safeMessage, loadingOptions);
};

export const dismissToast = (toastId) => {
  toast.dismiss(toastId);
};

// Toast container component
const Toaster = () => {
  return (
    <ToastContainer
      position="bottom-right"
      autoClose={5000}
      hideProgressBar={false}
      newestOnTop
      closeOnClick={false}
      rtl={false}
      pauseOnFocusLoss={false}
      pauseOnHover={false}
      draggable={false}
      theme="colored"
      toastClassName="!bg-white !text-gray-900 !rounded-xl !shadow-lg !border !border-gray-200 !cursor-default"
      progressClassName="!bg-gradient-to-r !from-emerald-500 !to-teal-500"
      bodyClassName="!p-4"
    />
  );
};

export default Toaster;