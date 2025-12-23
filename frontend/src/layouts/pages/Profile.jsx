import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import {
  Edit2,
  MapPin,
  Mail,
  Phone,
  Linkedin,
  Github,
  Briefcase,
  Globe,
  Calendar,
  User,
  Shield,
  Eye,
  EyeOff,
  Languages,
  Settings,
  ExternalLink,
  Save,
  X,
  Plus,
  Eye as EyeIcon,
  AlertCircle,
  CheckCircle,
  Loader2,
  Award,
  Star,
  Clock,
  Target,
  TrendingUp
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import default_pp from '../../assets/default_pp-modified.png';
import { format, parseISO } from 'date-fns';
import { useProfilePicture } from '../../hooks/useProfilePicture';
import { useUpdateProfile, useGetProfile } from '../../hooks/useAuth';
import { createImagePreview, updateImageWithCacheBusting } from '../../utils/imageUtils';
import { formatDateForAPI, formatDateForInput } from '../../utils/dateUtils';
import { SeoWrapper } from '../../components/SeoWrapper';

const Profile = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, setUser } = useAuthStore();

  // API hooks
  const updateProfileMutation = useUpdateProfile();
  const { refetch: refetchProfile } = useGetProfile();

  // States
  const [showSetupPrompt, setShowSetupPrompt] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [newLanguage, setNewLanguage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [missingFields, setMissingFields] = useState([]);
  const [nextSuggestion, setNextSuggestion] = useState('');
  const [tempPicture, setTempPicture] = useState(null);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);

  const fileInputRef = useRef(null);
  const profileImageRef = useRef(null);

  const { uploadProfilePicture } = useProfilePicture();

  // Form data
  const [formData, setFormData] = useState({
    bio: '',  
    phoneNumber: '',
    country: '',
    city: '',
    languages: [],
    occupation: '',
    education: '',
    gender: '',
    dateOfBirth: '',
    github: '',
    linkedin: '',
    website: '',
    privacySettings: {
      profileVisibility: 'public',
      showEmail: false,
      showPhone: false,
      showLocation: true,
      showLastSeen: true
    }
  });

  // Calculate profile completion percentage
  const calculateProfileCompletion = (currentUser = user, currentFormData = formData) => {
    if (!currentUser) return 0;
    
    const fieldWeights = {
      bio: { 
        weight: 20, 
        value: currentFormData.bio?.trim() || currentUser.bio?.trim() 
      },
      occupation: { 
        weight: 15, 
        value: currentFormData.occupation?.trim() || currentUser.occupation?.trim() 
      },
      education: { 
        weight: 15, 
        value: currentFormData.education?.trim() || currentUser.education?.trim() 
      },
      phoneNumber: { 
        weight: 10, 
        value: currentFormData.phoneNumber?.trim() || currentUser.phoneNumber?.trim() 
      },
      country: { 
        weight: 8, 
        value: currentFormData.country?.trim() || currentUser.country?.trim() 
      },
      city: { 
        weight: 7, 
        value: currentFormData.city?.trim() || currentUser.city?.trim() 
      },
      languages: { 
        weight: 10, 
        value: (currentFormData.languages?.length > 0 || currentUser.languages?.length > 0) 
      },
      dateOfBirth: { 
        weight: 5, 
        value: currentFormData.dateOfBirth || currentUser.dateOfBirth 
      },
      gender: { 
        weight: 5, 
        value: currentFormData.gender?.trim() || currentUser.gender?.trim() 
      },
      socialLinks: { 
        weight: 5, 
        value: (currentFormData.linkedin || currentFormData.github || currentFormData.website || 
                currentUser.linkedin || currentUser.github || currentUser.website) 
      }
    };

    let totalScore = 0;
    let maxScore = 0;

    Object.entries(fieldWeights).forEach(([field, config]) => {
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

  // Generate structured data for profile
  const generateProfileStructuredData = () => {
    if (!user) return null;

    const websiteUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const profileUrl = `${websiteUrl}/profile`;
    
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Person",
      "name": user.name || 'User Profile',
      "url": profileUrl,
      "image": user.picture || `${websiteUrl}/default-avatar.png`,
      "description": formData.bio || user.bio || `${user.name}'s profile on Vorkana`,
      "email": user.email,
      "telephone": formData.phoneNumber || user.phoneNumber || undefined,
      "jobTitle": formData.occupation || user.occupation,
      "knowsAbout": formData.languages?.join(', ') || user.languages?.join(', '),
      "alumniOf": formData.education || user.education ? {
        "@type": "EducationalOrganization",
        "name": formData.education || user.education
      } : undefined,
      "address": (formData.country || user.country || formData.city || user.city) ? {
        "@type": "PostalAddress",
        "addressLocality": formData.city || user.city,
        "addressCountry": formData.country || user.country
      } : undefined,
      "sameAs": [
        ...(formData.linkedin || user.linkedin ? [formData.linkedin || user.linkedin] : []),
        ...(formData.github || user.github ? [formData.github || user.github] : []),
        ...(formData.website || user.website ? [formData.website || user.website] : [])
      ].filter(Boolean),
      "worksFor": formData.occupation || user.occupation ? {
        "@type": "Organization",
        "name": formData.occupation || user.occupation
      } : undefined,
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": profileUrl,
        "name": `${user.name}'s Profile | Vorkana`
      }
    };

    return structuredData;
  };

  // Generate breadcrumb items
  const generateBreadcrumbItems = () => {
    const websiteUrl = typeof window !== 'undefined' ? window.location.origin : '';
    
    return [
      { name: "Home", url: "/" },
      { name: "Dashboard", url: "/dashboard" },
      { name: user?.name || "Profile", url: "/profile" }
    ];
  };

  // Get missing fields
  const getMissingFields = () => {
    const missing = [];
    
    if (!formData.bio?.trim() && !user?.bio) missing.push({ field: 'bio', label: 'Bio', weight: 20 });
    if (!formData.occupation?.trim() && !user?.occupation) missing.push({ field: 'occupation', label: 'Occupation', weight: 15 });
    if (!formData.education?.trim() && !user?.education) missing.push({ field: 'education', label: 'Education', weight: 15 });
    if (!formData.phoneNumber?.trim() && !user?.phoneNumber) missing.push({ field: 'phoneNumber', label: 'Phone Number', weight: 10 });
    if ((!formData.country?.trim() && !user?.country) || (!formData.city?.trim() && !user?.city)) {
      missing.push({ field: 'location', label: 'Location', weight: 15 });
    }
    if ((formData.languages?.length === 0 && user?.languages?.length === 0)) missing.push({ field: 'languages', label: 'Languages', weight: 10 });
    
    return missing.sort((a, b) => b.weight - a.weight);
  };

  // Get next suggested action
  const getNextSuggestion = () => {
    const missing = getMissingFields();
    
    if (missing.length === 0) {
      return 'Your profile is complete!';
    }
    
    const field = missing[0];
    const suggestions = {
      'bio': 'Add a bio to introduce yourself',
      'occupation': 'Add your occupation',
      'education': 'Add your education',
      'phoneNumber': 'Add your phone number',
      'location': 'Add your location',
      'languages': 'Add languages you speak'
    };
    
    return suggestions[field.field] || `Complete your ${field.label}`;
  };

  // Initialize form data and calculate completion
  useEffect(() => {
    if (user) {
      setFormData({
        bio: user.bio || '',
        phoneNumber: user.phoneNumber || '',
        country: user.country || '',
        city: user.city || '',
        languages: user.languages || [],
        occupation: user.occupation || '',
        education: user.education || '',
        gender: user.gender || '',
        dateOfBirth: user.dateOfBirth ? formatDateForInput(user.dateOfBirth) : '',
        github: user.github || '',
        linkedin: user.linkedin || '',
        website: user.website || '',
        privacySettings: user.privacySettings || {
          profileVisibility: 'public',
          showEmail: false,
          showPhone: false,
          showLocation: true,
          showLastSeen: true
        }
      });

      const completion = calculateProfileCompletion();
      setProfileCompletion(completion);
      setMissingFields(getMissingFields());
      setNextSuggestion(getNextSuggestion());
      
      if (completion < 60) {
        setShowSetupPrompt(true);
      }
    }
  }, [user]);

  // Update completion when formData changes
  useEffect(() => {
    if (user) {
      const completion = calculateProfileCompletion(user, formData);
      setProfileCompletion(completion);
      setMissingFields(getMissingFields());
      setNextSuggestion(getNextSuggestion());
    }
  }, [formData, user]);

  const handleProfilePictureClick = () => {
    fileInputRef.current?.click();
  };

  useEffect(() => {
    const syncFormDataWithUser = () => {
      if (user) {
        const userFields = {
          bio: user.bio || '',
          phoneNumber: user.phoneNumber || '',
          country: user.country || '',
          city: user.city || '',
          languages: user.languages || [],
          occupation: user.occupation || '',
          education: user.education || '',
          gender: user.gender || '',
          dateOfBirth: user.dateOfBirth || '',
          github: user.github || '',
          linkedin: user.linkedin || '',
          website: user.website || '',
          privacySettings: user.privacySettings || {
            profileVisibility: 'public',
            showEmail: false,
            showPhone: false,
            showLocation: true,
            showLastSeen: true
          }
        };

        const shouldUpdate = Object.keys(userFields).some(key => {
          if (key === 'privacySettings') {
            return JSON.stringify(formData[key]) !== JSON.stringify(userFields[key]);
          }
          return formData[key] !== userFields[key];
        });

        if (shouldUpdate && editingField === null) {
          setFormData(userFields);
        }
      }
    };

    syncFormDataWithUser();
  }, [user, editingField]);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only image files (JPEG, JPG, PNG, WebP) are allowed');
      return;
    }
    
    try {
      setIsUploadingPicture(true);
      
      const previewUrl = URL.createObjectURL(file);
      setTempPicture(previewUrl);
      
      if (profileImageRef.current) {
        profileImageRef.current.src = previewUrl;
        profileImageRef.current.style.opacity = '0.8';
      }
      
      const pictureUrl = await uploadProfilePicture(file);
      
      if (pictureUrl) {
        if (profileImageRef.current) {
          const img = profileImageRef.current;
          
          const newImage = new Image();
          newImage.onload = () => {
            img.src = pictureUrl;
            img.style.opacity = '1';

            if (tempPicture) {
              URL.revokeObjectURL(tempPicture);
              setTempPicture(null);
            }

            toast.success('Profile picture updated!');
          };
          
          newImage.onerror = (error) => {
            console.error('Failed to load new image:', error);
            toast.error('Failed to load new profile picture');
            
            if (user?.picture) {
              img.src = `${user.picture}?t=${Date.now()}`;
            }
          };
          
          newImage.src = pictureUrl;
        }
        
        const result = await refetchProfile();
        
      } else {
        console.error('Upload returned no URL');
        if (profileImageRef.current && user?.picture) {
          profileImageRef.current.src = `${user.picture}?t=${Date.now()}`;
          profileImageRef.current.style.opacity = '1';
        }
        toast.error('Failed to upload profile picture');
      }
    } catch (error) {
      console.error('Error in handleFileChange:', error);
      toast.error('An error occurred during upload');
      
      setTempPicture(null);
      if (profileImageRef.current && user?.picture) {
        profileImageRef.current.src = `${user.picture}?t=${Date.now()}`;
        profileImageRef.current.style.opacity = '1';
      }
    } finally {
      setIsUploadingPicture(false);
      event.target.value = '';
    }
  };

  const handleSave = async (field) => {
    if (isSaving || updateProfileMutation.isPending) return;
  
    setIsSaving(true);
    try {
      const updateData = {};
      
      if (field === 'all') {
        Object.keys(formData).forEach(key => {
          if (key === 'dateOfBirth' && formData.dateOfBirth) {
            updateData[key] = formatDateForAPI(formData.dateOfBirth);
          } else if (key !== 'privacySettings' || 
              JSON.stringify(formData.privacySettings) !== JSON.stringify(user?.privacySettings || {})) {
            updateData[key] = formData[key];
          }
        });
      } else if (field === 'bio') {
        updateData.bio = formData.bio;
      } else if (field === 'phoneNumber') {
        updateData.phoneNumber = formData.phoneNumber;
      } else if (field === 'professional') {
        updateData.occupation = formData.occupation;
        updateData.education = formData.education;
      } else if (field === 'personal') {
        updateData.gender = formData.gender;
        updateData.dateOfBirth = formData.dateOfBirth ? formatDateForAPI(formData.dateOfBirth) : null;
      } else if (field === 'languages') {
        updateData.languages = formData.languages;
      } else if (field === 'location') {
        updateData.country = formData.country;
        updateData.city = formData.city;
      } else if (field === 'social') {
        updateData.linkedin = formData.linkedin;
        updateData.github = formData.github;
        updateData.website = formData.website;
      } else if (field === 'privacySettings') {
        updateData.privacySettings = formData.privacySettings;
      } else {
        if (field === 'dateOfBirth' && formData.dateOfBirth) {
          updateData[field] = formatDateForAPI(formData.dateOfBirth);
        } else {
          updateData[field] = formData[field];
        }
      }

      console.log('Updating profile with formatted data:', updateData);

      const result = await updateProfileMutation.mutateAsync(updateData);
      
      if (result.success) {
        if (result.user) {
          setUser(result.user);
          
          setFormData(prev => ({
            ...prev,
            bio: result.user.bio || '',
            phoneNumber: result.user.phoneNumber || '',
            country: result.user.country || '',
            city: result.user.city || '',
            languages: result.user.languages || [],
            occupation: result.user.occupation || '',
            education: result.user.education || '',
            gender: result.user.gender || '',
            dateOfBirth: result.user.dateOfBirth || '',
            github: result.user.github || '',
            linkedin: result.user.linkedin || '',
            website: result.user.website || '',
            privacySettings: result.user.privacySettings || {
              profileVisibility: 'public',
              showEmail: false,
              showPhone: false,
              showLocation: true,
              showLastSeen: true
            }
          }));
        }
        
        toast.success(
          field === 'all' 
            ? 'Profile updated successfully!' 
            : `${field === 'professional' ? 'Professional details' : field} updated successfully!`
        );
        setEditingField(null);
        
        if (result.user) {
          const newCompletion = calculateProfileCompletion(result.user, formData);
          if (newCompletion >= 70) {
            setShowSetupPrompt(false);
          }
        }
      } else {
        throw new Error(result.message || 'Update failed');
      }
      
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile. Please try again.');
      
    } finally {
      setIsSaving(false);
    }
  };

  const refreshUserData = async () => {
    try {
      const result = await refetchProfile();
      if (result.data?.user) {
        if (profileImageRef.current && result.data.user.picture) {
          const newPictureUrl = `${result.data.user.picture}?t=${Date.now()}`;
          profileImageRef.current.src = newPictureUrl;
        }
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  useEffect(() => {
    if (!isUploadingPicture && user?.picture) {
      const refreshInterval = setInterval(() => {
        if (profileImageRef.current) {
          const currentSrc = profileImageRef.current.src;
          const cleanUrl = currentSrc.split('?')[0];
          profileImageRef.current.src = `${cleanUrl}?t=${Date.now()}`;
        }
      }, 5000);
      
      const timeout = setTimeout(() => {
        clearInterval(refreshInterval);
      }, 30000);
      
      return () => {
        clearInterval(refreshInterval);
        clearTimeout(timeout);
      };
    }
  }, [isUploadingPicture, user?.picture]);

  const handleCancel = () => {
    if (user) {
      setFormData({
        bio: user.bio || '',
        phoneNumber: user.phoneNumber || '',
        country: user.country || '',
        city: user.city || '',
        languages: user.languages || [],
        occupation: user.occupation || '',
        education: user.education || '',
        gender: user.gender || '',
        dateOfBirth: user.dateOfBirth ? formatDateForInput(user.dateOfBirth) : '',
        github: user.github || '',
        linkedin: user.linkedin || '',
        website: user.website || '',
        privacySettings: user.privacySettings || {
          profileVisibility: 'public',
          showEmail: false,
          showPhone: false,
          showLocation: true,
          showLastSeen: true
        }
      });
    }
    setEditingField(null);
  };

  const addLanguage = () => {
    if (newLanguage.trim() && !formData.languages.includes(newLanguage.trim())) {
      setFormData({
        ...formData,
        languages: [...formData.languages, newLanguage.trim()]
      });
      setNewLanguage('');
    }
  };

  const removeLanguage = (language) => {
    setFormData({
      ...formData,
      languages: formData.languages.filter(l => l !== language)
    });
  };

  const calculateAge = (dateString) => {
    if (!dateString) return null;
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const togglePrivacySetting = (setting) => {
    setFormData({
      ...formData,
      privacySettings: {
        ...formData.privacySettings,
        [setting]: !formData.privacySettings[setting]
      }
    });
  };

  const setProfileVisibility = (visibility) => {
    setFormData({
      ...formData,
      privacySettings: {
        ...formData.privacySettings,
        profileVisibility: visibility
      }
    });
  };

  const handleCompleteNow = () => {
    const missing = getMissingFields();
    if (missing.length > 0) {
      const fieldMap = {
        'bio': 'bio',
        'occupation': 'professional',
        'education': 'professional',
        'phoneNumber': 'phone',
        'location': 'location',
        'languages': 'languages'
      };
      setEditingField(fieldMap[missing[0].field] || 'bio');
    }
  };

  const renderPreviewMode = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-6" itemScope itemType="https://schema.org/Person">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <EyeIcon className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Profile Preview</h2>
        </div>
        <button
          onClick={() => setIsPreviewMode(false)}
          className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Exit Preview
        </button>
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <img
            src={user?.picture || default_pp}
            alt={user?.name}
            className="w-16 h-16 rounded-full object-cover border border-gray-300"
            itemProp="image"
          />
          <div itemProp="mainEntityOfPage">
            <h3 className="font-semibold text-gray-900" itemProp="name">{user?.name}</h3>
            {formData.privacySettings.showEmail && (
              <p className="text-gray-600 text-sm" itemProp="email">{user?.email}</p>
            )}
            {(formData.city || formData.country) && formData.privacySettings.showLocation && (
              <p className="text-gray-500 text-sm flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3" />
                <span itemProp="address">
                  {formData.city}{formData.city && formData.country && ', '}{formData.country}
                </span>
              </p>
            )}
          </div>
        </div>

        {formData.bio && (
          <div>
            <h4 className="font-medium text-gray-700 mb-2">About</h4>
            <p className="text-gray-600 text-sm" itemProp="description">{formData.bio}</p>
          </div>
        )}

        {(formData.occupation || formData.education) && (
          <div className="grid grid-cols-2 gap-4">
            {formData.occupation && (
              <div itemProp="jobTitle">
                <h4 className="text-sm font-medium text-gray-500">Occupation</h4>
                <p className="text-gray-900">{formData.occupation}</p>
              </div>
            )}
            {formData.education && (
              <div itemProp="alumniOf">
                <h4 className="text-sm font-medium text-gray-500">Education</h4>
                <p className="text-gray-900">{formData.education}</p>
              </div>
            )}
          </div>
        )}

        {formData.languages.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Languages</h4>
            <div className="flex flex-wrap gap-2">
              {formData.languages.map((lang, idx) => (
                <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm" itemProp="knowsAbout">
                  {lang}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please sign in</h2>
          <button
            onClick={() => navigate('/sign-in')}
            className="px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <SeoWrapper
      title={`${user?.name}'s Profile | Vorkana Freelancer`}
      description={`View ${user?.name}'s professional profile. ${formData.occupation ? `${formData.occupation} ` : ''}${formData.bio ? formData.bio.substring(0, 150) + '...' : 'Complete your profile to showcase your skills.'}`}
      keywords={`${user?.name}, ${formData.occupation || 'freelancer'}, ${formData.country || 'global'}, profile, portfolio, professional`}
      canonical="/profile"
      ogTitle={`${user?.name}'s Profile`}
      ogDescription={formData.bio?.substring(0, 200) || `View ${user?.name}'s professional profile on Vorkana`}
      ogImage={user?.picture || `${typeof window !== 'undefined' ? window.location.origin : ''}/default-avatar.png`}
      ogType="profile"
      twitterCard="summary_large_image"
      twitterSite="@vorkana"
      robots="noindex, follow"
      lang="en"
      breadcrumb={generateBreadcrumbItems()}
      structuredData={generateProfileStructuredData()}
    >
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Setup Prompt */}
          {showSetupPrompt && (
            <div className="mb-8 bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-4 mb-4">
                <AlertCircle className="w-6 h-6 text-gray-600" />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">Complete your profile</h3>
                  <p className="text-gray-600 text-sm">
                    {nextSuggestion} - {profileCompletion}% complete
                  </p>
                </div>
                <button
                  onClick={() => setShowSetupPrompt(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Profile Completion</span>
                  <span>{profileCompletion}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${
                      profileCompletion >= 80 ? 'bg-green-600' :
                      profileCompletion >= 60 ? 'bg-yellow-500' : 'bg-gray-900'
                    }`}
                    style={{ width: `${profileCompletion}%` }}
                  />
                </div>
              </div>
              
              {/* Missing Fields */}
              {missingFields.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">Missing information:</p>
                  <div className="space-y-1">
                    {missingFields.slice(0, 3).map((field, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-700">{field.label}</span>
                        <span className="text-xs text-gray-500">({field.weight}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={handleCompleteNow}
                  className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800"
                >
                  Complete Now
                </button>
                <button
                  onClick={() => handleSave('all')}
                  disabled={isSaving || updateProfileMutation.isPending}
                  className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
                >
                  {isSaving || updateProfileMutation.isPending ? 'Saving...' : 'Save All'}
                </button>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8" itemScope itemType="https://schema.org/Person">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="relative">
                  <img
                    ref={profileImageRef}
                    src={tempPicture || (user?.picture 
                      ? `${user.picture.split('?')[0]}?t=${user.updatedAt || Date.now()}`
                      : default_pp)}
                    alt={user?.name}
                    className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover border-4 border-white shadow transition-all duration-300 cursor-pointer"
                    style={{
                      opacity: isUploadingPicture ? 0.7 : 1,
                    }}
                    onClick={handleProfilePictureClick}
                    itemProp="image"
                    onLoad={() => {
                      if (profileImageRef.current && user?.picture) {
                        const currentSrc = profileImageRef.current.src;
                        if (!currentSrc.includes('?t=')) {
                          profileImageRef.current.src = `${currentSrc.split('?')[0]}?t=${Date.now()}`;
                        }
                      }
                    }}
                  />
                  <div 
                    className="absolute inset-0 bg-black bg-opacity-40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
                    onClick={handleProfilePictureClick}
                  >
                    {isUploadingPicture ? (
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    ) : (
                      <Edit2 className="w-6 h-6 text-white" />
                    )}
                  </div>
                  {isUploadingPicture && (
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                      <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 animate-pulse"></div>
                      </div>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900" itemProp="name">{user?.name}</h1>
                <p className="text-gray-600 mt-1" itemProp="email">{user?.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-gray-500">Profile: {profileCompletion}% complete</span>
                  {profileCompletion >= 80 && (
                    <Award className="w-4 h-4 text-yellow-500" />
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setIsPreviewMode(true)}
                className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <EyeIcon className="w-4 h-4" />
                Preview
              </button>
              
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Dashboard
              </button>
            </div>
          </div>

          {/* Preview Mode */}
          {isPreviewMode && renderPreviewMode()}

          {/* Edit Mode */}
          {!isPreviewMode && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column */}
              <div className="lg:col-span-2 space-y-6">
                {/* Bio Section */}
                <div className="bg-white rounded-lg border border-gray-200 p-6" itemScope itemType="https://schema.org/Person">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-gray-900">About Me</h2>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        20%
                      </span>
                    </div>
                    <button
                      onClick={() => editingField === 'bio' ? handleCancel() : setEditingField('bio')}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      {editingField === 'bio' ? (
                        <X className="w-5 h-5" />
                      ) : (
                        <Edit2 className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  
                  {editingField === 'bio' ? (
                    <div>
                      <textarea
                        value={formData.bio}
                        onChange={(e) => setFormData({...formData, bio: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-lg resize-none mb-3"
                        rows="4"
                        placeholder="Tell us about yourself..."
                        maxLength="500"
                        itemProp="description"
                      />
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">{formData.bio.length}/500 characters</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSave('bio')}
                            disabled={isSaving || updateProfileMutation.isPending}
                            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
                          >
                            {isSaving || updateProfileMutation.isPending ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={handleCancel}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-600" itemProp="description">
                      {formData.bio || (
                        <span className="text-gray-400">
                          Add a bio to introduce yourself
                          <button
                            onClick={() => setEditingField('bio')}
                            className="ml-2 text-gray-900 hover:underline"
                          >
                            + Add bio
                          </button>
                        </span>
                      )}
                    </p>
                  )}
                </div>

                {/* Professional Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Occupation & Education */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                          <Briefcase className="w-5 h-5 text-gray-600" />
                          Professional
                        </h3>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          30%
                        </span>
                      </div>
                      <button
                        onClick={() => setEditingField('professional')}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                    </div>
                    
                    {editingField === 'professional' ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Occupation (15%)</label>
                          <input
                            type="text"
                            value={formData.occupation}
                            onChange={(e) => setFormData({...formData, occupation: e.target.value})}
                            className="w-full p-2 border border-gray-300 rounded-lg mb-3"
                            placeholder="Your occupation"
                            itemProp="jobTitle"
                          />
                          <label className="block text-sm text-gray-600 mb-1">Education (15%)</label>
                          <input
                            type="text"
                            value={formData.education}
                            onChange={(e) => setFormData({...formData, education: e.target.value})}
                            className="w-full p-2 border border-gray-300 rounded-lg"
                            placeholder="Your education"
                            itemProp="alumniOf"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSave('all')}
                            disabled={isSaving}
                            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
                          >
                            {isSaving ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={handleCancel}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <h4 className="text-sm text-gray-500">Occupation</h4>
                          <p className="text-gray-900" itemProp="jobTitle">
                            {formData.occupation || (
                              <span className="text-gray-400">
                                Add occupation
                                <button
                                  onClick={() => setEditingField('professional')}
                                  className="ml-2 text-gray-900 hover:underline"
                                >
                                  + Add
                                </button>
                              </span>
                            )}
                          </p>
                        </div>
                        <div>
                          <h4 className="text-sm text-gray-500">Education</h4>
                          <p className="text-gray-900" itemProp="alumniOf">
                            {formData.education || (
                              <span className="text-gray-400">
                                Add education 
                                <button
                                  onClick={() => setEditingField('professional')}
                                  className="ml-2 text-gray-900 hover:underline"
                                >
                                  + Add
                                </button>
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Personal Info */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                          <User className="w-5 h-5 text-gray-600" />
                          Personal
                        </h3>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          10%
                        </span>
                      </div>
                      <button
                        onClick={() => setEditingField('personal')}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                    </div>
                    
                    {editingField === 'personal' ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Gender (5%)</label>
                          <select
                            value={formData.gender}
                            onChange={(e) => setFormData({...formData, gender: e.target.value})}
                            className="w-full p-2 border border-gray-300 rounded-lg mb-3"
                          >
                            <option value="">Select gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                            <option value="prefer-not-to-say">Prefer not to say</option>
                          </select>
                          <label className="block text-sm text-gray-600 mb-1">Date of Birth (5%)</label>
                          <input
                            type="date"
                            value={formData.dateOfBirth}
                            onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
                            className="w-full p-2 border border-gray-300 rounded-lg"
                            max={new Date().toISOString().split('T')[0]}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSave('personal')}
                            disabled={isSaving || updateProfileMutation.isPending}
                            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
                          >
                            {isSaving || updateProfileMutation.isPending ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={handleCancel}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <h4 className="text-sm text-gray-500">Gender</h4>
                          <p className="text-gray-900 capitalize">
                            {formData.gender ? formData.gender.replace(/-/g, ' ') : (
                              <span className="text-gray-400">Not specified</span>
                            )}
                          </p>
                        </div>
                        <div>
                          <h4 className="text-sm text-gray-500">Date of Birth</h4>
                          <p className="text-gray-900">
                            {formData.dateOfBirth ? (
                              <>
                                {format(new Date(formData.dateOfBirth), 'MMM d, yyyy')}
                                {calculateAge(formData.dateOfBirth) && (
                                  <span className="text-gray-500 text-sm ml-2">
                                    ({calculateAge(formData.dateOfBirth)} years)
                                  </span>
                                )}
                              </>
                            ) : 'Not specified'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Languages */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Languages className="w-5 h-5 text-gray-600" />
                        Languages
                      </h3>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        10%
                      </span>
                    </div>
                    <button
                      onClick={() => setEditingField('languages')}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      {editingField === 'languages' ? (
                        <X className="w-5 h-5" />
                      ) : (
                        <Edit2 className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  
                  {editingField === 'languages' ? (
                    <div>
                      <div className="flex gap-2 mb-3">
                        <input
                          type="text"
                          value={newLanguage}
                          onChange={(e) => setNewLanguage(e.target.value)}
                          placeholder="Add language"
                          className="flex-1 p-2 border border-gray-300 rounded-lg"
                          onKeyPress={(e) => e.key === 'Enter' && addLanguage()}
                        />
                        <button
                          onClick={addLanguage}
                          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        {formData.languages.map((language, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full"
                          >
                            {language}
                            <button
                              onClick={() => removeLanguage(language)}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSave('languages')}
                          disabled={isSaving}
                          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
                        >
                          {isSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={handleCancel}
                          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2" itemProp="knowsAbout">
                      {formData.languages.length > 0 ? (
                        formData.languages.map((language, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                          >
                            {language}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400">
                          Add languages you speak
                          <button
                            onClick={() => setEditingField('languages')}
                            className="ml-2 text-gray-900 hover:underline"
                          >
                            + Add languages
                          </button>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Location */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-gray-600" />
                        Location
                      </h3>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        15%
                      </span>
                    </div>
                    <button
                      onClick={() => setEditingField('location')}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                  </div>
                  
                  {editingField === 'location' ? (
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Country (8%)</label>
                      <input
                        type="text"
                        value={formData.country}
                        onChange={(e) => setFormData({...formData, country: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-lg mb-3"
                        placeholder="Country"
                        itemProp="addressCountry"
                      />
                      <label className="block text-sm text-gray-600 mb-1">City (7%)</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({...formData, city: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-lg mb-3"
                        placeholder="City"
                        itemProp="addressLocality"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSave('all')}
                          disabled={isSaving}
                          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
                        >
                          {isSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={handleCancel}
                          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-600" itemProp="address">
                      {formData.city && formData.country ? (
                        `${formData.city}, ${formData.country}`
                      ) : formData.city ? (
                        formData.city
                      ) : formData.country ? (
                        formData.country
                      ) : (
                        <span className="text-gray-400">
                          Add your location
                          <button
                            onClick={() => setEditingField('location')}
                            className="ml-2 text-gray-900 hover:underline"
                          >
                            + Add location
                          </button>
                        </span>
                      )}
                    </p>
                  )}
                </div>

                {/* Contact */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">Contact</h3>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        10%
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Email</p>
                          <p className="text-gray-900" itemProp="email">{user?.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => togglePrivacySetting('showEmail')}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        {formData.privacySettings.showEmail ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Phone Number</p>
                          <p className="text-gray-900" itemProp="telephone">
                            {formData.phoneNumber || (
                              <span className="text-gray-400">
                                Add phone number
                                <button
                                  onClick={() => setEditingField('phone')}
                                  className="ml-2 text-gray-900 hover:underline"
                                >
                                  + Add
                                </button>
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {formData.phoneNumber && (
                          <button
                            onClick={() => setEditingField('phone')}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => togglePrivacySetting('showPhone')}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          {formData.privacySettings.showPhone ? (
                            <Eye className="w-4 h-4" />
                          ) : (
                            <EyeOff className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {editingField === 'phone' && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <input
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                        placeholder="Phone number"
                        className="w-full p-2 border border-gray-300 rounded-lg mb-2"
                        itemProp="telephone"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSave('phoneNumber')}
                          disabled={isSaving}
                          className="px-3 py-1 bg-gray-900 text-white text-sm rounded hover:bg-gray-800 disabled:opacity-50"
                        >
                          {isSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={handleCancel}
                          className="px-3 py-1 border border-gray-300 text-sm rounded hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Social Links */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">Social Links</h3>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        5%
                      </span>
                    </div>
                    <button
                      onClick={() => setEditingField('social')}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                  </div>
                  
                  {editingField === 'social' ? (
                    <div>
                      <input
                        type="url"
                        value={formData.linkedin}
                        onChange={(e) => setFormData({...formData, linkedin: e.target.value})}
                        placeholder="LinkedIn URL"
                        className="w-full p-2 border border-gray-300 rounded-lg mb-3"
                      />
                      <input
                        type="url"
                        value={formData.github}
                        onChange={(e) => setFormData({...formData, github: e.target.value})}
                        placeholder="GitHub URL"
                        className="w-full p-2 border border-gray-300 rounded-lg mb-3"
                      />
                      <input
                        type="url"
                        value={formData.website}
                        onChange={(e) => setFormData({...formData, website: e.target.value})}
                        placeholder="Website URL"
                        className="w-full p-2 border border-gray-300 rounded-lg mb-3"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSave('all')}
                          disabled={isSaving}
                          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
                        >
                          {isSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={handleCancel}
                          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3" itemProp="sameAs">
                      {formData.linkedin && (
                        <a
                          href={formData.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 text-gray-600 hover:text-gray-900"
                          itemProp="url"
                        >
                          <Linkedin className="w-5 h-5" />
                          LinkedIn
                        </a>
                      )}
                      {formData.github && (
                        <a
                          href={formData.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 text-gray-600 hover:text-gray-900"
                          itemProp="url"
                        >
                          <Github className="w-5 h-5" />
                          GitHub
                        </a>
                      )}
                      {formData.website && (
                        <a
                          href={formData.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 text-gray-600 hover:text-gray-900"
                          itemProp="url"
                        >
                          <Globe className="w-5 h-5" />
                          Website
                        </a>
                      )}
                      {!formData.linkedin && !formData.github && !formData.website && (
                        <p className="text-gray-400">
                          Add social links
                          <button
                            onClick={() => setEditingField('social')}
                            className="ml-2 text-gray-900 hover:underline"
                          >
                            + Add links
                          </button>
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Privacy */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-gray-600" />
                      Privacy
                    </h3>
                    <button
                      onClick={() => setEditingField('privacy')}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      {editingField === 'privacy' ? (
                        <X className="w-5 h-5" />
                      ) : (
                        <Edit2 className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  
                  {editingField === 'privacy' ? (
                    <div>
                      <div className="space-y-3 mb-4">
                        <label className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">Show email</span>
                          <input
                            type="checkbox"
                            checked={formData.privacySettings.showEmail}
                            onChange={() => togglePrivacySetting('showEmail')}
                            className="toggle"
                          />
                        </label>
                        <label className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">Show phone</span>
                          <input
                            type="checkbox"
                            checked={formData.privacySettings.showPhone}
                            onChange={() => togglePrivacySetting('showPhone')}
                            className="toggle"
                          />
                        </label>
                        <label className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">Show location</span>
                          <input
                            type="checkbox"
                            checked={formData.privacySettings.showLocation}
                            onChange={() => togglePrivacySetting('showLocation')}
                            className="toggle"
                          />
                        </label>
                        <div className="mt-4">
                          <label className="block text-sm text-gray-700 mb-2">Profile Visibility</label>
                          <div className="space-y-2">
                            {['public', 'registered', 'private'].map((visibility) => (
                              <label key={visibility} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  checked={formData.privacySettings.profileVisibility === visibility}
                                  onChange={() => setProfileVisibility(visibility)}
                                  className="text-blue-600"
                                />
                                <span className="capitalize">{visibility}</span>
                                <span className="text-xs text-gray-500">
                                  {visibility === 'public' && 'Anyone can see your profile'}
                                  {visibility === 'registered' && 'Only registered users'}
                                  {visibility === 'private' && 'Only you'}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSave('privacySettings')}
                          disabled={isSaving}
                          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
                        >
                          {isSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={handleCancel}
                          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-700">Profile Visibility</span>
                        <span className="text-sm font-medium capitalize">
                          {formData.privacySettings.profileVisibility}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-700">Email</span>
                        <span className="text-sm">{formData.privacySettings.showEmail ? 'Public' : 'Private'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-700">Phone</span>
                        <span className="text-sm">{formData.privacySettings.showPhone ? 'Public' : 'Private'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-700">Location</span>
                        <span className="text-sm">{formData.privacySettings.showLocation ? 'Public' : 'Private'}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Save All Button */}
          {editingField && !isPreviewMode && (
            <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Unsaved changes</p>
                  <p className="text-sm text-gray-600">Save to update profile completion: {profileCompletion}%</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleSave('all')}
                    disabled={isSaving || updateProfileMutation.isPending}
                    className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
                  >
                    {isSaving || updateProfileMutation.isPending ? 'Saving...' : 'Save All'}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Discard
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </SeoWrapper>
  );
};

export default Profile;