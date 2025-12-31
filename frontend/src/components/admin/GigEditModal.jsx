import React, { useState, useEffect } from 'react';
import { FiXCircle, FiPlus, FiTrash2, FiAlertCircle, FiSave } from 'react-icons/fi';
import { useSubcategoriesByCategory } from '../../hooks/useAdminDashboard';
const GigEditModal = ({ gig, isOpen, onClose, onSave, categories, users }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    budget: '',
    currency: 'USD',
    timeline: '',
    timelineUnit: 'days',
    projectCategory: '',
    subcategory: '',
    skillsRequired: [],
    deliverables: [],
    urgency: 'medium',
    visibility: 'public',
    status: 'open',
    assignedTo: '',
    deadline: '',
    paymentStatus: 'pending',
    communication: 'Email'
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [newDeliverable, setNewDeliverable] = useState('');
const [availableSubcategories, setAvailableSubcategories] = useState([]);
const [loadingSubcategories, setLoadingSubcategories] = useState(false);
const { data: subcategoriesData, refetch: refetchSubcategories } = useSubcategoriesByCategory(
  formData.projectCategory,
  { activeOnly: true }
);

  useEffect(() => {
    if (gig && isOpen) {
      console.log('Loading gig data:', gig);
      
      // Parse timeline value - handle cases like "2 months"
      let timelineValue = gig.timeline || '';
      let timelineUnit = gig.timelineUnit || 'days';
      
      // If timeline contains unit (like "2 months"), extract the number
      if (typeof timelineValue === 'string') {
        const match = timelineValue.match(/^(\d+)\s*(days|weeks|months)$/i);
        if (match) {
          timelineValue = match[1];
          timelineUnit = match[2].toLowerCase();
        }
      }
      
      // Format deadline date if it exists
      let deadlineValue = '';
      if (gig.deadline) {
        try {
          const date = new Date(gig.deadline);
          if (!isNaN(date.getTime())) {
            deadlineValue = date.toISOString().split('T')[0];
          }
        } catch (e) {
          console.error('Error parsing deadline:', e);
        }
      }
      
      setFormData({
        title: gig.title || '',
        description: gig.description || '',
        budget: gig.budget || '',
        currency: gig.currency || 'USD',
        timeline: timelineValue,
        timelineUnit: timelineUnit,
        projectCategory: gig.projectCategory?._id || gig.projectCategory || '',
        subcategory: gig.subcategory?._id || gig.subcategory || '',
        skillsRequired: Array.isArray(gig.skillsRequired) ? gig.skillsRequired : [],
        deliverables: Array.isArray(gig.deliverables) ? gig.deliverables : [],
        urgency: gig.urgency || 'medium',
        visibility: gig.visibility || 'public',
        status: gig.status || 'open',
        assignedTo: gig.assignedTo?._id || gig.assignedTo || '',
        deadline: deadlineValue,
        paymentStatus: gig.paymentStatus || 'pending',
        communication: gig.communication || 'Email'
      });
      setErrors({});
      setNewSkill('');
      setNewDeliverable('');
    }
  }, [gig, isOpen]);
useEffect(() => {
  if (formData.projectCategory) {
    refetchSubcategories();
    // Reset subcategory when category changes
    if (formData.projectCategory !== gig?.projectCategory?._id) {
      setFormData(prev => ({ ...prev, subcategory: '' }));
    }
  }
}, [formData.projectCategory, refetchSubcategories, gig]);

useEffect(() => {
  if (subcategoriesData?.data) {
    setAvailableSubcategories(subcategoriesData.data);
  }
}, [subcategoriesData]);
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    }
    
    if (!formData.description?.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < 20) {
      newErrors.description = 'Description must be at least 20 characters';
    }
    
    const budgetNum = Number(formData.budget);
    if (isNaN(budgetNum) || budgetNum < 5) {
      newErrors.budget = 'Minimum budget is $5';
    }
    
    const timelineNum = Number(formData.timeline);
    if (isNaN(timelineNum) || timelineNum < 1) {
      newErrors.timeline = 'Timeline must be at least 1';
    }
    
    if (!formData.projectCategory) {
      newErrors.projectCategory = 'Category is required';
    }
    
    if (formData.deadline) {
      const deadlineDate = new Date(formData.deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (deadlineDate <= today) {
        newErrors.deadline = 'Deadline must be in the future';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
const validateSubcategory = () => {
  if (formData.subcategory && availableSubcategories.length > 0) {
    const isValidSubcategory = availableSubcategories.some(
      sub => sub._id === formData.subcategory
    );
    
    if (!isValidSubcategory) {
      setErrors(prev => ({
        ...prev,
        subcategory: 'Selected subcategory does not belong to the chosen category'
      }));
      return false;
    }
  }
  return true;
};
  // In GigEditModal.jsx - Update the handleSubmit function
const handleSubmit = async (e) => {
  e.preventDefault();
  console.log('Form submitted:', formData);
   
  if (!validateForm() || !validateSubcategory()) {
    return;
  }
  
  setSubmitting(true);
  
  try {
    // Prepare data for submission
    const dataToSubmit = {
      ...formData,
      budget: Number(formData.budget),
      timeline: Number(formData.timeline),
      // Ensure arrays are properly formatted
      skillsRequired: Array.isArray(formData.skillsRequired) ? 
        formData.skillsRequired.filter(skill => skill.trim()) : [],
      deliverables: Array.isArray(formData.deliverables) ? 
        formData.deliverables.filter(del => del.trim()) : []
    };
    
    // Remove empty assignedTo field if it's an empty string
    if (dataToSubmit.assignedTo === '') {
      delete dataToSubmit.assignedTo;
    }
    
    // Remove empty subcategory if it's an empty string
    if (dataToSubmit.subcategory === '') {
      delete dataToSubmit.subcategory;
    }
    
    // Remove empty deadline if it's an empty string
    if (dataToSubmit.deadline === '') {
      delete dataToSubmit.deadline;
    }
    
    console.log('Submitting data:', dataToSubmit);
    await onSave(dataToSubmit);
  } catch (error) {
    console.error('Save error:', error);
  } finally {
    setSubmitting(false);
  }
};
  const handleChange = (field, value) => {
    console.log(`Changing ${field}:`, value);
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field if it exists
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const addSkill = () => {
    const trimmedSkill = newSkill.trim();
    if (trimmedSkill && !formData.skillsRequired.includes(trimmedSkill)) {
      handleChange('skillsRequired', [...formData.skillsRequired, trimmedSkill]);
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove) => {
    handleChange('skillsRequired', formData.skillsRequired.filter(skill => skill !== skillToRemove));
  };

  const addDeliverable = () => {
    const trimmedDeliverable = newDeliverable.trim();
    if (trimmedDeliverable && !formData.deliverables.includes(trimmedDeliverable)) {
      handleChange('deliverables', [...formData.deliverables, trimmedDeliverable]);
      setNewDeliverable('');
    }
  };

  const removeDeliverable = (deliverableToRemove) => {
    handleChange('deliverables', formData.deliverables.filter(del => del !== deliverableToRemove));
  };

  const handleKeyPress = (e, type) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (type === 'skill') addSkill();
      if (type === 'deliverable') addDeliverable();
    }
  };

  if (!isOpen) return null;

  const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'PKR'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Edit Gig</h3>
            <p className="text-sm text-gray-500">ID: {gig?._id}</p>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-gray-400 hover:text-gray-500 disabled:opacity-50"
          >
            <FiXCircle className="h-6 w-6" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-8">
              {/* Basic Information */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                  Basic Information
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleChange('title', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                        errors.title ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter gig title"
                    />
                    {errors.title && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <FiAlertCircle className="h-4 w-4 mr-1" />
                        {errors.title}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description *
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                        errors.description ? 'border-red-300' : 'border-gray-300'
                      }`}
                      rows="4"
                      placeholder="Describe the project requirements"
                    />
                    {errors.description && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <FiAlertCircle className="h-4 w-4 mr-1" />
                        {errors.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Category & Budget */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                  Category & Budget
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category *
                    </label>
                    <select
                      value={formData.projectCategory}
                      onChange={(e) => handleChange('projectCategory', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                        errors.projectCategory ? 'border-red-300' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select category</option>
                      {categories.map(cat => (
                        <option key={cat._id} value={cat._id}>{cat.name}</option>
                      ))}
                    </select>
                    {errors.projectCategory && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <FiAlertCircle className="h-4 w-4 mr-1" />
                        {errors.projectCategory}
                      </p>
                    )}
                  </div>
                  
                  <div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Subcategory
  </label>
  <select
  value={formData.subcategory}
  onChange={(e) => handleChange('subcategory', e.target.value)}
  disabled={!formData.projectCategory || loadingSubcategories}
  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
    !formData.projectCategory || loadingSubcategories 
      ? 'bg-gray-100 cursor-not-allowed' 
      : 'border-gray-300'
  }`}
>
  <option value="">Select subcategory</option>
  {loadingSubcategories ? (
    <option value="" disabled>Loading subcategories...</option>
  ) : (
    availableSubcategories.map(sub => (
      <option key={sub._id} value={sub._id}>
        {sub.name}
      </option>
    ))
  )}
</select>
  {!formData.projectCategory && (
    <p className="mt-1 text-sm text-gray-500">Select a category first</p>
  )}
</div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Budget *
                    </label>
                    <div className="flex space-x-2">
                      <select
                        value={formData.currency}
                        onChange={(e) => handleChange('currency', e.target.value)}
                        className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        {currencies.map(currency => (
                          <option key={currency} value={currency}>{currency}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="5"
                        max="100000"
                        step="0.01"
                        value={formData.budget}
                        onChange={(e) => handleChange('budget', e.target.value)}
                        className={`flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                          errors.budget ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Budget amount"
                      />
                    </div>
                    {errors.budget && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <FiAlertCircle className="h-4 w-4 mr-1" />
                        {errors.budget}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Timeline *
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={formData.timeline}
                        onChange={(e) => handleChange('timeline', e.target.value)}
                        className={`flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                          errors.timeline ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Timeline"
                      />
                      <select
                        value={formData.timelineUnit}
                        onChange={(e) => handleChange('timelineUnit', e.target.value)}
                        className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        <option value="days">Days</option>
                        <option value="weeks">Weeks</option>
                        <option value="months">Months</option>
                      </select>
                    </div>
                    {errors.timeline && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <FiAlertCircle className="h-4 w-4 mr-1" />
                        {errors.timeline}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Skills & Deliverables */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                  Skills & Deliverables
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Skills Required
                    </label>
                    <div className="mb-3">
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={newSkill}
                          onChange={(e) => setNewSkill(e.target.value)}
                          onKeyPress={(e) => handleKeyPress(e, 'skill')}
                          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="Add a skill"
                        />
                        <button
                          type="button"
                          onClick={addSkill}
                          className="px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                        >
                          <FiPlus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 min-h-12">
                      {formData.skillsRequired.map((skill, index) => (
                        <div key={index} className="flex items-center bg-indigo-100 text-indigo-800 px-3 py-1.5 rounded-lg">
                          <span>{skill}</span>
                          <button
                            type="button"
                            onClick={() => removeSkill(skill)}
                            className="ml-2 text-indigo-600 hover:text-indigo-900"
                          >
                            <FiTrash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Deliverables
                    </label>
                    <div className="mb-3">
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={newDeliverable}
                          onChange={(e) => setNewDeliverable(e.target.value)}
                          onKeyPress={(e) => handleKeyPress(e, 'deliverable')}
                          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="Add a deliverable"
                        />
                        <button
                          type="button"
                          onClick={addDeliverable}
                          className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          <FiPlus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 min-h-12">
                      {formData.deliverables.map((deliverable, index) => (
                        <div key={index} className="flex items-center bg-green-100 text-green-800 px-3 py-1.5 rounded-lg">
                          <span>{deliverable}</span>
                          <button
                            type="button"
                            onClick={() => removeDeliverable(deliverable)}
                            className="ml-2 text-green-600 hover:text-green-900"
                          >
                            <FiTrash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Settings & Advanced */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                  Settings & Advanced
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => handleChange('status', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="assigned">Assigned</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Urgency Level
                    </label>
                    <select
                      value={formData.urgency}
                      onChange={(e) => handleChange('urgency', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Visibility
                    </label>
                    <select
                      value={formData.visibility}
                      onChange={(e) => handleChange('visibility', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                      <option value="invite_only">Invite Only</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assign To
                    </label>
                    <select
                      value={formData.assignedTo}
                      onChange={(e) => handleChange('assignedTo', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">Not Assigned</option>
                      {users.map(user => (
                        <option key={user._id} value={user._id}>
                          {user.name} ({user.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Deadline
                    </label>
                    <input
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => handleChange('deadline', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                        errors.deadline ? 'border-red-300' : 'border-gray-300'
                      }`}
                      min={new Date().toISOString().split('T')[0]}
                    />
                    {errors.deadline && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <FiAlertCircle className="h-4 w-4 mr-1" />
                        {errors.deadline}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Status
                    </label>
                    <select
                      value={formData.paymentStatus}
                      onChange={(e) => handleChange('paymentStatus', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="pending">Pending</option>
                      <option value="partial">Partial</option>
                      <option value="completed">Completed</option>
                      <option value="refunded">Refunded</option>
                      <option value="disputed">Disputed</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end space-x-4">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50 flex items-center space-x-2"
              >
                {submitting ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <FiSave className="h-4 w-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default GigEditModal;