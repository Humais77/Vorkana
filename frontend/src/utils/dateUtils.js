// utils/dateUtils.js
export const formatDateForAPI = (dateString) => {
  if (!dateString) return null;
  
  // If it's already a date string without time, return as-is
  if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateString;
  }
  
  // If it has time component, extract just the date
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    
    // Format as YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return null;
  }
};

export const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    // Format as YYYY-MM-DD for input[type="date"]
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error formatting date for input:', error);
    return '';
  }
};