import React, { useState } from 'react';
import { FiX, FiUser, FiDollarSign, FiClock, FiCalendar, FiFlag, FiCheckCircle, FiFileText, FiDownload, FiCopy, FiExternalLink, FiEdit2, FiTrash2, FiPackage, FiTag, FiMessageSquare, FiMapPin, FiGlobe, FiActivity, FiBarChart2, FiLayers, FiSend } from 'react-icons/fi';
import { format } from 'date-fns';

const GigViewModal = ({ gig, onClose, onEdit, onDelete }) => {
  const [copied, setCopied] = useState(false);

  if (!gig) return null;

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCurrency = (amount, currency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  const getStatusColor = (status) => {
    const colors = {
      open: 'bg-green-100 text-green-800 border border-green-200',
      in_progress: 'bg-blue-100 text-blue-800 border border-blue-200',
      assigned: 'bg-purple-100 text-purple-800 border border-purple-200',
      completed: 'bg-gray-100 text-gray-800 border border-gray-200',
      cancelled: 'bg-red-100 text-red-800 border border-red-200',
      closed: 'bg-yellow-100 text-yellow-800 border border-yellow-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border border-gray-200';
  };

  const getUrgencyColor = (urgency) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800 border border-gray-200',
      medium: 'bg-blue-100 text-blue-800 border border-blue-200',
      high: 'bg-orange-100 text-orange-800 border border-orange-200',
      urgent: 'bg-red-100 text-red-800 border border-red-200'
    };
    return colors[urgency] || 'bg-gray-100 text-gray-800 border border-gray-200';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'PPpp');
    } catch (e) {
      return dateString;
    }
  };

  const handleEdit = () => {
    if (onEdit) onEdit(gig);
    onClose();
  };

  const handleDelete = () => {
    if (onDelete) onDelete(gig);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex items-center space-x-3">
            <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <FiFileText className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Gig Details</h3>
              <p className="text-sm text-gray-500">ID: {gig._id}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => copyToClipboard(gig._id)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-1"
              title="Copy ID"
            >
              <FiCopy className="h-4 w-4" />
              <span>{copied ? 'Copied!' : 'Copy ID'}</span>
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 p-1"
            >
              <FiX className="h-6 w-6" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{gig.title}</h2>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(gig.status)}`}>
                      {gig.status.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getUrgencyColor(gig.urgency)}`}>
                      {gig.urgency.toUpperCase()}
                    </span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-semibold border border-gray-200">
                      {gig.visibility.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-gray-600">
                    <p className="text-lg">{formatCurrency(gig.budget, gig.currency)}</p>
                    <p className="text-sm">Timeline: {gig.timeline} {gig.timelineUnit}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => window.open(`/gig/${gig.slug || gig._id}`, '_blank')}
                    className="px-4 py-2 bg-white border border-indigo-300 text-indigo-700 rounded-lg hover:bg-indigo-50 flex items-center space-x-2"
                  >
                    <FiExternalLink className="h-4 w-4" />
                    <span>View Live</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-gray-600">Budget</p>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(gig.budget, gig.currency)}</p>
                  </div>
                  <FiDollarSign className="h-6 w-6 text-green-500" />
                </div>
                <p className="text-xs text-gray-500">Total budget</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-gray-600">Timeline</p>
                    <p className="text-xl font-bold text-gray-900">{gig.timeline} {gig.timelineUnit}</p>
                  </div>
                  <FiClock className="h-6 w-6 text-blue-500" />
                </div>
                <p className="text-xs text-gray-500">Project duration</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-gray-600">Category</p>
                    <p className="text-xl font-bold text-gray-900">{gig.projectCategory?.name || 'N/A'}</p>
                  </div>
                  <FiPackage className="h-6 w-6 text-purple-500" />
                </div>
                <p className="text-xs text-gray-500">Project category</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p className="text-xl font-bold text-gray-900 capitalize">{gig.status}</p>
                  </div>
                  <FiActivity className="h-6 w-6 text-indigo-500" />
                </div>
                <p className="text-xs text-gray-500">Current status</p>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Description */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <FiFileText className="h-5 w-5 mr-2 text-gray-500" />
                    Description
                  </h4>
                  <div className="prose max-w-none">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-700 whitespace-pre-line">{gig.description}</p>
                    </div>
                  </div>
                </div>

                {/* Skills Required */}
                {gig.skillsRequired?.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                      <FiTag className="h-5 w-5 mr-2 text-gray-500" />
                      Skills Required
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {gig.skillsRequired.map((skill, index) => (
                        <span 
                          key={index} 
                          className="px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100 font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Client Information */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <FiUser className="h-5 w-5 mr-2 text-gray-500" />
                    Client Information
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center">
                        <FiUser className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{gig.createdBy?.name || 'Unknown Client'}</p>
                        <p className="text-sm text-gray-500">{gig.createdBy?.email || ''}</p>
                      </div>
                    </div>
                    
                    {gig.assignedTo && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Assigned To</p>
                        <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                          <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                            <FiUser className="h-5 w-5 text-green-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{gig.assignedTo.name}</p>
                            <p className="text-sm text-gray-500">{gig.assignedTo.email}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Project Information */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <FiLayers className="h-5 w-5 mr-2 text-gray-500" />
                    Project Information
                  </h4>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-600">Category</p>
                        <p className="font-medium">{gig.projectCategory?.name || 'N/A'}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-600">Subcategory</p>
                        <p className="font-medium">{gig.subcategory?.name || 'N/A'}</p>
                      </div>
                    </div>
                    
                    {gig.location && (
                      <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                        <FiMapPin className="h-4 w-4 text-gray-400" />
                        <p className="text-sm text-gray-700">{gig.location}</p>
                      </div>
                    )}
                    
                    {gig.communication && (
                      <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                        <FiMessageSquare className="h-4 w-4 text-gray-400" />
                        <p className="text-sm text-gray-700">Communication: {gig.communication}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Timeline & Dates */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <FiCalendar className="h-5 w-5 mr-2 text-gray-500" />
                    Timeline & Dates
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">Created</span>
                      <span className="font-medium">{formatDate(gig.createdAt)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">Last Updated</span>
                      <span className="font-medium">{formatDate(gig.updatedAt)}</span>
                    </div>
                    {gig.deadline && (
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600">Deadline</span>
                        <span className="font-medium text-red-600">{formatDate(gig.deadline)}</span>
                      </div>
                    )}
                    {gig.completionDate && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Completed</span>
                        <span className="font-medium text-green-600">{formatDate(gig.completionDate)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Deliverables */}
            {gig.deliverables?.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <FiCheckCircle className="h-5 w-5 mr-2 text-gray-500" />
                  Deliverables
                </h4>
                <div className="space-y-2">
                  {gig.deliverables.map((item, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <FiCheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Information */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                <FiGlobe className="h-5 w-5 mr-2 text-gray-500" />
                Additional Information
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Communication Method</p>
                  <p className="font-medium">{gig.communication || 'Not specified'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Payment Status</p>
                  <p className={`font-medium ${
                    gig.paymentStatus === 'completed' ? 'text-green-600' :
                    gig.paymentStatus === 'pending' ? 'text-yellow-600' :
                    gig.paymentStatus === 'refunded' ? 'text-red-600' :
                    'text-gray-600'
                  }`}>
                    {gig.paymentStatus?.replace('_', ' ') || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Files & Attachments */}
            {(gig.attachments?.length > 0 || gig.files?.length > 0 || gig.images?.length > 0) && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <FiDownload className="h-5 w-5 mr-2 text-gray-500" />
                  Files & Attachments
                </h4>
                <div className="space-y-4">
                  {gig.images?.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Images ({gig.images.length})</p>
                      <div className="grid grid-cols-3 gap-3">
                        {gig.images.slice(0, 3).map((img, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={img.url}
                              alt={`Gig image ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg border border-gray-200"
                            />
                            <a
                              href={img.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100"
                            >
                              <FiExternalLink className="h-6 w-6 text-white" />
                            </a>
                          </div>
                        ))}
                        {gig.images.length > 3 && (
                          <div className="flex items-center justify-center bg-gray-100 rounded-lg border border-gray-200">
                            <span className="text-gray-600">+{gig.images.length - 3} more</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {gig.attachments?.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Attachments</p>
                      <div className="space-y-2">
                        {gig.attachments.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center space-x-3">
                              <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <FiFileText className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-medium">{file.split('/').pop()}</p>
                                <p className="text-sm text-gray-500">Attachment</p>
                              </div>
                            </div>
                            <a
                              href={file}
                              download
                              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                              Download
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Gig ID: {gig._id} • Created: {format(new Date(gig.createdAt), 'MMM d, yyyy')}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleEdit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center space-x-2 transition-colors"
            >
              <FiEdit2 className="h-4 w-4" />
              <span>Edit</span>
            </button>
            
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center space-x-2 transition-colors"
            >
              <FiTrash2 className="h-4 w-4" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GigViewModal;