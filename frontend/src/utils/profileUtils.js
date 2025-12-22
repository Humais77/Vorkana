// utils/profileUtils.js
export const calculateProfileCompletion = (user) => {
  if (!user) return 0;
  
  const requiredFields = {
    bio: { weight: 20, value: user.bio?.trim() },
    occupation: { weight: 15, value: user.occupation?.trim() },
    education: { weight: 15, value: user.education?.trim() },
    phoneNumber: { weight: 10, value: user.phoneNumber?.trim() },
    country: { weight: 8, value: user.country?.trim() },
    city: { weight: 7, value: user.city?.trim() },
    languages: { weight: 10, value: user.languages?.length > 0 },
    dateOfBirth: { weight: 5, value: user.dateOfBirth },
    gender: { weight: 5, value: user.gender?.trim() },
    socialLinks: { weight: 5, value: (user.linkedin || user.github || user.website) }
  };

  let totalScore = 0;
  let maxScore = 0;

  Object.entries(requiredFields).forEach(([field, config]) => {
    maxScore += config.weight;
    
    if (typeof config.value === 'boolean') {
      if (config.value) totalScore += config.weight;
    } else if (config.value && config.value !== '') {
      if (field === 'bio' && config.value.length < 20) {
        totalScore += Math.min(config.weight, Math.floor((config.value.length / 50) * config.weight));
      } else {
        totalScore += config.weight;
      }
    }
  });

  return Math.min(100, Math.round((totalScore / maxScore) * 100));
};

export const isProfileCompleteEnough = (user, threshold = 70) => {
  const completion = calculateProfileCompletion(user);
  return completion >= threshold;
};

export const getProfileSuggestions = (user) => {
  const suggestions = [];
  
  if (!user.bio?.trim()) suggestions.push('Add a bio to introduce yourself');
  if (!user.occupation?.trim()) suggestions.push('Add your occupation');
  if (!user.education?.trim()) suggestions.push('Add your education');
  if (!user.phoneNumber?.trim()) suggestions.push('Add your phone number');
  if (!user.country?.trim() || !user.city?.trim()) suggestions.push('Add your location');
  if (!user.languages || user.languages.length === 0) suggestions.push('Add languages you speak');
  
  return suggestions.slice(0, 3); // Return top 3 suggestions
};