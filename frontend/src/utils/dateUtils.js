
export const formatDateForAPI = (dateString) => {
  console.log('📅 formatDateForAPI called with:', dateString, 'type:', typeof dateString);
  
  if (!dateString || dateString.trim() === '') {
    console.log('📅 No date provided, returning null');
    return null;
  }
  
  try {
    // If it's already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      console.log('📅 Already in correct format, returning:', dateString);
      return dateString;
    }
    
    // Parse and format
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.error('📅 Invalid date:', dateString);
      return null;
    }
    
    // Format as YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const formatted = `${year}-${month}-${day}`;
    
    console.log('📅 Formatted date:', { original: dateString, formatted });
    return formatted;
  } catch (error) {
    console.error('📅 Error formatting date:', error, 'dateString:', dateString);
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