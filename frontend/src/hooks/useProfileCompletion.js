// hooks/useProfileCompletion.js
import { useAuthStore } from '../store/useAuthStore';
import { useState, useEffect } from 'react';

export const useProfileCompletion = () => {
  const { user } = useAuthStore();
  const [isProfileComplete, setIsProfileComplete] = useState(true);
  const [missingFields, setMissingFields] = useState([]);

  useEffect(() => {
    if (user) {
      const requiredFields = [
        { 
          key: 'picture', 
          label: 'Profile Picture', 
          value: user.picture,
          required: true 
        },
        { 
          key: 'bio', 
          label: 'Bio (minimum 20 characters)', 
          value: user.bio?.trim(),
          condition: (value) => value && value.length >= 20
        },
        { 
          key: 'location', 
          label: 'Location (city or country)', 
          value: user.country?.trim() || user.city?.trim(),
          required: true 
        },
        { 
          key: 'languages', 
          label: 'Languages (at least one)', 
          value: user.languages?.length > 0,
          condition: (value) => value === true
        },
        { 
          key: 'phoneNumber', 
          label: 'Phone Number', 
          value: user.phoneNumber?.trim(),
          required: true 
        },
        { 
          key: 'emailVerified', 
          label: 'Verified Email', 
          value: user.emailVerified,
          required: true,
          condition: (value) => value === true
        },
      ];

      const missing = requiredFields.filter(field => {
        if (field.condition) {
          return !field.condition(field.value);
        }
        if (typeof field.value === 'boolean') {
          return !field.value;
        }
        return !field.value || field.value === '';
      });

      setMissingFields(missing);
      
      // User needs to complete ALL required fields and at least 5 out of 6 total fields
      const completedCount = requiredFields.filter(field => {
        if (field.condition) {
          return field.condition(field.value);
        }
        if (typeof field.value === 'boolean') {
          return field.value;
        }
        return field.value && field.value !== '';
      }).length;

      // Check if all required fields are completed
      const requiredFieldsCompleted = requiredFields
        .filter(field => field.required)
        .every(field => {
          if (field.condition) {
            return field.condition(field.value);
          }
          if (typeof field.value === 'boolean') {
            return field.value;
          }
          return field.value && field.value !== '';
        });

      // Profile is complete if all required fields are filled AND at least 5 out of 6 fields are completed
      setIsProfileComplete(requiredFieldsCompleted && completedCount >= 5);
    }
  }, [user]);

  return { isProfileComplete, missingFields };
};