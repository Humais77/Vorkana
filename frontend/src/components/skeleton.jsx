import React from 'react';

export const Skeleton = ({ className = '' }) => {
  return (
    <div className={`bg-gray-200 animate-pulse rounded ${className}`} />
  );
};