import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingPlaceholder = ({ 
  type = 'default',
  message,
  showSpinner = true 
}) => {
  const getStyle = () => {
    switch(type) {
      case 'image':
        return {
          container: 'p-8 rounded-xl border border-gray-200',
          text: 'text-gray-600 text-center'
        };
      case 'validation':
        return {
          container: 'p-6 rounded-xl bg-gray-50 border border-gray-200',
          text: 'text-gray-600 text-center'
        };
      case 'section':
        return {
          container: 'p-6 rounded-xl bg-white border border-gray-200 shadow-sm',
          text: 'text-gray-500'
        };
      default:
        return {
          container: 'p-4 rounded-lg bg-gray-50',
          text: 'text-gray-500'
        };
    }
  };

  const style = getStyle();

  return (
    <div className={style.container}>
      <div className="flex flex-col items-center justify-center space-y-3">
        {showSpinner && (
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        )}
        <p className={style.text}>
          {message || 'Loading...'}
        </p>
      </div>
    </div>
  );
};

export const ImageUploadPlaceholder = () => (
  <LoadingPlaceholder 
    type="image" 
    message="Loading image upload section..." 
  />
);

export const ValidationPlaceholder = () => (
  <LoadingPlaceholder 
    type="validation" 
    message="Loading validation checks..." 
  />
);

export const SectionPlaceholder = () => (
  <LoadingPlaceholder 
    type="section" 
    message="Loading section..." 
  />
);

export default LoadingPlaceholder;