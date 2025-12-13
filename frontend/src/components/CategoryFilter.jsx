// src/components/gigs/CategoryFilter.jsx
import React, { useState, useEffect } from 'react';
import { useCategories } from '../hooks/useCategories';
import { Loader2, ChevronDown } from 'lucide-react';

const CategoryFilter = ({ selectedCategory, onCategoryChange, showAllOption = true }) => {
  const { data: categories, isLoading, isError } = useCategories();
  const [isOpen, setIsOpen] = useState(false);

  const handleCategorySelect = (categoryId) => {
    onCategoryChange(categoryId);
    setIsOpen(false);
  };

  const getCategoryName = (categoryId) => {
    if (!categoryId) return 'All Categories';
    
    const category = categories?.find(cat => cat._id === categoryId);
    return category?.name || 'Unknown Category';
  };

  if (isLoading) {
    return (
      <div className="w-full px-3 py-2 border border-gray-300 rounded-lg">
        <div className="flex items-center justify-center">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          <span className="text-sm text-gray-500">Loading categories...</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-500">
        Error loading categories
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all flex items-center justify-between"
      >
        <span className="text-sm">{getCategoryName(selectedCategory)}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
            {showAllOption && (
              <button
                onClick={() => handleCategorySelect('')}
                className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${
                  !selectedCategory ? 'bg-green-50 text-green-700' : 'text-gray-700'
                }`}
              >
                All Categories
              </button>
            )}
            
            {categories?.map((category) => (
              <button
                key={category._id}
                onClick={() => handleCategorySelect(category._id)}
                className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors flex items-center justify-between ${
                  selectedCategory === category._id ? 'bg-green-50 text-green-700' : 'text-gray-700'
                }`}
              >
                <span className="text-sm">{category.name}</span>
                {category.children?.length > 0 && (
                  <span className="text-xs text-gray-500">
                    {category.children.length} sub
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default CategoryFilter;