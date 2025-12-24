import React, { useMemo } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

const ValidationSummary = ({ formData }) => {
  const validationItems = useMemo(() => {
    const items = [
      {
        id: 'title',
        label: 'Title',
        isValid: formData.title.length >= 5,
        message: formData.title.length >= 5 
          ? '✓ Valid' 
          : `Needs ${5 - formData.title.length} more characters`,
        requiredLength: 5,
        currentLength: formData.title.length
      },
      {
        id: 'description',
        label: 'Description',
        isValid: formData.description.length >= 50,
        message: formData.description.length >= 50 
          ? '✓ Valid' 
          : `Needs ${50 - formData.description.length} more characters`,
        requiredLength: 50,
        currentLength: formData.description.length
      },
      {
        id: 'shortDescription',
        label: 'Short Description',
        isValid: formData.shortDescription && formData.shortDescription.length >= 20,
        message: formData.shortDescription && formData.shortDescription.length >= 20 
          ? '✓ Valid' 
          : `Needs ${20 - (formData.shortDescription?.length || 0)} more characters`,
        requiredLength: 20,
        currentLength: formData.shortDescription?.length || 0
      },
      {
        id: 'category',
        label: 'Category',
        isValid: !!formData.category,
        message: formData.category ? '✓ Selected' : 'Required',
        isBoolean: true
      },
      {
        id: 'subcategory',
        label: 'Subcategory',
        isValid: !!formData.subcategory,
        message: formData.subcategory ? '✓ Selected' : 'Required',
        isBoolean: true
      },
      {
        id: 'price',
        label: 'Price',
        isValid: formData.price && parseFloat(formData.price) >= 1,
        message: formData.price && parseFloat(formData.price) >= 1 
          ? '✓ Valid' 
          : 'Required ($1 minimum)',
        isBoolean: true
      },
      {
        id: 'deliveryTime',
        label: 'Delivery Time',
        isValid: formData.deliveryTime && parseInt(formData.deliveryTime) >= 1,
        message: formData.deliveryTime && parseInt(formData.deliveryTime) >= 1 
          ? '✓ Valid' 
          : 'Required (1 day minimum)',
        isBoolean: true
      }
    ];

    // Calculate overall status
    const validCount = items.filter(item => item.isValid).length;
    const totalCount = items.length;
    const overallStatus = validCount === totalCount ? 'complete' : validCount > totalCount / 2 ? 'partial' : 'incomplete';

    return { items, overallStatus, validCount, totalCount };
  }, [formData]);

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-yellow-800 mb-4 flex items-center">
        <AlertCircle className="w-5 h-5 mr-2" />
        Before You Submit
      </h3>
      
      {/* Progress Summary */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-700">
            Validation Progress
          </span>
          <span className="text-sm font-semibold text-gray-900">
            {validationItems.validCount}/{validationItems.totalCount}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-green-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(validationItems.validCount / validationItems.totalCount) * 100}%` }}
          />
        </div>
      </div>

      {/* Validation Items */}
      <div className="space-y-2">
        {validationItems.items.map((item) => (
          <div key={item.id} className="flex items-center">
            {item.isValid ? (
              <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-500 mr-2 flex-shrink-0" />
            )}
            <span className={`text-sm ${item.isValid ? 'text-green-600' : 'text-red-600'}`}>
              {item.label}: {item.message}
              {!item.isBoolean && !item.isValid && (
                <span className="ml-2 text-xs opacity-75">
                  ({item.currentLength}/{item.requiredLength})
                </span>
              )}
            </span>
          </div>
        ))}
      </div>

      {/* Status Message */}
      <div className="mt-4 pt-4 border-t border-yellow-200">
        {validationItems.overallStatus === 'complete' ? (
          <p className="text-sm text-green-600 font-medium">
            ✓ All validations passed! You can submit the form.
          </p>
        ) : validationItems.overallStatus === 'partial' ? (
          <p className="text-sm text-amber-600 font-medium">
            ⚠ Some validations need attention. Please review the items above.
          </p>
        ) : (
          <p className="text-sm text-red-600 font-medium">
            ✗ Multiple validations failed. Please fix the required fields.
          </p>
        )}
      </div>
    </div>
  );
};

export default React.memo(ValidationSummary);