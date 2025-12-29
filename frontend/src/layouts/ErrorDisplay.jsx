// components/common/ErrorDisplay.jsx
import React from 'react';
import { AlertCircle } from 'lucide-react';

const ErrorDisplay = ({ error, title = 'An error occurred', retryText = 'Retry', onRetry }) => {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-red-800 mb-1">{title}</h3>
          <p className="text-red-700 mb-4">{error?.message || 'Something went wrong'}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-red-100 text-red-700 font-medium rounded-lg hover:bg-red-200 transition-colors"
            >
              {retryText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay;