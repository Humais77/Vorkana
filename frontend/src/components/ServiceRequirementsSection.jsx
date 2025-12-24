import React, { memo } from 'react';
import { FileText, FileQuestion } from 'lucide-react';

const ServiceRequirementsSection = memo(({ requirements }) => {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileQuestion className="h-6 w-6 text-emerald-600" />
          Client Requirements
        </h2>
        <span className="text-sm text-gray-500">
          {requirements.filter(req => req.required).length} required field(s)
        </span>
      </div>
      <div className="space-y-4">
        {requirements.map((req, index) => (
          <div key={index} className="p-4 bg-gray-50 rounded-xl">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center">
                <FileText className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <h3 className="font-semibold text-gray-900">{req.question}</h3>
                  {req.required && (
                    <span className="text-xs text-red-600 font-medium mt-1">
                      Required field
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  req.required ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {req.required ? 'Required' : 'Optional'}
                </span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  {req.type}
                </span>
              </div>
            </div>
            {req.options && req.options.length > 0 && (
              <div className="mt-3 pl-8">
                <p className="text-sm text-gray-600 mb-2">Options:</p>
                <div className="flex flex-wrap gap-2">
                  {req.options.map((option, optIndex) => (
                    <span key={optIndex} className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-sm">
                      {option}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

ServiceRequirementsSection.displayName = 'ServiceRequirementsSection';

export default ServiceRequirementsSection;