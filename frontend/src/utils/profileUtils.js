// utils/profileUtils.js
export const calculateProfileCompletion = (user) => {
  if (!user) return 0;

  const fieldWeights = {
    bio: { weight: 20, value: user.bio?.trim() },
    occupation: { weight: 15, value: user.occupation?.trim() },
    education: { weight: 15, value: user.education?.trim() },
    phoneNumber: { weight: 10, value: user.phoneNumber?.trim() },
    location: { 
      weight: 15, 
      value: user.country?.trim() && user.city?.trim()
    },
    languages: { weight: 10, value: user.languages?.length > 0 },
    dateOfBirth: { weight: 5, value: user.dateOfBirth },
    gender: { weight: 5, value: user.gender?.trim() },
    socialLinks: { 
      weight: 5, 
      value: user.linkedin || user.github || user.website
    }
  };

  let totalScore = 0;
  const maxScore = Object.values(fieldWeights).reduce((sum, config) => sum + config.weight, 0);

  Object.values(fieldWeights).forEach((config) => {
    if (typeof config.value === 'boolean') {
      if (config.value) totalScore += config.weight;
    } else if (config.value && config.value !== '') {
      if (config.field === 'bio' && config.value.length < 20) {
        totalScore += Math.min(config.weight, Math.floor((config.value.length / 50) * config.weight));
      } else {
        totalScore += config.weight;
      }
    }
  });

  return Math.min(100, Math.round((totalScore / maxScore) * 100));
};

export const isProfileCompleteEnough = (user, threshold = 70) => {
  return calculateProfileCompletion(user) >= threshold;
};

export const getProfileSuggestions = (user) => {
  if (!user) return [];

  const suggestions = [];
  
  if (!user.bio || user.bio.length < 20) {
    suggestions.push("Add a bio (at least 20 characters)");
  }
  
  if (!user.occupation) {
    suggestions.push("Add your occupation");
  }
  
  if (!user.education) {
    suggestions.push("Add your education");
  }
  
  if (!user.phoneNumber) {
    suggestions.push("Add your phone number");
  }
  
  if (!user.country || !user.city) {
    suggestions.push("Add your location");
  }
  
  if (!user.languages || user.languages.length === 0) {
    suggestions.push("Add languages you speak");
  }

  return suggestions.slice(0, 3); // Return top 3 suggestions
};